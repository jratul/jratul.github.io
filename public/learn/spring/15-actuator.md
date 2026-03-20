---
title: "Actuator와 모니터링"
order: 15
---

## Spring Boot Actuator

운영 중인 애플리케이션의 상태를 모니터링하고 관리하는 엔드포인트를 제공합니다.

```groovy
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
        # include: "*"  전체 노출 (개발 환경에서만)
      base-path: /actuator
  endpoint:
    health:
      show-details: always  # 상세 헬스 정보 노출
      show-components: always
    shutdown:
      enabled: true  # POST /actuator/shutdown 활성화 (주의!)
  info:
    env:
      enabled: true
    build:
      enabled: true
    git:
      enabled: true
      mode: full
```

---

## 주요 엔드포인트

```
GET /actuator/health       애플리케이션 상태 (UP/DOWN)
GET /actuator/info         빌드/버전 정보
GET /actuator/metrics      메트릭 목록
GET /actuator/metrics/{name}  특정 메트릭 값
GET /actuator/loggers      로거 목록 및 레벨
POST /actuator/loggers/{name}  로그 레벨 동적 변경
GET /actuator/env          환경 변수
GET /actuator/beans        등록된 Bean 목록
GET /actuator/mappings     URL 매핑 목록
GET /actuator/threaddump   스레드 덤프
GET /actuator/heapdump     힙 덤프 (바이너리)
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

커스텀 Health Indicator:

```java
@Component
public class ExternalApiHealthIndicator implements HealthIndicator {

    private final ExternalApiClient client;

    @Override
    public Health health() {
        try {
            client.ping();  // 외부 API 연결 확인
            return Health.up()
                .withDetail("url", "https://api.example.com")
                .withDetail("status", "reachable")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("url", "https://api.example.com")
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

---

## 커스텀 메트릭 (Micrometer)

```groovy
// Micrometer는 Actuator에 포함
implementation 'org.springframework.boot:spring-boot-starter-actuator'
```

```java
@Service
public class OrderService {

    private final Counter orderCreatedCounter;
    private final Counter orderFailedCounter;
    private final Timer orderProcessingTimer;
    private final Gauge activeOrdersGauge;

    public OrderService(MeterRegistry registry, OrderRepository orderRepository) {
        this.orderCreatedCounter = Counter.builder("orders.created")
            .description("생성된 주문 수")
            .tag("environment", "production")
            .register(registry);

        this.orderFailedCounter = Counter.builder("orders.failed")
            .description("실패한 주문 수")
            .register(registry);

        this.orderProcessingTimer = Timer.builder("orders.processing.time")
            .description("주문 처리 시간")
            .register(registry);

        Gauge.builder("orders.active", orderRepository, OrderRepository::countByStatusPending)
            .description("처리 중인 주문 수")
            .register(registry);
    }

    public Order createOrder(OrderRequest request) {
        return orderProcessingTimer.record(() -> {
            try {
                Order order = processOrder(request);
                orderCreatedCounter.increment();
                return order;
            } catch (Exception e) {
                orderFailedCounter.increment();
                throw e;
            }
        });
    }
}
```

```
// GET /actuator/metrics/orders.created
{
  "name": "orders.created",
  "measurements": [{ "statistic": "COUNT", "value": 1234 }]
}
```

---

## Prometheus + Grafana

운영 환경 표준 모니터링 스택입니다.

```groovy
// Prometheus 메트릭 포맷 노출
implementation 'io.micrometer:micrometer-registry-prometheus'
```

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, prometheus
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}
      environment: ${spring.profiles.active:local}
```

```
# GET /actuator/prometheus — Prometheus가 수집하는 포맷
# HELP jvm_memory_used_bytes JVM memory used
# TYPE jvm_memory_used_bytes gauge
jvm_memory_used_bytes{area="heap",id="G1 Survivor Space"} 1.048576E7
jvm_memory_used_bytes{area="heap",id="G1 Eden Space"} 2.5165824E7
```

`docker-compose.yml`로 로컬 환경 구성:

```yaml
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
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'spring-boot-app'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['host.docker.internal:8080']
```

---

## 로그 레벨 동적 변경

배포 없이 로그 레벨을 변경합니다.

```bash
# 현재 로그 레벨 조회
GET /actuator/loggers/com.example.service

# 응답
{"configuredLevel": "INFO", "effectiveLevel": "INFO"}

# 로그 레벨 변경 (DEBUG로)
POST /actuator/loggers/com.example.service
Content-Type: application/json
{"configuredLevel": "DEBUG"}

# 원복
POST /actuator/loggers/com.example.service
{"configuredLevel": null}
```

---

## 보안 설정

```java
@Configuration
public class ActuatorSecurityConfig {

    @Bean
    @Order(1)
    public SecurityFilterChain actuatorSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
            .securityMatcher("/actuator/**")
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/actuator/**").hasRole("ACTUATOR")
            )
            .httpBasic(withDefaults())
            .build();
    }
}
```

```yaml
spring:
  security:
    user:
      name: actuator
      password: ${ACTUATOR_PASSWORD}
      roles: ACTUATOR
```

---

## info 엔드포인트 커스터마이징

```yaml
info:
  app:
    name: My Service
    version: 1.0.0
    description: 주문 처리 서비스
  contact:
    team: backend-team
    email: backend@example.com
```

```java
@Component
public class AppInfoContributor implements InfoContributor {

    private final DataSource dataSource;

    @Override
    public void contribute(Info.Builder builder) {
        try (Connection conn = dataSource.getConnection()) {
            builder.withDetail("database", Map.of(
                "product", conn.getMetaData().getDatabaseProductName(),
                "version", conn.getMetaData().getDatabaseProductVersion()
            ));
        } catch (SQLException e) {
            builder.withDetail("database", "unavailable");
        }
    }
}
```
