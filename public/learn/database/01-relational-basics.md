---
title: "관계형 DB 기본"
order: 1
---

# 관계형 DB 기본

테이블, 키, 관계형 모델의 기초. ORM을 써도 이걸 알아야 제대로 쓸 수 있다.

---

## 관계형 모델

```
데이터를 테이블(행 + 열) 형태로 저장
각 행은 고유하게 식별 가능 (기본키)
테이블 간 관계를 외래키로 표현

장점:
✅ 데이터 정합성 (제약 조건)
✅ 트랜잭션 (ACID)
✅ SQL로 유연한 조회
✅ 정규화로 중복 제거

단점:
❌ 스키마 변경 어려움
❌ 수평 확장(샤딩) 복잡
❌ 비정형 데이터 처리 어려움
```

---

## 키 (Key)

```
기본키 (Primary Key):
— 각 행을 유일하게 식별
— NOT NULL, UNIQUE 자동 적용
— 한 테이블에 하나만

후보키 (Candidate Key):
— 기본키가 될 수 있는 컬럼들
— email, phone 등 유일성 보장 컬럼

대리키 (Surrogate Key):
— 비즈니스와 무관한 인공 키 (id, UUID)
— 변경 가능성 없음, JOIN 성능 좋음

자연키 (Natural Key):
— 비즈니스 의미 있는 키 (주민번호, 이메일)
— 변경 가능성 있어 주의

외래키 (Foreign Key):
— 다른 테이블의 기본키 참조
— 참조 무결성 보장
— ON DELETE, ON UPDATE 동작 설정

복합키 (Composite Key):
— 여러 컬럼 조합으로 기본키 구성
— 다대다 관계 테이블에서 자주 사용
```

---

## 테이블 관계

```
1:1 (일대일):
— user ← user_profile
— 잘 안 씀. 같은 테이블로 합치는 게 보통 낫다.
— 보안상 분리가 필요할 때 사용 (민감 정보)

1:N (일대다):
— 가장 흔한 관계
— user(1) ← orders(N)
— 외래키가 N쪽 테이블에 위치

M:N (다대다):
— 중간 테이블(연결 테이블)로 구현
— user ↔ user_roles ↔ roles
— 연결 테이블에 추가 속성 가능
```

---

## 데이터 타입 (PostgreSQL)

```sql
-- 숫자
SMALLINT        -- 2바이트, -32768 ~ 32767
INTEGER         -- 4바이트, 약 ±21억
BIGINT          -- 8바이트, 약 ±922경
NUMERIC(p, s)   -- 정밀 소수 (돈, 세금)
DECIMAL(p, s)   -- NUMERIC 동의어
REAL            -- 4바이트 부동소수
DOUBLE PRECISION -- 8바이트 부동소수

-- 문자
VARCHAR(n)      -- 가변 길이 (최대 n)
CHAR(n)         -- 고정 길이
TEXT            -- 무제한 길이 (PostgreSQL에서 VARCHAR 대신 권장)

-- 날짜/시간
DATE            -- 날짜 (2024-01-06)
TIME            -- 시간 (10:00:00)
TIMESTAMP       -- 날짜+시간
TIMESTAMPTZ     -- 타임존 포함 (운영 DB 권장!)
INTERVAL        -- 시간 간격

-- 기타
BOOLEAN         -- true/false
UUID            -- UUID (gen_random_uuid())
JSONB           -- JSON 바이너리 (인덱스 지원)
ARRAY           -- 배열 타입
```

---

## 제약 조건

```sql
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,           -- 자동 증가 기본키
    email       VARCHAR(255) UNIQUE NOT NULL,    -- 유일, 필수
    name        VARCHAR(100) NOT NULL,
    age         INTEGER CHECK (age >= 0 AND age <= 150),
    status      VARCHAR(20) DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE', 'INACTIVE', 'BANNED')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 외래키 (참조 무결성)
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT    -- 사용자 삭제 시 주문 있으면 실패
        ON UPDATE CASCADE     -- 사용자 ID 변경 시 자동 반영
);

-- 외래키 ON DELETE 옵션:
-- RESTRICT  — 참조하는 데이터 있으면 삭제 불가
-- CASCADE   — 같이 삭제
-- SET NULL  — NULL로 설정
-- SET DEFAULT — 기본값으로 설정
-- NO ACTION — RESTRICT와 유사 (트랜잭션 끝에 검사)
```

---

## 기본 SQL

```sql
-- 데이터 조회
SELECT id, name, email FROM users WHERE status = 'ACTIVE';
SELECT * FROM users ORDER BY created_at DESC LIMIT 10 OFFSET 20;

-- 집계
SELECT status, COUNT(*) FROM users GROUP BY status;
SELECT status, COUNT(*) FROM users GROUP BY status HAVING COUNT(*) > 10;

-- 삽입
INSERT INTO users (email, name) VALUES ('john@example.com', 'John');
INSERT INTO users (email, name)
VALUES ('alice@example.com', 'Alice'),
       ('bob@example.com', 'Bob');

-- 수정
UPDATE users SET name = 'John Doe', updated_at = NOW()
WHERE id = 123;

-- 삭제
DELETE FROM users WHERE id = 123;
DELETE FROM users WHERE status = 'INACTIVE'
    AND created_at < NOW() - INTERVAL '1 year';

-- Upsert (INSERT OR UPDATE)
INSERT INTO users (email, name)
VALUES ('john@example.com', 'John Updated')
ON CONFLICT (email)
DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
```

---

## 트랜잭션 기본

```sql
BEGIN;

UPDATE accounts SET balance = balance - 10000 WHERE id = 1;
UPDATE accounts SET balance = balance + 10000 WHERE id = 2;

-- 문제 없으면
COMMIT;

-- 문제 있으면
ROLLBACK;

-- 저장점 (부분 롤백)
BEGIN;
SAVEPOINT sp1;
UPDATE users SET name = 'A' WHERE id = 1;

SAVEPOINT sp2;
UPDATE users SET name = 'B' WHERE id = 2;

ROLLBACK TO sp2;  -- sp2 이후만 롤백
COMMIT;           -- sp1까지는 커밋
```
