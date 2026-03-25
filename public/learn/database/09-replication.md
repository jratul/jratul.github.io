---
title: "복제와 고가용성"
order: 9
---

## 복제(Replication)란 무엇인가?

복제는 하나의 DB(Primary)에 있는 데이터를 다른 DB(Replica)에 실시간으로 복사하는 것입니다.

**왜 필요한가?** 서버는 언제든 죽을 수 있습니다. DB가 한 대뿐이면 그 서버가 고장났을 때 서비스 전체가 멈춥니다. 또한 사용자가 늘어나면 DB가 감당하는 읽기 요청이 많아지는데, Replica로 읽기를 분산하면 부하를 줄일 수 있습니다.

**비유:** 서점(Primary DB)에서 책(데이터)을 판매하는데, 그 서점이 불타도 분점(Replica)에 같은 책 목록이 있어서 계속 운영할 수 있는 구조입니다.

---

## Primary-Replica 구조

```
Primary (쓰기/읽기 모두 가능)
    │  WAL(변경 로그) 스트리밍
    ↓
Replica 1 (읽기 전용)
Replica 2 (읽기 전용)

목적별 용도:
① 고가용성: Primary 장애 시 Replica를 Primary로 승격
② 읽기 분산: SELECT 쿼리를 Replica에서 처리 → Primary 부하 감소
③ 백업: Replica에서 백업 실행 → Primary 성능에 영향 없음
```

---

## 동기 복제 vs 비동기 복제

```
비동기 복제 (기본값):
Primary → 변경 사항을 Replica에 전송
         → Replica의 확인을 기다리지 않고 즉시 응답
→ 장점: 빠름 (Replica가 느려도 Primary 성능 영향 없음)
→ 단점: Primary 장애 시 마지막 몇 초의 데이터가 Replica에 없을 수 있음

동기 복제:
Primary → Replica가 데이터를 받았다고 확인할 때까지 기다린 후 응답
→ 장점: Primary와 Replica 데이터 항상 동일 보장 (RPO = 0)
→ 단점: Replica 응답 대기로 인한 레이턴시 증가
→ 용도: 금융 거래처럼 데이터 손실이 절대 허용 안 되는 경우
```

```sql
-- PostgreSQL 동기 복제 설정 (Primary의 postgresql.conf)
synchronous_commit = on                    -- 동기 복제 활성화
synchronous_standby_names = 'replica1'    -- 동기화할 Replica 이름
```

---

## PostgreSQL 스트리밍 복제 설정

```bash
# ── Primary 서버 설정 ─────────────────────────────────────────
# postgresql.conf
wal_level = replica         # WAL 로그 레벨 (복제에 필요한 정보 포함)
max_wal_senders = 5         # 최대 복제 연결 수 (Replica 수 + 여유분)
wal_keep_size = 1GB         # WAL 파일 보관 크기 (Replica가 뒤처졌을 때 필요)

# pg_hba.conf — Replica 서버의 접속 허용
host replication replicator 10.0.0.0/24 md5
# replicator: 복제 전용 계정, 10.0.0.0/24: Replica 서버의 IP 대역

# Primary에서 복제 계정 생성
CREATE USER replicator WITH REPLICATION PASSWORD 'repl_password';

# ── Replica 서버 초기화 ───────────────────────────────────────
# Primary로부터 베이스 백업 수행
pg_basebackup \
  -h primary_ip \           # Primary 서버 IP
  -U replicator \           # 복제 계정
  -D /var/lib/postgresql/data \  # 데이터 디렉토리
  -P -R                     # -P: 진행 상황 표시, -R: recovery.conf 자동 생성

# Replica postgresql.conf
primary_conninfo = 'host=primary_ip port=5432 user=replicator password=repl_password'
hot_standby = on            # Replica에서 SELECT 쿼리 허용
```

---

## 읽기/쓰기 분리 (Spring Boot 구현)

트랜잭션이 읽기 전용(readOnly = true)이면 Replica를 사용하고, 쓰기 트랜잭션이면 Primary를 사용합니다.

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
// 라우팅 데이터소스: 읽기 전용이면 Replica, 아니면 Primary 사용
public class RoutingDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        // @Transactional(readOnly = true) → REPLICA
        // @Transactional                  → PRIMARY
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
```

```java
// 서비스 레이어에서의 사용
@Service
public class UserService {

    // @Transactional(readOnly = true) → Replica에서 실행 (빠름)
    @Transactional(readOnly = true)
    public List<User> findAll() {
        return userRepository.findAll();
    }

    // @Transactional → Primary에서 실행 (쓰기)
    @Transactional
    public User create(CreateUserRequest req) {
        return userRepository.save(new User(req));
    }
}
```

---

## Failover — Primary 장애 시 자동 전환

```
Failover 흐름:

1. Primary 서버 장애 발생 (하드웨어 오류, 네트워크 단절 등)
2. 모니터링 도구가 heartbeat 실패 감지
3. Replica 중 가장 최신 데이터를 가진 것을 후보로 선출
4. 선출된 Replica를 Primary로 승격
5. VIP(가상 IP) 또는 DNS 변경 → 애플리케이션이 새 Primary로 자동 연결
6. 나머지 Replica들이 새 Primary를 팔로우

소요 시간:
- Patroni: 보통 30초~1분
- AWS RDS Multi-AZ: 1~2분
```

**자동 Failover 도구:**

```
1. Patroni (가장 많이 씀):
   - etcd, Consul, ZooKeeper로 분산 합의 (리더 선출)
   - Primary 장애 시 자동으로 Replica 중 하나를 Primary 승격
   - REST API로 클러스터 상태 관리

2. repmgr:
   - PostgreSQL 복제 관리 도구
   - 자동 Failover + 모니터링

3. AWS RDS Multi-AZ:
   - AWS 관리형 → 설정 없이 자동 Failover
   - DNS 자동 변경 (~1~2분)
   - 가장 간단한 방법 (단, 비용이 높음)
```

---

## PgBouncer — Connection Pooling

많은 애플리케이션 서버에서 동시에 DB에 연결하면 PostgreSQL이 감당하기 어렵습니다. PgBouncer가 연결을 중간에서 관리합니다.

**비유:** 레스토랑에 손님 100명이 각자 직접 주방에 들어가서 요리를 주문하면 혼란스럽죠. 웨이터(PgBouncer)가 주문을 받아서 주방(DB)에 전달하면 훨씬 효율적입니다.

```
문제 상황:
앱 서버 10대 × 스레드 50개 = DB 연결 500개
PostgreSQL은 연결당 프로세스 생성 → 메모리/CPU 낭비

PgBouncer 도입 후:
앱 서버 → PgBouncer → PostgreSQL
500개의 앱 연결 → 20개의 실제 DB 연결로 처리
```

```ini
# pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
# pool_mode 종류:
# session    → 세션 동안 연결 유지 (PostgreSQL과 동일)
# transaction → 트랜잭션 끝나면 연결 반환 (권장, 가장 효율적)
# statement   → 구문 실행 후 즉시 반환 (PreparedStatement 사용 불가)
pool_mode = transaction

max_client_conn = 1000     # 클라이언트(앱)와의 최대 연결 수
default_pool_size = 20     # 실제 DB 연결 풀 크기
min_pool_size = 5          # 최소 유지 연결 수
reserve_pool_size = 5      # 긴급 연결 예비
listen_port = 6432         # PgBouncer 포트 (앱은 이 포트로 연결)

# 통계 (모니터링용)
stats_users = pgbouncer
```

---

## AWS RDS 고가용성 옵션

```
RDS Multi-AZ:
  구조:   Primary RDS → 동기 복제 → Standby RDS (다른 가용 영역)
  장점:   Primary 장애 시 Standby 자동 승격 (~1~2분), DNS 자동 변경
  단점:   Standby는 읽기 불가 (대기 상태)
  비용:   2배

RDS Read Replica:
  구조:   Primary → 비동기 복제 → Read Replica(들)
  장점:   읽기 분산, 지역 간 복제 가능
  단점:   Primary 장애 시 자동 Failover 없음 (수동 승격 필요)

Aurora:
  구조:   6개 복사본을 3개 가용 영역에 자동 분산
  장점:   Failover ~30초, 최대 15개 Read Replica, 스토리지 자동 확장
  단점:   비용 높음, MySQL/PostgreSQL과 미묘한 차이 있음

권장 조합: Multi-AZ + Read Replica
  → Multi-AZ: 고가용성 (장애 복구)
  → Read Replica: 읽기 성능 (부하 분산)
```

---

## 복제 상태 모니터링

```sql
-- Primary에서 복제 지연 확인
SELECT
    client_addr,               -- Replica IP
    state,                     -- streaming: 정상 / catchup: 뒤처짐
    write_lag,                 -- Primary → Replica 쓰기 지연 시간
    flush_lag,                 -- flush 지연 시간
    replay_lag                 -- 실제 반영 지연 시간
FROM pg_stat_replication;

-- Replica에서 지연 확인
SELECT NOW() - pg_last_xact_replay_timestamp() AS replication_lag;
-- 결과가 수 초라면 정상, 분 단위라면 문제 확인 필요

-- 연결 수 모니터링 (PgBouncer 없이 직접 연결 시 중요)
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;
-- idle: 유휴, active: 쿼리 실행 중, idle in transaction: 트랜잭션 중 대기

SHOW max_connections;   -- 최대 허용 연결 수
```

---

## 초보자 흔히 하는 실수

**실수 1: 읽기/쓰기 분리 후 트랜잭션 안에서 쓰고 바로 읽기**
```java
// ❌ 트랜잭션 없이 쓰고 바로 Replica에서 읽으면 복제 지연으로 데이터 안 보임
@Transactional
public void createAndRead() {
    userRepository.save(new User("홍길동"));
    // Replica에서 읽으면 방금 저장한 데이터가 없을 수 있음!
    List<User> users = userRepository.findAll(); // readOnly 없으면 Primary에서 읽음
}

// ✅ 같은 트랜잭션 안에서는 Primary에서 읽힘 (일관성 보장)
@Transactional  // readOnly 없으면 Primary 사용
public void createAndRead() {
    userRepository.save(new User("홍길동"));
    List<User> users = userRepository.findAll(); // Primary에서 읽힘 → 방금 저장한 데이터 보임
}
```

**실수 2: PgBouncer transaction 모드에서 세션 레벨 설정 사용**
```sql
-- ❌ PgBouncer transaction 모드에서는 세션이 유지되지 않음
SET search_path TO myschema;   -- 다음 트랜잭션에서는 초기화될 수 있음!

-- ✅ 데이터베이스/사용자 기본값으로 설정하거나 application.properties에서 지정
ALTER ROLE myuser SET search_path TO myschema;
```
