---
title: "ElastiCache"
order: 6
---

# ElastiCache

ElastiCache는 **AWS가 관리해주는 Redis/Memcached 서비스**다. 인메모리 캐시 서버를 직접 EC2에 설치하고 관리하는 번거로움 없이, AWS가 패치, 백업, 모니터링, 장애 복구를 대신 해준다.

**ElastiCache = 관리 걱정 없는 Redis 서버**

```
언제 캐시가 필요한가?

DB 조회 시간: 10~100ms
Redis 조회 시간: 0.1~1ms

100배 차이!

캐시 적합한 데이터:
- 자주 조회하지만 거의 변하지 않는 데이터 (상품 목록, 카테고리)
- 계산 비용이 높은 결과 (통계, 랭킹)
- 사용자 세션 정보
- 인증 토큰
```

---

## Redis vs Memcached

ElastiCache는 Redis와 Memcached를 지원한다. 대부분의 경우 Redis를 선택한다.

```
ElastiCache for Redis:
장점:
  - String, Hash, List, Set, Sorted Set 등 다양한 자료구조
  - 데이터 영속성 (RDB 스냅샷, AOF 로그)
  - Primary + Replica 복제
  - 클러스터 모드 (샤딩으로 수평 확장)
  - Pub/Sub, Lua 스크립트, 트랜잭션
  - 분산 락 구현 가능
→ 거의 모든 경우에 Redis 선택

ElastiCache for Memcached:
장점:
  - 멀티스레드 (Redis는 단일 스레드)
  - 단순 캐싱에서 약간 더 빠를 수 있음

단점:
  - 단순 문자열만 저장 가능
  - 영속성 없음 (재시작 시 데이터 사라짐)
  - 복제 없음 (장애 시 데이터 손실)
→ 정말 단순한 캐싱만 필요하고 성능이 최우선일 때만
```

---

## 배포 모드 선택

```
Cluster 모드 OFF (비클러스터 모드, 권장 시작점):
- Primary 1개 + Replica 최대 5개
- 데이터 샤딩 없음 (모든 데이터가 한 Primary에)
- Failover: Primary 장애 시 Replica 자동 승격
- Spring Boot 설정 단순
- 일반적인 서비스에 충분

Cluster 모드 ON:
- Primary를 여러 개 두고 데이터를 자동 분산 (샤딩)
- 최대 500개 노드
- 데이터가 너무 많아 하나의 Redis에 안 들어갈 때
- 멀티키 명령어 제한 (주의 필요)
- 설정이 복잡함
- 대용량 데이터 또는 초고성능이 필요할 때
```

---

## ElastiCache Redis 생성

```bash
# 서브넷 그룹 생성 (VPC 내 DB 서브넷 지정)
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name my-redis-subnet \
  --cache-subnet-group-description "Redis 서브넷 그룹" \
  --subnet-ids subnet-private-2a subnet-private-2c

# Replication Group 생성 (Cluster 모드 OFF)
aws elasticache create-replication-group \
  --replication-group-id my-redis \
  --replication-group-description "서비스 Redis" \
  --cache-node-type cache.r7g.large \      # 인스턴스 타입
  --engine redis \
  --engine-version 7.2 \
  --num-cache-clusters 2 \                  # Primary 1 + Replica 1
  --cache-subnet-group-name my-redis-subnet \
  --security-group-ids sg-redis \
  --at-rest-encryption-enabled \            # 저장 암호화
  --transit-encryption-enabled \            # 전송 암호화 (TLS)
  --auth-token ${REDIS_AUTH_TOKEN} \        # 인증 토큰 (TLS 필요)
  --automatic-failover-enabled \            # 자동 장애 전환
  --multi-az-enabled                        # Multi-AZ

# 엔드포인트 확인 (생성 완료 후 5-10분)
aws elasticache describe-replication-groups \
  --replication-group-id my-redis \
  --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint'
```

---

## Spring Boot 연결 설정

```yaml
# application.yml — Cluster 모드 OFF (비클러스터)
spring:
  data:
    redis:
      host: ${REDIS_PRIMARY_ENDPOINT}    # ElastiCache Primary 엔드포인트
      port: 6379
      ssl:
        enabled: true                    # TLS 사용 (운영 필수)
      password: ${REDIS_AUTH_TOKEN}      # 인증 토큰
      lettuce:
        pool:
          max-active: 8                  # 최대 동시 연결 수
          max-idle: 8                    # 최대 유휴 연결 수
          min-idle: 0                    # 최소 유휴 연결 수
          max-wait: -1ms                 # 연결 대기 시간 (-1: 무한)
      timeout: 2000ms                   # 명령 타임아웃
```

```yaml
# Cluster 모드 ON 설정
spring:
  data:
    redis:
      cluster:
        nodes:
          - my-redis.xxx.cache.amazonaws.com:6379
        max-redirects: 3               # MOVED 리다이렉트 최대 횟수
      ssl:
        enabled: true
      password: ${REDIS_AUTH_TOKEN}
```

```java
// Redis 설정 클래스
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        // Key는 String으로 저장
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());

        // Value는 JSON으로 저장 (타입 정보 포함)
        GenericJackson2JsonRedisSerializer jsonSerializer =
            new GenericJackson2JsonRedisSerializer();
        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);

        template.afterPropertiesSet();
        return template;
    }
}
```

---

## 보안 설정

```
VPC 내 배포 (필수):
- ElastiCache는 퍼블릭 접근 불가 (인터넷 연결 없음)
- 프라이빗 서브넷에 배치
- 보안 그룹으로 앱 서버에서만 접근 허용

보안 그룹 설정:
sg-redis:
  인바운드: 포트 6379, 소스: sg-app (앱 서버 보안 그룹)

전송 암호화 (TLS):
- --transit-encryption-enabled
- 네트워크 도청 방지

저장 암호화:
- --at-rest-encryption-enabled
- 디스크에 저장된 데이터 암호화

인증 토큰 (AUTH):
- --auth-token으로 설정
- TLS 활성화 시 사용 가능
- 비밀번호처럼 클라이언트가 토큰 제공해야 연결 가능
```

---

## 자동 Failover 동작

```
Failover 시나리오:

정상 상태:
앱 서버 → Primary Redis (2a)
             ↓ 복제
          Replica Redis (2c)

Primary 장애 발생:
1. ElastiCache가 Primary 응답 없음 감지 (수 초)
2. Replica를 Primary로 자동 승격
3. Primary 엔드포인트 DNS가 새 Primary를 가리킴
4. 앱 서버의 Lettuce(기본 클라이언트)가 자동 재연결
5. 전체 과정 수십 초 ~ 1분

Lettuce vs Jedis:
Lettuce (Spring Boot 기본):
- 자동 재연결 기본 지원
- 비동기/반응형 지원
- Failover 후 몇 초 내 자동 복구

Jedis:
- 동기 방식
- 연결 오류 시 직접 재연결 로직 구현 필요
→ Spring Boot에서는 Lettuce 사용 권장
```

---

## 백업 및 복원

```bash
# 수동 스냅샷 생성
aws elasticache create-snapshot \
  --replication-group-id my-redis \
  --snapshot-name my-redis-backup-20240106

# 자동 백업 설정
aws elasticache modify-replication-group \
  --replication-group-id my-redis \
  --snapshot-retention-limit 7 \            # 7일 보관
  --snapshot-window "03:00-04:00" \          # 새벽 3-4시 백업 (KST 기준 +9)
  --apply-immediately

# 스냅샷에서 복원 (새 클러스터로)
aws elasticache create-replication-group \
  --replication-group-id my-redis-restored \
  --replication-group-description "복원된 Redis" \
  --snapshot-name my-redis-backup-20240106 \
  ... (나머지 설정)
```

---

## 모니터링 — 이 지표를 봐야 한다

```
CloudWatch 핵심 지표:

CurrConnections:
- 현재 연결 수
- 급격히 증가하면 연결 누수 의심

Evictions:
- Eviction 발생 수 (메모리 꽉 차서 데이터 삭제)
- 0이어야 정상
- 0보다 크면: 메모리 부족 → 인스턴스 업그레이드 필요

CacheHits / CacheMisses:
- 히트율 = CacheHits / (CacheHits + CacheMisses)
- 90% 이상이 좋음
- 미스가 많으면: TTL 전략 검토, 캐싱 로직 확인

BytesUsedForCache:
- 실제 데이터 메모리 사용량
- 최대 메모리의 80% 넘으면 주의

EngineCPUUtilization:
- Redis 엔진 CPU 사용률
- 90% 이상이면 위험
- 대용량 명령어(KEYS, SMEMBERS 전체 조회 등) 주의

ReplicationLag:
- Primary → Replica 복제 지연 시간
- 10초 이상이면 이상
```

```bash
# 알림 설정 예시 (Eviction 발생 시 즉시 알림)
aws cloudwatch put-metric-alarm \
  --alarm-name "redis-evictions" \
  --metric-name Evictions \
  --namespace AWS/ElastiCache \
  --statistic Sum \
  --period 300 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ReplicationGroupId,Value=my-redis \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:...:alerts
```

---

## 비용 최적화

```
인스턴스 타입 가이드:
cache.t4g.micro   → 0.5GB RAM, 개발용 ($0.017/시간)
cache.t4g.small   → 1.4GB RAM, 소규모 개발
cache.r7g.large   → 13GB RAM, 소규모 운영 (~$0.20/시간)
cache.r7g.xlarge  → 26GB RAM, 중규모 운영
cache.r7g.4xlarge → 105GB RAM, 대규모

비용 절감:
1. Reserved Node: 1년 약정 35% 할인, 3년 55% 할인
2. 적절한 인스턴스 타입: Eviction 없는 선에서 최소 크기
3. cache.r7g (Graviton): Intel 대비 20% 저렴
4. 개발 환경: cache.t4g.micro 사용 (월 약 $12)
5. Cluster 모드: 필요할 때만 (설정 복잡도 증가)
```

---

## 자주 하는 실수

```
1. 메모리 꽉 참 (Eviction 발생)
   - 캐시 서버는 maxmemory 설정 필수
   - Eviction 알림 설정 후 모니터링
   - allkeys-lru 정책 설정 권장

2. ElastiCache를 세션 저장소로 쓰면서 noeviction 미설정
   - 세션은 절대 삭제되면 안 됨
   - noeviction 또는 volatile-lru (TTL 있는 것만 삭제)

3. 개발 환경에서 TLS 없이 비밀번호 없이 사용
   - VPC 내부이더라도 운영과 동일한 보안 설정 연습 필요

4. 키 네임스페이스 관리 안 함
   - 팀원들이 각자 다른 패턴으로 키 생성
   - 규칙: {서비스}:{엔티티}:{id} 패턴 통일

5. 대용량 키 (Big Key) 생성
   - Hash, List가 수백만 개 필드이면 성능 저하
   - 단일 Redis 명령이 오래 걸려 전체 응답 지연
   - 키 분할 설계 필요
```
