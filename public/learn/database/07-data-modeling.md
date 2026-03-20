---
title: "데이터 모델링 실전"
order: 7
---

# 데이터 모델링 실전

요구사항에서 ERD를 설계하고 구현하는 과정.

---

## 모델링 순서

```
1. 요구사항 분석
   — 핵심 엔티티 파악
   — 각 엔티티의 속성 정의
   — 엔티티 간 관계 파악

2. 개념적 설계 (ERD)
   — 엔티티, 관계, 카디널리티 표현

3. 논리적 설계
   — 테이블, 컬럼, 키, 제약 조건 설계

4. 물리적 설계
   — 인덱스, 파티셔닝, 성능 최적화
```

---

## 실전: 커뮤니티 서비스 설계

```
요구사항:
- 사용자가 게시글을 작성할 수 있다
- 게시글에 태그를 여러 개 붙일 수 있다
- 게시글에 댓글을 달 수 있다
- 댓글에 대댓글을 달 수 있다
- 게시글과 댓글에 좋아요를 누를 수 있다
- 사용자를 팔로우할 수 있다
```

---

## ERD

```
users ──< posts ──< comments
  │          │          │
  │          │         (likes)
  │         (tags)
  │
(follows: users M:N users)
(likes: users M:N posts/comments)
```

---

## DDL

```sql
-- 사용자
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(50) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bio         TEXT,
    avatar_url  VARCHAR(500),
    post_count  INTEGER NOT NULL DEFAULT 0,     -- 반정규화
    follower_count INTEGER NOT NULL DEFAULT 0,  -- 반정규화
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 게시글
CREATE TABLE posts (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    title       VARCHAR(300) NOT NULL,
    content     TEXT NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED'
                CHECK (status IN ('DRAFT', 'PUBLISHED', 'DELETED')),
    view_count  INTEGER NOT NULL DEFAULT 0,
    like_count  INTEGER NOT NULL DEFAULT 0,     -- 반정규화
    comment_count INTEGER NOT NULL DEFAULT 0,   -- 반정규화
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 태그
CREATE TABLE tags (
    id      BIGSERIAL PRIMARY KEY,
    name    VARCHAR(50) UNIQUE NOT NULL,
    post_count INTEGER NOT NULL DEFAULT 0
);

-- 게시글-태그 연결 (M:N)
CREATE TABLE post_tags (
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id  BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- 댓글 (계층형)
CREATE TABLE comments (
    id          BIGSERIAL PRIMARY KEY,
    post_id     BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    parent_id   BIGINT REFERENCES comments(id) ON DELETE CASCADE,  -- 대댓글
    content     TEXT NOT NULL,
    like_count  INTEGER NOT NULL DEFAULT 0,
    depth       INTEGER NOT NULL DEFAULT 0 CHECK (depth <= 2),  -- 최대 2단계
    status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 좋아요 (다형성: 게시글 or 댓글)
CREATE TABLE likes (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    target_type     VARCHAR(20) NOT NULL CHECK (target_type IN ('POST', 'COMMENT')),
    target_id       BIGINT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, target_type, target_id)
);

-- 팔로우 (M:N: users ↔ users)
CREATE TABLE follows (
    follower_id BIGINT NOT NULL REFERENCES users(id),
    followee_id BIGINT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, followee_id),
    CHECK (follower_id != followee_id)  -- 자기 자신 팔로우 방지
);
```

---

## 인덱스 설계

```sql
-- posts
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status_created ON posts(status, created_at DESC)
    WHERE status = 'PUBLISHED';

-- comments
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id)
    WHERE parent_id IS NOT NULL;

-- likes
CREATE INDEX idx_likes_target ON likes(target_type, target_id);

-- follows
CREATE INDEX idx_follows_followee ON follows(followee_id);

-- 태그
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);
```

---

## 주요 쿼리 패턴

```sql
-- 1. 피드 조회 (팔로우한 사람의 최신 게시글)
SELECT p.*, u.username, u.avatar_url
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.user_id IN (
    SELECT followee_id FROM follows WHERE follower_id = $1
)
AND p.status = 'PUBLISHED'
ORDER BY p.created_at DESC
LIMIT 20;

-- 2. 태그별 게시글
SELECT p.*, u.username
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN post_tags pt ON p.id = pt.post_id
JOIN tags t ON pt.tag_id = t.id
WHERE t.name = 'java'
AND p.status = 'PUBLISHED'
ORDER BY p.created_at DESC
LIMIT 20;

-- 3. 댓글 + 대댓글 (2단계)
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
    ) FILTER (WHERE c2.id IS NOT NULL) AS replies
FROM comments c1
JOIN users u1 ON c1.user_id = u1.id
LEFT JOIN comments c2 ON c2.parent_id = c1.id AND c2.status = 'ACTIVE'
LEFT JOIN users u2 ON c2.user_id = u2.id
WHERE c1.post_id = $1 AND c1.parent_id IS NULL AND c1.status = 'ACTIVE'
GROUP BY c1.id, u1.username
ORDER BY c1.created_at;

-- 4. 사용자가 좋아요 눌렀는지 확인 (목록 조회 시)
SELECT
    p.*,
    EXISTS(
        SELECT 1 FROM likes
        WHERE target_type = 'POST' AND target_id = p.id AND user_id = $current_user_id
    ) AS is_liked
FROM posts p
WHERE p.status = 'PUBLISHED'
ORDER BY p.created_at DESC
LIMIT 20;
```

---

## 소프트 삭제 (Soft Delete)

```sql
-- 물리적 삭제 대신 상태 변경
UPDATE posts SET status = 'DELETED', updated_at = NOW() WHERE id = $1;

-- 조회 시 항상 필터
SELECT * FROM posts WHERE status != 'DELETED';

-- 부분 인덱스로 효율화
CREATE INDEX idx_posts_published ON posts(created_at DESC)
WHERE status = 'PUBLISHED';

-- 장점: 복구 가능, 감사 로그
-- 단점: 쿼리마다 필터 필요, 인덱스 비효율
-- 해결: RLS(Row Level Security) 또는 View 활용
CREATE VIEW published_posts AS
SELECT * FROM posts WHERE status = 'PUBLISHED';
```
