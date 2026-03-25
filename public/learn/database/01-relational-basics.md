---
title: "관계형 DB 기본"
order: 1
---

# 관계형 DB 기본

데이터베이스는 **데이터를 체계적으로 저장하고 꺼내 쓰는 창고**입니다. 관계형 데이터베이스(RDBMS)는 그 중에서도 가장 널리 쓰이는 방식으로, 엑셀 스프레드시트처럼 행(row)과 열(column)로 구성된 **테이블** 형태로 데이터를 저장합니다.

ORM(JPA 등)을 써도 테이블 구조와 키, 관계의 개념을 알아야 올바르게 설계하고 문제를 해결할 수 있습니다.

---

## 관계형 모델이란?

관계형 데이터베이스가 어떤 방식으로 데이터를 저장하는지 핵심 개념을 먼저 짚어봅니다.

**테이블 = 엑셀 시트**라고 생각하면 쉽습니다. 각 열(column)은 속성(이름, 나이, 이메일 등)을 나타내고, 각 행(row)은 하나의 데이터 항목(한 사람의 정보)을 나타냅니다.

```
[users 테이블 예시]

id  | name    | email              | status
----|---------|--------------------|--------
1   | 홍길동   | hong@example.com   | ACTIVE
2   | 김영희   | kim@example.com    | ACTIVE
3   | 이철수   | lee@example.com    | INACTIVE
```

**관계형 모델의 핵심 특징:**

```
테이블(Table):
— 데이터를 행 + 열 형태로 저장
— 하나의 테이블은 하나의 주제를 담당 (사용자, 상품, 주문 등)
— 엑셀에서 하나의 시트와 비슷

장점:
✅ 데이터 정합성 — 제약 조건으로 잘못된 데이터 원천 차단
✅ 트랜잭션(ACID) — 은행 이체처럼 "전부 성공 or 전부 실패" 보장
✅ SQL — 어떤 조건으로든 자유롭게 데이터 조회 가능
✅ 정규화 — 중복 데이터 없이 깔끔하게 설계 가능

단점:
❌ 스키마 변경 — 컬럼 추가/삭제 시 마이그레이션 필요
❌ 수평 확장 — 서버를 여러 대로 나누는 샤딩이 복잡
❌ 비정형 데이터 — JSON, 비정형 로그 처리에 비교적 불리
```

---

## 키(Key)의 종류

키는 **행을 식별하거나 테이블 간 관계를 연결하는 데 사용**됩니다.

```
기본키 (Primary Key, PK):
— 각 행을 유일하게 식별하는 컬럼
— 값이 중복될 수 없고(UNIQUE), 비어있을 수 없음(NOT NULL)
— 한 테이블에 반드시 하나만 존재
— 예: users 테이블의 id

예시) id가 1인 사용자는 딱 한 명만 존재해야 함
```

```
후보키 (Candidate Key):
— 기본키가 될 수 있는 컬럼들
— 유일성(UNIQUE)과 최소성을 만족
— 예: email, 주민번호 (둘 다 유일하지만 기본키는 하나만 선택)
```

```
대리키 (Surrogate Key):
— 비즈니스와 무관한 인공 키 (id, UUID)
— 자동 증가(BIGSERIAL, AUTO_INCREMENT) 또는 UUID 사용
— 변경될 일이 없어서 JOIN 성능이 좋고 관리가 쉬움
— 실무에서 가장 많이 사용

자연키 (Natural Key):
— 비즈니스 의미가 있는 키 (이메일, 주민번호, 사원번호)
— "이메일은 절대 안 바뀌겠지" 싶어도 나중에 바뀔 수 있음
— 기본키로 쓰면 나중에 변경 시 연결된 모든 테이블도 수정 필요
```

```
외래키 (Foreign Key, FK):
— 다른 테이블의 기본키를 참조하는 컬럼
— 테이블 간 관계를 나타냄
— 참조 무결성 보장: 존재하지 않는 ID를 외래키로 등록 불가

예시)
orders.user_id → users.id 참조
→ 존재하지 않는 user_id로 주문을 생성하면 오류 발생
```

```
복합키 (Composite Key):
— 여러 컬럼을 조합해서 기본키로 사용
— 다대다(M:N) 관계의 연결 테이블에서 주로 사용

예시) 장바구니 테이블: (user_id, product_id) 조합이 기본키
→ 같은 사용자가 같은 상품을 두 번 담을 수 없음
```

---

## 테이블 관계 (1:1, 1:N, M:N)

실제 세계의 관계를 데이터베이스로 표현하는 방법입니다.

**1:N (일대다) — 가장 흔한 관계**

```
사용자(users) 1명이 여러 개의 주문(orders)을 가질 수 있다.

users               orders
------              ------
id: 1    ←──┬──── user_id: 1 (주문 A)
name: 홍길동  ├──── user_id: 1 (주문 B)
            └──── user_id: 1 (주문 C)

규칙: 외래키(user_id)는 항상 "N" 쪽 테이블(orders)에 위치합니다.
```

**1:1 (일대일)**

```
사용자(users)와 사용자 상세정보(user_profiles)가 1:1 관계
→ 한 사용자에 하나의 프로필만 존재

언제 씀: 민감한 정보(주민번호, 결제정보)를 별도 테이블로 분리할 때
대부분은 같은 테이블에 합치는 게 더 단순함
```

**M:N (다대다)**

```
학생(students) 여러 명이 수업(courses) 여러 개를 수강할 수 있다.

DB에서는 직접 M:N을 표현할 수 없음
→ 중간에 연결 테이블(enrollments)을 만들어 해결

students      enrollments        courses
--------      -----------        -------
id: 1    ──→ student_id: 1  ←── id: 101
id: 2        course_id: 101     id: 102
             student_id: 1
             course_id: 102
             student_id: 2
             course_id: 101
```

---

## 데이터 타입 (PostgreSQL 기준)

컬럼에 어떤 종류의 데이터를 저장할지 타입을 지정합니다. 적절한 타입 선택이 성능과 데이터 정합성에 큰 영향을 미칩니다.

```sql
-- 숫자 타입
SMALLINT         -- 작은 정수 (-32,768 ~ 32,767), 2바이트
INTEGER          -- 일반 정수 (약 ±21억), 4바이트
BIGINT           -- 큰 정수 (약 ±922경), 8바이트 ← ID에 권장
NUMERIC(12, 2)   -- 정밀 소수: 12자리 중 소수점 2자리 → 금액에 사용
                 -- 예: 9999999999.99 (최대 약 100억)
REAL             -- 부동소수점 (근사값), 과학 계산용
DOUBLE PRECISION -- 더 정밀한 부동소수점

-- 문자 타입
VARCHAR(100)     -- 가변 길이 문자열 (최대 100자)
CHAR(10)         -- 고정 길이 (항상 10자, 짧으면 공백 패딩)
TEXT             -- 길이 제한 없음 ← PostgreSQL에서 VARCHAR 대신 권장

-- 날짜/시간 타입
DATE             -- 날짜만 (2024-01-06)
TIME             -- 시간만 (10:30:00)
TIMESTAMP        -- 날짜+시간 (타임존 없음)
TIMESTAMPTZ      -- 날짜+시간+타임존 ← 운영 서버에서 반드시 사용!
                 -- 서버가 한국에 있어도 UTC로 저장, 조회 시 변환

-- 기타
BOOLEAN          -- true / false
UUID             -- 범용 고유 식별자 (예: 550e8400-e29b-41d4...)
JSONB            -- JSON 바이너리 저장 (인덱스 지원, 빠름)
TEXT[]           -- 텍스트 배열 타입
```

**자주 하는 실수:**
```sql
-- ❌ 금액에 FLOAT 사용 → 소수점 오차 발생!
price REAL  -- 1000.10을 저장했다가 1000.0999999 로 나올 수 있음

-- ✅ 금액에는 반드시 NUMERIC 사용
price NUMERIC(12, 2)  -- 정확한 소수점 계산 보장

-- ❌ TIMESTAMP (타임존 없음) → 서머타임, 지역 차이 문제
created_at TIMESTAMP

-- ✅ 운영 환경에서는 항상 타임존 포함
created_at TIMESTAMPTZ DEFAULT NOW()
```

---

## 제약 조건 (Constraints)

제약 조건은 **잘못된 데이터가 DB에 들어오는 것을 막는 규칙**입니다. 애플리케이션 코드보다 DB 레벨에서 막는 것이 더 안전합니다.

```sql
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,           -- 자동 증가 정수 + 기본키
    email       VARCHAR(255) UNIQUE NOT NULL,    -- 중복 불가 + 필수 입력
    name        VARCHAR(100) NOT NULL,           -- 필수 입력
    age         INTEGER CHECK (age >= 0 AND age <= 150),  -- 범위 제한
    status      VARCHAR(20) DEFAULT 'ACTIVE'             -- 기본값 설정
                CHECK (status IN ('ACTIVE', 'INACTIVE', 'BANNED')),  -- 허용값 제한
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- 현재 시각 자동 입력
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 설명:
-- BIGSERIAL: 1, 2, 3... 자동으로 증가하는 숫자
-- UNIQUE: 같은 값이 두 번 들어올 수 없음
-- NOT NULL: 반드시 값이 있어야 함
-- CHECK: 조건을 만족해야 저장 가능
-- DEFAULT: 값을 입력하지 않으면 자동으로 들어갈 기본값
```

```sql
CREATE TABLE orders (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),  -- 0보다 커야 함
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 외래키 제약 조건
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT    -- users에서 사용자 삭제 시, 주문이 있으면 삭제 불가
        ON UPDATE CASCADE     -- users의 id가 변경되면 orders의 user_id도 자동 변경
);

-- ON DELETE 옵션 설명:
-- RESTRICT  : 참조하는 데이터가 있으면 삭제 불가 (가장 안전)
-- CASCADE   : 참조하는 데이터도 같이 삭제 (게시글 삭제 시 댓글도 삭제)
-- SET NULL  : 참조하는 컬럼을 NULL로 변경
-- SET DEFAULT: 기본값으로 변경
-- NO ACTION : RESTRICT와 유사하지만 트랜잭션이 끝날 때 검사
```

---

## 기본 SQL — CRUD

데이터를 다루는 4가지 기본 작업입니다. (Create, Read, Update, Delete)

```sql
-- ===== 데이터 조회 (SELECT) =====

-- 전체 조회
SELECT id, name, email FROM users WHERE status = 'ACTIVE';

-- 최신순 10건, 3페이지 (21~30번째)
SELECT * FROM users
ORDER BY created_at DESC
LIMIT 10 OFFSET 20;
-- LIMIT: 최대 몇 건 가져올지
-- OFFSET: 앞에서 몇 건 건너뛸지

-- 집계: 상태별 사용자 수
SELECT status, COUNT(*) AS user_count
FROM users
GROUP BY status;
-- 결과: ACTIVE: 150명, INACTIVE: 30명, BANNED: 5명

-- 집계 결과 필터링 (HAVING은 GROUP BY 후 필터)
SELECT status, COUNT(*) AS cnt
FROM users
GROUP BY status
HAVING COUNT(*) > 10;  -- 10명 초과인 상태만 표시
```

```sql
-- ===== 데이터 삽입 (INSERT) =====

-- 단건 삽입
INSERT INTO users (email, name)
VALUES ('hong@example.com', '홍길동');

-- 다건 삽입 (한 번에 여러 행)
INSERT INTO users (email, name)
VALUES
    ('alice@example.com', 'Alice'),
    ('bob@example.com', 'Bob'),
    ('charlie@example.com', 'Charlie');

-- Upsert: 없으면 삽입, 있으면 업데이트
INSERT INTO users (email, name)
VALUES ('hong@example.com', '홍길동 수정')
ON CONFLICT (email)
DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
-- EXCLUDED: 삽입하려고 했던 값
```

```sql
-- ===== 데이터 수정 (UPDATE) =====

-- 특정 행 수정
UPDATE users
SET name = '홍길동', updated_at = NOW()
WHERE id = 123;

-- 여러 조건으로 수정
UPDATE orders
SET status = 'CANCELLED'
WHERE status = 'PENDING'
  AND created_at < NOW() - INTERVAL '7 days';
-- 7일이 지난 PENDING 주문을 모두 CANCELLED로 변경
```

```sql
-- ===== 데이터 삭제 (DELETE) =====

-- 특정 행 삭제
DELETE FROM users WHERE id = 123;

-- 조건에 맞는 여러 행 삭제
DELETE FROM users
WHERE status = 'INACTIVE'
  AND created_at < NOW() - INTERVAL '1 year';
-- 1년 이상 된 비활성 사용자 삭제
```

**자주 하는 실수:**
```sql
-- ❌ WHERE 조건 없이 UPDATE/DELETE → 모든 데이터 수정/삭제!
UPDATE users SET status = 'BANNED';    -- 전체 사용자가 BANNED!!
DELETE FROM users;                      -- 모든 사용자 삭제!!

-- ✅ 항상 WHERE 조건을 먼저 SELECT로 확인 후 실행
SELECT * FROM users WHERE id = 123;        -- 먼저 확인
UPDATE users SET status = 'BANNED' WHERE id = 123;  -- 그 다음 수정
```

---

## 트랜잭션 기본

트랜잭션은 **여러 작업을 하나의 단위로 묶어서 "전부 성공 or 전부 실패"를 보장**하는 기능입니다.

**왜 필요한가?**

```
계좌 이체 예시:
1. A 계좌에서 10,000원 차감
2. B 계좌에 10,000원 추가

만약 1번은 성공했는데 2번에서 오류가 나면?
→ A의 돈은 사라졌는데 B에는 안 들어옴! (돈이 증발)

트랜잭션으로 묶으면:
→ 두 작업 중 하나라도 실패하면 전체 취소(ROLLBACK)
→ 두 작업 모두 성공해야 최종 저장(COMMIT)
```

```sql
-- 트랜잭션 기본 사용법
BEGIN;  -- 트랜잭션 시작

UPDATE accounts SET balance = balance - 10000 WHERE id = 1;
UPDATE accounts SET balance = balance + 10000 WHERE id = 2;

COMMIT;    -- 두 작업 모두 성공 → 저장
-- 또는
ROLLBACK;  -- 문제 발생 → 전체 취소


-- 저장점(SAVEPOINT) — 부분 롤백
BEGIN;

SAVEPOINT before_order;             -- 저장점 생성
INSERT INTO orders (user_id, amount) VALUES (1, 50000);

SAVEPOINT before_items;             -- 저장점 생성
INSERT INTO order_items (order_id, product_id) VALUES (1, 999);
-- 999번 상품이 없어서 오류 발생!

ROLLBACK TO before_items;           -- 주문 상품 추가만 취소
-- 주문 자체는 살아있음

COMMIT;  -- 주문 생성은 커밋
```

---

## 실습: 쇼핑몰 기본 테이블 만들기

실제로 이런 구조로 데이터베이스를 설계합니다:

```sql
-- 1. 사용자 테이블
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(100) NOT NULL,
    phone       VARCHAR(20),
    status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE', 'INACTIVE', 'BANNED')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 상품 테이블
CREATE TABLE products (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    price       NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    status      VARCHAR(20) NOT NULL DEFAULT 'ON_SALE',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 주문 테이블 (users와 1:N 관계)
CREATE TABLE orders (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 주문 상품 테이블 (orders, products와 N:M 관계)
CREATE TABLE order_items (
    id          BIGSERIAL PRIMARY KEY,
    order_id    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(12, 2) NOT NULL,  -- 주문 시점의 가격 저장 (이후 가격 변경 대비)
    UNIQUE (order_id, product_id)          -- 같은 주문에 같은 상품 중복 불가
);
```

이 구조로 "사용자 1명이 여러 주문을 할 수 있고, 각 주문에는 여러 상품이 담긴다"는 현실을 표현했습니다.
