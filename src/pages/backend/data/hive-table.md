---
title: 'Hive 테이블'
date: '2025-01-31'
tags: ['hive', 'hadoop', 'data-warehouse', 'bigdata']
excerpt: 'Hive 테이블의 종류와 파티셔닝, 파일 포맷 이해하기'
---

# Hive 테이블

## Hive란

Apache Hive는 Hadoop 기반의 데이터 웨어하우스 시스템이다. SQL과 유사한 HiveQL을 사용해 대용량 데이터를 조회하고 분석할 수 있다.

```
사용자 → HiveQL 쿼리 → Hive → MapReduce/Tez/Spark → HDFS
```

---

## Internal vs External 테이블

### Internal Table (Managed Table)

Hive가 데이터의 생명주기를 완전히 관리한다.

```sql
CREATE TABLE users (
    id INT,
    name STRING,
    email STRING
)
STORED AS ORC;
```

- 데이터가 Hive의 warehouse 디렉토리에 저장됨
- **테이블 삭제 시 데이터도 함께 삭제됨**
- ETL 중간 결과물이나 임시 테이블에 적합

### External Table

Hive는 메타데이터만 관리하고, 데이터는 외부에서 관리한다.

```sql
CREATE EXTERNAL TABLE logs (
    timestamp STRING,
    level STRING,
    message STRING
)
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
LOCATION '/data/logs/';
```

- 데이터가 지정된 LOCATION에 저장됨
- **테이블 삭제 시 메타데이터만 삭제, 데이터는 유지**
- 원본 데이터 보존이 중요한 경우에 적합

### 비교

| 구분 | Internal | External |
|------|----------|----------|
| 데이터 위치 | Hive warehouse | 사용자 지정 |
| DROP 시 | 데이터 삭제됨 | 데이터 유지 |
| 용도 | 임시/중간 테이블 | 원본 데이터 |

---

## 파티셔닝

대용량 데이터를 특정 컬럼 기준으로 분할 저장하여 쿼리 성능을 향상시킨다.

### 파티션 테이블 생성

```sql
CREATE EXTERNAL TABLE events (
    event_id STRING,
    user_id STRING,
    event_type STRING,
    event_data STRING
)
PARTITIONED BY (dt STRING, country STRING)
STORED AS PARQUET
LOCATION '/data/events/';
```

### 디렉토리 구조

```
/data/events/
├── dt=2025-01-01/
│   ├── country=KR/
│   │   └── data.parquet
│   └── country=US/
│       └── data.parquet
└── dt=2025-01-02/
    ├── country=KR/
    └── country=US/
```

### 파티션 추가

```sql
-- 수동 추가
ALTER TABLE events ADD PARTITION (dt='2025-01-03', country='KR')
LOCATION '/data/events/dt=2025-01-03/country=KR/';

-- HDFS에 있는 파티션 자동 인식
MSCK REPAIR TABLE events;
```

### 파티션 프루닝

파티션 컬럼을 WHERE 조건에 사용하면 해당 파티션만 스캔한다.

```sql
-- dt=2025-01-01 파티션만 스캔 (빠름)
SELECT * FROM events WHERE dt = '2025-01-01';

-- 전체 파티션 스캔 (느림)
SELECT * FROM events WHERE event_type = 'click';
```

---

## 파일 포맷

### 주요 포맷 비교

| 포맷 | 압축 | 컬럼형 | 스키마 | 용도 |
|------|------|--------|--------|------|
| Text | X | X | X | 단순 로그 |
| CSV | X | X | X | 외부 연동 |
| JSON | X | X | O | 반정형 데이터 |
| ORC | O | O | O | Hive 최적화 |
| Parquet | O | O | O | 범용 (Spark 등) |
| Avro | O | X | O | 스키마 진화 |

### ORC vs Parquet

```sql
-- ORC: Hive에 최적화
CREATE TABLE users_orc (...)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- Parquet: 범용 (Spark, Presto 등과 호환)
CREATE TABLE users_parquet (...)
STORED AS PARQUET;
```

| 구분 | ORC | Parquet |
|------|-----|---------|
| 생태계 | Hive 중심 | 범용 |
| 압축률 | 더 높음 | 높음 |
| Hive 성능 | 최적 | 좋음 |
| Spark 성능 | 좋음 | 최적 |

---

## 버킷팅

파티션 내에서 데이터를 해시 기반으로 분산 저장한다.

```sql
CREATE TABLE user_actions (
    user_id STRING,
    action STRING,
    timestamp BIGINT
)
PARTITIONED BY (dt STRING)
CLUSTERED BY (user_id) INTO 32 BUCKETS
STORED AS ORC;
```

- 같은 user_id는 항상 같은 버킷에 저장
- JOIN 성능 향상 (Sort-Merge Bucket Join)
- 샘플링 쿼리에 유용

---

## 자주 쓰는 명령어

### 테이블 정보 확인

```sql
-- 테이블 구조
DESCRIBE users;
DESCRIBE FORMATTED users;

-- 파티션 목록
SHOW PARTITIONS events;

-- 테이블 생성 DDL
SHOW CREATE TABLE users;
```

### 데이터 조작

```sql
-- 데이터 삽입
INSERT INTO TABLE users VALUES (1, 'Alice', 'alice@example.com');

-- 다른 테이블에서 삽입
INSERT INTO TABLE users_backup
SELECT * FROM users WHERE created_at > '2025-01-01';

-- 파티션에 데이터 삽입
INSERT INTO TABLE events PARTITION (dt='2025-01-01', country='KR')
SELECT event_id, user_id, event_type, event_data
FROM staging_events;

-- 동적 파티션 삽입
SET hive.exec.dynamic.partition=true;
SET hive.exec.dynamic.partition.mode=nonstrict;

INSERT INTO TABLE events PARTITION (dt, country)
SELECT event_id, user_id, event_type, event_data, dt, country
FROM staging_events;
```

### 테이블 관리

```sql
-- 테이블 삭제
DROP TABLE users;
DROP TABLE IF EXISTS users;

-- 파티션 삭제
ALTER TABLE events DROP PARTITION (dt='2025-01-01');

-- 테이블 비우기 (External은 안 됨)
TRUNCATE TABLE users;
```

---

## 성능 최적화 팁

### 1. 적절한 파티션 설계

```sql
-- 좋음: 일별 파티션 (적정 크기)
PARTITIONED BY (dt STRING)

-- 나쁨: 초단위 파티션 (너무 많은 작은 파일)
PARTITIONED BY (dt STRING, hour STRING, minute STRING, second STRING)
```

### 2. 파일 크기 관리

```sql
-- 작은 파일 병합
SET hive.merge.mapfiles=true;
SET hive.merge.mapredfiles=true;
SET hive.merge.size.per.task=256000000; -- 256MB
```

### 3. 통계 수집

```sql
-- 테이블 통계
ANALYZE TABLE users COMPUTE STATISTICS;

-- 컬럼 통계
ANALYZE TABLE users COMPUTE STATISTICS FOR COLUMNS;
```

### 4. 벡터화 실행

```sql
SET hive.vectorized.execution.enabled=true;
SET hive.vectorized.execution.reduce.enabled=true;
```

---

## 정리

- **Internal**: Hive가 데이터 관리, DROP 시 삭제됨
- **External**: 외부 데이터 참조, DROP 시 유지됨
- **파티셔닝**: 쿼리 성능의 핵심, WHERE 절에 파티션 컬럼 사용
- **파일 포맷**: Hive 전용은 ORC, 범용은 Parquet
- **버킷팅**: JOIN 성능 향상, 샘플링에 유용
