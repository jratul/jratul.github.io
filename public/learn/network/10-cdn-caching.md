---
title: "CDN과 캐싱"
order: 10
---

# CDN과 캐싱

응답 속도를 높이고 서버 부하를 줄이는 핵심 기술.

---

## CDN (Content Delivery Network)

```
문제: 서울 서버에서 미국 사용자에게 응답 → 150ms 레이턴시

CDN 해결:
사용자 ← [가장 가까운 엣지 서버] ← [오리진 서버 (서울)]

엣지 서버가 콘텐츠를 캐시하고 가까운 곳에서 응답
→ 레이턴시 10ms 수준으로 감소

활용:
— 정적 파일 (JS, CSS, 이미지, 폰트)
— API 응답 캐싱
— 동적 콘텐츠 가속 (TCP 최적화)
```

---

## 주요 CDN 서비스

```
AWS CloudFront:
— AWS 서비스와 통합 (S3, ALB, Lambda@Edge)
— 전 세계 450+ PoP (Points of Presence)
— Lambda@Edge: 엣지에서 코드 실행

Cloudflare:
— 무료 플랜 있음
— DDoS 방어 강력
— Workers: 엣지 컴퓨팅
— 전 세계 300+ PoP

CloudFront + S3 정적 사이트:
S3 버킷 → CloudFront 배포 → 전 세계 배포
```

---

## HTTP 캐시 제어

```
Cache-Control 지시자:

no-store      — 캐시 완전 금지 (민감한 데이터)
no-cache      — 저장하되 매번 서버 검증
public        — 공유 캐시(CDN, 프록시)에 저장 가능
private       — 브라우저만 저장 (CDN 금지)
max-age=N     — N초간 캐시 유효
s-maxage=N    — 공유 캐시(CDN)의 유효 시간 (max-age보다 우선)
must-revalidate — 만료 후 반드시 재검증
immutable     — 캐시 기간 동안 절대 변경 안 됨 (버전된 파일에 사용)

예시:
Cache-Control: public, max-age=86400          — CDN 1일 캐시
Cache-Control: private, max-age=3600          — 브라우저만 1시간
Cache-Control: no-cache                        — 매번 검증
Cache-Control: public, max-age=31536000, immutable  — 1년 (해시 포함 파일)
```

---

## ETag와 조건부 요청

```
1. 첫 번째 요청:
GET /api/products/123

응답:
200 OK
ETag: "abc123def456"
Cache-Control: no-cache
{"id": 123, "name": "맥북", "price": 2000000}

2. 다음 요청 (캐시 검증):
GET /api/products/123
If-None-Match: "abc123def456"

응답 (변경 없음):
304 Not Modified
ETag: "abc123def456"
(바디 없음 — 대역폭 절약!)

응답 (변경됨):
200 OK
ETag: "xyz789"
{"id": 123, "name": "맥북", "price": 1900000}
```

```java
// Spring Boot ETag 지원
@Bean
public FilterRegistrationBean<ShallowEtagHeaderFilter> etagFilter() {
    FilterRegistrationBean<ShallowEtagHeaderFilter> registration =
        new FilterRegistrationBean<>(new ShallowEtagHeaderFilter());
    registration.addUrlPatterns("/api/*");
    return registration;
}

// 또는 컨트롤러에서 직접
@GetMapping("/products/{id}")
public ResponseEntity<ProductResponse> getProduct(
    @PathVariable Long id,
    WebRequest request
) {
    ProductResponse product = productService.findById(id);
    String etag = "\"" + product.getVersion() + "\"";

    if (request.checkNotModified(etag)) {
        return null; // 304 자동 반환
    }

    return ResponseEntity.ok()
        .eTag(etag)
        .cacheControl(CacheControl.noCache())
        .body(product);
}
```

---

## 캐시 무효화 전략

```
문제: CDN에 잘못된 데이터 캐시됨 → 어떻게 초기화?

1. URL에 버전/해시 포함 (권장):
/static/app.js?v=abc123
/static/app.abc123.js
→ 파일 변경 시 URL 자체가 달라짐
→ CDN 무효화 불필요

2. 명시적 캐시 무효화:
AWS CloudFront → Invalidation 생성
GET /static/app.js 캐시 삭제 → 비용 발생

3. 짧은 TTL:
Cache-Control: max-age=60  → 1분 후 자동 갱신
→ 일관성 vs 성능 트레이드오프

파일 종류별 TTL 권장:
HTML:          no-cache (또는 max-age=60)
JS/CSS (해시): max-age=31536000, immutable  (1년)
이미지:        max-age=604800  (7일)
API 응답:      no-cache + ETag
```

---

## Spring Boot 캐시 헤더 설정

```java
// 정적 리소스 캐시
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/static/**")
            .addResourceLocations("classpath:/static/")
            .setCacheControl(CacheControl.maxAge(365, TimeUnit.DAYS)
                .cachePublic()
                .immutable());
    }
}

// API 응답 캐시 헤더
@GetMapping("/public/categories")
public ResponseEntity<List<CategoryResponse>> getCategories() {
    List<CategoryResponse> categories = categoryService.findAll();
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
        .body(categories);
}

// 인증 필요한 API는 캐시 금지
@GetMapping("/users/me")
public ResponseEntity<UserResponse> getMe() {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(userService.getCurrentUser());
}
```

---

## 다층 캐시 아키텍처

```
요청 흐름:
클라이언트
    ↓ miss
[브라우저 캐시]
    ↓ miss
[CDN 엣지 서버]
    ↓ miss
[Nginx (프록시 캐시)]
    ↓ miss
[Spring Boot]
    ↓ miss
[Redis (앱 캐시)]
    ↓ miss
[PostgreSQL]

각 계층에서 캐시 히트 시 하위 계층 호출 없음
```

---

## CDN 설정 예시 (CloudFront)

```
동작(Behavior) 설정:

/static/* → 캐시 최대 (1년)
  — Compress objects: Yes
  — TTL: min=86400, max=31536000, default=31536000

/api/public/* → 짧은 캐시
  — TTL: min=0, max=300, default=60
  — Cache based on: origin Cache-Control

/api/private/* → 캐시 안 함
  — Cache: Disabled

/* → 기본 (HTML)
  — TTL: min=0, max=86400, default=0
  — Forward: All headers (no cache)

Lambda@Edge 활용:
— Viewer Request: A/B 테스트, 리다이렉션
— Origin Request: URL 재작성, 인증
— Origin Response: 응답 헤더 수정
— Viewer Response: 보안 헤더 추가
```
