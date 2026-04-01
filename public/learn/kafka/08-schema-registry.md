---
title: "Schema Registry와 Avro"
order: 8
---

## Schema Registry란?

Schema Registry는 **Kafka 메시지의 스키마를 중앙에서 관리**하는 서버입니다. 주로 Confluent Platform이나 AWS Glue Schema Registry를 사용합니다.

```
Producer → [스키마 등록/조회] → Schema Registry
         → [스키마 ID + 직렬화된 데이터] → Kafka → [스키마 ID로 역직렬화] → Consumer
```

**장점:**
- 스키마 버전 관리 및 호환성 검증
- 메시지 크기 감소 (스키마를 메시지마다 포함하지 않음)
- 프로듀서/컨슈머 간 계약(Contract) 명확화

---

## Apache Avro

Avro는 Schema Registry와 함께 가장 많이 사용하는 직렬화 포맷입니다.

```json
// Order.avsc (Avro 스키마)
{
  "type": "record",
  "name": "Order",
  "namespace": "com.example.shop",
  "fields": [
    { "name": "id",         "type": "long" },
    { "name": "userId",     "type": "string" },
    { "name": "totalPrice", "type": "double" },
    { "name": "status",     "type": {
        "type": "enum",
        "name": "OrderStatus",
        "symbols": ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]
    }},
    { "name": "createdAt",  "type": "long", "logicalType": "timestamp-millis" },
    { "name": "note",       "type": ["null", "string"], "default": null }
  ]
}
```

---

## 설정

```yaml
# docker-compose.yml에 Schema Registry 추가
schema-registry:
  image: confluentinc/cp-schema-registry:7.6.0
  environment:
    SCHEMA_REGISTRY_HOST_NAME: schema-registry
    SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: kafka:9092
    SCHEMA_REGISTRY_LISTENERS: http://0.0.0.0:8081
  ports:
    - "8081:8081"
```

```kotlin
// build.gradle.kts
implementation("io.confluent:kafka-avro-serializer:7.6.0")
implementation("org.apache.avro:avro:1.11.3")

// Avro 클래스 자동 생성 플러그인
id("com.github.davidmc24.gradle.plugin.avro") version "1.9.1"
```

---

## Avro Producer

```kotlin
val props = Properties().apply {
    put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092")
    put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,   StringSerializer::class.java)
    put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer::class.java)
    put(AbstractKafkaSchemaSerDeConfig.SCHEMA_REGISTRY_URL_CONFIG, "http://localhost:8081")
    put(KafkaAvroSerializerConfig.AUTO_REGISTER_SCHEMAS, true)   # 개발 시 true
}

val producer = KafkaProducer<String, Order>(props)

val order = Order.newBuilder()
    .setId(1L)
    .setUserId("user-123")
    .setTotalPrice(59000.0)
    .setStatus(OrderStatus.PAID)
    .setCreatedAt(Instant.now().toEpochMilli())
    .build()

producer.send(ProducerRecord("orders", order.userId, order))
```

---

## Avro Consumer

```kotlin
val props = Properties().apply {
    put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092")
    put(ConsumerConfig.GROUP_ID_CONFIG, "order-processor")
    put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,   StringDeserializer::class.java)
    put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, KafkaAvroDeserializer::class.java)
    put(AbstractKafkaSchemaSerDeConfig.SCHEMA_REGISTRY_URL_CONFIG, "http://localhost:8081")
    put(KafkaAvroDeserializerConfig.SPECIFIC_AVRO_READER_CONFIG, true)   # 생성된 클래스로 역직렬화
}

val consumer = KafkaConsumer<String, Order>(props)
consumer.subscribe(listOf("orders"))

consumer.poll(Duration.ofMillis(100)).forEach { record ->
    val order: Order = record.value()
    println("주문: ${order.id}, 상태: ${order.status}")
}
```

---

## 스키마 호환성 정책

```bash
# 호환성 정책 설정
# BACKWARD: 새 스키마로 이전 데이터 읽기 가능 (기본값, 권장)
# FORWARD: 이전 스키마로 새 데이터 읽기 가능
# FULL: 양방향 호환
# NONE: 호환성 검사 없음

# 전역 설정
PUT http://localhost:8081/config
{ "compatibility": "BACKWARD" }

# 특정 주제(Subject) 설정
PUT http://localhost:8081/config/orders-value
{ "compatibility": "BACKWARD" }
```

**BACKWARD 호환 변경 (안전):**
- 기본값 있는 필드 추가
- 필드 삭제 (단, 컨슈머가 해당 필드 사용 중이면 주의)

**BACKWARD 비호환 변경 (위험):**
- 기본값 없는 필드 추가
- 필드 타입 변경
- 필드 이름 변경

---

## Schema Registry REST API

```bash
# 스키마 목록
GET http://localhost:8081/subjects

# 특정 주제의 스키마 버전 목록
GET http://localhost:8081/subjects/orders-value/versions

# 최신 스키마 조회
GET http://localhost:8081/subjects/orders-value/versions/latest

# 스키마 등록
POST http://localhost:8081/subjects/orders-value/versions
Content-Type: application/vnd.schemaregistry.v1+json
{
  "schema": "{\"type\":\"record\",\"name\":\"Order\",...}"
}

# 호환성 검사 (등록 전 확인)
POST http://localhost:8081/compatibility/subjects/orders-value/versions/latest
{
  "schema": "{새 스키마}"
}
```

---

## JSON Schema / Protobuf

Schema Registry는 Avro 외에도 JSON Schema와 Protobuf를 지원합니다.

```kotlin
// JSON Schema
put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaJsonSchemaSerializer::class.java)
put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, KafkaJsonSchemaDeserializer::class.java)

// Protobuf
put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaProtobufSerializer::class.java)
put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, KafkaProtobufDeserializer::class.java)
```

| 포맷 | 장점 | 단점 |
|------|------|------|
| Avro | 컴팩트, 빠름, Kafka 생태계 표준 | 바이너리라 디버깅 어려움 |
| Protobuf | 매우 컴팩트, 언어 지원 좋음 | 복잡한 설정 |
| JSON Schema | 가독성, 디버깅 용이 | 메시지 크기 큼 |
