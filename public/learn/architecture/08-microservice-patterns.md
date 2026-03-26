---
title: "마이크로서비스 패턴"
order: 8
---

# 마이크로서비스 패턴

마이크로서비스는 큰 앱을 여러 개의 작은 서비스로 나누는 방식이다.
레고 블록처럼 각 서비스를 독립적으로 만들고 조립한다.
하지만 블록이 많아질수록 **연결 방식**이 복잡해진다 — 그것이 이 챕터의 핵심이다.

---

## 마이크로서비스 vs 모노리스

```
모노리스 (하나의 큰 덩어리):
┌─────────────────────────────────┐
│  주문   결제   재고   알림   사용자  │
│    모두 하나의 프로세스에서 실행    │
└─────────────────────────────────┘

장점: 개발 단순, 트랜잭션 쉬움, 배포 간단
단점: 재고 버그 → 전체 서비스 다운
      팀이 커지면 → 코드 충돌 폭발
      결제 서버만 증설 불가 (전체 증설해야 함)

마이크로서비스 (여러 작은 블록):
┌────────┐  ┌────────┐  ┌────────┐
│주문서비스│  │결제서비스│  │재고서비스│
└────────┘  └────────┘  └────────┘
     ↕            ↕           ↕
    각각 독립 배포, 독립 확장, 독립 DB

장점: 결제팀은 결제만 배포, 재고팀은 재고만 배포
      트래픽 많은 서비스만 서버 증설
      결제 서비스 장애가 재고 서비스에 영향 없음
단점: 서비스 간 네트워크 통신 → 실패 가능
      분산 트랜잭션 어려움
      운영 복잡도 급증

초보자의 실수:
처음부터 마이크로서비스로 시작 → 팀이 작으면 오히려 느려짐!
권장: 모노리스로 시작 → 문제가 생기면 그때 분리
```

---

## Strangler Fig 패턴 — 점진적 분리

한 번에 다 바꾸지 말고, 나무를 감싸는 식물처럼 천천히 교체한다.

```
레거시 모노리스를 점진적으로 교체하는 전략:

1단계: 레거시 앞에 API Gateway 추가
        클라이언트 → API Gateway → 모노리스 (모든 요청)

2단계: 새 기능을 마이크로서비스로 개발
        클라이언트 → API Gateway → 모노리스 (/orders, /products)
                                 → 신규 User Service (/users)

3단계: 레거시 기능을 하나씩 마이크로서비스로 이전
        클라이언트 → API Gateway → Order Service (/orders)
                                 → Payment Service (/payments)
                                 → 모노리스 (남은 기능)

4단계: 레거시 완전 제거
        클라이언트 → API Gateway → 각 마이크로서비스

핵심: 서비스 중단 없이 점진적 전환 가능
```

---

## API Gateway — 단일 진입점

모든 외부 요청이 API Gateway를 통해 들어온다.
인증, 라우팅, 속도 제한을 한 곳에서 처리한다.

```java
// Spring Cloud Gateway 설정
@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator routes(RouteLocatorBuilder builder) {
        return builder.routes()
            // /api/users/** → User Service로 라우팅
            .route("user-service", r -> r
                .path("/api/users/**")
                .filters(f -> f
                    .addRequestHeader("X-Source", "gateway")   // 게이트웨이 출처 헤더 추가
                    .circuitBreaker(c -> c                      // Circuit Breaker 적용
                        .setName("user-cb")
                        .setFallbackUri("forward:/fallback/users"))
                )
                .uri("lb://user-service"))  // lb:// = 로드 밸런서 (여러 인스턴스)

            // /api/orders/** → Order Service (속도 제한 적용)
            .route("order-service", r -> r
                .path("/api/orders/**")
                .filters(f -> f
                    .requestRateLimiter(c -> c               // 속도 제한
                        .setRateLimiter(redisRateLimiter())   // Redis로 분산 속도 제한
                        .setKeyResolver(userKeyResolver()))   // 사용자별 제한
                )
                .uri("lb://order-service"))

            // 나머지 모두 → 레거시 모노리스 (Strangler Fig)
            .route("monolith", r -> r
                .path("/**")
                .uri("lb://monolith"))
            .build();
    }

    // Fallback 핸들러 (서비스 다운 시 반환할 응답)
    @GetMapping("/fallback/users")
    public ResponseEntity<Map<String, String>> userFallback() {
        return ResponseEntity.status(503).body(
            Map.of("message", "사용자 서비스가 일시적으로 이용 불가합니다.")
        );
    }
}
```

```yaml
# application.yml (YAML 방식으로 라우팅 설정)
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/api/users/**
          filters:
            - name: CircuitBreaker
              args:
                name: user-cb
                fallbackUri: forward:/fallback/users
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 10   # 초당 10건
                redis-rate-limiter.burstCapacity: 20   # 순간 최대 20건
```

---

## Anti-Corruption Layer (ACL) — 외부 모델 격리

다른 서비스가 모델을 바꿔도 내 서비스가 영향받지 않도록 변환 레이어를 둔다.

```
문제:
User Service 응답: { "userId": "123", "fullName": "홍길동", "membershipType": "PREMIUM" }
Order Service: 이 모델을 직접 사용

User Service가 "fullName" → "name"으로 바꾸면?
→ Order Service도 수정해야 함 → 서비스 간 강한 결합!

해결 (ACL):
외부 모델 ──변환──> 내부 도메인 모델
User Service DTO   →   Customer (내부 모델)
```

```java
// 외부 User Service가 반환하는 DTO (외부 형식)
public record ExternalUserDto(
    String userId,
    String fullName,
    String emailAddress,
    String membershipType,  // "PREMIUM", "STANDARD", "FREE"
    boolean isActive
) {}

// 내부 Order Service의 도메인 모델 (우리 형식)
public class Customer {
    private final CustomerId id;
    private final String name;
    private final Email email;
    private final CustomerGrade grade;  // GOLD, SILVER, BRONZE
}

// ACL: 외부 → 내부 변환 담당
@Component
@RequiredArgsConstructor
@Slf4j
public class UserServiceAcl {

    private final UserServiceClient userServiceClient;  // Feign Client

    // 외부 User Service에서 데이터 가져와서 내부 모델로 변환
    public Optional<Customer> getCustomer(Long customerId) {
        return userServiceClient.getUser(customerId)
            .filter(ExternalUserDto::isActive)  // 비활성 사용자 제외
            .map(this::toInternalModel);
    }

    private Customer toInternalModel(ExternalUserDto dto) {
        return new Customer(
            new CustomerId(Long.parseLong(dto.userId())),
            dto.fullName(),                              // fullName → name
            new Email(dto.emailAddress()),
            mapGrade(dto.membershipType())              // PREMIUM → GOLD
        );
    }

    // User Service의 등급 체계를 내부 등급 체계로 매핑
    private CustomerGrade mapGrade(String membershipType) {
        return switch (membershipType) {
            case "PREMIUM", "VIP" -> CustomerGrade.GOLD;    // VIP도 GOLD로
            case "STANDARD"       -> CustomerGrade.SILVER;
            default               -> CustomerGrade.BRONZE;  // FREE, UNKNOWN 등
        };
    }
}
```

---

## Saga 패턴 — 분산 트랜잭션

```
문제:
주문(Order DB) + 결제(Payment DB) + 재고(Inventory DB)
→ 3개의 서비스, 3개의 DB → 하나의 @Transactional 불가!

예시: 주문이 성공했는데 결제가 실패하면?
→ 주문은 생성됐는데 결제는 안 된 상태 → 데이터 불일치!

Saga 패턴:
각 서비스가 로컬 트랜잭션을 실행하고,
실패 시 이전 단계를 취소하는 "보상 트랜잭션"을 실행한다.

정상 흐름:
주문 생성 → 결제 처리 → 재고 차감 → 알림 발송

실패 흐름 (재고 부족):
주문 생성 ✓
결제 처리 ✓
재고 차감 ✗ (재고 부족!)
→ 결제 취소 (보상)   ← 이미 성공한 것을 되돌림
→ 주문 취소 (보상)
```

### Choreography Saga — 이벤트 기반 (Kafka)

```java
// 각 서비스가 이벤트를 발행하고 구독하며 자율적으로 처리

// 1. 주문 서비스
@Service
@Transactional
public class OrderService {

    public void placeOrder(PlaceOrderCommand command) {
        Order order = Order.create(command);
        orderRepository.save(order);

        // 이벤트 발행 → Payment Service가 수신
        eventPublisher.publish(new OrderPlacedEvent(order));
        log.info("주문 생성, 이벤트 발행: orderId={}", order.getId());
    }

    // 보상: 결제 실패 시 주문 취소
    @KafkaListener(topics = "payment-failed")
    @Transactional
    public void handlePaymentFailed(PaymentFailedEvent event) {
        Order order = orderRepository.findById(event.orderId()).orElseThrow();
        order.cancel("결제 실패: " + event.reason());
        orderRepository.save(order);
        log.info("결제 실패로 주문 취소: orderId={}", event.orderId());
    }
}

// 2. 결제 서비스
@Service
public class PaymentService {

    // OrderPlacedEvent 수신 → 결제 시도
    @KafkaListener(topics = "order-placed")
    @Transactional
    public void handleOrderPlaced(OrderPlacedEvent event) {
        try {
            Payment payment = processPayment(event.userId(), event.amount());
            // 결제 성공 → Inventory Service가 수신
            eventPublisher.publish(new PaymentCompletedEvent(payment));
        } catch (PaymentException e) {
            // 결제 실패 → Order Service가 수신하여 주문 취소
            eventPublisher.publish(new PaymentFailedEvent(event.orderId(), e.getMessage()));
        }
    }

    // 보상: 재고 부족 시 결제 취소 (환불)
    @KafkaListener(topics = "stock-reservation-failed")
    @Transactional
    public void handleStockFailed(StockReservationFailedEvent event) {
        Payment payment = paymentRepository.findByOrderId(event.orderId()).orElseThrow();
        refund(payment);
        eventPublisher.publish(new PaymentCancelledEvent(payment));
        log.info("재고 부족으로 환불 처리: orderId={}", event.orderId());
    }
}

// 3. 재고 서비스
@Service
public class InventoryService {

    @KafkaListener(topics = "payment-completed")
    @Transactional
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        try {
            reserveStock(event.orderId(), event.items());
            eventPublisher.publish(new StockReservedEvent(event.orderId()));
        } catch (InsufficientStockException e) {
            // 재고 부족 → Payment Service가 수신하여 환불
            eventPublisher.publish(new StockReservationFailedEvent(event.orderId(), e.getMessage()));
        }
    }
}
```

### Orchestration Saga — 중앙 조율자

```java
// 하나의 Saga 클래스가 전체 흐름을 조율

@Service
@RequiredArgsConstructor
@Slf4j
public class PlaceOrderSaga {

    private final PaymentClient paymentClient;
    private final InventoryClient inventoryClient;
    private final NotificationClient notificationClient;
    private final OrderRepository orderRepository;

    @Transactional
    public void execute(Order order) {
        Payment payment = null;

        try {
            // Step 1: 결제 처리
            log.info("Saga Step 1: 결제 처리 시작 - orderId={}", order.getId());
            payment = paymentClient.processPayment(
                new ProcessPaymentRequest(order.getUserId(), order.getTotalAmount())
            );

            // Step 2: 재고 예약
            log.info("Saga Step 2: 재고 예약 시작 - orderId={}", order.getId());
            inventoryClient.reserve(
                new ReserveStockRequest(order.getId(), order.getItems())
            );

            // Step 3: 알림 발송
            log.info("Saga Step 3: 알림 발송 - orderId={}", order.getId());
            notificationClient.sendOrderConfirmation(order);

            order.complete();
            orderRepository.save(order);
            log.info("Saga 완료 - orderId={}", order.getId());

        } catch (StockException e) {
            // Step 2 실패 → Step 1 보상 (환불)
            log.error("재고 예약 실패, 결제 환불 시작: {}", e.getMessage());
            if (payment != null) {
                paymentClient.refund(payment.getId());
            }
            order.cancel("재고 부족");
            orderRepository.save(order);
            throw new OrderPlacementException("재고 부족으로 주문 실패", e);

        } catch (PaymentException e) {
            // Step 1 실패 → 보상 없음 (결제 자체가 안 됨)
            log.error("결제 처리 실패: {}", e.getMessage());
            order.cancel("결제 실패");
            orderRepository.save(order);
            throw new OrderPlacementException("결제 실패", e);
        }
    }
}
```

---

## 서비스 간 통신 — 동기 vs 비동기

```
동기 통신 (Feign, WebClient):
서비스 A → HTTP 요청 → 서비스 B → 응답 → 서비스 A
장점: 단순, 즉시 결과 확인
단점: 서비스 B가 느리면 A도 느림, B가 죽으면 A도 실패 위험

비동기 통신 (Kafka, RabbitMQ):
서비스 A → 이벤트 발행 → [Kafka] → 서비스 B (나중에 처리)
장점: 느슨한 결합, B가 죽어도 메시지 유지
단점: 즉시 결과 모름, 이벤트 순서 관리 복잡
```

```java
// 동기 통신: OpenFeign
@FeignClient(
    name = "user-service",                    // 서비스 이름 (서비스 디스커버리)
    fallbackFactory = UserClientFallback.class // 장애 시 Fallback
)
public interface UserServiceClient {

    @GetMapping("/internal/users/{userId}")
    Optional<UserDto> getUser(@PathVariable Long userId);

    @PostMapping("/internal/users")
    UserDto createUser(@RequestBody CreateUserRequest request);
}

// Fallback — User Service 장애 시 기본값 반환
@Component
public class UserClientFallback implements FallbackFactory<UserServiceClient> {

    private static final Logger log = LoggerFactory.getLogger(UserClientFallback.class);

    @Override
    public UserServiceClient create(Throwable cause) {
        return new UserServiceClient() {
            @Override
            public Optional<UserDto> getUser(Long userId) {
                log.warn("User Service Fallback (getUser): userId={}, cause={}", userId, cause.getMessage());
                return Optional.empty();  // 빈 값 반환 (서비스 계속 동작)
            }

            @Override
            public UserDto createUser(CreateUserRequest request) {
                // 생성 실패는 빈 값으로 대체 불가 → 예외 발생
                throw new ServiceUnavailableException("User Service 일시 중단");
            }
        };
    }
}
```

```java
// 비동기 통신: Kafka 이벤트
@Service
@RequiredArgsConstructor
public class OrderEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishOrderCreated(Order order) {
        OrderCreatedEvent event = new OrderCreatedEvent(
            order.getId().value(),
            order.getUserId().value(),
            order.getTotalAmount(),
            order.getItems().stream()
                .map(item -> new OrderItemDto(item.getProductId(), item.getQuantity()))
                .toList()
        );

        // 파티션 키 = orderId → 같은 주문의 이벤트는 같은 파티션 (순서 보장)
        kafkaTemplate.send("order-events", order.getId().toString(), event);
        log.info("주문 생성 이벤트 발행: orderId={}", order.getId());
    }
}
```

---

## Circuit Breaker — 장애 전파 차단

```
문제:
Order Service → User Service 호출
User Service가 5초씩 걸린다면?
Order Service의 모든 요청이 5초씩 대기
→ Order Service 스레드 풀 고갈 → Order Service도 죽음!
→ 장애가 연쇄 전파됨 (Cascading Failure)

Circuit Breaker (차단기):
정상: Order → User (직접 호출)
이상: User가 계속 실패 → 차단기 OPEN → Order → Fallback 즉시 반환
     (User를 기다리지 않고 기본값 반환)
복구: 일정 시간 후 HALF-OPEN → 소수 요청으로 User 테스트 → 성공하면 CLOSED
```

```java
// build.gradle.kts
// implementation("org.springframework.cloud:spring-cloud-starter-circuitbreaker-resilience4j")

// application.yml
resilience4j:
  circuitbreaker:
    instances:
      user-service:
        failure-rate-threshold: 50           # 50% 이상 실패 시 OPEN
        wait-duration-in-open-state: 30s     # 30초 후 HALF-OPEN 시도
        sliding-window-size: 10              # 최근 10번 요청 기준
        minimum-number-of-calls: 5           # 최소 5번 호출 후 판단
        permitted-calls-in-half-open-state: 3 # HALF-OPEN에서 3번 테스트
  retry:
    instances:
      user-service:
        max-attempts: 3                      # 최대 3번 재시도
        wait-duration: 500ms                 # 재시도 간격 500ms
        retry-exceptions:
          - java.net.ConnectException        # 연결 오류만 재시도
```

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final UserServiceClient userServiceClient;
    private final CircuitBreakerFactory circuitBreakerFactory;

    public UserDto getUserWithFallback(Long userId) {
        CircuitBreaker cb = circuitBreakerFactory.create("user-service");

        return cb.run(
            () -> userServiceClient.getUser(userId).orElseThrow(),
            throwable -> {
                // Fallback: User Service 장애 시 기본 User 반환
                log.warn("User Service 차단됨, 기본값 반환: userId={}", userId);
                return new UserDto(userId, "알 수 없음", "unknown@example.com");
            }
        );
    }
}
```

---

## 서비스 메시 (Service Mesh)

서비스 메시는 서비스 간 통신을 **사이드카 프록시**로 처리한다.
애플리케이션 코드 변경 없이 mTLS, 트래픽 제어, 분산 추적을 제공한다.

```
기존 방식:
Order Service → (HTTP) → Payment Service
→ 암호화, 재시도, Circuit Breaker 코드를 각 서비스에 작성해야 함

서비스 메시 (Istio):
Order Service → [Envoy Proxy] → [Envoy Proxy] → Payment Service
→ 프록시가 자동으로 mTLS, 재시도, 트래픽 제어 처리
→ 애플리케이션 코드는 그냥 HTTP만 씀!

사이드카 패턴:
각 Pod에 애플리케이션 컨테이너 + Envoy 프록시 컨테이너를 함께 배포
→ 모든 인바운드/아웃바운드 트래픽이 Envoy를 통과
```

```yaml
# Istio 카나리 배포 (v1에 90%, v2에 10% 트래픽)
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
    - order-service
  http:
    - route:
        - destination:
            host: order-service
            subset: v1           # 기존 버전
          weight: 90             # 90% 트래픽
        - destination:
            host: order-service
            subset: v2           # 신규 버전 (카나리)
          weight: 10             # 10% 트래픽
---
# 서브셋 정의 (어느 Pod가 v1/v2인지)
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  subsets:
    - name: v1
      labels:
        version: v1           # Pod 레이블로 구분
    - name: v2
      labels:
        version: v2
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5    # 5번 연속 5xx → 해당 Pod 제거
      interval: 30s              # 30초 간격 체크
      baseEjectionTime: 30s      # 30초간 격리
```

---

## Event Sourcing + CQRS 간단 패턴

```
일반 DB 방식:
주문 상태: "배송중" (현재 상태만 저장)
"어떻게 배송중이 됐는지" 이력 없음

Event Sourcing:
모든 변경을 이벤트로 저장
OrderCreated → PaymentCompleted → OrderShipped → OrderDelivered

현재 상태 = 모든 이벤트를 순서대로 재실행
→ "언제 무슨 일이 있었는지" 완전한 이력
→ 특정 시점으로 되돌리기 가능
→ 감사(Audit) 로그 자동 생성
```

```java
// 주문 이벤트 저장 (Event Store)
@Entity
@Table(name = "order_events")
public class OrderEvent {
    @Id @GeneratedValue
    private Long id;

    private String orderId;
    private String eventType;    // "ORDER_CREATED", "PAYMENT_COMPLETED" 등
    private String eventData;    // JSON 직렬화된 이벤트 데이터
    private Instant occurredAt;
    private Long version;        // 이벤트 순서 (낙관적 락)
}

@Service
@RequiredArgsConstructor
public class OrderEventStore {

    private final OrderEventRepository repository;
    private final ObjectMapper objectMapper;

    // 이벤트 저장
    public void save(String orderId, DomainEvent event) {
        OrderEvent entity = new OrderEvent();
        entity.setOrderId(orderId);
        entity.setEventType(event.getClass().getSimpleName());
        entity.setEventData(objectMapper.writeValueAsString(event));
        entity.setOccurredAt(Instant.now());
        repository.save(entity);
    }

    // 이벤트 재실행으로 현재 상태 복원
    public Order rehydrate(String orderId) {
        List<OrderEvent> events = repository.findByOrderIdOrderByVersion(orderId);

        Order order = new Order();  // 빈 상태
        for (OrderEvent event : events) {
            // 각 이벤트를 순서대로 적용
            order.apply(deserialize(event));
        }
        return order;
    }
}
```

---

## 모니터링 — 분산 시스템 관측성

마이크로서비스는 서비스가 많아서 **어디서 문제가 났는지** 파악이 어렵다.

```
관측성의 3기둥:

Metrics (지표):
→ 초당 요청 수, 에러율, 응답 시간
→ Prometheus + Grafana

Logs (로그):
→ 각 서비스의 로그에 traceId 포함
→ ELK Stack (Elasticsearch + Logstash + Kibana)
→ AWS CloudWatch Logs

Traces (추적):
→ 요청이 어느 서비스를 거쳤는지 시각화
→ Zipkin, Jaeger, AWS X-Ray
→ 어느 서비스가 병목인지 파악
```

```yaml
# Spring Boot + Micrometer Tracing (분산 추적)
# build.gradle.kts
# implementation("io.micrometer:micrometer-tracing-bridge-brave")
# implementation("io.zipkin.reporter2:zipkin-reporter-brave")

# application.yml
management:
  tracing:
    sampling:
      probability: 0.1    # 10%만 추적 (운영에서 성능 영향 최소화)
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans

logging:
  pattern:
    # 로그에 traceId, spanId 자동 포함
    level: "%5p [${spring.application.name},%X{traceId:-},%X{spanId:-}]"
```

---

## 자주 하는 실수

```java
// 실수 1: 서비스 간 DB 직접 접근
// Order Service에서 User DB에 직접 쿼리
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Order Service가 User DB에 직접 접근 → 강한 결합!
    // User DB 스키마 변경 → Order Service도 수정해야 함
}
// 해결: 반드시 API 호출로만 다른 서비스 데이터 접근

// 실수 2: Saga 없이 분산 트랜잭션 시도
orderRepository.save(order);                    // Order DB 저장 성공
paymentService.processPayment(order);           // Payment 실패!
// → Order는 생성됐는데 결제는 안 된 상태 (데이터 불일치)
// 해결: Saga 패턴으로 보상 트랜잭션 구현

// 실수 3: 동기 호출 체인 (Death Star 패턴)
// A → B → C → D → E (모두 동기 호출)
// E가 느리면? A도 느려짐!
// 해결: 가능한 비동기 이벤트로 변경, 필요한 경우만 동기 호출

// 실수 4: 공유 라이브러리로 도메인 모델 공유
// shared-domain.jar에 Order, User, Payment 모두 포함
// → 한 모델 변경 → 모든 서비스 재배포!
// 해결: 서비스별 독립 모델 + ACL로 변환

// 실수 5: 처음부터 마이크로서비스
// 팀 3명인데 서비스 10개 운영
// → 배포 복잡도, 장애 대응 복잡도 폭발
// 해결: 모노리스로 시작, 실제 문제 생길 때 분리

// 실수 6: Circuit Breaker 없이 서비스 간 호출
// 하나의 서비스 장애 → 연쇄 장애 (Cascading Failure)
// 해결: Resilience4j Circuit Breaker + Fallback 필수

// 실수 7: traceId 없이 로그 기록
log.info("주문 처리 완료");  // 어느 요청인지 알 수 없음
// 해결: Micrometer Tracing으로 traceId 자동 포함
log.info("주문 처리 완료: orderId={}", orderId);  // 최소한 도메인 ID는 포함
```
