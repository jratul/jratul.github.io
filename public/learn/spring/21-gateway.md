---
title: "Spring Cloud Gateway"
order: 21
---

## API Gateway란 무엇인가

API Gateway는 **마이크로서비스 앞에 위치하는 단일 진입점**입니다.

**건물 정문 보안데스크 비유:**
큰 건물에 들어가려면 보안데스크(Gateway)를 거쳐야 합니다. 보안데스크는:
- 신원 확인(인증)을 합니다
- "몇 층 가세요?" 묻고 해당 부서(서비스)로 안내(라우팅)합니다
- 출입 기록을 남깁니다(로깅)
- 한 사람이 너무 자주 오면 제한합니다(Rate Limiting)

```
클라이언트 앱
     │
     ▼
API Gateway (8080) ← 여기서 인증/라우팅/로깅 처리
     │
     ├──── /api/users/**   →  User Service  (8081)
     ├──── /api/orders/**  →  Order Service (8082)
     └──── /api/products/**→  Product Service (8083)
```

**마이크로서비스 없이 Gateway가 필요한 이유:**
- 각 서비스마다 JWT 검증 코드를 중복 작성하지 않아도 됨
- CORS 설정을 한 곳에서 관리
- 모든 요청/응답 로그를 한 곳에서 수집
- Rate Limiting을 서비스별로 다르게 적용

---

## 의존성

```groovy
// build.gradle
// 주의: Gateway는 WebFlux(리액티브) 기반 → spring-boot-starter-web과 함께 쓸 수 없음!
implementation 'org.springframework.cloud:spring-cloud-starter-gateway'
implementation 'org.springframework.cloud:spring-cloud-starter-netflix-eureka-client'  // 서비스 디스커버리

// dependencyManagement에 Spring Cloud BOM 추가
extra["springCloudVersion"] = "2023.0.1"

dependencyManagement {
    imports {
        mavenBom "org.springframework.cloud:spring-cloud-dependencies:${property("springCloudVersion")}"
    }
}
```

---

## 라우팅 설정

```yaml
# application.yml
spring:
  application:
    name: api-gateway

  cloud:
    gateway:
      routes:
        # ─────────────────────────────────────────
        # User Service 라우팅
        # ─────────────────────────────────────────
        - id: user-service
          uri: lb://USER-SERVICE    # lb:// = Eureka 로드밸런싱
          predicates:
            - Path=/api/users/**    # 이 경로로 들어오면 User Service로 전달
          filters:
            - StripPrefix=0         # 경로 앞부분 제거 수 (0=제거 안 함)
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 100   # 초당 100 요청 허용
                redis-rate-limiter.burstCapacity: 200   # 순간 최대 200 요청

        # ─────────────────────────────────────────
        # Order Service 라우팅
        # ─────────────────────────────────────────
        - id: order-service
          uri: lb://ORDER-SERVICE
          predicates:
            - Path=/api/orders/**
            - Method=GET,POST        # GET, POST만 허용 (DELETE는 이 라우트 안 탐)
          filters:
            # 요청에 헤더 추가 (어디서 왔는지 표시)
            - AddRequestHeader=X-Gateway-Source, api-gateway
            # 응답에 헤더 추가
            - AddResponseHeader=X-Service, order-service

        # ─────────────────────────────────────────
        # Product Service 라우팅 (특정 버전 헤더 포함 요청만)
        # ─────────────────────────────────────────
        - id: product-service-v2
          uri: http://product-service:8083
          predicates:
            - Path=/api/products/**
            - Header=X-Api-Version, v2    # X-Api-Version: v2 헤더 있는 요청만

      # 모든 라우트에 적용되는 기본 필터
      default-filters:
        - DedupeResponseHeader=Access-Control-Allow-Credentials Access-Control-Allow-Origin

      # CORS 전역 설정 (모든 라우트에 적용)
      globalcors:
        cors-configurations:
          '[/**]':
            allowedOrigins:
              - "https://my-app.com"
              - "http://localhost:3000"
            allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
            allowedHeaders: ["*"]
            allowCredentials: true
```

---

## JWT 인증 필터

Gateway에서 JWT를 검증하고, 검증된 사용자 정보를 내부 서비스로 전달합니다. 각 서비스는 JWT 검증 코드 없이 헤더만 읽으면 됩니다.

```java
@Component
@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private final JwtTokenProvider tokenProvider;

    // 인증 없이 접근 가능한 경로 목록
    private final List<String> publicPaths = List.of(
        "/api/auth/login",
        "/api/auth/signup",
        "/api/auth/refresh",
        "/api/products"      // 상품 조회는 비로그인도 가능
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        // 공개 경로면 인증 건너뜀
        if (publicPaths.stream().anyMatch(path::startsWith)) {
            return chain.filter(exchange);
        }

        // Authorization 헤더에서 JWT 추출
        String token = resolveToken(exchange.getRequest());

        // 토큰 없거나 유효하지 않으면 401
        if (token == null || !tokenProvider.validateToken(token)) {
            log.warn("인증 실패: path={}, token={}", path,
                token == null ? "없음" : "유효하지 않음");
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        // JWT에서 사용자 정보 추출
        String userId   = tokenProvider.getUserId(token);
        String userRole = tokenProvider.getRole(token);

        log.debug("인증 성공: userId={}, role={}, path={}", userId, userRole, path);

        // 사용자 정보를 헤더에 추가해서 내부 서비스로 전달
        // → 내부 서비스는 JWT 검증 없이 헤더만 읽으면 됨
        ServerWebExchange mutated = exchange.mutate()
            .request(req -> req
                .header("X-User-Id", userId)      // 사용자 ID
                .header("X-User-Role", userRole)   // 권한 (ADMIN, USER 등)
            )
            .build();

        return chain.filter(mutated);
    }

    @Override
    public int getOrder() {
        return -100;  // 낮은 숫자 = 먼저 실행 (다른 필터보다 먼저 인증 처리)
    }

    private String resolveToken(ServerHttpRequest request) {
        String bearer = request.getHeaders().getFirst("Authorization");
        // "Bearer {token}" 형식에서 토큰 부분만 추출
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
```

---

## 내부 서비스에서 사용자 정보 읽기

```java
// 각 마이크로서비스 Controller
// Gateway가 검증 후 헤더로 넣어준 값만 읽으면 됨 (JWT 검증 코드 없음)
@GetMapping("/api/orders")
public ResponseEntity<List<OrderResponse>> getMyOrders(
        @RequestHeader("X-User-Id") Long userId,        // Gateway가 넣어준 헤더
        @RequestHeader("X-User-Role") String role) {

    log.info("주문 목록 조회: userId={}, role={}", userId, role);
    return ResponseEntity.ok(orderService.findByUserId(userId));
}

@PostMapping("/api/orders")
public ResponseEntity<OrderResponse> createOrder(
        @RequestBody @Valid CreateOrderRequest request,
        @RequestHeader("X-User-Id") Long userId) {      // Gateway가 넣어준 사용자 ID

    return ResponseEntity.status(HttpStatus.CREATED)
        .body(orderService.createOrder(userId, request));
}
```

---

## Rate Limiting (요청 속도 제한)

Redis 기반 토큰 버킷 알고리즘으로 요청 수를 제한합니다.

```groovy
// Redis 리액티브 의존성 추가 필요
implementation 'org.springframework.boot:spring-boot-starter-data-redis-reactive'
```

```java
@Configuration
public class RateLimiterConfig {

    // IP 기반 Rate Limiting (비로그인 API)
    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> Mono.just(
            exchange.getRequest()
                .getRemoteAddress()
                .getAddress()
                .getHostAddress()  // 클라이언트 IP
        );
    }

    // 사용자 ID 기반 Rate Limiting (로그인 API)
    // Gateway의 JWT 필터가 X-User-Id 헤더를 넣어줌
    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> Mono.justOrEmpty(
            exchange.getRequest().getHeaders().getFirst("X-User-Id")
        ).defaultIfEmpty("anonymous");  // 미로그인은 "anonymous"로 묶어서 제한
    }
}
```

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: api
          uri: lb://ORDER-SERVICE
          predicates:
            - Path=/api/orders/**
          filters:
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 50    # 초당 50 토큰 보충
                redis-rate-limiter.burstCapacity: 100   # 버킷 최대 용량 100
                redis-rate-limiter.requestedTokens: 1   # 요청당 1 토큰 소모
                key-resolver: "#{@userKeyResolver}"     # 사용자별 제한
```

---

## 커스텀 필터 - 요청 로깅

```java
@Component
@Slf4j
public class RequestLoggingFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        // 요청 ID로 로그 추적 (분산 환경에서 요청 흐름 추적)
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        long startTime = System.currentTimeMillis();

        log.info("[{}] → {} {} | IP: {}",
            requestId,
            request.getMethod(),
            request.getURI(),
            getClientIp(request));

        return chain.filter(exchange)
            .then(Mono.fromRunnable(() -> {
                // 응답 후 처리 (응답 시간 로깅)
                long elapsed = System.currentTimeMillis() - startTime;
                log.info("[{}] ← {} {}ms",
                    requestId,
                    exchange.getResponse().getStatusCode(),
                    elapsed);

                // 느린 요청 경고 (1초 초과)
                if (elapsed > 1000) {
                    log.warn("[{}] 느린 요청: {}ms", requestId, elapsed);
                }
            }));
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;  // 마지막에 실행 (응답 시간 정확히 측정)
    }

    private String getClientIp(ServerHttpRequest request) {
        String xForwardedFor = request.getHeaders().getFirst("X-Forwarded-For");
        if (xForwardedFor != null) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddress() != null
            ? request.getRemoteAddress().getAddress().getHostAddress()
            : "unknown";
    }
}
```

---

## Eureka 서비스 디스커버리

서비스 인스턴스가 여러 대일 때, Gateway가 자동으로 로드밸런싱합니다.

```yaml
# Eureka 서버 설정 (별도 서비스로 실행)
# 각 마이크로서비스 application.yml
spring:
  application:
    name: USER-SERVICE    # Eureka에 등록될 이름 (lb://USER-SERVICE)

eureka:
  client:
    service-url:
      defaultZone: http://eureka-server:8761/eureka/
  instance:
    prefer-ip-address: true   # hostname 대신 IP로 등록
    lease-renewal-interval-in-seconds: 30   # 30초마다 헬스체크

---
# Gateway application.yml
eureka:
  client:
    service-url:
      defaultZone: http://eureka-server:8761/eureka/

spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://USER-SERVICE    # Eureka에 USER-SERVICE 인스턴스들을 자동으로 찾아서 로드밸런싱
          predicates:
            - Path=/api/users/**
```

---

## 폴백 설정 (서비스 장애 시)

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: payment-service
          uri: lb://PAYMENT-SERVICE
          predicates:
            - Path=/api/payments/**
          filters:
            - name: CircuitBreaker
              args:
                name: paymentService          # Resilience4j 서킷브레이커 이름
                fallbackUri: forward:/fallback/payment   # 장애 시 이 경로로 포워딩
```

```java
// 폴백 컨트롤러 (같은 Gateway 서버 안에)
@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @GetMapping("/payment")
    public ResponseEntity<ErrorResponse> paymentFallback(
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        log.warn("결제 서비스 폴백 응답: userId={}", userId);
        return ResponseEntity
            .status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(new ErrorResponse(
                "PAYMENT_SERVICE_UNAVAILABLE",
                "결제 서비스가 일시적으로 점검 중입니다. 잠시 후 다시 시도해주세요."
            ));
    }

    @GetMapping("/order")
    public ResponseEntity<ErrorResponse> orderFallback() {
        return ResponseEntity
            .status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(new ErrorResponse(
                "ORDER_SERVICE_UNAVAILABLE",
                "주문 서비스가 일시적으로 점검 중입니다."
            ));
    }
}
```

---

## 필터 실행 순서 이해하기

```
요청 처리 순서:
1. JwtAuthenticationFilter (order: -100) → 인증 검증
2. RequestLoggingFilter (order: LOWEST) → 요청 로그 시작
3. RouteFilter (StripPrefix, AddHeader 등) → 라우트별 필터
4. 내부 서비스로 전달
5. 응답 받기
6. RouteFilter → 응답 필터
7. RequestLoggingFilter → 응답 시간 로그

Ordered.LOWEST_PRECEDENCE = Integer.MAX_VALUE (가장 나중에 실행)
숫자가 낮을수록 먼저 실행
```

---

## 초보자가 자주 하는 실수

**실수 1: spring-boot-starter-web과 함께 사용**

```groovy
// 이렇게 하면 충돌!
implementation 'org.springframework.boot:spring-boot-starter-web'       // Servlet 기반
implementation 'org.springframework.cloud:spring-cloud-starter-gateway' // WebFlux 기반

// Gateway만 있어야 함 (web 제거)
implementation 'org.springframework.cloud:spring-cloud-starter-gateway'
```

**실수 2: lb:// 사용 시 Eureka 없음**

```yaml
# lb://USER-SERVICE를 쓰려면 Eureka(또는 다른 서비스 디스커버리) 필요
uri: lb://USER-SERVICE   # Eureka 없으면 503 오류

# Eureka 없이 테스트하려면 직접 주소 사용
uri: http://localhost:8081
```

**실수 3: GlobalFilter에서 응답 수정 후 체인 호출 안 함**

```java
// 나쁜 예: chain.filter 호출 안 하면 요청이 내부 서비스로 전달 안 됨
public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    // 처리 후...
    return exchange.getResponse().setComplete();  // 잘못됨 (전달 안 됨)
}

// 올바른 예
public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    // 전처리...
    return chain.filter(exchange)  // 내부 서비스로 전달
        .then(Mono.fromRunnable(() -> {
            // 후처리...
        }));
}
```
