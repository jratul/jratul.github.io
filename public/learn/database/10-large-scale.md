---
title: "대용량 데이터 처리"
order: 10
---

# 대용량 데이터 처리

수억 건 이상의 데이터를 다루는 기법. 처음부터 모든 기술을 적용할 필요는 없습니다. 문제가 생겼을 때 단계별로 접근하는 것이 핵심입니다.

---

## 언제 고민해야 하나 — 단계별 접근

대부분의 성능 문제는 샤딩 같은 복잡한 기술 없이도 해결됩니다. 비싼 해결책 전에 싼 해결책부터 시도하는 순서가 중요합니다.

```
단계별 확인 기준:

1단계: 인덱스 최적화
  - EXPLAIN ANALYZE로 쿼리 실행 계획 확인
  - Sequential Scan → Index Scan으로 바꾸기

2단계: 쿼리 최적화
  - N+1 문제 해결
  - 불필요한 JOIN 제거
  - SELECT *를 필요한 컬럼만으로 변경

3단계: 캐싱 추가
  - Redis로 자주 읽는 데이터 캐싱
  - 응답 시간 10배 이상 개선 가능

4단계: Read Replica
  - 읽기 부하가 쓰기 부하보다 훨씬 많을 때
  - 읽기 전용 복제 서버 추가

5단계: 파티셔닝
  - 단일 테이블 1억 건 이상 → 파티셔닝 검토
  - 같은 DB 서버 내에서 테이블을 물리적으로 분할

6단계: 샤딩
  - 단일 서버 한계 도달 → 여러 DB 서버로 분산
  - 가장 복잡하고 리스크가 높은 방법
  - 정말 불가피할 때만 선택
```

---

## 파티셔닝 전략 — 하나의 테이블을 여러 조각으로

파티셔닝은 하나의 거대한 테이블을 내부적으로 여러 개의 작은 테이블(파티션)로 나누는 기술입니다. 쿼리할 때 관련 파티션만 스캔하므로 성능이 향상됩니다.

도서관에 비유하면, 모든 책을 한 곳에 쌓아두는 대신 날짜별, 주제별로 구역을 나눠 보관하는 것입니다.

### 1. 범위 파티셔닝 — 날짜나 ID 범위로 분할

시계열 데이터(로그, 이벤트, 주문 이력)에 가장 적합합니다.

```sql
-- 이벤트 테이블: 날짜별 파티셔닝
CREATE TABLE events (
    id          BIGSERIAL,
    user_id     BIGINT,
    action      VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);   -- created_at 기준 범위 분할

-- 파티션 자동 생성 스크립트 (2024년 한 해 동안 월별 파티션)
DO $$
DECLARE
    partition_date DATE := '2024-01-01';
BEGIN
    WHILE partition_date < '2025-01-01' LOOP
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS events_%s PARTITION OF events
             FOR VALUES FROM (%L) TO (%L)',
            TO_CHAR(partition_date, 'YYYY_MM'),   -- 예: events_2024_01
            partition_date,
            partition_date + INTERVAL '1 month'
        );
        partition_date := partition_date + INTERVAL '1 month';
    END LOOP;
END $$;

-- 결과: events_2024_01, events_2024_02, ... events_2024_12 파티션 생성
-- 쿼리 시 WHERE created_at >= '2024-01' 조건이 있으면 해당 파티션만 스캔
```

### 2. 해시 파티셔닝 — 균등 분산

특정 날짜에 데이터가 몰리지 않고 균등하게 분산하고 싶을 때 사용합니다.

```sql
-- users 테이블: id 해시값으로 4개 파티션에 균등 분산
CREATE TABLE users (
    id          BIGSERIAL,
    email       VARCHAR(255),
    name        VARCHAR(100)
) PARTITION BY HASH (id);           -- id의 해시값으로 분할

-- 4개의 파티션 생성 (0, 1, 2, 3)
CREATE TABLE users_0 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE users_1 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE users_2 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE users_3 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 3);
-- id % 4 = 0이면 users_0, = 1이면 users_1 ...
```

### 3. 목록 파티셔닝 — 특정 값으로 분할

지역, 상태 코드 등 값의 종류가 정해진 경우에 사용합니다.

```sql
-- orders 테이블: 지역별 파티셔닝 (데이터 지역화, 규정 준수에 유리)
CREATE TABLE orders (
    id          BIGSERIAL,
    region      VARCHAR(10),
    amount      NUMERIC
) PARTITION BY LIST (region);       -- region 값으로 분할

CREATE TABLE orders_kr PARTITION OF orders FOR VALUES IN ('KR');   -- 한국 주문
CREATE TABLE orders_us PARTITION OF orders FOR VALUES IN ('US');   -- 미국 주문
CREATE TABLE orders_eu PARTITION OF orders FOR VALUES IN ('EU');   -- 유럽 주문
```

---

## 샤딩 — 여러 DB 서버로 데이터 분산

샤딩은 파티셔닝과 달리 데이터를 여러 물리적 DB 서버에 나눠 저장합니다. 파티셔닝으로도 감당이 안 될 때의 최후 수단입니다.

### 수직 분할 vs 수평 분할

```
수직 분할 (Vertical Partitioning):
- 테이블을 컬럼 단위로 분리
- 예: users 테이블의 자주 쓰는 컬럼(id, name, email)과
      잘 안 쓰는 컬럼(bio, preferences) 분리
- 장점: 자주 쓰는 컬럼을 더 빠르게 읽을 수 있음

수평 분할 (Horizontal Partitioning = Sharding):
- 같은 스키마의 데이터를 여러 DB 서버에 분산
- DB1: user_id 1~1000만, DB2: 1000만~2000만 ...
- 장점: 쓰기 부하 분산 가능
- 단점: Cross-shard JOIN 불가, 트랜잭션 복잡
```

### 샤딩 키 선택의 중요성

```
user_id로 샤딩:
→ 한 사용자의 모든 데이터가 같은 샤드에 있어서 좋음
→ 하지만 인기 사용자(빅 셀러)가 몰리면 핫스팟 발생

날짜로 샤딩:
→ 오래된 데이터와 최신 데이터 분리
→ 하지만 최신 날짜 샤드에만 쓰기가 집중됨 (핫스팟)

해시(user_id)로 샤딩:
→ 균등 분산 가능
→ 하지만 리밸런싱이 어려움 (샤드 추가 시 대규모 데이터 이동)
```

### 애플리케이션 레벨 샤딩 예시

```java
// 간단한 샤드 라우터 구현
@Component
public class ShardRouter {

    private static final int SHARD_COUNT = 4;       // 샤드 수 (나중에 바꾸기 어려움!)

    private final List<DataSource> shards;           // 각 샤드의 DataSource

    public DataSource getShardForUser(Long userId) {
        // userId를 샤드 수로 나눈 나머지로 어느 샤드인지 결정
        int shardIndex = (int) (userId % SHARD_COUNT);
        return shards.get(shardIndex);
    }
}

// 실제로는 Vitess, Citus(PostgreSQL 확장), Pgpool-II 같은
// 미들웨어를 사용하는 것이 훨씬 안전하고 편리합니다.
```

### 샤딩의 문제점

```
1. Cross-shard JOIN 불가
   → 여러 샤드에 걸친 데이터를 한 번에 조회 불가
   → 애플리케이션에서 여러 샤드를 조회 후 직접 합쳐야 함

2. 분산 트랜잭션 어려움
   → 여러 샤드에 걸친 트랜잭션 보장이 매우 어려움

3. 리밸런싱
   → 샤드를 추가할 때 기존 데이터를 재분배해야 함
   → 대규모 데이터 이동 필요 (서비스 중단 또는 느려짐)

4. 운영 복잡도 증가
   → 모니터링, 백업, 마이그레이션 모두 복잡해짐
```

---

## 대용량 삽입 — 빠르게 데이터 넣기

### PostgreSQL COPY — 가장 빠른 방법

```sql
-- 파일에서 직접 삽입 (COPY가 INSERT보다 10~100배 빠름)
COPY orders (user_id, amount, status) FROM '/tmp/orders.csv' CSV HEADER;
COPY orders (user_id, amount, status) TO '/tmp/orders_backup.csv' CSV HEADER;

-- psql 클라이언트에서 실행 (클라이언트 권한으로 파일 읽기)
\COPY orders FROM 'orders.csv' CSV HEADER;

-- 멀티 행 INSERT (단건 INSERT보다 훨씬 빠름)
INSERT INTO orders (user_id, amount, status)
VALUES
    (1, 10000, 'COMPLETED'),
    (2, 20000, 'COMPLETED'),
    (3, 30000, 'PENDING');  -- 한 번에 수천 행 삽입 가능
```

### JPA 배치 삽입 설정

```yaml
# application.yml
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 500          # 500건씩 묶어서 한 번에 INSERT
        order_inserts: true        # INSERT를 같은 테이블 기준으로 정렬 (배치 효율 향상)
        order_updates: true        # UPDATE도 정렬
```

```java
// Spring Batch로 대용량 파일 처리
@Bean
public Step importStep() {
    return stepBuilder.get("importStep")
        .<OrderDto, Order>chunk(1000)  // 1000건씩 읽고 처리하고 저장
        .reader(csvReader())           // CSV 파일에서 읽기
        .processor(orderProcessor())   // 변환 처리
        .writer(jpaWriter())           // DB에 배치 저장
        .build();
}
// chunk 크기를 너무 크게 하면 트랜잭션이 커져서 실패 시 롤백 비용 증가
// 보통 500~2000 사이가 적당
```

---

## 대용량 조회 — 메모리에 다 올리지 않고 처리

10만 건을 한 번에 조회하면 OutOfMemoryError가 발생할 수 있습니다. 스트리밍 방식으로 한 번에 일부씩 처리합니다.

### JPA Stream 조회

```java
// Stream으로 전체 데이터를 한 번에 메모리에 올리지 않고 처리
@Transactional(readOnly = true)   // 반드시 트랜잭션 안에서 사용
public void processAllOrders() {
    try (Stream<Order> stream = orderRepository.streamAll()) {
        stream
            .filter(order -> order.getStatus().equals("PENDING"))
            .forEach(order -> {
                // 한 건씩 처리
                processOrder(order);
            });
    }
    // try-with-resources로 스트림 자동 닫기
}

// Repository에 Stream 반환 메서드 추가
@Query("SELECT o FROM Order o")
Stream<Order> streamAll();
```

```java
// JdbcTemplate 커서 기반 스트리밍 (더 세밀한 제어)
jdbcTemplate.query(
    "SELECT * FROM large_table ORDER BY id",
    rs -> {
        while (rs.next()) {
            // ResultSet에서 직접 읽어서 처리
            process(rs.getLong("id"), rs.getString("name"));
        }
    }
);
```

### Pageable로 페이징 처리

```java
// 페이징으로 대용량 데이터 처리 (메모리 효율적)
@Transactional(readOnly = true)
public void processAllOrdersWithPaging() {
    int page = 0;
    int pageSize = 1000;
    Page<Order> result;

    do {
        result = orderRepository.findAll(
            PageRequest.of(page, pageSize, Sort.by("id"))  // id 기준 정렬 중요!
        );
        result.getContent().forEach(this::processOrder);
        page++;
    } while (result.hasNext());
}
// 주의: 정렬 없이 페이징하면 같은 데이터가 두 번 나오거나 누락될 수 있음
```

---

## 대용량 집계 — 실시간 집계의 한계와 해결책

수억 건 테이블에서 `COUNT(*)`나 `SUM()`을 실행하면 매우 느립니다.

### 해결책 1: Materialized View — 미리 계산해두기

```sql
-- 실시간 집계 (느림 — 매번 전체 스캔)
SELECT DATE(created_at), COUNT(*), SUM(amount)
FROM orders
WHERE created_at >= '2024-01-01'
GROUP BY DATE(created_at);

-- 해결: Materialized View로 미리 집계해두기
CREATE MATERIALIZED VIEW daily_order_stats AS
SELECT
    DATE(created_at) AS date,
    COUNT(*) AS order_count,
    SUM(amount) AS total_amount
FROM orders
GROUP BY DATE(created_at);

-- Materialized View에 인덱스 추가 (빠른 조회를 위해)
CREATE UNIQUE INDEX ON daily_order_stats(date);

-- 데이터 갱신 (CONCURRENTLY = 잠금 없이 갱신, 약간 느림)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_order_stats;
-- 스케줄러(Spring @Scheduled)나 CronJob으로 정기 갱신
```

### 해결책 2: 집계 테이블 — 실시간 업데이트

```sql
-- 집계 전용 테이블 생성
CREATE TABLE daily_stats (
    date        DATE PRIMARY KEY,
    order_count INTEGER NOT NULL DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0
);

-- 주문 생성 시마다 집계 테이블 업데이트 (upsert 사용)
INSERT INTO daily_stats (date, order_count, total_amount)
VALUES (CURRENT_DATE, 1, 50000)        -- 오늘 날짜에 1건, 5만원 추가
ON CONFLICT (date) DO UPDATE SET
    order_count = daily_stats.order_count + 1,
    total_amount = daily_stats.total_amount + EXCLUDED.total_amount;
-- 이미 오늘 날짜 행이 있으면 누적, 없으면 새로 생성
```

### 해결책 3: OLAP DB 분리

대규모 분석 쿼리는 운영 DB와 분리된 분석 전용 DB에서 실행합니다.

```
운영 DB (OLTP): PostgreSQL
   ↓ ETL/CDC (Change Data Capture)
분석 DB (OLAP): Redshift, BigQuery, ClickHouse

OLTP (Online Transaction Processing): 빠른 단건 읽기/쓰기
OLAP (Online Analytical Processing): 느리지만 대규모 집계

ClickHouse는 초당 수억 행 집계 가능 (OLAP에 특화)
```

---

## TimescaleDB — 시계열 데이터 특화

서버 메트릭, IoT 센서 데이터, 금융 시세처럼 시간 기반으로 쌓이는 데이터는 TimescaleDB를 사용하면 PostgreSQL보다 훨씬 효율적입니다.

```sql
-- PostgreSQL 확장 설치
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 일반 테이블을 하이퍼테이블로 변환 (자동 시간 파티셔닝)
SELECT create_hypertable('metrics', 'time');
-- 내부적으로 7일, 1달 단위로 자동 파티셔닝

-- 데이터 보존 정책 설정 (90일 이상 된 데이터 자동 삭제)
SELECT add_retention_policy('metrics', INTERVAL '90 days');
-- 디스크 용량 자동 관리

-- 연속 집계 뷰: 실시간으로 시간별 집계 유지
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS   -- 데이터 추가 시 자동 갱신
SELECT
    time_bucket('1 hour', time) AS hour,   -- 1시간 단위로 묶기
    device_id,
    AVG(value) AS avg_value,
    MAX(value) AS max_value
FROM metrics
GROUP BY hour, device_id;

-- 조회 시 원본 테이블 대신 집계 뷰 사용 (훨씬 빠름)
SELECT * FROM metrics_hourly
WHERE hour >= NOW() - INTERVAL '24 hours'
  AND device_id = 'server-01';
```

---

## 흔한 실수들

```
실수 1: 처음부터 샤딩을 도입
→ 운영 복잡도가 기하급수적으로 증가
→ 인덱스 최적화, 캐싱으로 대부분 해결됨
→ "정말 불가피할 때"만 샤딩 도입

실수 2: ORM으로 대용량 데이터 전체 로드
→ orderRepository.findAll()로 100만 건 → OOM 발생
→ Stream, Pageable, COPY 등 스트리밍 방식 사용

실수 3: 파티셔닝 없이 시계열 데이터 쌓기
→ 1년치 이벤트 로그가 10억 건이 되면 쿼리가 매우 느려짐
→ 날짜별 파티셔닝으로 오래된 파티션만 스캔하도록 설계

실수 4: 인덱스 없이 파티션 사용
→ 파티션 프루닝(관련 파티션만 스캔)이 되려면
   WHERE 조건이 파티션 키와 일치해야 함
→ EXPLAIN ANALYZE로 실제 실행 계획 확인

실수 5: VACUUM 미실행으로 테이블 팽창
→ 대량 UPDATE/DELETE 후 Dead Tuple이 쌓여 테이블이 커짐
→ VACUUM ANALYZE 정기 실행 또는 autovacuum 설정 확인
```
