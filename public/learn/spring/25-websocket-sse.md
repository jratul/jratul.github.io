---
title: "WebSocket / SSE"
order: 25
---

## 실시간 통신 방식 비교

| | HTTP Polling | SSE | WebSocket |
|---|---|---|---|
| 방향 | 단방향 (클라 → 서버) | 단방향 (서버 → 클라) | 양방향 |
| 연결 | 반복 요청 | 지속 연결 (HTTP) | 지속 연결 (TCP) |
| 용도 | 단순 폴링 | 알림, 실시간 피드 | 채팅, 게임 |
| 구현 복잡도 | 낮음 | 낮음 | 중간 |

---

## SSE (Server-Sent Events)

서버에서 클라이언트로 단방향으로 스트리밍합니다.

```groovy
// spring-boot-starter-web에 포함
```

```java
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    // SseEmitter 저장소 (실제로는 Map으로 관리)
    private final SseEmitterService emitterService;
    private final NotificationService notificationService;

    // 클라이언트 SSE 구독
    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserId(userDetails);

        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);  // 타임아웃 없음
        emitterService.add(userId, emitter);

        // 연결 즉시 초기 이벤트 (503 방지)
        try {
            emitter.send(SseEmitter.event()
                .name("connect")
                .data("연결됨"));
        } catch (IOException e) {
            emitterService.remove(userId, emitter);
        }

        emitter.onCompletion(() -> emitterService.remove(userId, emitter));
        emitter.onTimeout(() -> emitterService.remove(userId, emitter));
        emitter.onError(e -> emitterService.remove(userId, emitter));

        return emitter;
    }
}

// Emitter 관리 서비스
@Service
public class SseEmitterService {

    // userId → 여러 탭/기기
    private final Map<Long, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public void add(Long userId, SseEmitter emitter) {
        emitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);
    }

    public void remove(Long userId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(userId);
        if (list != null) list.remove(emitter);
    }

    // 특정 사용자에게 전송
    public void send(Long userId, NotificationEvent event) {
        List<SseEmitter> list = emitters.getOrDefault(userId, Collections.emptyList());
        List<SseEmitter> dead = new ArrayList<>();

        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event()
                    .name(event.getType())
                    .data(event));
            } catch (IOException e) {
                dead.add(emitter);
            }
        }
        dead.forEach(list::remove);
    }

    // 전체 브로드캐스트
    public void broadcast(NotificationEvent event) {
        emitters.keySet().forEach(userId -> send(userId, event));
    }
}
```

---

## SSE 이벤트 발행

```java
@Service
public class NotificationService {

    private final SseEmitterService emitterService;
    private final NotificationRepository notificationRepository;

    // 주문 완료 시 사용자에게 알림
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderCompleted(OrderCompletedEvent event) {
        Notification notification = notificationRepository.save(
            Notification.of(event.getUserId(), "주문이 완료됐습니다!", event.getOrderId())
        );

        emitterService.send(event.getUserId(), NotificationEvent.from(notification));
    }
}
```

클라이언트 (JavaScript):

```javascript
const eventSource = new EventSource('/api/notifications/subscribe');

eventSource.addEventListener('ORDER_COMPLETED', (e) => {
    const data = JSON.parse(e.data);
    showToast(`주문 ${data.orderId} 완료!`);
});

eventSource.onerror = () => {
    setTimeout(() => reconnect(), 3000);  // 재연결
};
```

---

## WebSocket (STOMP)

채팅처럼 양방향 실시간 통신이 필요할 때 씁니다.

```groovy
implementation 'org.springframework.boot:spring-boot-starter-websocket'
```

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 구독 경로 접두어 (서버 → 클라이언트)
        registry.enableSimpleBroker("/topic", "/queue");

        // 발행 경로 접두어 (클라이언트 → 서버)
        registry.setApplicationDestinationPrefixes("/app");

        // 사용자별 개인 채널
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("*")
            .withSockJS();  // SockJS 폴백
    }
}
```

---

## 채팅 구현

```java
// 메시지 DTO
public record ChatMessage(
    String roomId,
    String sender,
    String content,
    MessageType type,  // ENTER, TALK, LEAVE
    LocalDateTime sentAt
) {}

// 채팅 컨트롤러
@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;

    // /app/chat.send 로 보낸 메시지 처리
    @MessageMapping("/chat.send")
    @SendTo("/topic/chat/{roomId}")
    public ChatMessage sendMessage(@DestinationVariable String roomId,
                                   ChatMessage message,
                                   Principal principal) {
        return new ChatMessage(roomId, principal.getName(), message.content(),
            MessageType.TALK, LocalDateTime.now());
    }

    // 입장 메시지
    @MessageMapping("/chat.enter")
    @SendTo("/topic/chat/{roomId}")
    public ChatMessage enterRoom(@DestinationVariable String roomId,
                                  ChatMessage message,
                                  Principal principal) {
        return new ChatMessage(roomId, principal.getName(),
            principal.getName() + "님이 입장했습니다.", MessageType.ENTER, LocalDateTime.now());
    }
}

// 서버에서 직접 메시지 전송
@Service
public class SystemNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    // 특정 룸에 브로드캐스트
    public void broadcastToRoom(String roomId, Object message) {
        messagingTemplate.convertAndSend("/topic/chat/" + roomId, message);
    }

    // 특정 사용자에게 개인 메시지
    public void sendToUser(String username, Object message) {
        messagingTemplate.convertAndSendToUser(username, "/queue/notification", message);
    }
}
```

---

## WebSocket 보안

```java
@Configuration
public class WebSocketSecurityConfig extends AbstractSecurityWebSocketMessageBrokerConfigurer {

    @Override
    protected void configureInbound(MessageSecurityMetadataSourceRegistry messages) {
        messages
            .simpSubscribeDestMatchers("/user/**").authenticated()
            .simpDestMatchers("/app/**").authenticated()
            .simpSubscribeDestMatchers("/topic/public/**").permitAll()
            .anyMessage().authenticated();
    }

    @Override
    protected boolean sameOriginDisabled() {
        return true;  // CSRF 비활성화 (토큰 인증 사용 시)
    }
}

// JWT 기반 WebSocket 인증
@Component
public class WebSocketHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtTokenProvider tokenProvider;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {

        String token = extractTokenFromQuery(request.getURI().getQuery());
        if (token == null || !tokenProvider.validateToken(token)) {
            return false;
        }

        attributes.put("userId", tokenProvider.getUserId(token));
        return true;
    }
}
```

---

## 분산 환경 WebSocket

서버가 여러 대일 때는 Redis Pub/Sub으로 메시지를 공유합니다.

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 내부 브로커 대신 Redis 외부 브로커 사용
        registry.enableStompBrokerRelay("/topic", "/queue")
            .setRelayHost("redis-server")
            .setRelayPort(61613)  // STOMP over Redis
            .setClientLogin("user")
            .setClientPasscode("password");

        registry.setApplicationDestinationPrefixes("/app");
    }
}
```

또는 Spring의 Redis Pub/Sub을 직접 사용:

```java
@Service
public class RedisChatService {

    private final RedisTemplate<String, Object> redisTemplate;

    // 메시지 발행 (다른 서버 인스턴스에도 전달됨)
    public void publish(String roomId, ChatMessage message) {
        redisTemplate.convertAndSend("chat:" + roomId, message);
    }
}

// 구독
@Component
public class RedisChatSubscriber implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        ChatMessage chatMsg = deserialize(message.getBody());
        messagingTemplate.convertAndSend("/topic/chat/" + chatMsg.getRoomId(), chatMsg);
    }
}

@Bean
public RedisMessageListenerContainer redisContainer(RedisConnectionFactory factory) {
    RedisMessageListenerContainer container = new RedisMessageListenerContainer();
    container.setConnectionFactory(factory);
    container.addMessageListener(redisChatSubscriber(), new PatternTopic("chat:*"));
    return container;
}
```
