---
title: "이벤트 소싱"
order: 7
---

# 이벤트 소싱 (Event Sourcing)

현재 상태 대신 "변화의 이력"을 저장하는 패턴. 가계부처럼 모든 변경 사항을 기록하고, 현재 잔액(상태)은 이 기록을 처음부터 더해서 계산한다.

---

## 왜 이벤트 소싱이 필요한가

은행 계좌 잔액이 -50만원으로 나왔다. 어떻게 된 일인지 알 수 없다. DB에는 현재 값만 있기 때문이다.

```
전통적 방식 (현재 상태만 저장):
accounts 테이블:
id | balance  | updated_at
1  | -500000  | 2024-03-15 10:32:11

→ 언제, 누가, 왜 이렇게 됐는지 알 수 없음
→ 버그가 있었다면? 데이터 복구 불가
→ 감사(Audit) 로그를 별도로 만들어야 함
```

가계부는 다르다. 모든 입출금 내역이 기록되어 있어서 언제든 특정 날짜의 잔액을 계산할 수 있다. 오류가 있으면 어느 항목이 잘못됐는지 찾을 수 있다.

이벤트 소싱은 이 가계부 방식을 소프트웨어에 적용한 것이다.

---

## 핵심 개념

```
전통적 방식: 현재 상태를 저장
orders 테이블:
id | status    | total_amount | updated_at
1  | CONFIRMED | 50000        | 2024-01-02 14:20

이벤트 소싱: 이벤트(변화) 자체를 저장
order_events 테이블:
id | order_id | event_type       | payload                              | version | occurred_at
1  | 1        | OrderPlaced      | {userId:1, items:[{prod:5, qty:2}]}  | 1       | 2024-01-01 09:00
2  | 1        | ItemAdded        | {productId:7, quantity:1}            | 2       | 2024-01-01 09:05
3  | 1        | OrderConfirmed   | {}                                   | 3       | 2024-01-02 14:20

현재 상태 = 이벤트를 순서대로 재생(replay)한 결과
```

---

## 이벤트 정의

```java
// 이벤트 인터페이스: Java 21 sealed interface로 타입 안전성 확보
public sealed interface OrderEvent permits
    OrderPlaced, OrderConfirmed, OrderCancelled, OrderItemAdded, OrderShipped {

    OrderId orderId();      // 어느 Aggregate의 이벤트인가
    Instant occurredAt();   // 언제 발생했는가
    int version();          // 몇 번째 이벤트인가 (낙관적 잠금용)
}

// 주문 생성 이벤트
public record OrderPlaced(
    OrderId orderId,
    UserId userId,
    List<OrderItemData> items,
    Money totalAmount,
    Address deliveryAddress,
    int version,
    Instant occurredAt
) implements OrderEvent {}

// 주문 확정 이벤트 (변경된 정보만 담음)
public record OrderConfirmed(
    OrderId orderId,
    int version,
    Instant occurredAt
) implements OrderEvent {}

// 주문 취소 이벤트
public record OrderCancelled(
    OrderId orderId,
    String reason,          // 취소 사유 (왜 취소했는지 기록)
    UserId cancelledBy,     // 누가 취소했는지
    int version,
    Instant occurredAt
) implements OrderEvent {}

// 아이템 추가 이벤트
public record OrderItemAdded(
    OrderId orderId,
    OrderItemData item,
    int version,
    Instant occurredAt
) implements OrderEvent {}

// 이벤트 내부 데이터: 스냅샷 (나중에 상품 정보가 바뀌어도 주문 당시 정보 보존)
public record OrderItemData(
    ProductId productId,
    String productName,     // 주문 당시 상품명 스냅샷
    Money price,            // 주문 당시 가격 스냅샷
    int quantity
) {}
```

---

## Aggregate 구현

이벤트 소싱에서 Aggregate는 두 가지 역할을 한다:
1. 비즈니스 로직 실행 → 이벤트 생성
2. 이벤트 목록을 재생(replay)해서 현재 상태 복원

```java
@Getter
public class Order {
    private OrderId id;
    private UserId userId;
    private List<OrderItem> items = new ArrayList<>();
    private OrderStatus status;
    private Money totalAmount;
    private int version; // 현재 버전 (이벤트 개수)

    // ======= 상태 복원 (Reconstitution) =======

    // 이벤트 목록으로 Aggregate 복원 (DB에서 로드할 때 사용)
    public static Order reconstitute(List<OrderEvent> events) {
        if (events.isEmpty()) {
            throw new IllegalArgumentException("이벤트 목록이 비어있습니다");
        }
        Order order = new Order();
        events.forEach(order::apply); // 각 이벤트를 순서대로 적용
        return order;
    }

    // ======= 비즈니스 행동 (Command → Event) =======

    // 주문 생성: 이벤트를 생성하고 자신에게도 적용
    public List<OrderEvent> place(UserId userId, List<OrderItemData> items,
                                   Address deliveryAddress) {
        if (items.isEmpty()) throw new IllegalArgumentException("주문 항목이 없습니다");

        // 이벤트 생성
        OrderPlaced event = new OrderPlaced(
            OrderId.newId(),
            userId,
            items,
            calculateTotal(items),
            deliveryAddress,
            this.version + 1,
            Instant.now()
        );

        apply(event);        // 자신에게 적용 (상태 변경)
        return List.of(event); // 저장할 이벤트 목록 반환
    }

    // 주문 확정
    public List<OrderEvent> confirm() {
        // 비즈니스 규칙 검증 (이 시점에 현재 상태가 복원되어 있음)
        if (this.status != OrderStatus.PENDING) {
            throw new OrderStatusException("대기 상태에서만 확정 가능합니다");
        }

        OrderConfirmed event = new OrderConfirmed(
            this.id, this.version + 1, Instant.now());

        apply(event);
        return List.of(event);
    }

    // 주문 취소
    public List<OrderEvent> cancel(String reason, UserId cancelledBy) {
        if (this.status == OrderStatus.SHIPPED || this.status == OrderStatus.DELIVERED) {
            throw new OrderStatusException("배송 후에는 취소할 수 없습니다");
        }

        OrderCancelled event = new OrderCancelled(
            this.id, reason, cancelledBy, this.version + 1, Instant.now());

        apply(event);
        return List.of(event);
    }

    // 아이템 추가
    public List<OrderEvent> addItem(OrderItemData itemData) {
        if (this.status != OrderStatus.PENDING) {
            throw new OrderStatusException("대기 중인 주문에만 항목 추가 가능합니다");
        }

        OrderItemAdded event = new OrderItemAdded(
            this.id, itemData, this.version + 1, Instant.now());

        apply(event);
        return List.of(event);
    }

    // ======= 이벤트 적용 (상태 업데이트) =======
    // private: 외부에서 직접 apply 호출 불가
    // 이 메서드들은 순수하게 상태만 변경 (검증 없음)

    private void apply(OrderEvent event) {
        switch (event) {
            case OrderPlaced e -> {
                // OrderPlaced 이벤트 적용: 새 주문 상태 설정
                this.id = e.orderId();
                this.userId = e.userId();
                this.status = OrderStatus.PENDING;
                this.items = e.items().stream()
                    .map(data -> new OrderItem(
                        OrderItemId.newId(),
                        data.productId(),
                        data.productName(),
                        data.price(),
                        data.quantity()
                    ))
                    .collect(Collectors.toCollection(ArrayList::new));
                this.totalAmount = e.totalAmount();
                this.version = e.version();
            }
            case OrderConfirmed e -> {
                // 상태만 변경
                this.status = OrderStatus.CONFIRMED;
                this.version = e.version();
            }
            case OrderCancelled e -> {
                this.status = OrderStatus.CANCELLED;
                this.version = e.version();
            }
            case OrderItemAdded e -> {
                // 아이템 추가 및 합계 재계산
                OrderItemData data = e.item();
                this.items.add(new OrderItem(
                    OrderItemId.newId(), data.productId(),
                    data.productName(), data.price(), data.quantity()
                ));
                this.totalAmount = recalculateTotal();
                this.version = e.version();
            }
            case OrderShipped e -> {
                this.status = OrderStatus.SHIPPED;
                this.version = e.version();
            }
        }
    }

    private Money recalculateTotal() {
        return items.stream()
            .map(item -> item.getPrice().multiply(item.getQuantity()))
            .reduce(Money.ZERO_KRW, Money::add);
    }

    private static Money calculateTotal(List<OrderItemData> items) {
        return items.stream()
            .map(i -> i.price().multiply(i.quantity()))
            .reduce(Money.ZERO_KRW, Money::add);
    }
}
```

---

## Event Store 구현

```java
// Event Store 인터페이스: 이벤트의 영속화 담당
public interface EventStore {
    // 이벤트 추가 (낙관적 잠금으로 동시성 충돌 방지)
    void append(OrderId aggregateId, List<OrderEvent> events, int expectedVersion);

    // 이벤트 전체 로드
    List<OrderEvent> load(OrderId aggregateId);

    // 특정 버전 이후 이벤트만 로드 (Snapshot 최적화용)
    List<OrderEvent> load(OrderId aggregateId, int fromVersion);

    // 이벤트 수 조회
    int countEvents(OrderId aggregateId);
}

// JPA 기반 Event Store 구현
@Repository
@RequiredArgsConstructor
public class JpaEventStore implements EventStore {

    private final EventStoreJpaRepository repository;
    private final ObjectMapper objectMapper; // JSON 직렬화/역직렬화

    @Override
    @Transactional
    public void append(OrderId aggregateId, List<OrderEvent> events, int expectedVersion) {
        // 낙관적 잠금: 예상 버전과 현재 버전이 다르면 동시성 충돌
        int currentVersion = repository.getMaxVersion(aggregateId.value());
        if (currentVersion != expectedVersion) {
            throw new OptimisticConcurrencyException(
                "버전 충돌: 예상 " + expectedVersion + ", 실제 " + currentVersion);
        }

        // 이벤트 목록을 Entry로 변환하여 저장
        List<EventStoreEntry> entries = new ArrayList<>();
        int version = expectedVersion;

        for (OrderEvent event : events) {
            version++;
            entries.add(EventStoreEntry.builder()
                .aggregateId(aggregateId.value())
                .aggregateType("Order")
                .eventType(event.getClass().getSimpleName()) // 클래스명 = 이벤트 타입
                .payload(serialize(event))                   // JSON으로 직렬화
                .version(version)
                .occurredAt(event.occurredAt())
                .build());
        }
        repository.saveAll(entries);
    }

    @Override
    public List<OrderEvent> load(OrderId aggregateId) {
        return repository
            .findByAggregateIdOrderByVersionAsc(aggregateId.value())
            .stream()
            .map(this::deserialize)
            .toList();
    }

    @Override
    public List<OrderEvent> load(OrderId aggregateId, int fromVersion) {
        return repository
            .findByAggregateIdAndVersionGreaterThanOrderByVersionAsc(
                aggregateId.value(), fromVersion)
            .stream()
            .map(this::deserialize)
            .toList();
    }

    private String serialize(OrderEvent event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new EventSerializationException("이벤트 직렬화 실패", e);
        }
    }

    private OrderEvent deserialize(EventStoreEntry entry) {
        try {
            // 이벤트 타입 이름으로 클래스 결정
            Class<? extends OrderEvent> eventClass = switch (entry.getEventType()) {
                case "OrderPlaced"    -> OrderPlaced.class;
                case "OrderConfirmed" -> OrderConfirmed.class;
                case "OrderCancelled" -> OrderCancelled.class;
                case "OrderItemAdded" -> OrderItemAdded.class;
                case "OrderShipped"   -> OrderShipped.class;
                default -> throw new UnknownEventTypeException(entry.getEventType());
            };
            return objectMapper.readValue(entry.getPayload(), eventClass);
        } catch (JsonProcessingException e) {
            throw new EventDeserializationException("이벤트 역직렬화 실패", e);
        }
    }
}

// Event Store JPA 엔티티
@Entity
@Table(name = "event_store",
    indexes = @Index(columnList = "aggregateId, version", unique = true))
@Getter @Builder
@NoArgsConstructor @AllArgsConstructor
public class EventStoreEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long aggregateId;        // 어느 Aggregate

    @Column(nullable = false)
    private String aggregateType;    // "Order", "Account" 등

    @Column(nullable = false)
    private String eventType;        // "OrderPlaced", "OrderConfirmed" 등

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;          // JSON으로 직렬화된 이벤트 데이터

    @Column(nullable = false)
    private int version;             // Aggregate 내 순번

    @Column(nullable = false)
    private Instant occurredAt;      // 발생 시각
}

// Event Store JPA Repository
public interface EventStoreJpaRepository extends JpaRepository<EventStoreEntry, Long> {

    List<EventStoreEntry> findByAggregateIdOrderByVersionAsc(Long aggregateId);

    List<EventStoreEntry> findByAggregateIdAndVersionGreaterThanOrderByVersionAsc(
        Long aggregateId, int version);

    @Query("SELECT COALESCE(MAX(e.version), 0) FROM EventStoreEntry e WHERE e.aggregateId = :id")
    int getMaxVersion(@Param("id") Long aggregateId);
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

    // 주문 생성
    public OrderId placeOrder(PlaceOrderCommand command) {
        Order order = new Order();

        // 1. 비즈니스 로직 실행 → 이벤트 생성
        List<OrderEvent> events = order.place(
            new UserId(command.userId()),
            command.items(),
            command.deliveryAddress()
        );

        // 2. 이벤트 저장 (expectedVersion = 0: 새 Aggregate)
        eventStore.append(order.getId(), events, 0);

        // 3. Spring 이벤트 발행 (다른 핸들러가 처리)
        events.forEach(eventPublisher::publishEvent);

        return order.getId();
    }

    // 주문 확정
    public void confirmOrder(OrderId orderId) {
        // 1. 이벤트 로드 → Aggregate 복원
        List<OrderEvent> history = eventStore.load(orderId);
        if (history.isEmpty()) {
            throw new OrderNotFoundException(orderId);
        }
        Order order = Order.reconstitute(history);
        int currentVersion = order.getVersion();

        // 2. 비즈니스 로직 실행 → 새 이벤트 생성
        List<OrderEvent> newEvents = order.confirm();

        // 3. 이벤트 저장 (낙관적 잠금: 기대 버전 = 현재 버전)
        eventStore.append(orderId, newEvents, currentVersion);

        // 4. 이벤트 발행
        newEvents.forEach(eventPublisher::publishEvent);
    }

    // 주문 취소
    public void cancelOrder(OrderId orderId, String reason, UserId cancelledBy) {
        List<OrderEvent> history = eventStore.load(orderId);
        Order order = Order.reconstitute(history);
        int currentVersion = order.getVersion();

        List<OrderEvent> newEvents = order.cancel(reason, cancelledBy);

        eventStore.append(orderId, newEvents, currentVersion);
        newEvents.forEach(eventPublisher::publishEvent);
    }
}
```

---

## Snapshot 최적화

이벤트가 수백, 수천 개가 쌓이면 매번 전체를 재생하는 것이 느려진다. Snapshot으로 해결한다.

```java
// 스냅샷: 특정 시점의 상태를 통째로 저장
@Entity
@Table(name = "order_snapshots")
@Getter @Builder
public class OrderSnapshot {

    @Id @GeneratedValue
    private Long id;

    @Column(nullable = false, unique = true)
    private Long orderId;

    @Column(nullable = false)
    private int version;            // 어느 버전의 스냅샷인가

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String state;           // JSON으로 직렬화된 상태

    @Column(nullable = false)
    private Instant snapshotAt;
}

// 스냅샷을 활용한 Aggregate 로드
@Service
@RequiredArgsConstructor
public class OrderLoader {

    private final EventStore eventStore;
    private final OrderSnapshotRepository snapshotRepository;
    private final ObjectMapper objectMapper;

    public Order load(OrderId orderId) {
        // 1. 스냅샷 조회
        Optional<OrderSnapshot> snapshot = snapshotRepository.findByOrderId(orderId.value());

        if (snapshot.isPresent()) {
            // 2a. 스냅샷 이후 이벤트만 로드 (전체 재생 불필요)
            int fromVersion = snapshot.get().getVersion();
            List<OrderEvent> recentEvents = eventStore.load(orderId, fromVersion);

            Order order = deserializeSnapshot(snapshot.get());
            recentEvents.forEach(e -> applyEvent(order, e)); // 스냅샷 이후만 적용
            return order;
        } else {
            // 2b. 스냅샷 없으면 전체 이벤트 재생
            List<OrderEvent> allEvents = eventStore.load(orderId);
            return Order.reconstitute(allEvents);
        }
    }

    private Order deserializeSnapshot(OrderSnapshot snapshot) {
        try {
            return objectMapper.readValue(snapshot.getState(), Order.class);
        } catch (JsonProcessingException e) {
            throw new SnapshotDeserializationException(e);
        }
    }
}

// 스냅샷 생성: N개 이벤트마다 자동 생성
@Component
@RequiredArgsConstructor
@Slf4j
public class SnapshotPolicy {

    private static final int SNAPSHOT_THRESHOLD = 50; // 50개 이벤트마다 스냅샷

    private final EventStore eventStore;
    private final OrderSnapshotRepository snapshotRepository;
    private final OrderLoader orderLoader;
    private final ObjectMapper objectMapper;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderEvent(OrderEvent event) {
        // 이벤트 누적 수 확인
        int eventCount = eventStore.countEvents(event.orderId());

        if (eventCount % SNAPSHOT_THRESHOLD == 0) {
            // 스냅샷 생성 시점
            log.info("스냅샷 생성: orderId={}, version={}", event.orderId(), eventCount);
            createSnapshot(event.orderId(), eventCount);
        }
    }

    private void createSnapshot(OrderId orderId, int version) {
        try {
            Order order = orderLoader.load(orderId);
            String state = objectMapper.writeValueAsString(order);

            OrderSnapshot snapshot = OrderSnapshot.builder()
                .orderId(orderId.value())
                .version(version)
                .state(state)
                .snapshotAt(Instant.now())
                .build();

            snapshotRepository.save(snapshot);
        } catch (Exception e) {
            log.error("스냅샷 생성 실패: orderId={}", orderId, e);
            // 스냅샷 실패는 비즈니스 로직에 영향 없어야 함
        }
    }
}
```

---

## 이벤트 스키마 변경 관리

이벤트 소싱의 가장 큰 도전 중 하나다. 과거에 저장된 이벤트 형식은 변경할 수 없다.

```java
// 방법 1: 이벤트 Upcasting (버전 업그레이드)
// 구버전 이벤트를 신버전으로 변환하는 변환기
public class OrderPlacedV1toV2Upcaster {

    public OrderPlacedV2 upcast(OrderPlacedV1 v1) {
        // v1에는 배송 주소가 없었음. v2에서 추가됨
        return new OrderPlacedV2(
            v1.orderId(),
            v1.userId(),
            v1.items(),
            v1.totalAmount(),
            Address.DEFAULT,    // 기본값으로 채움
            v1.version(),
            v1.occurredAt()
        );
    }
}

// 방법 2: 이벤트 버전 명시
public record OrderPlaced(
    int schemaVersion,     // 이벤트 스키마 버전
    OrderId orderId,
    // ...
) implements OrderEvent {}

// 역직렬화 시 버전에 따라 다른 처리
private OrderEvent deserialize(EventStoreEntry entry) {
    // payload에서 schemaVersion 먼저 읽기
    int schemaVersion = readSchemaVersion(entry.getPayload());

    return switch (schemaVersion) {
        case 1 -> upcastV1ToV2(
            objectMapper.readValue(entry.getPayload(), OrderPlacedV1.class));
        case 2 -> objectMapper.readValue(entry.getPayload(), OrderPlaced.class);
        default -> throw new UnsupportedEventVersionException(schemaVersion);
    };
}
```

---

## CQRS와 결합

이벤트 소싱은 자연스럽게 CQRS와 함께 사용된다. 이벤트 스토어에서 발행된 이벤트로 Read Model을 업데이트한다.

```java
// Read Model 프로젝터: 이벤트 소싱 이벤트 → Read Model 업데이트
@Component
@RequiredArgsConstructor
public class OrderProjector {

    private final OrderReadRepository readRepository;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(OrderPlaced event) {
        // Read Model 생성 (비정규화된 뷰)
        OrderReadModel model = new OrderReadModel();
        model.setOrderId(event.orderId().value());
        model.setUserId(event.userId().value());
        model.setStatus("PENDING");
        model.setTotalAmount(event.totalAmount().amount());
        model.setCreatedAt(event.occurredAt());
        readRepository.save(model);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(OrderConfirmed event) {
        // 상태 업데이트만
        readRepository.updateStatus(event.orderId().value(), "CONFIRMED");
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(OrderCancelled event) {
        readRepository.updateStatus(event.orderId().value(), "CANCELLED");
        readRepository.updateCancelReason(event.orderId().value(), event.reason());
    }
}
```

---

## 장단점 및 사용 시점

```
장점:
— 완전한 감사 로그: 누가, 언제, 무엇을 변경했는지 완벽히 추적 가능
— 과거 어느 시점으로도 상태 복원 가능 (time travel)
— 이벤트 재생으로 버그 발생 당시 상태 재현 가능
— CQRS와 자연스럽게 결합: 이벤트로 다양한 Read Model 생성
— 이벤트 스트림이 있으므로 다른 서비스에 이벤트 스트리밍 가능

단점:
— 높은 복잡도: 팀 전체가 학습해야 함
— 이벤트 스키마 변경 어려움: 하위 호환성 유지 필수
— 현재 상태 단순 조회도 이벤트 재생이 필요 → Read Model 필수
— 이벤트 수 증가 시 재생 성능 저하 → Snapshot으로 해결하지만 추가 복잡도
— 디버깅 어려움: 상태가 어떻게 됐는지 이벤트를 추적해야 함

적합한 경우:
— 감사/이력이 핵심 비즈니스 요구사항인 경우 (금융, 의료, 회계)
— 상태 변화 이력이 비즈니스적으로 중요한 경우 (계약 변경, 결재 흐름)
— 복잡한 비즈니스 규칙 + 이력 추적이 모두 필요한 경우
— 이벤트를 다른 서비스에 스트리밍해야 하는 경우

과할 수 있는 경우:
— 대부분의 일반 웹 서비스 (이력 추적이 비즈니스 요구사항이 아닌 경우)
— 단순 CRUD
— 팀이 아직 DDD/CQRS에 익숙하지 않은 경우
```

---

## 핵심 요약

이벤트 소싱의 핵심은:

1. **상태 저장 X, 이벤트 저장 O**: 현재 상태는 이벤트 재생으로 계산
2. **이벤트는 불변**: 한번 저장된 이벤트는 수정/삭제 불가
3. **버전으로 동시성 제어**: 낙관적 잠금으로 충돌 감지
4. **CQRS 필수**: 읽기 전용 Read Model 없으면 실용적이지 않음
5. **스키마 관리**: 이벤트 형식 변경은 신중하게 (upcasting)

복잡도가 높은 패턴이므로, 일반 서비스에서는 Domain Event만 사용하고 이벤트 소싱은 정말 필요할 때 도입하는 것을 권장한다.
