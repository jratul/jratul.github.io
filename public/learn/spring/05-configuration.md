---
title: "설정 관리"
order: 5
---

## application.yml 구조

```yaml
# 서버 설정
server:
  port: 8080
  servlet:
    context-path: /api

# Spring 설정
spring:
  application:
    name: my-service

  # 데이터베이스
  datasource:
    url: jdbc:mysql://localhost:3306/mydb?useSSL=false&serverTimezone=Asia/Seoul
    username: root
    password: secret
    driver-class-name: com.mysql.cj.jdbc.Driver

  # JPA
  jpa:
    hibernate:
      ddl-auto: validate  # 운영: validate, 개발: update 또는 create-drop
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        default_batch_fetch_size: 100

# 커스텀 설정
app:
  jwt:
    secret: my-secret-key
    expiration: 86400000
  upload:
    max-size: 10MB
```

## Profile

환경(개발, 운영)에 따라 다른 설정을 적용합니다.

```
application.yml          ← 공통 설정
application-dev.yml      ← 개발 환경
application-prod.yml     ← 운영 환경
application-test.yml     ← 테스트 환경
```

```yaml
# application.yml
spring:
  profiles:
    active: dev  # 기본 프로파일

app:
  name: My App  # 공통

---
# application-dev.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb  # 인메모리 DB
  jpa:
    hibernate:
      ddl-auto: create-drop

logging:
  level:
    com.example: DEBUG

---
# application-prod.yml
spring:
  datasource:
    url: ${DB_URL}  # 환경변수에서 읽기
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate

logging:
  level:
    com.example: WARN
```

프로파일 활성화:
```bash
# 실행 시 프로파일 지정
java -jar app.jar --spring.profiles.active=prod

# 환경변수로 지정
SPRING_PROFILES_ACTIVE=prod java -jar app.jar
```

## @ConfigurationProperties

설정값을 타입 안전하게 클래스로 매핑합니다.

```yaml
app:
  jwt:
    secret: my-secret
    expiration: 86400000
  mail:
    host: smtp.gmail.com
    port: 587
    from: noreply@example.com
```

```java
@ConfigurationProperties(prefix = "app.jwt")
@Component
public class JwtProperties {
    private String secret;
    private long expiration;

    // Getter / Setter
}

@ConfigurationProperties(prefix = "app.mail")
@Component
public class MailProperties {
    private String host;
    private int port;
    private String from;
}

// 사용
@Service
public class JwtService {
    private final JwtProperties jwtProperties;

    public JwtService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }

    public String createToken(String subject) {
        return Jwts.builder()
            .setSubject(subject)
            .setExpiration(new Date(System.currentTimeMillis() + jwtProperties.getExpiration()))
            .signWith(Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes()))
            .compact();
    }
}
```

## 환경변수와 비밀 관리

운영 환경에서 민감한 정보는 코드에 포함하면 안 됩니다.

```yaml
# ❌ 코드에 직접 포함
spring:
  datasource:
    password: my-real-password

# ✅ 환경변수로 분리
spring:
  datasource:
    password: ${DB_PASSWORD}

# ✅ 기본값 지정
spring:
  datasource:
    password: ${DB_PASSWORD:local-dev-password}
```

`.env` 파일이나 AWS Secrets Manager, Kubernetes Secret 등으로 주입합니다.

## @Value

단순한 설정값 주입에 사용합니다.

```java
@Component
public class AppConfig {
    @Value("${app.name}")
    private String appName;

    @Value("${app.jwt.expiration:86400000}")  // 기본값 설정
    private long jwtExpiration;

    @Value("${spring.profiles.active}")
    private String activeProfile;
}
```
