---
title: "이벤트 드리븐 아키텍처"
order: 23
---

## 이벤트 드리븐이란 무엇인가

이벤트 드리븐 아키텍처는 **서비스들이 직접 호출하는 대신 이벤트를 발행하고 구독**하는 방식입니다.

**라디오 방송 비유:**
직접 호출 방식은 전화(발신자가 수신자를 직접 알고 연결)이고, 이벤트 방식은 라디오 방송(방송사는 누가 듣는지 모르지만 방송하고, 듣고 싶은 사람이 채널을 맞춤)입니다.

**직접 호출 방식의 문제:**

```java
// 직접 호출: OrderService가 모든 서비스를 알고 의존함
@Service
public class OrderService {
    private final InventoryService inventoryService;   // 직접 의존
    private final EmailService emailService;           // 직접 의존
    private final PointService pointService;           // 직접 의존
    private final PushService pushService;             // 직접 의존 (새 서비스 추가마다 수정!)

    public Order createOrder(OrderRequest req) {
        Order order = orderRepository.save(Order.from(req));
        inventoryService.decrease(order);   // 이게 실패하면?
        emailService.sendConfirmation(order); // 이게 느리면?
        pointService.earnPoints(order);      // 이게 죽으면?
        pushService.sendNotification(order); // OrderService도 같이 죽음
        return order;
    }
}
```

**이벤트 방식으로 개선:**

```java
// 이벤트 방식: OrderService는 이벤트 발행만
@Service
public class OrderService {
    private final ApplicationEventPublisher eventPublisher;  // 이벤트 발행자만 의존

    public Order createOrder(OrderRequest req) {
        Order order = orderRepository.save(Order.from(req));
        eventPublisher.publishEvent(new OrderCreatedEvent(order));  // 끝!
        return order;
        // 재고, 이메일, 포인트, 푸시는 각자 알아서 처리
    }
}
```

---

## Spring 내부 이벤트 (ApplicationEventPublisher)

단일 서비스 내에서 컴포넌트 간 결합도를 낮출 때 사용합니다. Kafka 없이도 이벤트 방식으로 코드를 작성할 수 있습니다.

```java
// 이벤트 클래스 정의 (record 추천 - 불변 객체)
public record OrderCreatedEvent(
    Long orderId,            // 주문 ID
    Long userId,             // 주문한 사용자 ID
    Long totalAmount,        // 총 금액
    List<Long> productIds,   // 주문한 상품 IDs
    LocalDateTime occurredAt // 이벤트 발생 시각
) {}

public record OrderCancelledEvent(
    Long orderId,
    Long userId,
    String reason
) {}
```

```java
// 이벤트 발행
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    public Order createOrder(OrderRequest request) {
        Order order = orderRepository.save(Order.from(request));
        log.info("주문 생성: orderId={}", order.getId());

        // 트랜잭션 내에서 이벤트 등록 (아직 발행 안 됨)
        eventPublisher.publishEvent(new OrderCreatedEvent(
            order.getId(),
            order.getUserId(),
            order.getTotalAmount(),
            order.getItems().stream().map(i -> i.getProductId()).toList(),
            LocalDateTime.now()
        ));

        return order;  // 이후 트랜잭션 커밋 → 그때 이벤트 발행
    }
}
```

```java
// 이벤트 구독 - 여러 핸들러가 독립적으로 처리
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventHandler {

    private final EmailService emailService;
    private final PointService pointService;
    private final InventoryService inventoryService;

    // AFTER_COMMIT: DB 트랜잭션이 커밋된 후 실행
    // → 이메일은 주문이 실제 저장된 후에만 보내야 함
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendConfirmationEmail(OrderCreatedEvent event) {
        log.info("주문 확인 이메일 발송: orderId={}", event.orderId());
        emailService.sendOrderConfirmation(event.userId(), event.orderId());
    }

    // @Async: 이메일 전송이 느려도 주문 응답에 영향 없음
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void earnPoints(OrderCreatedEvent event) {
        log.info("포인트 적립: userId={}, amount={}",
            event.userId(), event.totalAmount());
        pointService.earn(event.userId(), event.totalAmount() / 100);
    }

    // BEFORE_COMMIT: 트랜잭션 안에서 실행 (같은 트랜잭션으로 묶임)
    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void decreaseInventory(OrderCreatedEvent event) {
        // 재고 감소는 주문 저장과 같은 트랜잭션으로 묶어서 원자성 보장
        inventoryService.decrease(event.productIds());
    }

    // 주문 취소 이벤트 처리
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handleOrderCancelled(OrderCancelledEvent event) {
        log.info("주문 취소 처리: orderId={}", event.orderId());
        pointService.revoke(event.userId(), event.orderId());
        emailService.sendCancellationEmail(event.userId(), event.orderId());
    }
}
```

---

## 도메인 이벤트 (DDD 패턴)

엔티티가 직접 이벤트를 등록하고, Repository.save() 시 자동 발행합니다.

```java
// AbstractAggregateRoot를 상속하면 registerEvent() 사용 가능
@Entity
@Table(name = "orders")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Order extends AbstractAggregateRoot<Order> {

    @Id @GeneratedValue
    private Long id;

    private Long userId;
    private OrderStatus status;
    private Long totalAmount;

    // 팩토리 메서드에서 이벤트 등록
    public static Order create(Long userId, List<OrderItem> items) {
        Order order = new Order();
        order.userId = userId;
        order.status = OrderStatus.PENDING;
        order.totalAmount = items.stream().mapToLong(OrderItem::getPrice).sum();

        // 이벤트 등록 (save() 시 자동 발행)
        order.registerEvent(new OrderCreatedEvent(
            null,  // id는 save() 후에 생김
            userId,
            order.totalAmount,
            items.stream().map(OrderItem::getProductId).toList(),
            LocalDateTime.now()
        ));

        return order;
    }

    // 취소 - 도메인 로직 + 이벤트 등록
    public void cancel(String reason) {
        if (this.status != OrderStatus.PENDING) {
            throw new BusinessException(ErrorCode.ORDER_CANNOT_CANCEL);
        }
        this.status = OrderStatus.CANCELLED;

        // 취소 이벤트 등록
        registerEvent(new OrderCancelledEvent(this.id, this.userId, reason));
    }
}

// Service에서 save() 한 번만 호출하면 이벤트 자동 발행
@Service
@Transactional
@RequiredArgsConstructor
public class OrderService {

    public Order cancelOrder(Long orderId, String reason) {
        Order order = orderRepository.findById(orderId).orElseThrow();
        order.cancel(reason);                // 이벤트 등록
        return orderRepository.save(order);  // save() 시 등록된 이벤트 자동 발행
    }
}
```

---

## Outbox 패턴

DB 저장과 Kafka 발행을 원자적으로 처리합니다.

**왜 필요한가?**

```
문제 시나리오:
1. 주문 DB 저장 성공 ✓
2. Kafka 이벤트 전송 실패 ✗
→ 재고 감소 안 됨, 이메일 안 감 (데이터 불일치!)

해결책 - Outbox 패턴:
1. 주문 DB 저장 + Outbox 테이블에 이벤트 저장 (같은 트랜잭션)
   → 둘 다 성공하거나 둘 다 실패 (원자성 보장)
2. 별도 스케줄러가 Outbox 테이블을 읽어 Kafka 전송
3. 전송 성공 시 처리 완료 표시
```

```java
// Outbox 엔티티
@Entity
@Table(name = "outbox_events")
@Getter
@Builder
public class OutboxEvent {

    @Id @GeneratedValue
    private Long id;

    private String aggregateType;   // "ORDER", "PAYMENT" 등
    private Long aggregateId;       // 주문 ID, 결제 ID 등
    private String eventType;       // "ORDER_CREATED", "ORDER_CANCELLED"

    @Column(columnDefinition = "TEXT")
    private String payload;         // JSON 직렬화된 이벤트 데이터

    private boolean published;      // Kafka 발행 완료 여부
    private int retryCount;         // 재시도 횟수
    private LocalDateTime createdAt;
    private LocalDateTime publishedAt;

    public void markPublished() {
        this.published = true;
        this.publishedAt = LocalDateTime.now();
    }

    public void incrementRetry() {
        this.retryCount++;
    }
}
```

```java
// 주문 서비스 - DB 저장 + Outbox 저장 원자적으로
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final OutboxEventRepository outboxRepository;
    private final ObjectMapper objectMapper;

    public Order createOrder(OrderRequest request) throws JsonProcessingException {
        // 주문 저장
        Order order = orderRepository.save(Order.from(request));

        // 같은 트랜잭션에서 Outbox에 이벤트 저장
        // → 주문 저장 실패 시 Outbox 저장도 롤백
        // → Outbox 저장 실패 시 주문 저장도 롤백
        OutboxEvent outbox = OutboxEvent.builder()
            .aggregateType("ORDER")
            .aggregateId(order.getId())
            .eventType("ORDER_CREATED")
            .payload(objectMapper.writeValueAsString(
                new OrderCreatedPayload(order.getId(), order.getUserId(),
                    order.getTotalAmount())))
            .published(false)
            .retryCount(0)
            .createdAt(LocalDateTime.now())
            .build();

        outboxRepository.save(outbox);
        log.info("주문 생성 및 Outbox 저장: orderId={}", order.getId());

        return order;
    }
}

// Outbox 폴링 & 발행 (별도 스케줄러)
@Component
@Transactional
@Slf4j
@RequiredArgsConstructor
public class OutboxPublisher {

    private final OutboxEventRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(fixedDelay = 1000)  // 1초마다 실행
    public void publishPendingEvents() {
        // 미발행 이벤트 최대 100개, 재시도 3번 이하만 조회
        List<OutboxEvent> pending =
            outboxRepository.findByPublishedFalseAndRetryCountLessThan(
                3, PageRequest.of(0, 100));

        for (OutboxEvent event : pending) {
            try {
                // Kafka 발행 (동기 - 성공 확인)
                kafkaTemplate.send(
                    event.getEventType().toLowerCase(),  // 토픽 이름
                    event.getAggregateId().toString(),  // 파티션 키
                    event.getPayload()                   // 메시지
                ).get();  // 전송 완료 대기

                event.markPublished();  // 발행 성공 표시
                log.debug("Outbox 발행 성공: id={}", event.getId());

            } catch (Exception e) {
                event.incrementRetry();  // 재시도 횟수 증가
                log.warn("Outbox 발행 실패 ({}회): id={}, error={}",
                    event.getRetryCount(), event.getId(), e.getMessage());
            }
        }
    }
}
```

---

## Saga 패턴 (분산 트랜잭션)

마이크로서비스 간 트랜잭션을 이벤트 체인으로 처리합니다. 실패 시 보상 트랜잭션으로 이전 상태로 되돌립니다.

```
주문 생성 Saga (Choreography 방식 - 중앙 조율자 없이 서비스끼리 직접):

┌──────────────────────────────────────────────────────────────────┐
│ 1. OrderService     → ORDER_CREATED 이벤트 발행                  │
│ 2. InventoryService → ORDER_CREATED 수신 → 재고 감소             │
│                     → INVENTORY_DECREASED 이벤트 발행            │
│ 3. PaymentService   → INVENTORY_DECREASED 수신 → 결제 처리       │
│                     → PAYMENT_COMPLETED 이벤트 발행              │
│ 4. OrderService     → PAYMENT_COMPLETED 수신 → 주문 완료         │
└──────────────────────────────────────────────────────────────────┘

실패 시 보상 트랜잭션:
PaymentService 결제 실패 → PAYMENT_FAILED 발행
InventoryService → PAYMENT_FAILED 수신 → 재고 복구
OrderService → 주문 취소
```

```java
// 재고 서비스의 Saga 참여
@Component
@KafkaListener
@RequiredArgsConstructor
@Slf4j
public class InventoryEventHandler {

    private final InventoryService inventoryService;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    // 주문 생성 이벤트 수신 → 재고 감소
    @KafkaListener(topics = "order-created", groupId = "inventory")
    public void onOrderCreated(@Payload OrderCreatedEvent event) {
        log.info("재고 감소 처리: orderId={}", event.orderId());

        try {
            inventoryService.decrease(event.productIds(), event.quantities());

            // 성공 → 다음 단계 진행 이벤트 발행
            kafkaTemplate.send("inventory-decreased",
                new InventoryDecreasedEvent(event.orderId(), event.userId()));

        } catch (InsufficientStockException e) {
            log.warn("재고 부족: orderId={}", event.orderId());

            // 실패 → 보상 이벤트 발행 (주문 취소 요청)
            kafkaTemplate.send("inventory-failed",
                new InventoryFailedEvent(event.orderId(), "재고 부족: " + e.getMessage()));
        }
    }

    // 결제 실패 이벤트 수신 → 재고 복구 (보상 트랜잭션)
    @KafkaListener(topics = "payment-failed", groupId = "inventory-compensate")
    public void onPaymentFailed(@Payload PaymentFailedEvent event) {
        log.info("보상 트랜잭션 - 재고 복구: orderId={}", event.orderId());
        inventoryService.restore(event.orderId());  // 재고 원복
    }
}
```

---

## CQRS (Command Query Responsibility Segregation)

쓰기(Command)와 읽기(Query) 모델을 분리합니다.

**왜 분리하는가?**
- 쓰기: 정합성 중요 → 정규화된 DB, 복잡한 트랜잭션
- 읽기: 성능 중요 → 비정규화, 조회에 최적화된 구조

```
일반적인 문제:
OrderDetail 조회 시 Order + User + Product를 JOIN
→ 복잡한 쿼리 + 느린 응답

CQRS 적용 후:
쓰기: orders, users, products 테이블 (정규화)
읽기: order_detail_view 테이블 (비정규화, 이미 JOIN된 데이터 저장)
→ 단순 SELECT → 빠른 응답
```

```java
// Command 처리 (쓰기 모델)
@Service
@Transactional
@RequiredArgsConstructor
public class OrderCommandService {

    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    public Order createOrder(CreateOrderCommand command) {
        Order order = orderRepository.save(Order.from(command));
        // 이벤트 발행 → 읽기 모델 업데이트 트리거
        eventPublisher.publishEvent(new OrderCreatedEvent(order));
        return order;
    }

    public void cancelOrder(CancelOrderCommand command) {
        Order order = orderRepository.findById(command.orderId()).orElseThrow();
        order.cancel(command.reason());
        orderRepository.save(order);
        eventPublisher.publishEvent(new OrderCancelledEvent(order));
    }
}

// Query 처리 (읽기 모델)
@Service
@Transactional(readOnly = true)  // 읽기 전용 트랜잭션 (성능 최적화)
@RequiredArgsConstructor
public class OrderQueryService {

    private final OrderDetailViewRepository detailViewRepo;
    private final OrderListViewRepository listViewRepo;

    // 비정규화된 뷰에서 빠르게 조회
    public OrderDetailView getOrderDetail(Long orderId) {
        return detailViewRepo.findById(orderId)
            .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND));
    }

    public Page<OrderListView> getMyOrders(Long userId, Pageable pageable) {
        return listViewRepo.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }
}

// 이벤트 핸들러가 읽기 모델 동기화
@Component
@RequiredArgsConstructor
@Async  // 비동기로 읽기 모델 업데이트 (쓰기 성능에 영향 없음)
@Slf4j
public class OrderViewUpdater {

    private final OrderDetailViewRepository detailViewRepo;
    private final OrderListViewRepository listViewRepo;
    private final OrderRepository orderRepository;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void updateViews(OrderCreatedEvent event) {
        log.debug("읽기 모델 업데이트: orderId={}", event.orderId());

        // 쓰기 모델에서 조회해서 읽기 모델 생성
        Order order = orderRepository.findWithUserAndItems(event.orderId()).orElseThrow();

        // 상세 뷰 저장 (비정규화)
        detailViewRepo.save(OrderDetailView.builder()
            .orderId(order.getId())
            .userId(order.getUserId())
            .userName(order.getUser().getName())      // 비정규화: User JOIN 결과 저장
            .totalAmount(order.getTotalAmount())
            .status(order.getStatus().name())
            .items(order.getItems().stream()
                .map(item -> new OrderItemView(
                    item.getProductId(),
                    item.getProductName(),             // 비정규화: Product 이름 저장
                    item.getQuantity(),
                    item.getPrice()
                )).toList())
            .createdAt(order.getCreatedAt())
            .build());

        // 목록 뷰 저장 (간략 정보만)
        listViewRepo.save(OrderListView.builder()
            .orderId(order.getId())
            .userId(order.getUserId())
            .totalAmount(order.getTotalAmount())
            .status(order.getStatus().name())
            .itemCount(order.getItems().size())
            .createdAt(order.getCreatedAt())
            .build());
    }
}
```

---

## 초보자가 자주 하는 실수

**실수 1: @TransactionalEventListener phase 이해 부족**

```java
// BEFORE_COMMIT: 트랜잭션 안에서 실행 → 여기서 예외 나면 롤백
@TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
public void handleEvent(OrderCreatedEvent event) {
    inventoryService.decrease(event.productIds());  // 재고 감소 → 롤백 가능
}

// AFTER_COMMIT: 커밋 후 실행 → 여기서 예외 나도 주문 롤백 안 됨
// → 이메일, 포인트처럼 실패해도 주문은 유지해야 하는 경우
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void sendEmail(OrderCreatedEvent event) {
    emailService.send(event.userId());  // 실패해도 주문은 유지
}
```

**실수 2: 이벤트 핸들러에서 무거운 작업을 동기로 처리**

```java
// 나쁜 예: 이메일 전송 3초 → 주문 응답도 3초 늦어짐
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void sendEmail(OrderCreatedEvent event) {  // @Async 없음
    emailService.sendSlowEmail(event.userId());  // 3초 걸림
}

// 좋은 예: 비동기로 처리
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
@Async  // 별도 스레드에서 실행 → 응답 속도에 영향 없음
public void sendEmail(OrderCreatedEvent event) {
    emailService.sendSlowEmail(event.userId());
}
```
