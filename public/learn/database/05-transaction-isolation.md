---
title: "트랜잭션과 격리 수준"
order: 5
---

# 트랜잭션과 격리 수준

동시에 여러 트랜잭션이 실행될 때 어떻게 데이터 정합성을 보장하는지 이해한다.

---

## ACID

```
Atomicity (원자성):
— 트랜잭션 내 작업은 전부 성공하거나 전부 실패
— 중간 상태는 없음

Consistency (일관성):
— 트랜잭션 전후 DB 제약 조건 만족
— 외래키, NOT NULL, CHECK 등

Isolation (격리성):
— 동시 실행 트랜잭션은 서로 영향 주지 않음
— 격리 수준으로 정도를 조절

Durability (지속성):
— 커밋된 데이터는 시스템 장애 후에도 유지
— WAL(Write-Ahead Log)로 보장
```

---

## 동시성 문제

```
Dirty Read (더티 리드):
— 다른 트랜잭션의 커밋되지 않은 데이터 읽기
— T1이 price=100으로 변경 중 (미커밋)
— T2가 price=100 읽음
— T1 롤백 → T2가 읽은 데이터는 쓰레기

Non-repeatable Read (반복 불가능한 읽기):
— 같은 쿼리를 두 번 실행했을 때 결과가 다름
— T1: SELECT price FROM products WHERE id=1 → 100
— T2: UPDATE products SET price=200 WHERE id=1; COMMIT
— T1: SELECT price FROM products WHERE id=1 → 200 (달라짐!)

Phantom Read (팬텀 리드):
— 같은 조건으로 읽었는데 행 수가 달라짐
— T1: SELECT COUNT(*) FROM orders WHERE status='PENDING' → 5
— T2: INSERT INTO orders (...) VALUES (...); COMMIT
— T1: SELECT COUNT(*) FROM orders WHERE status='PENDING' → 6 (달라짐!)
```

---

## 격리 수준

| 격리 수준 | Dirty Read | Non-repeatable Read | Phantom Read |
|-----------|-----------|---------------------|--------------|
| READ UNCOMMITTED | 발생 | 발생 | 발생 |
| READ COMMITTED | 방지 | 발생 | 발생 |
| REPEATABLE READ | 방지 | 방지 | 발생 |
| SERIALIZABLE | 방지 | 방지 | 방지 |

```
READ UNCOMMITTED:
— 거의 안 씀 (Dirty Read 허용 → 매우 위험)

READ COMMITTED (기본값 — PostgreSQL, Oracle):
— 커밋된 데이터만 읽음
— 대부분의 상황에서 적절

REPEATABLE READ (기본값 — MySQL InnoDB):
— 트랜잭션 시작 시점의 스냅샷으로 읽음
— PostgreSQL에서는 Phantom Read도 방지

SERIALIZABLE:
— 완전한 직렬화
— 성능 저하 있음
— 금융 거래 등 정합성 최우선 시
```

---

## PostgreSQL 격리 수준 설정

```sql
-- 세션 기본값 변경
SET default_transaction_isolation = 'READ COMMITTED';

-- 트랜잭션별 지정
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- ...
COMMIT;

-- 또는 BEGIN과 함께
BEGIN ISOLATION LEVEL SERIALIZABLE;
```

```java
// Spring Boot @Transactional 격리 수준
@Transactional(isolation = Isolation.READ_COMMITTED)   // 기본
@Transactional(isolation = Isolation.REPEATABLE_READ)
@Transactional(isolation = Isolation.SERIALIZABLE)
```

---

## 락 (Lock)

```sql
-- 공유 락 (Share Lock, S-Lock):
-- 읽기용, 다른 읽기와 공존 가능
-- 쓰기는 차단

-- 배타 락 (Exclusive Lock, X-Lock):
-- 쓰기용, 다른 모든 락 차단

-- 행 레벨 락
SELECT * FROM orders WHERE id = 123 FOR UPDATE;        -- 배타 락
SELECT * FROM orders WHERE id = 123 FOR SHARE;         -- 공유 락
SELECT * FROM orders WHERE id = 123 FOR UPDATE SKIP LOCKED; -- 잠긴 행 건너뜀

-- 테이블 레벨 락
LOCK TABLE orders IN SHARE MODE;
LOCK TABLE orders IN EXCLUSIVE MODE;

-- 락 확인
SELECT pid, query, wait_event_type, wait_event, state
FROM pg_stat_activity
WHERE wait_event_type = 'Lock';

-- 데드락 감지
SELECT * FROM pg_locks WHERE NOT granted;
```

---

## 낙관적 락 vs 비관적 락

```
비관적 락 (Pessimistic Lock):
— 충돌을 예상하고 미리 락 획득
— SELECT ... FOR UPDATE
— 충돌 빈번하거나 데이터 정합성 중요할 때
— 성능 저하, 데드락 가능성

낙관적 락 (Optimistic Lock):
— 충돌을 드물게 예상, 충돌 시 재시도
— version 컬럼으로 구현
— 읽기가 많고 쓰기 충돌이 드물 때
— 성능 좋음, 재시도 로직 필요
```

```java
// JPA 낙관적 락
@Entity
public class Product {
    @Id
    private Long id;

    private String name;
    private int price;

    @Version  // 자동 버전 관리
    private Long version;
}

// 충돌 시 OptimisticLockException 발생
// @Retryable 등으로 재시도 처리

// JPA 비관적 락
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT p FROM Product p WHERE p.id = :id")
Optional<Product> findByIdWithLock(@Param("id") Long id);
```

---

## 데드락

```
데드락 발생:
T1: UPDATE orders SET status='A' WHERE id=1;  -- 1번 락
T1: UPDATE orders SET status='A' WHERE id=2;  -- 2번 락 대기
T2: UPDATE orders SET status='B' WHERE id=2;  -- 2번 락
T2: UPDATE orders SET status='B' WHERE id=1;  -- 1번 락 대기
→ 서로 기다리다가 영원히 대기

PostgreSQL 자동 감지:
— 데드락 감지 시 한 트랜잭션 강제 롤백
— ERROR: deadlock detected

예방:
— 항상 같은 순서로 락 획득 (id 오름차순)
— 트랜잭션을 짧게 유지
— 불필요한 FOR UPDATE 제거
```

---

## MVCC (Multi-Version Concurrency Control)

PostgreSQL이 락 없이 읽기-쓰기 동시성을 지원하는 방법.

```
원리:
— 행을 수정할 때 새 버전 생성, 기존 버전 유지
— 읽기는 트랜잭션 시작 시점의 스냅샷 읽음
— 읽기와 쓰기가 서로 차단하지 않음

장점:
✅ 읽기가 쓰기를 차단하지 않음
✅ 쓰기가 읽기를 차단하지 않음
✅ 높은 동시성

단점:
— Dead Tuple 발생 (VACUUM 필요)
— 저장 공간 추가 사용
```
