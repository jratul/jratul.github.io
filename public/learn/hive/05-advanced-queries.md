---
title: "HiveQL 고급 쿼리"
order: 5
---

## 윈도우 함수 (Window Functions)

```sql
-- ROW_NUMBER: 순위 매기기
SELECT
    order_id, user_id, total,
    ROW_NUMBER() OVER (ORDER BY total DESC) AS rank_overall,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS user_order_rank
FROM orders;

-- RANK, DENSE_RANK
SELECT
    user_id, total,
    RANK()       OVER (ORDER BY total DESC) AS rank,       -- 동점 시 건너뜀 (1,2,2,4)
    DENSE_RANK() OVER (ORDER BY total DESC) AS dense_rank  -- 동점 시 안 건너뜀 (1,2,2,3)
FROM orders;

-- LEAD, LAG: 이전/다음 행 참조
SELECT
    user_id,
    created_at,
    total,
    LAG(total, 1, 0)  OVER (PARTITION BY user_id ORDER BY created_at) AS prev_order_total,
    LEAD(total, 1, 0) OVER (PARTITION BY user_id ORDER BY created_at) AS next_order_total
FROM orders;

-- 이동 평균
SELECT
    dt,
    daily_revenue,
    AVG(daily_revenue) OVER (
        ORDER BY dt
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW  -- 7일 이동 평균
    ) AS moving_avg_7d,
    SUM(daily_revenue) OVER (
        ORDER BY dt
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW  -- 누적 합계
    ) AS cumulative_revenue
FROM daily_stats;

-- NTILE: 데이터를 n 그룹으로 분할
SELECT
    user_id, total_spent,
    NTILE(4) OVER (ORDER BY total_spent) AS quartile  -- 4분위
FROM user_stats;
```

---

## CTE (Common Table Expression)

```sql
-- WITH 절로 중간 결과 재사용
WITH
paid_orders AS (
    SELECT * FROM orders WHERE status = 'PAID'
),
user_stats AS (
    SELECT
        user_id,
        COUNT(*) AS order_count,
        SUM(total) AS total_spent,
        AVG(total) AS avg_order
    FROM paid_orders
    GROUP BY user_id
),
vip_users AS (
    SELECT user_id, total_spent
    FROM user_stats
    WHERE total_spent >= 1000000
)

SELECT
    v.user_id,
    u.name,
    v.total_spent,
    s.order_count
FROM vip_users v
JOIN users u ON v.user_id = u.user_id
JOIN user_stats s ON v.user_id = s.user_id
ORDER BY v.total_spent DESC;
```

---

## UNION / UNION ALL

```sql
-- UNION ALL (중복 포함)
SELECT user_id, 'mobile' AS platform, COUNT(*) AS sessions
FROM mobile_events GROUP BY user_id

UNION ALL

SELECT user_id, 'web' AS platform, COUNT(*) AS sessions
FROM web_events GROUP BY user_id;

-- UNION (중복 제거)
SELECT user_id FROM mobile_users
UNION
SELECT user_id FROM web_users;
```

---

## PIVOT / UNPIVOT

```sql
-- 월별 매출을 컬럼으로 변환 (PIVOT)
SELECT
    year,
    SUM(CASE WHEN month = 1  THEN revenue ELSE 0 END) AS jan,
    SUM(CASE WHEN month = 2  THEN revenue ELSE 0 END) AS feb,
    SUM(CASE WHEN month = 3  THEN revenue ELSE 0 END) AS mar,
    ...
    SUM(CASE WHEN month = 12 THEN revenue ELSE 0 END) AS dec
FROM monthly_revenue
GROUP BY year;
```

---

## 복잡한 집계

```sql
-- GROUPING SETS: 여러 GROUP BY 조합을 한 번에
SELECT
    COALESCE(category, 'ALL') AS category,
    COALESCE(status, 'ALL') AS status,
    COUNT(*) AS cnt,
    SUM(total) AS revenue
FROM orders
GROUP BY GROUPING SETS (
    (category, status),  -- 카테고리+상태별
    (category),          -- 카테고리별 소계
    (status),            -- 상태별 소계
    ()                   -- 전체 합계
);

-- ROLLUP: 계층적 소계
SELECT year, month, day, SUM(revenue)
FROM sales
GROUP BY year, month, day WITH ROLLUP;
-- → day별, month별 소계, year별 소계, 전체 합계 순으로 생성

-- CUBE: 모든 조합의 소계
SELECT category, region, SUM(revenue)
FROM sales
GROUP BY category, region WITH CUBE;
-- → 모든 가능한 조합의 소계
```

---

## 샘플링

```sql
-- 랜덤 샘플링
SELECT * FROM orders TABLESAMPLE(0.1 PERCENT);   -- 0.1% 랜덤 샘플

-- 행 수 기반 샘플링
SELECT * FROM orders TABLESAMPLE(1000 ROWS);

-- 버킷 샘플링 (버케팅된 테이블에서 정확한 샘플)
SELECT * FROM orders_bucketed TABLESAMPLE(BUCKET 1 OUT OF 32);  -- 1/32 샘플
```

---

## 트랜잭션 (ACID)

Hive 0.14+에서 ORC 포맷으로 제한적 ACID를 지원합니다.

```sql
-- ACID 활성화 설정
SET hive.support.concurrency=true;
SET hive.txn.manager=org.apache.hadoop.hive.ql.lockmgr.DbTxnManager;
SET hive.compactor.initiator.on=true;
SET hive.compactor.worker.threads=1;

-- ACID 테이블 생성
CREATE TABLE orders_acid (
    order_id  BIGINT,
    status    STRING,
    total     DOUBLE
)
STORED AS ORC
TBLPROPERTIES ('transactional' = 'true');

-- UPDATE / DELETE (ORC ACID만 가능)
UPDATE orders_acid
SET status = 'CANCELLED'
WHERE order_id = 12345;

DELETE FROM orders_acid
WHERE status = 'FAILED' AND created_at < '2023-01-01';

-- MERGE (Upsert)
MERGE INTO orders_acid target
USING orders_staging source
ON target.order_id = source.order_id
WHEN MATCHED THEN
    UPDATE SET status = source.status, total = source.total
WHEN NOT MATCHED THEN
    INSERT VALUES (source.order_id, source.status, source.total);
```

---

## UDF (User Defined Function)

```java
// Java UDF 개발
import org.apache.hadoop.hive.ql.exec.UDF;
import org.apache.hadoop.io.Text;

public class PhoneFormatter extends UDF {
    public Text evaluate(Text phone) {
        if (phone == null) return null;
        String cleaned = phone.toString().replaceAll("[^0-9]", "");
        if (cleaned.length() == 11) {
            return new Text(cleaned.substring(0, 3) + "-" +
                           cleaned.substring(3, 7) + "-" +
                           cleaned.substring(7));
        }
        return phone;
    }
}
```

```sql
-- JAR 등록 및 UDF 사용
ADD JAR /path/to/my-udfs.jar;
CREATE TEMPORARY FUNCTION format_phone AS 'com.example.PhoneFormatter';

SELECT format_phone(phone_number) FROM users;

-- 영구 등록
CREATE FUNCTION shop.format_phone AS 'com.example.PhoneFormatter'
USING JAR 'hdfs:///user/hive/udfs/my-udfs.jar';
```
