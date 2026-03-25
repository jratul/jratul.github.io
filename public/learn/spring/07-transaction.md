---
title: "트랜잭션"
order: 7
---

## 트랜잭션이란?

은행 계좌 이체를 생각해 보세요. A 계좌에서 10만원을 빼고 B 계좌에 10만원을 넣는 작업입니다. 만약 A 계좌에서 돈을 빼는 데는 성공했는데, B 계좌에 넣다가 서버가 다운되면 어떻게 될까요? 10만원이 공중에 사라집니다!

트랜잭션은 이런 문제를 막아줍니다. 여러 DB 작업을 "하나의 묶음"으로 처리해서, **모두 성공하거나 모두 실패**하게 만듭니다.

```
트랜잭션의 4가지 특성 (ACID):
- Atomicity (원자성): 전부 성공 or 전부 실패
- Consistency (일관성): 트랜잭션 전후로 데이터 규칙 유지
- Isolation (격리성): 동시에 실행되는 트랜잭션끼리 서로 영향 안 줌
- Durability (지속성): 커밋된 데이터는 영구 저장
```

---

## @Transactional 기본 사용

Spring은 AOP(관점 지향 프로그래밍)를 이용해서 트랜잭션을 관리합니다. `@Transactional`을 붙이면 메서드 실행 전에 트랜잭션을 열고, 정상 종료 시 커밋, 예외 발생 시 롤백합니다.

```java
@Service
@Transactional  // 클래스 레벨: 이 클래스의 모든 public 메서드에 트랜잭션 적용
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    // 트랜잭션 안에서 실행됨 (클래스 레벨 @Transactional 상속)
    public OrderDto createOrder(Long userId, Long productId, int quantity) {
        // 1. 상품 조회 및 재고 감소 (트랜잭션 시작)
        Product product = productRepository.findById(productId).orElseThrow();
        product.decreaseStock(quantity);  // 재고 감소

        // 2. 주문 생성
        Order order = Order.create(userId, productId, quantity);
        orderRepository.save(order);

        // 여기서 예외가 나면 1, 2 모두 롤백!
        if (product.getStock() < 0) {
            throw new InsufficientStockException("재고 부족");  // → 전체 롤백
        }

        return OrderDto.from(order);
        // 정상 종료 → 커밋 (두 변경 사항이 함께 DB에 반영)
    }

    // 조회 전용 메서드는 readOnly = true (중요!)
    @Transactional(readOnly = true)  // 클래스 레벨보다 메서드 레벨이 우선
    public OrderDto findById(Long id) {
        return orderRepository.findById(id)
            .map(OrderDto::from)
            .orElseThrow(() -> new OrderNotFoundException(id));
    }
}
```

`readOnly = true`가 왜 좋을까요?

```
1. JPA 변경 감지(Dirty Checking) 비활성화 → 성능 향상
2. 데이터베이스 드라이버나 레플리카 라우팅에서 읽기 전용 최적화
3. 실수로 데이터를 수정하는 것을 방지
```

---

## 롤백 규칙

```java
// 기본 롤백 규칙: RuntimeException과 Error만 롤백
// CheckedException(IOException 등)은 롤백 안 됨!

@Transactional
public void transfer(Long fromId, Long toId, long amount) {
    Account from = accountRepository.findById(fromId).orElseThrow();
    Account to   = accountRepository.findById(toId).orElseThrow();

    from.withdraw(amount);  // 출금
    to.deposit(amount);     // 입금

    // RuntimeException → 롤백
    // 위의 withdraw, deposit에서 예외가 나면 두 변경 모두 취소됨
}

// CheckedException도 롤백하려면 명시적으로 설정
@Transactional(rollbackFor = Exception.class)
public void importData(String filePath) throws IOException {
    parseAndSave(filePath);  // IOException 발생 시에도 롤백
}

// 특정 예외는 예외적으로 롤백 제외 (기록은 남기고 싶을 때)
@Transactional(noRollbackFor = AuditException.class)
public void processWithAudit(OrderRequest request) {
    processOrder(request);
    try {
        auditService.record(request);
    } catch (AuditException e) {
        log.warn("감사 로그 실패, 주문은 진행", e);
        // AuditException이 나도 주문 처리는 커밋됨
    }
}
```

---

## 전파(Propagation) 속성

`@Transactional` 메서드 안에서 다른 `@Transactional` 메서드를 호출할 때 어떻게 할지 결정합니다.

```java
// REQUIRED (기본값): 기존 트랜잭션이 있으면 참여, 없으면 새로 생성
@Transactional(propagation = Propagation.REQUIRED)
public void doSomething() { ... }

// REQUIRES_NEW: 항상 새 트랜잭션 생성 (기존 것은 일시 중단)
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void alwaysNewTransaction() { ... }

// SUPPORTS: 있으면 참여, 없으면 트랜잭션 없이 실행
@Transactional(propagation = Propagation.SUPPORTS)
public void flexible() { ... }

// NOT_SUPPORTED: 트랜잭션 없이 실행 (기존 것 일시 중단)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
public void noTransaction() { ... }

// NEVER: 트랜잭션이 있으면 예외 발생
@Transactional(propagation = Propagation.NEVER)
public void mustNotHaveTransaction() { ... }

// NESTED: 기존 트랜잭션 내에 중첩 트랜잭션 (savepoint)
@Transactional(propagation = Propagation.NESTED)
public void nested() { ... }
```

### REQUIRES_NEW 실전 예제 — 감사 로그

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final AuditService auditService;  // 감사 로그 서비스

    @Transactional
    public Order createOrder(OrderRequest request) {
        Order order = orderRepository.save(Order.from(request));

        // 주문이 실패해서 롤백되더라도 감사 로그는 남겨야 함!
        auditService.log("ORDER_CREATE_ATTEMPTED", request.getUserId());

        // 여기서 예외 발생 → 주문 롤백
        validateOrder(order);

        return order;
    }
}

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    // REQUIRES_NEW: 외부 트랜잭션과 완전히 별도의 트랜잭션
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action, Long userId) {
        auditLogRepository.save(new AuditLog(action, userId, LocalDateTime.now()));
        // OrderService가 롤백되어도 이 감사 로그는 별도 트랜잭션으로 커밋됨
    }
}
```

---

## 격리 수준(Isolation)

여러 트랜잭션이 동시에 실행될 때 서로 어디까지 영향을 주고받을지 결정합니다.

```java
// READ_COMMITTED (대부분의 DB 기본값): 커밋된 데이터만 읽음
@Transactional(isolation = Isolation.READ_COMMITTED)
public void normalRead() { ... }

// REPEATABLE_READ: 같은 트랜잭션에서 같은 데이터를 여러 번 읽어도 항상 동일
@Transactional(isolation = Isolation.REPEATABLE_READ)
public void consistentRead() { ... }

// SERIALIZABLE: 완전한 격리 (동시 처리 성능 매우 낮음, 거의 안 씀)
@Transactional(isolation = Isolation.SERIALIZABLE)
public void strictRead() { ... }
```

| 격리 수준 | Dirty Read | Non-Repeatable Read | Phantom Read | 성능 |
|-----------|-----------|---------------------|--------------|------|
| READ_UNCOMMITTED | 가능 | 가능 | 가능 | 가장 빠름 |
| READ_COMMITTED | 방지 | 가능 | 가능 | 빠름 |
| REPEATABLE_READ | 방지 | 방지 | 가능 | 보통 |
| SERIALIZABLE | 방지 | 방지 | 방지 | 느림 |

용어 설명:
- **Dirty Read**: 아직 커밋 안 된 데이터를 읽음 (나중에 롤백될 수 있는 데이터)
- **Non-Repeatable Read**: 같은 쿼리를 두 번 실행했을 때 결과가 다름
- **Phantom Read**: 같은 조건으로 조회했을 때 없던 행이 생기거나 사라짐

---

## Self-Invocation 문제 — 가장 흔한 실수!

`@Transactional`은 Spring AOP 프록시를 통해 작동합니다. 같은 클래스 내에서 메서드를 직접 호출하면 프록시를 거치지 않아 트랜잭션이 적용되지 않습니다.

```java
@Service
public class UserService {

    @Transactional
    public void createUserAndSendEmail(String email) {
        createUser(email);     // ← 같은 클래스의 메서드 직접 호출!
        sendWelcomeEmail(email);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createUser(String email) {
        // REQUIRES_NEW라고 했지만... 실제로는 createUserAndSendEmail의 트랜잭션과 같은 트랜잭션
        // 왜냐하면 프록시를 거치지 않고 this.createUser()를 직접 호출했기 때문
        userRepository.save(new User(email));
    }
}
```

왜 이런 문제가 생기는지 그림으로:

```
클라이언트 → [프록시 (트랜잭션 시작)] → UserService.createUserAndSendEmail()
                                              ↓
                                   this.createUser() 직접 호출
                                   (프록시를 통하지 않음!)
                                   → @Transactional 무시됨
```

해결 방법:

```java
// 방법 1: 별도 클래스로 분리 (가장 좋음)
@Service
public class UserCreationService {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createUser(String email) {
        userRepository.save(new User(email));
    }
}

@Service
public class UserService {
    private final UserCreationService userCreationService;

    @Transactional
    public void createUserAndSendEmail(String email) {
        userCreationService.createUser(email);  // 다른 Bean → 프록시를 거침
        sendWelcomeEmail(email);
    }
}
```

---

## 트랜잭션 이벤트 — 커밋 후에 실행하기

주문 완료 후 이메일을 보내는 경우, 주문이 DB에 확실히 저장된 후에 이메일을 보내야 합니다. 트랜잭션 이벤트를 사용합니다:

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public Order createOrder(OrderRequest request) {
        Order order = orderRepository.save(Order.from(request));

        // 이벤트 발행 (아직 커밋 전)
        eventPublisher.publishEvent(new OrderCreatedEvent(order));

        return order;
        // 여기서 트랜잭션 커밋
    }
}

@Component
public class OrderEventHandler {

    // AFTER_COMMIT: 트랜잭션이 성공적으로 커밋된 후에만 실행
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderCreated(OrderCreatedEvent event) {
        // DB에 주문이 확실히 저장된 후 이메일 발송
        // → 주문 실패 시 이메일 안 보냄 (올바른 동작)
        emailService.sendOrderConfirmation(event.getOrder());
    }

    // AFTER_ROLLBACK: 롤백 후 실행 (실패 알림 등)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_ROLLBACK)
    public void onOrderFailed(OrderCreatedEvent event) {
        slackService.alertFailure("주문 처리 실패: " + event.getOrder().getId());
    }

    // BEFORE_COMMIT: 커밋 직전 실행
    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void beforeCommit(OrderCreatedEvent event) {
        // 커밋 전에 추가 검증 등
    }
}
```

왜 `@TransactionalEventListener`가 좋은가?

```
일반 @EventListener를 쓰면:
  1. 주문 저장 시작
  2. 이메일 발송 (이벤트 즉시 처리)
  3. 주문 저장 실패 → 롤백
  → 결과: 주문은 없는데 이메일은 감!

@TransactionalEventListener(AFTER_COMMIT)을 쓰면:
  1. 주문 저장 시작
  2. 주문 저장 실패 → 롤백
  → 이벤트 핸들러는 실행 안 됨
  → 결과: 주문도 없고 이메일도 안 감 (올바른 동작)
```

---

## 자주 하는 실수들

```java
// ❌ 실수 1: private 메서드에 @Transactional
@Service
public class UserService {
    @Transactional  // private 메서드는 프록시로 감쌀 수 없음 → 무시됨!
    private void saveUser(User user) {
        userRepository.save(user);
    }
}

// ✅ 해결: public 메서드에만 @Transactional
@Transactional
public void saveUser(User user) {
    userRepository.save(user);
}

// ❌ 실수 2: 트랜잭션 범위 너무 크게 잡기
@Transactional
public void processBigBatch() {
    for (int i = 0; i < 100000; i++) {
        // DB 커밋이 배치 끝날 때까지 안 됨
        // 트랜잭션이 너무 오래 열려있어서 DB 락 문제 발생
        processItem(i);
    }
}

// ✅ 해결: 배치를 청크 단위로 나눠서 처리
public void processBigBatch() {
    for (int i = 0; i < 100000; i++) {
        processSingleItem(i);  // 각각이 독립된 짧은 트랜잭션
    }
}

@Transactional  // 항목 하나씩 처리
public void processSingleItem(int index) {
    // 짧은 트랜잭션
}

// ❌ 실수 3: 조회 메서드에 @Transactional(readOnly = true) 빠뜨리기
@Transactional  // readOnly가 없으면 변경 감지, 플러시 등 불필요한 작업 발생
public List<UserDto> findAll() {
    return userRepository.findAll().stream().map(UserDto::from).toList();
}

// ✅ 해결
@Transactional(readOnly = true)
public List<UserDto> findAll() {
    return userRepository.findAll().stream().map(UserDto::from).toList();
}
```
