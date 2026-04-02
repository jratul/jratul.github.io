---
title: "Database 면접 예상 질문"
order: 11
---

# Database 면접 예상 질문

데이터베이스 설계 및 SQL 면접에서 빈출되는 핵심 질문들입니다.

## Q1. 인덱스(Index)란 무엇이고 어떻게 동작하나요?

인덱스는 **조회 속도를 높이기 위한 자료구조**입니다. 책의 목차처럼 특정 컬럼 값으로 빠르게 행을 찾을 수 있게 합니다.

**B-Tree 인덱스 (기본):**

B-Tree (Balanced Tree - 균형 이진 트리)는 모든 리프 노드가 같은 깊이를 유지하는 자료구조로, 대부분의 RDBMS (Relational Database Management System - 관계형 데이터베이스 관리 시스템)가 기본 인덱스 구조로 사용합니다.
```
일반 조회: O(N) — 전체 테이블 스캔
인덱스 조회: O(log N) — B-Tree 탐색
```

**인덱스의 트레이드오프:**

✅ SELECT 성능 향상
❌ INSERT/UPDATE/DELETE 시 인덱스도 갱신 → 쓰기 성능 저하
❌ 추가 저장공간 필요

```sql
-- 단일 컬럼 인덱스
CREATE INDEX idx_user_email ON users(email);

-- 복합 인덱스 (순서가 중요!)
CREATE INDEX idx_order_user_date ON orders(user_id, created_at);

-- 커버링 인덱스 (인덱스만으로 쿼리 완료)
SELECT user_id, created_at FROM orders WHERE user_id = 1;
```

---

## Q2. 트랜잭션의 ACID 특성을 설명해주세요

ACID (Atomicity, Consistency, Isolation, Durability - 원자성, 일관성, 격리성, 지속성)는 데이터베이스 트랜잭션이 안전하게 수행되는 것을 보장하기 위한 4가지 속성입니다.

| 특성 | 의미 | 예시 |
|-----|------|------|
| **Atomicity** (원자성) | 전부 성공 또는 전부 실패 | 이체: 출금+입금 모두 성공해야 커밋 |
| **Consistency** (일관성) | 트랜잭션 전후로 데이터 무결성 유지 | 제약 조건 항상 만족 |
| **Isolation** (격리성) | 동시 트랜잭션은 서로 독립 | 중간 결과 다른 트랜잭션에 노출 안 됨 |
| **Durability** (지속성) | 커밋된 데이터는 영구 보존 | 시스템 오류 후에도 커밋 결과 유지 |

---

## Q3. 트랜잭션 격리 수준(Isolation Level)을 설명해주세요

| 레벨 | Dirty Read | Non-Repeatable Read | Phantom Read |
|-----|-----------|--------------------|----|
| READ UNCOMMITTED | 가능 | 가능 | 가능 |
| **READ COMMITTED** | 방지 | 가능 | 가능 |
| REPEATABLE READ | 방지 | 방지 | 가능 (MySQL InnoDB는 방지) |
| SERIALIZABLE | 방지 | 방지 | 방지 |

- **Dirty Read:** 커밋 안 된 데이터 읽음
- **Non-Repeatable Read:** 같은 쿼리 두 번 실행 시 결과 다름
- **Phantom Read:** 같은 범위 조회 시 행 수가 달라짐

**MySQL InnoDB 기본값:** `REPEATABLE READ` (MVCC - Multi-Version Concurrency Control, 다중 버전 동시성 제어로 Phantom Read도 방지)
**PostgreSQL 기본값:** `READ COMMITTED`

---

## Q4. 정규화(Normalization)란 무엇이고 1NF~3NF를 설명하세요

정규화는 **데이터 중복을 제거하고 이상(anomaly - 삽입/수정/삭제 시 발생하는 데이터 불일치)을 방지**하기 위한 테이블 설계 과정입니다.

**1NF (1정규형):** 원자값만 허용, 반복 그룹 제거

```
❌ 비정규: orders(id, product_ids: "1,2,3")
✅ 1NF:   order_items(order_id, product_id)
```

**2NF (2정규형):** 1NF + 부분 함수 종속 제거 (복합 PK일 때 적용)

부분 함수 종속이란 복합 기본 키(PK - Primary Key)의 일부 컬럼에만 종속된 컬럼이 존재하는 것을 의미합니다.

```
❌ order_items(order_id, product_id, product_name)  — product_name은 product_id에만 종속
✅ products(product_id, product_name)
   order_items(order_id, product_id, quantity)
```

**3NF (3정규형):** 2NF + 이행적 종속 제거

이행적 종속이란 A → B → C처럼 기본 키가 아닌 컬럼을 거쳐 다른 컬럼에 종속되는 관계를 의미합니다.

```
❌ employees(emp_id, dept_id, dept_name)  — dept_name → dept_id에 종속
✅ departments(dept_id, dept_name)
   employees(emp_id, dept_id)
```

---

## Q5. JOIN 종류를 설명해주세요

```sql
-- INNER JOIN: 양쪽 모두에 일치하는 행만
SELECT u.name, o.amount
FROM users u
INNER JOIN orders o ON u.id = o.user_id;

-- LEFT JOIN: 왼쪽 테이블 모두 + 오른쪽 일치하는 행
-- 주문 없는 사용자도 포함
SELECT u.name, o.amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- FULL OUTER JOIN: 양쪽 모두 (MySQL은 지원 안 함, UNION으로 구현)
```

**실행 계획에서 JOIN 타입:**
- `Nested Loop`: 소규모 데이터에 적합
- `Hash Join`: 대용량 테이블 JOIN (인덱스 없을 때)
- `Merge Join`: 정렬된 데이터에 적합

---

## Q6. N+1 문제를 SQL 관점에서 어떻게 해결하나요?

N+1 문제란 1번의 쿼리로 N개의 레코드를 가져온 후, 각 레코드에 대해 추가로 N번의 쿼리를 실행하는 비효율적인 패턴입니다.

```sql
-- N+1 발생 패턴
SELECT * FROM teams;                    -- 1번
SELECT * FROM members WHERE team_id=1;  -- N번 반복...

-- 해결 1: JOIN으로 한 번에 조회
SELECT t.*, m.*
FROM teams t
LEFT JOIN members m ON t.id = m.team_id;

-- 해결 2: IN 절로 배치 조회
SELECT * FROM members WHERE team_id IN (1, 2, 3, ...);
```

---

## Q7. 인덱스를 타지 않는 경우는?

```sql
-- 1. 함수 적용
WHERE YEAR(created_at) = 2024  ❌
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'  ✅

-- 2. 암묵적 형변환
WHERE user_id = '1'   -- user_id가 INT인데 문자열로 비교 ❌

-- 3. LIKE 와일드카드 앞 배치
WHERE name LIKE '%Alice'  ❌
WHERE name LIKE 'Alice%'  ✅

-- 4. OR 조건 (인덱스 범위를 넓힘)
WHERE age = 20 OR name = 'Alice'  ❌ (적절한 인덱스 없으면)

-- 5. 복합 인덱스에서 선두 컬럼 미사용
-- INDEX (a, b, c) 일 때
WHERE b = 1 AND c = 2  ❌ (a 없음)
WHERE a = 1 AND c = 2  ✅ (a 사용, c는 인덱스 범위 제한 안 됨)
```

---

## Q8. DB 샤딩과 파티셔닝의 차이는?

**파티셔닝:** 하나의 DB 내에서 테이블을 물리적으로 분할

```sql
-- 날짜 기반 파티셔닝
CREATE TABLE orders (
    id BIGINT,
    created_at DATE
) PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025)
);
```

**샤딩(Sharding):** 데이터를 **여러 DB 서버**에 분산하는 수평 파티셔닝 기법

```
User 1~1000만 → DB Server 1
User 1001만~2000만 → DB Server 2
```

| 비교 | 파티셔닝 | 샤딩 |
|-----|---------|------|
| 범위 | 단일 DB | 다중 DB 서버 |
| 복잡도 | 낮음 | 높음 (Cross-shard 쿼리 어려움) |
| 확장성 | 수직 확장 | 수평 확장 |
