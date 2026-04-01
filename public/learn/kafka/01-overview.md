---
title: "Kafka 개요와 아키텍처"
order: 1
---

## Apache Kafka란?

Kafka는 **분산 이벤트 스트리밍 플랫폼**입니다. 원래 LinkedIn에서 개발해 Apache에 기증했습니다.

**주요 사용 사례:**
- 마이크로서비스 간 비동기 이벤트 전달
- 실시간 로그 수집 (로그 파이프라인)
- 스트림 처리 (Kafka Streams, Flink, Spark)
- CDC(Change Data Capture) — DB 변경 이벤트 전파
- IoT 센서 데이터 수집

---

## 핵심 개념

```
Producer → [ Kafka Cluster ] → Consumer
               │
           Broker 1, 2, 3
               │
           ZooKeeper (or KRaft)
```

| 개념 | 설명 |
|------|------|
| **Producer** | 메시지를 Kafka에 발행하는 클라이언트 |
| **Consumer** | 메시지를 읽는 클라이언트 |
| **Broker** | Kafka 서버 노드. 토픽의 파티션을 저장 |
| **Cluster** | 여러 Broker의 집합 |
| **Topic** | 메시지의 논리적 채널 (RabbitMQ의 Queue와 유사) |
| **Partition** | 토픽을 나누는 물리적 단위. 병렬 처리의 핵심 |
| **Offset** | 파티션 내 메시지의 순번. 0부터 시작하는 불변 순서 |
| **Consumer Group** | 같은 토픽을 나눠 소비하는 Consumer 집합 |

---

## Kafka vs 기존 메시지 큐

| | Kafka | RabbitMQ | ActiveMQ |
|--|-------|---------|---------|
| 모델 | Pub/Sub + Pull | Push 기반 | Push 기반 |
| 메시지 보존 | 설정 기간 동안 유지 | 소비 후 삭제 | 소비 후 삭제 |
| 처리량 | 초당 수백만 건 | 초당 수만 건 | 중간 |
| 재처리 | 가능 (offset 재설정) | 어려움 | 어려움 |
| 순서 보장 | 파티션 내에서 | 단일 큐에서 | 단일 큐에서 |
| 스케일 | 수평 확장 용이 | 제한적 | 제한적 |

---

## 아키텍처 상세

### 토픽과 파티션

```
Topic: orders (partition=3, replication-factor=2)

Partition 0: [msg0] [msg1] [msg4] [msg7] ...
Partition 1: [msg2] [msg5] [msg8] ...
Partition 2: [msg3] [msg6] [msg9] ...
```

- **병렬 처리:** 파티션 수 = 최대 병렬 컨슈머 수
- **순서 보장:** 파티션 내에서만 보장. 전체 토픽 순서는 보장 안됨
- **키 기반 파티션:** 같은 키 → 항상 같은 파티션 → 키 단위 순서 보장

### Replication

```
Partition 0:
  Leader   → Broker 1  (읽기/쓰기 담당)
  Follower → Broker 2  (리더 데이터 복제)
  Follower → Broker 3  (리더 데이터 복제)
```

- 프로듀서/컨슈머는 항상 Leader와 통신
- Leader 장애 시 Follower 중 하나가 새 Leader로 선출

---

## ZooKeeper vs KRaft

**ZooKeeper 모드 (전통적):**
- 클러스터 메타데이터를 ZooKeeper가 관리
- 별도의 ZooKeeper 클러스터 운영 필요

**KRaft 모드 (Kafka 3.3+, 권장):**
- ZooKeeper 없이 Kafka 자체가 메타데이터 관리
- 배포 단순화, 더 빠른 컨트롤러 페일오버

```bash
# KRaft 클러스터 초기화
./bin/kafka-storage.sh random-uuid   # Cluster ID 생성
./bin/kafka-storage.sh format -t <uuid> -c config/kraft/server.properties
```

---

## 메시지 보존 정책

Kafka는 메시지를 **소비해도 삭제하지 않습니다**. 설정에 따라 보존합니다.

```properties
# 시간 기반 (기본 7일)
log.retention.hours=168

# 크기 기반
log.retention.bytes=1073741824   # 1GB

# 두 조건 중 먼저 만족하는 것 적용

# 보존 무제한 (이벤트 소싱, Compaction 용도)
log.retention.ms=-1
```

---

## Docker Compose로 실행

```yaml
version: '3.8'
services:
  kafka:
    image: confluentinc/cp-kafka:7.6.0
    hostname: kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: 'broker,controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka:9093'
      KAFKA_LISTENERS: 'PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://localhost:9092'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: 'PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_LOG_DIRS: '/var/lib/kafka/data'
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'
    volumes:
      - kafka-data:/var/lib/kafka/data

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
    depends_on:
      - kafka

volumes:
  kafka-data:
```

```bash
# 토픽 생성
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partitions 3 \
  --replication-factor 1

# 토픽 목록
kafka-topics.sh --list --bootstrap-server localhost:9092

# 토픽 상세 정보
kafka-topics.sh --describe --topic orders --bootstrap-server localhost:9092

# 메시지 발행 (터미널)
kafka-console-producer.sh --topic orders --bootstrap-server localhost:9092

# 메시지 소비
kafka-console-consumer.sh --topic orders \
  --from-beginning \
  --bootstrap-server localhost:9092
```
