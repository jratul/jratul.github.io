---
title: "Modern Java (Java 14+)"
order: 12
---

## Modern Java란

자바는 6년간 거의 변화가 없다가 Java 8(2014년)부터 급격히 발전했습니다. Java 9부터는 6개월마다 새 버전이 나오는 릴리즈 사이클로 바뀌었고, LTS(장기 지원) 버전은 Java 11, 17, 21이 있습니다. 이 챕터에서는 Java 14 이후 실무에서 자주 쓰이는 문법들을 다룹니다.

---

## record — 불변 데이터 클래스

DTO(Data Transfer Object)를 만들 때 `equals()`, `hashCode()`, `toString()`, 생성자, getter를 매번 직접 작성해야 했습니다. `record`는 이를 자동 생성해주는 특수 클래스입니다.

마치 **읽기 전용 박스** 같습니다. 한 번 값을 넣으면 꺼내서 읽을 수만 있고 바꿀 수는 없습니다.

```java
// 기존 방식 — 반복적인 보일러플레이트 코드
class Point {
    private final int x;
    private final int y;

    public Point(int x, int y) {
        this.x = x;
        this.y = y;
    }

    public int x() { return x; }
    public int y() { return y; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Point p)) return false;
        return x == p.x && y == p.y;
    }

    @Override
    public int hashCode() {
        return Objects.hash(x, y);
    }

    @Override
    public String toString() {
        return "Point[x=" + x + ", y=" + y + "]";
    }
}

// record 방식 — 딱 한 줄!
record Point(int x, int y) {}

// 사용 방법은 동일
Point p = new Point(3, 4);
System.out.println(p.x());          // 3 (getter 자동 생성)
System.out.println(p);              // Point[x=3, y=4] (toString 자동 생성)
System.out.println(p.equals(new Point(3, 4)));  // true (equals 자동 생성)
```

### record에 로직 추가하기

record는 불변이지만 메서드를 추가하거나 생성자에서 유효성을 검증할 수 있습니다.

```java
record Range(int min, int max) {

    // 컴팩트 생성자 — 유효성 검증 (별도 생성자 선언 없이 this.min = min 처리는 자동)
    Range {
        if (min > max) {
            throw new IllegalArgumentException("min(" + min + ")이 max(" + max + ")보다 클 수 없습니다.");
        }
    }

    // 메서드 추가 가능
    public int length() {
        return max - min;  // 범위 크기
    }

    public boolean contains(int value) {
        return value >= min && value <= max;  // 값이 범위 안에 있는지
    }

    public boolean overlaps(Range other) {
        return this.min <= other.max && this.max >= other.min;  // 겹치는지 확인
    }
}

Range r = new Range(1, 10);
System.out.println(r.length());        // 9
System.out.println(r.contains(5));     // true
System.out.println(r.contains(11));    // false

Range r2 = new Range(15, 20);
System.out.println(r.overlaps(r2));    // false

Range invalid = new Range(10, 1);  // ❌ IllegalArgumentException: min(10)이 max(1)보다 클 수 없습니다.
```

### 실전: API DTO에 활용

```java
// 요청 DTO
record CreateUserRequest(
    String name,
    String email,
    int age
) {}

// 응답 DTO
record UserResponse(
    Long id,
    String name,
    String email
) {
    // 정적 팩토리 메서드 — 엔티티를 DTO로 변환
    static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail());
    }
}

// 사용
@PostMapping("/users")
public UserResponse createUser(@RequestBody CreateUserRequest request) {
    User user = userService.create(request);
    return UserResponse.from(user);  // 엔티티 → DTO 변환
}
```

**record를 쓰면 안 되는 경우:** JPA 엔티티(변경 감지가 필요), 빌더 패턴이 필요한 복잡한 객체

---

## sealed class — 상속 제한 클래스

`sealed`는 어떤 클래스가 자신을 상속할 수 있는지 **명시적으로 지정**합니다. 마치 "이 가족은 저, 아내, 아들만 있어요" 처럼 구성원을 한정합니다.

```java
// Shape를 구현할 수 있는 클래스를 Circle, Rectangle, Triangle로만 제한
sealed interface Shape permits Circle, Rectangle, Triangle {}

record Circle(double radius) implements Shape {}
record Rectangle(double width, double height) implements Shape {}
record Triangle(double base, double height) implements Shape {}

// ❌ 다른 클래스는 Shape를 구현할 수 없음
class Pentagon implements Shape {}  // 컴파일 에러!
```

### 패턴 매칭 switch와 함께 사용

sealed class의 진짜 강점은 `switch`에서 **모든 경우를 강제로 처리**하게 만드는 것입니다. 컴파일러가 빠진 케이스를 잡아줍니다.

```java
double area(Shape shape) {
    return switch (shape) {
        case Circle c      -> Math.PI * c.radius() * c.radius();
        case Rectangle r   -> r.width() * r.height();
        case Triangle t    -> 0.5 * t.base() * t.height();
        // else 불필요 — Circle, Rectangle, Triangle 말고는 없다는 걸 컴파일러가 앎
        // 만약 새 클래스 Diamond가 추가되면 이 switch에서 컴파일 에러 → 처리 강제!
    };
}

double perimeter(Shape shape) {
    return switch (shape) {
        case Circle c    -> 2 * Math.PI * c.radius();
        case Rectangle r -> 2 * (r.width() + r.height());
        case Triangle t  -> t.base() + 2 * Math.sqrt(
            Math.pow(t.base()/2, 2) + Math.pow(t.height(), 2)
        );
    };
}

// 사용
Shape circle = new Circle(5.0);
System.out.println("넓이: " + area(circle));      // 넓이: 78.53981633974483
System.out.println("둘레: " + perimeter(circle)); // 둘레: 31.41592653589793
```

---

## 패턴 매칭

### instanceof 패턴 매칭 (Java 16+)

기존에는 `instanceof` 확인 후 형변환을 별도로 해야 했습니다. 패턴 매칭은 이를 한 번에 처리합니다.

```java
// 기존 방식 — 중복 코드
Object obj = "Hello, World!";
if (obj instanceof String) {
    String s = (String) obj;  // 이미 String인데 또 형변환?
    System.out.println(s.toUpperCase());
}

// 패턴 매칭 — Java 16+
if (obj instanceof String s) {
    System.out.println(s.toUpperCase());  // s를 바로 사용 가능
}

// 조건과 함께 사용
if (obj instanceof String s && s.length() > 5) {
    System.out.println("긴 문자열: " + s);
}

// 실전 예제: 다양한 타입의 이벤트 처리
public void handleEvent(Object event) {
    if (event instanceof UserCreatedEvent e) {
        System.out.println("신규 사용자: " + e.name());
        emailService.sendWelcome(e.email());
    } else if (event instanceof OrderCreatedEvent e) {
        System.out.println("신규 주문: #" + e.orderId());
        inventoryService.decrease(e.productId(), e.quantity());
    } else if (event instanceof PaymentCompletedEvent e) {
        System.out.println("결제 완료: " + e.amount() + "원");
        notificationService.notify(e.userId(), "결제가 완료됐습니다.");
    }
}
```

### switch 패턴 매칭 (Java 21+)

```java
// 다양한 타입에 대한 분기를 switch로 처리
Object value = 42;

String result = switch (value) {
    case Integer i when i < 0  -> "음수: " + i;
    case Integer i when i == 0 -> "영";
    case Integer i             -> "양수: " + i;
    case String s              -> "문자열: " + s;
    case null                  -> "null 값";
    default                    -> "알 수 없는 타입";
};
System.out.println(result);  // 양수: 42

// sealed class와 함께 — 가장 강력한 조합
double process(Shape shape) {
    return switch (shape) {
        case Circle c    when c.radius() > 10 -> area(c) * 2;  // 큰 원은 두 배
        case Circle c                          -> area(c);
        case Rectangle r                       -> area(r);
        case Triangle t                        -> area(t);
    };
}
```

---

## Text Block (Java 15+) — 여러 줄 문자열

여러 줄에 걸친 문자열을 보기 좋게 작성할 수 있습니다.

```java
// 기존 방식 — 가독성이 끔찍함
String json = "{\n" +
    "  \"name\": \"홍길동\",\n" +
    "  \"age\": 30,\n" +
    "  \"email\": \"hong@example.com\"\n" +
    "}";

// Text Block — 훨씬 읽기 쉽다
String json = """
    {
      "name": "홍길동",
      "age": 30,
      "email": "hong@example.com"
    }
    """;

// HTML 작성
String html = """
    <html>
        <body>
            <h1>안녕하세요, %s님!</h1>
            <p>가입을 환영합니다.</p>
        </body>
    </html>
    """.formatted("홍길동");

// SQL 쿼리 작성
String sql = """
    SELECT
        u.id,
        u.name,
        o.total_amount,
        COUNT(oi.id) AS item_count
    FROM users u
    JOIN orders o ON u.id = o.user_id
    JOIN order_items oi ON o.id = oi.order_id
    WHERE u.active = true
      AND o.created_at >= :startDate
    GROUP BY u.id, u.name, o.total_amount
    ORDER BY o.total_amount DESC
    """;
```

**Text Block 규칙:**
- `"""` 다음 줄부터 내용 시작
- 닫는 `"""` 위치가 들여쓰기 기준이 됨
- 결과 문자열에서 공통 들여쓰기는 제거됨

---

## var — 타입 추론 (Java 10+)

지역 변수의 타입을 컴파일러가 추론합니다. 긴 제네릭 타입을 반복해 쓸 때 편리합니다.

```java
// 타입이 오른쪽에서 명확히 보일 때 var 사용 가능
var name = "홍길동";          // String으로 추론
var count = 42;               // int로 추론
var list = new ArrayList<String>();    // ArrayList<String>으로 추론
var map = new HashMap<String, List<Long>>();  // 복잡한 제네릭 타입에 유용!

// 반복문에서 유용
Map<String, List<Order>> ordersByUser = getOrders();
for (var entry : ordersByUser.entrySet()) {
    // entry의 타입은 Map.Entry<String, List<Order>> — 매우 길다
    System.out.println(entry.getKey() + ": " + entry.getValue().size() + "개 주문");
}

// try-with-resources
try (var reader = new BufferedReader(new FileReader("data.txt"))) {
    String line;
    while ((line = reader.readLine()) != null) {
        System.out.println(line);
    }
}
```

```java
// ❌ var를 쓰면 안 되는 경우
var x = getValue();      // getValue()의 반환 타입을 모르면 코드 읽기 어려움
var list = new ArrayList<>();  // 다이아몬드 없이 사용 시 타입이 ArrayList<Object>

// ✅ var는 타입이 오른쪽에서 명확하게 보일 때만 사용
var connection = dataSource.getConnection();  // OK: Connection 타입 명확
var user = userRepository.findById(1L);       // ❌: 반환 타입이 Optional<User>? User? 애매함
```

---

## 향상된 switch (Java 14+)

기존 switch는 `break` 누락으로 인한 fall-through 버그가 많았습니다. 향상된 switch는 이를 해결합니다.

```java
// 기존 switch — fall-through 위험
String getLabel(int day) {
    String label;
    switch (day) {
        case 1: case 2: case 3: case 4: case 5:
            label = "평일";
            break;      // break 빠뜨리면 아래로 떨어짐!
        case 6: case 7:
            label = "주말";
            break;
        default:
            label = "?";
    }
    return label;
}

// 향상된 switch 표현식 — 훨씬 안전하고 간결
String getLabel(int day) {
    return switch (day) {
        case 1, 2, 3, 4, 5 -> "평일";  // fall-through 없음
        case 6, 7          -> "주말";
        default            -> "?";
    };
}

// 복잡한 로직이 필요하면 블록과 yield 사용
String describe(int score) {
    return switch (score / 10) {
        case 10, 9 -> "A";
        case 8     -> "B";
        case 7     -> {
            System.out.println("간신히 통과!");  // 부가 로직
            yield "C";  // switch 표현식에서 반환 시 yield 사용
        }
        case 6     -> "D";
        default    -> {
            System.out.println("재수강 필요: " + score);
            yield "F";
        }
    };
}
```

---

## SequencedCollection (Java 21+)

`List`, `Deque`, `LinkedHashSet` 같은 **순서가 있는 컬렉션**에 일관된 API를 제공합니다. 이전에는 맨 앞/뒤 요소를 다루는 방법이 컬렉션마다 달라서 불편했습니다.

```java
List<String> list = new ArrayList<>(List.of("a", "b", "c", "d"));

// Java 21 이전 — 컬렉션마다 다른 방법
list.get(0);              // 첫 요소
list.get(list.size() - 1); // 마지막 요소 (번거롭다!)
list.add(0, "z");          // 맨 앞에 추가 (번거롭다!)
list.remove(list.size() - 1); // 마지막 제거 (번거롭다!)

// Java 21 이후 — 통일된 API
list.getFirst();   // "a"
list.getLast();    // "d"
list.addFirst("z"); // ["z", "a", "b", "c", "d"]
list.addLast("e");  // ["z", "a", "b", "c", "d", "e"]
list.removeFirst(); // "z" 제거
list.removeLast();  // "e" 제거
list.reversed();    // ["d", "c", "b", "a"] — 역순 뷰 (새 리스트 아님!)
```

---

## 실전 예제: API 응답을 sealed + record로 모델링

에러 처리 코드를 타입 안전하게 표현할 수 있습니다.

```java
// API 응답을 타입으로 표현
sealed interface ApiResult<T> permits ApiResult.Ok, ApiResult.Err {

    record Ok<T>(T data) implements ApiResult<T> {}

    record Err<T>(String message, int statusCode) implements ApiResult<T> {
        // 자주 쓰는 에러 응답을 정적 팩토리로 제공
        static <T> Err<T> notFound(String resource) {
            return new Err<>(resource + "을(를) 찾을 수 없습니다.", 404);
        }
        static <T> Err<T> unauthorized() {
            return new Err<>("인증이 필요합니다.", 401);
        }
    }
}

// 서비스 메서드
ApiResult<UserResponse> findUser(Long id) {
    return userRepository.findById(id)
        .map(user -> new ApiResult.Ok<>(UserResponse.from(user)))
        .orElseGet(() -> ApiResult.Err.notFound("사용자"));
}

// 컨트롤러에서 처리
switch (findUser(userId)) {
    case ApiResult.Ok<UserResponse> ok   -> {
        return ResponseEntity.ok(ok.data());
    }
    case ApiResult.Err<UserResponse> err -> {
        return ResponseEntity.status(err.statusCode())
            .body(Map.of("error", err.message()));
    }
}
```

---

## 버전별 주요 기능 요약

| 버전 | 주요 기능 |
|------|----------|
| Java 10 | `var` 타입 추론 |
| Java 14 | 향상된 switch 표현식 (정식) |
| Java 15 | Text Block (정식) |
| Java 16 | record (정식), instanceof 패턴 매칭 (정식) |
| Java 17 | sealed class (정식), LTS 버전 |
| Java 21 | switch 패턴 매칭 (정식), SequencedCollection, LTS 버전 |

실무에서는 Java 17 또는 Java 21을 주로 사용합니다. 이 챕터에서 다룬 모든 기능은 Java 21에서 사용 가능합니다.
