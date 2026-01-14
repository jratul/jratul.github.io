---
title: "로그(Log)와 메트릭(Metric)"
date: "2026-01-14"
tags: ["observability", "logging", "metrics", "monitoring", "backend"]
excerpt: "시스템 관측을 위한 로그와 메트릭의 차이점, 수집 방법, 활용 전략을 알아봅니다."
---

# 로그(Log)와 메트릭(Metric)

시스템 관측(Observability)을 위한 로그와 메트릭의 차이점, 수집 방법, 활용 전략을 알아봅니다.

## Observability의 세 가지 축

```
1. 로그 (Logs): 이벤트 기록
2. 메트릭 (Metrics): 수치 데이터
3. 트레이스 (Traces): 요청 추적
```

---

## 로그 (Logs)

**특정 시점에 발생한 이벤트를 텍스트로 기록**합니다.

### 로그의 특징

```
- 비정형 또는 반정형 데이터
- 개별 이벤트 기록
- 상세한 컨텍스트 포함
- 디버깅에 유용
- 저장 비용이 높음
```

---

### 로그 레벨

```
TRACE: 가장 상세한 정보 (개발 환경)
DEBUG: 디버깅용 정보
INFO:  일반적인 정보
WARN:  경고 (잠재적 문제)
ERROR: 오류 발생
FATAL: 심각한 오류 (시스템 중단)
```

**운영 환경:** INFO 이상만 기록

---

### 로그 예시

```
# 비정형 로그
2026-01-14 10:30:45 ERROR Failed to connect to database

# 정형 로그 (JSON)
{
  "timestamp": "2026-01-14T10:30:45.123Z",
  "level": "ERROR",
  "service": "user-api",
  "message": "Failed to connect to database",
  "error": "Connection refused",
  "host": "db-primary.example.com",
  "port": 5432,
  "retry_count": 3,
  "trace_id": "abc123xyz"
}
```

---

### Java (Logback/SLF4J)

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class UserService {
    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    public User getUser(Long id) {
        log.info("사용자 조회 요청: id={}", id);

        try {
            User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(id));

            log.debug("사용자 조회 성공: id={}, name={}", id, user.getName());
            return user;

        } catch (Exception e) {
            log.error("사용자 조회 실패: id={}", id, e);
            throw e;
        }
    }
}
```

---

### Node.js (Winston)

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

async function getUser(id) {
  logger.info('사용자 조회 요청', { userId: id });

  try {
    const user = await userRepository.findById(id);
    logger.debug('사용자 조회 성공', { userId: id, userName: user.name });
    return user;

  } catch (error) {
    logger.error('사용자 조회 실패', { userId: id, error: error.message });
    throw error;
  }
}
```

---

### 구조화된 로그 (Structured Logging)

```json
{
  "timestamp": "2026-01-14T10:30:45.123Z",
  "level": "INFO",
  "service": "order-api",
  "method": "createOrder",
  "message": "주문 생성 완료",
  "orderId": "ORD-12345",
  "userId": "USR-67890",
  "totalAmount": 50000,
  "itemCount": 3,
  "duration_ms": 125,
  "trace_id": "abc123",
  "span_id": "def456"
}
```

**장점:**
- 검색/필터링 용이
- 파싱 자동화
- 대시보드 연동

---

### 로그 수집 스택

```
애플리케이션 → Filebeat → Logstash → Elasticsearch → Kibana
              (수집)      (변환)      (저장/검색)    (시각화)

또는

애플리케이션 → Fluentd → Loki → Grafana
              (수집)    (저장)  (시각화)
```

---

## 메트릭 (Metrics)

**시간에 따른 수치 데이터를 집계하여 저장**합니다.

### 메트릭의 특징

```
- 정형 데이터 (숫자)
- 집계된 값 (평균, 합계, 백분위)
- 저장 효율이 높음
- 대시보드/알림에 적합
- 트렌드 분석 용이
```

---

### 메트릭 유형

#### 1. Counter (카운터)

**누적 값** (단조 증가)

```
# 총 요청 수
http_requests_total{method="GET", status="200"} 12345

# 총 오류 수
errors_total{type="database"} 42
```

**용도:** 요청 수, 오류 수, 처리된 작업 수

---

#### 2. Gauge (게이지)

**현재 값** (증가/감소 가능)

```
# 현재 메모리 사용량
memory_usage_bytes 1073741824

# 현재 활성 연결 수
active_connections 150

# 현재 큐 크기
queue_size 25
```

**용도:** 메모리, CPU, 온도, 큐 크기

---

#### 3. Histogram (히스토그램)

**분포** (버킷별 개수)

```
# 응답 시간 분포
http_request_duration_seconds_bucket{le="0.1"} 5000
http_request_duration_seconds_bucket{le="0.5"} 8000
http_request_duration_seconds_bucket{le="1.0"} 9500
http_request_duration_seconds_bucket{le="+Inf"} 10000
http_request_duration_seconds_sum 4500
http_request_duration_seconds_count 10000
```

**용도:** 응답 시간, 요청 크기, 대기 시간

---

#### 4. Summary (서머리)

**분위수** (p50, p90, p99)

```
# 응답 시간 분위수
http_request_duration_seconds{quantile="0.5"} 0.05
http_request_duration_seconds{quantile="0.9"} 0.12
http_request_duration_seconds{quantile="0.99"} 0.35
http_request_duration_seconds_sum 4500
http_request_duration_seconds_count 10000
```

**용도:** 지연 시간, SLA 측정

---

### Java (Micrometer + Prometheus)

```java
import io.micrometer.core.instrument.*;

@Service
public class OrderService {
    private final Counter orderCounter;
    private final Timer orderTimer;
    private final Gauge queueGauge;

    public OrderService(MeterRegistry registry, OrderQueue queue) {
        // Counter: 주문 수
        this.orderCounter = Counter.builder("orders_total")
            .description("Total orders created")
            .tags("type", "online")
            .register(registry);

        // Timer: 주문 처리 시간
        this.orderTimer = Timer.builder("order_processing_seconds")
            .description("Order processing time")
            .publishPercentiles(0.5, 0.9, 0.99)
            .register(registry);

        // Gauge: 대기 큐 크기
        this.queueGauge = Gauge.builder("order_queue_size", queue, OrderQueue::size)
            .description("Order queue size")
            .register(registry);
    }

    public Order createOrder(OrderRequest request) {
        return orderTimer.record(() -> {
            Order order = processOrder(request);
            orderCounter.increment();
            return order;
        });
    }
}
```

---

### Node.js (prom-client)

```javascript
import client from 'prom-client';

// Counter
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status', 'path']
});

// Gauge
const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Active connections'
});

// Histogram
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});

// 미들웨어
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({
    method: req.method,
    path: req.path
  });

  activeConnections.inc();

  res.on('finish', () => {
    end();
    activeConnections.dec();
    httpRequestsTotal.inc({
      method: req.method,
      status: res.statusCode,
      path: req.path
    });
  });

  next();
});
```

---

### 메트릭 수집 스택

```
애플리케이션 ← Prometheus (Pull) → Grafana
              (수집/저장)        (시각화/알림)

또는

애플리케이션 → InfluxDB → Grafana
              (Push)    (저장)   (시각화)
```

---

### Prometheus 쿼리 (PromQL)

```promql
# 초당 요청 수 (Rate)
rate(http_requests_total[5m])

# 오류율
sum(rate(http_requests_total{status=~"5.."}[5m]))
/ sum(rate(http_requests_total[5m])) * 100

# 95번째 백분위 응답 시간
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# 메모리 사용률
process_resident_memory_bytes / process_virtual_memory_bytes * 100

# 특정 서비스 CPU 사용률
avg(rate(process_cpu_seconds_total{service="user-api"}[5m])) * 100
```

---

## 로그 vs 메트릭

| 구분 | 로그 | 메트릭 |
|-----|-----|-------|
| 데이터 형태 | 텍스트 (이벤트) | 숫자 (집계값) |
| 저장 비용 | 높음 | 낮음 |
| 쿼리 속도 | 느림 | 빠름 |
| 용도 | 디버깅, 감사 | 모니터링, 알림 |
| 상세도 | 높음 | 낮음 |
| 보존 기간 | 짧음 (비용) | 길음 |
| 카디널리티 | 높음 | 낮음 |

---

### 언제 로그를 사용할까?

```
✅ 오류의 원인을 파악할 때
✅ 특정 요청의 상세 정보가 필요할 때
✅ 감사/보안 로그가 필요할 때
✅ 디버깅할 때
✅ 비정형 데이터를 기록할 때

예시:
- "사용자 USR-123이 주문 ORD-456을 생성했다"
- "데이터베이스 연결이 실패했다: Connection refused"
- "결제 요청이 거부되었다: 잔액 부족"
```

---

### 언제 메트릭을 사용할까?

```
✅ 시스템 상태를 실시간으로 모니터링할 때
✅ 대시보드를 만들 때
✅ 알림을 설정할 때
✅ 트렌드를 분석할 때
✅ 용량 계획을 세울 때

예시:
- "현재 초당 요청 수는 1000이다"
- "평균 응답 시간은 150ms이다"
- "오류율이 5%를 초과했다"
- "메모리 사용률이 80%이다"
```

---

## 실전 예제

### 예제 1: API 모니터링

```java
@RestController
public class UserController {
    private final Logger log = LoggerFactory.getLogger(UserController.class);
    private final Counter requestCounter;
    private final Timer requestTimer;

    @GetMapping("/users/{id}")
    public User getUser(@PathVariable Long id) {
        // 로그: 개별 요청 기록
        log.info("사용자 조회 요청: id={}", id);

        return requestTimer.record(() -> {
            try {
                User user = userService.getUser(id);
                // 메트릭: 성공 카운터 증가
                requestCounter.increment("success");
                log.debug("사용자 조회 성공: id={}, name={}", id, user.getName());
                return user;

            } catch (Exception e) {
                // 메트릭: 실패 카운터 증가
                requestCounter.increment("failure");
                // 로그: 오류 상세 정보
                log.error("사용자 조회 실패: id={}", id, e);
                throw e;
            }
        });
    }
}
```

---

### 예제 2: 대시보드 구성

```
┌─────────────────────────────────────────────────┐
│                  API Dashboard                  │
├─────────────────────────────────────────────────┤
│  요청 수 (QPS)    │  오류율 (%)     │  응답 시간  │
│  ████████ 1,234   │  ██ 2.5%        │  p99: 250ms │
├─────────────────────────────────────────────────┤
│  [요청 수 그래프 - 시간별]                        │
│  ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█                        │
├─────────────────────────────────────────────────┤
│  [응답 시간 히트맵]                               │
│  00:00 ░░░░░░░░░░                               │
│  06:00 ░░▒▒░░░░░░                               │
│  12:00 ▒▒▓▓▒▒░░░░                               │
│  18:00 ░░▒▒▒▒▒░░░                               │
└─────────────────────────────────────────────────┘
```

---

### 예제 3: 알림 설정

```yaml
# Prometheus Alertmanager 규칙
groups:
  - name: api-alerts
    rules:
      # 오류율 5% 초과
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) * 100 > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "오류율이 5%를 초과했습니다"
          description: "현재 오류율: {{ $value }}%"

      # 응답 시간 1초 초과
      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "p99 응답 시간이 1초를 초과했습니다"
```

---

### 예제 4: 로그 기반 문제 해결

```
1. 알림 수신
   "오류율이 5%를 초과했습니다"

2. 메트릭 확인 (Grafana)
   - 오류율 그래프 확인
   - 오류 발생 시간대 확인
   - 오류 유형별 분포 확인

3. 로그 검색 (Kibana)
   - 해당 시간대 ERROR 로그 검색
   - trace_id로 요청 추적
   - 스택 트레이스 확인

4. 원인 파악
   {
     "timestamp": "2026-01-14T10:30:45.123Z",
     "level": "ERROR",
     "message": "Database connection timeout",
     "host": "db-primary.example.com",
     "query": "SELECT * FROM users WHERE id = ?",
     "duration_ms": 30000,
     "trace_id": "abc123"
   }

5. 해결
   → 데이터베이스 커넥션 풀 증가
   → 슬로우 쿼리 최적화
```

---

## 베스트 프랙티스

### 로그 베스트 프랙티스

```
1. 구조화된 로그 사용 (JSON)
2. 적절한 로그 레벨 선택
3. 컨텍스트 정보 포함 (trace_id, user_id)
4. 민감 정보 제외 (비밀번호, 카드번호)
5. 일관된 형식 유지
6. 로그 보존 정책 설정
```

```java
// ❌ 잘못된 로그
log.info("User created");

// ✅ 좋은 로그
log.info("사용자 생성 완료: userId={}, email={}, traceId={}",
    user.getId(),
    maskEmail(user.getEmail()),
    MDC.get("traceId"));
```

---

### 메트릭 베스트 프랙티스

```
1. 의미 있는 이름 사용 (snake_case)
2. 단위를 이름에 포함 (_seconds, _bytes)
3. 레이블 카디널리티 제한
4. RED 메서드 적용 (Rate, Errors, Duration)
5. USE 메서드 적용 (Utilization, Saturation, Errors)
```

```java
// ❌ 잘못된 메트릭
Counter.builder("requests").register(registry);

// ✅ 좋은 메트릭
Counter.builder("http_requests_total")
    .description("Total HTTP requests")
    .tags("method", "GET", "status", "200", "path", "/api/users")
    .register(registry);
```

---

### RED 메서드

```
Rate:     초당 요청 수
Errors:   오류 수/오류율
Duration: 요청 처리 시간

→ 서비스의 "외부" 상태 파악
```

---

### USE 메서드

```
Utilization: 리소스 사용률 (%)
Saturation:  포화도 (큐 길이, 대기 시간)
Errors:      오류 수

→ 서비스의 "내부" 상태 파악
```

---

## 도구 비교

### 로그 수집/분석

| 도구 | 특징 |
|-----|-----|
| ELK Stack | 가장 널리 사용, 기능 풍부 |
| Loki | 가벼움, Prometheus와 통합 |
| Datadog | SaaS, 올인원 |
| CloudWatch | AWS 네이티브 |

---

### 메트릭 수집/시각화

| 도구 | 특징 |
|-----|-----|
| Prometheus + Grafana | 오픈소스 표준 |
| InfluxDB + Grafana | 시계열 특화 |
| Datadog | SaaS, 올인원 |
| CloudWatch | AWS 네이티브 |

---

## 요약

1. **로그**: 이벤트 기록, 디버깅/감사용, 상세 정보
2. **메트릭**: 수치 데이터, 모니터링/알림용, 트렌드 분석
3. **로그 레벨**: TRACE → DEBUG → INFO → WARN → ERROR → FATAL
4. **메트릭 유형**: Counter, Gauge, Histogram, Summary
5. **구조화된 로그**: JSON 형식, 검색/필터링 용이
6. **RED 메서드**: Rate, Errors, Duration (서비스 상태)
7. **USE 메서드**: Utilization, Saturation, Errors (리소스 상태)
8. **조합 사용**: 메트릭으로 문제 감지 → 로그로 원인 파악

로그와 메트릭은 서로 보완적이며, 함께 사용해야 효과적인 시스템 관측이 가능합니다.