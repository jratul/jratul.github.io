---
title: "메모리 관리와 Eviction 정책"
order: 7
---

# 메모리 관리와 Eviction 정책

Redis는 인메모리 DB라 메모리 관리가 핵심이다.

---

## 메모리 사용 현황 파악

```bash
redis-cli info memory

# 핵심 지표:
used_memory:              536870912   # 실제 데이터 메모리 (512MB)
used_memory_human:        512.00M
used_memory_rss:          671088640   # OS가 할당한 메모리 (640MB)
used_memory_peak:         671088640   # 최고 사용 메모리
mem_fragmentation_ratio:  1.25        # RSS / used (1.0 이상이 정상)
                                      # 1.5 이상이면 단편화 심함
maxmemory:                2147483648  # 최대 허용 메모리 (2GB)
maxmemory_human:          2.00G
maxmemory_policy:         allkeys-lru

# 단편화 해소
redis-cli memory purge    # 메모리 반환 요청 (비동기)
CONFIG SET activedefrag yes  # 자동 단편화 해소
```

---

## Eviction 정책 상세

```
메모리가 maxmemory에 도달했을 때 어떤 키를 삭제할지.

noeviction (기본):
— 메모리 꽉 차면 쓰기 명령에 에러 반환
— 세션, 큐 등 데이터 소실 절대 안 되는 경우

allkeys-lru:
— 전체 키 중 가장 오래 사용되지 않은 것 삭제
— 캐시 서버에 권장
— TTL 없는 키도 삭제

volatile-lru:
— TTL이 설정된 키 중 LRU
— TTL 없는 키는 절대 삭제 안 함

allkeys-lfu (Redis 4.0+):
— 사용 빈도 기반 (자주 사용된 것은 유지)
— 접근 패턴이 불균등할 때 효과적

volatile-lfu:
— TTL 있는 키 중 LFU

volatile-random:
— TTL 있는 키 중 무작위 삭제

allkeys-random:
— 전체 키 중 무작위 삭제

volatile-ttl:
— TTL이 가장 짧은 키 먼저 삭제

용도별 권장:
캐시: allkeys-lru 또는 allkeys-lfu
세션: volatile-lru (TTL 설정 필수)
메시지 큐: noeviction (또는 다른 솔루션 사용)
```

---

## maxmemory 설정

```bash
# redis.conf 또는 명령어로 설정
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory 2000mb
CONFIG SET maxmemory 0          # 제한 없음 (위험!)

# 런타임 확인
CONFIG GET maxmemory
CONFIG GET maxmemory-policy
```

```
maxmemory 설정 권장:
— 시스템 전체 메모리의 75% 이하
— OS, 네트워크 버퍼, Redis 자체 오버헤드 고려
— 예: 서버 메모리 8GB → maxmemory 6gb

모니터링 지표:
mem_fragmentation_ratio > 1.5 → CONFIG SET activedefrag yes
used_memory_rss / used_memory > 1.5 → MEMORY PURGE
```

---

## 큰 키 (Big Key) 문제

```bash
# 큰 키 찾기
redis-cli --bigkeys
redis-cli --bigkeys -i 0.1  # 0.1초 간격 (서버 부하 줄이기)

# 특정 키 메모리 사용량
MEMORY USAGE user:123          # 바이트 단위
MEMORY USAGE user:123 SAMPLES 0  # 전체 샘플링 (정확하지만 느림)

# 큰 키가 문제인 이유:
# — Redis는 단일 스레드 → 큰 키 작업이 다른 명령 블록
# — 네트워크 전송 지연
# — Eviction 시 큰 지연
```

```
큰 키 해결:
Hash나 List가 너무 큰 경우:
→ 분할 (Sharding)
  "user_posts:123" 하나에 10만 개 → "user_posts:123:0", "user_posts:123:1" ...

String이 너무 큰 경우:
→ 압축 후 저장
→ 또는 분할

느린 명령어 (O(n)):
KEYS *        → SCAN 으로 대체
SMEMBERS     → SSCAN
HGETALL      → HSCAN
LRANGE 0 -1  → 분할 조회
```

---

## 메모리 최적화 팁

```bash
# 1. 짧은 키 이름 사용
# user:profile:123 → u:p:123 (대규모 시 효과적)

# 2. 데이터 인코딩 최적화
# 작은 Hash는 ziplist로 저장 (매우 효율적)
hash-max-listpack-entries 128    # 128개 이하 = ziplist
hash-max-listpack-value 64       # 64바이트 이하 = ziplist

list-max-listpack-size -2        # 8KB 이하 = listpack
zset-max-listpack-entries 128
zset-max-listpack-value 64

set-max-intset-entries 512       # 정수 Set은 intset (매우 효율적)

# 3. 만료 시간 설정 (메모리 자동 해제)
SET key value EX 3600

# 4. 불필요한 데이터 삭제
redis-cli --scan --pattern "temp:*" | xargs redis-cli del
```

---

## 메모리 모니터링 자동화

```java
@Component
@RequiredArgsConstructor
public class RedisMemoryMonitor {

    private final StringRedisTemplate redisTemplate;

    @Scheduled(fixedDelay = 60_000)  // 1분마다
    public void checkMemory() {
        Properties info = redisTemplate.execute(connection ->
            connection.serverCommands().info("memory"), true);

        if (info == null) return;

        String usedMemoryStr = info.getProperty("used_memory");
        String maxMemoryStr = info.getProperty("maxmemory");

        if (usedMemoryStr != null && maxMemoryStr != null) {
            long usedMemory = Long.parseLong(usedMemoryStr);
            long maxMemory = Long.parseLong(maxMemoryStr);

            if (maxMemory > 0) {
                double ratio = (double) usedMemory / maxMemory;
                if (ratio > 0.9) {
                    log.warn("Redis 메모리 사용률 높음: {}%", String.format("%.1f", ratio * 100));
                    // 알림 발송
                }
            }
        }
    }
}
```

---

## 키 만료 동작

```
Active Expiry:
— 키 접근 시 만료 여부 확인 후 삭제

Passive Expiry (주기적):
— 주기적으로 만료된 키 샘플링 후 삭제
— 100ms마다 만료 키 중 20개 샘플링
— 25% 이상 만료됐으면 반복

주의:
— 만료된 키가 바로 삭제되지 않을 수 있음
— 메모리는 Lazy하게 해제됨
— TTL=1초인 키도 수 초 후에 실제 삭제될 수 있음

used_memory가 maxmemory에 가까워지면:
→ Eviction 정책 동작
→ 만료 여부와 무관하게 키 삭제 가능
```
