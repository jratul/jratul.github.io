---
title: "Redis 면접 예상 질문"
order: 9
---

# Redis 면접 예상 질문

Redis 면접에서 빈출되는 핵심 질문들입니다.

## Q1. Redis가 빠른 이유는?

1. **인메모리:** 디스크 I/O 없이 RAM에서 직접 읽고 씀
2. **단일 스레드 이벤트 루프:** 컨텍스트 스위칭 없음, Lock-free
3. **효율적인 자료구조:** 목적에 최적화된 내부 인코딩 (ziplist, skiplist 등)
4. **비동기 I/O:** Non-blocking I/O 멀티플렉싱 (하나의 스레드가 여러 소켓 이벤트를 동시에 감시하는 기법)

**성능 기준:** 초당 100,000 이상의 GET/SET 처리 가능

⚠️ 단일 스레드이므로 `KEYS *` 같은 O(N) 명령은 서비스 전체를 블록합니다.

---

## Q2. Redis의 주요 자료구조와 활용 예시를 설명해주세요

```bash
# String — 캐싱, 카운터, 분산 락
SET user:1:name "Alice"
INCR page:views:1234        # 원자적 카운터

# Hash — 객체 저장 (필드별 접근)
HSET user:1 name "Alice" age "30"
HGET user:1 name

# List — 메시지 큐, 최근 활동 피드
LPUSH notifications:user:1 "새 메시지"
LRANGE notifications:user:1 0 9  # 최신 10개

# Set — 중복 없는 태그, 교집합/합집합
SADD post:1:tags "redis" "backend"
SINTER post:1:tags post:2:tags    # 공통 태그

# Sorted Set — 실시간 랭킹, 우선순위 큐
ZADD leaderboard 1500 "Alice" 2000 "Bob"
ZREVRANGE leaderboard 0 9 WITHSCORES  # 상위 10명
```

---

## Q3. 캐시 전략 패턴을 설명해주세요

**Cache-Aside (Lazy Loading):**
```
1. 캐시 조회 → 미스
2. DB 조회
3. 캐시에 저장 (TTL - Time To Live, 데이터 자동 만료 시간 설정)
4. 반환
```
✅ 자주 읽는 데이터만 캐시됨
❌ 첫 요청은 느림 (Cache Miss Penalty)

**Write-Through:**
```
쓰기 → 캐시 저장 + DB 저장 동시
```
✅ 캐시와 DB 항상 동기화
❌ 불필요한 데이터도 캐시됨

**Write-Behind (Write-Back):**
```
쓰기 → 캐시만 즉시 저장 → 비동기로 DB 저장
```
✅ 쓰기 성능 최대
❌ 캐시 장애 시 데이터 유실 위험

---

## Q4. 캐시 문제 패턴(Cache Stampede, Thundering Herd)은?

**캐시 스탬피드:** TTL 만료 시 다수의 요청이 동시에 DB에 쿼리

```
해결 1: 뮤텍스 락
해결 2: 확률적 조기 갱신 (만료 직전에 일부 요청에서 갱신)
해결 3: TTL에 랜덤성 추가
```

**캐시 페네트레이션 (Cache Penetration):** 없는 키를 반복 조회해 매번 DB 히트

```
해결: Null 값도 캐시 저장 (짧은 TTL) 또는 블룸 필터(Bloom Filter - 특정 값이 집합에 존재하는지 빠르게 판별하는 확률적 자료구조) 사용
```

**캐시 애벌런치 (Cache Avalanche):** 동시에 많은 캐시 키 만료

```
해결: TTL에 랜덤 지터(jitter) 추가
SET key value EX $((3600 + RANDOM % 600))
```

---

## Q5. 분산 락(Distributed Lock)을 Redis로 어떻게 구현하나요?

**단순 구현:**
```bash
# 락 획득 (NX: 없을 때만, EX: TTL)
SET lock:resource "owner-uuid" NX EX 30

# 작업 수행...

# 락 해제 (Lua 스크립트로 원자적 처리)
EVAL "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end" 1 lock:resource "owner-uuid"
```

**Redlock 알고리즘:** 5개 이상의 독립 Redis 노드에서 과반수 획득 → 단일 노드 장애에도 안전

**Spring에서는 Redisson 사용:**
```java
RLock lock = redisson.getLock("myLock");
lock.lock(30, TimeUnit.SECONDS);
try {
    // 임계 구역
} finally {
    lock.unlock();
}
```

---

## Q6. Redis 영속성(Persistence) 방법을 설명해주세요

**RDB (Redis Database Backup):**
- 주기적으로 메모리 스냅샷을 .rdb 파일로 저장
- ✅ 작은 파일 크기, 빠른 재시작
- ❌ 스냅샷 사이 데이터 유실 가능

**AOF (Append Only File):**
- 모든 쓰기 명령을 로그로 기록
- `appendfsync always/everysec/no` 설정
- ✅ 데이터 유실 최소화
- ❌ 파일 크기 증가, 재시작 느림

**권장:** RDB + AOF 함께 사용 (Redis 7.0부터 기본값)

---

## Q7. Redis Cluster와 Sentinel의 차이는?

**Redis Sentinel:**
- **고가용성(HA - High Availability)** 목적 — Master 장애 시 Slave 자동 승격
- 데이터 샤딩 없음 (모든 노드가 전체 데이터 보유)
- Sentinel 프로세스가 Master 모니터링

**Redis Cluster:**
- **수평 확장** 목적 — 데이터를 여러 노드에 분산
- 16384개 해시 슬롯을 노드에 분배
- 최소 3개 Master + 각 Master마다 Replica

```
Sentinel: 데이터가 크지 않지만 HA가 필요한 경우
Cluster:  데이터가 매우 많거나 쓰기 처리량이 높은 경우
```

---

## Q8. Redis의 메모리 관리와 Eviction 정책은?

`maxmemory` 설정 이후 새 데이터를 위해 기존 데이터 제거 정책:

| 정책 | 설명 |
|-----|------|
| `noeviction` | 메모리 초과 시 오류 반환 |
| `allkeys-lru` | 모든 키 중 LRU (Least Recently Used, 가장 오랫동안 미사용) 기준 제거 |
| `volatile-lru` | TTL 있는 키 중 LRU 기준 제거 |
| `allkeys-lfu` | 모든 키 중 LFU (Least Frequently Used, 사용 빈도 가장 낮음) 기준 제거 |
| `volatile-ttl` | TTL이 가장 짧은 키 제거 |
| `allkeys-random` | 무작위 제거 |

**캐시 목적:** `allkeys-lru` 또는 `allkeys-lfu` 권장
**세션 스토어:** `volatile-lru` (TTL 있는 키만 제거)
