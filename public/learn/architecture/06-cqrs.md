---
title: "CQRS"
order: 6
---

# CQRS (Command Query Responsibility Segregation)

읽기와 쓰기의 책임을 분리하는 패턴. 명령(Command)과 조회(Query)를 다른 통로로 처리한다.

---

## 왜 CQRS가 필요한가

쇼핑몰 주문 서비스를 개발한다고 하자. 주문 생성(쓰기)은 복잡한 도메인 로직이 있다. 재고 확인, 결제 검증, 쿠폰 적용, 도메인 규칙... 반면 주문 목록 조회(읽기)는 그냥 JOIN 쿼리 한 방이면 된다.

그런데 같은 `OrderService`에 두 가지 책임을 넣으면 문제가 생긴다:

```
문제 상황:
- 주문 도메인 모델은 정규화(Normalization)에 최적화
  → 읽기 시 복잡한 JOIN이 필요
- 읽기 요청이 쓰기의 100배인데 같은 DB를 쓰면 읽기가 쓰기를 방해
- 읽기 쿼리에 @Transactional(readOnly = true)를 빠뜨리면 성능 저하
- 읽기용 DTO를 만들기 위해 도메인 객체를 거치는 것이 비효율적
```

CQRS는 이 문제를 **읽기 전용 통로와 쓰기 전용 통로를 분리**해서 해결한다.

---

## 개념 구조

```
전통적 방식 (읽기/쓰기 혼합):
Client → Service → Domain Model → DB
         ↑ 읽기도 쓰기도 같은 경로

CQRS:
        쓰기 경로 (Command Side)
Client → Command Handler → Domain Model → Write DB
                                              ↓ (동기화)
        읽기 경로 (Query Side)
Client ←  Query Handler  ←  Read Model  ← Read DB

핵심 아이디어:
- Command: 상태를 변경한다 (리턴값 없거나 ID만 리턴)
- Query:   상태를 읽는다 (리턴값 있음, 상태 변경 없음)
- 두 통로는 완전히 분리된 코드로 처리
```

---

## 단계별 적용

CQRS는 단번에 완성형으로 도입할 필요 없다. 3단계로 점진적으로 적용한다.

### 1단계: Service만 분리 (같은 DB, 같은 테이블)

가장 간단한 형태. 코드 레벨에서만 분리.

```java
// Command Service: 쓰기 담당 — 도메인 로직 포함
@Service
@Transactional
@RequiredArgsConstructor
public class OrderCommandService {

    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    // Command: 주문 생성 — 도메인 객체를 통한 비즈니스 로직
    public OrderId placeOrder(PlaceOrderCommand command) {
        // 도메인 Aggregate 생성 (규칙 검증 포함)
        Order order = Order.create(
            new UserId(command.userId()),
            command.items()
        );
        Order saved = orderRepository.save(order);

        // 도메인 이벤트 발행
        saved.pullDomainEvents().forEach(eventPublisher::publishEvent);
        return saved.getId();
    }

    // Command: 주문 확정 — 도메인 객체에게 행동 위임
    public void confirmOrder(ConfirmOrderCommand command) {
        Order order = orderRepository.findById(command.orderId())
            .orElseThrow(() -> new OrderNotFoundException(command.orderId()));
        order.confirm();
        orderRepository.save(order);
        order.pullDomainEvents().forEach(eventPublisher::publishEvent);
    }

    // Command: 주문 취소
    public void cancelOrder(CancelOrderCommand command) {
        Order order = orderRepository.findById(command.orderId())
            .orElseThrow(() -> new OrderNotFoundException(command.orderId()));
        order.cancel(command.reason());
        orderRepository.save(order);
        order.pullDomainEvents().forEach(eventPublisher::publishEvent);
    }
}

// Query Service: 읽기 담당 — 도메인 객체 거치지 않고 DTO 직접 조회
@Service
@Transactional(readOnly = true) // 읽기 전용 트랜잭션 (성능 최적화)
@RequiredArgsConstructor
public class OrderQueryService {

    private final OrderQueryRepository queryRepository;

    // 주문 상세 조회 — JOIN 쿼리로 DTO 직접 조회
    public OrderDetailView getOrderDetail(Long orderId) {
        return queryRepository.findOrderDetailById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
    }

    // 내 주문 목록 — 페이지네이션 포함
    public Page<OrderSummaryView> getMyOrders(Long userId, Pageable pageable) {
        return queryRepository.findOrderSummariesByUserId(userId, pageable);
    }

    // 주문 검색 — 다양한 조건
    public List<OrderSummaryView> searchOrders(OrderSearchCondition condition) {
        return queryRepository.searchOrders(condition);
    }
}
```

---

### 읽기 전용 View (DTO)

```java
// 읽기에 특화된 View 객체 (도메인 객체와 무관)
// 조회에 필요한 데이터를 편리한 형태로 담음

// 주문 상세 뷰: 여러 테이블 JOIN 결과
public record OrderDetailView(
    Long orderId,
    String status,
    String statusLabel,         // "주문 접수", "배송 중" 등 한글 레이블
    BigDecimal totalAmount,
    String currencyCode,
    Long customerId,
    String customerName,
    String customerEmail,
    String deliveryAddress,
    List<OrderItemView> items,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    // 상태 레이블 변환 헬퍼
    public record OrderItemView(
        Long productId,
        String productName,
        int quantity,
        BigDecimal price,
        BigDecimal subtotal
    ) {}
}

// 주문 목록 뷰: 목록 표시에 필요한 최소 정보
public record OrderSummaryView(
    Long orderId,
    String status,
    BigDecimal totalAmount,
    int itemCount,
    String firstItemName,    // 대표 상품명 ("외 N개")
    LocalDateTime createdAt
) {}

// 검색 조건
public record OrderSearchCondition(
    Long userId,
    OrderStatus status,       // nullable: 전체 상태
    LocalDateTime from,       // nullable: 시작일
    LocalDateTime to,         // nullable: 종료일
    BigDecimal minAmount,     // nullable: 최소 금액
    BigDecimal maxAmount      // nullable: 최대 금액
) {}
```

---

### QueryDSL로 복잡한 조회 구현

```java
// Query 전용 Repository 구현
@Repository
@RequiredArgsConstructor
public class OrderQueryRepositoryImpl implements OrderQueryRepository {

    private final JPAQueryFactory queryFactory;

    // Q타입: QueryDSL이 자동 생성 (mvn compile 또는 gradle compileJava)
    private final QOrderJpaEntity order = QOrderJpaEntity.orderJpaEntity;
    private final QOrderItemJpaEntity item = QOrderItemJpaEntity.orderItemJpaEntity;
    private final QUserJpaEntity user = QUserJpaEntity.userJpaEntity;

    @Override
    public Optional<OrderDetailView> findOrderDetailById(Long orderId) {
        // 도메인 객체 거치지 않고 DTO 직접 조회 (성능 최적화)
        OrderDetailView result = queryFactory
            .select(Projections.constructor(OrderDetailView.class,
                order.id,
                order.status.stringValue(),
                Expressions.constant("주문 접수"), // 레이블은 별도 변환
                order.totalAmount,
                Expressions.constant("KRW"),
                user.id,
                user.name,
                user.email,
                order.deliveryAddress,
                Expressions.constant(List.of()), // items는 별도 쿼리
                order.createdAt,
                order.updatedAt
            ))
            .from(order)
            .join(user).on(user.id.eq(order.userId)) // JOIN
            .where(order.id.eq(orderId))
            .fetchOne();

        return Optional.ofNullable(result);
    }

    @Override
    public Page<OrderSummaryView> findOrderSummariesByUserId(
        Long userId, Pageable pageable
    ) {
        // 집계 쿼리: 주문당 아이템 수, 대표 상품명
        List<OrderSummaryView> content = queryFactory
            .select(Projections.constructor(OrderSummaryView.class,
                order.id,
                order.status.stringValue(),
                order.totalAmount,
                item.count().intValue(),    // 아이템 수 집계
                item.productName.min(),     // 대표 상품명 (첫 번째 상품)
                order.createdAt
            ))
            .from(order)
            .leftJoin(order.items, item)    // LEFT JOIN
            .where(order.userId.eq(userId))
            .groupBy(order.id)              // 주문별 그룹핑
            .orderBy(order.createdAt.desc()) // 최신순
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        // 전체 개수 쿼리 (페이지네이션용)
        Long total = queryFactory
            .select(order.count())
            .from(order)
            .where(order.userId.eq(userId))
            .fetchOne();

        return new PageImpl<>(content, pageable, total != null ? total : 0L);
    }

    @Override
    public List<OrderSummaryView> searchOrders(OrderSearchCondition condition) {
        // 동적 조건 조합
        BooleanBuilder where = new BooleanBuilder();

        if (condition.userId() != null) {
            where.and(order.userId.eq(condition.userId())); // 사용자 필터
        }
        if (condition.status() != null) {
            where.and(order.status.eq(condition.status())); // 상태 필터
        }
        if (condition.from() != null) {
            where.and(order.createdAt.goe(condition.from())); // 시작일 필터
        }
        if (condition.to() != null) {
            where.and(order.createdAt.loe(condition.to())); // 종료일 필터
        }
        if (condition.minAmount() != null) {
            where.and(order.totalAmount.goe(condition.minAmount())); // 최소 금액
        }
        if (condition.maxAmount() != null) {
            where.and(order.totalAmount.loe(condition.maxAmount())); // 최대 금액
        }

        return queryFactory
            .select(Projections.constructor(OrderSummaryView.class,
                order.id, order.status.stringValue(),
                order.totalAmount, item.count().intValue(),
                item.productName.min(), order.createdAt
            ))
            .from(order)
            .leftJoin(order.items, item)
            .where(where)
            .groupBy(order.id)
            .orderBy(order.createdAt.desc())
            .fetch();
    }
}
```

---

### Controller에서 Command/Query 분기

```java
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderCommandService commandService; // 쓰기
    private final OrderQueryService queryService;     // 읽기

    // ===== Command (상태 변경) =====

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> placeOrder(
        @RequestBody @Valid PlaceOrderRequest request,
        @AuthenticationPrincipal Long userId
    ) {
        // 요청 → Command 변환
        PlaceOrderCommand command = PlaceOrderCommand.from(userId, request);
        OrderId orderId = commandService.placeOrder(command);
        // 쓰기 응답은 최소화 (생성된 리소스 ID만)
        return Map.of("orderId", orderId.value());
    }

    @PostMapping("/{id}/confirm")
    @ResponseStatus(HttpStatus.OK)
    public void confirmOrder(@PathVariable Long id) {
        commandService.confirmOrder(new ConfirmOrderCommand(new OrderId(id)));
        // 쓰기 응답: 빈 body (204) 또는 최소 응답
    }

    @PostMapping("/{id}/cancel")
    @ResponseStatus(HttpStatus.OK)
    public void cancelOrder(
        @PathVariable Long id,
        @RequestBody CancelOrderRequest request
    ) {
        commandService.cancelOrder(new CancelOrderCommand(
            new OrderId(id), request.getReason()));
    }

    // ===== Query (조회만) =====

    @GetMapping("/{id}")
    public OrderDetailView getOrder(@PathVariable Long id) {
        return queryService.getOrderDetail(id); // 도메인 객체 거치지 않고 View 직접 반환
    }

    @GetMapping("/my")
    public Page<OrderSummaryView> getMyOrders(
        @AuthenticationPrincipal Long userId,
        @PageableDefault(size = 20, sort = "createdAt", direction = DESC)
        Pageable pageable
    ) {
        return queryService.getMyOrders(userId, pageable);
    }

    @GetMapping("/search")
    public List<OrderSummaryView> searchOrders(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime from,
        @RequestParam(required = false) @DateTimeFormat(iso = DATE_TIME) LocalDateTime to,
        @AuthenticationPrincipal Long userId
    ) {
        OrderSearchCondition condition = new OrderSearchCondition(
            userId,
            status != null ? OrderStatus.valueOf(status) : null,
            from, to, null, null
        );
        return queryService.searchOrders(condition);
    }
}
```

---

## 2단계: 읽기 전용 DB Replica

DB 레벨에서 읽기/쓰기 분리. 코드 변경 최소화로 성능을 크게 향상시킬 수 있다.

```java
// application.yml — Multi DataSource 설정
spring:
  datasource:
    write:  # 쓰기 DB (Primary)
      url: jdbc:mysql://primary-db:3306/app
      username: app_user
      password: password
    read:   # 읽기 DB (Replica)
      url: jdbc:mysql://replica-db:3306/app
      username: app_readonly
      password: password

// DataSource 라우팅 설정
@Configuration
public class DataSourceConfig {

    @Bean
    @Primary
    public DataSource routingDataSource(
        @Qualifier("writeDataSource") DataSource write,
        @Qualifier("readDataSource") DataSource read
    ) {
        Map<Object, Object> targets = new HashMap<>();
        targets.put(DataSourceType.WRITE, write);
        targets.put(DataSourceType.READ, read);

        RoutingDataSource routing = new RoutingDataSource();
        routing.setTargetDataSources(targets);
        routing.setDefaultTargetDataSource(write); // 기본은 쓰기 DB
        return routing;
    }
}

// 트랜잭션 타입에 따라 DataSource 선택
public class RoutingDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        // @Transactional(readOnly = true) 이면 읽기 DB 선택
        boolean readOnly = TransactionSynchronizationManager.isCurrentTransactionReadOnly();
        return readOnly ? DataSourceType.READ : DataSourceType.WRITE;
    }
}
```

---

## 3단계: 별도 Read Model (이벤트 기반)

쓰기 DB와 읽기 저장소가 완전히 다른 기술 스택. 이벤트로 동기화.

```java
// 이벤트 기반 Read Model 동기화
// OrderConfirmedEvent 발생 → Read Model 업데이트
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderReadModelProjector {

    private final OrderReadModelRepository readModelRepository; // Elasticsearch or Redis

    // 주문 생성 → Read Model에 추가
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderPlaced(OrderPlacedEvent event) {
        OrderReadModel model = OrderReadModel.builder()
            .orderId(event.getOrderId().value())
            .userId(event.getUserId().value())
            .status("PENDING")
            .statusLabel("주문 접수")
            .totalAmount(event.getTotalAmount().amount())
            .itemCount(event.getItemCount())
            .createdAt(event.getOccurredAt())
            .build();

        readModelRepository.save(model); // 검색 인덱스에 저장
        log.info("Read Model 생성: orderId={}", event.getOrderId());
    }

    // 주문 확정 → 상태 업데이트
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderConfirmed(OrderConfirmedEvent event) {
        readModelRepository.updateStatus(
            event.getOrderId().value(),
            "CONFIRMED",
            "주문 확정"
        );
    }

    // 주문 취소 → 상태 업데이트
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderCancelled(OrderCancelledEvent event) {
        readModelRepository.updateStatus(
            event.getOrderId().value(),
            "CANCELLED",
            "주문 취소"
        );
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
    private String statusLabel;
    private BigDecimal totalAmount;
    private int itemCount;
    private Instant createdAt;
    // 검색을 위한 비정규화 필드 (JOIN 없이 조회 가능)
    private String customerName;     // 사용자 서비스에서 가져온 이름
    private List<String> productNames; // 주문한 상품명 목록 (전문 검색용)
    private String deliveryCity;      // 배송지 도시 (지역 필터용)
}

// Query Service에서 Elasticsearch 사용
@Service
@RequiredArgsConstructor
public class OrderQueryService {

    private final OrderReadModelRepository esRepository;

    public Page<OrderReadModel> searchOrders(
        String keyword, Long userId, Pageable pageable
    ) {
        // Elasticsearch 전문 검색 (상품명으로 주문 찾기)
        return esRepository.findByUserIdAndProductNamesContaining(
            userId, keyword, pageable
        );
    }
}
```

---

## 흔한 실수

### 실수 1: Query에서 도메인 객체 경유

```java
// 나쁜 예 ❌ — Query가 도메인 객체를 거침 (불필요한 변환)
@Transactional(readOnly = true)
public OrderDetailView getOrderDetail(Long orderId) {
    Order order = orderRepository.findById(new OrderId(orderId)).orElseThrow(); // 도메인 로드
    return OrderDetailView.from(order); // DTO로 변환
    // 문제: 도메인 객체 로드 → JOIN 필요 → 변환 → 비효율
}

// 좋은 예 ✅ — Query가 DTO 직접 조회
@Transactional(readOnly = true)
public OrderDetailView getOrderDetail(Long orderId) {
    return queryRepository.findOrderDetailById(orderId).orElseThrow();
    // JOIN 쿼리로 필요한 데이터만 DTO에 담아 바로 반환
}
```

### 실수 2: Command에서 조회 로직 반환

```java
// 나쁜 예 ❌ — Command가 상세 응답 반환
public OrderDetailView placeOrder(PlaceOrderCommand command) {
    Order order = Order.create(...);
    orderRepository.save(order);
    return OrderDetailView.from(order); // 쓰기가 읽기 역할까지
}

// 좋은 예 ✅ — Command는 ID만 반환
public OrderId placeOrder(PlaceOrderCommand command) {
    Order order = Order.create(...);
    return orderRepository.save(order).getId();
    // 클라이언트가 필요하면 GET /orders/{id}로 별도 조회
}
```

---

## 언제 CQRS를 써야 하나

```
단계별 도입 판단:

1단계 (Service 분리만): 거의 모든 중규모 이상 서비스에 권장
   - 읽기와 쓰기의 코드가 뒤섞여 복잡할 때
   - 비용: 낮음, 효과: 코드 복잡도 감소

2단계 (Read Replica): 읽기 요청이 쓰기의 10배 이상일 때
   - 쓰기 트랜잭션이 읽기에 영향을 줄 때
   - 비용: DB 운영 비용 증가, 효과: 쿼리 성능 향상

3단계 (별도 Read Model): 검색이나 집계가 복잡할 때
   - 실시간 대시보드, 전문 검색 필요
   - 비용: 높음 (이벤트 일관성 관리), 효과: 조회 성능 극대화

과할 수 있는 경우:
— 단순 CRUD (Create/Read/Update/Delete만 있는 경우)
— 읽기와 쓰기 비율이 비슷한 경우
— 1-2인 소규모, 빠른 프로토타이핑
— 데이터 일관성이 최우선인 경우 (실시간 잔액 등)
```
