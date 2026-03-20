---
title: "복제와 고가용성"
order: 9
---

# 복제와 고가용성

DB 장애에도 서비스가 계속되도록 하는 아키텍처.

---

## 복제 (Replication) 기본

```
Primary-Replica 구조:
Primary (Master)  ← 쓰기/읽기
Replica (Slave)   ← 읽기 전용 (Primary에서 복제)

목적:
1. 고가용성: Primary 장애 시 Replica 승격
2. 읽기 분산: 읽기 요청을 Replica로 분산 → 부하 감소
3. 백업: Replica에서 백업 실행 (Primary 부하 없음)
```

---

## 동기 복제 vs 비동기 복제

```
비동기 복제 (기본):
Primary → Replica에 데이터 전송
Primary가 Replica 확인 안 기다림
→ Replica 장애 시 데이터 손실 가능 (RPO > 0)
→ 성능 좋음

동기 복제:
Primary → Replica 확인 기다림
→ Replica와 동일 데이터 보장 (RPO = 0)
→ 레이턴시 증가 (Replica 응답 대기)
→ 중요 데이터에 사용
```

```sql
-- PostgreSQL 동기 복제 설정
-- primary postgresql.conf:
synchronous_commit = on
synchronous_standby_names = 'replica1'  -- 동기 복제할 Replica 이름
```

---

## PostgreSQL 스트리밍 복제 설정

```bash
# Primary 서버 설정 (postgresql.conf)
wal_level = replica             # WAL 레벨
max_wal_senders = 5             # 최대 복제 연결 수
wal_keep_size = 1GB             # WAL 보관 크기

# Primary pg_hba.conf
host replication replicator 10.0.0.0/24 md5

# Replica 서버 초기화
pg_basebackup -h primary_ip -U replicator -D /var/lib/postgresql/data -P -R
# -R: recovery.conf 자동 생성

# Replica postgresql.conf
primary_conninfo = 'host=primary_ip port=5432 user=replicator'
hot_standby = on                # 읽기 쿼리 허용
```

---

## 읽기/쓰기 분리 (Spring Boot)

```yaml
# application.yml
spring:
  datasource:
    primary:
      url: jdbc:postgresql://primary:5432/mydb
      username: ${DB_USER}
      password: ${DB_PASSWORD}
    replica:
      url: jdbc:postgresql://replica:5432/mydb
      username: ${DB_USER}
      password: ${DB_PASSWORD}
```

```java
// 라우팅 데이터소스
public class RoutingDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        return TransactionSynchronizationManager.isCurrentTransactionReadOnly()
            ? "REPLICA"
            : "PRIMARY";
    }
}

@Configuration
public class DataSourceConfig {

    @Bean
    public DataSource dataSource() {
        RoutingDataSource routing = new RoutingDataSource();
        routing.setTargetDataSources(Map.of(
            "PRIMARY", primaryDataSource(),
            "REPLICA", replicaDataSource()
        ));
        routing.setDefaultTargetDataSource(primaryDataSource());
        return routing;
    }
}

// 서비스 레이어
@Transactional(readOnly = true)  // → Replica 사용
public List<User> findAll() { ... }

@Transactional  // → Primary 사용
public User create(CreateUserRequest req) { ... }
```

---

## Failover (장애 전환)

```
자동 Failover 도구:

1. Patroni (가장 많이 씀):
   — etcd/Consul/ZooKeeper로 리더 선출
   — Primary 장애 시 자동으로 Replica 중 하나를 Primary 승격
   — REST API로 관리

2. repmgr:
   — PostgreSQL 복제 관리 도구
   — 자동 Failover 지원

3. AWS RDS Multi-AZ:
   — AWS 관리형 자동 Failover
   — DNS 자동 변경 (~1분)
   — 가장 간단한 방법
```

```
Failover 흐름:
1. Primary 장애 감지 (heartbeat 실패)
2. Replica 중 최신 데이터 가진 것 선출 (Primary 후보)
3. 선출된 Replica → Primary 승격
4. DNS/VIP 변경 → 애플리케이션이 새 Primary로 연결
5. 나머지 Replica가 새 Primary를 팔로우
```

---

## Connection Pooling (PgBouncer)

```
문제:
PostgreSQL은 연결당 프로세스/스레드 생성
→ 연결 수가 많으면 메모리/CPU 낭비
→ 앱 서버 수 × 스레드 수 = 수천 연결 가능

PgBouncer:
애플리케이션 → PgBouncer → PostgreSQL
→ 실제 DB 연결 수 줄임 (Connection Pool)
→ 100개 연결을 10개로 처리
```

```ini
# pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
pool_mode = transaction    # 트랜잭션 단위 풀링 (가장 효율적)
# session    — 세션 유지 (pgbouncer 덜 유리)
# transaction — 트랜잭션 끝나면 반환 (권장)
# statement  — 구문 실행 후 반환 (PreparedStatement 불가)

max_client_conn = 1000     # 최대 클라이언트 연결
default_pool_size = 20     # DB 연결 풀 크기
min_pool_size = 5
listen_port = 6432
```

---

## AWS RDS 고가용성

```
RDS Multi-AZ:
Primary RDS → 동기 복제 → Standby RDS (다른 AZ)
— Primary 장애 시 Standby 자동 승격 (~1~2분)
— DNS 자동 변경 (애플리케이션 재연결)
— 읽기는 Primary만 (Standby는 대기 상태)

RDS Read Replica:
— 읽기 전용 Replica (비동기 복제)
— 읽기 분산용
— Multi-AZ + Read Replica 조합 권장

Aurora:
— MySQL/PostgreSQL 호환
— 6개 복사본 3 AZ에 자동 분산
— Failover ~30초
— 최대 15개 Read Replica
— 스토리지 자동 확장
```

---

## 모니터링

```sql
-- 복제 지연 확인 (Primary에서)
SELECT
    client_addr,
    state,
    sent_lsn - write_lsn AS write_lag_bytes,
    sent_lsn - flush_lsn AS flush_lag_bytes,
    sent_lsn - replay_lsn AS replay_lag_bytes,
    write_lag,
    flush_lag,
    replay_lag
FROM pg_stat_replication;

-- Replica에서 지연 확인
SELECT NOW() - pg_last_xact_replay_timestamp() AS replication_lag;

-- 연결 수 모니터링
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
SELECT count(*) FROM pg_stat_activity;
SHOW max_connections;
```
