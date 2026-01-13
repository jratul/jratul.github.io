---
title: "트랜잭션 격리 수준(Isolation Level)"
date: "2026-01-14"
tags: ["database", "transaction", "isolation", "backend", "concurrency"]
excerpt: "트랜잭션 격리 수준과 발생할 수 있는 동시성 문제들을 알아봅니다."
---

# 트랜잭션 격리 수준(Isolation Level)

트랜잭션 격리 수준은 **여러 트랜잭션이 동시에 실행될 때 서로 얼마나 격리되는지**를 정의합니다.

## 동시성 문제

격리 수준이 낮을수록 다음과 같은 문제가 발생할 수 있습니다.

### 1. Dirty Read (오손 읽기)

**커밋되지 않은 데이터를 읽는 문제**

```sql
-- 트랜잭션 A
BEGIN;
UPDATE accounts SET balance = 1000 WHERE id = 1;
-- 아직 커밋 안 함

-- 트랜잭션 B
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- 1000 읽음 (Dirty Read!)
COMMIT;

-- 트랜잭션 A
ROLLBACK;  -- balance는 원래 값으로 복구됨
```

**문제점:** 트랜잭션 B가 읽은 1000은 실제로 존재하지 않는 값입니다.

---

### 2. Non-Repeatable Read (반복 불가능 읽기)

**같은 데이터를 다시 읽었을 때 값이 변경된 문제**

```sql
-- 트랜잭션 A
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- 500

-- 트랜잭션 B
BEGIN;
UPDATE accounts SET balance = 1000 WHERE id = 1;
COMMIT;

-- 트랜잭션 A
SELECT balance FROM accounts WHERE id = 1;  -- 1000 (값이 변경됨!)
COMMIT;
```

**문제점:** 같은 트랜잭션 내에서 같은 데이터를 읽었는데 값이 다릅니다.

---

### 3. Phantom Read (유령 읽기)

**같은 조건으로 조회했을 때 행의 개수가 변경된 문제**

```sql
-- 트랜잭션 A
BEGIN;
SELECT * FROM accounts WHERE balance >= 1000;  -- 5개 행

-- 트랜잭션 B
BEGIN;
INSERT INTO accounts (id, balance) VALUES (100, 1500);
COMMIT;

-- 트랜잭션 A
SELECT * FROM accounts WHERE balance >= 1000;  -- 6개 행 (Phantom Read!)
COMMIT;
```

**문제점:** 같은 조건인데 결과 행 개수가 다릅니다.

---

## 4가지 격리 수준

### 1. READ UNCOMMITTED

**커밋되지 않은 데이터도 읽을 수 있습니다.**

```sql
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
BEGIN;
SELECT * FROM accounts;  -- 다른 트랜잭션의 미커밋 데이터도 읽음
COMMIT;
```

**특징:**
- 가장 낮은 격리 수준
- Dirty Read 발생 가능
- 거의 사용하지 않음

**발생 가능한 문제:**
- ✅ Dirty Read
- ✅ Non-Repeatable Read
- ✅ Phantom Read

---

### 2. READ COMMITTED

**커밋된 데이터만 읽을 수 있습니다.**

```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN;
SELECT * FROM accounts;  -- 커밋된 데이터만 읽음
COMMIT;
```

**특징:**
- 대부분의 데이터베이스 기본값 (PostgreSQL, Oracle, SQL Server)
- Dirty Read 방지
- 가장 많이 사용되는 수준

**발생 가능한 문제:**
- ❌ Dirty Read (방지)
- ✅ Non-Repeatable Read
- ✅ Phantom Read

---

### 3. REPEATABLE READ

**같은 데이터를 여러 번 읽어도 같은 값을 보장합니다.**

```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;
SELECT * FROM accounts WHERE id = 1;  -- balance = 500
-- 다른 트랜잭션이 UPDATE해도
SELECT * FROM accounts WHERE id = 1;  -- balance = 500 (같은 값!)
COMMIT;
```

**특징:**
- MySQL InnoDB의 기본값
- 트랜잭션 시작 시점의 스냅샷을 읽음
- Non-Repeatable Read 방지

**발생 가능한 문제:**
- ❌ Dirty Read (방지)
- ❌ Non-Repeatable Read (방지)
- ✅ Phantom Read (MySQL InnoDB는 방지)

---

### 4. SERIALIZABLE

**완전히 직렬화된 것처럼 동작합니다.**

```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;
SELECT * FROM accounts;
-- 다른 트랜잭션은 이 테이블에 쓰기 불가능 (대기)
COMMIT;
```

**특징:**
- 가장 높은 격리 수준
- 모든 동시성 문제 방지
- 성능이 가장 낮음

**발생 가능한 문제:**
- ❌ Dirty Read (방지)
- ❌ Non-Repeatable Read (방지)
- ❌ Phantom Read (방지)

---

## 격리 수준 비교표

| 격리 수준 | Dirty Read | Non-Repeatable Read | Phantom Read | 성능 |
|----------|------------|---------------------|--------------|------|
| READ UNCOMMITTED | 발생 | 발생 | 발생 | ⚡⚡⚡⚡ |
| READ COMMITTED | 방지 | 발생 | 발생 | ⚡⚡⚡ |
| REPEATABLE READ | 방지 | 방지 | 발생* | ⚡⚡ |
| SERIALIZABLE | 방지 | 방지 | 방지 | ⚡ |

*MySQL InnoDB는 REPEATABLE READ에서도 Phantom Read를 방지합니다.

---

## 데이터베이스별 기본값

```sql
-- PostgreSQL: READ COMMITTED
SHOW default_transaction_isolation;

-- MySQL: REPEATABLE READ
SELECT @@transaction_isolation;

-- Oracle: READ COMMITTED
SELECT * FROM V$PARAMETER WHERE NAME = 'isolation';

-- SQL Server: READ COMMITTED
SELECT CASE transaction_isolation_level
  WHEN 2 THEN 'READ COMMITTED'
  WHEN 3 THEN 'REPEATABLE READ'
  WHEN 4 THEN 'SERIALIZABLE'
END FROM sys.dm_exec_sessions WHERE session_id = @@SPID;
```

---

## 격리 수준 설정

### MySQL

```sql
-- 세션 단위
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 다음 트랜잭션만
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- 글로벌 (재시작 시 초기화)
SET GLOBAL TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

---

### PostgreSQL

```sql
-- 세션 단위
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 현재 트랜잭션만
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

---

## MySQL InnoDB의 MVCC

MySQL InnoDB는 **MVCC(Multi-Version Concurrency Control)**를 사용합니다.

### MVCC 동작 방식

```sql
-- 트랜잭션 A (REPEATABLE READ)
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- 500 (Snapshot 생성)

-- 트랜잭션 B
BEGIN;
UPDATE accounts SET balance = 1000 WHERE id = 1;
COMMIT;

-- 트랜잭션 A
SELECT balance FROM accounts WHERE id = 1;  -- 여전히 500! (Snapshot 읽음)
COMMIT;
```

**특징:**
- 각 행에 트랜잭션 ID 저장
- Undo Log에 이전 버전 보관
- 읽기는 Snapshot, 쓰기는 최신 버전
- **Lock 없이 읽기 가능** (높은 동시성)

---

### Consistent Read vs Locking Read

```sql
-- Consistent Read (Lock 없음)
SELECT * FROM accounts WHERE id = 1;

-- Locking Read (Shared Lock)
SELECT * FROM accounts WHERE id = 1 LOCK IN SHARE MODE;

-- Locking Read (Exclusive Lock)
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
```

---

## 실전 예제

### 예제 1: 재고 차감 (Lost Update 방지)

```sql
-- ❌ Lost Update 발생 가능
BEGIN;
SELECT stock FROM products WHERE id = 1;  -- 10개
-- 재고 확인 후 차감
UPDATE products SET stock = 9 WHERE id = 1;
COMMIT;

-- ✅ FOR UPDATE로 방지
BEGIN;
SELECT stock FROM products WHERE id = 1 FOR UPDATE;  -- Lock 획득
-- 다른 트랜잭션은 대기
UPDATE products SET stock = stock - 1 WHERE id = 1;
COMMIT;
```

---

### 예제 2: 계좌 이체

```sql
-- ✅ SERIALIZABLE 또는 FOR UPDATE 사용
BEGIN;

-- 출금 계좌 Lock
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- 입금 계좌 Lock
SELECT balance FROM accounts WHERE id = 2 FOR UPDATE;

-- 이체 처리
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE id = 2;

COMMIT;
```

---

### 예제 3: 좌석 예매 (Phantom Read 방지)

```sql
-- ❌ READ COMMITTED: Phantom Read 가능
BEGIN;
SELECT COUNT(*) FROM reservations WHERE seat_id = 1;  -- 0개

-- 다른 트랜잭션이 예매
INSERT INTO reservations (seat_id, user_id) VALUES (1, 100);

SELECT COUNT(*) FROM reservations WHERE seat_id = 1;  -- 1개 (Phantom!)
COMMIT;

-- ✅ REPEATABLE READ 이상 또는 Lock 사용
BEGIN;
SELECT * FROM seats WHERE id = 1 FOR UPDATE;  -- Lock 획득
SELECT COUNT(*) FROM reservations WHERE seat_id = 1;
INSERT INTO reservations (seat_id, user_id) VALUES (1, 200);
COMMIT;
```

---

## 격리 수준 선택 가이드

### READ UNCOMMITTED
- **사용 시기:** 거의 사용 안 함
- **예시:** 대략적인 통계 (정확도 불필요)

---

### READ COMMITTED
- **사용 시기:** 대부분의 일반적인 경우
- **예시:**
  - 게시글 조회
  - 사용자 프로필 조회
  - 대부분의 읽기 작업

---

### REPEATABLE READ
- **사용 시기:** 일관된 읽기가 중요한 경우
- **예시:**
  - 보고서 생성
  - 트랜잭션 내 여러 번 읽기
  - MySQL 기본값

---

### SERIALIZABLE
- **사용 시기:** 완전한 격리가 필요한 경우
- **예시:**
  - 금융 거래
  - 재고 관리
  - 좌석 예매

---

## 데드락 (Deadlock)

높은 격리 수준에서는 **데드락**이 발생할 수 있습니다.

### 데드락 예시

```sql
-- 트랜잭션 A
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- Lock A
-- 대기...
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- Lock B 대기

-- 트랜잭션 B
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 2;  -- Lock B
-- 대기...
UPDATE accounts SET balance = balance + 100 WHERE id = 1;  -- Lock A 대기

-- 데드락! 서로 기다림
```

---

### 데드락 방지

```sql
-- ✅ Lock 순서 통일
-- 항상 id가 작은 것부터 Lock
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- 먼저
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- 나중
COMMIT;
```

---

### 데드락 감지

```sql
-- MySQL: 데드락 자동 감지 및 롤백
-- 대기 시간 설정
SET innodb_lock_wait_timeout = 50;

-- 데드락 로그 확인
SHOW ENGINE INNODB STATUS;
```

---

## Spring에서 격리 수준 설정

```java
@Transactional(isolation = Isolation.READ_COMMITTED)
public void updateAccount(Long id, BigDecimal amount) {
    Account account = accountRepository.findById(id)
        .orElseThrow();
    account.setBalance(amount);
}

// 격리 수준별 예시
@Transactional(isolation = Isolation.READ_UNCOMMITTED)  // 거의 안 씀
@Transactional(isolation = Isolation.READ_COMMITTED)    // 기본값 추천
@Transactional(isolation = Isolation.REPEATABLE_READ)   // 일관된 읽기
@Transactional(isolation = Isolation.SERIALIZABLE)      // 완전 격리
```

---

## JPA Lock 모드

```java
// Optimistic Lock
@Lock(LockModeType.OPTIMISTIC)
Product findById(Long id);

// Pessimistic Read Lock (Shared Lock)
@Lock(LockModeType.PESSIMISTIC_READ)
Product findById(Long id);

// Pessimistic Write Lock (Exclusive Lock)
@Lock(LockModeType.PESSIMISTIC_WRITE)
Product findById(Long id);
```

```java
// 사용 예시
@Transactional
public void decreaseStock(Long productId, int quantity) {
    Product product = productRepository.findById(productId)
        .orElseThrow();

    // FOR UPDATE가 자동으로 실행됨
    product.decreaseStock(quantity);
}

// 명시적 Lock
@Transactional
public void decreaseStockWithLock(Long productId, int quantity) {
    Product product = entityManager.find(
        Product.class,
        productId,
        LockModeType.PESSIMISTIC_WRITE
    );
    product.decreaseStock(quantity);
}
```

---

## 성능 vs 정합성

```
격리 수준이 높을수록:
  정합성 ↑
  동시성 ↓
  성능 ↓

격리 수준이 낮을수록:
  정합성 ↓
  동시성 ↑
  성능 ↑
```

**트레이드오프:** 비즈니스 요구사항에 맞게 선택

---

## 요약

1. **격리 수준**: 트랜잭션 간 격리 정도
2. **4가지 수준**: READ UNCOMMITTED → READ COMMITTED → REPEATABLE READ → SERIALIZABLE
3. **동시성 문제**: Dirty Read, Non-Repeatable Read, Phantom Read
4. **기본값**: PostgreSQL/Oracle은 READ COMMITTED, MySQL은 REPEATABLE READ
5. **MVCC**: MySQL InnoDB의 Snapshot 기반 동시성 제어
6. **Lock**: FOR UPDATE로 명시적 Lock 획득
7. **데드락**: Lock 순서 통일로 방지
8. **선택 기준**: 정합성 요구사항과 성능의 균형

대부분의 경우 **READ COMMITTED**로 충분하며, 중요한 거래는 **REPEATABLE READ** 이상 또는 **명시적 Lock**을 사용합니다.