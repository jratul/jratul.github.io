---
title: "파티셔닝과 버케팅"
order: 3
---

## 파티셔닝 (Partitioning)

파티셔닝은 테이블을 **특정 컬럼 값에 따라 물리적으로 분리**해 저장합니다. 쿼리 시 해당 파티션만 스캔하는 **파티션 프루닝(Partition Pruning)**이 가능합니다.

```
HDFS 저장 구조:
/warehouse/orders/
  dt=2024-01-01/part-00000.parquet
  dt=2024-01-02/part-00000.parquet
  dt=2024-01-03/part-00000.parquet
```

---

## 파티션 테이블 생성

```sql
-- 단일 파티션
CREATE TABLE orders_partitioned (
    order_id  BIGINT,
    user_id   STRING,
    total     DOUBLE,
    status    STRING
)
PARTITIONED BY (dt STRING)   -- 파티션 컬럼은 테이블 컬럼과 별도로 정의
STORED AS PARQUET;

-- 다중 파티션
CREATE TABLE orders_multi_partitioned (
    order_id  BIGINT,
    user_id   STRING,
    total     DOUBLE
)
PARTITIONED BY (year INT, month INT, day INT)
STORED AS PARQUET;
```

---

## 파티션 데이터 삽입

```sql
-- 정적 파티션 삽입 (파티션 값 직접 지정)
INSERT INTO TABLE orders_partitioned PARTITION (dt='2024-01-15')
SELECT order_id, user_id, total, status
FROM orders_staging
WHERE DATE(created_at) = '2024-01-15';

-- 동적 파티션 삽입 (자동으로 파티션 생성)
SET hive.exec.dynamic.partition=true;
SET hive.exec.dynamic.partition.mode=nonstrict;  -- 모든 파티션이 동적이어도 허용

INSERT INTO TABLE orders_partitioned PARTITION (dt)
SELECT order_id, user_id, total, status, DATE(created_at) AS dt
FROM orders_staging;
-- 마지막 컬럼이 파티션 컬럼으로 매핑됨

-- 혼합 (일부 정적, 일부 동적)
INSERT INTO TABLE orders_multi_partitioned PARTITION (year=2024, month, day)
SELECT order_id, user_id, total,
       MONTH(created_at) AS month,
       DAY(created_at) AS day
FROM orders_staging
WHERE YEAR(created_at) = 2024;
```

---

## 파티션 관리

```sql
-- 파티션 목록
SHOW PARTITIONS orders_partitioned;
SHOW PARTITIONS orders_partitioned PARTITION (year=2024);

-- 파티션 추가 (외부 테이블에서 기존 HDFS 데이터 등록)
ALTER TABLE orders_partitioned ADD PARTITION (dt='2024-01-15')
LOCATION '/data/orders/2024/01/15/';

-- 여러 파티션 한번에 추가
ALTER TABLE orders_partitioned
ADD PARTITION (dt='2024-01-15') LOCATION '/data/orders/dt=2024-01-15/'
ADD PARTITION (dt='2024-01-16') LOCATION '/data/orders/dt=2024-01-16/';

-- 파티션 삭제
ALTER TABLE orders_partitioned DROP PARTITION (dt='2023-01-01');
ALTER TABLE orders_partitioned DROP PARTITION (dt < '2023-01-01');

-- HDFS에 파티션 파일 추가 후 메타스토어 업데이트
MSCK REPAIR TABLE orders_partitioned;
-- 또는
ALTER TABLE orders_partitioned RECOVER PARTITIONS;
```

---

## 파티션 프루닝 (Partition Pruning)

```sql
-- ✅ 파티션 프루닝 적용 (dt 파티션만 스캔)
SELECT * FROM orders_partitioned
WHERE dt = '2024-01-15';

-- ✅ 범위 파티션 프루닝
SELECT * FROM orders_partitioned
WHERE dt BETWEEN '2024-01-01' AND '2024-01-31';

-- ❌ 프루닝 미적용 (전체 스캔)
SELECT * FROM orders_partitioned
WHERE total > 100000;   -- 파티션 키가 WHERE 조건에 없음

-- ❌ 함수 적용 시 프루닝 미적용
SELECT * FROM orders_partitioned
WHERE CAST(dt AS DATE) = '2024-01-15';
-- → dt = '2024-01-15' 로 직접 비교 필요
```

---

## 파티션 설계 권장사항

```
좋은 파티션 키:
✅ 쿼리에서 자주 필터링하는 컬럼 (dt, year/month, region)
✅ 카디널리티가 너무 높지 않은 컬럼
✅ 데이터가 고르게 분산되는 컬럼

안티패턴:
❌ user_id로 파티션 → 파티션 수가 수백만 개 (Small File Problem)
❌ 파티션 수가 너무 많으면 Metastore 부하 증가
❌ 파티션 하나의 크기가 너무 작음 → 파일 수 폭발

권장 파티션 크기: 256MB ~ 1GB
권장 파티션 수: 수십 ~ 수천 개
```

---

## 버케팅 (Bucketing)

버케팅은 특정 컬럼의 **해시값으로 고정된 수의 버킷에 분산 저장**합니다. JOIN 성능 향상과 샘플링에 유용합니다.

```sql
CREATE TABLE orders_bucketed (
    order_id  BIGINT,
    user_id   STRING,
    total     DOUBLE,
    dt        STRING
)
PARTITIONED BY (dt STRING)
CLUSTERED BY (user_id) INTO 32 BUCKETS   -- user_id 해시로 32개 버킷
SORTED BY (order_id)                      -- 버킷 내 정렬 (선택)
STORED AS PARQUET;

-- 버케팅 삽입
SET hive.enforce.bucketing=true;
INSERT INTO TABLE orders_bucketed PARTITION (dt='2024-01-15')
SELECT order_id, user_id, total
FROM orders_staging;
```

**버케팅 JOIN (Bucket Map Join):**
```sql
-- 두 테이블이 같은 컬럼으로 같은 수의 버킷으로 구성되면
-- 버킷 단위로 JOIN (전체 데이터 셔플 없음)
SET hive.optimize.bucketmapjoin=true;

SELECT o.order_id, u.name, o.total
FROM orders_bucketed o
JOIN users_bucketed u ON o.user_id = u.user_id
WHERE o.dt = '2024-01-15';
```

---

## 파티셔닝 + 버케팅 조합

```
파티셔닝: 날짜/지역 등 조회 범위 제한
버케팅:  조인/집계 최적화, 샘플링

함께 사용:
PARTITIONED BY (dt STRING)         ← 날짜별 파티션
CLUSTERED BY (user_id) INTO 32 BUCKETS  ← user_id 기준 32 버킷

→ dt='2024-01-15' 파티션의 user_id='A' 해당 버킷만 읽기
```
