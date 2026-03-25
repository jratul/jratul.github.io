---
title: "인덱스 원리와 전략"
order: 3
---

# 인덱스 원리와 전략

쿼리가 느리면 90%는 인덱스 문제입니다. 인덱스의 원리를 이해하면 언제 만들고, 왜 안 타는지를 스스로 판단할 수 있습니다.

---

## 인덱스가 왜 필요한가?

책의 **목차나 색인(찾아보기)** 과 같은 역할입니다.

```
책에서 "PostgreSQL"이라는 단어를 찾을 때:

방법 1 (인덱스 없음): 책을 1페이지부터 끝까지 전부 읽음 → 느림
방법 2 (인덱스 있음): 색인에서 "ㅍ" 찾고 → "포스트" 찾고 → 해당 페이지로 바로 이동 → 빠름

데이터베이스도 똑같습니다:

인덱스 없는 경우 (Full Table Scan):
— 테이블의 모든 행을 처음부터 끝까지 읽음
— 100만 건: 수백 ms ~ 수 초 걸림

인덱스 있는 경우 (Index Scan):
— B-Tree 구조로 빠르게 탐색
— 100만 건: 수 ms 이내
```

---

## B-Tree 인덱스 — 가장 기본적인 인덱스

PostgreSQL과 MySQL의 기본 인덱스 타입입니다.

**B-Tree 구조 이해:**

```
인덱스 대상: users.email 컬럼

B-Tree 구조:
                   [M ~ R]
                 /         \
          [A ~ M]           [R ~ Z]
          /     \           /     \
    [A~E]  [F~M]    [R~T]  [U~Z]
     ↓       ↓        ↓       ↓
   실제행   실제행   실제행   실제행

특징:
— 항상 균형 잡힌 트리 (Balanced Tree)
— 리프 노드에 (인덱스 값, 실제 데이터 위치) 저장
— 모든 값이 정렬되어 있음
— 탐색 시간: O(log N) → 100만 건도 약 20번만 비교하면 찾음
```

**B-Tree가 지원하는 연산:**

```
✅ 사용 가능:
WHERE email = 'hong@example.com'        -- 동등 비교
WHERE amount > 10000                    -- 범위 비교
WHERE amount BETWEEN 1000 AND 50000     -- 범위
WHERE name LIKE '홍%'                   -- 앞 고정 LIKE (뒤에 %는 OK)
WHERE created_at IS NULL                -- NULL 검사
ORDER BY created_at                     -- 인덱스 순서와 같으면 정렬 불필요

❌ 사용 불가:
WHERE name LIKE '%길동'                 -- 앞 와일드카드 (맨 앞이 고정되지 않음)
WHERE UPPER(name) = '홍길동'            -- 컬럼에 함수 적용
WHERE YEAR(created_at) = 2024          -- 컬럼 변환
```

---

## 인덱스 생성과 관리

```sql
-- 기본 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
-- idx_users_email: 인덱스 이름 (관행: idx_테이블명_컬럼명)

-- 유일 인덱스 (UNIQUE 제약 조건과 동일)
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- 복합 인덱스 (두 컬럼 함께 인덱싱)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- 부분 인덱스 (조건에 맞는 행만 인덱싱)
CREATE INDEX idx_orders_pending ON orders(created_at)
WHERE status = 'PENDING';
-- PENDING 상태의 주문만 인덱스에 포함 → 크기가 훨씬 작아짐
-- "처리해야 할 주문 조회" 같은 자주 쓰는 쿼리에 최적

-- 표현식 인덱스 (컬럼 변환 결과 인덱싱)
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
-- 이 인덱스가 있으면 LOWER(email) = ... 조건도 인덱스 사용 가능

-- 운영 중 잠금 없이 생성 (CONCURRENTLY: 쿼리 차단 없음, 시간이 더 걸림)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- 인덱스 목록 확인
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users';

-- 인덱스 삭제
DROP INDEX idx_users_email;
DROP INDEX CONCURRENTLY idx_users_email;  -- 운영 중 잠금 없이 삭제
```

---

## 복합 인덱스 — 컬럼 순서가 매우 중요

복합 인덱스는 **왼쪽 컬럼부터 순서대로만** 사용됩니다. 마치 전화번호부가 성(姓) → 이름 순서로 정렬되어 있어서, 성만 알면 찾을 수 있지만 이름만 알면 찾을 수 없는 것과 같습니다.

```sql
-- 인덱스: (user_id, status, created_at) 순서로 생성
CREATE INDEX idx_orders_composite ON orders(user_id, status, created_at);

-- ✅ 인덱스 완전 활용 (선두 컬럼부터 순서대로)
WHERE user_id = 1
WHERE user_id = 1 AND status = 'PENDING'
WHERE user_id = 1 AND status = 'PENDING' AND created_at > '2024-01-01'

-- ❌ 인덱스 미사용 (선두 컬럼인 user_id 없음)
WHERE status = 'PENDING'
WHERE created_at > '2024-01-01'

-- ⚠️ 부분 사용 (user_id만 인덱스 사용, created_at은 필터링만)
WHERE user_id = 1 AND created_at > '2024-01-01'
-- user_id로 인덱스 탐색 후, 해당 범위 안에서 created_at 조건으로 필터링
```

**컬럼 순서 결정 원칙:**

```
1. 등호(=) 조건 컬럼을 앞에 배치
   WHERE user_id = 1 AND status = 'PENDING' AND created_at > ...
   → (user_id, status, created_at) 순서가 올바름
   → user_id=1이고 status='PENDING'인 범위를 좁힌 뒤 날짜 필터

2. 범위 조건(<, >, BETWEEN) 컬럼은 뒤에 배치
   범위 조건이 걸리면 그 이후 컬럼은 인덱스 효과가 떨어짐

3. 자주 조회되는 컬럼을 앞에 배치
   가장 많이 사용되는 쿼리 패턴을 기준으로 설계
```

---

## 커버링 인덱스 — 테이블을 읽지 않고 인덱스만으로 응답

일반적인 인덱스는:
1. 인덱스 탐색으로 해당 행의 **위치**를 찾음
2. 그 위치로 가서 **실제 테이블** 에서 데이터를 읽음

커버링 인덱스는 인덱스 자체에 필요한 모든 컬럼이 있어서 테이블을 읽지 않아도 됩니다.

```sql
-- users 테이블에서 활성 사용자의 이름과 이메일 자주 조회
SELECT name, email FROM users WHERE status = 'ACTIVE';

-- 커버링 인덱스: status + name + email을 모두 포함
CREATE INDEX idx_users_status_name_email ON users(status, name, email);
-- 이 인덱스가 있으면 테이블 본체에 접근 없이 인덱스만으로 응답 가능
-- → Index Only Scan → 훨씬 빠름

-- INCLUDE 절 (PostgreSQL 11+): 정렬에 포함하지 않고 인덱스에만 추가
CREATE INDEX idx_users_status ON users(status)
INCLUDE (name, email);
-- status로 탐색하되, name과 email도 인덱스에 저장 → 커버링 인덱스 효과
-- INCLUDE에 있는 컬럼은 인덱스 정렬에 영향 없음
```

---

## 특수 인덱스 타입

### BRIN 인덱스 — 대용량 시계열 데이터

```sql
-- BRIN (Block Range INdex): 물리적으로 연속된 데이터에 효과적
-- 시계열 로그처럼 시간 순서로 삽입되는 데이터에 적합

CREATE INDEX idx_logs_created_brin ON logs USING BRIN(created_at);

-- B-Tree 인덱스 대비 크기가 1/1000 수준으로 매우 작음
-- 범위 쿼리에서는 B-Tree보다 느리지만, 압도적인 크기 절약
-- 10억 건 로그 테이블에서 B-Tree 인덱스는 수 GB → BRIN은 수 MB

-- 적합한 경우:
-- - INSERT 순서와 값 순서가 대략 일치하는 컬럼 (삽입 시간 등)
-- - 조회보다 저장이 훨씬 많은 로그/이벤트 테이블
```

### GIN 인덱스 — 배열, JSONB, 전문 검색

```sql
-- JSONB 컬럼에 GIN 인덱스
CREATE INDEX idx_products_attributes ON products USING GIN(attributes);
-- attributes @> '{"color": "red"}' 같은 포함 검색에 사용

-- 배열 컬럼에 GIN 인덱스
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
-- tags @> ARRAY['java'] 같은 배열 포함 검색에 사용
```

---

## 인덱스가 작동하지 않는 경우

이 패턴들은 인덱스를 만들어도 사용되지 않습니다.

```sql
-- ❌ 컬럼에 함수 적용 → 인덱스 미사용
WHERE UPPER(name) = '홍길동'
WHERE DATE(created_at) = '2024-01-06'
WHERE YEAR(created_at) = 2024

-- ✅ 해결 방법 1: 표현식 인덱스 생성
CREATE INDEX idx_users_name_upper ON users(UPPER(name));

-- ✅ 해결 방법 2: 조건 변환 (범위로)
WHERE created_at >= '2024-01-06'
  AND created_at < '2024-01-07'


-- ❌ 앞 와일드카드 LIKE
WHERE name LIKE '%길동'   -- 앞이 고정되지 않으면 인덱스 사용 불가
WHERE name LIKE '%길%'

-- ✅ 앞 고정 LIKE는 사용 가능
WHERE name LIKE '홍%'     -- '홍'으로 시작하는 경우만 인덱스 사용

-- ✅ 전문 검색이 필요하면 Full-Text Search 기능 사용


-- ❌ 타입 불일치
WHERE id = '123'          -- id가 INTEGER인데 문자열로 비교
                           -- DB가 자동 변환하지만 인덱스 안 탈 수 있음

-- ✅ 타입 일치
WHERE id = 123


-- ❌ OR 조건 (서로 다른 컬럼)
WHERE name = '홍길동' OR email = 'hong@example.com'
-- 두 컬럼에 인덱스가 있어도 OR 조건은 효율이 낮음

-- ✅ UNION으로 분리
SELECT * FROM users WHERE name = '홍길동'
UNION
SELECT * FROM users WHERE email = 'hong@example.com';
-- 각각의 인덱스를 따로 활용 후 합침
```

---

## 인덱스 성능 모니터링

```sql
-- 인덱스 크기 확인
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexname::text)) AS 인덱스크기
FROM pg_indexes
WHERE tablename = 'orders'
ORDER BY pg_relation_size(indexname::text) DESC;


-- 사용되지 않는 인덱스 찾기 (운영 환경에서 확인)
-- 인덱스는 INSERT/UPDATE/DELETE 성능을 저하시키므로, 안 쓰는 인덱스는 삭제
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS 사용횟수    -- 이게 0이면 한 번도 사용 안 됨
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;


-- 인덱스 재구축 (인덱스가 비대해졌을 때)
REINDEX INDEX idx_users_email;          -- 특정 인덱스
REINDEX TABLE users;                    -- 테이블 전체 인덱스
REINDEX CONCURRENTLY TABLE users;       -- 잠금 없이 재구축 (PostgreSQL 12+)
```

---

## 실전 인덱스 설계 예시

```sql
-- 쇼핑몰 서비스 인덱스 설계

-- [users 테이블]
-- 이메일로 로그인할 때 사용
CREATE UNIQUE INDEX idx_users_email ON users(email);
-- 활성 사용자만 인덱스 (관리자 화면에서 주로 활성 사용자 검색)
CREATE INDEX idx_users_status_created ON users(status, created_at DESC)
    WHERE status != 'DELETED';

-- [orders 테이블]
-- JOIN에서 user_id로 주문 조회 (가장 많이 쓰는 쿼리)
CREATE INDEX idx_orders_user_id ON orders(user_id);
-- 상태별 최신 주문 목록 (관리자 화면: "처리 대기 중인 주문 목록")
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
-- 특정 사용자의 특정 상태 주문 (내 주문 목록)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- [products 테이블]
-- 카테고리별 상품 목록 (가장 흔한 조회)
CREATE INDEX idx_products_category ON products(category_id)
    WHERE status = 'ON_SALE';
-- 상품명 검색 (앞 고정 LIKE 지원)
CREATE INDEX idx_products_name ON products(name);

-- [대용량 로그 테이블]
-- 시간 기반 범위 조회 (BRIN이 더 효율적)
CREATE INDEX idx_logs_created_brin ON access_logs USING BRIN(created_at);
-- 특정 사용자 + 심각도 이상의 로그 조회
CREATE INDEX idx_logs_user_level ON access_logs(user_id, level)
    WHERE level IN ('WARN', 'ERROR');
```

---

## 인덱스 설계 체크리스트

```
새 쿼리를 작성할 때:
□ WHERE 절에 자주 쓰이는 컬럼에 인덱스가 있는가?
□ JOIN에 사용되는 외래키 컬럼에 인덱스가 있는가?
□ ORDER BY 컬럼에 인덱스가 있는가?

복합 인덱스 설계:
□ 등호(=) 조건 컬럼이 앞에 있는가?
□ 가장 자주 쓰이는 쿼리 패턴에 맞게 설계되었는가?
□ 커버링 인덱스로 만들 수 있는가?

인덱스 관리:
□ 사용되지 않는 인덱스가 있지는 않은가? (pg_stat_user_indexes)
□ 인덱스가 너무 많아 INSERT/UPDATE 성능이 저하되지는 않는가?
□ 대용량 테이블에서 적절한 인덱스 타입(BRIN, GIN 등)을 사용하는가?
```
