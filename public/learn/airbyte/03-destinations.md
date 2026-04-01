---
title: "Destination 커넥터"
order: 3
---

## 주요 Destination 커넥터

| 카테고리 | 커넥터 |
|----------|--------|
| **데이터 웨어하우스** | BigQuery, Snowflake, Redshift, Databricks |
| **데이터 레이크** | S3, GCS, Azure Blob, Delta Lake |
| **관계형 DB** | PostgreSQL, MySQL |
| **NoSQL** | MongoDB, Elasticsearch |
| **스트리밍** | Kafka |

---

## BigQuery Destination 설정

```json
{
  "project_id": "my-gcp-project",
  "dataset_location": "asia-northeast3",
  "dataset_id": "airbyte_raw",
  "loading_method": {
    "method": "GCS Staging",
    "gcs_bucket_name": "airbyte-staging",
    "gcs_bucket_path": "staging",
    "credential": {
      "credential_type": "HMAC_KEY",
      "hmac_key_access_id": "...",
      "hmac_key_secret": "..."
    }
  },
  "credentials_json": "{service-account-json}"
}
```

**BigQuery 테이블 구조:**
```sql
-- Airbyte가 생성하는 raw 테이블
-- 실제 데이터 + 메타데이터 컬럼 포함
SELECT
  _airbyte_raw_id,         -- Airbyte 내부 ID
  _airbyte_extracted_at,   -- 추출 시간
  _airbyte_loaded_at,      -- 적재 시간
  _airbyte_data            -- 원본 데이터 (JSON)
FROM airbyte_raw._airbyte_raw_orders
```

---

## Snowflake Destination 설정

```json
{
  "host": "account.snowflakecomputing.com",
  "role": "AIRBYTE_ROLE",
  "warehouse": "AIRBYTE_WH",
  "database": "AIRBYTE_DB",
  "schema": "PUBLIC",
  "username": "airbyte_user",
  "credentials": {
    "auth_type": "Username and Password",
    "password": "password"
  },
  "loading_method": {
    "method": "Internal Staging"
  }
}
```

---

## S3 Destination 설정

```json
{
  "s3_bucket_name": "my-datalake",
  "s3_bucket_path": "raw/airbyte",
  "s3_bucket_region": "ap-northeast-2",
  "access_key_id": "AKIAIOSFODNN7EXAMPLE",
  "secret_access_key": "...",
  "format": {
    "format_type": "Parquet",
    "compression_codec": "SNAPPY"
  },
  "file_name_pattern": "{namespace}/{stream_name}/{date}"
}
```

**S3 저장 구조:**
```
s3://my-datalake/raw/airbyte/
  shop/orders/
    2024/01/15/
      00/orders_20240115_000000.parquet
      01/orders_20240115_010000.parquet
  shop/users/
    2024/01/15/
      orders_20240115.parquet
```

---

## Destination의 Raw 테이블과 Final 테이블

Airbyte v2부터 **두 단계 테이블** 구조를 사용합니다.

```
Stage 1: Raw Table (_airbyte_raw_*)
  - 모든 원본 데이터를 JSON으로 보존
  - _airbyte_raw_id, _airbyte_extracted_at, _airbyte_data 컬럼

Stage 2: Final Table (스트림 이름)
  - 정규화된 형태
  - 중복 제거 (Deduplication 모드)
  - 타입 변환 적용

예시:
  _airbyte_raw_orders → 원본 데이터 보존
  orders → 최종 쿼리용 테이블
```

---

## Normalization

Airbyte는 선택적으로 **Normalization**을 수행합니다.

```
Raw JSON → 정규화된 테이블

예시:
{
  "id": 1,
  "user": { "name": "홍길동", "email": "hong@example.com" },
  "items": [{ "product_id": 1, "qty": 2 }, { "product_id": 2, "qty": 1 }]
}

정규화 결과:
orders: (id)
orders_user: (id, name, email)  ← 중첩 객체
orders_items: (id, product_id, qty)  ← 배열
```

**dbt를 사용한 커스텀 변환 권장** (Airbyte 기본 normalization보다 유연)

---

## PostgreSQL Destination 설정

```json
{
  "host": "postgres-host.example.com",
  "port": 5432,
  "database": "analytics",
  "schema": "airbyte_raw",
  "username": "airbyte",
  "password": "password",
  "ssl_mode": {
    "mode": "disable"
  },
  "tunnel_method": {
    "tunnel_method": "NO_TUNNEL"
  }
}
```

---

## Destination 성능 최적화

```
BigQuery 최적화:
- Loading Method: GCS Staging 사용 (직접 삽입보다 빠름)
- Partitioned Tables 활성화 (_airbyte_extracted_at 기준)
- Clustering 설정 (자주 필터링하는 컬럼)

Snowflake 최적화:
- 대용량: S3/GCS Staging 사용
- 웨어하우스 크기 적절히 설정 (XS~2XL)
- Auto-suspend/resume 활성화

S3 최적화:
- Parquet + Snappy 압축 사용
- 파일 크기: 파티션당 100MB~1GB 권장
- 파티션 구조: year/month/day/hour
```
