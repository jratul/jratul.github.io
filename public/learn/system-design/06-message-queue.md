---
title: "메시지 큐와 이벤트 드리븐"
order: 6
---

# 메시지 큐와 이벤트 드리븐

비동기 처리와 서비스 간 느슨한 결합.

---

## 왜 메시지 큐인가

```
동기 호출의 문제:
Service A → Service B (HTTP)
— B가 느리면 A도 대기
— B가 장애나면 A도 실패
— 트래픽 급증 시 B 과부하

메시지 큐 도입:
Service A → Queue → Service B
— A는 큐에 메시지 넣고 즉시 반환
— B는 처리 가능한 속도로 소비
— B 장애 시 메시지 큐에 보관
— B 복구 후 처리 재개

사용 사례:
— 이메일/SMS 발송 (비동기)
— 이미지 처리 (무거운 작업)
— 결제 처리 후 알림
— 로그 수집
— 마이크로서비스 간 통신
```

---

## 메시지 큐 종류

```
AWS SQS:
— 완전 관리형
— 최소 1회 전달 보장
— Standard: 순서 미보장, 높은 처리량
— FIFO: 순서 보장, 초당 300 TPS
— 메시지 보존: 최대 14일

Apache Kafka:
— 고성능 이벤트 스트리밍
— 메시지를 로그로 영구 보존
— 컨슈머 그룹으로 병렬 처리
— 파티션 단위 순서 보장
— 재처리 가능 (오프셋 기반)

RabbitMQ:
— AMQP 프로토콜
— Exchange → Queue 라우팅
— 복잡한 라우팅 규칙
— 관리 UI 제공

Redis Pub/Sub:
— 단순 발행/구독
— 메시지 영속성 없음 (소비자 없으면 소실)
— 실시간 이벤트에 적합

선택 기준:
— 단순 큐, 작업 분산: SQS
— 이벤트 스트리밍, 재처리: Kafka
— 복잡한 라우팅: RabbitMQ
```

---

## SQS 패턴

```java
// SQS 메시지 발송
@Service
@RequiredArgsConstructor
public class EmailQueueService {

    private final SqsAsyncClient sqsClient;

    @Value("${aws.sqs.email-queue-url}")
    private String queueUrl;

    public void sendEmailTask(EmailRequest emailRequest) {
        String messageBody = JsonUtil.toJson(emailRequest);

        SendMessageRequest request = SendMessageRequest.builder()
            .queueUrl(queueUrl)
            .messageBody(messageBody)
            .messageAttributes(Map.of(
                "MessageType", MessageAttributeValue.builder()
                    .dataType("String")
                    .stringValue("EMAIL_SEND")
                    .build()
            ))
            .build();

        sqsClient.sendMessage(request)
            .exceptionally(e -> {
                log.error("Failed to send SQS message", e);
                throw new RuntimeException(e);
            });
    }
}

// SQS 메시지 수신 (Spring Cloud AWS)
@Component
@RequiredArgsConstructor
@Slf4j
public class EmailQueueListener {

    private final EmailService emailService;

    @SqsListener(value = "${aws.sqs.email-queue-url}",
                 deletionPolicy = SqsMessageDeletionPolicy.ON_SUCCESS)
    public void processEmailTask(EmailRequest request) {
        log.info("Processing email: {}", request.getTo());
        emailService.send(request);
        // 성공 시 자동 삭제 (ON_SUCCESS)
        // 실패 시 메시지 큐에 반환 → 재처리
    }

    // 배치 처리
    @SqsListener(value = "${aws.sqs.batch-queue-url}",
                 deletionPolicy = SqsMessageDeletionPolicy.ON_SUCCESS)
    public void processBatch(List<Message<EmailRequest>> messages) {
        messages.parallelStream()
            .forEach(msg -> emailService.send(msg.getPayload()));
    }
}
```

---

## Kafka 기초

```
개념:
Topic: 메시지 카테고리 (DB의 테이블과 유사)
Partition: 토픽의 분할 (병렬 처리)
Offset: 파티션 내 메시지 위치
Producer: 메시지 발행
Consumer: 메시지 구독
Consumer Group: 병렬 처리 단위

파티션과 병렬성:
Topic A (3개 파티션)
├── Partition 0: → Consumer 1
├── Partition 1: → Consumer 2
└── Partition 2: → Consumer 3

규칙:
— 파티션 수 ≥ 컨슈머 수
— 파티션당 하나의 컨슈머 (같은 그룹)
— 파티션 수 < 컨슈머 수 → 일부 유휴

키 기반 파티셔닝:
같은 키 → 항상 같은 파티션
예: user_id가 키 → 같은 사용자의 이벤트 순서 보장
```

```java
// Kafka Producer
@Service
@RequiredArgsConstructor
public class OrderEventProducer {

    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    public void publishOrderCreated(Order order) {
        OrderEvent event = OrderEvent.builder()
            .orderId(order.getId())
            .userId(order.getUserId())
            .status("CREATED")
            .timestamp(Instant.now())
            .build();

        kafkaTemplate.send("order-events", order.getUserId().toString(), event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish order event", ex);
                } else {
                    log.info("Published order event: offset={}",
                        result.getRecordMetadata().offset());
                }
            });
    }
}

// Kafka Consumer
@Component
@Slf4j
public class OrderEventConsumer {

    @KafkaListener(
        topics = "order-events",
        groupId = "notification-service",
        concurrency = "3"  // 3개 스레드 (파티션 수와 맞춤)
    )
    public void handleOrderEvent(
        @Payload OrderEvent event,
        @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
        @Header(KafkaHeaders.OFFSET) long offset
    ) {
        log.info("Received event: partition={}, offset={}, orderId={}",
            partition, offset, event.getOrderId());

        try {
            notificationService.sendOrderNotification(event);
        } catch (Exception e) {
            log.error("Failed to process event", e);
            throw e; // 재처리를 위해 예외 전파
        }
    }
}
```

---

## 이벤트 드리븐 아키텍처

```
이벤트 기반 통신:

주문 서비스                  결제 서비스
    │                           │
    │ OrderCreated 이벤트 발행   │
    └─────────→ Kafka ──────────┘
                                │
                        결제 처리
                                │
                        PaymentCompleted 이벤트
                                │
              ┌─────────────────┼──────────────────┐
              ↓                 ↓                  ↓
        주문 서비스        알림 서비스         재고 서비스
        상태 업데이트       이메일 발송        재고 차감

장점:
— 서비스 간 직접 의존 없음
— 새 서비스 추가 쉬움 (구독만 추가)
— 장애 격리

단점:
— 디버깅 어려움 (이벤트 추적)
— 최종 일관성 (eventual consistency)
— 이벤트 순서 보장 복잡
```

---

## Outbox 패턴

```
문제: DB 저장 + 이벤트 발행의 원자성

나쁜 방법:
1. DB 저장
2. Kafka 발행 ← 여기서 실패하면?
   → DB는 저장, Kafka는 미발행 = 불일치

Outbox 패턴:
1. 트랜잭션 내에서 DB 저장 + outbox 테이블에 이벤트 저장
2. 별도 프로세스(Relay)가 outbox 테이블 폴링
3. Kafka 발행 성공 시 outbox 레코드 삭제

```

```sql
-- outbox 테이블
CREATE TABLE outbox_events (
    id BIGSERIAL PRIMARY KEY,
    aggregate_type VARCHAR(100),  -- "Order"
    aggregate_id BIGINT,
    event_type VARCHAR(100),      -- "OrderCreated"
    payload JSONB,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);
```

```java
@Service
@Transactional
public class OrderService {

    public Order createOrder(OrderCreateRequest request) {
        // 1. 주문 저장
        Order order = orderRepository.save(request.toEntity());

        // 2. 같은 트랜잭션에서 outbox 저장
        OutboxEvent event = OutboxEvent.builder()
            .aggregateType("Order")
            .aggregateId(order.getId())
            .eventType("OrderCreated")
            .payload(JsonUtil.toJson(order))
            .build();
        outboxRepository.save(event);

        return order;
        // 트랜잭션 커밋 → 둘 다 저장 또는 둘 다 롤백
    }
}

// Outbox Relay (별도 스케줄러)
@Component
@RequiredArgsConstructor
public class OutboxRelay {

    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> pending = outboxRepository
            .findByPublishedAtIsNullOrderByCreatedAt(PageRequest.of(0, 100));

        pending.forEach(event -> {
            kafkaTemplate.send(event.getEventType(), event.getPayload());
            event.setPublishedAt(Instant.now());
        });

        outboxRepository.saveAll(pending);
    }
}
```

---

## Dead Letter Queue (DLQ)

```
처리 실패한 메시지를 DLQ로 이동:

정상 처리:
Consumer → Success → 메시지 삭제

실패 시:
Consumer → Failure (재시도 3회)
         → DLQ로 이동

DLQ 활용:
— 실패 메시지 분석
— 수정 후 재처리
— 알림 발송

AWS SQS DLQ 설정:
```

```java
// SQS DLQ 연동
@SqsListener(value = "main-queue")
public void processMessage(Message message) {
    try {
        // 처리
    } catch (PermanentException e) {
        // 재처리 불가 → DLQ로
        throw e;
    } catch (TransientException e) {
        // 일시적 오류 → 재시도
        throw e;
    }
}

// DLQ 모니터링 알람 설정
// CloudWatch: DLQ 메시지 수 > 0 → SNS 알람
```
