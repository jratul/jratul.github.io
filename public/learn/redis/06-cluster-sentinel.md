---
title: "Redis 클러스터와 Sentinel"
order: 6
---

# Redis 클러스터와 Sentinel

단일 Redis의 한계를 넘어 고가용성과 수평 확장을 달성하는 방법.

---

## 단일 Redis의 문제

```
단일 Redis:
- 서버 하나가 장애나면? → 전체 서비스 장애 (SPOF, Single Point of Failure)
- 메모리 한계? → 한 서버 RAM 이상 저장 불가
- 읽기 요청 폭발? → 한 서버가 모든 요청 처리

해결책:
Sentinel  → 고가용성 (장애 시 자동 복구)
Cluster   → 고가용성 + 수평 확장 (데이터 분산)
```

---

## Redis Replication (복제) — 기본 구조

모든 고가용성 구성의 기반이다.

```
Primary (1개):  읽기 + 쓰기
Replica (N개):  읽기만 (Primary에서 데이터 복사)

특징:
- Primary → Replica 단방향 복제
- 비동기 복제 (약간의 지연 발생)
- Replica가 Primary의 데이터를 최신으로 유지
- 읽기 부하를 Replica로 분산 가능
```

```bash
# redis.conf (Replica 설정)
replicaof 10.0.0.1 6379   # Primary IP와 포트

# 복제 상태 확인
redis-cli info replication
# role: replica
# master_host: 10.0.0.1
# master_port: 6379
# master_link_status: up          ← 연결 정상
# master_last_io_seconds_ago: 0   ← 마지막 동기화 0초 전
# master_sync_in_progress: 0      ← 동기화 중 아님
# slave_repl_offset: 12345        ← 복제 오프셋
```

---

## Redis Sentinel — 자동 Failover

Primary가 장애 났을 때 자동으로 Replica 중 하나를 Primary로 승격시킨다.

```
구성:
Primary    (1개) — 쓰기 처리
Replica    (1개+) — 읽기 처리, Primary 후보
Sentinel   (3개+) — 감시자, 과반수 투표로 Failover 결정

왜 Sentinel이 3개 이상?
→ 과반수(Quorum) 투표로 "Primary가 죽었다"고 결정
→ 2개이면 하나가 죽으면 과반수 불가
→ 최소 3개 (2개 동의 = 과반수)
```

**Failover 과정**:

```
1. Sentinel들이 Primary를 지속적으로 PING으로 모니터링
2. Sentinel 1: Primary 응답 없음 → "주관적 다운(SDOWN)" 판단
3. 다른 Sentinel들에게 확인 요청
4. 과반수 이상이 동의 → "객관적 다운(ODOWN)" 확정
5. Sentinel들 중 리더 선출 → Failover 진행
6. Replica 중 최신 데이터를 가진 것을 Primary로 승격
7. 나머지 Replica가 새 Primary를 따름
8. 애플리케이션에 새 Primary 주소 알림
```

```bash
# sentinel.conf
port 26379                              # Sentinel 기본 포트
sentinel monitor mymaster 10.0.0.1 6379 2
# mymaster: 이름, Primary IP/Port, Quorum (2개 이상 동의 시 Failover)

sentinel down-after-milliseconds mymaster 5000
# 5초 응답 없으면 장애로 판단

sentinel failover-timeout mymaster 60000
# Failover 최대 시간: 60초

sentinel parallel-syncs mymaster 1
# Failover 후 동시에 Primary와 동기화할 Replica 수 (1개씩 순차)

sentinel auth-pass mymaster ${REDIS_PASSWORD}  # Primary 비밀번호

# Sentinel 시작
redis-sentinel /etc/redis/sentinel.conf
```

```yaml
# Spring Boot - Sentinel 연결
spring:
  data:
    redis:
      sentinel:
        master: mymaster              # sentinel.conf의 이름과 일치해야 함
        nodes:
          - sentinel1.internal:26379
          - sentinel2.internal:26379
          - sentinel3.internal:26379
        password: ${SENTINEL_PASSWORD}  # Sentinel 비밀번호
      password: ${REDIS_PASSWORD}       # Redis 비밀번호
      lettuce:
        pool:
          max-active: 8
          max-idle: 8
```

---

## Redis Cluster — 수평 확장

데이터를 여러 노드에 자동으로 분산 저장한다. **16384개 슬롯**을 나눠 갖는다.

```
구성 (최소):
Node 1 (Primary) + Node 4 (Replica)  → 슬롯 0 ~ 5460
Node 2 (Primary) + Node 5 (Replica)  → 슬롯 5461 ~ 10922
Node 3 (Primary) + Node 6 (Replica)  → 슬롯 10923 ~ 16383

키 → 슬롯 배정:
CRC16("user:123") % 16384 = 5200  → Node 1에 저장
CRC16("order:456") % 16384 = 8000 → Node 2에 저장
CRC16("product:789") % 16384 = 12000 → Node 3에 저장
```

```bash
# 클러스터 생성 (6개 노드: Primary 3 + Replica 3)
redis-cli --cluster create \
  192.168.1.1:7001 192.168.1.2:7002 192.168.1.3:7003 \
  192.168.1.4:7004 192.168.1.5:7005 192.168.1.6:7006 \
  --cluster-replicas 1    # 각 Primary당 Replica 1개

# 클러스터 상태 확인
redis-cli --cluster check 192.168.1.1:7001
redis-cli -c -p 7001 cluster info
# cluster_enabled: 1
# cluster_state: ok
# cluster_slots_assigned: 16384
# cluster_known_nodes: 6

# 노드 목록
redis-cli -c -p 7001 cluster nodes
# abc123 192.168.1.1:7001 master - 0 1704067200 1 connected 0-5460
# def456 192.168.1.2:7002 master - 0 1704067200 2 connected 5461-10922
# ghi789 192.168.1.3:7003 master - 0 1704067200 3 connected 10923-16383

# 클러스터 모드로 CLI 접속 (-c 옵션 필수)
redis-cli -c -h 192.168.1.1 -p 7001
# SET foo bar  → Redirected to slot [12356] located at 192.168.1.3:7003 (자동 리다이렉트)
```

```yaml
# Spring Boot - Cluster 연결
spring:
  data:
    redis:
      cluster:
        nodes:
          - redis1.internal:6379
          - redis2.internal:6379
          - redis3.internal:6379
        max-redirects: 3    # 리다이렉트 최대 횟수 (슬롯 이동 시)
      password: ${REDIS_PASSWORD}
      lettuce:
        cluster:
          refresh:
            adaptive: true    # 클러스터 토폴로지 변경 시 자동 갱신
            period: 60s
```

---

## Hash Tag — 같은 노드에 저장하기

클러스터에서 `MGET`, 멀티키 명령어는 같은 슬롯의 키만 가능하다.
**Hash Tag**로 같은 슬롯을 강제할 수 있다.

```bash
# 문제: 다른 슬롯에 있는 키들 동시 조회 불가
MGET user:1 user:2     # CROSSSLOT Error! 다른 슬롯일 수 있음

# Hash Tag: {} 안의 내용으로만 슬롯 결정
SET {user:123}:profile "..."
SET {user:123}:sessions "..."
SET {user:123}:cart "..."
MGET {user:123}:profile {user:123}:sessions {user:123}:cart
# user:123이 같으므로 같은 슬롯 → 성공!

# 주의: Hash Tag를 너무 광범위하게 쓰면 핫스팟!
SET {user}:123 "..."  # 모든 user 키가 같은 슬롯 → 특정 노드에 몰림
SET {user:123}:data "..."  # 사용자별로 다른 슬롯 → 올바른 사용
```

---

## AWS ElastiCache for Redis

AWS에서 관리형 Redis를 사용하면 클러스터/Sentinel 관리를 AWS가 대신 해준다.

```
ElastiCache 두 가지 모드:

1. Cluster 모드 OFF (Sentinel과 유사):
   - Primary 1개 + Replica 최대 5개
   - 자동 Failover 지원
   - 단순하고 Cluster 제약 없음
   - 권장: 캐시 서버로 충분할 때

2. Cluster 모드 ON:
   - 최대 500개 노드
   - 자동 샤딩 (데이터 분산)
   - 최대 500GB 메모리
   - 제약: 멀티키 명령어 제한
   - 권장: 수십 GB 이상 데이터, 초고성능 필요 시
```

```bash
# ElastiCache 생성 (AWS CLI)
aws elasticache create-replication-group \
  --replication-group-id my-redis \
  --replication-group-description "My Redis" \
  --engine redis \
  --engine-version "7.0" \
  --cache-node-type cache.r6g.large \
  --num-cache-clusters 2 \                   # Primary + 1 Replica
  --automatic-failover-enabled \             # 자동 Failover
  --multi-az-enabled \                       # Multi-AZ (다른 가용 영역)
  --at-rest-encryption-enabled \             # 저장 암호화
  --transit-encryption-enabled               # 전송 암호화
```

```yaml
# Spring Boot - ElastiCache 연결
spring:
  data:
    redis:
      # Cluster 모드 OFF
      host: ${ELASTICACHE_ENDPOINT}     # Primary Endpoint
      port: 6379

      # Cluster 모드 ON
      cluster:
        nodes:
          - ${ELASTICACHE_CLUSTER_ENDPOINT}
```

---

## 메모리 관리 기초

클러스터/Sentinel을 쓰더라도 각 노드의 메모리 관리는 중요하다.

```bash
# 메모리 사용 현황 확인
redis-cli info memory

# 핵심 지표:
# used_memory:              536870912  ← 실제 데이터 (512MB)
# used_memory_rss:          671088640  ← OS 할당 메모리 (640MB)
# mem_fragmentation_ratio:  1.25       ← RSS/used (1.5 이상이면 단편화 심함)
# maxmemory:                2147483648 ← 최대 허용 (2GB)
# maxmemory_policy:         allkeys-lru ← 꽉 찼을 때 정책

# 메모리 설정 (redis.conf 또는 런타임)
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory-policy allkeys-lru

# 메모리 꽉 찼을 때 정책 (중요!)
noeviction      — 쓰기 에러 반환 (데이터 삭제 안 함)
allkeys-lru     — 전체 키 중 가장 오래 사용 안 한 것 삭제 (캐시에 권장)
allkeys-lfu     — 전체 키 중 가장 적게 사용된 것 삭제
volatile-lru    — TTL 있는 키 중 LRU (TTL 없는 키는 보호)
volatile-ttl    — 만료 시간이 가장 짧은 키 먼저 삭제
allkeys-random  — 무작위 삭제
```

---

## 모니터링

```bash
# 실시간 명령어 모니터링 (운영에서는 매우 주의!)
redis-cli monitor
# 모든 명령어를 출력 → 서버 성능에 영향!
# 잠깐만 쓰고 Ctrl+C로 종료

# 느린 쿼리 로그 (기본 10ms 이상)
redis-cli slowlog get 10    # 최근 10개
redis-cli slowlog len       # 로그 수
redis-cli slowlog reset     # 리셋

# 설정 (redis.conf)
slowlog-log-slower-than 10000  # 10ms = 10000 microseconds
slowlog-max-len 128            # 최대 128개 저장

# 대용량 키 찾기 (서버 부하 주의)
redis-cli --bigkeys           # 타입별 가장 큰 키
redis-cli --bigkeys -i 0.1    # 0.1초 간격으로 (부하 줄이기)

# 특정 키 메모리 사용량
MEMORY USAGE user:123

# 자주 접근하는 키 (LFU 정책 설정 필요)
redis-cli --hotkeys

# 전체 상태 확인
redis-cli info all
redis-cli info stats          # 명령어 통계 (초당 OPS 등)
redis-cli info keyspace       # DB별 키 수
redis-cli info replication    # 복제 상태
```

---

## 자주 하는 실수

```bash
# 실수 1: Cluster에서 멀티키 명령어 사용
MGET user:1 user:2     # 다른 슬롯이면 CROSSSLOT Error
# 해결: Hash Tag 사용 또는 개별 GET으로 처리

# 실수 2: Sentinel을 1개만 구성
# 1개: 과반수 투표 불가 → Failover 안 됨
# 해결: 반드시 3개 이상 (홀수 권장)

# 실수 3: maxmemory 설정 없이 운영
# Redis가 계속 메모리를 먹으면서 서버 전체 메모리 고갈 → OOM Killer 발동!
# 해결: 항상 maxmemory 설정 + 적절한 eviction 정책

# 실수 4: Replica에서 쓰기 시도
# Cluster에서 Replica는 읽기 전용 (쓰기 시도 시 에러)
# 해결: 쓰기는 항상 Primary로 (Spring Data Redis가 자동 처리)

# 실수 5: 클러스터 Failover 후 캐시 키 분포 변경
# 노드가 추가/제거되면 슬롯 재분배 → 일부 캐시 MISS 증가
# → 정상적인 동작, 점차 캐시가 다시 채워짐
```
