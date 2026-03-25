---
title: "실행계획 분석"
order: 4
---

# 실행계획 분석 (EXPLAIN)

쿼리가 느릴 때 "왜 느린지"를 파악하는 가장 강력한 도구입니다. 실행계획을 읽을 줄 알면 인덱스가 제대로 쓰이는지, 어디서 병목이 생기는지 한눈에 볼 수 있습니다.

---

## EXPLAIN이란?

**EXPLAIN**은 데이터베이스가 쿼리를 어떻게 실행할 것인지(또는 실제로 어떻게 실행했는지) 보여주는 명령어입니다.

의사한테 몸을 검사받는 것처럼, 쿼리에 `EXPLAIN`을 붙여서 DB가 내부적으로 무엇을 하고 있는지 확인할 수 있습니다.

```sql
-- 1. EXPLAIN: 실제 실행 없이 예상 계획만 보기
EXPLAIN SELECT * FROM users WHERE email = 'hong@example.com';

-- 2. EXPLAIN ANALYZE: 실제 실행 후 통계 포함 (더 정확)
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'hong@example.com';

-- 3. 가장 자세한 버전 (권장)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM users WHERE email = 'hong@example.com';
-- BUFFERS: 캐시 히트/미스 정보 포함
-- FORMAT TEXT: 텍스트 형식으로 출력
```

**주의:** `EXPLAIN ANALYZE`는 실제로 쿼리를 실행합니다. `UPDATE`, `DELETE`에 사용할 때는 트랜잭션 안에서 사용 후 롤백하세요.

```sql
BEGIN;
EXPLAIN ANALYZE DELETE FROM users WHERE status = 'DELETED';
ROLLBACK;  -- 실제로 삭제되지 않도록 롤백
```

---

## 실행계획 읽기

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 1;
```

실행계획 출력 결과:

```
Index Scan using idx_orders_user_id on orders
  (cost=0.43..8.45 rows=5 width=100)
  (actual time=0.025..0.031 rows=5 loops=1)
  Index Cond: (user_id = 1)
Planning Time: 0.5 ms
Execution Time: 0.1 ms
```

각 부분의 의미:

```
Index Scan using idx_orders_user_id on orders
→ "orders 테이블을 idx_orders_user_id 인덱스로 스캔했다"

cost=0.43..8.45
→ 0.43: 첫 번째 행을 반환하기까지의 예상 비용 (시작 비용)
→ 8.45: 전체 쿼리 완료까지의 예상 비용
→ 비용은 절대적인 시간이 아닌 상대적인 단위 (크면 느리다는 의미)

rows=5
→ DB가 예상하는 반환 행 수 (통계 기반 추정)

width=100
→ 각 행의 예상 크기 (바이트)

actual time=0.025..0.031
→ 실제로 걸린 시간 (ms): 시작 ~ 완료

rows=5 (actual)
→ 실제로 반환된 행 수

loops=1
→ 이 노드가 몇 번 반복 실행됐는지 (nested loop join에서 1 이상이 됨)
```

---

## 주요 스캔 타입

실행계획에서 가장 먼저 확인해야 할 것입니다.

```
좋은 스캔 타입 (빠름):

Index Only Scan   → 인덱스만으로 응답 완료 (커버링 인덱스 사용)
                     테이블 접근 없음 → 가장 빠름

Index Scan        → 인덱스로 위치 찾고 테이블에서 데이터 읽음
                     대부분의 경우 적절

Bitmap Index Scan → 여러 인덱스를 조합할 때
+ Bitmap Heap Scan   인덱스로 위치 목록 만든 후 테이블 일괄 접근


주의해야 할 스캔 타입:

Seq Scan (Sequential Scan)
→ 테이블을 처음부터 끝까지 전부 읽음 (Full Table Scan)
→ 소형 테이블이나 대부분의 행을 읽는 경우에는 오히려 더 빠를 수 있음
→ 대형 테이블에서 나타나면 인덱스 추가 검토 필요


JOIN 알고리즘:

Nested Loop   → 소량 데이터에 적합 (outer 결과마다 inner를 탐색)
Hash Join     → 대량 데이터에 적합 (해시 테이블 생성 후 매칭)
Merge Join    → 양쪽이 모두 정렬되어 있을 때 효율적


추가 연산:

Sort          → 정렬 발생 (인덱스로 처리 가능 여부 검토)
Hash          → 해시 테이블 생성 (메모리 사용)
Aggregate     → 집계 함수 처리 (COUNT, SUM 등)
```

---

## 실제 분석 예시

### 예시 1: 인덱스가 잘 쓰이는 경우

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 1 AND status = 'PENDING';
```

```
결과:
Index Scan using idx_orders_user_status on orders
  (cost=0.43..4.20 rows=2 width=80)
  (actual time=0.015..0.020 rows=2 loops=1)
  Index Cond: ((user_id = 1) AND (status = 'PENDING'))
Execution Time: 0.05 ms

→ 인덱스가 잘 사용됨 (Index Scan)
→ rows 예측(2)과 실제(2)가 일치 → 통계가 정확
→ 실행 시간 0.05ms → 매우 빠름
```

### 예시 2: 인덱스가 안 쓰이는 경우

```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE LOWER(email) = 'hong@example.com';
```

```
결과:
Seq Scan on users
  (cost=0.00..2500.00 rows=500 width=200)
  (actual time=0.5..850.0 rows=1 loops=1)
  Filter: (lower(email) = 'hong@example.com')
  Rows Removed by Filter: 99999
Execution Time: 850 ms

→ Seq Scan: 전체 테이블 스캔 (인덱스 미사용)
→ Rows Removed by Filter: 99999 → 100,000행을 다 읽고 1개만 남김
→ 850ms → 매우 느림

해결책:
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
→ 이후 Index Scan으로 바뀜
```

### 예시 3: rows 예측 오차

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE created_at > '2024-01-01';
```

```
결과:
Seq Scan on orders
  (cost=0.00..5000.00 rows=100 width=80)   ← 예측: 100행
  (actual time=0.5..3000.0 rows=95000 loops=1)  ← 실제: 95000행
  Filter: (created_at > '2024-01-01')
Execution Time: 3000 ms

→ rows 예측(100)과 실제(95000)가 크게 다름!
→ DB 통계가 오래되어 부정확한 상태
→ ANALYZE 명령으로 통계 갱신 필요

해결책:
ANALYZE orders;  -- 통계 업데이트
→ 이후 DB가 올바른 실행계획을 선택함
```

---

## 통계 업데이트 (ANALYZE)

PostgreSQL은 **통계를 기반으로 최적의 실행계획을 선택**합니다. 통계가 오래되면 잘못된 계획을 선택할 수 있습니다.

```sql
-- 특정 테이블 통계 업데이트
ANALYZE users;
ANALYZE orders;

-- 전체 테이블 통계 업데이트
ANALYZE;

-- VACUUM + ANALYZE (죽은 행 정리 + 통계 업데이트)
VACUUM ANALYZE orders;

-- 언제 필요한가:
-- 대량 데이터 INSERT 후 (수십만 건 이상)
-- 대량 DELETE 후
-- 실행계획이 갑자기 나빠졌을 때
-- rows 예측과 실제가 크게 다를 때

-- 통계 최신화 확인
SELECT
    tablename,
    n_live_tup       AS 실제행수,
    n_dead_tup       AS 죽은행수,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename = 'orders';
```

---

## 느린 쿼리 자동으로 찾기

```sql
-- pg_stat_statements 확장 활성화
-- postgresql.conf에 추가: shared_preload_libraries = 'pg_stat_statements'
-- 이후 서버 재시작 필요

-- 설치
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 평균 실행 시간 기준 느린 쿼리 상위 20개
SELECT
    SUBSTRING(query, 1, 80) AS 쿼리미리보기,
    calls                    AS 실행횟수,
    ROUND(total_exec_time / calls, 2) AS 평균ms,
    ROUND(total_exec_time, 0)         AS 총ms,
    ROUND(rows / calls, 0)            AS 평균반환행
FROM pg_stat_statements
ORDER BY total_exec_time / calls DESC
LIMIT 20;

-- 총 실행 시간 기준 (서버에 가장 많은 부하를 주는 쿼리)
SELECT
    SUBSTRING(query, 1, 80) AS 쿼리미리보기,
    calls                    AS 실행횟수,
    ROUND(total_exec_time, 0) AS 총실행ms,
    ROUND(mean_exec_time, 2)  AS 평균ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

```bash
# postgresql.conf: 1초(1000ms) 이상 걸리는 쿼리를 로그에 기록
log_min_duration_statement = 1000
log_line_prefix = '%t [%p] '

# 로그 확인
tail -f /var/log/postgresql/postgresql.log | grep "duration"
```

---

## 쿼리 최적화 패턴

### 패턴 1: 함수 적용 → 표현식 인덱스

```sql
-- ❌ 느림: LOWER 함수로 인덱스 미사용
EXPLAIN ANALYZE
SELECT * FROM users WHERE LOWER(email) = 'hong@example.com';
-- Seq Scan → 전체 스캔

-- ✅ 빠름: 표현식 인덱스 생성
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'hong@example.com';
-- Index Scan → 빠름
```

### 패턴 2: IN + 서브쿼리 → EXISTS 또는 JOIN

```sql
-- ❌ 성능 이슈 가능: 서브쿼리 결과가 클 때
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders WHERE amount > 100000);

-- ✅ 더 효율적: EXISTS
SELECT * FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = u.id AND o.amount > 100000
);

-- ✅ 또는 JOIN으로 대체
SELECT DISTINCT u.*
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.amount > 100000;
```

### 패턴 3: OFFSET 페이지네이션 → Keyset 페이지네이션

```sql
-- ❌ OFFSET이 클수록 느려짐
-- OFFSET 10000 = 10020개를 읽고 앞 10000개를 버림
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

-- ✅ Keyset 페이지네이션 (항상 빠름)
-- 마지막으로 받은 게시글의 created_at을 다음 요청에 전달
SELECT * FROM posts
WHERE created_at < '2024-01-05 10:00:00'  -- 마지막 게시글의 시간
ORDER BY created_at DESC
LIMIT 20;
-- 마지막 게시글 이전 것들을 인덱스로 바로 탐색 → 페이지가 아무리 뒤여도 빠름
```

### 패턴 4: SELECT * → 필요한 컬럼만

```sql
-- ❌ 불필요한 컬럼까지 전송 (네트워크, 메모리 낭비)
SELECT * FROM users WHERE status = 'ACTIVE';

-- ✅ 필요한 컬럼만 선택
SELECT id, name, email FROM users WHERE status = 'ACTIVE';
-- 커버링 인덱스 효과도 누릴 수 있음
```

---

## VACUUM — 죽은 행 정리

PostgreSQL은 MVCC 방식 때문에 UPDATE/DELETE 시 행을 즉시 삭제하지 않고 "죽은 행(dead tuple)"으로 남겨둡니다. VACUUM이 이를 정리합니다.

```sql
-- 일반 VACUUM: 죽은 행 정리 (공간 재사용, 테이블 크기는 줄지 않음)
VACUUM orders;

-- FULL VACUUM: 테이블 재구성 (디스크 공간 반환, 잠금 발생)
-- 운영 중에는 주의해서 사용
VACUUM FULL orders;

-- VACUUM + ANALYZE: 청소 + 통계 업데이트
VACUUM ANALYZE orders;

-- autovacuum이 자동으로 실행하지만, 다음 상황에서 수동 실행 필요:
-- 대량 DELETE/UPDATE 후 (테이블 크기가 비정상적으로 클 때)
-- 쿼리 성능이 갑자기 저하됐을 때
-- 테이블의 n_dead_tup이 매우 클 때

-- 테이블 상태 확인
SELECT
    tablename,
    n_live_tup    AS 실제행수,
    n_dead_tup    AS 죽은행수,
    ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 1)
        AS 죽은행비율
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

---

## 실전 튜닝 체크리스트

쿼리가 느릴 때 순서대로 확인하세요:

```
1단계: EXPLAIN ANALYZE 실행
   □ Seq Scan이 대형 테이블에 나타나는가? → 인덱스 추가 검토
   □ rows 예측과 actual 값이 10배 이상 차이나는가? → ANALYZE 실행
   □ Sort 노드가 있는가? → ORDER BY 컬럼에 인덱스 추가 검토
   □ Nested Loop 안에 Seq Scan이 있는가? → JOIN 컬럼 인덱스 추가

2단계: 인덱스 점검
   □ WHERE 절 컬럼에 인덱스가 있는가?
   □ JOIN에 사용되는 컬럼(외래키)에 인덱스가 있는가?
   □ 복합 인덱스의 컬럼 순서가 쿼리 패턴과 맞는가?
   □ 인덱스를 타지 못하는 패턴(함수, 타입 불일치)은 없는가?

3단계: 쿼리 개선
   □ N+1 쿼리 패턴이 없는가?
   □ SELECT * 대신 필요한 컬럼만 선택하는가?
   □ OFFSET 페이지네이션을 Keyset으로 바꿀 수 있는가?
   □ 스칼라 서브쿼리를 JOIN으로 대체할 수 있는가?

4단계: 통계 및 유지보수
   □ 최근 ANALYZE를 실행했는가?
   □ pg_stat_statements로 실제 느린 쿼리를 파악했는가?
   □ 사용되지 않는 인덱스가 많지는 않은가?
```
