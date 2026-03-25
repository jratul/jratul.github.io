---
title: "의존성 주입 심화"
order: 6
---

## 의존성 주입(DI) 다시 살펴보기

1단원에서 DI를 소개했는데, 이번에는 더 깊이 파고들겠습니다. DI를 "레고 조립"에 비유해 봅시다.

레고 성을 만들 때, 문(door)이 필요한데 직접 만들지 않고 레고 박스에서 꺼내서 씁니다. Spring의 IoC 컨테이너가 그 "레고 박스" 역할을 합니다. 필요한 부품(Bean)을 요청하면 컨테이너가 만들어서 넣어줍니다.

---

## Bean 등록 방식 세 가지

### 방법 1: 컴포넌트 스캔 (가장 흔함)

```java
// @Service, @Repository, @Controller, @Component 중 하나를 붙이면
// Spring이 자동으로 찾아서 Bean으로 등록
@Service
public class UserService {
    // Spring이 "UserService Bean을 만들어야겠다" 하고 자동 등록
}

@Repository
public interface UserRepository extends JpaRepository<User, Long> {}

@Component
public class EmailSender {
    // @Service/@Repository가 아닌 일반적인 Bean
}
```

### 방법 2: @Configuration + @Bean (명시적 등록)

외부 라이브러리 클래스처럼 내가 직접 어노테이션을 붙일 수 없는 경우에 사용:

```java
@Configuration  // "이 클래스는 설정 클래스예요"
public class AppConfig {

    // PasswordEncoder는 외부 라이브러리 클래스 → 직접 @Component 못 붙임
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();  // 이 인스턴스를 Bean으로 등록
    }

    // RestTemplate도 외부 클래스이므로 @Bean으로 등록
    @Bean
    public RestTemplate restTemplate() {
        RestTemplate rt = new RestTemplate();
        // 타임아웃 등 커스텀 설정 가능
        rt.setRequestFactory(new HttpComponentsClientHttpRequestFactory());
        return rt;
    }

    // @Bean 메서드끼리 서로 참조 가능 (Spring이 한 번만 만들어줌)
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());  // LocalDateTime 지원
        return mapper;
    }
}
```

### 방법 3: 조건부 등록 (@Conditional)

특정 조건이 맞을 때만 Bean을 등록합니다:

```java
@Configuration
public class FeatureConfig {

    // application.yml에 feature.email.enabled=true가 있을 때만 등록
    @Bean
    @ConditionalOnProperty(name = "feature.email.enabled", havingValue = "true")
    public EmailService emailService() {
        return new EmailService();
    }

    // AWS SDK가 클래스패스에 있을 때만 등록 (의존성 추가 여부에 따라)
    @Bean
    @ConditionalOnClass(name = "software.amazon.awssdk.services.s3.S3Client")
    public S3FileStorage s3FileStorage() {
        return new S3FileStorage();
    }

    // 특정 Bean이 이미 있으면 등록 안 함
    @Bean
    @ConditionalOnMissingBean(CacheManager.class)
    public CacheManager defaultCacheManager() {
        return new ConcurrentMapCacheManager();
    }
}
```

---

## 주입 방식 세 가지 비교

### 1. 생성자 주입 (권장!)

```java
@Service
public class OrderService {

    // final로 선언 → 한 번 설정 후 변경 불가 (불변성 보장)
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    private final InventoryService inventoryService;

    // 생성자가 하나뿐이면 @Autowired 생략 가능 (Spring 4.3+)
    public OrderService(OrderRepository orderRepository,
                        PaymentService paymentService,
                        InventoryService inventoryService) {
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
        this.inventoryService = inventoryService;
    }
}
```

생성자 주입이 왜 권장되나요?

```java
// 테스트할 때 직접 Mock 주입 가능
@Test
void createOrder_success() {
    // 가짜 객체를 직접 생성해서 넣을 수 있음
    OrderRepository mockRepo = mock(OrderRepository.class);
    PaymentService mockPayment = mock(PaymentService.class);
    InventoryService mockInventory = mock(InventoryService.class);

    OrderService service = new OrderService(mockRepo, mockPayment, mockInventory);
    // Spring 없이도 테스트 가능!
}
```

### 2. 필드 주입 (비권장)

```java
@Service
public class OrderService {

    @Autowired                          // 필드에 직접 주입
    private OrderRepository orderRepository;  // final 불가

    // 문제점 1: Spring 없이 테스트 불가 (new OrderService()하면 null)
    // 문제점 2: final 사용 불가 → 나중에 다른 값으로 변경될 수 있음
    // 문제점 3: 순환 의존성을 컴파일 타임에 감지 못함
}
```

### 3. Setter 주입 (선택적 의존성에만)

```java
@Service
public class NotificationService {

    // 알림 서비스는 있어도 되고 없어도 됨 (선택적)
    private PushNotificationProvider pushProvider;

    @Autowired(required = false)  // 없어도 오류 안 남
    public void setPushProvider(PushNotificationProvider pushProvider) {
        this.pushProvider = pushProvider;
    }

    public void notify(String message) {
        if (pushProvider != null) {
            pushProvider.send(message);
        }
        // 없어도 동작은 함
    }
}
```

---

## @Primary와 @Qualifier — 같은 타입이 여러 개일 때

결제 수단이 카카오페이, 네이버페이 두 가지가 있다면?

```java
// 결제 인터페이스
public interface PaymentGateway {
    PaymentResult pay(long amount, String orderId);
}

// 구현체 1: 카카오페이
@Component
@Primary  // 기본으로 사용할 Bean (우선순위)
public class KakaoPayGateway implements PaymentGateway {
    @Override
    public PaymentResult pay(long amount, String orderId) {
        log.info("카카오페이로 결제: {}", amount);
        // 카카오페이 API 호출...
        return PaymentResult.success(orderId);
    }
}

// 구현체 2: 네이버페이
@Component("naverPay")  // Bean 이름을 명시적으로 지정
public class NaverPayGateway implements PaymentGateway {
    @Override
    public PaymentResult pay(long amount, String orderId) {
        log.info("네이버페이로 결제: {}", amount);
        return PaymentResult.success(orderId);
    }
}

// 사용하는 쪽
@Service
public class CheckoutService {

    private final PaymentGateway defaultGateway;  // @Primary인 KakaoPay가 주입됨
    private final PaymentGateway naverPayGateway;  // @Qualifier로 특정

    public CheckoutService(
            PaymentGateway defaultGateway,
            @Qualifier("naverPay") PaymentGateway naverPayGateway) {
        this.defaultGateway = defaultGateway;
        this.naverPayGateway = naverPayGateway;
    }

    public PaymentResult checkout(Order order, String paymentMethod) {
        PaymentGateway gateway = "NAVER".equals(paymentMethod)
            ? naverPayGateway
            : defaultGateway;

        return gateway.pay(order.getTotalAmount(), order.getId().toString());
    }
}
```

---

## Bean Scope — Bean이 얼마나 살아있을까?

```java
// 기본값: singleton — 앱 전체에서 인스턴스가 딱 1개
// 모든 요청이 같은 객체를 공유 → 상태(필드)를 저장하면 안 됨!
@Service
public class UserService {
    // singleton이므로 여기에 상태를 저장하면 멀티스레드 위험
    // private User currentUser; ← 절대 안 됨
}

// prototype — 주입할 때마다 새 인스턴스 생성
@Component
@Scope("prototype")
public class ReportGenerator {
    // 각 요청마다 독립적인 상태가 필요할 때
    private List<String> reportLines = new ArrayList<>();  // 각자 다른 리스트

    public void addLine(String line) {
        reportLines.add(line);
    }
}

// request — HTTP 요청 하나당 인스턴스 1개 (웹 앱)
@Component
@Scope(value = WebApplicationContext.SCOPE_REQUEST,
       proxyMode = ScopedProxyMode.TARGET_CLASS)  // 프록시 필요!
public class RequestContext {
    private String traceId = UUID.randomUUID().toString();  // 요청별 고유 ID

    public String getTraceId() { return traceId; }
}
```

### Singleton 안에 Prototype Bean을 주입할 때 주의

```java
// 문제 상황
@Service  // singleton
public class OrderProcessor {

    @Autowired
    private CartItem cartItem;  // prototype이지만...

    public void process() {
        // 문제: singleton이 만들어질 때 한 번만 주입됨
        // 이후에는 항상 같은 cartItem 인스턴스 반환!
        cartItem.clear();
    }
}

// 해결: ApplicationContext에서 직접 꺼내기
@Service
public class OrderProcessor {

    private final ApplicationContext ctx;

    public OrderProcessor(ApplicationContext ctx) {
        this.ctx = ctx;
    }

    public void process() {
        CartItem freshCart = ctx.getBean(CartItem.class);  // 매번 새 인스턴스
        freshCart.clear();
    }
}
```

---

## Bean 생명주기

Bean이 만들어지고 사라지는 과정:

```
1. 생성자 호출
2. 의존성 주입 (setter, @Autowired)
3. @PostConstruct 실행 (초기화)
4. (사용)
5. @PreDestroy 실행 (정리)
6. 소멸
```

```java
@Component
public class DatabaseConnectionPool {

    private List<Connection> pool;
    private final DataSource dataSource;

    public DatabaseConnectionPool(DataSource dataSource) {
        this.dataSource = dataSource;
        // 이 시점에는 dataSource가 아직 주입 안 됐을 수도 있음
        // (생성자 주입이면 괜찮지만, 필드 주입이면 null일 수 있음)
    }

    // Bean 생성 완료 후 실행 (의존성 주입 완료 후)
    @PostConstruct
    public void initializePool() {
        log.info("커넥션 풀 초기화 시작");
        pool = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            pool.add(dataSource.getConnection());
        }
        log.info("커넥션 풀 초기화 완료: {}개", pool.size());
    }

    // 앱 종료 직전 실행 (자원 정리)
    @PreDestroy
    public void closePool() {
        log.info("커넥션 풀 정리");
        pool.forEach(conn -> {
            try { conn.close(); }
            catch (Exception e) { log.error("커넥션 닫기 실패", e); }
        });
    }
}
```

---

## @Profile — 환경별로 다른 Bean

```java
@Configuration
public class StorageConfig {

    // 개발 환경: 로컬 파일 시스템에 저장
    @Bean
    @Profile("dev")
    public FileStorage localFileStorage() {
        return new LocalFileStorage("/tmp/uploads");
    }

    // 운영 환경: S3에 저장
    @Bean
    @Profile("prod")
    public FileStorage s3FileStorage() {
        return new S3FileStorage("my-bucket");
    }

    // 테스트가 아닐 때 (부정 조건)
    @Bean
    @Profile("!test")
    public EmailSender realEmailSender() {
        return new SmtpEmailSender();
    }

    // 여러 Profile 조합
    @Bean
    @Profile({"dev", "test"})  // dev 또는 test일 때
    public EmailSender fakeEmailSender() {
        return new FakeEmailSender();  // 실제로 발송하지 않는 가짜 구현체
    }
}
```

테스트에서 Profile 지정:

```java
@SpringBootTest
@ActiveProfiles("test")  // test Profile 활성화
class UserServiceTest {

    @Autowired
    private FileStorage fileStorage;  // FakeFileStorage가 주입됨

    @Autowired
    private EmailSender emailSender;  // FakeEmailSender가 주입됨
}
```

---

## 순환 의존성 문제

A → B → A 형태의 순환 의존성이 생기면 Spring Boot 2.6+에서는 오류가 납니다:

```
에러 메시지:
BeanCurrentlyInCreationException:
  Error creating bean 'serviceA': Requested bean is currently in creation:
  Is there an unresolvable circular reference?
```

```java
// ❌ 순환 의존성 예
@Service
public class ServiceA {
    private final ServiceB serviceB;
    public ServiceA(ServiceB serviceB) { this.serviceB = serviceB; }
}

@Service
public class ServiceB {
    private final ServiceA serviceA;  // A가 B를 필요로 하는데, B도 A를 필요로 함!
    public ServiceB(ServiceA serviceA) { this.serviceA = serviceA; }
}
```

해결 방법:

```java
// 방법 1: 설계 개선 (가장 좋음) — 공통 기능을 별도 Service로 추출
@Service
public class CommonService {
    // A와 B가 공통으로 필요한 기능
}

@Service
public class ServiceA {
    private final CommonService commonService;  // A → Common
}

@Service
public class ServiceB {
    private final CommonService commonService;  // B → Common
}

// 방법 2: @Lazy — 실제 사용 시점에 주입 (임시방편)
@Service
public class ServiceA {
    @Lazy  // ServiceB를 실제로 사용할 때 주입
    private final ServiceB serviceB;

    public ServiceA(@Lazy ServiceB serviceB) {
        this.serviceB = serviceB;
    }
}
```

순환 의존성이 생기면 설계가 잘못됐다는 신호입니다. `@Lazy`로 숨기지 말고 설계를 재검토해야 합니다.

---

## 실전 예제 — 결제 전략 패턴

여러 결제 방식을 동적으로 선택하는 패턴:

```java
// 전략 인터페이스
public interface PaymentStrategy {
    String getType();  // "KAKAO", "NAVER", "CARD" 등
    PaymentResult execute(PaymentRequest request);
}

// 각 결제 수단 구현
@Component
public class KakaoPayStrategy implements PaymentStrategy {
    @Override
    public String getType() { return "KAKAO"; }

    @Override
    public PaymentResult execute(PaymentRequest request) {
        // 카카오페이 API 호출
        return PaymentResult.success(request.getOrderId());
    }
}

@Component
public class NaverPayStrategy implements PaymentStrategy {
    @Override
    public String getType() { return "NAVER"; }

    @Override
    public PaymentResult execute(PaymentRequest request) {
        return PaymentResult.success(request.getOrderId());
    }
}

// PaymentStrategy Bean을 모두 모아서 관리
@Service
public class PaymentService {

    // Spring이 PaymentStrategy 타입의 모든 Bean을 List에 자동 주입!
    private final Map<String, PaymentStrategy> strategies;

    public PaymentService(List<PaymentStrategy> strategyList) {
        // 타입 → 전략 매핑 Map 생성
        this.strategies = strategyList.stream()
            .collect(Collectors.toMap(PaymentStrategy::getType, s -> s));
    }

    public PaymentResult pay(String paymentType, PaymentRequest request) {
        PaymentStrategy strategy = strategies.get(paymentType);
        if (strategy == null) {
            throw new IllegalArgumentException("지원하지 않는 결제 수단: " + paymentType);
        }
        return strategy.execute(request);
    }
}
```

새로운 결제 수단을 추가할 때 `PaymentService` 코드를 수정할 필요가 없습니다. `PaymentStrategy`를 구현하는 새 Bean만 만들면 됩니다. 이게 개방-폐쇄 원칙(OCP)입니다.
