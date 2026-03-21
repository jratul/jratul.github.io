---
title: "캐싱 전략"
order: 2
---

# 캐싱 전략

언제 캐시를 쓰고, 어떤 패턴을 선택할지 결정하는 기준.

---

## 캐시가 효과적인 경우

```
✅ 읽기가 쓰기보다 훨씬 많음
✅ 같은 데이터를 반복적으로 조회
✅ 계산 비용이 높은 결과 (집계, 정렬)
✅ 변경 빈도가 낮은 데이터 (카테고리, 설정)
✅ 응답 속도가 중요한 경우

❌ 데이터가 자주 변경됨
❌ 실시간 정합성이 필수
❌ 데이터마다 다른 TTL이 필요한 경우
```

---

## Cache-Aside (Lazy Loading)

가장 일반적인 패턴. 캐시 미스 시 직접 DB에서 로드.

```
조회 흐름:
1. 캐시 확인
2. 캐시 히트 → 반환
3. 캐시 미스 → DB 조회 → 캐시 저장 → 반환

쓰기 흐름:
1. DB 업데이트
2. 캐시 삭제 (또는 업데이트)
```

```java
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String CACHE_KEY = "product:";
    private static final Duration TTL = Duration.ofHours(1);

    public ProductResponse getProduct(Long id) {
        String key = CACHE_KEY + id;

        // 1. 캐시 확인
        String cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            return deserialize(cached, ProductResponse.class);
        }

        // 2. DB 조회
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("상품 없음"));
        ProductResponse response = ProductResponse.from(product);

        // 3. 캐시 저장
        redisTemplate.opsForValue().set(key, serialize(response), TTL);

        return response;
    }

    public ProductResponse updateProduct(Long id, UpdateProductRequest req) {
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("상품 없음"));

        product.update(req);
        productRepository.save(product);

        // 캐시 삭제 (다음 조회 시 새로 로드)
        redisTemplate.delete(CACHE_KEY + id);

        return ProductResponse.from(product);
    }
}
```

---

## Write-Through

쓰기 시 DB와 캐시를 동시에 업데이트.

```
쓰기 흐름:
1. DB 업데이트
2. 캐시도 업데이트

장점: 캐시 항상 최신 상태
단점: 쓰기 성능 저하, 잘 안 읽히는 데이터도 캐시됨
```

```java
public ProductResponse updateProduct(Long id, UpdateProductRequest req) {
    Product product = productRepository.findById(id)
        .orElseThrow();

    product.update(req);
    productRepository.save(product);

    // Write-Through: 캐시도 즉시 업데이트
    ProductResponse response = ProductResponse.from(product);
    redisTemplate.opsForValue().set(CACHE_KEY + id, serialize(response), TTL);

    return response;
}
```

---

## Write-Behind (Write-Back)

쓰기를 캐시에만 하고, 나중에 일괄 DB 반영.

```
쓰기 흐름:
1. 캐시에만 쓰기 (즉시 응답)
2. 비동기로 DB에 반영

장점: 쓰기 성능 최고
단점: 캐시 장애 시 데이터 손실, 구현 복잡
용도: 조회수, 좋아요 수 등 집계성 데이터
```

```java
// 조회수: Redis에서 원자적 증가, 주기적으로 DB 반영
@Service
public class ViewCountService {

    private static final String VIEW_KEY = "view_count:";

    public void incrementViewCount(Long postId) {
        redisTemplate.opsForValue().increment(VIEW_KEY + postId);
    }

    // 스케줄러로 주기적 DB 반영
    @Scheduled(fixedDelay = 60_000)  // 1분마다
    public void flushViewCountsToDB() {
        Set<String> keys = redisTemplate.keys(VIEW_KEY + "*");
        if (keys == null || keys.isEmpty()) return;

        for (String key : keys) {
            String postId = key.replace(VIEW_KEY, "");
            String count = redisTemplate.opsForValue().getAndDelete(key);
            if (count != null) {
                postRepository.incrementViewCount(
                    Long.parseLong(postId),
                    Long.parseLong(count)
                );
            }
        }
    }
}
```

---

## Spring Cache 추상화 (@Cacheable)

Spring의 캐시 어노테이션을 사용한 Cache-Aside 자동화.

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new GenericJackson2JsonRedisSerializer()))
            .disableCachingNullValues();

        Map<String, RedisCacheConfiguration> cacheConfigs = Map.of(
            "products", config.entryTtl(Duration.ofHours(1)),
            "categories", config.entryTtl(Duration.ofDays(1)),
            "users", config.entryTtl(Duration.ofMinutes(30))
        );

        return RedisCacheManager.builder(factory)
            .withInitialCacheConfigurations(cacheConfigs)
            .cacheDefaults(config.entryTtl(Duration.ofMinutes(10)))
            .build();
    }
}

@Service
public class ProductService {

    @Cacheable(value = "products", key = "#id")
    public ProductResponse getProduct(Long id) {
        return ProductResponse.from(productRepository.findById(id).orElseThrow());
    }

    @CachePut(value = "products", key = "#id")
    public ProductResponse updateProduct(Long id, UpdateProductRequest req) {
        // 업데이트 후 캐시도 갱신
        ...
    }

    @CacheEvict(value = "products", key = "#id")
    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }

    @Caching(evict = {
        @CacheEvict(value = "products", key = "#id"),
        @CacheEvict(value = "product-list", allEntries = true)
    })
    public void updateWithListEviction(Long id, ...) { ... }
}
```

---

## Cache Stampede 방지

캐시 만료 순간 대량의 DB 요청이 몰리는 문제.

```java
// 해결책 1: 뮤텍스 락 (단일 요청만 DB 조회)
public ProductResponse getProductWithLock(Long id) {
    String cacheKey = "product:" + id;
    String lockKey = "lock:product:" + id;

    // 캐시 확인
    String cached = redisTemplate.opsForValue().get(cacheKey);
    if (cached != null) return deserialize(cached);

    // 락 획득 시도
    Boolean locked = redisTemplate.opsForValue()
        .setIfAbsent(lockKey, "1", Duration.ofSeconds(10));

    if (Boolean.TRUE.equals(locked)) {
        try {
            // DB 조회 후 캐시 저장
            ProductResponse response = loadFromDb(id);
            redisTemplate.opsForValue().set(cacheKey, serialize(response), TTL);
            return response;
        } finally {
            redisTemplate.delete(lockKey);
        }
    } else {
        // 락 획득 실패 → 잠시 후 재시도 (캐시 채워지길 기다림)
        Thread.sleep(100);
        return getProductWithLock(id);
    }
}

// 해결책 2: 논리적 만료 (물리적 만료 전에 백그라운드 갱신)
// Probabilistic Early Expiration 패턴
```

---

## TTL 전략

```java
// 데이터별 TTL 구분
"categories"    → 24시간 (거의 안 변함)
"products"      → 1시간
"user_profile"  → 30분
"cart"          → 7일 (사용자 이탈 고려)
"session"       → 30분 (갱신형)
"otp"           → 5분

// TTL 무작위화 (캐시 만료 분산)
Duration baseTtl = Duration.ofHours(1);
Duration jitter = Duration.ofMinutes(new Random().nextInt(10));
Duration ttl = baseTtl.plus(jitter);
// 동시에 만료되는 것 방지
```

---

## Cache Key 설계

```java
// 명확한 네임스페이스
"product:{id}"
"user:{id}:profile"
"user:{id}:orders:page:{page}"
"category:{slug}:products"

// 버전 포함 (스키마 변경 시 자동 무효화)
"v2:product:{id}"

// 태그 기반 무효화 (caffeine 등 로컬 캐시에서 유용)
// Redis에서는 Set으로 태그별 키 관리
SADD cache-tag:product:{id} "key1" "key2"
// 상품 수정 시: 태그의 모든 키 삭제
```
