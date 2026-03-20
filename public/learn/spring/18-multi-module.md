---
title: "멀티모듈 프로젝트"
order: 18
---

## 멀티모듈이 필요한 이유

단일 모듈 프로젝트는 코드가 늘어날수록 의존성 경계가 무너집니다.

```
단일 모듈:
  Controller → Service → Repository (OK)
  Repository → Controller (이런 역방향 의존도 컴파일됨 — 막을 방법 없음)

멀티모듈:
  api 모듈     → domain 모듈  (단방향 강제)
  domain 모듈  → infra 모듈   (X, 방향 반전)
  infra 모듈   → domain 모듈  (O)
```

---

## 프로젝트 구조

```
my-service/
├── settings.gradle
├── build.gradle          (루트 — 공통 설정)
│
├── api/                  (Controller, Request/Response DTO, Security)
│   └── build.gradle
│
├── domain/               (Entity, Service, Repository 인터페이스, Domain Event)
│   └── build.gradle
│
├── infra/                (JPA 구현체, Kafka, Redis, S3 등 외부 의존성)
│   └── build.gradle
│
└── common/               (공통 예외, 유틸, 상수)
    └── build.gradle
```

의존성 방향: `api` → `domain` ← `infra`, 모두 → `common`

---

## settings.gradle

```groovy
rootProject.name = 'my-service'

include 'api'
include 'domain'
include 'infra'
include 'common'
```

---

## 루트 build.gradle

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.3.0' apply false
    id 'io.spring.dependency-management' version '1.1.4' apply false
}

subprojects {
    apply plugin: 'java'
    apply plugin: 'io.spring.dependency-management'

    group = 'com.example'
    version = '0.0.1-SNAPSHOT'

    java {
        sourceCompatibility = JavaVersion.VERSION_21
    }

    repositories {
        mavenCentral()
    }

    dependencyManagement {
        imports {
            mavenBom "org.springframework.boot:spring-boot-dependencies:3.3.0"
        }
    }

    dependencies {
        testImplementation 'org.springframework.boot:spring-boot-starter-test'
    }
}
```

---

## 각 모듈 build.gradle

```groovy
// common/build.gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter'
}

// domain/build.gradle
dependencies {
    implementation project(':common')
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    // Kafka, Redis 같은 인프라 의존성 없음
}

// infra/build.gradle
dependencies {
    implementation project(':domain')
    implementation project(':common')
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'
    implementation 'org.springframework.kafka:spring-kafka'
    runtimeOnly 'org.postgresql:postgresql'
}

// api/build.gradle
apply plugin: 'org.springframework.boot'  // 실행 가능한 JAR은 api만

dependencies {
    implementation project(':domain')
    implementation project(':infra')
    implementation project(':common')
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-security'
}
```

---

## 각 모듈의 역할

### common 모듈

```java
// 공통 예외
public class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;
    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}

public enum ErrorCode {
    USER_NOT_FOUND("사용자를 찾을 수 없습니다", HttpStatus.NOT_FOUND),
    ORDER_NOT_FOUND("주문을 찾을 수 없습니다", HttpStatus.NOT_FOUND),
    INSUFFICIENT_STOCK("재고가 부족합니다", HttpStatus.BAD_REQUEST);

    private final String message;
    private final HttpStatus status;
}
```

### domain 모듈

```java
// Entity
@Entity
@Table(name = "orders")
public class Order extends BaseEntity {
    @Id @GeneratedValue
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private User user;

    private OrderStatus status;

    // 도메인 로직
    public void cancel() {
        if (this.status != OrderStatus.PENDING) {
            throw new BusinessException(ErrorCode.ORDER_CANNOT_CANCEL);
        }
        this.status = OrderStatus.CANCELLED;
    }
}

// Repository 인터페이스 — domain에 선언, infra에서 구현
public interface OrderRepository {
    Order save(Order order);
    Optional<Order> findById(Long id);
    List<Order> findByUserId(Long userId);
}

// Service
@Service
@Transactional
public class OrderService {
    private final OrderRepository orderRepository;  // 인터페이스에만 의존

    public Order createOrder(Long userId, List<OrderItem> items) {
        Order order = Order.create(userId, items);
        return orderRepository.save(order);
    }
}
```

### infra 모듈

```java
// JPA Repository 구현
@Repository
public interface OrderJpaRepository extends JpaRepository<Order, Long> {}

// domain의 OrderRepository를 infra에서 구현
@Component
public class OrderRepositoryImpl implements OrderRepository {

    private final OrderJpaRepository jpaRepository;

    @Override
    public Order save(Order order) {
        return jpaRepository.save(order);
    }

    @Override
    public Optional<Order> findById(Long id) {
        return jpaRepository.findById(id);
    }
}
```

### api 모듈

```java
// Request/Response DTO는 api 모듈에만 존재
public record CreateOrderRequest(
    @NotEmpty List<OrderItemRequest> items
) {}

public record OrderResponse(Long id, String status, LocalDateTime createdAt) {
    public static OrderResponse from(Order order) {
        return new OrderResponse(order.getId(), order.getStatus().name(), order.getCreatedAt());
    }
}

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;  // domain의 Service

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @RequestBody @Valid CreateOrderRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        Order order = orderService.createOrder(getUserId(userDetails), request.toItems());
        return ResponseEntity.status(HttpStatus.CREATED).body(OrderResponse.from(order));
    }
}
```

---

## @SpringBootApplication 위치

```java
// api 모듈의 Application 클래스
@SpringBootApplication(
    scanBasePackages = {
        "com.example.api",
        "com.example.domain",
        "com.example.infra",
        "com.example.common"
    }
)
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

---

## 테스트 전략

```java
// domain 모듈 — 순수 단위 테스트 (Spring 없음)
class OrderTest {
    @Test
    void 주문_취소_성공() {
        Order order = Order.create(1L, List.of(...));
        order.cancel();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void 취소_불가_상태에서_취소_시_예외() {
        Order order = createPaidOrder();
        assertThatThrownBy(order::cancel)
            .isInstanceOf(BusinessException.class);
    }
}

// api 모듈 — @WebMvcTest
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @MockBean private OrderService orderService;
    // ...
}

// infra 모듈 — @DataJpaTest
@DataJpaTest
class OrderRepositoryImplTest {
    // ...
}
```
