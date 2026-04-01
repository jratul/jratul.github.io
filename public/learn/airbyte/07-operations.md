---
title: "운영과 모니터링"
order: 7
---

## Airbyte API

모든 설정을 REST API로 관리할 수 있습니다.

```bash
BASE_URL="http://localhost:8000/api/v1"

# Source 목록
GET $BASE_URL/sources/list

# Connection 생성
POST $BASE_URL/connections/create
{
  "sourceId": "source-uuid",
  "destinationId": "dest-uuid",
  "syncCatalog": { ... },
  "schedule": {
    "units": 1,
    "timeUnit": "hours"
  },
  "status": "active"
}

# 수동 Sync 실행
POST $BASE_URL/connections/sync
{
  "connectionId": "connection-uuid"
}

# Sync Job 상태 확인
GET $BASE_URL/jobs/get?id=<job-id>

# 최근 Job 목록
POST $BASE_URL/jobs/list
{
  "configId": "connection-uuid",
  "configTypes": ["sync"]
}
```

---

## Airbyte Terraform Provider

인프라 코드(IaC)로 Airbyte 리소스를 관리합니다.

```hcl
# main.tf
terraform {
  required_providers {
    airbyte = {
      source  = "airbytehq/airbyte"
      version = "~> 0.4"
    }
  }
}

provider "airbyte" {
  server_url = "http://airbyte.internal:8000"
  username   = "airbyte"
  password   = "password"
}

resource "airbyte_source_mysql" "production_db" {
  name                 = "Production MySQL"
  workspace_id         = var.workspace_id
  host                 = "mysql.production.internal"
  port                 = 3306
  database             = "shop"
  username             = "airbyte_reader"
  password             = var.mysql_password
  replication_method   = "CDC"
}

resource "airbyte_destination_bigquery" "data_warehouse" {
  name         = "BigQuery DWH"
  workspace_id = var.workspace_id
  project_id   = "my-gcp-project"
  dataset_id   = "airbyte_raw"
  dataset_location = "asia-northeast3"
}

resource "airbyte_connection" "mysql_to_bigquery" {
  name              = "MySQL → BigQuery"
  source_id         = airbyte_source_mysql.production_db.source_id
  destination_id    = airbyte_destination_bigquery.data_warehouse.destination_id
  status            = "active"
  schedule = {
    schedule_type   = "cron"
    cron_expression = "0 * * * *"   # 매시간
  }
}
```

---

## 모니터링

**기본 모니터링:**
```bash
# Job 실패 확인
curl "$BASE_URL/jobs/list" \
  -d '{"configId":"conn-uuid","configTypes":["sync"],"status":"failed"}'

# 연결 상태 대시보드: http://localhost:8000
# - 각 Connection의 최근 Sync 성공/실패
# - 동기화된 레코드 수
# - 소요 시간
```

**Prometheus 메트릭:**
```yaml
# Airbyte는 내부적으로 메트릭을 Datadog, Segment 등으로 전송 가능
# airbyte.yml
  PUBLISH_METRICS: true
  METRIC_CLIENT: prometheus
  OTEL_COLLECTOR_ENDPOINT: http://otel-collector:4317
```

---

## 알림 설정

```json
// Webhook 알림 설정
POST /api/v1/workspaces/update
{
  "workspaceId": "workspace-uuid",
  "notificationSettings": {
    "sendOnSuccess": {
      "notificationType": "webhook",
      "slackConfiguration": {
        "webhook": "https://hooks.slack.com/services/..."
      }
    },
    "sendOnFailure": {
      "notificationType": "webhook",
      "slackConfiguration": {
        "webhook": "https://hooks.slack.com/services/..."
      }
    }
  }
}
```

---

## 용량 계획 (Self-Hosted)

```
최소 사양 (테스트/개발):
  CPU: 4 코어
  Memory: 8GB
  Storage: 30GB

프로덕션 권장:
  CPU: 8+ 코어
  Memory: 16-32GB
  Storage: 100GB+ (State, Job 로그 저장)

대용량 (10+ 동시 Sync):
  별도 Temporal 클러스터
  별도 Config DB PostgreSQL (RDS 등)
  Worker를 여러 인스턴스로 수평 확장
  Kubernetes 배포 권장
```

---

## Kubernetes 배포 (Helm)

```bash
# Helm 차트 설치
helm repo add airbyte https://airbytehq.github.io/helm-charts
helm install airbyte airbyte/airbyte \
  --namespace airbyte \
  --create-namespace \
  -f values.yaml

# values.yaml 주요 설정
```

```yaml
# values.yaml
global:
  edition: community
  database:
    host: "postgres.internal"
    port: 5432
    database: airbyte
    user: airbyte
    existingSecretName: airbyte-db-secret

worker:
  replicaCount: 3
  resources:
    requests:
      memory: "2Gi"
      cpu: "1"
    limits:
      memory: "4Gi"
      cpu: "2"

server:
  ingress:
    enabled: true
    hosts:
      - host: airbyte.example.com
        paths:
          - path: /
            pathType: Prefix
```

---

## 트러블슈팅

```bash
# Worker 로그 확인 (Sync 실패 원인 파악)
docker logs airbyte-worker-1 --tail=100

# Source/Destination 컨테이너 로그
# Sync 실패 시 해당 Job의 로그를 UI에서 확인
# http://localhost:8000 → Connections → 해당 Connection → Jobs → 실패 Job → 로그

# Config DB 백업
docker exec airbyte-db pg_dump -U docker airbyte > airbyte_backup.sql

# State 초기화 (전체 재동기화)
# UI: Connection → Settings → Reset Data & Sync
curl -X POST "$BASE_URL/connections/reset" \
  -d '{"connectionId":"connection-uuid"}'

# 특정 스트림만 Reset
curl -X POST "$BASE_URL/connections/reset" \
  -d '{
    "connectionId":"connection-uuid",
    "streamsToReset":[{"name":"orders","namespace":"public"}]
  }'
```
