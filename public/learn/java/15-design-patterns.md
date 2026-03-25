---
title: "디자인 패턴"
order: 15
---

## 디자인 패턴이란

코드를 짜다 보면 비슷한 문제가 반복적으로 나타납니다. 수십 년간 많은 개발자들이 이런 문제들에 대한 **검증된 해결 방법**을 정리했는데, 이것이 디자인 패턴입니다.

1994년 **GoF(Gang of Four)**라 불리는 4명의 저자가 23가지 패턴을 책으로 정리했습니다. 패턴을 외울 필요는 없지만, 이름과 상황을 알아두면 팀원과 소통할 때 "이건 Strategy 패턴으로 해결하면 어떨까요?"처럼 간결하게 말할 수 있습니다.

```
생성 패턴 — 객체를 어떻게 만들까
  Singleton, Builder, Factory Method, Abstract Factory, Prototype

구조 패턴 — 클래스/객체를 어떻게 조합할까
  Adapter, Decorator, Proxy, Composite, Facade

행동 패턴 — 객체 간에 어떻게 소통할까
  Strategy, Observer, Template Method, Command, Iterator
```

---

## 싱글톤 (Singleton) — 인스턴스 하나만

**문제:** 설정 정보, DB 커넥션 풀처럼 하나만 있어야 하는 객체를 여러 곳에서 접근해야 할 때.

**해결:** 인스턴스를 하나만 만들고, 전역에서 그 하나를 공유합니다.

```java
// ✅ Enum 방식 (가장 권장)
enum AppConfig {
    INSTANCE;  // JVM 보장: 딱 한 번만 생성, 스레드 안전

    private final String dbUrl = "jdbc:postgresql://localhost/mydb";
    private final int maxConnections = 20;

    public String getDbUrl() { return dbUrl; }
    public int getMaxConnections() { return maxConnections; }
}

// 어디서든 동일한 인스턴스 접근
String url = AppConfig.INSTANCE.getDbUrl();
```

**Spring 활용:** Spring의 `@Component`, `@Service`, `@Repository`, `@Controller`는 기본적으로 **싱글톤 스코프**로 관리됩니다. 즉, Spring 컨텍스트에서 하나의 인스턴스만 생성하고 재사용합니다.

```java
@Service
public class UserService {  // Spring이 딱 하나의 UserService 인스턴스를 관리
    // ...
}
```

---

## 빌더 (Builder) — 복잡한 객체를 단계별로

**문제:** 생성자에 파라미터가 너무 많거나, 선택적인 파라미터가 많을 때 코드가 읽기 어렵습니다.

```java
// ❌ 파라미터가 너무 많은 생성자 (망원경 패턴)
new User("홍길동", "hong@email.com", null, null, true, 30, "ADMIN", null, "서울");
//        이름      이메일         전화   주소  활성  나이  권한   닉네임  도시
// 어느 파라미터가 어떤 의미인지 알 수가 없다!
```

**해결:** Builder를 통해 의미 있는 이름으로 하나씩 설정합니다.

```java
public class HttpRequest {
    private final String url;       // 필수
    private final String method;    // 선택 (기본값: GET)
    private final Map<String, String> headers;
    private final String body;
    private final int timeoutSeconds;

    // 외부에서 직접 생성 불가 — Builder만 사용
    private HttpRequest(Builder builder) {
        this.url            = builder.url;
        this.method         = builder.method;
        this.headers        = Collections.unmodifiableMap(builder.headers);
        this.body           = builder.body;
        this.timeoutSeconds = builder.timeoutSeconds;
    }

    public static class Builder {
        private final String url;           // 필수
        private String method = "GET";      // 기본값
        private Map<String, String> headers = new HashMap<>();
        private String body;
        private int timeoutSeconds = 30;    // 기본값

        public Builder(String url) {        // 필수값은 생성자로
            this.url = url;
        }

        // 각 메서드는 this를 반환 → 메서드 체이닝 가능
        public Builder method(String method)  { this.method = method;       return this; }
        public Builder header(String k, String v) { headers.put(k, v);     return this; }
        public Builder body(String body)      { this.body = body;           return this; }
        public Builder timeout(int seconds)   { this.timeoutSeconds = seconds; return this; }

        public HttpRequest build() {
            if (url == null || url.isBlank()) {
                throw new IllegalStateException("URL은 필수입니다.");
            }
            return new HttpRequest(this);
        }
    }

    // Getter들
    public String getUrl()     { return url; }
    public String getMethod()  { return method; }
}

// 사용 — 어떤 설정인지 명확히 보임
HttpRequest request = new HttpRequest.Builder("https://api.example.com/users")
    .method("POST")
    .header("Content-Type", "application/json")
    .header("Authorization", "Bearer " + token)
    .body("{\"name\": \"홍길동\"}")
    .timeout(10)
    .build();
```

**Lombok 활용:** 실무에서는 Lombok의 `@Builder`를 많이 씁니다.

```java
@Builder
@Getter
public class User {
    private final Long id;
    private final String name;
    private final String email;
    @Builder.Default
    private final boolean active = true;  // 기본값
}

// 사용
User user = User.builder()
    .id(1L)
    .name("홍길동")
    .email("hong@example.com")
    .build();  // active는 true (기본값)
```

---

## 팩토리 메서드 (Factory Method) — 객체 생성 위임

**문제:** 어떤 클래스의 인스턴스를 만들어야 할지 런타임에 결정해야 할 때.

```java
// 알림 방식이 이메일, SMS, 슬랙 중 어느 것인지 런타임에 결정됨
interface Notification {
    void send(String recipient, String message);
}

class EmailNotification implements Notification {
    @Override
    public void send(String recipient, String message) {
        System.out.println("이메일 발송 → " + recipient + ": " + message);
    }
}

class SmsNotification implements Notification {
    @Override
    public void send(String recipient, String message) {
        System.out.println("SMS 발송 → " + recipient + ": " + message);
    }
}

class SlackNotification implements Notification {
    @Override
    public void send(String recipient, String message) {
        System.out.println("슬랙 발송 → " + recipient + ": " + message);
    }
}

// 팩토리 — 어떤 구현체를 만들지 결정
class NotificationFactory {

    public static Notification create(String type) {
        return switch (type.toLowerCase()) {
            case "email" -> new EmailNotification();
            case "sms"   -> new SmsNotification();
            case "slack" -> new SlackNotification();
            default -> throw new IllegalArgumentException("지원하지 않는 알림 타입: " + type);
        };
    }
}

// 사용 — 타입 이름만 바꾸면 다른 알림 방식 사용
String notifType = getNotificationTypeFromConfig();  // "email" 또는 "sms" 또는 "slack"
Notification notification = NotificationFactory.create(notifType);
notification.send("hong@example.com", "주문이 완료됐습니다.");
```

---

## 전략 (Strategy) — 알고리즘 교체

**문제:** 같은 작업인데 알고리즘(방법)을 런타임에 바꾸고 싶을 때.

실생활 비유: 길 찾기 앱에서 "자동차", "대중교통", "걷기" 중 어떤 경로 전략을 쓸지 선택하는 것처럼.

```java
// 결제 전략 인터페이스
interface PaymentStrategy {
    void pay(long amount);
}

// 구체적인 전략들
class CreditCardPayment implements PaymentStrategy {
    private final String cardNumber;
    CreditCardPayment(String cardNumber) { this.cardNumber = cardNumber; }

    @Override
    public void pay(long amount) {
        System.out.println("신용카드(" + cardNumber.substring(12) + ")로 " + amount + "원 결제");
    }
}

class KakaoPayPayment implements PaymentStrategy {
    @Override
    public void pay(long amount) {
        System.out.println("카카오페이로 " + amount + "원 결제");
    }
}

class BankTransferPayment implements PaymentStrategy {
    private final String accountNumber;
    BankTransferPayment(String accountNumber) { this.accountNumber = accountNumber; }

    @Override
    public void pay(long amount) {
        System.out.println("계좌이체(" + accountNumber + ")로 " + amount + "원 결제");
    }
}

// 전략을 사용하는 컨텍스트
class ShoppingCart {
    private PaymentStrategy paymentStrategy;  // 전략을 담는 변수

    public void setPaymentStrategy(PaymentStrategy strategy) {
        this.paymentStrategy = strategy;  // 전략 교체!
    }

    public void checkout(long totalAmount) {
        if (paymentStrategy == null) {
            throw new IllegalStateException("결제 방법을 선택해주세요.");
        }
        paymentStrategy.pay(totalAmount);  // 어떤 전략인지 몰라도 됨
    }
}

// 사용
ShoppingCart cart = new ShoppingCart();

// 사용자가 결제 방식 선택
cart.setPaymentStrategy(new KakaoPayPayment());
cart.checkout(50_000);  // 카카오페이로 50000원 결제

cart.setPaymentStrategy(new CreditCardPayment("1234-5678-9012-3456"));
cart.checkout(30_000);  // 신용카드로 30000원 결제

// 람다로 간단하게 (함수형 인터페이스)
cart.setPaymentStrategy(amount -> System.out.println("포인트로 " + amount + "원 결제"));
cart.checkout(10_000);  // 포인트로 10000원 결제
```

**Java 기본 활용:** `Comparator`가 대표적인 전략 패턴입니다.

```java
List<User> users = new ArrayList<>(/* ... */);

// 이름 순 정렬 전략
users.sort(Comparator.comparing(User::getName));

// 나이 내림차순 전략
users.sort(Comparator.comparing(User::getAge).reversed());
```

---

## 옵저버 (Observer) — 구독-발행

**문제:** 어떤 이벤트가 발생했을 때 여러 곳에 알려야 할 때.

실생활 비유: 유튜브 채널 구독처럼 — 채널(발행자)에 구독자들이 등록하고, 새 영상(이벤트)이 올라오면 모든 구독자에게 알림이 갑니다.

```java
// 이벤트 (발행할 데이터)
record OrderCreatedEvent(Long orderId, Long userId, long totalAmount) {}

// 구독자 인터페이스
interface OrderEventListener {
    void onOrderCreated(OrderCreatedEvent event);
}

// 이벤트 버스 (구독 관리 + 발행)
class OrderEventBus {
    private final List<OrderEventListener> listeners = new ArrayList<>();

    public void subscribe(OrderEventListener listener) {
        listeners.add(listener);
        System.out.println("구독 등록: " + listener.getClass().getSimpleName());
    }

    public void unsubscribe(OrderEventListener listener) {
        listeners.remove(listener);
    }

    public void publish(OrderCreatedEvent event) {
        System.out.println("이벤트 발행: 주문 #" + event.orderId());
        listeners.forEach(listener -> listener.onOrderCreated(event));
    }
}

// 구독자들
class InventoryHandler implements OrderEventListener {
    @Override
    public void onOrderCreated(OrderCreatedEvent event) {
        System.out.println("재고 감소 처리: 주문 #" + event.orderId());
    }
}

class EmailHandler implements OrderEventListener {
    @Override
    public void onOrderCreated(OrderCreatedEvent event) {
        System.out.println("주문 확인 이메일 발송: 사용자 " + event.userId());
    }
}

class PointHandler implements OrderEventListener {
    @Override
    public void onOrderCreated(OrderCreatedEvent event) {
        long points = event.totalAmount() / 100;
        System.out.println("포인트 " + points + "점 적립: 사용자 " + event.userId());
    }
}

// 사용
OrderEventBus eventBus = new OrderEventBus();
eventBus.subscribe(new InventoryHandler());
eventBus.subscribe(new EmailHandler());
eventBus.subscribe(new PointHandler());

// 주문 생성 시
eventBus.publish(new OrderCreatedEvent(1001L, 42L, 50_000L));
// 이벤트 발행: 주문 #1001
// 재고 감소 처리: 주문 #1001
// 주문 확인 이메일 발송: 사용자 42
// 포인트 500점 적립: 사용자 42
```

---

## 템플릿 메서드 (Template Method) — 알고리즘 골격 정의

**문제:** 처리 흐름(골격)은 같은데 세부 단계가 다를 때.

실생활 비유: 라면 끓이기 — "물 끓이기 → 면 넣기 → 스프 넣기 → 완성" 순서는 같지만, 어떤 면과 스프를 쓰는지는 다릅니다.

```java
abstract class DataExporter {

    // 템플릿 메서드 — 전체 흐름을 정의 (final로 자식이 바꾸지 못하게)
    public final void export(String filePath) {
        System.out.println("=== 내보내기 시작: " + filePath + " ===");
        List<Object> data = fetchData();          // 1. 데이터 읽기
        List<Object> processed = processData(data); // 2. 데이터 가공
        String formatted = format(processed);      // 3. 형식 변환
        write(formatted, filePath);               // 4. 파일 쓰기
        System.out.println("=== 완료 ===");
    }

    // 하위 클래스가 구현해야 하는 메서드
    protected abstract List<Object> fetchData();
    protected abstract String format(List<Object> data);

    // 기본 구현 제공 (하위 클래스가 필요하면 오버라이드)
    protected List<Object> processData(List<Object> data) {
        return data;  // 기본: 그대로 반환
    }

    protected void write(String content, String path) {
        System.out.println("파일 저장: " + path + " (" + content.length() + "자)");
    }
}

// CSV 내보내기
class CsvExporter extends DataExporter {

    @Override
    protected List<Object> fetchData() {
        System.out.println("DB에서 데이터 조회");
        return List.of("홍길동,30,서울", "김영희,25,부산");  // 예시
    }

    @Override
    protected String format(List<Object> data) {
        return "이름,나이,도시\n" + String.join("\n", data.stream().map(Object::toString).toList());
    }
}

// JSON 내보내기
class JsonExporter extends DataExporter {

    @Override
    protected List<Object> fetchData() {
        System.out.println("Redis 캐시에서 데이터 조회");
        return List.of("{\"name\":\"홍길동\"}", "{\"name\":\"김영희\"}");
    }

    @Override
    protected String format(List<Object> data) {
        return "[" + String.join(",", data.stream().map(Object::toString).toList()) + "]";
    }
}

// 사용
new CsvExporter().export("report.csv");
new JsonExporter().export("data.json");
```

---

## 데코레이터 (Decorator) — 기능을 감싸서 확장

**문제:** 기존 클래스를 수정하지 않고 새 기능을 추가하고 싶을 때. 상속보다 유연합니다.

실생활 비유: 커피에 시럽을 추가하고, 거기에 또 휘핑크림을 추가하는 것처럼 — 기본 커피는 그대로이고 데코레이터(시럽, 크림)가 위에 쌓입니다.

```java
// 기본 인터페이스
interface TextProcessor {
    String process(String text);
}

// 기본 구현
class PlainTextProcessor implements TextProcessor {
    @Override
    public String process(String text) {
        return text;
    }
}

// 데코레이터 — 기존 기능을 감싸서 새 기능 추가
class TrimDecorator implements TextProcessor {
    private final TextProcessor wrapped;

    TrimDecorator(TextProcessor processor) {
        this.wrapped = processor;
    }

    @Override
    public String process(String text) {
        return wrapped.process(text).strip();  // 앞뒤 공백 제거 후 위임
    }
}

class UpperCaseDecorator implements TextProcessor {
    private final TextProcessor wrapped;

    UpperCaseDecorator(TextProcessor processor) {
        this.wrapped = processor;
    }

    @Override
    public String process(String text) {
        return wrapped.process(text).toUpperCase();  // 대문자 변환 후 위임
    }
}

class HtmlEscapeDecorator implements TextProcessor {
    private final TextProcessor wrapped;

    HtmlEscapeDecorator(TextProcessor processor) {
        this.wrapped = processor;
    }

    @Override
    public String process(String text) {
        // HTML 특수문자 이스케이프
        return wrapped.process(text)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;");
    }
}

// 조합! (안쪽부터 처리: TrimDecorator → HtmlEscapeDecorator → UpperCaseDecorator)
TextProcessor processor = new UpperCaseDecorator(
    new HtmlEscapeDecorator(
        new TrimDecorator(new PlainTextProcessor())
    )
);

System.out.println(processor.process("  <hello> world  "));
// 1. TrimDecorator: "  <hello> world  " → "<hello> world"
// 2. HtmlEscapeDecorator: "<hello> world" → "&lt;hello&gt; world"
// 3. UpperCaseDecorator: "&LT;HELLO&GT; WORLD"
```

**Java I/O가 대표적인 데코레이터 패턴:**
```java
// 파일 읽기 → 버퍼링 적용 → 문자 변환 순으로 데코레이터가 쌓임
BufferedReader reader = new BufferedReader(
    new InputStreamReader(
        new FileInputStream("data.txt"), StandardCharsets.UTF_8
    )
);
```

---

## 프록시 (Proxy) — 대리인 패턴

**문제:** 실제 객체에 대한 접근을 제어하거나, 접근 전후에 부가 처리를 하고 싶을 때.

실생활 비유: 연예인 매니저처럼 — 팬들이 연예인에게 직접 연락하는 대신 매니저(프록시)를 통합니다. 매니저는 스케줄 확인 후 요청을 전달하거나 거절합니다.

```java
interface UserService {
    User findById(Long id);
    void save(User user);
}

// 실제 구현
class UserServiceImpl implements UserService {

    @Override
    public User findById(Long id) {
        System.out.println("DB 조회: " + id);
        return new User(id, "홍길동");
    }

    @Override
    public void save(User user) {
        System.out.println("DB 저장: " + user.getName());
    }
}

// 캐싱 프록시 — 실제 서비스와 동일한 인터페이스 구현
class CachingUserServiceProxy implements UserService {
    private final UserService target;            // 실제 서비스 (위임 대상)
    private final Map<Long, User> cache = new HashMap<>();

    CachingUserServiceProxy(UserService target) {
        this.target = target;
    }

    @Override
    public User findById(Long id) {
        if (cache.containsKey(id)) {
            System.out.println("캐시 히트: " + id);
            return cache.get(id);  // 캐시에 있으면 바로 반환
        }

        User user = target.findById(id);  // 없으면 실제 서비스에 위임
        cache.put(id, user);              // 결과를 캐시에 저장
        return user;
    }

    @Override
    public void save(User user) {
        target.save(user);           // 저장은 실제 서비스에 위임
        cache.remove(user.getId());  // 저장 후 캐시 무효화
    }
}

// 사용
UserService service = new CachingUserServiceProxy(new UserServiceImpl());
service.findById(1L);  // DB 조회: 1 (캐시 미스)
service.findById(1L);  // 캐시 히트: 1 (DB 조회 없음!)
service.findById(2L);  // DB 조회: 2
```

**Spring의 프록시 활용:**
- `@Transactional` → 트랜잭션 관리 프록시
- `@Cacheable` → 캐싱 프록시
- `@Async` → 비동기 실행 프록시

---

## 어댑터 (Adapter) — 호환 안 되는 인터페이스 연결

**문제:** 기존 코드를 새 인터페이스에 맞게 사용해야 할 때.

실생활 비유: 해외 여행 시 사용하는 전압 어댑터처럼 — 콘센트 모양이 다르지만 어댑터로 맞춥니다.

```java
// 레거시 결제 시스템 (바꿀 수 없는 코드)
class LegacyPaymentGateway {
    public boolean makePayment(String cardNo, double amount, String currency) {
        System.out.printf("결제 처리: 카드 %s, 금액 %.2f %s%n", cardNo, amount, currency);
        return true;  // 성공
    }
}

// 새로운 표준 인터페이스
interface PaymentService {
    PaymentResult pay(PaymentRequest request);
}

record PaymentRequest(String cardNumber, long amountInWon) {}
record PaymentResult(boolean success, String message) {}

// 어댑터 — 레거시 코드를 새 인터페이스에 맞게 감쌈
class LegacyPaymentAdapter implements PaymentService {

    private final LegacyPaymentGateway legacyGateway;

    LegacyPaymentAdapter(LegacyPaymentGateway gateway) {
        this.legacyGateway = gateway;
    }

    @Override
    public PaymentResult pay(PaymentRequest request) {
        // 인터페이스 변환: 원(Long) → 달러(double), "KRW" 추가
        double amountInDollar = request.amountInWon() / 1300.0;
        boolean success = legacyGateway.makePayment(
            request.cardNumber(), amountInDollar, "USD"
        );
        return new PaymentResult(success, success ? "결제 성공" : "결제 실패");
    }
}

// 사용 — 새 인터페이스를 통해 레거시 코드 사용
PaymentService service = new LegacyPaymentAdapter(new LegacyPaymentGateway());
PaymentResult result = service.pay(new PaymentRequest("1234-5678-9012", 50_000L));
System.out.println(result.message());  // 결제 성공
```

---

## Spring에서 패턴 찾기

Spring Framework는 이 패턴들로 가득합니다.

| Spring 기능 | 디자인 패턴 |
|-------------|------------|
| `@Component` 싱글톤 빈 | 싱글톤 |
| `@Builder` (Lombok) | 빌더 |
| `BeanFactory`, `ApplicationContext` | 팩토리 |
| `@Transactional`, `@Cacheable` | 프록시 |
| `ApplicationEventPublisher` | 옵저버 |
| `JdbcTemplate`, `RestTemplate` | 템플릿 메서드 |
| `HandlerInterceptor`, `Filter` | 데코레이터/체인 |
| `RestTemplate` ↔ `WebClient` 어댑터 | 어댑터 |

패턴을 직접 만들 일은 많지 않지만, Spring이 내부적으로 어떻게 동작하는지 이해하는 데 필수적인 지식입니다.
