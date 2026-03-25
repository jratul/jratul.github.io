---
title: "SELECT 심화"
order: 2
---

# SELECT 심화

JOIN, 서브쿼리, 윈도우 함수는 실무에서 매일 씁니다. 이 세 가지를 잘 다루면 대부분의 데이터 조회 문제를 해결할 수 있습니다.

---

## JOIN — 여러 테이블을 합쳐서 조회

테이블이 여러 개로 나뉘어 있을 때, JOIN으로 합쳐서 원하는 데이터를 꺼냅니다.

**왜 JOIN이 필요한가?**

```
쇼핑몰 예시:
users 테이블: 사용자 정보 (이름, 이메일 등)
orders 테이블: 주문 정보 (금액, 상태 등)

"홍길동이 한 주문 목록을 보고 싶다"
→ users와 orders를 user_id로 연결해야 함 → JOIN
```

### INNER JOIN — 양쪽 모두 일치하는 행만

```sql
-- users와 orders를 연결 → 주문이 있는 사용자만 표시
SELECT
    u.name      AS 사용자명,
    o.id        AS 주문번호,
    o.amount    AS 주문금액,
    o.status    AS 주문상태
FROM users u
INNER JOIN orders o ON u.id = o.user_id;

-- 결과: 주문이 한 번도 없는 사용자는 나오지 않음
-- "ON u.id = o.user_id": users의 id와 orders의 user_id가 같은 행을 연결
```

### LEFT JOIN — 왼쪽 테이블은 모두, 오른쪽은 일치하는 것만

```sql
-- 주문이 없는 사용자도 포함해서 조회
SELECT
    u.name,
    o.id        AS order_id,
    o.amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- 주문 없는 사용자의 경우: order_id와 amount가 NULL로 나옴
-- 예: 홍길동 | NULL | NULL  ← 아직 주문한 적 없음

-- 활용: "한 번도 주문하지 않은 사용자 찾기"
SELECT u.name, u.email
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;  -- 주문이 없는 사람만 (JOIN되지 않아서 NULL)
```

### FULL OUTER JOIN — 양쪽 모두 포함

```sql
-- 양쪽 모두 포함 (잘 사용하지 않음)
SELECT u.name, o.id
FROM users u
FULL OUTER JOIN orders o ON u.id = o.user_id;
-- 주문 없는 사용자도 포함, 사용자 없는 주문도 포함
```

### 자기 자신 JOIN (Self Join)

```sql
-- 직원 테이블에서 직원과 그 직원의 매니저 이름 함께 조회
SELECT
    e.name  AS 직원이름,
    m.name  AS 매니저이름
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
-- 같은 테이블을 두 번 JOIN (e: 직원, m: 매니저로 사용)
```

---

## 여러 테이블 연속 JOIN

실무에서는 3~4개의 테이블을 한 번에 JOIN하는 경우가 많습니다.

```sql
-- 사용자 → 주문 → 주문상품 → 상품을 한 번에 조회
-- "홍길동이 어떤 상품을 얼마나 샀는지"

SELECT
    u.name          AS 사용자명,
    o.id            AS 주문번호,
    o.created_at    AS 주문일시,
    p.name          AS 상품명,
    oi.quantity     AS 수량,
    oi.unit_price   AS 단가,
    oi.quantity * oi.unit_price AS 소계
FROM users u
JOIN orders o       ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p     ON oi.product_id = p.id
WHERE u.id = 1
ORDER BY o.created_at DESC;

-- JOIN 순서 읽기:
-- users → (user_id로) orders → (order_id로) order_items → (product_id로) products
-- 각 단계에서 ON 조건이 어떤 컬럼으로 연결되는지 주목
```

---

## 서브쿼리 — 쿼리 안에 쿼리

서브쿼리는 **쿼리 안에 또 다른 쿼리를 넣는 것**입니다. 복잡한 조건을 표현할 때 유용합니다.

### WHERE 절 서브쿼리

```sql
-- "10만원 이상 주문한 사용자 조회"
SELECT * FROM users
WHERE id IN (
    SELECT DISTINCT user_id
    FROM orders
    WHERE amount > 100000
);
-- 안쪽 쿼리: 10만원 이상 주문한 user_id 목록 조회
-- 바깥 쿼리: 그 user_id를 가진 사용자 조회
```

### EXISTS — IN보다 빠른 경우가 많음

```sql
-- "주문이 하나 이상 있는 사용자 조회"
SELECT * FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = u.id
);
-- EXISTS: 조건에 맞는 행이 하나라도 있으면 true
-- SELECT 1: 실제 값은 상관없고 존재 여부만 확인
-- 대량 데이터에서 IN보다 빠를 때가 많음
```

### 스칼라 서브쿼리 — 단일 값 반환

```sql
-- 각 사용자의 총 주문 금액을 함께 조회
SELECT
    u.name,
    u.email,
    (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS 주문횟수,
    (SELECT COALESCE(SUM(amount), 0) FROM orders o WHERE o.user_id = u.id) AS 총주문금액
FROM users u;

-- 주의! 사용자 행마다 서브쿼리가 실행됨 → 사용자 수가 많으면 성능 저하
-- 사용자 1000명이면 서브쿼리도 2000번 실행
-- 대용량에서는 JOIN + GROUP BY로 대체 권장 (아래 참고)

-- ✅ 더 효율적인 방법 (JOIN + GROUP BY)
SELECT
    u.name,
    u.email,
    COUNT(o.id)          AS 주문횟수,
    COALESCE(SUM(o.amount), 0) AS 총주문금액
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name, u.email;
```

### FROM 절 서브쿼리 (인라인 뷰)

```sql
-- 총 주문금액이 50만원 이상인 사용자 조회
SELECT * FROM (
    SELECT
        user_id,
        COUNT(*) AS order_count,
        SUM(amount) AS total_amount
    FROM orders
    GROUP BY user_id
) order_stats
WHERE total_amount >= 500000;

-- 안쪽 쿼리의 결과를 하나의 임시 테이블처럼 사용
-- order_stats: 임시 테이블 이름 (별칭)
```

---

## CTE — 서브쿼리에 이름 붙이기

CTE(Common Table Expression)는 복잡한 서브쿼리를 **읽기 쉽게 이름을 붙여 분리**하는 방법입니다.

```sql
-- WITH 절로 CTE 정의
WITH active_users AS (
    -- 활성 사용자만 추출
    SELECT id, name, email
    FROM users
    WHERE status = 'ACTIVE'
),
user_order_stats AS (
    -- 사용자별 주문 통계
    SELECT
        user_id,
        COUNT(*)        AS order_count,
        SUM(amount)     AS total_amount
    FROM orders
    WHERE status = 'COMPLETED'
    GROUP BY user_id
)
-- 두 CTE를 합쳐서 최종 결과 생성
SELECT
    u.name,
    u.email,
    COALESCE(s.order_count, 0)   AS 주문횟수,
    COALESCE(s.total_amount, 0)  AS 총구매금액
FROM active_users u
LEFT JOIN user_order_stats s ON u.id = s.user_id
ORDER BY 총구매금액 DESC;

-- CTE의 장점: 복잡한 쿼리를 단계별로 나눠서 읽기 쉬워짐
-- 마치 함수를 여러 개 만들어서 조합하는 것과 비슷
```

### 재귀 CTE — 계층 구조 탐색

```sql
-- 카테고리가 계층 구조일 때 전체 트리 조회
-- 가전 > 컴퓨터 > 노트북 처럼 부모-자식 관계

WITH RECURSIVE category_tree AS (
    -- 기저 케이스: 최상위 카테고리 (부모 없는 것)
    SELECT id, name, parent_id, 0 AS depth
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- 재귀 케이스: 하위 카테고리 추가
    SELECT c.id, c.name, c.parent_id, ct.depth + 1
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
    -- ct: 이전 단계의 결과를 참조
)
SELECT
    REPEAT('  ', depth) || name AS category_name,  -- 들여쓰기로 계층 표현
    depth
FROM category_tree
ORDER BY depth, name;

-- 결과 예시:
-- 가전              (depth: 0)
--   컴퓨터          (depth: 1)
--     노트북        (depth: 2)
--     데스크탑      (depth: 2)
--   TV              (depth: 1)
```

---

## 집계 함수

여러 행의 데이터를 하나의 값으로 요약합니다.

```sql
SELECT
    COUNT(*)                AS 전체행수,         -- NULL 포함
    COUNT(email)            AS 이메일있는수,       -- NULL 제외
    COUNT(DISTINCT status)  AS 상태종류수,        -- 중복 제거 후 카운트
    SUM(amount)             AS 총합,
    AVG(amount)             AS 평균,
    MIN(amount)             AS 최솟값,
    MAX(amount)             AS 최댓값,
    STRING_AGG(name, ', ' ORDER BY name) AS 이름목록,  -- 여러 이름을 하나의 문자열로
    ARRAY_AGG(id ORDER BY id)            AS ID배열     -- 배열로 수집
FROM orders
WHERE status = 'COMPLETED'
GROUP BY user_id
HAVING SUM(amount) > 100000   -- 집계 결과로 필터링 (WHERE가 아닌 HAVING 사용)
ORDER BY SUM(amount) DESC;

-- HAVING vs WHERE 차이:
-- WHERE: 집계 전에 행 필터링
-- HAVING: 집계 후 그룹 필터링
```

---

## 윈도우 함수 — 행을 줄이지 않고 집계값 추가

GROUP BY는 여러 행을 하나로 합치지만, 윈도우 함수는 **행은 그대로 유지하면서 각 행에 집계값을 추가**합니다.

**왜 필요한가?**

```
"각 직원의 급여와 함께, 그 직원이 속한 부서의 평균 급여도 보고 싶다"

GROUP BY를 쓰면 부서별 평균만 나오고 개인 정보는 사라짐
→ 윈도우 함수로 해결
```

### 순위 함수

```sql
SELECT
    name        AS 이름,
    salary      AS 급여,
    department  AS 부서,

    -- 전체 급여 순위
    ROW_NUMBER() OVER (ORDER BY salary DESC) AS 전체순위,  -- 1,2,3,4,5...
    RANK()       OVER (ORDER BY salary DESC) AS 랭크,      -- 동점이면 같은 순위, 다음 순위 건너뜀 (1,1,3,4...)
    DENSE_RANK() OVER (ORDER BY salary DESC) AS 촘촘랭크,  -- 동점이면 같은 순위, 건너뛰지 않음 (1,1,2,3...)

    -- 급여를 4등분 (하위 25%, 50%, 75%, 상위 25%)
    NTILE(4) OVER (ORDER BY salary DESC) AS 사분위
FROM employees;

-- ROW_NUMBER vs RANK vs DENSE_RANK 비교:
-- 급여: 500, 500, 400, 300
-- ROW_NUMBER: 1, 2, 3, 4  (무조건 순서대로)
-- RANK:       1, 1, 3, 4  (500이 동점이라 1위 두 명, 2위 없고 3위로 건너뜀)
-- DENSE_RANK: 1, 1, 2, 3  (건너뛰지 않음)
```

### PARTITION BY — 그룹별 순위

```sql
-- 부서별로 급여 순위 매기기
SELECT
    name,
    salary,
    department,
    RANK() OVER (
        PARTITION BY department  -- 부서별로 나눠서 순위 매김
        ORDER BY salary DESC
    ) AS 부서내순위
FROM employees;

-- 결과 예시:
-- 홍길동 | 5000 | 개발팀 | 1위
-- 김영희 | 4500 | 개발팀 | 2위
-- 이철수 | 4000 | 개발팀 | 3위
-- 박민수 | 6000 | 영업팀 | 1위  ← 다른 부서는 별도로 순위 매김
-- 최지원 | 5500 | 영업팀 | 2위
```

### 집계 윈도우 함수

```sql
-- 각 직원의 급여와 부서 평균, 비율 함께 조회
SELECT
    name,
    salary,
    department,
    SUM(salary) OVER (PARTITION BY department) AS 부서총급여,
    AVG(salary) OVER (PARTITION BY department) AS 부서평균급여,
    ROUND(salary::NUMERIC / SUM(salary) OVER (PARTITION BY department) * 100, 1)
        AS 부서내비율
FROM employees;

-- 결과 예시:
-- 홍길동 | 5000 | 개발팀 | 13500 | 4500 | 37.0%
-- 김영희 | 4500 | 개발팀 | 13500 | 4500 | 33.3%
-- 이철수 | 4000 | 개발팀 | 13500 | 4500 | 29.6%
```

### 이동 집계 — 슬라이딩 윈도우

```sql
-- 7일 이동 합계 (당일 포함 7일 간의 합계)
SELECT
    sale_date,
    daily_amount AS 일매출,
    SUM(daily_amount) OVER (
        ORDER BY sale_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW  -- 6일 전부터 현재까지 7행
    ) AS 7일이동합계
FROM daily_sales;

-- 결과 예시:
-- 2024-01-01 | 100 | 100  (7일치 없으면 있는 것만 합산)
-- 2024-01-02 | 150 | 250
-- 2024-01-07 | 200 | 1050 (01-01 ~ 01-07 합계)
-- 2024-01-08 | 180 | 1030 (01-02 ~ 01-08 합계, 01-01은 제외됨)
```

### LAG / LEAD — 이전/다음 행 참조

```sql
-- 전날 대비 매출 변화량 계산
SELECT
    sale_date,
    daily_amount,
    LAG(daily_amount, 1) OVER (ORDER BY sale_date)  AS 전일매출,
    daily_amount - LAG(daily_amount, 1) OVER (ORDER BY sale_date) AS 전일대비변화,
    LEAD(daily_amount, 1) OVER (ORDER BY sale_date) AS 다음일매출
FROM daily_sales;

-- LAG(컬럼, N): N행 앞의 값
-- LEAD(컬럼, N): N행 뒤의 값
-- 첫 번째 행의 LAG 값은 NULL (이전 행이 없으므로)
```

---

## 실전 패턴

### 그룹별 상위 N개 (Top N per Group)

```sql
-- 부서별 연봉 상위 3명 조회

-- 방법 1: ROW_NUMBER + 서브쿼리
SELECT * FROM (
    SELECT
        name,
        department,
        salary,
        ROW_NUMBER() OVER (
            PARTITION BY department
            ORDER BY salary DESC
        ) AS rn
    FROM employees
) ranked
WHERE rn <= 3;

-- 방법 2: PostgreSQL 전용 DISTINCT ON
SELECT DISTINCT ON (department)
    department, name, salary
FROM employees
ORDER BY department, salary DESC;
-- DISTINCT ON: 각 department에서 ORDER BY 순서상 첫 번째 행만 유지
```

### 최신 데이터만 가져오기 (중복 제거)

```sql
-- 각 사용자의 가장 최신 이벤트 로그만 조회
SELECT DISTINCT ON (user_id)
    user_id,
    event_type,
    created_at
FROM user_events
ORDER BY user_id, created_at DESC;
-- 각 user_id별로 created_at이 가장 최신인 행만 남김
```

### 날짜 연속성 확인 — 누락된 날짜 찾기

```sql
-- 1월 한 달 중 매출 데이터가 없는 날짜 찾기
SELECT gs::date AS 누락날짜
FROM generate_series(
    '2024-01-01'::date,
    '2024-01-31'::date,
    '1 day'::interval
) gs
LEFT JOIN daily_sales ds ON ds.sale_date = gs::date
WHERE ds.sale_date IS NULL;  -- 연결되지 않은 날짜(누락된 날짜)만

-- generate_series: 1월 1일부터 31일까지 날짜를 자동으로 생성
-- LEFT JOIN 후 NULL인 날짜 = 데이터가 없는 날짜
```

---

## COALESCE — NULL 대체

```sql
-- 주문이 없는 사용자는 SUM이 NULL → 0으로 대체
SELECT
    u.name,
    COALESCE(SUM(o.amount), 0) AS 총주문금액  -- NULL이면 0
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- COALESCE(값1, 값2, 값3, ...): 처음으로 NULL이 아닌 값 반환
-- 예: COALESCE(NULL, NULL, '기본값') → '기본값'
```
