---
title: "@Component, @Controller, @Service, @Repository"
date: "2026-01-17"
tags: ["spring", "annotation", "bean", "stereotype", "backend"]
excerpt: "Spring의 스테레오타입 어노테이션들의 역할과 차이점을 알아봅니다."
---

# @Component, @Controller, @Service, @Repository

Spring의 스테레오타입(Stereotype) 어노테이션들의 역할과 차이점을 알아봅니다.

## 스테레오타입 어노테이션이란?

**빈(Bean)으로 등록할 클래스를 표시**하는 어노테이션입니다.

```java
@Component  // 기본
├── @Controller   // 웹 계층
├── @Service      // 비즈니스 계층
└── @Repository   // 데이터 접근 계층
```

---

## @Component

**가장 기본적인 빈 등록 어노테이션**입니다.

```java
@Component
public class EmailValidator {
    public boolean isValid(String email) {
        return email != null && email.contains("@");
    }
}
```

**용도:**
- 특정 계층에 속하지 않는 일반 컴포넌트
- 유틸리티 클래스
- 기타 범용 빈

---

### 빈 이름 지정

```java
@Component  // 빈 이름: emailValidator (클래스명 camelCase)
public class EmailValidator { }

@Component("validator")  // 빈 이름: validator
public class EmailValidator { }
```

---

## @Controller

**웹 요청을 처리하는 컨트롤러**를 나타냅니다.

```java
@Controller
public class UserController {

    @GetMapping("/users")
    public String list(Model model) {
        model.addAttribute("users", userService.findAll());
        return "users/list";  // 뷰 이름
    }
}
```

**특징:**
- Spring MVC에서 핸들러로 인식
- 뷰 리졸버와 연동
- `@RequestMapping` 등 핸들러 매핑 어노테이션 사용 가능

---

### @RestController

```java
// @Controller + @ResponseBody
@RestController
public class UserApiController {

    @GetMapping("/api/users")
    public List<User> list() {
        return userService.findAll();  // JSON 응답
    }
}
```

**차이점:**
- `@Controller`: 뷰 이름 반환
- `@RestController`: 객체 반환 (JSON/XML)

---

## @Service

**비즈니스 로직을 처리하는 서비스**를 나타냅니다.

```java
@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public User createUser(UserDto dto) {
        // 비즈니스 로직
        User user = new User(dto.getName(), dto.getEmail());
        return userRepository.save(user);
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }
}
```

**특징:**
- 비즈니스 로직 캡슐화
- 트랜잭션 처리
- 현재는 `@Component`와 기능적 차이 없음 (의미론적 구분)

---

## @Repository

**데이터 접근 계층(DAO)**을 나타냅니다.

```java
@Repository
public class UserRepositoryImpl implements UserRepository {

    @PersistenceContext
    private EntityManager em;

    @Override
    public User save(User user) {
        em.persist(user);
        return user;
    }

    @Override
    public Optional<User> findById(Long id) {
        return Optional.ofNullable(em.find(User.class, id));
    }
}
```

---

### 예외 변환 기능

**`@Repository`의 핵심 기능:** 데이터 접근 예외를 Spring의 `DataAccessException`으로 변환합니다.

```java
@Repository
public class JdbcUserRepository {

    public User findById(Long id) {
        // SQLException 발생 시
        // → DataAccessException으로 변환됨
    }
}
```

**예외 변환:**
```
SQLException              → DataAccessException
JPA PersistenceException → DataAccessException
Hibernate Exception      → DataAccessException
```

**이점:**
- 기술 독립적인 예외 처리
- JDBC → JPA 변경 시에도 서비스 계층 코드 수정 불필요

---

### Spring Data JPA

```java
// @Repository 자동 적용
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}
```

Spring Data JPA의 Repository 인터페이스는 자동으로 `@Repository` 기능이 적용됩니다.

---

## 계층 구조

```
┌─────────────────────────────────────────┐
│            @Controller                  │
│         (Presentation Layer)            │
│    HTTP 요청/응답, 뷰 렌더링            │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│             @Service                    │
│          (Business Layer)               │
│    비즈니스 로직, 트랜잭션 처리          │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            @Repository                  │
│         (Data Access Layer)             │
│    DB 접근, 예외 변환                    │
└─────────────────────────────────────────┘
```

---

## 컴포넌트 스캔

### @ComponentScan

```java
@SpringBootApplication  // @ComponentScan 포함
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

---

### 스캔 대상

```java
@ComponentScan(basePackages = "com.example")
// 또는
@ComponentScan(basePackageClasses = Application.class)
```

**스캔 대상 어노테이션:**
- `@Component`
- `@Controller`, `@RestController`
- `@Service`
- `@Repository`
- `@Configuration`

---

### 스캔 필터

```java
@ComponentScan(
    basePackages = "com.example",
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.ANNOTATION,
        classes = Controller.class
    )
)
```

---

## 어노테이션 정의 살펴보기

### @Component

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Indexed
public @interface Component {
    String value() default "";
}
```

---

### @Service

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Component  // @Component를 포함!
public @interface Service {
    @AliasFor(annotation = Component.class)
    String value() default "";
}
```

---

### @Repository

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Component  // @Component를 포함!
public @interface Repository {
    @AliasFor(annotation = Component.class)
    String value() default "";
}
```

---

### @Controller

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Component  // @Component를 포함!
public @interface Controller {
    @AliasFor(annotation = Component.class)
    String value() default "";
}
```

**결론:** 모두 `@Component`를 메타 어노테이션으로 포함합니다.

---

## 기능적 차이

| 어노테이션 | 추가 기능 |
|-----------|----------|
| @Component | 없음 (기본 빈 등록) |
| @Controller | Spring MVC 핸들러로 인식 |
| @Service | 없음 (의미론적 구분) |
| @Repository | 예외 변환 (DataAccessException) |

---

## 실전 예제

### 전체 구조

```java
// Controller
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserResponse> list() {
        return userService.findAll()
            .stream()
            .map(UserResponse::from)
            .toList();
    }

    @PostMapping
    public UserResponse create(@RequestBody UserRequest request) {
        User user = userService.create(request);
        return UserResponse.from(user);
    }
}
```

```java
// Service
@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    @Transactional
    public User create(UserRequest request) {
        validateDuplicateEmail(request.getEmail());
        User user = new User(request.getName(), request.getEmail());
        return userRepository.save(user);
    }

    private void validateDuplicateEmail(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateEmailException(email);
        }
    }
}
```

```java
// Repository (Spring Data JPA)
public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByEmail(String email);
    Optional<User> findByEmail(String email);
}
```

```java
// Component (유틸리티)
@Component
public class PasswordEncoder {

    public String encode(String rawPassword) {
        // 암호화 로직
        return encodedPassword;
    }

    public boolean matches(String rawPassword, String encodedPassword) {
        return encode(rawPassword).equals(encodedPassword);
    }
}
```

---

## 커스텀 스테레오타입

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Service  // @Service를 메타 어노테이션으로
@Transactional
public @interface TransactionalService {
}

// 사용
@TransactionalService
public class OrderService {
    // @Service + @Transactional 효과
}
```

---

## 주의사항

### 1. 계층에 맞는 어노테이션 사용

```java
// ❌ 잘못된 사용
@Component  // Service인데 Component 사용
public class UserService { }

@Service    // Repository인데 Service 사용
public class UserRepository { }

// ✅ 올바른 사용
@Service
public class UserService { }

@Repository
public class UserRepository { }
```

---

### 2. @Repository 예외 변환

```java
// @Repository가 있어야 예외 변환 동작
@Repository  // 필수!
public class JdbcUserRepository {
    // SQLException → DataAccessException
}

// Spring Data JPA는 자동 적용
public interface UserRepository extends JpaRepository<User, Long> { }
```

---

### 3. 순환 의존성 주의

```java
// ❌ 순환 의존성
@Service
public class AService {
    private final BService bService;  // A → B
}

@Service
public class BService {
    private final AService aService;  // B → A
}

// ✅ 설계 개선 필요
// - 공통 로직을 별도 서비스로 분리
// - 이벤트 기반으로 변경
```

---

## 빈 등록 방식 비교

### 어노테이션 방식

```java
@Service
public class UserService { }
```

---

### @Bean 방식

```java
@Configuration
public class AppConfig {

    @Bean
    public UserService userService() {
        return new UserService();
    }
}
```

---

### 언제 무엇을 사용?

```
@Component/@Service/@Repository:
- 직접 만든 클래스
- 컴포넌트 스캔으로 자동 등록

@Bean:
- 외부 라이브러리 클래스
- 생성 로직이 복잡한 경우
- 조건부 빈 등록
```

---

## 요약

| 어노테이션 | 용도 | 특수 기능 |
|-----------|-----|----------|
| @Component | 일반 컴포넌트 | 없음 |
| @Controller | 웹 컨트롤러 | MVC 핸들러 인식 |
| @Service | 비즈니스 로직 | 없음 (의미론적) |
| @Repository | 데이터 접근 | 예외 변환 |

**핵심:**
1. 모두 `@Component`를 포함 (빈 등록 기능)
2. 계층에 맞는 어노테이션 사용 권장
3. `@Repository`만 예외 변환 기능 있음
4. `@Controller`는 Spring MVC에서 핸들러로 인식
5. `@Service`는 현재 특별한 기능 없음 (의미론적 구분)