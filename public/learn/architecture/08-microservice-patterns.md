---
title: "마이크로서비스 패턴"
order: 8
---

# 마이크로서비스 패턴

모노리스 분해와 서비스 간 협력 패턴.

---

## 마이크로서비스 vs 모노리스

```
모노리스:
장점: 단순, 빠른 개발, 트랜잭션 쉬움
단점: 배포 단위 크고, 기술 스택 고정, 일부 장애가 전체 영향

마이크로서비스:
장점: 독립 배포, 서비스별 스케일링, 기술 스택 자유
단점: 분산 시스템 복잡도, 네트워크 실패, 분산 트랜잭션

언제 마이크로서비스?
— 팀이 여러 개이고 각자 독립 배포가 필요할 때
— 서비스별 트래픽 차이가 클 때
— 모노리스가 실제로 문제를 일으킬 때

권장: 모노리스로 시작 → 분리 필요 시 점진적으로 분리
```

---

## Strangler Fig 패턴

```
레거시 모노리스를 점진적으로 마이크로서비스로 교체.

단계:
1. 새 기능을 마이크로서비스로 개발
2. API Gateway로 트래픽 분기 (일부는 모노리스, 일부는 신규)
3. 레거시 기능을 하나씩 마이크로서비스로 이전
4. 레거시가 완전히 대체되면 제거

          ┌─── API Gateway ───┐
클라이언트 →                   ├── /users   → User Service (신규)
          │                   ├── /orders  → Monolith (레거시)
          └───────────────────┘

이전 후:
          ┌─── API Gateway ───┐
클라이언트 →                   ├── /users   → User Service
          │                   ├── /orders  → Order Service
          └───────────────────┘
```

---

## API Gateway 라우팅

```java
// Spring Cloud Gateway 설정
@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator routes(RouteLocatorBuilder builder) {
        return builder.routes()
            // User Service
            .route("user-service", r -> r
                .path("/api/users/**")
                .filters(f -> f
                    .stripPrefix(0)
                    .addRequestHeader("X-Source", "gateway")
                    .circuitBreaker(c -> c
                        .setName("user-service-cb")
                        .setFallbackUri("forward:/fallback/users"))
                )
                .uri("lb://user-service"))

            // Order Service
            .route("order-service", r -> r
                .path("/api/orders/**")
                .filters(f -> f
                    .stripPrefix(0)
                    .requestRateLimiter(c -> c
                        .setRateLimiter(redisRateLimiter())
                        .setKeyResolver(userKeyResolver()))
                )
                .uri("lb://order-service"))

            // 레거시 모노리스 (나머지 모두)
            .route("monolith", r -> r
                .path("/**")
                .uri("lb://monolith"))
            .build();
    }
}
```

---

## Anti-Corruption Layer (ACL)

```java
// 다른 서비스의 모델을 내부 도메인 모델로 변환

// 외부 User Service의 응답
public record ExternalUserDto(
    String userId,
    String fullName,
    String emailAddress,
    String membershipType,
    boolean isActive
) {}

// 내부 도메인 모델
public class Customer {
    private final CustomerId id;
    private final String name;
    private final Email email;
    private final CustomerGrade grade;
}

// ACL: 외부 → 내부 변환
@Component
@RequiredArgsConstructor
public class UserServiceAcl {

    private final UserServiceClient userServiceClient;

    public Optional<Customer> getCustomer(Long customerId) {
        return userServiceClient.getUser(customerId)
            .map(this::toInternalModel);
    }

    private Customer toInternalModel(ExternalUserDto dto) {
        if (!dto.isActive()) return null;

        return new Customer(
            new CustomerId(Long.parseLong(dto.userId())),
            dto.fullName(),
            new Email(dto.emailAddress()),
            mapGrade(dto.membershipType())
        );
    }

    private CustomerGrade mapGrade(String membershipType) {
        return switch (membershipType) {
            case "PREMIUM", "VIP" -> CustomerGrade.GOLD;
            case "STANDARD"       -> CustomerGrade.SILVER;
            default               -> CustomerGrade.BRONZE;
        };
    }
}
```

---

## Saga 패턴 (분산 트랜잭션)

```
문제: 마이크로서비스 간 ACID 트랜잭션 불가
해결: 로컬 트랜잭션 + 보상 트랜잭션의 연속

Choreography Saga (이벤트 기반):
OrderService → OrderPlaced
                   ↓
PaymentService → PaymentCompleted
                   ↓
InventoryService → StockReserved
                   ↓ (실패 시)
InventoryService → StockReservationFailed
                   ↓
PaymentService → PaymentCancelled (보상)
                   ↓
OrderService → OrderCancelled (보상)
```

```java
// Choreography Saga 구현

// 1. 주문 생성
@Service
@Transactional
public class OrderService {

    public void placeOrder(PlaceOrderCommand command) {
        Order order = Order.create(command);
        orderRepository.save(order);
        eventPublisher.publish(new OrderPlacedEvent(order));
    }

    // 보상: 결제 실패 시 주문 취소
    @KafkaListener(topics = "payment-failed")
    @Transactional
    public void handlePaymentFailed(PaymentFailedEvent event) {
        Order order = orderRepository.findById(event.orderId()).orElseThrow();
        order.cancel("결제 실패");
        orderRepository.save(order);
        eventPublisher.publish(new OrderCancelledEvent(order));
    }
}

// 2. 결제 처리
@Service
@Transactional
public class PaymentService {

    @KafkaListener(topics = "order-placed")
    public void handleOrderPlaced(OrderPlacedEvent event) {
        try {
            Payment payment = processPayment(event);
            eventPublisher.publish(new PaymentCompletedEvent(payment));
        } catch (PaymentException e) {
            eventPublisher.publish(new PaymentFailedEvent(event.orderId(), e.getMessage()));
        }
    }

    // 보상: 재고 부족 시 결제 취소
    @KafkaListener(topics = "stock-reservation-failed")
    @Transactional
    public void handleStockFailed(StockReservationFailedEvent event) {
        Payment payment = paymentRepository.findByOrderId(event.orderId()).orElseThrow();
        refund(payment);
        eventPublisher.publish(new PaymentCancelledEvent(payment));
    }
}
```

```java
// Orchestration Saga (중앙 조율자)
@Service
@RequiredArgsConstructor
public class PlaceOrderSaga {

    private final PaymentClient paymentClient;
    private final InventoryClient inventoryClient;
    private final NotificationClient notificationClient;

    @Transactional
    public void execute(Order order) {
        try {
            // Step 1: 결제
            Payment payment = paymentClient.processPayment(
                new ProcessPaymentRequest(order.getUserId(), order.getTotalAmount()));

            try {
                // Step 2: 재고 예약
                inventoryClient.reserve(
                    new ReserveStockRequest(order.getId(), order.getItems()));

                // Step 3: 알림
                notificationClient.sendOrderConfirmation(order);

            } catch (StockException e) {
                // Step 2 실패 → Step 1 보상
                paymentClient.refund(payment.getId());
                order.cancel("재고 부족");
                throw new OrderPlacementException("재고 부족으로 주문 실패", e);
            }

        } catch (PaymentException e) {
            order.cancel("결제 실패");
            throw new OrderPlacementException("결제 실패", e);
        }
    }
}
```

---

## 서비스 간 통신

```java
// 동기 통신: OpenFeign
@FeignClient(
    name = "user-service",
    fallbackFactory = UserClientFallbackFactory.class
)
public interface UserServiceClient {

    @GetMapping("/api/users/{userId}")
    Optional<UserDto> getUser(@PathVariable Long userId);

    @PostMapping("/api/users")
    UserDto createUser(@RequestBody CreateUserRequest request);
}

// Fallback
@Component
public class UserClientFallbackFactory
    implements FallbackFactory<UserServiceClient> {

    @Override
    public UserServiceClient create(Throwable cause) {
        return new UserServiceClient() {
            @Override
            public Optional<UserDto> getUser(Long userId) {
                log.warn("User service fallback for userId: {}", userId, cause);
                return Optional.empty();  // 기본값 반환
            }

            @Override
            public UserDto createUser(CreateUserRequest request) {
                throw new ServiceUnavailableException("User service unavailable");
            }
        };
    }
}

// 비동기 통신: Kafka (느슨한 결합)
@Service
@RequiredArgsConstructor
public class OrderEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishOrderPlaced(Order order) {
        OrderPlacedEvent event = new OrderPlacedEvent(
            order.getId().value(),
            order.getUserId().value(),
            order.getTotalAmount()
        );
        kafkaTemplate.send("order-events", order.getId().toString(), event);
    }
}
```

---

## 서비스 메시 (Service Mesh)

```
서비스 메시가 제공하는 것:
— mTLS (서비스 간 암호화 통신)
— 트래픽 관리 (가중치 라우팅, 카나리)
— 관측성 (분산 추적, 메트릭)
— Circuit Breaking

사이드카 패턴:
각 서비스 Pod에 Proxy 컨테이너 추가 (Envoy)
→ 네트워크 기능을 애플리케이션에서 분리

Istio 예시:
```

```yaml
# 카나리 배포 (10% 트래픽을 v2로)
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
            subset: v1
          weight: 90
        - destination:
            host: order-service
            subset: v2
          weight: 10

---
# Circuit Breaking
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```
