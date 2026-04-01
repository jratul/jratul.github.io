---
title: "Kafka Connect"
order: 6
---

## Kafka Connect란?

Kafka Connect는 **외부 시스템과 Kafka 간 데이터 이동을 자동화**하는 프레임워크입니다.

```
외부 DB → [Source Connector] → Kafka → [Sink Connector] → 외부 시스템
MySQL, PostgreSQL           Topic    Elasticsearch, S3, HDFS
MongoDB, S3                          BigQuery, Snowflake
```

커스텀 코드 없이 설정(JSON)만으로 파이프라인을 구성합니다.

---

## 아키텍처

```
Connect Worker 1        Connect Worker 2        Connect Worker 3
  Task 1 (Source)         Task 2 (Source)         Task 1 (Sink)
  Task 2 (Sink)           Task 3 (Sink)
```

- **Connector**: 파이프라인 정의 (설정만 가짐)
- **Task**: 실제 데이터 이동을 수행하는 스레드
- **Worker**: Task를 실행하는 프로세스 (분산 모드에서 여러 Worker)

---

## 실행 모드

**Standalone 모드** (개발용):
```bash
./bin/connect-standalone.sh config/connect-standalone.properties connector.properties
```

**Distributed 모드** (프로덕션, 권장):
```bash
./bin/connect-distributed.sh config/connect-distributed.properties

# REST API로 커넥터 관리
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @connector-config.json
```

---

## JDBC Source Connector (DB → Kafka)

```json
{
  "name": "mysql-orders-source",
  "config": {
    "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
    "connection.url": "jdbc:mysql://mysql:3306/shop",
    "connection.user": "kafka",
    "connection.password": "password",

    "table.whitelist": "orders,order_items",
    "topic.prefix": "mysql-",              ← 토픽명: mysql-orders, mysql-order_items

    "mode": "timestamp+incrementing",      ← 변경 감지 방식
    "timestamp.column.name": "updated_at",
    "incrementing.column.name": "id",

    "poll.interval.ms": "5000",            ← 5초마다 폴링
    "transforms": "copyFieldToKey",
    "transforms.copyFieldToKey.type": "org.apache.kafka.connect.transforms.ValueToKey",
    "transforms.copyFieldToKey.fields": "id"
  }
}
```

**변경 감지 모드:**

| mode | 설명 | 주의 |
|------|------|------|
| `bulk` | 전체 테이블 매번 복사 | 소규모 테이블만 |
| `incrementing` | auto-increment ID 기반 | 삭제 감지 불가 |
| `timestamp` | 타임스탬프 기반 | 삭제 감지 불가, 시간 동기화 필요 |
| `timestamp+incrementing` | 두 방식 조합 | 일반적 권장 |

---

## Debezium CDC (Change Data Capture)

Debezium은 DB의 **트랜잭션 로그**를 읽어 INSERT/UPDATE/DELETE를 모두 캡처합니다.

```json
{
  "name": "mysql-cdc-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "database.hostname": "mysql",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "dbz",
    "database.server.id": "184054",
    "topic.prefix": "dbserver1",
    "database.include.list": "shop",
    "table.include.list": "shop.orders,shop.users",
    "schema.history.internal.kafka.bootstrap.servers": "kafka:9092",
    "schema.history.internal.kafka.topic": "schema-changes.shop"
  }
}
```

```json
// Debezium 이벤트 메시지 구조
{
  "before": { "id": 1, "status": "PENDING" },   // 변경 전
  "after":  { "id": 1, "status": "PAID" },       // 변경 후
  "op": "u",   // c=insert, u=update, d=delete, r=read(snapshot)
  "ts_ms": 1704067200000,
  "source": {
    "db": "shop", "table": "orders",
    "server_id": 184054, "binlog_file": "mysql-bin.000001", "pos": 12345
  }
}
```

---

## Elasticsearch Sink Connector (Kafka → ES)

```json
{
  "name": "es-orders-sink",
  "config": {
    "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
    "tasks.max": "3",
    "topics": "mysql-orders",
    "connection.url": "http://elasticsearch:9200",
    "type.name": "_doc",
    "key.ignore": "false",
    "schema.ignore": "true",
    "behavior.on.malformed.documents": "warn",

    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "false"
  }
}
```

---

## S3 Sink Connector (Kafka → S3)

```json
{
  "name": "s3-orders-sink",
  "config": {
    "connector.class": "io.confluent.connect.s3.S3SinkConnector",
    "tasks.max": "3",
    "topics": "orders",
    "s3.region": "ap-northeast-2",
    "s3.bucket.name": "my-kafka-data",
    "s3.part.size": "5242880",
    "flush.size": "1000",                    ← 1000개 모이면 파일 생성
    "rotate.interval.ms": "3600000",         ← 또는 1시간마다 파일 생성
    "storage.class": "io.confluent.connect.s3.storage.S3Storage",
    "format.class": "io.confluent.connect.s3.format.parquet.ParquetFormat",
    "parquet.codec": "snappy",
    "locale": "ko_KR",
    "timezone": "Asia/Seoul",
    "timestamp.extractor": "RecordField",
    "timestamp.field": "created_at",
    "path.format": "'year'=YYYY/'month'=MM/'day'=dd/'hour'=HH"
  }
}
```

---

## 커넥터 관리 REST API

```bash
# 커넥터 목록
GET http://localhost:8083/connectors

# 커넥터 상태
GET http://localhost:8083/connectors/mysql-cdc-connector/status

# 커넥터 재시작
POST http://localhost:8083/connectors/mysql-cdc-connector/restart

# Task 재시작 (특정 task 실패 시)
POST http://localhost:8083/connectors/mysql-cdc-connector/tasks/0/restart

# 커넥터 삭제
DELETE http://localhost:8083/connectors/mysql-cdc-connector

# 플러그인 목록
GET http://localhost:8083/connector-plugins
```

---

## SMT (Single Message Transforms)

메시지를 변환하는 경량 처리 레이어.

```json
{
  "transforms": "route,addTimestamp,dropField",

  // 토픽 라우팅
  "transforms.route.type": "org.apache.kafka.connect.transforms.ReplaceField$Value",

  // 타임스탬프 추가
  "transforms.addTimestamp.type": "org.apache.kafka.connect.transforms.InsertField$Value",
  "transforms.addTimestamp.timestamp.field": "kafka_timestamp",

  // 필드 제거
  "transforms.dropField.type": "org.apache.kafka.connect.transforms.ReplaceField$Value",
  "transforms.dropField.blacklist": "sensitive_field,internal_id"
}
```
