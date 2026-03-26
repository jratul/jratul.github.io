---
title: "메모리 관리와 Eviction 정책"
order: 7
---

# 메모리 관리와 Eviction 정책

Redis는 RAM에 데이터를 저장하기 때문에 메모리 관리가 핵심이다.
메모리가 꽉 차면 Redis가 멈추거나 데이터가 삭제될 수 있다.

---

## 메모리가 왜 중요한가

```
Redis = 초고속 인메모리 DB
장점: 마이크로초 응답 속도
단점: RAM은 비싸고 용량이 제한됨

문제 상황:
- TTL 없이 데이터를 계속 저장
- 세션 데이터가 쌓임
- 캐시 키가 무한정 증가
→ 메모리 꽉 참 → Redis 쓰기 명령 실패
→ 서비스 장애!

초보자 실수:
SET user:data "..." # TTL 없음 → 지워지지 않고 계속 쌓임!
```

---

## 메모리 사용 현황 파악

```bash
# 종합 메모리 정보
redis-cli info memory

# 핵심 지표 해석:
used_memory: 536870912          # Redis가 사용 중인 메모리 (512MB)
used_memory_human: 512.00M      # 사람이 읽기 쉬운 형태

used_memory_rss: 671088640      # OS가 Redis 프로세스에 할당한 메모리 (640MB)
used_memory_rss_human: 640.00M

mem_fragmentation_ratio: 1.25
# RSS / used_memory = 640 / 512 = 1.25
# 1.0: 완벽 효율
# 1.0~1.5: 정상
# 1.5 이상: 메모리 단편화 심함 → 최적화 필요
# 1.0 미만: 스왑 사용 중 → 성능 매우 나쁨!

used_memory_peak: 671088640     # 역대 최고 사용량
maxmemory: 2147483648           # 설정된 최대 메모리 (2GB)
maxmemory_human: 2.00G
maxmemory_policy: allkeys-lru   # 메모리 꽉 찼을 때 정책
```

```bash
# 메모리 단편화 해소
redis-cli memory purge           # 메모리 반환 요청 (비동기)

# 자동 단편화 해소 (Redis 4.0+)
CONFIG SET activedefrag yes
CONFIG SET active-defrag-enabled yes

# 현재 설정 확인
CONFIG GET maxmemory
CONFIG GET maxmemory-policy
```

---

## Eviction 정책 — 메모리 꽉 찼을 때 어떻게 할까

`maxmemory`에 도달했을 때 Redis가 어떤 키를 삭제할지 정책이다.

```
noeviction (기본값):
- 쓰기 명령에 에러 반환
- 기존 데이터는 절대 삭제 안 함
- 언제: 세션, 큐 등 데이터 손실이 절대 안 되는 경우
- 주의: 쓰기 실패 → 서비스 에러 발생!

allkeys-lru:
- 전체 키 중 가장 오래 사용하지 않은 것 삭제
- LRU = Least Recently Used
- TTL 없는 키도 삭제됨
- 언제: 캐시 서버 (가장 많이 씀)

volatile-lru:
- TTL이 설정된 키 중 LRU
- TTL 없는 키는 절대 삭제 안 함
- 언제: 캐시와 영구 데이터를 같은 Redis에 저장할 때

allkeys-lfu (Redis 4.0+):
- 전체 키 중 가장 적게 사용된 것 삭제
- LFU = Least Frequently Used
- 자주 쓰는 것은 유지 (LRU보다 스마트)
- 언제: 접근 빈도 차이가 클 때

volatile-lfu:
- TTL 있는 키 중 LFU

volatile-random:
- TTL 있는 키 중 무작위 삭제

allkeys-random:
- 전체 키 중 무작위 삭제

volatile-ttl:
- TTL이 가장 짧은 키 먼저 삭제 (곧 만료될 것을 먼저)
```

**용도별 권장**:

```bash
# 캐시 서버 → allkeys-lru (가장 일반적)
CONFIG SET maxmemory-policy allkeys-lru

# 세션 서버 (TTL 있는 세션만 삭제) → volatile-lru
CONFIG SET maxmemory-policy volatile-lru

# 분산 락, 큐 (데이터 손실 절대 안 됨) → noeviction
CONFIG SET maxmemory-policy noeviction

# 핫 데이터(인기 콘텐츠) 캐시 → allkeys-lfu
CONFIG SET maxmemory-policy allkeys-lfu
```

---

## maxmemory 설정

```bash
# 런타임에 설정 (즉시 적용)
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory 2000mb
CONFIG SET maxmemory 2000000000  # 바이트

# 제한 없음 (위험! 운영에서 사용 금지)
CONFIG SET maxmemory 0

# redis.conf에 영구 설정
maxmemory 2gb
maxmemory-policy allkeys-lru
```

**maxmemory 계산 가이드**:

```
서버 전체 메모리 8GB인 경우:
- OS: ~1GB
- 네트워크 버퍼: ~0.5GB
- Redis 오버헤드 (연결, 버퍼 등): ~0.5GB
- 여유: ~1GB

maxmemory = 8GB - 1 - 0.5 - 0.5 - 1 = 5GB
→ maxmemory 5gb

또는 간단히: 전체 메모리의 60~70%
8GB × 0.65 = 5.2GB → maxmemory 5gb
```

---

## 큰 키 (Big Key) 문제

Redis는 단일 스레드다. 큰 키를 처리하는 동안 다른 모든 명령이 멈춘다!

```bash
# 큰 키 찾기
redis-cli --bigkeys                     # 타입별 가장 큰 키 출력
redis-cli --bigkeys -i 0.1             # 0.1초 간격 (서버 부하 줄이기)

# 특정 키 메모리 사용량 확인
MEMORY USAGE user:123                   # 바이트
MEMORY USAGE user:123 SAMPLES 0         # 정확한 샘플링 (느림)

# 큰 키의 문제:
# - DEL 큰_키: 수백만 개 요소를 한 번에 삭제 → 수백 ms 블로킹!
# - SMEMBERS 큰_Set: 수백만 개 반환 → 네트워크 + 메모리 폭발
```

**큰 키 해결 방법**:

```bash
# 문제: user_posts:123 Set에 포스트 ID가 100만 개
SCARD user_posts:123   # 1,000,000개!

# 해결 1: 데이터 분할 (Sharding)
# user_posts:123:0 (0~999번 포스트)
# user_posts:123:1 (1000~1999번 포스트)
# ...
# 조회 시: 어느 샤드인지 계산 후 해당 샤드만 접근

# 해결 2: 느린 명령어 대신 SCAN 사용
SMEMBERS user_posts:123        # 모두 반환 → 위험
SSCAN user_posts:123 0 COUNT 100  # 100개씩 탐색 → 안전

HGETALL big_hash               # 모두 반환 → 위험
HSCAN big_hash 0 COUNT 100     # 안전

LRANGE list 0 -1               # 전체 반환 → 위험
LRANGE list 0 99               # 100개씩 페이징

# 해결 3: 큰 키 비동기 삭제 (Redis 4.0+)
UNLINK big_key                 # DEL과 같지만 비동기 (서버 블로킹 안 함)
```

---

## 메모리 최적화 팁

```bash
# 1. 내부 인코딩 최적화 설정 (작은 컬렉션 = 압축 저장)
# redis.conf
hash-max-listpack-entries 128   # 128개 이하 Hash = ziplist/listpack 인코딩
hash-max-listpack-value 64      # 각 필드 64바이트 이하도 조건

list-max-listpack-size -2       # 리스트: 8KB 이하 청크
zset-max-listpack-entries 128   # Sorted Set: 128개 이하
zset-max-listpack-value 64

set-max-intset-entries 512      # 정수로만 된 Set: intset 인코딩 (매우 효율적)

# 예시:
HSET user:123 name "홍길동" age "30"  # 2개 필드 → ziplist 인코딩 (효율적!)
# 128개 초과하면 hashmap으로 자동 변환 (메모리 증가)
```

```bash
# 2. TTL 설정 (메모리 자동 해제)
SET cache:product:123 "data" EX 3600   # 1시간 후 자동 삭제

# 기존 키에 TTL 추가
EXPIRE user:123:session 1800           # 30분

# 3. 불필요한 데이터 일괄 삭제
# SCAN으로 안전하게 패턴 삭제
redis-cli --scan --pattern "temp:*" | xargs redis-cli del

# 또는 Python/Java 스크립트로 처리
# (운영에서 직접 xargs del은 주의)

# 4. 데이터 압축 저장 (애플리케이션 레벨)
// Java에서 GZIP 압축 후 저장
byte[] compressed = compress(serialize(data));
redisTemplate.opsForValue().set(key, compressed);
```

---

## 키 만료 동작 — 만료가 즉시 일어나지 않는다

```
Active Expiry (능동적):
- 클라이언트가 만료된 키에 접근하면 그때 삭제
- GET expired_key → null 반환 + 키 삭제

Passive Expiry (수동적, 주기적):
- 100ms마다 만료된 키 샘플링
- 만료된 키 20개 샘플링 → 25% 이상 만료됐으면 반복
- CPU 사용률을 25%로 제한

결과:
- TTL=0이 된 키도 수초 후에 실제 삭제될 수 있음
- 메모리는 Lazy하게 해제됨
- used_memory가 maxmemory에 가까워지면 → Eviction 정책 발동

주의:
TTL=1초 설정했다고 1초 후에 반드시 삭제되는 게 아님!
→ 약간의 지연이 있을 수 있음
→ 정확한 만료가 필요하면 로직에서 TTL 확인해야 함
```

```bash
# TTL 확인
TTL key         # 남은 초 (-1: 만료 없음, -2: 키 없음)
PTTL key        # 남은 밀리초

# 특정 시점에 만료
EXPIREAT key 1704067200          # Unix timestamp로 만료
PEXPIREAT key 1704067200000      # 밀리초 timestamp
```

---

## 메모리 모니터링 자동화

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class RedisMemoryMonitor {

    private final StringRedisTemplate redisTemplate;

    @Scheduled(fixedDelay = 60_000)  // 1분마다
    public void checkMemory() {
        Properties info = redisTemplate.execute(
            connection -> connection.serverCommands().info("memory"),
            true
        );

        if (info == null) return;

        long usedMemory = Long.parseLong(info.getProperty("used_memory", "0"));
        long maxMemory = Long.parseLong(info.getProperty("maxmemory", "0"));
        double fragRatio = Double.parseDouble(info.getProperty("mem_fragmentation_ratio", "1.0"));

        if (maxMemory > 0) {
            double usageRatio = (double) usedMemory / maxMemory * 100;
            log.info("Redis 메모리 사용률: {:.1f}%, 단편화: {:.2f}", usageRatio, fragRatio);

            if (usageRatio > 90) {
                log.warn("Redis 메모리 위험! 사용률: {:.1f}%", usageRatio);
                // 알림 발송 (Slack, PagerDuty 등)
                alertService.sendAlert("Redis 메모리 위험: " + usageRatio + "%");
            }
        }

        if (fragRatio > 1.5) {
            log.warn("Redis 메모리 단편화 높음: {}", fragRatio);
            // 필요시 메모리 정리 요청
        }
    }
}
```

---

## 자주 하는 실수

```bash
# 실수 1: maxmemory 설정 없이 운영
# 메모리를 계속 먹다가 서버 OOM(Out of Memory)으로 프로세스 강제 종료!
# 해결: 반드시 maxmemory 설정 + 적절한 eviction 정책

# 실수 2: noeviction + 캐시 용도로 사용
# 메모리 꽉 참 → 쓰기 에러 → 서비스 장애
# 해결: 캐시 용도는 allkeys-lru 또는 allkeys-lfu

# 실수 3: DEL로 큰 키 삭제
DEL user_posts:123    # 수백만 개 요소 동기 삭제 → 수백 ms 블로킹
# 해결: UNLINK 사용 (비동기)
UNLINK user_posts:123

# 실수 4: TTL 없는 데이터 계속 쌓기
SET session:abc "data"   # TTL 없음
SET session:def "data"   # 계속 쌓임
# 해결: 반드시 TTL 설정

# 실수 5: 메모리 모니터링 안 함
# 어느 날 갑자기 Redis 죽음
# 해결: CloudWatch, Grafana 등으로 메모리 사용률 모니터링 + 알람
```
