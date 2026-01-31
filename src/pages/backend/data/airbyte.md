---
title: 'Airbyte'
date: '2025-01-31'
tags: ['airbyte', 'etl', 'data-integration', 'elt']
excerpt: '오픈소스 데이터 통합 플랫폼 Airbyte 이해하기'
---

# Airbyte

## Airbyte란

Airbyte는 오픈소스 데이터 통합(ELT) 플랫폼이다. 다양한 소스에서 데이터를 추출해 데이터 웨어하우스나 데이터 레이크로 적재한다.

```
Source → Airbyte → Destination
(MySQL)           (BigQuery)
(API)             (Snowflake)
(S3)              (Redshift)
```

---

## ELT vs ETL

### ETL (Extract-Transform-Load)

```
Source → Transform → Destination
         (Airflow)
```

- 로드 전에 변환
- 변환 로직이 파이프라인에 포함

### ELT (Extract-Load-Transform)

```
Source → Destination → Transform
         (Airbyte)     (dbt)
```

- 먼저 로드, 나중에 변환
- 변환은 데이터 웨어하우스에서 수행
- Airbyte는 ELT의 "EL" 부분 담당

---

## 핵심 개념

### Source

데이터를 가져오는 출발점

```yaml
# 지원 소스 예시
- 데이터베이스: MySQL, PostgreSQL, MongoDB
- SaaS: Salesforce, HubSpot, Stripe
- 파일: S3, GCS, SFTP
- API: REST API, GraphQL
```

### Destination

데이터를 적재하는 목적지

```yaml
# 지원 목적지 예시
- 웨어하우스: BigQuery, Snowflake, Redshift
- 데이터레이크: S3, GCS, Delta Lake
- 데이터베이스: PostgreSQL, MySQL
- 기타: Kafka, Elasticsearch
```

### Connection

Source와 Destination을 연결하는 파이프라인

```yaml
Connection:
  source: MySQL (production DB)
  destination: BigQuery
  streams:
    - users (Full Refresh)
    - orders (Incremental)
    - products (Incremental)
  schedule: Every 6 hours
```

### Stream

테이블 또는 API 엔드포인트 단위의 데이터 흐름

---

## 동기화 모드

### Full Refresh

매번 전체 데이터를 다시 가져온다.

```
Source        Destination
┌─────────┐   ┌─────────┐
│ A B C D │ → │ A B C D │  (1차 동기화)
└─────────┘   └─────────┘

┌─────────┐   ┌─────────┐
│ A B C E │ → │ A B C E │  (2차 동기화: 전체 교체)
└─────────┘   └─────────┘
```

- **Overwrite**: 기존 데이터 덮어쓰기
- **Append**: 기존 데이터에 추가 (중복 발생)

### Incremental

변경된 데이터만 가져온다.

```
Source        Destination
┌─────────┐   ┌─────────┐
│ A B C D │ → │ A B C D │  (1차 동기화)
└─────────┘   └─────────┘

┌─────────────┐   ┌─────────────┐
│ A B C D [E] │ → │ A B C D [E] │  (2차 동기화: E만 추가)
└─────────────┘   └─────────────┘
```

- **Append**: 새 데이터만 추가
- **Deduped + History**: 중복 제거 + 히스토리 유지

### 모드 선택 기준

| 상황 | 권장 모드 |
|------|-----------|
| 소규모 테이블 | Full Refresh |
| 대용량 테이블 | Incremental |
| 변경 이력 필요 | Incremental + Deduped |
| Cursor 컬럼 없음 | Full Refresh |

---

## 아키텍처

```
┌─────────────────────────────────────────────┐
│                  Airbyte                     │
├─────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │
│  │ Web UI  │  │  API    │  │  Scheduler  │ │
│  └─────────┘  └─────────┘  └─────────────┘ │
├─────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │
│  │ Source  │  │ Worker  │  │ Destination │ │
│  │Connector│→ │         │→ │ Connector   │ │
│  └─────────┘  └─────────┘  └─────────────┘ │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐│
│  │            Temporal (Workflow)          ││
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────────┐  │
│  │  PostgreSQL │  │  Object Storage     │  │
│  │  (metadata) │  │  (logs, state)      │  │
│  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 주요 컴포넌트

- **Web UI / API**: 사용자 인터페이스
- **Scheduler**: 동기화 스케줄 관리
- **Connector**: Source/Destination별 통합 로직
- **Worker**: 실제 데이터 이동 수행
- **Temporal**: 워크플로우 오케스트레이션

---

## 배포 옵션

### Docker Compose (개발/테스트)

```bash
git clone https://github.com/airbytehq/airbyte.git
cd airbyte
./run-ab-platform.sh
```

### Kubernetes (프로덕션)

```bash
# Helm 차트 사용
helm repo add airbyte https://airbytehq.github.io/helm-charts
helm install airbyte airbyte/airbyte
```

### Airbyte Cloud (관리형)

- 인프라 관리 불필요
- 자동 업데이트
- 사용량 기반 과금

---

## 커넥터 개발

### Connector Development Kit (CDK)

Python 기반으로 커스텀 커넥터를 개발할 수 있다.

```python
# source_example/source.py
from airbyte_cdk.sources import AbstractSource
from airbyte_cdk.sources.streams import Stream

class SourceExample(AbstractSource):
    def check_connection(self, logger, config):
        # 연결 테스트
        return True, None

    def streams(self, config):
        return [UsersStream(config), OrdersStream(config)]

class UsersStream(Stream):
    primary_key = "id"

    def read_records(self, **kwargs):
        # API 호출 또는 DB 쿼리
        response = requests.get("https://api.example.com/users")
        for user in response.json():
            yield user
```

### Low-Code CDK

YAML로 간단한 커넥터 정의 가능

```yaml
# manifest.yaml
version: "0.1.0"
definitions:
  requester:
    url_base: "https://api.example.com"
    http_method: "GET"
    authenticator:
      type: BearerAuthenticator
      api_token: "{{ config['api_key'] }}"

streams:
  - name: users
    retriever:
      requester:
        $ref: "#/definitions/requester"
        path: "/users"
```

---

## Airbyte vs 대안

| 기능 | Airbyte | Fivetran | Stitch |
|------|---------|----------|--------|
| 오픈소스 | O | X | X |
| 셀프 호스팅 | O | X | X |
| 커넥터 수 | 300+ | 300+ | 100+ |
| 커스텀 커넥터 | 쉬움 | 어려움 | 어려움 |
| 가격 | 무료/사용량 | 고가 | 중간 |

### 장점

- 오픈소스, 무료로 시작 가능
- 커넥터 생태계 빠르게 성장
- 커스텀 커넥터 개발 용이
- 셀프 호스팅으로 데이터 통제

### 단점

- 셀프 호스팅 시 운영 부담
- 일부 커넥터 품질 편차
- 복잡한 변환은 별도 도구 필요 (dbt 등)

---

## 실무 팁

### 1. Incremental 동기화 설정

```sql
-- Source 테이블에 cursor 컬럼 필요
ALTER TABLE orders ADD updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX idx_orders_updated_at ON orders(updated_at);
```

### 2. 스키마 변경 대응

```yaml
# Connection 설정
schema_change_handling: propagate_all  # 자동 반영
# 또는
schema_change_handling: ignore         # 무시
```

### 3. 에러 처리

```yaml
# 재시도 설정
retry:
  max_attempts: 3
  backoff_multiplier: 2
```

### 4. 모니터링

```bash
# 동기화 상태 확인
curl http://localhost:8000/api/v1/connections/{id}/jobs

# Prometheus 메트릭
curl http://localhost:9091/metrics
```

---

## dbt와 함께 사용

Airbyte로 데이터를 로드하고, dbt로 변환하는 조합이 일반적이다.

```
┌────────┐    ┌─────────────┐    ┌─────────┐
│ Source │ →  │   Airbyte   │ →  │ Raw     │
│        │    │   (EL)      │    │ Tables  │
└────────┘    └─────────────┘    └────┬────┘
                                      │
                                      ▼
                                 ┌─────────┐
                                 │   dbt   │
                                 │  (T)    │
                                 └────┬────┘
                                      │
                                      ▼
                                 ┌─────────┐
                                 │ Mart    │
                                 │ Tables  │
                                 └─────────┘
```

```yaml
# Airflow DAG 예시
extract_load >> dbt_run >> dbt_test
```

---

## 정리

- **Airbyte**: 오픈소스 ELT 플랫폼, "EL" 담당
- **커넥터**: 300개 이상의 Source/Destination 지원
- **동기화 모드**: Full Refresh (전체) vs Incremental (변경분)
- **배포**: Docker, Kubernetes, Cloud 중 선택
- **조합**: Airbyte (EL) + dbt (T) 구성이 일반적
