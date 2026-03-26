---
title: "CDN과 캐싱"
order: 10
---

# CDN과 캐싱

응답 속도를 높이고 서버 부하를 줄이는 핵심 기술.

냉장고를 생각해보자. 마트(서버)까지 매번 가는 대신, 자주 먹는 것을 냉장고(캐시)에 보관하면 빠르게 꺼내 먹을 수 있다. CDN은 전국 곳곳에 냉장고를 설치하는 것이다.

---

## CDN (Content Delivery Network)

```
문제: 서울 서버에서 미국 뉴욕 사용자에게 응답
→ 물리적 거리: 약 11,000km
→ 빛의 속도로도 ~100ms 지연
→ 실제로는 라우팅, 처리 시간 포함 150-200ms

CDN 해결책:
사용자 ← [뉴욕 엣지 서버 (캐시)] ← [서울 오리진 서버]

첫 요청: 엣지 서버에 없음 → 서울 오리진에서 가져와 캐시
이후 요청: 엣지 서버 캐시에서 즉시 응답 (~10ms!)

PoP (Point of Presence): CDN 서버 거점
— AWS CloudFront: 전 세계 450+ PoP
— Cloudflare: 전 세계 300+ PoP
→ 사용자와 가장 가까운 PoP에서 응답

활용:
— 정적 파일 (JS, CSS, 이미지, 폰트)  ← 가장 효과적
— 동영상 스트리밍 (YouTube, Netflix)
— API 응답 캐싱 (변경이 적은 데이터)
— DDoS 방어 (CDN이 1차 방어선)
```

---

## 주요 CDN 서비스 비교

```
AWS CloudFront:
— AWS 서비스와 완벽 통합 (S3, ALB, Lambda@Edge)
— S3 정적 사이트를 전 세계에 배포 가능
— Lambda@Edge: 엣지에서 Node.js 코드 실행
— 가격: 사용량 기반 (무료 티어 있음)
— 장점: AWS 인프라와 통합, 세부 설정 가능

Cloudflare:
— 무료 플랜 있음 (개인/소규모 사이트)
— DDoS 방어 최강 (월 수 테라바이트 공격도 방어)
— Workers: JavaScript 엣지 컴퓨팅
— DNS와 통합되어 설정 간단
— 장점: 무료 SSL, 빠른 설정

CDN 없이 vs CDN 있을 때:
CDN 없음:
모든 사용자 → 한국 서버 → 응답 (미국: 200ms)

CDN 있음:
한국 사용자 → 한국 엣지 서버 → 응답 (10ms)
미국 사용자 → 미국 엣지 서버 → 응답 (10ms)
유럽 사용자 → 유럽 엣지 서버 → 응답 (10ms)
```

---

## HTTP 캐시 헤더

브라우저와 CDN에게 "이 파일을 얼마나 오래 캐시해도 되는지" 알려주는 신호다.

```
Cache-Control 지시자 설명:

no-store      — 캐시 완전 금지
              — 민감한 데이터 (결제 정보, 개인정보)
              — 매번 서버에서 새로 가져옴

no-cache      — 저장하되 매번 서버 검증 후 사용
              — "캐시하지 마라"가 아니라 "쓰기 전에 물어봐라"
              — 304 Not Modified 응답 시 캐시 사용

public        — 공유 캐시(CDN, 프록시)에 저장 가능
              — 누구나 봐도 되는 공개 데이터

private       — 브라우저만 저장 (CDN 저장 금지)
              — 사용자별로 다른 응답 (로그인 정보 포함)

max-age=N     — N초간 캐시 유효 (브라우저 기준)
s-maxage=N    — CDN의 캐시 유효 시간 (max-age보다 우선)
must-revalidate — 만료 후 반드시 서버 재검증
immutable     — 캐시 기간 동안 절대 변경 안 됨
              — 해시가 포함된 파일에 사용 (app.abc123.js)

사용 예시:
Cache-Control: public, max-age=86400          — CDN + 브라우저 1일 캐시
Cache-Control: private, max-age=3600          — 브라우저만 1시간
Cache-Control: no-cache                        — 매번 서버 검증
Cache-Control: no-store                        — 캐시 완전 금지
Cache-Control: public, max-age=31536000, immutable  — 1년 (해시 파일)
Cache-Control: public, s-maxage=3600, max-age=0     — CDN 1시간, 브라우저 캐시 안함
```

---

## ETag와 조건부 요청

"변경됐을 때만 다운받기" - 대역폭 절약의 핵심이다.

```
동작 원리:

1. 첫 번째 요청:
GET /api/products/123

서버 응답:
200 OK
ETag: "abc123def456"          ← 콘텐츠의 지문 (해시)
Cache-Control: no-cache
{"id": 123, "name": "맥북", "price": 2000000}

2. 두 번째 요청 (캐시 검증):
GET /api/products/123
If-None-Match: "abc123def456"  ← "이 버전 가지고 있어요"

응답 (변경 없음):
304 Not Modified               ← 바디 없음! 데이터 절약
ETag: "abc123def456"

응답 (변경됨):
200 OK
ETag: "xyz789new"              ← 새 버전 ETag
{"id": 123, "name": "맥북", "price": 1900000}  ← 새 데이터

Last-Modified 방식 (시간 기반):
서버: Last-Modified: Fri, 06 Jan 2024 10:00:00 GMT
클라이언트: If-Modified-Since: Fri, 06 Jan 2024 10:00:00 GMT
→ ETag보다 정밀도 낮음 (초 단위)
→ ETag 방식 권장
```

```java
// Spring Boot ETag 자동 처리 (가장 간단한 방법)
@Bean
public FilterRegistrationBean<ShallowEtagHeaderFilter> etagFilter() {
    FilterRegistrationBean<ShallowEtagHeaderFilter> registration =
        new FilterRegistrationBean<>(new ShallowEtagHeaderFilter());
    registration.addUrlPatterns("/api/*");  // /api/ 하위 경로에 ETag 적용
    return registration;
}

// 컨트롤러에서 직접 ETag 처리 (세밀한 제어)
@GetMapping("/products/{id}")
public ResponseEntity<ProductResponse> getProduct(
    @PathVariable Long id,
    WebRequest request              // 조건부 요청 헤더 처리
) {
    ProductResponse product = productService.findById(id);

    // 버전 기반 ETag (데이터 변경 시 버전 증가)
    String etag = "\"" + product.getVersion() + "\"";

    // If-None-Match 헤더 확인 → 변경 없으면 304 자동 반환
    if (request.checkNotModified(etag)) {
        return null;  // Spring이 304 Not Modified 응답 처리
    }

    return ResponseEntity.ok()
        .eTag(etag)
        .cacheControl(CacheControl.noCache())  // 매번 검증하되 캐시 저장
        .body(product);
}
```

---

## 캐시 무효화 전략

"잘못된 데이터가 캐시됐을 때 어떻게 지우나"

```
문제: CDN에 잘못된 데이터가 캐시됨
     또는 파일을 업데이트했는데 사용자에게 여전히 구버전이 보임

해결책 1: URL에 버전/해시 포함 (가장 좋은 방법)
/static/app.js?v=abc123
/static/app.abc123.js        ← 빌드 도구가 자동 생성

파일 내용이 변경 → 해시 변경 → URL 변경
→ CDN은 새 URL을 처음 보는 것으로 처리 (자동 무효화)
→ 명시적 캐시 무효화 불필요!

해결책 2: 명시적 캐시 무효화
AWS CloudFront Invalidation:
→ 특정 경로의 캐시 삭제 (1000개 이상 유료)
→ 완전 삭제까지 약 10-30초 소요

Cloudflare Purge:
→ API로 즉시 삭제 가능

해결책 3: 짧은 TTL
Cache-Control: max-age=60  → 1분 후 자동 갱신
→ 구버전이 최대 1분간 노출될 수 있음
→ 일관성(낮음) vs 성능(높음) 트레이드오프

파일 종류별 TTL 권장:
HTML:               no-cache (또는 max-age=60)
                    → 항상 최신 구조 유지
JS/CSS (해시 포함): max-age=31536000, immutable (1년)
                    → 해시가 버전 역할
이미지 (해시 없음): max-age=604800 (7일)
이미지 (해시 있음): max-age=31536000, immutable (1년)
API 응답 (공개):    max-age=60 또는 no-cache + ETag
API 응답 (개인):    no-store
```

---

## Spring Boot 캐시 헤더 설정

```java
// 정적 리소스 캐시 설정
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 해시가 포함된 정적 파일 (빌드 도구가 생성)
        registry.addResourceHandler("/static/**")
            .addResourceLocations("classpath:/static/")
            .setCacheControl(CacheControl.maxAge(365, TimeUnit.DAYS)
                .cachePublic()
                .immutable());  // 절대 변경 안 됨을 선언

        // 일반 이미지
        registry.addResourceHandler("/images/**")
            .addResourceLocations("classpath:/static/images/")
            .setCacheControl(CacheControl.maxAge(7, TimeUnit.DAYS)
                .cachePublic());
    }
}

// API 응답별 캐시 헤더 설정
@RestController
public class ProductController {

    // 공개 데이터 → CDN 캐시 허용
    @GetMapping("/public/categories")
    public ResponseEntity<List<CategoryResponse>> getCategories() {
        List<CategoryResponse> categories = categoryService.findAll();
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS)
                .cachePublic())         // CDN에 1시간 캐시
            .body(categories);
    }

    // ETag 기반 조건부 응답
    @GetMapping("/products/{id}")
    public ResponseEntity<ProductResponse> getProduct(
        @PathVariable Long id, WebRequest request
    ) {
        ProductResponse product = productService.findById(id);
        String etag = "\"" + product.getUpdatedAt().toEpochMilli() + "\"";

        if (request.checkNotModified(etag)) {
            return null;  // 304 Not Modified
        }

        return ResponseEntity.ok()
            .eTag(etag)
            .cacheControl(CacheControl.noCache())
            .body(product);
    }

    // 인증 필요한 API → 캐시 완전 금지
    @GetMapping("/users/me")
    public ResponseEntity<UserResponse> getMyProfile() {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())  // 캐시 금지
            .body(userService.getCurrentUser());
    }

    // 결제 정보 → 캐시 절대 금지
    @GetMapping("/payments/{id}")
    public ResponseEntity<PaymentResponse> getPayment(@PathVariable Long id) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .header("Pragma", "no-cache")  // HTTP/1.0 호환
            .body(paymentService.findById(id));
    }
}
```

---

## 다층 캐시 아키텍처

```
요청이 오면 아래 계층 순서로 캐시를 찾는다.
각 계층에서 히트(발견)하면 아래 계층은 접근하지 않는다.

클라이언트 요청
    ↓
[1. 브라우저 캐시]           ← 가장 빠름 (~0ms)
    ↓ miss
[2. CDN 엣지 서버]           ← 매우 빠름 (~10ms)
    ↓ miss
[3. Nginx 프록시 캐시]       ← 빠름 (~1ms, 같은 서버)
    ↓ miss
[4. Spring Boot 앱]
    ↓
[5. Redis (앱 캐시)]         ← 빠름 (~1ms, 네트워크)
    ↓ miss
[6. PostgreSQL]              ← 상대적으로 느림 (~10ms)

각 계층 특징:
브라우저: 개인 캐시, max-age로 제어
CDN: 공유 캐시, 전 세계 배포
Nginx: 서버 로컬 캐시, 빠른 정적 파일
Redis: 분산 캐시, 서버 간 공유
DB: 쿼리 캐시, 버퍼 풀
```

---

## CloudFront 동작(Behavior) 설정

```
경로별로 캐시 동작을 다르게 설정:

/static/*  (JS, CSS, 폰트)
  → Origin: S3 버킷
  → TTL: min=86400, max=31536000, default=31536000
  → 압축: Gzip/Brotli 활성화
  → 쿼리 스트링: 무시 (해시가 파일명에 포함)

/images/*  (이미지)
  → Origin: S3 버킷
  → TTL: min=3600, max=604800, default=86400
  → 압축: 비활성화 (이미 압축된 포맷)

/api/public/*  (공개 API)
  → Origin: ALB
  → TTL: min=0, max=300, default=60
  → Cache-Control 헤더 기준으로 캐시

/api/private/*  (인증 API)
  → Origin: ALB
  → 캐시: 완전 비활성화
  → Authorization 헤더 전달

/*  (HTML)
  → Origin: ALB 또는 S3
  → TTL: min=0, max=86400, default=0
  → Cache-Control: no-cache 전달
  → SPA 라우팅: 404 → index.html

Lambda@Edge 활용:
— Viewer Request:  A/B 테스트용 리다이렉션, 봇 차단
— Origin Request:  URL 재작성, 커스텀 인증
— Origin Response: 응답 헤더 수정
— Viewer Response: 보안 헤더 추가 (HSTS, CSP 등)
```

---

## 보안 헤더와 캐시

```
캐시에 절대 저장하면 안 되는 데이터:
— 개인정보 (주민번호, 카드번호)
— 세션 토큰, JWT
— 결제 정보
→ Cache-Control: no-store 필수

CSRF 토큰:
— 사용자별로 다른 값 → no-store
→ Cache-Control: no-store, no-cache

보안 헤더는 캐시되어도 됨:
— HSTS (Strict-Transport-Security)
— X-Frame-Options
— Content-Security-Policy
→ CDN에서 일괄 추가 가능 (Lambda@Edge 활용)
```

---

## 흔한 실수와 주의사항

```
실수 1: 민감한 데이터에 public 캐시 설정
❌ Cache-Control: public, max-age=3600 (로그인 응답에 적용)
✅ Cache-Control: no-store (개인정보는 캐시 금지)

실수 2: HTML에 긴 캐시 설정
❌ Cache-Control: max-age=31536000 (HTML 1년 캐시)
→ 배포해도 사용자가 구버전 보임
✅ Cache-Control: no-cache (항상 서버 검증)
   JS/CSS는 해시 포함해서 1년 캐시

실수 3: 캐시 무효화 방법 없이 긴 TTL
❌ 해시 없는 /static/app.js에 max-age=31536000
✅ /static/app.abc123.js 처럼 빌드 시 해시 삽입

실수 4: API 응답에 무조건 no-store
❌ 모든 API를 no-store로 설정 (CDN 효과 없음)
✅ 공개 데이터(상품 목록, 카테고리)는 짧은 캐시 설정

실수 5: s-maxage 이해 부족
Cache-Control: max-age=0, s-maxage=3600
→ 브라우저: 캐시 안 함 (매번 서버 검증)
→ CDN: 1시간 캐시
→ CDN에는 캐시하되 브라우저는 항상 검증받게 하는 패턴
```
