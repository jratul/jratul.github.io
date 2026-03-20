---
title: "인덱스 원리와 전략"
order: 3
---

# 인덱스 원리와 전략

쿼리가 느리면 90%는 인덱스 문제다. 원리를 알아야 제대로 설계할 수 있다.

---

## 인덱스 없을 때

```
Full Table Scan:
테이블 전체를 처음부터 끝까지 읽음
— 100만 건: 수백 ms ~ 수 초
— 인덱스 있으면: 수 ms
```

---

## B-Tree 인덱스 (기본)

대부분의 인덱스는 B-Tree 구조.

```
B-Tree 구조:
루트 노드 → 브랜치 노드 → 리프 노드

리프 노드에 (키값, 데이터 위치 포인터) 저장
키값은 정렬되어 있음

탐색:
— 루트에서 시작
— 값과 비교하며 하위 노드로 이동
— O(log n) 시간복잡도

지원하는 연산:
✅ = (동등 비교)
✅ <, >, <=, >= (범위 비교)
✅ BETWEEN
✅ LIKE 'abc%' (앞 고정)
✅ IS NULL
✅ ORDER BY (인덱스 순서와 같으면)
❌ LIKE '%abc' (앞 와일드카드)
❌ 함수 적용: UPPER(name) = 'JOHN'
```

---

## 인덱스 생성

```sql
-- 기본 인덱스
CREATE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_email ON users(email);  -- 유일 인덱스

-- 복합 인덱스
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- 부분 인덱스 (조건부)
CREATE INDEX idx_orders_pending ON orders(created_at)
WHERE status = 'PENDING';
-- 활성 주문만 인덱스화 → 크기 대폭 감소

-- 표현식 인덱스
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
-- SELECT * FROM users WHERE LOWER(email) = 'john@example.com' 에서 사용

-- 인덱스 동시 생성 (운영 중 잠금 없이)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- 인덱스 삭제
DROP INDEX idx_users_email;
DROP INDEX CONCURRENTLY idx_users_email;  -- 운영 중 삭제

-- 인덱스 목록 확인
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'users';
```

---

## 복합 인덱스 (컬럼 순서가 중요!)

```sql
-- 인덱스: (user_id, status, created_at)

-- ✅ 사용됨: 선두 컬럼부터 순서대로
WHERE user_id = 1
WHERE user_id = 1 AND status = 'PENDING'
WHERE user_id = 1 AND status = 'PENDING' AND created_at > '2024-01-01'

-- ❌ 사용 안 됨: 선두 컬럼 생략
WHERE status = 'PENDING'
WHERE created_at > '2024-01-01'

-- ⚠️ 부분 사용: 선두 컬럼만 사용 (나머지는 필터만)
WHERE user_id = 1 AND created_at > '2024-01-01'
-- user_id로 인덱스 사용, created_at은 필터링만

-- 컬럼 순서 결정 원칙:
-- 1. 등호(=) 조건 컬럼을 앞에
-- 2. 범위 조건 컬럼을 뒤에
-- 3. 카디널리티 높은 컬럼 앞에 (선택도 높은 것)
-- 4. 쿼리 패턴에 맞게
```

---

## 커버링 인덱스

쿼리에 필요한 컬럼을 인덱스가 모두 포함 → 테이블 접근 없이 인덱스만으로 응답.

```sql
-- users 테이블에 인덱스: (status, name, email)
SELECT name, email FROM users WHERE status = 'ACTIVE';

-- 인덱스에 name, email이 모두 있어서 테이블 row fetch 없음
-- Index Only Scan → 매우 빠름

-- INCLUDE 절 (PostgreSQL 11+)
CREATE INDEX idx_users_status ON users(status)
INCLUDE (name, email);  -- 인덱스에 포함하지만 정렬에는 안 씀
```

---

## 해시 인덱스

```sql
-- 동등 비교만 지원, 범위 불가
CREATE INDEX idx_users_email_hash ON users USING HASH(email);

-- = 연산만 쓰면 B-Tree보다 약간 빠름
-- 하지만 PostgreSQL B-Tree도 충분히 빠름 → 해시 인덱스 잘 안 씀
```

---

## BRIN 인덱스

물리적으로 연속된 데이터에 유리. 시계열 데이터.

```sql
-- 생성 날짜 기준 (삽입 순서와 일치)
CREATE INDEX idx_logs_created_brin ON logs USING BRIN(created_at);
-- 크기가 매우 작음 (B-Tree의 1/1000 수준)
-- 대용량 로그 테이블에 효과적
```

---

## 인덱스를 타지 않는 경우

```sql
-- ❌ 컬럼에 함수 적용
WHERE UPPER(name) = 'JOHN'        -- 표현식 인덱스로 해결
WHERE DATE(created_at) = '2024-01-06'  -- 범위로 변환
-- ✅ 변환:
WHERE created_at >= '2024-01-06' AND created_at < '2024-01-07'

-- ❌ 앞 와일드카드
WHERE name LIKE '%john%'           -- Full Text Search 사용
WHERE name LIKE '%john'

-- ✅ 앞 고정 와일드카드는 사용됨
WHERE name LIKE 'john%'

-- ❌ 타입 불일치
WHERE id = '123'  -- id가 INTEGER인데 문자열로 비교
-- 암묵적 타입 변환으로 인덱스 미사용 가능

-- ❌ OR 조건 (다른 컬럼 간)
WHERE name = 'John' OR email = 'john@example.com'
-- ✅ UNION으로 분리:
SELECT * FROM users WHERE name = 'John'
UNION
SELECT * FROM users WHERE email = 'john@example.com'

-- ❌ NOT IN, NOT EXISTS (경우에 따라)
-- ✅ 인덱스 있는 컬럼으로 필터링 후 제외 검토
```

---

## 인덱스 관리

```sql
-- 인덱스 크기 확인
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexname::text)) AS size
FROM pg_indexes
WHERE tablename = 'orders'
ORDER BY pg_relation_size(indexname::text) DESC;

-- 사용되지 않는 인덱스 찾기 (운영 환경에서)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,     -- 인덱스 스캔 횟수
    idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- 인덱스 재구축 (bloat 제거)
REINDEX INDEX idx_users_email;
REINDEX TABLE users;        -- 테이블 전체 인덱스
REINDEX CONCURRENTLY TABLE users;  -- 잠금 없이
```

---

## 실전 인덱스 설계

```sql
-- 주문 서비스 예시

-- users 테이블
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status) WHERE status != 'DELETED';

-- orders 테이블
CREATE INDEX idx_orders_user_id ON orders(user_id);  -- JOIN 기본
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
-- WHERE status = 'PENDING' ORDER BY created_at DESC 최적화

CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- WHERE user_id = ? AND status = ?

-- 대용량 로그 테이블
CREATE INDEX idx_logs_created_brin ON logs USING BRIN(created_at);
CREATE INDEX idx_logs_user_level ON logs(user_id, level) WHERE level >= 'WARN';
```
