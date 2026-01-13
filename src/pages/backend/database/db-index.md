---
title: "데이터베이스 인덱스(Index)"
date: "2026-01-13"
tags: ["database", "index", "performance", "backend", "sql"]
excerpt: "데이터베이스 인덱스의 동작 원리와 B-Tree 구조, 인덱스 사용 전략을 알아봅니다."
---

# 데이터베이스 인덱스(Index)

인덱스는 데이터베이스에서 **검색 속도를 향상시키기 위한 자료구조**입니다. 책의 색인처럼 데이터의 위치를 빠르게 찾을 수 있게 합니다.

## 인덱스가 없다면?

```sql
-- users 테이블에서 email로 검색
SELECT * FROM users WHERE email = 'user@example.com';
```

**인덱스 없이 검색 (Full Table Scan):**
```
Row 1: email = 'alice@example.com'   ❌
Row 2: email = 'bob@example.com'     ❌
Row 3: email = 'user@example.com'    ✅ 찾음!
Row 4: email = 'david@example.com'   ❌
...
Row 1,000,000: 모두 확인 필요
```

**시간 복잡도:** O(N) - 최악의 경우 모든 행 확인

---

## 인덱스가 있다면?

```sql
-- email 컬럼에 인덱스 생성
CREATE INDEX idx_users_email ON users(email);

-- 이제 검색이 빠름
SELECT * FROM users WHERE email = 'user@example.com';
```

**인덱스로 검색 (Index Scan):**
```
B-Tree 탐색:
Root → 'p' 분기 → 't' 분기 → 'u' 분기 → 'user@example.com' 찾음!
```

**시간 복잡도:** O(log N) - 트리 높이만큼만 탐색

---

## B-Tree 구조

대부분의 데이터베이스는 **B-Tree** 또는 **B+Tree**를 사용합니다.

### B-Tree 예시

```
                [50]
               /    \
          [20, 30]   [70, 90]
         /   |   \   /   |   \
    [10] [25] [35] [60] [80] [95]
```

**특징:**
- **균형 트리**: 모든 리프 노드의 깊이가 같음
- **정렬 유지**: 키가 정렬된 상태 유지
- **다중 키**: 한 노드에 여러 키 저장
- **빠른 검색**: O(log N)

---

### B+Tree (대부분의 DB가 사용)

```
               [50, 80]
              /    |    \
        [20, 30] [60, 70] [90, 95]
            ↓       ↓        ↓
    [리프 노드들은 연결 리스트로 연결]
    [10][20][25][30]...[90][95]
```

**B-Tree와의 차이:**
- 리프 노드에만 실제 데이터 포인터 저장
- 리프 노드들이 연결 리스트로 연결
- 범위 검색에 유리

---

## 인덱스 종류

### 1. 클러스터드 인덱스 (Clustered Index)

**테이블당 하나만** 존재하며, 실제 데이터가 인덱스 순서로 정렬됩니다.

```sql
CREATE TABLE users (
    id INT PRIMARY KEY,  -- 클러스터드 인덱스 자동 생성
    name VARCHAR(50)
);
```

**특징:**
- Primary Key에 자동 생성
- 테이블 데이터 자체가 정렬됨
- 검색 빠름, 삽입/수정/삭제 느림

**디스크 저장 형태:**
```
[id: 1, name: 'Alice']
[id: 2, name: 'Bob']
[id: 3, name: 'Charlie']
↑ 실제로 id 순서로 저장됨
```

---

### 2. 논클러스터드 인덱스 (Non-Clustered Index)

**여러 개** 생성 가능하며, 별도의 인덱스 공간에 저장됩니다.

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

**특징:**
- 여러 개 생성 가능
- 별도 저장 공간 필요
- 인덱스 → 클러스터드 인덱스 키 → 실제 데이터

**구조:**
```
인덱스 테이블:
[email: 'alice@...', id: 1] → 실제 데이터
[email: 'bob@...', id: 2]   → 실제 데이터
[email: 'charlie@...', id: 3] → 실제 데이터
```

---

### 3. 복합 인덱스 (Composite Index)

**여러 컬럼**을 조합한 인덱스입니다.

```sql
CREATE INDEX idx_users_name_age ON users(name, age);
```

**사용 예:**
```sql
-- ✅ 인덱스 사용
SELECT * FROM users WHERE name = 'Alice' AND age = 25;

-- ✅ 인덱스 사용 (name만)
SELECT * FROM users WHERE name = 'Alice';

-- ❌ 인덱스 사용 안 됨 (age만)
SELECT * FROM users WHERE age = 25;
```

**규칙:** 인덱스 **왼쪽부터** 사용해야 함 (Leftmost Prefix Rule)

---

### 4. 유니크 인덱스 (Unique Index)

**중복 값을 허용하지 않는** 인덱스입니다.

```sql
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- 또는
ALTER TABLE users ADD CONSTRAINT UNIQUE (email);
```

**특징:**
- 중복 방지
- NULL 허용 (대부분의 DB)
- Primary Key는 자동으로 Unique Index

---

### 5. 전문 검색 인덱스 (Full-Text Index)

**텍스트 검색**을 위한 인덱스입니다.

```sql
CREATE FULLTEXT INDEX idx_posts_content ON posts(content);

-- 사용
SELECT * FROM posts
WHERE MATCH(content) AGAINST('검색어');
```

**용도:**
- 긴 텍스트 검색
- LIKE '%keyword%' 대체
- 자연어 검색

---

## 인덱스 사용 시기

### ✅ 인덱스를 만들어야 할 때

#### 1. WHERE 절에 자주 사용되는 컬럼

```sql
-- email로 자주 검색
SELECT * FROM users WHERE email = 'user@example.com';

-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
```

---

#### 2. JOIN에 사용되는 컬럼

```sql
-- posts.user_id로 JOIN
SELECT * FROM posts p
JOIN users u ON p.user_id = u.id;

-- 인덱스 생성
CREATE INDEX idx_posts_user_id ON posts(user_id);
```

---

#### 3. ORDER BY에 사용되는 컬럼

```sql
-- created_at으로 정렬
SELECT * FROM posts ORDER BY created_at DESC;

-- 인덱스 생성
CREATE INDEX idx_posts_created_at ON posts(created_at);
```

---

#### 4. GROUP BY에 사용되는 컬럼

```sql
-- category로 그룹화
SELECT category, COUNT(*) FROM posts GROUP BY category;

-- 인덱스 생성
CREATE INDEX idx_posts_category ON posts(category);
```

---

### ❌ 인덱스를 만들지 말아야 할 때

#### 1. 데이터가 적은 테이블

```sql
-- 행이 100개 미만
-- Full Scan이 더 빠를 수 있음
```

---

#### 2. 값의 종류가 적은 컬럼 (Cardinality가 낮음)

```sql
-- gender: 'M', 'F' 두 개뿐
-- 전체 행의 50%씩 → 인덱스 효과 없음
CREATE INDEX idx_users_gender ON users(gender);  -- ❌
```

---

#### 3. 자주 변경되는 컬럼

```sql
-- view_count: 매번 업데이트
-- 인덱스도 매번 재정렬 필요 → 성능 저하
CREATE INDEX idx_posts_view_count ON posts(view_count);  -- ❌
```

---

#### 4. 너무 긴 문자열

```sql
-- TEXT 타입의 긴 컬럼
-- 인덱스 크기가 너무 큼
CREATE INDEX idx_posts_content ON posts(content);  -- ❌

-- 대신 전문 검색 인덱스 사용
CREATE FULLTEXT INDEX idx_posts_content ON posts(content);  -- ✅
```

---

## 실행 계획 확인

### MySQL

```sql
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
```

**결과:**
```
+----+-------------+-------+------+----------------+------+---------+-------+------+-------+
| id | select_type | table | type | possible_keys  | key  | key_len | ref   | rows | Extra |
+----+-------------+-------+------+----------------+------+---------+-------+------+-------+
|  1 | SIMPLE      | users | ref  | idx_users_email| idx_users_email| 202 | const |    1 | NULL  |
+----+-------------+-------+------+----------------+------+---------+-------+------+-------+
```

**주요 컬럼:**
- **type**:
  - `ALL` → Full Table Scan (느림)
  - `index` → Full Index Scan
  - `range` → 범위 검색
  - `ref` → 인덱스로 검색
  - `const` → Primary Key 검색 (가장 빠름)
- **key**: 사용된 인덱스
- **rows**: 예상 검색 행 수

---

### PostgreSQL

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';
```

---

## 인덱스 최적화 전략

### 1. 복합 인덱스 순서

```sql
-- ✅ 선택도가 높은 컬럼을 앞에
CREATE INDEX idx_users_email_name ON users(email, name);

-- ❌ 선택도가 낮은 컬럼을 앞에
CREATE INDEX idx_users_gender_email ON users(gender, email);
```

**선택도(Selectivity):** 유니크한 값의 비율
- 높음: email (거의 유니크)
- 낮음: gender (2-3개뿐)

---

### 2. Covering Index

**검색에 필요한 모든 컬럼을 인덱스에 포함**하면 테이블 접근 없이 인덱스만으로 처리 가능합니다.

```sql
-- 자주 실행되는 쿼리
SELECT id, name, email FROM users WHERE email = 'user@example.com';

-- Covering Index 생성
CREATE INDEX idx_users_email_cover ON users(email, id, name);
```

**효과:** 인덱스 → 테이블 접근 없이 바로 결과 반환

---

### 3. 인덱스 힌트 사용

```sql
-- MySQL
SELECT * FROM users USE INDEX (idx_users_email)
WHERE email = 'user@example.com';

-- 인덱스 강제
SELECT * FROM users FORCE INDEX (idx_users_email)
WHERE email = 'user@example.com';
```

---

### 4. 부분 인덱스 (Partial Index)

```sql
-- PostgreSQL: 조건부 인덱스
CREATE INDEX idx_users_active_email
ON users(email)
WHERE is_active = true;
```

**효과:** 활성 사용자만 인덱싱 → 크기 감소

---

## 인덱스의 단점

### 1. 저장 공간 사용

```sql
-- 인덱스도 디스크 공간 차지
CREATE INDEX idx_users_email ON users(email);  -- 추가 저장 공간 필요
```

---

### 2. 쓰기 성능 저하

```sql
-- INSERT
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
-- → 테이블 + 모든 인덱스 업데이트 필요

-- UPDATE
UPDATE users SET email = 'new@example.com' WHERE id = 1;
-- → 인덱스 재정렬 필요

-- DELETE
DELETE FROM users WHERE id = 1;
-- → 인덱스에서도 삭제 필요
```

**트레이드오프:** 읽기 빠름 ↔ 쓰기 느림

---

### 3. 인덱스 선택 오버헤드

```sql
-- 인덱스가 너무 많으면
-- 옵티마이저가 최적 인덱스 선택에 시간 소요
```

---

## 인덱스 관리

### 인덱스 생성

```sql
-- 일반 인덱스
CREATE INDEX idx_name ON table_name(column_name);

-- 복합 인덱스
CREATE INDEX idx_name ON table_name(col1, col2);

-- 유니크 인덱스
CREATE UNIQUE INDEX idx_name ON table_name(column_name);

-- 내림차순 인덱스
CREATE INDEX idx_name ON table_name(column_name DESC);
```

---

### 인덱스 조회

```sql
-- MySQL
SHOW INDEX FROM users;

-- PostgreSQL
\d users

-- 모든 DB
SELECT * FROM information_schema.statistics
WHERE table_name = 'users';
```

---

### 인덱스 삭제

```sql
DROP INDEX idx_name ON table_name;
```

---

### 인덱스 재구성

```sql
-- MySQL
OPTIMIZE TABLE users;

-- PostgreSQL
REINDEX TABLE users;
```

**필요한 경우:**
- 대량 데이터 변경 후
- 인덱스 단편화 발생 시

---

## 실전 예제

### 예제 1: 게시판 검색

```sql
-- 게시글 테이블
CREATE TABLE posts (
    id INT PRIMARY KEY,
    user_id INT,
    title VARCHAR(200),
    content TEXT,
    category VARCHAR(50),
    created_at DATETIME,
    view_count INT
);

-- 인덱스 전략
CREATE INDEX idx_posts_user_id ON posts(user_id);           -- JOIN용
CREATE INDEX idx_posts_category_created ON posts(category, created_at);  -- 목록 조회
CREATE INDEX idx_posts_created_at ON posts(created_at DESC); -- 최신순 정렬
CREATE FULLTEXT INDEX idx_posts_title_content ON posts(title, content); -- 검색용
```

---

### 예제 2: 쇼핑몰 상품 검색

```sql
-- 상품 테이블
CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(200),
    category_id INT,
    price DECIMAL(10,2),
    stock INT,
    is_active BOOLEAN,
    created_at DATETIME
);

-- 인덱스 전략
CREATE INDEX idx_products_category_price ON products(category_id, price);  -- 카테고리별 가격 정렬
CREATE INDEX idx_products_active_created ON products(is_active, created_at);  -- 활성 상품 최신순
CREATE INDEX idx_products_price ON products(price) WHERE is_active = true;  -- 부분 인덱스
```

---

### 예제 3: 복합 인덱스 활용

```sql
-- 주문 검색
SELECT * FROM orders
WHERE user_id = 1
  AND status = 'completed'
  AND created_at >= '2024-01-01'
ORDER BY created_at DESC;

-- 최적 인덱스
CREATE INDEX idx_orders_user_status_created
ON orders(user_id, status, created_at DESC);
```

---

## 성능 비교

### 인덱스 없음 vs 있음

```sql
-- 테스트: 1,000,000 행
SELECT * FROM users WHERE email = 'user@example.com';
```

| 구분 | 인덱스 없음 | 인덱스 있음 |
|-----|-----------|----------|
| 실행 시간 | 500ms | 5ms |
| 검색 방식 | Full Table Scan | Index Scan |
| 검색 행 수 | 1,000,000 | 1 |

**100배 빠름!**

---

## 주의사항

### 1. LIKE 패턴

```sql
-- ✅ 인덱스 사용
SELECT * FROM users WHERE email LIKE 'user%';

-- ❌ 인덱스 사용 안 됨
SELECT * FROM users WHERE email LIKE '%user%';
```

---

### 2. 함수 사용

```sql
-- ❌ 인덱스 사용 안 됨
SELECT * FROM users WHERE UPPER(email) = 'USER@EXAMPLE.COM';

-- ✅ 인덱스 사용
SELECT * FROM users WHERE email = 'user@example.com';
```

---

### 3. OR 조건

```sql
-- ❌ 인덱스 비효율
SELECT * FROM users WHERE name = 'Alice' OR age = 25;

-- ✅ UNION으로 분리
SELECT * FROM users WHERE name = 'Alice'
UNION
SELECT * FROM users WHERE age = 25;
```

---

### 4. 묵시적 형 변환

```sql
-- ❌ 인덱스 사용 안 됨 (문자열 컬럼에 숫자 비교)
SELECT * FROM users WHERE phone = 1234567890;

-- ✅ 인덱스 사용
SELECT * FROM users WHERE phone = '1234567890';
```

---

## 요약

1. **인덱스**: 검색 속도 향상을 위한 자료구조 (B-Tree/B+Tree)
2. **종류**: 클러스터드, 논클러스터드, 복합, 유니크, 전문 검색
3. **생성 기준**: WHERE, JOIN, ORDER BY, GROUP BY에 자주 사용
4. **생성 주의**: Cardinality 낮음, 자주 변경, 테이블 작음 → 비추천
5. **복합 인덱스**: 왼쪽부터 사용 (Leftmost Prefix Rule)
6. **단점**: 저장 공간, 쓰기 성능 저하
7. **실행 계획**: EXPLAIN으로 인덱스 사용 확인
8. **최적화**: Covering Index, 선택도 고려, 부분 인덱스

인덱스는 읽기 성능을 크게 향상시키지만, 적절한 컬럼에만 선택적으로 사용해야 합니다.