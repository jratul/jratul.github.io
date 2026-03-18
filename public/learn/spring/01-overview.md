---
title: "프로젝트 구조와 동작 원리"
order: 1
---

## Spring Boot란

Spring Framework 위에서 동작하는 백엔드 프레임워크입니다. 복잡한 XML 설정 없이 애너테이션 기반으로 빠르게 웹 서버를 만들 수 있습니다.

```
Spring Boot = Spring Framework + 자동 설정(Auto Configuration) + 내장 서버(Tomcat)
```

## 프로젝트 구조

```
src/
├── main/
│   ├── java/com/example/myapp/
│   │   ├── MyAppApplication.java   ← 진입점
│   │   ├── controller/             ← HTTP 요청/응답
│   │   ├── service/                ← 비즈니스 로직
│   │   ├── repository/             ← DB 접근
│   │   ├── entity/                 ← DB 테이블 매핑
│   │   └── dto/                    ← 데이터 전달 객체
│   └── resources/
│       ├── application.yml         ← 설정 파일
│       └── static/                 ← 정적 파일
└── test/
    └── java/com/example/myapp/     ← 테스트 코드
```

## 요청 흐름

```
HTTP 요청
    ↓
DispatcherServlet (프론트 컨트롤러)
    ↓
@Controller / @RestController
    ↓
@Service
    ↓
@Repository
    ↓
Database
    ↓
HTTP 응답
```

## 진입점

```java
@SpringBootApplication  // @Configuration + @EnableAutoConfiguration + @ComponentScan
public class MyAppApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyAppApplication.class, args);
    }
}
```

`@SpringBootApplication`이 붙은 클래스가 있는 패키지와 그 하위 패키지를 자동으로 스캔합니다.

## 의존성 주입 (DI)

Spring이 객체(Bean)의 생성과 주입을 관리합니다.

```java
@Service
public class UserService {
    private final UserRepository userRepository;

    // 생성자 주입 (권장)
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}
```

`@Autowired`를 생략해도 생성자가 하나면 자동으로 주입됩니다.

## application.yml

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
    password: secret
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true

logging:
  level:
    com.example: DEBUG
```

## 주요 의존성 (build.gradle)

```groovy
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'       // 웹 MVC
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'  // JPA
    implementation 'org.springframework.boot:spring-boot-starter-validation' // 입력 검증
    implementation 'mysql:mysql-connector-java'                              // MySQL

    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
```
