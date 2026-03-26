---
title: "캐싱 (@Cacheable, Redis)"
order: 13
---

## 캐싱이란?

캐싱은 **자주 쓰는 데이터를 빠른 저장소에 미리 보관**하는 기법입니다.

**도서관 사서** 비유:

```
캐싱 없음:
손님: "한국 역사 책 주세요"
사서: 서고 전체를 뒤져서 책 찾기 (30초)
손님: 다시 "한국 역사 책 주세요"
사서: 또 서고 전체를 뒤져서 책 찾기 (30초)

캐싱 있음:
손님: "한국 역사 책 주세요"
사서: 서고 뒤져서 책 찾기 (30초) → 책상 위에 올려둠
손님: 다시 "한국 역사 책 주세요"
사사: 책상(캐시)에서 바로 꺼냄 (1초!)
```

실제 활용:

```
DB 조회 (느림, 5~50ms) → 캐시에 저장
캐시 조회 (빠름, 1ms 미만)

적합한 데이터:
- 자주 조회되는 데이터 (상품 정보, 카테고리)
- 변경이 드문 데이터 (설정 정보, 공지사항)
- 계산 비용이 비싼 데이터 (통계, 랭킹)

부적합한 데이터:
- 실시간으로 바뀌는 데이터 (재고 수량, 주문 상태)
- 사용자별로 다른 데이터 (개인 정보) ← 키 설계 필요
```

---

## 의존성 추가

```groovy
// build.gradle

// 로컬 캐시 (같은 서버 JVM 메모리)
implementation 'org.springframework.boot:spring-boot-starter-cache'
implementation 'com.github.ben-manes.caffeine:caffeine'  // 고성능 로컬 캐시

// Redis 캐시 (여러 서버가 공유하는 분산 캐시)
implementation 'org.springframework.boot:spring-boot-starter-data-redis'
```

---

## @EnableCaching + 기본 설정

```java
// @EnableCaching 활성화
@SpringBootApplication
@EnableCaching  // 반드시 추가!
public class Application { ... }
```

로컬 캐시(Caffeine) 설정:

```yaml
# application.yml
spring:
  cache:
    type: caffeine            # 캐시 구현체 선택
    caffeine:
      spec: maximumSize=1000,expireAfterWrite=10m
      # maximumSize: 최대 1000개 항목 보관
      # expireAfterWrite: 저장 후 10분 뒤 만료
```

---

## 핵심 어노테이션

```java
@Service
public class ProductService {

    // @Cacheable: 캐시에서 조회, 없으면 메서드 실행 후 캐시에 저장
    // value: 캐시 이름 (구분자), key: 캐시 키 (SpEL 표현식)
    @Cacheable(value = "products", key = "#id")
    public ProductResponse findById(Long id) {
        // 캐시 히트 시 이 메서드 자체가 실행되지 않음!
        log.info("DB 조회: {}", id);
        return productRepository.findById(id)
            .map(ProductResponse::from)
            .orElseThrow(() -> new ProductNotFoundException(id));
    }

    // 조건부 캐시: 특정 조건일 때만 캐시
    @Cacheable(
        value = "products",
        key = "#id",
        condition = "#id > 0",         // id가 양수일 때만 캐시 적용
        unless = "#result.price == 0"  // 가격이 0원인 결과는 캐시 안 함
    )
    public ProductResponse findByIdConditional(Long id) { ... }

    // @CachePut: 항상 메서드 실행, 결과를 캐시에 저장 (갱신용)
    @CachePut(value = "products", key = "#result.id")
    public ProductResponse update(Long id, UpdateProductRequest request) {
        Product product = productRepository.findById(id).orElseThrow();
        product.update(request);
        return ProductResponse.from(productRepository.save(product));
        // 반환값이 캐시에 저장됨
    }

    // @CacheEvict: 캐시 삭제
    @CacheEvict(value = "products", key = "#id")
    public void delete(Long id) {
        productRepository.deleteById(id);
        // 삭제 시 캐시도 함께 삭제 → 다음 조회 시 DB에서 가져옴
    }

    // 모든 캐시 삭제
    @CacheEvict(value = "products", allEntries = true)
    public void clearAll() { }
}
```

---

## @Caching — 복합 어노테이션

여러 캐시 동작을 한 번에 설정할 때 사용합니다.

```java
// 상품 수정 시:
// 1. 개별 상품 캐시 갱신
// 2. 목록 캐시 삭제 (목록이 변경됐으니까)
@Caching(
    put = @CachePut(value = "products", key = "#result.id"),
    evict = @CacheEvict(value = "productList", allEntries = true)
)
public ProductResponse update(Long id, UpdateProductRequest request) { ... }
```

---

## Redis 캐시 설정

여러 서버가 캐시를 **공유**해야 할 때 Redis를 사용합니다.

```yaml
# application.yml
spring:
  data:
    redis:
      host: localhost   # Redis 서버 주소
      port: 6379
  cache:
    type: redis         # Caffeine → Redis로 변경
    redis:
      time-to-live: 600000   # 기본 만료시간 10분 (ms)
      cache-null-values: false  # null 결과는 캐시 안 함
```

캐시별 TTL(Time-To-Live) 다르게 설정:

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // 기본 설정 (JSON 직렬화)
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))  // 기본 10분
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new GenericJackson2JsonRedisSerializer()));  // JSON으로 저장

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            // 캐시별 TTL 개별 설정
            .withCacheConfiguration("products",
                defaultConfig.entryTtl(Duration.ofHours(1)))      // 상품: 1시간 유지
            .withCacheConfiguration("userSessions",
                defaultConfig.entryTtl(Duration.ofMinutes(30)))   // 세션: 30분
            .withCacheConfiguration("rankings",
                defaultConfig.entryTtl(Duration.ofMinutes(5)))    // 랭킹: 5분 (자주 변경)
            .withCacheConfiguration("categories",
                defaultConfig.entryTtl(Duration.ofDays(1)))       // 카테고리: 1일 (잘 안 바뀜)
            .build();
    }
}
```

---

## Redis 직접 사용

어노테이션 방식으로는 부족한 복잡한 캐시 로직을 직접 구현합니다.

```java
@Service
public class RankingService {

    private final RedisTemplate<String, String> redisTemplate;
    private static final String RANKING_KEY = "product:ranking";  // Redis 키

    // Sorted Set으로 실시간 랭킹 구현
    public void incrementViewCount(Long productId) {
        // ZSet: 점수(조회수)로 정렬되는 집합
        redisTemplate.opsForZSet().incrementScore(
            RANKING_KEY,
            productId.toString(),  // 멤버 (상품 ID)
            1                      // 증가 점수
        );
    }

    public List<Long> getTopProducts(int count) {
        // 높은 점수 순으로 top N 개 조회
        Set<String> ids = redisTemplate.opsForZSet()
            .reverseRange(RANKING_KEY, 0, count - 1);
        return ids.stream().map(Long::parseLong).toList();
    }

    // 분산 락 구현 (동시성 문제 해결)
    public boolean tryAcquireLock(String lockKey, long timeoutSeconds) {
        // setIfAbsent: 키가 없을 때만 저장 (원자적 연산)
        Boolean acquired = redisTemplate.opsForValue()
            .setIfAbsent(lockKey, "locked", Duration.ofSeconds(timeoutSeconds));
        return Boolean.TRUE.equals(acquired);  // 획득 성공 여부
    }

    public void releaseLock(String lockKey) {
        redisTemplate.delete(lockKey);  // 락 해제
    }
}
```

RedisTemplate 설정:

```java
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        // 키는 문자열로, 값은 JSON으로 직렬화
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

### Cache-Aside (Lazy Loading) — 가장 일반적

```java
// 읽기: 캐시 먼저 → 없으면 DB → 캐시 저장
@Cacheable("users")
public User getUser(Long id) {
    return userRepository.findById(id).orElseThrow();
}

// 쓰기: DB 저장 → 캐시 삭제 (다음 읽기 때 DB에서 다시 로드)
@CacheEvict("users")
public User updateUser(Long id, UpdateRequest request) {
    return userRepository.save(update(id, request));
}
```

### Write-Through — 항상 최신 상태

```java
// 쓰기: DB + 캐시 동시 저장
@CachePut(value = "users", key = "#result.id")
public User updateUser(Long id, UpdateRequest request) {
    return userRepository.save(update(id, request));
}
```

---

## 예제: 상품 조회 성능 최적화

```java
@Service
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    // 상품 상세 — 1시간 캐시 (자주 조회, 잘 안 바뀜)
    @Cacheable(value = "products", key = "#id")
    public ProductDetailResponse getProductDetail(Long id) {
        log.info("DB에서 상품 조회: {}", id);  // 캐시 히트 시 로그 안 찍힘
        return productRepository.findDetailById(id)
            .orElseThrow(() -> new ProductNotFoundException(id));
    }

    // 카테고리별 상품 목록 — 키에 카테고리와 페이지 포함
    @Cacheable(value = "productList", key = "#category + ':' + #page")
    public Page<ProductSummary> getProductsByCategory(String category, int page) {
        return productRepository.findByCategory(category, PageRequest.of(page, 20));
    }

    // 상품 수정 시 캐시 갱신 + 목록 캐시 삭제
    @Caching(
        put = @CachePut(value = "products", key = "#id"),
        evict = @CacheEvict(value = "productList", allEntries = true)
    )
    public ProductDetailResponse updateProduct(Long id, UpdateProductRequest request) {
        Product product = productRepository.findById(id).orElseThrow();
        product.update(request);
        return ProductDetailResponse.from(productRepository.save(product));
    }

    // 상품 삭제 시 모든 관련 캐시 삭제
    @Caching(evict = {
        @CacheEvict(value = "products", key = "#id"),
        @CacheEvict(value = "productList", allEntries = true)
    })
    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }
}
```

---

## 초보자가 자주 하는 실수

```java
// ❌ 실수 1: Self-Invocation — 같은 클래스 내 호출은 @Cacheable 무시됨
@Service
public class ProductService {
    public ProductResponse getDetail(Long id) {
        return findById(id);  // 같은 클래스 내 직접 호출 → 캐시 미적용!
    }

    @Cacheable("products")
    public ProductResponse findById(Long id) { ... }
}

// ✅ 올바른 방법: 별도 Bean으로 분리하거나 외부에서 호출
@Service
public class ProductQueryService {
    @Cacheable("products")
    public ProductResponse findById(Long id) { ... }  // 다른 Bean에서 호출
}

// ❌ 실수 2: 캐시 키가 없어서 모든 결과가 같은 키로 저장됨
@Cacheable("products")  // key 없음 → 모든 호출이 같은 캐시 키 사용!
public ProductResponse findById(Long id) { ... }
// findById(1) → 캐시에 저장
// findById(2) → 캐시에서 findById(1)의 결과 반환! (버그!)

// ✅ 올바른 방법: 키 명시
@Cacheable(value = "products", key = "#id")  // 각 ID별로 별도 캐시

// ❌ 실수 3: 캐시 대상 클래스에 기본 생성자 없음
@Getter
public class ProductResponse {
    // 기본 생성자 없음!
    // Redis에서 JSON → 객체 변환 시 Jackson이 기본 생성자 필요
}

// ✅ 올바른 방법
@Getter
@NoArgsConstructor  // 기본 생성자 추가 (Lombok)
public class ProductResponse { ... }

// ❌ 실수 4: @CachePut과 @Cacheable 혼동
// @Cacheable: 캐시 있으면 메서드 실행 안 함 (조회용)
// @CachePut: 항상 메서드 실행 후 캐시 저장 (갱신용)

// 업데이트인데 @Cacheable 사용 → 캐시에 이미 있으면 업데이트 실행 안 됨!
@Cacheable("products")  // ❌ 업데이트에는 잘못된 어노테이션
public ProductResponse update(Long id, UpdateRequest req) { ... }

// ✅ 업데이트는 @CachePut 사용
@CachePut(value = "products", key = "#result.id")  // ✅
public ProductResponse update(Long id, UpdateRequest req) { ... }
```

---

## 정리

```
캐시 어노테이션:
- @EnableCaching         — 캐시 활성화 (Application 클래스에)
- @Cacheable             — 조회: 캐시 있으면 반환, 없으면 실행+저장
- @CachePut              — 갱신: 항상 실행하고 캐시 저장
- @CacheEvict            — 삭제: 캐시 삭제
- @Caching               — 여러 캐시 동작 조합

캐시 구현체:
- Caffeine  — 로컬(JVM 내부), 빠름, 서버별 독립적
- Redis     — 분산(여러 서버 공유), 약간 느림, 서버 재시작 후에도 유지

언제 무엇을:
- 단일 서버: Caffeine
- 여러 서버: Redis
- 실시간 랭킹, 분산 락: Redis 직접 사용

주의사항:
- Self-Invocation 시 캐시 미적용 (AOP와 동일한 이슈)
- 캐시 키 설계 중요 (파라미터 조합으로 유일하게)
- 캐시 대상 클래스에 @NoArgsConstructor 필요 (Redis)
- 데이터 변경 시 반드시 @CacheEvict 또는 @CachePut으로 동기화
```
