---
title: "로드 밸런싱과 API 게이트웨이"
order: 3
---

# 로드 밸런싱과 API 게이트웨이

트래픽 분산과 API 관리.

---

## 로드 밸런서 동작

```
역할:
— 클라이언트 요청을 여러 서버에 분산
— 서버 상태 모니터링 (Health Check)
— 장애 서버 자동 제외
— SSL Termination

위치:
Client → [L4 LB] → [L7 LB] → [App Server]

L4 (Transport Layer):
— TCP/UDP 수준에서 분산
— IP + Port 기반
— 빠름, 단순
— AWS NLB

L7 (Application Layer):
— HTTP 수준에서 분산
— URL, 헤더, 쿠키 기반
— 스마트한 라우팅 가능
— AWS ALB, Nginx
```

---

## 로드 밸런싱 알고리즘

```
Round Robin (라운드 로빈):
요청 1 → Server A
요청 2 → Server B
요청 3 → Server C
요청 4 → Server A ...
장점: 단순, 균등 분산
단점: 서버 처리 속도 차이 무시

Weighted Round Robin:
Server A (weight=3): 요청 1,2,3
Server B (weight=1): 요청 4
서버 스펙에 비례한 분산

Least Connections:
— 현재 연결 수가 가장 적은 서버로
— 처리 시간이 다른 경우 유리

IP Hash:
— hash(client_ip) % server_count
— 같은 클라이언트 → 항상 같은 서버
— 세션 유지에 유용 (Sticky Session)
— 단점: 서버 추가 시 재분배

Least Response Time:
— 응답 시간 + 연결 수 고려
— 가장 빠른 서버로 라우팅
```

---

## Nginx 로드 밸런서 설정

```nginx
# /etc/nginx/nginx.conf

upstream backend {
    # Round Robin (기본)
    server app1:8080;
    server app2:8080;
    server app3:8080;

    # 서버 가중치
    # server app1:8080 weight=3;
    # server app2:8080 weight=1;

    # Least Connections
    # least_conn;

    # IP Hash
    # ip_hash;

    # 헬스체크
    server app1:8080 max_fails=3 fail_timeout=30s;
    server app2:8080 max_fails=3 fail_timeout=30s;

    # Keep-alive 연결
    keepalive 32;
}

server {
    listen 80;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 타임아웃
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 헬스체크 엔드포인트
    location /health {
        access_log off;
        return 200 "healthy\n";
    }
}

# SSL Termination
server {
    listen 443 ssl;
    ssl_certificate /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://backend;
    }
}
```

---

## API 게이트웨이

```
역할:
— 단일 진입점 (Single Entry Point)
— 인증/인가
— Rate Limiting
— 요청/응답 변환
— 로깅, 모니터링
— SSL Termination
— 라우팅

클라이언트 → API Gateway → 마이크로서비스
                    ├── /users → User Service
                    ├── /orders → Order Service
                    ├── /products → Product Service
                    └── /payments → Payment Service

API Gateway 도구:
— AWS API Gateway
— Kong
— Netflix Zuul
— Spring Cloud Gateway
— Nginx + Lua
```

---

## Spring Cloud Gateway

```yaml
# application.yml
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service  # 로드 밸런서를 통해
          predicates:
            - Path=/api/users/**
          filters:
            - StripPrefix=1
            - name: CircuitBreaker
              args:
                name: userServiceCB
                fallbackUri: forward:/fallback/users

        - id: order-service
          uri: lb://order-service
          predicates:
            - Path=/api/orders/**
            - Header=X-API-Version, 2  # 헤더 조건
          filters:
            - AddRequestHeader=X-User-ID, #{principal.name}

      # 전역 필터
      default-filters:
        - name: RequestRateLimiter
          args:
            redis-rate-limiter.replenishRate: 100
            redis-rate-limiter.burstCapacity: 200
            key-resolver: "#{@userKeyResolver}"
```

```java
@Configuration
public class GatewayConfig {

    // Rate Limiter 키 (사용자별)
    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> Mono.just(
            exchange.getRequest().getHeaders()
                .getFirst("X-User-ID") != null
                ? exchange.getRequest().getHeaders().getFirst("X-User-ID")
                : "anonymous"
        );
    }

    // Fallback 응답
    @RestController
    public class FallbackController {
        @GetMapping("/fallback/users")
        public ResponseEntity<Map<String, String>> userFallback() {
            return ResponseEntity.status(503)
                .body(Map.of("message", "User service is temporarily unavailable"));
        }
    }
}
```

---

## Rate Limiting

```
목적:
— API 남용 방지
— 공정한 자원 분배
— DDoS 방어

알고리즘:

Token Bucket:
— 버킷에 토큰 일정 속도로 충전 (replenish)
— 요청마다 토큰 소비
— 버킷 가득 차면 새 토큰 버림
— 버스트(급증) 허용

Leaky Bucket:
— 요청을 큐에 넣음
— 일정 속도로 처리
— 큐 초과 시 요청 거부
— 일정한 처리 속도 보장

Fixed Window:
— 1분 창에 100개 허용
— 단점: 창 경계에서 200개 가능 (59초, 1초)

Sliding Window:
— 마지막 1분 동안 100개 허용
— 더 정확하지만 복잡

Redis 기반 구현:
```

```java
@Component
@RequiredArgsConstructor
public class RateLimiter {

    private final RedisTemplate<String, String> redisTemplate;

    // Sliding Window Log 방식
    public boolean isAllowed(String userId, int maxRequests, Duration window) {
        String key = "rate_limit:" + userId;
        long now = System.currentTimeMillis();
        long windowStart = now - window.toMillis();

        // 오래된 요청 제거 + 현재 요청 추가
        redisTemplate.execute(new SessionCallback<>() {
            @Override
            public Object execute(RedisOperations operations) {
                operations.multi();
                operations.opsForZSet().removeRangeByScore(key, 0, windowStart);
                operations.opsForZSet().add(key, String.valueOf(now), now);
                operations.expire(key, window);
                return operations.exec();
            }
        });

        Long count = redisTemplate.opsForZSet().count(key, windowStart, now);
        return count != null && count <= maxRequests;
    }
}
```

---

## Circuit Breaker

```
상태 전환:
Closed → Open → Half-Open → Closed

Closed (정상):
— 모든 요청 통과
— 실패율 추적
— 실패율 > 임계값 → Open

Open (차단):
— 모든 요청 즉시 실패 반환
— 다운스트림 서비스 부하 차단
— 일정 시간 후 → Half-Open

Half-Open (탐색):
— 일부 요청만 통과
— 성공 → Closed로 복귀
— 실패 → Open 유지

Resilience4j 설정:
```

```java
@Configuration
public class CircuitBreakerConfig {

    @Bean
    public Customizer<Resilience4JCircuitBreakerFactory> circuitBreakerCustomizer() {
        return factory -> factory.configureDefault(id ->
            new Resilience4JConfigBuilder(id)
                .circuitBreakerConfig(
                    io.github.resilience4j.circuitbreaker.CircuitBreakerConfig.custom()
                        .failureRateThreshold(50)           // 50% 실패 시 Open
                        .waitDurationInOpenState(Duration.ofSeconds(30))
                        .slidingWindowSize(10)              // 최근 10개 요청 기준
                        .permittedNumberOfCallsInHalfOpenState(3)
                        .build()
                )
                .timeLimiterConfig(
                    TimeLimiterConfig.custom()
                        .timeoutDuration(Duration.ofSeconds(3))
                        .build()
                )
                .build()
        );
    }
}

@Service
@RequiredArgsConstructor
public class UserService {

    private final CircuitBreakerFactory circuitBreakerFactory;
    private final UserClient userClient;

    public User getUser(Long userId) {
        CircuitBreaker cb = circuitBreakerFactory.create("user-service");
        return cb.run(
            () -> userClient.getUser(userId),
            throwable -> getDefaultUser(userId)  // Fallback
        );
    }

    private User getDefaultUser(Long userId) {
        return User.builder().id(userId).name("Unknown").build();
    }
}
```
