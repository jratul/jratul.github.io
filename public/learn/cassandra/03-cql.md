---
title: "CQL 기초"
order: 3
---

## CQL이란?

CQL(Cassandra Query Language)은 SQL과 문법이 유사하지만 동작 방식은 근본적으로 다릅니다. SQL처럼 생겼지만 **JOIN, 서브쿼리, 임의 WHERE 조건이 불가**합니다.

```bash
# cqlsh 접속
cqlsh localhost 9042

# 또는 도커로 실행
docker run -d --name cassandra cassandra:4.1
docker exec -it cassandra cqlsh
```

---

## Keyspace DDL

```cql
-- Keyspace 생성
CREATE KEYSPACE IF NOT EXISTS my_app
WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'datacenter1': 3    -- 3개 복제본
}
AND durable_writes = true;

-- Keyspace 선택
USE my_app;

-- Keyspace 목록
DESCRIBE KEYSPACES;

-- Keyspace 수정 (복제 인수 변경)
ALTER KEYSPACE my_app
WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': 5};

-- Keyspace 삭제
DROP KEYSPACE IF EXISTS my_app;
```

---

## Table DDL

```cql
-- 테이블 생성
CREATE TABLE IF NOT EXISTS users (
    user_id   UUID,
    email     TEXT,
    username  TEXT,
    created_at TIMESTAMP,
    is_active BOOLEAN,
    tags      SET<TEXT>,        -- 컬렉션 타입
    metadata  MAP<TEXT, TEXT>,
    PRIMARY KEY (user_id)
) WITH comment = '사용자 테이블'
  AND gc_grace_seconds = 864000    -- 10일 (삭제 후 tombstone 유지 기간)
  AND default_time_to_live = 0;    -- 0 = 영구 보존

-- 테이블 구조 확인
DESCRIBE TABLE users;

-- 컬럼 추가
ALTER TABLE users ADD phone TEXT;

-- 컬럼 삭제 (타입 변경은 불가)
ALTER TABLE users DROP phone;

-- 테이블 삭제
DROP TABLE IF EXISTS users;

-- 테이블 전체 데이터 삭제 (구조는 유지)
TRUNCATE TABLE users;
```

---

## 데이터 타입

```cql
-- 기본 타입
uuid        -- 128bit UUID (java.util.UUID)
timeuuid    -- 시간 기반 UUID (정렬 가능)
text / varchar -- UTF-8 문자열
int         -- 32bit 정수
bigint      -- 64bit 정수
float       -- 32bit 부동소수
double      -- 64bit 부동소수
decimal     -- 가변 정밀도 (금융 데이터)
boolean
timestamp   -- 날짜+시간 (밀리초)
date        -- 날짜만
time        -- 시간만
blob        -- 바이너리 데이터
inet        -- IP 주소
duration    -- 기간

-- 컬렉션 타입
SET<TEXT>               -- 중복 없는 집합
LIST<INT>               -- 순서 있는 목록 (중복 허용)
MAP<TEXT, TEXT>         -- 키-값 쌍
FROZEN<LIST<TEXT>>      -- 불변 컬렉션 (인덱스 가능)

-- 사용자 정의 타입 (UDT)
CREATE TYPE address (
    street TEXT,
    city   TEXT,
    zip    TEXT
);

CREATE TABLE users (
    user_id UUID PRIMARY KEY,
    home_address FROZEN<address>
);
```

---

## DML — 삽입/수정/삭제

```cql
-- INSERT
INSERT INTO users (user_id, email, username, created_at, is_active)
VALUES (uuid(), 'hong@example.com', '홍길동', toTimestamp(now()), true);

-- TTL 지정 (초 단위, 86400 = 1일)
INSERT INTO sessions (session_id, user_id, data)
VALUES (uuid(), ?, ?)
USING TTL 86400;

-- Upsert (INSERT = UPSERT in Cassandra)
-- 동일 PK가 있으면 업데이트, 없으면 삽입
INSERT INTO users (user_id, email) VALUES (?, ?);

-- IF NOT EXISTS — 존재하지 않을 때만 삽입 (경량 트랜잭션)
INSERT INTO users (user_id, email) VALUES (?, ?)
IF NOT EXISTS;

-- UPDATE
UPDATE users
SET email = 'new@example.com', is_active = false
WHERE user_id = ?;

-- 컬렉션 업데이트
UPDATE users SET tags = tags + {'vip', 'premium'} WHERE user_id = ?;   -- SET 추가
UPDATE users SET tags = tags - {'trial'} WHERE user_id = ?;              -- SET 제거
UPDATE users SET metadata['key'] = 'value' WHERE user_id = ?;           -- MAP 항목

-- TTL 변경
UPDATE users USING TTL 3600 SET email = ? WHERE user_id = ?;

-- DELETE
DELETE FROM users WHERE user_id = ?;                         -- 행 삭제
DELETE email FROM users WHERE user_id = ?;                   -- 특정 컬럼만 삭제
DELETE tags['vip'] FROM users WHERE user_id = ?;             -- MAP/SET 항목 삭제

-- 범위 삭제 (클러스터링 키)
DELETE FROM messages
WHERE room_id = ?
  AND created_at < '2024-01-01';
```

---

## SELECT

```cql
-- 기본 조회
SELECT * FROM users WHERE user_id = ?;
SELECT user_id, email, username FROM users WHERE user_id = ?;

-- IN 조건 (같은 파티션 키 여러 개)
SELECT * FROM users WHERE user_id IN (?, ?, ?);

-- 클러스터링 키 범위 조회
SELECT * FROM messages
WHERE room_id = ?
  AND created_at >= '2024-01-01'
  AND created_at < '2024-02-01'
ORDER BY created_at DESC
LIMIT 20;

-- 집계 함수 (파티션 키 필수)
SELECT COUNT(*) FROM messages WHERE room_id = ?;
SELECT MIN(created_at), MAX(created_at) FROM messages WHERE room_id = ?;

-- 토큰 함수로 풀 스캔 (운영 중 사용 주의)
SELECT * FROM users WHERE token(user_id) > token(?) LIMIT 100;

-- ALLOW FILTERING — 강제 풀 스캔 (프로덕션 절대 금지)
-- ❌ 절대 사용 금지
SELECT * FROM users WHERE email = 'test@test.com' ALLOW FILTERING;
```

---

## BATCH

```cql
-- Logged Batch: 원자성 보장 (단, 같은 파티션 권장)
BEGIN BATCH
  INSERT INTO users_by_id (user_id, username, email) VALUES (?, ?, ?);
  INSERT INTO users_by_email (email, user_id) VALUES (?, ?);
  INSERT INTO users_by_username (username, user_id) VALUES (?, ?);
APPLY BATCH;

-- Unlogged Batch: 원자성 없음, 같은 파티션의 대량 삽입에 사용
BEGIN UNLOGGED BATCH
  INSERT INTO events (user_id, event_time, type) VALUES (?, ?, ?);
  INSERT INTO events (user_id, event_time, type) VALUES (?, ?, ?);
APPLY BATCH;
```

> **주의:** Batch는 성능 최적화 도구가 아닙니다. 여러 파티션에 걸친 Logged Batch는 오히려 코디네이터에 부하를 줍니다. 같은 파티션 내 여러 쓰기 또는 다중 테이블 원자성이 필요할 때만 사용하세요.

---

## 유용한 함수들

```cql
-- UUID 생성
SELECT uuid();      -- 랜덤 UUID
SELECT now();       -- 현재 시간 기반 timeuuid

-- 시간 변환
SELECT toTimestamp(now());          -- timeuuid → timestamp
SELECT toDate(now());               -- timeuuid → date
SELECT dateOf(timeuuid_col);        -- timeuuid에서 날짜 추출
SELECT unixTimestampOf(timeuuid_col); -- timeuuid에서 Unix 타임스탬프 추출

-- TTL / WriteTime 확인
SELECT TTL(email) FROM users WHERE user_id = ?;         -- 남은 TTL (초)
SELECT WRITETIME(email) FROM users WHERE user_id = ?;   -- 마지막 쓰기 시각
```
