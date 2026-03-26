---
title: "Circuit Breaker (Resilience4j)"
order: 22
---

## 서킷 브레이커란 무엇인가

서킷 브레이커는 **외부 서비스 장애가 내 서비스로 전파되는 것을 막는** 패턴입니다.

**전기 차단기 비유:**
집에서 전기 과부하가 걸리면 차단기(Circuit Breaker)가 자동으로 내려갑니다. 배선이 타는 것(연쇄 장애)을 막기 위해서입니다. 잠시 후 차단기를 다시 올려서 복구합니다.

**현실 문제:**

```
결제 서비스가 느려진 상황:
OrderService → PaymentService.pay() → 5초 대기 → 응답
                                        ↓
OrderService의 스레드가 5초씩 물려있음
                                        ↓
OrderService 전체가 느려짐 (연쇄 장애!)
```

**서킷 브레이커 적용 후:**

```
CLOSED (정상): 요청 정상 통과
     ↓ 실패율 50% 초과 시
OPEN (차단): 즉시 폴백 응답 (기다리지 않음)
     ↓ 30초 후
HALF-OPEN (시험): 일부 요청만 통과 → 성공 시 CLOSED, 실패 시 다시 OPEN
```

---

## 의존성

```groovy
// build.gradle
implementation 'org.springframework.cloud:spring-cloud-starter-circuitbreaker-resilience4j'
implementation 'org.springframework.boot:spring-boot-starter-aop'  // @CircuitBreaker 어노테이션 사용 시 필요
```

---

## 설정

```yaml
# application.yml
resilience4j:
  # ─────────────────────────────────────────
  # 서킷 브레이커
  # ─────────────────────────────────────────
  circuitbreaker:
    instances:
      paymentService:                    # 서킷 브레이커 이름 (코드에서 이 이름 참조)
        registerHealthIndicator: true    # Actuator health에 포함
        slidingWindowSize: 10            # 최근 10번 요청 기준으로 판단
        minimumNumberOfCalls: 5          # 최소 5번 요청 후에 판단 시작
        failureRateThreshold: 50         # 50% 이상 실패 시 OPEN
        waitDurationInOpenState: 30s     # OPEN 상태 30초 유지 후 HALF-OPEN
        permittedNumberOfCallsInHalfOpenState: 3  # HALF-OPEN에서 3번 시험 요청
        automaticTransitionFromOpenToHalfOpenEnabled: true  # 자동으로 HALF-OPEN 전환

  # ─────────────────────────────────────────
  # 재시도
  # ─────────────────────────────────────────
  retry:
    instances:
      paymentService:
        maxAttempts: 3             # 최대 3번 시도 (첫 시도 포함)
        waitDuration: 500ms        # 재시도 간격 500ms
        retryExceptions:
          - java.net.ConnectException               # 연결 오류 시 재시도
          - org.springframework.web.client.HttpServerErrorException  # 5xx 오류 시 재시도
        ignoreExceptions:
          - com.example.exception.BusinessException  # 비즈니스 오류는 재시도 안 함

  # ─────────────────────────────────────────
  # 타임 리미터 (시간 제한)
  # ─────────────────────────────────────────
  timelimiter:
    instances:
      paymentService:
        timeoutDuration: 3s         # 3초 초과 시 TimeoutException 발생

  # ─────────────────────────────────────────
  # 벌크헤드 (동시 요청 제한)
  # ─────────────────────────────────────────
  bulkhead:
    instances:
      paymentService:
        maxConcurrentCalls: 20      # 동시에 최대 20개 요청만 처리
        maxWaitDuration: 100ms      # 20개 초과 시 100ms 기다리다가 실패
```

---

## @CircuitBreaker 어노테이션 사용

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentService {

    private final ExternalPaymentClient paymentClient;

    // 서킷 브레이커 + 타임 리미터 + 재시도 조합
    // 어노테이션 순서 중요: CircuitBreaker가 가장 바깥, TimeLimiter가 가장 안쪽
    @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
    @Retry(name = "paymentService")
    @TimeLimiter(name = "paymentService")
    public CompletableFuture<PaymentResult> processPayment(PaymentRequest request) {
        // 외부 결제 서비스 호출 (느릴 수 있음)
        return CompletableFuture.supplyAsync(() -> {
            log.info("결제 처리 시작: orderId={}", request.getOrderId());
            PaymentResult result = paymentClient.pay(request);
            log.info("결제 처리 완료: orderId={}, result={}", request.getOrderId(), result);
            return result;
        });
    }

    // 폴백 메서드 1: 일반 오류 처리
    // 파라미터 타입이 원본 메서드와 동일 + 마지막에 Throwable 추가
    public CompletableFuture<PaymentResult> paymentFallback(
            PaymentRequest request, Throwable ex) {
        log.warn("결제 서비스 폴백 실행: orderId={}, 사유={}",
            request.getOrderId(), ex.getMessage());

        // 사용자에게 "처리 중" 응답 → 나중에 상태 확인하도록 안내
        return CompletableFuture.completedFuture(
            PaymentResult.pending(
                request.getOrderId(),
                "결제 처리가 지연되고 있습니다. 잠시 후 결제 내역을 확인해주세요."
            )
        );
    }

    // 폴백 메서드 2: 서킷 OPEN 상태 전용 폴백 (더 구체적인 타입이 우선)
    public CompletableFuture<PaymentResult> paymentFallback(
            PaymentRequest request, CallNotPermittedException ex) {
        log.error("결제 서비스 차단됨 (Circuit OPEN): orderId={}", request.getOrderId());

        // 완전히 차단된 경우 → 더 명확한 안내
        return CompletableFuture.completedFuture(
            PaymentResult.failed(
                request.getOrderId(),
                "결제 서비스가 점검 중입니다. 10분 후 다시 시도해주세요."
            )
        );
    }
}
```

---

## 동기 방식 서킷 브레이커

비동기가 필요 없을 때 더 단순하게 사용할 수 있습니다.

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class UserServiceClient {

    private final RestClient restClient;
    private final CircuitBreakerRegistry registry;  // Resilience4j 레지스트리

    // 방법 1: CircuitBreakerRegistry 직접 사용
    public UserResponse getUser(Long userId) {
        CircuitBreaker cb = registry.circuitBreaker("userService");

        try {
            // 서킷 브레이커로 감싸기
            return cb.executeSupplier(() ->
                restClient.get()
                    .uri("/users/{id}", userId)
                    .retrieve()
                    .body(UserResponse.class)
            );
        } catch (CallNotPermittedException e) {
            // 서킷 OPEN 상태 → 즉시 예외 발생 (기다리지 않음)
            log.warn("User Service 차단됨: userId={}", userId);
            return UserResponse.anonymous();  // 기본값 반환
        }
    }

    // 방법 2: vavr Try를 이용한 폴백 (더 함수형 스타일)
    public UserResponse getUserWithFallback(Long userId) {
        CircuitBreaker cb = registry.circuitBreaker("userService");

        return Try.ofSupplier(
            CircuitBreaker.decorateSupplier(cb, () ->
                restClient.get()
                    .uri("/users/{id}", userId)
                    .retrieve()
                    .body(UserResponse.class)
            ))
            .recover(CallNotPermittedException.class,
                ex -> {
                    log.warn("서킷 OPEN - 익명 사용자로 대체");
                    return UserResponse.anonymous();
                })
            .recover(ex -> {
                log.warn("사용자 조회 실패 - 기본값 반환: {}", ex.getMessage());
                return UserResponse.anonymous();
            })
            .get();
    }
}
```

---

## Bulkhead (동시 요청 제한)

서킷 브레이커가 장애를 감지한 후 차단한다면, Bulkhead는 **처음부터 동시 요청 수를 제한**합니다.

**선박 격벽 비유:** 배의 격벽처럼 한 칸이 물에 잠겨도 다른 칸이 막아줍니다.

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class InventoryService {

    // 세마포어 방식: 동시 요청 수 제한
    @CircuitBreaker(name = "inventoryService", fallbackMethod = "inventoryFallback")
    @Bulkhead(name = "inventoryService", type = Bulkhead.Type.SEMAPHORE)
    public InventoryResult checkInventory(Long productId) {
        return inventoryClient.check(productId);
    }

    // 스레드 풀 방식 (비동기): 별도 스레드 풀에서 처리
    @Bulkhead(name = "inventoryService", type = Bulkhead.Type.THREADPOOL)
    public CompletableFuture<InventoryResult> checkInventoryAsync(Long productId) {
        return CompletableFuture.supplyAsync(() ->
            inventoryClient.check(productId)
        );
    }

    public InventoryResult inventoryFallback(Long productId, Throwable ex) {
        if (ex instanceof BulkheadFullException) {
            log.warn("Bulkhead 가득 참 - 재고 조회 불가: productId={}", productId);
        }
        // 재고 조회 불가 시 "있음"으로 처리 (낙관적 접근 - 실제 주문 시 재검증)
        return InventoryResult.assumeAvailable(productId);
    }
}
```

```yaml
resilience4j:
  bulkhead:
    instances:
      inventoryService:
        maxConcurrentCalls: 10      # 동시 10개 요청만 처리
        maxWaitDuration: 100ms      # 10개 초과 시 100ms 기다렸다가 BulkheadFullException

  thread-pool-bulkhead:
    instances:
      inventoryService:
        maxThreadPoolSize: 10       # 최대 스레드 수
        coreThreadPoolSize: 5       # 기본 스레드 수
        queueCapacity: 20           # 대기 큐 크기
```

---

## 상태 모니터링

```java
// 서킷 브레이커 상태 변경 이벤트 감지
@Component
@Slf4j
@RequiredArgsConstructor
public class CircuitBreakerMonitor {

    private final AlertService alertService;
    private final CircuitBreakerRegistry registry;

    @EventListener
    public void onStateTransition(CircuitBreakerOnStateTransitionEvent event) {
        String name = event.getCircuitBreakerName();
        String from = event.getStateTransition().getFromState().name();
        String to = event.getStateTransition().getToState().name();

        log.warn("서킷 브레이커 상태 변경: {} {} → {}", name, from, to);

        // OPEN 상태 전환 시 즉시 알림
        if (event.getStateTransition().getToState() == CircuitBreaker.State.OPEN) {
            alertService.notify(
                "서킷 브레이커 OPEN: " + name,
                "서비스 장애 감지. 폴백으로 응답 중입니다."
            );
        }

        // CLOSED 복구 시 알림
        if (event.getStateTransition().getToState() == CircuitBreaker.State.CLOSED) {
            log.info("서킷 브레이커 복구: {}", name);
        }
    }

    @EventListener
    public void onFailure(CircuitBreakerOnErrorEvent event) {
        log.warn("서킷 브레이커 실패 기록: {}, error={}",
            event.getCircuitBreakerName(),
            event.getThrowable().getMessage());
    }

    // 현재 상태 조회 (관리자 API용)
    public Map<String, String> getAllStates() {
        Map<String, String> states = new HashMap<>();
        registry.getAllCircuitBreakers()
            .forEach(cb -> states.put(cb.getName(), cb.getState().name()));
        return states;
    }
}
```

```bash
# Actuator로 상태 확인
GET /actuator/circuitbreakers
# 응답: 각 서킷 브레이커 이름, 상태, 실패율

GET /actuator/health
# 응답에 circuitBreakers 항목 포함
# paymentService: UP (CLOSED) 또는 DOWN (OPEN)
```

---

## Gateway와 함께 사용

```yaml
# Gateway에서 서킷 브레이커 설정
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
                name: paymentService             # Resilience4j 설정과 이름 일치
                fallbackUri: forward:/fallback/payment  # 폴백 경로
```

---

## Retry + CircuitBreaker 조합 순서

```
호출 흐름 (어노테이션이 여러 개일 때):

@CircuitBreaker  (가장 바깥: 전체 실패 감지 및 차단)
  @Retry         (그 안: 실패 시 재시도)
    @TimeLimiter (가장 안: 타임아웃 제한)
      실제 외부 호출

예시:
1. 요청 들어옴
2. 서킷 OPEN이면 즉시 폴백 실행 (아래 단계 생략)
3. TimeLimiter: 3초 제한 시작
4. 실제 호출 → 실패
5. Retry: 500ms 후 재시도
6. 재시도 또 실패
7. 재시도 또 실패 (3번)
8. CircuitBreaker: 실패 카운트 +3
9. 실패율이 50% 넘으면 OPEN으로 전환
```

```java
// 올바른 어노테이션 순서
@CircuitBreaker(name = "service", fallbackMethod = "fallback")  // 가장 먼저 선언
@Retry(name = "service")
@TimeLimiter(name = "service")
public CompletableFuture<Result> callExternalService() {
    return CompletableFuture.supplyAsync(() -> externalClient.call());
}
```

---

## 초보자가 자주 하는 실수

**실수 1: 폴백 메서드 시그니처 불일치**

```java
// 나쁜 예: 파라미터 타입이 다름 → 폴백 실행 안 됨
@CircuitBreaker(name = "svc", fallbackMethod = "fallback")
public PaymentResult pay(PaymentRequest request) { ... }

// 파라미터가 다르면 폴백 못 찾음
public PaymentResult fallback(String errorMsg) { ... }  // 틀림!

// 올바른 예: 원본과 동일한 파라미터 + Throwable 추가
public PaymentResult fallback(PaymentRequest request, Throwable ex) { ... }
```

**실수 2: @CircuitBreaker 어노테이션을 같은 클래스에서 내부 호출 시 동작 안 함**

```java
// Spring AOP 기반이라 같은 클래스 내부 호출은 프록시를 거치지 않음
@Service
public class OrderService {
    public void createOrder() {
        this.processPayment();  // 자기 자신 호출 → @CircuitBreaker 동작 안 함!
    }

    @CircuitBreaker(name = "payment")
    public void processPayment() { ... }
}

// 해결: 별도 클래스로 분리
@Service
public class PaymentProcessor {
    @CircuitBreaker(name = "payment")
    public void processPayment() { ... }
}
```

**실수 3: slidingWindowSize보다 minimumNumberOfCalls가 큼**

```yaml
# 이렇게 하면 최소 호출 수가 슬라이딩 윈도우보다 커서 판단이 안 됨
resilience4j:
  circuitbreaker:
    instances:
      myService:
        slidingWindowSize: 5          # 최근 5번 기준
        minimumNumberOfCalls: 10      # 10번 이상이어야 판단 → 5번밖에 없어서 판단 안 됨
        # minimumNumberOfCalls ≤ slidingWindowSize 이어야 함
```
