---
title: "ElastiCache"
order: 6
---

# ElastiCache

AWS 관리형 Redis/Memcached. 패치, 백업, 모니터링을 AWS가 관리.

---

## Redis vs Memcached

```
ElastiCache for Redis:
✅ 다양한 자료구조 (String, Hash, List, Set, ZSet)
✅ 영속성 (RDB, AOF)
✅ 복제 (Primary + Replica)
✅ 클러스터 모드 (샤딩)
✅ Pub/Sub, Lua 스크립트
✅ 트랜잭션 (MULTI/EXEC)
→ 대부분의 경우 Redis 선택

ElastiCache for Memcached:
✅ 단순 캐싱에서 약간 빠름
✅ 멀티스레드 (Redis는 단일 스레드)
❌ 단순 문자열만
❌ 영속성 없음
❌ 복제 없음
→ 단순 캐싱만 필요하고 성능 극대화 시
```

---

## 배포 모드

```
Cluster 모드 OFF (권장 - 단순):
— 단일 Primary + 최대 5개 Replica
— 데이터 샤딩 없음
— Failover: Primary 장애 시 Replica 승격
— Spring Boot 설정 간단

Cluster 모드 ON:
— 최대 500개 노드
— 16384 슬롯 자동 분배
— 멀티키 명령어 제한
— 대용량 데이터, 높은 처리량 필요 시
```

---

## 생성

```bash
# 서브넷 그룹 생성 (VPC 내 서브넷 지정)
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name my-redis-subnet \
  --cache-subnet-group-description "Redis subnet group" \
  --subnet-ids subnet-xxx subnet-yyy

# Replication Group 생성 (Cluster 모드 OFF)
aws elasticache create-replication-group \
  --replication-group-id my-redis \
  --replication-group-description "My Redis" \
  --cache-node-type cache.r7g.large \
  --engine redis \
  --engine-version 7.2 \
  --num-cache-clusters 2 \  # Primary 1 + Replica 1
  --cache-subnet-group-name my-redis-subnet \
  --security-group-ids sg-xxx \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token ${REDIS_AUTH_TOKEN} \  # 인증 토큰 (TLS 필요)
  --automatic-failover-enabled \
  --multi-az-enabled

# 연결 정보 확인
aws elasticache describe-replication-groups \
  --replication-group-id my-redis \
  --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint'
```

---

## Spring Boot 연결

```yaml
# application.yml — Cluster 모드 OFF
spring:
  data:
    redis:
      host: ${REDIS_PRIMARY_ENDPOINT}
      port: 6379
      ssl:
        enabled: true
      password: ${REDIS_AUTH_TOKEN}
      lettuce:
        pool:
          max-active: 8
          max-idle: 8
          min-idle: 0

# Cluster 모드 ON
spring:
  data:
    redis:
      cluster:
        nodes:
          - redis-cluster.xxx.cache.amazonaws.com:6379
        max-redirects: 3
      ssl:
        enabled: true
      password: ${REDIS_AUTH_TOKEN}
```

---

## 보안 설정

```
VPC 내 배포 (필수):
— 퍼블릭 접근 불가
— 보안 그룹으로 접근 제어

전송 중 암호화 (Transit Encryption, TLS):
— in-transit 데이터 암호화
— 클라이언트가 TLS 지원해야 함
— --transit-encryption-enabled

저장 중 암호화 (At-Rest Encryption):
— Redis 데이터 암호화
— --at-rest-encryption-enabled

인증 토큰 (AUTH):
— Redis AUTH 명령어
— TLS 활성화 시 사용 가능
— --auth-token

보안 그룹:
인바운드: 포트 6379, from 앱 서버 보안 그룹
```

---

## 자동 Failover

```
동작:
1. ElastiCache가 Primary 상태 지속 모니터링
2. Primary 응답 없음 (수초 ~ 1분)
3. Replica 중 하나를 Primary로 자동 승격
4. DNS 업데이트 (Primary Endpoint는 동일, 내부 IP 변경)
5. 애플리케이션 재연결 시 새 Primary에 연결

Lettuce (Spring 기본):
— 자동 재연결 지원
— Failover 후 몇 초 내 자동 복구

Jedis:
— 재연결 로직 직접 구현 필요
```

---

## 백업과 복원

```bash
# 수동 스냅샷
aws elasticache create-snapshot \
  --replication-group-id my-redis \
  --snapshot-name my-redis-backup

# 자동 백업 설정
aws elasticache modify-replication-group \
  --replication-group-id my-redis \
  --snapshot-retention-limit 7 \  # 7일 보관
  --snapshot-window 03:00-04:00   # 백업 시간 (UTC)

# 스냅샷에서 복원
aws elasticache create-replication-group \
  --replication-group-id my-redis-restored \
  --snapshot-name my-redis-backup \
  ...
```

---

## 모니터링

```
CloudWatch 주요 지표:

CurrConnections       — 현재 연결 수
Evictions             — Eviction 발생 수 (메모리 부족 신호)
CacheHits / CacheMisses — 캐시 히트율
BytesUsedForCache     — 메모리 사용량
EngineCPUUtilization  — CPU 사용률 (90%+ 위험)
NetworkBytesIn/Out    — 네트워크 처리량
ReplicationLag        — Primary-Replica 복제 지연

알림 설정:
Evictions > 0         — 메모리 부족 → 인스턴스 업그레이드
CacheHitRate < 0.9    — 캐시 미스 많음 → 캐싱 전략 검토
EngineCPUUtilization > 80 — CPU 부족 → 업그레이드
```

---

## 비용 최적화

```
개발 환경:
— cache.t4g.micro ($0.017/시간)
— Replica 없음

운영 환경:
— Reserved Node (1년 35% 할인, 3년 55% 할인)
— 적절한 인스턴스 타입 선택
— cache.r7g 시리즈 (메모리 최적화, Graviton)

인스턴스 타입 선택:
cache.t4g.micro   — 0.5GB, 개발
cache.t4g.small   — 1.37GB
cache.r7g.large   — 13.07GB, 소규모 운영
cache.r7g.xlarge  — 26.32GB, 중규모
cache.r7g.4xlarge — 105.81GB, 대규모
```
