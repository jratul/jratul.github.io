---
title: "Kafka Streams"
order: 7
---

## Kafka Streams란?

Kafka Streams는 Kafka 위에서 **스트림 처리**를 위한 라이브러리입니다. 별도 클러스터 없이 일반 Java/Kotlin 애플리케이션으로 실행됩니다.

```
Kafka Topic (입력) → Kafka Streams 처리 → Kafka Topic (출력)
또는 → KTable (상태 저장)
```

---

## 핵심 개념

| 개념 | 설명 |
|------|------|
| **KStream** | 무한 이벤트 스트림. 각 레코드가 독립적인 이벤트 |
| **KTable** | 최신 상태를 나타내는 테이블. 같은 키의 최신값만 유지 |
| **GlobalKTable** | 모든 파티션 데이터를 로컬에 복제 (소규모 참조 테이블) |
| **Topology** | 처리 그래프 정의 |
| **State Store** | 집계/조인을 위한 로컬 저장소 (RocksDB) |

---

## 기본 설정

```kotlin
// build.gradle.kts
implementation("org.apache.kafka:kafka-streams:3.6.1")

val props = Properties().apply {
    put(StreamsConfig.APPLICATION_ID_CONFIG, "order-processor")   # Consumer Group ID 역할
    put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092")
    put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG,   Serdes.String()::class.java)
    put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String()::class.java)
    put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 4)               # 처리 스레드 수
    put(StreamsConfig.REPLICATION_FACTOR_CONFIG, 3)               # 내부 토픽 복제 팩터
    put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2)
}
```

---

## 기본 스트림 처리

```kotlin
val builder = StreamsBuilder()

// 토픽에서 스트림 생성
val orderStream: KStream<String, String> = builder.stream("orders")

// 필터링
val paidOrders = orderStream
    .filter { _, value -> value.contains("\"status\":\"PAID\"") }

// 값 변환
val orderEvents = orderStream
    .mapValues { value ->
        val order = objectMapper.readValue<Order>(value)
        OrderEvent(orderId = order.id, type = "CREATED", timestamp = Instant.now())
    }
    .mapValues { event -> objectMapper.writeValueAsString(event) }

// 결과를 다른 토픽으로
orderEvents.to("order-events")

// 필터링 후 분기
val (highValueOrders, normalOrders) = orderStream.branch(
    { _, v -> objectMapper.readValue<Order>(v).total > 1_000_000 },
    { _, _ -> true }
)
highValueOrders.to("high-value-orders")
normalOrders.to("normal-orders")

val streams = KafkaStreams(builder.build(), props)
streams.start()

// 종료 시 정리
Runtime.getRuntime().addShutdownHook(Thread { streams.close() })
```

---

## 집계 (Aggregation)

```kotlin
val builder = StreamsBuilder()
val orderStream: KStream<String, Order> = builder.stream(
    "orders",
    Consumed.with(Serdes.String(), orderSerde)
)

// 카테고리별 주문 수 집계
val orderCountByCategory: KTable<String, Long> = orderStream
    .groupBy { _, order -> order.category }   # 새 키로 리그루핑
    .count(Materialized.`as`("order-count-store"))

// 카테고리별 매출 합산
val revenueByCategory: KTable<String, Long> = orderStream
    .groupBy { _, order -> order.category }
    .aggregate(
        { 0L },   # 초기값
        { _, order, aggregate -> aggregate + order.total },
        Materialized.`as`("revenue-store")
    )

// 집계 결과를 토픽으로
orderCountByCategory.toStream().to("order-count-by-category")
```

---

## 윈도우 집계 (Windowing)

```kotlin
// 1분 간격 텀블링 윈도우
val orderStream: KStream<String, Order> = builder.stream("orders")

val windowedCount: KTable<Windowed<String>, Long> = orderStream
    .groupByKey()
    .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(1)))
    .count()

windowedCount.toStream()
    .map { windowedKey, count ->
        val start = Instant.ofEpochMilli(windowedKey.window().start())
        KeyValue("${windowedKey.key()}@${start}", count.toString())
    }
    .to("order-count-per-minute")
```

**윈도우 타입:**

| 타입 | 설명 |
|------|------|
| `Tumbling` | 고정 크기, 겹치지 않음 (1분, 1분, 1분...) |
| `Hopping` | 고정 크기, 겹침 (1분 윈도우, 30초마다) |
| `Sliding` | 두 이벤트 간 시간 차이 기반 |
| `Session` | 이벤트 없는 gap으로 구분 |

---

## 스트림 조인

```kotlin
// KStream-KStream 조인 (시간 윈도우 필요)
val orderStream: KStream<String, Order> = builder.stream("orders")
val paymentStream: KStream<String, Payment> = builder.stream("payments")

val enrichedOrders = orderStream.join(
    paymentStream,
    { order, payment -> EnrichedOrder(order, payment) },
    JoinWindows.ofTimeDifferenceWithNoGrace(Duration.ofMinutes(5))
)
enrichedOrders.to("enriched-orders")

// KStream-KTable 조인 (윈도우 불필요 — 테이블의 현재 상태로)
val userTable: KTable<String, User> = builder.table("users")

val ordersWithUser = orderStream.join(
    userTable,
    { order, user -> order.copy(userName = user.name) }
)
```

---

## 인터랙티브 쿼리 (Interactive Queries)

State Store에서 실시간으로 집계 상태를 조회합니다.

```kotlin
// State Store 조회
val streams = KafkaStreams(builder.build(), props)
streams.start()

// REST API에서 조회
fun getOrderCount(category: String): Long? {
    val store = streams.store(
        StoreQueryParameters.fromNameAndType(
            "order-count-store",
            QueryableStoreTypes.keyValueStore<String, Long>()
        )
    )
    return store.get(category)
}

// 모든 집계 결과 조회
fun getAllCategoryCounts(): Map<String, Long> {
    val store = streams.store(...)
    val result = mutableMapOf<String, Long>()
    store.all().forEachRemaining { kv -> result[kv.key] = kv.value }
    return result
}
```

---

## Spring Boot + Kafka Streams

```kotlin
@Configuration
@EnableKafkaStreams
class KafkaStreamsConfig {

    @Bean(name = [KafkaStreamsDefaultConfiguration.DEFAULT_STREAMS_CONFIG_BEAN_NAME])
    fun kStreamsConfig(): KafkaStreamsConfiguration {
        return KafkaStreamsConfiguration(mapOf(
            StreamsConfig.APPLICATION_ID_CONFIG to "order-processor",
            StreamsConfig.BOOTSTRAP_SERVERS_CONFIG to "localhost:9092",
            StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG to Serdes.String()::class.java.name,
            StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG to Serdes.String()::class.java.name
        ))
    }
}

@Component
class OrderStreamProcessor {

    @Autowired
    fun buildPipeline(streamsBuilder: StreamsBuilder) {
        val orders: KStream<String, String> = streamsBuilder.stream("orders")

        orders
            .filter { _, v -> v.contains("PAID") }
            .to("paid-orders")
    }
}
```
