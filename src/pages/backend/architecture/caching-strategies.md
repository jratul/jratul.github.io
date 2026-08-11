---
title: "캐싱 전략, 어디에 무엇을 캐싱할까"
date: "2026-08-11"
tags: ["caching", "cache", "redis", "cdn", "performance", "backend"]
excerpt: "Cache-Aside부터 Write-Through, 캐시 스탬피드 방지, 분산 캐시 무효화까지 — 캐싱 전략의 핵심 패턴과 최근 트렌드를 정리합니다."
---

# 캐싱 전략, 어디에 무엇을 캐싱할까

캐시는 "DB 앞에 Redis 하나 두면 끝"이 아닙니다. 언제 캐시를 채울지, 쓰기가 발생하면
캐시를 어떻게 반영할지, 인기 키가 만료되는 순간 요청이 몰리면 어떻게 막을지, 서버가
여러 대일 때 무효화는 어떻게 전파할지 — 이 결정들에 따라 정합성과 성능이 크게
갈립니다. 이 글에서는 캐싱 패턴 4가지, TTL/Eviction 정책, 캐시 스탬피드 방지,
분산 환경의 무효화 전파를 순서대로 정리합니다.

---

## 캐싱 패턴 4가지 비교

캐시와 원본 데이터(DB)를 누가, 언제 동기화하느냐에 따라 크게 네 가지 패턴으로
나뉩니다.

### Cache-Aside (Lazy Loading)

애플리케이션이 캐시와 DB를 직접 오가며 관리합니다. 가장 흔히 쓰이는 방식입니다.

```java
// Cache-Aside — 읽기
public Product getProduct(Long id) {
    Product cached = cache.get("product:" + id);
    if (cached != null) {
        return cached; // 캐시 히트
    }
    Product product = productRepository.findById(id); // 캐시 미스 → DB 조회
    cache.set("product:" + id, product, Duration.ofMinutes(10));
    return product;
}

// Cache-Aside — 쓰기
public void updateProduct(Product product) {
    productRepository.save(product); // DB 먼저 갱신
    cache.evict("product:" + product.getId()); // 캐시는 무효화만 (다음 읽기 때 재적재)
}
```

### Read-Through / Write-Through

캐시 레이어가 DB 접근까지 감싸서, 애플리케이션은 캐시만 바라봅니다. Read-Through는
캐시 미스 시 캐시가 알아서 DB를 조회해 채우고, Write-Through는 쓰기 요청이 캐시를
거쳐 캐시와 DB에 동시에(동기적으로) 반영됩니다.

```java
// Spring Cache 추상화 — @Cacheable이 Read-Through 역할
@Cacheable(value = "products", key = "#id")
public Product getProduct(Long id) {
    return productRepository.findById(id); // 캐시 미스일 때만 실행됨
}

// @CachePut은 항상 메서드를 실행하고 결과로 캐시를 갱신 — Write-Through에 가까운 동작
@CachePut(value = "products", key = "#product.id")
public Product updateProduct(Product product) {
    return productRepository.save(product);
}
```

### Write-Behind (Write-Back)

쓰기를 캐시에만 먼저 반영하고, DB 반영은 비동기로 나중에 배치 처리합니다. 쓰기
지연시간이 가장 짧지만, 캐시가 DB에 반영되기 전에 장애가 나면 데이터를 잃을 수
있습니다.

### 비교표

| 패턴 | 읽기 흐름 | 쓰기 흐름 | 정합성 | 특징 |
|------|------|------|------|------|
| Cache-Aside | 앱이 캐시 확인 → 미스면 DB 조회 후 캐시 적재 | 앱이 DB 갱신 → 캐시 무효화 | 최종적 일관성 | 구현 단순, 캐시 로직을 앱이 직접 제어 |
| Read-Through | 캐시가 미스 시 자동으로 DB 조회 | (별도 Write 전략 필요) | 최종적 일관성 | 앱 코드가 캐시 존재를 몰라도 됨 |
| Write-Through | 캐시 우선 조회 | 캐시와 DB에 동기적으로 동시 반영 | 강한 일관성 | 쓰기 지연시간 증가 |
| Write-Behind | 캐시 우선 조회 | 캐시에만 즉시 반영, DB는 비동기 반영 | 지연된 일관성 | 쓰기 성능 최고, 장애 시 유실 위험 |

Cache-Aside가 가장 널리 쓰이는 이유는 캐시 로직을 애플리케이션이 직접 제어할 수
있기 때문입니다. 어떤 키를 캐싱할지, TTL을 얼마로 줄지, 언제 무효화할지를 세밀하게
조정할 수 있고, 캐시 인프라 장애가 나도 DB로 우회해 서비스가 완전히 멈추지는
않습니다. Write-Through/Write-Behind는 캐시 레이어(Redis, Hazelcast 등)가 이 기능을
지원해야 하고 구성이 더 복잡해서, 정합성이 특히 중요한 일부 도메인에서만 선택적으로
씁니다.

---

## TTL과 Eviction 정책

### TTL(Time To Live)

캐시 항목이 얼마나 오래 유효한지를 정하는 값입니다. 너무 길면 오래된 데이터를
보여줄 위험이 커지고, 너무 짧으면 캐시 히트율이 떨어져 DB 부하가 늘어납니다.

```java
// 데이터 변경 빈도에 따라 TTL을 다르게 가져가는 예
cache.set("product:price:" + id, price, Duration.ofSeconds(30));   // 자주 바뀜
cache.set("product:info:" + id, info, Duration.ofHours(6));        // 거의 안 바뀜
cache.set("category:tree", tree, Duration.ofDays(1));              // 정적에 가까움
```

기준은 결국 "이 데이터가 조금 오래돼도 되는가"입니다. 상품 가격처럼 정확도가 중요한
데이터는 짧게, 카테고리 트리처럼 거의 바뀌지 않는 데이터는 길게 잡습니다.

### Eviction 정책

캐시 메모리가 가득 찼을 때 어떤 항목을 내보낼지 정하는 규칙입니다.

- **LRU**(Least Recently Used): 가장 오랫동안 접근되지 않은 항목을 제거합니다.
  "최근에 안 쓰인 건 앞으로도 안 쓰일 가능성이 높다"는 가정입니다. Redis의 기본
  `maxmemory-policy` 후보 중 하나(`allkeys-lru`)이자 가장 일반적인 선택입니다.
- **LFU**(Least Frequently Used): 접근 횟수가 가장 적은 항목을 제거합니다. 가끔
  몰아서 여러 번 접근되는 데이터(예: 특정 시간대에만 반짝 인기 있는 이벤트 페이지)에는
  LRU보다 LFU가 더 적합할 수 있습니다 — 최근 접근이 뜸해도 누적 접근 횟수가 많으면
  살아남기 때문입니다.

```
# Redis 설정 예 — 메모리 초과 시 LRU 기반으로 아무 키나 제거
maxmemory 512mb
maxmemory-policy allkeys-lru
```

어느 쪽이 항상 옳은 것은 아니고, 접근 패턴(시간에 따라 균등한지, 특정 구간에
몰리는지)을 보고 고릅니다. 확신이 없다면 LRU를 기본값으로 시작하는 게 무난합니다.

---

## 캐시 스탬피드 방지

**캐시 스탬피드**(Cache Stampede)는 인기 있는 키 하나가 만료되는 순간, 그 키를
찾던 수많은 요청이 동시에 캐시 미스를 겪고 한꺼번에 DB로 몰리는 문제입니다.
Thundering Herd(천둥 치는 무리)라고도 불립니다.

```
시나리오: 초당 5,000건씩 조회되는 인기 상품 페이지 캐시가 TTL 만료로 사라짐

t=0ms   캐시 만료
t=1ms   대기 중이던 5,000개 요청이 동시에 캐시 미스
t=2ms   5,000개 요청이 전부 DB로 동일한 쿼리를 던짐
        → DB 커넥션 풀 고갈, 응답 지연 폭증, 최악의 경우 DB 다운
t=50ms  5,000개 응답이 캐시를 5,000번 다시 채움 (사실 1번이면 충분했음)
```

### 방어 기법

**1. 락**(Mutex / 분산 락) — 캐시 미스가 나면 한 요청만 DB를 조회해 캐시를 갱신하고,
나머지 요청은 갱신이 끝날 때까지 기다리거나 잠깐 대기 후 캐시를 재조회합니다.

```java
public Product getProduct(Long id) {
    Product cached = cache.get("product:" + id);
    if (cached != null) return cached;

    String lockKey = "lock:product:" + id;
    if (redis.setIfAbsent(lockKey, "1", Duration.ofSeconds(3))) {
        try {
            Product product = productRepository.findById(id);
            cache.set("product:" + id, product, Duration.ofMinutes(10));
            return product;
        } finally {
            redis.delete(lockKey);
        }
    } else {
        // 락을 못 잡은 요청은 잠깐 대기 후 캐시 재조회 (다른 요청이 채워줬을 것)
        sleep(50);
        return getProduct(id);
    }
}
```

**2. 지터**(Jitter) — TTL을 고정값이 아니라 약간의 무작위 범위로 흩뜨려서, 같은
시점에 발급된 캐시 항목들이 정확히 동시에 만료되지 않도록 만듭니다.

```java
// 10분 TTL에 ±1분 랜덤을 섞어 만료 시점을 분산
long jitterSeconds = ThreadLocalRandom.current().nextLong(-60, 60);
cache.set(key, value, Duration.ofSeconds(600 + jitterSeconds));
```

**3. 확률적 조기 갱신**(Probabilistic Early Expiration) — 캐시가 실제로 만료되기
전, 만료 시점에 가까워질수록 점점 높은 확률로 미리 갱신을 시도합니다. 대부분의
요청은 여전히 캐시를 그대로 쓰지만, 일부 요청이 확률적으로 먼저 나서서 갱신을
끝내두기 때문에 "정확히 만료되는 순간"이라는 단일 취약 지점이 사라집니다. XFetch
알고리즘이 이 아이디어를 정식화한 대표적인 예입니다.

세 기법은 배타적이지 않습니다. 실무에서는 지터로 만료 시점을 기본적으로 흩뜨려두고,
그럼에도 몰리는 트래픽에 대비해 락을 추가로 거는 조합을 많이 씁니다.

---

## 분산 환경에서의 캐시 무효화

> "컴퓨터 과학에는 어려운 문제가 딱 두 가지 있다. 캐시 무효화와 이름 짓기다"라는
> 농담이 있습니다. 캐시 정합성을 유지하는 게 그만큼 까다롭다는 뜻입니다.

서버 인스턴스가 한 대라면 캐시 무효화는 단순합니다. 그 인스턴스 안의 캐시 하나만
지우면 끝입니다. 문제는 인스턴스가 여러 대로 늘어날 때 시작됩니다.

### 로컬 캐시 vs 분산 캐시

| 구분 | 로컬 캐시 (In-process) | 분산 캐시 |
|------|------|------|
| 예시 | Caffeine, Guava Cache | Redis, Memcached |
| 위치 | 애플리케이션 프로세스 메모리 | 별도 인프라(네트워크 호출 필요) |
| 조회 속도 | 매우 빠름 (네트워크 왕복 없음) | 로컬보다 느림 (네트워크 왕복 발생) |
| 인스턴스 간 공유 | 안 됨 — 인스턴스마다 별도 사본 | 됨 — 모든 인스턴스가 같은 데이터를 봄 |
| 무효화 난이도 | 어려움 — 인스턴스마다 전파 필요 | 상대적으로 쉬움 — 한 곳만 지우면 됨 |

로컬 캐시는 빠르지만, 인스턴스 A에서 데이터를 갱신해도 인스턴스 B·C의 로컬 캐시는
그 사실을 모릅니다. 그대로 두면 B·C는 오래된 데이터를 계속 반환합니다.

### 무효화 전파 — Redis Pub/Sub 예

로컬 캐시를 쓰면서 여러 인스턴스 간 정합성도 지키려면, 갱신이 발생했다는 사실을
모든 인스턴스에 broadcast해야 합니다. Redis Pub/Sub을 흔히 씁니다.

```java
// 상품 갱신 시 — DB 갱신 후 무효화 이벤트를 전체 인스턴스에 발행
public void updateProduct(Product product) {
    productRepository.save(product);
    redisTemplate.convertAndSend("cache-invalidation", "product:" + product.getId());
}

// 모든 인스턴스가 구독 — 이벤트를 받으면 자기 로컬 캐시만 지움
@Override
public void onMessage(Message message, byte[] pattern) {
    String key = new String(message.getBody());
    localCache.invalidate(key); // Caffeine 등 로컬 캐시에서 제거
    // 다음 조회 때 분산 캐시(Redis) 또는 DB에서 다시 채워짐
}
```

이 구조에서 로컬 캐시는 "최근 자주 조회된 데이터의 초고속 사본" 역할만 하고, 정합성의
최종 기준(source of truth)은 여전히 분산 캐시나 DB에 둡니다. 로컬 캐시의 TTL도 짧게
잡아서, 혹시 무효화 이벤트를 놓치더라도(네트워크 장애 등) 오래된 데이터가 노출되는
기간을 제한하는 게 안전합니다.

---

## 최근 트렌드

**CDN/엣지에서 동적 콘텐츠까지 캐싱** — 과거 CDN은 이미지·CSS·JS 같은 정적 자산만
캐싱했지만, 최근에는 엣지 컴퓨팅 환경에서 API 응답이나 개인화되지 않은 동적 콘텐츠도
엣지 노드에서 캐싱하는 흐름이 자리잡았습니다. 사용자와 물리적으로 가까운 노드가
응답하기 때문에 origin 서버까지 왕복하지 않고도 응답할 수 있습니다.

**Stale-While-Revalidate** — 캐시가 만료됐어도 새 데이터를 가져오는 동안 일단
만료된(stale) 캐시를 즉시 보여주고, 백그라운드에서 조용히 갱신하는 패턴입니다.
사용자는 지연 없이 응답을 받고, 다음 요청부터는 갱신된 데이터를 보게 됩니다.

```
Cache-Control: max-age=60, stale-while-revalidate=300
```

이 헤더는 "60초 동안은 신선한 캐시로 간주하고, 이후 300초 동안은 만료됐어도 일단
그대로 응답하면서 백그라운드에서 재검증하라"는 뜻입니다. HTTP 캐시 헤더뿐 아니라
TanStack Query 같은 프론트엔드 데이터 페칭 라이브러리에서도 같은 개념을 표준적으로
채택하고 있습니다.

```typescript
// TanStack Query — staleTime이 지나도 캐시된 데이터를 먼저 보여주고
// 백그라운드에서 refetch (Stale-While-Revalidate와 동일한 사상)
useQuery({
  queryKey: ['product', id],
  queryFn: () => fetchProduct(id),
  staleTime: 60 * 1000, // 60초까지는 신선한 데이터로 간주
});
```

캐시를 "있다/없다"의 이분법이 아니라 "신선하다/오래됐지만 일단 쓸 만하다/무효하다"의
단계로 다루는 방식이 서버 캐싱과 클라이언트 데이터 페칭 양쪽에서 공통된 흐름으로
자리잡고 있습니다.

---

## 정리

| 상황 | 우선 고려할 전략 |
|------|------|
| 읽기 위주, 캐시 로직을 세밀하게 제어하고 싶다 | Cache-Aside |
| 쓰기 즉시 캐시와 DB 정합성이 중요하다 | Write-Through |
| 쓰기 지연시간이 병목이고 약간의 유실을 감수할 수 있다 | Write-Behind |
| 인기 키 만료 시 DB 부하 폭증이 우려된다 | 락 + Jitter + 확률적 조기 갱신 |
| 인스턴스가 여러 대이고 로컬 캐시를 쓰고 싶다 | Redis Pub/Sub 등으로 무효화 이벤트 전파 |
| 응답 지연을 최소화하면서 데이터도 어느 정도 최신으로 유지하고 싶다 | Stale-While-Revalidate |

캐싱은 정답이 하나로 정해진 문제가 아니라, 데이터의 변경 빈도와 정합성 요구 수준에
맞춰 패턴을 골라 조합하는 작업입니다. 모든 데이터에 같은 전략을 쓰기보다, 도메인별로
"이 데이터는 얼마나 정확해야 하는가"를 먼저 정하고 그에 맞는 패턴을 선택하는 게
출발점입니다.
