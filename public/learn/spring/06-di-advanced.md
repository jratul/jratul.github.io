---
title: "의존성 주입 심화"
order: 6
---

## Bean 등록 방식

Spring은 여러 방법으로 Bean을 등록합니다.

```java
// 1. 컴포넌트 스캔 (가장 흔한 방식)
@Service
public class UserService { ... }

@Repository
public class UserRepository { ... }

@Component
public class EmailSender { ... }

// 2. @Configuration + @Bean (명시적 등록)
@Configuration
public class AppConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}

// 3. 조건부 등록
@Bean
@ConditionalOnProperty(name = "feature.email.enabled", havingValue = "true")
public EmailService emailService() {
    return new EmailService();
}
```

---

## 주입 방식 비교

```java
// 1. 생성자 주입 (권장)
@Service
public class OrderService {

    private final UserRepository userRepository;
    private final PaymentService paymentService;

    // @Autowired 생략 가능 (생성자 하나일 때)
    public OrderService(UserRepository userRepository,
                        PaymentService paymentService) {
        this.userRepository = userRepository;
        this.paymentService = paymentService;
    }
}

// 2. 필드 주입 (테스트하기 어려워 비권장)
@Service
public class OrderService {
    @Autowired
    private UserRepository userRepository;  // final 불가, NPE 위험
}

// 3. setter 주입 (선택적 의존성에만 사용)
@Service
public class OrderService {
    private NotificationService notificationService;

    @Autowired(required = false)
    public void setNotificationService(NotificationService svc) {
        this.notificationService = svc;
    }
}
```

생성자 주입을 써야 하는 이유:
- `final` 필드로 불변성 보장
- 순환 의존성 컴파일 타임 감지
- 테스트에서 Mock 주입 쉬움

---

## @Primary와 @Qualifier

같은 타입의 Bean이 여러 개 있을 때 우선순위를 지정합니다.

```java
public interface PaymentGateway {
    void pay(long amount);
}

@Component
@Primary  // 기본으로 주입될 Bean
public class KakaoPayGateway implements PaymentGateway {
    @Override
    public void pay(long amount) { ... }
}

@Component
public class NaverPayGateway implements PaymentGateway {
    @Override
    public void pay(long amount) { ... }
}

// 사용
@Service
public class CheckoutService {

    private final PaymentGateway defaultGateway;     // KakaoPay 주입
    private final PaymentGateway naverPayGateway;    // @Qualifier로 지정

    public CheckoutService(
            PaymentGateway defaultGateway,
            @Qualifier("naverPayGateway") PaymentGateway naverPayGateway) {
        this.defaultGateway = defaultGateway;
        this.naverPayGateway = naverPayGateway;
    }
}
```

직접 이름 지정:

```java
@Component("kakao")
public class KakaoPayGateway implements PaymentGateway { ... }

// 주입 시
@Qualifier("kakao")
private PaymentGateway paymentGateway;
```

---

## Bean Scope

```java
// 기본값: singleton (애플리케이션 전체에 인스턴스 1개)
@Service
public class UserService { ... }

// prototype: 주입될 때마다 새 인스턴스 생성
@Component
@Scope("prototype")
public class ShoppingCart { ... }

// request: HTTP 요청 하나당 새 인스턴스 (웹 애플리케이션)
@Component
@Scope(value = WebApplicationContext.SCOPE_REQUEST,
       proxyMode = ScopedProxyMode.TARGET_CLASS)
public class RequestContext { ... }

// session: HTTP 세션 하나당 새 인스턴스
@Component
@Scope(value = WebApplicationContext.SCOPE_SESSION,
       proxyMode = ScopedProxyMode.TARGET_CLASS)
public class UserSession { ... }
```

singleton에 prototype Bean 주입할 때 문제:

```java
@Service
public class SingletonService {

    // 문제: singleton이 초기화될 때 prototype이 한 번만 생성됨
    @Autowired
    private PrototypeBean prototypeBean;  // 항상 같은 인스턴스 반환

    // 해결: ApplicationContext에서 직접 꺼내기
    @Autowired
    private ApplicationContext ctx;

    public void doWork() {
        PrototypeBean fresh = ctx.getBean(PrototypeBean.class);  // 매번 새 인스턴스
        fresh.process();
    }
}
```

---

## Bean 생명주기

```java
@Component
public class DatabaseConnection {

    private Connection connection;

    // 생성자 주입 이후 초기화
    @PostConstruct
    public void init() {
        connection = createConnection();
        System.out.println("DB 연결 완료");
    }

    // 애플리케이션 종료 직전 정리
    @PreDestroy
    public void cleanup() {
        connection.close();
        System.out.println("DB 연결 종료");
    }
}

// @Bean 방식
@Bean(initMethod = "start", destroyMethod = "stop")
public CacheManager cacheManager() {
    return new RedisCacheManager();
}
```

초기화 순서:
1. 생성자 호출
2. 의존성 주입 (`@Autowired`)
3. `@PostConstruct`
4. (사용)
5. `@PreDestroy`
6. 소멸

---

## @Profile

환경별로 다른 Bean을 활성화합니다.

```java
// application.yml
// spring.profiles.active: dev

@Configuration
public class DataSourceConfig {

    @Bean
    @Profile("dev")
    public DataSource devDataSource() {
        return new EmbeddedDatabaseBuilder()
            .setType(EmbeddedDatabaseType.H2)
            .build();
    }

    @Bean
    @Profile("prod")
    public DataSource prodDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://localhost/mydb");
        return new HikariDataSource(config);
    }
}

// 특정 Profile이 아닐 때
@Component
@Profile("!test")
public class ExternalApiClient { ... }
```

테스트에서:

```java
@SpringBootTest
@ActiveProfiles("test")
class UserServiceTest { ... }
```

---

## @ConfigurationProperties

```yaml
# application.yml
app:
  mail:
    host: smtp.gmail.com
    port: 587
    username: admin@example.com
    retry-count: 3
```

```java
@ConfigurationProperties(prefix = "app.mail")
@Component
public class MailProperties {
    private String host;
    private int port;
    private String username;
    private int retryCount;  // kebab-case → camelCase 자동 변환

    // getters, setters
}

// 사용
@Service
public class MailService {

    private final MailProperties props;

    public MailService(MailProperties props) {
        this.props = props;
    }

    public void send(String to, String subject) {
        System.out.println("Sending via " + props.getHost() + ":" + props.getPort());
    }
}
```

유효성 검사:

```java
@ConfigurationProperties(prefix = "app.mail")
@Validated
public class MailProperties {
    @NotBlank
    private String host;

    @Min(1) @Max(65535)
    private int port;
}
```

---

## 순환 의존성

A → B → A 형태의 순환 의존성은 Spring Boot 2.6부터 기본 차단됩니다.

```
BeanCurrentlyInCreationException:
  Error creating bean 'serviceA':
  Requested bean is currently in creation: Is there an unresolvable circular reference?
```

해결 방법:

```java
// 1. 설계 수정 (가장 좋은 방법)
//    공통 의존성을 별도 Bean으로 추출

// 2. @Lazy: 실제 사용 시점에 주입 (임시방편)
@Service
public class ServiceA {
    @Lazy
    @Autowired
    private ServiceB serviceB;
}

// 3. setter 주입으로 변경
@Service
public class ServiceA {
    private ServiceB serviceB;

    @Autowired
    public void setServiceB(ServiceB serviceB) {
        this.serviceB = serviceB;
    }
}
```

순환 의존성이 생기면 책임 분리가 잘못된 신호이므로 설계 재검토를 먼저 합니다.
