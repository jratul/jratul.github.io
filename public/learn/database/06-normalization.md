---
title: "정규화와 반정규화"
order: 6
---

# 정규화와 반정규화

좋은 DB 설계의 기본. 언제 정규화하고 언제 반정규화할지 판단할 수 있어야 한다.

---

## 정규화의 목적

```
중복 제거:
— 같은 데이터가 여러 곳에 저장되면 수정 시 불일치 발생
— 예: 상품명이 주문 테이블에도 저장 → 상품명 변경 시 주문도 수정 필요

이상(Anomaly) 방지:
— 삽입 이상: 특정 데이터 삽입 시 불필요한 데이터 필요
— 수정 이상: 한 데이터 수정 시 여러 곳 수정 필요
— 삭제 이상: 데이터 삭제 시 다른 중요 데이터도 삭제
```

---

## 제1정규형 (1NF)

```
조건: 모든 컬럼의 값이 원자값(더 이상 나눌 수 없음)

위반 예:
| id | name  | phones              |
|----|-------|---------------------|
| 1  | Alice | 010-1234, 010-5678  |  ← 다중값!

정규화:
| id | name  |
|----|-------|
| 1  | Alice |

| user_id | phone      |
|---------|------------|
| 1       | 010-1234   |
| 1       | 010-5678   |
```

---

## 제2정규형 (2NF)

```
조건: 1NF + 기본키의 일부에 종속된 컬럼 없음
(복합키일 때 해당)

위반 예 (기본키: order_id + product_id):
| order_id | product_id | quantity | product_name | product_price |
|----------|------------|----------|--------------|---------------|
| 1        | 101        | 2        | 맥북          | 2000000       |
| 1        | 102        | 1        | 아이패드       | 800000        |

product_name, product_price는 product_id에만 종속
→ orders_items에 있으면 안 됨

정규화:
order_items(order_id, product_id, quantity)
products(id, name, price)
```

---

## 제3정규형 (3NF)

```
조건: 2NF + 기본키가 아닌 컬럼에 종속된 컬럼 없음
(이행 종속 제거)

위반 예:
| id | user_id | zip_code | city  | district |
|----|---------|----------|-------|----------|
| 1  | 10      | 06000    | 서울  | 강남구    |

city, district는 zip_code에 종속 → 이행 종속

정규화:
addresses(id, user_id, zip_code)
zip_codes(zip_code, city, district)
```

---

## BCNF (Boyce-Codd Normal Form)

```
조건: 모든 결정자가 후보키
3NF보다 강한 조건 (3NF를 만족해도 위반 가능)

실무에서는 3NF까지 적용하는 것이 일반적
```

---

## 반정규화 (Denormalization)

성능을 위해 의도적으로 중복을 허용하는 것.

```
반정규화 필요 신호:
— 자주 조인하는 테이블
— 집계 쿼리가 느림
— 읽기 성능이 중요한 경우

주의사항:
— 쓰기 성능 저하 (여러 곳 동기화)
— 데이터 불일치 가능성
— 애플리케이션 레이어에서 동기화 로직 필요
```

```sql
-- 반정규화 예시 1: 집계 컬럼 추가
-- 매번 COUNT 하지 않고 미리 계산해서 저장

ALTER TABLE users ADD COLUMN order_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_amount NUMERIC(12,2) DEFAULT 0;

-- 주문 생성 시 업데이트
UPDATE users
SET order_count = order_count + 1,
    total_amount = total_amount + $1
WHERE id = $2;

-- 반정규화 예시 2: 자주 조인하는 컬럼 복사
-- orders 테이블에 user_name 추가 (조회 시 JOIN 불필요)
ALTER TABLE orders ADD COLUMN user_name VARCHAR(100);

-- 단, user_name 변경 시 orders도 업데이트해야 함

-- 반정규화 예시 3: 읽기 전용 집계 테이블
CREATE TABLE daily_stats AS
SELECT
    DATE(created_at) AS date,
    COUNT(*) AS order_count,
    SUM(amount) AS total_amount
FROM orders
GROUP BY DATE(created_at);

-- 배치로 매일 새로 계산하거나 증분 업데이트
```

---

## 실무 설계 원칙

```
1. 기본적으로 3NF까지 정규화
2. 성능 문제가 실제로 발생하면 반정규화 검토
3. "먼저 정규화, 필요하면 반정규화"

정규화 우선:
— 데이터 정합성 중요한 핵심 테이블
— 쓰기가 많은 테이블
— 초기 설계 (예측보다 실제 병목 파악)

반정규화 고려:
— 읽기가 절대적으로 많은 경우 (99% 읽기)
— 집계 결과 (대시보드, 통계)
— 변경이 거의 없는 데이터
— CQRS 패턴의 Read Model
```

---

## 테이블 설계 실전 예시

```sql
-- 이커머스 기본 스키마 (정규화 적용)

CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(100) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    price       NUMERIC(12,2) NOT NULL,
    category_id BIGINT NOT NULL REFERENCES categories(id),
    stock       INTEGER NOT NULL DEFAULT 0,
    status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE orders (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_amount NUMERIC(12,2) NOT NULL,  -- 반정규화 (합계 미리 계산)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id          BIGSERIAL PRIMARY KEY,
    order_id    BIGINT NOT NULL REFERENCES orders(id),
    product_id  BIGINT NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(12,2) NOT NULL,  -- 주문 시점 가격 보존 (반정규화)
    UNIQUE (order_id, product_id)
);
-- unit_price: 상품 가격이 나중에 변경되어도 주문 시점 가격 유지
```
