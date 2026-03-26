---
title: "실전 설계: URL 단축 서비스"
order: 9
---

## 문제 정의

bit.ly, tinyurl 같은 URL 단축 서비스를 설계합니다.

**왜 필요한가?**
- 긴 URL을 짧게 만들어 공유하기 편하게
- SNS 글자 수 제한 (트위터 280자)
- QR 코드에 넣기 쉬움
- 클릭 통계 수집 가능

---

## 요구사항 정의

```
기능적 요구사항:
─────────────────────────────────────
1. URL 단축: https://very-long-url.com/path?q=value → https://short.ly/abc1234
2. 리다이렉트: short.ly/abc1234 → 원본 URL로 302 리다이렉트
3. URL 만료: 생성 시 만료 기간 설정 가능
4. 통계: 클릭 수, 지역별, 기기별 통계

비기능적 요구사항:
─────────────────────────────────────
1. 높은 가용성: 99.9% (리다이렉트는 핵심 기능)
2. 빠른 리다이렉트: < 10ms (캐시 히트 시)
3. 읽기:쓰기 비율 = 100:1 (리다이렉트 >> URL 생성)
4. 악의적 URL 차단 (피싱, 멀웨어)
```

---

## 규모 추정

```
일 쓰기 (URL 생성): 100만 건/일
일 읽기 (리다이렉트): 1억 회/일

초당 요청:
쓰기 QPS = 100만 / 86,400 ≈ 12 QPS
읽기 QPS = 1억 / 86,400 ≈ 1,160 QPS

5년 URL 수:
100만 × 365 × 5 = 18억 개

저장소:
18억 × (URL 평균 100 bytes + 키 10 bytes) ≈ 200GB
→ 단일 DB로 충분한 크기
```

---

## URL 키 생성 방법

단축 키는 고유하고, 짧고, 예측 불가능해야 합니다.

### 방법 1: MD5/SHA256 해싱

```
hash = md5("https://example.com/very/long/url")
key = base62(hash[:7])  // 앞 7자리 사용

문제:
- 해시 충돌 가능 (다른 URL → 같은 키)
- 충돌 감지 로직 필요 → 복잡도 증가
```

### 방법 2: Auto-increment ID + Base62 인코딩 (권장)

```
DB Auto-increment ID → Base62 인코딩

Base62 문자셋: 0-9, A-Z, a-z (62개)
7자리 = 62^7 = 약 3.5조 → 18억 개로도 충분

ID 1 → "1"
ID 62 → "10"
ID 3844 → "100" (62^2 = 3844)

장점: 충돌 없음, 구현 단순
단점: 순차적 → 예측 가능 (순서 알 수 있음)
      분산 환경에서 유일 ID 생성 필요
```

```java
@Component
public class Base62Encoder {
    private static final String CHARS =
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    // 숫자 → Base62 문자열
    // 1 → "1", 62 → "10", 3844 → "100"
    public String encode(long id) {
        if (id == 0) return "0";

        StringBuilder sb = new StringBuilder();
        while (id > 0) {
            sb.append(CHARS.charAt((int)(id % 62)));  // 나머지 = 문자 인덱스
            id /= 62;
        }
        return sb.reverse().toString();  // 뒤집어서 정순 반환
    }

    // Base62 문자열 → 숫자
    public long decode(String key) {
        long result = 0;
        for (char c : key.toCharArray()) {
            result = result * 62 + CHARS.indexOf(c);
        }
        return result;
    }
}
```

### 방법 3: Snowflake ID + Base62

```
분산 환경에서 서버 여러 대가 동시에 ID 생성:

Snowflake ID 구조 (64비트):
[1비트: 부호] [41비트: 타임스탬프(ms)] [10비트: 서버ID] [12비트: 순번]

→ 초당 서버당 4096개, 전체 서버 1024대까지 확장 가능
→ 충돌 없음, 시간순 정렬 가능
→ Base62로 인코딩하면 약 7-8자리
```

---

## 핵심 서비스 구현

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class UrlShorteningService {

    private final UrlMappingRepository urlRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final Base62Encoder encoder;
    private final SnowflakeIdGenerator idGenerator;

    // ─────────────────────────────────────────
    // URL 단축 생성
    // ─────────────────────────────────────────
    public ShortenResult shorten(String originalUrl, Duration expiry) {
        // 1. 중복 체크: 같은 URL이 이미 있으면 기존 키 반환
        String existingKey = findExistingKey(originalUrl);
        if (existingKey != null) {
            log.info("기존 단축 URL 반환: key={}", existingKey);
            return ShortenResult.of(existingKey, getShortUrl(existingKey));
        }

        // 2. Snowflake ID 생성 → Base62 인코딩
        long id = idGenerator.nextId();
        String key = encoder.encode(id);  // 예: "abc1234"

        // 3. DB 저장
        Instant expiresAt = expiry != null
            ? Instant.now().plus(expiry)
            : null;  // null = 영구

        UrlMapping mapping = UrlMapping.builder()
            .key(key)
            .originalUrl(originalUrl)
            .expiresAt(expiresAt)
            .createdAt(Instant.now())
            .clickCount(0L)
            .build();

        urlRepository.save(mapping);
        log.info("단축 URL 생성: key={}, url={}", key, originalUrl);

        // 4. Redis 캐시에 저장 (리다이렉트 최적화)
        Duration cacheTtl = expiry != null ? expiry : Duration.ofDays(30);
        redisTemplate.opsForValue().set("short:" + key, originalUrl, cacheTtl);

        return ShortenResult.of(key, getShortUrl(key));
    }

    // ─────────────────────────────────────────
    // 원본 URL 조회 (리다이렉트용)
    // ─────────────────────────────────────────
    public String resolve(String key) {
        // 1. Redis 캐시 우선 조회 (99%는 여기서 처리)
        String cached = redisTemplate.opsForValue().get("short:" + key);
        if (cached != null) {
            log.debug("캐시 히트: key={}", key);
            return cached;
        }

        // 2. 캐시 미스 → DB 조회
        UrlMapping mapping = urlRepository.findByKey(key)
            .orElseThrow(() -> new NotFoundException("존재하지 않는 단축 URL: " + key));

        // 3. 만료 확인
        if (mapping.isExpired()) {
            throw new GoneException("만료된 URL: " + key);
        }

        // 4. 캐시 저장 (다음 요청부터 빠르게)
        Duration remaining = mapping.getExpiresAt() != null
            ? Duration.between(Instant.now(), mapping.getExpiresAt())
            : Duration.ofHours(24);

        redisTemplate.opsForValue().set("short:" + key, mapping.getOriginalUrl(), remaining);

        return mapping.getOriginalUrl();
    }

    private String findExistingKey(String originalUrl) {
        return redisTemplate.opsForValue().get("url:" + originalUrl.hashCode());
    }

    private String getShortUrl(String key) {
        return "https://short.ly/" + key;
    }
}
```

---

## API 설계

```
URL 생성:
POST /api/v1/urls
Content-Type: application/json
{
  "url": "https://example.com/very/long/path?query=value",
  "expiresIn": 86400   // 초 단위 (선택, 없으면 영구)
}

응답:
HTTP 201 Created
{
  "key": "abc1234",
  "shortUrl": "https://short.ly/abc1234",
  "originalUrl": "https://example.com/...",
  "expiresAt": "2024-01-02T12:00:00Z"
}

리다이렉트:
GET /abc1234
→ HTTP 302 Found
   Location: https://example.com/very/long/path?query=value

통계 조회:
GET /api/v1/urls/abc1234/stats
{
  "key": "abc1234",
  "clickCount": 1523,
  "topCountries": [{"KR": 890}, {"US": 312}],
  "clicksByDay": [{"2024-01-01": 150}, ...]
}
```

### 301 vs 302 리다이렉트

```
301 Permanent Redirect:
- 브라우저가 결과를 캐시
- 이후 요청은 서버 거치지 않고 바로 이동
- 장점: 서버 부하 없음
- 단점: 클릭 통계 불가 (브라우저가 직접 이동)

302 Temporary Redirect:
- 매번 서버를 통해 이동
- 장점: 클릭 통계 가능 (서버가 항상 확인)
- 단점: 서버 부하 증가

→ 통계가 필요하면 302 사용 (대부분의 URL 단축 서비스)
```

```java
@RestController
@RequiredArgsConstructor
@Slf4j
public class RedirectController {

    private final UrlShorteningService shorteningService;
    private final ClickEventPublisher clickEventPublisher;

    @GetMapping("/{key}")
    public ResponseEntity<Void> redirect(
            @PathVariable @Pattern(regexp = "[0-9A-Za-z]{4,10}") String key,
            HttpServletRequest request) {

        String originalUrl = shorteningService.resolve(key);

        // 클릭 통계를 비동기로 기록 (리다이렉트 응답 속도에 영향 없음)
        clickEventPublisher.publish(ClickEvent.builder()
            .key(key)
            .ip(getClientIp(request))
            .userAgent(request.getHeader("User-Agent"))
            .referer(request.getHeader("Referer"))
            .timestamp(Instant.now())
            .build());

        // 302 리다이렉트
        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(originalUrl))
            .build();
    }

    private String getClientIp(HttpServletRequest request) {
        // 프록시/로드밸런서를 거쳤을 때 실제 IP
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
```

---

## 통계 시스템

```
클릭 이벤트 수집 전략:
──────────────────────────────────
1. 클릭 발생
2. Kafka에 이벤트 발행 (비동기, 리다이렉트에 영향 없음)
3. Kafka Consumer가 이벤트 소비
4. 실시간 카운터: Redis에 즉시 업데이트
5. 일별 집계: Consumer가 DB에 집계 저장

┌──────────┐    Kafka    ┌──────────────┐
│ 리다이렉트 │ ──────────→ │ 통계 Consumer │
│ 컨트롤러  │             └──────┬───────┘
└──────────┘                    │
                    ┌───────────┤
                    ▼           ▼
              Redis 실시간     DB 일별 집계
              카운터           통계 테이블
```

```sql
-- 클릭 이벤트 원본 (파티셔닝으로 대용량 관리)
CREATE TABLE click_events (
    id BIGSERIAL,
    url_key VARCHAR(10) NOT NULL,
    ip VARCHAR(45),
    country CHAR(2),          -- GeoIP로 국가 코드 변환
    city VARCHAR(100),
    device VARCHAR(20),       -- MOBILE, DESKTOP, TABLET
    browser VARCHAR(50),
    referer TEXT,
    clicked_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (clicked_at);  -- 월별 파티셔닝

-- 2024년 1월 파티션
CREATE TABLE click_events_2024_01
    PARTITION OF click_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 일별 집계 (대시보드용)
CREATE TABLE url_stats_daily (
    url_key VARCHAR(10) NOT NULL,
    stat_date DATE NOT NULL,
    click_count BIGINT DEFAULT 0,
    unique_ips INT DEFAULT 0,
    PRIMARY KEY (url_key, stat_date)
);

-- 국가별 집계
CREATE TABLE url_stats_country (
    url_key VARCHAR(10) NOT NULL,
    country CHAR(2) NOT NULL,
    click_count BIGINT DEFAULT 0,
    PRIMARY KEY (url_key, country)
);
```

---

## 전체 아키텍처

```
생성 플로우:
────────────────────────────────────────────────────
클라이언트
    │ POST /api/v1/urls
    ▼
Load Balancer (Nginx/ALB)
    │
    ▼
App Server (ECS Fargate ×3)
    ├── Snowflake ID 생성
    ├── Base62 인코딩
    ├── PostgreSQL 저장
    └── Redis 캐시 저장
    │
    ▼
"https://short.ly/abc1234" 반환

리다이렉트 플로우:
────────────────────────────────────────────────────
클라이언트
    │ GET /abc1234
    ▼
CloudFront (CDN) ← 인기 URL 캐시 히트 → 즉시 리다이렉트
    │ (캐시 미스)
    ▼
Load Balancer
    │
    ▼
App Server
    ├── Redis 조회 (캐시 히트 → 10ms 이내)
    │                (캐시 미스 → PostgreSQL 조회)
    └── Kafka 클릭 이벤트 발행 (비동기)
    │
    ▼
302 Redirect → Location: 원본 URL

통계 플로우:
────────────────────────────────────────────────────
Kafka → Consumer (GeoIP 변환 + 집계)
     → Redis 실시간 카운터
     → DB 일별 집계 테이블

인프라 구성:
────────────────────────────────────────────────────
Load Balancer: AWS ALB
App Server: ECS Fargate ×3 (오토스케일링)
Cache: ElastiCache Redis Cluster
DB: RDS PostgreSQL (Primary + Read Replica)
메시지: Amazon MSK (Kafka)
CDN: CloudFront
```

---

## 트레이드오프 분석

```
키 생성 방식:
──────────────────────────────────────────────────────
Auto-increment + Base62
장점: 충돌 없음, 구현 단순, 짧은 키
단점: 순차적 (예측 가능), 분산 환경에서 단일 장애점

Snowflake + Base62
장점: 분산 환경에서 고유, 시간 포함 (정렬 가능)
단점: 키가 약간 김 (7~11자), 구현 복잡

Hash + Collision Detection
장점: 비예측적
단점: 충돌 처리 복잡, 추가 DB 조회 필요

캐싱 전략:
──────────────────────────────────────────────────────
Redis 캐시 적중률이 성능의 핵심
인기 URL: 짧은 URL의 80%가 전체 클릭의 20% 발생 (파레토 법칙)
→ 자주 클릭되는 URL은 캐시에서 계속 처리
→ 긴 TTL 설정 가능

리다이렉트 타입:
──────────────────────────────────────────────────────
301 (Permanent)
장점: CDN/브라우저 캐시로 서버 부하 최소화
단점: 클릭 통계 불가, URL 변경 어려움

302 (Temporary) - bit.ly, tinyurl 등 대부분 사용
장점: 매번 서버 통해서 통계 가능, URL 변경 가능
단점: 서버 부하 (캐시로 대응)
```

---

## 초보자가 자주 하는 실수

**실수 1: 자동 증가 ID를 그대로 키로 사용**

```
나쁜 예: ID 1 → 키 "1", ID 2 → "2"
- 경쟁사가 순서 파악 가능 ("6"이면 6번째 URL)
- 너무 짧아서 충돌 위험

좋은 예: Base62 인코딩
- ID 1000000 → "4c92" (의미 없는 문자열)
```

**실수 2: 통계 수집을 동기로 처리**

```java
// 나쁜 예: 통계 저장이 느리면 리다이렉트도 느려짐
@GetMapping("/{key}")
public ResponseEntity<Void> redirect(@PathVariable String key) {
    String url = resolve(key);
    statsService.record(key);  // DB 저장 동기 처리 → 리다이렉트 지연!
    return redirect(url);
}

// 좋은 예: 비동기 발행
@GetMapping("/{key}")
public ResponseEntity<Void> redirect(@PathVariable String key) {
    String url = resolve(key);
    kafkaTemplate.send("click-events", key, createClickEvent());  // 비동기
    return redirect(url);  // 즉시 리다이렉트
}
```

**실수 3: URL 유효성 검증 미흡**

```java
// 피싱/멀웨어 URL 차단 없이 단축
public String shorten(String url) {
    // URL 형식만 체크
    if (!url.startsWith("http")) throw ...;
    // 피싱 사이트 체크 없음 → 악용 가능

    // 좋은 예: Google Safe Browsing API 연동
    if (safeBrowsingService.isMalicious(url)) {
        throw new MaliciousUrlException("악성 URL 차단");
    }
}
```
