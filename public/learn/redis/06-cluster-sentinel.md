---
title: "Redis 클러스터와 Sentinel"
order: 6
---

# Redis 클러스터와 Sentinel

단일 Redis의 한계를 넘어 고가용성과 수평 확장을 달성하는 방법.

---

## 단일 Redis의 한계

```
— 단일 장애점 (SPOF)
— 메모리 한계 (한 서버 용량 한계)
— 읽기 부하 분산 안 됨

해결책:
Sentinel  → 고가용성 (HA), 단일 Primary
Cluster   → 고가용성 + 수평 확장 (샤딩)
```

---

## Redis Sentinel

Primary 장애 감지 및 자동 Failover.

```
구성:
Primary (1개)
Replica (1개+)
Sentinel (3개+)   → 과반수 투표로 Failover 결정

동작:
1. Sentinel들이 Primary를 지속적으로 모니터링
2. Primary 응답 없음 감지 (주관적 다운)
3. 다른 Sentinel들에게 확인 (객관적 다운)
4. 과반수 이상 동의 시 Failover 시작
5. Replica 중 하나를 Primary 승격
6. 나머지 Replica가 새 Primary를 팔로우
7. 애플리케이션에 새 Primary 주소 알림
```

```bash
# sentinel.conf
sentinel monitor mymaster 127.0.0.1 6379 2  # 2개 이상 동의 필요
sentinel down-after-milliseconds mymaster 5000  # 5초 응답 없으면 장애
sentinel failover-timeout mymaster 60000       # Failover 제한 시간
sentinel parallel-syncs mymaster 1            # 동시 복제 수
```

```yaml
# Spring Boot Sentinel 연결
spring:
  data:
    redis:
      sentinel:
        master: mymaster
        nodes:
          - sentinel1:26379
          - sentinel2:26379
          - sentinel3:26379
        password: ${SENTINEL_PASSWORD}
      password: ${REDIS_PASSWORD}
```

---

## Redis Cluster

데이터를 여러 노드에 자동 분산.

```
구성:
— 최소 3개 Primary 노드 (각각 Replica 권장)
— 데이터를 16384개 슬롯으로 분할
— 키 기반으로 슬롯 결정: hash(key) % 16384

슬롯 분배 예 (노드 3개):
Node 1: 슬롯 0 ~ 5460
Node 2: 슬롯 5461 ~ 10922
Node 3: 슬롯 10923 ~ 16383

키 조회:
CRC16("user:123") % 16384 = 5200 → Node 1으로 라우팅

한계:
— 멀티키 명령어 제한 (같은 슬롯이어야 함)
  MGET user:1 user:2 → 다른 슬롯이면 에러
  해결: Hash Tag {user}:1, {user}:2 → 같은 슬롯 강제
— Lua 스크립트도 같은 슬롯만
— SCAN 등은 각 노드별로 실행
```

```bash
# 클러스터 생성 (로컬 테스트)
redis-cli --cluster create \
  127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 \
  127.0.0.1:7004 127.0.0.1:7005 127.0.0.1:7006 \
  --cluster-replicas 1

# 클러스터 상태 확인
redis-cli --cluster check 127.0.0.1:7001
redis-cli -c -p 7001 cluster nodes  # 노드 목록
redis-cli -c -p 7001 cluster info   # 클러스터 정보
```

```yaml
# Spring Boot Cluster 연결
spring:
  data:
    redis:
      cluster:
        nodes:
          - redis1:6379
          - redis2:6379
          - redis3:6379
        max-redirects: 3    # 리다이렉트 최대 횟수
```

---

## Hash Tag

```bash
# 같은 슬롯에 넣기 ({}안의 내용으로 슬롯 결정)
SET {user:123}:profile "..."
SET {user:123}:sessions "..."
MGET {user:123}:profile {user:123}:sessions  # 같은 슬롯 → OK

# 주의: 너무 많은 키가 같은 슬롯으로 몰리면 핫스팟
# {user}:123, {user}:456 → 모두 {user}로 같은 슬롯 → 위험
# 적절한 Hash Tag 설계 중요
```

---

## AWS ElastiCache

```
ElastiCache for Redis:
— AWS 관리형 Redis
— Redis Cluster 모드 지원
— 자동 Failover
— Multi-AZ 배포
— 보안 그룹으로 접근 제어

Cluster 모드 OFF:
— Primary + Replica 구성 (Sentinel 유사)
— 최대 5개 Read Replica
— 데이터 샤딩 없음

Cluster 모드 ON:
— 최대 500개 노드
— 자동 샤딩
— 멀티키 제한 있음
```

---

## 메모리 관리

```bash
# 메모리 사용량 확인
redis-cli info memory

# 주요 지표:
# used_memory: 실제 사용 중인 메모리
# used_memory_rss: OS가 Redis에 할당한 메모리
# mem_fragmentation_ratio: 단편화 비율 (1.5 이상이면 비효율)
# maxmemory: 설정된 최대 메모리

# 메모리 설정
maxmemory 2gb
maxmemory-policy allkeys-lru  # 메모리 꽉 찼을 때 정책
```

```
Eviction 정책:
noeviction     — 꽉 차면 에러 (기본)
allkeys-lru    — 전체 키 중 LRU
allkeys-lfu    — 전체 키 중 LFU (자주 사용된 것 우선 유지)
volatile-lru   — TTL 있는 키 중 LRU
volatile-ttl   — TTL 적은 키 먼저 삭제
allkeys-random — 무작위 삭제

캐시 서버: allkeys-lru 권장
세션 서버: noeviction 또는 volatile-lru
```

---

## 영속성 설정

```bash
# RDB (스냅샷)
save 900 1      # 900초(15분) 내 1번 이상 변경 시 저장
save 300 10     # 300초 내 10번 이상
save 60 10000   # 60초 내 10000번 이상

# AOF (Append Only File) — 더 안전
appendonly yes
appendfsync everysec  # 1초마다 fsync (성능 vs 안전성 균형)
# appendfsync always  # 매 명령마다 (가장 안전, 느림)
# appendfsync no      # OS에 맡김 (빠름, 데이터 손실 가능)

# 캐시 전용이면 영속성 끄기 (성능 향상)
save ""
appendonly no
```

---

## 모니터링

```bash
# 실시간 명령어 모니터링 (운영에서는 주의!)
redis-cli monitor

# 느린 쿼리 로그
redis-cli slowlog get 10
redis-cli slowlog len
redis-cli slowlog reset

# 메모리 분석
redis-cli --bigkeys      # 큰 키 찾기
redis-cli --memkeys      # 메모리 많이 쓰는 키
redis-cli --hotkeys      # 자주 접근하는 키 (LFU 정책 필요)

# Info 확인
redis-cli info all
redis-cli info stats      # 명령어 통계
redis-cli info keyspace   # DB별 키 수
redis-cli info replication # 복제 정보
```
