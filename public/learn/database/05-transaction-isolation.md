---
title: "트랜잭션과 격리 수준"
order: 5
---

# 트랜잭션과 격리 수준

여러 사용자가 동시에 데이터를 읽고 쓸 때 어떻게 일관성을 보장하는지 이해합니다. 이것을 모르면 실제 서비스에서 데이터가 꼬이는 버그를 만나게 됩니다.

---

## ACID — 트랜잭션의 4가지 보장

은행 이체를 예시로 ACID를 이해해봅니다.

```
시나리오: A가 B에게 10,000원 이체

관련 작업:
1. A 계좌에서 10,000원 차감
2. B 계좌에 10,000원 추가
3. 이체 내역 기록

이 세 작업이 모두 성공하거나 모두 실패해야 합니다.
```

```
A (Atomicity, 원자성):
— 트랜잭션 내 작업은 "전부 성공" 또는 "전부 실패"
— 1번 성공 후 2번 실패 → 전체 취소(롤백)
— 중간 상태는 절대 존재하지 않음

C (Consistency, 일관성):
— 트랜잭션 전후에 DB가 항상 유효한 상태
— 외래키, NOT NULL, CHECK 제약 조건이 계속 만족됨
— 이체 후 총 잔액의 합은 변하지 않음

I (Isolation, 격리성):
— 동시에 실행 중인 트랜잭션들이 서로 영향을 주지 않음
— A가 이체 중일 때, B는 이체 중간 상태를 볼 수 없음
— "격리 수준"으로 얼마나 격리할지 조절 가능

D (Durability, 지속성):
— 커밋된 데이터는 시스템이 꺼져도 유지됨
— WAL(Write-Ahead Log): DB가 변경 전에 로그를 디스크에 먼저 기록
— 갑자기 서버가 꺼져도 커밋된 데이터는 살아있음
```

---

## 동시 실행 시 발생하는 문제

여러 트랜잭션이 동시에 실행될 때 발생할 수 있는 문제입니다.

### Dirty Read (더티 리드)

```
커밋되지 않은 데이터를 다른 트랜잭션이 읽는 문제

타임라인:
T1: 상품 가격을 1000원 → 2000원으로 UPDATE (미커밋 상태)
T2: 상품 가격 조회 → 2000원 읽음 ← 아직 커밋 안 됐는데!
T1: 롤백 → 가격이 다시 1000원으로

결과: T2는 존재하지 않는 2000원이라는 가격으로 결제 처리를 했을 수 있음
→ 잘못된 데이터를 읽은 것
```

### Non-repeatable Read (반복 불가능한 읽기)

```
같은 쿼리를 두 번 실행했는데 결과가 달라지는 문제

타임라인:
T1: SELECT price FROM products WHERE id=1 → 1000원
T2: UPDATE products SET price=2000 WHERE id=1; COMMIT
T1: SELECT price FROM products WHERE id=1 → 2000원 ← 달라짐!

결과: T1이 같은 쿼리를 두 번 실행했는데 다른 값이 나옴
→ 주문 계산 중에 가격이 바뀐 것과 같은 상황
```

### Phantom Read (팬텀 리드)

```
같은 조건으로 읽었는데 행 수가 달라지는 문제

타임라인:
T1: SELECT COUNT(*) FROM orders WHERE status='PENDING' → 5건
T2: INSERT INTO orders (...) VALUES (...); COMMIT  ← 새 PENDING 주문 추가
T1: SELECT COUNT(*) FROM orders WHERE status='PENDING' → 6건 ← 달라짐!

결과: 처음 5건이었다가 갑자기 6건으로 보임
→ 유령(Phantom)처럼 갑자기 나타난 행
```

---

## 격리 수준 — 문제를 얼마나 막을지 설정

격리 수준이 높을수록 안전하지만 성능이 떨어집니다. 상황에 맞게 선택해야 합니다.

| 격리 수준 | Dirty Read | Non-repeatable Read | Phantom Read | 성능 |
|-----------|-----------|---------------------|--------------|------|
| READ UNCOMMITTED | 발생 | 발생 | 발생 | 가장 빠름 |
| READ COMMITTED | 방지 | 발생 | 발생 | 빠름 |
| REPEATABLE READ | 방지 | 방지 | 발생* | 보통 |
| SERIALIZABLE | 방지 | 방지 | 방지 | 가장 느림 |

*PostgreSQL의 REPEATABLE READ는 Phantom Read도 방지합니다.

```
READ UNCOMMITTED:
— 커밋 안 된 데이터도 읽을 수 있음 → 매우 위험
— 실제로 거의 사용하지 않음

READ COMMITTED (기본값 — PostgreSQL, Oracle):
— 커밋된 데이터만 읽음 → Dirty Read 방지
— 대부분의 상황에서 충분히 안전하고 성능도 좋음
— PostgreSQL의 기본 격리 수준

REPEATABLE READ (기본값 — MySQL InnoDB):
— 트랜잭션 시작 시점의 스냅샷으로 읽음
— 트랜잭션 동안 같은 데이터를 읽으면 항상 같은 결과
— 정확한 합계 계산, 재무 보고서 생성에 적합

SERIALIZABLE:
— 트랜잭션들이 완전히 순차 실행된 것처럼 보장
— 가장 안전하지만 성능 저하, 동시성 감소
— 금융 거래, 재고 차감 등 정합성이 최우선일 때
```

---

## PostgreSQL에서 격리 수준 설정

```sql
-- 세션 기본값 변경
SET default_transaction_isolation = 'READ COMMITTED';

-- 특정 트랜잭션에만 적용
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- 작업 수행...
COMMIT;

-- BEGIN과 함께
BEGIN ISOLATION LEVEL SERIALIZABLE;
```

```java
// Spring Boot: @Transactional 격리 수준
@Transactional  // 기본값: READ_COMMITTED
public void doSomething() { ... }

@Transactional(isolation = Isolation.READ_COMMITTED)   // 기본 (가장 많이 사용)
public void doReadWrite() { ... }

@Transactional(isolation = Isolation.REPEATABLE_READ)  // 읽기 일관성 필요 시
public void generateReport() { ... }

@Transactional(isolation = Isolation.SERIALIZABLE)     // 완전한 격리 필요 시
public void processPayment() { ... }
```

---

## 락(Lock) — 동시 접근 제어

락은 여러 트랜잭션이 같은 데이터에 동시 접근할 때 충돌을 막는 메커니즘입니다.

```
공유 락 (Share Lock, S-Lock, 읽기 락):
— 읽기 목적으로 획득
— 여러 트랜잭션이 동시에 공유 락 보유 가능
— 다른 트랜잭션의 쓰기(배타 락)는 차단

배타 락 (Exclusive Lock, X-Lock, 쓰기 락):
— 쓰기 목적으로 획득
— 단 하나의 트랜잭션만 보유 가능
— 다른 모든 읽기/쓰기 차단

비유:
공유 락 = 도서관에서 책을 읽는 사람 (여러 명이 동시에 읽기 가능)
배타 락 = 책을 수정하는 사람 (한 명만 가능, 다른 사람은 기다려야 함)
```

```sql
-- 행 레벨 락
SELECT * FROM orders WHERE id = 123 FOR UPDATE;
-- FOR UPDATE: 배타 락 → 다른 트랜잭션이 이 행을 수정/조회(FOR UPDATE)하지 못함
-- 재고 차감, 잔액 차감 같은 경쟁 상황에서 사용

SELECT * FROM orders WHERE id = 123 FOR SHARE;
-- FOR SHARE: 공유 락 → 다른 트랜잭션이 읽을 수는 있지만 수정은 못함

SELECT * FROM orders WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED;
-- SKIP LOCKED: 다른 트랜잭션이 이미 락을 걸어둔 행은 건너뜀
-- 여러 워커가 대기 중인 작업을 처리할 때 유용 (큐 처리)


-- 락이 걸린 연결 확인
SELECT
    pid,
    query,
    wait_event_type,
    wait_event,
    state
FROM pg_stat_activity
WHERE wait_event_type = 'Lock';

-- 현재 락 상태 확인
SELECT * FROM pg_locks WHERE NOT granted;  -- 획득하지 못한 락 (대기 중)
```

---

## 낙관적 락 vs 비관적 락

두 가지 전략은 "충돌이 자주 일어날 것인가?"에 따라 선택합니다.

```
비관적 락 (Pessimistic Lock):
— "충돌이 자주 일어날 것이다" → 미리 락 획득
— SELECT ... FOR UPDATE 사용
— 충돌이 잦거나, 데이터 정합성이 매우 중요할 때
— 단점: 성능 저하, 데드락 가능성

낙관적 락 (Optimistic Lock):
— "충돌이 드물 것이다" → 저장할 때만 충돌 확인
— version 컬럼으로 구현: 읽은 버전과 저장할 버전이 다르면 충돌
— 읽기가 많고 쓰기 충돌이 드물 때 (SNS, 블로그 등)
— 단점: 충돌 시 재시도 로직 필요
```

```java
// JPA 낙관적 락
@Entity
public class Product {
    @Id
    private Long id;

    private String name;
    private int stock;

    @Version  // 낙관적 락: 이 컬럼을 버전으로 사용
    private Long version;
}

// 동작 방식:
// 1. Product 읽기: version = 5
// 2. 다른 트랜잭션이 같은 Product 수정: version = 6
// 3. 원래 트랜잭션이 저장 시도: version=5로 저장 시도
//    → DB에는 version=6이므로 충돌!
//    → OptimisticLockException 발생
//    → @Retryable 등으로 재시도 처리

// JPA 비관적 락
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT p FROM Product p WHERE p.id = :id")
Optional<Product> findByIdForUpdate(@Param("id") Long id);
// SELECT ... FOR UPDATE에 해당
```

---

## 데드락

두 트랜잭션이 서로가 가진 락을 기다리는 상황입니다. 끝없이 기다리게 됩니다.

```
데드락 발생 시나리오:

T1: 1번 행 락 획득
T2: 2번 행 락 획득
T1: 2번 행 락 요청 → T2가 가지고 있어서 대기
T2: 1번 행 락 요청 → T1이 가지고 있어서 대기

→ T1도 T2도 서로를 기다리며 영원히 대기!

비유: 두 사람이 좁은 복도에서 마주쳤는데
      서로 비켜주길 기다리며 아무도 안 움직이는 상황
```

```
PostgreSQL의 데드락 처리:
— 자동으로 데드락 감지 (deadlock_timeout, 기본 1초)
— 한 트랜잭션을 강제로 롤백
— ERROR: deadlock detected 에러 발생
— 롤백된 트랜잭션은 재시도 가능
```

```sql
-- 데드락 예방 방법:

-- 1. 항상 같은 순서로 락 획득 (ID 오름차순)
-- ❌ 위험: T1은 1번→2번, T2는 2번→1번 순서로 접근
-- ✅ 안전: 모든 트랜잭션이 작은 ID부터 처리

-- 주문 취소 처리 예시 (여러 행 동시 수정)
-- ❌ 위험
UPDATE orders SET status='CANCELLED' WHERE id = $order_id;
UPDATE inventory SET stock = stock + $qty WHERE product_id = $product_id;

-- ✅ 안전: 항상 같은 순서 (product_id → order_id 순, 또는 ID 오름차순)
SELECT * FROM inventory WHERE id = $inventory_id FOR UPDATE;  -- 먼저 재고 락
SELECT * FROM orders WHERE id = $order_id FOR UPDATE;         -- 그 다음 주문 락

-- 2. 트랜잭션을 짧게 유지
-- 트랜잭션 안에서 외부 API 호출, 오래 걸리는 작업 금지

-- 3. 불필요한 FOR UPDATE 제거
```

---

## MVCC — 락 없이 읽기와 쓰기를 동시에

PostgreSQL이 높은 동시성을 지원하는 비결입니다.

```
전통적인 방식 (락 기반):
— 읽기할 때 쓰기 차단
— 쓰기할 때 읽기 차단
→ 동시 처리량 낮음

MVCC (Multi-Version Concurrency Control):
— 행을 수정할 때 새 버전을 만들고 기존 버전은 유지
— 읽기는 트랜잭션 시작 시점의 "스냅샷"을 읽음
→ 읽기와 쓰기가 서로 차단하지 않음!

예시:
T1이 읽기 시작 (스냅샷: 가격=1000원)
T2가 가격을 2000원으로 수정하고 커밋
T1이 다시 읽기 → 여전히 1000원 (T1의 스냅샷 기준)
→ T1은 T2의 변경에 영향받지 않음
```

```
MVCC의 장단점:

장점:
✅ 읽기가 쓰기를 차단하지 않음 → 높은 동시성
✅ 쓰기가 읽기를 차단하지 않음
✅ 일관된 읽기 (트랜잭션 시작 시점의 데이터)

단점:
— 삭제/수정된 행이 "죽은 행(dead tuple)"으로 남음
— VACUUM으로 주기적 정리 필요
— 저장 공간 추가 사용
```

---

## 실전: 재고 차감 안전하게 처리하기

```sql
-- 상품 주문 시 재고 차감 (동시 요청이 많은 경우)

-- ❌ 위험한 방법: 두 요청이 동시에 같은 재고를 확인하면 둘 다 통과
BEGIN;
SELECT stock FROM products WHERE id = $product_id;
-- 재고: 1개
-- 다른 요청도 동시에 1개라고 읽음

UPDATE products SET stock = stock - 1 WHERE id = $product_id;
-- 두 요청 모두 실행하면 재고가 -1이 됨!
COMMIT;

-- ✅ 안전한 방법: FOR UPDATE로 락 획득
BEGIN;
SELECT stock FROM products
WHERE id = $product_id
FOR UPDATE;  -- 이 행에 배타 락 획득 → 다른 트랜잭션은 대기
-- 재고: 1개

-- 재고가 있으면 차감
UPDATE products
SET stock = stock - 1
WHERE id = $product_id AND stock > 0;
-- AND stock > 0: 재고 부족 방지

COMMIT;

-- 또는 한 번에 처리 (더 간단)
BEGIN;
UPDATE products
SET stock = stock - 1
WHERE id = $product_id AND stock > 0
RETURNING stock;  -- 차감 후 남은 재고 반환
-- rows=0 이면 재고 부족 → 롤백 처리
COMMIT;
```
