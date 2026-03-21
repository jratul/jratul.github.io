---
title: "Redis 자료구조"
order: 1
---

# Redis 자료구조

Redis는 단순 캐시가 아니라 다양한 자료구조를 제공하는 인메모리 데이터베이스다.

---

## Redis 특징

```
— 인메모리: 모든 데이터를 RAM에 저장 → 마이크로초 응답
— 단일 스레드: 명령어가 순차 실행 → Race condition 없음
— 영속성: RDB 스냅샷, AOF 로그로 디스크 저장 가능
— 복제: Primary-Replica 구조
— 클러스터: 수평 확장 가능

기본 명령어:
SET key value
GET key
DEL key
EXISTS key
EXPIRE key seconds
TTL key           → 남은 만료 시간 (-1: 없음, -2: 존재하지 않음)
PERSIST key       → 만료 제거
TYPE key          → 데이터 타입 확인
KEYS pattern      → 키 목록 (운영에서 사용 금지! SCAN 사용)
SCAN 0 MATCH user:* COUNT 100  → 안전한 키 탐색
```

---

## String

가장 기본. 텍스트, 숫자, 바이너리 모두 저장 가능.

```bash
# 기본
SET name "John"
GET name                    # "John"
STRLEN name                 # 4

# 만료 설정
SET session:abc "user:123" EX 3600    # 3600초 후 만료
SET session:abc "user:123" PX 3600000 # 밀리초
SET token "xyz" EXAT 1704067200       # Unix timestamp
SET key value NX            # key 없을 때만 (분산 락에 사용)
SET key value XX            # key 있을 때만

# 숫자 연산
SET counter 0
INCR counter                # 1 (원자적 증가)
INCRBY counter 5            # 6
DECR counter                # 5
INCRBYFLOAT counter 1.5     # 6.5

# 다중 처리
MSET k1 v1 k2 v2 k3 v3
MGET k1 k2 k3               # ["v1", "v2", "v3"]
MSETNX k1 v1 k2 v2          # 모두 없을 때만

# 비트 연산 (DAU 계산 등에 활용)
SETBIT active:2024-01-06 1001 1  # userId=1001 활성
GETBIT active:2024-01-06 1001
BITCOUNT active:2024-01-06       # 오늘 활성 사용자 수
BITOP AND result active:2024-01-05 active:2024-01-06  # 이틀 연속 활성
```

---

## List

순서가 있는 문자열 목록. 스택, 큐, 피드에 활용.

```bash
# 삽입
LPUSH queue "a" "b" "c"     # 왼쪽 삽입 → ["c", "b", "a"]
RPUSH queue "d"             # 오른쪽 삽입 → ["c", "b", "a", "d"]

# 조회
LRANGE queue 0 -1           # 전체: ["c", "b", "a", "d"]
LRANGE queue 0 2            # 앞 3개
LLEN queue                  # 4
LINDEX queue 0              # "c" (특정 인덱스)

# 꺼내기
LPOP queue                  # "c" (왼쪽에서)
RPOP queue                  # "d" (오른쪽에서)
BLPOP queue 30              # 블로킹 팝 (최대 30초 대기) → 메시지 큐에 활용

# 수정
LSET queue 0 "new"          # 특정 인덱스 수정
LINSERT queue BEFORE "b" "x"  # b 앞에 x 삽입

# 트리밍
LTRIM queue 0 99            # 앞 100개만 유지

# 활용 패턴
# 최근 활동 목록 (최대 100개)
LPUSH activity:user:123 "viewed:product:456"
LTRIM activity:user:123 0 99

# 간단한 큐
RPUSH job_queue '{"type":"email","to":"john@example.com"}'
BLPOP job_queue 0  # 무한 대기
```

---

## Hash

필드-값 쌍의 집합. 객체를 저장하는 데 최적.

```bash
# 필드 설정
HSET user:123 name "John" email "john@example.com" age 30
HMSET user:123 name "John" email "john@example.com"  # 구버전

# 조회
HGET user:123 name          # "John"
HMGET user:123 name email   # ["John", "john@example.com"]
HGETALL user:123            # 모든 필드
HKEYS user:123              # 필드 목록
HVALS user:123              # 값 목록
HLEN user:123               # 필드 수

# 수정/삭제
HSET user:123 age 31        # 특정 필드 수정
HDEL user:123 age           # 특정 필드 삭제
HEXISTS user:123 email      # 필드 존재 여부
HINCRBY user:123 login_count 1  # 숫자 필드 증가

# String vs Hash 캐싱 비교:
# String: JSON 직렬화 → 전체 수정 시 전체 재저장
# Hash: 필드별 수정 가능 → 부분 수정 효율적
# 단, 필드가 많으면 Hash가 메모리 효율 좋음
```

---

## Set

중복 없는 문자열 집합. 태그, 팔로워, 권한에 활용.

```bash
# 추가/삭제
SADD tags:post:1 "java" "spring" "backend"
SREM tags:post:1 "java"

# 조회
SMEMBERS tags:post:1        # 전체
SCARD tags:post:1           # 크기
SISMEMBER tags:post:1 "java"  # 포함 여부

# 집합 연산 (태그 기반 추천 등에 활용)
SUNION tags:post:1 tags:post:2    # 합집합
SINTER tags:post:1 tags:post:2    # 교집합 (공통 태그)
SDIFF  tags:post:1 tags:post:2    # 차집합

SUNIONSTORE result tags:post:1 tags:post:2  # 결과 저장
SINTERSTORE result tags:post:1 tags:post:2

# 무작위
SRANDMEMBER tags:post:1 3   # 무작위 3개
SPOP tags:post:1            # 무작위 하나 꺼내기

# 활용: 온라인 사용자
SADD online_users "user:123"
SREM online_users "user:123"
SCARD online_users          # 현재 온라인 수
SISMEMBER online_users "user:123"  # 온라인 여부
```

---

## Sorted Set (ZSet)

점수(score)가 있는 Set. 자동 정렬. 랭킹, 리더보드, 지연 큐에 활용.

```bash
# 추가 (score와 함께)
ZADD leaderboard 100 "alice"
ZADD leaderboard 200 "bob"
ZADD leaderboard 150 "charlie"
ZADD leaderboard NX 300 "alice"  # 없을 때만
ZADD leaderboard GT 250 "alice"  # 더 큰 값일 때만

# 점수 조회
ZSCORE leaderboard "alice"      # 100

# 순위 조회 (0-based, score 오름차순)
ZRANK leaderboard "alice"       # 0 (최하위)
ZREVRANK leaderboard "alice"    # 2 (최고점자가 0)

# 범위 조회
ZRANGE leaderboard 0 -1                    # 전체 (낮은 점수부터)
ZRANGE leaderboard 0 -1 REV               # 역순 (높은 점수부터)
ZRANGE leaderboard 0 -1 WITHSCORES        # 점수 포함
ZRANGEBYSCORE leaderboard 100 200         # 점수 범위
ZRANGEBYSCORE leaderboard -inf +inf LIMIT 0 10  # 페이지네이션

# 수정
ZINCRBY leaderboard 50 "alice"  # 점수 +50
ZREM leaderboard "alice"        # 삭제

# 크기
ZCARD leaderboard               # 전체 수
ZCOUNT leaderboard 100 200      # 점수 범위 내 수

# 활용: 실시간 랭킹
ZADD rank:daily NX 0 "user:123"
ZINCRBY rank:daily 10 "user:123"   # 점수 추가
ZREVRANGE rank:daily 0 9 WITHSCORES  # TOP 10

# 활용: 지연 작업 큐
ZADD delayed_jobs (timestamp) "job_id:456"  # 실행 시간을 score로
ZRANGEBYSCORE delayed_jobs -inf (NOW)        # 실행할 작업들
```

---

## HyperLogLog

대량 데이터의 중복 제거 카운팅 (근사치, 오차 0.81%).

```bash
# DAU (일일 활성 사용자) 계산
PFADD dau:2024-01-06 "user:1" "user:2" "user:3" "user:1"  # 중복 자동 제거
PFCOUNT dau:2024-01-06          # 3

# 여러 날 합산 (MAU)
PFMERGE mau:2024-01 dau:2024-01-01 dau:2024-01-02 dau:2024-01-03
PFCOUNT mau:2024-01

# 메모리: 최대 12KB (Set은 수백 MB 될 수 있음)
# 정확도가 중요하면 Set, 근사치 OK면 HyperLogLog
```

---

## Stream

메시지 스트림 (Kafka 유사). 영속적 메시지 큐.

```bash
# 메시지 추가
XADD events * type "login" userId "123"
XADD events * type "purchase" userId "456" amount "50000"

# 조회
XLEN events
XRANGE events - +               # 전체
XRANGE events - + COUNT 10      # 앞 10개
XREVRANGE events + - COUNT 10   # 최근 10개

# 소비자 그룹
XGROUP CREATE events mygroup $ MKSTREAM
XREADGROUP GROUP mygroup consumer1 COUNT 10 STREAMS events >
XACK events mygroup (message-id)  # 처리 완료 확인
```
