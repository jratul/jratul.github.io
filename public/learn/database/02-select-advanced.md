---
title: "SELECT 심화"
order: 2
---

# SELECT 심화

JOIN, 서브쿼리, 윈도우 함수는 실무에서 매일 쓴다.

---

## JOIN

```sql
-- INNER JOIN — 양쪽 모두 일치하는 행만
SELECT u.name, o.id, o.amount
FROM users u
INNER JOIN orders o ON u.id = o.user_id;

-- LEFT JOIN — 왼쪽 테이블 전체 + 일치하는 오른쪽
SELECT u.name, o.id, o.amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
-- 주문 없는 사용자도 포함 (o.id는 NULL)

-- RIGHT JOIN — 오른쪽 테이블 전체 (LEFT JOIN 뒤집기, 잘 안 씀)

-- FULL OUTER JOIN — 양쪽 전체
SELECT u.name, o.id
FROM users u
FULL OUTER JOIN orders o ON u.id = o.user_id;

-- CROSS JOIN — 카테시안 곱 (모든 조합)
SELECT u.name, r.name FROM users u CROSS JOIN roles r;

-- 자기 자신 JOIN (Self Join)
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

---

## 여러 테이블 JOIN

```sql
-- 사용자 → 주문 → 주문 아이템 → 상품
SELECT
    u.name          AS user_name,
    o.id            AS order_id,
    o.created_at    AS order_date,
    p.name          AS product_name,
    oi.quantity,
    oi.price
FROM users u
JOIN orders o       ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p     ON oi.product_id = p.id
WHERE u.id = 123
ORDER BY o.created_at DESC;
```

---

## 서브쿼리

```sql
-- WHERE 절 서브쿼리
SELECT * FROM users
WHERE id IN (
    SELECT DISTINCT user_id FROM orders
    WHERE amount > 100000
);

-- EXISTS (IN보다 성능 좋은 경우 많음)
SELECT * FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = u.id AND o.amount > 100000
);

-- 스칼라 서브쿼리 (단일 값 반환)
SELECT
    u.name,
    (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
    (SELECT SUM(amount) FROM orders o WHERE o.user_id = u.id) AS total_amount
FROM users u;
-- 주의: 행마다 서브쿼리 실행 → 성능 문제 가능 → JOIN으로 대체 권장

-- FROM 절 서브쿼리 (인라인 뷰)
SELECT * FROM (
    SELECT user_id, SUM(amount) AS total
    FROM orders
    GROUP BY user_id
) order_totals
WHERE total > 500000;
```

---

## CTE (Common Table Expression)

서브쿼리를 가독성 좋게 이름 붙여 사용.

```sql
-- 기본 CTE
WITH active_users AS (
    SELECT id, name, email
    FROM users
    WHERE status = 'ACTIVE'
),
user_orders AS (
    SELECT user_id, COUNT(*) AS order_count, SUM(amount) AS total
    FROM orders
    GROUP BY user_id
)
SELECT
    u.name,
    COALESCE(uo.order_count, 0) AS order_count,
    COALESCE(uo.total, 0) AS total_amount
FROM active_users u
LEFT JOIN user_orders uo ON u.id = uo.user_id
ORDER BY total_amount DESC;

-- 재귀 CTE (계층 구조 탐색)
WITH RECURSIVE category_tree AS (
    -- 기저 케이스 (루트)
    SELECT id, name, parent_id, 0 AS depth
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- 재귀 케이스
    SELECT c.id, c.name, c.parent_id, ct.depth + 1
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree ORDER BY depth, name;
```

---

## 집계 함수

```sql
SELECT
    COUNT(*)                    -- 전체 행 수
    COUNT(email)                -- NULL 제외 행 수
    COUNT(DISTINCT status)      -- 중복 제외
    SUM(amount)
    AVG(amount)
    MIN(amount)
    MAX(amount)
    STRING_AGG(name, ', ')      -- 문자열 집계
    ARRAY_AGG(id)               -- 배열로 집계
FROM orders
WHERE status = 'COMPLETED'
GROUP BY user_id
HAVING SUM(amount) > 100000
ORDER BY SUM(amount) DESC;
```

---

## 윈도우 함수

GROUP BY와 달리 행을 줄이지 않고 집계값을 각 행에 추가.

```sql
-- 순위 함수
SELECT
    name,
    salary,
    department,
    ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num,
    RANK()       OVER (ORDER BY salary DESC) AS rank,       -- 동점 건너뜀
    DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rank, -- 동점 안 건너뜀
    NTILE(4)     OVER (ORDER BY salary DESC) AS quartile    -- 4등분
FROM employees;

-- PARTITION BY — 그룹별 순위
SELECT
    name,
    salary,
    department,
    RANK() OVER (
        PARTITION BY department   -- 부서별로 분리
        ORDER BY salary DESC
    ) AS dept_rank
FROM employees;

-- 집계 윈도우 함수
SELECT
    name,
    salary,
    department,
    SUM(salary) OVER (PARTITION BY department) AS dept_total,
    AVG(salary) OVER (PARTITION BY department) AS dept_avg,
    salary / SUM(salary) OVER (PARTITION BY department) * 100 AS pct
FROM employees;

-- 이동 집계 (프레임 지정)
SELECT
    date,
    amount,
    SUM(amount) OVER (
        ORDER BY date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW  -- 7일 이동 합계
    ) AS rolling_7day
FROM daily_sales;

-- LAG / LEAD — 이전/다음 행 참조
SELECT
    date,
    amount,
    LAG(amount, 1) OVER (ORDER BY date) AS prev_amount,
    amount - LAG(amount, 1) OVER (ORDER BY date) AS change,
    LEAD(amount, 1) OVER (ORDER BY date) AS next_amount
FROM daily_sales;

-- FIRST_VALUE / LAST_VALUE
SELECT
    name,
    salary,
    department,
    FIRST_VALUE(salary) OVER (
        PARTITION BY department ORDER BY salary DESC
    ) AS max_in_dept
FROM employees;
```

---

## 실전 패턴

```sql
-- Top N per Group (부서별 연봉 상위 3명)
SELECT * FROM (
    SELECT
        name, department, salary,
        ROW_NUMBER() OVER (
            PARTITION BY department ORDER BY salary DESC
        ) AS rn
    FROM employees
) ranked
WHERE rn <= 3;

-- 중복 제거 (최신 데이터만)
SELECT DISTINCT ON (user_id)
    user_id, created_at, status
FROM user_events
ORDER BY user_id, created_at DESC;

-- 갭 찾기 (연속된 날짜에서 빈 날짜)
SELECT
    gs::date AS missing_date
FROM generate_series(
    '2024-01-01'::date,
    '2024-01-31'::date,
    '1 day'::interval
) gs
LEFT JOIN daily_sales ds ON ds.date = gs::date
WHERE ds.date IS NULL;
```
