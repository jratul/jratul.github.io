---
title: "메시지 큐 (Kafka)"
order: 17
---

## Kafka란 무엇인가

Kafka는 **분산 메시지 스트리밍 플랫폼**입니다.

쉽게 설명하면 **우체국 편지함**과 같습니다. 편지를 보내는 사람(Producer)이 편지함(Topic)에 편지를 넣으면, 편지를 받는 사람(Consumer)이 꺼내 읽습니다. 편지를 보내는 사람과 받는 사람이 직접 만나지 않아도 됩니다.

**왜 Kafka를 쓰는가?**

서비스 간 직접 호출 방식의 문제점을 생각해봅시다:

```
// 직접 호출 방식의 문제점
주문 생성 → 재고서비스.감소() → 이메일서비스.발송() → 포인트서비스.적립()
                  ↓ 실패하면?
           전체 트랜잭션 롤백 + 서비스가 늘어날수록 복잡도 증가
```

Kafka를 쓰면:

```
주문 생성 → Kafka 토픽에 이벤트 발행 → 끝!
            ↓
재고서비스, 이메일서비스, 포인트서비스가 각자 구독해서 처리
(주문 서비스는 이들이 존재하는지조차 모름)
```

**주요 사용 사례:**
- 서비스 간 비동기 통신 (주문 → 재고 → 알림)
- 이벤트 스트리밍 (클릭 로그, 사용자 행동 분석)
- 로그 수집 (여러 서버 로그 → 중앙 집중)
- 실시간 데이터 파이프라인

---

## 핵심 개념 이해하기

```
Producer → Topic(Partition) → Consumer Group
              │
        Broker 클러스터 (Kafka 서버)
```

**Topic (토픽)**: 편지함의 이름표. 메시지를 분류하는 단위
- `order-events`, `payment-events` 처럼 의미 있는 이름을 붙임

**Partition (파티션)**: 하나의 토픽을 여러 조각으로 분할
- 병렬 처리를 위한 것. 파티션 수 = 동시에 처리 가능한 Consumer 수
- 같은 Key의 메시지는 항상 같은 파티션으로 들어감 (순서 보장)

**Consumer Group (컨슈머 그룹)**: 같은 그룹 내에서는 하나의 Consumer만 같은 파티션을 소비
- 재고 서비스 3대가 `inventory-service` 그룹으로 같은 토픽 소비 → 분산 처리

**Offset (오프셋)**: Consumer가 어디까지 읽었는지 기록하는 책갈피
- Kafka는 메시지를 바로 삭제하지 않음 → 실패해도 다시 읽기 가능

**Broker (브로커)**: Kafka 서버 자체. 클러스터로 구성해 고가용성 확보

---

## 의존성 및 설정

```groovy
// build.gradle
implementation 'org.springframework.kafka:spring-kafka'
```

```yaml
# application.yml
spring:
  kafka:
    bootstrap-servers: localhost:9092  # Kafka 서버 주소

    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      acks: all           # 모든 복제본이 받았을 때 성공 처리 (데이터 유실 방지)
      retries: 3          # 실패 시 3번 재시도
      properties:
        enable.idempotence: true  # 중복 전송 방지 (네트워크 오류로 재전송 시)

    consumer:
      group-id: order-service       # 컨슈머 그룹 이름
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      auto-offset-reset: earliest   # 처음부터 읽기 (latest: 최신 메시지부터만)
      enable-auto-commit: false      # 수동 커밋 (처리 완료 후 커밋해서 유실 방지)
      properties:
        spring.json.trusted.packages: "com.example.dto"  # 역직렬화 허용 패키지
```

---

## Producer (메시지 보내기)

**Producer**는 Kafka에 메시지를 발행하는 쪽입니다.

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class OrderEventProducer {

    // KafkaTemplate: Spring이 제공하는 Kafka 전송 도우미
    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    // 비동기 전송 (권장) - 전송 결과를 나중에 콜백으로 받음
    public void sendOrderCreated(Order order) {
        OrderEvent event = new OrderEvent(
            order.getId(),          // 이벤트 데이터
            "ORDER_CREATED",        // 이벤트 타입
            LocalDateTime.now()     // 발생 시각
        );

        kafkaTemplate.send(
                "order-events",                 // 토픽 이름
                order.getId().toString(),        // 파티션 키 (같은 주문 ID → 같은 파티션)
                event                            // 메시지 본문
            )
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    // 전송 실패 처리
                    log.error("메시지 전송 실패: orderId={}, error={}",
                        order.getId(), ex.getMessage());
                } else {
                    // 전송 성공 로그
                    log.info("메시지 전송 성공: orderId={}, partition={}, offset={}",
                        order.getId(),
                        result.getRecordMetadata().partition(),  // 어느 파티션에 들어갔는지
                        result.getRecordMetadata().offset());    // 몇 번째 메시지인지
                }
            });
    }

    // 동기 전송 - 전송 완료를 기다림 (응답 속도 느려짐, 필요한 경우만 사용)
    public void sendSync(Order order) throws ExecutionException, InterruptedException {
        OrderEvent event = new OrderEvent(order.getId(), "ORDER_CREATED", LocalDateTime.now());
        kafkaTemplate.send("order-events", order.getId().toString(), event).get();
        // .get()이 전송 완료될 때까지 블로킹
    }
}
```

---

## Consumer (메시지 받기)

**Consumer**는 Kafka에서 메시지를 읽고 처리하는 쪽입니다.

```java
@Component
@Slf4j
@RequiredArgsConstructor
public class OrderEventConsumer {

    private final InventoryService inventoryService;

    @KafkaListener(
        topics = "order-events",           // 어떤 토픽 구독
        groupId = "inventory-service",      // 컨슈머 그룹 이름
        concurrency = "3"                   // 3개 스레드로 병렬 처리 (파티션 수와 맞춤)
    )
    public void handleOrderEvent(
            @Payload OrderEvent event,                              // 메시지 본문
            @Header(KafkaHeaders.RECEIVED_PARTITION) int partition, // 어느 파티션에서 왔는지
            @Header(KafkaHeaders.OFFSET) long offset,               // 오프셋 (몇 번째 메시지)
            Acknowledgment ack) {                                   // 수동 커밋용 객체

        log.info("메시지 수신: partition={}, offset={}, eventType={}",
            partition, offset, event.getType());

        try {
            processEvent(event);  // 비즈니스 로직 처리

            ack.acknowledge();  // 처리 성공 후 오프셋 커밋 (다음엔 이 메시지 안 읽음)
            log.info("처리 완료 및 커밋: offset={}", offset);

        } catch (Exception e) {
            log.error("처리 실패: event={}, error={}", event, e.getMessage());
            // ack.acknowledge() 안 하면 다시 처리 시도 (재처리)
            // 무한 루프 방지를 위해 DLT(Dead Letter Topic) 설정 필요
        }
    }

    private void processEvent(OrderEvent event) {
        // 이벤트 타입에 따라 다른 처리
        switch (event.getType()) {
            case "ORDER_CREATED" ->
                inventoryService.decrease(event.getOrderId());   // 재고 감소
            case "ORDER_CANCELLED" ->
                inventoryService.restore(event.getOrderId());    // 재고 복구
            default ->
                log.warn("알 수 없는 이벤트 타입: {}", event.getType());
        }
    }
}
```

---

## 토픽 설정

```java
@Configuration
public class KafkaTopicConfig {

    // 토픽을 코드로 생성 (애플리케이션 시작 시 없으면 자동 생성)
    @Bean
    public NewTopic orderEventsTopic() {
        return TopicBuilder.name("order-events")
            .partitions(3)    // 파티션 3개 = 동시에 3개 컨슈머가 처리 가능
            .replicas(2)      // 복제본 2개 = 브로커 1대 죽어도 데이터 안 사라짐
            .build();
    }

    // DLT (Dead Letter Topic): 처리 실패한 메시지를 보관하는 곳
    @Bean
    public NewTopic dlqTopic() {
        return TopicBuilder.name("order-events.DLT")  // 관례: 원본토픽.DLT
            .partitions(1)
            .replicas(1)
            .build();
    }
}
```

---

## 에러 처리 & Dead Letter Topic

처리에 실패한 메시지를 무한 재시도하면 뒷 메시지들이 쌓입니다. DLT로 보내 나중에 별도로 처리합니다.

**현실 비유:** 택배 배달 실패 → 무한 재시도 대신 → "미배달 창고(DLT)"에 보관 → 나중에 따로 처리

```java
@Configuration
public class KafkaConsumerConfig {

    @Bean
    public DefaultErrorHandler errorHandler(KafkaTemplate<String, Object> template) {
        // 실패한 메시지를 DLT로 보내는 복구 전략
        DeadLetterPublishingRecoverer recoverer =
            new DeadLetterPublishingRecoverer(template,
                // DLT 토픽 결정: 원본 토픽명 + ".DLT"
                (record, ex) -> new TopicPartition(
                    record.topic() + ".DLT",
                    record.partition()
                )
            );

        // 1초 간격으로 최대 3번 재시도 후 DLT로
        FixedBackOff backOff = new FixedBackOff(1000L, 3L);

        DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, backOff);

        // 유효성 검사 오류는 재시도해도 소용없음 → 즉시 DLT로
        handler.addNotRetryableExceptions(ValidationException.class);
        handler.addNotRetryableExceptions(JsonProcessingException.class);

        return handler;
    }
}

// DLT 전용 컨슈머 - 실패 메시지 처리 (로그, 알림, 수동 재처리)
@KafkaListener(topics = "order-events.DLT", groupId = "dlt-processor")
public void handleDlt(
        @Payload OrderEvent event,
        @Header(KafkaHeaders.EXCEPTION_MESSAGE) String errorMessage,
        @Header(KafkaHeaders.ORIGINAL_TOPIC) String originalTopic) {

    log.error("DLT 메시지 도착: topic={}, event={}, error={}",
        originalTopic, event, errorMessage);

    // 슬랙 알림 발송 + 실패 로그 DB 저장
    alertService.notify("Kafka 처리 실패 메시지 발생", errorMessage);
    failedEventRepository.save(FailedEvent.of(originalTopic, event, errorMessage));
}
```

---

## 트랜잭션과 Kafka (Transactional Outbox)

DB 저장과 Kafka 전송 사이에서 장애가 나면 데이터가 불일치됩니다.

```
문제 상황:
1. 주문 DB 저장 성공 ✓
2. Kafka 메시지 전송 실패 ✗
→ 재고는 그대로인데 주문은 생성됨 (불일치!)
```

**해결 방법 1: @TransactionalEventListener**

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    // 트랜잭션 내에서 이벤트 등록
    @Transactional
    public Order createOrder(OrderRequest request) {
        Order order = orderRepository.save(Order.from(request));  // DB 저장

        // DB 트랜잭션 내에서 이벤트 등록 (아직 발행 안 됨)
        eventPublisher.publishEvent(new OrderCreatedEvent(order));

        return order;  // 여기서 트랜잭션 커밋 → 커밋 성공 후 이벤트 발행
    }
}

@Component
@Slf4j
@RequiredArgsConstructor
public class OrderEventRelay {

    private final OrderEventProducer producer;

    // AFTER_COMMIT: DB 트랜잭션이 커밋된 후에만 실행
    // → DB 저장 확인 후 Kafka 전송 (DB 실패 시 Kafka 전송 안 함)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderCreated(OrderCreatedEvent event) {
        producer.sendOrderCreated(event.getOrder());
        // 여기서 Kafka 실패해도 DB는 이미 커밋됨 → Outbox 패턴이 더 안전
    }
}
```

**해결 방법 2: Outbox 패턴 (가장 안전)**

```java
@Entity
@Table(name = "kafka_outbox")
@Getter
@Builder
public class KafkaOutbox {
    @Id @GeneratedValue
    private Long id;

    private String topic;       // 발행할 토픽
    private String messageKey;  // 파티션 키
    private String payload;     // JSON 직렬화된 이벤트

    private boolean published;  // 발행 완료 여부
    private LocalDateTime createdAt;
    private LocalDateTime publishedAt;
}

@Service
@Transactional
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final KafkaOutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    public Order createOrder(OrderRequest request) throws JsonProcessingException {
        // 주문 저장 + Outbox 저장을 같은 트랜잭션으로
        Order order = orderRepository.save(Order.from(request));

        outboxRepository.save(KafkaOutbox.builder()
            .topic("order-events")
            .messageKey(order.getId().toString())
            .payload(objectMapper.writeValueAsString(
                new OrderCreatedEvent(order.getId(), "ORDER_CREATED")))
            .published(false)
            .createdAt(LocalDateTime.now())
            .build());
        // 둘 다 성공하거나 둘 다 실패 (원자성 보장)

        return order;
    }
}

// 스케줄러가 주기적으로 미발행 Outbox를 Kafka로 전송
@Component
@Slf4j
@RequiredArgsConstructor
public class KafkaOutboxPublisher {

    private final KafkaOutboxRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(fixedDelay = 1000)  // 1초마다 실행
    @Transactional
    public void publishPendingEvents() {
        // 미발행 이벤트 최대 100개 조회
        List<KafkaOutbox> pending =
            outboxRepository.findByPublishedFalseOrderByCreatedAtAsc(
                PageRequest.of(0, 100));

        for (KafkaOutbox outbox : pending) {
            try {
                // Kafka로 전송
                kafkaTemplate.send(outbox.getTopic(),
                    outbox.getMessageKey(), outbox.getPayload()).get();

                // 전송 성공 표시
                outbox.markPublished();
                log.debug("Outbox 발행 성공: id={}", outbox.getId());
            } catch (Exception e) {
                log.error("Outbox 발행 실패: id={}", outbox.getId(), e);
                // 다음 주기에 재시도
            }
        }
    }
}
```

---

## Consumer Group 이해하기

같은 토픽을 여러 서비스가 독립적으로 소비하는 방법을 이해하면 Kafka의 강점이 보입니다.

```
order-events 토픽 (파티션 3개)
     │
     ├── Consumer Group: inventory-service (재고 처리)
     │    ├── Consumer 1 → Partition 0
     │    ├── Consumer 2 → Partition 1
     │    └── Consumer 3 → Partition 2
     │
     ├── Consumer Group: email-service (이메일 발송)
     │    └── Consumer 1 → Partition 0,1,2 모두
     │
     └── Consumer Group: point-service (포인트 적립)
          └── Consumer 1 → Partition 0,1,2 모두
```

각 Consumer Group은 독립된 offset을 유지합니다. 재고 서비스가 느려도 이메일 서비스에 영향 없음.

---

## 로컬 개발 환경 (docker-compose)

```yaml
# docker-compose.yml
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181      # Kafka 메타데이터 관리

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092  # 클라이언트 접속 주소
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1              # 로컬용 복제본 1개
    depends_on:
      - zookeeper

  # Kafka 웹 UI - 토픽/메시지/컨슈머 상태 시각적 확인
  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - "8989:8080"   # http://localhost:8989 에서 확인
    environment:
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
    depends_on:
      - kafka
```

---

## 이벤트 DTO 설계

```java
// 이벤트 클래스 - 불변 객체로 만들기 (record 추천)
public record OrderEvent(
    Long orderId,            // 주문 ID
    String type,             // 이벤트 타입 (ORDER_CREATED, ORDER_CANCELLED 등)
    Long userId,             // 사용자 ID
    Long totalAmount,        // 주문 금액
    LocalDateTime occurredAt // 이벤트 발생 시각
) {
    // 팩토리 메서드로 가독성 향상
    public static OrderEvent created(Order order) {
        return new OrderEvent(
            order.getId(),
            "ORDER_CREATED",
            order.getUserId(),
            order.getTotalAmount(),
            LocalDateTime.now()
        );
    }

    public static OrderEvent cancelled(Order order) {
        return new OrderEvent(
            order.getId(),
            "ORDER_CANCELLED",
            order.getUserId(),
            order.getTotalAmount(),
            LocalDateTime.now()
        );
    }
}
```

---

## 초보자가 자주 하는 실수

**실수 1: auto-commit 켜두기**

```yaml
# 이렇게 하면 메시지 처리 실패해도 자동 커밋 → 메시지 유실
consumer:
  enable-auto-commit: true  # 위험!

# 반드시 수동 커밋으로
consumer:
  enable-auto-commit: false  # 처리 완료 후 직접 ack.acknowledge()
```

**실수 2: Consumer 스레드 수 > 파티션 수**

```java
// 파티션이 3개인데 컨슈머 스레드 5개 → 2개는 놀게 됨
@KafkaListener(topics = "order-events", concurrency = "5")  // 파티션 3개면 최대 3
// → concurrency = "3"으로 맞추기
```

**실수 3: 무거운 작업을 Consumer에서 직접 처리**

```java
// 나쁜 예: Consumer가 느린 작업 처리 → 다른 메시지 처리 지연
@KafkaListener(topics = "order-events")
public void handle(OrderEvent event) {
    sendEmailWithRetry(event);  // 이메일 전송이 5초 걸리면?
}

// 좋은 예: 비동기 처리
@KafkaListener(topics = "order-events")
public void handle(OrderEvent event, Acknowledgment ack) {
    CompletableFuture.runAsync(() -> sendEmail(event))
        .thenRun(ack::acknowledge);
}
```
