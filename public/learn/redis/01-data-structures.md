---
title: "Redis 자료구조"
order: 1
---

# Redis 자료구조

Redis는 단순 캐시가 아니라 다양한 자료구조를 제공하는 **초고속 인메모리 데이터베이스**다.

---

## Redis가 뭔가요?

**Redis = 책상 위에 있는 자주 쓰는 물건**

데이터베이스(DB)를 서랍이라고 하면, Redis는 책상 위에 꺼내놓은 물건들이다.
서랍에서 꺼내는 것(DB 조회)보다 책상 위에서 집는 것(Redis 조회)이 훨씬 빠르다.

```
일반 DB (MySQL, PostgreSQL):
- 디스크에서 읽음 → 수 밀리초(ms) 소요
- 복잡한 쿼리, 트랜잭션 지원

Redis:
- RAM에서 읽음 → 수 마이크로초(μs) 소요
- 단순하지만 엄청나게 빠름 (DB보다 100-1000배)
```

**Redis의 특징**:

```
인메모리:   모든 데이터를 RAM에 저장 → 마이크로초(μs) 응답
단일 스레드: 명령어가 순차 실행 → Race condition 없음, 원자적 연산
영속성:     RDB 스냅샷, AOF 로그로 디스크 저장 가능
복제:       Primary-Replica 구조로 읽기 분산
클러스터:   여러 노드에 데이터 분산 (수평 확장)
```

**기본 명령어** (Redis CLI에서 직접 실행 가능):

```bash
SET key value           # 저장
GET key                 # 조회
DEL key                 # 삭제
EXISTS key              # 존재 여부 (1=있음, 0=없음)
EXPIRE key 3600         # 3600초 후 만료
TTL key                 # 남은 만료 시간 (-1: 만료 없음, -2: 키 없음)
PERSIST key             # 만료 설정 제거
TYPE key                # 데이터 타입 확인 (string/list/set/zset/hash)

# 키 목록 (운영 서버에서는 절대 사용 금지! 서버 멈춤)
KEYS *                  # 전체 키 목록 → 운영에서는 사용 금지!!!
KEYS user:*             # 패턴 검색 → 역시 운영 금지!
SCAN 0 MATCH user:* COUNT 100   # 안전한 방법 (조금씩 탐색)
```

---

## String — 가장 기본 타입

텍스트, 숫자, 바이너리 모두 저장 가능한 기본 타입이다.

```bash
# 기본 저장 및 조회
SET name "홍길동"
GET name                        # "홍길동"
STRLEN name                     # 9 (바이트 수)

# TTL(만료) 설정 — 캐시에 필수
SET session:abc123 "userId:456" EX 3600      # 3600초(1시간) 후 만료
SET session:abc123 "userId:456" PX 3600000   # 밀리초 단위
SET token:xyz "eyJ..." EXAT 1704067200        # Unix timestamp로 만료

# 조건부 저장
SET key value NX        # key가 없을 때만 저장 (분산 락에 활용)
SET key value XX        # key가 있을 때만 저장

# 숫자 원자적 연산 (동시 요청에도 안전)
SET view_count 0
INCR view_count         # 1 (원자적 증가 — 동시에 100개 요청이 와도 정확히 100이 됨)
INCRBY view_count 5     # 6
DECR view_count         # 5
INCRBYFLOAT price 1.5   # 소수점도 가능

# 여러 키 한 번에
MSET user:1 "홍길동" user:2 "이순신" user:3 "강감찬"
MGET user:1 user:2 user:3       # ["홍길동", "이순신", "강감찬"]

# 비트 연산 — 적은 메모리로 대량 데이터 처리
# userId를 비트 위치로 사용 → 오늘 접속한 사용자 추적
SETBIT active:2024-01-06 1001 1   # userId=1001 오늘 접속
SETBIT active:2024-01-06 1002 1   # userId=1002 오늘 접속
GETBIT active:2024-01-06 1001     # 1 (접속함)
BITCOUNT active:2024-01-06        # 2 (오늘 접속자 수)
# 메모리: 100만 명도 125KB!
```

**언제 String을 쓰나?**

```
- 세션 토큰 저장 (SET session:token userId EX 1800)
- 카운터 (조회수, 좋아요 수)
- 캐시 (JSON 직렬화해서 저장)
- 분산 락 (SET lock:key value NX EX 30)
- 일일 활성 사용자(DAU) 집계 (비트 연산)
```

---

## List — 순서 있는 목록

왼쪽/오른쪽 양쪽에서 추가/꺼내기가 가능한 연결 리스트다.

```bash
# 삽입
RPUSH queue "작업1" "작업2" "작업3"  # 오른쪽에 추가 → ["작업1", "작업2", "작업3"]
LPUSH stack "a" "b" "c"              # 왼쪽에 추가 → ["c", "b", "a"]

# 조회
LRANGE queue 0 -1                   # 전체 조회 (0부터 끝까지)
LRANGE queue 0 2                    # 앞 3개
LLEN queue                          # 길이
LINDEX queue 0                      # 첫 번째 요소

# 꺼내기
LPOP queue                          # 왼쪽에서 꺼냄 (큐: FIFO)
RPOP queue                          # 오른쪽에서 꺼냄
BLPOP queue 30                      # 블로킹 팝: 데이터 있을 때까지 최대 30초 대기
                                    # (작업 큐 소비자 패턴에 유용)
BLPOP queue 0                       # 무한 대기

# 트리밍 (크기 제한)
LTRIM activity:user:123 0 99        # 앞 100개만 유지, 나머지 삭제
```

```bash
# 실전 패턴 1: 최근 본 상품 목록 (최대 10개)
LPUSH viewed:user:123 "product:456"   # 앞에 추가
LTRIM viewed:user:123 0 9             # 10개만 유지
LRANGE viewed:user:123 0 -1           # 조회

# 실전 패턴 2: 간단한 작업 큐
RPUSH job_queue '{"type":"email","to":"hong@example.com"}'
RPUSH job_queue '{"type":"sms","to":"010-1234-5678"}'
# 소비자:
BLPOP job_queue 0   # 새 작업 올 때까지 대기 → 처리
```

---

## Hash — 객체 저장에 최적

필드-값 쌍의 집합. Java의 `Map<String, String>`과 유사하다.

```bash
# 저장
HSET user:123 name "홍길동" email "hong@example.com" age 30 role "ADMIN"

# 조회
HGET user:123 name              # "홍길동" (특정 필드만)
HMGET user:123 name email       # ["홍길동", "hong@example.com"] (여러 필드)
HGETALL user:123                # 모든 필드와 값
HKEYS user:123                  # 필드 목록만: ["name", "email", "age", "role"]
HVALS user:123                  # 값 목록만: ["홍길동", "hong@example.com", ...]
HLEN user:123                   # 필드 수: 4

# 수정 및 삭제
HSET user:123 age 31            # 특정 필드 수정
HDEL user:123 role              # 특정 필드 삭제
HEXISTS user:123 email          # 필드 존재 여부
HINCRBY user:123 login_count 1  # 숫자 필드 원자적 증가

# 조건부 저장
HSETNX user:123 nickname "길동이"  # 필드가 없을 때만
```

**String vs Hash 캐시 비교**:

```
String 방식:
SET user:123 '{"name":"홍길동","email":"hong@example.com","age":30}'
→ age 하나 바꾸려면 전체 JSON 재직렬화해서 저장

Hash 방식:
HSET user:123 name "홍길동" email "hong@example.com" age 30
→ HSET user:123 age 31  ← age만 업데이트!
→ 부분 수정이 효율적
→ 필드가 적으면 (128개 이하) ziplist 내부 인코딩으로 메모리 매우 효율적
```

---

## Set — 중복 없는 집합

순서 없고 중복 없는 집합. **집합 연산(합집합, 교집합, 차집합)**이 가능하다.

```bash
# 추가 및 삭제
SADD tags:post:1 "java" "spring" "backend"
SADD tags:post:2 "java" "kotlin" "backend"
SREM tags:post:1 "java"         # 특정 요소 삭제

# 조회
SMEMBERS tags:post:1            # 전체 목록 (순서 보장 안 됨)
SCARD tags:post:1               # 크기
SISMEMBER tags:post:1 "spring"  # 포함 여부 (1=있음, 0=없음)

# 집합 연산
SUNION tags:post:1 tags:post:2  # 합집합: 두 포스트의 모든 태그
SINTER tags:post:1 tags:post:2  # 교집합: 공통 태그 (java, backend)
SDIFF tags:post:1 tags:post:2   # 차집합: post:1에만 있는 태그

SUNIONSTORE result:tags tags:post:1 tags:post:2  # 결과를 새 키에 저장

# 무작위 요소
SRANDMEMBER tags:post:1 3       # 무작위 3개 조회
SPOP tags:post:1                # 무작위 하나 꺼내기 (삭제됨)
```

```bash
# 실전 패턴: 온라인 사용자 관리
SADD online_users "user:123"           # 접속 시 추가
SREM online_users "user:123"           # 퇴장 시 삭제
SCARD online_users                     # 현재 온라인 수
SISMEMBER online_users "user:123"      # 특정 사용자 온라인 여부

# 실전 패턴: 공통 팔로워 찾기
SADD followers:userA "user:1" "user:2" "user:3"
SADD followers:userB "user:2" "user:3" "user:4"
SINTER followers:userA followers:userB  # 공통 팔로워: user:2, user:3
```

---

## Sorted Set (ZSet) — 점수가 있는 정렬된 집합

점수(score)와 함께 저장되며, **자동으로 점수 순 정렬**된다.
실시간 랭킹, 리더보드 구현에 필수다.

```bash
# 추가 (score와 함께)
ZADD leaderboard 100 "user:alice"
ZADD leaderboard 200 "user:bob"
ZADD leaderboard 150 "user:charlie"

# 특수 옵션
ZADD leaderboard NX 300 "user:alice"  # 없을 때만 추가
ZADD leaderboard GT 250 "user:alice"  # 현재 점수보다 클 때만 업데이트
ZADD leaderboard LT 50 "user:alice"   # 현재 점수보다 작을 때만 업데이트

# 점수 조회
ZSCORE leaderboard "user:alice"       # 100 (현재 점수)

# 순위 조회 (0-based)
ZRANK leaderboard "user:alice"        # 0 (score 낮은 것이 0)
ZREVRANK leaderboard "user:alice"     # 2 (score 높은 것이 0)

# 범위 조회
ZRANGE leaderboard 0 -1                      # 전체 (낮은 점수부터)
ZRANGE leaderboard 0 -1 REV                  # 역순 (높은 점수부터)
ZRANGE leaderboard 0 -1 WITHSCORES           # 점수 포함
ZREVRANGE leaderboard 0 9 WITHSCORES         # TOP 10 (높은 순)
ZRANGEBYSCORE leaderboard 100 200            # 점수 100~200 범위
ZRANGEBYSCORE leaderboard -inf +inf LIMIT 0 10  # 페이지네이션

# 수정
ZINCRBY leaderboard 50 "user:alice"   # alice 점수 +50
ZREM leaderboard "user:alice"         # 삭제

# 통계
ZCARD leaderboard                     # 전체 멤버 수
ZCOUNT leaderboard 100 200            # 점수 100~200 사이 수
```

```bash
# 실전 패턴: 실시간 게임 랭킹
ZADD rank:game NX 0 "user:123"         # 새 사용자 등록 (점수 0으로 시작)
ZINCRBY rank:game 100 "user:123"       # 점수 획득
ZREVRANGE rank:game 0 9 WITHSCORES     # TOP 10 랭킹 조회
ZREVRANK rank:game "user:123"          # 내 순위

# 실전 패턴: 지연 작업 큐
# score = 실행할 Unix timestamp
ZADD delayed_jobs 1704067260 "job:abc"   # 특정 시간에 실행할 작업
# 현재 시간 이하의 작업 꺼내기
ZRANGEBYSCORE delayed_jobs -inf 1704067200   # 지금 실행해야 할 것들
```

---

## HyperLogLog — 대용량 중복 제거 카운팅

정확하지는 않지만(오차 0.81%), **메모리를 극도로 아끼면서 중복 제거 카운팅**이 가능하다.

```bash
# DAU(일일 활성 사용자) 계산
PFADD dau:2024-01-06 "user:1" "user:2" "user:3" "user:1"  # 중복 자동 제거
PFCOUNT dau:2024-01-06          # 3 (약간의 오차 가능)

# MAU(월간 활성 사용자): 여러 날 합산
PFMERGE mau:2024-01 dau:2024-01-01 dau:2024-01-02 dau:2024-01-03
PFCOUNT mau:2024-01

# 메모리 비교:
# Set으로 100만 사용자 저장: ~64MB
# HyperLogLog로 100만 사용자 카운팅: ~12KB (5000배 절약!)

# 정확도가 중요하면 → Set 사용
# 근사치 OK면 → HyperLogLog 사용
```

---

## Stream — 영속적 메시지 큐

메시지가 저장되고 여러 소비자 그룹이 처리할 수 있는 **Kafka 유사 구조**다.

```bash
# 메시지 추가
XADD events * type "ORDER_PLACED" orderId "123" userId "456"
# *: 자동 ID (타임스탬프-시퀀스, 예: 1704067200000-0)

# 조회
XLEN events                           # 메시지 수
XRANGE events - +                     # 전체 조회
XRANGE events - + COUNT 10            # 앞 10개
XREVRANGE events + - COUNT 5          # 최근 5개

# 소비자 그룹 (여러 서버가 나눠서 처리)
XGROUP CREATE events email-group $ MKSTREAM
# $: 이 그룹은 지금 이후 메시지만 받음
# 0: 처음부터 받음

# 그룹에서 메시지 읽기
XREADGROUP GROUP email-group consumer1 COUNT 10 STREAMS events >
# >: 아직 처리 안 한 메시지만

# 처리 완료 확인 (이게 없으면 계속 pending 상태)
XACK events email-group 1704067200000-0
```

---

## 자주 하는 실수

```bash
# 실수 1: 운영 서버에서 KEYS * 사용
KEYS *          # Redis 단일 스레드 → 모든 키 탐색 → 서버 멈춤!!!
SCAN 0 MATCH * COUNT 100   # 조금씩 탐색 → 서버 영향 최소

# 실수 2: TTL 없이 데이터 쌓기
SET session:abc "data"      # TTL 없음 → 메모리가 꽉 찬다!
SET session:abc "data" EX 1800  # 30분 TTL 설정 필수

# 실수 3: HGETALL로 거대한 Hash 조회
HGETALL big_hash            # 필드가 수천 개면 느림
HSCAN big_hash 0 COUNT 100  # 조금씩 탐색

# 실수 4: Redis를 영구 DB로 사용 (캐시로만 써야 함)
# Redis는 재시작하면 데이터가 사라질 수 있음
# 영속성 설정(RDB/AOF)을 해도 완벽하지 않음
# 중요한 데이터는 반드시 MySQL/PostgreSQL에도 저장!
```
