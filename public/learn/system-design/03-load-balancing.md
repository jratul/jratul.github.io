---
title: "로드 밸런싱과 API 게이트웨이"
order: 3
---

# 로드 밸런싱과 API 게이트웨이

---

## 로드 밸런서란?

**비유**: 은행 창구가 여러 개 있을 때, 입구의 안내원이 "2번 창구로 가세요"라고 안내합니다. 로드 밸런서가 바로 이 안내원 역할입니다.

```
로드 밸런서의 역할:
  1. 여러 서버에 트래픽 분산 (과부하 방지)
  2. 비정상 서버 자동 제외 (Health Check)
  3. SSL 인증서 처리 (SSL Termination)
  4. 클라이언트 IP 은닉

아키텍처:
Client → [Load Balancer] → [App Server 1]
                         → [App Server 2]
                         → [App Server 3]
```

---

## L4 vs L7 로드 밸런서

```
L4 로드 밸런서 (Transport Layer):
  TCP/UDP 수준에서 분산
  IP + Port 기반으로 판단
  HTTP 내용은 보지 않음
  장점: 빠름, 단순
  단점: 스마트한 라우팅 불가
  예: AWS NLB

L7 로드 밸런서 (Application Layer):
  HTTP 수준에서 분산
  URL, 헤더, 쿠키 내용을 보고 판단
  장점: 유연한 라우팅 (/api/users → User Service)
  단점: L4보다 약간 느림
  예: AWS ALB, Nginx

     Client
       ↓
    [L4 LB] ← IP 기반 빠른 분산
       ↓
    [L7 LB] ← URL/헤더 기반 스마트 라우팅
       ↓
  [App Server]
```

---

## 로드 밸런싱 알고리즘

```
Round Robin (라운드 로빈):
  1번 요청 → Server A
  2번 요청 → Server B
  3번 요청 → Server C
  4번 요청 → Server A ...
  장점: 단순, 균등 분산
  단점: 서버 처리 속도 차이 무시

Weighted Round Robin:
  Server A (weight=3), Server B (weight=1)
  → A가 3배 더 많이 받음
  사용: 서버 스펙이 다를 때

Least Connections (최소 연결):
  현재 활성 연결이 가장 적은 서버로
  장점: 처리 시간이 다를 때 유리
  사용: 장기 연결 (WebSocket, gRPC)

IP Hash:
  hash(client_ip) % server_count
  같은 클라이언트 → 항상 같은 서버
  장점: 세션 유지 필요한 경우
  단점: 서버 추가/제거 시 재배분 문제

Least Response Time:
  응답 시간 × 연결 수가 가장 작은 서버로
  가장 빠른 서버에 더 많이 보냄
```

---

## Nginx 로드 밸런서 설정

```nginx
# /etc/nginx/nginx.conf

upstream backend {
    # 기본: Round Robin
    server app1:8080;
    server app2:8080;
    server app3:8080;

    # 가중치 설정
    # server app1:8080 weight=3;
    # server app2:8080 weight=1;

    # Least Connections
    # least_conn;

    # IP Hash
    # ip_hash;

    # 헬스체크: 3번 실패하면 30초간 제외
    server app1:8080 max_fails=3 fail_timeout=30s;
    server app2:8080 max_fails=3 fail_timeout=30s;

    # Keep-alive 연결 재사용
    keepalive 32;
}

server {
    listen 80;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";        # Keep-alive
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 타임아웃 설정
        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
    }
}

# HTTPS + SSL Termination (클라이언트↔LB만 암호화)
server {
    listen 443 ssl;
    ssl_certificate     /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://backend;  # 내부는 HTTP (성능 향상)
    }
}
```

---

## API 게이트웨이

마이크로서비스 환경에서 모든 요청이 통과하는 단일 진입점.

```
역할:
  인증/인가      → JWT 검증
  라우팅         → URL에 따라 적절한 서비스로 전달
  Rate Limiting  → 과도한 요청 차단
  로깅/모니터링  → 모든 요청 기록
  요청/응답 변환 → 버전 호환성 처리
  SSL Termination

아키텍처:
Client
  ↓
[API Gateway]
  ├── /api/users/**    → User Service
  ├── /api/orders/**   → Order Service
  ├── /api/products/** → Product Service
  └── /api/payments/** → Payment Service

도구:
  Spring Cloud Gateway (Java 친화적)
  AWS API Gateway
  Kong
  Netflix Zuul (레거시)
```

### Spring Cloud Gateway 설정

```yaml
# application.yml
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service   # 유레카 서비스 디스커버리
          predicates:
            - Path=/api/users/**
          filters:
            - StripPrefix=1        # /api 제거 후 전달
            - name: CircuitBreaker
              args:
                name: userServiceCB
                fallbackUri: forward:/fallback/users

        - id: order-service
          uri: lb://order-service
          predicates:
            - Path=/api/orders/**
            - Header=X-API-Version, 2  # v2 헤더가 있을 때만
          filters:
            - AddRequestHeader=X-Gateway-Source, api-gateway

      # 전역 Rate Limiting
      default-filters:
        - name: RequestRateLimiter
          args:
            redis-rate-limiter.replenishRate: 100   # 초당 100
            redis-rate-limiter.burstCapacity: 200   # 최대 버스트
            key-resolver: "#{@userKeyResolver}"
```

```java
@Configuration
public class GatewayConfig {

    // Rate Limiting 키: 사용자별
    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> {
            String userId = exchange.getRequest().getHeaders().getFirst("X-User-ID");
            return Mono.just(userId != null ? userId : "anonymous");
        };
    }

    // 서비스 장애 시 Fallback
    @RestController
    public class FallbackController {
        @GetMapping("/fallback/users")
        public ResponseEntity<Map<String, String>> userFallback() {
            return ResponseEntity.status(503)
                .body(Map.of(
                    "error", "USER_SERVICE_UNAVAILABLE",
                    "message", "사용자 서비스가 일시적으로 사용 불가합니다."
                ));
        }
    }
}
```

---

## Rate Limiting (요청 제한)

API 남용을 방지하고 공평한 자원 분배를 위해 필요합니다.

```
알고리즘:

Token Bucket (토큰 버킷):
  버킷에 토큰이 일정 속도로 충전됨
  요청마다 토큰 1개 소비
  버킷이 비면 요청 거부
  장점: 버스트(급증) 허용
  사용: 대부분의 API Rate Limiting

Leaky Bucket (누수 버킷):
  요청을 큐에 쌓음
  일정 속도로 처리
  큐가 차면 요청 버림
  장점: 처리 속도 일정
  사용: 트래픽 평탄화

Fixed Window:
  1분 창에 100개 허용
  단점: 59초에 100개 + 1분 1초에 100개 = 2배 가능

Sliding Window:
  마지막 1분 동안 100개 허용 (더 정확)
  Redis Sorted Set으로 구현
```

```java
// Redis 기반 Sliding Window Rate Limiter
@Component
@RequiredArgsConstructor
public class RateLimiter {

    private final RedisTemplate<String, String> redisTemplate;

    public boolean isAllowed(String userId, int maxRequests, Duration window) {
        String key = "rate_limit:" + userId;
        long now = System.currentTimeMillis();
        long windowStart = now - window.toMillis();

        // Lua 스크립트로 원자적 처리
        String luaScript = """
            local key = KEYS[1]
            local now = tonumber(ARGV[1])
            local windowStart = tonumber(ARGV[2])
            local maxRequests = tonumber(ARGV[3])
            local window = tonumber(ARGV[4])

            redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
            local count = redis.call('ZCARD', key)

            if count < maxRequests then
                redis.call('ZADD', key, now, now)
                redis.call('EXPIRE', key, window)
                return 1
            else
                return 0
            end
            """;

        Long result = redisTemplate.execute(
            new DefaultRedisScript<>(luaScript, Long.class),
            List.of(key),
            String.valueOf(now),
            String.valueOf(windowStart),
            String.valueOf(maxRequests),
            String.valueOf(window.toSeconds())
        );
        return Long.valueOf(1).equals(result);
    }
}
```

---

## Circuit Breaker (회로 차단기)

서비스 장애가 연쇄적으로 퍼지는 것을 방지합니다.

```
비유: 집에 과전류가 흐를 때 전체 전선이 타지 않도록
      두꺼비집(차단기)이 전기를 끊는 것과 같습니다.

상태 전환:
  Closed (정상)
    → 요청 통과
    → 실패율 추적
    → 실패율 > 50% → Open

  Open (차단됨)
    → 즉시 실패 반환 (Fallback)
    → 다운스트림 서비스를 더 이상 괴롭히지 않음
    → 30초 후 → Half-Open

  Half-Open (탐색 중)
    → 일부 요청만 통과 (탐색)
    → 성공 → Closed (정상화)
    → 실패 → Open (다시 차단)
```

```java
// Resilience4j Circuit Breaker
@Configuration
public class CircuitBreakerConfig {

    @Bean
    public Customizer<Resilience4JCircuitBreakerFactory> defaultCustomizer() {
        return factory -> factory.configureDefault(id ->
            new Resilience4JConfigBuilder(id)
                .circuitBreakerConfig(
                    io.github.resilience4j.circuitbreaker.CircuitBreakerConfig.custom()
                        .failureRateThreshold(50)                          // 50% 실패 시 Open
                        .waitDurationInOpenState(Duration.ofSeconds(30))    // 30초 대기
                        .slidingWindowSize(10)                              // 최근 10개 기준
                        .permittedNumberOfCallsInHalfOpenState(3)           // Half-Open에서 3개 허용
                        .build()
                )
                .timeLimiterConfig(
                    TimeLimiterConfig.custom()
                        .timeoutDuration(Duration.ofSeconds(3))  // 3초 타임아웃
                        .build()
                )
                .build()
        );
    }
}

@Service
@RequiredArgsConstructor
public class UserService {

    private final CircuitBreakerFactory cbFactory;
    private final UserClient userClient;

    public User getUser(Long userId) {
        CircuitBreaker cb = cbFactory.create("user-service");
        return cb.run(
            () -> userClient.getUser(userId),           // 실제 호출
            throwable -> getDefaultUser(userId)          // Fallback
        );
    }

    private User getDefaultUser(Long userId) {
        // 서비스 장애 시 기본값 반환
        return User.builder()
            .id(userId)
            .name("Unknown User")
            .build();
    }
}
```

---

## 서비스 디스커버리

마이크로서비스 환경에서 서비스의 IP/포트가 동적으로 변합니다.

```
문제: app1:8080으로 하드코딩 → 서버 추가/제거 시 문제

해결: Service Registry
  1. 각 서비스가 실행 시 레지스트리에 자신을 등록
  2. 클라이언트가 레지스트리에서 서비스 위치 조회
  3. 로드 밸런서가 등록된 인스턴스에 분산

                  [Eureka Server (Registry)]
                   ↑등록       ↓조회
  [User Service] ─────────── [API Gateway]
  [Order Service]
  [Product Service]

Client-side LB (Ribbon):
  클라이언트가 직접 인스턴스 목록을 받아서 선택

Server-side LB (AWS ALB):
  로드 밸런서가 레지스트리를 조회해서 분산
```
