---
title: "DDD 기초"
order: 4
---

# DDD 기초 (Domain-Driven Design)

도메인 전문가와 개발자가 같은 언어를 쓰면서 소프트웨어를 설계하는 방법론.

---

## DDD란 무엇인가

개발자가 은행 시스템을 만든다고 하자. 기획자가 "이체"라고 부르는데 개발자는 코드에서 `transferMoney`라고 쓴다. 회계팀은 "출금"과 "입금"이라고 부르는데 DB에는 `transaction_type` 컬럼이 있다.

회의할 때마다 번역이 필요하다. 버그 리포트가 와도 어느 코드의 문제인지 찾기 힘들다.

DDD(Domain-Driven Design)는 이 문제를 해결한다. **업무 언어를 코드로 그대로 표현하는 것**이 핵심이다. 도메인 전문가가 "주문을 취소한다"고 말하면 코드에도 `order.cancel()`이 있어야 한다.

---

## 핵심 개념 3가지

### 1. 유비쿼터스 언어 (Ubiquitous Language)

```
도메인 전문가와 개발자가 공유하는 단일 언어.
대화에서 쓰는 단어 = 코드에서 쓰는 단어.

나쁜 예:
기획자: "주문을 취소 처리해요"
개발자: "order 테이블의 status를 CANCELLED로 UPDATE하면 돼요"
코드:  void updateOrderStatus(Long id, String status)

좋은 예:
기획자: "주문을 취소해요"
개발자: "order.cancel()을 호출하면 돼요"
코드:  order.cancel()  ← 대화와 코드가 일치!

효과:
— 버그 리포트를 받으면 어디 코드인지 바로 찾을 수 있음
— 도메인 전문가가 코드를 읽을 수 있음
— 오해와 번역 실수가 줄어듦
```

### 2. 경계 컨텍스트 (Bounded Context)

```
같은 단어라도 컨텍스트마다 의미가 다르다.
각 컨텍스트에서는 그 맥락에 맞는 모델을 사용한다.

예: "Product" (상품)
┌──────────────────┬──────────────────┬──────────────────┐
│ 주문 컨텍스트     │ 창고 컨텍스트     │ 마케팅 컨텍스트   │
├──────────────────┼──────────────────┼──────────────────┤
│ - 이름           │ - 위치            │ - 설명           │
│ - 가격           │ - 무게            │ - 이미지          │
│ - 재고 수량       │ - 보관 조건        │ - 태그           │
│ - 주문 가능 여부   │ - 입출고 이력      │ - 카테고리        │
└──────────────────┴──────────────────┴──────────────────┘

→ 하나의 Product 클래스에 다 넣으면 거대한 클래스가 됨
→ 컨텍스트별로 분리된 모델을 사용
```

### 3. 도메인 모델

```
비즈니스 문제를 코드로 표현한 것.
CRUD 중심이 아닌, 행동(Behavior) 중심.

나쁜 예 (CRUD 중심):
void setStatus(String status) { this.status = status; }

좋은 예 (행동 중심, 도메인 언어 사용):
void confirm()  { /* 주문 확정 */ }
void cancel()   { /* 주문 취소 */ }
void ship()     { /* 배송 처리 */ }
```

---

## 빌딩 블록

DDD에는 도메인 모델을 구성하는 여러 패턴이 있다.

### Entity — 식별자로 구분

```java
// Entity: 고유 식별자(Id)가 있고, 식별자가 같으면 같은 객체
// 상태가 변할 수 있음
@Getter
public class User {
    private final UserId id;  // 불변 식별자
    private String email;     // 변경 가능한 속성
    private String name;
    private UserStatus status;

    public User(UserId id, String email, String name) {
        this.id = Objects.requireNonNull(id, "Id는 필수입니다");
        this.email = Objects.requireNonNull(email, "이메일은 필수입니다");
        this.name = Objects.requireNonNull(name, "이름은 필수입니다");
        this.status = UserStatus.ACTIVE;
    }

    // Id로만 동일성 비교 (이름이나 이메일이 달라도 Id가 같으면 같은 사용자)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User other)) return false;
        return id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }
}

// UserId: 식별자를 원시 타입 대신 Value Object로 감싸기 (Primitive Obsession 해소)
public record UserId(Long value) {
    public UserId {
        Objects.requireNonNull(value, "UserId는 필수입니다");
        if (value <= 0) throw new IllegalArgumentException("UserId는 양수여야 합니다");
    }
}
```

### Value Object — 값으로 구분

```java
// Value Object: 식별자 없음, 값(속성)으로 동일성 판단, 불변(Immutable)
// record를 사용하면 equals, hashCode, toString 자동 생성

// Money Value Object — 금액과 통화의 조합
public record Money(BigDecimal amount, Currency currency) {

    // compact 생성자: 검증 로직
    public Money {
        Objects.requireNonNull(amount, "금액은 필수입니다");
        Objects.requireNonNull(currency, "통화는 필수입니다");
        if (amount.scale() > 2) {
            throw new IllegalArgumentException("소수점 2자리까지만 허용합니다");
        }
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("금액은 0 이상이어야 합니다");
        }
        // 정규화: scale 통일 (10 → 10.00)
        amount = amount.setScale(2, RoundingMode.HALF_UP);
    }

    // 연산: 항상 새 객체 반환 (불변 유지)
    public Money add(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new CurrencyMismatchException(
                "통화가 다릅니다: " + this.currency + " vs " + other.currency);
        }
        return new Money(this.amount.add(other.amount), this.currency);
    }

    public Money subtract(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new CurrencyMismatchException();
        }
        return new Money(this.amount.subtract(other.amount), this.currency);
    }

    public Money multiply(int quantity) {
        return new Money(
            this.amount.multiply(BigDecimal.valueOf(quantity)),
            this.currency
        );
    }

    public boolean isGreaterThan(Money other) {
        return this.amount.compareTo(other.amount) > 0;
    }

    public boolean isZero() {
        return this.amount.compareTo(BigDecimal.ZERO) == 0;
    }

    public static Money of(long amount, Currency currency) {
        return new Money(BigDecimal.valueOf(amount), currency);
    }

    public static final Money ZERO_KRW = Money.of(0, Currency.KRW);
}

// Email Value Object — 이메일 주소 검증
public record Email(String value) {

    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    public Email {
        Objects.requireNonNull(value, "이메일은 필수입니다");
        if (!EMAIL_PATTERN.matcher(value).matches()) {
            throw new InvalidEmailException("유효하지 않은 이메일: " + value);
        }
        value = value.toLowerCase(); // 정규화: 소문자로 통일
    }

    // 도메인 이름 추출
    public String domain() {
        return value.substring(value.indexOf('@') + 1);
    }
}

// Address Value Object — 주소
public record Address(
    String street,
    String city,
    String zipCode,
    String country
) {
    public Address {
        Objects.requireNonNull(street, "도로명은 필수입니다");
        Objects.requireNonNull(city, "시/구는 필수입니다");
        Objects.requireNonNull(zipCode, "우편번호는 필수입니다");
        Objects.requireNonNull(country, "국가는 필수입니다");
    }

    // 전체 주소 포맷
    public String formatted() {
        return String.format("[%s] %s %s, %s", zipCode, country, city, street);
    }
}
```

---

## Aggregate — 일관성 경계

Aggregate는 DDD에서 가장 중요하고 어려운 개념 중 하나다.

```java
// Order Aggregate
// - Order: Aggregate Root (외부에서 유일하게 접근할 수 있는 진입점)
// - OrderItem: Order 내부의 Entity (외부에서 직접 접근 불가)
// - Money, Address: Value Object

@Getter
public class Order {
    private final OrderId id;             // Aggregate Root 식별자
    private final UserId userId;          // 다른 Aggregate는 Id로만 참조
    private final List<OrderItem> items;  // 내부 Entity (바깥에서 직접 수정 불가)
    private OrderStatus status;
    private final Address deliveryAddress;
    private Money totalAmount;

    // 정적 팩토리: 생성 시 비즈니스 규칙 적용
    public static Order create(
        UserId userId,
        List<OrderItemRequest> itemRequests,
        Address deliveryAddress
    ) {
        if (itemRequests == null || itemRequests.isEmpty()) {
            throw new IllegalArgumentException("주문 항목은 필수입니다");
        }

        List<OrderItem> items = itemRequests.stream()
            .map(r -> OrderItem.create(
                r.productId(), r.productName(), r.price(), r.quantity()))
            .toList();

        return new Order(OrderId.newId(), userId, items, deliveryAddress);
    }

    // DB 복원용 팩토리 (검증 없이 재구성)
    public static Order reconstitute(
        OrderId id, UserId userId, List<OrderItem> items,
        OrderStatus status, Address deliveryAddress
    ) {
        Order order = new Order(id, userId, items, deliveryAddress);
        order.status = status;
        order.totalAmount = calculateTotal(items);
        return order;
    }

    private Order(OrderId id, UserId userId, List<OrderItem> items,
                  Address deliveryAddress) {
        this.id = id;
        this.userId = userId;
        this.items = new ArrayList<>(items);
        this.deliveryAddress = deliveryAddress;
        this.status = OrderStatus.PENDING;
        this.totalAmount = calculateTotal(items);
    }

    // 외부에서 Aggregate 상태 변경은 반드시 메서드를 통해서만
    public void addItem(ProductId productId, String productName,
                        Money price, int quantity) {
        if (this.status != OrderStatus.PENDING) {
            throw new OrderStatusException("대기 중인 주문에만 항목 추가 가능합니다");
        }
        if (quantity <= 0) {
            throw new IllegalArgumentException("수량은 1 이상이어야 합니다");
        }
        OrderItem newItem = OrderItem.create(productId, productName, price, quantity);
        this.items.add(newItem);
        this.totalAmount = calculateTotal(this.items); // 합계 재계산
    }

    public void confirm() {
        if (this.status != OrderStatus.PENDING) {
            throw new OrderStatusException("대기 상태에서만 확정 가능합니다");
        }
        this.status = OrderStatus.CONFIRMED;
    }

    public void cancel(String reason) {
        if (this.status == OrderStatus.SHIPPED || this.status == OrderStatus.DELIVERED) {
            throw new OrderStatusException("배송 후에는 취소할 수 없습니다");
        }
        this.status = OrderStatus.CANCELLED;
    }

    public void ship() {
        if (this.status != OrderStatus.CONFIRMED) {
            throw new OrderStatusException("확정 상태에서만 배송 처리 가능합니다");
        }
        this.status = OrderStatus.SHIPPED;
    }

    // 불변 뷰 반환 (외부에서 리스트 직접 수정 불가)
    public List<OrderItem> getItems() {
        return Collections.unmodifiableList(items);
    }

    public int totalQuantity() {
        return items.stream().mapToInt(OrderItem::getQuantity).sum();
    }

    private static Money calculateTotal(List<OrderItem> items) {
        return items.stream()
            .map(OrderItem::getSubtotal)
            .reduce(Money.ZERO_KRW, Money::add);
    }
}

// OrderItem — Order Aggregate 내부 Entity
@Getter
public class OrderItem {
    private final OrderItemId id;
    private final ProductId productId;
    private final String productName;  // 주문 당시 상품명 스냅샷 (나중에 변경돼도 영향 없음)
    private final Money price;          // 주문 당시 가격 스냅샷
    private int quantity;

    static OrderItem create(ProductId productId, String productName,
                            Money price, int quantity) {
        if (quantity <= 0) throw new IllegalArgumentException("수량은 1 이상");
        if (price.isZero()) throw new IllegalArgumentException("가격은 0 이상");
        return new OrderItem(OrderItemId.newId(), productId, productName,
                             price, quantity);
    }

    private OrderItem(OrderItemId id, ProductId productId, String productName,
                      Money price, int quantity) {
        this.id = id;
        this.productId = productId;
        this.productName = productName;
        this.price = price;
        this.quantity = quantity;
    }

    // 소계 계산
    public Money getSubtotal() {
        return price.multiply(quantity);
    }
}
```

---

## Aggregate 설계 원칙

```
원칙 1: 트랜잭션 경계 = Aggregate 경계
하나의 트랜잭션에서 하나의 Aggregate만 수정한다.
Order와 Product를 같은 트랜잭션에서 수정하면
→ 두 Aggregate가 강하게 결합됨
→ 각각 분리하고, 결과적 일관성 사용

원칙 2: 작게 유지
Aggregate가 클수록 동시성 충돌 가능성 증가.
Order에 Customer 전체를 넣지 않기
→ Order는 customerId(참조)만 갖기

원칙 3: 다른 Aggregate는 Id로만 참조
// 나쁜 예 ❌ — 다른 Aggregate 직접 참조
public class Order {
    private User user;     // User Aggregate 직접 포함 → 강한 결합
    private Product product; // Product Aggregate 직접 포함
}

// 좋은 예 ✅ — Id로만 참조
public class Order {
    private UserId userId;      // User Aggregate를 Id로 참조
    private List<OrderItem> items; // OrderItem은 Order 내부 Entity
    // items 안에 productId(참조), productName(스냅샷)을 저장
}

원칙 4: Aggregate Root를 통해서만 접근
// 나쁜 예 ❌ — 내부 Entity 직접 수정
order.getItems().get(0).setQuantity(5); // OrderItem을 외부에서 직접 변경

// 좋은 예 ✅ — Aggregate Root 메서드를 통해
order.updateItemQuantity(orderItemId, 5); // Order가 규칙을 지키며 처리
```

---

## Domain Service — 어느 Entity에도 어색한 로직

```java
// 두 계좌 간 이체: Account.transfer()? 어색하다
// Account A가 Account B를 직접 변경하는 것은 단일 책임 위반
// → Domain Service로 추출

// 나쁜 예 ❌
public class Account {
    public void transferTo(Account target, Money amount) {
        this.withdraw(amount);
        target.deposit(amount); // 다른 Aggregate 직접 수정!
    }
}

// 좋은 예 ✅ — Domain Service
public class TransferService { // 무상태(Stateless)

    public void transfer(Account from, Account to, Money amount) {
        // 잔액 확인 (from 계좌 도메인 규칙)
        if (from.getBalance().isLessThan(amount)) {
            throw new InsufficientBalanceException(
                "잔액 부족: " + from.getBalance() + " < " + amount);
        }
        // 두 Aggregate를 조율 (비즈니스 로직은 각 Aggregate가 담당)
        from.withdraw(amount);   // from 계좌 도메인 행동
        to.deposit(amount);      // to 계좌 도메인 행동
    }
}

// 할인 정책: 회원 등급과 주문 금액을 모두 봐야 함
// Order.calculateDiscount()? Member.calculateDiscount()? 어색
public interface DiscountPolicy {
    Money calculateDiscount(Order order, Member member);
}

@Component
public class GradeBasedDiscountPolicy implements DiscountPolicy {

    @Override
    public Money calculateDiscount(Order order, Member member) {
        return switch (member.getGrade()) {
            case VIP  -> order.getTotalAmount().multiply(10).divide(100); // 10% 할인
            case GOLD -> order.getTotalAmount().multiply(5).divide(100);  // 5% 할인
            default   -> Money.ZERO_KRW;
        };
    }
}
```

---

## Domain Event — 도메인에서 일어난 의미 있는 사건

```java
// 도메인 이벤트: 과거에 발생한 사건을 과거형으로 명명
// 예: OrderPlaced(주문됨), PaymentCompleted(결제완료), UserRegistered(사용자등록됨)

// 기반 클래스
public abstract class DomainEvent {
    private final UUID eventId = UUID.randomUUID();  // 이벤트 고유 ID
    private final Instant occurredAt = Instant.now(); // 발생 시각

    public UUID getEventId() { return eventId; }
    public Instant getOccurredAt() { return occurredAt; }
}

// 구체 이벤트: 발생 시점의 정보를 담음 (불변)
public class OrderPlacedEvent extends DomainEvent {
    private final OrderId orderId;
    private final UserId userId;
    private final Money totalAmount;
    private final int itemCount;

    public OrderPlacedEvent(Order order) {
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

    public OrderConfirmedEvent(Order order) {
        this.orderId = order.getId();
        this.userId = order.getUserId();
    }
}

// Aggregate에서 이벤트 수집
@Getter
public class Order {
    // 이벤트를 내부에 수집 (아직 발행 X)
    private final List<DomainEvent> domainEvents = new ArrayList<>();

    public void confirm() {
        if (this.status != OrderStatus.PENDING) {
            throw new OrderStatusException("대기 상태에서만 확정 가능합니다");
        }
        this.status = OrderStatus.CONFIRMED;
        domainEvents.add(new OrderConfirmedEvent(this)); // 이벤트 등록
    }

    // 이벤트를 꺼내면서 비움 (한 번만 발행)
    public List<DomainEvent> pullDomainEvents() {
        List<DomainEvent> events = new ArrayList<>(domainEvents);
        domainEvents.clear();
        return Collections.unmodifiableList(events);
    }
}

// Application Service에서 이벤트 발행
@Service
@Transactional
@RequiredArgsConstructor
public class ConfirmOrderService {

    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher; // Spring 이벤트 발행

    public void confirmOrder(OrderId orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));

        order.confirm(); // 도메인 로직 실행 + 이벤트 수집

        orderRepository.save(order); // 저장

        // 트랜잭션 내부에서 이벤트 발행 (커밋 후 처리되도록 설정)
        order.pullDomainEvents().forEach(eventPublisher::publishEvent);
    }
}

// 이벤트 핸들러
@Component
@RequiredArgsConstructor
public class OrderConfirmedEventHandler {

    private final NotificationService notificationService;
    private final InventoryService inventoryService;

    // 트랜잭션 커밋 후 처리 (AFTER_COMMIT)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleOrderConfirmed(OrderConfirmedEvent event) {
        // 주문 확정 알림 발송 (이 실패가 주문 트랜잭션에 영향 안 줌)
        notificationService.sendOrderConfirmation(
            event.getUserId(), event.getOrderId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleForInventory(OrderConfirmedEvent event) {
        // 재고 예약 처리
        inventoryService.reserveStock(event.getOrderId());
    }
}
```

---

## 흔한 실수: 빈약한 도메인 모델

```java
// 나쁜 예 ❌ — 빈약한 도메인 모델 (Anemic Domain Model)
// 도메인 객체가 데이터 컨테이너에 불과함
@Getter @Setter
public class Order {
    private Long id;
    private String status;     // 단순 String
    private BigDecimal total;
    // getter/setter만 있고 비즈니스 로직 없음
}

// 비즈니스 로직이 모두 Service에 집중
@Service
public class OrderService {
    public void confirmOrder(Long id) {
        Order order = orderRepository.findById(id).orElseThrow();
        if (!order.getStatus().equals("PENDING")) { // 문자열 비교
            throw new Exception("Not pending");
        }
        order.setStatus("CONFIRMED"); // 직접 setter 호출
        orderRepository.save(order);
    }
}

// 좋은 예 ✅ — 풍부한 도메인 모델 (Rich Domain Model)
// 비즈니스 규칙이 도메인 객체 안에 있음
@Getter
public class Order {
    private OrderStatus status; // enum 사용

    public void confirm() {
        if (this.status != OrderStatus.PENDING) { // 타입 비교 (안전)
            throw new OrderStatusException("대기 상태에서만 확정 가능합니다");
        }
        this.status = OrderStatus.CONFIRMED;
    }
    // setter 없음 — 상태 변경은 반드시 비즈니스 메서드를 통해
}
```

---

## 핵심 요약

DDD의 핵심은 3가지다:

1. **유비쿼터스 언어**: 대화에서 쓰는 단어 = 코드에서 쓰는 단어
2. **풍부한 도메인 모델**: 비즈니스 규칙은 도메인 객체 안에 (setter 최소화)
3. **경계 컨텍스트**: 모델이 유효한 범위를 명확히 정의

처음에는 Entity, Value Object, Aggregate만 이해하고 점진적으로 적용해 나가면 된다.
