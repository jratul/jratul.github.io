---
title: "동시성 제어, 낙관적 락과 비관적 락"
date: "2026-08-11"
tags: ["concurrency", "lock", "optimistic-lock", "pessimistic-lock", "distributed-lock", "backend"]
excerpt: "같은 데이터를 동시에 수정할 때 생기는 Lost Update 문제부터, 비관적 락과 낙관적 락, Redis 기반 분산 락까지 동시성 제어 전략을 정리합니다."
---

# 동시성 제어, 낙관적 락과 비관적 락

격리 수준은 DB가 동시에 실행되는 트랜잭션을 서로에게 어떻게 보여줄지의 문제였다면, 락은 아예 동시 접근 자체를 막는 방법입니다. 격리 수준을 아무리 높여도 여러 요청이 같은 row를 동시에 수정하려는 시나리오 자체가 사라지지는 않고, 결국 "누가 먼저 쓸 것인가"를 정해줘야 하는 순간이 옵니다. 이 글은 그 상황에서 실제로 쓰는 두 가지 락 전략, 비관적 락과 낙관적 락, 그리고 DB 트랜잭션 범위를 벗어난 분산 락을 정리합니다.

---

## 동시성 제어가 필요한 이유

재고 차감을 예로 들어보겠습니다. 상품 A의 재고가 10개 남아있는 상황에서, 두 사용자가 거의 동시에 주문을 넣습니다.

```
시각    요청 1 (사용자 A)              요청 2 (사용자 B)
t1      SELECT stock FROM products
        WHERE id = 1;  -- 10
t2                                      SELECT stock FROM products
                                         WHERE id = 1;  -- 10
t3      -- 애플리케이션에서 10 - 1 계산
t4                                       -- 애플리케이션에서 10 - 1 계산
t5      UPDATE products SET stock = 9
        WHERE id = 1;
t6                                       UPDATE products SET stock = 9
                                          WHERE id = 1;
```

두 요청 모두 주문에 성공했으니 재고는 8이 되어야 하는데, 결과는 9입니다. 요청 2가 요청 1의 변경 사항을 덮어써버렸기 때문입니다. 이렇게 두 트랜잭션이 서로의 변경을 인지하지 못하고 마지막에 쓴 값이 앞의 값을 지워버리는 문제를 **Lost Update**(갱신 손실)라고 부릅니다.

Spring Data JPA로 옮기면 다음과 같은 코드에서 그대로 재현됩니다.

```java
@Transactional
public void decreaseStock(Long productId, int quantity) {
    Product product = productRepository.findById(productId)
        .orElseThrow();

    if (product.getStock() < quantity) {
        throw new IllegalStateException("재고 부족");
    }

    product.decreaseStock(quantity); // stock -= quantity
    // save는 생략해도 영속성 컨텍스트가 flush 시점에 UPDATE를 날림
}
```

`findById`로 읽어온 시점의 `stock` 값을 기준으로 애플리케이션 메모리에서 차감 계산을 하기 때문에, 두 트랜잭션이 같은 값을 동시에 읽으면 위와 똑같은 문제가 생깁니다. READ COMMITTED든 REPEATABLE READ든 격리 수준만으로는 이 문제를 막을 수 없습니다 — 각 트랜잭션이 읽은 값 자체는 정상(커밋된 값)이고, 문제는 그 사이에 다른 트랜잭션이 끼어들어 값을 바꿨다는 사실을 서로 모른다는 데 있습니다. 여기서부터 락이 필요합니다.

---

## 비관적 락(Pessimistic Lock)

**비관적 락**은 "충돌이 자주 일어날 것"이라고 가정하고, 데이터를 읽는 시점에 미리 락을 걸어 다른 트랜잭션의 접근 자체를 막는 방식입니다. SQL 레벨에서는 `SELECT ... FOR UPDATE`로 표현됩니다.

```sql
-- 트랜잭션 A
BEGIN;
SELECT stock FROM products WHERE id = 1 FOR UPDATE;  -- 배타 락 획득, 10
-- 이 시점부터 트랜잭션 B는 같은 row에 대한 FOR UPDATE/UPDATE에서 대기
UPDATE products SET stock = stock - 1 WHERE id = 1;
COMMIT;  -- 여기서 락 해제

-- 트랜잭션 B (트랜잭션 A가 COMMIT할 때까지 대기)
BEGIN;
SELECT stock FROM products WHERE id = 1 FOR UPDATE;  -- A가 커밋된 후에야 실행, 9
UPDATE products SET stock = stock - 1 WHERE id = 1;
COMMIT;
```

트랜잭션 B는 A가 커밋할 때까지 `SELECT ... FOR UPDATE`에서 그대로 대기하기 때문에, 항상 최신 값을 기준으로 차감이 일어납니다. JPA에서는 `@Lock` 어노테이션으로 동일하게 표현합니다.

```java
public interface ProductRepository extends JpaRepository<Product, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);
}
```

```java
@Transactional
public void decreaseStockPessimistic(Long productId, int quantity) {
    Product product = productRepository.findByIdForUpdate(productId)
        .orElseThrow();

    if (product.getStock() < quantity) {
        throw new IllegalStateException("재고 부족");
    }

    product.decreaseStock(quantity);
}
```

`PESSIMISTIC_WRITE`는 배타 락(`FOR UPDATE`)이고, 읽기만 막고 다른 트랜잭션의 읽기는 허용하려면 `PESSIMISTIC_READ`(공유 락, `LOCK IN SHARE MODE`)를 씁니다. 실무에서는 대부분 쓰기까지 막아야 하므로 `PESSIMISTIC_WRITE`를 씁니다.

| | 장점 | 단점 |
|---|---|---|
| 비관적 락 | 락을 건 순간부터 정합성이 확실히 보장됨. 충돌이 잦아도 재시도 로직이 필요 없음 | 락 대기 시간만큼 처리량 저하. 여러 row를 순서 없이 잠그면 데드락 발생 가능 |

---

## 낙관적 락(Optimistic Lock)

**낙관적 락**은 반대로 "충돌이 드물 것"이라고 가정합니다. 미리 락을 걸지 않고 각자 읽고 수정한 뒤, 저장하는 시점에 그 사이 다른 트랜잭션이 값을 바꿔치기하지 않았는지 버전(version) 컬럼으로 사후 검증합니다.

```java
@Entity
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int stock;

    @Version
    private Long version;

    public void decreaseStock(int quantity) {
        if (this.stock < quantity) {
            throw new IllegalStateException("재고 부족");
        }
        this.stock -= quantity;
    }
}
```

`@Version` 필드가 붙어 있으면 JPA는 UPDATE 문에 자동으로 `WHERE id = ? AND version = ?` 조건을 추가하고, 성공 시 `version`을 1 증가시킵니다.

```sql
-- JPA가 실제로 실행하는 쿼리
UPDATE product SET stock = 9, version = 6 WHERE id = 1 AND version = 5;
```

이 UPDATE의 영향받은 row 수가 0이면, 즉 내가 읽었던 버전(5)이 이미 다른 트랜잭션에 의해 바뀌어버렸다는 뜻이고, JPA는 이를 감지해서 `OptimisticLockException`(정확히는 `javax.persistence.OptimisticLockException` 또는 스프링이 감싼 `ObjectOptimisticLockingFailureException`)을 던집니다.

```java
@Transactional
public void decreaseStockOptimistic(Long productId, int quantity) {
    Product product = productRepository.findById(productId)
        .orElseThrow();

    product.decreaseStock(quantity);
    // flush 시점에 version 불일치가 감지되면 OptimisticLockException 발생
}
```

충돌은 예외로만 알려주기 때문에, 호출하는 쪽에서 재시도 로직을 붙이는 게 일반적입니다.

```java
@Component
public class RetryableStockService {

    private final ProductService productService;
    private static final int MAX_RETRY = 3;

    public void decreaseStockWithRetry(Long productId, int quantity) {
        int attempt = 0;
        while (true) {
            try {
                productService.decreaseStockOptimistic(productId, quantity);
                return;
            } catch (ObjectOptimisticLockingFailureException e) {
                attempt++;
                if (attempt >= MAX_RETRY) {
                    throw new IllegalStateException("재고 차감 재시도 초과", e);
                }
                // 짧은 대기 후 재시도 (지수 백오프 등으로 조정 가능)
            }
        }
    }
}
```

실무에서는 이 반복을 직접 짜는 대신 `spring-retry`의 `@Retryable(retryFor = ObjectOptimisticLockingFailureException.class)`로 선언적으로 처리하는 경우가 많습니다.

| 구분 | 비관적 락 | 낙관적 락 |
|---|---|---|
| 락 시점 | 읽을 때 미리 | 저장할 때 사후 검증 |
| 충돌이 드문 경우 | 불필요한 대기로 손해 | 락 오버헤드 없이 빠름 |
| 충돌이 잦은 경우 | 확실하지만 대기 발생 | 재시도가 계속 실패해 오히려 비효율적 |
| 실패 처리 | 대기 후 자동 진행 | 예외 발생, 재시도 로직 필요 |
| 적합한 상황 | 쓰기 경합이 잦은 재고/포인트 차감 | 읽기 위주, 충돌이 드문 게시글 수정 등 |

정리하면, 쓰기 경합이 자주 일어나는 영역(선착순 재고 차감, 포인트 차감)은 비관적 락이 낫고, 대부분 조회이고 가끔만 수정이 겹치는 영역(게시글 수정, 프로필 수정)은 낙관적 락이 락 대기 비용 없이 더 효율적입니다.

---

## DB를 넘어선 분산 락(Distributed Lock)

지금까지 다룬 락은 모두 하나의 DB 트랜잭션 안에서 동작합니다. 하지만 다음과 같은 상황에서는 DB 락만으로 부족합니다.

- 여러 서버 인스턴스에서 동시에 뜨는 스케줄러가 같은 배치 작업을 중복 실행하지 않도록 막아야 하는 경우
- 외부 API 호출처럼 DB 트랜잭션 범위 밖에 있는 자원에 대한 접근을 직렬화해야 하는 경우
- 여러 마이크로서비스가 공유하는 리소스(파일, 캐시 등)에 대한 동시 접근을 막아야 하는 경우

이럴 때는 DB 트랜잭션에 종속되지 않는 별도의 락 저장소가 필요하고, 실무에서 가장 흔히 쓰는 것이 Redis입니다.

가장 단순한 형태는 `SETNX`(SET if Not eXists)로 키가 없을 때만 락을 세팅하는 방식입니다.

```
SET lock:batch:daily-report "server-A" NX PX 30000
```

`NX`는 키가 없을 때만 성공하고, `PX 30000`은 30초 TTL입니다. 다른 인스턴스가 같은 키로 `SET ... NX`를 시도하면 실패하므로 자연스럽게 락 경쟁이 해결됩니다.

여기서 TTL이 필수인 이유가 중요합니다. 락을 획득한 프로세스가 작업 도중 예외 없이 죽어버리면(서버 크래시, 강제 종료 등) 락을 해제할 코드 자체가 실행되지 않습니다. TTL이 없으면 그 락은 영원히 풀리지 않고, 이후 모든 요청이 영구히 대기하게 됩니다. TTL을 걸어두면 프로세스가 죽어도 일정 시간 뒤 자동으로 락이 풀려 시스템이 스스로 회복됩니다.

직접 `SETNX`를 다루면 락 해제 시점에 "내가 건 락이 맞는지" 검증, TTL 연장(락을 오래 들고 있어야 하는 작업), 재시도 대기 같은 것들을 전부 손으로 구현해야 하므로, 실무에서는 보통 Redisson 같은 라이브러리를 씁니다.

```java
@Service
public class ScheduledReportService {

    private final RedissonClient redissonClient;

    public void runDailyReport() {
        RLock lock = redissonClient.getLock("lock:batch:daily-report");

        boolean acquired = false;
        try {
            // 최대 5초 대기, 획득하면 30초 뒤 자동 해제
            acquired = lock.tryLock(5, 30, TimeUnit.SECONDS);
            if (!acquired) {
                return; // 다른 인스턴스가 이미 실행 중
            }

            generateDailyReport();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            if (acquired && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}
```

Redisson은 내부적으로 락을 쥐고 있는 동안 워치독(watchdog)이 주기적으로 TTL을 연장해줘서, 작업이 예상보다 오래 걸려도 도중에 락이 풀려버리는 문제를 줄여줍니다. 다만 워치독도 프로세스가 완전히 죽으면 더 이상 동작하지 않으므로, TTL 자체가 안전망이라는 사실은 변하지 않습니다.

ZooKeeper 기반 분산 락(Curator의 `InterProcessMutex`)도 같은 목적으로 쓰입니다. Redis 락이 TTL이라는 시간 기반 안전장치에 의존하는 것과 달리, ZooKeeper는 세션과 ephemeral 노드를 이용해 클라이언트 연결이 끊기면 즉시 락이 해제되는 구조라 조금 더 엄격한 정합성을 제공합니다. 대신 Redis보다 운영 복잡도가 높아, 이미 ZooKeeper를 다른 용도(서비스 디스커버리 등)로 쓰고 있는 조직이 아니라면 보통 Redis 쪽을 먼저 고려합니다.

---

## 최근 흐름: 가상 스레드는 락 문제를 없애주지 않는다

Java 21부터 정식으로 들어온 **가상 스레드**(Virtual Thread)는 스레드를 아끼기 위해 비동기/리액티브 스타일로 짜던 코드를, 다시 동기 코드처럼 단순하게 작성할 수 있게 해줍니다. 블로킹 호출(DB 쿼리, 외부 API 호출 등)이 있어도 플랫폼 스레드를 점유하지 않고 캐리어 스레드를 반납하기 때문에, 요청마다 스레드 하나씩 쓰는 전통적인 코드 스타일을 유지하면서도 훨씬 많은 동시 요청을 처리할 수 있습니다.

다만 이 글에서 다룬 락 문제와는 완전히 다른 층위입니다. 가상 스레드는 "스레드 자원을 얼마나 효율적으로 쓰는가"의 문제를 다루는 것이고, 이 글의 비관적 락/낙관적 락/분산 락은 "같은 데이터에 대한 동시 쓰기를 어떻게 정합성 있게 처리할 것인가"의 문제를 다룹니다. 가상 스레드를 도입해서 요청 처리량이 늘어나면, 오히려 같은 row에 몰리는 동시 요청 수 자체는 더 늘어날 수 있어 락 전략의 중요성은 줄어들지 않습니다. 스레드를 아무리 가볍게 만들어도, 재고를 -1 하는 두 요청이 같은 row를 동시에 읽는 순간 Lost Update가 생길 가능성은 그대로 남아 있습니다.

---

## 요약

1. **Lost Update**: 두 트랜잭션이 같은 데이터를 동시에 읽고 각자 수정해 저장하면, 나중에 커밋한 쪽이 앞의 변경을 덮어써버리는 문제.
2. **비관적 락**: 읽는 시점에 미리 락을 걸어 다른 트랜잭션의 접근을 막음. `SELECT ... FOR UPDATE`, `@Lock(LockModeType.PESSIMISTIC_WRITE)`. 확실하지만 대기 비용이 있음.
3. **낙관적 락**: 버전 컬럼으로 저장 시점에 충돌을 사후 감지. `@Version`, 충돌 시 `OptimisticLockException` 후 재시도. 충돌이 드문 경우에 효율적.
4. **분산 락**: DB 트랜잭션 범위를 벗어난 동시성 제어가 필요할 때 Redis(`SETNX` + TTL, Redisson) 또는 ZooKeeper 사용. TTL 없이는 프로세스가 죽었을 때 락이 영원히 풀리지 않음.
5. **가상 스레드**: 동시성 처리 방식(스레드 효율)을 바꿔주는 것이지, 데이터 동시 접근 제어(락) 문제를 대신 해결해주지 않음.

쓰기 경합이 잦고 정합성이 중요한 영역은 비관적 락, 대부분 읽기이고 충돌이 드문 영역은 낙관적 락, DB 트랜잭션 밖의 자원을 다뤄야 한다면 분산 락을 선택합니다.
