---
title: "Apache Iceberg 연동"
order: 7
---

## Apache Iceberg란?

Apache Iceberg는 **대규모 분석용 오픈 테이블 포맷**입니다. Hive 테이블의 한계를 극복하기 위해 Netflix에서 개발했습니다.

**Hive 테이블 한계 → Iceberg 해결:**

| Hive 문제 | Iceberg 해결 |
|----------|-------------|
| 파티션 변경 불가 | 파티션 Evolution (스키마 변경 가능) |
| 전체 파티션 덮어쓰기 | 원자적 쓰기 (다른 쿼리에 영향 없음) |
| 오래된 파일 누적 | 자동 정리 (Expiration) |
| 느린 파일 리스팅 | 메타데이터 파일로 빠른 계획 |
| ACID 제한 | 완전한 ACID 지원 |

---

## Iceberg 핵심 개념

```
Iceberg 테이블 구조:
  Catalog (Hive Metastore / REST / Nessie)
    └── table_name
          ├── metadata/
          │   ├── v1.metadata.json  (스냅샷, 스키마, 파티션 정보)
          │   ├── v2.metadata.json
          │   └── snap-12345.avro   (스냅샷: 파일 목록)
          └── data/
              ├── part-00000.parquet
              └── part-00001.parquet

스냅샷 기반 읽기:
  모든 쓰기는 새 스냅샷 생성
  → Time Travel 가능
  → 동시 읽기/쓰기 안전
```

---

## Hive + Iceberg 설정

```xml
<!-- hive-site.xml -->
<property>
  <name>iceberg.engine.hive.enabled</name>
  <value>true</value>
</property>
```

```sql
-- Iceberg 카탈로그 설정
SET iceberg.catalog.hive.type=hive;
SET iceberg.catalog.hive.uri=thrift://metastore:9083;

-- Iceberg 테이블 생성
CREATE TABLE orders_iceberg (
    order_id    BIGINT,
    user_id     STRING,
    status      STRING,
    total       DOUBLE,
    created_at  TIMESTAMP
)
STORED BY 'org.apache.iceberg.mr.hive.HiveIcebergStorageHandler'
LOCATION '/warehouse/orders_iceberg'
TBLPROPERTIES (
    'write.format.default' = 'parquet',
    'write.parquet.compression-codec' = 'snappy',
    'write.target-file-size-bytes' = '134217728'  -- 128MB
);
```

---

## Iceberg 파티셔닝

```sql
-- Hidden Partitioning (파티션 컬럼이 실제 데이터에 없음)
CREATE TABLE orders_iceberg (
    order_id    BIGINT,
    user_id     STRING,
    created_at  TIMESTAMP,
    total       DOUBLE
)
PARTITIONED BY (
    DAYS(created_at),         -- created_at에서 날짜 추출
    TRUNCATE(user_id, 3)      -- user_id 앞 3자로 파티션
)
STORED BY 'org.apache.iceberg.mr.hive.HiveIcebergStorageHandler';

-- Partition Transforms:
-- YEAR(col), MONTH(col), DAY(col), HOUR(col)  — 날짜/시간
-- BUCKET(n, col)  — n개 버킷 해시
-- TRUNCATE(n, col)  — 앞 n자/n의 배수
-- IDENTITY(col)  — 값 그대로
```

---

## Iceberg Time Travel

```sql
-- 스냅샷 목록 확인
SELECT * FROM orders_iceberg.snapshots;

-- 특정 시간의 데이터 조회
SELECT * FROM orders_iceberg
FOR SYSTEM_TIME AS OF '2024-01-15 10:00:00';

-- 특정 스냅샷의 데이터 조회
SELECT * FROM orders_iceberg
FOR SYSTEM_VERSION AS OF 12345678;

-- 이전 버전으로 롤백
ALTER TABLE orders_iceberg
EXECUTE rollback(12345678);   -- 스냅샷 ID로 롤백
```

---

## Iceberg 스키마 진화 (Schema Evolution)

```sql
-- 컬럼 추가 (기존 데이터에 NULL로 표시)
ALTER TABLE orders_iceberg ADD COLUMN discount DOUBLE;

-- 컬럼 이름 변경
ALTER TABLE orders_iceberg RENAME COLUMN total TO order_total;

-- 컬럼 타입 변경 (호환 가능한 경우만)
ALTER TABLE orders_iceberg ALTER COLUMN order_total TYPE DECIMAL(10,2);

-- 컬럼 삭제
ALTER TABLE orders_iceberg DROP COLUMN discount;

-- 파티션 변경 (Partition Evolution)
ALTER TABLE orders_iceberg
SET PARTITION SPEC (HOURS(created_at));  -- 일별 → 시간별로 변경
-- 기존 데이터: 일별 파티션 유지
-- 새 데이터: 시간별 파티션으로 저장
```

---

## Iceberg 유지보수

```sql
-- 오래된 스냅샷 만료 (디스크 공간 확보)
ALTER TABLE orders_iceberg
EXECUTE expire_snapshots(TIMESTAMPADD(DAY, -7, CURRENT_TIMESTAMP));
-- 7일 이전 스냅샷 삭제

-- 고아 파일 정리 (스냅샷에서 참조되지 않는 파일)
ALTER TABLE orders_iceberg
EXECUTE remove_orphan_files(TIMESTAMPADD(DAY, -3, CURRENT_TIMESTAMP));

-- 소규모 파일 병합 (Compaction)
ALTER TABLE orders_iceberg
EXECUTE rewrite_data_files(
    strategy => 'binpack',
    options => named_struct(
        'target-file-size-bytes', '134217728',
        'min-file-size-bytes', '67108864'
    )
);

-- 파티션 파일 재정렬 (더 효율적인 정렬)
ALTER TABLE orders_iceberg
EXECUTE rewrite_data_files(
    strategy => 'sort',
    sort_order => 'user_id ASC, created_at ASC'
);
```

---

## Iceberg + Spark (일반적 조합)

```python
# SparkSession with Iceberg
spark = SparkSession.builder \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.hive_prod", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.hive_prod.type", "hive") \
    .config("spark.sql.catalog.hive_prod.uri", "thrift://metastore:9083") \
    .getOrCreate()

# Iceberg 테이블 생성
spark.sql("""
CREATE TABLE hive_prod.shop.orders (
  order_id BIGINT, user_id STRING, total DOUBLE, created_at TIMESTAMP
)
USING iceberg
PARTITIONED BY (days(created_at))
""")

# DataFrame으로 쓰기
df.writeTo("hive_prod.shop.orders").append()

# Upsert (MERGE INTO)
spark.sql("""
MERGE INTO hive_prod.shop.orders t
USING updates s ON t.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *
""")
```
