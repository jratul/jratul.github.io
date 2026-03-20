---
title: "Spring Cloud Gateway"
order: 21
---

## API Gateway 역할

마이크로서비스 앞단에 위치해 라우팅, 인증, 로드밸런싱, Rate Limiting을 처리합니다.

```
Client
  ↓
API Gateway (8080)
  ├── /api/users/**   → User Service  (8081)
  ├── /api/orders/**  → Order Service (8082)
  └── /api/products/**→ Product Service (8083)
```

---

## 의존성

```groovy
// Gateway는 WebFlux(논블로킹) 기반 — spring-boot-starter-web과 함께 쓸 수 없음
implementation 'org.springframework.cloud:spring-cloud-starter-gateway'
implementation 'org.springframework.cloud:spring-cloud-starter-netflix-eureka-client'  // 서비스 디스커버리

// dependencyManagement
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
        # User Service
        - id: user-service
          uri: lb://USER-SERVICE  # Eureka로 로드밸런싱
          predicates:
            - Path=/api/users/**
          filters:
            - StripPrefix=0
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 100
                redis-rate-limiter.burstCapacity: 200

        # Order Service
        - id: order-service
          uri: lb://ORDER-SERVICE
          predicates:
            - Path=/api/orders/**
            - Method=GET,POST
          filters:
            - AddRequestHeader=X-Gateway-Source, api-gateway
            - AddResponseHeader=X-Response-Time, ${currentTime}

        # 정적 URL
        - id: product-service
          uri: http://product-service:8083
          predicates:
            - Path=/api/products/**
            - Header=X-Api-Version, v2

      default-filters:
        - DedupeResponseHeader=Access-Control-Allow-Credentials Access-Control-Allow-Origin

  # CORS 전역 설정
  cloud:
    gateway:
      globalcors:
        cors-configurations:
          '[/**]':
            allowedOrigins:
              - "https://my-app.com"
              - "http://localhost:3000"
            allowedMethods: ["GET", "POST", "PUT", "DELETE"]
            allowedHeaders: ["*"]
            allowCredentials: true
```

---

## JWT 인증 필터

Gateway에서 JWT를 검증하고 내부 서비스로 사용자 정보를 전달합니다.

```java
@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private final JwtTokenProvider tokenProvider;

    // 인증 불필요 경로
    private final List<String> excludedPaths = List.of(
        "/api/auth/login",
        "/api/auth/signup",
        "/api/products"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        if (excludedPaths.stream().anyMatch(path::startsWith)) {
            return chain.filter(exchange);
        }

        String token = resolveToken(exchange.getRequest());

        if (token == null || !tokenProvider.validateToken(token)) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        // 사용자 정보를 헤더에 추가하여 내부 서비스로 전달
        String userId   = tokenProvider.getUserId(token);
        String userRole = tokenProvider.getRole(token);

        ServerWebExchange mutated = exchange.mutate()
            .request(r -> r
                .header("X-User-Id", userId)
                .header("X-User-Role", userRole))
            .build();

        return chain.filter(mutated);
    }

    @Override
    public int getOrder() {
        return -100;  // 다른 필터보다 먼저 실행
    }

    private String resolveToken(ServerHttpRequest request) {
        String bearer = request.getHeaders().getFirst("Authorization");
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
@GetMapping("/api/orders")
public ResponseEntity<List<OrderResponse>> getMyOrders(
        @RequestHeader("X-User-Id") Long userId,      // Gateway가 넣어준 헤더
        @RequestHeader("X-User-Role") String role) {

    return ResponseEntity.ok(orderService.findByUserId(userId));
}
```

---

## Rate Limiting (Redis 기반)

```groovy
implementation 'org.springframework.boot:spring-boot-starter-data-redis-reactive'
```

```java
@Bean
public KeyResolver userKeyResolver() {
    // IP 기반 Rate Limiting
    return exchange -> Mono.just(
        exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
    );
}

// 사용자 ID 기반 (인증 후)
@Bean
public KeyResolver authUserKeyResolver() {
    return exchange -> Mono.justOrEmpty(
        exchange.getRequest().getHeaders().getFirst("X-User-Id")
    ).defaultIfEmpty("anonymous");
}
```

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: api
          uri: lb://USER-SERVICE
          predicates:
            - Path=/api/**
          filters:
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 50   # 초당 50 요청
                redis-rate-limiter.burstCapacity: 100  # 순간 최대 100
                redis-rate-limiter.requestedTokens: 1
                key-resolver: "#{@userKeyResolver}"
```

---

## 커스텀 필터

```java
@Component
public class RequestLoggingFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String requestId = UUID.randomUUID().toString().substring(0, 8);

        log.info("[{}] {} {}", requestId, request.getMethod(), request.getURI());

        long startTime = System.currentTimeMillis();

        return chain.filter(exchange).then(Mono.fromRunnable(() -> {
            long elapsed = System.currentTimeMillis() - startTime;
            log.info("[{}] {} {}ms",
                requestId,
                exchange.getResponse().getStatusCode(),
                elapsed);
        }));
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
```

---

## Eureka 서비스 디스커버리

각 서비스가 Eureka에 등록되면 Gateway가 자동으로 라우팅합니다.

```yaml
# 각 마이크로서비스 application.yml
spring:
  application:
    name: USER-SERVICE  # Eureka에 등록될 이름

eureka:
  client:
    service-url:
      defaultZone: http://eureka-server:8761/eureka/
  instance:
    prefer-ip-address: true
```

```yaml
# Gateway application.yml
eureka:
  client:
    service-url:
      defaultZone: http://eureka-server:8761/eureka/

# lb://SERVICE-NAME으로 자동 로드밸런싱
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://USER-SERVICE  # Eureka에서 USER-SERVICE 인스턴스 찾아 라우팅
          predicates:
            - Path=/api/users/**
```
