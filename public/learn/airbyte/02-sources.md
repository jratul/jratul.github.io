---
title: "Source 커넥터"
order: 2
---

## Source 커넥터 종류

Airbyte는 300+ Source 커넥터를 제공합니다.

**카테고리별 주요 커넥터:**

| 카테고리 | 커넥터 |
|----------|--------|
| **관계형 DB** | MySQL, PostgreSQL, MS SQL Server, Oracle, MongoDB |
| **클라우드 스토리지** | S3, GCS, Azure Blob, SFTP |
| **SaaS** | Salesforce, HubSpot, Stripe, Google Analytics |
| **광고** | Google Ads, Facebook Ads, LinkedIn Ads |
| **협업툴** | Jira, GitHub, Slack, Notion, Zendesk |
| **데이터 웨어하우스** | Snowflake, BigQuery, Redshift |

---

## MySQL Source 설정

```json
{
  "host": "mysql-host.example.com",
  "port": 3306,
  "database": "shop",
  "username": "airbyte_user",
  "password": "password",
  "replication_method": {
    "method": "CDC",
    "server_id": 12345,
    "initial_waiting_seconds": 300
  },
  "ssl": {
    "mode": "verify-ca",
    "ca_certificate": "-----BEGIN CERTIFICATE-----\n..."
  }
}
```

**MySQL CDC 사전 설정:**
```sql
-- Binlog 활성화 확인
SHOW VARIABLES LIKE 'log_bin';
SHOW VARIABLES LIKE 'binlog_format';  -- ROW여야 함

-- Airbyte 전용 계정 생성
CREATE USER 'airbyte'@'%' IDENTIFIED BY 'password';
GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE,
      REPLICATION CLIENT ON *.* TO 'airbyte'@'%';
FLUSH PRIVILEGES;
```

---

## PostgreSQL Source 설정

```json
{
  "host": "postgres-host.example.com",
  "port": 5432,
  "database": "shop",
  "username": "airbyte",
  "password": "password",
  "schemas": ["public", "analytics"],
  "replication_method": {
    "method": "CDC",
    "replication_slot": "airbyte_slot",
    "publication": "airbyte_pub",
    "initial_waiting_seconds": 300
  }
}
```

**PostgreSQL CDC 설정:**
```sql
-- wal_level 확인 (logical이어야 함)
SHOW wal_level;

-- Replication Slot 생성
SELECT pg_create_logical_replication_slot('airbyte_slot', 'pgoutput');

-- Publication 생성 (특정 테이블만 또는 전체)
CREATE PUBLICATION airbyte_pub FOR TABLE orders, users, products;
-- 또는 전체
CREATE PUBLICATION airbyte_pub FOR ALL TABLES;

-- 권한 부여
CREATE ROLE airbyte_replication WITH REPLICATION LOGIN PASSWORD 'password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO airbyte_replication;
GRANT USAGE ON SCHEMA public TO airbyte_replication;
```

---

## S3 Source 설정

```json
{
  "bucket": "my-data-lake",
  "aws_access_key_id": "AKIAIOSFODNN7EXAMPLE",
  "aws_secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "path_pattern": "data/orders/**/*.json",
  "file_type": "json",
  "format": {
    "filetype": "jsonl"
  },
  "start_date": "2024-01-01T00:00:00Z"
}
```

---

## REST API Source (Generic HTTP)

```json
{
  "url_base": "https://api.example.com/v1",
  "authenticator": {
    "type": "BearerAuthenticator",
    "api_token": "{{ config['api_key'] }}"
  },
  "streams": [
    {
      "name": "orders",
      "url_path": "/orders",
      "http_method": "GET",
      "request_parameters": {
        "start_date": "{{ config['start_date'] }}"
      },
      "pagination_strategy": {
        "type": "CursorPagination",
        "cursor_value": "{{ response['next_cursor'] }}",
        "stop_condition": "{{ response['next_cursor'] is none }}"
      },
      "incremental_sync": {
        "type": "DatetimeBasedCursor",
        "cursor_field": "updated_at",
        "datetime_format": "%Y-%m-%dT%H:%M:%SZ",
        "start_datetime": "2024-01-01T00:00:00Z"
      }
    }
  ]
}
```

---

## Source 연결 테스트

Airbyte UI에서 **Test Connection** 버튼으로 연결 및 권한을 확인합니다.

```bash
# API로 연결 테스트
curl -X POST http://localhost:8000/api/v1/sources/check_connection \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "source-uuid-here"
  }'

# 스키마 검색 (사용 가능한 스트림 목록)
curl -X POST http://localhost:8000/api/v1/sources/discover_schema \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "source-uuid-here"
  }'
```

---

## Cursor 필드 (증분 동기화)

Incremental 모드에서 **마지막으로 동기화한 위치**를 기억하는 필드입니다.

```
orders 테이블:
| id | status  | updated_at           |
|----|---------|---------------------|
| 1  | PAID    | 2024-01-15 10:00:00 |
| 2  | PENDING | 2024-01-15 11:00:00 |

cursor_field = "updated_at"
첫 번째 sync: 전체 추출, cursor = 2024-01-15 11:00:00 저장
두 번째 sync: updated_at > 2024-01-15 11:00:00인 행만 추출

⚠️ 주의:
- cursor 필드는 단조증가(monotonically increasing) 해야 함
- DELETE는 감지 못함 (CDC 사용 권장)
- cursor 값이 업데이트되지 않는 레코드는 누락됨
```
