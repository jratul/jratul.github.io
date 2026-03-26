---
title: "Actuator와 모니터링"
order: 15
---

## Actuator란?

Spring Boot Actuator는 **운영 중인 애플리케이션의 상태를 들여다보는 창문**입니다.

**자동차 계기판** 비유:

```
계기판 없는 자동차: 속도, 연료, 엔진 온도를 알 수 없음 → 언제 퍼질지 모름
Actuator 없는 서버: 메모리, CPU, 연결 상태를 알 수 없음 → 장애 예측 불가

Actuator = 서버 계기판
- 서버가 잘 돌아가는지 (health)
- 메모리는 얼마나 쓰는지 (metrics)
- 어떤 Bean이 등록됐는지 (beans)
- 로그 레벨을 실시간으로 변경 (loggers)
```

```groovy
// build.gradle
implementation 'org.springframework.boot:spring-boot-starter-actuator'
```

---

## 기본 설정

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health, info, metrics, loggers, env
        # include: "*"  # 전체 노출 (개발 환경에서만! 운영에서는 위험)
      base-path: /actuator  # 기본 접두어 (생략 가능)
  endpoint:
    health:
      show-details: always    # 상세 헬스 정보 표시 (DB, Redis 상태 등)
      show-components: always
    shutdown:
      enabled: false  # POST /actuator/shutdown — 운영에서는 반드시 false!
  info:
    env:
      enabled: true   # application.yml의 info.* 속성 노출
    build:
      enabled: true   # 빌드 정보 (시간, 버전 등)
    git:
      enabled: true   # git 커밋 정보
      mode: full
```

---

## 주요 엔드포인트

```
GET /actuator/health           애플리케이션 상태 (UP/DOWN)
GET /actuator/info             빌드/버전 정보
GET /actuator/metrics          메트릭 목록
GET /actuator/metrics/{name}   특정 메트릭 값 (예: jvm.memory.used)
GET /actuator/loggers          로거 목록 및 현재 레벨
POST /actuator/loggers/{name}  로그 레벨 동적 변경 (재배포 없이!)
GET /actuator/env              환경 변수 목록
GET /actuator/beans            등록된 Spring Bean 목록
GET /actuator/mappings         URL 매핑 목록
GET /actuator/threaddump       스레드 덤프 (성능 문제 분석)
GET /actuator/heapdump         힙 덤프 다운로드 (메모리 분석)
```

---

## Health Indicator

```json
// GET /actuator/health 응답 예시
{
  "status": "UP",
  "components": {
    "db": {
      "status": "UP",
      "details": { "database": "PostgreSQL", "validationQuery": "isValid()" }
    },
    "redis": {
      "status": "UP",
      "details": { "version": "7.0.12" }
    },
    "diskSpace": {
      "status": "UP",
      "details": { "total": 499963174912, "free": 91543560192, "threshold": 10485760 }
    }
  }
}
```

커스텀 Health Indicator — 외부 API 연결 상태 확인:

```java
@Component
public class ExternalApiHealthIndicator implements HealthIndicator {

    private final ExternalApiClient client;

    @Override
    public Health health() {
        try {
            client.ping();  // 외부 API에 간단한 연결 테스트
            return Health.up()
                .withDetail("url", "https://api.example.com")  // 추가 정보
                .withDetail("status", "연결 정상")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("url", "https://api.example.com")
                .withDetail("error", e.getMessage())           // 오류 메시지
                .build();
        }
    }
}
```

---

## 커스텀 메트릭 (Micrometer)

비즈니스 메트릭을 직접 수집합니다. "오늘 주문이 몇 건?" "실패율은?"

```java
@Service
public class OrderService {

    private final Counter orderCreatedCounter;    // 카운터: 계속 증가
    private final Counter orderFailedCounter;
    private final Timer   orderProcessingTimer;   // 타이머: 실행 시간 측정
    // Gauge는 현재 값 (증가/감소)

    public OrderService(MeterRegistry registry, OrderRepository orderRepository) {
        // 카운터 등록
        this.orderCreatedCounter = Counter.builder("orders.created")
            .description("생성된 주문 수")
            .tag("environment", "production")  // 태그로 분류
            .register(registry);

        this.orderFailedCounter = Counter.builder("orders.failed")
            .description("실패한 주문 수")
            .register(registry);

        // 타이머 등록
        this.orderProcessingTimer = Timer.builder("orders.processing.time")
            .description("주문 처리 시간 (밀리초)")
            .register(registry);

        // Gauge: OrderRepository의 메서드를 주기적으로 호출해서 현재 값 측정
        Gauge.builder("orders.active",
                orderRepository,
                OrderRepository::countByStatusPending)  // 현재 처리 중인 주문 수
            .description("현재 처리 중인 주문 수")
            .register(registry);
    }

    public Order createOrder(OrderRequest request) {
        // Timer.record: 실행 시간을 자동으로 측정
        return orderProcessingTimer.record(() -> {
            try {
                Order order = processOrder(request);
                orderCreatedCounter.increment();  // 성공 시 카운터 증가
                return order;
            } catch (Exception e) {
                orderFailedCounter.increment();   // 실패 시 카운터 증가
                throw e;
            }
        });
    }
}
```

메트릭 조회:

```json
// GET /actuator/metrics/orders.created
{
  "name": "orders.created",
  "description": "생성된 주문 수",
  "measurements": [{ "statistic": "COUNT", "value": 1234.0 }],
  "availableTags": [{ "tag": "environment", "values": ["production"] }]
}
```

---

## Prometheus + Grafana

운영 환경 모니터링 표준 스택입니다.

```
Actuator (/actuator/prometheus) → Prometheus가 수집 → Grafana가 시각화
```

```groovy
// Prometheus 메트릭 포맷 노출
implementation 'io.micrometer:micrometer-registry-prometheus'
```

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health, prometheus  # prometheus 엔드포인트 노출
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}    # 앱 이름 태그
      environment: ${spring.profiles.active:local}  # 환경 태그
```

Prometheus 수집 형식:

```
# GET /actuator/prometheus

# HELP jvm_memory_used_bytes JVM memory used
# TYPE jvm_memory_used_bytes gauge
jvm_memory_used_bytes{area="heap",id="G1 Survivor Space"} 1.048576E7

# HELP orders_created_total 생성된 주문 수
# TYPE orders_created_total counter
orders_created_total{environment="production"} 1234.0
```

로컬 Prometheus + Grafana 구성:

```yaml
# docker-compose.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin  # 기본 비밀번호
```

```yaml
# prometheus.yml — Prometheus 설정
global:
  scrape_interval: 15s  # 15초마다 메트릭 수집

scrape_configs:
  - job_name: 'spring-boot-app'
    metrics_path: '/actuator/prometheus'  # 메트릭 경로
    static_configs:
      - targets: ['host.docker.internal:8080']  # 앱 주소
```

---

## 로그 레벨 동적 변경

**재배포 없이** 실시간으로 로그 레벨을 변경합니다.

```bash
# 현재 로그 레벨 조회
GET /actuator/loggers/com.example.service

# 응답
{"configuredLevel": "INFO", "effectiveLevel": "INFO"}

# 로그 레벨을 DEBUG로 변경 (문제 분석 시)
POST /actuator/loggers/com.example.service
Content-Type: application/json
{"configuredLevel": "DEBUG"}

# 분석 완료 후 원복
POST /actuator/loggers/com.example.service
{"configuredLevel": null}  # null로 설정하면 상위 설정 따름
```

---

## 보안 설정

Actuator 엔드포인트는 민감한 정보를 포함하므로 반드시 보호합니다.

```java
@Configuration
public class ActuatorSecurityConfig {

    @Bean
    @Order(1)  // 다른 Security 설정보다 먼저 적용
    public SecurityFilterChain actuatorSecurityFilterChain(HttpSecurity http)
            throws Exception {
        return http
            .securityMatcher("/actuator/**")  // Actuator 경로에만 적용
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/info")
                    .permitAll()                      // health, info는 공개 (로드밸런서 헬스체크용)
                .requestMatchers("/actuator/**")
                    .hasRole("ACTUATOR")              // 나머지는 ACTUATOR 역할 필요
            )
            .httpBasic(withDefaults())  // Basic 인증 (ID/PW)
            .build();
    }
}
```

```yaml
spring:
  security:
    user:
      name: actuator               # 기본 사용자
      password: ${ACTUATOR_PASSWORD}  # 환경변수로 비밀번호 설정
      roles: ACTUATOR
```

---

## info 엔드포인트 커스터마이징

```yaml
# application.yml
info:
  app:
    name: 주문 서비스
    version: 1.2.0
    description: 주문 처리 및 관리 서비스
  contact:
    team: backend-team
    email: backend@example.com
```

```java
// 코드로 동적 정보 추가
@Component
public class AppInfoContributor implements InfoContributor {

    private final DataSource dataSource;

    @Override
    public void contribute(Info.Builder builder) {
        try (Connection conn = dataSource.getConnection()) {
            // DB 버전 정보 추가
            builder.withDetail("database", Map.of(
                "product", conn.getMetaData().getDatabaseProductName(),
                "version", conn.getMetaData().getDatabaseProductVersion()
            ));
        } catch (SQLException e) {
            builder.withDetail("database", "정보를 가져올 수 없습니다");
        }
    }
}
```

```json
// GET /actuator/info 응답
{
  "app": {
    "name": "주문 서비스",
    "version": "1.2.0"
  },
  "database": {
    "product": "PostgreSQL",
    "version": "16.1"
  }
}
```

---

## 실용적인 모니터링 설정

```java
// 자주 쓰는 메트릭들
@Component
public class ApplicationMetrics {

    public ApplicationMetrics(MeterRegistry registry) {
        // 활성 사용자 세션 수 (Redis에서 조회)
        Gauge.builder("sessions.active", sessionStore, SessionStore::count)
            .register(registry);

        // API 응답 시간 분포 — 이미 Spring MVC에서 자동으로 수집됨
        // GET /actuator/metrics/http.server.requests 로 확인

        // JVM 메모리 — 이미 자동 수집
        // GET /actuator/metrics/jvm.memory.used

        // DB 커넥션 풀 상태
        // GET /actuator/metrics/hikaricp.connections.active
    }
}
```

```bash
# 유용한 메트릭 엔드포인트들

# HTTP 요청 통계 (URL별 응답 시간)
GET /actuator/metrics/http.server.requests

# JVM 메모리 사용량
GET /actuator/metrics/jvm.memory.used

# DB 커넥션 풀 활성 연결 수
GET /actuator/metrics/hikaricp.connections.active

# GC 실행 시간
GET /actuator/metrics/jvm.gc.pause

# CPU 사용률
GET /actuator/metrics/process.cpu.usage
```

---

## 초보자가 자주 하는 실수

```yaml
# ❌ 실수 1: 운영 환경에서 모든 엔드포인트 노출
management:
  endpoints:
    web:
      exposure:
        include: "*"  # 운영에서는 매우 위험! (Bean 목록, 환경변수 등 민감 정보 노출)

# ✅ 올바른 방법: 필요한 것만 노출
management:
  endpoints:
    web:
      exposure:
        include: health, info, prometheus

# ❌ 실수 2: Actuator에 보안 설정 안 함
# /actuator/env에서 DB 비밀번호, API 키 등이 노출될 수 있음

# ✅ 올바른 방법: Spring Security로 보호

# ❌ 실수 3: shutdown 엔드포인트 활성화
management:
  endpoint:
    shutdown:
      enabled: true  # POST /actuator/shutdown → 서버 강제 종료! 운영에서 절대 안 됨
```
