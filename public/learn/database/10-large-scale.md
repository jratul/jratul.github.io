---
title: "대용량 데이터 처리"
order: 10
---

# 대용량 데이터 처리

수억 건 이상의 데이터를 다루는 기법.

---

## 언제 고민해야 하나

```
기준 (대략적):
— 단일 테이블 1억 건 이상 → 파티셔닝 검토
— 단일 서버 한계 도달 → 샤딩 검토
— 읽기 부하 증가 → Read Replica, 캐싱
— 쓰기 부하 증가 → 샤딩, CQRS

먼저 시도할 것:
1. 인덱스 최적화
2. 쿼리 최적화
3. 캐싱 추가
4. Read Replica
5. 파티셔닝
→ 그래도 안 되면 샤딩
```

---

## 파티셔닝 전략

```sql
-- 1. 범위 파티셔닝 (날짜, ID 범위)
CREATE TABLE events (
    id          BIGSERIAL,
    user_id     BIGINT,
    action      VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

-- 자동 파티션 생성 스크립트 (pg_partman 확장 또는 수동)
DO $$
DECLARE
    partition_date DATE := '2024-01-01';
BEGIN
    WHILE partition_date < '2025-01-01' LOOP
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS events_%s PARTITION OF events
             FOR VALUES FROM (%L) TO (%L)',
            TO_CHAR(partition_date, 'YYYY_MM'),
            partition_date,
            partition_date + INTERVAL '1 month'
        );
        partition_date := partition_date + INTERVAL '1 month';
    END LOOP;
END $$;

-- 2. 해시 파티셔닝 (균등 분산)
CREATE TABLE users (
    id          BIGSERIAL,
    email       VARCHAR(255),
    name        VARCHAR(100)
) PARTITION BY HASH (id);

CREATE TABLE users_0 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE users_1 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE users_2 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE users_3 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- 3. 목록 파티셔닝 (지역, 상태 등)
CREATE TABLE orders (
    id          BIGSERIAL,
    region      VARCHAR(10),
    amount      NUMERIC
) PARTITION BY LIST (region);

CREATE TABLE orders_kr PARTITION OF orders FOR VALUES IN ('KR');
CREATE TABLE orders_us PARTITION OF orders FOR VALUES IN ('US');
CREATE TABLE orders_eu PARTITION OF orders FOR VALUES IN ('EU');
```

---

## 샤딩 (Sharding)

```
수직 분할 (Vertical Partitioning):
— 테이블을 컬럼 단위로 분리
— 자주 사용하는 컬럼 / 덜 사용하는 컬럼 분리
— 예: users + user_profiles (큰 bio, 설정 등)

수평 분할 (Horizontal Partitioning = Sharding):
— 데이터를 여러 DB 서버에 분산
— 같은 스키마, 다른 데이터

샤딩 키 선택:
— user_id: 사용자별 데이터 분산 (가장 일반적)
— 지역: 지역별 데이터 분산 (규제 준수에 유리)
— 날짜: 시계열 데이터

문제점:
— Cross-shard JOIN 불가
— 트랜잭션 복잡 (분산 트랜잭션)
— 리밸런싱 어려움
— 애플리케이션 레이어 복잡도 증가
```

```java
// 애플리케이션 레벨 샤딩 (간단 예시)
@Component
public class ShardRouter {

    private static final int SHARD_COUNT = 4;

    private final List<DataSource> shards;

    public DataSource getShardForUser(Long userId) {
        int shardIndex = (int) (userId % SHARD_COUNT);
        return shards.get(shardIndex);
    }
}

// 실제로는 Vitess, Citus, Pgpool-II 같은 도구 사용 권장
```

---

## 대용량 삽입

```sql
-- COPY (가장 빠름)
COPY orders (user_id, amount, status) FROM '/tmp/orders.csv' CSV HEADER;
COPY orders (user_id, amount, status) TO '/tmp/orders_backup.csv' CSV HEADER;

-- psql로 실행
\COPY orders FROM 'orders.csv' CSV HEADER;

-- 멀티 행 삽입 (단건보다 훨씬 빠름)
INSERT INTO orders (user_id, amount, status)
VALUES
    (1, 10000, 'COMPLETED'),
    (2, 20000, 'COMPLETED'),
    (3, 30000, 'PENDING'),
    ...;  -- 한 번에 수천 행

-- 인덱스 비활성화 후 삽입 (초대량)
-- 운영 환경에서는 주의!
ALTER TABLE orders DISABLE TRIGGER ALL;
-- 삽입 ...
ALTER TABLE orders ENABLE TRIGGER ALL;
REINDEX TABLE orders;
ANALYZE orders;
```

```java
// JPA 배치 삽입
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 500         # 500건씩 배치
        order_inserts: true
        order_updates: true

// Spring Batch
@Bean
public Step importStep() {
    return stepBuilder.get("importStep")
        .<OrderDto, Order>chunk(1000)  // 1000건씩 처리
        .reader(csvReader())
        .processor(orderProcessor())
        .writer(jpaWriter())
        .build();
}
```

---

## 대용량 조회 — 스트리밍

```java
// JPA Scroll (Spring Data JPA 3.1+)
@Query("SELECT o FROM Order o WHERE o.status = :status")
ScrolledPage<Order> findByStatus(
    @Param("status") String status,
    ScrollPosition position,
    Pageable pageable
);

// Stream (주의: 트랜잭션 안에서 처리 필요)
@Transactional(readOnly = true)
public void processAllOrders() {
    try (Stream<Order> stream = orderRepository.streamAll()) {
        stream.forEach(order -> {
            // 처리
        });
    }
}

@Query("SELECT o FROM Order o")
Stream<Order> streamAll();
```

```java
// JdbcTemplate 커서 기반 스트리밍
jdbcTemplate.query(
    "SELECT * FROM large_table",
    rs -> {
        while (rs.next()) {
            process(rs);
        }
    }
);
```

---

## 실무 — 대용량 집계

```sql
-- 실시간 집계 (대용량 → 느림)
SELECT DATE(created_at), COUNT(*), SUM(amount)
FROM orders
WHERE created_at >= '2024-01-01'
GROUP BY DATE(created_at);

-- 해결책 1: 마테리얼라이즈드 뷰
CREATE MATERIALIZED VIEW daily_order_stats AS
SELECT
    DATE(created_at) AS date,
    COUNT(*) AS order_count,
    SUM(amount) AS total_amount
FROM orders
GROUP BY DATE(created_at);

CREATE UNIQUE INDEX ON daily_order_stats(date);

-- 주기적 갱신
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_order_stats;

-- 해결책 2: 집계 테이블 (실시간 업데이트)
CREATE TABLE daily_stats (
    date        DATE PRIMARY KEY,
    order_count INTEGER NOT NULL DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0
);

-- 주문 생성 시 업데이트
INSERT INTO daily_stats (date, order_count, total_amount)
VALUES (CURRENT_DATE, 1, $amount)
ON CONFLICT (date) DO UPDATE SET
    order_count = daily_stats.order_count + 1,
    total_amount = daily_stats.total_amount + EXCLUDED.total_amount;

-- 해결책 3: 별도 분석 DB (OLAP)
-- PostgreSQL → Redshift, BigQuery, ClickHouse로 ETL
-- 실시간성 vs 성능 트레이드오프
```

---

## TimescaleDB — 시계열 데이터

```sql
-- TimescaleDB: PostgreSQL 확장 (시계열 특화)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 하이퍼테이블 생성 (자동 파티셔닝)
SELECT create_hypertable('metrics', 'time');

-- 데이터 보존 정책 (자동 삭제)
SELECT add_retention_policy('metrics', INTERVAL '90 days');

-- 연속 집계 (Continuous Aggregate)
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS hour,
    device_id,
    AVG(value) AS avg_value,
    MAX(value) AS max_value
FROM metrics
GROUP BY hour, device_id;
```
