---
title: "캐싱 전략"
order: 2
---

# 캐싱 전략

언제 캐시를 쓰고, 어떤 패턴을 선택할지 결정하는 기준.
캐시는 마법이 아니다 — 잘못 쓰면 오히려 데이터 불일치가 생긴다.

---

## 캐시란 무엇인가

**캐시 = 책상 위에 꺼내놓은 자주 쓰는 물건**

```
서랍(DB)에서 물건을 꺼낼 때마다 일어나서 서랍 열고 찾는 것 = DB 쿼리
책상 위에 자주 쓰는 것을 미리 꺼내두는 것 = 캐시

책상이 가득 차면? → 안 쓰는 것을 서랍에 다시 넣어야 함 = 캐시 Eviction
책상 위 물건이 오래되면? → 서랍의 최신 물건과 다를 수 있음 = 캐시 불일치
```

**캐시가 효과적인 경우**:

```
✅ 읽기가 쓰기보다 훨씬 많음 (상품 상세 페이지 — 초당 수천 조회)
✅ 같은 데이터를 반복적으로 조회 (카테고리 목록, 설정값)
✅ 계산 비용이 높은 결과 (집계 쿼리, 정렬)
✅ 변경 빈도가 낮은 데이터 (상품 카테고리, 지역 코드)
✅ 응답 속도가 핵심인 경우 (메인 페이지, 검색 결과)

❌ 데이터가 자주 변경됨 (실시간 재고 수량)
❌ 실시간 정합성이 필수 (계좌 잔액, 결제 금액)
❌ 사용자마다 완전히 다른 데이터 (캐시 효율 없음)
```

---

## Cache-Aside (Lazy Loading) — 가장 많이 쓰는 패턴

**"요청이 올 때 캐시를 확인하고, 없으면 DB에서 가져와서 저장"**

```
조회 요청
    → 캐시 확인
    → 캐시 HIT: 즉시 반환
    → 캐시 MISS: DB 조회 → 캐시에 저장 → 반환

쓰기 요청
    → DB 업데이트
    → 캐시 삭제 (다음 조회 시 DB에서 새로 로드)
```

```java
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String CACHE_PREFIX = "product:";
    private static final Duration TTL = Duration.ofHours(1);  // 1시간 후 만료

    public ProductResponse getProduct(Long id) {
        String key = CACHE_PREFIX + id;

        // 1단계: 캐시 확인
        String cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            // 캐시 HIT → 즉시 반환 (DB 접근 없음)
            return deserialize(cached, ProductResponse.class);
        }

        // 2단계: 캐시 MISS → DB 조회
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("상품을 찾을 수 없습니다: " + id));
        ProductResponse response = ProductResponse.from(product);

        // 3단계: 캐시에 저장 (다음 요청은 캐시에서 바로)
        redisTemplate.opsForValue().set(key, serialize(response), TTL);

        return response;
    }

    public ProductResponse updateProduct(Long id, UpdateProductRequest request) {
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("상품을 찾을 수 없습니다: " + id));

        product.update(request);
        productRepository.save(product);

        // 캐시 삭제 (다음 조회 시 DB에서 최신 데이터 로드)
        redisTemplate.delete(CACHE_PREFIX + id);

        return ProductResponse.from(product);
    }

    private String serialize(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("직렬화 실패", e);
        }
    }

    private <T> T deserialize(String json, Class<T> clazz) {
        try {
            return objectMapper.readValue(json, clazz);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("역직렬화 실패", e);
        }
    }
}
```

**장점**: 실제 필요한 데이터만 캐시됨 (메모리 효율적)
**단점**: 처음 조회는 항상 DB 접근 (Cold Start)

---

## Write-Through — 쓸 때 캐시도 업데이트

**"DB와 캐시를 항상 동시에 업데이트"**

```
쓰기 요청
    → DB 업데이트
    → 캐시도 즉시 업데이트 (삭제 아닌 업데이트)

조회 요청
    → 캐시 확인
    → 캐시 HIT: 항상 최신 데이터 반환
```

```java
public ProductResponse updateProduct(Long id, UpdateProductRequest request) {
    Product product = productRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("상품을 찾을 수 없습니다: " + id));

    product.update(request);
    productRepository.save(product);

    // Write-Through: 캐시도 즉시 업데이트 (삭제가 아님)
    ProductResponse response = ProductResponse.from(product);
    redisTemplate.opsForValue().set(CACHE_PREFIX + id, serialize(response), TTL);

    return response;
}
```

**장점**: 캐시가 항상 최신 상태 유지, 캐시 MISS 거의 없음
**단점**: 쓰기 성능 저하, 안 읽히는 데이터도 캐시됨 (메모리 낭비)

---

## Write-Behind (Write-Back) — 나중에 일괄 DB 반영

**"캐시에만 빠르게 쓰고, 나중에 DB에 반영"**

```
쓰기 요청
    → 캐시에만 저장 (즉시 응답)
    → 비동기로 나중에 DB 반영 (배치)

사용 사례: 조회수, 좋아요 수, 게임 점수 등
→ 1초에 1000번 조회수 증가 → DB에 1000번 쿼리는 낭비!
→ Redis에서 원자적으로 카운트 → 1분마다 DB에 반영
```

```java
@Service
@RequiredArgsConstructor
public class ViewCountService {

    private final StringRedisTemplate redisTemplate;
    private final PostRepository postRepository;

    private static final String VIEW_KEY_PREFIX = "view_count:";

    // 조회 시 Redis에서 원자적 증가 (매우 빠름)
    public void incrementViewCount(Long postId) {
        redisTemplate.opsForValue().increment(VIEW_KEY_PREFIX + postId);
    }

    // 1분마다 DB에 일괄 반영
    @Scheduled(fixedDelay = 60_000)
    public void flushViewCountsToDB() {
        // 주의: KEYS 명령어는 운영에서 SCAN으로 대체해야 함
        Set<String> keys = scanKeys(VIEW_KEY_PREFIX + "*");
        if (keys == null || keys.isEmpty()) return;

        for (String key : keys) {
            String postIdStr = key.replace(VIEW_KEY_PREFIX, "");
            // getAndDelete: 값 가져오고 동시에 삭제 (원자적)
            String countStr = redisTemplate.opsForValue().getAndDelete(key);
            if (countStr != null) {
                postRepository.incrementViewCount(
                    Long.parseLong(postIdStr),
                    Long.parseLong(countStr)
                );
            }
        }
    }

    // SCAN으로 안전하게 키 탐색
    private Set<String> scanKeys(String pattern) {
        Set<String> keys = new HashSet<>();
        ScanOptions options = ScanOptions.scanOptions().match(pattern).count(100).build();
        try (Cursor<String> cursor = redisTemplate.scan(options)) {
            cursor.forEachRemaining(keys::add);
        }
        return keys;
    }
}
```

**장점**: 쓰기 성능 최고 (Redis 속도)
**단점**: 서버 재시작 시 DB 미반영 데이터 손실 가능, 구현 복잡

---

## Spring Cache 추상화 (@Cacheable) — 가장 편한 방법

Spring의 어노테이션으로 Cache-Aside 패턴을 자동으로 적용한다.

```java
@Configuration
@EnableCaching    // 캐시 활성화
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
        // 기본 JSON 직렬화 설정
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration
            .defaultCacheConfig()
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new GenericJackson2JsonRedisSerializer()))
            .disableCachingNullValues();  // null은 캐시 안 함

        // 캐시별로 TTL 다르게 설정
        Map<String, RedisCacheConfiguration> cacheConfigs = Map.of(
            "products",   defaultConfig.entryTtl(Duration.ofHours(1)),    // 상품: 1시간
            "categories", defaultConfig.entryTtl(Duration.ofDays(1)),     // 카테고리: 1일
            "users",      defaultConfig.entryTtl(Duration.ofMinutes(30))  // 사용자: 30분
        );

        return RedisCacheManager.builder(factory)
            .withInitialCacheConfigurations(cacheConfigs)
            .cacheDefaults(defaultConfig.entryTtl(Duration.ofMinutes(10))) // 기본값
            .build();
    }
}
```

```java
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    // @Cacheable: 캐시에 있으면 반환, 없으면 메서드 실행 후 캐시에 저장
    @Cacheable(value = "products", key = "#id")
    public ProductResponse getProduct(Long id) {
        // 캐시 미스일 때만 실행됨
        return ProductResponse.from(
            productRepository.findById(id).orElseThrow());
    }

    // @CachePut: 항상 메서드 실행, 결과를 캐시에 저장 (Write-Through)
    @CachePut(value = "products", key = "#id")
    public ProductResponse updateProduct(Long id, UpdateProductRequest request) {
        Product product = productRepository.findById(id).orElseThrow();
        product.update(request);
        return ProductResponse.from(productRepository.save(product));
    }

    // @CacheEvict: 메서드 실행 후 캐시 삭제
    @CacheEvict(value = "products", key = "#id")
    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }

    // 여러 캐시 동시 삭제 (상품 상세 + 상품 목록 캐시 삭제)
    @Caching(evict = {
        @CacheEvict(value = "products", key = "#id"),
        @CacheEvict(value = "product-list", allEntries = true)  // 목록 전체 삭제
    })
    public ProductResponse updateProductWithListInvalidation(Long id, UpdateProductRequest request) {
        // 상품 수정
        Product product = productRepository.findById(id).orElseThrow();
        product.update(request);
        return ProductResponse.from(productRepository.save(product));
    }
}
```

---

## Cache Stampede 방지 — 동시에 캐시 만료되면?

```
상황:
- 인기 상품 페이지 캐시가 만료됨
- 동시에 100개 요청이 들어옴
- 100개 모두 캐시 MISS → DB에 100개 쿼리 동시 발생 → DB 폭발!
```

```java
// 해결책: 분산 락으로 단 하나만 DB 조회
@Service
@RequiredArgsConstructor
public class CacheLockService {

    private final StringRedisTemplate redisTemplate;

    public ProductResponse getProductWithLock(Long id) {
        String cacheKey = "product:" + id;
        String lockKey = "lock:product:" + id;

        // 1단계: 캐시 확인
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return deserialize(cached);

        // 2단계: 락 획득 시도 (NX = 없을 때만 SET)
        String lockValue = UUID.randomUUID().toString();
        Boolean locked = redisTemplate.opsForValue()
            .setIfAbsent(lockKey, lockValue, Duration.ofSeconds(10));

        if (Boolean.TRUE.equals(locked)) {
            // 락 획득 성공 → 나만 DB 조회
            try {
                ProductResponse response = loadFromDb(id);
                redisTemplate.opsForValue().set(cacheKey, serialize(response), TTL);
                return response;
            } finally {
                // 반드시 락 해제 (Lua 스크립트로 원자적 처리)
                releaseLock(lockKey, lockValue);
            }
        } else {
            // 락 획득 실패 → 다른 서버가 DB 조회 중 → 잠깐 기다렸다 재시도
            try {
                Thread.sleep(50);  // 50ms 대기
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return getProductWithLock(id);  // 재시도 (이번엔 캐시에 있을 것)
        }
    }

    private void releaseLock(String lockKey, String lockValue) {
        // 내가 건 락만 해제 (Lua 스크립트 = 원자적 조회+삭제)
        String script = """
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            else
                return 0
            end
            """;
        redisTemplate.execute(
            new DefaultRedisScript<>(script, Long.class),
            List.of(lockKey),
            lockValue
        );
    }
}
```

---

## TTL 전략 — 얼마나 오래 캐시할까

```java
// 데이터 성격에 따라 TTL을 다르게 설정
"categories"     → 24시간  // 카테고리: 거의 안 변함
"products"       → 1시간   // 상품: 가끔 변경
"user_profile"   → 30분    // 프로필: 간혹 변경
"cart"           → 7일     // 장바구니: 오래 유지해야 함
"session"        → 30분    // 세션: 갱신형 (접근 시마다 연장)
"otp"            → 5분     // OTP: 짧게

// TTL에 랜덤 지터(jitter) 추가 — 동시에 만료되는 것 방지
Duration baseTtl = Duration.ofHours(1);
int jitterSeconds = new Random().nextInt(600);  // 0~10분 랜덤
Duration ttl = baseTtl.plusSeconds(jitterSeconds);
// 이유: 같은 시간에 캐시된 1000개 키가 동시에 만료되면 DB 부하 폭발!
```

---

## Cache Key 설계

```java
// 좋은 키 설계 원칙

// 1. 네임스페이스 계층 구조
"product:{id}"                     // 상품 상세
"user:{id}:profile"                // 사용자 프로필
"user:{id}:orders:page:{page}"     // 사용자 주문 목록 (페이지별)
"category:{slug}:products"         // 카테고리별 상품 목록

// 2. 버전 포함 (스키마 변경 시 기존 캐시 자동 무효화)
"v2:product:{id}"                  // v2 API 응답 형식
// 응답 형식 바뀌면 "v3:product:{id}"로 변경 → 자동으로 새 데이터 로드

// 3. 키 길이 고려 (너무 길면 메모리 낭비)
// 대규모에서는 축약도 고려
// "user:profile:123456" → "up:123456" (수백만 키면 의미 있는 차이)

// 4. 특수문자 주의 (콜론:은 네임스페이스 구분자로 관례적 사용)
// 공백, 줄바꿈은 피하기

// Spring 캐시 어노테이션에서 SpEL로 동적 키
@Cacheable(value = "products", key = "#category + ':' + #page + ':' + #size")
public Page<ProductResponse> getProducts(String category, int page, int size) { ... }

// 사용자별 캐시
@Cacheable(value = "user-products", key = "#userId + ':' + #page")
@PreAuthorize("...")
public Page<ProductResponse> getUserProducts(Long userId, int page) { ... }
```

---

## 자주 하는 실수

```java
// 실수 1: DB 업데이트 후 캐시 삭제를 빠뜨림
public void updateProduct(Long id, UpdateProductRequest request) {
    productRepository.save(product);   // DB 업데이트
    // 캐시 삭제 빠뜨림! → 오래된 데이터가 1시간 동안 제공됨
}

// 실수 2: 캐시를 무조건 믿음 (일관성 검증 없음)
// 결제 금액, 재고 수량 같은 중요 데이터는 최종 확인 시 DB에서 직접 조회!

// 실수 3: 캐시 키를 구조 없이 만듦
"홍길동_상품_123"           // 한글, 공백, 밑줄 혼용 → 관리 어려움
"product:123"              // 일관된 형식이 좋음

// 실수 4: 모든 것을 캐시하려 함
// 캐시는 진짜 병목이 되는 데이터에만 적용
// 불필요한 캐시는 메모리 낭비 + 일관성 문제

// 실수 5: TTL을 너무 길게 설정
// 가격이 변경됐는데 24시간 동안 캐시가 살아있으면?
// → 데이터 성격에 맞는 TTL 설정 필수
```
