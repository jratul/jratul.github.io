---
title: "데이터 모델링 실전"
order: 7
---

## 데이터 모델링이란 무엇인가?

데이터 모델링은 "서비스에서 어떤 데이터를 어떻게 저장하고, 테이블들이 어떻게 연결될지" 설계하는 작업입니다.

**왜 필요한가?** 잘못 설계된 데이터 모델은 나중에 고치기가 매우 어렵습니다. 테이블 구조를 바꾸면 그걸 쓰는 코드를 다 바꿔야 하고, 데이터 마이그레이션도 해야 합니다. 집 설계도를 잘못 그리면 집을 다 짓고 나서 고치기 어려운 것과 같습니다.

**비유:** 테이블 관계는 학교에서 학생과 수업의 관계와 같습니다. 한 학생이 여러 수업을 듣고, 한 수업에 여러 학생이 있습니다. 이것이 M:N 관계입니다.

---

## 모델링 순서

```
1. 요구사항 분석
   → "어떤 기능이 필요한가?" 에서 핵심 엔티티 파악
   → 각 엔티티의 속성 정의
   → 엔티티 간 관계 파악

2. 개념적 설계 (ERD)
   → 엔티티, 관계, 카디널리티(1:1, 1:N, M:N)를 다이어그램으로 표현

3. 논리적 설계
   → 실제 테이블, 컬럼, 기본 키, 외래 키, 제약 조건 설계

4. 물리적 설계
   → 인덱스, 파티셔닝, 반정규화 등 성능 최적화
```

---

## 실전: 커뮤니티 서비스 설계

이런 요구사항이 있다고 가정합니다:

```
요구사항:
- 사용자가 게시글을 작성할 수 있다
- 게시글에 태그를 여러 개 붙일 수 있다 (M:N)
- 게시글에 댓글을 달 수 있다 (대댓글 포함)
- 게시글과 댓글에 좋아요를 누를 수 있다
- 사용자를 팔로우할 수 있다 (M:N)
```

---

## ERD (엔티티 관계도)

```
관계 표현:
──<  = 1:N (하나가 여럿을 가짐)
>──< = M:N (여럿이 여럿을 가짐)

users ──< posts ──< comments
  │          │          │
  │          │         (likes)
  │         (post_tags: posts M:N tags)
  │
(follows: users M:N users — 자기 자신 팔로우)
(likes: users M:N posts 또는 comments — 다형성)
```

---

## DDL — 테이블 생성

```sql
-- ① 사용자 테이블
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(50) UNIQUE NOT NULL,          -- 사용자 이름 (중복 불가)
    email         VARCHAR(255) UNIQUE NOT NULL,         -- 이메일 (중복 불가)
    password_hash VARCHAR(255) NOT NULL,                -- 비밀번호는 해시로 저장
    bio           TEXT,                                 -- 자기소개 (없을 수도 있음)
    avatar_url    VARCHAR(500),
    post_count    INTEGER NOT NULL DEFAULT 0,           -- 반정규화: 조회 성능 위해
    follower_count INTEGER NOT NULL DEFAULT 0,          -- 반정규화: 팔로워 수
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()    -- 시간대 포함 타임스탬프
);

-- ② 게시글 테이블
CREATE TABLE posts (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id), -- 작성자 (외래 키)
    title         VARCHAR(300) NOT NULL,
    content       TEXT NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED'
                  CHECK (status IN ('DRAFT', 'PUBLISHED', 'DELETED')),  -- 허용값 제한
    view_count    INTEGER NOT NULL DEFAULT 0,
    like_count    INTEGER NOT NULL DEFAULT 0,           -- 반정규화
    comment_count INTEGER NOT NULL DEFAULT 0,           -- 반정규화
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ③ 태그 테이블
CREATE TABLE tags (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(50) UNIQUE NOT NULL,
    post_count INTEGER NOT NULL DEFAULT 0    -- 반정규화: 인기 태그 정렬용
);

-- ④ 게시글-태그 연결 테이블 (M:N 관계)
-- "한 게시글은 여러 태그, 한 태그는 여러 게시글"
CREATE TABLE post_tags (
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,  -- 게시글 삭제 시 같이 삭제
    tag_id  BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)   -- 복합 기본 키: 같은 게시글-태그 조합 중복 방지
);

-- ⑤ 댓글 테이블 (계층형: 대댓글 지원)
CREATE TABLE comments (
    id         BIGSERIAL PRIMARY KEY,
    post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES users(id),
    parent_id  BIGINT REFERENCES comments(id) ON DELETE CASCADE,  -- NULL이면 원댓글, 있으면 대댓글
    content    TEXT NOT NULL,
    like_count INTEGER NOT NULL DEFAULT 0,
    depth      INTEGER NOT NULL DEFAULT 0 CHECK (depth <= 2),     -- 최대 2단계 대댓글
    status     VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ⑥ 좋아요 테이블 (다형성: 게시글 또는 댓글에 좋아요)
-- "한 테이블에서 두 가지 타입의 대상을 처리"
CREATE TABLE likes (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('POST', 'COMMENT')),  -- 대상 타입
    target_id   BIGINT NOT NULL,                                                   -- 대상 ID
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, target_type, target_id)   -- 같은 대상에 중복 좋아요 방지
);

-- ⑦ 팔로우 테이블 (M:N: users ↔ users)
CREATE TABLE follows (
    follower_id BIGINT NOT NULL REFERENCES users(id),   -- 팔로우하는 사람
    followee_id BIGINT NOT NULL REFERENCES users(id),   -- 팔로우 받는 사람
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, followee_id),
    CHECK (follower_id != followee_id)   -- 자기 자신 팔로우 방지
);
```

---

## 인덱스 설계

어떤 쿼리가 자주 실행되는지 생각하고, 그에 맞는 인덱스를 만듭니다.

```sql
-- posts: user_id로 "내가 쓴 글" 조회 시 사용
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- posts: 공개된 글 목록을 최신순으로 조회 시 사용
-- 부분 인덱스: status = 'PUBLISHED' 인 것만 인덱싱 (크기 최소화)
CREATE INDEX idx_posts_status_created ON posts(status, created_at DESC)
    WHERE status = 'PUBLISHED';

-- comments: 특정 게시글의 댓글 목록 조회
CREATE INDEX idx_comments_post_id ON comments(post_id);

-- comments: 대댓글 조회 (parent_id가 있는 것만)
CREATE INDEX idx_comments_parent_id ON comments(parent_id)
    WHERE parent_id IS NOT NULL;

-- likes: "이 게시글의 좋아요 수", "내가 좋아요 했나" 조회
CREATE INDEX idx_likes_target ON likes(target_type, target_id);

-- follows: "이 사람을 팔로우하는 사람들" 조회
CREATE INDEX idx_follows_followee ON follows(followee_id);

-- post_tags: "이 태그의 게시글들" 조회
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);
```

---

## 주요 쿼리 패턴

```sql
-- ① 피드 조회 (팔로우한 사람의 최신 게시글)
SELECT p.*, u.username, u.avatar_url
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.user_id IN (
    SELECT followee_id
    FROM follows
    WHERE follower_id = $1   -- 로그인한 사용자 ID
)
AND p.status = 'PUBLISHED'
ORDER BY p.created_at DESC
LIMIT 20;

-- ② 태그별 게시글 목록
SELECT p.*, u.username
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN post_tags pt ON p.id = pt.post_id
JOIN tags t ON pt.tag_id = t.id
WHERE t.name = 'java'
AND p.status = 'PUBLISHED'
ORDER BY p.created_at DESC
LIMIT 20;

-- ③ 댓글 + 대댓글 함께 조회 (JSON으로 중첩)
SELECT
    c1.*,
    u1.username AS user_name,
    json_agg(
        json_build_object(
            'id', c2.id,
            'content', c2.content,
            'username', u2.username,
            'created_at', c2.created_at
        ) ORDER BY c2.created_at
    ) FILTER (WHERE c2.id IS NOT NULL) AS replies   -- NULL 제거
FROM comments c1
JOIN users u1 ON c1.user_id = u1.id
LEFT JOIN comments c2 ON c2.parent_id = c1.id AND c2.status = 'ACTIVE'
LEFT JOIN users u2 ON c2.user_id = u2.id
WHERE c1.post_id = $1
  AND c1.parent_id IS NULL     -- 원댓글만 (대댓글은 replies에 포함)
  AND c1.status = 'ACTIVE'
GROUP BY c1.id, u1.username
ORDER BY c1.created_at;

-- ④ 목록 조회 시 현재 사용자의 좋아요 여부 같이 확인
SELECT
    p.*,
    EXISTS(
        SELECT 1 FROM likes
        WHERE target_type = 'POST'
          AND target_id = p.id
          AND user_id = $current_user_id
    ) AS is_liked   -- true/false
FROM posts p
WHERE p.status = 'PUBLISHED'
ORDER BY p.created_at DESC
LIMIT 20;
```

---

## 소프트 삭제 (Soft Delete)

실제로 데이터를 지우지 않고 "삭제됨" 상태로 표시하는 패턴입니다.

```sql
-- 물리적 삭제 대신 상태만 변경
UPDATE posts
SET status = 'DELETED', updated_at = NOW()
WHERE id = $1;

-- 조회 시 항상 DELETED 제외 필터 필요
SELECT * FROM posts WHERE status != 'DELETED';

-- 부분 인덱스로 효율화 (DELETED 제외하고 인덱싱)
CREATE INDEX idx_posts_published
    ON posts(created_at DESC)
    WHERE status = 'PUBLISHED';

-- View를 만들어 필터를 자동으로 적용 (실수 방지)
CREATE VIEW published_posts AS
    SELECT * FROM posts WHERE status = 'PUBLISHED';
-- 이후 published_posts로 조회하면 항상 공개된 글만 나옴

-- 소프트 삭제의 장단점
-- 장점: 실수로 지워도 복구 가능, 감사 로그(audit log)로 활용 가능
-- 단점: 쿼리마다 WHERE status 필터 필요, 인덱스 효율 저하 가능
```

---

## 반정규화 (Denormalization)

정규화된 구조는 데이터 무결성은 좋지만, 집계 쿼리가 느릴 수 있습니다. 자주 조회하는 집계값은 반정규화로 미리 계산해 저장합니다.

```sql
-- 게시글 목록에서 댓글 수, 좋아요 수를 매번 COUNT하면 느림
-- → posts 테이블에 like_count, comment_count 컬럼 미리 저장

-- 댓글 생성 시 함께 업데이트
INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3);
UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1;

-- 좋아요 취소 시 함께 업데이트
DELETE FROM likes WHERE user_id = $1 AND target_type = 'POST' AND target_id = $2;
UPDATE posts SET like_count = like_count - 1 WHERE id = $2;

-- 단점: 두 쿼리를 항상 같이 실행해야 하므로 트랜잭션 필요
-- 장점: 목록 조회 시 COUNT 쿼리 없이 빠르게 읽을 수 있음
```

---

## 초보자 흔히 하는 실수

**실수 1: 모든 관계에 ON DELETE CASCADE를 무분별하게 사용**
```sql
-- CASCADE가 없으면 참조하는 데이터가 있을 때 삭제 실패
-- CASCADE를 쓰면 부모가 삭제될 때 자식도 자동 삭제

-- 게시글 삭제 시 댓글도 삭제: OK (게시글 없는 댓글은 의미 없음)
REFERENCES posts(id) ON DELETE CASCADE

-- 사용자 삭제 시 게시글도 삭제: 신중히! (탈퇴 처리를 어떻게 할지에 따라 다름)
-- 보통은 소프트 삭제가 더 적합
```

**실수 2: 인덱스 없이 외래 키 설정**
```sql
-- 외래 키를 설정해도 자동으로 인덱스가 생기지 않음
-- user_id로 조회하는 쿼리가 풀스캔이 됨!
REFERENCES users(id)   -- 인덱스 없으면 느림

-- 반드시 인덱스를 별도로 생성
CREATE INDEX idx_posts_user_id ON posts(user_id);
```

**실수 3: NULL 처리 실수**
```sql
-- IS NULL vs = NULL 차이!
SELECT * FROM comments WHERE parent_id = NULL;    -- ❌ 항상 결과 없음
SELECT * FROM comments WHERE parent_id IS NULL;   -- ✅ 원댓글만 조회
```
