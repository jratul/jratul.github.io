---
title: "HiveQL 기초"
order: 2
---

## 데이터베이스와 테이블

```sql
-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS shop
COMMENT '쇼핑몰 데이터'
LOCATION '/user/hive/warehouse/shop.db';

USE shop;

-- 내부 테이블 (Managed Table)
-- 테이블 삭제 시 HDFS 데이터도 삭제됨
CREATE TABLE orders (
    order_id    BIGINT,
    user_id     STRING,
    status      STRING,
    total       DOUBLE,
    created_at  TIMESTAMP
)
COMMENT '주문 테이블'
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
STORED AS TEXTFILE;

-- 외부 테이블 (External Table)
-- 테이블 삭제 시 HDFS 데이터 유지됨 (권장)
CREATE EXTERNAL TABLE orders_ext (
    order_id    BIGINT,
    user_id     STRING,
    total       DOUBLE,
    created_at  STRING
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY '\t'
STORED AS PARQUET
LOCATION '/data/orders/';

-- 테이블 정보 확인
DESCRIBE orders;
DESCRIBE EXTENDED orders;
DESCRIBE FORMATTED orders;

-- 테이블 목록
SHOW TABLES;
SHOW TABLES IN shop;
SHOW CREATE TABLE orders;
```

---

## 데이터 타입

```sql
-- 기본 타입
TINYINT     -- 1바이트 정수 (-128 ~ 127)
SMALLINT    -- 2바이트 정수
INT         -- 4바이트 정수
BIGINT      -- 8바이트 정수
FLOAT       -- 4바이트 부동소수
DOUBLE      -- 8바이트 부동소수
DECIMAL(p,s)-- 고정밀도 소수 (금액에 사용)
STRING      -- 가변 길이 문자열
VARCHAR(n)  -- 최대 n자 문자열
CHAR(n)     -- n자 고정 문자열
BOOLEAN
BINARY
TIMESTAMP   -- '2024-01-15 10:00:00'
DATE        -- '2024-01-15'

-- 복합 타입
ARRAY<type>         -- 배열
MAP<key_type, val_type>  -- 맵
STRUCT<field:type, ...>  -- 구조체
UNIONTYPE           -- 여러 타입 중 하나

-- 복합 타입 사용 예시
CREATE TABLE user_profiles (
    user_id     STRING,
    tags        ARRAY<STRING>,
    attributes  MAP<STRING, STRING>,
    address     STRUCT<city:STRING, zip:STRING>
);

SELECT user_id,
       tags[0],                    -- 첫 번째 태그
       attributes['color'],        -- 색상 속성
       address.city                -- 도시
FROM user_profiles;
```

---

## 데이터 로드

```sql
-- 로컬 파일에서 로드
LOAD DATA LOCAL INPATH '/tmp/orders.csv' INTO TABLE orders;

-- HDFS에서 로드 (이동)
LOAD DATA INPATH '/hdfs/path/orders.csv' INTO TABLE orders;

-- 덮어쓰기
LOAD DATA LOCAL INPATH '/tmp/orders.csv' OVERWRITE INTO TABLE orders;

-- INSERT (다른 테이블에서 복사)
INSERT INTO TABLE orders
SELECT order_id, user_id, status, total, created_at
FROM orders_staging;

-- INSERT OVERWRITE
INSERT OVERWRITE TABLE orders
SELECT * FROM orders_staging WHERE status = 'PAID';

-- 멀티 INSERT (한 번 스캔으로 여러 테이블에 삽입)
FROM orders_staging
INSERT INTO TABLE paid_orders    SELECT * WHERE status = 'PAID'
INSERT INTO TABLE failed_orders  SELECT * WHERE status = 'FAILED';
```

---

## SELECT 쿼리

```sql
-- 기본 쿼리
SELECT order_id, user_id, total
FROM orders
WHERE status = 'PAID'
  AND created_at >= '2024-01-01'
ORDER BY created_at DESC
LIMIT 100;

-- GROUP BY
SELECT
    DATE(created_at) AS order_date,
    status,
    COUNT(*) AS cnt,
    SUM(total) AS revenue,
    AVG(total) AS avg_total
FROM orders
GROUP BY DATE(created_at), status
ORDER BY order_date DESC;

-- JOIN
SELECT o.order_id, u.name, o.total
FROM orders o
JOIN users u ON o.user_id = u.user_id
WHERE o.status = 'PAID';

-- LEFT JOIN
SELECT o.order_id, u.name, o.total
FROM orders o
LEFT JOIN users u ON o.user_id = u.user_id;

-- 서브쿼리
SELECT *
FROM orders
WHERE total > (SELECT AVG(total) FROM orders WHERE status = 'PAID');

-- HAVING
SELECT user_id, COUNT(*) as order_count, SUM(total) as total_spent
FROM orders
WHERE status = 'PAID'
GROUP BY user_id
HAVING order_count >= 5
ORDER BY total_spent DESC;
```

---

## 내장 함수

```sql
-- 문자열 함수
SELECT
    LOWER(status),
    UPPER(status),
    LENGTH(user_id),
    SUBSTR(user_id, 1, 5),
    CONCAT(first_name, ' ', last_name),
    TRIM('  hello  '),
    REGEXP_REPLACE(phone, '[^0-9]', ''),
    SPLIT(tags, ',')             -- STRING → ARRAY

-- 날짜 함수
SELECT
    CURRENT_DATE(),
    CURRENT_TIMESTAMP(),
    YEAR(created_at),
    MONTH(created_at),
    DAY(created_at),
    DATEDIFF('2024-01-31', '2024-01-01'),  -- 30
    DATE_ADD('2024-01-15', 7),              -- 7일 후
    DATE_FORMAT(created_at, 'yyyy-MM'),
    UNIX_TIMESTAMP(created_at),
    FROM_UNIXTIME(1705296000)

-- 수학 함수
SELECT
    ROUND(3.14159, 2),   -- 3.14
    FLOOR(3.7),          -- 3
    CEIL(3.2),           -- 4
    ABS(-5),
    POWER(2, 10),        -- 1024
    LOG(10, 100)         -- 2

-- 조건 함수
SELECT
    IF(status = 'PAID', total, 0) AS paid_total,
    CASE status
        WHEN 'PAID'      THEN '결제완료'
        WHEN 'SHIPPING'  THEN '배송중'
        ELSE '기타'
    END AS status_kor,
    COALESCE(discount, 0),      -- NULL이면 0
    NVL(discount, 0),           -- COALESCE 동의어
    NULLIF(status, 'DELETED')   -- 'DELETED'이면 NULL
```

---

## 배열/맵 함수

```sql
-- ARRAY 함수
SELECT
    SIZE(tags),                    -- 배열 크기
    ARRAY_CONTAINS(tags, 'sale'), -- 포함 여부
    SORT_ARRAY(tags),              -- 정렬
    tags[0]                        -- 인덱스 접근

-- MAP 함수
SELECT
    attributes['color'],           -- 키로 접근
    MAP_KEYS(attributes),          -- 키 배열
    MAP_VALUES(attributes)         -- 값 배열

-- EXPLODE: 배열/맵을 여러 행으로 펼치기
SELECT user_id, tag
FROM user_profiles
LATERAL VIEW EXPLODE(tags) t AS tag;

-- MAP EXPLODE
SELECT user_id, attr_key, attr_value
FROM user_profiles
LATERAL VIEW EXPLODE(attributes) a AS attr_key, attr_value;
```
