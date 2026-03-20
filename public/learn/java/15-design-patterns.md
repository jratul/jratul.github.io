---
title: "디자인 패턴"
order: 15
---

## 디자인 패턴이란

반복적으로 나타나는 설계 문제에 대한 검증된 해결책입니다. GoF(Gang of Four)가 정리한 23가지 패턴 중 실무에서 자주 쓰는 것들을 다룹니다.

```
생성 패턴: 객체 생성 방식
  - Singleton, Builder, Factory Method, Abstract Factory, Prototype

구조 패턴: 클래스/객체 조합
  - Adapter, Decorator, Proxy, Composite, Facade

행동 패턴: 객체 간 통신
  - Strategy, Observer, Template Method, Command, Iterator
```

## 싱글톤 (Singleton)

인스턴스를 하나만 만들고 전역에서 접근합니다.

```java
// Enum 방식 (권장)
enum AppConfig {
    INSTANCE;

    private final String dbUrl = "jdbc:postgresql://localhost/mydb";

    public String getDbUrl() { return dbUrl; }
}

AppConfig.INSTANCE.getDbUrl();
```

Spring의 `@Component`, `@Service`, `@Repository`가 기본적으로 싱글톤 스코프입니다.

## 빌더 (Builder)

복잡한 객체를 단계별로 구성합니다.

```java
class HttpRequest {
    private final String url;
    private final String method;
    private final Map<String, String> headers;
    private final String body;
    private final int timeout;

    private HttpRequest(Builder builder) {
        this.url     = builder.url;
        this.method  = builder.method;
        this.headers = builder.headers;
        this.body    = builder.body;
        this.timeout = builder.timeout;
    }

    public static class Builder {
        private final String url;
        private String method = "GET";
        private Map<String, String> headers = new HashMap<>();
        private String body;
        private int timeout = 30;

        public Builder(String url) { this.url = url; }

        public Builder method(String method) { this.method = method; return this; }
        public Builder header(String k, String v) { headers.put(k, v); return this; }
        public Builder body(String body) { this.body = body; return this; }
        public Builder timeout(int seconds) { this.timeout = seconds; return this; }

        public HttpRequest build() {
            if (url == null || url.isBlank()) throw new IllegalStateException("URL 필수");
            return new HttpRequest(this);
        }
    }
}

HttpRequest request = new HttpRequest.Builder("https://api.example.com/users")
    .method("POST")
    .header("Content-Type", "application/json")
    .body("{\"name\": \"Alice\"}")
    .timeout(10)
    .build();
```

Lombok의 `@Builder`가 이 패턴을 자동 생성합니다.

## 팩토리 메서드 (Factory Method)

객체 생성 책임을 서브클래스에 위임합니다.

```java
interface Notification {
    void send(String message);
}

class EmailNotification implements Notification {
    public void send(String message) {
        System.out.println("Email: " + message);
    }
}

class SlackNotification implements Notification {
    public void send(String message) {
        System.out.println("Slack: " + message);
    }
}

// 팩토리
class NotificationFactory {
    public static Notification create(String type) {
        return switch (type) {
            case "email" -> new EmailNotification();
            case "slack" -> new SlackNotification();
            default -> throw new IllegalArgumentException("Unknown type: " + type);
        };
    }
}

Notification n = NotificationFactory.create("email");
n.send("배포 완료");
```

## 전략 (Strategy)

알고리즘을 캡슐화해 런타임에 교체할 수 있습니다.

```java
@FunctionalInterface
interface SortStrategy {
    void sort(int[] arr);
}

class Sorter {
    private SortStrategy strategy;

    public Sorter(SortStrategy strategy) {
        this.strategy = strategy;
    }

    public void setStrategy(SortStrategy strategy) {
        this.strategy = strategy;
    }

    public void sort(int[] arr) {
        strategy.sort(arr);
    }
}

int[] data = {5, 2, 8, 1, 9};

Sorter sorter = new Sorter(arr -> Arrays.sort(arr));  // 기본 정렬
sorter.sort(data);

// 전략 교체
sorter.setStrategy(arr -> {
    // 버블 정렬로 교체
    for (int i = 0; i < arr.length - 1; i++)
        for (int j = 0; j < arr.length - 1 - i; j++)
            if (arr[j] > arr[j+1]) { int t = arr[j]; arr[j] = arr[j+1]; arr[j+1] = t; }
});
```

`Comparator`가 전략 패턴의 대표적인 예입니다.

## 옵저버 (Observer)

상태 변화를 구독자에게 자동으로 알립니다.

```java
interface EventListener<T> {
    void onEvent(T event);
}

class EventBus<T> {
    private final List<EventListener<T>> listeners = new ArrayList<>();

    public void subscribe(EventListener<T> listener) {
        listeners.add(listener);
    }

    public void unsubscribe(EventListener<T> listener) {
        listeners.remove(listener);
    }

    public void publish(T event) {
        listeners.forEach(l -> l.onEvent(event));
    }
}

record OrderCreatedEvent(Long orderId, String userId) {}

EventBus<OrderCreatedEvent> bus = new EventBus<>();

bus.subscribe(event -> System.out.println("이메일 발송: " + event.userId()));
bus.subscribe(event -> System.out.println("포인트 적립: " + event.orderId()));

bus.publish(new OrderCreatedEvent(1L, "alice"));
// 이메일 발송: alice
// 포인트 적립: 1
```

Spring의 `ApplicationEventPublisher`, RxJava, React의 상태 관리가 이 패턴 기반입니다.

## 템플릿 메서드 (Template Method)

알고리즘 골격을 상위 클래스에 정의하고, 세부 구현을 하위 클래스에 맡깁니다.

```java
abstract class DataExporter {
    // 템플릿 메서드 — 전체 흐름 정의
    public final void export(String destination) {
        List<Object> data = fetchData();
        String formatted = format(data);
        write(formatted, destination);
        System.out.println("내보내기 완료: " + destination);
    }

    protected abstract List<Object> fetchData();
    protected abstract String format(List<Object> data);

    // 기본 구현 제공 (오버라이드 가능)
    protected void write(String content, String destination) {
        System.out.println("파일 쓰기: " + destination);
    }
}

class CsvExporter extends DataExporter {
    @Override
    protected List<Object> fetchData() { return List.of("row1", "row2"); }

    @Override
    protected String format(List<Object> data) {
        return data.stream().map(Object::toString).collect(Collectors.joining(","));
    }
}

new CsvExporter().export("report.csv");
```

Spring의 `JdbcTemplate`, `RestTemplate`이 이 패턴을 씁니다.

## 데코레이터 (Decorator)

객체에 기능을 동적으로 추가합니다. 상속 없이 확장합니다.

```java
interface TextProcessor {
    String process(String text);
}

class PlainText implements TextProcessor {
    public String process(String text) { return text; }
}

class UpperCaseDecorator implements TextProcessor {
    private final TextProcessor wrapped;
    UpperCaseDecorator(TextProcessor p) { this.wrapped = p; }
    public String process(String text) { return wrapped.process(text).toUpperCase(); }
}

class TrimDecorator implements TextProcessor {
    private final TextProcessor wrapped;
    TrimDecorator(TextProcessor p) { this.wrapped = p; }
    public String process(String text) { return wrapped.process(text).trim(); }
}

TextProcessor processor = new UpperCaseDecorator(new TrimDecorator(new PlainText()));
System.out.println(processor.process("  hello world  "));
// HELLO WORLD

// Java I/O가 대표적인 데코레이터 패턴
new BufferedReader(new InputStreamReader(new FileInputStream("file.txt")));
```

## 프록시 (Proxy)

실제 객체에 대한 접근을 제어합니다.

```java
interface UserService {
    User findById(Long id);
}

// 실제 구현
class UserServiceImpl implements UserService {
    public User findById(Long id) {
        System.out.println("DB 조회: " + id);
        return new User(id, "Alice");
    }
}

// 캐싱 프록시
class CachingUserServiceProxy implements UserService {
    private final UserService target;
    private final Map<Long, User> cache = new HashMap<>();

    CachingUserServiceProxy(UserService target) { this.target = target; }

    public User findById(Long id) {
        return cache.computeIfAbsent(id, target::findById);
    }
}

UserService service = new CachingUserServiceProxy(new UserServiceImpl());
service.findById(1L);  // DB 조회: 1
service.findById(1L);  // 캐시 hit (DB 조회 없음)
```

Spring의 `@Transactional`, `@Cacheable`이 동적 프록시로 동작합니다.

## 어댑터 (Adapter)

호환되지 않는 인터페이스를 연결합니다.

```java
// 기존 인터페이스
class LegacyPayment {
    public void makePayment(String cardNumber, double amount) { ... }
}

// 새 인터페이스
interface PaymentService {
    void pay(PaymentRequest request);
}

record PaymentRequest(String card, long amountInCents) {}

// 어댑터
class LegacyPaymentAdapter implements PaymentService {
    private final LegacyPayment legacy;

    LegacyPaymentAdapter(LegacyPayment legacy) { this.legacy = legacy; }

    @Override
    public void pay(PaymentRequest request) {
        double amount = request.amountInCents() / 100.0;
        legacy.makePayment(request.card(), amount);
    }
}

PaymentService payment = new LegacyPaymentAdapter(new LegacyPayment());
payment.pay(new PaymentRequest("1234-5678", 9900));
```
