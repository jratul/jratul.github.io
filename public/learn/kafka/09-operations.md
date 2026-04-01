---
title: "운영과 모니터링"
order: 9
---

## 클러스터 상태 확인

```bash
# 브로커 상태
kafka-broker-api-versions.sh --bootstrap-server localhost:9092

# 토픽 목록
kafka-topics.sh --list --bootstrap-server localhost:9092

# 토픽 상세 (파티션, 리더, ISR 확인)
kafka-topics.sh --describe --topic orders --bootstrap-server localhost:9092

# 출력 예시:
# Topic: orders  PartitionCount: 3  ReplicationFactor: 3
# Topic: orders  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3
# Topic: orders  Partition: 1  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1
# ISR에서 빠진 레플리카 = 동기화 지연 중

# 모든 토픽 상세
kafka-topics.sh --describe --bootstrap-server localhost:9092
```

---

## 컨슈머 그룹 관리

```bash
# 컨슈머 그룹 목록
kafka-consumer-groups.sh --list --bootstrap-server localhost:9092

# 컨슈머 그룹 상태 (Lag 확인)
kafka-consumer-groups.sh --describe --group payment-service --bootstrap-server localhost:9092

# 출력:
# GROUP           TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG    CONSUMER-ID
# payment-service orders  0          1024            1024            0      consumer-1
# payment-service orders  1          2048            2050            2      consumer-2
# payment-service orders  2          512             512             0      consumer-3

# 오프셋 리셋 (재처리)
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group payment-service \
  --topic orders \
  --reset-offsets --to-earliest \     # 처음부터
  --execute

# 특정 시간으로 리셋
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group payment-service \
  --topic orders \
  --reset-offsets --to-datetime 2024-01-15T09:00:00.000 \
  --execute

# 특정 오프셋으로 리셋
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group payment-service \
  --topic orders:0:500 \   # 파티션0의 offset 500으로
  --reset-offsets --to-offset 500 \
  --execute
```

---

## 메시지 확인

```bash
# 토픽 메시지 읽기
kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --from-beginning \
  --max-messages 10 \
  --property print.key=true \
  --property print.timestamp=true

# 특정 파티션/오프셋에서 읽기
kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partition 0 \
  --offset 100

# 메시지 발행
kafka-console-producer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --property key.separator=: \
  --property parse.key=true
# 입력: user-1:{"orderId":1,"status":"created"}
```

---

## 파티션 재분배

```bash
# 파티션을 특정 브로커에 재할당 (브로커 추가/제거 시)
# reassignment.json 생성
kafka-reassign-partitions.sh \
  --bootstrap-server localhost:9092 \
  --topics-to-move-json-file topics.json \
  --broker-list "1,2,3" \
  --generate

# 재할당 실행
kafka-reassign-partitions.sh \
  --bootstrap-server localhost:9092 \
  --reassignment-json-file reassignment.json \
  --execute

# 진행 상황 확인
kafka-reassign-partitions.sh \
  --bootstrap-server localhost:9092 \
  --reassignment-json-file reassignment.json \
  --verify
```

---

## 주요 브로커 설정 (server.properties)

```properties
# 기본 설정
broker.id=1
listeners=PLAINTEXT://0.0.0.0:9092
advertised.listeners=PLAINTEXT://broker-1:9092
log.dirs=/var/lib/kafka/data

# 성능
num.network.threads=8           # 네트워크 스레드
num.io.threads=16               # I/O 스레드
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600

# 로그 보존
log.retention.hours=168
log.retention.bytes=-1          # 무제한
log.segment.bytes=1073741824    # 세그먼트 크기 1GB
log.cleanup.policy=delete

# 복제
default.replication.factor=3
min.insync.replicas=2
unclean.leader.election.enable=false

# 성능 튜닝
num.replica.fetchers=4          # 레플리카 동기화 스레드
replica.fetch.max.bytes=10485760
```

---

## 모니터링 핵심 지표

```
브로커 지표:
- UnderReplicatedPartitions: 복제 지연 파티션 수 (0이어야 함)
- ActiveControllerCount: 컨트롤러 브로커 수 (클러스터당 1이어야 함)
- OfflinePartitionsCount: 리더 없는 파티션 수 (0이어야 함)
- BytesInPerSec / BytesOutPerSec: 처리량
- RequestHandlerAvgIdlePercent: 낮으면 브로커 과부하

프로듀서 지표:
- record-error-rate: 에러율 (0이어야 함)
- request-latency-avg: 평균 지연
- batch-size-avg: 배치 크기 (클수록 효율적)

컨슈머 지표:
- records-lag-max: 최대 Lag (핵심 알람 지표)
- fetch-rate: fetch 빈도
- commit-latency-avg: 커밋 지연
```

---

## Prometheus + Grafana 모니터링

```yaml
# docker-compose.yml에 JMX Exporter 추가
kafka:
  image: confluentinc/cp-kafka:7.6.0
  environment:
    KAFKA_JMX_PORT: 9999
    KAFKA_JMX_HOSTNAME: kafka
    EXTRA_ARGS: "-javaagent:/etc/kafka/jmx_prometheus_javaagent.jar=7071:/etc/kafka/kafka-metrics.yml"
  volumes:
    - ./jmx_prometheus_javaagent.jar:/etc/kafka/jmx_prometheus_javaagent.jar
    - ./kafka-metrics.yml:/etc/kafka/kafka-metrics.yml
```

```yaml
# prometheus.yml
scrape_configs:
  - job_name: kafka
    static_configs:
      - targets: ['kafka:7071']
  - job_name: kafka-lag
    static_configs:
      - targets: ['kafka-lag-exporter:8000']
```

---

## 트러블슈팅

```bash
# 1. Under-Replicated Partitions 확인
kafka-topics.sh --describe --bootstrap-server localhost:9092 \
  | grep "Isr:" | awk -F'Isr:' '{print $2}' | tr ',' '\n' | sort | uniq -c

# 2. 리더 재선출 (Leader Election)
kafka-leader-election.sh --bootstrap-server localhost:9092 \
  --election-type PREFERRED \
  --all-topic-partitions

# 3. 브로커 그레이스풀 종료
# controlled.shutdown.enable=true (기본값) 확인 후 프로세스 종료
kill -15 <kafka-pid>

# 4. 로그 파일 정리
kafka-log-dirs.sh --bootstrap-server localhost:9092 \
  --topic-list orders \
  --describe
```
