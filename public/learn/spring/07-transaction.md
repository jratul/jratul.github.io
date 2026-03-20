---
title: "트랜잭션"
order: 7
---

## @Transactional 기본

Spring은 AOP 기반으로 트랜잭션을 관리합니다. 메서드 시작 시 트랜잭션을 열고, 정상 종료 시 커밋, 예외 발생 시 롤백합니다.

```java
@Service
@Transactional  // 클래스 레벨: 모든 public 메서드에 적용
public class OrderService {

    private final OrderRepository orderRepository;
    private final InventoryService inventoryService;

    public OrderService(OrderRepository orderRepository,
                        InventoryService inventoryService) {
        this.orderRepository = orderRepository;
        this.inventoryService = inventoryService;
    }

    // 클래스 레벨 @Transactional 상속
    public Order createOrder(Long userId, Long productId, int quantity) {
        inventoryService.decrease(productId, quantity);  // 재고 감소
        return orderRepository.save(new Order(userId, productId, quantity));
    }

    @Transactional(readOnly = true)  // 조회 전용: 성능 최적화
    public Order findById(Long id) {
        return orderRepository.findById(id)
            .orElseThrow(() -> new OrderNotFoundException(id));
    }
}
```

`readOnly = true`는 JPA dirty checking을 비활성화해 성능을 높입니다. 조회 메서드에는 항상 붙이는 것이 좋습니다.

---

## 롤백 규칙

기본적으로 `RuntimeException`과 `Error`만 롤백됩니다. `CheckedException`은 롤백하지 않습니다.

```java
@Transactional
public void transfer(Long fromId, Long toId, long amount) {
    Account from = accountRepository.findById(fromId).orElseThrow();
    Account to   = accountRepository.findById(toId).orElseThrow();

    from.withdraw(amount);
    to.deposit(amount);

    // RuntimeException → 롤백
    if (from.getBalance() < 0) {
        throw new InsufficientBalanceException("잔액 부족");
    }
}

// Checked Exception도 롤백하려면 명시
@Transactional(rollbackFor = Exception.class)
public void importData(String filePath) throws IOException {
    // IOException 발생 시에도 롤백
}

// 특정 예외는 롤백 제외
@Transactional(noRollbackFor = BusinessException.class)
public void processOrder(Order order) {
    // BusinessException 발생해도 커밋
}
```

---

## 전파(Propagation) 속성

트랜잭션이 이미 있을 때 새 트랜잭션을 어떻게 처리할지 결정합니다.

```java
// REQUIRED (기본값): 기존 트랜잭션 참여, 없으면 새로 생성
@Transactional(propagation = Propagation.REQUIRED)
public void joinExisting() { ... }

// REQUIRES_NEW: 항상 새 트랜잭션 생성 (기존 일시 중단)
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void alwaysNew() { ... }

// NESTED: 기존 트랜잭션 내에 savepoint 생성 (내부만 롤백 가능)
@Transactional(propagation = Propagation.NESTED)
public void nested() { ... }

// SUPPORTS: 트랜잭션 있으면 참여, 없으면 비트랜잭션으로 실행
@Transactional(propagation = Propagation.SUPPORTS)
public void readOnly() { ... }

// NOT_SUPPORTED: 트랜잭션 없이 실행 (기존 트랜잭션 일시 중단)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
public void nonTransactional() { ... }

// NEVER: 트랜잭션이 있으면 예외 발생
@Transactional(propagation = Propagation.NEVER)
public void mustNotHaveTransaction() { ... }
```

### REQUIRES_NEW 활용 예

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final AuditService auditService;

    @Transactional
    public Order createOrder(OrderRequest request) {
        Order order = orderRepository.save(Order.from(request));

        // 주문 실패 시에도 감사 로그는 남겨야 함
        auditService.log("ORDER_CREATED", order.getId());  // REQUIRES_NEW

        return order;
    }
}

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action, Long targetId) {
        // 별도 트랜잭션으로 저장 → OrderService 롤백과 무관
        auditLogRepository.save(new AuditLog(action, targetId));
    }
}
```

---

## 격리 수준(Isolation)

동시 실행되는 트랜잭션 간의 데이터 가시성을 설정합니다.

```java
// READ_UNCOMMITTED: 커밋 안 된 변경도 읽음 (dirty read 발생 가능)
@Transactional(isolation = Isolation.READ_UNCOMMITTED)
public void fastRead() { ... }

// READ_COMMITTED (대부분의 DB 기본값): 커밋된 데이터만 읽음
@Transactional(isolation = Isolation.READ_COMMITTED)
public void normalRead() { ... }

// REPEATABLE_READ: 같은 트랜잭션에서 같은 데이터를 여러 번 읽어도 동일
@Transactional(isolation = Isolation.REPEATABLE_READ)
public void consistentRead() { ... }

// SERIALIZABLE: 완전한 격리 (동시 처리 성능 낮음)
@Transactional(isolation = Isolation.SERIALIZABLE)
public void strictRead() { ... }
```

| 격리 수준 | Dirty Read | Non-Repeatable Read | Phantom Read |
|-----------|-----------|---------------------|--------------|
| READ_UNCOMMITTED | 가능 | 가능 | 가능 |
| READ_COMMITTED | 방지 | 가능 | 가능 |
| REPEATABLE_READ | 방지 | 방지 | 가능 |
| SERIALIZABLE | 방지 | 방지 | 방지 |

---

## Self-Invocation 문제

`@Transactional`은 Spring AOP 프록시를 통해 동작합니다. 같은 클래스 내에서 메서드를 직접 호출하면 프록시를 거치지 않아 트랜잭션이 적용되지 않습니다.

```java
@Service
public class UserService {

    @Transactional
    public void createUserWithAudit(String username) {
        createUser(username);   // 직접 호출 — @Transactional 무시됨!
        auditLog(username);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createUser(String username) {
        // REQUIRES_NEW지만 실제로는 외부 트랜잭션과 같은 트랜잭션
        userRepository.save(new User(username));
    }
}
```

해결 방법:

```java
// 1. 별도 클래스로 분리 (권장)
@Service
public class UserCreationService {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createUser(String username) { ... }
}

// 2. ApplicationContext에서 프록시 꺼내기 (비권장)
@Service
public class UserService implements ApplicationContextAware {
    private ApplicationContext ctx;

    public void createUserWithAudit(String username) {
        ctx.getBean(UserService.class).createUser(username);  // 프록시 통해 호출
    }
}
```

---

## 트랜잭션 이벤트

트랜잭션 커밋/롤백 이후에 이벤트를 처리할 수 있습니다.

```java
@Service
public class OrderService {

    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public Order createOrder(OrderRequest request) {
        Order order = orderRepository.save(Order.from(request));
        eventPublisher.publishEvent(new OrderCreatedEvent(order));
        return order;
    }
}

@Component
public class OrderEventHandler {

    // 트랜잭션 커밋 이후 실행 (DB에 실제로 저장된 뒤)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderCreated(OrderCreatedEvent event) {
        emailService.sendConfirmation(event.getOrder());
    }

    // 롤백 시 실행
    @TransactionalEventListener(phase = TransactionPhase.AFTER_ROLLBACK)
    public void onOrderFailed(OrderCreatedEvent event) {
        slackService.alertFailure(event.getOrder());
    }
}
```

`AFTER_COMMIT`을 쓰면 DB에 데이터가 확실히 저장된 후에 이메일을 보내므로, 주문은 실패했는데 이메일만 발송되는 상황을 방지합니다.
