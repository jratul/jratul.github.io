---
title: "캐싱 전략"
order: 4
---

# 캐싱 전략

성능의 핵심. 언제, 무엇을, 어떻게 캐시할지.

---

## 캐시 계층

```
속도 비교 (느릴수록 아래):

L1 Cache (CPU):   ~1ns
L2 Cache (CPU):   ~4ns
RAM:              ~100ns
SSD (NVMe):       ~100µs
HDD:              ~10ms
Network (LAN):    ~1ms
Network (WAN):    ~100ms

캐시 계층 구성:
1. 브라우저 캐시 (로컬)
2. CDN (엣지)
3. 로드 밸런서 캐시
4. 애플리케이션 캐시 (인메모리)
5. 분산 캐시 (Redis)
6. DB 쿼리 캐시
7. DB 버퍼 풀
```

---

## 캐시 패턴

```
Cache-Aside (Lazy Loading):
1. 캐시 조회
2. 히트 → 반환
3. 미스 → DB 조회 → 캐시 저장 → 반환

장점: 실제 사용 데이터만 캐시
단점: 첫 조회 느림, DB와 일시적 불일치

Write-Through:
1. DB 쓰기
2. 동시에 캐시 업데이트

장점: 캐시 항상 최신
단점: 쓰기 지연 증가, 안 쓰는 데이터도 캐시

Write-Behind (Write-Back):
1. 캐시에만 쓰기 (즉시 응답)
2. 나중에 비동기로 DB 저장

장점: 쓰기 성능 최고
단점: 데이터 손실 위험 (캐시 장애 시)

Read-Through:
— 캐시가 DB 조회 담당 (Cache-Aside와 유사)
— 코드가 아닌 캐시 레이어가 처리

Refresh-Ahead:
— 만료 전에 미리 갱신
— 핫 데이터에 적합
— 예측 필요
```

---

## Spring Boot 캐싱

```java
// Cache-Aside 수동 구현
@Service
@RequiredArgsConstructor
public class ProductService {

    private final RedisTemplate<String, Product> redisTemplate;
    private final ProductRepository productRepository;

    private static final Duration TTL = Duration.ofMinutes(10);

    public Product getProduct(Long id) {
        String key = "product:" + id;

        // 1. 캐시 조회
        Product cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            return cached;  // Cache Hit
        }

        // 2. DB 조회
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product not found: " + id));

        // 3. 캐시 저장
        redisTemplate.opsForValue().set(key, product, TTL);
        return product;  // Cache Miss
    }

    public void updateProduct(Long id, ProductUpdateRequest request) {
        productRepository.update(id, request);
        // 캐시 무효화 (Cache-Aside의 경우)
        redisTemplate.delete("product:" + id);
    }
}

// @Cacheable 어노테이션 방식
@Service
public class UserService {

    @Cacheable(value = "users", key = "#id", unless = "#result == null")
    public User getUser(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    @CacheEvict(value = "users", key = "#id")
    public void updateUser(Long id, UserUpdateRequest request) {
        userRepository.update(id, request);
    }

    @CachePut(value = "users", key = "#result.id")
    public User createUser(UserCreateRequest request) {
        return userRepository.save(request.toEntity());
    }

    // 여러 캐시 동시 삭제
    @Caching(evict = {
        @CacheEvict(value = "users", key = "#id"),
        @CacheEvict(value = "userList", allEntries = true)
    })
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
}
```

---

## 캐시 무효화 전략

```
TTL (Time To Live):
— 일정 시간 후 자동 만료
— 구현 단순
— 만료 전 stale 데이터 존재 가능

Event-Driven 무효화:
— 데이터 변경 시 캐시 삭제
— 최신 데이터 보장
— 구현 복잡 (누락 위험)

Write-Through:
— 쓰기 시 캐시도 동시 업데이트
— 항상 최신

버전 기반:
key = "user:" + id + ":v" + version
— 버전 증가로 자동 무효화
— 이전 버전 데이터 방치 (GC 필요)

캐시 무효화 문제:
"There are only two hard things in Computer Science:
 cache invalidation and naming things." - Phil Karlton
```

---

## 캐시 문제와 해결

```
Cache Stampede (Thundering Herd):
— 캐시 만료 시 다수 요청이 동시에 DB 조회
— 해결책:
  1. Mutex Lock: 첫 번째 요청만 DB 조회
  2. Probabilistic Early Expiration
  3. Stale-while-revalidate

// Redis 기반 Mutex
public Product getProductWithLock(Long id) {
    String key = "product:" + id;
    String lockKey = "lock:product:" + id;

    Product cached = redisTemplate.opsForValue().get(key);
    if (cached != null) return cached;

    // 락 획득 시도
    Boolean acquired = redisTemplate.opsForValue()
        .setIfAbsent(lockKey, "1", Duration.ofSeconds(5));

    if (Boolean.TRUE.equals(acquired)) {
        try {
            Product product = productRepository.findById(id).orElseThrow();
            redisTemplate.opsForValue().set(key, product, Duration.ofMinutes(10));
            return product;
        } finally {
            redisTemplate.delete(lockKey);
        }
    } else {
        // 락 대기 후 재시도
        Thread.sleep(100);
        return redisTemplate.opsForValue().get(key);
    }
}

Cache Penetration (캐시 관통):
— 존재하지 않는 키로 반복 요청 → 항상 DB 히트
— 해결책:
  1. 빈 값도 캐시 (null → "EMPTY", 짧은 TTL)
  2. Bloom Filter: 존재 여부 사전 확인

Cache Avalanche (캐시 눈사태):
— 많은 캐시가 동시에 만료
— 해결책:
  1. TTL에 랜덤 지터 추가 (10분 ± 1분)
  2. 핫 데이터는 영구 캐시
  3. 다중 캐시 레이어

// TTL 지터
Duration ttl = Duration.ofMinutes(10)
    .plusSeconds(new Random().nextInt(120));  // ±2분
```

---

## 분산 캐시 설계

```
로컬 캐시 vs 분산 캐시:

로컬 캐시 (Caffeine):
장점: 극히 빠름 (나노초), 네트워크 없음
단점: 서버마다 별도 캐시, 불일치 가능
용도: 변경 빈도 낮은 설정, 코드 목록

분산 캐시 (Redis):
장점: 서버 간 공유, 세션/상태 공유
단점: 네트워크 오버헤드 (~1ms)
용도: 세션, 인기 데이터, 분산 락

2단계 캐시 (L1 + L2):
L1: 로컬 캐시 (Caffeine, 1초 TTL)
L2: Redis (10분 TTL)

@Bean
public CaffeineCacheManager caffeineCacheManager() {
    CaffeineCacheManager manager = new CaffeineCacheManager();
    manager.setCaffeine(Caffeine.newBuilder()
        .expireAfterWrite(1, TimeUnit.SECONDS)
        .maximumSize(1000));
    return manager;
}
```

---

## CDN 캐싱

```
캐시 대상 분류:

정적 파일 (CDN, 장기 캐시):
/static/app.abc123.js  → 1년 (파일명에 해시)
/images/logo.png       → 30일

HTML (짧은 캐시 또는 no-cache):
/index.html            → Cache-Control: no-cache
                         (항상 ETag 검증)

API 응답 (보통 no-cache):
/api/users             → Cache-Control: no-store

ETag 기반 조건부 요청:
1. 첫 요청: 서버 → 응답 + ETag: "abc123"
2. 재요청: 클라이언트 → If-None-Match: "abc123"
3. 변경 없음: 서버 → 304 Not Modified (본문 없음)
4. 변경 있음: 서버 → 200 + 새 내용 + ETag: "def456"

Cache-Control 헤더:
max-age=3600          → 1시간 캐시
no-cache              → 항상 서버 검증
no-store              → 캐시 금지
public                → CDN 캐시 허용
private               → 브라우저만 캐시
stale-while-revalidate=60 → 60초간 stale 허용하며 백그라운드 갱신
```
