---
title: "PostgreSQL 심화"
order: 8
---

## PostgreSQL 심화 기능이란?

PostgreSQL에는 일반 SQL을 넘어서는 강력한 기능들이 있습니다. JSONB, 배열 타입, 전문 검색, 파티셔닝 등을 활용하면 별도의 NoSQL 데이터베이스 없이도 복잡한 요구사항을 처리할 수 있습니다.

**왜 배워야 하나?** "유연한 속성을 저장해야 해서 MongoDB를 써야 할까?"라는 상황에서도 PostgreSQL의 JSONB를 쓰면 해결되는 경우가 많습니다.

---

## JSONB — 유연한 속성 저장

```sql
-- JSON vs JSONB 차이
-- JSON:  입력 그대로 텍스트 저장, 조회 시마다 파싱 (느림)
-- JSONB: 바이너리로 저장, 인덱스 지원, 조회 빠름 → 항상 JSONB 사용

-- 예시: 상품의 속성이 제품마다 다를 때 JSONB 활용
CREATE TABLE products (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(200) NOT NULL,
    attributes JSONB        -- 유연한 속성 저장 (제품마다 다른 필드 가능)
);

-- 데이터 삽입
INSERT INTO products (name, attributes) VALUES
('맥북 프로',  '{"color": "silver", "storage": 512, "ram": 16, "ports": ["usb-c", "hdmi"]}'),
('아이패드',   '{"color": "space gray", "storage": 256, "cellular": true}'),
('에어팟 프로', '{"color": "white", "battery_hours": 6, "noise_canceling": true}');
```

### JSONB 조회 연산자

```sql
-- -> 연산자: JSON 타입으로 반환
SELECT attributes -> 'color' FROM products;         -- "silver" (따옴표 포함)

-- ->> 연산자: 텍스트 타입으로 반환 (비교에 주로 사용)
SELECT attributes ->> 'color' FROM products;        -- silver (따옴표 없음)

-- 중첩 경로 접근
SELECT attributes -> 'ports' -> 0 FROM products;   -- "usb-c" (배열 첫 번째)
SELECT attributes #> '{ports, 0}' FROM products;   -- 경로 배열로 접근

-- 필터링
SELECT * FROM products WHERE attributes ->> 'color' = 'silver';

-- @> 연산자: 포함 여부 (해당 키-값 쌍이 있는지)
SELECT * FROM products WHERE attributes @> '{"ram": 16}';

-- ? 연산자: 키 존재 여부
SELECT * FROM products WHERE attributes ? 'cellular';  -- cellular 키가 있는 것만

-- 숫자 비교 (캐스팅 필요)
SELECT * FROM products
WHERE (attributes ->> 'storage')::INTEGER > 256;
```

### JSONB 수정

```sql
-- || 연산자: 새 필드 추가 또는 기존 필드 덮어쓰기
UPDATE products
SET attributes = attributes || '{"battery": "100Wh"}'
WHERE id = 1;

-- - 연산자: 키 제거
UPDATE products
SET attributes = attributes - 'color'
WHERE id = 1;

-- jsonb_set: 특정 경로의 값 변경
UPDATE products
SET attributes = jsonb_set(attributes, '{color}', '"gold"')
WHERE id = 1;
```

### JSONB 인덱스

```sql
-- GIN 인덱스: JSONB 전체 검색에 최적 (@>, ?, ?| 등 연산자 사용 시 빠름)
CREATE INDEX idx_products_attributes ON products USING GIN(attributes);

-- 특정 경로만 인덱싱 (더 작고 빠름)
CREATE INDEX idx_products_color ON products((attributes ->> 'color'));

-- GIN 인덱스가 있으면 아래 쿼리가 자동으로 최적화됨
SELECT * FROM products WHERE attributes @> '{"ram": 16}';   -- 빠름!
```

---

## 배열 타입

```sql
-- 태그 같은 목록 데이터를 별도 테이블 없이 저장할 때
CREATE TABLE posts (
    id    BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    tags  TEXT[]    -- 텍스트 배열
);

INSERT INTO posts (title, tags) VALUES
('Java 입문',    ARRAY['java', 'programming', 'backend']),
('Spring Boot',  '{spring, java, framework}');    -- 다른 문법

-- 배열 접근 (인덱스는 1부터 시작! 0 아님)
SELECT tags[1] FROM posts;                       -- 첫 번째 태그
SELECT array_length(tags, 1) FROM posts;         -- 배열 길이

-- 배열 필터링
SELECT * FROM posts WHERE tags @> ARRAY['java'];         -- java 포함하는 게시글
SELECT * FROM posts WHERE 'spring' = ANY(tags);          -- ANY: 배열 중 하나라도
SELECT * FROM posts WHERE tags && ARRAY['java', 'kotlin']; -- && 교집합이 있는 것

-- 배열 수정
UPDATE posts SET tags = tags || '{kotlin}' WHERE id = 1;          -- 요소 추가
UPDATE posts SET tags = array_remove(tags, 'java') WHERE id = 1;  -- 요소 제거

-- GIN 인덱스 (배열 검색 최적화)
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
```

---

## Full-Text Search — 한국어 검색의 현실

PostgreSQL에는 내장 전문 검색 기능이 있지만, 영어에 최적화되어 있습니다. 한국어는 형태소 분석이 필요해서 추가 설정이 필요합니다.

```sql
-- 기본 개념
-- tsvector: 검색 가능한 토큰 벡터 (전처리된 단어 목록)
-- tsquery: 검색 쿼리

-- 영어 예시
SELECT to_tsvector('english', 'PostgreSQL is a powerful database system');
-- 'databas':5 'postgresql':1 'power':4 'system':6
-- → 어근 추출, 불용어 제거

SELECT to_tsquery('english', 'powerful & database');
-- 'power' & 'databas'

-- @@ 연산자: 매칭 확인
SELECT to_tsvector('english', 'PostgreSQL is a powerful database system')
    @@ to_tsquery('english', 'powerful & database');
-- true

-- 한국어는 기본 설정으로 단어 분리가 안 됨
-- 해결 방법: pg_bigm, pgroonga 확장 사용 또는 LIKE + GIN 인덱스
```

### 검색 기능 구현 (영어 기준)

```sql
-- articles 테이블에 검색 벡터 컬럼 추가
CREATE TABLE articles (
    id            BIGSERIAL PRIMARY KEY,
    title         TEXT NOT NULL,
    content       TEXT NOT NULL,
    search_vector TSVECTOR    -- 미리 계산된 벡터 저장
);

-- 트리거: INSERT/UPDATE 시 자동으로 벡터 갱신
CREATE FUNCTION update_search_vector() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector = to_tsvector('english',
        COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_vector
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- GIN 인덱스 (전문 검색 성능의 핵심)
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

-- 검색 + 관련도 랭킹 + 하이라이트
SELECT
    id,
    title,
    ts_rank(search_vector, query) AS rank,   -- 관련도 점수
    ts_headline('english', content, query)   AS snippet  -- 매칭 부분 강조
FROM articles,
     to_tsquery('english', 'database & performance') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 10;
```

---

## 파티셔닝 — 대용량 테이블 분할

수천만 건 이상의 테이블을 물리적으로 나눠서 조회 성능을 향상시킵니다.

**비유:** 도서관에서 모든 책을 한 방에 두는 것(파티셔닝 없음) vs. 연도별로 다른 방에 나눠두는 것(파티셔닝). 2024년 책을 찾을 때 2024년 방만 뒤지면 됩니다.

```sql
-- 범위 파티셔닝 — 날짜 기준으로 분할
CREATE TABLE logs (
    id         BIGSERIAL,
    user_id    BIGINT,
    action     VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL   -- 파티션 키
) PARTITION BY RANGE (created_at);   -- created_at 기준으로 파티션 나눔

-- 파티션 직접 생성 (월별)
CREATE TABLE logs_2024_01 PARTITION OF logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE logs_2024_02 PARTITION OF logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 기본 파티션 (범위에 해당 안 되는 데이터 보관)
CREATE TABLE logs_default PARTITION OF logs DEFAULT;

-- 각 파티션별 인덱스 생성
CREATE INDEX ON logs_2024_01(created_at);
CREATE INDEX ON logs_2024_02(created_at);

-- 조회 — 파티션 프루닝 자동 적용 (해당 파티션만 스캔)
EXPLAIN SELECT * FROM logs
WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01';
-- -> Seq Scan on logs_2024_01  (다른 파티션은 무시됨!)

-- 오래된 파티션 삭제 (매우 빠름 — DROP TABLE 수준)
DROP TABLE logs_2023_01;   -- 인덱스까지 모두 즉시 삭제
```

```sql
-- 목록 파티셔닝 — 특정 컬럼 값 기준으로 분할
CREATE TABLE orders (
    id     BIGSERIAL,
    status VARCHAR(20) NOT NULL,
    amount NUMERIC
) PARTITION BY LIST (status);

CREATE TABLE orders_pending   PARTITION OF orders FOR VALUES IN ('PENDING');
CREATE TABLE orders_completed PARTITION OF orders FOR VALUES IN ('COMPLETED');
CREATE TABLE orders_cancelled PARTITION OF orders FOR VALUES IN ('CANCELLED');
```

---

## 유용한 PostgreSQL 전용 기능

```sql
-- generate_series: 연속 값 생성 (테스트 데이터, 날짜 범위 목록 등에 유용)
SELECT * FROM generate_series(1, 10);   -- 1, 2, ..., 10

-- 월별 날짜 목록 생성
SELECT * FROM generate_series(
    '2024-01-01'::date,
    '2024-12-31'::date,
    '1 month'::interval
);

-- 날짜/시간 함수
SELECT NOW();                                  -- 현재 시각 (타임존 포함)
SELECT CURRENT_DATE;                           -- 오늘 날짜
SELECT NOW() AT TIME ZONE 'Asia/Seoul';        -- 한국 시간
SELECT DATE_TRUNC('month', NOW());             -- 이번 달 1일 자정
SELECT EXTRACT(YEAR FROM NOW());               -- 연도 추출
SELECT NOW() - INTERVAL '7 days';             -- 7일 전

-- COALESCE: NULL 대체 (첫 번째 NULL이 아닌 값 반환)
SELECT COALESCE(nickname, username, '익명') FROM users;

-- NULLIF: 특정 값을 NULL로 변환 (0 나누기 방지 등)
SELECT NULLIF(amount, 0);   -- amount가 0이면 NULL 반환

-- STRING_AGG: 문자열 합치기
SELECT STRING_AGG(username, ', ' ORDER BY username)
FROM users;   -- "가나다, 나나나, 다다다"

-- FILTER: 조건별 집계 (CASE 없이 깔끔하게)
SELECT
    COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
    COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
    SUM(amount) FILTER (WHERE status = 'COMPLETED') AS total_amount
FROM orders;

-- RETURNING: INSERT/UPDATE/DELETE 후 결과 바로 반환
INSERT INTO users (email, username)
VALUES ('john@example.com', 'john')
RETURNING id, created_at;   -- 방금 생성된 ID를 바로 알 수 있음

UPDATE orders
SET status = 'COMPLETED', updated_at = NOW()
WHERE id = 123
RETURNING *;

-- 테이블 크기 확인
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::text)) AS total_size,
    pg_size_pretty(pg_relation_size(tablename::text)) AS table_size,
    pg_size_pretty(
        pg_total_relation_size(tablename::text) - pg_relation_size(tablename::text)
    ) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::text) DESC;
```

---

## 초보자 흔히 하는 실수

**실수 1: JSON 대신 TEXT로 JSON 문자열 저장**
```sql
-- ❌ TEXT로 저장하면 내부 값 검색 불가
CREATE TABLE products (
    settings TEXT   -- '{"theme":"dark"}' 처럼 저장
);

-- ✅ JSONB로 저장하면 내부 값으로 검색 가능
CREATE TABLE products (
    settings JSONB   -- attributes ->> 'theme' = 'dark' 검색 가능
);
```

**실수 2: 배열 인덱스 혼동 (0 vs 1)**
```sql
-- ❌ PostgreSQL 배열은 1-based!
SELECT tags[0] FROM posts;   -- 항상 NULL 반환

-- ✅
SELECT tags[1] FROM posts;   -- 첫 번째 요소
```

**실수 3: 파티션 테이블에 기본 키 잘못 설정**
```sql
-- ❌ 파티션 키가 기본 키에 포함되지 않으면 오류
CREATE TABLE logs (
    id         BIGSERIAL PRIMARY KEY,  -- 오류! created_at이 PK에 없음
    created_at TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

-- ✅ 파티션 키를 기본 키에 포함시켜야 함
CREATE TABLE logs (
    id         BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, created_at)   -- 파티션 키를 PK에 포함
) PARTITION BY RANGE (created_at);
```
