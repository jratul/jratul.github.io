---
title: "메시지 큐 (Kafka)"
order: 17
---

## Kafka 개념

분산 메시지 스트리밍 플랫폼입니다. 서비스 간 비동기 통신, 이벤트 스트리밍, 로그 수집에 씁니다.

```
Producer → Topic(Partition) → Consumer Group
              │
        Broker 클러스터 (Kafka)
```

- **Topic**: 메시지 분류 단위
- **Partition**: 병렬 처리를 위한 토픽 분할
- **Consumer Group**: 같은 그룹 내에서는 하나의 Consumer만 파티션 소비
- **Offset**: Consumer가 어디까지 읽었는지 기록

---

## 의존성 및 설정

```groovy
implementation 'org.springframework.kafka:spring-kafka'
```

```yaml
# application.yml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      acks: all           # 모든 복제본 확인 (데이터 유실 방지)
      retries: 3
      properties:
        enable.idempotence: true  # 중복 전송 방지
    consumer:
      group-id: order-service
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      auto-offset-reset: earliest  # 처음부터 읽기 (latest: 이후부터)
      enable-auto-commit: false    # 수동 커밋 (처리 완료 후 커밋)
      properties:
        spring.json.trusted.packages: "com.example.dto"
```

---

## Producer

```java
@Service
public class OrderEventProducer {

    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    // 비동기 전송
    public void sendOrderCreated(Order order) {
        OrderEvent event = new OrderEvent(order.getId(), "ORDER_CREATED", LocalDateTime.now());

        kafkaTemplate.send("order-events", order.getId().toString(), event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("메시지 전송 실패: {}", ex.getMessage());
                } else {
                    log.info("메시지 전송 성공 — partition={}, offset={}",
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
                }
            });
    }

    // 동기 전송 (전송 확인 필요 시)
    public void sendSync(Order order) throws ExecutionException, InterruptedException {
        kafkaTemplate.send("order-events", order.getId().toString(),
            new OrderEvent(order.getId(), "ORDER_CREATED", LocalDateTime.now())).get();
    }
}
```

---

## Consumer

```java
@Component
public class OrderEventConsumer {

    @KafkaListener(
        topics = "order-events",
        groupId = "inventory-service",
        concurrency = "3"  // 3개 스레드로 병렬 소비
    )
    public void handleOrderEvent(
            @Payload OrderEvent event,
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset,
            Acknowledgment ack) {

        log.info("수신 — partition={}, offset={}, event={}", partition, offset, event);

        try {
            processEvent(event);
            ack.acknowledge();  // 처리 성공 후 수동 커밋
        } catch (Exception e) {
            log.error("처리 실패: {}", e.getMessage());
            // 커밋하지 않으면 재처리
        }
    }

    private void processEvent(OrderEvent event) {
        switch (event.getType()) {
            case "ORDER_CREATED" -> inventoryService.decrease(event.getOrderId());
            case "ORDER_CANCELLED" -> inventoryService.restore(event.getOrderId());
        }
    }
}
```

---

## 토픽 설정

```java
@Configuration
public class KafkaTopicConfig {

    @Bean
    public NewTopic orderEventsTopic() {
        return TopicBuilder.name("order-events")
            .partitions(3)    // 병렬 처리 단위
            .replicas(2)      // 복제본 수 (고가용성)
            .build();
    }

    @Bean
    public NewTopic dlqTopic() {
        return TopicBuilder.name("order-events.DLT")  // Dead Letter Topic
            .partitions(1)
            .replicas(1)
            .build();
    }
}
```

---

## 에러 처리 & Dead Letter Topic

처리 실패한 메시지를 DLT로 보내 나중에 재처리합니다.

```java
@Configuration
public class KafkaConsumerConfig {

    @Bean
    public DefaultErrorHandler errorHandler(KafkaTemplate<String, Object> template) {
        // 재시도 3번 후 DLT로 전송
        DeadLetterPublishingRecoverer recoverer =
            new DeadLetterPublishingRecoverer(template,
                (record, ex) -> new TopicPartition(record.topic() + ".DLT", record.partition()));

        FixedBackOff backOff = new FixedBackOff(1000L, 3L);  // 1초 간격, 3회

        DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, backOff);
        handler.addNotRetryableExceptions(ValidationException.class);  // 이 예외는 즉시 DLT
        return handler;
    }
}

// DLT Consumer
@KafkaListener(topics = "order-events.DLT", groupId = "dlt-processor")
public void handleDlt(
        @Payload OrderEvent event,
        @Header(KafkaHeaders.EXCEPTION_MESSAGE) String errorMessage) {
    log.error("DLT 메시지 — event={}, error={}", event, errorMessage);
    alertService.notify("Kafka DLT 메시지 발생", errorMessage);
}
```

---

## 트랜잭션과 Kafka (Transactional Outbox)

DB 저장과 Kafka 전송의 원자성을 보장합니다.

```java
// 문제: DB 커밋 성공 → Kafka 전송 실패 → 데이터 불일치
@Transactional
public Order createOrder(OrderRequest request) {
    Order order = orderRepository.save(Order.from(request));
    producer.sendOrderCreated(order);  // 여기서 실패하면?
    return order;
}

// 해결: @TransactionalEventListener + AFTER_COMMIT
@Transactional
public Order createOrder(OrderRequest request) {
    Order order = orderRepository.save(Order.from(request));
    eventPublisher.publishEvent(new OrderCreatedEvent(order));  // DB 트랜잭션 내
    return order;
}

@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void onOrderCreated(OrderCreatedEvent event) {
    producer.sendOrderCreated(event.getOrder());  // DB 커밋 후 Kafka 전송
}
```

---

## 로컬 개발 환경 (docker-compose)

```yaml
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    depends_on:
      - zookeeper

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - "8989:8080"
    environment:
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
```
