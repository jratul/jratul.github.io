---
title: "Spring Boot + Redis 실전 패턴"
order: 8
---

# Spring Boot + Redis 실전 패턴

실무에서 자주 쓰는 Redis 패턴 모음.

---

## 기본 설정

```yaml
# application.yml
spring:
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD:}
      lettuce:
        pool:
          max-active: 8
          max-idle: 8
          min-idle: 0
          max-wait: -1ms
      timeout: 2000ms
```

```java
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        // Key: String
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());

        // Value: JSON
        ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .activateDefaultTyping(
                LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL
            );
        GenericJackson2JsonRedisSerializer jsonSerializer =
            new GenericJackson2JsonRedisSerializer(objectMapper);

        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);

        template.afterPropertiesSet();
        return template;
    }

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory factory) {
        return new StringRedisTemplate(factory);
    }
}
```

---

## 랭킹 시스템

```java
@Service
@RequiredArgsConstructor
public class RankingService {

    private final StringRedisTemplate redisTemplate;

    private String getRankKey(String period) {
        return "rank:" + period; // "rank:daily", "rank:weekly"
    }

    // 점수 추가
    public void addScore(String period, Long userId, double score) {
        redisTemplate.opsForZSet().incrementScore(
            getRankKey(period),
            String.valueOf(userId),
            score
        );
    }

    // Top N 조회
    public List<RankEntry> getTopRanking(String period, int count) {
        Set<ZSetOperations.TypedTuple<String>> tuples =
            redisTemplate.opsForZSet().reverseRangeWithScores(
                getRankKey(period), 0, count - 1
            );

        if (tuples == null) return Collections.emptyList();

        List<RankEntry> result = new ArrayList<>();
        int rank = 1;
        for (ZSetOperations.TypedTuple<String> tuple : tuples) {
            result.add(new RankEntry(rank++,
                Long.parseLong(tuple.getValue()),
                tuple.getScore()));
        }
        return result;
    }

    // 내 순위 조회
    public Long getMyRank(String period, Long userId) {
        Long rank = redisTemplate.opsForZSet().reverseRank(
            getRankKey(period), String.valueOf(userId));
        return rank != null ? rank + 1 : null; // 0-based → 1-based
    }

    // 내 점수 조회
    public Double getMyScore(String period, Long userId) {
        return redisTemplate.opsForZSet().score(
            getRankKey(period), String.valueOf(userId));
    }

    // 주간 랭킹 초기화
    @Scheduled(cron = "0 0 0 * * MON")  // 매주 월요일 자정
    public void resetWeeklyRanking() {
        redisTemplate.delete("rank:weekly");
    }
}
```

---

## 피드 시스템 (Timeline)

```java
@Service
@RequiredArgsConstructor
public class FeedService {

    private final StringRedisTemplate redisTemplate;
    private static final int MAX_FEED_SIZE = 1000;

    // 새 게시글 팔로워 피드에 추가
    public void addToFollowerFeeds(Long postId, Long authorId, List<Long> followerIds) {
        // Sorted Set: score = timestamp, value = postId
        double score = System.currentTimeMillis();
        String postValue = String.valueOf(postId);

        for (Long followerId : followerIds) {
            String feedKey = "feed:" + followerId;
            redisTemplate.opsForZSet().add(feedKey, postValue, score);
            // 최대 1000개 유지
            redisTemplate.opsForZSet().removeRange(feedKey, 0, -(MAX_FEED_SIZE + 1));
        }
    }

    // 피드 조회 (커서 기반 페이지네이션)
    public FeedPage getFeed(Long userId, Double cursor, int size) {
        String feedKey = "feed:" + userId;
        double maxScore = cursor != null ? cursor : Double.MAX_VALUE;

        Set<ZSetOperations.TypedTuple<String>> tuples =
            redisTemplate.opsForZSet().reverseRangeByScoreWithScores(
                feedKey, 0, maxScore, 0, size + 1
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

    // 상품 이름 색인
    public void index(String productName) {
        String lower = productName.toLowerCase();
        // 모든 prefix 저장
        for (int i = 1; i <= lower.length(); i++) {
            String prefix = lower.substring(0, i);
            redisTemplate.opsForZSet().add(INDEX_KEY, prefix, 0);
        }
        // 완성된 단어는 * 추가 (구분자)
        redisTemplate.opsForZSet().add(INDEX_KEY, lower + "*", 0);
    }

    // 자동완성 조회
    public List<String> autocomplete(String prefix, int count) {
        String lower = prefix.toLowerCase();

        // prefix의 사전식 범위 조회
        Long startRank = redisTemplate.opsForZSet().rank(INDEX_KEY, lower);
        if (startRank == null) return Collections.emptyList();

        Set<String> candidates = redisTemplate.opsForZSet()
            .range(INDEX_KEY, startRank, startRank + 200);

        if (candidates == null) return Collections.emptyList();

        return candidates.stream()
            .filter(c -> c.endsWith("*") && c.startsWith(lower))
            .map(c -> c.substring(0, c.length() - 1))
            .limit(count)
            .collect(Collectors.toList());
    }
}
```

---

## 중복 요청 방지 (Idempotency Key)

```java
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final StringRedisTemplate redisTemplate;
    private static final Duration TTL = Duration.ofMinutes(10);

    // 처리 결과 캐시
    public <T> T executeOnce(String idempotencyKey, Supplier<T> operation, Class<T> responseType) {
        String key = "idempotency:" + idempotencyKey;
        String cached = redisTemplate.opsForValue().get(key);

        if (cached != null) {
            // 이미 처리됨 → 캐시된 결과 반환
            return JsonUtil.fromJson(cached, responseType);
        }

        // 처음 요청 → 처리
        T result = operation.get();

        // 결과 저장
        redisTemplate.opsForValue().set(key, JsonUtil.toJson(result), TTL);

        return result;
    }
}

// 컨트롤러에서 사용
@PostMapping("/payments")
public ResponseEntity<PaymentResponse> createPayment(
    @RequestHeader("Idempotency-Key") String idempotencyKey,
    @RequestBody PaymentRequest request
) {
    PaymentResponse response = idempotencyService.executeOnce(
        idempotencyKey,
        () -> paymentService.process(request),
        PaymentResponse.class
    );
    return ResponseEntity.ok(response);
}
```

---

## 실시간 방문자 수

```java
@Service
@RequiredArgsConstructor
public class VisitorService {

    private final StringRedisTemplate redisTemplate;

    // 고유 방문자 수 (HyperLogLog)
    public void recordVisit(Long pageId, String userId) {
        String key = "visitors:" + pageId + ":" + LocalDate.now();
        redisTemplate.opsForHyperLogLog().add(key, userId);
        redisTemplate.expire(key, Duration.ofDays(30));
    }

    public Long getUniqueVisitors(Long pageId) {
        String key = "visitors:" + pageId + ":" + LocalDate.now();
        return redisTemplate.opsForHyperLogLog().size(key);
    }

    // 동시 접속자 (Set)
    public void userOnline(Long userId) {
        redisTemplate.opsForValue().set(
            "online:" + userId, "1", Duration.ofSeconds(30));
        redisTemplate.opsForSet().add("online_users", String.valueOf(userId));
    }

    public void userOffline(Long userId) {
        redisTemplate.delete("online:" + userId);
        redisTemplate.opsForSet().remove("online_users", String.valueOf(userId));
    }

    public Long getOnlineCount() {
        return redisTemplate.opsForSet().size("online_users");
    }
}
```

---

## Lua 스크립트로 원자적 작업

```java
@Component
public class RedisScripts {

    // 조건부 업데이트 (재고 차감)
    private static final String DECREASE_STOCK = """
        local stock = tonumber(redis.call('get', KEYS[1]))
        if stock == nil or stock < tonumber(ARGV[1]) then
            return 0
        end
        redis.call('decrby', KEYS[1], ARGV[1])
        return redis.call('get', KEYS[1])
        """;

    // Rate Limiting (슬라이딩 윈도우)
    private static final String RATE_LIMIT = """
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local old = now - window

        redis.call('zremrangebyscore', key, '-inf', old)
        local count = redis.call('zcard', key)
        if count < limit then
            redis.call('zadd', key, now, now)
            redis.call('expire', key, window / 1000)
            return 1
        end
        return 0
        """;

    @Autowired
    private StringRedisTemplate redisTemplate;

    public Long decreaseStock(String productId, int quantity) {
        return redisTemplate.execute(
            new DefaultRedisScript<>(DECREASE_STOCK, Long.class),
            List.of("stock:" + productId),
            String.valueOf(quantity)
        );
    }

    public boolean isAllowed(String key, int limit, long windowMs) {
        Long result = redisTemplate.execute(
            new DefaultRedisScript<>(RATE_LIMIT, Long.class),
            List.of(key),
            String.valueOf(limit),
            String.valueOf(windowMs),
            String.valueOf(System.currentTimeMillis())
        );
        return Long.valueOf(1L).equals(result);
    }
}
```
