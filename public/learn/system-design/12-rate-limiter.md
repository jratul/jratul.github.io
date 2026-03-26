---
title: "실전 설계: 채팅 / 실시간 시스템"
order: 12
---

## 문제 정의

카카오톡 같은 실시간 채팅 시스템을 설계합니다.

**채팅 시스템이 어려운 이유:**
- 수천만 명이 동시에 연결 유지 (Long-lived connection)
- 메시지 손실 없어야 함 (배달 보장)
- 수십억 건의 메시지 저장 및 조회
- 서버 여러 대에서 메시지 공유 (분산)

---

## 요구사항 정의

```
기능적 요구사항:
─────────────────────────────────────
1. 1:1 채팅
2. 그룹 채팅 (최대 500명)
3. 온라인 상태 표시
4. 메시지 읽음 확인 (✓✓)
5. 이미지/파일 전송
6. 메시지 검색

비기능적 요구사항:
─────────────────────────────────────
1. DAU: 5천만 명
2. 메시지 전달 지연: < 100ms
3. 5년 메시지 보관
4. 가용성: 99.99%

규모 추정:
─────────────────────────────────────
일 메시지: 5천만 명 × 40개 = 20억 건
피크 QPS: 20억 / 86,400 ≈ 23,000 QPS
저장: 20억 × 100 bytes = 200GB/일
5년 보관: 200GB × 365 × 5 ≈ 360TB
```

---

## 실시간 통신 방식 선택

```
폴링 (Polling):
클라이언트가 1초마다 "새 메시지 있어?" 요청
단점: 메시지 없어도 요청, 지연 최대 1초, 서버 부하

롱 폴링 (Long Polling):
서버가 새 메시지 있을 때까지 응답 보류 (최대 30초)
단점: 연결 자원 소비, 구현 복잡

WebSocket:
연결 한 번 맺고 양방향으로 실시간 통신
장점: 진짜 실시간, 저지연
단점: 상태 유지 (수평 확장 복잡)

SSE (Server-Sent Events):
서버→클라이언트 단방향 스트림
장점: 구현 단순
단점: 단방향 (메시지 전송은 별도 HTTP 필요)

→ 채팅: WebSocket 선택 (양방향 필요)
```

---

## 데이터 모델

```sql
-- 채팅방
CREATE TABLE chat_rooms (
    id BIGINT PRIMARY KEY,         -- Snowflake ID
    type VARCHAR(20) NOT NULL,     -- DIRECT (1:1), GROUP
    name VARCHAR(200),             -- 그룹 채팅방 이름 (1:1은 NULL)
    created_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP      -- 최근 메시지 시각 (목록 정렬용)
);

-- 채팅방 참여자
CREATE TABLE room_members (
    room_id BIGINT NOT NULL REFERENCES chat_rooms(id),
    user_id BIGINT NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,                   -- 나간 시각 (NULL = 참여 중)
    last_read_message_id BIGINT,         -- 마지막 읽은 메시지 ID (읽음 확인)
    PRIMARY KEY (room_id, user_id)
);

-- 메시지 (대용량 - 파티셔닝 필수)
CREATE TABLE messages (
    id BIGINT,                     -- Snowflake ID (시간 포함 → 정렬 가능)
    room_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT,
    media_url TEXT,                -- 이미지/파일 URL
    message_type VARCHAR(20),      -- TEXT, IMAGE, FILE, SYSTEM
    created_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP,          -- 소프트 삭제 (NULL = 살아있음)
    PRIMARY KEY (room_id, id)      -- room_id로 파티셔닝
) PARTITION BY HASH (room_id);    -- 채팅방별 파티셔닝

-- 파티션 8개 (나중에 더 추가 가능)
CREATE TABLE messages_p0 PARTITION OF messages
    FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE messages_p1 PARTITION OF messages
    FOR VALUES WITH (MODULUS 8, REMAINDER 1);
-- ... p2 ~ p7

-- 채팅방 내 메시지 조회 최적화
CREATE INDEX idx_messages_room_cursor ON messages(room_id, id DESC);
```

---

## WebSocket 서버 설계

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // 단일 서버: 인메모리 브로커
        // config.enableSimpleBroker("/topic", "/queue");

        // 다중 서버: Redis Pub/Sub 브로커 (실운영 권장)
        config.enableStompBrokerRelay("/topic", "/queue")
            .setRelayHost("redis-cluster")
            .setRelayPort(61613)  // STOMP over Redis
            .setSystemLogin("chat-system")
            .setSystemPasscode("secure-password");

        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/chat")
            .setAllowedOriginPatterns("https://*.myapp.com", "http://localhost:*")
            .withSockJS()
            .setStreamBytesLimit(512 * 1024)     // 스트림 최대 512KB
            .setHttpMessageCacheSize(1000)        // 메시지 캐시
            .setDisconnectDelay(30 * 1000);       // 연결 끊김 감지 30초
    }
}

// 메시지 전송 핸들러
@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    // /app/chat/{roomId} → /topic/chat/{roomId}로 브로드캐스트
    @MessageMapping("/chat/{roomId}")
    public void sendMessage(
            @DestinationVariable Long roomId,
            @Payload MessageRequest request,
            Principal principal,
            SimpMessageHeaderAccessor headerAccessor) {

        Long senderId = Long.parseLong(principal.getName());

        // 채팅방 멤버 검증
        if (!chatService.isMember(roomId, senderId)) {
            log.warn("비회원 메시지 시도: roomId={}, userId={}", roomId, senderId);
            return;
        }

        // 메시지 DB 저장
        Message message = chatService.saveMessage(roomId, senderId, request);

        // 채팅방 구독자들에게 전송
        messagingTemplate.convertAndSend(
            "/topic/chat/" + roomId,
            MessageResponse.from(message)
        );

        // 오프라인 멤버에게 푸시 알림 (비동기)
        chatService.sendPushToOfflineMembers(roomId, message);
    }

    // 채팅방 입장
    @MessageMapping("/chat/{roomId}/enter")
    public void enterRoom(
            @DestinationVariable Long roomId,
            Principal principal) {

        Long userId = Long.parseLong(principal.getName());
        chatService.addMember(roomId, userId);

        messagingTemplate.convertAndSend(
            "/topic/chat/" + roomId,
            SystemMessage.enter(roomId, getUserName(userId))
        );
    }

    // 채팅방 퇴장
    @MessageMapping("/chat/{roomId}/leave")
    public void leaveRoom(
            @DestinationVariable Long roomId,
            Principal principal) {

        Long userId = Long.parseLong(principal.getName());
        chatService.removeMember(roomId, userId);

        messagingTemplate.convertAndSend(
            "/topic/chat/" + roomId,
            SystemMessage.leave(roomId, getUserName(userId))
        );
    }
}
```

---

## 다중 서버 메시지 공유 (Redis Pub/Sub)

```
문제 상황:
─────────────────────────────────────
서버 1: 사용자 A (WebSocket 연결)
서버 2: 사용자 B (WebSocket 연결)

B가 A에게 메시지 전송:
→ 서버 2에 도착
→ 서버 2는 A를 모름 (A는 서버 1에 연결)
→ A에게 전달 불가!

해결: Redis Pub/Sub
─────────────────────────────────────
서버 2 → Redis "chat:room:123" 채널에 발행
→ 서버 1도 이 채널 구독 중
→ 서버 1이 메시지 수신
→ 서버 1이 A에게 전달
```

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatMessageRelay {

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    // 다른 서버에 있는 클라이언트에게 전달하려면 Redis로 발행
    public void relay(Long roomId, MessageResponse message) {
        try {
            String channel = "chat:room:" + roomId;
            String payload = objectMapper.writeValueAsString(message);
            redisTemplate.convertAndSend(channel, payload);
            log.debug("Redis 발행: channel={}", channel);
        } catch (JsonProcessingException e) {
            log.error("메시지 직렬화 실패", e);
        }
    }
}

// Redis 메시지 수신 → WebSocket으로 클라이언트에게 전달
@Component
@RequiredArgsConstructor
@Slf4j
public class RedisChatSubscriber implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String channel = new String(message.getChannel(), StandardCharsets.UTF_8);
            Long roomId = Long.parseLong(channel.replace("chat:room:", ""));
            String body = new String(message.getBody(), StandardCharsets.UTF_8);

            MessageResponse response = objectMapper.readValue(body, MessageResponse.class);

            // 이 서버에 연결된 해당 채팅방 구독자들에게 전송
            messagingTemplate.convertAndSend("/topic/chat/" + roomId, response);

        } catch (Exception e) {
            log.error("Redis 메시지 처리 실패", e);
        }
    }
}

@Configuration
@RequiredArgsConstructor
public class RedisPubSubConfig {

    private final RedisChatSubscriber subscriber;

    @Bean
    public RedisMessageListenerContainer redisContainer(
            RedisConnectionFactory factory) {

        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(factory);
        // "chat:room:*" 패턴의 모든 채널 구독
        container.addMessageListener(subscriber, new PatternTopic("chat:room:*"));
        return container;
    }
}
```

---

## 온라인 상태 관리

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class PresenceService {

    private final RedisTemplate<String, String> redisTemplate;
    private static final Duration ONLINE_TTL = Duration.ofSeconds(30);

    // WebSocket 연결 유지 중 30초마다 갱신 (하트비트)
    public void heartbeat(Long userId) {
        String key = "presence:" + userId;
        redisTemplate.opsForValue().set(key, "online", ONLINE_TTL);
        // 30초 안에 갱신 안 되면 자동으로 오프라인 처리
    }

    // WebSocket 연결 해제 시
    public void disconnect(Long userId) {
        redisTemplate.delete("presence:" + userId);

        // 마지막 접속 시각 기록
        redisTemplate.opsForValue().set(
            "last_seen:" + userId,
            String.valueOf(Instant.now().getEpochSecond())
        );

        log.info("사용자 오프라인: userId={}", userId);
    }

    public boolean isOnline(Long userId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey("presence:" + userId));
    }

    public Instant getLastSeen(Long userId) {
        String epochStr = redisTemplate.opsForValue().get("last_seen:" + userId);
        if (epochStr == null) return null;
        return Instant.ofEpochSecond(Long.parseLong(epochStr));
    }

    // 채팅방 멤버들의 온라인 여부 일괄 조회 (MGET)
    public Map<Long, PresenceInfo> getPresenceInfo(List<Long> userIds) {
        List<String> keys = userIds.stream()
            .map(id -> "presence:" + id)
            .toList();

        List<String> onlineValues = redisTemplate.opsForValue().multiGet(keys);

        Map<Long, PresenceInfo> result = new HashMap<>();
        for (int i = 0; i < userIds.size(); i++) {
            Long userId = userIds.get(i);
            boolean online = onlineValues.get(i) != null;

            if (online) {
                result.put(userId, PresenceInfo.online());
            } else {
                Instant lastSeen = getLastSeen(userId);
                result.put(userId, PresenceInfo.offline(lastSeen));
            }
        }
        return result;
    }
}

// 하트비트 스케줄러 (클라이언트 측)
// JavaScript 예시
// setInterval(() => {
//   if (stompClient.connected) {
//     stompClient.publish({ destination: '/app/heartbeat' });
//   }
// }, 20000);  // 20초마다
```

---

## 읽음 확인 시스템

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class ReadReceiptService {

    private final RoomMemberRepository memberRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // 채팅방 메시지 읽음 처리
    @Transactional
    public void markAsRead(Long userId, Long roomId, Long lastMessageId) {
        // DB 업데이트: 이 사용자의 마지막 읽은 메시지 ID 갱신
        memberRepository.updateLastReadMessage(userId, roomId, lastMessageId);

        // 채팅방 멤버들에게 읽음 상태 브로드캐스트
        // (다른 멤버의 "읽음" 표시 업데이트)
        ReadReceiptEvent event = ReadReceiptEvent.builder()
            .userId(userId)
            .roomId(roomId)
            .lastReadMessageId(lastMessageId)
            .readAt(Instant.now())
            .build();

        messagingTemplate.convertAndSend(
            "/topic/chat/" + roomId + "/read",
            event
        );

        log.debug("읽음 처리: userId={}, roomId={}, messageId={}",
            userId, roomId, lastMessageId);
    }

    // 특정 메시지를 읽은 사람 수
    public long getReadCount(Long roomId, Long messageId) {
        return memberRepository.countByRoomIdAndLastReadMessageIdGreaterThanEqual(
            roomId, messageId);
    }

    // 내가 안 읽은 메시지 수 (배지 숫자)
    public int getUnreadCount(Long userId, Long roomId) {
        Long lastReadId = memberRepository.getLastReadMessageId(userId, roomId);
        if (lastReadId == null) return 0;
        return messageRepository.countByRoomIdAndIdGreaterThan(roomId, lastReadId);
    }
}
```

---

## 메시지 저장소 선택

```
소규모 시스템: PostgreSQL
- 파티셔닝으로 대용량 처리 가능
- 운영 단순
- 수십억 건까지 감당 가능

대규모 시스템 (카카오, 디스코드): Cassandra
- 이유: 쓰기 최적화, 시계열 데이터 특화, 수평 확장

Cassandra 스키마:
CREATE TABLE messages (
    room_id UUID,
    message_id TIMEUUID,  -- 시간 포함 UUID (= Snowflake ID 역할)
    sender_id UUID,
    content TEXT,
    PRIMARY KEY (room_id, message_id)  -- room_id: 파티션 키, message_id: 클러스터링
) WITH CLUSTERING ORDER BY (message_id DESC)  -- 최신순 정렬
  AND default_time_to_live = 157680000;        -- 5년 후 자동 삭제

조회:
SELECT * FROM messages
WHERE room_id = ?
  AND message_id < ?   -- cursor: 이것보다 이전 메시지
ORDER BY message_id DESC
LIMIT 20;

Cassandra 장점:
- 초당 수만 건 쓰기 처리
- room_id 기준으로 데이터 분산 → 선형 확장
- 시간 기반 정렬 기본 지원
```

---

## 전체 아키텍처

```
┌────────────────────────────────────────────────────────────┐
│                    채팅 시스템 아키텍처                     │
│                                                            │
│  [모바일/웹 클라이언트]                                     │
│       │ WebSocket (STOMP)                                  │
│       ▼                                                    │
│  [WebSocket LB] ← 연결 유지 (Sticky Session 필요)          │
│       │                                                    │
│  ┌────┼──────────┬──────────┐                              │
│  ▼    ▼          ▼          ▼                              │
│ WS  WS서버1   WS서버2   WS서버3                            │
│서버   │                                                    │
│       ├── 메시지 저장 → PostgreSQL/Cassandra               │
│       ├── Redis Pub/Sub → 서버 간 메시지 공유              │
│       └── Kafka → 비동기 처리 (알림, 검색 인덱싱)           │
│                                                            │
│  [Redis Cluster]                                           │
│    ├── 온라인 상태 (presence:*)                            │
│    └── 최근 메시지 캐시 (room:*:messages)                  │
│                                                            │
│  [오프라인 알림]                                            │
│    ├── FCM (Android)                                       │
│    ├── APNs (iOS)                                          │
│    └── Web Push                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 트레이드오프 분석

```
WebSocket LB (로드밸런서) 전략:
──────────────────────────────────────────────────
Sticky Session (IP Hash):
장점: 같은 서버로 연결 → 서버 메모리 활용 가능
단점: 서버 죽으면 연결 끊김

Round Robin + Redis Pub/Sub:
장점: 균등 분산, 서버 독립적
단점: Redis 의존 (Redis 장애 = 메시지 공유 불가)

메시지 보관 전략:
──────────────────────────────────────────────────
무제한 보관:
장점: 언제든 조회 가능
단점: 저장 비용 지속 증가

TTL 기반 자동 삭제 (Cassandra):
장점: 비용 관리
단점: 오래된 메시지 사라짐 (법적 보관 의무 확인 필요)

아카이빙:
최근 1년: 빠른 스토리지 (SSD)
1년 이상: 저렴한 콜드 스토리지 (S3 Glacier)

읽음 확인 정밀도:
──────────────────────────────────────────────────
모든 멤버가 읽었는지 (N개 ✓):
부하 높음 (멤버 수 × 메시지 수 × 확인)

마지막 읽은 메시지 ID만 저장:
부하 낮음, 대략적인 읽음 확인만 가능
```

---

## 초보자가 자주 하는 실수

**실수 1: WebSocket 단일 서버로만 설계**

```
나쁜 설계:
클라이언트 → WebSocket 서버 1대
→ 서버 1대에 5천만 명 연결 불가
→ 서버 장애 시 전체 서비스 중단

올바른 설계:
클라이언트 → LB → WebSocket 서버 여러 대
+ Redis Pub/Sub으로 서버 간 메시지 공유
```

**실수 2: 메시지를 WebSocket으로만 보내고 DB 저장 안 함**

```java
// 나쁜 예: DB 저장 없이 WebSocket만 전송
@MessageMapping("/chat/{roomId}")
public void sendMessage(@DestinationVariable Long roomId, MessageRequest req) {
    messagingTemplate.convertAndSend("/topic/chat/" + roomId, req);
    // 저장 안 함 → 앱 재시작 시 메시지 사라짐!
}

// 올바른 예: DB 저장 후 WebSocket 전송
@MessageMapping("/chat/{roomId}")
public void sendMessage(@DestinationVariable Long roomId, MessageRequest req, Principal p) {
    Message saved = chatService.saveMessage(roomId, Long.parseLong(p.getName()), req);
    messagingTemplate.convertAndSend("/topic/chat/" + roomId, MessageResponse.from(saved));
}
```

**실수 3: 하트비트 없이 온라인 상태 관리**

```java
// 나쁜 예: TTL 없는 온라인 표시 → 연결 끊겨도 온라인으로 표시됨
redisTemplate.opsForValue().set("presence:" + userId, "online");
// TTL 없음 → 영구 저장 → 오프라인 되어도 온라인 표시

// 올바른 예: 짧은 TTL + 주기적 갱신
redisTemplate.opsForValue().set("presence:" + userId, "online",
    Duration.ofSeconds(30));  // 30초 TTL
// 클라이언트가 20초마다 하트비트 전송
// 하트비트 없으면 30초 후 자동 오프라인
```
