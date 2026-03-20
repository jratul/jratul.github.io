---
title: "실행계획 분석"
order: 4
---

# 실행계획 분석 (EXPLAIN)

쿼리가 실제로 어떻게 실행되는지 확인하고 최적화하는 방법.

---

## EXPLAIN 기본

```sql
-- 실행계획만 보기 (실제 실행 안 함)
EXPLAIN SELECT * FROM users WHERE email = 'john@example.com';

-- 실제 실행 후 통계 포함
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'john@example.com';

-- 가장 많은 정보
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM users WHERE email = 'john@example.com';
```

---

## 실행계획 읽기

```
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123;

결과:
Index Scan using idx_orders_user_id on orders  (cost=0.43..8.45 rows=5 width=100) (actual time=0.025..0.031 rows=5 loops=1)
  Index Cond: (user_id = 123)
Planning Time: 0.5 ms
Execution Time: 0.1 ms

읽는 법:
cost=0.43..8.45
  0.43 — 첫 번째 행 반환까지 예상 비용 (시작 비용)
  8.45 — 전체 쿼리 완료 예상 비용

rows=5     — 예상 반환 행 수
width=100  — 예상 행 크기 (바이트)
actual time=0.025..0.031 — 실제 시작/완료 시간 (ms)
rows=5     — 실제 반환 행 수
loops=1    — 반복 횟수
```

---

## 주요 노드 타입

```
좋은 것:
Index Scan        — 인덱스로 탐색 후 테이블 접근
Index Only Scan   — 인덱스만으로 응답 (가장 빠름, 커버링 인덱스)
Bitmap Index Scan — 여러 인덱스 결합

나쁜 것 (주의):
Seq Scan          — 테이블 전체 읽기 (풀 스캔)
                   소형 테이블이라면 괜찮음
Hash              — 해시 테이블 생성 (메모리 사용)
Sort              — 정렬 (인덱스로 대체 가능 여부 검토)
Nested Loop       — 중첩 루프 JOIN (소량 데이터에 적합)
Hash Join         — 해시 기반 JOIN (대량 데이터에 적합)
Merge Join        — 정렬 기반 JOIN

확인 포인트:
rows 예측 vs actual 크게 다름 → 통계 부정확 → ANALYZE 실행
Seq Scan on 대형 테이블 → 인덱스 추가 검토
Sort on 대량 데이터 → 인덱스로 ORDER BY 처리 가능 여부 검토
```

---

## 통계 업데이트

PostgreSQL은 통계 기반으로 실행계획 최적화. 통계가 부정확하면 잘못된 계획.

```sql
-- 통계 수동 업데이트
ANALYZE users;
ANALYZE orders;
ANALYZE;           -- 전체 테이블

-- autovacuum이 자동으로 실행하지만
-- 대량 데이터 삽입/삭제 후에는 수동 실행 권장

-- 통계 확인
SELECT
    tablename,
    n_live_tup,       -- 실제 행 수
    n_dead_tup,       -- 삭제된 행 (VACUUM 필요)
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename = 'orders';
```

---

## 느린 쿼리 찾기

```sql
-- pg_stat_statements 확장 활성화 (postgresql.conf)
-- shared_preload_libraries = 'pg_stat_statements'

-- 상위 느린 쿼리
SELECT
    query,
    calls,
    total_exec_time / calls AS avg_time_ms,
    total_exec_time,
    rows / calls AS avg_rows
FROM pg_stat_statements
ORDER BY avg_time_ms DESC
LIMIT 20;

-- 총 실행 시간 기준
SELECT
    query,
    calls,
    total_exec_time AS total_ms,
    mean_exec_time AS avg_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

```bash
# PostgreSQL 로그에서 느린 쿼리 기록
# postgresql.conf:
log_min_duration_statement = 1000  # 1초 이상 쿼리 로그
log_line_prefix = '%t [%p] '
```

---

## 쿼리 최적화 패턴

```sql
-- ❌ 느린 쿼리: Seq Scan + 함수
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';

-- ✅ 최적화: 표현식 인덱스
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';

-- ❌ 느린 쿼리: IN + 서브쿼리 (대량)
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders WHERE amount > 100000);

-- ✅ 최적화: EXISTS
SELECT * FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = u.id AND o.amount > 100000
);

-- 또는 JOIN
SELECT DISTINCT u.*
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.amount > 100000;

-- ❌ COUNT(*) 전체 (대형 테이블)
SELECT COUNT(*) FROM orders;

-- ✅ 근사치 (빠름)
SELECT reltuples::BIGINT AS estimate FROM pg_class WHERE relname = 'orders';

-- ❌ OFFSET 이 큰 페이지네이션
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 10000;
-- OFFSET 10000이면 10020행 읽고 앞 10000 버림

-- ✅ Keyset (Cursor) 페이지네이션
SELECT * FROM posts
WHERE created_at < '2024-01-05 10:00:00'  -- 마지막 항목 기준
ORDER BY created_at DESC
LIMIT 20;
```

---

## VACUUM과 ANALYZE

```sql
-- VACUUM: 죽은 행(dead tuple) 정리, 공간 재사용
VACUUM users;
VACUUM FULL users;   -- 테이블 재구성 (잠금 발생, 공간 반환)
VACUUM ANALYZE users; -- VACUUM + 통계 업데이트

-- 언제 필요한가:
-- 대량 UPDATE/DELETE 후
-- 테이블 크기가 비정상적으로 큼
-- 쿼리 성능이 갑자기 저하됨

-- autovacuum 설정 확인
SHOW autovacuum;
SHOW autovacuum_vacuum_threshold;
```

---

## 실전 튜닝 체크리스트

```
1. EXPLAIN ANALYZE로 실행계획 확인
   □ Seq Scan on 대형 테이블 없는가?
   □ rows 예측과 actual이 크게 다르지 않은가?
   □ Sort가 필요 없는 인덱스로 처리 가능한가?

2. 인덱스 점검
   □ WHERE, JOIN, ORDER BY 컬럼에 인덱스 있는가?
   □ 사용되지 않는 인덱스 없는가?
   □ 복합 인덱스 컬럼 순서가 적절한가?

3. 쿼리 개선
   □ N+1 문제 없는가?
   □ SELECT * 대신 필요한 컬럼만 선택
   □ 서브쿼리를 JOIN으로 변환 가능한가?
   □ Offset 페이지네이션을 Keyset으로 변경 가능한가?

4. 통계
   □ ANALYZE 최근 실행 여부
   □ pg_stat_statements로 느린 쿼리 파악
```
