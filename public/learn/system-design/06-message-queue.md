---
title: "메시지 큐와 이벤트 드리븐"
order: 6
---

# 메시지 큐와 이벤트 드리븐

비동기 처리와 서비스 간 느슨한 결합.

편의점 택배 접수를 생각해보자. 손님이 택배를 맡기면 직원이 즉시 "접수 완료"라고 말한다. 실제 배달 과정은 나중에 택배 회사가 가져가서 처리한다. 손님은 배달이 끝날 때까지 카운터 앞에 서 있지 않아도 된다. 메시지 큐가 이런 역할이다.

---

## 왜 메시지 큐인가

```
동기 호출의 문제점:
주문 서비스 → 이메일 서비스 (HTTP)

1. 이메일 서비스가 느리면 → 주문 서비스도 대기
   (사용자가 결제 버튼 누르고 5초 대기...)

2. 이메일 서비스 장애 → 주문 서비스도 실패
   (이메일 하나 때문에 주문을 못 하는 상황!)

3. 이벤트(블랙프라이데이) 시 트래픽 급증
   → 이메일 서비스 과부하 → 전체 시스템 연쇄 장애

메시지 큐 도입 후:
주문 서비스 → 큐에 "이메일 보내줘" 메시지 → 즉시 반환
이메일 서비스 → 여유 있을 때 큐에서 꺼내서 처리

결과:
— 주문 서비스는 응답 즉시 반환 (빠름)
— 이메일 서비스 장애 → 메시지는 큐에 보관 → 복구 후 처리
— 트래픽 급증 → 이메일 서비스가 처리 가능한 속도로 소비

메시지 큐 활용 사례:
— 이메일/SMS/카카오 알림 발송
— 이미지/동영상 처리 (무거운 작업)
— 결제 완료 후 후처리 (포인트 적립, 재고 차감)
— 로그 수집 (대량 이벤트)
— 마이크로서비스 간 비동기 통신
```

---

## 메시지 큐 종류

```
AWS SQS (Simple Queue Service):
— AWS 완전 관리형 (서버 없이 사용)
— 최소 1회 전달 보장 (가끔 중복 전달될 수 있음)
— Standard 큐: 순서 미보장, 초당 수천~수만 TPS
— FIFO 큐: 순서 보장, 초당 300 TPS (정확히 1회 전달)
— 메시지 보존: 최대 14일
— 가격: 100만 건 무료, 이후 0.40달러/100만 건
언제: AWS 인프라 사용 중, 단순한 작업 큐

Apache Kafka:
— 고성능 이벤트 스트리밍 플랫폼
— 메시지를 로그로 영구 보존 (기본 7일, 설정 가능)
— 컨슈머 그룹으로 병렬 처리
— 파티션 단위 순서 보장
— 재처리 가능 (오프셋으로 과거 메시지 재조회)
— 초당 수백만 건 처리 가능
언제: 대용량 이벤트 스트리밍, 로그 수집, 재처리 필요

RabbitMQ:
— AMQP 프로토콜 표준 구현
— Exchange → Queue 라우팅 (복잡한 메시지 분배)
— Dead Letter Queue 기본 지원
— 관리 UI 제공
언제: 복잡한 라우팅 규칙, 레거시 시스템 연동

Redis Pub/Sub:
— 단순 발행/구독 (메시지 영속성 없음!)
— 구독자가 없으면 메시지 소실
— 주로 WebSocket 서버 간 메시지 중계에 사용
언제: 실시간 이벤트, 메시지 유실 허용 가능한 경우

선택 기준:
단순 큐, AWS 사용 중 → SQS
대용량 이벤트 스트리밍, 재처리 필요 → Kafka
복잡한 라우팅 → RabbitMQ
```

---

## SQS 패턴

```
SQS 동작 방식:
Producer → SQS 큐 → Consumer

1. Producer가 메시지 전송
2. Consumer가 폴링(Long Polling)으로 메시지 수신
3. 처리 성공 → 메시지 삭제
4. 처리 실패 → Visibility Timeout 후 다시 visible
   → 다른 Consumer가 재처리
5. 재시도 횟수 초과 → Dead Letter Queue(DLQ)로 이동

Visibility Timeout:
한 Consumer가 메시지를 받으면 다른 Consumer에게
일시적으로 안 보임 (중복 처리 방지)
처리 완료 전에 삭제해야 함
```

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
            // 메시지 속성 (메타데이터)
            .messageAttributes(Map.of(
                "MessageType", MessageAttributeValue.builder()
                    .dataType("String")
                    .stringValue("EMAIL_SEND")
                    .build()
            ))
            .build();

        // 비동기 전송 (즉시 반환)
        sqsClient.sendMessage(request)
            .exceptionally(e -> {
                log.error("SQS 메시지 전송 실패", e);
                // 실패 처리 (재시도, 알람 등)
                throw new RuntimeException(e);
            });
    }
}

// SQS 메시지 수신 처리 (Spring Cloud AWS)
@Component
@RequiredArgsConstructor
@Slf4j
public class EmailQueueListener {

    private final EmailService emailService;

    // ON_SUCCESS: 처리 성공 시 자동 삭제
    // 실패 시(예외 발생) 메시지 큐로 반환 → 재처리
    @SqsListener(value = "${aws.sqs.email-queue-url}",
                 deletionPolicy = SqsMessageDeletionPolicy.ON_SUCCESS)
    public void processEmailTask(EmailRequest request) {
        log.info("이메일 처리 시작: {}", request.getTo());
        emailService.send(request);
        // 여기까지 오면 성공 → 메시지 자동 삭제
        log.info("이메일 처리 완료: {}", request.getTo());
    }

    // 배치 처리 (한 번에 여러 메시지 처리)
    @SqsListener(value = "${aws.sqs.batch-queue-url}",
                 deletionPolicy = SqsMessageDeletionPolicy.ON_SUCCESS)
    public void processBatch(List<Message<EmailRequest>> messages) {
        log.info("배치 처리 시작: {}건", messages.size());
        // 병렬 처리
        messages.parallelStream()
            .forEach(msg -> emailService.send(msg.getPayload()));
    }
}
```

---

## Kafka 기초 개념

```
Kafka 핵심 개념:

Topic: 메시지 카테고리
       DB의 테이블과 유사
       예: "order-events", "payment-events", "user-activities"

Partition: 토픽의 분할 단위
           병렬 처리를 위해 토픽을 여러 파티션으로 나눔
           각 파티션은 순서가 보장된 로그

Offset: 파티션 내 메시지 위치 (0, 1, 2, ...)
        Consumer가 어디까지 읽었는지 추적

Producer: 메시지를 Topic에 발행 (쓰기)
Consumer: Topic에서 메시지를 구독 (읽기)
Consumer Group: 같은 Topic을 병렬로 처리하는 Consumer 묶음

파티션과 병렬 처리:
order-events Topic (3개 파티션)
├── Partition 0: [msg1, msg4, msg7] → Consumer 1
├── Partition 1: [msg2, msg5, msg8] → Consumer 2
└── Partition 2: [msg3, msg6, msg9] → Consumer 3

규칙:
— 파티션 수 = 최대 병렬 Consumer 수
— 파티션 수 < Consumer 수 → 일부 Consumer 유휴
— 파티션 수 > Consumer 수 → Consumer 하나가 여러 파티션 처리

키 기반 파티셔닝:
같은 키 → 항상 같은 파티션 → 순서 보장
예: user_id를 키로 사용
→ 같은 사용자의 이벤트는 항상 같은 파티션에 저장
→ 같은 사용자의 이벤트 순서 보장!
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

        // 토픽, 키(파티셔닝 기준), 값 전송
        kafkaTemplate.send("order-events",
            order.getUserId().toString(),  // 같은 사용자 → 같은 파티션
            event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("이벤트 발행 실패", ex);
                } else {
                    log.info("이벤트 발행 성공: offset={}",
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
        groupId = "notification-service",  // 컨슈머 그룹 ID
        concurrency = "3"                   // 3개 스레드 (파티션 수와 맞춤)
    )
    public void handleOrderEvent(
        @Payload OrderEvent event,
        @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
        @Header(KafkaHeaders.OFFSET) long offset
    ) {
        log.info("이벤트 수신: partition={}, offset={}, orderId={}",
            partition, offset, event.getOrderId());

        try {
            notificationService.sendOrderNotification(event);
        } catch (Exception e) {
            log.error("이벤트 처리 실패", e);
            throw e;  // 예외 전파 → 재처리 (재시도 설정에 따라)
        }
    }
}
```

---

## 이벤트 드리븐 아키텍처

```
이벤트 기반 통신 흐름:

주문 서비스
    │ OrderCreated 이벤트 발행
    ↓
  Kafka
    │
    ├─────────────────┬──────────────────┐
    ↓                 ↓                  ↓
결제 서비스      알림 서비스         재고 서비스
결제 처리        이메일 발송         재고 차감
    │
PaymentCompleted 이벤트
    │
    ├─────────────────┬──────────────────┐
    ↓                 ↓                  ↓
주문 서비스      알림 서비스         정산 서비스
상태 업데이트    SMS 발송           정산 기록

장점:
✅ 서비스 간 직접 의존 없음 (주문이 알림 서비스를 모름)
✅ 새 서비스 추가 쉬움 (이벤트 구독만 추가)
✅ 장애 격리 (알림 서비스 죽어도 주문 서비스 영향 없음)
✅ 서비스별 독립 배포 가능

단점:
❌ 디버깅 어려움 (이벤트 흐름 추적 필요, 분산 트레이싱)
❌ 최종 일관성 (Eventual Consistency) 수용해야 함
   → 결제 완료 후 포인트 적립까지 약간의 지연
❌ 이벤트 순서 보장 복잡
❌ 보상 트랜잭션 구현 필요 (실패 시 롤백)
```

---

## Outbox 패턴

```
문제:
DB 저장 + Kafka 이벤트 발행을 원자적으로 처리해야 함

나쁜 방법:
@Transactional
public Order createOrder(...) {
    Order order = orderRepository.save(...);  // DB 저장 성공
    kafkaTemplate.send("order-events", event); // ← 여기서 실패하면?
    // DB에는 저장됐는데 이벤트는 안 보내짐 = 불일치!
}

Outbox 패턴으로 해결:
1. DB 저장 + outbox 테이블에 이벤트 저장 (같은 트랜잭션!)
2. 별도 Relay 프로세스가 outbox 테이블 폴링
3. Kafka 발행 성공 시 outbox 레코드 삭제

장점:
— 원자성 보장 (DB 커밋 = 이벤트 보장)
— Kafka 장애 시 outbox에 보관됐다가 복구 후 발행
```

```sql
-- outbox 테이블
CREATE TABLE outbox_events (
    id             BIGSERIAL    PRIMARY KEY,
    aggregate_type VARCHAR(100),              -- "Order", "Payment"
    aggregate_id   BIGINT,
    event_type     VARCHAR(100),              -- "OrderCreated"
    payload        JSONB,                     -- 이벤트 데이터
    published_at   TIMESTAMP,                 -- 발행 완료 시각 (null = 미발행)
    created_at     TIMESTAMP DEFAULT now()
);
```

```java
// Outbox 패턴 구현
@Service
@Transactional
public class OrderService {

    public Order createOrder(OrderCreateRequest request) {
        // 1. 주문 저장
        Order order = orderRepository.save(request.toEntity());

        // 2. 같은 트랜잭션에서 outbox 저장
        //    트랜잭션 커밋 → 둘 다 저장
        //    트랜잭션 롤백 → 둘 다 롤백
        OutboxEvent event = OutboxEvent.builder()
            .aggregateType("Order")
            .aggregateId(order.getId())
            .eventType("OrderCreated")
            .payload(JsonUtil.toJson(order))
            .build();
        outboxRepository.save(event);

        return order;
    }
}

// Outbox Relay: outbox에서 Kafka로 발행
@Component
@RequiredArgsConstructor
public class OutboxRelay {

    private final OutboxEventRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    // 1초마다 미발행 이벤트 처리
    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void publishPendingEvents() {
        // 미발행 이벤트 최대 100개 조회
        List<OutboxEvent> pending = outboxRepository
            .findByPublishedAtIsNullOrderByCreatedAt(PageRequest.of(0, 100));

        pending.forEach(event -> {
            // Kafka 발행
            kafkaTemplate.send(event.getEventType(), event.getPayload());
            // 발행 완료 표시
            event.setPublishedAt(Instant.now());
        });

        outboxRepository.saveAll(pending);
    }
}
```

---

## Dead Letter Queue (DLQ)

```
처리 실패한 메시지는 어떻게 하나?

정상 처리:
메시지 → Consumer → 성공 → 삭제

재시도:
메시지 → Consumer → 실패
         ↓
      대기 (Visibility Timeout 만료)
         ↓
      Consumer → 재시도 (최대 3회)
         ↓
      여전히 실패 → DLQ로 이동

DLQ 활용:
— 실패 메시지 원인 분석
— 코드 수정 후 DLQ에서 다시 원본 큐로 이동
— 운영팀 알림 (DLQ에 메시지 쌓이면 알람)
— 절대 처리 불가한 메시지 격리 (서비스 영향 없이)
```

```java
// 영구 오류 vs 일시적 오류 구분
@SqsListener(value = "main-queue")
public void processMessage(OrderEvent event) {
    try {
        orderService.process(event);
    } catch (DataNotFoundException e) {
        // 영구 오류 (데이터가 없음 → 재시도해도 의미 없음)
        // 빠르게 DLQ로 보내기 위해 maxReceiveCount를 1로 설정
        log.error("처리 불가한 메시지: {}", event, e);
        throw e;  // 재시도 후 DLQ로
    } catch (TemporaryServiceException e) {
        // 일시적 오류 (외부 서비스 장애 등)
        // Visibility Timeout 후 자동 재시도
        log.warn("일시적 오류, 재시도 예정: {}", e.getMessage());
        throw e;
    }
}

// DLQ 모니터링 → 알람 설정
// AWS CloudWatch Alarm: DLQ 메시지 수 > 0 → SNS → 이메일/슬랙 알람
```

---

## 흔한 실수와 주의사항

```
실수 1: 메시지 순서에 의존
❌ 메시지 처리 순서가 중요한 로직에 일반 큐 사용
— SQS Standard는 순서 보장 안 함
— Kafka도 파티션 간 순서 보장 안 함
✅ 순서 필요 → SQS FIFO 또는 Kafka 키 기반 파티셔닝

실수 2: 멱등성 처리 안 함
— 네트워크 오류로 같은 메시지가 2번 전달될 수 있음
❌ 메시지 처리가 2번 실행되면 이중 결제/이중 발송
✅ 처리 전 중복 확인 (idempotency key 사용)
✅ DB unique constraint 활용

실수 3: 너무 큰 메시지
❌ SQS 최대 256KB, Kafka 기본 1MB
— 이미지나 큰 데이터를 메시지에 직접 포함
✅ 큰 데이터는 S3에 저장, 메시지에는 S3 URL만 포함

실수 4: DLQ 모니터링 없음
❌ DLQ에 메시지 쌓이는데 아무도 모름
✅ DLQ 메시지 수 > 0이면 알람 설정

실수 5: Kafka Consumer 그룹 ID 중복
❌ 같은 서비스의 다른 환경(dev/prod)에서 같은 그룹 ID
→ 프로덕션 메시지를 개발 서버가 소비!
✅ 환경별로 다른 그룹 ID: "notification-service-prod"
```
