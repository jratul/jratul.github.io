---
title: "실전 설계: 결제 시스템"
order: 11
---

## 문제 정의

안전하고 신뢰성 있는 결제 시스템을 설계합니다.

**결제 시스템이 특별히 어려운 이유:**
- 돈이 걸려있어서 오류가 치명적 (이중 결제, 결제 누락)
- 외부 PG(Payment Gateway) 연동 (통신 실패 가능)
- 분산 환경에서 일관성 보장 어려움
- 보안 규정 준수 필수 (PCI DSS)

---

## 요구사항 정의

```
기능적 요구사항:
─────────────────────────────────────
1. 결제 처리 (카드, 간편결제)
2. 결제 취소/환불
3. 결제 내역 조회
4. 외부 PG 연동 (토스페이먼츠, NICEPay 등)
5. 정산 처리

비기능적 요구사항:
─────────────────────────────────────
1. 정확성: 이중 결제 절대 금지
2. 멱등성: 같은 요청 여러 번 → 한 번만 처리
3. 일관성: 결제 성공 ↔ 주문 상태 동기화
4. 감사 가능성: 모든 상태 변경 기록
5. 보안: 카드 정보 직접 저장 금지

규모 추정:
─────────────────────────────────────
TPS: 평균 100, 피크 1,000
일 결제: 100만 건
데이터: 결제 1건 ~1KB → 1GB/일
```

---

## 결제 상태 기계

```
상태 전이 다이어그램:

    주문생성
       │
       ▼
   PENDING ──── 결제 요청됨, PG 호출 전
       │
       ▼
  PROCESSING ── PG 처리 중 (응답 대기)
      │  │
      │  └── FAILED → 결제 실패 (재시도 가능)
      │
      ▼
  COMPLETED ─── 결제 완료
      │
      └── CANCELLED → REFUND_PENDING → REFUNDED
                      환불 요청        환불 완료

상태 전이 규칙:
- COMPLETED → CANCELLED: 취소 가능
- CANCELLED → REFUND_PENDING: 환불 시작
- FAILED → PENDING: 재시도 (새 결제 요청)
- COMPLETED → COMPLETED: 불가 (이중 결제 방지)
```

---

## 데이터 모델

```sql
-- 결제 주문 (메인 테이블)
CREATE TABLE payment_orders (
    id BIGINT PRIMARY KEY,                        -- Snowflake ID
    idempotency_key VARCHAR(100) UNIQUE NOT NULL, -- 멱등성 키 (중복 방지 핵심)
    user_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,               -- 결제 금액
    currency VARCHAR(3) DEFAULT 'KRW',
    status VARCHAR(20) NOT NULL,                  -- PENDING, PROCESSING, COMPLETED, ...
    pg_provider VARCHAR(20),                      -- TOSS, NICE, KG_INICIS
    pg_transaction_id VARCHAR(200),               -- PG사 거래 ID (환불 시 필요)
    metadata JSONB,                               -- PG 응답 원본 등 추가 데이터
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 결제 이벤트 로그 (불변 감사 로그 - 절대 수정/삭제 안 함)
CREATE TABLE payment_events (
    id BIGSERIAL PRIMARY KEY,
    payment_order_id BIGINT NOT NULL REFERENCES payment_orders(id),
    event_type VARCHAR(50) NOT NULL,   -- REQUESTED, PROCESSING, COMPLETED, FAILED, REFUNDED
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    payload JSONB,                     -- PG 응답, 에러 메시지 등 전체 기록
    created_by VARCHAR(100),           -- 처리한 시스템/사람
    created_at TIMESTAMP DEFAULT NOW()
);
-- 이 테이블은 INSERT만 허용 (UPDATE, DELETE 권한 없음)

-- 정산
CREATE TABLE settlements (
    id BIGSERIAL PRIMARY KEY,
    payment_order_id BIGINT NOT NULL,
    gross_amount DECIMAL(15, 2) NOT NULL,  -- 결제 금액
    fee DECIMAL(15, 2),                    -- PG 수수료
    net_amount DECIMAL(15, 2),             -- 실 정산 금액
    settled_at TIMESTAMP,                  -- 정산 일시
    status VARCHAR(20)                     -- PENDING, SETTLED
);
```

---

## 멱등성 처리

```
왜 멱등성이 중요한가?

1. 클라이언트가 타임아웃으로 응답 못 받음
2. "결제됐나?" 확인 없이 다시 요청
3. 서버가 두 번 처리 → 이중 결제!

해결: Idempotency-Key 헤더
POST /api/v1/payments
Idempotency-Key: 클라이언트가 생성한 UUID

같은 키로 여러 번 요청해도 → 처음 처리 결과만 반환
```

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentOrderRepository paymentOrderRepository;
    private final PaymentEventRepository paymentEventRepository;
    private final PgClient pgClient;
    private final RedisTemplate<String, String> redisTemplate;

    @Transactional
    public PaymentResult processPayment(PaymentRequest request) {
        String idempKey = request.getIdempotencyKey();

        // ─── Step 1: 멱등성 키 중복 확인 ───────────────
        // Redis로 빠른 체크 (DB 조회보다 빠름)
        String cacheKey = "idempotency:payment:" + idempKey;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            log.info("멱등성 키 중복 - 캐시 반환: key={}", idempKey);
            return PaymentResult.fromJson(cached);
        }

        // DB에서도 확인 (Redis 장애 대비)
        Optional<PaymentOrder> existing = paymentOrderRepository
            .findByIdempotencyKey(idempKey);
        if (existing.isPresent()) {
            log.info("멱등성 키 중복 - DB 반환: key={}", idempKey);
            return PaymentResult.from(existing.get());
        }

        // ─── Step 2: 결제 금액 서버에서 재검증 ──────────
        // 클라이언트 금액을 절대 신뢰하지 않음!
        Order order = orderService.findById(request.getOrderId());
        if (!order.getTotalAmount().equals(request.getAmount())) {
            throw new InvalidAmountException("결제 금액이 주문 금액과 다릅니다");
        }

        // ─── Step 3: 결제 주문 생성 ─────────────────────
        PaymentOrder paymentOrder = PaymentOrder.builder()
            .idempotencyKey(idempKey)
            .userId(request.getUserId())
            .orderId(request.getOrderId())
            .amount(request.getAmount())
            .status(PaymentStatus.PENDING)
            .pgProvider(request.getPgProvider())
            .build();

        paymentOrderRepository.save(paymentOrder);
        recordEvent(paymentOrder, "REQUESTED", null);

        // ─── Step 4: PG 결제 요청 ────────────────────────
        paymentOrder.setStatus(PaymentStatus.PROCESSING);
        paymentOrderRepository.save(paymentOrder);
        recordEvent(paymentOrder, "PROCESSING", null);

        try {
            PgResponse pgResponse = pgClient.charge(
                PgChargeRequest.builder()
                    .orderId(paymentOrder.getId().toString())
                    .amount(paymentOrder.getAmount())
                    .pgProvider(paymentOrder.getPgProvider())
                    .build()
            );

            // ─── Step 5: 결제 완료 처리 ──────────────────
            paymentOrder.setStatus(PaymentStatus.COMPLETED);
            paymentOrder.setPgTransactionId(pgResponse.getTransactionId());
            paymentOrderRepository.save(paymentOrder);
            recordEvent(paymentOrder, "COMPLETED", pgResponse);

            PaymentResult result = PaymentResult.success(paymentOrder);

            // 캐시 저장 (24시간, 멱등성 캐시)
            redisTemplate.opsForValue().set(
                cacheKey, result.toJson(), Duration.ofHours(24));

            log.info("결제 완료: paymentId={}, amount={}",
                paymentOrder.getId(), paymentOrder.getAmount());

            return result;

        } catch (PgException e) {
            // ─── 결제 실패 처리 ──────────────────────────
            paymentOrder.setStatus(PaymentStatus.FAILED);
            paymentOrderRepository.save(paymentOrder);
            recordEvent(paymentOrder, "FAILED", e.getErrorResponse());

            log.error("결제 실패: paymentId={}, error={}",
                paymentOrder.getId(), e.getMessage());

            throw new PaymentFailedException(e.getMessage(), paymentOrder.getId());
        }
    }

    // 모든 상태 변경을 이벤트 로그에 기록 (감사 목적)
    private void recordEvent(PaymentOrder order, String eventType, Object payload) {
        paymentEventRepository.save(PaymentEvent.builder()
            .paymentOrderId(order.getId())
            .eventType(eventType)
            .oldStatus(order.getStatus().name())
            .newStatus(order.getStatus().name())
            .payload(JsonUtil.toJson(payload))
            .createdAt(Instant.now())
            .build());
    }
}
```

---

## 분산 트랜잭션 (Saga 패턴)

결제 완료 후 주문 상태 변경, 재고 차감이 모두 성공해야 합니다.

```
Saga Choreography (안무) 방식:

결제 완료
    │ PAYMENT_COMPLETED 이벤트
    ▼
OrderService → 주문 상태 PAID로 변경
    │ ORDER_PAID 이벤트
    ▼
InventoryService → 재고 차감
    │ INVENTORY_DECREASED 이벤트
    ▼
NotificationService → 결제 완료 알림

실패 시 보상 트랜잭션 (역방향):
InventoryService 실패
    │ INVENTORY_FAILED 이벤트
    ▼
OrderService → 주문 취소
    │ ORDER_CANCELLED 이벤트
    ▼
PaymentService → 결제 취소 (자동 환불)
```

```java
// 결제 완료 후 이벤트 발행
@Service
@RequiredArgsConstructor
public class PaymentEventPublisher {

    private final KafkaTemplate<String, PaymentEvent> kafkaTemplate;

    // DB 커밋 후 Kafka 발행 (Outbox 패턴 권장)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPaymentCompleted(PaymentCompletedDomainEvent event) {
        kafkaTemplate.send("payment-events",
            event.getOrderId().toString(),
            PaymentEvent.builder()
                .type("PAYMENT_COMPLETED")
                .orderId(event.getOrderId())
                .paymentId(event.getPaymentId())
                .amount(event.getAmount())
                .build()
        );
    }
}

// 주문 서비스가 결제 완료 이벤트 처리
@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentEventHandler {

    private final OrderService orderService;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @KafkaListener(topics = "payment-events", groupId = "order-service")
    @Transactional
    public void handlePaymentEvent(PaymentEvent event, Acknowledgment ack) {
        try {
            if ("PAYMENT_COMPLETED".equals(event.getType())) {
                // 주문 상태 PAID로 변경
                orderService.markAsPaid(event.getOrderId());

                // 다음 단계로 이벤트 전달
                kafkaTemplate.send("order-events",
                    new OrderPaidEvent(event.getOrderId(), event.getPaymentId()));

                ack.acknowledge();

            } else if ("PAYMENT_FAILED".equals(event.getType())) {
                orderService.markAsFailed(event.getOrderId(), event.getReason());
                ack.acknowledge();
            }

        } catch (Exception e) {
            log.error("결제 이벤트 처리 실패: orderId={}", event.getOrderId(), e);

            // 보상 트랜잭션: 결제 취소 요청
            kafkaTemplate.send("payment-commands",
                new CancelPaymentCommand(event.getPaymentId(), "주문 처리 실패"));
        }
    }
}
```

---

## 환불 처리

```java
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class RefundService {

    private final PaymentOrderRepository paymentOrderRepository;
    private final PaymentEventRepository paymentEventRepository;
    private final PgClient pgClient;

    public RefundResult refund(Long paymentOrderId, RefundRequest request) {
        PaymentOrder order = paymentOrderRepository.findById(paymentOrderId)
            .orElseThrow(() -> new NotFoundException("결제 없음: " + paymentOrderId));

        // 환불 가능 상태 검증
        if (order.getStatus() != PaymentStatus.COMPLETED) {
            throw new InvalidStatusException(
                "결제 완료 상태에서만 환불 가능. 현재: " + order.getStatus());
        }

        // 환불 금액 검증 (결제 금액 초과 불가)
        if (request.getAmount().compareTo(order.getAmount()) > 0) {
            throw new InvalidAmountException(
                String.format("환불 금액(%s) > 결제 금액(%s)",
                    request.getAmount(), order.getAmount()));
        }

        // 환불 시작
        order.setStatus(PaymentStatus.REFUND_PENDING);
        paymentOrderRepository.save(order);
        recordEvent(order, "REFUND_REQUESTED", request);

        // PG에 환불 요청
        PgRefundResponse pgResponse = pgClient.refund(
            PgRefundRequest.builder()
                .pgTransactionId(order.getPgTransactionId())  // 원래 결제 ID
                .amount(request.getAmount())
                .reason(request.getReason())
                .build()
        );

        // 환불 완료
        order.setStatus(PaymentStatus.REFUNDED);
        paymentOrderRepository.save(order);
        recordEvent(order, "REFUNDED", pgResponse);

        log.info("환불 완료: paymentId={}, amount={}", paymentOrderId, request.getAmount());

        return RefundResult.success(order, pgResponse);
    }
}
```

---

## PG 웹훅 처리

PG사가 결제 결과를 서버에 알려주는 방식입니다. 비동기 결제(카카오페이 등)에 필수입니다.

```java
@RestController
@RequestMapping("/webhook")
@RequiredArgsConstructor
@Slf4j
public class PgWebhookController {

    private final WebhookVerifier webhookVerifier;
    private final PaymentWebhookService webhookService;

    @PostMapping("/toss")
    public ResponseEntity<Void> handleTossWebhook(
            @RequestBody String payload,
            @RequestHeader("Toss-Signature") String signature) {

        // 1. 서명 검증 (위조 방지)
        // HMAC-SHA256(secret, payload)가 signature와 일치해야 함
        if (!webhookVerifier.verify(payload, signature, "TOSS")) {
            log.warn("토스 웹훅 서명 검증 실패");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        TossWebhookEvent event = JsonUtil.fromJson(payload, TossWebhookEvent.class);
        log.info("토스 웹훅 수신: type={}, orderId={}",
            event.getEventType(), event.getData().getOrderId());

        // 2. 이벤트 처리
        switch (event.getEventType()) {
            case "PAYMENT_STATUS_CHANGED" ->
                webhookService.handleStatusChange(event.getData());
            case "VIRTUAL_ACCOUNT_DEPOSIT_WAITED" ->
                webhookService.handleVirtualAccountDeposit(event.getData());
            default ->
                log.info("처리 안 하는 이벤트 타입: {}", event.getEventType());
        }

        // 3. 200 OK 반환 (안 하면 PG가 계속 재전송)
        return ResponseEntity.ok().build();
    }

    @PostMapping("/nice")
    public ResponseEntity<Void> handleNiceWebhook(
            @RequestBody String payload,
            @RequestHeader("X-Nice-Signature") String signature) {
        // NICE 웹훅 처리...
        return ResponseEntity.ok().build();
    }
}
```

---

## 결제 보안

```
필수 보안 사항:
──────────────────────────────────────────────────
1. HTTPS 전용
   - 결제 관련 API는 HTTP 허용 안 함

2. 카드 정보 직접 저장 금지 (PCI DSS)
   - 카드 번호, CVV 서버에 저장 = 위법
   - PG사 토큰(빌링키)으로 대체

3. 금액 서버에서 재검증
   - 클라이언트가 보낸 금액 신뢰 금지
   - 서버에서 주문 금액과 대조 필수

4. 멱등성 키 검증
   - UUID 형식 확인
   - 중복 처리 방지

5. PG 웹훅 서명 검증
   - 위조된 웹훅 차단
   - HMAC-SHA256 서명 확인

6. 요청 속도 제한 (Rate Limiting)
   - 무차별 결제 시도 차단
   - 사용자별 초당 10회 제한
```

---

## 전체 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    결제 시스템 아키텍처                   │
│                                                         │
│  [클라이언트 앱]                                         │
│        │                                                │
│  [API Gateway] ← JWT 인증, Rate Limiting                │
│        │                                                │
│  [결제 서비스]                                          │
│    ├── 멱등성 체크 (Redis)                              │
│    ├── 금액 검증 (주문 서비스)                          │
│    ├── PG 연동 (토스, NICEPay)                          │
│    └── 이벤트 발행 (Kafka)                              │
│        │                                                │
│  [PostgreSQL]                                           │
│    ├── payment_orders (결제 주문)                       │
│    └── payment_events (감사 로그)                       │
│        │                                                │
│  [Kafka] → [주문 서비스] → [재고 서비스]                │
│           → [알림 서비스]                               │
│           → [정산 서비스]                               │
│                                                         │
│  [PG사] → 웹훅 → [웹훅 핸들러]                         │
└─────────────────────────────────────────────────────────┘
```

---

## 트레이드오프 분석

```
동기 결제 vs 비동기 결제:
──────────────────────────────────────────────────
동기 (카드 즉시 결제)
흐름: 요청 → PG → 완료/실패 응답 → DB 저장
장점: 단순한 플로우
단점: PG 응답까지 대기 (최대 30초)

비동기 (가상계좌, 간편결제 앱)
흐름: 요청 → PG 접수 → 응답 → 사용자 앱에서 승인 → 웹훅
장점: 서버 스레드 블로킹 없음
단점: 웹훅 처리 복잡, 타임아웃 관리 필요

Saga Choreography vs Orchestration:
──────────────────────────────────────────────────
Choreography (안무)
장점: 서비스 간 결합 없음, 확장 쉬움
단점: 전체 흐름 파악 어려움, 분산 디버깅 어려움

Orchestration (지휘자)
장점: 중앙에서 전체 흐름 관리, 모니터링 쉬움
단점: Saga 오케스트레이터 단일 장애점
```

---

## 초보자가 자주 하는 실수

**실수 1: 결제 금액을 클라이언트에서 받아서 그대로 사용**

```java
// 절대 안 됨: 해커가 1원으로 바꿔서 보냄
@PostMapping("/payment")
public PaymentResult pay(@RequestBody PaymentRequest request) {
    pgClient.charge(request.getAmount());  // 클라이언트가 보낸 금액 그대로 사용!
}

// 올바른 방법: 서버에서 주문 금액 재조회
@PostMapping("/payment")
public PaymentResult pay(@RequestBody PaymentRequest request) {
    Order order = orderService.findById(request.getOrderId());
    pgClient.charge(order.getTotalAmount());  // 서버의 주문 금액 사용
}
```

**실수 2: PG 웹훅 서명 검증 생략**

```java
// 위험: 누구나 위조된 웹훅 전송 가능
@PostMapping("/webhook/toss")
public ResponseEntity<Void> webhook(@RequestBody TossWebhookEvent event) {
    paymentService.completePayment(event.getData());  // 서명 검증 없음!
}

// 올바른 방법: HMAC 서명 검증 필수
@PostMapping("/webhook/toss")
public ResponseEntity<Void> webhook(
        @RequestBody String rawBody,
        @RequestHeader("Toss-Signature") String signature) {
    if (!webhookVerifier.verify(rawBody, signature)) {
        return ResponseEntity.unauthorized().build();
    }
    // 검증 후 처리
}
```

**실수 3: 멱등성 없이 재시도 구현**

```java
// 타임아웃 시 재시도 로직
for (int i = 0; i < 3; i++) {
    try {
        return paymentService.pay(request);  // 멱등성 키 없음
    } catch (TimeoutException e) {
        // 재시도... 이중 결제 발생!
    }
}

// 올바른 방법: 멱등성 키 포함
String idempotencyKey = UUID.randomUUID().toString();  // 처음 시도 전 생성
for (int i = 0; i < 3; i++) {
    try {
        request.setIdempotencyKey(idempotencyKey);  // 매번 같은 키
        return paymentService.pay(request);
    } catch (TimeoutException e) {
        // 재시도... 서버가 중복 처리 방지
    }
}
```
