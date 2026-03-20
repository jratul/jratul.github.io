---
title: "이벤트 드리븐 아키텍처"
order: 23
---

## 왜 이벤트 드리븐인가

직접 호출 방식은 서비스 간 결합도가 높아집니다.

```
// 직접 호출: OrderService가 모든 서비스를 알아야 함
public Order createOrder(OrderRequest req) {
    Order order = orderRepository.save(...);
    inventoryService.decrease(order);    // 재고 서비스 직접 호출
    emailService.sendConfirmation(order); // 이메일 서비스 직접 호출
    pointService.earnPoints(order);       // 포인트 서비스 직접 호출
    return order;
}

// 이벤트 방식: OrderService는 이벤트만 발행
public Order createOrder(OrderRequest req) {
    Order order = orderRepository.save(...);
    eventPublisher.publish(new OrderCreatedEvent(order));  // 끝
    return order;
}
// 재고/이메일/포인트는 각자 구독해서 처리
```

---

## Spring 내부 이벤트 (ApplicationEventPublisher)

단일 서비스 내 컴포넌트 간 결합도를 낮춥니다.

```java
// 이벤트 정의
public record OrderCreatedEvent(
    Long orderId,
    Long userId,
    Long totalAmount,
    LocalDateTime occurredAt
) {}

// 이벤트 발행
@Service
@Transactional
public class OrderService {

    private final ApplicationEventPublisher eventPublisher;

    public Order createOrder(OrderRequest request) {
        Order order = orderRepository.save(Order.from(request));

        // 트랜잭션 내 이벤트 발행
        eventPublisher.publishEvent(new OrderCreatedEvent(
            order.getId(), order.getUserId(), order.getTotalAmount(), LocalDateTime.now()
        ));

        return order;
    }
}

// 이벤트 구독
@Component
public class OrderEventHandler {

    // DB 커밋 후 실행 — 이메일 발송은 주문이 실제 저장된 후에
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleOrderCreated(OrderCreatedEvent event) {
        emailService.sendOrderConfirmation(event.userId(), event.orderId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async  // 비동기 처리
    public void earnPoints(OrderCreatedEvent event) {
        pointService.earn(event.userId(), event.totalAmount() / 100);
    }
}
```

---

## 도메인 이벤트 (DDD 패턴)

엔티티가 직접 도메인 이벤트를 쌓고, 저장 시 자동 발행합니다.

```java
// AbstractAggregateRoot 상속
@Entity
public class Order extends AbstractAggregateRoot<Order> {

    @Id @GeneratedValue
    private Long id;

    private OrderStatus status;

    public static Order create(Long userId, List<OrderItem> items) {
        Order order = new Order(userId, items);
        order.registerEvent(new OrderCreatedEvent(order.getId(), userId));  // 이벤트 등록
        return order;
    }

    public void cancel() {
        if (status != OrderStatus.PENDING) throw new BusinessException(CANNOT_CANCEL);
        this.status = OrderStatus.CANCELLED;
        registerEvent(new OrderCancelledEvent(this.id));
    }
}

// Repository.save() 시 @DomainEvents가 자동 발행됨
@Service
@Transactional
public class OrderService {
    public Order cancelOrder(Long orderId) {
        Order order = orderRepository.findById(orderId).orElseThrow();
        order.cancel();  // 이벤트 등록
        return orderRepository.save(order);  // save() 시 이벤트 자동 발행
    }
}
```

---

## Outbox 패턴

Kafka 전송 실패로 인한 데이터 불일치를 방지합니다.

```
문제:
  1. DB 저장 성공
  2. Kafka 전송 실패  → 재고 감소 안 됨, 이메일 안 옴

Outbox 패턴:
  1. DB 저장 + Outbox 테이블에 메시지 저장 (같은 트랜잭션)
  2. Outbox Polling → Kafka 전송
  3. 전송 성공 시 Outbox 레코드 처리 완료 표시
```

```java
// Outbox 엔티티
@Entity
@Table(name = "outbox_events")
public class OutboxEvent {
    @Id @GeneratedValue
    private Long id;

    private String aggregateType;  // "ORDER"
    private Long aggregateId;
    private String eventType;       // "ORDER_CREATED"

    @Column(columnDefinition = "TEXT")
    private String payload;         // JSON

    private boolean processed;
    private LocalDateTime createdAt;
    private LocalDateTime processedAt;
}

// 주문 생성과 Outbox 저장을 같은 트랜잭션으로
@Service
@Transactional
public class OrderService {

    private final OrderRepository orderRepository;
    private final OutboxEventRepository outboxRepository;
    private final ObjectMapper objectMapper;

    public Order createOrder(OrderRequest request) {
        Order order = orderRepository.save(Order.from(request));

        // 같은 트랜잭션 — 둘 다 성공하거나 둘 다 실패
        outboxRepository.save(OutboxEvent.builder()
            .aggregateType("ORDER")
            .aggregateId(order.getId())
            .eventType("ORDER_CREATED")
            .payload(objectMapper.writeValueAsString(new OrderCreatedEvent(order)))
            .processed(false)
            .createdAt(LocalDateTime.now())
            .build());

        return order;
    }
}

// Outbox 폴링 — 배치로 Kafka에 전송
@Scheduled(fixedDelay = 1000)
@Transactional
public void publishOutboxEvents() {
    List<OutboxEvent> events = outboxRepository
        .findByProcessedFalseOrderByCreatedAtAsc(PageRequest.of(0, 100));

    for (OutboxEvent event : events) {
        try {
            kafkaTemplate.send(event.getEventType().toLowerCase(), event.getPayload()).get();
            event.markProcessed();
        } catch (Exception e) {
            log.error("Outbox 전송 실패 — id={}", event.getId(), e);
        }
    }
}
```

---

## Saga 패턴 (분산 트랜잭션)

마이크로서비스 간 트랜잭션을 이벤트 체인으로 처리합니다.

```
주문 생성 Saga (Choreography 방식):

OrderService    → ORDER_CREATED 이벤트 발행
InventoryService → ORDER_CREATED 수신 → 재고 감소 → INVENTORY_DECREASED 발행
PaymentService   → INVENTORY_DECREASED 수신 → 결제 처리 → PAYMENT_COMPLETED 발행
OrderService    → PAYMENT_COMPLETED 수신 → 주문 완료

실패 시 보상 트랜잭션:
PaymentService 실패 → PAYMENT_FAILED 발행
InventoryService → PAYMENT_FAILED 수신 → 재고 복구
OrderService    → 주문 취소
```

```java
@Component
public class InventoryEventHandler {

    @KafkaListener(topics = "order-created", groupId = "inventory")
    public void onOrderCreated(@Payload OrderCreatedEvent event) {
        try {
            inventoryService.decrease(event.getProductId(), event.getQuantity());
            kafkaTemplate.send("inventory-decreased",
                new InventoryDecreasedEvent(event.getOrderId()));
        } catch (InsufficientStockException e) {
            // 보상 이벤트 발행
            kafkaTemplate.send("inventory-failed",
                new InventoryFailedEvent(event.getOrderId(), "재고 부족"));
        }
    }

    @KafkaListener(topics = "payment-failed", groupId = "inventory")
    public void onPaymentFailed(@Payload PaymentFailedEvent event) {
        // 보상 트랜잭션: 재고 복구
        inventoryService.restore(event.getOrderId());
    }
}
```

---

## CQRS (Command Query Responsibility Segregation)

쓰기(Command)와 읽기(Query) 모델을 분리합니다.

```java
// Command — 쓰기 모델 (정규화된 DB)
@Service
@Transactional
public class OrderCommandService {

    public Order createOrder(CreateOrderCommand command) {
        Order order = orderRepository.save(Order.from(command));
        eventPublisher.publishEvent(new OrderCreatedEvent(order));
        return order;
    }
}

// Query — 읽기 모델 (비정규화, 조회에 최적화)
@Service
@Transactional(readOnly = true)
public class OrderQueryService {

    // 별도의 읽기 전용 뷰 테이블 사용
    public OrderDetailView getOrderDetail(Long orderId) {
        return orderDetailViewRepository.findById(orderId).orElseThrow();
    }

    public Page<OrderListView> getMyOrders(Long userId, Pageable pageable) {
        return orderListViewRepository.findByUserId(userId, pageable);
    }
}

// 이벤트 핸들러가 읽기 모델 동기화
@Component
public class OrderViewUpdater {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void updateOrderView(OrderCreatedEvent event) {
        orderDetailViewRepository.save(OrderDetailView.from(event));
        orderListViewRepository.upsert(OrderListView.from(event));
    }
}
```
