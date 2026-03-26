---
title: "캐싱 전략"
order: 4
---

# 캐싱 전략

성능의 핵심. 언제, 무엇을, 어떻게 캐시할지.

책상 위에 자주 쓰는 물건을 올려두는 것을 생각해보자. 자주 쓰는 가위, 볼펜은 책상 위에 두고, 덜 쓰는 건 서랍에, 가끔 쓰는 건 창고에 넣어둔다. 캐시도 마찬가지다. 자주 쓰는 데이터를 빠른 곳에 올려두는 것이다.

---

## 캐시 계층 — 얼마나 빠른가

```
속도 비교 (느릴수록 아래):

L1 Cache (CPU 내부):  ~1ns       ← 번개처럼 빠름
L2 Cache (CPU 내부):  ~4ns
RAM (메모리):          ~100ns     ← 매우 빠름
SSD (NVMe):           ~100µs     ← 빠름
HDD (하드디스크):      ~10ms      ← 느림
Network (LAN):        ~1ms
Network (WAN):        ~100ms     ← 서울→뉴욕 왕복

실제 서비스 캐시 계층 구성:
1. 브라우저 캐시 (로컬)          ← 0ms
2. CDN (지리적으로 가까운 서버)  ← 10ms
3. 로드 밸런서 캐시              ← 1ms
4. 애플리케이션 캐시 (인메모리)  ← 0.1ms
5. 분산 캐시 (Redis)             ← 1ms (네트워크)
6. DB 쿼리 캐시                  ← DB 자체 최적화
7. DB 버퍼 풀                    ← 디스크 I/O 감소

핵심 원칙:
"요청이 최대한 상위 계층에서 처리되도록 설계"
DB까지 가는 요청을 최소화 = 성능 극대화
```

---

## 캐시 패턴 5가지

### Cache-Aside (Lazy Loading) - 가장 일반적

```
"캐시에 없을 때만 DB를 봐라"

동작 순서:
1. 앱이 캐시(Redis) 조회
2. 캐시 히트(Hit) → 즉시 반환 (DB 접근 없음)
3. 캐시 미스(Miss) → DB 조회 → 캐시에 저장 → 반환

장점:
✅ 실제로 요청된 데이터만 캐시 (메모리 효율)
✅ 캐시 서버 장애 시 DB에서 직접 서비스 가능
✅ 구현 가장 단순

단점:
❌ 첫 조회는 느림 (캐시 워밍업 필요)
❌ 데이터 변경 후 캐시 갱신 전까지 stale 데이터
❌ Cache Stampede 문제 (동시에 많은 요청이 DB 조회)
```

### Write-Through

```
"DB 쓸 때 캐시도 같이 써라"

동작 순서:
1. 앱이 캐시에 먼저 쓰기
2. 캐시가 DB에 동기적으로 쓰기
3. 둘 다 완료 후 응답

장점:
✅ 캐시와 DB 항상 동기화
✅ 읽기 항상 최신 데이터

단점:
❌ 쓰기 지연 증가 (DB + 캐시 2번 쓰기)
❌ 한 번도 안 읽히는 데이터도 캐시에 저장 (낭비)
```

### Write-Behind (Write-Back)

```
"캐시에만 먼저 써두고, DB는 나중에"

동작 순서:
1. 앱이 캐시에만 쓰기 (즉시 응답)
2. 나중에 비동기로 DB에 배치 저장

장점:
✅ 쓰기 성능 최고
✅ DB 부하 감소 (배치로 모아서 저장)

단점:
❌ 데이터 손실 위험 (캐시 장애 시 DB 미저장 데이터 소실)
❌ 구현 복잡
용도: 실시간성보다 성능이 중요한 경우 (게임 점수, 조회수)
```

### Read-Through

```
"캐시가 DB 조회를 담당"

동작 순서:
1. 앱이 캐시에만 요청
2. 캐시가 DB 조회해서 채움 (캐시 미스 시)

Cache-Aside와 차이:
— Cache-Aside: 앱이 직접 캐시/DB 제어
— Read-Through: 캐시 레이어가 자동 처리
용도: 캐시 라이브러리(Caffeine 등)가 자동 처리
```

### Refresh-Ahead

```
"만료 전에 미리 갱신"

동작 순서:
1. 캐시 TTL이 80% 지나면 백그라운드에서 미리 갱신
2. 클라이언트는 항상 캐시에서 응답 받음 (만료 없음)

장점:
✅ 캐시 미스 없음 (항상 최신 데이터)
✅ 인기 있는 데이터에 최적

단점:
❌ 인기 없는 데이터도 계속 갱신 (낭비)
❌ 데이터 변경 예측이 어려운 경우 부적합
용도: 주기적으로 갱신되는 인기 데이터 (환율, 날씨)
```

---

## Spring Boot 캐싱 구현

```java
// Cache-Aside 수동 구현
@Service
@RequiredArgsConstructor
public class ProductService {

    private final RedisTemplate<String, Product> redisTemplate;
    private final ProductRepository productRepository;

    private static final Duration TTL = Duration.ofMinutes(10);  // 10분 캐시

    public Product getProduct(Long id) {
        String key = "product:" + id;  // 캐시 키 패턴 통일

        // 1. 캐시 조회
        Product cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            return cached;  // Cache Hit: 즉시 반환
        }

        // 2. Cache Miss: DB에서 조회
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product not found: " + id));

        // 3. 캐시에 저장 (10분 TTL)
        redisTemplate.opsForValue().set(key, product, TTL);
        return product;
    }

    public void updateProduct(Long id, ProductUpdateRequest request) {
        productRepository.update(id, request);
        // 캐시 무효화 (Cache-Aside에서는 삭제가 업데이트보다 안전)
        // 업데이트 도중 실패해도 다음 조회 시 DB에서 정상 데이터 로드
        redisTemplate.delete("product:" + id);
    }
}
```

```java
// @Cacheable 어노테이션 방식 (Spring Cache 추상화)
@Service
public class UserService {

    // 캐시에 없으면 메서드 실행 후 저장
    // unless = "#result == null" → null은 캐시하지 않음
    @Cacheable(value = "users", key = "#id", unless = "#result == null")
    public User getUser(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    // 캐시 삭제 (업데이트 시 무효화)
    @CacheEvict(value = "users", key = "#id")
    public void updateUser(Long id, UserUpdateRequest request) {
        userRepository.update(id, request);
    }

    // 캐시 업데이트 (쓰고 나서 캐시 저장)
    @CachePut(value = "users", key = "#result.id")
    public User createUser(UserCreateRequest request) {
        return userRepository.save(request.toEntity());
    }

    // 여러 캐시 동시 삭제
    @Caching(evict = {
        @CacheEvict(value = "users", key = "#id"),          // 개별 캐시
        @CacheEvict(value = "userList", allEntries = true)  // 목록 캐시 전체
    })
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
}
```

```java
// Redis 캐시 설정
@Configuration
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))       // 기본 TTL 10분
            .disableCachingNullValues()              // null 캐시 안 함
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer())); // JSON 직렬화

        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();
        // 캐시별로 다른 TTL 설정
        cacheConfigs.put("users", defaultConfig.entryTtl(Duration.ofHours(1)));
        cacheConfigs.put("products", defaultConfig.entryTtl(Duration.ofMinutes(30)));
        cacheConfigs.put("categories", defaultConfig.entryTtl(Duration.ofHours(24)));

        return RedisCacheManager.builder(factory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(cacheConfigs)
            .build();
    }
}
```

---

## 캐시 무효화 전략

> "컴퓨터 과학에서 가장 어려운 두 가지는 캐시 무효화와 이름 짓기다." - Phil Karlton

```
TTL (Time To Live):
— 일정 시간 후 자동 만료
— 구현 단순, 운영 편함
— 만료 전 stale 데이터 존재 가능
— 사용 예: 상품 목록 (10분), 뉴스 피드 (5분)

Event-Driven 무효화:
— 데이터 변경 시 캐시 삭제/갱신
— 최신 데이터 항상 보장
— 구현 복잡 (누락 위험)
— 사용 예: 사용자 프로필 (변경 즉시 반영 필요)

Write-Through:
— 쓰기 시 캐시도 동시 업데이트
— 항상 최신 상태
— 쓰기 성능 약간 저하

버전 기반:
key = "user:" + id + ":v" + version
— 버전 증가 → 자동 무효화 (이전 키는 자동 만료)
— 이전 버전 데이터는 TTL 만료까지 메모리 차지
— 사용 예: 자주 변경되는 설정 데이터
```

---

## 캐시 문제와 해결책

### Cache Stampede (Thundering Herd)

```
문제 상황:
인기 상품 캐시 만료 → 동시에 10,000개 요청
→ 모두 DB에 쿼리 → DB 과부하 → 서비스 장애

해결책 1: Redis 분산 락
```

```java
public Product getProductWithLock(Long id) {
    String key = "product:" + id;
    String lockKey = "lock:product:" + id;

    // 캐시 히트
    Product cached = redisTemplate.opsForValue().get(key);
    if (cached != null) return cached;

    // 락 획득 시도 (첫 번째 요청만 성공)
    Boolean acquired = redisTemplate.opsForValue()
        .setIfAbsent(lockKey, "1", Duration.ofSeconds(5));  // 5초 락

    if (Boolean.TRUE.equals(acquired)) {
        // 락 획득 성공 → DB 조회 후 캐시 저장
        try {
            Product product = productRepository.findById(id).orElseThrow();
            redisTemplate.opsForValue().set(key, product, Duration.ofMinutes(10));
            return product;
        } finally {
            redisTemplate.delete(lockKey);  // 락 해제
        }
    } else {
        // 락 실패 → 잠시 대기 후 캐시에서 읽기 (다른 스레드가 채워줌)
        try { Thread.sleep(100); } catch (InterruptedException e) {}
        Product cached2 = redisTemplate.opsForValue().get(key);
        return cached2 != null ? cached2 : productRepository.findById(id).orElseThrow();
    }
}
```

### Cache Penetration (캐시 관통)

```
문제 상황:
존재하지 않는 상품 ID로 반복 요청
→ 캐시 미스 → DB 조회 → DB에도 없음
→ 계속 DB 접근 (DDoS 공격에 악용 가능)

해결책 1: 빈 값도 캐시 (Null Caching)
```

```java
public Optional<Product> getProduct(Long id) {
    String key = "product:" + id;
    String cached = redisTemplate.opsForValue().get(key);

    if (cached != null) {
        // "EMPTY"면 존재하지 않는 상품
        return "EMPTY".equals(cached) ? Optional.empty()
               : Optional.of(JsonUtil.fromJson(cached, Product.class));
    }

    Optional<Product> product = productRepository.findById(id);

    if (product.isPresent()) {
        // 존재하는 상품: 10분 캐시
        redisTemplate.opsForValue().set(key, JsonUtil.toJson(product.get()),
            Duration.ofMinutes(10));
    } else {
        // 존재하지 않는 상품: 1분 캐시 (짧은 TTL로 낭비 최소화)
        redisTemplate.opsForValue().set(key, "EMPTY", Duration.ofMinutes(1));
    }

    return product;
}
```

### Cache Avalanche (캐시 눈사태)

```
문제 상황:
서버 재시작 또는 배포 후 캐시 전체 소멸
→ 모든 요청이 DB로 → DB 과부하

또는 비슷한 시간에 캐시된 데이터들이 동시에 만료
→ 한꺼번에 DB 조회

해결책 1: TTL에 랜덤 지터(Jitter) 추가
```

```java
// TTL을 약간씩 다르게 설정 (동시 만료 방지)
Duration ttl = Duration.ofMinutes(10)
    .plusSeconds(new Random().nextInt(120));  // 10분 ± 2분 랜덤

redisTemplate.opsForValue().set(key, value, ttl);

// 해결책 2: 캐시 워밍업 (서버 시작 시 미리 로드)
@Component
public class CacheWarmup implements ApplicationRunner {

    @Override
    public void run(ApplicationArguments args) {
        // 인기 상품 100개 미리 로드
        productService.getTopProducts(100).forEach(p ->
            redisTemplate.opsForValue().set("product:" + p.getId(), p,
                Duration.ofMinutes(10))
        );
    }
}
```

---

## 로컬 캐시 vs 분산 캐시

```
로컬 캐시 (Caffeine/Guava):
위치: 앱 서버 메모리 (JVM 힙)
속도: 나노초 (네트워크 없음)
공유: 각 서버마다 별도 캐시
일치: 서버 간 불일치 가능

분산 캐시 (Redis):
위치: 별도 Redis 서버
속도: ~1ms (네트워크)
공유: 모든 서버가 같은 데이터
일치: 항상 일치

2단계 캐시 (L1 + L2 조합):
L1: 로컬 캐시 (Caffeine, 1초 TTL)
    → 매우 빠름, 변경 빈도 낮은 데이터
L2: Redis (10분 TTL)
    → 서버 간 공유 필요한 데이터

L1에서 히트 → 즉시 반환 (Redis도 조회 안 함)
L1 미스 → L2(Redis) 조회 → 히트 시 L1에도 저장
L2 미스 → DB 조회 → 양쪽 캐시 모두 저장
```

```java
// Caffeine 로컬 캐시 설정
@Bean
public CaffeineCacheManager caffeineCacheManager() {
    CaffeineCacheManager manager = new CaffeineCacheManager();
    manager.setCaffeine(Caffeine.newBuilder()
        .expireAfterWrite(1, TimeUnit.SECONDS)  // 1초 TTL (짧게)
        .maximumSize(1000)                       // 최대 1000개
        .recordStats());                         // 히트율 통계
    return manager;
}

// 2단계 캐시 구현
@Service
public class TwoLevelCacheService {

    private final Cache<Long, Product> localCache = Caffeine.newBuilder()
        .expireAfterWrite(1, TimeUnit.SECONDS)
        .maximumSize(500)
        .build();

    private final RedisTemplate<String, Product> redisTemplate;

    public Product getProduct(Long id) {
        // L1: 로컬 캐시 (가장 빠름)
        Product local = localCache.getIfPresent(id);
        if (local != null) return local;

        // L2: Redis
        Product redis = redisTemplate.opsForValue().get("product:" + id);
        if (redis != null) {
            localCache.put(id, redis);  // L1에도 저장
            return redis;
        }

        // DB 조회
        Product product = productRepository.findById(id).orElseThrow();
        redisTemplate.opsForValue().set("product:" + id, product, Duration.ofMinutes(10));
        localCache.put(id, product);
        return product;
    }
}
```

---

## 캐시 키 설계 원칙

```
좋은 캐시 키 = 고유하고, 예측 가능하고, 관리하기 쉬운 키

패턴: {service}:{entity}:{id}:{version}

예시:
product:detail:123              → 상품 123번 상세
product:list:category:5:page:1 → 카테고리 5의 1페이지
user:profile:456                → 사용자 456 프로필
user:feed:456:page:1            → 사용자 456의 피드 1페이지

관련 캐시 그룹으로 삭제:
KEYS product:*            → 상품 관련 모든 캐시 (운영에선 SCAN 사용)
KEYS user:456:*           → 사용자 456 관련 모든 캐시

주의:
— KEYS 명령어는 운영 환경에서 사용 금지 (전체 스캔, 성능 저하)
— 대신 SCAN 명령어 사용 (점진적 스캔)
— 또는 Redis의 키 패턴을 별도 Set으로 관리
```

---

## 흔한 실수와 주의사항

```
실수 1: 캐시 직렬화 문제
— Java 객체를 Redis에 저장할 때 직렬화 필수
❌ 기본 JDK 직렬화 (크기 크고 버전 의존적)
✅ JSON 직렬화 (GenericJackson2JsonRedisSerializer)

실수 2: TTL 없이 캐시 저장
❌ redisTemplate.opsForValue().set(key, value);  // TTL 없음
→ 메모리 무한 증가 (Redis가 가득 찰 수 있음)
✅ redisTemplate.opsForValue().set(key, value, Duration.ofMinutes(10));

실수 3: DB 트랜잭션과 캐시 동기화 문제
❌ DB 저장 전에 캐시 삭제
→ 다른 스레드가 미삭제 시점에 구버전 캐시 읽음
✅ @TransactionalEventListener(AFTER_COMMIT) 사용
→ DB 커밋 완료 후 캐시 삭제

실수 4: 캐시에 너무 큰 데이터 저장
— Redis는 메모리 DB → 큰 객체 많으면 메모리 부족
✅ 필요한 필드만 선별해서 저장 (DTO 사용)
✅ 최대 값 크기 제한 설정
```
