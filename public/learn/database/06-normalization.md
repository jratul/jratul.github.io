---
title: "정규화와 반정규화"
order: 6
---

# 정규화와 반정규화

좋은 DB 설계의 핵심입니다. 정규화는 **데이터 중복을 없애고 일관성을 지키는 방법**이고, 반정규화는 **성능을 위해 의도적으로 중복을 허용하는 방법**입니다. 언제 어떤 선택을 해야 하는지 판단할 수 있어야 합니다.

---

## 정규화가 왜 필요한가?

정규화 없이 설계하면 어떤 문제가 생기는지 예시로 봅니다.

**문제 있는 설계 (정규화 전):**

```
[주문 테이블 - 비정규화 상태]
주문번호 | 고객명  | 고객이메일         | 상품명   | 상품가격 | 수량
---------|---------|-------------------|---------|---------|------
1001     | 홍길동   | hong@example.com  | 맥북프로  | 2000000 | 1
1001     | 홍길동   | hong@example.com  | 에어팟   | 300000  | 2
1002     | 홍길동   | hong@example.com  | 아이패드  | 800000  | 1
1003     | 김영희   | kim@example.com   | 맥북프로  | 2000000 | 1
```

**발생하는 문제들:**

```
삽입 이상 (Insertion Anomaly):
— 상품을 등록하려면 반드시 주문이 있어야 함
— 아직 아무도 구매하지 않은 신상품은 등록 불가?

수정 이상 (Update Anomaly):
— 홍길동의 이메일이 바뀌면 3개 행을 모두 수정해야 함
— 하나라도 빠뜨리면 데이터 불일치 발생

삭제 이상 (Deletion Anomaly):
— 1002 주문을 삭제하면 아이패드 정보도 같이 사라짐
— 주문 취소 = 상품 정보 삭제?

중복 데이터:
— 홍길동 이메일이 여러 행에 반복 저장 → 저장 공간 낭비
```

---

## 제1정규형 (1NF) — 원자값 보장

**조건: 모든 컬럼의 값이 더 이상 나눌 수 없는 단일값(원자값)**

```
위반 예시:
| id | 고객명 | 전화번호               |
|----|--------|-----------------------|
| 1  | 홍길동  | 010-1234, 010-5678    |  ← 두 개의 값이 하나의 셀에!
| 2  | 김영희  | 010-9999              |

문제:
— "010-5678으로 전화한 고객 찾기" 쿼리가 복잡해짐
— WHERE 전화번호 = '010-5678' 로 찾을 수 없음
```

```
1NF 적용 후:
[고객 테이블]
| id | 고객명 |
|----|--------|
| 1  | 홍길동  |
| 2  | 김영희  |

[전화번호 테이블]
| 고객_id | 전화번호    |
|---------|------------|
| 1       | 010-1234   |
| 1       | 010-5678   |
| 2       | 010-9999   |

이제 "010-5678인 고객": SELECT 고객_id FROM 전화번호 WHERE 전화번호 = '010-5678'
```

```sql
-- 실제 SQL로 표현
CREATE TABLE customers (
    id    BIGSERIAL PRIMARY KEY,
    name  VARCHAR(100) NOT NULL
);

CREATE TABLE customer_phones (
    id          BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    phone       VARCHAR(20) NOT NULL
);
```

---

## 제2정규형 (2NF) — 부분 종속 제거

**조건: 1NF를 만족하면서, 기본키의 일부에만 종속된 컬럼이 없어야 함**

복합 기본키를 사용할 때만 해당됩니다.

```
위반 예시 (기본키: 주문번호 + 상품번호):
| 주문번호 | 상품번호 | 수량 | 상품명   | 상품가격 |
|---------|---------|------|---------|---------|
| 1001    | P101    | 2    | 맥북프로  | 2000000 |
| 1001    | P102    | 1    | 에어팟   | 300000  |
| 1002    | P101    | 1    | 맥북프로  | 2000000 |

문제:
— 상품명, 상품가격은 "상품번호"에만 종속됨 (주문번호와 무관)
— 맥북프로 가격이 바뀌면 여러 행을 모두 수정해야 함
— 수정 이상 발생 가능
```

```
2NF 적용 후:
[주문_상품 테이블] - 기본키: (주문번호, 상품번호)
| 주문번호 | 상품번호 | 수량 |
|---------|---------|------|
| 1001    | P101    | 2    |
| 1001    | P102    | 1    |
| 1002    | P101    | 1    |

[상품 테이블] - 기본키: 상품번호
| 상품번호 | 상품명   | 상품가격 |
|---------|---------|---------|
| P101    | 맥북프로  | 2000000 |
| P102    | 에어팟   | 300000  |

이제 맥북프로 가격 변경 = 상품 테이블 1행만 수정
```

---

## 제3정규형 (3NF) — 이행 종속 제거

**조건: 2NF를 만족하면서, 기본키가 아닌 컬럼이 다른 비기본키 컬럼에 종속되지 않아야 함**

```
위반 예시:
| 주문번호 | 고객번호 | 우편번호  | 시      | 구     |
|---------|---------|---------|--------|-------|
| 1001    | C001    | 06000   | 서울시  | 강남구  |
| 1002    | C002    | 04500   | 서울시  | 마포구  |

문제:
— 시, 구는 우편번호에 종속됨 (고객번호 → 우편번호 → 시/구)
— 이것이 "이행 종속"
— 강남구 우편번호가 바뀌면 여러 행 수정 필요
```

```
3NF 적용 후:
[주문 테이블]
| 주문번호 | 고객번호 | 우편번호  |
|---------|---------|---------|
| 1001    | C001    | 06000   |
| 1002    | C002    | 04500   |

[우편번호 테이블]
| 우편번호  | 시      | 구     |
|---------|--------|-------|
| 06000   | 서울시  | 강남구  |
| 04500   | 서울시  | 마포구  |

이제 강남구 우편번호 변경 = 우편번호 테이블 1행만 수정
```

---

## BCNF — 3NF보다 엄격한 조건

```
조건: 모든 결정자가 후보키여야 함
3NF를 만족해도 BCNF를 위반하는 경우가 있음

실무에서는 3NF까지 적용하는 것이 일반적
BCNF는 이론적으로 더 완벽하지만 실용성이 높지 않음
```

---

## 반정규화 — 성능을 위한 의도적 중복

정규화된 설계는 항상 정합성이 높지만, 자주 JOIN이 필요한 쿼리는 느릴 수 있습니다. 성능 문제가 확인되면 그때 반정규화를 검토합니다.

```
반정규화를 고려하는 신호:
— 특정 쿼리가 항상 3~4개 테이블을 JOIN해서 느림
— 집계 쿼리(COUNT, SUM)를 매번 실행하기에 너무 느림
— 읽기 성능이 쓰기 성능보다 훨씬 중요한 경우 (99% 읽기)

주의사항:
— 쓰기 성능이 저하됨 (여러 곳을 동기화해야 함)
— 데이터 불일치 가능성 (하나를 업데이트하고 다른 하나를 빠뜨리면?)
— "성능 문제가 실제로 측정된 후" 적용 (섣불리 하지 말 것)
```

---

## 반정규화 패턴

### 패턴 1: 집계 컬럼 추가

```sql
-- 문제: 게시글 목록 조회 시 매번 댓글 수를 COUNT해야 함
SELECT p.*, COUNT(c.id) AS comment_count
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id
GROUP BY p.id;
-- posts가 많으면 매번 comments 테이블을 전체 스캔 → 느림

-- 반정규화: posts 테이블에 comment_count 컬럼 추가
ALTER TABLE posts ADD COLUMN comment_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;

-- 댓글 생성 시 comment_count 증가
UPDATE posts
SET comment_count = comment_count + 1
WHERE id = $post_id;

-- 이후 조회
SELECT id, title, comment_count, like_count FROM posts;
-- JOIN 없이 바로 사용 가능 → 빠름
-- 단, 댓글 삭제/생성 때마다 posts도 업데이트해야 함 (동기화 필요)
```

### 패턴 2: 자주 JOIN하는 컬럼 복사

```sql
-- 문제: 주문 조회 시 항상 users 테이블과 JOIN해서 사용자명을 가져옴
SELECT o.*, u.name AS user_name
FROM orders o
JOIN users u ON o.user_id = u.id;

-- 반정규화: orders에 user_name 직접 저장
ALTER TABLE orders ADD COLUMN user_name VARCHAR(100);

-- 주문 생성 시 사용자명 복사
INSERT INTO orders (user_id, user_name, amount)
VALUES ($user_id, $user_name, $amount);

-- 이후 조회 (JOIN 불필요)
SELECT id, user_name, amount FROM orders;

-- 단점: 사용자가 이름을 변경하면 이미 저장된 orders는 바뀌지 않음
-- → 주문 시점의 사용자명이 기록되는 효과 (이 경우 오히려 올바른 설계일 수도!)
```

### 패턴 3: 집계 테이블 (파생 테이블)

```sql
-- 일별 주문 통계를 매번 집계하는 것이 느릴 때
CREATE TABLE daily_order_stats (
    stat_date       DATE PRIMARY KEY,
    order_count     INTEGER NOT NULL DEFAULT 0,
    total_amount    NUMERIC(15, 2) NOT NULL DEFAULT 0,
    avg_amount      NUMERIC(12, 2),
    unique_customers INTEGER NOT NULL DEFAULT 0
);

-- 매일 자정 배치로 전날 통계 집계
INSERT INTO daily_order_stats (stat_date, order_count, total_amount, avg_amount, unique_customers)
SELECT
    DATE(created_at) AS stat_date,
    COUNT(*),
    SUM(amount),
    AVG(amount),
    COUNT(DISTINCT user_id)
FROM orders
WHERE DATE(created_at) = CURRENT_DATE - 1
GROUP BY DATE(created_at)
ON CONFLICT (stat_date) DO UPDATE
    SET order_count = EXCLUDED.order_count,
        total_amount = EXCLUDED.total_amount,
        avg_amount = EXCLUDED.avg_amount,
        unique_customers = EXCLUDED.unique_customers;

-- 대시보드 조회 (빠름!)
SELECT * FROM daily_order_stats
WHERE stat_date BETWEEN '2024-01-01' AND '2024-01-31'
ORDER BY stat_date;
```

---

## 실무 설계 원칙

```
1. 기본적으로 3NF까지 정규화 (시작 설계는 항상 정규화)
2. 실제로 성능 문제가 생기면 그때 반정규화 검토
3. "미래의 최적화"를 예측해서 처음부터 반정규화하지 말 것

정규화 우선:
— 핵심 비즈니스 데이터 (주문, 결제, 사용자)
— 쓰기가 자주 발생하는 테이블
— 초기 설계 단계 (실제 병목은 운영 후 파악)

반정규화 고려:
— 읽기 성능이 압도적으로 중요한 경우 (조회 99%, 쓰기 1%)
— 집계 결과 (대시보드, 통계 페이지)
— 변경이 거의 없는 마스터 데이터
— CQRS 패턴의 Read Model (읽기 전용 DB)
```

---

## 실전 예시: 이커머스 기본 스키마

```sql
-- 정규화와 반정규화를 적절히 섞은 실제 설계

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
    price       NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    category_id BIGINT NOT NULL REFERENCES categories(id),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    status      VARCHAR(20) NOT NULL DEFAULT 'ON_SALE'
);

CREATE TABLE orders (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_amount    NUMERIC(12, 2) NOT NULL,   -- 반정규화: 합계를 미리 계산해 저장
    shipping_address TEXT,                       -- 주문 시점 배송지 (이후 변경 대비)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id          BIGSERIAL PRIMARY KEY,
    order_id    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  BIGINT NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(12, 2) NOT NULL,  -- 반정규화: 주문 시점 가격 저장 (상품 가격이 나중에 변경되어도 주문 당시 가격 유지)
    UNIQUE (order_id, product_id)
);

-- total_amount: 매번 SUM(unit_price * quantity) 하지 않기 위해 미리 저장
-- unit_price: 나중에 상품 가격이 바뀌어도 주문 시점 가격을 정확히 유지
-- 이 두 컬럼은 의도적인 반정규화이지만, 비즈니스 로직상 올바른 설계
```
