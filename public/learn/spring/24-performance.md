---
title: "성능 최적화"
order: 24
---

## 성능 최적화의 접근법

성능 문제가 생기면 **측정 먼저, 최적화 나중**입니다.

```
잘못된 접근: "이게 느릴 것 같아" → 코드 바꿈 → 실제론 다른 곳이 병목

올바른 접근:
1. 측정: Actuator, 슬로우 쿼리 로그, 프로파일러로 병목 찾기
2. 원인 파악: DB? 네트워크? GC? CPU?
3. 최적화: 병목 부분만 개선
4. 재측정: 개선됐는지 확인
```

**흔한 병목 원인:**
- N+1 쿼리 (가장 흔함)
- 인덱스 미사용
- 커넥션 풀 부족
- 불필요한 데이터 로딩 (EAGER 로딩)
- 동기 처리 (비동기로 개선 가능한 것들)

---

## Connection Pool 튜닝 (HikariCP)

DB 연결을 미리 만들어두고 재사용합니다. 커넥션 생성에 시간이 걸리기 때문입니다.

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20        # 최대 커넥션 수 (이 이상은 대기)
      minimum-idle: 10             # 유휴 상태에도 최소 유지할 커넥션 수
      connection-timeout: 3000     # 커넥션 못 얻으면 3초 후 예외 (ms)
      idle-timeout: 600000         # 10분 이상 안 쓰는 커넥션 제거 (ms)
      max-lifetime: 1800000        # 30분 후 커넥션 교체 (DB 서버 설정과 맞춰야 함)
      keepalive-time: 60000        # 1분마다 커넥션 유효성 확인 (ms)
      validation-timeout: 1000     # 커넥션 유효성 확인 타임아웃 (ms)
      pool-name: HikariPool-Main   # 모니터링용 이름
```

**커넥션 수 결정 공식:**
```
권장 공식: (CPU 코어 수 × 2) + 유효 디스크 수
일반적으로: 20~50개

주의: 커넥션이 많다고 빠른 게 아님!
DB 서버도 처리할 수 있는 양이 있음
→ 커넥션 수 늘리면 오히려 DB 서버 과부하
```

```java
// 커넥션 풀 모니터링
@Scheduled(fixedRate = 60000)  // 1분마다
public void logConnectionPoolStats() {
    HikariDataSource ds = (HikariDataSource) dataSource;
    HikariPoolMXBean pool = ds.getHikariPoolMXBean();

    log.info("커넥션 풀 상태: 활성={}, 유휴={}, 대기={}",
        pool.getActiveConnections(),   // 현재 사용 중
        pool.getIdleConnections(),     // 유휴 상태
        pool.getThreadsAwaitingConnection());  // 커넥션 기다리는 스레드 수
}
```

---

## JPA 성능 최적화

### N+1 문제와 해결

```java
// N+1 문제 발생 예시
List<Order> orders = orderRepository.findAll();  // 쿼리 1번
orders.forEach(order -> {
    User user = order.getUser();     // 각 주문마다 User 쿼리 → N번 추가
    System.out.println(user.getName());
});
// 총 쿼리: 1 + N번

// 해결 1: Fetch Join (단일 쿼리로 한번에 로딩)
@Query("SELECT o FROM Order o JOIN FETCH o.user WHERE o.status = :status")
List<Order> findWithUserByStatus(@Param("status") OrderStatus status);

// 해결 2: @BatchSize (IN 쿼리로 묶어서 처리)
@BatchSize(size = 100)  // 100개씩 IN (id IN (...)) 쿼리
@OneToMany(mappedBy = "order")
private List<OrderItem> items;

// 해결 3: EntityGraph
@EntityGraph(attributePaths = {"user", "items"})
List<Order> findAll();
```

### 지연 로딩 설정

```java
// 기본값이 EAGER인 관계는 반드시 LAZY로 변경
@ManyToOne(fetch = FetchType.LAZY)   // 기본 EAGER → 반드시 LAZY로!
@JoinColumn(name = "user_id")
private User user;

@ManyToMany(fetch = FetchType.LAZY)  // 기본 EAGER → 반드시 LAZY로!
private List<Category> categories;

@OneToMany(mappedBy = "order")       // 기본 LAZY → 유지
private List<OrderItem> items;

// 필요할 때만 명시적으로 Fetch
@Query("SELECT o FROM Order o JOIN FETCH o.user JOIN FETCH o.items WHERE o.id = :id")
Optional<Order> findWithUserAndItems(@Param("id") Long id);
```

### 읽기 전용 트랜잭션 최적화

```java
// 조회 전용은 readOnly = true 설정
// → Dirty Checking 비활성화 → 스냅샷 생성 안 함 → 메모리/CPU 절약
@Service
public class OrderQueryService {

    @Transactional(readOnly = true)  // 반드시 설정!
    public List<OrderResponse> findAll() {
        return orderRepository.findAll().stream()
            .map(OrderResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> findByUser(Long userId, Pageable pageable) {
        return orderRepository.findByUserId(userId, pageable)
            .map(OrderResponse::from);
    }
}
```

### 벌크 수정

```java
// 1만 건 업데이트를 Dirty Checking으로 처리하면 1만 번 UPDATE
// → @Modifying으로 단일 UPDATE 쿼리
@Modifying(clearAutomatically = true)  // clearAutomatically: 1차 캐시 자동 초기화
@Query("UPDATE Order o SET o.status = :status WHERE o.userId = :userId AND o.status = 'PENDING'")
int cancelPendingOrdersByUser(
    @Param("userId") Long userId,
    @Param("status") OrderStatus status);
```

---

## JPA 배치 삽입

대량 INSERT 시 배치 처리로 속도를 높입니다.

```yaml
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 50           # 50개씩 배치 INSERT (JDBC 레벨)
          order_inserts: true      # INSERT 정렬 (배치 효율 향상)
          order_updates: true      # UPDATE 정렬
```

```java
@Service
@Transactional
@RequiredArgsConstructor
public class BulkInsertService {

    private final EntityManager em;

    // 10만 건 삽입 예시
    public void bulkInsert(List<Product> products) {
        for (int i = 0; i < products.size(); i++) {
            em.persist(products.get(i));  // 1차 캐시에 저장

            // 50개마다 DB에 실제 전송 + 1차 캐시 비움
            if ((i + 1) % 50 == 0) {
                em.flush();   // 쿼리 실행 (50개 배치 INSERT)
                em.clear();   // 1차 캐시 초기화 (메모리 절약)
            }
        }
        em.flush();  // 나머지 처리
    }
}
```

---

## 슬로우 쿼리 탐지

```yaml
spring:
  jpa:
    properties:
      hibernate:
        show_sql: false        # 운영에서는 false (로그 양 줄이기)
        format_sql: false
        # 1초 이상 걸리는 쿼리만 로깅
        session.events.log.LOG_QUERIES_SLOWER_THAN_MS: 1000

logging:
  level:
    org.hibernate.SQL: DEBUG          # SQL 쿼리 출력
    org.hibernate.orm.jdbc.bind: TRACE # 파라미터 값 출력
```

```groovy
// P6Spy로 실행 쿼리 + 파라미터 함께 출력 (개발 환경)
testImplementation 'com.github.gavlyukovskiy:p6spy-spring-boot-starter:1.9.0'
```

---

## 인덱스 전략

```java
// JPA에서 인덱스 선언
@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_orders_user_id", columnList = "user_id"),      // 단일 인덱스
    @Index(name = "idx_orders_status", columnList = "status"),
    @Index(name = "idx_orders_created_at", columnList = "created_at DESC"),

    // 복합 인덱스 (왼쪽에서 오른쪽 순으로 사용)
    // WHERE user_id = ? AND status = ? 에 최적화
    @Index(name = "idx_orders_user_status", columnList = "user_id, status"),

    // 커버링 인덱스: SELECT 컬럼까지 인덱스에 포함 → 테이블 접근 없음
    @Index(name = "idx_orders_covering",
        columnList = "user_id, status, created_at, total_amount")
})
public class Order { ... }
```

**인덱스 선택 기준:**

```
인덱스를 걸어야 하는 컬럼:
✓ WHERE 조건에 자주 쓰이는 컬럼 (user_id, status)
✓ ORDER BY에 쓰이는 컬럼 (created_at)
✓ JOIN ON에 쓰이는 컬럼 (Foreign Key)

인덱스를 피해야 하는 컬럼:
✗ 카디널리티(값의 다양성)가 낮은 컬럼 (성별: M/F 두 가지만)
✗ UPDATE/INSERT가 매우 많은 컬럼 (인덱스 업데이트 비용)
✗ 가변 길이가 큰 컬럼 (TEXT, BLOB)
```

---

## API 응답 캐싱

```java
// HTTP 캐시 헤더로 클라이언트/CDN 캐싱
@GetMapping("/api/products/{id}")
public ResponseEntity<ProductResponse> getProduct(@PathVariable Long id) {
    ProductResponse product = productService.findById(id);

    return ResponseEntity.ok()
        // 60초 동안 캐시, 만료 후 재검증
        .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).mustRevalidate())
        // ETag: 내용이 같으면 304 Not Modified 반환 (데이터 전송 없음)
        .eTag(String.valueOf(product.getUpdatedAt().hashCode()))
        .body(product);
}

// ShallowEtagHeaderFilter: 응답 내용 기반으로 ETag 자동 생성
@Bean
public Filter shallowEtagHeaderFilter() {
    ShallowEtagHeaderFilter filter = new ShallowEtagHeaderFilter();
    filter.setWriteWeakETag(true);  // Weak ETag (W/"...")
    return filter;
}
```

---

## 비동기로 응답 시간 단축

```java
// 여러 API를 병렬로 호출해서 응답 시간 단축
@GetMapping("/api/dashboard/{userId}")
public CompletableFuture<ResponseEntity<DashboardResponse>> getDashboard(
        @PathVariable Long userId) {

    // 3개의 조회를 동시에 실행 (직렬: 300ms, 병렬: 100ms)
    CompletableFuture<UserInfo> userFuture =
        userService.getUserAsync(userId);              // 100ms
    CompletableFuture<List<Order>> ordersFuture =
        orderService.getRecentOrdersAsync(userId);     // 80ms
    CompletableFuture<UserStats> statsFuture =
        statsService.getStatsAsync(userId);            // 90ms

    // 모두 완료 후 응답
    return CompletableFuture.allOf(userFuture, ordersFuture, statsFuture)
        .thenApply(v -> ResponseEntity.ok(
            DashboardResponse.builder()
                .user(userFuture.join())
                .recentOrders(ordersFuture.join())
                .stats(statsFuture.join())
                .build()
        ));
}
```

---

## 응답 압축

```yaml
server:
  compression:
    enabled: true
    # 이 타입들만 압축
    mime-types: application/json,application/xml,text/html,text/plain
    min-response-size: 1024  # 1KB 미만은 압축 효과 없음 → 제외
```

---

## JVM 프로파일링

```bash
# Actuator로 JVM 상태 확인
GET /actuator/metrics/jvm.memory.used     # 메모리 사용량
GET /actuator/metrics/jvm.gc.pause        # GC 일시 정지 시간
GET /actuator/metrics/process.cpu.usage   # CPU 사용률
GET /actuator/metrics/hikaricp.connections # 커넥션 풀 상태

# 응답이 느릴 때 스레드 덤프
GET /actuator/threaddump
# → 어떤 스레드가 어디서 블로킹됐는지 확인

# OOM(Out of Memory) 분석
GET /actuator/heapdump
# → VisualVM 또는 Eclipse MAT으로 분석

# GC 로그 활성화 (JVM 옵션에 추가)
# -Xlog:gc*:file=/app/logs/gc.log:time,uptime:filecount=5,filesize=20m
```

---

## 성능 테스트 (k6)

배포 전 부하 테스트로 성능을 검증합니다.

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

// 부하 시나리오 설정
export const options = {
    stages: [
        { duration: '1m', target: 50 },    // 1분간 50명으로 점진 증가
        { duration: '3m', target: 100 },   // 3분간 100명 유지
        { duration: '1m', target: 0 },     // 1분간 0명으로 감소
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],   // 95%가 500ms 이내
        http_req_failed: ['rate<0.01'],     // 실패율 1% 미만
    },
};

export default function () {
    const res = http.get('http://localhost:8080/api/products');

    check(res, {
        'status 200': r => r.status === 200,
        '500ms 이내': r => r.timings.duration < 500,
    });

    sleep(1);  // 1초 대기 (실제 사용자 패턴 시뮬레이션)
}
```

```bash
# k6 실행
k6 run load-test.js

# 실행 결과 예시:
# http_req_duration: avg=142ms, p(95)=380ms ✓
# http_req_failed: 0.02% ✓
```

---

## 초보자가 자주 하는 실수

**실수 1: 측정 없이 최적화**

```
나쁜 접근: "캐싱하면 빠르겠지?" → 무조건 캐싱 추가
          → 캐시 일관성 문제 발생, 실제 병목은 다른 곳

좋은 접근: 슬로우 쿼리 로그 확인 → N+1 발견 → Fetch Join으로 해결
          → 측정 → 10배 빠름 확인
```

**실수 2: @Transactional(readOnly = true) 누락**

```java
// 조회 서비스에 readOnly = true 빠지면 성능 손실
@Service
public class OrderQueryService {
    // @Transactional(readOnly = true) 빠짐 → Dirty Checking 활성화
    public List<Order> findAll() {
        return orderRepository.findAll();  // 스냅샷 생성으로 불필요한 메모리 사용
    }
}

// 반드시 readOnly 명시
@Transactional(readOnly = true)
public List<Order> findAll() { ... }
```

**실수 3: 컬렉션에 Fetch Join + 페이징 동시 사용**

```java
// Fetch Join + 페이징은 HibernateJpaDialect 경고 발생
// → DB가 아닌 메모리에서 페이징 → OutOfMemory 위험
@Query("SELECT o FROM Order o JOIN FETCH o.items")
Page<Order> findAll(Pageable pageable);  // 위험!

// 해결: @BatchSize 사용
@BatchSize(size = 100)
@OneToMany(mappedBy = "order")
private List<OrderItem> items;

// 또는 CountQuery 분리
@Query(value = "SELECT o FROM Order o",
       countQuery = "SELECT COUNT(o) FROM Order o")
Page<Order> findAll(Pageable pageable);
```
