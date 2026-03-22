---
title: "클린 아키텍처"
order: 3
---

# 클린 아키텍처

Robert C. Martin(Uncle Bob)이 제안한 의존성 규칙.

---

## 개념

```
동심원 구조 (안쪽이 핵심):

        ┌─────────────────────────────┐
        │  Frameworks & Drivers       │  (Spring, JPA, Web)
        │  ┌───────────────────────┐  │
        │  │  Interface Adapters   │  │  (Controller, Gateway)
        │  │  ┌─────────────────┐  │  │
        │  │  │  Application    │  │  │  (UseCase)
        │  │  │  ┌───────────┐  │  │  │
        │  │  │  │  Domain   │  │  │  │  (Entity, Domain Logic)
        │  │  │  └───────────┘  │  │  │
        │  │  └─────────────────┘  │  │
        │  └───────────────────────┘  │
        └─────────────────────────────┘

의존성 규칙:
안쪽 원은 바깥쪽 원을 전혀 몰라야 함
모든 의존성은 안쪽으로만
```

---

## 헥사고날과의 차이

```
헥사고날: 포트와 어댑터 중심 (입출력 분리)
클린:     동심원 레이어 중심 (추상화 수준)

사실상 같은 목표, 다른 표현:
— 도메인 격리
— 의존성 역전
— 테스트 용이성

실무에서는 두 개념을 합쳐서 사용하는 경우가 많음
```

---

## 코드 예시

```java
// ── Entities (Domain Layer) ────────────────────────────────
// domain/entity/Order.java
@Getter
public class Order {
    private final OrderId id;
    private final UserId userId;
    private final List<OrderItem> items;
    private OrderStatus status;
    private Money totalAmount;

    public Order(OrderId id, UserId userId, List<OrderItem> items) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("주문 항목이 없습니다");
        }
        this.id = id;
        this.userId = userId;
        this.items = new ArrayList<>(items);
        this.status = OrderStatus.PENDING;
        this.totalAmount = calculateTotal(items);
    }

    public void confirm() {
        if (this.status != OrderStatus.PENDING) {
            throw new IllegalStateException("대기 상태에서만 확정 가능합니다");
        }
        this.status = OrderStatus.CONFIRMED;
    }

    public void cancel() {
        if (this.status == OrderStatus.SHIPPED) {
            throw new IllegalStateException("배송 중에는 취소 불가합니다");
        }
        this.status = OrderStatus.CANCELLED;
    }

    private Money calculateTotal(List<OrderItem> items) {
        return items.stream()
            .map(OrderItem::getSubtotal)
            .reduce(Money.ZERO, Money::add);
    }
}

// domain/entity/Money.java — Value Object
public record Money(BigDecimal amount, Currency currency) {

    public static final Money ZERO = new Money(BigDecimal.ZERO, Currency.KRW);

    public Money {
        Objects.requireNonNull(amount);
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("금액은 0 이상이어야 합니다");
        }
    }

    public Money add(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException("통화가 다릅니다");
        }
        return new Money(this.amount.add(other.amount), this.currency);
    }
}

// ── Use Cases (Application Layer) ─────────────────────────
// application/usecase/PlaceOrderUseCase.java
public interface PlaceOrderUseCase {
    OrderResult placeOrder(PlaceOrderCommand command);
}

// application/usecase/PlaceOrderCommand.java
public record PlaceOrderCommand(
    Long userId,
    List<OrderItemCommand> items
) {}

public record OrderItemCommand(Long productId, int quantity) {}

// application/service/PlaceOrderService.java
@Service
@RequiredArgsConstructor
@Transactional
public class PlaceOrderService implements PlaceOrderUseCase {

    private final LoadProductPort loadProductPort;
    private final SaveOrderPort saveOrderPort;
    private final ReserveStockPort reserveStockPort;
    private final OrderEventPublisher orderEventPublisher;

    @Override
    public OrderResult placeOrder(PlaceOrderCommand command) {
        // 1. 상품 조회
        List<OrderItem> items = command.items().stream()
            .map(itemCmd -> {
                Product product = loadProductPort.loadProduct(itemCmd.productId())
                    .orElseThrow(() -> new ProductNotFoundException(itemCmd.productId()));
                return new OrderItem(product, itemCmd.quantity());
            })
            .toList();

        // 2. 도메인 객체 생성 (비즈니스 규칙 검증 포함)
        Order order = new Order(null, new UserId(command.userId()), items);

        // 3. 재고 예약
        reserveStockPort.reserve(items);

        // 4. 주문 저장
        Order saved = saveOrderPort.saveOrder(order);

        // 5. 이벤트 발행
        orderEventPublisher.publishOrderPlaced(saved);

        return OrderResult.from(saved);
    }
}

// ── Interface Adapters ─────────────────────────────────────
// adapter/web/OrderController.java
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final PlaceOrderUseCase placeOrderUseCase;
    private final GetOrderUseCase getOrderUseCase;

    @PostMapping
    public ResponseEntity<OrderResponse> placeOrder(
        @RequestBody @Valid PlaceOrderRequest request,
        @AuthenticationPrincipal Long userId
    ) {
        PlaceOrderCommand command = new PlaceOrderCommand(
            userId,
            request.getItems().stream()
                .map(i -> new OrderItemCommand(i.getProductId(), i.getQuantity()))
                .toList()
        );
        OrderResult result = placeOrderUseCase.placeOrder(command);
        return ResponseEntity.status(201).body(OrderResponse.from(result));
    }
}

// adapter/persistence/OrderPersistenceAdapter.java
@Component
@RequiredArgsConstructor
public class OrderPersistenceAdapter implements SaveOrderPort, LoadOrderPort {

    private final OrderJpaRepository jpaRepository;
    private final OrderMapper mapper;

    @Override
    public Order saveOrder(Order order) {
        OrderJpaEntity entity = mapper.toEntity(order);
        return mapper.toDomain(jpaRepository.save(entity));
    }

    @Override
    public Optional<Order> loadOrder(Long id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }
}
```

---

## 의존성 역전 적용

```java
// 잘못된 예: Application이 Infrastructure에 직접 의존
// application/service/OrderService.java
public class OrderService {
    private OrderJpaRepository jpaRepository;  // ← Infrastructure 직접 의존! 위반
}

// 올바른 예: 포트(인터페이스)를 통해 의존성 역전
// application/port/out/SaveOrderPort.java (Application Layer)
public interface SaveOrderPort {
    Order saveOrder(Order order);
}

// adapter/persistence/OrderPersistenceAdapter.java (Infrastructure)
public class OrderPersistenceAdapter implements SaveOrderPort {
    // Application의 인터페이스를 구현
    // → 의존성이 Infrastructure → Application 방향
}

// 결과:
// Application은 Interface(포트)에만 의존 ✅
// Infrastructure가 Application을 향해 의존 ✅ (방향 역전)
```

---

## 언제 쓸까

```
적합:
— 복잡한 비즈니스 도메인 (주문, 결제, 정산)
— 장기 유지보수 필요한 프로젝트
— 인프라 교체 가능성 있음
— 도메인 로직 단위 테스트 중요

과할 수 있음:
— 단순 CRUD API 서버
— 1-2인 소규모, 빠른 프로토타입
— 로직보다 데이터 변환이 주인 경우

팀 내 합의가 중요:
— 오버엔지니어링 vs 적정 복잡도
— 도입 시 코드량 증가 → 개발 속도 초반 감소
— 중장기적으로는 유지보수 비용 절감
```
