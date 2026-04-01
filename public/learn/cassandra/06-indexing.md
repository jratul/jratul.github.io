---
title: "인덱싱 전략"
order: 6
---

## 기본 인덱스 제약

Cassandra에서 `WHERE` 절에는 기본적으로 **파티션 키만** 사용 가능합니다.

```cql
-- ✅ 가능: 파티션 키로 조회
SELECT * FROM users WHERE user_id = ?;

-- ✅ 가능: 파티션 키 + 클러스터링 키로 조회
SELECT * FROM messages WHERE room_id = ? AND created_at > ?;

-- ❌ 불가: 파티션 키 없이 일반 컬럼으로 조회
SELECT * FROM users WHERE email = ?;  -- Error!
```

파티션 키 없이 조회하려면 인덱스가 필요합니다.

---

## Secondary Index (2차 인덱스)

```cql
-- 이메일로 사용자 조회를 위한 인덱스 생성
CREATE INDEX ON users (email);

-- 이제 가능
SELECT * FROM users WHERE email = 'hong@example.com';

-- 인덱스 이름 지정
CREATE INDEX users_email_idx ON users (email);

-- 인덱스 삭제
DROP INDEX users_email_idx;
```

### Secondary Index의 한계

```
Secondary Index 동작 방식:
    요청: WHERE email = 'hong@example.com'
    ↓
    코디네이터가 모든 노드에 쿼리 전송
    ↓
    각 노드가 자신의 데이터에서 email = 'hong@example.com' 검색
    ↓
    결과 합산 후 반환
```

- **카디널리티가 낮을 때 적합:** 성별(M/F), 상태값(active/inactive) 등
- **카디널리티가 높으면 비효율적:** 이메일, 이름 등 → 모든 노드 전부 스캔
- **쓰기가 많으면 성능 저하:** 인덱스도 같이 업데이트 필요

---

## Materialized View (구체화 뷰)

다른 파티션 키로 같은 데이터를 조회하고 싶을 때 사용합니다. **Cassandra가 자동으로 데이터를 동기화**합니다.

```cql
-- 기본 테이블: user_id로 조회
CREATE TABLE users (
    user_id  UUID PRIMARY KEY,
    email    TEXT,
    username TEXT,
    country  TEXT
);

-- Materialized View: email로 조회
CREATE MATERIALIZED VIEW users_by_email AS
    SELECT user_id, email, username, country
    FROM users
    WHERE email IS NOT NULL AND user_id IS NOT NULL
    PRIMARY KEY (email, user_id);    -- email이 새 파티션 키

-- country로 조회
CREATE MATERIALIZED VIEW users_by_country AS
    SELECT user_id, email, username, country
    FROM users
    WHERE country IS NOT NULL AND user_id IS NOT NULL
    PRIMARY KEY (country, user_id);
```

```cql
-- 이제 이메일로 조회 가능
SELECT * FROM users_by_email WHERE email = 'hong@example.com';

-- 국가별 사용자 조회
SELECT * FROM users_by_country WHERE country = 'KR';
```

### Materialized View 제약 및 주의사항

```
제약:
- 기본 테이블의 모든 Primary Key 컬럼이 View의 Primary Key에 포함되어야 함
- View에 새 컬럼 추가 불가 (기본 테이블 컬럼만 사용)
- WHERE 절에 IS NOT NULL 조건 필수

주의:
- 쓰기 시 기본 테이블 + View 모두 업데이트 → 쓰기 증폭
- 프로덕션에서 신중하게 사용 (Cassandra 팀도 MV 대신 수동 비정규화 권장)
```

---

## 권장 패턴: 수동 비정규화

Materialized View 대신 애플리케이션에서 여러 테이블에 직접 쓰는 방식이 더 안정적입니다.

```cql
-- 테이블 1: user_id로 조회
CREATE TABLE users_by_id (
    user_id  UUID PRIMARY KEY,
    email    TEXT,
    username TEXT
);

-- 테이블 2: email로 조회
CREATE TABLE users_by_email (
    email    TEXT PRIMARY KEY,
    user_id  UUID,
    username TEXT
);

-- 애플리케이션에서 BATCH로 동시 삽입
BEGIN BATCH
  INSERT INTO users_by_id (user_id, email, username) VALUES (?, ?, ?);
  INSERT INTO users_by_email (email, user_id, username) VALUES (?, ?, ?);
APPLY BATCH;
```

---

## SAI (Storage-Attached Index) — Cassandra 4.1+

기존 2차 인덱스보다 훨씬 효율적인 새로운 인덱스 방식입니다.

```cql
-- SAI 인덱스 생성
CREATE INDEX ON users (email) USING 'sai';
CREATE INDEX ON products (price) USING 'sai';
CREATE INDEX ON events (tags) USING 'sai';  -- 컬렉션 타입도 지원

-- 숫자 범위 쿼리도 가능
SELECT * FROM products
WHERE price >= 10000 AND price <= 50000;

-- AND 조건 조합
SELECT * FROM products
WHERE category = 'electronics'
  AND price >= 10000
  AND in_stock = true;
```

### SAI vs 기존 Secondary Index

| | Secondary Index | SAI |
|--|----------------|-----|
| 범위 쿼리 | 제한적 | 지원 |
| AND 조합 | 불가 | 가능 |
| 성능 | 낮음 | 높음 |
| 버전 | 모든 버전 | 4.1+ |
| 컬렉션 인덱스 | 제한적 | 지원 |

---

## 어떤 인덱스를 선택할까?

```
쿼리 패턴에 맞게 테이블을 새로 만들 수 있다면
    → 수동 비정규화 (가장 안정적)

파티션 키를 바꿔야 하는데 자동 동기화가 필요하다면
    → Materialized View (단, 안정성 주의)

이미 있는 테이블에서 부가적인 조회가 필요하다면 (낮은 카디널리티)
    → Secondary Index

Cassandra 4.1+이고 유연한 조회가 필요하다면
    → SAI (Storage-Attached Index)
```
