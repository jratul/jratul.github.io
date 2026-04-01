---
title: "dbt 연동과 데이터 변환"
order: 6
---

## Modern Data Stack

Airbyte + dbt + 데이터 웨어하우스의 조합이 **Modern Data Stack**의 표준입니다.

```
Source DB     →    Airbyte    →    BigQuery/Snowflake    →    dbt    →    BI Tool
(MySQL, API)    (ELT: 추출/적재)    (Raw Tables)          (변환)     (Metabase, Superset)
```

---

## dbt란?

dbt(data build tool)는 데이터 웨어하우스 내에서 **SQL 기반 데이터 변환**을 관리합니다.

```
dbt가 하는 일:
1. SQL 모델 실행 (SELECT만 작성, CREATE/INSERT는 dbt가 처리)
2. 모델 간 의존성 관리
3. 테스트 (데이터 품질 검증)
4. 문서화 자동 생성
5. 데이터 계보(Lineage) 시각화
```

---

## Airbyte Raw → dbt 변환 패턴

```sql
-- 1. Raw Layer (Airbyte가 생성)
-- airbyte_raw.orders → JSON 형태 원본 데이터

-- 2. Staging Layer (dbt: 데이터 정제)
-- models/staging/stg_orders.sql
WITH raw_orders AS (
    SELECT
        JSON_VALUE(_airbyte_data, '$.id')         AS order_id,
        JSON_VALUE(_airbyte_data, '$.user_id')    AS user_id,
        JSON_VALUE(_airbyte_data, '$.status')     AS status,
        CAST(JSON_VALUE(_airbyte_data, '$.total') AS FLOAT64) AS total,
        TIMESTAMP(JSON_VALUE(_airbyte_data, '$.created_at')) AS created_at,
        _airbyte_extracted_at AS extracted_at
    FROM {{ source('airbyte_raw', '_airbyte_raw_orders') }}
    WHERE _airbyte_data IS NOT NULL
      AND _ab_cdc_deleted_at IS NULL    -- 삭제된 레코드 제외
)

SELECT * FROM raw_orders

-- 3. Intermediate Layer (비즈니스 로직)
-- models/intermediate/int_orders_enriched.sql
SELECT
    o.order_id,
    o.user_id,
    u.email,
    u.country,
    o.status,
    o.total,
    o.created_at
FROM {{ ref('stg_orders') }} o
LEFT JOIN {{ ref('stg_users') }} u USING (user_id)

-- 4. Marts Layer (분석 목적)
-- models/marts/fct_daily_revenue.sql
SELECT
    DATE(created_at) AS date,
    country,
    COUNT(*) AS order_count,
    SUM(total) AS revenue
FROM {{ ref('int_orders_enriched') }}
WHERE status = 'PAID'
GROUP BY 1, 2
```

---

## dbt 프로젝트 구조

```
dbt_project/
├── dbt_project.yml           # 프로젝트 설정
├── profiles.yml              # DB 연결 설정
├── models/
│   ├── staging/             # Raw → 정제
│   │   ├── _sources.yml     # 소스 정의
│   │   ├── _stg_models.yml  # 모델 문서/테스트
│   │   └── stg_orders.sql
│   ├── intermediate/        # 비즈니스 로직
│   │   └── int_orders_enriched.sql
│   └── marts/               # 최종 분석 테이블
│       ├── core/
│       │   └── fct_orders.sql
│       └── marketing/
│           └── fct_daily_revenue.sql
├── tests/
│   └── assert_positive_revenue.sql
├── macros/
│   └── generate_surrogate_key.sql
└── seeds/
    └── country_codes.csv
```

---

## dbt 소스 설정

```yaml
# models/staging/_sources.yml
version: 2

sources:
  - name: airbyte_raw
    database: my-project
    schema: airbyte_raw
    freshness:
      warn_after: {count: 6, period: hour}
      error_after: {count: 24, period: hour}
    loaded_at_field: _airbyte_loaded_at

    tables:
      - name: _airbyte_raw_orders
        identifier: _airbyte_raw_orders
      - name: _airbyte_raw_users
        identifier: _airbyte_raw_users
```

---

## dbt 모델 테스트

```yaml
# models/staging/_stg_models.yml
version: 2

models:
  - name: stg_orders
    columns:
      - name: order_id
        tests:
          - not_null
          - unique
      - name: status
        tests:
          - not_null
          - accepted_values:
              values: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']
      - name: total
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: ">= 0"
```

```bash
# dbt 명령어
dbt run           # 모든 모델 실행
dbt test          # 테스트 실행
dbt run --select staging  # staging만 실행
dbt run --select +fct_orders  # fct_orders + 모든 의존성
dbt docs generate # 문서 생성
dbt docs serve    # 문서 서버 실행 (localhost:8080)
```

---

## Airflow/Dagster로 파이프라인 오케스트레이션

```python
# Airflow DAG: Airbyte Sync → dbt 변환
from airflow import DAG
from airflow.providers.airbyte.operators.airbyte import AirbyteTriggerSyncOperator
from airflow.providers.airbyte.sensors.airbyte import AirbyteJobSensor
from cosmos import DbtTaskGroup, RenderConfig, LoadMode

with DAG(dag_id="data_pipeline", schedule="@hourly") as dag:

    # 1. Airbyte Sync 실행
    trigger_sync = AirbyteTriggerSyncOperator(
        task_id="trigger_airbyte_sync",
        airbyte_conn_id="airbyte_default",
        connection_id="airbyte-connection-uuid",
        asynchronous=True
    )

    # 2. Sync 완료 대기
    wait_for_sync = AirbyteJobSensor(
        task_id="wait_for_sync",
        airbyte_conn_id="airbyte_default",
        airbyte_job_id=trigger_sync.output
    )

    # 3. dbt 변환 실행 (Astronomer Cosmos)
    transform = DbtTaskGroup(
        group_id="transform",
        project_config=ProjectConfig("/dbt_project"),
        render_config=RenderConfig(load_method=LoadMode.DBT_LS),
    )

    trigger_sync >> wait_for_sync >> transform
```
