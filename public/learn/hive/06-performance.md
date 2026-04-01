---
title: "성능 최적화"
order: 6
---

## 쿼리 실행 계획 분석

```sql
-- 실행 계획 확인
EXPLAIN SELECT * FROM orders WHERE dt = '2024-01-15' AND status = 'PAID';

-- 상세 실행 계획
EXPLAIN EXTENDED SELECT ...;

-- Tez 실행 계획 (그래프)
EXPLAIN VECTORIZATION SELECT ...;
```

---

## 파티션 프루닝 확인

```sql
-- 파티션 키를 WHERE에 포함해야 프루닝 작동
-- ✅ 프루닝 적용
EXPLAIN SELECT * FROM orders WHERE dt = '2024-01-15';
-- → "TableScan: partitions: 1 out of 365" 확인

-- ❌ 프루닝 미적용
EXPLAIN SELECT * FROM orders WHERE total > 10000;
-- → "TableScan: partitions: 365 out of 365"
```

---

## 조인 최적화

### Map-side Join (Broadcast Join)

작은 테이블을 각 매퍼의 메모리에 로드해 리듀서 없이 조인합니다.

```sql
SET hive.auto.convert.join=true;           -- 자동 Map Join 활성화
SET hive.mapjoin.smalltable.filesize=25MB; -- 이 크기 이하면 자동 Map Join

-- 명시적 힌트
SELECT /*+ MAPJOIN(u) */ o.order_id, u.name, o.total
FROM orders o
JOIN users u ON o.user_id = u.user_id;  -- users가 작으면 Map Join

-- 여러 테이블
SELECT /*+ MAPJOIN(u, p) */ o.*, u.name, p.category
FROM orders o
JOIN users u    ON o.user_id = u.user_id
JOIN products p ON o.product_id = p.id;
```

### Skew Join 최적화

특정 키에 데이터가 몰리는 **데이터 스큐(Skew)** 처리:

```sql
SET hive.optimize.skewjoin=true;
SET hive.skewjoin.key=100000;   -- 이 수 이상 발생하는 키는 스큐로 처리

-- NULL 키 처리
SELECT * FROM orders o
LEFT JOIN users u ON COALESCE(o.user_id, UUID()) = u.user_id;
-- NULL 키는 랜덤 값으로 분산
```

---

## 벡터화 (Vectorization)

한 번에 1행이 아닌 1024행씩 처리합니다.

```sql
SET hive.vectorized.execution.enabled=true;
SET hive.vectorized.execution.reduce.enabled=true;

-- 벡터화 지원 여부 확인
EXPLAIN VECTORIZATION SELECT ...;
```

---

## CBO (Cost-Based Optimizer)

테이블 통계를 기반으로 최적 실행 계획을 선택합니다.

```sql
-- CBO 활성화
SET hive.cbo.enable=true;
SET hive.compute.query.using.stats=true;
SET hive.stats.fetch.column.stats=true;

-- 통계 수집
ANALYZE TABLE orders COMPUTE STATISTICS;
ANALYZE TABLE orders PARTITION (dt='2024-01-15') COMPUTE STATISTICS;
ANALYZE TABLE orders COMPUTE STATISTICS FOR COLUMNS order_id, user_id, total;

-- 통계 확인
DESCRIBE EXTENDED orders;
DESCRIBE EXTENDED orders PARTITION (dt='2024-01-15');
```

---

## 파일 수 최적화 (Small File Problem)

Hadoop은 작은 파일이 많으면 NameNode 메모리 부담 + 처리 오버헤드가 증가합니다.

```sql
-- 출력 파일 수 제한 (리듀서 수 조정)
SET mapreduce.job.reduces=10;

-- 또는 자동으로 적절한 수 결정
SET hive.exec.reducers.bytes.per.reducer=256MB;

-- 작은 파일 합치기 (Tez)
SET hive.merge.tezfiles=true;
SET hive.merge.smallfiles.avgsize=16MB;   -- 이 크기 이하면 합침
SET hive.merge.size.per.task=256MB;

-- 작은 파일 합치기 (MapReduce)
SET hive.merge.mapfiles=true;
SET hive.merge.mapredfiles=true;
```

---

## 병렬 처리 설정

```sql
-- 병렬 쿼리 실행
SET hive.exec.parallel=true;
SET hive.exec.parallel.thread.number=8;   -- 최대 병렬 스테이지 수

-- 동적 파티션 병렬 처리
SET hive.exec.dynamic.partition.maxparts=4096;

-- Tez 설정
SET tez.am.resource.memory.mb=2048;
SET tez.task.resource.memory.mb=4096;
SET tez.task.launch.cmd-opts=-Xmx3276m;
```

---

## 쿼리 최적화 체크리스트

```
✅ 권장 패턴:
  - 파티션 키를 항상 WHERE 조건에 포함
  - 작은 테이블을 오른쪽에 배치 (또는 MAPJOIN 힌트)
  - SELECT *보다 필요한 컬럼만 선택
  - 조기 필터링으로 처리 데이터 양 감소
  - ORC/Parquet + Snappy 압축 사용
  - ANALYZE TABLE로 통계 최신화
  - CBO 활성화

❌ 피해야 할 패턴:
  - 파티션 키 없는 전체 스캔
  - 매우 큰 테이블 간 Reduce-side Join
  - SELECT DISTINCT (대신 GROUP BY 검토)
  - 과도한 동적 파티션 (파티션 수 폭발)
  - 너무 작은 파일 다수 생성
  - 복잡한 서브쿼리 (CTE로 리팩토링)
```

---

## 모니터링

```sql
-- 쿼리 히스토리 (HiveServer2 Web UI)
-- http://hiveserver2-host:10002/queries

-- 실행 중인 쿼리 확인
SHOW LOCKS;

-- YARN에서 Job 확인
-- http://resourcemanager:8088

-- 느린 쿼리 로그
-- hive-log4j2.properties에서 QUERY_COMPLETED 로그 확인
```
