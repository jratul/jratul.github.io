---
title: "이벤트 소싱"
order: 7
---

# 이벤트 소싱 (Event Sourcing)

상태 대신 이벤트를 저장하는 패턴.

---

## 개념

```
전통적 방식: 현재 상태만 저장
orders 테이블:
id | status    | total_amount | updated_at
1  | CONFIRMED | 50000        | 2024-01-02

이벤트 소싱: 이벤트(변화)를 저장
order_events 테이블:
id | order_id | event_type       | payload         | occurred_at
1  | 1        | ORDER_PLACED     | {items: [...]}  | 2024-01-01
2  | 1        | ORDER_CONFIRMED  | {}              | 2024-01-02
3  | 1        | ITEM_ADDED       | {productId: 5}  | 2024-01-02

현재 상태 = 이벤트 순서대로 재생(replay)
```

---

## 구현

```java
// 이벤트 기반 클래스
public sealed interface OrderEvent permits
    OrderPlaced, OrderConfirmed, OrderCancelled, OrderItemAdded {

    OrderId orderId();
    Instant occurredAt();
}

public record OrderPlaced(
    OrderId orderId,
    UserId userId,
    List<OrderItemData> items,
    Instant occurredAt
) implements OrderEvent {}

public record OrderConfirmed(
    OrderId orderId,
    Instant occurredAt
) implements OrderEvent {}

public record OrderCancelled(
    OrderId orderId,
    String reason,
    Instant occurredAt
) implements OrderEvent {}

// Aggregate: 이벤트를 적용하며 상태 복원
@Getter
public class Order {
    private OrderId id;
    private UserId userId;
    private List<OrderItem> items = new ArrayList<>();
    private OrderStatus status;
    private Money totalAmount;

    // 이벤트 목록으로 Aggregate 복원
    public static Order reconstitute(List<OrderEvent> events) {
        Order order = new Order();
        events.forEach(order::apply);
        return order;
    }

    // 상태 변경은 이벤트를 통해서만
    public List<OrderEvent> place(UserId userId, List<OrderItemData> items) {
        OrderPlaced event = new OrderPlaced(
            OrderId.newId(), userId, items, Instant.now());
        apply(event);
        return List.of(event);
    }

    public List<OrderEvent> confirm() {
        if (this.status != OrderStatus.PENDING) {
            throw new OrderStatusException("대기 상태에서만 확정 가능");
        }
        OrderConfirmed event = new OrderConfirmed(this.id, Instant.now());
        apply(event);
        return List.of(event);
    }

    public List<OrderEvent> cancel(String reason) {
        if (this.status == OrderStatus.SHIPPED) {
            throw new OrderStatusException("배송 중 취소 불가");
        }
        OrderCancelled event = new OrderCancelled(this.id, reason, Instant.now());
        apply(event);
        return List.of(event);
    }

    // 이벤트 적용: 상태 업데이트
    private void apply(OrderEvent event) {
        switch (event) {
            case OrderPlaced e -> {
                this.id = e.orderId();
                this.userId = e.userId();
                this.status = OrderStatus.PENDING;
                this.items = e.items().stream()
                    .map(OrderItem::from)
                    .collect(Collectors.toCollection(ArrayList::new));
                this.totalAmount = calculateTotal(this.items);
            }
            case OrderConfirmed e -> {
                this.status = OrderStatus.CONFIRMED;
            }
            case OrderCancelled e -> {
                this.status = OrderStatus.CANCELLED;
            }
            case OrderItemAdded e -> {
                this.items.add(OrderItem.from(e.item()));
                this.totalAmount = calculateTotal(this.items);
            }
        }
    }
}
```

---

## Event Store

```java
// Event Store: 이벤트 영속화
public interface EventStore {
    void append(OrderId aggregateId, List<OrderEvent> events, int expectedVersion);
    List<OrderEvent> load(OrderId aggregateId);
    List<OrderEvent> load(OrderId aggregateId, int fromVersion);
}

// JPA 기반 Event Store
@Repository
@RequiredArgsConstructor
public class JpaEventStore implements EventStore {

    private final EventStoreJpaRepository repository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void append(OrderId aggregateId, List<OrderEvent> events, int expectedVersion) {
        // 낙관적 잠금: 예상 버전 확인
        int currentVersion = repository.getMaxVersion(aggregateId.value());
        if (currentVersion != expectedVersion) {
            throw new OptimisticLockingFailureException(
                "Expected version " + expectedVersion + " but got " + currentVersion);
        }

        List<EventStoreEntry> entries = new ArrayList<>();
        int version = expectedVersion;
        for (OrderEvent event : events) {
            version++;
            entries.add(EventStoreEntry.builder()
                .aggregateId(aggregateId.value())
                .aggregateType("Order")
                .eventType(event.getClass().getSimpleName())
                .payload(serialize(event))
                .version(version)
                .occurredAt(event.occurredAt())
                .build());
        }
        repository.saveAll(entries);
    }

    @Override
    public List<OrderEvent> load(OrderId aggregateId) {
        return repository.findByAggregateIdOrderByVersion(aggregateId.value())
            .stream()
            .map(this::deserialize)
            .toList();
    }

    private String serialize(OrderEvent event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new EventSerializationException(e);
        }
    }

    private OrderEvent deserialize(EventStoreEntry entry) {
        try {
            Class<?> eventClass = switch (entry.getEventType()) {
                case "OrderPlaced"    -> OrderPlaced.class;
                case "OrderConfirmed" -> OrderConfirmed.class;
                case "OrderCancelled" -> OrderCancelled.class;
                default -> throw new UnknownEventTypeException(entry.getEventType());
            };
            return (OrderEvent) objectMapper.readValue(entry.getPayload(), eventClass);
        } catch (JsonProcessingException e) {
            throw new EventDeserializationException(e);
        }
    }
}

@Entity
@Table(name = "event_store")
@Getter @Builder
public class EventStoreEntry {
    @Id @GeneratedValue
    private Long id;

    @Column(nullable = false)
    private Long aggregateId;

    @Column(nullable = false)
    private String aggregateType;

    @Column(nullable = false)
    private String eventType;

    @Lob
    @Column(nullable = false)
    private String payload;

    @Column(nullable = false)
    private int version;

    @Column(nullable = false)
    private Instant occurredAt;
}
```

---

## Application Service

```java
@Service
@Transactional
@RequiredArgsConstructor
public class PlaceOrderService {

    private final EventStore eventStore;
    private final ApplicationEventPublisher eventPublisher;

    public OrderId placeOrder(PlaceOrderCommand command) {
        Order order = new Order();
        List<OrderEvent> events = order.place(
            new UserId(command.userId()),
            command.items()
        );

        eventStore.append(order.getId(), events, 0);
        events.forEach(eventPublisher::publishEvent);

        return order.getId();
    }

    public void confirmOrder(OrderId orderId) {
        // 이벤트로 상태 복원
        List<OrderEvent> history = eventStore.load(orderId);
        Order order = Order.reconstitute(history);
        int currentVersion = history.size();

        List<OrderEvent> newEvents = order.confirm();
        eventStore.append(orderId, newEvents, currentVersion);
        newEvents.forEach(eventPublisher::publishEvent);
    }
}
```

---

## Snapshot 최적화

```java
// 이벤트가 많아지면 재생 속도 느려짐 → Snapshot으로 최적화
public class OrderSnapshot {
    private final OrderId orderId;
    private final int version;  // 스냅샷 시점 버전
    private final OrderStatus status;
    private final Money totalAmount;
    private final List<OrderItem> items;
    private final Instant createdAt;
}

// 로드 시: Snapshot + 이후 이벤트만 재생
public Order loadWithSnapshot(OrderId orderId) {
    Optional<OrderSnapshot> snapshot = snapshotRepository.findLatest(orderId);

    if (snapshot.isPresent()) {
        // 스냅샷 이후 이벤트만 로드
        List<OrderEvent> events = eventStore.load(orderId, snapshot.get().getVersion());
        Order order = Order.reconstituteFromSnapshot(snapshot.get());
        events.forEach(e -> order.apply(e));
        return order;
    } else {
        List<OrderEvent> events = eventStore.load(orderId);
        return Order.reconstitute(events);
    }
}

// 스냅샷 저장 (N개 이벤트마다)
@TransactionalEventListener
public void onOrderEvent(OrderEvent event) {
    int eventCount = eventStore.count(event.orderId());
    if (eventCount % 50 == 0) {  // 50개마다 스냅샷
        Order order = loadWithSnapshot(event.orderId());
        snapshotRepository.save(OrderSnapshot.from(order, eventCount));
    }
}
```

---

## 장단점

```
장점:
— 완전한 감사 로그 (누가 언제 무엇을 변경했는가)
— 과거 어느 시점으로도 상태 복원 가능
— 이벤트 재생으로 버그 재현/수정
— CQRS와 자연스럽게 결합

단점:
— 복잡도 높음
— 이벤트 스키마 변경 어려움 (하위 호환 유지 필요)
— 현재 상태 조회가 느릴 수 있음 (→ Read Model로 해결)
— 팀 학습 비용

적합:
— 감사/이력이 비즈니스 요구사항인 경우 (금융, 의료)
— 상태 변화 이력이 중요한 도메인
— 복잡한 비즈니스 규칙

과할 수 있음:
— 대부분의 일반 웹 서비스
```
