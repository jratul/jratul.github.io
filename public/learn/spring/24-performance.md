---
title: "성능 최적화"
order: 24
---

## Connection Pool 튜닝 (HikariCP)

Spring Boot 기본 커넥션 풀입니다.

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20       # 최대 커넥션 수
      minimum-idle: 10            # 유휴 커넥션 최소 유지
      connection-timeout: 3000    # 커넥션 획득 대기 시간 (ms)
      idle-timeout: 600000        # 유휴 커넥션 제거 시간 (10분)
      max-lifetime: 1800000       # 커넥션 최대 유지 시간 (30분)
      keepalive-time: 60000       # 커넥션 유지 확인 주기 (1분)
      validation-timeout: 1000
      pool-name: HikariPool-Main
```

커넥션 수 공식: `(CPU 코어 수 × 2) + 유효 디스크 수`
일반적으로 20~50개. 너무 많으면 오히려 성능이 떨어집니다.

---

## JPA 성능 최적화

### 지연 로딩과 즉시 로딩

```java
// 기본값을 LAZY로 통일
@ManyToOne(fetch = FetchType.LAZY)   // 기본 EAGER → 반드시 LAZY로
@OneToMany(mappedBy = "order")       // 기본 LAZY — 유지
@ManyToMany(fetch = FetchType.LAZY)  // 기본 EAGER → 반드시 LAZY로

// 필요할 때만 Fetch Join
@Query("SELECT o FROM Order o JOIN FETCH o.user WHERE o.id = :id")
Optional<Order> findWithUser(@Param("id") Long id);
```

### 변경 감지 최적화

```java
// Dirty Checking 비용 — 영속성 컨텍스트의 모든 엔티티를 스냅샷과 비교
// 조회 전용은 readOnly 트랜잭션으로 비활성화
@Transactional(readOnly = true)
public List<OrderResponse> findAll() {
    return orderRepository.findAll().stream()
        .map(OrderResponse::from)
        .toList();
}

// 벌크 수정 — 변경 감지 없이 직접 업데이트
@Modifying(clearAutomatically = true)
@Query("UPDATE Order o SET o.status = :status WHERE o.userId = :userId")
int updateStatusByUserId(@Param("userId") Long userId, @Param("status") OrderStatus status);
```

### 1차 캐시와 배치 삽입

```java
// 대량 삽입 시 — 배치 처리로 INSERT 횟수 줄이기
@Bean
public DataSource dataSource() {
    // HikariCP 설정에 배치 사이즈 추가
}
```

```yaml
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 50           # 50개씩 배치 삽입
          order_inserts: true
          order_updates: true
        generate_statistics: false  # 운영에서는 false
```

```java
@Service
@Transactional
public class BulkInsertService {

    private final EntityManager em;

    public void bulkInsert(List<Product> products) {
        for (int i = 0; i < products.size(); i++) {
            em.persist(products.get(i));

            if (i % 50 == 0) {
                em.flush();   // DB에 전송
                em.clear();   // 1차 캐시 초기화 (메모리 절약)
            }
        }
    }
}
```

---

## 쿼리 분석

### 슬로우 쿼리 로깅

```yaml
spring:
  jpa:
    properties:
      hibernate:
        # 실행 쿼리 출력 (개발용)
        show_sql: false
        format_sql: false
        # 슬로우 쿼리 (1초 이상)
        session.events.log.LOG_QUERIES_SLOWER_THAN_MS: 1000

logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.orm.jdbc.bind: TRACE  # 파라미터 값 출력
```

### P6Spy로 쿼리 로깅

```groovy
testImplementation 'com.github.gavlyukovskiy:p6spy-spring-boot-starter:1.9.0'
```

```properties
# spy.properties
driverlist=org.h2.Driver,org.postgresql.Driver
logMessageFormat=com.p6spy.engine.spy.appender.MultiLineFormat
```

---

## N+1 탐지

```java
// 테스트에서 N+1 감지
@Test
void N_플러스_1_없는지_확인() {
    // given
    insertTestData();

    // 쿼리 카운터 초기화
    QueryCountHolder.clear();

    // when
    orderService.findAllWithUser();

    // then — 쿼리가 1번만 실행됐는지 확인
    assertThat(QueryCountHolder.getGrandTotal().getSelect()).isEqualTo(1);
}
```

---

## 인덱스 전략

```java
// 단일 인덱스
@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_orders_user_id", columnList = "user_id"),
    @Index(name = "idx_orders_status", columnList = "status"),
    @Index(name = "idx_orders_created_at", columnList = "created_at DESC")
})
public class Order { ... }

// 복합 인덱스 (쿼리 패턴에 맞게)
@Index(name = "idx_orders_user_status", columnList = "user_id, status")
// SELECT * FROM orders WHERE user_id = ? AND status = ? 에 최적

// 커버링 인덱스 (SELECT 컬럼까지 인덱스에 포함)
@Index(name = "idx_orders_covering", columnList = "user_id, status, created_at, total_amount")
```

---

## API 응답 캐싱

```java
// HTTP 캐시 헤더
@GetMapping("/api/products/{id}")
public ResponseEntity<ProductResponse> getProduct(@PathVariable Long id) {
    ProductResponse product = productService.findById(id);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).mustRevalidate())
        .eTag(String.valueOf(product.getUpdatedAt().hashCode()))
        .body(product);
}

// ETag 자동 처리 (ShallowEtagHeaderFilter)
@Bean
public Filter shallowEtagHeaderFilter() {
    ShallowEtagHeaderFilter filter = new ShallowEtagHeaderFilter();
    filter.setWriteWeakETag(true);
    return filter;
}
```

---

## 비동기로 응답 시간 단축

```java
@GetMapping("/api/dashboard/{userId}")
public DeferredResult<ResponseEntity<DashboardResponse>> getDashboard(
        @PathVariable Long userId) {

    DeferredResult<ResponseEntity<DashboardResponse>> result = new DeferredResult<>(5000L);

    CompletableFuture.allOf(
        userService.getUserAsync(userId),
        orderService.getRecentOrdersAsync(userId),
        statsService.getStatsAsync(userId)
    ).thenRun(() -> {
        // 모두 완료 후 응답
        result.setResult(ResponseEntity.ok(dashboardService.build(userId)));
    }).exceptionally(ex -> {
        result.setErrorResult(ex);
        return null;
    });

    return result;
}
```

---

## JVM 프로파일링

```bash
# JVM 메트릭 확인
GET /actuator/metrics/jvm.memory.used
GET /actuator/metrics/jvm.gc.pause
GET /actuator/metrics/process.cpu.usage

# 스레드 덤프 (응답 느릴 때)
GET /actuator/threaddump

# 힙 덤프 (OOM 분석)
GET /actuator/heapdump
# → VisualVM, Eclipse MAT으로 분석

# GC 로그 활성화 (JVM 옵션)
-Xlog:gc*:file=/app/logs/gc.log:time,uptime:filecount=5,filesize=20m
```

---

## 응답 압축

```yaml
server:
  compression:
    enabled: true
    mime-types: application/json,application/xml,text/html,text/plain
    min-response-size: 1024  # 1KB 이상만 압축
```

---

## 성능 테스트

```groovy
// k6 스크립트 (부하 테스트)
// k6 run load-test.js
```

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '1m', target: 50 },   // 1분에 50명
        { duration: '3m', target: 100 },  // 3분간 100명 유지
        { duration: '1m', target: 0 },    // 1분에 0명으로 감소
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],  // 95%가 500ms 이내
        http_req_failed: ['rate<0.01'],    // 실패율 1% 미만
    },
};

export default function () {
    const res = http.get('http://localhost:8080/api/products');
    check(res, {
        'status is 200': r => r.status === 200,
        'response time < 500ms': r => r.timings.duration < 500,
    });
    sleep(1);
}
```
