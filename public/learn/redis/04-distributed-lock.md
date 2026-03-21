---
title: "분산 락"
order: 4
---

# 분산 락

여러 서버가 동시에 같은 자원에 접근할 때 순서를 보장하는 방법.

---

## 왜 필요한가

```
단일 서버: synchronized, ReentrantLock으로 해결

분산 환경:
서버 A: 재고 확인(10개) → 주문 처리 → 재고 차감(9개)
서버 B: 재고 확인(10개) → 주문 처리 → 재고 차감(9개)
→ 동시에 실행되면 10개 재고에서 2개 판매됐는데 재고가 9개로 남음

해결: 분산 락으로 한 번에 한 서버만 실행
```

---

## Redis SETNX 방식 (간단)

```java
@Service
@RequiredArgsConstructor
public class SimpleDistributedLock {

    private final StringRedisTemplate redisTemplate;

    public boolean tryLock(String lockKey, String lockValue, Duration ttl) {
        // SET key value NX PX ttl
        return Boolean.TRUE.equals(
            redisTemplate.opsForValue()
                .setIfAbsent(lockKey, lockValue, ttl)
        );
    }

    public void unlock(String lockKey, String lockValue) {
        // 자신이 건 락만 해제 (Lua 스크립트로 원자적 처리)
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

    // 사용 예시
    public void processOrder(Long productId, int quantity) {
        String lockKey = "lock:product:" + productId;
        String lockValue = UUID.randomUUID().toString();

        if (!tryLock(lockKey, lockValue, Duration.ofSeconds(30))) {
            throw new LockAcquisitionException("다른 요청 처리 중입니다.");
        }

        try {
            // 재고 확인 및 차감 (임계 영역)
            Product product = productRepository.findByIdWithLock(productId);
            product.decreaseStock(quantity);
            productRepository.save(product);
        } finally {
            unlock(lockKey, lockValue);
        }
    }
}
```

---

## Redisson 분산 락 (권장)

Redisson은 Red Lock 알고리즘 구현, 다양한 락 타입 제공.

```kotlin
// build.gradle.kts
implementation("org.redisson:redisson-spring-boot-starter:3.27.0")
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
            // 최대 10초 대기, 30초 유지
            if (!lock.tryLock(10, 30, TimeUnit.SECONDS)) {
                throw new LockAcquisitionException("락 획득 실패");
            }

            // 임계 영역
            processOrder(productId, quantity);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    // 공정 락 (대기 순서 보장)
    public void processWithFairLock(Long productId) {
        RLock fairLock = redissonClient.getFairLock("fairlock:product:" + productId);
        // 이후 동일하게 사용
    }

    // 읽기/쓰기 락
    public void readWithLock(Long productId) {
        RReadWriteLock rwLock = redissonClient.getReadWriteLock("rwlock:product:" + productId);
        RLock readLock = rwLock.readLock();
        try {
            readLock.lock();
            // 여러 읽기 동시 가능, 쓰기와는 배타
        } finally {
            readLock.unlock();
        }
    }

    // 멀티 락 (여러 자원 동시에 락)
    public void transferStock(Long fromId, Long toId) {
        RLock lock1 = redissonClient.getLock("lock:product:" + fromId);
        RLock lock2 = redissonClient.getLock("lock:product:" + toId);
        RLock multiLock = redissonClient.getMultiLock(lock1, lock2);

        try {
            multiLock.lock();
            // 두 상품 동시 처리
        } finally {
            multiLock.unlock();
        }
    }
}
```

---

## AOP로 분산 락 어노테이션

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface DistributedLock {
    String key();
    long waitTime() default 5;
    long leaseTime() default 10;
    TimeUnit timeUnit() default TimeUnit.SECONDS;
}

@Aspect
@Component
@RequiredArgsConstructor
public class DistributedLockAspect {

    private final RedissonClient redissonClient;

    @Around("@annotation(distributedLock)")
    public Object around(ProceedingJoinPoint joinPoint, DistributedLock distributedLock)
        throws Throwable {

        // SpEL로 동적 키 생성
        String key = resolveKey(distributedLock.key(), joinPoint);
        RLock lock = redissonClient.getLock(key);

        try {
            if (!lock.tryLock(distributedLock.waitTime(),
                              distributedLock.leaseTime(),
                              distributedLock.timeUnit())) {
                throw new LockAcquisitionException("락 획득 실패: " + key);
            }
            return joinPoint.proceed();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    private String resolveKey(String keyExpression, ProceedingJoinPoint joinPoint) {
        // SpEL 파싱 (간단 버전)
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String[] params = signature.getParameterNames();
        Object[] args = joinPoint.getArgs();

        ExpressionParser parser = new SpelExpressionParser();
        EvaluationContext context = new StandardEvaluationContext();
        for (int i = 0; i < params.length; i++) {
            context.setVariable(params[i], args[i]);
        }
        return parser.parseExpression(keyExpression).getValue(context, String.class);
    }
}

// 사용
@Service
public class OrderService {

    @DistributedLock(key = "'lock:product:' + #productId", leaseTime = 30)
    public void placeOrder(Long productId, int quantity) {
        // 자동으로 분산 락 적용
        Product product = productRepository.findById(productId).orElseThrow();
        product.decreaseStock(quantity);
        productRepository.save(product);
    }
}
```

---

## 재고 처리 패턴 비교

```java
// 방법 1: 분산 락
@DistributedLock(key = "'stock:' + #productId")
public boolean purchase(Long productId, int qty) {
    Product p = productRepository.findById(productId).orElseThrow();
    if (p.getStock() < qty) return false;
    p.setStock(p.getStock() - qty);
    productRepository.save(p);
    return true;
}

// 방법 2: DB 낙관적 락 (충돌 적을 때 더 효율적)
@Transactional
public boolean purchase(Long productId, int qty) {
    try {
        Product p = productRepository.findByIdWithOptimisticLock(productId);
        if (p.getStock() < qty) return false;
        p.setStock(p.getStock() - qty);
        productRepository.save(p);
        return true;
    } catch (OptimisticLockingFailureException e) {
        // 재시도
        return false;
    }
}

// 방법 3: Redis Lua 스크립트 (원자적 재고 차감)
public boolean purchaseWithLua(Long productId, int qty) {
    String script = """
        local stock = tonumber(redis.call('get', KEYS[1]))
        if stock == nil then return -1 end
        if stock < tonumber(ARGV[1]) then return 0 end
        redis.call('decrby', KEYS[1], ARGV[1])
        return 1
        """;
    Long result = redisTemplate.execute(
        new DefaultRedisScript<>(script, Long.class),
        List.of("stock:" + productId),
        String.valueOf(qty)
    );
    // 1: 성공, 0: 재고 부족, -1: 키 없음
    return result != null && result == 1;
}
```
