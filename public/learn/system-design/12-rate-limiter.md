---
title: "실전 설계: 채팅 / 실시간 시스템"
order: 12
---

# 실전 설계: 채팅 / 실시간 시스템

카카오톡 같은 실시간 채팅 시스템 설계.

---

## 요구사항 정의

```
기능적 요구사항:
— 1:1 채팅
— 그룹 채팅 (최대 500명)
— 온라인 상태 표시
— 읽음 확인
— 메시지 전송 확인 (✓✓)
— 이미지/파일 전송

비기능적 요구사항:
— DAU: 5천만 명
— 메시지 지연: < 100ms
— 5년 메시지 보관
— 99.99% 가용성

규모 추정:
— 일 메시지: 5천만 × 40 = 20억 건
— 피크 QPS: 20억 / 86,400 ≈ 23,000 QPS
— 저장: 20억 × 100B = 200GB/일
— 5년: 200GB × 365 × 5 ≈ 360TB
```

---

## 실시간 통신 방식

```
폴링 (Polling):
클라이언트가 주기적으로 서버에 새 메시지 요청
단점: 불필요한 요청, 지연

롱 폴링 (Long Polling):
서버가 새 메시지 있을 때까지 응답 보류
단점: 연결 자원 소비

WebSocket:
양방향 영구 연결
장점: 실시간, 저지연
단점: 서버 상태 유지 (수평 확장 복잡)

SSE (Server-Sent Events):
서버 → 클라이언트 단방향 스트림
장점: 간단, HTTP 기반
단점: 단방향 (클라이언트 → 서버는 별도 HTTP)

채팅: WebSocket 사용
(양방향 실시간 통신 필요)
```

---

## 데이터 모델

```sql
-- 채팅방
CREATE TABLE chat_rooms (
    id BIGINT PRIMARY KEY,
    type VARCHAR(20),  -- DIRECT, GROUP
    name VARCHAR(200), -- 그룹 채팅방 이름
    created_at TIMESTAMP DEFAULT NOW()
);

-- 채팅방 참여자
CREATE TABLE room_members (
    room_id BIGINT,
    user_id BIGINT,
    joined_at TIMESTAMP DEFAULT NOW(),
    last_read_message_id BIGINT,  -- 읽음 확인
    PRIMARY KEY (room_id, user_id)
);

-- 메시지 (대용량, 파티셔닝 필요)
CREATE TABLE messages (
    id BIGINT,         -- Snowflake ID (시간 정렬)
    room_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT,
    media_url TEXT,
    message_type VARCHAR(20),  -- TEXT, IMAGE, FILE
    created_at TIMESTAMP NOT NULL,
    PRIMARY KEY (room_id, id)  -- room_id 기준 파티셔닝
) PARTITION BY HASH (room_id);

CREATE TABLE messages_p0 PARTITION OF messages FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE messages_p1 PARTITION OF messages FOR VALUES WITH (MODULUS 8, REMAINDER 1);
-- ... p0~p7

-- 빠른 조회를 위한 인덱스
CREATE INDEX idx_messages_room_id ON messages(room_id, id DESC);
```

---

## WebSocket 서버 설계

```java
// Spring WebSocket 설정
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // 인메모리 브로커 (단일 서버용)
        // config.enableSimpleBroker("/topic", "/queue");

        // Redis Pub/Sub 브로커 (다중 서버용)
        config.enableStompBrokerRelay("/topic", "/queue")
            .setRelayHost("redis-host")
            .setRelayPort(6379);

        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("*")
            .withSockJS();  // SockJS 폴백
    }
}

// 메시지 전송 핸들러
@Controller
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat/{roomId}")
    public void sendMessage(
        @DestinationVariable Long roomId,
        @Payload MessageRequest request,
        Principal principal
    ) {
        Long senderId = Long.parseLong(principal.getName());

        // 메시지 저장
        Message message = chatService.saveMessage(roomId, senderId, request);

        // 채팅방 구독자들에게 전송
        messagingTemplate.convertAndSend(
            "/topic/chat/" + roomId,
            MessageResponse.from(message)
        );

        // 오프라인 사용자에게 푸시 알림
        chatService.sendPushNotificationToOfflineMembers(roomId, message);
    }
}
```

---

## 다중 서버 확장

```
문제: 사용자 A (서버 1), 사용자 B (서버 2)
     A가 B에게 메시지 → 서버 1이 서버 2에 전달 필요

해결: Redis Pub/Sub

메시지 플로우:
1. 클라이언트 → WebSocket 서버 1
2. 서버 1 → DB 저장
3. 서버 1 → Redis 채널 "room:{roomId}" publish
4. 모든 서버가 구독 중 → 서버 2도 수신
5. 서버 2 → 연결된 클라이언트에게 전송
```

```java
@Component
@RequiredArgsConstructor
public class ChatMessageRelay {

    private final RedisTemplate<String, String> redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    // 다른 서버에 메시지 발행
    public void relay(Long roomId, MessageResponse message) {
        String channel = "chat:room:" + roomId;
        redisTemplate.convertAndSend(channel, JsonUtil.toJson(message));
    }

    // Redis 메시지 수신 후 WebSocket 전달
    @Bean
    public MessageListenerAdapter chatMessageListener() {
        return new MessageListenerAdapter(new MessageListener() {
            @Override
            public void onMessage(org.springframework.data.redis.connection.Message message,
                                  byte[] pattern) {
                String channel = new String(message.getChannel());
                Long roomId = Long.parseLong(channel.replace("chat:room:", ""));
                MessageResponse response = JsonUtil.fromJson(
                    new String(message.getBody()), MessageResponse.class);

                messagingTemplate.convertAndSend(
                    "/topic/chat/" + roomId, response);
            }
        });
    }
}
```

---

## 온라인 상태 관리

```java
@Service
@RequiredArgsConstructor
public class PresenceService {

    private final RedisTemplate<String, String> redisTemplate;
    private static final Duration ONLINE_TTL = Duration.ofSeconds(30);

    // 사용자 온라인 상태 업데이트 (30초마다 하트비트)
    public void heartbeat(Long userId) {
        String key = "presence:" + userId;
        redisTemplate.opsForValue().set(key, "online", ONLINE_TTL);
    }

    // 오프라인 처리
    public void disconnect(Long userId) {
        redisTemplate.delete("presence:" + userId);
        // 마지막 접속 시간 기록
        redisTemplate.opsForValue().set(
            "last_seen:" + userId,
            String.valueOf(Instant.now().getEpochSecond())
        );
    }

    public boolean isOnline(Long userId) {
        return redisTemplate.hasKey("presence:" + userId);
    }

    // 채팅방 멤버 온라인 여부 일괄 조회
    public Map<Long, Boolean> getOnlineStatus(List<Long> userIds) {
        List<String> keys = userIds.stream()
            .map(id -> "presence:" + id)
            .toList();

        List<String> values = redisTemplate.opsForValue().multiGet(keys);

        Map<Long, Boolean> result = new HashMap<>();
        for (int i = 0; i < userIds.size(); i++) {
            result.put(userIds.get(i), values.get(i) != null);
        }
        return result;
    }
}
```

---

## 읽음 확인

```java
@Service
@RequiredArgsConstructor
public class ReadReceiptService {

    private final RoomMemberRepository roomMemberRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // 메시지 읽음 처리
    @Transactional
    public void markAsRead(Long userId, Long roomId, Long lastMessageId) {
        roomMemberRepository.updateLastReadMessage(userId, roomId, lastMessageId);

        // 채팅방 멤버들에게 읽음 상태 브로드캐스트
        ReadReceiptEvent event = ReadReceiptEvent.builder()
            .userId(userId)
            .roomId(roomId)
            .lastReadMessageId(lastMessageId)
            .build();

        messagingTemplate.convertAndSend(
            "/topic/chat/" + roomId + "/read",
            event
        );
    }

    // 메시지별 읽은 사람 수 조회
    public long getReadCount(Long roomId, Long messageId) {
        return roomMemberRepository.countByRoomIdAndLastReadMessageIdGreaterThanEqual(
            roomId, messageId);
    }
}
```

---

## 메시지 저장소 선택

```
Cassandra를 쓰는 이유 (카카오, 디스코드):
— 쓰기 최적화 (순차 쓰기)
— 시간 기반 정렬 기본 지원
— 수평 확장 용이
— 메시지 보관에 특화

스키마:
CREATE TABLE messages (
    room_id UUID,
    message_id TIMEUUID,  -- 시간 포함 UUID
    sender_id UUID,
    content TEXT,
    PRIMARY KEY (room_id, message_id)
) WITH CLUSTERING ORDER BY (message_id DESC)
  AND default_time_to_live = 157680000;  -- 5년

조회:
SELECT * FROM messages
WHERE room_id = ?
  AND message_id < ? -- cursor
LIMIT 20;

소규모 시스템 → PostgreSQL로도 충분
대규모 → Cassandra 또는 DynamoDB 고려
```
