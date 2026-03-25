---
title: "어노테이션"
order: 11
---

## 어노테이션이란 무엇인가

어노테이션(Annotation)은 코드에 **추가 정보(메타데이터)**를 붙이는 방법입니다. `@`로 시작하며, 코드 자체의 동작에 직접 영향을 주지 않고 컴파일러, 프레임워크, 도구 등에게 "이 코드는 이런 특별한 의미를 가진다"고 알려줍니다.

마치 책에 **포스트잇**을 붙이는 것과 같습니다. 포스트잇 자체가 책 내용을 바꾸지는 않지만, 읽는 사람에게 "여기 중요" 또는 "나중에 다시 보기" 같은 정보를 전달합니다.

```java
@Override              // 컴파일러에게: 부모 메서드를 오버라이드함을 알림
@Deprecated            // 컴파일러에게: 이 기능은 낡았으니 사용 자제
@SuppressWarnings("unchecked")  // 컴파일러 경고를 무시해줘
```

어노테이션은 크게 세 가지 용도로 쓰입니다:
- **컴파일러 지시** — `@Override`, `@SuppressWarnings`
- **빌드/코드 생성** — Lombok의 `@Getter`, `@Builder`
- **런타임 처리** — Spring의 `@Autowired`, `@Transactional`

---

## 자바 기본 제공 어노테이션

### @Override

부모 클래스 또는 인터페이스의 메서드를 올바르게 오버라이드했는지 컴파일러가 검증합니다. 이 어노테이션이 없어도 오버라이드는 되지만, **오타가 있어도 컴파일러가 잡아주지 못합니다**.

```java
class Animal {
    public String sound() { return "..."; }
}

class Dog extends Animal {
    @Override
    public String sound() {  // 올바른 오버라이드 — 컴파일 통과
        return "멍멍";
    }

    // @Override가 없으면 이것도 컴파일 통과 (오타인지 새 메서드인지 구분 못 함)
    public String soundo() { return "멍멍"; }

    @Override
    public String soundo() { return "멍멍"; }  // ❌ 컴파일 에러: 부모에 soundo() 없음
    // @Override 덕분에 오타를 잡을 수 있다!
}
```

**초보자 실수:** `@Override`를 붙이지 않아 오타가 새 메서드로 처리되는 경우가 많습니다. 항상 붙이는 습관을 들이세요.

---

### @Deprecated

더 이상 사용을 권장하지 않는 API에 붙입니다. 호출하는 쪽에서 경고가 뜨고, IDE에서 취소선으로 표시됩니다.

```java
// 예전 방식 — 더 이상 쓰지 마세요
@Deprecated(since = "11", forRemoval = true)  // Java 11부터 deprecated, 나중에 삭제 예정
public String getOldUserInfo() {
    return "옛날 방식";
}

// 새로운 방식
public UserDto getUserInfo() {
    return new UserDto(name, email);
}
```

```java
// 사용하면 컴파일 경고 발생
user.getOldUserInfo();  // ⚠ 경고: 'getOldUserInfo()' is deprecated
```

---

### @FunctionalInterface

람다식으로 사용할 수 있는 **함수형 인터페이스**임을 명시합니다. 추상 메서드가 정확히 1개여야 하며, 2개 이상이면 컴파일 에러가 납니다.

```java
@FunctionalInterface
public interface Converter<T, R> {
    R convert(T input);  // 추상 메서드 1개만 허용

    // default, static 메서드는 몇 개든 OK
    default R convertOrDefault(T input, R defaultValue) {
        try {
            return convert(input);
        } catch (Exception e) {
            return defaultValue;
        }
    }
}

// 람다로 사용
Converter<String, Integer> toInt = s -> Integer.parseInt(s);
System.out.println(toInt.convert("42"));  // 42
```

---

## 커스텀 어노테이션 만들기

자바는 직접 어노테이션을 정의할 수 있습니다. 어노테이션 정의에도 어노테이션이 붙는데, 이를 **메타 어노테이션**이라 합니다.

### 어노테이션 정의 방법

```java
import java.lang.annotation.*;

@Retention(RetentionPolicy.RUNTIME)  // 언제까지 어노테이션 정보를 유지할지
@Target(ElementType.METHOD)          // 어디에 붙일 수 있는지 (메서드만 가능)
public @interface Timer {
    String name() default "";  // 속성 선언 (기본값 설정 가능)
    boolean enabled() default true;
}
```

**@Retention 옵션 설명:**

| 값 | 의미 |
|----|------|
| `SOURCE` | 소스 코드에만 존재, 컴파일 후 사라짐 (예: `@Override`) |
| `CLASS` | .class 파일에 포함되지만 런타임엔 사라짐 |
| `RUNTIME` | 런타임에도 유지 → 리플렉션으로 읽기 가능 |

**@Target 옵션 설명:**

| 값 | 의미 |
|----|------|
| `TYPE` | 클래스, 인터페이스, 열거형 |
| `FIELD` | 필드 |
| `METHOD` | 메서드 |
| `PARAMETER` | 메서드 파라미터 |
| `CONSTRUCTOR` | 생성자 |

### 어노테이션 사용

```java
public class OrderService {

    @Timer(name = "주문 생성")
    public Order createOrder(OrderRequest request) {
        // 주문 생성 로직
        return new Order(request);
    }

    @Timer(name = "주문 조회", enabled = false)
    public Order findOrder(Long id) {
        return orderRepository.findById(id);
    }
}
```

---

## 리플렉션으로 어노테이션 처리하기

런타임에 어노테이션 정보를 읽어서 동작을 바꾸는 것이 **리플렉션(Reflection)**입니다. Spring 프레임워크가 이 방식으로 동작합니다.

```java
import java.lang.reflect.*;

public class TimerProcessor {

    // 객체의 @Timer 붙은 메서드를 실행하고 시간을 측정
    public static void run(Object target) throws Exception {
        Class<?> clazz = target.getClass();  // 클래스 정보 가져오기

        for (Method method : clazz.getDeclaredMethods()) {
            // 이 메서드에 @Timer가 붙어 있는가?
            if (method.isAnnotationPresent(Timer.class)) {
                Timer timer = method.getAnnotation(Timer.class);  // 어노테이션 정보 읽기

                if (!timer.enabled()) {
                    System.out.println("[" + timer.name() + "] 비활성화됨");
                    continue;
                }

                String label = timer.name().isEmpty() ? method.getName() : timer.name();

                long start = System.currentTimeMillis();
                method.invoke(target);  // 메서드 실행
                long elapsed = System.currentTimeMillis() - start;

                System.out.printf("[%s] 실행 시간: %dms%n", label, elapsed);
            }
        }
    }
}

// 실제 사용
OrderService service = new OrderService();
TimerProcessor.run(service);
// [주문 생성] 실행 시간: 15ms
// [주문 조회] 비활성화됨
```

이것이 바로 Spring의 `@Transactional`, `@Cacheable` 같은 어노테이션이 동작하는 원리입니다. Spring이 클래스를 빈으로 등록할 때 어노테이션을 스캔해서 부가 기능을 덧씌웁니다.

---

## 실전 예제 1: 여러 속성을 가진 어노테이션

JPA의 `@Column`처럼 여러 설정을 담는 어노테이션을 만들어 봅니다.

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)  // 필드에 붙이는 어노테이션
public @interface Column {
    String name() default "";          // DB 컬럼명 (비어 있으면 필드명 사용)
    boolean nullable() default true;   // null 허용 여부
    int length() default 255;          // 문자열 최대 길이
    boolean unique() default false;    // 유니크 제약 조건
}
```

```java
public class User {

    @Column(name = "user_name", nullable = false, length = 50)
    private String name;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(length = 500)  // name 생략 → 필드명 "bio" 사용
    private String bio;
}
```

```java
// 리플렉션으로 컬럼 정보 읽기
public class SchemaGenerator {

    public static void printSchema(Class<?> clazz) throws Exception {
        System.out.println("테이블: " + clazz.getSimpleName().toLowerCase());

        for (Field field : clazz.getDeclaredFields()) {
            if (field.isAnnotationPresent(Column.class)) {
                Column col = field.getAnnotation(Column.class);
                String colName = col.name().isEmpty() ? field.getName() : col.name();

                System.out.printf("  컬럼: %s (nullable=%s, length=%d, unique=%s)%n",
                    colName, col.nullable(), col.length(), col.unique());
            }
        }
    }
}

SchemaGenerator.printSchema(User.class);
// 테이블: user
//   컬럼: user_name (nullable=false, length=50, unique=false)
//   컬럼: email (nullable=false, length=255, unique=true)
//   컬럼: bio (nullable=true, length=500, unique=false)
```

---

## 실전 예제 2: 반복 가능한 어노테이션 (@Repeatable)

같은 어노테이션을 하나의 요소에 여러 번 붙일 수 있습니다. 권한 체크 같은 곳에 유용합니다.

```java
// 개별 어노테이션
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@Repeatable(Roles.class)  // 반복 가능하게 선언
public @interface Role {
    String value();
}

// 컨테이너 어노테이션 (여러 @Role을 담는 그릇)
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Roles {
    Role[] value();  // 복수의 @Role을 배열로 담음
}
```

```java
public class AdminController {

    @Role("ADMIN")      // 같은 어노테이션을 두 번 붙일 수 있다
    @Role("MANAGER")
    public void manageUsers() {
        System.out.println("사용자 관리");
    }

    @Role("ADMIN")
    @Role("SUPER_ADMIN")
    @Role("ROOT")       // 세 번도 가능
    public void deleteAll() {
        System.out.println("전체 삭제");
    }
}

// 리플렉션으로 읽기
Method method = AdminController.class.getMethod("manageUsers");
Role[] roles = method.getAnnotationsByType(Role.class);
for (Role role : roles) {
    System.out.println("허용 권한: " + role.value());
}
// 허용 권한: ADMIN
// 허용 권한: MANAGER
```

---

## 실전 예제 3: 유효성 검증 어노테이션

Spring의 Bean Validation(`@NotNull`, `@Size`, `@Email`)이 동작하는 방식을 직접 구현해 봅니다.

```java
// 비어있으면 안 되는 필드
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface NotBlank {
    String message() default "값이 비어 있으면 안 됩니다.";
}

// 최소 길이 제약
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface MinLength {
    int value();
    String message() default "";
}

// 이메일 형식 체크
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface Email {
    String message() default "올바른 이메일 형식이 아닙니다.";
}
```

```java
// 검증 실행기
public class Validator {

    public static List<String> validate(Object obj) throws IllegalAccessException {
        List<String> errors = new ArrayList<>();
        Class<?> clazz = obj.getClass();

        for (Field field : clazz.getDeclaredFields()) {
            field.setAccessible(true);  // private 필드 접근 허용
            Object value = field.get(obj);

            // @NotBlank 검증
            if (field.isAnnotationPresent(NotBlank.class)) {
                NotBlank annotation = field.getAnnotation(NotBlank.class);
                if (value == null || value.toString().isBlank()) {
                    errors.add(field.getName() + ": " + annotation.message());
                }
            }

            // @MinLength 검증
            if (field.isAnnotationPresent(MinLength.class)) {
                MinLength annotation = field.getAnnotation(MinLength.class);
                if (value != null && value.toString().length() < annotation.value()) {
                    String msg = annotation.message().isEmpty()
                        ? "최소 " + annotation.value() + "자 이상이어야 합니다."
                        : annotation.message();
                    errors.add(field.getName() + ": " + msg);
                }
            }

            // @Email 검증
            if (field.isAnnotationPresent(Email.class)) {
                Email annotation = field.getAnnotation(Email.class);
                if (value != null && !value.toString().matches("^[\\w._%+-]+@[\\w.-]+\\.[a-zA-Z]{2,}$")) {
                    errors.add(field.getName() + ": " + annotation.message());
                }
            }
        }

        return errors;
    }
}
```

```java
// 회원가입 요청 클래스
public class SignUpRequest {

    @NotBlank
    private String name;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @MinLength(value = 8, message = "비밀번호는 8자 이상이어야 합니다.")
    private String password;

    public SignUpRequest(String name, String email, String password) {
        this.name = name;
        this.email = email;
        this.password = password;
    }
}

// 검증 실행
SignUpRequest req1 = new SignUpRequest("", "notanemail", "1234");
List<String> errors = Validator.validate(req1);
errors.forEach(System.out::println);
// name: 값이 비어 있으면 안 됩니다.
// email: 올바른 이메일 형식이 아닙니다.
// password: 비밀번호는 8자 이상이어야 합니다.

SignUpRequest req2 = new SignUpRequest("홍길동", "hong@example.com", "securePassword123");
List<String> errors2 = Validator.validate(req2);
System.out.println(errors2.isEmpty() ? "검증 통과!" : errors2);
// 검증 통과!
```

---

## 초보자 흔한 실수

```java
// ❌ 실수 1: @Retention을 RUNTIME으로 안 설정
@Retention(RetentionPolicy.CLASS)  // 런타임에 정보가 사라짐!
@Target(ElementType.METHOD)
public @interface MyAnnotation {}

// 리플렉션으로 읽으면 null 반환 → 처리 안 됨
method.getAnnotation(MyAnnotation.class);  // null!

// ✅ 런타임 처리가 필요하면 반드시 RUNTIME
@Retention(RetentionPolicy.RUNTIME)
public @interface MyAnnotation {}
```

```java
// ❌ 실수 2: @Target 없이 정의하면 모든 곳에 붙일 수 있어 의도치 않은 사용 발생
public @interface DatabaseOnly {}  // 어디든 붙을 수 있어서 혼란 야기

// ✅ 명확한 @Target 설정
@Target(ElementType.FIELD)
public @interface DatabaseOnly {}  // 필드에만 붙을 수 있음
```

```java
// ❌ 실수 3: 어노테이션 속성의 타입 제한을 모르고 사용
public @interface Wrong {
    List<String> values();  // ❌ 컴파일 에러: List는 속성 타입으로 불가
    Object value();         // ❌ 컴파일 에러: Object도 불가
}

// ✅ 어노테이션 속성으로 사용 가능한 타입
public @interface Correct {
    String value();         // OK: String
    int count();            // OK: 기본형
    Class<?> type();        // OK: Class
    String[] tags();        // OK: 배열
    ElementType target();   // OK: Enum
}
```

---

## 어노테이션과 Spring의 연결

Spring을 배울 때 어노테이션을 엄청나게 많이 쓰게 됩니다. 이제 그것들이 어떻게 동작하는지 이해할 수 있습니다.

```java
// Spring이 내부적으로 하는 일 (개념적 설명)
@Component  // 이 클래스를 스프링 빈으로 등록해줘
public class UserService {

    @Autowired  // 이 필드에 빈을 주입해줘
    private UserRepository userRepository;

    @Transactional  // 이 메서드를 트랜잭션으로 감싸줘
    public User save(User user) {
        return userRepository.save(user);
    }
}

// Spring이 내부적으로:
// 1. 클래스패스를 스캔해서 @Component 찾기
// 2. 해당 클래스의 인스턴스를 생성해서 빈으로 등록
// 3. @Autowired 필드에 해당 타입의 빈 주입
// 4. @Transactional 메서드는 프록시로 감싸서 트랜잭션 처리
```

이처럼 어노테이션은 자바 생태계 전반에서 핵심적인 역할을 합니다. 직접 만들 일은 많지 않지만, 원리를 이해하면 Spring 같은 프레임워크가 왜 그렇게 동작하는지 훨씬 잘 이해할 수 있습니다.
