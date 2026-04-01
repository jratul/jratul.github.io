---
title: "토픽 설계와 파티션"
order: 4
---

## 토픽 네이밍 규칙

```
권장 패턴: {도메인}.{이벤트타입}.{버전}
예시:
  orders.created.v1
  orders.payment-completed.v1
  users.registered.v1
  inventory.stock-decreased.v1

또는: {팀}.{서비스}.{이벤트}
  checkout.order-service.created
```

---

## 파티션 수 결정

```
파티션 수 = 최대 병렬 컨슈머 수

결정 기준:
1. 목표 처리량 ÷ 브로커당 처리량 (보통 10~50MB/s)
2. 컨슈머 인스턴스 수
3. 키 카디널리티 (키 종류 수보다 많아야 고른 분산)

예시:
  목표: 100MB/s
  브로커당: 30MB/s
  → 최소 4개 파티션

주의:
  - 파티션 수는 줄이기 어렵다 (늘리기는 가능하지만 키 기반 순서 깨짐)
  - 파티션이 많을수록 메모리/연결 오버헤드 증가
  - 권장: 처음엔 예상보다 약간 많게, 나중에 필요 시 증가
```

```bash
# 토픽 생성
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partitions 6 \
  --replication-factor 3 \
  --config retention.ms=604800000 \   # 7일 보존
  --config min.insync.replicas=2

# 파티션 수 증가 (순서 보장 깨질 수 있음)
kafka-topics.sh --alter \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partitions 12
```

---

## 복제 팩터 설정

```
replication-factor 결정:
  개발 환경: 1 (복제 없음, 빠름)
  스테이징: 2
  프로덕션: 3 (일반적)

min.insync.replicas:
  replication-factor=3이면 min.insync.replicas=2 권장
  → 최소 2개 브로커가 동기화 완료 후 acks 응답
  → 브로커 1개 장애 시에도 안전
```

---

## 토픽 설정

```bash
# 토픽별 설정 변경
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name orders \
  --alter \
  --add-config \
    retention.ms=86400000,\          # 1일 보존
    min.insync.replicas=2,\
    compression.type=snappy,\
    max.message.bytes=10485760       # 최대 메시지 크기 10MB

# 설정 확인
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name orders \
  --describe
```

**주요 토픽 설정:**

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `retention.ms` | 7일 | 메시지 보존 기간 |
| `retention.bytes` | 무제한 | 파티션당 최대 크기 |
| `min.insync.replicas` | 1 | 최소 동기화 레플리카 수 |
| `compression.type` | producer | 압축 방식 |
| `max.message.bytes` | 1MB | 최대 메시지 크기 |
| `cleanup.policy` | delete | 보존 정책 (delete / compact) |
| `segment.ms` | 7일 | 세그먼트 롤링 주기 |

---

## Log Compaction

`cleanup.policy=compact`로 설정하면 **같은 키의 최신 메시지만 보존**합니다.

```
이벤트 순서:
key=user-1, value={"name": "홍길동", "age": 25}
key=user-1, value={"name": "홍길동", "age": 26}  ← 이것만 보존
key=user-2, value={"name": "김철수"}              ← 보존

사용 사례:
- 사용자 프로필 최신 상태
- 재고 현황
- 설정 값

Tombstone: value=null이면 해당 키 삭제
```

```bash
# Compaction 토픽 생성
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic user-profiles \
  --partitions 3 \
  --replication-factor 3 \
  --config cleanup.policy=compact \
  --config min.cleanable.dirty.ratio=0.5 \
  --config segment.ms=86400000
```

---

## 키 설계와 파티션 분산

```kotlin
// ❌ 나쁜 예: 키 편중 → 특정 파티션에 부하 집중
producer.send(ProducerRecord("orders", "ORDER", orderJson))
// 모든 메시지가 파티션 X에만 몰림

// ✅ 좋은 예: 높은 카디널리티 키
producer.send(ProducerRecord("orders", order.userId.toString(), orderJson))
// userId가 고르게 분산 → 파티션도 고르게 분산

// ✅ 순서가 중요한 경우
producer.send(ProducerRecord("order-events", order.orderId.toString(), eventJson))
// 같은 주문의 이벤트는 항상 같은 파티션 → 순서 보장
```

---

## 토픽 수 관리

```
고려사항:
- Kafka는 토픽/파티션 수에 비례해 메모리/파일 핸들 사용
- 너무 많은 토픽 → 브로커 과부하

안티패턴:
❌ 이벤트마다 토픽 (user-created, user-updated, user-deleted)
✅ 도메인 단위 토픽 (user-events) + 이벤트 타입은 메시지 헤더/본문에

❌ 서비스마다 전용 토픽 (payment-to-notification, payment-to-analytics)
✅ 이벤트 토픽 공유 (payment-completed) + 여러 컨슈머 그룹이 구독
```

---

## 컨슈머 랙 (Consumer Lag) 모니터링

Consumer Lag = Log End Offset - Consumer Current Offset

```bash
# 컨슈머 그룹 상태 확인
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group payment-service \
  --describe

# 출력 예시:
# GROUP           TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# payment-service orders  0          1024            1050            26  ← 26개 밀림
# payment-service orders  1          2048            2048            0

# Lag이 지속 증가하면: 컨슈머 처리 속도 < 프로듀서 발행 속도
# → 컨슈머 인스턴스 추가 또는 처리 로직 최적화 필요
```
