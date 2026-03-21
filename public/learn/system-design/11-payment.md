---
title: "실전 설계: 결제 시스템"
order: 11
---

# 실전 설계: 결제 시스템

안전하고 신뢰성 있는 결제 시스템 설계.

---

## 요구사항 정의

```
기능적 요구사항:
— 결제 요청 처리
— 결제 취소/환불
— 결제 내역 조회
— 외부 PG(Payment Gateway) 연동

비기능적 요구사항:
— 정확성: 이중 결제 절대 금지
— 멱등성: 같은 요청 여러 번 → 한 번만 처리
— 일관성: 결제 성공 ↔ 주문 상태 동기화
— 감사 가능성: 모든 거래 기록

규모 추정:
— TPS: 최대 1,000 (쿠팡, 네이버 수준)
— 24시간 결제: 100만 건/일
— 데이터: 결제 1건 ~1KB → 1GB/일
```

---

## 결제 상태 기계

```
주문 생성 → 결제 요청 → 처리 중 → 완료
                              ↓
                           실패 → 재시도
                              ↓
                           취소 → 환불 대기 → 환불 완료

상태:
PENDING         — 결제 요청됨
PROCESSING      — PG 처리 중
COMPLETED       — 결제 완료
FAILED          — 결제 실패
CANCELLED       — 취소됨
REFUND_PENDING  — 환불 대기
REFUNDED        — 환불 완료
```

---

## 데이터 모델

```sql
-- 결제 주문
CREATE TABLE payment_orders (
    id BIGINT PRIMARY KEY,         -- Snowflake ID
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,  -- 중복 방지
    user_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KRW',
    status VARCHAR(20) NOT NULL,
    pg_provider VARCHAR(20),       -- TOSS, NICE, KG_INICIS
    pg_transaction_id VARCHAR(200),-- PG사 거래 ID
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 결제 이벤트 로그 (변경 불가 감사 로그)
CREATE TABLE payment_events (
    id BIGSERIAL PRIMARY KEY,
    payment_order_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,  -- REQUESTED, PROCESSING, COMPLETED, FAILED
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    payload JSONB,                    -- PG 응답 전체 저장
    created_at TIMESTAMP DEFAULT NOW()
);

-- 정산
CREATE TABLE settlements (
    id BIGSERIAL PRIMARY KEY,
    payment_order_id BIGINT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    fee DECIMAL(15, 2),
    net_amount DECIMAL(15, 2),
    settled_at TIMESTAMP,
    status VARCHAR(20)
);
```

---

## 멱등성 처리

```java
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentOrderRepository paymentOrderRepository;
    private final PaymentEventRepository paymentEventRepository;
    private final PgClient pgClient;
    private final RedisTemplate<String, String> redisTemplate;

    @Transactional
    public PaymentResult processPayment(PaymentRequest request) {
        // 1. 멱등성 키 확인 (Redis로 빠른 체크)
        String idempKey = request.getIdempotencyKey();
        String cacheKey = "idempotency:payment:" + idempKey;

        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            // 이미 처리됨 → 저장된 결과 반환
            return PaymentResult.fromJson(cached);
        }

        // 2. DB에서 기존 주문 확인
        Optional<PaymentOrder> existing = paymentOrderRepository.findByIdempotencyKey(idempKey);
        if (existing.isPresent()) {
            return PaymentResult.from(existing.get());
        }

        // 3. 새 결제 주문 생성
        PaymentOrder order = PaymentOrder.builder()
            .idempotencyKey(idempKey)
            .userId(request.getUserId())
            .orderId(request.getOrderId())
            .amount(request.getAmount())
            .status(PaymentStatus.PENDING)
            .build();

        paymentOrderRepository.save(order);
        recordEvent(order, "REQUESTED", null);

        // 4. PG 결제 요청
        order.setStatus(PaymentStatus.PROCESSING);
        paymentOrderRepository.save(order);
        recordEvent(order, "PROCESSING", null);

        try {
            PgResponse pgResponse = pgClient.charge(
                PgChargeRequest.builder()
                    .orderId(order.getId().toString())
                    .amount(order.getAmount())
                    .build()
            );

            // 5. 결제 완료
            order.setStatus(PaymentStatus.COMPLETED);
            order.setPgTransactionId(pgResponse.getTransactionId());
            paymentOrderRepository.save(order);
            recordEvent(order, "COMPLETED", pgResponse);

            PaymentResult result = PaymentResult.success(order);

            // 캐시 저장 (24시간)
            redisTemplate.opsForValue().set(cacheKey, result.toJson(), Duration.ofHours(24));

            return result;

        } catch (PgException e) {
            // 6. 결제 실패
            order.setStatus(PaymentStatus.FAILED);
            paymentOrderRepository.save(order);
            recordEvent(order, "FAILED", e.getResponse());

            throw new PaymentFailedException(e.getMessage());
        }
    }

    private void recordEvent(PaymentOrder order, String type, Object payload) {
        paymentEventRepository.save(PaymentEvent.builder()
            .paymentOrderId(order.getId())
            .eventType(type)
            .oldStatus(order.getStatus().name())
            .newStatus(order.getStatus().name())
            .payload(JsonUtil.toJson(payload))
            .build());
    }
}
```

---

## 분산 트랜잭션 (Saga 패턴)

```
결제 성공 후 주문 상태 변경:

Choreography Saga:
Payment Service → PaymentCompleted 이벤트
                    ↓
Order Service → 주문 상태 = PAID
                    ↓
Inventory Service → 재고 차감
                    ↓
Notification Service → 결제 완료 알림

실패 시 보상 트랜잭션:
Inventory 차감 실패
    → InventoryFailed 이벤트
        → Order Service → 주문 취소
        → Payment Service → 결제 취소 (환불)
```

```java
// 결제 완료 이벤트 발행
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void onPaymentCompleted(PaymentCompletedEvent event) {
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

// 주문 서비스에서 처리
@KafkaListener(topics = "payment-events")
@Transactional
public void handlePaymentEvent(PaymentEvent event) {
    if ("PAYMENT_COMPLETED".equals(event.getType())) {
        try {
            orderService.markAsPaid(event.getOrderId());
            // 다음 단계 이벤트 발행
            kafkaTemplate.send("order-events",
                new OrderPaidEvent(event.getOrderId()));
        } catch (Exception e) {
            // 보상 트랜잭션: 결제 취소 요청
            kafkaTemplate.send("payment-commands",
                new CancelPaymentCommand(event.getPaymentId(), event.getOrderId()));
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
public class RefundService {

    public RefundResult refund(Long paymentOrderId, RefundRequest request) {
        PaymentOrder order = paymentOrderRepository.findById(paymentOrderId)
            .orElseThrow();

        // 환불 가능 상태 검증
        if (order.getStatus() != PaymentStatus.COMPLETED) {
            throw new InvalidStatusException("결제 완료 상태에서만 환불 가능");
        }

        // 환불 금액 검증
        if (request.getAmount().compareTo(order.getAmount()) > 0) {
            throw new InvalidAmountException("결제 금액 초과 환불 불가");
        }

        order.setStatus(PaymentStatus.REFUND_PENDING);
        paymentOrderRepository.save(order);

        // PG 환불 요청
        PgRefundResponse response = pgClient.refund(
            PgRefundRequest.builder()
                .pgTransactionId(order.getPgTransactionId())
                .amount(request.getAmount())
                .reason(request.getReason())
                .build()
        );

        order.setStatus(PaymentStatus.REFUNDED);
        paymentOrderRepository.save(order);
        recordEvent(order, "REFUNDED", response);

        return RefundResult.success(order, response);
    }
}
```

---

## 결제 보안

```
필수 보안 사항:

1. HTTPS 전용
2. 카드 정보 직접 저장 금지 (PCI DSS)
   — PG사 토큰으로 대체
3. 금액 서버에서 검증
   — 클라이언트 금액 신뢰 금지
   — DB의 주문 금액과 대조
4. 멱등성 키 검증
5. 서명 검증 (PG 웹훅)

PG 웹훅 처리:
```

```java
// 토스페이먼츠 웹훅 예시
@PostMapping("/webhook/toss")
public ResponseEntity<Void> handleTossWebhook(
    @RequestBody String payload,
    @RequestHeader("Toss-Signature") String signature
) {
    // 서명 검증 (HMAC-SHA256)
    if (!webhookVerifier.verify(payload, signature)) {
        return ResponseEntity.status(401).build();
    }

    TossWebhookEvent event = JsonUtil.fromJson(payload, TossWebhookEvent.class);

    switch (event.getEventType()) {
        case "PAYMENT_STATUS_CHANGED":
            paymentService.handleStatusChange(event);
            break;
        case "REFUND_STATUS_CHANGED":
            refundService.handleStatusChange(event);
            break;
    }

    return ResponseEntity.ok().build();
}
```
