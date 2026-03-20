---
title: "PostgreSQL 심화"
order: 8
---

# PostgreSQL 심화

JSONB, 파티셔닝, Full-text Search 등 PostgreSQL 고급 기능.

---

## JSONB

```sql
-- JSONB vs JSON
-- JSON: 텍스트 저장, 조회 시 파싱
-- JSONB: 바이너리 저장, 인덱스 지원 → 대부분 JSONB 사용

CREATE TABLE products (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    attributes  JSONB                   -- 유연한 속성 저장
);

-- 데이터 삽입
INSERT INTO products (name, attributes) VALUES
('맥북 프로', '{"color": "silver", "storage": 512, "ram": 16, "ports": ["usb-c", "hdmi"]}'),
('아이패드', '{"color": "space gray", "storage": 256, "cellular": true}');

-- JSONB 조회
SELECT attributes -> 'color' FROM products;          -- JSON 타입 반환
SELECT attributes ->> 'color' FROM products;         -- 텍스트 타입 반환
SELECT attributes -> 'storage' FROM products WHERE id = 1;
SELECT attributes #> '{ports, 0}' FROM products;    -- 중첩 경로

-- 필터링
SELECT * FROM products WHERE attributes ->> 'color' = 'silver';
SELECT * FROM products WHERE attributes @> '{"ram": 16}';  -- 포함 여부
SELECT * FROM products WHERE attributes ? 'cellular';       -- 키 존재 여부
SELECT * FROM products WHERE attributes -> 'storage' > '256';

-- 수정
UPDATE products
SET attributes = attributes || '{"battery": "100Wh"}'  -- 병합
WHERE id = 1;

UPDATE products
SET attributes = attributes - 'color'  -- 키 제거
WHERE id = 1;

UPDATE products
SET attributes = jsonb_set(attributes, '{color}', '"gold"')
WHERE id = 1;
```

```sql
-- JSONB 인덱스
-- GIN 인덱스 (JSONB 검색에 최적)
CREATE INDEX idx_products_attributes ON products USING GIN(attributes);

-- 특정 경로만 인덱스
CREATE INDEX idx_products_color ON products((attributes ->> 'color'));

-- 이후 쿼리 최적화됨
SELECT * FROM products WHERE attributes @> '{"ram": 16}';
```

---

## 배열 타입

```sql
CREATE TABLE posts (
    id      BIGSERIAL PRIMARY KEY,
    title   VARCHAR(200) NOT NULL,
    tags    TEXT[]                    -- 텍스트 배열
);

INSERT INTO posts (title, tags) VALUES
('Java 입문', ARRAY['java', 'programming', 'backend']),
('Spring Boot', '{spring, java, framework}');

-- 배열 조회
SELECT tags[1] FROM posts;          -- 1-based 인덱스!
SELECT array_length(tags, 1) FROM posts;

-- 배열 필터링
SELECT * FROM posts WHERE tags @> ARRAY['java'];     -- java 포함
SELECT * FROM posts WHERE 'spring' = ANY(tags);      -- ANY
SELECT * FROM posts WHERE tags && ARRAY['java', 'kotlin'];  -- 교집합

-- 배열 수정
UPDATE posts SET tags = tags || '{kotlin}' WHERE id = 1;  -- 추가
UPDATE posts SET tags = array_remove(tags, 'java') WHERE id = 1;  -- 제거

-- GIN 인덱스
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
```

---

## Full-Text Search (전문 검색)

```sql
-- 기본 개념
-- tsvector: 검색 가능한 토큰 벡터
-- tsquery:  검색 쿼리

-- 변환 예시
SELECT to_tsvector('english', 'PostgreSQL is a powerful database system');
-- 'databas':5 'postgresql':1 'power':4 'system':6

SELECT to_tsquery('english', 'powerful & database');

-- 검색 (@@: 매칭 연산자)
SELECT to_tsvector('english', 'PostgreSQL is a powerful database system')
    @@ to_tsquery('english', 'powerful & database');
-- true

-- 한국어는 별도 설정 필요
-- pg_bigm, pgroonga 등 확장 사용 또는 LIKE + GIN 인덱스

-- 테이블에서 전문 검색
CREATE TABLE articles (
    id      BIGSERIAL PRIMARY KEY,
    title   TEXT NOT NULL,
    content TEXT NOT NULL,
    search_vector TSVECTOR  -- 미리 계산된 벡터
);

-- 트리거로 자동 업데이트
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

-- GIN 인덱스 (전문 검색 필수)
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

-- 검색 + 랭킹
SELECT
    id,
    title,
    ts_rank(search_vector, query) AS rank,
    ts_headline('english', content, query) AS snippet  -- 하이라이트
FROM articles, to_tsquery('english', 'database & performance') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 10;
```

---

## 파티셔닝

대용량 테이블을 물리적으로 분할. 조회 성능 향상.

```sql
-- 범위 파티셔닝 (날짜 기준)
CREATE TABLE logs (
    id          BIGSERIAL,
    user_id     BIGINT,
    action      VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

-- 파티션 생성 (월별)
CREATE TABLE logs_2024_01 PARTITION OF logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE logs_2024_02 PARTITION OF logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 기본 파티션 (위 범위 외 데이터)
CREATE TABLE logs_default PARTITION OF logs DEFAULT;

-- 각 파티션별 인덱스
CREATE INDEX ON logs_2024_01(created_at);
CREATE INDEX ON logs_2024_02(created_at);

-- 조회 (파티션 프루닝 자동 적용)
SELECT * FROM logs
WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01';
-- 2024_01 파티션만 스캔

-- 오래된 파티션 삭제 (빠름!)
DROP TABLE logs_2023_01;  -- 파티션 삭제

-- 목록 파티셔닝
CREATE TABLE orders (
    id      BIGSERIAL,
    status  VARCHAR(20) NOT NULL,
    amount  NUMERIC
) PARTITION BY LIST (status);

CREATE TABLE orders_pending   PARTITION OF orders FOR VALUES IN ('PENDING');
CREATE TABLE orders_completed PARTITION OF orders FOR VALUES IN ('COMPLETED');
CREATE TABLE orders_cancelled PARTITION OF orders FOR VALUES IN ('CANCELLED');
```

---

## 유용한 PostgreSQL 기능

```sql
-- generate_series: 시리즈 생성
SELECT * FROM generate_series(1, 10);
SELECT * FROM generate_series(
    '2024-01-01'::date,
    '2024-12-31'::date,
    '1 month'::interval
);

-- 날짜/시간 함수
SELECT NOW();
SELECT CURRENT_DATE;
SELECT NOW() AT TIME ZONE 'Asia/Seoul';
SELECT DATE_TRUNC('month', NOW());      -- 월 시작
SELECT EXTRACT(YEAR FROM NOW());
SELECT NOW() - INTERVAL '7 days';

-- 문자열 함수
SELECT COALESCE(NULL, 'default');       -- NULL 대체
SELECT NULLIF(amount, 0);              -- 0이면 NULL
SELECT STRING_AGG(name, ', ' ORDER BY name);

-- 윈도우 함수 FILTER
SELECT
    COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
    COUNT(*) FILTER (WHERE status = 'PENDING') AS pending
FROM orders;

-- RETURNING — INSERT/UPDATE/DELETE 결과 반환
INSERT INTO users (email, name) VALUES ('john@example.com', 'John')
RETURNING id, created_at;

UPDATE orders SET status = 'COMPLETED'
WHERE id = 123
RETURNING *;

-- 테이블 크기 확인
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::text)) AS total_size,
    pg_size_pretty(pg_relation_size(tablename::text)) AS table_size,
    pg_size_pretty(pg_total_relation_size(tablename::text) -
        pg_relation_size(tablename::text)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::text) DESC;
```
