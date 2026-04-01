---
title: "Kafka 면접 예상 질문"
order: 11
---

## Q1. Kafka가 높은 처리량을 달성하는 이유는?

**1. 순차 I/O (Sequential Disk Write):**
메시지를 파티션에 순서대로 append-only로 기록합니다. 랜덤 I/O 없이 디스크를 최대 속도로 활용합니다.

**2. Zero-copy:**
OS 커널의 `sendfile()` 시스템콜로 데이터를 커널 버퍼에서 네트워크 소켓으로 직접 전송합니다. JVM 힙 메모리로 복사하는 과정을 생략합니다.

**3. 배치 처리:**
메시지를 하나씩 전송하지 않고 `batch.size`만큼 모아서 전송합니다.

**4. 압축:**
배치 단위로 snappy/lz4/zstd 압축을 적용해 네트워크 I/O를 줄입니다.

**5. 파티션 병렬화:**
파티션 단위로 프로듀서/컨슈머/브로커가 병렬 처리합니다.

---

## Q2. Consumer Group의 역할과 리밸런싱 과정은?

Consumer Group은 **하나의 논리적 소비자**를 여러 인스턴스로 수평 확장합니다. 같은 그룹 내에서 파티션은 하나의 컨슈머에만 할당됩니다.

**리밸런싱 과정:**
1. 컨슈머가 그룹에 참여하거나 이탈
2. Group Coordinator(브로커)가 리밸런싱 시작
3. 모든 컨슈머가 현재 파티션 할당 해제
4. Group Leader(첫 번째 컨슈머)가 새 할당 계산
5. Coordinator가 각 컨슈머에 새 파티션 할당

**리밸런싱의 문제:**
- 리밸런싱 중 모든 컨슈머가 처리 중단 (Stop-the-world)
- `max.poll.interval.ms` 초과 → 불필요한 리밸런싱

**완화 방법:**
- Incremental Cooperative Rebalancing (Kafka 2.4+): 필요한 파티션만 재할당
- `session.timeout.ms` / `heartbeat.interval.ms` 적절히 설정

---

## Q3. exactly-once 처리는 어떻게 구현하나요?

**3가지 구성 요소 필요:**

1. **멱등성 프로듀서:** `enable.idempotence=true` → PID + SequenceNumber로 중복 감지
2. **트랜잭션:** `transactional.id` 설정 → 여러 파티션/토픽에 원자적 기록
3. **격리된 컨슈머:** `isolation.level=read_committed` → 커밋된 메시지만 읽기

```java
// 트랜잭션 컨슈머-프로듀서 패턴
producer.beginTransaction();
try {
    produce(transformedRecord);
    producer.sendOffsetsToTransaction(offsets, groupMetadata);
    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
}
```

**주의:** 성능이 약 30% 감소하므로 정말 필요한 경우에만 사용합니다.

---

## Q4. ISR(In-Sync Replicas)이란?

ISR은 Leader와 동기화 상태인 Follower 집합입니다.

```
Leader: Broker 1  (offset 100)
ISR: [Broker 1, Broker 2, Broker 3]

Broker 3가 네트워크 지연으로 offset 95까지만 복제됨:
ISR: [Broker 1, Broker 2]  ← Broker 3 제외
```

**관련 설정:**
- `replica.lag.time.max.ms` (10초): 이 시간 내에 동기화 안되면 ISR 제외
- `min.insync.replicas` (2): 최소 ISR 수. 이보다 적으면 쓰기 거부
- `acks=all`: ISR 전체가 수신 확인해야 응답

**시나리오:**
```
replication-factor=3, min.insync.replicas=2
브로커 1대 장애 → ISR=2 → 쓰기 가능
브로커 2대 장애 → ISR=1 < min.insync.replicas → 쓰기 거부 (데이터 손실 방지)
```

---

## Q5. Kafka와 RabbitMQ의 차이는?

| | Kafka | RabbitMQ |
|--|-------|---------|
| 아키텍처 | Pull 기반 (컨슈머가 직접 읽음) | Push 기반 (브로커가 전달) |
| 메시지 보존 | 설정 기간 유지 (소비해도 삭제 안됨) | 소비 후 삭제 (기본) |
| 재처리 | 쉬움 (offset 재설정) | 어려움 |
| 처리량 | 초당 수백만 건 | 초당 수만 건 |
| 순서 | 파티션 내 보장 | 단일 큐에서 보장 |
| 용도 | 이벤트 스트리밍, 로그, 대용량 | 작업 큐, RPC, 복잡한 라우팅 |

---

## Q6. Consumer Lag이 지속 증가할 때 대처 방법은?

**원인 파악:**
1. 컨슈머 처리 속도 < 프로듀서 발행 속도
2. 특정 파티션의 처리 지연 (핫 파티션)
3. 다운스트림 의존성 병목 (DB, 외부 API)

**해결 방법:**
1. **컨슈머 인스턴스 추가** (파티션 수 이하로)
2. **처리 로직 최적화**: 배치 처리, 비동기 처리
3. **파티션 수 증가** (단, 순서 보장 깨질 수 있음)
4. **`max.poll.records` 증가**로 한 번에 더 많이 처리
5. 핫 파티션이면 키 분산 전략 재검토

---

## Q7. 토픽의 파티션 수를 늘리면 어떤 문제가 생기나요?

**장점:** 병렬 처리 증가, 처리량 향상

**단점:**
- **키 기반 순서 깨짐**: 기존에 `hash("key") % 3`이었던 파티션이 `hash("key") % 6`으로 바뀌어 같은 키가 다른 파티션으로 감
- **메타데이터 오버헤드**: 파티션마다 리더/ISR 정보 관리
- **브로커 리소스 증가**: 파일 핸들, 메모리 사용량 증가

**권장:** 처음부터 충분한 파티션 수를 설정하고, 꼭 필요한 경우에만 증가시킵니다.

---

## Q8. Log Compaction이 필요한 이유는?

일반 retention(`cleanup.policy=delete`)은 시간이나 크기 기준으로 오래된 메시지를 삭제합니다. 하지만 최신 상태만 필요한 데이터에는 비효율적입니다.

Log Compaction(`cleanup.policy=compact`)은 **같은 키의 최신 메시지만 보존**합니다.

```
사용 사례:
- 사용자 프로필 최신 상태 (user-profile 토픽)
- 설정 변경 이력 중 최신 설정
- 재고 현황

동작:
key=user-1, value={"age":25} → 삭제 (이전 값)
key=user-1, value={"age":26} → 유지 (최신 값)
key=user-1, value=null       → Tombstone (삭제 마커)
```

---

## Q9. Kafka를 데이터베이스로 사용할 수 있나요?

**제한적으로 가능** (이벤트 소싱 패턴):
- Log Compaction으로 최신 상태 유지
- `log.retention.ms=-1`로 영구 보존
- Kafka Streams의 State Store (내부적으로 RocksDB)

**하지만 한계:**
- 임의 조회(random access) 불가 — 오프셋 기반만
- 복잡한 쿼리/JOIN 불가
- 트랜잭션이 토픽/파티션 범위로 제한

**결론:** Kafka는 이벤트 스트림 저장소로, 실제 DB 대체보다는 DB와 함께 CQRS/이벤트 소싱 패턴으로 사용합니다.

---

## Q10. Kafka 보안 설정은?

```bash
# 1. 전송 암호화 (TLS/SSL)
listeners=SSL://0.0.0.0:9093
ssl.keystore.location=/var/ssl/kafka.server.keystore.jks
ssl.keystore.password=keystore-password
ssl.truststore.location=/var/ssl/kafka.server.truststore.jks

# 2. 인증 (SASL)
# SASL/PLAIN (간단, 개발용)
# SASL/SCRAM (권장)
# SASL/GSSAPI (Kerberos, 엔터프라이즈)
security.inter.broker.protocol=SASL_SSL
sasl.mechanism.inter.broker.protocol=SCRAM-SHA-512

# 3. 권한 관리 (ACL)
kafka-acls.sh --bootstrap-server localhost:9092 \
  --add --allow-principal User:payment-service \
  --operation Read --topic orders
```
