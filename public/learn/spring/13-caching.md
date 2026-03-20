---
title: "캐싱 (@Cacheable, Redis)"
order: 13
---

## Spring Cache 추상화

캐시 구현체(로컬 메모리, Redis 등)와 무관하게 동일한 어노테이션으로 캐싱을 적용합니다.

```groovy
// 기본 캐시 (Caffeine — 로컬 인메모리, 고성능)
implementation 'org.springframework.boot:spring-boot-starter-cache'
implementation 'com.github.ben-manes.caffeine:caffeine'

// Redis 캐시 (분산 캐시)
implementation 'org.springframework.boot:spring-boot-starter-data-redis'
```

---

## @EnableCaching + 기본 설정

```java
@SpringBootApplication
@EnableCaching
public class Application { ... }
```

```yaml
# application.yml — Caffeine 로컬 캐시
spring:
  cache:
    type: caffeine
    caffeine:
      spec: maximumSize=1000,expireAfterWrite=10m
```

---

## 핵심 어노테이션

```java
@Service
public class ProductService {

    // 캐시에서 조회, 없으면 실행 후 캐시 저장
    @Cacheable(value = "products", key = "#id")
    public ProductResponse findById(Long id) {
        log.info("DB 조회: {}", id);  // 캐시 히트 시 이 로그 출력 안 됨
        return productRepository.findById(id)
            .map(ProductResponse::from)
            .orElseThrow(() -> new ProductNotFoundException(id));
    }

    // 조건부 캐시
    @Cacheable(value = "products", key = "#id", condition = "#id > 0",
               unless = "#result.price == 0")  // 결과가 0원이면 캐시 안 함
    public ProductResponse findByIdConditional(Long id) { ... }

    // 캐시 갱신 (메서드 실행 후 저장)
    @CachePut(value = "products", key = "#result.id")
    public ProductResponse update(Long id, UpdateProductRequest request) {
        Product product = productRepository.findById(id).orElseThrow();
        product.update(request);
        return ProductResponse.from(productRepository.save(product));
    }

    // 캐시 삭제
    @CacheEvict(value = "products", key = "#id")
    public void delete(Long id) {
        productRepository.deleteById(id);
    }

    // 모든 캐시 삭제
    @CacheEvict(value = "products", allEntries = true)
    public void clearAll() { }
}
```

---

## 복합 어노테이션

```java
// 수정 시 캐시 갱신 + 목록 캐시 무효화
@Caching(
    put = @CachePut(value = "products", key = "#result.id"),
    evict = @CacheEvict(value = "productList", allEntries = true)
)
public ProductResponse update(Long id, UpdateProductRequest request) { ... }
```

---

## Redis 캐시 설정

```yaml
# application.yml
spring:
  data:
    redis:
      host: localhost
      port: 6379
  cache:
    type: redis
    redis:
      time-to-live: 600000  # 10분 (ms)
      cache-null-values: false
```

TTL을 캐시별로 다르게 설정:

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // 기본 설정
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new GenericJackson2JsonRedisSerializer()));

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            .withCacheConfiguration("products",
                defaultConfig.entryTtl(Duration.ofHours(1)))     // 상품: 1시간
            .withCacheConfiguration("userSessions",
                defaultConfig.entryTtl(Duration.ofMinutes(30)))  // 세션: 30분
            .withCacheConfiguration("rankings",
                defaultConfig.entryTtl(Duration.ofMinutes(5)))   // 랭킹: 5분
            .build();
    }
}
```

---

## Redis 직접 사용

캐시 어노테이션 외에 직접 Redis를 조작합니다.

```java
@Service
public class RankingService {

    private final RedisTemplate<String, String> redisTemplate;
    private static final String RANKING_KEY = "product:ranking";

    // Sorted Set으로 실시간 랭킹
    public void incrementViewCount(Long productId) {
        redisTemplate.opsForZSet().incrementScore(RANKING_KEY, productId.toString(), 1);
    }

    public List<Long> getTopProducts(int count) {
        Set<String> ids = redisTemplate.opsForZSet()
            .reverseRange(RANKING_KEY, 0, count - 1);  // 높은 점수 순
        return ids.stream().map(Long::parseLong).toList();
    }

    // 분산 락
    public boolean tryAcquireLock(String lockKey, long timeoutSeconds) {
        Boolean acquired = redisTemplate.opsForValue()
            .setIfAbsent(lockKey, "locked", Duration.ofSeconds(timeoutSeconds));
        return Boolean.TRUE.equals(acquired);
    }

    public void releaseLock(String lockKey) {
        redisTemplate.delete(lockKey);
    }
}
```

### RedisTemplate 설정

```java
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }
}
```

---

## 캐시 전략

### Cache-Aside (Lazy Loading)

```java
// 읽기: 캐시 → 없으면 DB → 캐시 저장
// 쓰기: DB 저장 → 캐시 삭제 (다음 읽기 시 DB에서 다시 로드)
@Cacheable("users")
public User getUser(Long id) { return userRepository.findById(id).orElseThrow(); }

@CacheEvict("users")
public User updateUser(Long id, UpdateRequest request) { ... }
```

### Write-Through

```java
// 쓰기: DB + 캐시 동시 저장
@CachePut(value = "users", key = "#result.id")
public User updateUser(Long id, UpdateRequest request) {
    return userRepository.save(update(id, request));
}
```

---

## 주의사항

```java
// 1. Self-Invocation — @Cacheable 무시됨
@Service
public class ProductService {
    public ProductResponse getDetail(Long id) {
        return findById(id);  // 프록시 거치지 않아 캐시 미적용
    }

    @Cacheable("products")
    public ProductResponse findById(Long id) { ... }
}

// 2. 캐시 키 설계
@Cacheable(value = "products", key = "#category + ':' + #page")
public Page<Product> findByCategory(String category, int page) { ... }

// 3. 직렬화 — 캐시 대상 클래스에 기본 생성자 필요 (Jackson 역직렬화)
@Getter
@NoArgsConstructor  // Redis JSON 역직렬화에 필요
public class ProductResponse { ... }
```
