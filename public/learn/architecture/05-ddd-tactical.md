---
title: "DDD 전술 패턴"
order: 5
---

# DDD 전술 패턴

Repository, Domain Service, Domain Event 실전 적용.

---

## Repository 패턴

```java
// 도메인 계층: 인터페이스 정의 (컬렉션처럼)
public interface OrderRepository {
    Order save(Order order);
    Optional<Order> findById(OrderId id);
    List<Order> findByUserId(UserId userId);
    void delete(OrderId id);
}

// 인프라 계층: JPA 구현
@Repository
@RequiredArgsConstructor
public class OrderRepositoryImpl implements OrderRepository {

    private final OrderJpaRepository jpaRepository;
    private final OrderMapper mapper;

    @Override
    public Order save(Order order) {
        OrderJpaEntity entity = mapper.toEntity(order);
        return mapper.toDomain(jpaRepository.save(entity));
    }

    @Override
    public Optional<Order> findById(OrderId id) {
        return jpaRepository.findById(id.value()).map(mapper::toDomain);
    }

    @Override
    public List<Order> findByUserId(UserId userId) {
        return jpaRepository.findByUserId(userId.value()).stream()
            .map(mapper::toDomain)
            .toList();
    }
}

// Mapper — 도메인 ↔ JPA 엔티티 변환
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
            entity.getStatus(),
            new Money(entity.getTotalAmount(), Currency.valueOf(entity.getCurrency()))
        );
    }
}
```

---

## Domain Service

```java
// 어느 Aggregate에도 자연스럽게 속하지 않는 로직
// → Domain Service로 추출

// 예: 두 계좌 간 이체
// Account.transfer()? 한 계좌가 다른 계좌를 변경하는 것은 어색
@DomainService  // 커스텀 어노테이션 또는 @Component
public class TransferService {

    public void transfer(Account from, Account to, Money amount) {
        if (from.getBalance().isLessThan(amount)) {
            throw new InsufficientBalanceException();
        }
        from.withdraw(amount);
        to.deposit(amount);
    }
}

// 사용 (Application Service에서)
@Service
@Transactional
@RequiredArgsConstructor
public class TransferUseCase {

    private final AccountRepository accountRepository;
    private final TransferService transferService;   // Domain Service 주입

    public void transfer(Long fromId, Long toId, Money amount) {
        Account from = accountRepository.findById(fromId).orElseThrow();
        Account to = accountRepository.findById(toId).orElseThrow();

        transferService.transfer(from, to, amount);  // 도메인 로직

        accountRepository.save(from);
        accountRepository.save(to);
    }
}

// 예: 할인 정책 계산 (복잡한 규칙, 여러 객체 관여)
public interface DiscountPolicy {
    Money calculateDiscount(Order order, Member member);
}

@Component
public class RateDependentDiscountPolicy implements DiscountPolicy {

    @Override
    public Money calculateDiscount(Order order, Member member) {
        if (member.getGrade() == MemberGrade.VIP) {
            return order.getTotalAmount().multiply(10).divide(100);  // 10%
        }
        if (member.getGrade() == MemberGrade.GOLD) {
            return order.getTotalAmount().multiply(5).divide(100);   // 5%
        }
        return Money.ZERO;
    }
}
```

---

## Domain Event

```java
// 도메인 이벤트 기반 클래스
public abstract class DomainEvent {
    private final UUID eventId;
    private final Instant occurredAt;

    protected DomainEvent() {
        this.eventId = UUID.randomUUID();
        this.occurredAt = Instant.now();
    }
}

// 구체적인 도메인 이벤트
public class OrderPlacedEvent extends DomainEvent {
    private final OrderId orderId;
    private final UserId userId;
    private final Money totalAmount;

    public OrderPlacedEvent(Order order) {
        super();
        this.orderId = order.getId();
        this.userId = order.getUserId();
        this.totalAmount = order.getTotalAmount();
    }
}

// Aggregate에서 이벤트 수집
@Getter
public class Order {
    // ...
    private final List<DomainEvent> domainEvents = new ArrayList<>();

    public void confirm() {
        if (this.status != OrderStatus.PENDING) {
            throw new OrderStatusException("대기 상태에서만 확정 가능");
        }
        this.status = OrderStatus.CONFIRMED;
        domainEvents.add(new OrderConfirmedEvent(this));  // 이벤트 등록
    }

    public List<DomainEvent> pullDomainEvents() {
        List<DomainEvent> events = new ArrayList<>(domainEvents);
        domainEvents.clear();  // 꺼내면서 비움
        return events;
    }
}

// Application Service에서 이벤트 발행
@Service
@Transactional
@RequiredArgsConstructor
public class ConfirmOrderService {

    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    public void confirmOrder(OrderId orderId) {
        Order order = orderRepository.findById(orderId).orElseThrow();

        order.confirm();  // 도메인 로직 + 이벤트 수집

        orderRepository.save(order);

        // 트랜잭션 커밋 후 이벤트 발행
        order.pullDomainEvents().forEach(eventPublisher::publishEvent);
    }
}

// 이벤트 핸들러 (다른 컨텍스트 또는 같은 컨텍스트)
@Component
@RequiredArgsConstructor
public class OrderEventHandler {

    private final NotificationService notificationService;
    private final InventoryService inventoryService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleOrderConfirmed(OrderConfirmedEvent event) {
        notificationService.sendOrderConfirmation(event.getUserId(), event.getOrderId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleOrderConfirmedForInventory(OrderConfirmedEvent event) {
        inventoryService.reserveStock(event.getOrderId());
    }
}
```

---

## Spring Data와 도메인 이벤트

```java
// Spring Data의 AbstractAggregateRoot 활용
@Getter
public class Order extends AbstractAggregateRoot<Order> {

    private OrderStatus status;

    public void confirm() {
        this.status = OrderStatus.CONFIRMED;
        registerEvent(new OrderConfirmedEvent(this));  // AbstractAggregateRoot 제공
    }
}

// Repository save() 시 자동 발행
@Repository
public interface OrderJpaRepository extends JpaRepository<OrderJpaEntity, Long> {
    // save() 호출 시 등록된 이벤트 자동 발행
}

// 단, 이 방법은 JPA 엔티티가 도메인 역할을 겸하는 경우에만 적합
// 헥사고날/클린 아키텍처에서는 직접 발행 방식 권장
```

---

## Bounded Context 간 통신

```
같은 프로세스 내 (모노리스):
— Spring Application Event
— 직접 메서드 호출 (컨텍스트 매핑)

다른 프로세스 (마이크로서비스):
— Kafka, RabbitMQ 등 메시지 브로커

컨텍스트 매핑 패턴:
Shared Kernel:  두 컨텍스트가 공통 모델 공유
Customer-Supplier: 공급자(API) → 소비자(사용)
Conformist: 소비자가 공급자 모델을 그대로 따름
Anti-Corruption Layer (ACL):
  — 외부 모델을 내부 모델로 변환
  — 외부 변경에서 내부 보호

// ACL 예시: 외부 결제 서비스 → 내부 도메인
@Component
public class PaymentServiceAcl {

    private final ExternalPaymentClient externalClient;

    // 외부 응답을 도메인 모델로 변환
    public PaymentResult processPayment(Order order) {
        ExternalPaymentRequest request = toExternalRequest(order);
        ExternalPaymentResponse response = externalClient.pay(request);
        return toInternalResult(response);  // 외부 모델 차단
    }

    private PaymentResult toInternalResult(ExternalPaymentResponse response) {
        return new PaymentResult(
            new PaymentId(response.getTxId()),
            response.isSuccess() ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
            new Money(response.getAmount(), Currency.KRW)
        );
    }
}
```
