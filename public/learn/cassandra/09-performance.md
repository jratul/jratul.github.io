---
title: "성능 최적화"
order: 9
---

## 파티션 크기 관리

파티션이 너무 크면 읽기 성능이 떨어지고 Compaction 부하가 증가합니다.

```
권장 파티션 크기: 10MB 이하
경고 임계치: 100MB 이상
문제 임계치: 1GB 이상 (Large Partition 경고 발생)
```

```bash
# 파티션 크기 확인
nodetool tablestats my_app.events | grep "Partition"
# Partition maximum bytes: 52428800  ← 50MB (주의!)

# Large Partition 경고 로그 확인
grep "Large partition" /var/log/cassandra/system.log
```

```cql
-- 문제: 연도별 파티션 — 데이터 무한 증가
CREATE TABLE events (
    user_id UUID,
    year    INT,
    ts      TIMESTAMP,
    PRIMARY KEY ((user_id, year), ts)
);

-- 해결: 월별 파티션으로 크기 제한
CREATE TABLE events_monthly (
    user_id    UUID,
    year_month TEXT,    -- '2024-01'
    ts         TIMESTAMP,
    PRIMARY KEY ((user_id, year_month), ts)
) WITH CLUSTERING ORDER BY (ts DESC);
```

---

## 읽기 성능 최적화

### Bloom Filter 튜닝

```cql
-- Bloom Filter false positive 확률 낮추기 (메모리 더 사용)
ALTER TABLE users
WITH bloom_filter_fp_chance = 0.001;   -- 0.1% (기본 1%)

-- 읽기 많은 테이블: 낮게 설정
-- 쓰기 많은 테이블: 높게 설정 (메모리 절약)
```

### Key Cache

파티션 키 → SSTable 오프셋을 메모리에 캐싱. 반복 읽기가 많은 경우 효과적.

```yaml
# cassandra.yaml
key_cache_size_in_mb: 200       # 더 많은 메모리 할당
key_cache_save_period: 14400    # 4시간마다 디스크에 저장
```

### Row Cache — 신중하게 사용

```yaml
# cassandra.yaml (기본 비활성화)
row_cache_size_in_mb: 256    # 활성화 시

# 특정 테이블만 Row Cache 활성화
```

```cql
ALTER TABLE hot_config_table
WITH caching = {
    'keys': 'ALL',
    'rows_per_partition': '100'   -- 파티션당 최대 100행 캐싱
};
```

> Row Cache는 변경이 적고 읽기가 매우 많은 테이블에만 사용하세요. 자주 변경되는 데이터는 오히려 성능 저하.

---

## 쓰기 성능 최적화

### 배치 쓰기

```kotlin
// ❌ 개별 쓰기 — 매번 네트워크 왕복
users.forEach { user -> repository.save(user) }

// ✅ 배치 쓰기
val batch = BatchStatement.newInstance(DefaultBatchType.UNLOGGED)
users.forEach { user ->
    val insert = QueryBuilder.insertInto("users")
        .value("user_id", QueryBuilder.literal(user.userId))
        .value("email", QueryBuilder.literal(user.email))
    batch.add(insert.build())
}
session.execute(batch)
```

### Async 쓰기

```kotlin
// 비동기 대량 쓰기
val futures = users.map { user ->
    session.executeAsync(buildInsert(user))
}
// 모든 완료 대기
CompletableFuture.allOf(*futures.map { it.toCompletableFuture() }.toTypedArray()).get()
```

---

## SSTable 수 줄이기

SSTable이 많으면 읽기 시 더 많은 파일을 참조해야 합니다.

```bash
# SSTable 수 확인
nodetool tablestats my_app.events | grep "SSTable count"

# 수동 Compaction으로 SSTable 통합
nodetool compact my_app events

# 주기적 Compaction을 위한 전략 변경
```

```cql
-- 쓰기 많은 테이블: STCS (기본)
ALTER TABLE events WITH compaction = {
    'class': 'SizeTieredCompactionStrategy',
    'min_threshold': 4,
    'max_threshold': 32
};

-- 읽기 많은 테이블: LCS
ALTER TABLE user_profiles WITH compaction = {
    'class': 'LeveledCompactionStrategy',
    'sstable_size_in_mb': 160
};

-- 시계열 + TTL: TWCS
ALTER TABLE metrics WITH compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_unit': 'HOURS',
    'compaction_window_size': 1
};
```

---

## 스펙 및 하드웨어 권장사항

```
CPU: 코어 수 많을수록 유리 (Compaction, 동시 요청)
     concurrent_reads/writes = CPU * 2

RAM: 힙 = min(전체 RAM의 25%, 8GB)
     힙 외 나머지는 OS 페이지 캐시로 활용 (SSTable 캐싱)

Storage: SSD 강력 권장 (HDD는 Compaction I/O 병목)
          JBOD (Just a Bunch Of Disks) 권장 — RAID 불필요
          data_file_directories에 여러 디스크 경로 지정

Network: 10Gbps 권장 (노드 간 스트리밍, repair 시 대역폭 필요)
```

---

## 쿼리 최적화 체크리스트

```
❌ 피해야 할 패턴:
- ALLOW FILTERING 사용
- 파티션 키 없는 SELECT
- IN 절에 너무 많은 값 (IN (?, ?, ...100개))
- 클러스터링 키 순서 건너뛰기
- 파티션이 너무 큰 테이블에 COUNT(*)

✅ 권장 패턴:
- 파티션 키를 항상 WHERE에 포함
- 클러스터링 키는 정의 순서대로 WHERE 조건 사용
- LIMIT으로 결과 수 제한
- 대량 읽기는 token()으로 페이징
- 쿼리 패턴마다 별도 테이블 설계
```

---

## 모니터링 지표

```bash
# 주요 모니터링 지표
nodetool tablestats my_app | grep -E "Read|Write|Latency|SSTable|Cache"

# 핵심 지표:
# - Read Latency: < 1ms (95th percentile)
# - Write Latency: < 0.5ms
# - SSTable count: 가능한 낮게 유지
# - Bloom filter false ratio: < 0.01 (1%)
# - Pending Compactions: 지속 증가하면 I/O 병목

# Prometheus + Cassandra 메트릭 수집
# cassandra_exporter를 사용해 Prometheus로 수집 → Grafana 대시보드
```
