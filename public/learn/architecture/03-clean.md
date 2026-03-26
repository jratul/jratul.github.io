---
title: "클린 아키텍처"
order: 3
---

# 클린 아키텍처

Robert C. Martin(Uncle Bob)이 제안한 아키텍처. 핵심은 "의존성 규칙"이다.

---

## 왜 이게 필요할까?

소프트웨어를 오래 유지보수하다 보면 이런 문제를 만난다:
- Spring을 업그레이드하려고 했더니 도메인 로직을 다 고쳐야 한다
- DB를 MySQL에서 PostgreSQL로 바꾸려는데 서비스 클래스를 수정해야 한다
- 테스트를 작성하려면 Spring 컨텍스트 전체가 떠야 한다

원인은 항상 같다: **중요한 것(비즈니스 로직)이 덜 중요한 것(프레임워크, DB)에 의존하고 있다.**

클린 아키텍처는 이 의존성 방향을 뒤집는다. 비즈니스 로직은 아무것도 모른다. 외부 세계가 비즈니스 로직을 향해 의존한다.

---

## 동심원 구조

```
바깥쪽 → 안쪽으로 의존성 흐름 (반대 방향은 절대 금지)

        ┌──────────────────────────────────┐
        │   Frameworks & Drivers (외부)    │  Spring, JPA, Web, DB 드라이버
        │   ┌──────────────────────────┐  │
        │   │  Interface Adapters      │  │  Controller, Presenter, Gateway
        │   │  ┌────────────────────┐  │  │
        │   │  │   Application       │  │  │  Use Cases (비즈니스 흐름 조율)
        │   │  │  ┌──────────────┐  │  │  │
        │   │  │  │   Domain     │  │  │  │  Entity, Value Object, Domain Rule
        │   │  │  └──────────────┘  │  │  │
        │   │  └────────────────────┘  │  │
        │   └──────────────────────────┘  │
        └──────────────────────────────────┘

의존성 규칙:
안쪽 원은 바깥쪽 원의 존재를 전혀 몰라야 한다.
Domain은 Application을 모른다.
Application은 Controller를 모른다.
Controller는 JPA를 알아도 되지만, Domain은 JPA를 몰라야 한다.
```

---

## 각 층의 역할

```
Domain Layer (가장 안쪽):
— 비즈니스 규칙 그 자체. 엔터프라이즈 전반에 적용되는 규칙
— Entity, Value Object, Domain Service
— 어떤 프레임워크도 몰라야 함. 순수 Java
— 예: "주문 금액은 0 이상이어야 한다", "배송 중인 주문은 취소 불가"

Application Layer:
— 애플리케이션에 특화된 비즈니스 규칙 (Use Case)
— "어떤 순서로 도메인 로직을 조율할 것인가"
— 도메인은 알지만, 외부(DB, HTTP)는 포트 인터페이스를 통해서만 접근
— 예: 주문 생성 흐름 (상품 조회 → 재고 확인 → 주문 생성 → 저장 → 이메일)

Interface Adapters:
— 외부 데이터 형식과 내부 형식 간 변환
— Controller (HTTP → Command 변환), Presenter (결과 → 응답 DTO)
— Repository 구현체 (DB → 도메인 변환)

Frameworks & Drivers:
— Spring, JPA, DB 드라이버, 메시지 브로커
— 세부 구현. 교체 가능해야 함
```

---

## 헥사고날 아키텍처와의 관계

```
사실상 같은 목표를 다른 각도에서 표현:

헥사고날: 포트(Port)와 어댑터(Adapter) 중심으로 설명
          "입력/출력 포트를 정의하고, 어댑터로 연결"

클린:     동심원(레이어) 중심으로 설명
          "의존성 방향이 항상 안쪽으로"

공통점:
— 도메인 격리 (외부와 분리)
— 의존성 역전 (DIP 적용)
— 테스트 용이성
— 인프라 교체 가능

실무:
대부분 두 개념을 합쳐서 사용한다.
"클린 아키텍처 + 헥사고날 스타일의 포트/어댑터" 형태
```

---

## 코드 예시 — 주문 도메인

### Domain Layer — 순수 비즈니스 규칙

```java
// domain/entity/Order.java — 순수 도메인 객체 (프레임워크 0)
@Getter
public class Order {
    private final OrderId id;
    private final UserId userId;
    private final List<OrderItem> items;
    private OrderStatus status;
    private Money totalAmount;

    // 정적 팩토리: 주문 생성 시 검증 포함
    public static Order create(UserId userId, List<OrderItem> items) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("주문 항목이 없습니다");
        }
        return new Order(OrderId.newId(), userId, items);
    }

    // DB 복원용 (reconstitute = 재구성)
    public static Order reconstitute(OrderId id, UserId userId,
                                     List<OrderItem> items, OrderStatus status) {
        Order order = new Order(id, userId, items);
        order.status = status;
        order.totalAmount = calculateTotal(items);
        return order;
    }

    private Order(OrderId id, UserId userId, List<OrderItem> items) {
        this.id = id;
        this.userId = userId;
        this.items = new ArrayList<>(items);
        this.status = OrderStatus.PENDING;
        this.totalAmount = calculateTotal(items);
    }

    // 비즈니스 행동: 규칙 검증 후 상태 변경
    public void confirm() {
        if (this.status != OrderStatus.PENDING) {
            throw new IllegalStateException("대기 상태에서만 확정 가능합니다");
        }
        this.status = OrderStatus.CONFIRMED;
    }

    public void cancel() {
        if (this.status == OrderStatus.SHIPPED || this.status == OrderStatus.DELIVERED) {
            throw new IllegalStateException("배송 후에는 취소할 수 없습니다");
        }
        this.status = OrderStatus.CANCELLED;
    }

    public void ship() {
        if (this.status != OrderStatus.CONFIRMED) {
            throw new IllegalStateException("확정된 주문만 배송 처리 가능합니다");
        }
        this.status = OrderStatus.SHIPPED;
    }

    // 계산: 외부에서 상태 직접 변경 불가
    public int totalQuantity() {
        return items.stream().mapToInt(OrderItem::getQuantity).sum();
    }

    public List<OrderItem> getItems() {
        return Collections.unmodifiableList(items); // 방어적 복사
    }

    private static Money calculateTotal(List<OrderItem> items) {
        return items.stream()
            .map(OrderItem::getSubtotal)
            .reduce(Money.ZERO, Money::add);
    }
}

// domain/entity/Money.java — Value Object (불변, 값으로 동일성 비교)
public record Money(BigDecimal amount, Currency currency) {

    public static final Money ZERO = new Money(BigDecimal.ZERO, Currency.KRW);

    // 생성자: 불변 규칙 검증
    public Money {
        Objects.requireNonNull(amount, "금액은 필수입니다");
        Objects.requireNonNull(currency, "통화는 필수입니다");
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("금액은 0 이상이어야 합니다");
        }
    }

    // 연산: 항상 새 객체 반환 (불변)
    public Money add(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException(
                "통화가 다릅니다: " + this.currency + " vs " + other.currency);
        }
        return new Money(this.amount.add(other.amount), this.currency);
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
}
```

---

### Application Layer — Use Case

```java
// application/port/in/PlaceOrderUseCase.java — Inbound Port
public interface PlaceOrderUseCase {
    OrderResult placeOrder(PlaceOrderCommand command);
}

// application/port/in/PlaceOrderCommand.java — 입력 데이터
public record PlaceOrderCommand(
    Long userId,
    List<OrderItemCommand> items
) {
    public record OrderItemCommand(Long productId, int quantity) {}
}

// application/port/out/LoadProductPort.java — Outbound Port
public interface LoadProductPort {
    Optional<Product> loadProduct(Long productId);
}

// application/port/out/SaveOrderPort.java — Outbound Port
public interface SaveOrderPort {
    Order saveOrder(Order order);
}

// application/port/out/ReserveStockPort.java — Outbound Port
public interface ReserveStockPort {
    void reserve(List<OrderItem> items);
}

// application/port/out/OrderEventPublisher.java — Outbound Port
public interface OrderEventPublisher {
    void publishOrderPlaced(Order order);
}

// application/service/PlaceOrderService.java — Use Case 구현
@Service
@RequiredArgsConstructor
@Transactional
public class PlaceOrderService implements PlaceOrderUseCase {

    // 모두 인터페이스(Port)에 의존 — 구현체 모름
    private final LoadProductPort loadProductPort;
    private final SaveOrderPort saveOrderPort;
    private final ReserveStockPort reserveStockPort;
    private final OrderEventPublisher orderEventPublisher;

    @Override
    public OrderResult placeOrder(PlaceOrderCommand command) {
        // Step 1: 상품 조회 (도메인 객체로 변환)
        List<OrderItem> items = command.items().stream()
            .map(itemCmd -> {
                Product product = loadProductPort.loadProduct(itemCmd.productId())
                    .orElseThrow(() ->
                        new ProductNotFoundException(itemCmd.productId()));

                // 재고 확인은 도메인 규칙
                if (product.getStock() < itemCmd.quantity()) {
                    throw new InsufficientStockException(
                        product.getId(), itemCmd.quantity());
                }
                return new OrderItem(product, itemCmd.quantity());
            })
            .toList();

        // Step 2: 도메인 객체 생성 (비즈니스 규칙 검증 포함)
        Order order = Order.create(new UserId(command.userId()), items);

        // Step 3: 재고 예약
        reserveStockPort.reserve(items);

        // Step 4: 주문 저장
        Order saved = saveOrderPort.saveOrder(order);

        // Step 5: 이벤트 발행
        orderEventPublisher.publishOrderPlaced(saved);

        return OrderResult.from(saved);
    }
}
```

---

### Interface Adapters — 변환 계층

```java
// adapter/web/OrderController.java — HTTP Inbound Adapter
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final PlaceOrderUseCase placeOrderUseCase;  // 인터페이스에 의존
    private final GetOrderUseCase getOrderUseCase;

    @PostMapping
    public ResponseEntity<OrderResponse> placeOrder(
        @RequestBody @Valid PlaceOrderRequest request,
        @AuthenticationPrincipal Long userId
    ) {
        // HTTP 요청 → Command 변환
        PlaceOrderCommand command = new PlaceOrderCommand(
            userId,
            request.getItems().stream()
                .map(i -> new PlaceOrderCommand.OrderItemCommand(
                    i.getProductId(), i.getQuantity()))
                .toList()
        );

        OrderResult result = placeOrderUseCase.placeOrder(command);

        // 결과 → HTTP 응답 변환
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(OrderResponse.from(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable Long id) {
        return ResponseEntity.ok(
            OrderResponse.from(getOrderUseCase.getOrder(id))
        );
    }
}

// adapter/persistence/OrderPersistenceAdapter.java — DB Outbound Adapter
@Component
@RequiredArgsConstructor
public class OrderPersistenceAdapter implements SaveOrderPort, LoadOrderPort {

    private final OrderJpaRepository jpaRepository;
    private final OrderMapper mapper; // 변환 전담 클래스

    @Override
    public Order saveOrder(Order order) {
        OrderJpaEntity entity = mapper.toEntity(order);
        return mapper.toDomain(jpaRepository.save(entity));
    }

    @Override
    public Optional<Order> loadOrder(Long id) {
        return jpaRepository.findById(id)
            .map(mapper::toDomain);
    }
}

// adapter/persistence/OrderMapper.java — 도메인 ↔ JPA 엔티티 변환 전담
@Component
public class OrderMapper {

    public OrderJpaEntity toEntity(Order order) {
        OrderJpaEntity entity = new OrderJpaEntity();
        entity.setId(order.getId() != null ? order.getId().value() : null);
        entity.setUserId(order.getUserId().value());
        entity.setStatus(order.getStatus());
        entity.setTotalAmount(order.getTotalAmount().amount());
        entity.setCurrency(order.getTotalAmount().currency().name());
        entity.setItems(order.getItems().stream()
            .map(this::toItemEntity)
            .toList());
        return entity;
    }

    public Order toDomain(OrderJpaEntity entity) {
        List<OrderItem> items = entity.getItems().stream()
            .map(this::toItemDomain)
            .toList();
        return Order.reconstitute(
            new OrderId(entity.getId()),
            new UserId(entity.getUserId()),
            items,
            entity.getStatus()
        );
    }

    private OrderItemJpaEntity toItemEntity(OrderItem item) {
        OrderItemJpaEntity e = new OrderItemJpaEntity();
        e.setProductId(item.getProductId().value());
        e.setProductName(item.getProductName()); // 주문 당시 이름 스냅샷
        e.setPrice(item.getPrice().amount());
        e.setQuantity(item.getQuantity());
        return e;
    }
}
```

---

## 의존성 역전 원칙 (DIP) 실전

클린 아키텍처의 핵심은 **의존성 역전**이다.

```java
// 나쁜 예 ❌ — Application이 Infrastructure에 직접 의존 (의존성 방향 위반)
// application/service/OrderService.java
public class OrderService {
    // Application Layer에서 Infrastructure를 직접 사용! 안쪽이 바깥쪽을 앎
    private final OrderJpaRepository jpaRepository;     // Infrastructure
    private final JavaMailSender mailSender;            // Infrastructure
    private final KafkaTemplate<String, ?> kafka;       // Infrastructure
}

// 좋은 예 ✅ — 의존성 역전으로 해결
// application/port/out/SaveOrderPort.java (Application Layer에 인터페이스 정의)
public interface SaveOrderPort {
    Order saveOrder(Order order);
}
// → Application에서 인터페이스 선언

// adapter/persistence/OrderPersistenceAdapter.java (Frameworks Layer가 구현)
public class OrderPersistenceAdapter implements SaveOrderPort {
    // Infrastructure가 Application의 인터페이스를 구현
    // 의존성 방향: Infrastructure → Application (안쪽을 향함) ✅
}

// application/service/OrderService.java
public class OrderService {
    private final SaveOrderPort saveOrderPort; // 인터페이스만 앎
    // OrderPersistenceAdapter의 존재를 전혀 모름
}
```

---

## 테스트 전략

```java
// Use Case 단위 테스트 — 외부 의존성 없이 빠르게
@ExtendWith(MockitoExtension.class)
class PlaceOrderServiceTest {

    @Mock private LoadProductPort loadProductPort;
    @Mock private SaveOrderPort saveOrderPort;
    @Mock private ReserveStockPort reserveStockPort;
    @Mock private OrderEventPublisher orderEventPublisher;

    @InjectMocks
    private PlaceOrderService placeOrderService;

    @Test
    void 재고_부족시_예외() {
        // given: 재고 1개인 상품 준비
        Product product = new Product(1L, "테스트상품", new Money(10000), 1);
        given(loadProductPort.loadProduct(1L))
            .willReturn(Optional.of(product));

        // when + then: 2개 주문 시 예외
        PlaceOrderCommand command = new PlaceOrderCommand(
            1L,
            List.of(new PlaceOrderCommand.OrderItemCommand(1L, 2)) // 재고 1개인데 2개 요청
        );
        assertThatThrownBy(() -> placeOrderService.placeOrder(command))
            .isInstanceOf(InsufficientStockException.class);

        // 저장과 이벤트 발행 미호출 확인
        then(saveOrderPort).should(never()).saveOrder(any());
        then(orderEventPublisher).should(never()).publishOrderPlaced(any());
    }

    @Test
    void 주문_성공시_이벤트_발행() {
        // given
        Product product = new Product(1L, "테스트상품", new Money(10000), 10);
        given(loadProductPort.loadProduct(1L)).willReturn(Optional.of(product));
        given(saveOrderPort.saveOrder(any())).willAnswer(inv -> inv.getArgument(0));

        // when
        PlaceOrderCommand command = new PlaceOrderCommand(
            1L,
            List.of(new PlaceOrderCommand.OrderItemCommand(1L, 1))
        );
        placeOrderService.placeOrder(command);

        // then: 이벤트 발행 확인
        then(orderEventPublisher).should(times(1)).publishOrderPlaced(any());
    }
}

// 도메인 단위 테스트 — 정말 아무 의존성 없음
class OrderTest {

    @Test
    void 배송_후_취소_불가() {
        Order order = createShippedOrder();
        assertThatThrownBy(order::cancel)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("배송 후에는 취소할 수 없습니다");
    }

    @Test
    void 주문_금액_합산() {
        OrderItem item1 = new OrderItem(/* price: 10000, qty: 2 */);
        OrderItem item2 = new OrderItem(/* price: 5000, qty: 3 */);
        Order order = Order.create(new UserId(1L), List.of(item1, item2));
        // 10000*2 + 5000*3 = 35000
        assertThat(order.getTotalAmount())
            .isEqualTo(new Money(new BigDecimal("35000"), Currency.KRW));
    }
}
```

---

## 언제 클린 아키텍처를 써야 하나

```
적합한 경우:
— 복잡한 비즈니스 규칙이 있는 장기 프로젝트 (주문, 결제, 정산, 금융)
— 여러 팀이 개발하는 대규모 시스템
— 인프라(DB, 메시지큐 등) 교체 가능성이 있는 경우
— 도메인 로직 단위 테스트가 필수인 경우

과할 수 있는 경우:
— 단순 CRUD API (Create, Read, Update, Delete만 하는 경우)
— 1-2인 소규모 팀, 초기 스타트업
— 비즈니스 로직보다 데이터 변환이 주인 경우
— 마감이 촉박한 MVP

현실적 조언:
— 처음부터 완벽한 클린 아키텍처를 적용하려 하지 말 것
— 레이어드로 시작해서, 복잡도가 높아질 때 점진적으로 리팩토링
— 팀 전체가 동의하고 이해하는 수준에서 적용
— "좋은 아키텍처"보다 "팀이 지킬 수 있는 아키텍처"가 더 중요
```

---

## 핵심 원칙 요약

클린 아키텍처는 이 하나의 원칙으로 요약된다:

**"안쪽 원은 바깥쪽 원을 몰라야 한다."**

- Domain은 Application을 모른다
- Application은 Controller를 모른다
- Application은 JPA를 모른다 (Port 인터페이스로만 접근)
- Controller는 JPA 엔티티를 반환하지 않는다

이 원칙만 지키면 나머지 세부사항은 팀 상황에 맞게 조정할 수 있다.
