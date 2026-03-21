---
title: "실전 설계: URL 단축 서비스"
order: 9
---

# 실전 설계: URL 단축 서비스

bit.ly 같은 URL 단축 서비스 설계.

---

## 요구사항 정의

```
기능적 요구사항:
— 긴 URL을 입력받아 짧은 URL 생성
— 짧은 URL 접속 시 원본 URL로 리다이렉트
— URL 만료 기간 설정 가능
— 사용자 통계 (클릭 수, 지역, 시간)

비기능적 요구사항:
— 100:1 읽기:쓰기 비율 (리다이렉트 >> 생성)
— 가용성 99.9%
— 리다이렉트 응답 < 10ms

규모 추정:
— 일 쓰기: 100만 개/일
— 일 읽기: 1억 회/일
— 쓰기 QPS: 100만 / 86,400 ≈ 12 QPS
— 읽기 QPS: 1억 / 86,400 ≈ 1,160 QPS
— 5년 URL 수: 100만 × 365 × 5 = 18억 개
— 저장소: 18억 × (100B URL + 10B key) ≈ 200GB
```

---

## URL 키 생성

```
요구사항:
— 고유한 단축 키
— 짧을수록 좋음 (7자)
— 예측 불가능

방법 1: MD5/SHA256 해싱
hash = md5("https://example.com/very/long/url")
key = base62(hash[:7])  // 앞 7자리

문제: 해시 충돌 가능

방법 2: 자동 증가 ID + Base62
ID: 1 → "1"
ID: 62 → "10"
ID: 3844 → "100" (62^2 = 3844)

7자리 Base62 = 62^7 = 3조 5천억 (충분)
장점: 충돌 없음, 간단
단점: 순차 → 예측 가능, 분산 ID 생성 복잡

방법 3: UUID
16바이트 → 너무 길다

방법 4: Snowflake ID + Base62
분산 환경에서 고유 ID 생성 후 Base62 인코딩
```

```java
@Component
public class Base62Encoder {
    private static final String CHARS =
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    public String encode(long id) {
        if (id == 0) return "0";
        StringBuilder sb = new StringBuilder();
        while (id > 0) {
            sb.append(CHARS.charAt((int)(id % 62)));
            id /= 62;
        }
        return sb.reverse().toString();
    }

    public long decode(String key) {
        long result = 0;
        for (char c : key.toCharArray()) {
            result = result * 62 + CHARS.indexOf(c);
        }
        return result;
    }
}

@Service
@RequiredArgsConstructor
public class UrlShorteningService {

    private final UrlRepository urlRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final Base62Encoder encoder;
    private final SnowflakeIdGenerator idGenerator;

    public String shorten(String originalUrl, Duration expiry) {
        // 중복 체크 (같은 URL이면 기존 키 반환)
        String existingKey = redisTemplate.opsForValue().get("url:" + originalUrl);
        if (existingKey != null) return existingKey;

        // 키 생성
        long id = idGenerator.nextId();
        String key = encoder.encode(id);

        // 저장
        Instant expiresAt = expiry != null ? Instant.now().plus(expiry) : null;
        UrlMapping mapping = UrlMapping.builder()
            .key(key)
            .originalUrl(originalUrl)
            .expiresAt(expiresAt)
            .build();

        urlRepository.save(mapping);

        // 캐시 (리다이렉트 최적화)
        Duration cacheTtl = expiry != null ? expiry : Duration.ofDays(30);
        redisTemplate.opsForValue().set("short:" + key, originalUrl, cacheTtl);

        return key;
    }

    public String resolve(String key) {
        // 캐시 우선
        String cached = redisTemplate.opsForValue().get("short:" + key);
        if (cached != null) return cached;

        // DB 조회
        UrlMapping mapping = urlRepository.findByKey(key)
            .orElseThrow(() -> new NotFoundException("URL not found"));

        if (mapping.isExpired()) throw new GoneException("URL expired");

        // 캐시 저장
        redisTemplate.opsForValue().set("short:" + key, mapping.getOriginalUrl(),
            Duration.ofHours(24));

        return mapping.getOriginalUrl();
    }
}
```

---

## API 설계

```
URL 생성:
POST /api/v1/urls
{
  "url": "https://example.com/very/long/path?query=value",
  "expiresIn": 86400  // 초 (선택사항)
}

응답:
{
  "key": "abc1234",
  "shortUrl": "https://short.ly/abc1234",
  "originalUrl": "https://example.com/...",
  "expiresAt": "2024-01-02T12:00:00Z"
}

리다이렉트:
GET /abc1234
→ 302 Found
  Location: https://example.com/very/long/path?query=value

301 vs 302:
301 Permanent: 브라우저가 캐시 → 이후 서버 요청 없음
               클릭 통계 불가 (브라우저가 직접 이동)
302 Temporary: 매번 서버 거쳐서 이동
               클릭 통계 가능

→ 통계 필요하면 302 사용
```

---

## 리다이렉트 구현

```java
@RestController
@RequiredArgsConstructor
public class RedirectController {

    private final UrlShorteningService shorteningService;
    private final ClickEventPublisher clickEventPublisher;

    @GetMapping("/{key}")
    public ResponseEntity<Void> redirect(
        @PathVariable String key,
        HttpServletRequest request
    ) {
        String originalUrl = shorteningService.resolve(key);

        // 비동기로 클릭 통계 기록 (메인 응답에 영향 없음)
        clickEventPublisher.publish(ClickEvent.builder()
            .key(key)
            .ip(getClientIp(request))
            .userAgent(request.getHeader("User-Agent"))
            .referer(request.getHeader("Referer"))
            .timestamp(Instant.now())
            .build());

        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(originalUrl))
            .build();
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        return xForwardedFor != null
            ? xForwardedFor.split(",")[0].trim()
            : request.getRemoteAddr();
    }
}
```

---

## 통계 시스템

```
클릭 이벤트 수집:
1. 클릭 이벤트 → Kafka 발행 (비동기)
2. Kafka Consumer → 집계 처리
3. 집계 결과 → DB 저장

시계열 데이터 구조:
```

```sql
-- 클릭 이벤트 로그 (원본)
CREATE TABLE click_events (
    id BIGSERIAL,
    url_key VARCHAR(10) NOT NULL,
    ip VARCHAR(45),
    country VARCHAR(2),
    city VARCHAR(100),
    device VARCHAR(20),
    referer TEXT,
    clicked_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (clicked_at);  -- 월별 파티셔닝

-- 실시간 집계 (Redis)
-- 시간별 클릭: ZINCRBY clicks:{key}:hourly {hour} 1
-- 국가별 클릭: HINCRBY clicks:{key}:country {country} 1

-- 일별 집계 (DB)
CREATE TABLE url_stats_daily (
    url_key VARCHAR(10),
    stat_date DATE,
    click_count BIGINT DEFAULT 0,
    unique_ips INT DEFAULT 0,
    PRIMARY KEY (url_key, stat_date)
);
```

---

## 전체 아키텍처

```
생성 플로우:
Client → API Server → ID Generator (Snowflake)
                    → DB (PostgreSQL)
                    → Cache (Redis)
                    → "https://short.ly/{key}"

리다이렉트 플로우:
Client → CDN (캐시 히트 → 즉시 리다이렉트)
       → LB → App Server → Redis (캐시 히트)
                          → DB (캐시 미스)
                          → Kafka (클릭 이벤트)

통계 플로우:
Kafka → Consumer → 집계 → DB/Redis

컴포넌트:
LB (Nginx/ALB)
App Server ×3 (ECS Fargate)
Redis Cluster (ElastiCache)
PostgreSQL (RDS, Primary + Replica)
Kafka (MSK)
CloudFront (정적 파일 + 리다이렉트 캐시)
```
