---
title: "프로젝트 구조와 동작 원리"
order: 1
---

## Spring Boot란 무엇인가요?

Spring Boot는 자바(Java)로 웹 서버를 만들 때 쓰는 프레임워크입니다. 프레임워크란 "집 짓는 틀"과 같아서, 틀만 있으면 지붕, 벽, 창문을 어디에 어떻게 달지 일일이 고민하지 않아도 됩니다. Spring Boot가 그 틀을 제공해 주는 것입니다.

예전 Spring Framework는 XML 설정 파일을 수십 개 작성해야 했습니다. Spring Boot는 그 복잡한 설정을 대부분 자동으로 처리해 줍니다. 개발자는 실제 비즈니스 로직에만 집중할 수 있게 됩니다.

```
Spring Boot = Spring Framework + 자동 설정(Auto Configuration) + 내장 서버(Tomcat)
```

- **Spring Framework**: 자바 웹 개발의 핵심 기반
- **자동 설정(Auto Configuration)**: 의존성만 추가하면 알아서 설정해 줌
- **내장 서버(Tomcat)**: 별도의 웹 서버 설치 없이 바로 실행 가능

---

## 프로젝트 구조

Spring Boot 프로젝트를 처음 생성하면 아래와 같은 폴더 구조가 만들어집니다. 각 폴더가 어떤 역할을 하는지 이해하는 것이 중요합니다.

```
src/
├── main/
│   ├── java/com/example/myapp/
│   │   ├── MyAppApplication.java   ← 앱 실행 진입점 (main 메서드가 여기 있음)
│   │   ├── controller/             ← 사용자 요청을 받아 응답하는 곳
│   │   ├── service/                ← 실제 비즈니스 로직이 들어가는 곳
│   │   ├── repository/             ← 데이터베이스 접근 코드
│   │   ├── entity/                 ← 데이터베이스 테이블과 매핑되는 자바 클래스
│   │   └── dto/                    ← 계층 간 데이터를 전달하는 객체
│   └── resources/
│       ├── application.yml         ← DB 주소, 포트 등 설정 파일
│       └── static/                 ← CSS, JS, 이미지 등 정적 파일
└── test/
    └── java/com/example/myapp/     ← 테스트 코드 (실제 코드와 같은 구조)
```

### 각 폴더 역할 비유

식당에 비유해 보겠습니다:
- **controller**: 홀 서빙 직원 — 손님(클라이언트)의 주문을 받아 주방에 전달하고 음식을 서빙
- **service**: 주방 요리사 — 실제로 요리(비즈니스 로직)를 담당
- **repository**: 식재료 창고 담당자 — 냉장고(데이터베이스)에서 재료를 꺼내거나 넣음
- **entity**: 식재료 자체 — 데이터베이스 테이블의 한 행(row)을 자바 객체로 표현
- **dto**: 주문서 — 계층 간 필요한 데이터만 담아 전달

---

## 요청이 처리되는 흐름

사용자가 웹 브라우저에서 URL을 입력하면 Spring Boot 안에서 어떤 일이 일어날까요?

```
사용자가 브라우저에서 요청
         ↓
DispatcherServlet (교통 경찰관 역할 — 요청을 올바른 Controller로 안내)
         ↓
@Controller / @RestController (요청을 받는 창구)
         ↓
@Service (비즈니스 로직 처리)
         ↓
@Repository (데이터베이스 조회/저장)
         ↓
Database
         ↓
(결과가 역방향으로 올라와서 사용자에게 응답)
```

**DispatcherServlet**은 모든 HTTP 요청의 진입점입니다. "프론트 컨트롤러(Front Controller)"라고도 부릅니다. 예를 들어 `/api/users`로 요청이 오면 그에 맞는 Controller 메서드를 찾아 실행합니다.

---

## 진입점 (@SpringBootApplication)

모든 Spring Boot 앱은 `main()` 메서드가 있는 클래스 하나에서 시작합니다.

```java
@SpringBootApplication  // 이 어노테이션 하나에 세 가지가 들어있음
public class MyAppApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyAppApplication.class, args);  // 서버 시작!
    }
}
```

`@SpringBootApplication`은 실제로 세 개의 어노테이션을 합친 것입니다:

| 어노테이션 | 역할 |
|------------|------|
| `@Configuration` | 이 클래스가 설정 클래스임을 표시 |
| `@EnableAutoConfiguration` | 필요한 설정을 자동으로 활성화 |
| `@ComponentScan` | 같은 패키지와 하위 패키지의 Bean을 자동으로 찾아 등록 |

---

## 의존성 주입(DI)이란?

의존성 주입은 Spring의 가장 핵심 개념입니다. 처음에는 어렵게 느껴지지만, 비유를 들으면 쉽게 이해할 수 있습니다.

**비유: 커피 머신과 원두**

```java
// ❌ DI 없는 방식 — CoffeeMachine이 직접 원두를 만듦 (강한 결합)
public class CoffeeMachine {
    private ArabicaBeans beans = new ArabicaBeans();  // 직접 생성 — 바꾸기 어려움
}

// ✅ DI 방식 — 외부에서 원두를 주입받음 (느슨한 결합)
public class CoffeeMachine {
    private CoffeeBeans beans;  // 어떤 원두든 받을 수 있음

    public CoffeeMachine(CoffeeBeans beans) {
        this.beans = beans;  // 외부에서 주입
    }
}
```

Spring이 `UserService`를 생성할 때, `UserRepository`가 필요하다는 것을 알고 자동으로 만들어서 넣어줍니다:

```java
@Service
public class UserService {
    private final UserRepository userRepository;

    // 생성자 주입 — Spring이 UserRepository를 자동으로 만들어 넣어줌
    // @Autowired 생략 가능 (생성자가 하나일 때)
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public void createUser(String name, String email) {
        // userRepository를 직접 만들지 않아도 사용 가능
        User user = new User(name, email);
        userRepository.save(user);
    }
}
```

**왜 의존성 주입이 좋은가?**
1. **테스트가 쉬워진다**: 실제 DB 대신 가짜(Mock) 객체를 넣어서 테스트 가능
2. **유연성**: `UserRepository` 구현체를 바꿔도 `UserService` 코드는 변경 불필요
3. **객체 생성의 책임 분리**: 개발자가 직접 객체 생성을 관리하지 않아도 됨

---

## Bean이란?

Spring이 관리하는 객체를 **Bean**이라고 합니다. `@Service`, `@Repository`, `@Controller`, `@Component` 중 하나를 붙이면 Spring이 해당 클래스의 인스턴스(Bean)를 만들어 관리합니다.

```java
@Service   // "나는 서비스 Bean이에요" 라고 Spring에 알림
public class UserService {
    // Spring이 이 클래스의 인스턴스를 딱 하나 만들어서 관리함 (싱글톤)
}

@Repository   // "나는 저장소 Bean이에요"
public class UserRepository {
}

@Component    // "나는 그냥 Spring이 관리해야 할 Bean이에요" (더 일반적)
public class EmailSender {
}
```

---

## application.yml

`application.yml`은 Spring Boot 앱의 중앙 설정 파일입니다. 데이터베이스 주소, 서버 포트, 로그 레벨 등 환경 설정을 한 곳에 모아 관리합니다.

```yaml
server:
  port: 8080          # 서버가 8080번 포트에서 실행됨

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb    # MySQL DB 주소
    username: root                           # DB 접속 아이디
    password: secret                         # DB 접속 비밀번호 (운영 환경에선 환경변수 사용!)
  jpa:
    hibernate:
      ddl-auto: update    # 앱 시작 시 엔티티에 맞춰 DB 테이블 자동 수정
    show-sql: true        # 실행되는 SQL을 콘솔에 출력 (개발 시 유용)

logging:
  level:
    com.example: DEBUG    # com.example 패키지의 로그를 DEBUG 레벨로 출력
```

### ddl-auto 옵션 설명

| 옵션 | 동작 | 사용 환경 |
|------|------|----------|
| `create` | 앱 시작마다 테이블 새로 생성 (기존 데이터 삭제) | 초기 개발 |
| `create-drop` | 시작 시 생성, 종료 시 삭제 | 테스트 |
| `update` | 엔티티 변경 사항만 반영 | 개발 |
| `validate` | 엔티티와 테이블이 일치하는지 검증 (수정 안 함) | 운영 |
| `none` | 아무것도 안 함 | 운영 |

---

## 주요 의존성 (build.gradle)

Gradle은 자바 프로젝트의 빌드 도구입니다. `build.gradle`에 사용할 라이브러리를 적으면 자동으로 다운로드합니다.

```groovy
dependencies {
    // 웹 MVC — @Controller, @RestController, HTTP 처리 등
    implementation 'org.springframework.boot:spring-boot-starter-web'

    // JPA — 자바 객체와 DB 테이블 매핑
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'

    // Validation — @NotBlank, @Email 같은 입력값 검증
    implementation 'org.springframework.boot:spring-boot-starter-validation'

    // MySQL 드라이버 — Java에서 MySQL에 연결하기 위한 드라이버
    runtimeOnly 'com.mysql:mysql-connector-j'

    // 테스트 — JUnit, MockMvc 등 테스트 도구
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
```

---

## 첫 번째 API 만들어보기

Spring Boot로 "Hello World" API를 만들어 봅시다.

```java
// src/main/java/com/example/myapp/controller/HelloController.java

@RestController   // HTTP 요청을 받고 JSON으로 응답하는 컨트롤러
public class HelloController {

    // GET /hello 요청이 오면 이 메서드가 실행됨
    @GetMapping("/hello")
    public String hello() {
        return "Hello, Spring Boot!";
    }

    // GET /greet?name=Alice 요청이 오면
    @GetMapping("/greet")
    public String greet(@RequestParam String name) {
        return "안녕하세요, " + name + "님!";
    }

    // GET /users/42 요청이 오면 (42가 id로 전달됨)
    @GetMapping("/users/{id}")
    public String getUser(@PathVariable Long id) {
        return "사용자 ID: " + id;
    }
}
```

서버를 실행한 후 브라우저에서 `http://localhost:8080/hello`를 열면 "Hello, Spring Boot!"가 보입니다.

---

## 정리

Spring Boot 앱은 이렇게 동작합니다:

1. `main()` 메서드 실행 → `SpringApplication.run()` 호출
2. Spring이 `@ComponentScan`으로 모든 Bean을 찾아 등록
3. 의존성 주입(DI)으로 Bean 간 의존관계 연결
4. 내장 Tomcat 서버 시작 (기본 포트 8080)
5. 사용자 요청 → DispatcherServlet → Controller → Service → Repository → DB
6. DB 응답 → Repository → Service → Controller → 사용자에게 JSON 응답
