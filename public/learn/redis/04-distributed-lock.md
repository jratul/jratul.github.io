---
title: "분산 락"
order: 4
---

# 분산 락

여러 서버가 동시에 같은 자원에 접근할 때 순서를 보장하는 방법.

---

## 왜 분산 락이 필요한가

```
단일 서버: synchronized, ReentrantLock으로 해결 가능

분산 환경 (서버가 2대 이상):
서버 A: 재고 확인 → 10개 있음 → 주문 처리 → 재고 9개
서버 B: 재고 확인 → 10개 있음 (서버 A가 처리 전에 조회!) → 주문 처리 → 재고 9개

결과: 재고가 10개였는데 2개가 팔렸는데도 9개로 남음!
이게 "동시성 문제"다.
```

**비유**: 은행 ATM 두 대에서 동시에 같은 계좌에서 돈을 인출하면?

```
ATM1: 잔액 확인 → 10만원
ATM2: 잔액 확인 → 10만원 (ATM1이 인출 전!)
ATM1: 10만원 인출 → 잔액 0원
ATM2: 10만원 인출 → 잔액 -10만원?!

→ 분산 락으로 "내가 사용 중이니 잠깐 기다려"를 보장해야 함
```

---

## Redis SETNX로 간단한 분산 락

`SET key value NX EX 30` = "key가 없을 때만 저장, 30초 후 자동 삭제"
→ 이것이 분산 락의 핵심이다.

```java
@Service
@RequiredArgsConstructor
public class SimpleDistributedLock {

    private final StringRedisTemplate redisTemplate;

    /**
     * 락 획득 시도
     * @param lockKey  락의 키 (예: "lock:product:123")
     * @param lockValue 내가 건 락임을 증명하는 값 (UUID)
     * @param ttl      자동 해제 시간 (서버 죽어도 자동 해제)
     */
    public boolean tryLock(String lockKey, String lockValue, Duration ttl) {
        // NX: key가 없을 때만 설정 (이미 있으면 실패)
        return Boolean.TRUE.equals(
            redisTemplate.opsForValue()
                .setIfAbsent(lockKey, lockValue, ttl)
        );
    }

    /**
     * 락 해제
     * 주의: 내가 건 락만 해제해야 함!
     * Lua 스크립트로 "확인 + 삭제"를 원자적으로 처리
     */
    public void unlock(String lockKey, String lockValue) {
        String script = """
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            else
                return 0
            end
            """;
        redisTemplate.execute(
            new DefaultRedisScript<>(script, Long.class),
            List.of(lockKey),
            lockValue
        );
    }
}
```

```java
// 사용 예시
@Service
@RequiredArgsConstructor
public class OrderService {

    private final SimpleDistributedLock lock;
    private final ProductRepository productRepository;

    public void processOrder(Long productId, int quantity) {
        String lockKey = "lock:product:" + productId;
        String lockValue = UUID.randomUUID().toString();  // 내 락 고유 값

        // 1단계: 락 획득 시도
        if (!lock.tryLock(lockKey, lockValue, Duration.ofSeconds(30))) {
            // 다른 서버가 이미 처리 중
            throw new BusinessException("현재 다른 요청 처리 중. 잠시 후 다시 시도하세요.");
        }

        try {
            // 2단계: 임계 영역 — 한 번에 하나의 서버만 실행!
            Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("상품 없음"));

            if (product.getStock() < quantity) {
                throw new InsufficientStockException("재고 부족");
            }

            product.decreaseStock(quantity);
            productRepository.save(product);

        } finally {
            // 3단계: 락 해제 (반드시 finally에서!)
            lock.unlock(lockKey, lockValue);
        }
    }
}
```

**왜 UUID를 lockValue로 쓰나?**

```
서버 A가 락 획득 → 작업 지연 (네트워크 등) → TTL 만료로 락 자동 해제
서버 B가 락 획득 (이제 B 것)
서버 A가 작업 완료 → 락 해제 시도

→ 이때 A가 B의 락을 해제하면 안 됨!
→ lockValue(UUID)로 "내가 건 락인지" 확인 후 해제
```

---

## Redisson — 프로덕션 권장 분산 락

직접 구현하면 엣지 케이스가 많다. **Redisson**은 검증된 분산 락 라이브러리다.

```kotlin
// build.gradle.kts
implementation("org.redisson:redisson-spring-boot-starter:3.27.0")
```

```yaml
# application.yml
spring:
  redis:
    host: ${REDIS_HOST:localhost}
    port: 6379
```

```java
@Service
@RequiredArgsConstructor
public class RedissonLockService {

    private final RedissonClient redissonClient;

    // 기본 분산 락
    public void processWithLock(Long productId, int quantity) {
        RLock lock = redissonClient.getLock("lock:product:" + productId);

        try {
            // waitTime: 락 획득 대기 시간 (10초)
            // leaseTime: 락 자동 해제 시간 (30초)
            if (!lock.tryLock(10, 30, TimeUnit.SECONDS)) {
                throw new BusinessException("락 획득 실패 (10초 대기 후 타임아웃)");
            }

            // 임계 영역
            processOrder(productId, quantity);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("락 대기 중 인터럽트", e);
        } finally {
            // 내 스레드가 가진 락만 해제
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    // 공정 락 (대기 순서 보장 — FIFO)
    // 먼저 기다린 요청이 먼저 처리됨
    public void processWithFairLock(Long productId) {
        RLock fairLock = redissonClient.getFairLock("fairlock:product:" + productId);
        try {
            fairLock.lock();  // 공정하게 대기
            processOrder(productId, 1);
        } finally {
            if (fairLock.isHeldByCurrentThread()) fairLock.unlock();
        }
    }

    // 읽기/쓰기 락 (읽기는 동시에 가능, 쓰기는 배타적)
    public Product readProduct(Long productId) {
        RReadWriteLock rwLock = redissonClient.getReadWriteLock("rwlock:product:" + productId);
        RLock readLock = rwLock.readLock();
        try {
            readLock.lock();
            // 여러 서버가 동시에 읽기 가능 (성능 향상)
            return productRepository.findById(productId).orElseThrow();
        } finally {
            readLock.unlock();
        }
    }

    public void updateProduct(Long productId, UpdateRequest request) {
        RReadWriteLock rwLock = redissonClient.getReadWriteLock("rwlock:product:" + productId);
        RLock writeLock = rwLock.writeLock();
        try {
            writeLock.lock();
            // 쓰기 시에는 읽기도 차단 (배타적)
            productRepository.updateProduct(productId, request);
        } finally {
            writeLock.unlock();
        }
    }

    // 멀티 락 (여러 자원을 동시에 잠금)
    // 재고 이동: A 상품에서 B 상품으로 이동
    public void transferStock(Long fromId, Long toId, int quantity) {
        RLock lock1 = redissonClient.getLock("lock:product:" + fromId);
        RLock lock2 = redissonClient.getLock("lock:product:" + toId);
        RLock multiLock = redissonClient.getMultiLock(lock1, lock2);

        try {
            multiLock.lock();  // 두 상품 동시에 잠금
            productRepository.transferStock(fromId, toId, quantity);
        } finally {
            multiLock.unlock();
        }
    }
}
```

---

## AOP로 분산 락 어노테이션 만들기

매번 try-finally 쓰기 번거로우면 어노테이션으로 만들 수 있다.

```java
// 커스텀 어노테이션 정의
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface DistributedLock {
    String key();                          // SpEL 표현식으로 동적 키
    long waitTime() default 5;             // 대기 시간 (초)
    long leaseTime() default 10;           // 락 유지 시간 (초)
    TimeUnit timeUnit() default TimeUnit.SECONDS;
}

// AOP Aspect
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class DistributedLockAspect {

    private final RedissonClient redissonClient;
    private final AopForTransaction aopForTransaction;

    @Around("@annotation(distributedLock)")
    public Object around(ProceedingJoinPoint joinPoint, DistributedLock distributedLock)
        throws Throwable {

        // SpEL로 동적 키 생성
        String key = resolveKey(distributedLock.key(), joinPoint);
        RLock lock = redissonClient.getLock(key);

        log.debug("분산 락 획득 시도: {}", key);

        try {
            if (!lock.tryLock(distributedLock.waitTime(),
                              distributedLock.leaseTime(),
                              distributedLock.timeUnit())) {
                throw new LockAcquisitionException("락 획득 실패 (타임아웃): " + key);
            }
            log.debug("분산 락 획득 성공: {}", key);
            return aopForTransaction.proceed(joinPoint);  // 트랜잭션 분리
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("락 대기 중 인터럽트", e);
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
                log.debug("분산 락 해제: {}", key);
            }
        }
    }

    private String resolveKey(String keyExpression, ProceedingJoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String[] paramNames = signature.getParameterNames();
        Object[] args = joinPoint.getArgs();

        ExpressionParser parser = new SpelExpressionParser();
        EvaluationContext context = new StandardEvaluationContext();
        for (int i = 0; i < paramNames.length; i++) {
            context.setVariable(paramNames[i], args[i]);
        }
        return parser.parseExpression(keyExpression).getValue(context, String.class);
    }
}

// 트랜잭션 분리용 (락 안에서 트랜잭션이 커밋되어야 함)
@Component
public class AopForTransaction {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Object proceed(ProceedingJoinPoint joinPoint) throws Throwable {
        return joinPoint.proceed();
    }
}
```

```java
// 사용 — 어노테이션 하나로 분산 락 적용
@Service
public class OrderService {

    @DistributedLock(key = "'lock:product:' + #productId", leaseTime = 30)
    public OrderResponse placeOrder(Long productId, int quantity, Long userId) {
        // 락이 자동으로 적용됨
        Product product = productRepository.findById(productId).orElseThrow();
        if (product.getStock() < quantity) throw new InsufficientStockException();

        product.decreaseStock(quantity);
        productRepository.save(product);

        Order order = Order.create(userId, productId, quantity, product.getPrice());
        return OrderResponse.from(orderRepository.save(order));
    }
}
```

---

## 재고 처리 패턴 비교

같은 문제를 여러 방식으로 해결할 수 있다. 상황에 따라 선택하자.

```java
// 방법 1: 분산 락 (Redis)
// 장점: 모든 분산 시나리오 처리 가능
// 단점: Redis 의존성, 락 획득 실패 처리 필요
@DistributedLock(key = "'stock:' + #productId")
public boolean purchaseWithRedisLock(Long productId, int qty) {
    Product p = productRepository.findById(productId).orElseThrow();
    if (p.getStock() < qty) return false;
    p.setStock(p.getStock() - qty);
    productRepository.save(p);
    return true;
}

// 방법 2: DB 낙관적 락 (충돌이 적을 때 효율적)
// 장점: Redis 없이 DB만으로 해결, 충돌 적으면 성능 좋음
// 단점: 충돌 많으면 재시도 폭발
@Transactional
public boolean purchaseWithOptimisticLock(Long productId, int qty) {
    try {
        Product p = productRepository.findByIdWithOptimisticLock(productId);
        if (p.getStock() < qty) return false;
        p.setStock(p.getStock() - qty);
        productRepository.save(p);  // 버전 불일치면 예외 발생
        return true;
    } catch (OptimisticLockingFailureException e) {
        return false;  // 재시도 또는 실패 처리
    }
}

// 방법 3: DB 비관적 락 (SELECT FOR UPDATE)
// 장점: 확실한 잠금, 재시도 없음
// 단점: 락 대기로 인한 지연, DB 부하
@Transactional
public boolean purchaseWithPessimisticLock(Long productId, int qty) {
    Product p = productRepository.findByIdWithPessimisticLock(productId);  // FOR UPDATE
    if (p.getStock() < qty) return false;
    p.setStock(p.getStock() - qty);
    productRepository.save(p);
    return true;
}

// 방법 4: Redis Lua 스크립트 (가장 빠름)
// 장점: 원자적 처리, Redis 하나로 해결
// 단점: DB와 Redis 간 데이터 동기화 필요
public boolean purchaseWithLua(Long productId, int qty) {
    String script = """
        local stock = tonumber(redis.call('get', KEYS[1]))
        if stock == nil then return -1 end       -- 키 없음
        if stock < tonumber(ARGV[1]) then return 0 end  -- 재고 부족
        redis.call('decrby', KEYS[1], ARGV[1])
        return 1  -- 성공
        """;
    Long result = redisTemplate.execute(
        new DefaultRedisScript<>(script, Long.class),
        List.of("stock:" + productId),
        String.valueOf(qty)
    );
    // 1: 성공, 0: 재고 부족, -1: 재고 키 없음
    return result != null && result == 1;
}
```

**선택 기준**:

```
단일 서버 → synchronized / ReentrantLock
분산 환경, 충돌 적음 → DB 낙관적 락 (간단)
분산 환경, 충돌 많음 → Redis 분산 락 (Redisson)
극한 성능 필요 → Redis Lua 스크립트 (+ 주기적 DB 동기화)
```

---

## 자주 하는 실수

```java
// 실수 1: finally 블록에서 락 해제 안 함
try {
    lock.tryLock(...);
    doWork();
    lock.unlock();  // 예외 발생 시 여기 도달 못함!
} catch (Exception e) { ... }

// 올바른 방법:
try {
    if (!lock.tryLock(...)) throw new Exception();
    doWork();
} finally {
    if (lock.isHeldByCurrentThread()) lock.unlock();  // 항상 실행!
}

// 실수 2: TTL 없이 락 설정
// 서버가 죽으면 락이 영원히 유지 → Deadlock!
lock.lock();  // TTL 없음 → 서버 죽으면 영원히 잠김
// 해결: 항상 TTL 설정
lock.tryLock(5, 30, TimeUnit.SECONDS);  // 대기 5초, 자동 해제 30초

// 실수 3: 너무 긴 leaseTime
lock.tryLock(5, 600, TimeUnit.SECONDS);  // 600초(10분) 락???
// 해결: 비즈니스 로직 최대 실행 시간 + 여유 30초 정도면 충분

// 실수 4: 트랜잭션 안에서 락 해제
@Transactional
public void processOrder(...) {
    lock.lock();
    doWork();
    lock.unlock();  // 트랜잭션 커밋 전에 락 해제!
    // → 다른 서버가 락 획득 후 아직 커밋 안 된 데이터 읽음
}
// 해결: 락을 트랜잭션 바깥에서 제어 (AopForTransaction 패턴)
```
