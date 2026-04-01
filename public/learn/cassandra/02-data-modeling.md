---
title: "Cassandra 데이터 모델링"
order: 2
---

## 쿼리 우선 설계 (Query-First Design)

RDB는 "데이터를 먼저 정규화하고, 이후에 쿼리를 작성"합니다. Cassandra는 반대입니다. **먼저 어떤 쿼리를 실행할지 결정하고, 그에 맞게 테이블을 설계**합니다.

```
RDB: 데이터 구조 → 정규화 → 쿼리 작성
Cassandra: 쿼리 패턴 → 테이블 설계 → (비정규화 허용)
```

하나의 쿼리 패턴에 하나의 테이블을 만드는 것이 일반적입니다.

---

## Primary Key 구조

Cassandra의 Primary Key는 두 부분으로 구성됩니다.

```cql
PRIMARY KEY ((partition_key), clustering_key1, clustering_key2)
--           ↑ 파티션 키      ↑ 클러스터링 키 (정렬 순서 결정)
```

### 파티션 키 (Partition Key)
- 데이터가 **어느 노드에 저장될지** 결정
- 해시 함수를 통해 토큰으로 변환
- 동일한 파티션 키의 데이터는 같은 노드에 저장
- **절대 범위 쿼리 불가** — `WHERE partition_key > x` 불가

### 클러스터링 키 (Clustering Key)
- 파티션 내에서 **데이터를 정렬**하는 기준
- 범위 쿼리 가능: `WHERE clustering_key >= x AND clustering_key <= y`
- 정렬 방향 지정 가능 (`ASC`, `DESC`)

---

## 실전 모델링 예시

### 예시: 메시지 서비스

**요구사항:**
1. 특정 채팅방의 최신 메시지 N개 조회
2. 특정 메시지 이후의 메시지 조회 (페이징)

```cql
-- 채팅방 메시지 테이블
CREATE TABLE messages (
    room_id    UUID,                           -- 파티션 키: 채팅방 ID
    created_at TIMESTAMP,                      -- 클러스터링 키: 생성 시각 (내림차순)
    message_id UUID,                           -- 클러스터링 키: 메시지 ID (중복 방지)
    sender_id  UUID,
    content    TEXT,
    PRIMARY KEY ((room_id), created_at, message_id)
) WITH CLUSTERING ORDER BY (created_at DESC, message_id DESC);

-- 최신 메시지 10개 조회
SELECT * FROM messages
WHERE room_id = ?
LIMIT 10;

-- 특정 시각 이전 메시지 조회 (페이징)
SELECT * FROM messages
WHERE room_id = ?
  AND created_at < '2024-01-15 12:00:00'
LIMIT 10;
```

### 예시: 사용자별 주문 내역

**요구사항:**
1. 특정 사용자의 최근 주문 조회
2. 특정 기간의 주문 조회

```cql
CREATE TABLE orders_by_user (
    user_id    UUID,
    order_date DATE,
    order_id   UUID,
    status     TEXT,
    total      DECIMAL,
    PRIMARY KEY ((user_id), order_date, order_id)
) WITH CLUSTERING ORDER BY (order_date DESC, order_id DESC);

-- 특정 사용자의 최근 30일 주문
SELECT * FROM orders_by_user
WHERE user_id = ?
  AND order_date >= '2024-01-01'
  AND order_date <= '2024-01-31';
```

---

## 복합 파티션 키

파티션이 너무 커지는 것을 막기 위해 파티션 키를 복합으로 구성합니다.

```cql
-- ❌ 문제: user_id 하나로 파티션 — 데이터가 무한정 커질 수 있음
CREATE TABLE events (
    user_id    UUID,
    event_time TIMESTAMP,
    event_type TEXT,
    PRIMARY KEY ((user_id), event_time)
);

-- ✅ 개선: user_id + 연월로 파티션 크기 제한
CREATE TABLE events_by_month (
    user_id    UUID,
    year_month TEXT,        -- '2024-01' 형태
    event_time TIMESTAMP,
    event_type TEXT,
    PRIMARY KEY ((user_id, year_month), event_time)
) WITH CLUSTERING ORDER BY (event_time DESC);

-- 2024년 1월 이벤트 조회
SELECT * FROM events_by_month
WHERE user_id = ?
  AND year_month = '2024-01';
```

---

## 비정규화 — 같은 데이터를 여러 테이블에

Cassandra에서는 쿼리 패턴마다 별도의 테이블을 만들고 데이터를 중복 저장합니다.

```cql
-- 쿼리 1: 사용자 ID로 프로필 조회
CREATE TABLE users_by_id (
    user_id  UUID PRIMARY KEY,
    username TEXT,
    email    TEXT,
    bio      TEXT
);

-- 쿼리 2: 이메일로 사용자 조회 (로그인)
CREATE TABLE users_by_email (
    email    TEXT PRIMARY KEY,
    user_id  UUID,
    username TEXT,
    password_hash TEXT
);

-- 쿼리 3: 사용자명으로 조회 (검색)
CREATE TABLE users_by_username (
    username TEXT PRIMARY KEY,
    user_id  UUID,
    email    TEXT
);

-- 데이터 삽입 시 모든 테이블에 동시에 삽입 (배치 권장)
BEGIN BATCH
  INSERT INTO users_by_id (user_id, username, email) VALUES (?, ?, ?);
  INSERT INTO users_by_email (email, user_id, username) VALUES (?, ?, ?);
  INSERT INTO users_by_username (username, user_id, email) VALUES (?, ?, ?);
APPLY BATCH;
```

---

## Hot Partition 피하기

파티션 키가 편향되면 특정 노드에 부하가 집중됩니다.

```cql
-- ❌ Hot Partition 예시: 인기 게시글의 좋아요
-- post_id = 'viral_post' → 모든 좋아요가 한 파티션에!
CREATE TABLE likes (
    post_id UUID,
    user_id UUID,
    PRIMARY KEY ((post_id), user_id)
);

-- ✅ 해결: 버킷 분산
CREATE TABLE likes_bucketed (
    post_id UUID,
    bucket  INT,    -- 0~9 랜덤 버킷
    user_id UUID,
    PRIMARY KEY ((post_id, bucket), user_id)
);

-- 쓰기: 랜덤 버킷에 저장
INSERT INTO likes_bucketed (post_id, bucket, user_id)
VALUES (?, ?, ?);  -- bucket = random(0, 9)

-- 읽기: 모든 버킷에서 합산 (애플리케이션에서 처리)
SELECT COUNT(*) FROM likes_bucketed WHERE post_id = ? AND bucket = 0;
SELECT COUNT(*) FROM likes_bucketed WHERE post_id = ? AND bucket = 1;
-- ... 0~9 모두 합산
```

---

## 데이터 모델링 체크리스트

```
✅ 파티션 키 선택
  - 카디널리티가 충분히 높은가?
  - 데이터가 고르게 분산되는가?
  - 파티션 크기가 100MB~1GB를 넘지 않는가?

✅ 클러스터링 키 선택
  - 쿼리의 WHERE/ORDER BY 조건과 일치하는가?
  - 정렬 방향(ASC/DESC)이 올바른가?

✅ 쿼리 패턴 검증
  - 파티션 키를 항상 WHERE에 포함하는가?
  - ALLOW FILTERING 없이 쿼리 가능한가?
  - 클러스터링 키 순서대로 WHERE 조건을 작성하는가?
```
