---
title: "어노테이션"
order: 11
---

## 어노테이션이란

코드에 **메타데이터**를 붙이는 방법입니다. `@`로 시작하며, 컴파일러·프레임워크·런타임에 정보를 전달합니다.

```java
@Override              // 컴파일러에게: 부모 메서드를 오버라이드함을 알림
@Deprecated            // 컴파일러에게: 이 요소는 사용 자제
@SuppressWarnings("unchecked")  // 컴파일러 경고 억제
```

## 기본 제공 어노테이션

### @Override

부모 클래스나 인터페이스의 메서드를 올바르게 오버라이드했는지 컴파일러가 확인합니다.

```java
class Animal {
    public String sound() { return "..."; }
}

class Dog extends Animal {
    @Override
    public String sound() { return "멍멍"; }  // 오타 나면 컴파일 에러

    @Override
    public String sounds() { return "멍멍"; } // ❌ 컴파일 에러 (메서드 없음)
}
```

### @Deprecated

더 이상 사용을 권장하지 않는 API에 붙입니다.

```java
@Deprecated(since = "11", forRemoval = true)
public String oldMethod() {
    return "옛날 방식";
}
```

### @FunctionalInterface

함수형 인터페이스임을 명시합니다. 추상 메서드가 2개 이상이면 컴파일 에러.

```java
@FunctionalInterface
public interface Transformer<T, R> {
    R transform(T input);
    // default 메서드는 추가 가능
    default R transformOrDefault(T input, R defaultValue) {
        try { return transform(input); }
        catch (Exception e) { return defaultValue; }
    }
}
```

## 커스텀 어노테이션

### 어노테이션 정의

```java
import java.lang.annotation.*;

@Retention(RetentionPolicy.RUNTIME)  // 언제까지 유지할지
@Target(ElementType.METHOD)          // 어디에 붙일 수 있는지
public @interface Timer {
    String name() default "";        // 속성 (기본값 설정 가능)
}
```

`@Retention` 값:
- `SOURCE` — 소스 코드에만 존재, 컴파일 후 사라짐
- `CLASS` — 클래스 파일에 포함, 런타임엔 사라짐
- `RUNTIME` — 런타임에도 유지 (리플렉션으로 읽기 가능)

`@Target` 값: `TYPE`, `FIELD`, `METHOD`, `PARAMETER`, `CONSTRUCTOR`, `LOCAL_VARIABLE` 등

### 어노테이션 사용

```java
public class UserService {
    @Timer(name = "회원 조회")
    public User findUser(Long id) {
        // ...
    }
}
```

## 리플렉션으로 어노테이션 처리

런타임에 어노테이션 정보를 읽어 동작을 바꿀 수 있습니다.

```java
public class TimerProcessor {
    public static void processTimers(Object target) throws Exception {
        Class<?> clazz = target.getClass();

        for (Method method : clazz.getDeclaredMethods()) {
            if (method.isAnnotationPresent(Timer.class)) {
                Timer timer = method.getAnnotation(Timer.class);
                String name = timer.name().isEmpty() ? method.getName() : timer.name();

                long start = System.currentTimeMillis();
                method.invoke(target);
                long elapsed = System.currentTimeMillis() - start;

                System.out.printf("[%s] 실행 시간: %dms%n", name, elapsed);
            }
        }
    }
}

// 사용
UserService service = new UserService();
TimerProcessor.processTimers(service);
// [회원 조회] 실행 시간: 12ms
```

이것이 Spring의 `@Transactional`, `@Cacheable` 같은 어노테이션이 동작하는 원리입니다.

## 여러 속성을 가진 어노테이션

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface Column {
    String name() default "";
    boolean nullable() default true;
    int length() default 255;
}

public class User {
    @Column(name = "user_name", nullable = false, length = 50)
    private String name;

    @Column(name = "email", nullable = false)
    private String email;
}
```

## 반복 가능한 어노테이션

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@Repeatable(Roles.class)
public @interface Role {
    String value();
}

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Roles {
    Role[] value();
}

// 같은 어노테이션을 여러 번 붙일 수 있음
@Role("ADMIN")
@Role("MANAGER")
public void sensitiveOperation() { ... }
```

## 실전: 유효성 검증 어노테이션

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface NotBlank {
    String message() default "값이 비어 있으면 안 됩니다.";
}

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface MinLength {
    int value();
    String message() default "";
}

// 검증 로직
public class Validator {
    public static List<String> validate(Object obj) throws IllegalAccessException {
        List<String> errors = new ArrayList<>();
        for (Field field : obj.getClass().getDeclaredFields()) {
            field.setAccessible(true);
            Object value = field.get(obj);

            if (field.isAnnotationPresent(NotBlank.class)) {
                if (value == null || value.toString().isBlank()) {
                    errors.add(field.getName() + ": " +
                        field.getAnnotation(NotBlank.class).message());
                }
            }

            if (field.isAnnotationPresent(MinLength.class)) {
                MinLength min = field.getAnnotation(MinLength.class);
                if (value != null && value.toString().length() < min.value()) {
                    errors.add(field.getName() + ": 최소 " + min.value() + "자 이상이어야 합니다.");
                }
            }
        }
        return errors;
    }
}

// 적용
class SignUpRequest {
    @NotBlank
    private String name;

    @NotBlank
    @MinLength(8)
    private String password;
}

SignUpRequest req = new SignUpRequest();
List<String> errors = Validator.validate(req);
// ["name: 값이 비어 있으면 안 됩니다.", "password: 값이 비어 있으면 안 됩니다."]
```

이 패턴이 Bean Validation(`@NotNull`, `@Size`, `@Email`)의 동작 방식입니다.
