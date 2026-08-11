---
title: "도메인 모델링, 빈약한 모델에서 벗어나기"
date: "2026-08-11"
tags: ["domain-driven-design", "ddd", "domain-modeling", "architecture", "backend"]
excerpt: "Anemic Domain Model이 왜 문제가 되는지부터 Entity/Value Object/Aggregate 같은 DDD 전술 패턴, 그리고 최근 모듈러 모놀리스에서 DDD를 가볍게 채용하는 흐름까지 정리합니다."
---

# 도메인 모델링, 빈약한 모델에서 벗어나기

Spring 프로젝트를 몇 개 거치다 보면 비슷한 구조를 자주 마주칩니다. Entity는 필드와 getter/setter만
가지고 있고, 실제 비즈니스 로직은 전부 Service 클래스에 몰려 있는 구조입니다. 컴파일도 되고
테스트도 통과하지만, 도메인이 복잡해질수록 이 구조는 점점 버거워집니다. 이 글에서는 이런
**빈약한 도메인 모델**(Anemic Domain Model)이 왜 문제가 되는지, DDD(Domain-Driven Design)의
전술 패턴이 이를 어떻게 해결하는지, 그리고 애그리거트 경계를 잡을 때 흔히 하는 실수를 정리합니다.

---

## Anemic Domain Model 문제

**빈약한 도메인 모델**은 마틴 파울러가 2003년에 쓴 글에서 정의한 안티패턴입니다. 객체지향
언어로 작성했지만 실제로는 객체 안에 데이터만 있고 행위(behavior)는 없는, 절차지향에 가까운
구조를 가리킵니다.

### Before: 로직이 Service에 흩어진 버전

```java
@Entity
public class Order {

    @Id
    private Long id;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    private LocalDateTime paidAt;

    private BigDecimal totalAmount;

    // getter/setter만 존재
    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public LocalDateTime getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(LocalDateTime paidAt) {
        this.paidAt = paidAt;
    }

    // ... 나머지 필드도 동일하게 getter/setter뿐
}
```

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final RefundService refundService;

    @Transactional
    public void cancelOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));

        // 취소 가능 여부 판단 로직이 Service에 있음
        if (order.getStatus() == OrderStatus.DELIVERED) {
            throw new IllegalStateException("배송 완료된 주문은 취소할 수 없습니다.");
        }
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("이미 취소된 주문입니다.");
        }

        // 결제 후 취소인지 판단하는 로직도 Service에 있음
        if (order.getPaidAt() != null) {
            refundService.refund(order.getId(), order.getTotalAmount());
        }

        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);
    }
}
```

이 구조의 문제는 `Order`가 스스로 "취소 가능한 상태인가"를 판단할 능력이 없다는 점입니다.
같은 판단 로직이 필요한 다른 Service(예: 관리자 강제 취소, 배치 취소)가 생기면 똑같은
if문이 복사되기 쉽고, 검증 로직 하나를 빠뜨려도 컴파일러가 알려주지 않습니다.

---

### After: Order가 스스로 상태를 책임지는 버전

```java
@Entity
public class Order {

    @Id
    private Long id;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    private LocalDateTime paidAt;

    private BigDecimal totalAmount;

    protected Order() {
        // JPA 기본 생성자
    }

    public void cancel(RefundPolicy refundPolicy) {
        if (status == OrderStatus.DELIVERED) {
            throw new IllegalStateException("배송 완료된 주문은 취소할 수 없습니다.");
        }
        if (status == OrderStatus.CANCELLED) {
            throw new IllegalStateException("이미 취소된 주문입니다.");
        }

        if (paidAt != null) {
            refundPolicy.refund(this.id, this.totalAmount);
        }

        this.status = OrderStatus.CANCELLED;
    }

    public OrderStatus getStatus() {
        return status;
    }
}
```

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final RefundPolicy refundPolicy;

    @Transactional
    public void cancelOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));

        order.cancel(refundPolicy);
        // JPA 영속성 컨텍스트 안이므로 별도 save 호출 없이도 더티체킹으로 반영됨
    }
}
```

`cancel()` 하나로 "취소 가능 여부 검증 + 환불 처리 + 상태 변경"이 한곳에 캡슐화됩니다.
Service는 트랜잭션 경계를 관리하고 흐름을 조율하는 역할(orchestration)만 남고, "취소란
무엇인가"라는 규칙은 `Order` 스스로 지킵니다. 새로운 취소 경로가 생겨도 `order.cancel()`을
호출하기만 하면 검증 로직이 자동으로 따라옵니다.

---

## DDD 전술 패턴 핵심 3가지

Rich Domain Model을 만들 때 자주 등장하는 세 가지 개념을 정리합니다.

### Entity vs Value Object

**Entity**는 속성이 같아도 식별자(ID)로 구분되는 객체입니다. `Order`, `Member`처럼 생명주기
동안 상태가 계속 바뀌지만, ID가 같으면 같은 대상으로 취급합니다.

**Value Object**는 식별자가 없고 값 자체로 구분되는 불변 객체입니다. 두 값이 완전히 같으면
같은 객체로 취급합니다. 주소나 금액이 대표적인 예입니다.

```java
@Embeddable
public class Money {

    private final BigDecimal amount;
    private final String currency;

    protected Money() {
        this.amount = null;
        this.currency = null;
    }

    public Money(BigDecimal amount, String currency) {
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("금액은 음수일 수 없습니다.");
        }
        this.amount = amount;
        this.currency = currency;
    }

    public Money add(Money other) {
        validateSameCurrency(other);
        return new Money(this.amount.add(other.amount), this.currency);
    }

    public Money subtract(Money other) {
        validateSameCurrency(other);
        BigDecimal result = this.amount.subtract(other.amount);
        if (result.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("차감 결과가 음수가 될 수 없습니다.");
        }
        return new Money(result, this.currency);
    }

    private void validateSameCurrency(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException("통화 단위가 다릅니다.");
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Money other)) return false;
        return amount.compareTo(other.amount) == 0 && currency.equals(other.currency);
    }

    @Override
    public int hashCode() {
        return Objects.hash(amount.stripTrailingZeros(), currency);
    }
}
```

`Money`를 원시 타입 `BigDecimal`로 그냥 다루면 통화 단위 검증, 음수 방지 같은 규칙이 매번
호출하는 쪽 코드에 흩어집니다. Value Object로 묶으면 "돈은 항상 유효한 상태로만 존재한다"는
불변식을 타입 자체가 보장합니다. `Address`도 마찬가지로 우편번호·도로명·상세주소를 묶어
불변 객체로 만들면, "주소가 바뀌었다"는 개념을 필드 세 개를 개별 수정하는 대신 새 `Address`
인스턴스로 교체하는 것으로 표현할 수 있습니다.

| 구분 | Entity | Value Object |
|---|---|---|
| 동등성 판단 | 식별자(ID) | 속성 값 전체 |
| 가변성 | 가변(mutable) | 불변(immutable) |
| 생명주기 | 별도로 추적됨 | Entity에 종속 |
| 예시 | Order, Member, Product | Money, Address, Period |

---

### Aggregate와 Aggregate Root

**애그리거트**는 관련된 Entity와 Value Object를 하나로 묶어, 데이터 일관성을 지켜야 하는
경계(consistency boundary)를 정의한 단위입니다. 애그리거트 안에서 가장 바깥의 진입점 역할을
하는 Entity를 **애그리거트 루트**라고 부릅니다.

```java
@Entity
public class Order { // Aggregate Root

    @Id
    private Long id;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderLine> orderLines = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    public void addLine(Product product, int quantity) {
        if (status != OrderStatus.CREATED) {
            throw new IllegalStateException("이미 확정된 주문에는 항목을 추가할 수 없습니다.");
        }
        orderLines.add(new OrderLine(this, product.getId(), quantity, product.getPrice()));
    }

    public Money calculateTotal() {
        return orderLines.stream()
            .map(OrderLine::getSubtotal)
            .reduce(Money.zero("KRW"), Money::add);
    }
}
```

```java
@Entity
public class OrderLine { // 애그리거트 내부 Entity, 외부에서 직접 접근하지 않음

    @Id
    @GeneratedValue
    private Long id;

    @ManyToOne
    @JoinColumn(name = "order_id")
    private Order order;

    private Long productId; // 다른 애그리거트(Product)는 ID로만 참조

    private int quantity;

    @Embedded
    private Money unitPrice;

    protected OrderLine() {
    }

    OrderLine(Order order, Long productId, int quantity, Money unitPrice) {
        this.order = order;
        this.productId = productId;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
    }

    Money getSubtotal() {
        return unitPrice.multiply(quantity);
    }
}
```

여기서 핵심은 `OrderLine`이 `Product` 전체를 참조하지 않고 `productId`만 들고 있다는
점입니다. 다른 애그리거트는 반드시 ID로만 참조해야 한다는 규칙은 두 가지를 지켜줍니다.

- 트랜잭션 경계가 애그리거트 하나로 명확하게 제한됩니다. `Order`를 저장할 때 `Product`까지
  같이 잠그거나 변경할 필요가 없습니다.
- 애그리거트 간 결합도가 낮아져, `Product`의 내부 구조가 바뀌어도 `Order`는 영향을
  받지 않습니다.

일반적으로 하나의 트랜잭션(하나의 `@Transactional` 메서드)은 애그리거트 하나만 수정하는
것을 원칙으로 삼습니다. 여러 애그리거트를 동시에 바꿔야 한다면 도메인 이벤트로 분리하는
방법을 검토합니다.

---

### Domain Service

애그리거트 하나의 책임으로 보기 애매한, 여러 애그리거트에 걸친 로직은 **Domain Service**에
둡니다. 흔히 하는 실수는 이런 로직을 그냥 Application Service(위 예제의 `OrderService`
같은 클래스)에 섞어버리는 것인데, 그러면 "조율 로직"과 "도메인 규칙"이 다시 뒤섞입니다.

```java
@Component
public class TransferService { // Domain Service

    public void transfer(Account from, Account to, Money amount) {
        from.withdraw(amount); // Account 애그리거트 자신의 불변식 검증
        to.deposit(amount);
    }
}
```

`Account` 애그리거트 하나만으로는 "다른 계좌로 옮긴다"는 개념을 표현할 수 없기 때문에
두 애그리거트를 오가는 조정 로직을 Domain Service에 둡니다. 다만 `withdraw()`,
`deposit()` 각각의 검증(잔액 부족 등)은 여전히 `Account` 내부에 남아 있다는 점이
중요합니다. Domain Service는 조정만 하고, 규칙은 애그리거트가 계속 소유합니다.

---

## 애그리거트 설계 시 흔한 실수

애그리거트 경계를 잡는 기준은 "이 범위 안의 비즈니스 불변식이 항상 즉시(트랜잭션 커밋
시점에) 지켜져야 하는가"입니다. 실무에서는 이 경계를 양쪽으로 잘못 잡는 경우가 많습니다.

| 실수 | 증상 | 원인 |
|---|---|---|
| 애그리거트를 너무 크게 잡음 | 동시 수정 시 낙관적 락 충돌(`OptimisticLockException`)이 자주 발생 | 서로 다른 사용자가 거의 동시에 편집할 가능성이 있는 데이터를 하나의 트랜잭션 경계로 묶음 (예: `Order` 안에 배송 상태·리뷰·재고 이력까지 전부 포함) |
| 애그리거트를 너무 잘게 쪼갬 | 여러 애그리거트를 오가며 저장해야 하는데 중간에 실패하면 데이터가 반쪽만 반영됨 | 진짜로 함께 일관되어야 하는 데이터(예: `Order`와 `OrderLine`)를 억지로 분리 |
| 애그리거트 루트를 거치지 않고 내부 Entity를 직접 수정 | 애그리거트가 지켜야 할 불변식이 우회됨 | `OrderLineRepository`를 따로 만들어 `OrderLine`을 직접 조회/수정 |
| 한 트랜잭션에서 여러 애그리거트를 동시에 수정 | 락 범위가 넓어지고 트랜잭션이 길어짐 | "어차피 같은 트랜잭션이니까" 하고 여러 애그리거트를 한 메서드에서 같이 저장 |

기준을 정리하면, **"지금 당장 정합성이 깨지면 안 되는 범위"만 하나의 애그리거트**로
묶고, 나머지는 결과적 일관성(eventual consistency)으로 풀어도 되는지 먼저 검토하는
편이 안전합니다. 예를 들어 "주문이 취소되면 재고를 복구한다"는 `Order`와 `Product`를
같은 트랜잭션에 묶기보다, `OrderCancelledEvent`를 발행하고 재고 애그리거트가 이를
구독해 별도 트랜잭션으로 처리하는 방식이 애그리거트 크기를 작게 유지하는 데 도움이
됩니다.

```java
@Entity
public class Order {

    @Id
    private Long id;

    @Transient
    private final List<Object> domainEvents = new ArrayList<>();

    public void cancel(RefundPolicy refundPolicy) {
        // ... 검증 및 상태 변경 로직

        domainEvents.add(new OrderCancelledEvent(this.id));
    }

    @DomainEvents
    Collection<Object> domainEvents() {
        return domainEvents;
    }

    @AfterDomainEventPublication
    void clearEvents() {
        domainEvents.clear();
    }
}
```

Spring Data가 지원하는 `@DomainEvents`를 쓰면 애그리거트 저장 시점에 쌓아둔 이벤트가
자동으로 발행되고, 재고 복구 같은 후속 처리는 별도 리스너에서 담당하게 분리할 수
있습니다.

---

## 최근 흐름: 모듈러 모놀리스와 함께 가는 DDD

몇 년 전에는 DDD가 "마이크로서비스로 전환하기 위한 선행 단계"처럼 소개되는 경우가 많았습니다.
애그리거트 경계를 서비스 경계로 그대로 옮기면 MSA 분리가 자연스럽다는 논리입니다. 다만
실무에서는 애그리거트 경계가 곧 조직/운영 경계로 이어지는 MSA 전환까지 가지 않고도, 도메인
로직 자체를 정리하는 데만 DDD 전술 패턴을 쓰는 사례가 많이 언급됩니다.

최근에는 **모듈러 모놀리스**(Modular Monolith) 안에서 애그리거트 단위로 패키지·모듈
경계를 나누는 방식이 다시 주목받는 편입니다. 배포 단위는 하나로 유지하면서, 패키지
구조나 빌드 모듈(Gradle 멀티 모듈 등)로 `order`, `payment`, `inventory` 같은 경계를
분리해두면 이런 이점이 있습니다.

- 서비스 간 네트워크 호출·분산 트랜잭션 없이도 모듈 간 결합도를 낮게 유지할 수 있습니다.
- 나중에 특정 모듈만 별도 서비스로 분리해야 할 상황이 오면, 이미 애그리거트 단위로
  정리된 경계를 그대로 서비스 경계 후보로 삼을 수 있습니다.
- 분산 시스템의 복잡도(네트워크 장애, 데이터 정합성, 관측성)를 처음부터 떠안지 않아도
  됩니다.

```
com.example.shop
├── order
│   ├── Order.java          (Aggregate Root)
│   ├── OrderLine.java
│   ├── OrderRepository.java
│   └── OrderService.java
├── payment
│   ├── Payment.java
│   └── PaymentRepository.java
└── inventory
    ├── Stock.java
    └── StockRepository.java
```

물론 이게 모든 상황에 정답이라는 뜻은 아닙니다. 팀 규모, 배포 주기, 트래픽 특성에 따라
처음부터 서비스를 분리하는 편이 나을 때도 있습니다. 다만 "DDD를 하려면 MSA부터 해야
한다"는 전제 자체는 실무에서 점점 힘을 잃고 있고, 복잡한 도메인 로직을 다루는 도구로
DDD를 먼저 가볍게 채용한 뒤 서비스 분리는 필요해질 때 판단하는 흐름이 자주 언급됩니다.

---

## 요약

1. **Anemic Domain Model**: getter/setter만 있고 로직이 Service에 몰린 구조. 검증 로직이
   중복되고 흩어지기 쉽습니다.
2. **Rich Domain Model**: Entity가 자신의 상태 변경 규칙을 스스로 캡슐화합니다 (`order.cancel()`).
3. **Entity vs Value Object**: 식별자로 구분되는가, 값 자체로 구분되는가가 기준입니다.
4. **Aggregate**: 일관성 경계를 정의하는 단위이며, 다른 애그리거트는 ID로만 참조합니다.
5. **Domain Service**: 여러 애그리거트에 걸친 조정 로직을 담되, 개별 규칙은 여전히 애그리거트가
   소유합니다.
6. **애그리거트 크기**: "지금 당장 정합성이 깨지면 안 되는 범위"만 묶고, 나머지는 도메인
   이벤트로 결과적 일관성을 취합니다.
7. **모듈러 모놀리스**: MSA 전제 없이도 애그리거트 단위로 모듈 경계를 나눠 DDD를 가볍게
   적용하는 흐름이 최근 자주 언급됩니다.
