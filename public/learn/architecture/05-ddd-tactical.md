---
title: "DDD 전술 패턴"
order: 5
---

# DDD 전술 패턴

Repository, Domain Service, Domain Event의 실전 적용. DDD 기초를 이해한 후 읽기를 권장한다.

---

## Repository 패턴

Repository는 Aggregate를 마치 컬렉션처럼 다루는 패턴이다. 실제로 DB에 저장하는지, Redis에 저장하는지, 파일에 저장하는지는 Repository 구현체 뒤에 숨겨져 있다.

### 인터페이스 설계 원칙

```java
// 도메인 계층: 인터페이스 정의
// "어떻게 저장하는가"가 아닌 "무엇이 필요한가"를 선언
public interface OrderRepository {
    Order save(Order order);                        // 저장 또는 수정
    Optional<Order> findById(OrderId id);           // 단건 조회
    List<Order> findByUserId(UserId userId);         // 목록 조회
    void delete(OrderId id);                        // 삭제

    // 도메인 관점의 쿼리 메서드 (SQL 문법 X)
    List<Order> findPendingOrdersOlderThan(Duration duration); // N일 이상 대기 중
    boolean existsByUserIdAndStatus(UserId userId, OrderStatus status);
}

// 주의: Repository 메서드 이름은 도메인 언어로
// 나쁜 예: findByUserIdAndStatusAndCreatedAtBefore(...)  — SQL 느낌
// 좋은 예: findPendingOrdersOlderThan(Duration)          — 도메인 언어
```

### JPA 구현체

```java
// 인프라 계층: JPA로 구현
@Repository
@RequiredArgsConstructor
public class OrderRepositoryImpl implements OrderRepository {

    private final OrderJpaRepository jpaRepository;
    private final OrderMapper mapper;

    @Override
    public Order save(Order order) {
        OrderJpaEntity entity = mapper.toEntity(order);
        OrderJpaEntity saved = jpaRepository.save(entity);
        return mapper.toDomain(saved); // JPA 엔티티 → 도메인 객체 변환
    }

    @Override
    public Optional<Order> findById(OrderId id) {
        return jpaRepository.findById(id.value())
            .map(mapper::toDomain);
    }

    @Override
    public List<Order> findByUserId(UserId userId) {
        return jpaRepository.findByUserId(userId.value()).stream()
            .map(mapper::toDomain)
            .toList();
    }

    @Override
    public List<Order> findPendingOrdersOlderThan(Duration duration) {
        LocalDateTime threshold = LocalDateTime.now().minus(duration);
        return jpaRepository
            .findByStatusAndCreatedAtBefore(OrderStatus.PENDING, threshold)
            .stream()
            .map(mapper::toDomain)
            .toList();
    }

    @Override
    public void delete(OrderId id) {
        jpaRepository.deleteById(id.value());
    }
}

// Spring Data JPA 인터페이스
public interface OrderJpaRepository extends JpaRepository<OrderJpaEntity, Long> {
    List<OrderJpaEntity> findByUserId(Long userId);
    List<OrderJpaEntity> findByStatusAndCreatedAtBefore(
        OrderStatus status, LocalDateTime threshold);
}
```

### Mapper — 도메인 ↔ JPA 변환 전담

```java
// Mapper: 도메인 모델과 JPA 엔티티 사이의 변환 담당
// Mapper가 있으면 OrderJpaEntity에 도메인 로직이 섞이지 않음
@Component
public class OrderMapper {

    // 도메인 → JPA 엔티티
    public OrderJpaEntity toEntity(Order order) {
        OrderJpaEntity entity = new OrderJpaEntity();
        entity.setId(order.getId() != null ? order.getId().value() : null);
        entity.setUserId(order.getUserId().value());
        entity.setStatus(order.getStatus());
        entity.setTotalAmount(order.getTotalAmount().amount());
        entity.setCurrency(order.getTotalAmount().currency().name());
        entity.setDeliveryStreet(order.getDeliveryAddress().street());
        entity.setDeliveryCity(order.getDeliveryAddress().city());
        entity.setDeliveryZipCode(order.getDeliveryAddress().zipCode());

        // 내부 Entity 변환
        List<OrderItemJpaEntity> itemEntities = order.getItems().stream()
            .map(this::toItemEntity)
            .toList();
        entity.setItems(itemEntities);

        return entity;
    }

    // JPA 엔티티 → 도메인
    public Order toDomain(OrderJpaEntity entity) {
        List<OrderItem> items = entity.getItems().stream()
            .map(this::toItemDomain)
            .toList();

        // reconstitute: DB에서 불러올 때는 검증 없이 재구성
        return Order.reconstitute(
            new OrderId(entity.getId()),
            new UserId(entity.getUserId()),
            items,
            entity.getStatus(),
            new Address(
                entity.getDeliveryStreet(),
                entity.getDeliveryCity(),
                entity.getDeliveryZipCode(),
                "KR" // 기본값
            )
        );
    }

    private OrderItemJpaEntity toItemEntity(OrderItem item) {
        OrderItemJpaEntity e = new OrderItemJpaEntity();
        e.setProductId(item.getProductId().value());
        e.setProductName(item.getProductName()); // 스냅샷
        e.setPrice(item.getPrice().amount());
        e.setQuantity(item.getQuantity());
        return e;
    }

    private OrderItem toItemDomain(OrderItemJpaEntity entity) {
        return OrderItem.reconstitute(
            new OrderItemId(entity.getId()),
            new ProductId(entity.getProductId()),
            entity.getProductName(),
            Money.of(entity.getPrice().longValue(), Currency.KRW),
            entity.getQuantity()
        );
    }
}
```

---

## Domain Service

Entity나 Value Object에 자연스럽게 속하지 않는 비즈니스 로직을 Domain Service로 분리한다.

### 언제 Domain Service를 쓰나?

```
다음 조건 중 하나라도 해당되면 Domain Service 후보:

1. 여러 Aggregate를 조율해야 하는 로직
   예: 계좌 이체 (Account A에서 출금, Account B에 입금)

2. 외부 정보가 필요한 도메인 계산
   예: 환율 조회 후 환전 계산 (환율은 외부에서 가져와야 함)

3. 복잡한 정책으로 여러 객체를 봐야 하는 계산
   예: 할인 계산 (회원 등급 + 주문 금액 + 쿠폰 + 시즌 정책)

4. 여러 컨텍스트의 정보를 종합하는 로직
   예: 배송비 계산 (상품 무게 + 배송지 + 회원 등급 + 프로모션)
```

### 계좌 이체 Domain Service

```java
// 두 계좌 간 이체 — Domain Service
// Account.transferTo(other, amount)로 하면 한 Aggregate가 다른 Aggregate를 수정하는 꼴
@DomainService // 커스텀 스테레오타입 어노테이션 (또는 그냥 @Component)
public class TransferDomainService {

    /**
     * 계좌 이체: from → to 로 amount 이체
     * 비즈니스 규칙:
     * 1. 출금 계좌 잔액 >= 이체 금액
     * 2. 동결 계좌는 이체 불가
     * 3. 일일 이체 한도 초과 불가
     */
    public void transfer(Account from, Account to, Money amount) {
        // 규칙 1: 잔액 확인 (from 계좌의 도메인 규칙에 위임)
        if (from.getBalance().isLessThan(amount)) {
            throw new InsufficientBalanceException(
                "잔액이 부족합니다. 현재 잔액: " + from.getBalance() +
                ", 요청 금액: " + amount);
        }

        // 규칙 2: 계좌 상태 확인
        if (from.isFrozen()) {
            throw new AccountFrozenException("동결된 계좌에서는 이체할 수 없습니다");
        }

        // 규칙 3: 일일 한도 확인
        Money dailyTransferred = from.getTodayTransferAmount();
        if (dailyTransferred.add(amount).isGreaterThan(from.getDailyLimit())) {
            throw new DailyLimitExceededException("일일 이체 한도를 초과합니다");
        }

        // 실제 이체: 각 Aggregate의 행동에 위임
        from.withdraw(amount);   // Account 내부 도메인 로직
        to.deposit(amount);      // Account 내부 도메인 로직
    }
}

// 사용 (Application Service에서)
@Service
@Transactional
@RequiredArgsConstructor
public class TransferService {

    private final AccountRepository accountRepository;
    private final TransferDomainService transferDomainService; // Domain Service 주입

    public void transfer(Long fromAccountId, Long toAccountId, Money amount) {
        // Aggregate 로드
        Account from = accountRepository.findById(new AccountId(fromAccountId))
            .orElseThrow(() -> new AccountNotFoundException(fromAccountId));
        Account to = accountRepository.findById(new AccountId(toAccountId))
            .orElseThrow(() -> new AccountNotFoundException(toAccountId));

        // Domain Service로 비즈니스 로직 위임
        transferDomainService.transfer(from, to, amount);

        // 변경된 상태 저장 (각각 별도 save)
        accountRepository.save(from);
        accountRepository.save(to);
    }
}
```

### 할인 정책 Domain Service

```java
// 할인 정책 인터페이스 — 정책 교체 가능하도록 추상화
public interface DiscountPolicy {
    /**
     * @param order  주문 정보 (금액, 상품 종류 등)
     * @param member 회원 정보 (등급, 가입일 등)
     * @return       할인 금액 (0 이상)
     */
    Money calculateDiscount(Order order, Member member);
}

// 구현 1: 회원 등급 기반 할인
@Component
@Primary // 기본 정책
public class GradeBasedDiscountPolicy implements DiscountPolicy {

    @Override
    public Money calculateDiscount(Order order, Member member) {
        Money total = order.getTotalAmount();
        return switch (member.getGrade()) {
            case VIP  -> total.multiply(10).divide(100); // 10% 할인
            case GOLD -> total.multiply(5).divide(100);  // 5% 할인
            case SILVER -> total.multiply(2).divide(100); // 2% 할인
            default -> Money.ZERO_KRW;
        };
    }
}

// 구현 2: 금액 기반 할인 (조건부 사용)
@Component("amountBasedDiscount")
public class AmountBasedDiscountPolicy implements DiscountPolicy {

    @Override
    public Money calculateDiscount(Order order, Member member) {
        Money total = order.getTotalAmount();
        // 5만원 이상: 3,000원 할인, 10만원 이상: 8,000원 할인
        if (total.isGreaterThan(Money.of(100_000, Currency.KRW))) {
            return Money.of(8_000, Currency.KRW);
        }
        if (total.isGreaterThan(Money.of(50_000, Currency.KRW))) {
            return Money.of(3_000, Currency.KRW);
        }
        return Money.ZERO_KRW;
    }
}

// 복합 할인 정책: 여러 정책 중 최대 할인 적용
@Component
public class MaxDiscountPolicy implements DiscountPolicy {

    private final List<DiscountPolicy> policies;

    public MaxDiscountPolicy(
        GradeBasedDiscountPolicy gradePolicy,
        AmountBasedDiscountPolicy amountPolicy
    ) {
        this.policies = List.of(gradePolicy, amountPolicy);
    }

    @Override
    public Money calculateDiscount(Order order, Member member) {
        return policies.stream()
            .map(policy -> policy.calculateDiscount(order, member))
            .max(Comparator.comparing(money -> money.amount()))
            .orElse(Money.ZERO_KRW);
    }
}
```

---

## Domain Event 완전 정리

Domain Event는 "도메인에서 중요한 일이 일어났다"는 사실을 알리는 메시지다.

### 이벤트 기반 클래스 설계

```java
// 기반 추상 클래스
public abstract class DomainEvent {
    private final String eventId = UUID.randomUUID().toString(); // 이벤트 고유 ID
    private final Instant occurredAt = Instant.now();            // 발생 시각
    private final String eventType;                              // 이벤트 타입 이름

    protected DomainEvent(String eventType) {
        this.eventType = eventType;
    }

    public String getEventId() { return eventId; }
    public Instant getOccurredAt() { return occurredAt; }
    public String getEventType() { return eventType; }
}

// 구체 이벤트: 발생 당시 필요한 정보만 담음 (불변)
public class OrderPlacedEvent extends DomainEvent {
    private final OrderId orderId;
    private final UserId userId;
    private final Money totalAmount;
    private final int itemCount;

    public OrderPlacedEvent(Order order) {
        super("OrderPlaced");
        this.orderId = order.getId();
        this.userId = order.getUserId();
        this.totalAmount = order.getTotalAmount();
        this.itemCount = order.getItems().size();
    }
    // getters...
}

public class OrderConfirmedEvent extends DomainEvent {
    private final OrderId orderId;
    private final UserId userId;
    private final Money totalAmount;

    public OrderConfirmedEvent(Order order) {
        super("OrderConfirmed");
        this.orderId = order.getId();
        this.userId = order.getUserId();
        this.totalAmount = order.getTotalAmount();
    }
}

public class OrderCancelledEvent extends DomainEvent {
    private final OrderId orderId;
    private final UserId userId;
    private final String reason;

    public OrderCancelledEvent(Order order, String reason) {
        super("OrderCancelled");
        this.orderId = order.getId();
        this.userId = order.getUserId();
        this.reason = reason;
    }
}
```

### Aggregate에서 이벤트 수집 및 발행

```java
// 이벤트를 직접 발행하지 않고 수집해 두었다가
// Application Service가 트랜잭션 완료 후 발행
@Getter
public class Order {
    // ...
    private final List<DomainEvent> domainEvents = new ArrayList<>();

    public void place(UserId userId, List<OrderItem> items) {
        // 상태 변경 로직...
        this.status = OrderStatus.PENDING;

        // 이벤트 수집 (발행은 나중에)
        domainEvents.add(new OrderPlacedEvent(this));
    }

    public void confirm() {
        if (this.status != OrderStatus.PENDING) {
            throw new OrderStatusException("대기 상태에서만 확정 가능합니다");
        }
        this.status = OrderStatus.CONFIRMED;
        domainEvents.add(new OrderConfirmedEvent(this)); // 이벤트 수집
    }

    public void cancel(String reason) {
        if (this.status == OrderStatus.SHIPPED) {
            throw new OrderStatusException("배송 중 취소 불가");
        }
        this.status = OrderStatus.CANCELLED;
        domainEvents.add(new OrderCancelledEvent(this, reason)); // 이벤트 수집
    }

    // 이벤트를 꺼내면서 내부 목록 비움 (pullEvents = 한 번만 발행 보장)
    public List<DomainEvent> pullDomainEvents() {
        List<DomainEvent> events = new ArrayList<>(this.domainEvents);
        this.domainEvents.clear();
        return Collections.unmodifiableList(events);
    }
}

// Application Service: 트랜잭션 완료 후 이벤트 발행
@Service
@Transactional
@RequiredArgsConstructor
public class ConfirmOrderService {

    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher; // Spring 이벤트 발행기

    public void confirmOrder(OrderId orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));

        order.confirm(); // 1. 도메인 로직 실행 (이벤트 수집)
        orderRepository.save(order); // 2. DB 저장

        // 3. 이벤트 발행 (트랜잭션 내에서 발행, AFTER_COMMIT 핸들러가 커밋 후 처리)
        order.pullDomainEvents().forEach(eventPublisher::publishEvent);
    }
}
```

### 이벤트 핸들러

```java
// 이벤트 핸들러: 이벤트를 받아 부수 효과 처리
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventHandler {

    private final NotificationService notificationService;
    private final PointService pointService;
    private final InventoryService inventoryService;

    // 트랜잭션 커밋 후 실행 (주문 저장이 성공한 후에만 알림 발송)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderPlaced(OrderPlacedEvent event) {
        log.info("주문 완료 이벤트 처리: orderId={}", event.getOrderId());
        notificationService.sendOrderCompletionNotification(
            event.getUserId(),
            event.getOrderId(),
            event.getTotalAmount()
        );
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderConfirmedForPoints(OrderConfirmedEvent event) {
        // 주문 확정 시 포인트 적립 (결제 금액의 1%)
        pointService.earnPoints(event.getUserId(), event.getTotalAmount());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderConfirmedForInventory(OrderConfirmedEvent event) {
        // 주문 확정 시 재고 차감
        inventoryService.deductStock(event.getOrderId());
    }

    // 롤백 시에도 실행할 핸들러 (예: 실패 로그)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_ROLLBACK)
    public void onOrderConfirmFailed(OrderConfirmedEvent event) {
        log.error("주문 확정 실패 (롤백됨): orderId={}", event.getOrderId());
    }
}
```

---

## Bounded Context 간 통신

같은 애플리케이션 안에서도 컨텍스트가 다르면 직접 호출 대신 이벤트나 ACL을 통한다.

### Anti-Corruption Layer (ACL)

```java
// 외부 결제 서비스의 응답 모델 (우리가 바꿀 수 없음)
public record ExternalPaymentResponse(
    String transactionId,
    String resultCode,      // "0000" = 성공, 그 외 = 실패
    String resultMessage,
    Long approvedAmount,
    String approvedAt       // "yyyyMMddHHmmss" 형식
) {}

// 내부 도메인 모델
public record PaymentResult(
    PaymentId id,
    PaymentStatus status,
    Money amount,
    Instant approvedAt
) {}

// ACL: 외부 모델 → 내부 모델 변환
// 외부 서비스가 바뀌어도 이 클래스만 수정하면 됨
@Component
@RequiredArgsConstructor
public class PaymentServiceAcl {

    private final ExternalPaymentClient externalClient;

    public PaymentResult processPayment(Order order) {
        // 내부 모델 → 외부 요청 변환
        ExternalPaymentRequest request = new ExternalPaymentRequest(
            order.getId().value().toString(),
            order.getTotalAmount().amount().longValue(),
            "KRW"
        );

        ExternalPaymentResponse response = externalClient.pay(request);

        // 외부 응답 → 내부 모델 변환 (외부 모델이 도메인 안으로 침투하는 것을 차단)
        return toInternalModel(response);
    }

    private PaymentResult toInternalModel(ExternalPaymentResponse response) {
        PaymentStatus status = response.resultCode().equals("0000")
            ? PaymentStatus.SUCCESS
            : PaymentStatus.FAILED;

        Instant approvedAt = status == PaymentStatus.SUCCESS
            ? parseDateTime(response.approvedAt())
            : null;

        return new PaymentResult(
            new PaymentId(response.transactionId()),
            status,
            Money.of(response.approvedAmount(), Currency.KRW),
            approvedAt
        );
    }

    private Instant parseDateTime(String dateTime) {
        // "yyyyMMddHHmmss" → Instant 변환
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
            .withZone(ZoneId.of("Asia/Seoul"));
        return Instant.from(fmt.parse(dateTime));
    }
}
```

### Spring Data와 도메인 이벤트 통합

```java
// Spring Data의 AbstractAggregateRoot 활용 방법
// JPA 엔티티가 도메인 역할을 겸하는 경우에 사용 (레이어드 아키텍처 스타일)
@Entity
@Table(name = "orders")
@Getter
public class OrderJpaEntity extends AbstractAggregateRoot<OrderJpaEntity> {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    // save() 호출 시 등록된 이벤트 자동 발행
    public void confirm() {
        if (this.status != OrderStatus.PENDING) {
            throw new OrderStatusException("대기 상태에서만 확정 가능합니다");
        }
        this.status = OrderStatus.CONFIRMED;
        registerEvent(new OrderConfirmedEvent(this.id)); // AbstractAggregateRoot 제공
    }
}

// 단, 이 방법의 한계:
// 1. JPA 엔티티가 도메인 로직을 가지므로 계층 분리가 어려움
// 2. 도메인 객체가 @Entity 어노테이션에 의존하게 됨
// 3. 헥사고날/클린 아키텍처에서는 직접 pull 방식 권장
```

---

## 실전 예제: 포인트 적립 시스템

```java
// 도메인: 포인트 Aggregate
@Getter
public class MemberPoints {
    private final MemberId memberId;
    private long balance;           // 포인트 잔액
    private final List<PointTransaction> transactions; // 포인트 이력
    private final List<DomainEvent> events = new ArrayList<>();

    // 포인트 적립
    public void earn(long amount, String reason) {
        if (amount <= 0) throw new IllegalArgumentException("적립 포인트는 양수여야 합니다");

        PointTransaction tx = PointTransaction.earn(amount, reason);
        this.transactions.add(tx);
        this.balance += amount;

        events.add(new PointsEarnedEvent(this.memberId, amount, this.balance));
    }

    // 포인트 사용
    public void use(long amount, String reason) {
        if (amount <= 0) throw new IllegalArgumentException("사용 포인트는 양수여야 합니다");
        if (this.balance < amount) {
            throw new InsufficientPointsException(
                "포인트가 부족합니다. 현재: " + this.balance + ", 요청: " + amount);
        }

        PointTransaction tx = PointTransaction.use(amount, reason);
        this.transactions.add(tx);
        this.balance -= amount;

        events.add(new PointsUsedEvent(this.memberId, amount, this.balance));
    }

    // 포인트 소멸 (유효기간 만료)
    public void expire(long amount) {
        if (this.balance < amount) {
            amount = this.balance; // 잔액만큼만 소멸
        }
        this.balance -= amount;
        events.add(new PointsExpiredEvent(this.memberId, amount));
    }

    public List<DomainEvent> pullDomainEvents() {
        List<DomainEvent> result = new ArrayList<>(events);
        events.clear();
        return result;
    }
}

// 포인트 적립 Application Service
@Service
@Transactional
@RequiredArgsConstructor
public class EarnPointsService {

    private final MemberPointsRepository pointsRepository;
    private final ApplicationEventPublisher eventPublisher;

    public void earnFromOrder(MemberId memberId, OrderId orderId, Money orderAmount) {
        MemberPoints points = pointsRepository.findByMemberId(memberId)
            .orElseGet(() -> MemberPoints.initialize(memberId)); // 없으면 초기화

        // 도메인 로직: 주문 금액의 1% 적립
        long earnAmount = orderAmount.amount().longValue() / 100;
        String reason = "주문 적립 (주문번호: " + orderId.value() + ")";
        points.earn(earnAmount, reason);

        pointsRepository.save(points);
        points.pullDomainEvents().forEach(eventPublisher::publishEvent);
    }
}
```

---

## 흔한 실수 정리

### 1. Repository에 쿼리 로직 과다

```java
// 나쁜 예 ❌ — 복잡한 JPQL이 Repository에 가득 차 있음
public interface OrderRepository {
    // 지나치게 세부적인 쿼리 메서드들
    List<Order> findByUserIdAndStatusAndCreatedAtBetweenAndTotalAmountGreaterThan(
        UserId userId, OrderStatus status,
        LocalDateTime from, LocalDateTime to, Money amount
    );
}

// 좋은 예 ✅ — 조회 전용 쿼리는 별도 QueryService로 분리 (CQRS 적용)
// 도메인 Repository는 단순하게 유지
public interface OrderRepository {
    Order save(Order order);
    Optional<Order> findById(OrderId id);
    List<Order> findByUserId(UserId userId);
}

// 복잡한 조회는 별도 QueryService
@Service
public class OrderQueryService {
    public List<OrderSummary> searchOrders(OrderSearchCondition condition) { ... }
}
```

### 2. Domain Service와 Application Service 혼동

```java
// Domain Service vs Application Service 구분

// Domain Service: 도메인 로직, 도메인 객체만 다룸, 인프라 접근 없음
public class DiscountCalculationService {
    public Money calculate(Order order, Member member) {
        // 순수 도메인 로직, DB 접근 없음
    }
}

// Application Service: 흐름 조율, 인프라 접근 (Repository, EventPublisher)
@Service
@Transactional
public class PlaceOrderService {
    public OrderId place(PlaceOrderCommand cmd) {
        // Repository로 로드 → 도메인 로직 → 저장 → 이벤트 발행
    }
}
```

---

## 핵심 요약

| 패턴 | 역할 | 위치 |
|------|------|------|
| Repository | Aggregate 저장/조회 (컬렉션처럼) | 인터페이스: 도메인, 구현체: 인프라 |
| Domain Service | 여러 Aggregate를 조율하는 도메인 로직 | 도메인 |
| Domain Event | 도메인 내 중요 사건 알림 (과거형) | 도메인 |
| ACL | 외부 모델 → 내부 모델 변환 | 인프라(어댑터) |

이 4가지 패턴만 제대로 이해해도 대부분의 도메인 설계 문제를 해결할 수 있다.
