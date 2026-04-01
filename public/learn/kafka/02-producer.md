---
title: "Producer"
order: 2
---

## Producer 동작 원리

```
애플리케이션
    ↓ send(ProducerRecord)
Serializer (key/value → bytes)
    ↓
Partitioner (어느 파티션으로?)
    ↓
RecordAccumulator (배치 버퍼)
    ↓ (batch.size 또는 linger.ms 충족 시)
Sender → Broker Leader
    ↓
acks 응답 수신
```

---

## Kotlin / Java Producer 설정

```kotlin
// build.gradle.kts
implementation("org.apache.kafka:kafka-clients:3.6.1")
// 또는 Spring Kafka
implementation("org.springframework.kafka:spring-kafka")
```

```kotlin
val props = Properties().apply {
    put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092")
    put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,   StringSerializer::class.java)
    put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer::class.java)

    // 처리량 최적화
    put(ProducerConfig.BATCH_SIZE_CONFIG,       16384)      # 16KB 배치
    put(ProducerConfig.LINGER_MS_CONFIG,        10)         # 10ms 대기 후 전송
    put(ProducerConfig.BUFFER_MEMORY_CONFIG,    33554432)   # 32MB 버퍼

    // 신뢰성
    put(ProducerConfig.ACKS_CONFIG,                 "all")  # 모든 ISR 확인
    put(ProducerConfig.RETRIES_CONFIG,              3)
    put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG,   true)   # 중복 방지
    put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5)

    // 압축
    put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "snappy")   # none | gzip | snappy | lz4 | zstd
}

val producer = KafkaProducer<String, String>(props)
```

---

## 메시지 발행

```kotlin
// 1. Fire and forget (비동기, 확인 없음)
producer.send(ProducerRecord("orders", "key-1", "order-created"))

// 2. 비동기 + 콜백
producer.send(
    ProducerRecord("orders", "key-1", """{"orderId": 1, "status": "created"}""")
) { metadata, exception ->
    if (exception != null) {
        log.error("전송 실패: ${exception.message}")
    } else {
        log.info("전송 성공: topic=${metadata.topic()}, partition=${metadata.partition()}, offset=${metadata.offset()}")
    }
}

// 3. 동기 전송 (응답 대기)
val metadata: RecordMetadata = producer.send(
    ProducerRecord("orders", "key-1", "order-created")
).get(5, TimeUnit.SECONDS)

// 반드시 닫기
producer.flush()   // 버퍼의 미전송 메시지 전송
producer.close()
```

---

## 파티셔닝 전략

```kotlin
// 기본 파티셔너 동작
// - 키가 있으면: hash(key) % 파티션 수 → 같은 키는 항상 같은 파티션
// - 키가 없으면: 라운드로빈 (Sticky Partitioner)

// 직접 파티션 지정
producer.send(ProducerRecord("orders", 2, "key-1", "value"))  // partition=2 강제 지정

// 커스텀 파티셔너
class PriorityPartitioner : Partitioner {
    override fun partition(topic: String, key: Any?, keyBytes: ByteArray?,
                           value: Any?, valueBytes: ByteArray?, cluster: Cluster): Int {
        val orderType = (value as String).let {
            if (it.contains("VIP")) 0 else 1  // VIP는 파티션 0 (전용)
        }
        return orderType
    }
    override fun close() {}
    override fun configure(configs: Map<String, *>) {}
}

props[ProducerConfig.PARTITIONER_CLASS_CONFIG] = PriorityPartitioner::class.java
```

---

## acks 설정과 신뢰성

```
acks=0: 브로커 응답 없음 — 가장 빠름, 메시지 손실 가능
acks=1: Leader만 확인 — 중간 성능, Leader 장애 시 손실 가능
acks=all (-1): ISR 전체 확인 — 가장 안전, 느림

ISR(In-Sync Replicas): Leader와 동기화된 Follower 목록
```

```kotlin
// 중요 데이터 (결제, 주문)
put(ProducerConfig.ACKS_CONFIG, "all")
put(ProducerConfig.MIN_INSYNC_REPLICAS_CONFIG, 2)  # 최소 2개 ISR 확인
// → min.insync.replicas는 브로커/토픽 설정, 프로듀서가 직접 설정하진 않음

// 로그 데이터 (손실 허용)
put(ProducerConfig.ACKS_CONFIG, "0")
```

---

## 멱등성 프로듀서 (Idempotent Producer)

재시도로 인한 중복 메시지 방지.

```kotlin
put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true)
// 자동으로 다음 설정도 강제:
// acks=all, retries=MAX_INT, max.in.flight.requests.per.connection <= 5
```

```
메커니즘:
1. 프로듀서가 각 메시지에 (PID, SequenceNumber) 부여
2. 브로커가 중복 시퀀스를 감지해 무시
3. 동일 파티션에서만 보장
```

---

## 트랜잭셔널 프로듀서

여러 파티션/토픽에 원자적으로 메시지 발행 (exactly-once semantics).

```kotlin
props[ProducerConfig.TRANSACTIONAL_ID_CONFIG] = "order-producer-1"
props[ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG] = true

val producer = KafkaProducer<String, String>(props)
producer.initTransactions()

try {
    producer.beginTransaction()

    producer.send(ProducerRecord("orders", key, orderJson))
    producer.send(ProducerRecord("order-events", key, eventJson))

    producer.commitTransaction()
} catch (e: Exception) {
    producer.abortTransaction()
    throw e
} finally {
    producer.close()
}
```

---

## Spring Kafka Producer

```kotlin
@Configuration
class KafkaProducerConfig {

    @Bean
    fun kafkaTemplate(): KafkaTemplate<String, Any> {
        val configProps = mapOf(
            ProducerConfig.BOOTSTRAP_SERVERS_CONFIG to "localhost:9092",
            ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG to StringSerializer::class.java,
            ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG to JsonSerializer::class.java,
            ProducerConfig.ACKS_CONFIG to "all",
            ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG to true
        )
        return KafkaTemplate(DefaultKafkaProducerFactory(configProps))
    }
}

@Service
class OrderProducer(private val kafkaTemplate: KafkaTemplate<String, Any>) {

    fun sendOrderCreated(order: Order) {
        val future = kafkaTemplate.send("orders", order.id.toString(), order)
        future.whenComplete { result, ex ->
            if (ex != null) {
                log.error("주문 이벤트 전송 실패", ex)
            } else {
                log.info("전송: partition=${result.recordMetadata.partition()}, offset=${result.recordMetadata.offset()}")
            }
        }
    }
}
```
