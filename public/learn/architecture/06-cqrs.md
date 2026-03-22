---
title: "CQRS"
order: 6
---

# CQRS (Command Query Responsibility Segregation)

명령(쓰기)과 조회(읽기) 모델 분리.

---

## 개념

```
전통적 방식:
하나의 모델로 읽기 + 쓰기 모두 처리
→ 쓰기에 최적화된 정규화 구조가 복잡한 읽기 쿼리를 어렵게 함

CQRS:
Command (쓰기): 상태 변경, 도메인 로직, 정규화된 DB
Query  (읽기): 데이터 조회, 비정규화, 빠른 읽기 최적화

         Command Side         Query Side
Client ─────────────────    ───────────────── Client
        ↓                                   ↑
   Command Handler         Query Handler
        ↓                        ↑
   Domain Model          Read Model (View)
        ↓                        ↑
   Write DB    ────sync────  Read DB (or cache)
```

---

## 단순 CQRS (같은 DB)

```java
// Command: 도메인 로직 적용 후 저장
@Service
@Transactional
@RequiredArgsConstructor
public class OrderCommandService {

    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    public OrderId placeOrder(PlaceOrderCommand command) {
        Order order = Order.create(command.userId(), command.items());
        Order saved = orderRepository.save(order);
        saved.pullDomainEvents().forEach(eventPublisher::publishEvent);
        return saved.getId();
    }

    public void confirmOrder(ConfirmOrderCommand command) {
        Order order = orderRepository.findById(command.orderId()).orElseThrow();
        order.confirm();
        orderRepository.save(order);
        order.pullDomainEvents().forEach(eventPublisher::publishEvent);
    }
}

// Query: 읽기에 최적화된 별도 조회 서비스
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class OrderQueryService {

    private final OrderQueryRepository queryRepository;

    // 읽기 전용 DTO 직접 반환 (도메인 객체 거치지 않음)
    public OrderDetailView getOrderDetail(Long orderId) {
        return queryRepository.findOrderDetailById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
    }

    public Page<OrderSummaryView> getMyOrders(Long userId, Pageable pageable) {
        return queryRepository.findOrderSummariesByUserId(userId, pageable);
    }
}

// Query용 Repository — JPQL/Native Query로 DTO 직접 조회
public interface OrderQueryRepository {

    @Query("""
        SELECT new com.example.app.query.OrderDetailView(
            o.id, o.status, o.totalAmount,
            u.name, u.email,
            o.deliveryAddress
        )
        FROM OrderJpaEntity o
        JOIN UserJpaEntity u ON u.id = o.userId
        WHERE o.id = :orderId
        """)
    Optional<OrderDetailView> findOrderDetailById(@Param("orderId") Long orderId);

    // QueryDSL로 동적 쿼리
    Page<OrderSummaryView> findOrderSummariesByUserId(Long userId, Pageable pageable);
}

// Query용 View (읽기 전용 DTO)
public record OrderDetailView(
    Long orderId,
    String status,
    BigDecimal totalAmount,
    String customerName,
    String customerEmail,
    String deliveryAddress
) {}
```

---

## QueryDSL로 복잡한 조회

```java
// Query 전용 Repository 구현
@Repository
@RequiredArgsConstructor
public class OrderQueryRepositoryImpl implements OrderQueryRepository {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<OrderSummaryView> findOrderSummariesByUserId(
        Long userId, Pageable pageable
    ) {
        QOrderJpaEntity order = QOrderJpaEntity.orderJpaEntity;
        QOrderItemJpaEntity item = QOrderItemJpaEntity.orderItemJpaEntity;

        List<OrderSummaryView> content = queryFactory
            .select(Projections.constructor(OrderSummaryView.class,
                order.id,
                order.status.stringValue(),
                order.totalAmount,
                order.createdAt,
                item.count()
            ))
            .from(order)
            .leftJoin(order.items, item)
            .where(order.userId.eq(userId))
            .groupBy(order.id)
            .orderBy(order.createdAt.desc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        Long total = queryFactory
            .select(order.count())
            .from(order)
            .where(order.userId.eq(userId))
            .fetchOne();

        return new PageImpl<>(content, pageable, total != null ? total : 0);
    }

    // 복잡한 필터 조건
    public List<OrderSummaryView> searchOrders(OrderSearchCondition condition) {
        QOrderJpaEntity order = QOrderJpaEntity.orderJpaEntity;

        BooleanBuilder builder = new BooleanBuilder();
        if (condition.status() != null) {
            builder.and(order.status.eq(condition.status()));
        }
        if (condition.from() != null) {
            builder.and(order.createdAt.goe(condition.from()));
        }
        if (condition.to() != null) {
            builder.and(order.createdAt.loe(condition.to()));
        }

        return queryFactory
            .select(Projections.constructor(OrderSummaryView.class, /* ... */))
            .from(order)
            .where(builder)
            .fetch();
    }
}
```

---

## 고급 CQRS (읽기 DB 분리)

```
이벤트 기반 Read Model 동기화:

Command Side (Write DB: PostgreSQL, 정규화)
    ↓ 도메인 이벤트
Event Store or Kafka
    ↓
Projector (이벤트 → Read Model 업데이트)
    ↓
Query Side (Read DB: Elasticsearch, Redis, MongoDB)
```

```java
// 이벤트 기반 Read Model 업데이트
@Component
@RequiredArgsConstructor
public class OrderReadModelProjector {

    private final OrderReadModelRepository readModelRepository;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(OrderPlacedEvent event) {
        OrderReadModel readModel = OrderReadModel.builder()
            .orderId(event.getOrderId().value())
            .userId(event.getUserId().value())
            .status("PENDING")
            .totalAmount(event.getTotalAmount().amount())
            .itemCount(event.getItemCount())
            .createdAt(event.getOccurredAt())
            .build();

        readModelRepository.save(readModel);  // Elasticsearch에 인덱싱
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(OrderConfirmedEvent event) {
        readModelRepository.updateStatus(
            event.getOrderId().value(), "CONFIRMED");
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(OrderCancelledEvent event) {
        readModelRepository.updateStatus(
            event.getOrderId().value(), "CANCELLED");
    }
}

// Elasticsearch Read Model
@Document(indexName = "orders")
@Getter @Builder
public class OrderReadModel {
    @Id
    private Long orderId;
    private Long userId;
    private String status;
    private BigDecimal totalAmount;
    private int itemCount;
    private Instant createdAt;
    // 검색을 위한 추가 필드 (비정규화)
    private String customerName;
    private List<String> productNames;
}
```

---

## Controller에서 분기

```java
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderCommandService commandService;  // 쓰기
    private final OrderQueryService queryService;      // 읽기

    // Command: 상태 변경
    @PostMapping
    public ResponseEntity<Map<String, Long>> placeOrder(
        @RequestBody @Valid PlaceOrderRequest request,
        @AuthenticationPrincipal Long userId
    ) {
        OrderId orderId = commandService.placeOrder(
            PlaceOrderCommand.of(userId, request));
        return ResponseEntity.status(201)
            .body(Map.of("orderId", orderId.value()));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<Void> confirmOrder(@PathVariable Long id) {
        commandService.confirmOrder(new ConfirmOrderCommand(new OrderId(id)));
        return ResponseEntity.ok().build();
    }

    // Query: 조회만
    @GetMapping("/{id}")
    public ResponseEntity<OrderDetailView> getOrder(@PathVariable Long id) {
        return ResponseEntity.ok(queryService.getOrderDetail(id));
    }

    @GetMapping("/my")
    public ResponseEntity<Page<OrderSummaryView>> getMyOrders(
        @AuthenticationPrincipal Long userId,
        Pageable pageable
    ) {
        return ResponseEntity.ok(queryService.getMyOrders(userId, pageable));
    }
}
```

---

## 언제 쓸까

```
적합:
— 읽기 요청이 쓰기보다 훨씬 많음 (100:1 이상)
— 읽기에 복잡한 조인, 집계 필요
— 쓰기 도메인 로직 복잡
— 읽기/쓰기 스케일링을 따로 하고 싶음

과할 수 있음:
— 간단한 CRUD
— 읽기/쓰기 비율이 비슷함
— 작은 팀, 빠른 개발 필요

단계적 도입:
1. 같은 DB, Service만 분리 (간단)
2. 읽기 전용 Replica로 쿼리 분리
3. Read Model 별도 저장소 (복잡)
```
