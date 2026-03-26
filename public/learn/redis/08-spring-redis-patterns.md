---
title: "Spring Boot + Redis 실전 패턴"
order: 8
---

# Spring Boot + Redis 실전 패턴

실무에서 자주 쓰는 Redis 패턴 모음. 설정부터 실제 기능 구현까지.

---

## 기본 설정

```yaml
# application.yml
spring:
  data:
    redis:
      host: ${REDIS_HOST:localhost}    # 기본값: localhost
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD:}     # 비밀번호 없으면 빈 값
      timeout: 2000ms                  # 연결 타임아웃
      lettuce:
        pool:
          max-active: 8   # 최대 연결 수
          max-idle: 8     # 최대 유휴 연결 수
          min-idle: 0     # 최소 유휴 연결 수
          max-wait: -1ms  # 연결 대기 시간 (-1 = 무한)
```

```java
@Configuration
public class RedisConfig {

    // Object 타입 값 저장 (JSON 직렬화)
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        // 키: String 직렬화
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());

        // 값: JSON 직렬화
        ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())  // LocalDateTime 지원
            .activateDefaultTyping(
                LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL  // 타입 정보 포함 (역직렬화에 필요)
            );
        GenericJackson2JsonRedisSerializer jsonSerializer =
            new GenericJackson2JsonRedisSerializer(objectMapper);

        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);
        template.afterPropertiesSet();
        return template;
    }

    // String 전용 (더 가볍고 빠름)
    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory factory) {
        return new StringRedisTemplate(factory);
    }
}
```

---

## 랭킹 시스템 — Sorted Set 활용

```java
@Service
@RequiredArgsConstructor
public class RankingService {

    private final StringRedisTemplate redisTemplate;

    // 기간별 랭킹 키 (daily, weekly, monthly, alltime)
    private String rankKey(String period) {
        return "rank:" + period;
    }

    // 점수 추가 (게임 클리어, 구매, 리뷰 등)
    public void addScore(String period, Long userId, double score) {
        redisTemplate.opsForZSet().incrementScore(
            rankKey(period),
            String.valueOf(userId),
            score
        );
    }

    // TOP N 랭킹 조회 (점수 높은 순)
    public List<RankEntry> getTopRanking(String period, int count) {
        Set<ZSetOperations.TypedTuple<String>> tuples =
            redisTemplate.opsForZSet().reverseRangeWithScores(
                rankKey(period), 0, count - 1
            );

        if (tuples == null || tuples.isEmpty()) return Collections.emptyList();

        int rank = 1;
        List<RankEntry> result = new ArrayList<>();
        for (ZSetOperations.TypedTuple<String> tuple : tuples) {
            result.add(RankEntry.builder()
                .rank(rank++)
                .userId(Long.parseLong(tuple.getValue()))
                .score(tuple.getScore())
                .build());
        }
        return result;
    }

    // 내 순위 조회 (1-based)
    public Long getMyRank(String period, Long userId) {
        Long rank = redisTemplate.opsForZSet().reverseRank(
            rankKey(period), String.valueOf(userId));
        return rank != null ? rank + 1 : null;  // 0-based → 1-based
    }

    // 내 점수 조회
    public Double getMyScore(String period, Long userId) {
        return redisTemplate.opsForZSet().score(
            rankKey(period), String.valueOf(userId));
    }

    // 주간 랭킹 초기화 (매주 월요일 자정)
    @Scheduled(cron = "0 0 0 * * MON")
    public void resetWeeklyRanking() {
        redisTemplate.delete(rankKey("weekly"));
        log.info("주간 랭킹 초기화 완료");
    }

    // 일간 랭킹 초기화 (매일 자정)
    @Scheduled(cron = "0 0 0 * * *")
    public void resetDailyRanking() {
        redisTemplate.delete(rankKey("daily"));
    }
}
```

---

## 피드 시스템 (Timeline) — SNS 뉴스피드

```java
@Service
@RequiredArgsConstructor
public class FeedService {

    private final StringRedisTemplate redisTemplate;
    private static final int MAX_FEED_SIZE = 1000;  // 피드 최대 1000개

    // 새 게시글 발행 → 팔로워 피드에 추가
    public void publishPost(Long postId, Long authorId, List<Long> followerIds) {
        double score = System.currentTimeMillis();  // timestamp를 score로
        String postValue = String.valueOf(postId);

        for (Long followerId : followerIds) {
            String feedKey = "feed:" + followerId;

            // 피드에 포스트 추가 (Sorted Set, score=timestamp)
            redisTemplate.opsForZSet().add(feedKey, postValue, score);

            // 최대 1000개 유지 (오래된 것 삭제)
            // removeRange(0, -(MAX+1)) = 0번째부터 -(1001)번째까지 삭제
            redisTemplate.opsForZSet().removeRange(feedKey, 0, -(MAX_FEED_SIZE + 1));
        }
    }

    // 피드 조회 (커서 기반 페이지네이션)
    public FeedPage getFeed(Long userId, Double cursor, int size) {
        String feedKey = "feed:" + userId;
        double maxScore = cursor != null ? cursor : Double.MAX_VALUE;

        // 최신 순 (높은 score부터), 커서 위치부터, size+1개 조회
        Set<ZSetOperations.TypedTuple<String>> tuples =
            redisTemplate.opsForZSet().reverseRangeByScoreWithScores(
                feedKey,
                0,          // minScore
                maxScore,   // maxScore (커서)
                0,          // offset
                size + 1    // 다음 페이지 있는지 확인용으로 하나 더
            );

        if (tuples == null || tuples.isEmpty()) {
            return new FeedPage(Collections.emptyList(), null);
        }

        List<ZSetOperations.TypedTuple<String>> list = new ArrayList<>(tuples);
        boolean hasMore = list.size() > size;
        if (hasMore) list = list.subList(0, size);

        List<Long> postIds = list.stream()
            .map(t -> Long.parseLong(t.getValue()))
            .collect(Collectors.toList());

        Double nextCursor = hasMore ? list.get(list.size() - 1).getScore() : null;

        return new FeedPage(postIds, nextCursor);
    }
}
```

---

## 자동완성 (Autocomplete)

```java
@Service
@RequiredArgsConstructor
public class AutocompleteService {

    private final StringRedisTemplate redisTemplate;
    private static final String INDEX_KEY = "autocomplete:products";

    // 상품 이름 색인 (모든 prefix 저장)
    public void indexProduct(String productName) {
        String lower = productName.toLowerCase();

        // "스프링" → "스", "스프", "스프링" 각각 저장
        for (int i = 1; i <= lower.length(); i++) {
            String prefix = lower.substring(0, i);
            redisTemplate.opsForZSet().add(INDEX_KEY, prefix, 0);
        }
        // 완성된 단어는 * 추가 (구분자)
        redisTemplate.opsForZSet().add(INDEX_KEY, lower + "*", 0);
    }

    // 자동완성 검색
    public List<String> autocomplete(String prefix, int count) {
        String lower = prefix.toLowerCase();

        Long startRank = redisTemplate.opsForZSet().rank(INDEX_KEY, lower);
        if (startRank == null) return Collections.emptyList();

        // prefix 이후 200개 조회 후 필터링
        Set<String> candidates = redisTemplate.opsForZSet()
            .range(INDEX_KEY, startRank, startRank + 200);
        if (candidates == null) return Collections.emptyList();

        return candidates.stream()
            .filter(c -> c.endsWith("*") && c.startsWith(lower))  // 완성된 단어만
            .map(c -> c.substring(0, c.length() - 1))              // * 제거
            .limit(count)
            .collect(Collectors.toList());
    }
}
```

---

## 중복 요청 방지 (Idempotency Key)

같은 요청이 여러 번 와도 한 번만 처리하도록 보장한다.
결제 같이 중복 처리되면 안 되는 API에 필수다.

```java
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final StringRedisTemplate redisTemplate;
    private static final Duration TTL = Duration.ofMinutes(10);  // 10분 내 중복 요청 차단

    /**
     * 같은 idempotencyKey로 요청이 오면 캐시된 결과를 반환
     * 처음 요청이면 operation 실행 후 결과를 캐시에 저장
     */
    public <T> T executeOnce(String idempotencyKey, Supplier<T> operation, Class<T> responseType) {
        String key = "idempotency:" + idempotencyKey;

        // 이미 처리된 요청?
        String cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            log.info("중복 요청 감지. 캐시된 결과 반환: {}", idempotencyKey);
            return JsonUtil.fromJson(cached, responseType);
        }

        // 처음 요청 → 처리
        T result = operation.get();

        // 결과 저장 (10분간 중복 요청 차단)
        redisTemplate.opsForValue().set(key, JsonUtil.toJson(result), TTL);

        return result;
    }
}

// 결제 API에서 사용
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final IdempotencyService idempotencyService;

    @PostMapping
    public ResponseEntity<PaymentResponse> createPayment(
        @RequestHeader("Idempotency-Key") String idempotencyKey,  // 클라이언트가 UUID 생성
        @RequestBody PaymentRequest request
    ) {
        // 같은 Idempotency-Key로 재시도해도 한 번만 결제됨
        PaymentResponse response = idempotencyService.executeOnce(
            idempotencyKey,
            () -> paymentService.process(request),
            PaymentResponse.class
        );
        return ResponseEntity.ok(response);
    }
}
```

---

## 실시간 방문자 수

```java
@Service
@RequiredArgsConstructor
public class VisitorService {

    private final StringRedisTemplate redisTemplate;

    // 고유 방문자 수 (HyperLogLog — 메모리 매우 효율적)
    public void recordVisit(Long pageId, String userId) {
        String key = "visitors:" + pageId + ":" + LocalDate.now();
        redisTemplate.opsForHyperLogLog().add(key, userId);
        redisTemplate.expire(key, Duration.ofDays(30));  // 30일 보관
    }

    // 오늘 고유 방문자 수 (약간의 오차 있음, 0.81%)
    public Long getTodayUniqueVisitors(Long pageId) {
        String key = "visitors:" + pageId + ":" + LocalDate.now();
        return redisTemplate.opsForHyperLogLog().size(key);
    }

    // 현재 동시 접속자 (Set — 정확함)
    public void userOnline(Long userId) {
        String key = "online:" + userId;
        redisTemplate.opsForValue().set(key, "1", Duration.ofSeconds(30));
        // 하트비트가 없으면 30초 후 자동으로 오프라인 처리
    }

    // 하트비트 (30초마다 갱신)
    public void heartbeat(Long userId) {
        redisTemplate.expire("online:" + userId, Duration.ofSeconds(30));
    }

    public boolean isOnline(Long userId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey("online:" + userId));
    }

    public Long getOnlineCount() {
        // SCAN으로 online:* 키 수 계산
        long count = 0;
        ScanOptions options = ScanOptions.scanOptions().match("online:*").count(100).build();
        try (Cursor<String> cursor = redisTemplate.scan(options)) {
            while (cursor.hasNext()) {
                cursor.next();
                count++;
            }
        }
        return count;
    }
}
```

---

## Lua 스크립트로 원자적 작업

여러 Redis 명령을 원자적으로 실행해야 할 때 Lua 스크립트를 사용한다.

```java
@Component
@RequiredArgsConstructor
public class RedisScripts {

    private final StringRedisTemplate redisTemplate;

    // 재고 원자적 차감 (확인 + 차감을 한 번에)
    private static final String DECREASE_STOCK_SCRIPT = """
        local stock = tonumber(redis.call('get', KEYS[1]))
        if stock == nil then return -1 end           -- 키 없음 (-1)
        if stock < tonumber(ARGV[1]) then return 0 end  -- 재고 부족 (0)
        redis.call('decrby', KEYS[1], ARGV[1])
        return redis.call('get', KEYS[1])            -- 차감 후 남은 재고
        """;

    // 슬라이딩 윈도우 Rate Limiting
    private static final String RATE_LIMIT_SCRIPT = """
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])     -- 밀리초
        local now = tonumber(ARGV[3])
        local old = now - window

        redis.call('zremrangebyscore', key, '-inf', old)   -- 오래된 요청 제거
        local count = redis.call('zcard', key)
        if count < limit then
            redis.call('zadd', key, now, now)
            redis.call('pexpire', key, window)
            return 1   -- 허용
        end
        return 0       -- 거부
        """;

    // 재고 차감 (원자적)
    public Long decreaseStock(String productId, int quantity) {
        return redisTemplate.execute(
            new DefaultRedisScript<>(DECREASE_STOCK_SCRIPT, Long.class),
            List.of("stock:" + productId),
            String.valueOf(quantity)
        );
        // 양수: 차감 후 남은 재고, 0: 재고 부족, -1: 키 없음
    }

    // Rate Limiting (슬라이딩 윈도우)
    public boolean isRateLimitAllowed(String key, int maxRequests, long windowMs) {
        Long result = redisTemplate.execute(
            new DefaultRedisScript<>(RATE_LIMIT_SCRIPT, Long.class),
            List.of("rate:" + key),
            String.valueOf(maxRequests),
            String.valueOf(windowMs),
            String.valueOf(System.currentTimeMillis())
        );
        return Long.valueOf(1L).equals(result);
    }
}
```

---

## 캐시 워밍 (Cache Warming)

서비스 시작 시 자주 쓰는 데이터를 미리 캐시에 로드한다.

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class CacheWarmer implements ApplicationRunner {

    private final ProductService productService;
    private final CategoryService categoryService;
    private final StringRedisTemplate redisTemplate;

    @Override
    public void run(ApplicationArguments args) {
        log.info("캐시 워밍 시작...");
        warmCategoryCache();
        warmTopProductCache();
        log.info("캐시 워밍 완료");
    }

    private void warmCategoryCache() {
        try {
            List<Category> categories = categoryService.findAllFromDB();
            redisTemplate.opsForValue().set(
                "categories:all",
                JsonUtil.toJson(categories),
                Duration.ofDays(1)
            );
            log.info("카테고리 캐시 워밍 완료: {}개", categories.size());
        } catch (Exception e) {
            log.warn("카테고리 캐시 워밍 실패 (서비스에는 영향 없음)", e);
        }
    }

    private void warmTopProductCache() {
        try {
            // TOP 100 인기 상품 미리 캐시
            List<Product> topProducts = productService.findTopProductsFromDB(100);
            for (Product product : topProducts) {
                redisTemplate.opsForValue().set(
                    "product:" + product.getId(),
                    JsonUtil.toJson(product),
                    Duration.ofHours(1)
                );
            }
            log.info("인기 상품 캐시 워밍 완료: {}개", topProducts.size());
        } catch (Exception e) {
            log.warn("상품 캐시 워밍 실패 (서비스에는 영향 없음)", e);
        }
    }
}
```

---

## 자주 하는 실수

```java
// 실수 1: StringRedisTemplate vs RedisTemplate 혼용
// StringRedisTemplate: String 키/값만 (빠르고 단순)
// RedisTemplate<String, Object>: Object 직렬화 (복잡하지만 유연)
// → 같은 키를 다른 Template으로 쓰면 직렬화 불일치 에러!
// 해결: 용도별로 하나만 통일해서 사용

// 실수 2: 연결 풀 설정 안 함
// 기본값으로 쓰면 연결이 부족해서 타임아웃 발생
// 해결: max-active, max-idle 설정 (서비스 규모에 맞게)

// 실수 3: @Cacheable 메서드가 같은 클래스에서 호출됨
@Service
public class ProductService {
    @Cacheable("products")
    public Product getProduct(Long id) { ... }  // 캐시 적용됨

    public void processOrder(Long productId) {
        Product p = getProduct(productId);  // 같은 클래스 내 호출 → 캐시 안 됨!
    }
}
// 해결: @Cacheable 메서드는 외부에서 호출해야 AOP가 동작함

// 실수 4: Redis 다운 시 전체 서비스 다운
// Redis에 의존하는 캐시 조회 실패 시 예외를 잡아서 DB로 폴백 처리 필요
try {
    String cached = redisTemplate.opsForValue().get(key);
    if (cached != null) return deserialize(cached);
} catch (RedisException e) {
    log.warn("Redis 조회 실패, DB에서 직접 조회", e);
}
// DB fallback
return productRepository.findById(id).orElseThrow();
```
