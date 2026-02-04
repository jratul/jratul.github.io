---
title: 'Spring Boot 기초'
date: '2026-02-04'
tags: ['spring', 'spring-boot', 'java', 'backend']
excerpt: 'Spring Boot의 핵심 개념과 동작 원리'
---

# Spring Boot 기초

## Spring Boot란

Spring Framework 기반의 애플리케이션을 빠르게 만들 수 있도록 돕는 도구다. 복잡한 설정을 자동화하고, 내장 서버를 제공한다.

```
Spring Framework: 직접 설정해야 할 것이 많음
Spring Boot: 설정 자동화 + 내장 서버 + 의존성 관리
```

---

## 프로젝트 구조

```
src/
├── main/
│   ├── java/com/example/demo/
│   │   ├── DemoApplication.java      # 진입점
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   └── domain/
│   └── resources/
│       ├── application.yml            # 설정 파일
│       ├── static/                    # 정적 리소스
│       └── templates/                 # 템플릿
└── test/
    └── java/com/example/demo/
```

---

## @SpringBootApplication

진입점 클래스에 붙이는 어노테이션이다. 세 가지 어노테이션의 조합이다.

```java
@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

```java
// @SpringBootApplication = 아래 세 가지의 조합
@SpringBootConfiguration  // @Configuration과 동일
@EnableAutoConfiguration  // 자동 설정 활성화
@ComponentScan            // 컴포넌트 스캔
```

| 어노테이션 | 역할 |
|-----------|------|
| @SpringBootConfiguration | 이 클래스가 설정 클래스임을 표시 |
| @EnableAutoConfiguration | classpath 기반으로 자동 설정 |
| @ComponentScan | 현재 패키지 하위의 Bean 자동 등록 |

---

## 자동 설정 (Auto Configuration)

Spring Boot의 핵심 기능이다. classpath에 있는 라이브러리를 감지해서 자동으로 설정한다.

```
spring-boot-starter-web이 있으면
→ DispatcherServlet 자동 설정
→ 내장 Tomcat 자동 설정
→ Jackson (JSON 변환) 자동 설정

spring-boot-starter-data-jpa가 있으면
→ DataSource 자동 설정
→ EntityManager 자동 설정
→ TransactionManager 자동 설정
```

### 동작 원리

```
1. @EnableAutoConfiguration 감지
2. META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports 읽기
3. 조건(@Conditional)에 따라 설정 적용/미적용
```

### 조건부 설정

```java
@Configuration
@ConditionalOnClass(DataSource.class)          // 클래스가 있을 때만
@ConditionalOnProperty(name = "spring.datasource.url")  // 속성이 있을 때만
public class DataSourceAutoConfiguration {
    // ...
}
```

| 조건 어노테이션 | 의미 |
|----------------|------|
| @ConditionalOnClass | 특정 클래스가 classpath에 있을 때 |
| @ConditionalOnMissingBean | 해당 Bean이 없을 때 |
| @ConditionalOnProperty | 특정 설정값이 있을 때 |

---

## Starter 의존성

관련 라이브러리를 묶어서 제공하는 의존성 패키지다.

```xml
<!-- 웹 애플리케이션 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

### 주요 Starter

| Starter | 포함 내용 |
|---------|----------|
| spring-boot-starter-web | Tomcat, Spring MVC, Jackson |
| spring-boot-starter-data-jpa | Hibernate, Spring Data JPA |
| spring-boot-starter-security | Spring Security |
| spring-boot-starter-test | JUnit, Mockito, AssertJ |
| spring-boot-starter-validation | Hibernate Validator |

### Starter가 하는 일

```
spring-boot-starter-web 하나만 추가하면:
├── spring-boot-starter (core)
├── spring-boot-starter-tomcat
├── spring-web
├── spring-webmvc
└── jackson-databind
```

직접 하나하나 의존성을 추가할 필요가 없다.

---

## 설정 파일

### application.yml

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
    password: secret
    driver-class-name: com.mysql.cj.jdbc.Driver

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true

logging:
  level:
    root: INFO
    com.example: DEBUG
```

### 프로파일

환경별로 설정을 분리할 수 있다.

```yaml
# application.yml (공통)
spring:
  profiles:
    active: dev

---
# application-dev.yml
server:
  port: 8080
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb

---
# application-prod.yml
server:
  port: 80
spring:
  datasource:
    url: jdbc:mysql://prod-db:3306/mydb
```

```bash
# 실행 시 프로파일 지정
java -jar app.jar --spring.profiles.active=prod
```

### @ConfigurationProperties

설정값을 타입 안전하게 바인딩한다.

```java
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String name;
    private int maxRetry;
    private Duration timeout;
    // getter, setter
}
```

```yaml
app:
  name: my-service
  max-retry: 3
  timeout: 5s
```

---

## 계층 구조

```
Client → Controller → Service → Repository → Database
```

### Controller

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserResponse> getUsers() {
        return userService.findAll();
    }

    @GetMapping("/{id}")
    public UserResponse getUser(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@RequestBody @Valid CreateUserRequest request) {
        return userService.create(request);
    }
}
```

### Service

```java
@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserResponse> findAll() {
        return userRepository.findAll().stream()
                .map(UserResponse::from)
                .toList();
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        User user = User.of(request.name(), request.email());
        return UserResponse.from(userRepository.save(user));
    }
}
```

### Repository

```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findByNameContaining(String keyword);
}
```

---

## 내장 서버

별도의 WAS 설치 없이 JAR 파일로 실행할 수 있다.

```bash
# 빌드
./gradlew bootJar

# 실행
java -jar build/libs/demo-0.0.1.jar
```

### 지원 서버

| 서버 | Starter | 특징 |
|------|---------|------|
| Tomcat | 기본 포함 | 가장 널리 사용 |
| Jetty | starter-jetty | 경량 |
| Undertow | starter-undertow | 고성능 |

```xml
<!-- Tomcat 대신 Undertow 사용 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
    </exclusions>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-undertow</artifactId>
</dependency>
```

---

## Actuator

애플리케이션의 상태를 모니터링할 수 있는 엔드포인트를 제공한다.

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, info, metrics, env
```

| 엔드포인트 | 용도 |
|-----------|------|
| /actuator/health | 헬스 체크 |
| /actuator/info | 앱 정보 |
| /actuator/metrics | 메트릭 |
| /actuator/env | 환경 변수 |

---

## Spring vs Spring Boot

| 구분 | Spring | Spring Boot |
|------|--------|-------------|
| 설정 | XML 또는 Java Config 직접 작성 | 자동 설정 |
| 서버 | 외부 WAS 필요 | 내장 서버 |
| 의존성 | 개별 관리 | Starter로 묶음 |
| 실행 | WAR 배포 | JAR 실행 |
| 생산성 | 낮음 | 높음 |

---

## 정리

- **자동 설정**: classpath 기반으로 필요한 설정을 자동 적용
- **Starter**: 관련 의존성을 묶어서 제공
- **내장 서버**: WAS 없이 JAR로 바로 실행
- **프로파일**: 환경별 설정 분리
- **Actuator**: 운영 모니터링 엔드포인트 제공
- Spring Boot는 Spring Framework를 대체하는 것이 아니라, 편하게 사용하도록 감싸는 도구다
