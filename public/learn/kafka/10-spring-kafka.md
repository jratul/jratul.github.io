---
title: "Spring Kafka"
order: 10
---

## 설정

```kotlin
// build.gradle.kts
implementation("org.springframework.kafka:spring-kafka")
```

```yaml
# application.yml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      acks: all
      properties:
        enable.idempotence: true
        max.in.flight.requests.per.connection: 5
    consumer:
      group-id: my-service
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      auto-offset-reset: earliest
      enable-auto-commit: false
      properties:
        spring.json.trusted.packages: "com.example.*"
    listener:
      ack-mode: MANUAL_IMMEDIATE
      concurrency: 3
```

---

## Producer 설정 (세밀한 제어)

```kotlin
@Configuration
class KafkaProducerConfig {

    @Bean
    fun producerFactory(): ProducerFactory<String, Any> {
        val config = mapOf(
            ProducerConfig.BOOTSTRAP_SERVERS_CONFIG to "localhost:9092",
            ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG to StringSerializer::class.java,
            ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG to JsonSerializer::class.java,
            ProducerConfig.ACKS_CONFIG to "all",
            ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG to true,
            ProducerConfig.RETRIES_CONFIG to 3,
            ProducerConfig.COMPRESSION_TYPE_CONFIG to "snappy"
        )
        return DefaultKafkaProducerFactory(config)
    }

    @Bean
    fun kafkaTemplate(): KafkaTemplate<String, Any> {
        return KafkaTemplate(producerFactory()).apply {
            setObservationEnabled(true)   # Micrometer 연동
        }
    }
}

@Service
class EventPublisher(private val kafkaTemplate: KafkaTemplate<String, Any>) {

    fun publish(topic: String, key: String, event: Any) {
        val record = ProducerRecord(topic, key, event).apply {
            headers().add("event-type", event::class.simpleName!!.toByteArray())
            headers().add("event-id", UUID.randomUUID().toString().toByteArray())
        }

        kafkaTemplate.send(record)
            .whenComplete { result, ex ->
                if (ex != null) {
                    log.error("이벤트 발행 실패: $topic/$key", ex)
                    throw RuntimeException("이벤트 발행 실패", ex)
                }
                log.debug("발행 완료: ${result.recordMetadata.topic()}/${result.recordMetadata.offset()}")
            }
    }

    // 트랜잭션 발행
    fun publishInTransaction(events: List<Pair<String, Any>>) {
        kafkaTemplate.executeInTransaction { ops ->
            events.forEach { (key, event) ->
                ops.send("events", key, event)
            }
        }
    }
}
```

---

## Consumer 설정

```kotlin
@Configuration
@EnableKafka
class KafkaConsumerConfig {

    @Bean
    fun consumerFactory(): ConsumerFactory<String, Any> {
        val config = mapOf(
            ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG to "localhost:9092",
            ConsumerConfig.GROUP_ID_CONFIG to "order-service",
            ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG to StringDeserializer::class.java,
            ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG to JsonDeserializer::class.java,
            ConsumerConfig.AUTO_OFFSET_RESET_CONFIG to "earliest",
            ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG to false,
            JsonDeserializer.TRUSTED_PACKAGES to "com.example.*"
        )
        return DefaultKafkaConsumerFactory(config)
    }

    @Bean
    fun kafkaListenerContainerFactory(
        consumerFactory: ConsumerFactory<String, Any>
    ): ConcurrentKafkaListenerContainerFactory<String, Any> {
        return ConcurrentKafkaListenerContainerFactory<String, Any>().apply {
            setConsumerFactory(consumerFactory)
            containerProperties.ackMode = ContainerProperties.AckMode.MANUAL_IMMEDIATE
            setConcurrency(3)

            // 에러 핸들러
            setCommonErrorHandler(
                DefaultErrorHandler(
                    DeadLetterPublishingRecoverer(kafkaTemplate()) { r, _ ->
                        TopicPartition("${r.topic()}.DLQ", -1)
                    },
                    FixedBackOff(2000L, 3L)
                )
            )
        }
    }
}
```

---

## @KafkaListener

```kotlin
@Component
class OrderEventConsumer(
    private val orderService: OrderService
) {

    // 기본 리스너
    @KafkaListener(topics = ["orders"], groupId = "payment-service")
    fun handleOrder(
        @Payload order: Order,
        @Header(KafkaHeaders.RECEIVED_TOPIC) topic: String,
        @Header(KafkaHeaders.RECEIVED_PARTITION) partition: Int,
        @Header(KafkaHeaders.OFFSET) offset: Long,
        ack: Acknowledgment
    ) {
        try {
            orderService.processPayment(order)
            ack.acknowledge()
        } catch (e: Exception) {
            log.error("결제 처리 실패: orderId=${order.id}", e)
            // 재시도를 위해 ack 안함
        }
    }

    // 여러 토픽
    @KafkaListener(topics = ["orders", "order-updates"])
    fun handleMultipleTopics(record: ConsumerRecord<String, String>) { ... }

    // 특정 파티션
    @KafkaListener(
        topicPartitions = [
            TopicPartitionOffset(topic = "orders", partitions = ["0", "1"])
        ]
    )
    fun handleSpecificPartitions(record: ConsumerRecord<String, Order>) { ... }

    // 배치 처리
    @KafkaListener(topics = ["logs"], batch = "true")
    fun handleBatch(
        records: List<ConsumerRecord<String, LogEvent>>,
        ack: Acknowledgment
    ) {
        records.forEach { processLog(it.value()) }
        ack.acknowledge()
    }

    // 필터링 (조건에 맞는 메시지만 처리)
    @KafkaListener(topics = ["orders"],
                   filter = "paidOrdersFilter")
    fun handlePaidOrders(order: Order) {
        // status=PAID인 주문만 처리
    }
}

@Configuration
class KafkaFilterConfig {
    @Bean
    fun paidOrdersFilter() = RecordFilterStrategy<String, Order> { record ->
        record.value().status != OrderStatus.PAID  // true면 무시
    }
}
```

---

## 메시지 헤더 활용

```kotlin
// 발행 시 헤더 추가
fun publishWithHeaders(event: OrderEvent) {
    val message = MessageBuilder
        .withPayload(event)
        .setHeader(KafkaHeaders.TOPIC, "orders")
        .setHeader(KafkaHeaders.KEY, event.orderId)
        .setHeader("event-type", "ORDER_CREATED")
        .setHeader("trace-id", MDC.get("traceId"))
        .build()

    kafkaTemplate.send(message)
}

// 소비 시 헤더 읽기
@KafkaListener(topics = ["orders"])
fun consume(
    @Payload order: Order,
    @Header("event-type") eventType: String,
    @Header("trace-id", required = false) traceId: String?
) {
    MDC.put("traceId", traceId ?: "unknown")
    log.info("[$eventType] 이벤트 처리: orderId=${order.id}")
}
```

---

## 테스트

```kotlin
@SpringBootTest
@EmbeddedKafka(
    partitions = 3,
    topics = ["orders", "payments"],
    brokerProperties = ["listeners=PLAINTEXT://localhost:9092", "port=9092"]
)
class OrderEventIntegrationTest {

    @Autowired
    lateinit var kafkaTemplate: KafkaTemplate<String, Any>

    @Autowired
    lateinit var orderConsumer: OrderEventConsumer

    @Test
    fun `주문 이벤트를 수신하면 결제를 처리한다`() {
        val order = Order(id = 1L, total = 50000)

        kafkaTemplate.send("orders", order.id.toString(), order)

        // 컨슈머가 처리할 때까지 대기
        await().atMost(10, SECONDS).untilAsserted {
            verify(orderService).processPayment(order)
        }
    }
}
```
