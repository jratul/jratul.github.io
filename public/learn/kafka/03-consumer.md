---
title: "Consumer와 Consumer Group"
order: 3
---

## Consumer Group

```
Topic: orders (3 partitions)

Consumer Group A (결제 서비스):
  Consumer A1 → Partition 0
  Consumer A2 → Partition 1
  Consumer A3 → Partition 2

Consumer Group B (알림 서비스):
  Consumer B1 → Partition 0, 1, 2  (혼자 모두 소비)
```

**핵심 규칙:**
- 같은 그룹 내 하나의 파티션은 **하나의 컨슈머**에만 할당
- 컨슈머 수 > 파티션 수이면 일부 컨슈머는 놀게 됨
- 여러 그룹이 같은 토픽을 독립적으로 소비 가능

---

## Consumer 기본 설정

```kotlin
val props = Properties().apply {
    put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,  "localhost:9092")
    put(ConsumerConfig.GROUP_ID_CONFIG,            "payment-service")
    put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,   StringDeserializer::class.java)
    put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer::class.java)

    // 오프셋 초기 위치 (그룹이 처음 시작할 때)
    put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest")  # earliest | latest | none

    // 자동 커밋 (기본 true)
    put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG,     false)   # 수동 커밋 권장
    put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, 5000)

    // 폴링 설정
    put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG,          500)   # 한 번에 최대 500개
    put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG,    300000)  # 5분 내 poll 안하면 리밸런스
    put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG,       45000)  # 45초 내 하트비트 없으면 제거
}
```

---

## 메시지 소비

```kotlin
val consumer = KafkaConsumer<String, String>(props)
consumer.subscribe(listOf("orders"))     # 토픽 구독
// consumer.assign(listOf(TopicPartition("orders", 0)))  # 파티션 직접 할당

try {
    while (true) {
        val records: ConsumerRecords<String, String> = consumer.poll(Duration.ofMillis(100))

        for (record in records) {
            println("""
                topic: ${record.topic()}, partition: ${record.partition()},
                offset: ${record.offset()}, key: ${record.key()},
                value: ${record.value()}
            """.trimIndent())

            processRecord(record)
        }

        // 수동 커밋 (동기)
        consumer.commitSync()

        // 또는 비동기 커밋
        consumer.commitAsync { offsets, exception ->
            if (exception != null) {
                log.error("커밋 실패: $offsets", exception)
            }
        }
    }
} finally {
    consumer.close()
}
```

---

## 오프셋 관리

```kotlin
// 특정 오프셋 커밋
val offsets = mapOf(
    TopicPartition("orders", 0) to OffsetAndMetadata(record.offset() + 1)
)
consumer.commitSync(offsets)

// 특정 오프셋으로 이동 (재처리 시)
consumer.seek(TopicPartition("orders", 0), 100L)   # offset 100부터 다시 읽기

// 처음부터 다시
consumer.seekToBeginning(consumer.assignment())

// 마지막 오프셋으로
consumer.seekToEnd(consumer.assignment())
```

---

## 리밸런싱 (Rebalancing)

컨슈머 그룹에 컨슈머가 추가/제거될 때 파티션 재할당이 발생합니다.

**리밸런싱 발생 시점:**
- 컨슈머 새로 합류
- 컨슈머 종료 또는 장애
- `max.poll.interval.ms` 초과 (처리 시간 너무 긴 경우)
- 파티션 수 변경

```kotlin
// 리밸런싱 콜백으로 처리 중인 데이터 커밋
consumer.subscribe(listOf("orders"), object : ConsumerRebalanceListener {
    override fun onPartitionsRevoked(partitions: Collection<TopicPartition>) {
        // 리밸런싱 전: 현재까지 처리한 오프셋 커밋
        consumer.commitSync(currentOffsets)
    }

    override fun onPartitionsAssigned(partitions: Collection<TopicPartition>) {
        // 새 파티션 할당 후: 초기화 작업
        log.info("새로 할당된 파티션: $partitions")
    }
})
```

---

## 처리 보장 수준

```
At-most-once (최대 한 번):
  poll → commitOffset → process
  문제: 커밋 후 처리 실패 시 메시지 손실

At-least-once (최소 한 번, 일반적):
  poll → process → commitOffset
  문제: 처리 후 커밋 전 장애 시 중복 처리 가능

Exactly-once (정확히 한 번):
  트랜잭션 프로듀서 + 트랜잭션 컨슈머 + isolation.level=read_committed
  복잡하고 성능 저하 있음
```

```kotlin
// At-least-once 구현
for (record in records) {
    try {
        processRecord(record)                    // 1. 처리
        consumer.commitSync(mapOf(               // 2. 성공 시 커밋
            TopicPartition(record.topic(), record.partition()) to
            OffsetAndMetadata(record.offset() + 1)
        ))
    } catch (e: Exception) {
        log.error("처리 실패, 재처리 예정: offset=${record.offset()}", e)
        // 커밋하지 않으면 다음 poll 시 다시 읽음
    }
}
```

---

## Spring Kafka Consumer

```kotlin
@Configuration
@EnableKafka
class KafkaConsumerConfig {

    @Bean
    fun consumerFactory(): ConsumerFactory<String, String> {
        val config = mapOf(
            ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG to "localhost:9092",
            ConsumerConfig.GROUP_ID_CONFIG to "payment-service",
            ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG to StringDeserializer::class.java,
            ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG to StringDeserializer::class.java,
            ConsumerConfig.AUTO_OFFSET_RESET_CONFIG to "earliest",
            ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG to false
        )
        return DefaultKafkaConsumerFactory(config)
    }

    @Bean
    fun kafkaListenerContainerFactory(): ConcurrentKafkaListenerContainerFactory<String, String> {
        return ConcurrentKafkaListenerContainerFactory<String, String>().apply {
            consumerFactory = consumerFactory()
            containerProperties.ackMode = ContainerProperties.AckMode.MANUAL_IMMEDIATE
            setConcurrency(3)   # 3개 스레드 (파티션 수 이하)
        }
    }
}

@Component
class OrderConsumer {

    @KafkaListener(
        topics = ["orders"],
        groupId = "payment-service",
        containerFactory = "kafkaListenerContainerFactory"
    )
    fun consume(record: ConsumerRecord<String, String>, ack: Acknowledgment) {
        try {
            val order = objectMapper.readValue<Order>(record.value())
            processPayment(order)
            ack.acknowledge()   # 수동 커밋
        } catch (e: Exception) {
            log.error("처리 실패", e)
            // ack 안 하면 재처리
        }
    }

    // 배치 처리
    @KafkaListener(topics = ["logs"], batch = "true")
    fun consumeBatch(records: List<ConsumerRecord<String, String>>, ack: Acknowledgment) {
        records.forEach { processLog(it) }
        ack.acknowledge()
    }
}
```
