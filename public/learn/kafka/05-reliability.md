---
title: "신뢰성과 전송 보장"
order: 5
---

## 전송 보장 수준

```
At-most-once  (최대 한 번):   메시지 손실 가능, 중복 없음
At-least-once (최소 한 번):   중복 가능, 손실 없음    ← 가장 일반적
Exactly-once  (정확히 한 번): 손실/중복 모두 없음     ← 복잡하고 성능 저하
```

---

## 메시지 손실 방지 (Producer 측)

```kotlin
// 신뢰성 높은 프로듀서 설정
val props = Properties().apply {
    put(ProducerConfig.ACKS_CONFIG, "all")                           # ISR 전체 확인
    put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true)              # 중복 방지
    put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5)     # 순서 유지
    put(ProducerConfig.RETRIES_CONFIG, Int.MAX_VALUE)                # 무한 재시도
    put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120000)           # 2분 타임아웃
}
```

```bash
# 브로커 설정 (server.properties)
default.replication.factor=3        # 기본 복제 팩터
min.insync.replicas=2               # 최소 동기화 레플리카
unclean.leader.election.enable=false  # 비동기 레플리카가 리더 되는 것 방지
```

---

## 메시지 중복 처리 (Consumer 측)

멱등성(Idempotency) 처리가 핵심입니다.

```kotlin
@Service
class OrderEventConsumer(
    private val orderRepository: OrderRepository,
    private val processedEventRepository: ProcessedEventRepository
) {

    @KafkaListener(topics = ["orders"])
    fun consume(record: ConsumerRecord<String, String>) {
        val eventId = record.headers().lastHeader("event-id")?.value()?.let { String(it) }
            ?: "${record.topic()}-${record.partition()}-${record.offset()}"

        // 중복 처리 방지: 이미 처리한 이벤트 무시
        if (processedEventRepository.existsById(eventId)) {
            log.info("중복 이벤트 무시: $eventId")
            return
        }

        val order = objectMapper.readValue<Order>(record.value())
        orderRepository.save(order)
        processedEventRepository.save(ProcessedEvent(id = eventId, processedAt = Instant.now()))
    }
}
```

---

## Dead Letter Queue (DLQ)

처리 실패한 메시지를 별도 토픽으로 분리합니다.

```kotlin
@Configuration
class KafkaConfig {

    @Bean
    fun kafkaListenerContainerFactory(
        consumerFactory: ConsumerFactory<String, String>
    ): ConcurrentKafkaListenerContainerFactory<String, String> {
        return ConcurrentKafkaListenerContainerFactory<String, String>().apply {
            setConsumerFactory(consumerFactory)
            setCommonErrorHandler(
                DefaultErrorHandler(
                    DeadLetterPublishingRecoverer(kafkaTemplate()) { record, ex ->
                        // DLQ 토픽 이름 결정
                        TopicPartition("${record.topic()}.DLQ", -1)
                    },
                    FixedBackOff(1000L, 3)   # 1초 간격으로 3번 재시도
                )
            )
        }
    }
}

// DLQ 컨슈머: 실패 메시지 분석 및 수동 재처리
@KafkaListener(topics = ["orders.DLQ"])
fun consumeDlq(record: ConsumerRecord<String, String>) {
    log.error("DLQ 메시지: offset=${record.offset()}, value=${record.value()}")
    // Slack 알림, 수동 처리 큐 등록 등
}
```

---

## 재시도 전략

```kotlin
// 지수 백오프 재시도
val backOff = ExponentialBackOff(
    initialInterval = 1000L,   # 초기 1초
    multiplier = 2.0,          # 2배씩
    maxInterval = 30000L,      # 최대 30초
    maxElapsedTime = 300000L   # 5분 후 포기
)

@Bean
fun kafkaListenerContainerFactory() =
    ConcurrentKafkaListenerContainerFactory<String, String>().apply {
        setCommonErrorHandler(
            DefaultErrorHandler(
                DeadLetterPublishingRecoverer(kafkaTemplate()),
                backOff
            )
        )
    }
```

---

## Exactly-Once Semantics (EOS)

```kotlin
// 프로듀서: 트랜잭션 활성화
val producerProps = Properties().apply {
    put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "order-processor-1")
    put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true)
}

// 컨슈머: read_committed 격리 수준
val consumerProps = Properties().apply {
    put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed")  # 커밋된 메시지만 읽음
    put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false)
}

// Consume-Transform-Produce 패턴
producer.initTransactions()

while (true) {
    val records = consumer.poll(Duration.ofMillis(100))

    producer.beginTransaction()
    try {
        for (record in records) {
            val result = transform(record.value())
            producer.send(ProducerRecord("output-topic", record.key(), result))
        }

        // 컨슈머 오프셋도 트랜잭션으로 커밋
        val offsets = records.partitions().associate { partition ->
            partition to OffsetAndMetadata(records.records(partition).last().offset() + 1)
        }
        producer.sendOffsetsToTransaction(offsets, consumer.groupMetadata())
        producer.commitTransaction()
    } catch (e: Exception) {
        producer.abortTransaction()
    }
}
```

---

## 메시지 순서 보장

```
파티션 내에서만 순서 보장됨!

순서가 중요한 데이터:
- 같은 키 사용 → 같은 파티션에 배분

예시: 주문 상태 변경
key = orderId
value = {"status": "CREATED"}  → partition 2, offset 10
value = {"status": "PAID"}     → partition 2, offset 11
value = {"status": "SHIPPED"}  → partition 2, offset 12
→ 컨슈머는 항상 10 → 11 → 12 순으로 처리

주의: max.in.flight.requests.per.connection > 1이면
  재시도 시 순서가 바뀔 수 있음
  → enable.idempotence=true로 해결
```

---

## Kafka 메트릭 모니터링

```bash
# 중요 메트릭:

# Producer:
# kafka.producer:type=producer-metrics,client-id=X
# record-error-rate     → 에러 발생률 (0이어야 함)
# request-latency-avg   → 평균 요청 지연시간
# record-queue-time-avg → 버퍼 대기 시간

# Consumer:
# kafka.consumer:type=consumer-fetch-manager-metrics,client-id=X
# records-lag-max       → 최대 lag (핵심 지표)
# fetch-latency-avg     → fetch 지연시간

# Broker:
# kafka.server:type=BrokerTopicMetrics,name=MessagesInPerSec
# kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions → 0이어야 함

# JMX로 수집 후 Prometheus + Grafana 연동
```
