---
title: "멀티모듈 프로젝트"
order: 18
---

## 멀티모듈이란 무엇인가

멀티모듈은 **하나의 프로젝트를 여러 독립적인 모듈로 분리**하는 방식입니다.

**아파트 건물 비유:**
- 단일 모듈 = 방, 거실, 주방, 화장실이 모두 연결된 원룸 → 방에서 주방으로 직접 걸어가기 가능
- 멀티모듈 = 각 층이 독립된 구조 → 1층(Controller)이 3층(Domain)에 직접 접근하려면 엘리베이터(의존성 규칙)를 거쳐야 함

**단일 모듈의 문제점:**

```
단일 모듈에서는 이런 의존성 역전이 컴파일됨:
OrderRepository → OrderController (리포지토리가 컨트롤러를 참조)
→ 코드가 커질수록 어디서 무엇을 참조하는지 추적 불가

멀티모듈에서는 이런 역방향 의존성이 빌드 오류:
infra 모듈에서 api 모듈 import → 빌드 실패
→ 의존성 방향이 강제됨
```

**멀티모듈의 장점:**
- 의존성 방향을 물리적으로 강제 (잘못된 참조 = 빌드 오류)
- 각 모듈별 독립 테스트 가능 (도메인은 Spring 없이 순수 단위 테스트)
- 향후 마이크로서비스 분리가 쉬움
- 공통 코드 재사용 (common 모듈)

---

## 프로젝트 구조

```
my-service/
├── settings.gradle              ← 모듈 목록 선언
├── build.gradle                 ← 루트: 공통 설정 (버전, 의존성 관리)
│
├── api/                         ← Controller, Request/Response DTO, Security
│   └── build.gradle             ← 실행 가능한 JAR (spring-boot 플러그인)
│
├── domain/                      ← Entity, Service, Repository 인터페이스, Domain Event
│   └── build.gradle             ← 외부 인프라 의존성 없음
│
├── infra/                       ← JPA 구현체, Kafka, Redis, S3 등 외부 의존성
│   └── build.gradle
│
└── common/                      ← 공통 예외, 유틸, 상수
    └── build.gradle
```

**의존성 방향:**
```
api 모듈 ──→ domain 모듈 ←── infra 모듈
  └──────────────────────────────→ common 모듈
```

핵심: `domain`은 `infra`를 모릅니다. `infra`가 `domain`의 인터페이스를 구현합니다.

---

## settings.gradle

```groovy
// 어떤 하위 모듈이 있는지 선언
rootProject.name = 'my-service'

include 'api'      // 진입점 모듈
include 'domain'   // 비즈니스 로직
include 'infra'    // 외부 연동
include 'common'   // 공통 코드
```

---

## 루트 build.gradle

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.3.0' apply false    // 루트에는 적용 안 함
    id 'io.spring.dependency-management' version '1.1.4' apply false
}

// 모든 하위 모듈에 공통 설정 적용
subprojects {
    apply plugin: 'java'
    apply plugin: 'io.spring.dependency-management'

    group = 'com.example'
    version = '0.0.1-SNAPSHOT'

    java {
        sourceCompatibility = JavaVersion.VERSION_21  // Java 버전 통일
    }

    repositories {
        mavenCentral()
    }

    // BOM으로 Spring Boot 의존성 버전 통일 관리
    dependencyManagement {
        imports {
            mavenBom "org.springframework.boot:spring-boot-dependencies:3.3.0"
        }
    }

    dependencies {
        // 모든 모듈에서 공통으로 쓰는 테스트 의존성
        testImplementation 'org.springframework.boot:spring-boot-starter-test'
    }
}
```

---

## 각 모듈 build.gradle

```groovy
// common/build.gradle - 가장 단순한 모듈
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter'
    implementation 'org.springframework.boot:spring-boot-starter-validation'  // @Valid
}

// domain/build.gradle - 핵심 비즈니스 로직
dependencies {
    implementation project(':common')    // 공통 코드만 참조

    // JPA Entity 정의에 필요한 최소 의존성
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    // Kafka, Redis 같은 인프라 의존성은 절대 추가하지 않음
}

// infra/build.gradle - 외부 시스템 연동
dependencies {
    implementation project(':domain')    // domain의 인터페이스 구현
    implementation project(':common')

    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'
    implementation 'org.springframework.kafka:spring-kafka'
    runtimeOnly 'org.postgresql:postgresql'  // DB 드라이버
}

// api/build.gradle - 애플리케이션 진입점
apply plugin: 'org.springframework.boot'  // 실행 가능한 JAR 생성은 api만

dependencies {
    implementation project(':domain')
    implementation project(':infra')
    implementation project(':common')
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-security'
}
```

---

## common 모듈 - 공통 코드

```java
// 모든 모듈에서 쓰는 공통 예외 클래스
public class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;  // 에러 코드 enum

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public BusinessException(ErrorCode errorCode, String detail) {
        super(errorCode.getMessage() + ": " + detail);
        this.errorCode = errorCode;
    }
}

// 에러 코드 정의 - 모든 에러를 한 곳에서 관리
public enum ErrorCode {
    // 사용자 관련
    USER_NOT_FOUND("사용자를 찾을 수 없습니다", HttpStatus.NOT_FOUND),
    DUPLICATE_EMAIL("이미 사용 중인 이메일입니다", HttpStatus.CONFLICT),

    // 주문 관련
    ORDER_NOT_FOUND("주문을 찾을 수 없습니다", HttpStatus.NOT_FOUND),
    ORDER_CANNOT_CANCEL("취소할 수 없는 주문 상태입니다", HttpStatus.BAD_REQUEST),

    // 재고 관련
    INSUFFICIENT_STOCK("재고가 부족합니다", HttpStatus.BAD_REQUEST);

    private final String message;
    private final HttpStatus status;

    ErrorCode(String message, HttpStatus status) {
        this.message = message;
        this.status = status;
    }
}

// 공통 Base 엔티티
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter
public abstract class BaseEntity {
    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;    // 생성 시각 자동 입력

    @LastModifiedDate
    private LocalDateTime updatedAt;    // 수정 시각 자동 입력
}
```

---

## domain 모듈 - 비즈니스 핵심

```java
// Entity - 데이터와 비즈니스 로직을 함께 보유
@Entity
@Table(name = "orders")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)  // JPA용 기본 생성자
public class Order extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    private List<OrderItem> items = new ArrayList<>();

    private Long totalAmount;

    // 정적 팩토리 메서드로 객체 생성
    public static Order create(User user, List<OrderItem> items) {
        Order order = new Order();
        order.user = user;
        order.items = items;
        order.status = OrderStatus.PENDING;
        order.totalAmount = items.stream()
            .mapToLong(OrderItem::getPrice).sum();
        return order;
    }

    // 도메인 로직 - Entity 안에서 상태 변경
    public void cancel() {
        if (this.status != OrderStatus.PENDING) {
            // common 모듈의 예외 사용
            throw new BusinessException(ErrorCode.ORDER_CANNOT_CANCEL);
        }
        this.status = OrderStatus.CANCELLED;
    }

    public void complete() {
        if (this.status != OrderStatus.PROCESSING) {
            throw new BusinessException(ErrorCode.ORDER_CANNOT_CANCEL);
        }
        this.status = OrderStatus.COMPLETED;
    }
}

// Repository 인터페이스 - domain에 선언, infra에서 구현
// → domain은 어떻게 저장되는지 모름 (JPA인지 Redis인지 관심 없음)
public interface OrderRepository {
    Order save(Order order);
    Optional<Order> findById(Long id);
    List<Order> findByUserId(Long userId);
    void delete(Order order);
}

// Service - Repository 인터페이스에만 의존 (구현체를 모름)
@Service
@Transactional
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;    // 인터페이스 주입
    private final UserRepository userRepository;      // 인터페이스 주입

    public Order createOrder(Long userId, List<OrderItemRequest> itemRequests) {
        // 사용자 조회
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 주문 아이템 생성
        List<OrderItem> items = itemRequests.stream()
            .map(req -> OrderItem.create(req.getProductId(), req.getQuantity(), req.getPrice()))
            .toList();

        // 주문 생성 (도메인 로직)
        Order order = Order.create(user, items);
        return orderRepository.save(order);
    }

    public void cancelOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND));
        order.cancel();  // 도메인 로직 호출
        orderRepository.save(order);
    }
}
```

---

## infra 모듈 - 외부 연동 구현

```java
// JPA Repository (Spring Data 사용)
@Repository
public interface OrderJpaRepository extends JpaRepository<Order, Long> {

    // 사용자별 주문 목록 조회
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);
}

// domain의 OrderRepository 인터페이스를 infra에서 구현
@Component
@RequiredArgsConstructor
public class OrderRepositoryImpl implements OrderRepository {

    private final OrderJpaRepository jpaRepository;  // 실제 JPA 사용

    @Override
    public Order save(Order order) {
        return jpaRepository.save(order);  // JPA save 위임
    }

    @Override
    public Optional<Order> findById(Long id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<Order> findByUserId(Long userId) {
        return jpaRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public void delete(Order order) {
        jpaRepository.delete(order);
    }
}

// Redis 기반 캐시 구현 예시
@Component
@RequiredArgsConstructor
public class OrderCacheRepositoryImpl implements OrderCacheRepository {

    private final RedisTemplate<String, Order> redisTemplate;
    private static final Duration CACHE_TTL = Duration.ofMinutes(30);

    @Override
    public void put(Long orderId, Order order) {
        redisTemplate.opsForValue().set("order:" + orderId, order, CACHE_TTL);
    }

    @Override
    public Optional<Order> get(Long orderId) {
        return Optional.ofNullable(
            redisTemplate.opsForValue().get("order:" + orderId)
        );
    }
}
```

---

## api 모듈 - 외부 인터페이스

```java
// Request DTO - api 모듈에만 존재 (외부 API 형식은 외부에만)
public record CreateOrderRequest(
    @NotEmpty(message = "주문 상품이 비어있습니다")
    List<OrderItemRequest> items
) {}

public record OrderItemRequest(
    @NotNull Long productId,
    @Min(1) Integer quantity,
    @Positive Long price
) {}

// Response DTO - api 모듈에만 존재
public record OrderResponse(
    Long id,
    String status,
    Long totalAmount,
    LocalDateTime createdAt
) {
    // Domain → Response 변환 (api 모듈 책임)
    public static OrderResponse from(Order order) {
        return new OrderResponse(
            order.getId(),
            order.getStatus().name(),
            order.getTotalAmount(),
            order.getCreatedAt()
        );
    }
}

// Controller
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;  // domain 모듈의 Service

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @RequestBody @Valid CreateOrderRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        Long userId = getUserId(userDetails);
        Order order = orderService.createOrder(userId,
            request.items().stream()
                .map(r -> new OrderItemRequest(r.productId(), r.quantity(), r.price()))
                .toList());

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(OrderResponse.from(order));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelOrder(@PathVariable Long id) {
        orderService.cancelOrder(id);
        return ResponseEntity.noContent().build();
    }
}
```

---

## Application 클래스 위치

```java
// api 모듈에 Application 클래스 위치
// 모든 모듈의 패키지를 스캔 대상에 포함해야 Bean이 등록됨
@SpringBootApplication(
    scanBasePackages = {
        "com.example.api",     // api 모듈 컴포넌트
        "com.example.domain",  // domain 모듈 컴포넌트
        "com.example.infra",   // infra 모듈 컴포넌트
        "com.example.common"   // common 모듈 컴포넌트
    }
)
@EnableJpaAuditing  // BaseEntity의 @CreatedDate, @LastModifiedDate 활성화
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

---

## 테스트 전략

멀티모듈의 핵심 장점: 각 모듈을 독립적으로 테스트 가능

```java
// domain 모듈 테스트 - Spring 없이 순수 단위 테스트
// @SpringBootTest 없음 → 빠름! (밀리초 단위)
class OrderTest {

    @Test
    void 정상_주문_취소() {
        // given
        Order order = createPendingOrder();

        // when
        order.cancel();

        // then
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void 처리중_주문_취소시_예외() {
        // given
        Order order = createProcessingOrder();

        // when & then
        assertThatThrownBy(order::cancel)
            .isInstanceOf(BusinessException.class)
            .satisfies(ex -> {
                BusinessException be = (BusinessException) ex;
                assertThat(be.getErrorCode()).isEqualTo(ErrorCode.ORDER_CANNOT_CANCEL);
            });
    }

    private Order createPendingOrder() {
        // 테스트용 Order 생성 (외부 의존성 없음)
        return Order.create(createUser(), List.of(createOrderItem()));
    }
}

// api 모듈 테스트 - Controller만 테스트
@WebMvcTest(OrderController.class)  // 웹 레이어만 로드
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;  // Service는 Mock으로 대체

    @Test
    void 주문_생성_성공() throws Exception {
        // given
        given(orderService.createOrder(any(), any()))
            .willReturn(createOrder());

        // when & then
        mockMvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"items": [{"productId": 1, "quantity": 2, "price": 5000}]}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists());
    }
}

// infra 모듈 테스트 - DB 레이어만 테스트
@DataJpaTest  // JPA 관련 컴포넌트만 로드 (H2 인메모리 DB)
class OrderRepositoryImplTest {

    @Autowired
    private OrderJpaRepository jpaRepository;

    @Test
    void 사용자별_주문_목록_조회() {
        // given
        jpaRepository.save(createOrder(1L));  // 사용자 1의 주문

        // when
        List<Order> orders = jpaRepository.findByUserIdOrderByCreatedAtDesc(1L);

        // then
        assertThat(orders).hasSize(1);
    }
}
```

---

## 초보자가 자주 하는 실수

**실수 1: domain 모듈에 infra 의존성 추가**

```groovy
// domain/build.gradle
dependencies {
    // 이러면 안 됨! domain이 infra를 알게 됨
    implementation 'org.springframework.kafka:spring-kafka'  // 위험
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'  // 위험

    // domain은 최소 의존성만
    implementation project(':common')
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
}
```

**실수 2: DTO를 domain 모듈에 두기**

```java
// 나쁜 예: domain 모듈에 HTTP 요청/응답 DTO
public class CreateOrderRequest { ... }  // api 모듈의 관심사

// 좋은 예: DTO는 api 모듈에, domain은 Command/내부 DTO 사용
public class CreateOrderCommand {  // domain 내부 커맨드 객체
    private Long userId;
    private List<OrderItemData> items;
}
```
