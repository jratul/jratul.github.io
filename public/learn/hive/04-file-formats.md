---
title: "파일 포맷 (ORC, Parquet)"
order: 4
---

## 파일 포맷 비교

| 포맷 | 구조 | 압축 | 특징 |
|------|------|------|------|
| **TextFile** | 행 기반 | 없음(기본) | 사람이 읽기 쉬움, 성능 낮음 |
| **SequenceFile** | 행 기반 | 지원 | Hadoop 전통 포맷 |
| **ORC** | 열 기반 | Zlib/Snappy | Hive 최적화, ACID 지원 |
| **Parquet** | 열 기반 | Snappy/GZIP | Spark/Presto/Iceberg 표준 |
| **Avro** | 행 기반 | 지원 | 스키마 변경에 강함, Kafka와 호환 |

---

## 열 기반 저장 (Columnar Storage)

```
행 기반 (TextFile):
┌──────────────────────────────────────────┐
│ id=1, name=홍길동, age=25, email=... │
│ id=2, name=김철수, age=30, email=... │
│ id=3, name=이영희, age=28, email=... │
└──────────────────────────────────────────┘
→ SELECT age 시 모든 컬럼을 읽어야 함

열 기반 (ORC/Parquet):
┌────────────┐ ┌─────────────────────┐ ┌──────────┐
│ id: 1,2,3  │ │ name: 홍길동,김철수...│ │ age:25,30│
└────────────┘ └─────────────────────┘ └──────────┘
→ SELECT age 시 age 컬럼만 읽음 (I/O 대폭 감소)
→ 같은 컬럼의 값은 유사 → 압축률 높음
```

---

## ORC (Optimized Row Columnar)

Hive 전용으로 최적화된 포맷입니다.

```sql
-- ORC 테이블 생성
CREATE TABLE orders_orc (
    order_id  BIGINT,
    user_id   STRING,
    total     DOUBLE,
    status    STRING,
    created_at TIMESTAMP
)
STORED AS ORC
TBLPROPERTIES (
    "orc.compress" = "SNAPPY",        -- 압축: NONE | ZLIB | SNAPPY
    "orc.stripe.size" = "67108864",   -- 스트라이프 크기 64MB
    "orc.row.index.stride" = "10000", -- 인덱스 간격 (행 수)
    "orc.bloom.filter.columns" = "user_id,status",  -- 블룸 필터
    "orc.bloom.filter.fpp" = "0.05"
);

-- TextFile → ORC 변환
INSERT INTO TABLE orders_orc
SELECT * FROM orders_text;
```

**ORC 내부 구조:**
```
ORC 파일
├── File Header
├── Stripe 1 (64MB)
│   ├── Index (컬럼별 min/max, bloom filter)
│   ├── Data (컬럼별 압축 데이터)
│   └── Footer
├── Stripe 2
│   └── ...
└── File Footer (메타데이터)
```

**ORC 최적화 기법:**
- **Push-down Predicate:** WHERE 조건을 스트라이프/행그룹 레벨에서 적용 → 불필요한 스트라이프 스킵
- **Bloom Filter:** 특정 값의 존재 여부를 빠르게 확인
- **Min/Max 통계:** 스트라이프의 컬럼 범위로 스킵 가능

---

## Parquet

Spark, Presto, Trino, Iceberg의 표준 포맷입니다.

```sql
-- Parquet 테이블 생성
CREATE TABLE orders_parquet (
    order_id  BIGINT,
    user_id   STRING,
    total     DOUBLE,
    status    STRING,
    created_at TIMESTAMP
)
STORED AS PARQUET
TBLPROPERTIES (
    "parquet.compression" = "SNAPPY"  -- UNCOMPRESSED | SNAPPY | GZIP | LZO | BROTLI | ZSTD
);
```

**Parquet 내부 구조:**
```
Parquet 파일
├── Row Group 1 (128MB 기본)
│   ├── Column Chunk: order_id
│   │   ├── Page 1 (1MB 기본)
│   │   └── Page 2
│   ├── Column Chunk: user_id
│   └── Column Chunk: total
├── Row Group 2
└── File Footer (스키마, 통계, 행 그룹 위치)
```

---

## ORC vs Parquet 선택

```
ORC 권장:
- Hive가 주 쿼리 엔진
- ACID 트랜잭션 필요 (UPDATE/DELETE)
- Hive 전용 고급 최적화 활용

Parquet 권장:
- Spark가 주 처리 엔진
- 여러 도구가 같은 데이터 접근 (Spark, Trino, Athena)
- Apache Iceberg/Delta Lake와 함께 사용
- S3/GCS 데이터 레이크
```

---

## 압축 포맷 비교

```
압축 방식:
  GZIP:   압축률 높음, 압축/해제 느림, 분리 불가
  Snappy: 압축률 중간, 매우 빠름, 분리 가능 (권장)
  LZO:    빠름, 분리 가능, 설치 필요
  ZSTD:   높은 압축률 + 빠른 속도 (최신 권장)

실무 권장:
  ORC + Snappy
  Parquet + Snappy 또는 Parquet + ZSTD
```

---

## SerDe (Serializer/Deserializer)

텍스트 파일의 파싱 방식을 정의합니다.

```sql
-- CSV
CREATE TABLE csv_table (id INT, name STRING, age INT)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
WITH SERDEPROPERTIES (
    "separatorChar" = ",",
    "quoteChar"     = "\"",
    "escapeChar"    = "\\"
)
STORED AS TEXTFILE;

-- JSON
CREATE TABLE json_table (id INT, name STRING, tags ARRAY<STRING>)
ROW FORMAT SERDE 'org.apache.hive.hcatalog.data.JsonSerDe'
STORED AS TEXTFILE;

-- 정규식
CREATE TABLE regex_table (year INT, month INT, day INT, message STRING)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.RegexSerDe'
WITH SERDEPROPERTIES (
    "input.regex" = "(\\d{4})-(\\d{2})-(\\d{2}) (.*)"
)
STORED AS TEXTFILE;
```
