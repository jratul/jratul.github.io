---
title: "DDD 기초"
order: 4
---

# DDD 기초 (Domain-Driven Design)

도메인 전문가와 개발자가 같은 언어를 쓰며 모델링.

---

## 핵심 개념

```
Ubiquitous Language (유비쿼터스 언어):
— 도메인 전문가와 개발자가 공유하는 언어
— 코드와 대화에서 동일한 용어 사용
— 예: "주문을 취소한다" → order.cancel()

Bounded Context (경계 컨텍스트):
— 모델이 유효한 경계
— 같은 단어도 컨텍스트마다 다른 의미

예: "Product"
  주문 컨텍스트: 이름, 가격, 수량
  창고 컨텍스트: 위치, 무게, 보관 조건
  마케팅 컨텍스트: 설명, 이미지, 태그
```

---

## 빌딩 블록

```
Entity:
— 고유 식별자가 있음 (Id)
— 같은 Id면 같은 객체
— 상태가 변할 수 있음
— 예: User, Order, Product

Value Object:
— 식별자 없음
— 값(속성)으로 동일성 판단
— 불변(Immutable)
— 예: Money, Address, Email

Aggregate:
— Entity + Value Object의 묶음
— 하나의 루트(Aggregate Root)
— 외부는 루트를 통해서만 접근
— 트랜잭션 단위

Domain Service:
— 어느 Entity에도 자연스럽게 속하지 않는 로직
— 무상태(Stateless)
— 예: 환율 계산, 두 계좌 간 이체

Repository:
— Aggregate 단위로 저장/조회
— 컬렉션처럼 다룸
— 인터페이스는 도메인에, 구현은 인프라에

Domain Event:
— 도메인에서 발생한 의미 있는 사건
— 과거형으로 명명
— 예: OrderPlaced, PaymentCompleted
```

---

## Entity vs Value Object

```java
// Entity — Id로 동일성 판단
@Getter
public class User {
    private final UserId id;     // 식별자
    private String email;        // 변할 수 있음
    private String name;

    public User(UserId id, String email, String name) {
        this.id = Objects.requireNonNull(id);
        this.email = Objects.requireNonNull(email);
        this.name = Objects.requireNonNull(name);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User)) return false;
        return id.equals(((User) o).id);  // Id만으로 비교
    }

    @Override
    public int hashCode() { return id.hashCode(); }
}

// Value Object — 값으로 동일성, 불변
public record Money(BigDecimal amount, Currency currency) {

    public Money {
        Objects.requireNonNull(amount);
        Objects.requireNonNull(currency);
        if (amount.scale() > 2) {
            throw new IllegalArgumentException("소수점 2자리 초과");
        }
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("음수 불가");
        }
    }

    // 새 객체 반환 (불변)
    public Money add(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new CurrencyMismatchException();
        }
        return new Money(this.amount.add(other.amount), this.currency);
    }

    public Money multiply(int quantity) {
        return new Money(this.amount.multiply(BigDecimal.valueOf(quantity)), currency);
    }

    public boolean isGreaterThan(Money other) {
        return this.amount.compareTo(other.amount) > 0;
    }
}

// Email Value Object
public record Email(String value) {

    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");

    public Email {
        Objects.requireNonNull(value);
        if (!EMAIL_PATTERN.matcher(value).matches()) {
            throw new InvalidEmailException(value);
        }
        value = value.toLowerCase();  // 정규화
    }
}

// Address Value Object
public record Address(
    String street,
    String city,
    String zipCode,
    String country
) {
    public Address {
        Objects.requireNonNull(street);
        Objects.requireNonNull(city);
        Objects.requireNonNull(zipCode);
        Objects.requireNonNull(country);
    }

    public String fullAddress() {
        return String.format("%s %s, %s, %s", zipCode, city, street, country);
    }
}
```

---

## Aggregate 설계

```java
// Order Aggregate — Root는 Order
@Getter
public class Order {
    private final OrderId id;             // 루트 식별자
    private final UserId userId;
    private final List<OrderItem> items;  // 내부 Entity (외부에서 직접 접근 불가)
    private OrderStatus status;
    private final Address deliveryAddress;
    private Money totalAmount;

    // 생성: 팩토리 메서드 또는 생성자
    public static Order create(UserId userId, List<OrderItemRequest> itemRequests,
                               Address deliveryAddress) {
        List<OrderItem> items = itemRequests.stream()
            .map(r -> new OrderItem(
                OrderItemId.newId(),
                r.productId(),
                r.productName(),
                r.price(),
                r.quantity()
            ))
            .toList();

        return new Order(OrderId.newId(), userId, items, deliveryAddress);
    }

    private Order(OrderId id, UserId userId, List<OrderItem> items,
                  Address deliveryAddress) {
        if (items.isEmpty()) throw new IllegalArgumentException("주문 항목 필수");
        this.id = id;
        this.userId = userId;
        this.items = new ArrayList<>(items);
        this.deliveryAddress = deliveryAddress;
        this.status = OrderStatus.PENDING;
        this.totalAmount = calculateTotal(items);
    }

    // 비즈니스 행동: 외부에서 Aggregate 상태 변경 시 반드시 이 메서드를 통해
    public void addItem(OrderItem item) {
        if (this.status != OrderStatus.PENDING) {
            throw new IllegalStateException("대기 중인 주문에만 항목 추가 가능");
        }
        this.items.add(item);
        this.totalAmount = calculateTotal(this.items);
    }

    public void confirm() {
        if (this.status != OrderStatus.PENDING) {
            throw new OrderStatusException("대기 상태에서만 확정 가능");
        }
        this.status = OrderStatus.CONFIRMED;
    }

    public void cancel(String reason) {
        if (this.status == OrderStatus.SHIPPED || this.status == OrderStatus.DELIVERED) {
            throw new OrderStatusException("배송 후 취소 불가");
        }
        this.status = OrderStatus.CANCELLED;
    }

    // 내부 계산만 노출 (상태는 외부에서 직접 변경 불가)
    public int totalQuantity() {
        return items.stream().mapToInt(OrderItem::getQuantity).sum();
    }

    private Money calculateTotal(List<OrderItem> items) {
        return items.stream()
            .map(OrderItem::getSubtotal)
            .reduce(Money.ZERO, Money::add);
    }

    // 외부: items 직접 수정 불가하도록 방어적 복사
    public List<OrderItem> getItems() {
        return Collections.unmodifiableList(items);
    }
}

// OrderItem — Order Aggregate 내부 Entity
@Getter
public class OrderItem {
    private final OrderItemId id;
    private final ProductId productId;
    private final String productName;  // 주문 당시 가격/이름 스냅샷
    private final Money price;
    private int quantity;

    public Money getSubtotal() {
        return price.multiply(quantity);
    }
}
```

---

## Aggregate 경계 결정 원칙

```
원칙 1: 트랜잭션 일관성 단위
— 하나의 트랜잭션 = 하나의 Aggregate 수정
— Order와 Product를 같은 트랜잭션에서 수정하면 → 같은 Aggregate? NO
  → 각각 별도 Aggregate, 결과적 일관성 사용

원칙 2: 작게 유지
— Aggregate가 크면 동시성 충돌 증가
— Order에 Customer 정보 통째로 넣지 않기
  → Order는 customerId(참조)만 가짐

원칙 3: 다른 Aggregate는 Id로 참조
Order.userId  →  UserId (참조)  // User 객체 X
Order.items   →  List<OrderItem> // 내부 엔티티 O

원칙 4: 루트를 통해서만 접근
// 외부에서 OrderItem 직접 수정 ❌
orderItem.setQuantity(3);

// Aggregate Root를 통해 ✅
order.updateItemQuantity(orderItemId, 3);
```
