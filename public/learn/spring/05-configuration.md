---
title: "설정 관리"
order: 5
---

## 설정 파일이 왜 필요한가요?

코드 안에 설정값을 직접 하드코딩하면 어떤 문제가 생길까요?

```java
// ❌ 코드에 직접 설정값을 박아두면...
public class DatabaseConfig {
    String url = "jdbc:mysql://localhost:3306/mydb";   // 개발용 DB 주소
    String password = "1234";  // 비밀번호가 소스코드에 노출!
}
```

문제점:
1. **보안**: DB 비밀번호가 코드와 함께 Git에 올라감
2. **유연성**: 개발/운영 환경마다 DB 주소가 달라지는데 코드를 바꿔야 함
3. **관리**: 포트, 경로 등이 여러 파일에 흩어져 있으면 수정이 어려움

`application.yml`에 설정을 모으면 이런 문제가 해결됩니다.

---

## application.yml 기본 구조

```yaml
# 서버 설정
server:
  port: 8080                    # 서버 실행 포트 (기본: 8080)
  servlet:
    context-path: /api          # 모든 URL 앞에 /api가 붙음 (/api/users, /api/orders)

# Spring 애플리케이션 기본 설정
spring:
  application:
    name: my-service            # 서비스 이름 (로그, 모니터링에 표시)

  # 데이터베이스 설정
  datasource:
    url: jdbc:mysql://localhost:3306/mydb?useSSL=false&serverTimezone=Asia/Seoul
    username: root
    password: secret            # 운영환경에서는 절대 직접 작성 금지!
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:                     # 커넥션 풀 설정
      maximum-pool-size: 10     # 최대 커넥션 수

  # JPA 설정
  jpa:
    hibernate:
      ddl-auto: update          # create/create-drop/update/validate/none
    show-sql: true              # 실행 SQL 출력 (개발 시 유용, 운영에선 false)
    properties:
      hibernate:
        format_sql: true        # SQL 보기 좋게 포맷
        default_batch_fetch_size: 100  # IN 절로 배치 조회 (N+1 완화)

# 로깅 설정
logging:
  level:
    com.example: DEBUG          # 내 코드는 DEBUG 레벨
    org.hibernate.SQL: DEBUG    # SQL 출력
    root: INFO                  # 나머지는 INFO

# 커스텀 설정 (내가 만든 설정값)
app:
  jwt:
    secret: my-secret-key
    expiration: 86400000        # 24시간 (ms)
  upload:
    max-size: 10MB
    allowed-types: image/jpeg,image/png
```

### ddl-auto 옵션 설명

| 옵션 | 동작 | 사용 환경 |
|------|------|----------|
| `create` | 시작마다 테이블 새로 생성 (기존 데이터 삭제!) | 초기 개발 |
| `create-drop` | 시작 시 생성, 종료 시 삭제 | 테스트 |
| `update` | 엔티티 변경 사항만 반영 | 개발 |
| `validate` | 엔티티와 DB가 일치하는지 검증만 (수정 안 함) | 운영 준비 |
| `none` | 아무것도 안 함 | 운영 |

---

## Profile — 환경별 다른 설정

개발 환경과 운영 환경은 DB 주소, 로그 레벨 등이 다릅니다. Profile로 환경별 설정을 분리합니다.

```
파일 구조:
application.yml           ← 공통 설정 (모든 환경에서 공유)
application-dev.yml       ← 개발 환경 설정
application-prod.yml      ← 운영 환경 설정
application-test.yml      ← 테스트 환경 설정
```

```yaml
# application.yml (공통 설정)
spring:
  profiles:
    active: dev              # 기본값: 개발 환경 (환경변수로 덮어쓰기 가능)

app:
  name: My Application      # 모든 환경에서 공통
```

```yaml
# application-dev.yml (개발 환경)
spring:
  datasource:
    url: jdbc:h2:mem:testdb   # 인메모리 DB (빠르고 편리)
    driver-class-name: org.h2.Driver
  h2:
    console:
      enabled: true           # H2 웹 콘솔 활성화 (http://localhost:8080/h2-console)
  jpa:
    hibernate:
      ddl-auto: create-drop   # 매번 새로 만들기

logging:
  level:
    com.example: DEBUG        # 개발 시 상세 로그
```

```yaml
# application-prod.yml (운영 환경)
spring:
  datasource:
    url: ${DB_URL}            # 환경변수에서 읽기 (절대 직접 작성 금지!)
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate      # 검증만 (테이블 변경 불가)
    show-sql: false           # 운영에서는 SQL 출력 끄기

logging:
  level:
    com.example: WARN         # 경고 이상만 로그 (성능)
```

Profile 활성화 방법:

```bash
# 방법 1: 실행 시 파라미터
java -jar app.jar --spring.profiles.active=prod

# 방법 2: 환경변수
export SPRING_PROFILES_ACTIVE=prod
java -jar app.jar

# 방법 3: Docker 환경변수
docker run -e SPRING_PROFILES_ACTIVE=prod myapp:latest
```

---

## @ConfigurationProperties — 설정값을 클래스로 묶기

`@Value`로 하나씩 주입하면 관련 설정이 흩어집니다. `@ConfigurationProperties`로 묶어서 관리하면 훨씬 편리합니다.

```yaml
# application.yml
app:
  jwt:
    secret: my-super-secret-key-that-is-long-enough
    expiration: 86400000      # 24시간
    refresh-expiration: 604800000  # 7일
  mail:
    host: smtp.gmail.com
    port: 587
    username: noreply@example.com
    password: ${MAIL_PASSWORD}
    from: "My Service <noreply@example.com>"
```

```java
// JWT 설정을 한 클래스로 묶기
@ConfigurationProperties(prefix = "app.jwt")  // app.jwt 아래 설정을 자동 바인딩
@Component                                      // Bean으로 등록
public class JwtProperties {
    private String secret;
    private long expiration;
    private long refreshExpiration;  // refresh-expiration → camelCase 자동 변환

    // Getter / Setter (Spring이 바인딩할 때 필요)
    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }

    public long getExpiration() { return expiration; }
    public void setExpiration(long expiration) { this.expiration = expiration; }

    public long getRefreshExpiration() { return refreshExpiration; }
    public void setRefreshExpiration(long refreshExpiration) {
        this.refreshExpiration = refreshExpiration;
    }
}

// 메일 설정
@ConfigurationProperties(prefix = "app.mail")
@Component
public class MailProperties {
    private String host;
    private int port;
    private String username;
    private String password;
    private String from;

    // Getter / Setter 생략...
}

// 사용 — 생성자 주입으로 사용
@Service
public class JwtService {
    private final JwtProperties jwtProperties;  // 설정 클래스 주입

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

### 설정값 유효성 검증

잘못된 설정값이 들어오면 앱 시작 시 바로 오류가 나도록 검증을 추가할 수 있습니다:

```java
@ConfigurationProperties(prefix = "app.jwt")
@Component
@Validated  // 유효성 검증 활성화
public class JwtProperties {

    @NotBlank(message = "JWT secret은 필수입니다.")
    @Size(min = 32, message = "JWT secret은 32자 이상이어야 합니다.")
    private String secret;

    @Positive(message = "만료 시간은 양수여야 합니다.")
    private long expiration = 86400000L;  // 기본값 설정
}
```

---

## @Value — 단순한 설정값 주입

`@ConfigurationProperties`보다 간단하게 쓸 때 사용합니다:

```java
@Component
public class AppConfig {

    // 기본적인 값 주입
    @Value("${app.name}")
    private String appName;

    // 기본값 지정 (설정이 없을 때 사용됨)
    @Value("${app.jwt.expiration:86400000}")
    private long jwtExpiration;

    // 활성 Profile 주입
    @Value("${spring.profiles.active:unknown}")
    private String activeProfile;
}
```

`@Value` vs `@ConfigurationProperties` 선택 기준:

```
- 설정값이 1~2개: @Value
- 설정값이 여러 개로 그룹화: @ConfigurationProperties
- 유효성 검증이 필요: @ConfigurationProperties + @Validated
- 설정값을 IDE 자동완성으로 편하게 쓰고 싶다: @ConfigurationProperties
```

---

## 환경변수와 비밀 관리

운영 환경에서 민감한 정보(DB 비밀번호, API 키 등)는 코드에 절대 포함하면 안 됩니다:

```yaml
# ❌ 절대 하면 안 됨
spring:
  datasource:
    password: my-real-password   # Git에 올라가면 보안 사고!

# ✅ 환경변수로 분리
spring:
  datasource:
    password: ${DB_PASSWORD}     # 환경변수 DB_PASSWORD의 값을 사용

# ✅ 기본값도 지정 가능 (로컬 개발용)
spring:
  datasource:
    password: ${DB_PASSWORD:local-dev-password}  # 환경변수 없으면 기본값 사용
```

실제 환경에서는 이런 방법들을 씁니다:

```bash
# 1. 직접 환경변수 설정 (Linux/Mac)
export DB_PASSWORD=my-secret
java -jar app.jar

# 2. .env 파일 (로컬 개발, Git에 추가하지 않음!)
# .env 파일 내용:
DB_PASSWORD=my-secret
JWT_SECRET=my-jwt-secret

# 3. Kubernetes Secret (운영 환경)
kubectl create secret generic app-secrets \
  --from-literal=DB_PASSWORD=my-secret

# 4. AWS Secrets Manager, Azure Key Vault, HashiCorp Vault 등
```

`.gitignore`에 반드시 추가:

```
.env
application-prod.yml    # 만약 prod 설정을 별도 파일로 관리한다면
secrets.yml
```

---

## 계층형 설정 우선순위

Spring Boot는 여러 곳에서 설정을 읽고, 우선순위가 있습니다 (숫자가 높을수록 우선):

```
1. application.yml (가장 낮음)
2. application-{profile}.yml
3. 환경변수 (SPRING_DATASOURCE_URL)
4. 커맨드라인 인수 (--spring.datasource.url=...) (가장 높음)
```

실용적인 예:

```bash
# application.yml에 기본값 설정
# application-dev.yml에 개발 설정
# 커맨드라인으로 특정 값만 덮어쓰기
java -jar app.jar --server.port=9090 --spring.profiles.active=prod
```

---

## 자주 하는 실수들

```java
// ❌ 실수 1: 설정값이 null이 될 수 있음을 무시
@Value("${app.feature.enabled}")  // 설정이 없으면 NoSuchBeanDefinitionException!
private boolean featureEnabled;

// ✅ 해결: 기본값 지정
@Value("${app.feature.enabled:false}")  // 없으면 false
private boolean featureEnabled;

// ❌ 실수 2: static 필드에 @Value
@Component
public class AppConfig {
    @Value("${app.name}")
    private static String appName;  // static 필드는 주입 안 됨!
    // appName은 null
}

// ✅ 해결: 인스턴스 필드 사용
@Component
public class AppConfig {
    @Value("${app.name}")
    private String appName;  // 정상 주입됨
}

// ❌ 실수 3: 설정을 너무 세분화
@Value("${db.host}") private String dbHost;
@Value("${db.port}") private int dbPort;
@Value("${db.name}") private String dbName;
// 관련된 설정이 3개의 필드로 흩어짐

// ✅ 해결: @ConfigurationProperties로 그룹화
@ConfigurationProperties(prefix = "db")
public class DatabaseProperties {
    private String host;
    private int port;
    private String name;
}
```
