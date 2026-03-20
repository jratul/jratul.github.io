---
title: "Modern Java (Java 14+)"
order: 12
---

## record

불변 데이터 클래스를 간결하게 만듭니다. `equals`, `hashCode`, `toString`, 생성자, getter를 자동 생성합니다.

```java
// 기존 방식
class Point {
    private final int x;
    private final int y;

    public Point(int x, int y) {
        this.x = x;
        this.y = y;
    }

    public int x() { return x; }
    public int y() { return y; }

    @Override public boolean equals(Object o) { ... }
    @Override public int hashCode() { ... }
    @Override public String toString() { ... }
}

// record 방식 (한 줄)
record Point(int x, int y) {}

Point p = new Point(3, 4);
System.out.println(p.x());       // 3
System.out.println(p);            // Point[x=3, y=4]
System.out.println(p.equals(new Point(3, 4)));  // true
```

### 커스텀 생성자와 메서드 추가

```java
record Range(int min, int max) {
    // 컴팩트 생성자 (유효성 검증)
    Range {
        if (min > max) throw new IllegalArgumentException("min > max");
    }

    // 메서드 추가 가능
    public int length() {
        return max - min;
    }

    public boolean contains(int value) {
        return value >= min && value <= max;
    }
}

Range r = new Range(1, 10);
System.out.println(r.length());      // 9
System.out.println(r.contains(5));   // true
```

### DTO에 활용

```java
record CreateUserRequest(
    String name,
    String email,
    int age
) {}

record UserResponse(
    Long id,
    String name,
    String email
) {
    static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail());
    }
}
```

## sealed class

상속 가능한 클래스를 **지정된 클래스**로만 제한합니다.

```java
sealed interface Shape permits Circle, Rectangle, Triangle {}

record Circle(double radius) implements Shape {}
record Rectangle(double width, double height) implements Shape {}
record Triangle(double base, double height) implements Shape {}

// 다른 클래스는 Shape를 구현/상속 불가
```

`when`과 패턴 매칭을 함께 쓰면 타입 안전한 분기가 가능합니다.

```java
double area(Shape shape) {
    return switch (shape) {
        case Circle c    -> Math.PI * c.radius() * c.radius();
        case Rectangle r -> r.width() * r.height();
        case Triangle t  -> 0.5 * t.base() * t.height();
        // else 불필요 — 컴파일러가 모든 케이스를 검증
    };
}
```

## 패턴 매칭

### instanceof 패턴 매칭 (Java 16+)

```java
// 기존
Object obj = "Hello";
if (obj instanceof String) {
    String s = (String) obj;  // 형변환 필요
    System.out.println(s.length());
}

// 패턴 매칭
if (obj instanceof String s) {
    System.out.println(s.length());  // 자동 형변환
}

// 조건 추가
if (obj instanceof String s && s.length() > 3) {
    System.out.println("긴 문자열: " + s);
}
```

### switch 패턴 매칭 (Java 21+)

```java
Object value = 42;

String result = switch (value) {
    case Integer i when i < 0 -> "음수: " + i;
    case Integer i             -> "양수: " + i;
    case String s              -> "문자열: " + s;
    case null                  -> "null";
    default                    -> "기타";
};
```

## Text Block (Java 15+)

여러 줄 문자열을 가독성 있게 작성합니다.

```java
// 기존
String json = "{\n" +
    "  \"name\": \"Alice\",\n" +
    "  \"age\": 30\n" +
    "}";

// Text Block
String json = """
    {
      "name": "Alice",
      "age": 30
    }
    """;

// HTML
String html = """
    <html>
        <body>
            <p>Hello, %s!</p>
        </body>
    </html>
    """.formatted("World");

// SQL
String sql = """
    SELECT u.id, u.name, o.total
    FROM users u
    JOIN orders o ON u.id = o.user_id
    WHERE u.active = true
    """;
```

## var (Java 10+)

로컬 변수의 타입 추론입니다.

```java
var name = "Alice";          // String
var count = 42;              // int
var list = new ArrayList<String>(); // ArrayList<String>

// 반복문에서 유용
for (var entry : map.entrySet()) {
    System.out.println(entry.getKey() + " = " + entry.getValue());
}

// 단, 타입이 명확하지 않으면 가독성이 떨어짐
var x = getValue();  // 반환 타입을 모르면 읽기 어려움
```

## 향상된 switch (Java 14+)

```java
// 기존 switch — fall-through 위험, return 불가
int result;
switch (day) {
    case MON: case TUE: case WED: case THU: case FRI:
        result = 1;
        break;
    default:
        result = 0;
}

// 향상된 switch — 표현식으로 사용, fall-through 없음
int result = switch (day) {
    case MON, TUE, WED, THU, FRI -> 1;
    case SAT, SUN -> 0;
};

// 복잡한 로직은 yield로 반환
int result = switch (day) {
    case MON -> {
        System.out.println("월요일");
        yield 1;
    }
    default -> 0;
};
```

## SequencedCollection (Java 21+)

순서가 있는 컬렉션에 일관된 API를 제공합니다.

```java
List<String> list = new ArrayList<>(List.of("a", "b", "c"));

list.getFirst();   // "a"
list.getLast();    // "c"
list.addFirst("z");
list.addLast("z");
list.removeFirst();
list.removeLast();
list.reversed();   // 역순 뷰
```

## 실전 예제: API 응답 모델링

```java
sealed interface ApiResult<T> permits ApiResult.Ok, ApiResult.Err {
    record Ok<T>(T data) implements ApiResult<T> {}
    record Err<T>(String message, int code) implements ApiResult<T> {}
}

ApiResult<User> findUser(Long id) {
    return userRepository.findById(id)
        .map(ApiResult.Ok::new)
        .orElse(new ApiResult.Err<>("사용자를 찾을 수 없습니다.", 404));
}

// 처리
switch (findUser(1L)) {
    case ApiResult.Ok<User> ok   -> renderUser(ok.data());
    case ApiResult.Err<User> err -> renderError(err.message(), err.code());
}
```
