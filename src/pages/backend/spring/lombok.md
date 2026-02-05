---
title: "Lombok 사용법"
date: "2026-02-05"
tags: ["spring", "lombok", "java", "backend"]
excerpt: "Spring Boot에서 Lombok을 설정하고 활용하는 방법"
---

# Lombok 사용법

Lombok은 반복적인 보일러플레이트 코드를 어노테이션으로 자동 생성해주는 라이브러리다.

## 설정

### Gradle

```groovy
// build.gradle
dependencies {
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'

    // 테스트에서도 사용하려면
    testCompileOnly 'org.projectlombok:lombok'
    testAnnotationProcessor 'org.projectlombok:lombok'
}
```

Spring Boot의 dependency management가 버전을 관리하므로 버전 명시 불필요.

---

### Maven

```xml
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
```

---

### IDE 설정

**IntelliJ IDEA:**
1. Settings → Plugins → Lombok 설치 (최신 버전은 기본 포함)
2. Settings → Build, Execution, Deployment → Compiler → Annotation Processors
3. "Enable annotation processing" 체크

**VS Code:**
- Extension Pack for Java 설치 시 자동 지원

---

## 주요 어노테이션

### @Getter, @Setter

```java
@Getter
@Setter
public class User {
    private Long id;
    private String name;
    private String email;
}
```

**생성되는 코드:**
```java
public Long getId() { return id; }
public void setId(Long id) { this.id = id; }
public String getName() { return name; }
// ...
```

**필드 단위 적용:**
```java
public class User {
    @Getter
    private Long id;  // getter만 생성

    @Getter @Setter
    private String name;  // 둘 다 생성
}
```

**접근 제한자:**
```java
@Setter(AccessLevel.PROTECTED)
private String password;
```

| AccessLevel | 결과 |
|-------------|------|
| PUBLIC | public (기본) |
| PROTECTED | protected |
| PACKAGE | package-private |
| PRIVATE | private |
| NONE | 생성 안 함 |

---

### @ToString

```java
@ToString
public class User {
    private Long id;
    private String name;
    private String email;
}
```

**생성 결과:** `User(id=1, name=Alice, email=alice@example.com)`

**옵션:**
```java
@ToString(exclude = "password")  // 특정 필드 제외
@ToString(of = {"id", "name"})   // 특정 필드만 포함
@ToString(callSuper = true)      // 부모 클래스 포함
```

---

### @EqualsAndHashCode

```java
@EqualsAndHashCode
public class User {
    private Long id;
    private String name;
}
```

**옵션:**
```java
@EqualsAndHashCode(of = "id")           // id만으로 비교
@EqualsAndHashCode(exclude = "name")    // name 제외
@EqualsAndHashCode(callSuper = true)    // 부모 포함
```

---

### @NoArgsConstructor

```java
@NoArgsConstructor
public class User {
    private Long id;
    private String name;
}

// 사용
User user = new User();
```

**옵션:**
```java
@NoArgsConstructor(access = AccessLevel.PROTECTED)  // JPA Entity에서 자주 사용
@NoArgsConstructor(force = true)  // final 필드도 기본값으로 초기화
```

---

### @AllArgsConstructor

```java
@AllArgsConstructor
public class User {
    private Long id;
    private String name;
    private String email;
}

// 사용
User user = new User(1L, "Alice", "alice@example.com");
```

---

### @RequiredArgsConstructor

**final 필드와 @NonNull 필드**만 포함하는 생성자를 만든다.

```java
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;  // 생성자에 포함
    private final EmailService emailService;      // 생성자에 포함
    private String cache;                         // 생성자에 미포함
}

// 생성되는 코드
public UserService(UserRepository userRepository, EmailService emailService) {
    this.userRepository = userRepository;
    this.emailService = emailService;
}
```

**Spring 생성자 주입에 활용:**
```java
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    // @Autowired 없이 생성자 주입
}
```

---

### @Data

**@Getter + @Setter + @ToString + @EqualsAndHashCode + @RequiredArgsConstructor**를 합친 것.

```java
@Data
public class User {
    private Long id;
    private String name;
    private String email;
}
```

**주의:** Entity나 불변 객체에는 사용 지양. @Setter가 포함되어 있어 객체 변경이 가능해진다.

---

### @Value

**불변 객체**를 만든다. 모든 필드가 private final이 되고, Setter가 없다.

```java
@Value
public class Point {
    int x;
    int y;
}

// 사용
Point p = new Point(10, 20);
// p.setX(30);  // 불가능, Setter 없음
```

**@Data의 불변 버전:**
- 모든 필드 private final
- @Getter (Setter 없음)
- @AllArgsConstructor
- @ToString
- @EqualsAndHashCode

---

### @Builder

빌더 패턴을 자동 생성한다.

```java
@Builder
public class User {
    private Long id;
    private String name;
    private String email;
    private int age;
}

// 사용
User user = User.builder()
    .name("Alice")
    .email("alice@example.com")
    .age(25)
    .build();
```

**기본값 설정:**
```java
@Builder
public class User {
    private String name;
    @Builder.Default
    private String role = "USER";
    @Builder.Default
    private List<String> tags = new ArrayList<>();
}
```

**toBuilder:**
```java
@Builder(toBuilder = true)
public class User {
    private String name;
    private String email;
}

// 기존 객체 기반으로 새 객체 생성
User updated = user.toBuilder()
    .email("new@example.com")
    .build();
```

---

### @Slf4j

로거를 자동 생성한다.

```java
@Slf4j
public class UserService {

    public void createUser(String name) {
        log.info("Creating user: {}", name);
        log.debug("Debug message");
        log.error("Error occurred", exception);
    }
}
```

**생성되는 코드:**
```java
private static final org.slf4j.Logger log =
    org.slf4j.LoggerFactory.getLogger(UserService.class);
```

**다른 로깅 프레임워크:**
```java
@Log        // java.util.logging.Logger
@Log4j      // org.apache.log4j.Logger
@Log4j2     // org.apache.logging.log4j.Logger
@Slf4j      // org.slf4j.Logger (권장)
@CommonsLog // org.apache.commons.logging.Log
```

---

### @With

불변 객체에서 일부 필드만 변경한 새 객체를 만든다.

```java
@With
@AllArgsConstructor
public class User {
    private final Long id;
    private final String name;
    private final String email;
}

// 사용
User user = new User(1L, "Alice", "alice@example.com");
User updated = user.withEmail("new@example.com");
// User(id=1, name=Alice, email=new@example.com)
```

---

### @NonNull

null 체크 코드를 자동 생성한다.

```java
public class UserService {

    public void process(@NonNull String name) {
        // name이 null이면 NullPointerException
    }
}
```

**생성되는 코드:**
```java
public void process(String name) {
    if (name == null) {
        throw new NullPointerException("name is marked non-null but is null");
    }
    // ...
}
```

---

### @Cleanup

리소스 자동 정리.

```java
public void copyFile(String src, String dest) throws IOException {
    @Cleanup InputStream in = new FileInputStream(src);
    @Cleanup OutputStream out = new FileOutputStream(dest);
    // 메서드 끝에서 자동으로 close() 호출
}
```

try-with-resources가 더 권장됨.

---

### @SneakyThrows

checked exception을 unchecked로 던진다.

```java
@SneakyThrows
public String readFile(String path) {
    return Files.readString(Path.of(path));
    // IOException을 선언하지 않아도 됨
}
```

**주의:** 예외 처리를 숨기므로 신중하게 사용.

---

## JPA Entity에서 Lombok

### 권장 패턴

```java
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String email;

    @Builder
    public User(String name, String email) {
        this.name = name;
        this.email = email;
    }

    public void updateEmail(String email) {
        this.email = email;
    }
}
```

### 지양할 것

| 어노테이션 | 이유 |
|-----------|------|
| @Setter | 무분별한 변경 허용 |
| @Data | @Setter 포함, @EqualsAndHashCode 문제 |
| @EqualsAndHashCode | 연관 엔티티 포함 시 무한 루프 |
| @ToString | 연관 엔티티 포함 시 무한 루프, N+1 |
| @AllArgsConstructor | id 등 설정하면 안 되는 필드 포함 |

### @EqualsAndHashCode 문제

```java
@Entity
@EqualsAndHashCode  // 위험
public class User {
    @Id
    private Long id;

    @OneToMany(mappedBy = "user")
    private List<Order> orders;  // 여기서 문제
}
```

**해결:**
```java
@EqualsAndHashCode(of = "id")  // id만 사용
```

또는 직접 구현:
```java
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof User user)) return false;
    return id != null && id.equals(user.getId());
}

@Override
public int hashCode() {
    return getClass().hashCode();
}
```

### @ToString 문제

```java
@Entity
@ToString  // 위험
public class User {
    @OneToMany(mappedBy = "user")
    private List<Order> orders;  // Lazy Loading 시 N+1
}
```

**해결:**
```java
@ToString(exclude = "orders")
// 또는
@ToString(of = {"id", "name"})
```

---

## 조합 예시

### DTO

```java
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String name;
    private String email;

    public static UserResponse from(User user) {
        return UserResponse.builder()
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .build();
    }
}
```

### Service

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        log.info("Creating user: {}", request.getName());
        User user = User.builder()
            .name(request.getName())
            .email(request.getEmail())
            .build();
        return UserResponse.from(userRepository.save(user));
    }
}
```

### Request DTO

```java
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CreateUserRequest {

    @NotBlank
    private String name;

    @Email
    private String email;
}
```

---

## lombok.config

프로젝트 루트에 설정 파일을 두면 전역 설정이 가능하다.

```properties
# lombok.config
config.stopBubbling = true

# @Setter 사용 금지
lombok.setter.flagUsage = error

# @Data 사용 경고
lombok.data.flagUsage = warning

# @ToString에 callSuper 필수
lombok.toString.callSuper = call

# @EqualsAndHashCode에 callSuper 필수
lombok.equalsAndHashCode.callSuper = call

# 필드명 prefix 제거 (mName → getName)
lombok.accessors.prefix += m

# 생성자에 @Generated 추가 (JaCoCo 커버리지 제외)
lombok.addLombokGeneratedAnnotation = true
```

---

## Delombok

Lombok이 생성하는 실제 코드를 확인하거나, Lombok 없이 코드를 유지해야 할 때 사용.

### Gradle

```groovy
// build.gradle
plugins {
    id 'io.franzbecker.gradle-lombok' version '5.0.0'
}

task delombok(type: io.franzbecker.gradle.lombok.task.DelombokTask) {
    ext.outputDir = file("$buildDir/delombok")
    outputs.dir(outputDir)
    sourceSets.main.java.srcDirs.each {
        inputs.dir(it)
        args(it, "-d", outputDir)
    }
}
```

```bash
./gradlew delombok
```

### IntelliJ

1. Refactor → Delombok → All lombok annotations
2. 선택한 어노테이션만 변환도 가능

---

## 주의사항

### 순환 참조

```java
@ToString
public class A {
    private B b;  // A.toString() → B.toString() → A.toString() ...
}

@ToString
public class B {
    private A a;
}
```

### 상속 시 주의

```java
@EqualsAndHashCode
public class Parent {
    private String name;
}

@EqualsAndHashCode  // Parent 필드 미포함
public class Child extends Parent {
    private int age;
}
```

**해결:**
```java
@EqualsAndHashCode(callSuper = true)
public class Child extends Parent {
    private int age;
}
```

### final 필드와 @NoArgsConstructor

```java
@NoArgsConstructor  // 컴파일 에러
public class User {
    private final String name;  // final은 초기화 필수
}
```

**해결:**
```java
@NoArgsConstructor(force = true)  // null/0으로 초기화
```

---

## 정리

| 어노테이션 | 용도 |
|-----------|------|
| @Getter/@Setter | getter/setter 생성 |
| @ToString | toString() 생성 |
| @EqualsAndHashCode | equals(), hashCode() 생성 |
| @NoArgsConstructor | 기본 생성자 |
| @AllArgsConstructor | 모든 필드 생성자 |
| @RequiredArgsConstructor | final 필드 생성자 (DI에 유용) |
| @Data | 위 조합 (Entity 지양) |
| @Value | 불변 객체 |
| @Builder | 빌더 패턴 |
| @Slf4j | 로거 생성 |
| @With | 일부 필드 변경한 복사본 |

**Entity:** `@Getter` + `@NoArgsConstructor(access = PROTECTED)` + `@Builder`
**Service:** `@RequiredArgsConstructor` + `@Slf4j`
**DTO:** `@Getter` + `@Builder` + `@NoArgsConstructor` + `@AllArgsConstructor`
