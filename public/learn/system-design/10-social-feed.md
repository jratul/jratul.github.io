---
title: "실전 설계: 소셜 피드 시스템"
order: 10
---

## 문제 정의

트위터/인스타그램 같은 소셜 피드 시스템을 설계합니다.

**핵심 기능:**
- 포스트 작성 (텍스트, 이미지)
- 팔로우/언팔로우
- 홈 피드: 내가 팔로우한 사람들의 최신 포스트
- 좋아요, 댓글
- 실시간 알림

---

## 요구사항 정의

```
기능적 요구사항:
─────────────────────────────────────
1. 포스트 작성/삭제
2. 팔로우/언팔로우
3. 홈 피드 조회 (팔로잉 포스트, 최신순)
4. 좋아요 토글
5. 댓글 작성
6. 푸시 알림 (좋아요, 댓글, 팔로우)

비기능적 요구사항:
─────────────────────────────────────
1. DAU: 3억 명
2. 읽기:쓰기 = 100:1 (피드 조회 >> 포스트 작성)
3. 피드 로드: < 200ms
4. 가용성: 99.99%

규모 추정:
─────────────────────────────────────
일 포스트: 3억 × 2개 = 6억 개
쓰기 QPS: 6억 / 86,400 ≈ 7,000 QPS
읽기 QPS: 7,000 × 100 = 700,000 QPS
미디어 저장: 6억 × 평균 200KB = 120TB/일
```

---

## 데이터 모델

```sql
-- 사용자
CREATE TABLE users (
    id BIGINT PRIMARY KEY,            -- Snowflake ID
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    bio TEXT,
    profile_image_url TEXT,
    follower_count INT DEFAULT 0,     -- 비정규화: 매번 COUNT 조회 방지
    following_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 포스트
CREATE TABLE posts (
    id BIGINT PRIMARY KEY,            -- Snowflake ID (시간순 정렬 가능)
    user_id BIGINT NOT NULL REFERENCES users(id),
    content TEXT,
    image_urls TEXT[],                -- 이미지 URL 배열 (최대 10개)
    like_count INT DEFAULT 0,         -- 비정규화: 좋아요 수 캐싱
    comment_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 사용자별 포스트 조회 최적화
CREATE INDEX idx_posts_user_created ON posts(user_id, id DESC);

-- 팔로우 관계
CREATE TABLE follows (
    follower_id BIGINT NOT NULL REFERENCES users(id),   -- 팔로우 하는 사람
    following_id BIGINT NOT NULL REFERENCES users(id),  -- 팔로우 받는 사람
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- 팔로워 목록 조회 최적화
CREATE INDEX idx_follows_following ON follows(following_id);

-- 좋아요
CREATE TABLE likes (
    user_id BIGINT NOT NULL,
    post_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)  -- 중복 좋아요 방지
);

-- 알림
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,   -- LIKE, COMMENT, FOLLOW
    actor_id BIGINT NOT NULL,    -- 알림을 발생시킨 사용자
    post_id BIGINT,              -- 관련 포스트 (없으면 NULL)
    read_at TIMESTAMP,           -- 읽은 시각 (NULL = 읽지 않음)
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient
    ON notifications(recipient_id, created_at DESC);
```

---

## 핵심 설계: 피드 생성 전략

**가장 중요한 설계 결정: 피드를 언제 만들까?**

```
방법 1: Fan-out on Write (쓰기 시점에 피드 생성)
포스트 작성 시:
  → 내 팔로워 목록 조회 (10명)
  → 10명 각각의 피드 큐에 post_id 추가
  → Redis에 저장

피드 조회 시:
  → 내 피드 큐에서 바로 읽기 → 빠름!

단점: 팔로워 1000만 명인 셀럽이 포스트 쓰면?
  → 1000만 번 Redis 쓰기 → 지연!

방법 2: Fan-out on Read (읽기 시점에 피드 생성)
포스트 작성 시:
  → DB에만 저장

피드 조회 시:
  → 팔로잉 목록 조회
  → 각 사람의 최신 포스트 조회
  → 병합 및 정렬 → 느림!

해결책: 하이브리드
일반 사용자 (팔로워 < 10,000): Fan-out on Write
셀럽 (팔로워 ≥ 10,000): Fan-out on Read (조회 시 병합)
```

---

## 피드 서비스 구현

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class FeedService {

    private final RedisTemplate<String, Long> redisTemplate;
    private final PostRepository postRepository;
    private final FollowRepository followRepository;

    private static final int CELEBRITY_THRESHOLD = 10_000;  // 셀럽 기준
    private static final int FEED_MAX_SIZE = 1000;           // 피드 최대 보관 수

    // ─────────────────────────────────────────
    // 포스트 작성 시 팔로워 피드 업데이트
    // ─────────────────────────────────────────
    @Async  // 비동기: 팔로워가 많아도 포스트 응답에 영향 없음
    public void fanout(Long postId, Long authorId) {
        long followerCount = followRepository.countByFollowingId(authorId);

        if (followerCount >= CELEBRITY_THRESHOLD) {
            // 셀럽: 팬아웃 안 함 (조회 시 별도 처리)
            log.info("셀럽 포스트 - 팬아웃 건너뜀: authorId={}, followers={}",
                authorId, followerCount);
            return;
        }

        // 팔로워 목록 조회 (배치로 처리)
        List<Long> followerIds = followRepository.findFollowerIds(authorId);

        log.info("팬아웃 시작: postId={}, followerCount={}", postId, followerIds.size());

        // 팔로워 피드에 추가 (병렬 처리)
        followerIds.parallelStream().forEach(followerId -> {
            String feedKey = "feed:" + followerId;
            // Redis List에 포스트 ID 추가 (최신순 → LPUSH)
            redisTemplate.opsForList().leftPush(feedKey, postId);
            // 최대 1000개만 유지 (오래된 것 자동 삭제)
            redisTemplate.opsForList().trim(feedKey, 0, FEED_MAX_SIZE - 1);
        });

        log.info("팬아웃 완료: postId={}", postId);
    }

    // ─────────────────────────────────────────
    // 홈 피드 조회
    // ─────────────────────────────────────────
    public List<PostResponse> getHomeFeed(Long userId, int size, Long cursor) {
        // 1. 일반 사용자 포스트: Redis 피드 큐에서 조회
        List<Long> feedIds = getFeedPostIds(userId, size * 2, cursor);

        // 2. 팔로잉 셀럽의 포스트: DB에서 직접 조회
        List<Long> celebrityPostIds = getCelebrityPosts(userId, size);

        // 3. 병합 + Snowflake ID 기반 시간순 정렬
        // (Snowflake ID는 시간을 포함하므로 ID 기준 정렬 = 시간 정렬)
        List<Long> allIds = Stream.concat(feedIds.stream(), celebrityPostIds.stream())
            .distinct()
            .sorted(Comparator.reverseOrder())  // 최신 ID 먼저
            .limit(size)
            .toList();

        // 4. 포스트 상세 조회 (캐시 활용)
        return postCacheService.findByIds(allIds).stream()
            .map(p -> PostResponse.from(p, isLikedBy(p.getId(), userId)))
            .toList();
    }

    private List<Long> getFeedPostIds(Long userId, int count, Long cursor) {
        String feedKey = "feed:" + userId;
        long endIndex = count - 1;
        List<Long> ids = redisTemplate.opsForList().range(feedKey, 0, endIndex);

        if (ids == null || ids.isEmpty()) {
            // Redis 피드가 비어있으면 DB에서 복구
            return rebuildFeedFromDb(userId, count);
        }

        // 커서 기반 페이지네이션
        if (cursor != null) {
            int cursorIdx = ids.indexOf(cursor);
            if (cursorIdx >= 0) {
                ids = ids.subList(cursorIdx + 1, ids.size());
            }
        }

        return ids;
    }

    private List<Long> getCelebrityPosts(Long userId, int size) {
        // 팔로잉 목록에서 셀럽 찾기
        List<Long> celebIds = followRepository.findCelebrityFollowings(
            userId, CELEBRITY_THRESHOLD);

        if (celebIds.isEmpty()) return List.of();

        // 셀럽들의 최근 포스트 조회
        return postRepository.findRecentPostIdsByAuthors(celebIds, size);
    }

    // 피드 캐시 재구축 (사용자가 오래 접속 안 했을 때)
    private List<Long> rebuildFeedFromDb(Long userId, int size) {
        List<Long> followingIds = followRepository.findFollowingIds(userId);
        return postRepository.findRecentPostIdsByAuthors(followingIds, size);
    }
}
```

---

## 포스트 캐싱

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class PostCacheService {

    private final RedisTemplate<String, Post> redisTemplate;
    private final PostRepository postRepository;
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    // 여러 포스트를 한 번에 조회 (Cache-Aside 패턴)
    public List<Post> findByIds(List<Long> ids) {
        if (ids.isEmpty()) return List.of();

        // 1. Redis에서 일괄 조회 (MGET)
        List<String> keys = ids.stream()
            .map(id -> "post:" + id)
            .toList();
        List<Post> cached = redisTemplate.opsForValue().multiGet(keys);

        // 2. 캐시 미스 ID 찾기
        List<Long> missIds = new ArrayList<>();
        for (int i = 0; i < ids.size(); i++) {
            if (cached.get(i) == null) {
                missIds.add(ids.get(i));
            }
        }

        // 3. 미스된 것만 DB에서 조회
        if (!missIds.isEmpty()) {
            Map<Long, Post> fromDb = postRepository.findAllById(missIds).stream()
                .collect(Collectors.toMap(Post::getId, p -> p));

            // Redis에 저장
            Map<String, Post> toCache = fromDb.entrySet().stream()
                .collect(Collectors.toMap(
                    e -> "post:" + e.getKey(),
                    Map.Entry::getValue
                ));
            redisTemplate.opsForValue().multiSet(toCache);
            // TTL 설정 (각각 따로 설정 필요)
            toCache.keySet().forEach(k ->
                redisTemplate.expire(k, CACHE_TTL));

            // 결과 병합
            for (int i = 0; i < ids.size(); i++) {
                if (cached.get(i) == null) {
                    cached.set(i, fromDb.get(ids.get(i)));
                }
            }
        }

        // 원본 ID 순서 유지, null 제거
        return cached.stream()
            .filter(Objects::nonNull)
            .toList();
    }
}
```

---

## 좋아요 시스템

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class LikeService {

    private final RedisTemplate<String, String> redisTemplate;
    private final LikeRepository likeRepository;
    private final KafkaTemplate<String, LikeEvent> kafkaTemplate;

    // 좋아요 토글 (좋아요 → 취소 또는 취소 → 좋아요)
    public LikeResult toggle(Long userId, Long postId) {
        String likeKey = "likes:" + postId;     // 이 포스트를 좋아요한 사람들
        String member = String.valueOf(userId);

        // Redis Set: 중복 없이 사용자 ID 관리
        Long added = redisTemplate.opsForSet().add(likeKey, member);

        if (added != null && added > 0) {
            // 새로 추가됨 = 좋아요
            likeRepository.save(new Like(userId, postId));
            // 포스트의 좋아요 수 증가
            redisTemplate.opsForValue().increment("post:" + postId + ":likes");

            // 포스트 주인에게 알림 발행
            kafkaTemplate.send("notifications",
                LikeEvent.of(userId, postId, "LIKE"));

            log.info("좋아요: userId={}, postId={}", userId, postId);
            return LikeResult.LIKED;

        } else {
            // 이미 있었음 = 좋아요 취소
            redisTemplate.opsForSet().remove(likeKey, member);
            likeRepository.deleteByUserIdAndPostId(userId, postId);
            redisTemplate.opsForValue().decrement("post:" + postId + ":likes");

            log.info("좋아요 취소: userId={}, postId={}", userId, postId);
            return LikeResult.UNLIKED;
        }
    }

    // 좋아요 여부 확인
    public boolean isLiked(Long userId, Long postId) {
        return Boolean.TRUE.equals(
            redisTemplate.opsForSet().isMember(
                "likes:" + postId, String.valueOf(userId))
        );
    }

    // 좋아요 수 조회
    public long getLikeCount(Long postId) {
        String count = redisTemplate.opsForValue().get("post:" + postId + ":likes");
        if (count != null) return Long.parseLong(count);

        // Redis에 없으면 DB에서 조회
        return likeRepository.countByPostId(postId);
    }
}
```

---

## 알림 시스템

```java
// 알림 이벤트 발행
@Component
@RequiredArgsConstructor
public class NotificationPublisher {

    private final KafkaTemplate<String, NotificationEvent> kafkaTemplate;

    public void notify(NotificationType type, Long actorId,
                       Long recipientId, Long postId) {
        kafkaTemplate.send("notifications",
            String.valueOf(recipientId),  // 파티션 키: 수신자 ID
            NotificationEvent.builder()
                .type(type)
                .actorId(actorId)
                .recipientId(recipientId)
                .postId(postId)
                .occurredAt(Instant.now())
                .build()
        );
    }
}

// 알림 처리 (Kafka Consumer)
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationConsumer {

    private final NotificationRepository notificationRepository;
    private final SseEmitterService sseEmitterService;     // SSE 실시간 전송
    private final PushNotificationService pushService;      // 모바일 푸시

    @KafkaListener(topics = "notifications",
                   groupId = "notification-processor",
                   concurrency = "5")
    public void handleNotification(@Payload NotificationEvent event,
                                   Acknowledgment ack) {
        try {
            // 1. DB 저장 (알림 내역 보관)
            Notification notification = notificationRepository.save(
                Notification.from(event));

            // 2. 사용자가 접속 중이면 SSE로 실시간 전송
            sseEmitterService.send(
                event.getRecipientId(),
                "NOTIFICATION",
                NotificationResponse.from(notification)
            );

            // 3. 접속 안 했으면 푸시 알림
            pushService.sendIfOffline(event.getRecipientId(), notification);

            ack.acknowledge();

        } catch (Exception e) {
            log.error("알림 처리 실패: event={}", event, e);
        }
    }
}
```

---

## 미디어 처리 파이프라인

```
이미지 업로드 플로우:
──────────────────────────────────────────────────
1. 클라이언트 → API: "이미지 올릴 URL 주세요" (파일명, contentType)
2. API → S3: Presigned Upload URL 생성
3. API → 클라이언트: Presigned URL 반환
4. 클라이언트 → S3: 원본 이미지 직접 업로드
5. S3 업로드 완료 이벤트 → Lambda 트리거
6. Lambda: 이미지 리사이징 (다양한 해상도)
7. Lambda: CDN 캐시 무효화
8. 클라이언트 → API: "업로드 완료, 이 key 사용할게요"

이미지 저장 구조:
s3://media-bucket/
  images/
    {userId}/
      {imageId}/
        original.jpg      (원본)
        thumbnail_100.jpg (100×100 썸네일)
        medium_400.jpg    (400px 와이드)
        large_1200.jpg    (1200px 전체)

CDN URL 패턴:
https://cdn.myapp.com/images/{userId}/{imageId}/medium_400.jpg

장점:
- 서버 메모리 사용 없음 (직접 업로드)
- Lambda로 비동기 리사이징 (업로드 속도에 영향 없음)
- CloudFront CDN으로 전 세계 빠른 배포
```

---

## 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                   소셜 피드 아키텍처                         │
│                                                             │
│  [클라이언트]                                               │
│       │                                                     │
│  [CloudFront CDN] ← 미디어 파일 캐시                        │
│       │                                                     │
│  [API Gateway] ← JWT 인증, Rate Limiting                    │
│       │                                                     │
│  ┌────┼─────────────────┐                                   │
│  ▼    ▼                 ▼                                   │
│ 피드  포스트           미디어                               │
│ 서비스 서비스          서비스 → S3                          │
│  │    │                                                     │
│  │    ▼                                                     │
│  │  [PostgreSQL] ← 원본 데이터                              │
│  │    │ (이벤트)                                            │
│  │    ▼                                                     │
│  │  [Kafka] → [검색 인덱서] → Elasticsearch                 │
│  │              [알림 처리] → SSE / 푸시                    │
│  │                                                          │
│  ▼                                                          │
│ [Redis Cluster] ← 피드 큐, 좋아요, 포스트 캐시              │
└─────────────────────────────────────────────────────────────┘
```

---

## 트레이드오프 분석

```
피드 생성 전략:
──────────────────────────────────────────────────
Fan-out on Write
장점: 읽기 빠름 (Redis에서 바로 조회)
단점: 셀럽 포스트 시 수백만 번 Redis 쓰기
      팔로워 많은 사람 팔로우 취소 시 피드 정리 복잡

Fan-out on Read
장점: 쓰기 단순
단점: 읽기 느림 (팔로잉 수가 많을수록 쿼리 증가)

하이브리드 (Instagram, Twitter 방식)
장점: 일반 사용자(빠른 읽기) + 셀럽(느린 팬아웃) 최적화
단점: 구현 복잡도 증가, 셀럽 기준 동적 관리 필요

좋아요 카운트 저장:
──────────────────────────────────────────────────
DB 실시간 카운트 (COUNT(*))
장점: 정확
단점: 느림 (인기 포스트는 초당 수천 번 업데이트)

Redis 카운터 + 주기적 DB 동기화
장점: 빠름, DB 부하 없음
단점: 일시적 부정확 (Redis 장애 시 손실 가능)
      DB 동기화 배치 필요
```

---

## 초보자가 자주 하는 실수

**실수 1: 모든 사용자에게 Fan-out on Write 적용**

```
셀럽 (팔로워 1000만)이 포스트 쓰면:
→ Redis에 1000만 번 쓰기
→ 수분 지연 발생
→ 다른 사용자 피드도 영향

해결:
팔로워 < 10,000: Fan-out on Write
팔로워 >= 10,000: Fan-out on Read (조회 시 병합)
```

**실수 2: 좋아요 수를 매번 COUNT(*) 조회**

```sql
-- 나쁜 예: 인기 포스트에 초당 수천 번 COUNT 쿼리
SELECT COUNT(*) FROM likes WHERE post_id = 1;

-- 좋은 예: Redis 카운터 사용
GET post:1:likes  -- Redis에서 O(1)
```

**실수 3: 피드 Redis 키에 만료 시간 미설정**

```java
// 나쁜 예: 피드 캐시가 무한히 쌓임
redisTemplate.opsForList().leftPush("feed:" + userId, postId);

// 좋은 예: 최대 크기 제한 (trim) + 오래된 피드는 자동 삭제
redisTemplate.opsForList().leftPush("feed:" + userId, postId);
redisTemplate.opsForList().trim("feed:" + userId, 0, FEED_MAX_SIZE - 1);
// 또는 expire 설정
redisTemplate.expire("feed:" + userId, Duration.ofDays(30));
```
