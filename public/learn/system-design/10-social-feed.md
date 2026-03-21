---
title: "실전 설계: 소셜 피드 시스템"
order: 10
---

# 실전 설계: 소셜 피드 시스템

트위터/인스타그램 피드 시스템 설계.

---

## 요구사항 정의

```
기능적 요구사항:
— 포스트 작성 (텍스트, 이미지)
— 팔로우/언팔로우
— 홈 피드 (팔로잉 포스트)
— 좋아요, 댓글
— 알림

비기능적 요구사항:
— DAU 3억 명
— 읽기:쓰기 = 100:1 (피드 조회 >> 작성)
— 피드 로드 < 200ms
— 가용성 99.99%

규모 추정:
— 일 포스트: 3억 × 2 = 6억 개
— 쓰기 QPS: 6억 / 86,400 ≈ 7,000 QPS
— 읽기 QPS: 7,000 × 100 = 700,000 QPS
— 미디어 저장: 6억 × 이미지 평균 200KB = 120TB/일
```

---

## 데이터 모델

```sql
-- 사용자
CREATE TABLE users (
    id BIGINT PRIMARY KEY,    -- Snowflake ID
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    bio TEXT,
    profile_image_url TEXT,
    follower_count INT DEFAULT 0,
    following_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 포스트
CREATE TABLE posts (
    id BIGINT PRIMARY KEY,    -- Snowflake ID (시간 정렬)
    user_id BIGINT NOT NULL REFERENCES users(id),
    content TEXT,             -- 최대 280자
    image_urls TEXT[],        -- S3 URL 배열
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_posts_user_created ON posts(user_id, id DESC);

-- 팔로우 관계
CREATE TABLE follows (
    follower_id BIGINT NOT NULL REFERENCES users(id),
    following_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX idx_follows_following ON follows(following_id);  -- 팔로워 목록

-- 좋아요
CREATE TABLE likes (
    user_id BIGINT NOT NULL,
    post_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

-- 알림
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,  -- LIKE, COMMENT, FOLLOW
    actor_id BIGINT NOT NULL,
    post_id BIGINT,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
```

---

## 피드 생성 전략

```
팔로워 수에 따른 하이브리드:

일반 사용자 (팔로워 < 10,000): Fan-out on Write
  포스트 작성
     ↓
  팔로워 목록 조회 (DB)
     ↓
  각 팔로워의 피드에 post_id 추가 (Redis)

셀럽 (팔로워 ≥ 10,000): Fan-out on Read
  포스트는 DB에만 저장
  피드 조회 시 셀럽 포스트 별도 조회 후 병합
```

```java
@Service
@RequiredArgsConstructor
public class FeedService {

    private final RedisTemplate<String, Long> redisTemplate;
    private final PostRepository postRepository;
    private final FollowRepository followRepository;
    private static final int CELEBRITY_THRESHOLD = 10_000;
    private static final int FEED_MAX_SIZE = 1000;

    // 포스트 작성 시 피드 업데이트
    public void fanout(Long postId, Long authorId) {
        long followerCount = followRepository.countByFollowingId(authorId);

        if (followerCount >= CELEBRITY_THRESHOLD) {
            // 셀럽: 피드에 저장 안 함 (조회 시 병합)
            return;
        }

        // 일반 사용자: 팔로워 피드에 추가
        List<Long> followerIds = followRepository.findFollowerIds(authorId);

        // 병렬 처리
        followerIds.parallelStream().forEach(followerId -> {
            String feedKey = "feed:" + followerId;
            redisTemplate.opsForList().leftPush(feedKey, postId);
            redisTemplate.opsForList().trim(feedKey, 0, FEED_MAX_SIZE - 1);
        });
    }

    // 피드 조회
    public List<Post> getHomeFeed(Long userId, int size, Long cursor) {
        // 1. Redis에서 post_id 목록 조회
        List<Long> feedIds = getFeedIds(userId, size, cursor);

        // 2. 팔로잉 셀럽 조회 후 병합
        List<Long> celebrityPostIds = getCelebrityPosts(userId, size);

        // 3. 병합 및 정렬 (Snowflake ID는 시간순 정렬 가능)
        List<Long> allIds = mergeAndSort(feedIds, celebrityPostIds, size);

        // 4. 포스트 상세 조회 (Redis 캐시 활용)
        return postRepository.findByIds(allIds);
    }

    private List<Long> getFeedIds(Long userId, int size, Long cursor) {
        String key = "feed:" + userId;
        List<Long> ids = redisTemplate.opsForList().range(key, 0, size * 2L);

        if (cursor != null && ids != null) {
            int cursorIdx = ids.indexOf(cursor);
            ids = cursorIdx >= 0 ? ids.subList(cursorIdx + 1, ids.size()) : ids;
        }

        return ids != null ? ids.stream().limit(size).toList() : List.of();
    }
}
```

---

## 포스트 상세 캐싱

```java
@Service
@RequiredArgsConstructor
public class PostCacheService {

    private final RedisTemplate<String, Post> redisTemplate;
    private final PostRepository postRepository;

    public List<Post> findByIds(List<Long> ids) {
        if (ids.isEmpty()) return List.of();

        // 1. Redis에서 일괄 조회
        List<String> keys = ids.stream()
            .map(id -> "post:" + id)
            .toList();

        List<Post> cached = redisTemplate.opsForValue().multiGet(keys);

        // 2. 캐시 미스 ID 확인
        List<Long> missIds = new ArrayList<>();
        for (int i = 0; i < ids.size(); i++) {
            if (cached.get(i) == null) {
                missIds.add(ids.get(i));
            }
        }

        // 3. DB에서 미스 데이터 조회
        if (!missIds.isEmpty()) {
            List<Post> fromDb = postRepository.findAllById(missIds);

            // 캐시 저장
            Map<String, Post> toCache = fromDb.stream()
                .collect(Collectors.toMap(
                    p -> "post:" + p.getId(),
                    p -> p
                ));
            redisTemplate.opsForValue().multiSet(toCache);

            // 결과 병합
            Map<Long, Post> dbMap = fromDb.stream()
                .collect(Collectors.toMap(Post::getId, p -> p));
            for (int i = 0; i < ids.size(); i++) {
                if (cached.get(i) == null) {
                    cached.set(i, dbMap.get(ids.get(i)));
                }
            }
        }

        // 원본 순서 유지하며 null 제거
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
public class LikeService {

    private final RedisTemplate<String, String> redisTemplate;
    private final LikeRepository likeRepository;

    // 좋아요 토글
    public LikeResult toggle(Long userId, Long postId) {
        String key = "likes:" + postId;
        String member = String.valueOf(userId);

        // Redis Set으로 관리
        Long result = redisTemplate.opsForSet().add(key, member);

        if (result != null && result > 0) {
            // 좋아요 추가
            likeRepository.save(new Like(userId, postId));
            redisTemplate.opsForValue().increment("post:" + postId + ":likeCount");
            return LikeResult.LIKED;
        } else {
            // 좋아요 취소
            redisTemplate.opsForSet().remove(key, member);
            likeRepository.delete(userId, postId);
            redisTemplate.opsForValue().decrement("post:" + postId + ":likeCount");
            return LikeResult.UNLIKED;
        }
    }

    // 좋아요 여부 확인
    public boolean isLiked(Long userId, Long postId) {
        return Boolean.TRUE.equals(
            redisTemplate.opsForSet().isMember("likes:" + postId, String.valueOf(userId))
        );
    }

    // 좋아요 수 조회 (Redis 카운터)
    public long getLikeCount(Long postId) {
        String count = redisTemplate.opsForValue().get("post:" + postId + ":likeCount");
        return count != null ? Long.parseLong(count) : 0;
    }
}
```

---

## 알림 시스템

```java
// 알림 발행
@Component
@RequiredArgsConstructor
public class NotificationPublisher {

    private final KafkaTemplate<String, NotificationEvent> kafkaTemplate;

    public void publishLikeNotification(Long likerUserId, Long postOwnerId, Long postId) {
        kafkaTemplate.send("notifications",
            String.valueOf(postOwnerId),
            NotificationEvent.builder()
                .type(NotificationType.LIKE)
                .actorId(likerUserId)
                .recipientId(postOwnerId)
                .postId(postId)
                .build()
        );
    }
}

// 알림 처리 (WebSocket 또는 푸시)
@Component
@RequiredArgsConstructor
public class NotificationConsumer {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;  // WebSocket
    private final PushService pushService;

    @KafkaListener(topics = "notifications", groupId = "notification-processor")
    public void handleNotification(NotificationEvent event) {
        // DB 저장
        Notification notification = notificationRepository.save(
            Notification.from(event)
        );

        // WebSocket 실시간 전송 (접속 중인 경우)
        messagingTemplate.convertAndSendToUser(
            String.valueOf(event.getRecipientId()),
            "/queue/notifications",
            NotificationResponse.from(notification)
        );

        // 푸시 알림 (오프라인)
        pushService.send(event.getRecipientId(), notification);
    }
}
```

---

## 미디어 처리

```
이미지 업로드 플로우:

1. 클라이언트 → API: Presigned URL 요청
2. API → S3: Presigned URL 생성
3. API → 클라이언트: Presigned URL 반환
4. 클라이언트 → S3: 직접 업로드
5. S3 업로드 완료 이벤트 → Lambda
6. Lambda: 이미지 리사이징 (다양한 해상도)
7. Lambda: CDN 무효화

이미지 저장 구조:
s3://media-bucket/
  images/
    {userId}/
      {imageId}/
        original.jpg
        thumbnail_100.jpg   (100x100)
        medium_400.jpg      (400x400)
        large_1200.jpg      (1200px)

CDN URL: https://cdn.myapp.com/images/{userId}/{imageId}/large_1200.jpg
```
