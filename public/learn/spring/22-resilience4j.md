---
title: "Circuit Breaker (Resilience4j)"
order: 22
---

## 서킷 브레이커 패턴

외부 서비스가 응답하지 않을 때 연쇄 장애(Cascade Failure)를 막습니다.

```
CLOSED   → 정상 동작. 실패율이 임계치 초과 시 OPEN으로 전환
OPEN     → 호출 차단. 일정 시간 후 HALF_OPEN으로 전환
HALF_OPEN→ 제한적 호출 허용. 성공하면 CLOSED, 실패하면 다시 OPEN
```

---

## 의존성

```groovy
implementation 'org.springframework.cloud:spring-cloud-starter-circuitbreaker-resilience4j'
// AOP 기반 어노테이션 사용 시
implementation 'org.springframework.boot:spring-boot-starter-aop'
```

---

## 설정

```yaml
# application.yml
resilience4j:
  circuitbreaker:
    instances:
      paymentService:
        registerHealthIndicator: true
        slidingWindowSize: 10          # 최근 10번 요청 기준
        minimumNumberOfCalls: 5        # 최소 5번 이후 판단
        failureRateThreshold: 50       # 50% 이상 실패 시 OPEN
        waitDurationInOpenState: 30s   # OPEN 유지 30초
        permittedNumberOfCallsInHalfOpenState: 3
        automaticTransitionFromOpenToHalfOpenEnabled: true

  retry:
    instances:
      paymentService:
        maxAttempts: 3
        waitDuration: 500ms
        retryExceptions:
          - java.net.ConnectException
          - org.springframework.web.client.HttpServerErrorException

  timelimiter:
    instances:
      paymentService:
        timeoutDuration: 3s   # 3초 초과 시 TimeoutException

  bulkhead:
    instances:
      paymentService:
        maxConcurrentCalls: 20  # 동시 요청 최대 20개
```

---

## @CircuitBreaker 어노테이션

```java
@Service
public class PaymentService {

    private final ExternalPaymentClient paymentClient;

    // 서킷 브레이커 + 폴백
    @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
    @TimeLimiter(name = "paymentService")
    @Retry(name = "paymentService")
    public CompletableFuture<PaymentResult> processPayment(PaymentRequest request) {
        return CompletableFuture.supplyAsync(() ->
            paymentClient.pay(request)
        );
    }

    // 폴백 메서드 — 파라미터 + 예외 타입이 일치해야 함
    public CompletableFuture<PaymentResult> paymentFallback(
            PaymentRequest request, Throwable ex) {
        log.warn("결제 서비스 폴백 — 사유: {}", ex.getMessage());
        return CompletableFuture.completedFuture(
            PaymentResult.pending(request.getOrderId(), "결제 처리 중, 잠시 후 확인해주세요")
        );
    }

    // CallNotPermittedException (OPEN 상태) 전용 폴백
    public CompletableFuture<PaymentResult> paymentFallback(
            PaymentRequest request, CallNotPermittedException ex) {
        log.error("결제 서비스 차단됨 — Circuit OPEN");
        return CompletableFuture.completedFuture(
            PaymentResult.failed(request.getOrderId(), "결제 서비스 점검 중")
        );
    }
}
```

---

## 동기 방식

```java
@Service
public class UserServiceClient {

    private final RestClient restClient;
    private final CircuitBreakerRegistry registry;

    public UserResponse getUser(Long userId) {
        CircuitBreaker cb = registry.circuitBreaker("userService");

        // CircuitBreaker로 감싸기
        return cb.executeSupplier(() ->
            restClient.get()
                .uri("/users/{id}", userId)
                .retrieve()
                .body(UserResponse.class)
        );
    }

    // 폴백 포함
    public UserResponse getUserWithFallback(Long userId) {
        CircuitBreaker cb = registry.circuitBreaker("userService");

        return Try.ofSupplier(CircuitBreaker.decorateSupplier(cb, () ->
            restClient.get().uri("/users/{id}", userId).retrieve().body(UserResponse.class)))
            .recover(ex -> UserResponse.anonymous())  // 폴백
            .get();
    }
}
```

---

## Bulkhead (동시 요청 제한)

```java
@CircuitBreaker(name = "inventoryService", fallbackMethod = "inventoryFallback")
@Bulkhead(name = "inventoryService", type = Bulkhead.Type.SEMAPHORE)
public InventoryResult checkInventory(Long productId) {
    return inventoryClient.check(productId);
}

// Thread Pool Bulkhead (비동기)
@Bulkhead(name = "inventoryService", type = Bulkhead.Type.THREADPOOL)
public CompletableFuture<InventoryResult> checkInventoryAsync(Long productId) {
    return CompletableFuture.supplyAsync(() ->
        inventoryClient.check(productId)
    );
}
```

```yaml
resilience4j:
  bulkhead:
    instances:
      inventoryService:
        maxConcurrentCalls: 10
        maxWaitDuration: 100ms  # 10개 초과 시 100ms 대기 후 실패
  thread-pool-bulkhead:
    instances:
      inventoryService:
        maxThreadPoolSize: 10
        coreThreadPoolSize: 5
        queueCapacity: 20
```

---

## 이벤트 모니터링

```java
@Component
public class CircuitBreakerEventListener {

    @EventListener
    public void onCircuitBreakerStateTransition(CircuitBreakerOnStateTransitionEvent event) {
        log.warn("서킷 브레이커 상태 변경 — name={}, {} → {}",
            event.getCircuitBreakerName(),
            event.getStateTransition().getFromState(),
            event.getStateTransition().getToState());

        // OPEN 상태 전환 시 알림
        if (event.getStateTransition().getToState() == CircuitBreaker.State.OPEN) {
            slackService.alert("서킷 브레이커 OPEN: " + event.getCircuitBreakerName());
        }
    }
}

// Actuator를 통한 상태 확인
// GET /actuator/circuitbreakers
// GET /actuator/health → circuitBreakers 항목 포함
```

---

## Gateway와 함께 사용

```yaml
# Gateway application.yml
spring:
  cloud:
    gateway:
      routes:
        - id: payment-service
          uri: lb://PAYMENT-SERVICE
          predicates:
            - Path=/api/payments/**
          filters:
            - name: CircuitBreaker
              args:
                name: paymentService
                fallbackUri: forward:/fallback/payment

# 폴백 컨트롤러
@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @GetMapping("/payment")
    public ResponseEntity<ErrorResponse> paymentFallback() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(new ErrorResponse("결제 서비스를 일시적으로 이용할 수 없습니다"));
    }
}
```

---

## Retry + CircuitBreaker 조합 순서

```
호출
 → @Retry (재시도 3번)
   → 모두 실패
     → @CircuitBreaker (실패 카운트 증가)
       → 임계치 초과 시 OPEN
         → @Bulkhead (동시 요청 제한)
           → Fallback 실행
```

어노테이션 순서가 중요합니다:

```java
// 올바른 순서: 안쪽부터 CircuitBreaker → Retry → TimeLimiter
@CircuitBreaker(name = "service", fallbackMethod = "fallback")
@Retry(name = "service")
@TimeLimiter(name = "service")
public CompletableFuture<Result> callService() { ... }
```
