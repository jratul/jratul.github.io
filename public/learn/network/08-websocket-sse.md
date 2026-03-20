---
title: "WebSocket과 Server-Sent Events"
order: 8
---

# WebSocket과 Server-Sent Events

HTTP는 클라이언트가 요청해야 응답이 온다. 실시간 데이터 전송이 필요할 때 WebSocket과 SSE를 쓴다.

---

## 비교

| 항목 | HTTP | SSE | WebSocket |
|------|------|-----|-----------|
| 방향 | 단방향 (클→서버→클) | 단방향 (서버→클) | 양방향 |
| 연결 | 요청마다 | 지속 연결 | 지속 연결 |
| 프로토콜 | HTTP | HTTP | ws:// wss:// |
| 브라우저 지원 | ✅ | ✅ | ✅ |
| 재연결 | 수동 | 자동 | 수동 |
| 용도 | 일반 API | 알림, 피드 | 채팅, 게임 |

---

## SSE (Server-Sent Events)

서버에서 클라이언트로 단방향 스트리밍. HTTP 기반이라 간단.

```
프로토콜:
Content-Type: text/event-stream

data: {"type":"notification","message":"새 댓글"}

data: {"type":"alert","count":5}

id: 123
data: 메시지 본문
retry: 3000

필드:
data — 전송할 데이터
id   — 이벤트 ID (재연결 시 마지막 받은 ID부터 재수신)
event — 이벤트 타입
retry — 재연결 대기 시간(ms)
빈 줄 — 이벤트 구분자
```

```java
// Spring Boot SSE
@RestController
public class NotificationController {

    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    @GetMapping(value = "/notifications/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@AuthenticationPrincipal UserDetails user) {
        Long userId = Long.parseLong(user.getUsername());
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L); // 30분 타임아웃

        emitters.put(userId, emitter);

        emitter.onCompletion(() -> emitters.remove(userId));
        emitter.onTimeout(() -> emitters.remove(userId));
        emitter.onError(e -> emitters.remove(userId));

        // 초기 연결 확인 이벤트 (503 방지)
        try {
            emitter.send(SseEmitter.event().name("connect").data("connected"));
        } catch (IOException e) {
            emitters.remove(userId);
        }

        return emitter;
    }

    // 특정 사용자에게 알림 전송
    public void sendNotification(Long userId, Object data) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                    .name("notification")
                    .data(data, MediaType.APPLICATION_JSON));
            } catch (IOException e) {
                emitters.remove(userId);
            }
        }
    }
}
```

---

## WebSocket

양방향 실시간 통신. HTTP 업그레이드 후 독립 프로토콜.

```
연결 과정:
1. HTTP로 업그레이드 요청
GET /ws HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==

2. 서버 수락
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

3. 이후 WebSocket 프레임으로 양방향 통신
```

```java
// Spring Boot WebSocket + STOMP
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");  // 구독 prefix
        config.setApplicationDestinationPrefixes("/app"); // 발행 prefix
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("*")
            .withSockJS(); // SockJS fallback
    }
}

@Controller
public class ChatController {

    @MessageMapping("/chat.send")              // /app/chat.send 로 발행
    @SendTo("/topic/chat")                     // /topic/chat 구독자에게 전송
    public ChatMessage send(ChatMessage message) {
        return message;
    }

    @MessageMapping("/chat.join")
    @SendTo("/topic/chat")
    public ChatMessage join(ChatMessage message) {
        message.setContent(message.getSender() + " 님이 입장했습니다.");
        return message;
    }
}
```

---

## 클라이언트 연결 (JavaScript)

```javascript
// SSE
const eventSource = new EventSource('/notifications/subscribe');

eventSource.addEventListener('notification', (e) => {
    const data = JSON.parse(e.data);
    console.log('알림:', data);
});

eventSource.onerror = () => {
    // 자동 재연결됨
    console.log('재연결 시도...');
};

// WebSocket + STOMP
import { Client } from '@stomp/stompjs';

const client = new Client({
    brokerURL: 'ws://localhost:8080/ws',
    onConnect: () => {
        // 구독
        client.subscribe('/topic/chat', (message) => {
            console.log('메시지:', JSON.parse(message.body));
        });

        // 발행
        client.publish({
            destination: '/app/chat.send',
            body: JSON.stringify({ sender: 'Alice', content: '안녕!' })
        });
    },
    reconnectDelay: 5000, // 재연결 간격
});

client.activate();
```

---

## 분산 환경에서의 WebSocket

```
문제:
서버가 여러 대일 때 클라이언트 A는 서버 1에,
클라이언트 B는 서버 2에 연결된 상태에서
서버 1이 서버 2의 클라이언트 B에게 메시지 전송 불가

해결 — Redis Pub/Sub:
서버 1 → Redis Publish → 서버 2 Subscribe → 클라이언트 B 전송
```

```java
// Redis Pub/Sub으로 분산 WebSocket
@Configuration
public class RedisConfig {

    @Bean
    public RedisMessageListenerContainer redisContainer(
        RedisConnectionFactory factory,
        ChatMessageSubscriber subscriber
    ) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(factory);
        container.addMessageListener(subscriber, new PatternTopic("chat:*"));
        return container;
    }
}

@Service
@RequiredArgsConstructor
public class ChatService {

    private final SimpMessagingTemplate messagingTemplate;
    private final StringRedisTemplate redisTemplate;

    // 메시지 발행 → Redis → 모든 서버 → 해당 구독자
    public void broadcast(String roomId, ChatMessage message) {
        redisTemplate.convertAndSend("chat:" + roomId,
            JsonUtil.toJson(message));
    }
}

@Component
@RequiredArgsConstructor
public class ChatMessageSubscriber implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String channel = new String(message.getChannel());
        String roomId = channel.replace("chat:", "");
        ChatMessage chatMessage = JsonUtil.fromJson(
            new String(message.getBody()), ChatMessage.class);

        messagingTemplate.convertAndSend(
            "/topic/chat/" + roomId, chatMessage);
    }
}
```

---

## 언제 무엇을 쓸까?

```
SSE 선택:
✅ 서버 → 클라이언트 단방향 (알림, 실시간 피드, 주가 정보)
✅ HTTP 기반이라 방화벽, 프록시 통과 쉬움
✅ 자동 재연결 내장
✅ 구현 단순

WebSocket 선택:
✅ 양방향 실시간 통신 (채팅, 게임, 협업 도구)
✅ 높은 빈도의 메시지 교환
✅ 낮은 레이턴시 필요

Long Polling (레거시):
— SSE/WS 사용 불가할 때만 사용
— 클라이언트가 응답 오면 즉시 다시 요청
```
