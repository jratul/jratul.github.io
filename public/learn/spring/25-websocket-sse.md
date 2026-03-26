---
title: "WebSocket / SSE"
order: 25
---

## 실시간 통신이란 무엇인가

일반 HTTP는 **클라이언트가 요청해야 서버가 응답**합니다. 실시간 통신은 **서버가 먼저 클라이언트에게 데이터를 보낼 수 있는** 방식입니다.

**왜 필요한가?**
- 채팅: 상대방 메시지를 받으려고 매초 요청을 보내야 할까요?
- 알림: 새 주문이 왔을 때 실시간으로 알려야 합니다
- 배달 추적: 배달원 위치가 실시간으로 바뀝니다

---

## 실시간 통신 방식 비교

| 방식 | 방향 | 연결 | 적합한 용도 | 복잡도 |
|---|---|---|---|---|
| HTTP Polling | 클라→서버 | 매번 새 요청 | 느린 업데이트 | 낮음 |
| SSE | 서버→클라 | 지속 연결 (HTTP) | 알림, 피드 | 낮음 |
| WebSocket | 양방향 | 지속 연결 (TCP) | 채팅, 게임 | 중간 |

**선택 기준:**
- 알림, 주문 상태 업데이트 → SSE (단방향으로 충분)
- 채팅, 실시간 협업 → WebSocket (양방향 필요)
- 단순 실시간 데이터 → SSE가 구현이 더 쉬움

---

## SSE (Server-Sent Events)

SSE는 서버가 클라이언트로 **단방향으로 데이터를 스트리밍**합니다. HTTP 기반이라 일반 HTTP 인프라(프록시, 로드밸런서)와 잘 동작합니다.

**현실 비유:** TV 방송처럼 서버(방송사)가 클라이언트(TV)로 일방적으로 스트리밍합니다.

```java
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final SseEmitterService emitterService;

    // 클라이언트가 SSE 구독 시작
    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestHeader(value = "Last-Event-ID", required = false) String lastEventId) {

        Long userId = getUserId(userDetails);

        // SseEmitter: 서버→클라이언트 이벤트 전송 객체
        // Long.MAX_VALUE: 타임아웃 없음 (직접 관리)
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitterService.add(userId, emitter);

        // 연결 즉시 초기 이벤트 전송
        // (이유: 연결 즉시 이벤트가 없으면 일부 브라우저에서 503 발생)
        try {
            emitter.send(SseEmitter.event()
                .id("0")           // 이벤트 ID (재연결 시 참조)
                .name("connected") // 이벤트 타입 (클라이언트에서 addEventListener로 구분)
                .data("구독 완료: userId=" + userId)
                .reconnectTime(3000L));  // 연결 끊기면 3초 후 재연결

        } catch (IOException e) {
            emitterService.remove(userId, emitter);
            return emitter;
        }

        // 연결 종료 시 정리
        emitter.onCompletion(() -> {
            log.info("SSE 연결 종료: userId={}", userId);
            emitterService.remove(userId, emitter);
        });
        emitter.onTimeout(() -> {
            log.info("SSE 타임아웃: userId={}", userId);
            emitterService.remove(userId, emitter);
        });
        emitter.onError(e -> {
            log.warn("SSE 오류: userId={}", userId);
            emitterService.remove(userId, emitter);
        });

        return emitter;
    }
}
```

```java
// SseEmitter 저장 및 전송 관리
@Service
@Slf4j
public class SseEmitterService {

    // userId → 여러 탭/기기에서 접속 가능하므로 List
    private final Map<Long, CopyOnWriteArrayList<SseEmitter>> emitters =
        new ConcurrentHashMap<>();

    public void add(Long userId, SseEmitter emitter) {
        emitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        log.debug("SSE 에미터 등록: userId={}, 현재 연결 수={}",
            userId, emitters.get(userId).size());
    }

    public void remove(Long userId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(userId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) emitters.remove(userId);
        }
    }

    // 특정 사용자에게 이벤트 전송
    public void send(Long userId, String eventName, Object data) {
        List<SseEmitter> userEmitters =
            emitters.getOrDefault(userId, Collections.emptyList());

        List<SseEmitter> deadEmitters = new ArrayList<>();

        for (SseEmitter emitter : userEmitters) {
            try {
                emitter.send(SseEmitter.event()
                    .id(String.valueOf(System.currentTimeMillis()))
                    .name(eventName)      // 이벤트 타입
                    .data(data));         // 데이터 (Jackson이 JSON 직렬화)

            } catch (IOException e) {
                // 연결이 끊긴 에미터 수집 (반복 중 삭제하면 안 됨)
                deadEmitters.add(emitter);
            }
        }

        // 끊긴 에미터 정리
        deadEmitters.forEach(e -> remove(userId, e));
    }

    // 전체 사용자에게 브로드캐스트
    public void broadcast(String eventName, Object data) {
        emitters.keySet().forEach(userId -> send(userId, eventName, data));
    }

    // 접속 중인 사용자 수 확인
    public int getConnectedUserCount() {
        return emitters.size();
    }
}
```

---

## SSE 이벤트 발행

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final SseEmitterService emitterService;
    private final NotificationRepository notificationRepository;

    // 주문 완료 시 사용자에게 실시간 알림
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async  // 비동기 처리 (주문 응답에 영향 없음)
    public void onOrderCompleted(OrderCompletedEvent event) {
        // DB에 알림 저장
        Notification notification = notificationRepository.save(
            Notification.builder()
                .userId(event.getUserId())
                .type("ORDER_COMPLETED")
                .message("주문 #" + event.getOrderId() + "이(가) 완료됐습니다!")
                .orderId(event.getOrderId())
                .read(false)
                .createdAt(LocalDateTime.now())
                .build()
        );

        // SSE로 실시간 전송
        emitterService.send(
            event.getUserId(),
            "ORDER_COMPLETED",
            NotificationResponse.from(notification)
        );
    }

    // 새 이벤트 알림
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void onNewMessage(MessageSentEvent event) {
        emitterService.send(
            event.getRecipientId(),
            "NEW_MESSAGE",
            MessageNotification.of(event.getSenderId(), event.getContent())
        );
    }
}
```

**클라이언트 (JavaScript):**

```javascript
// SSE 연결 설정
const eventSource = new EventSource('/api/notifications/subscribe', {
    withCredentials: true  // 쿠키 포함
});

// 특정 이벤트 타입 수신
eventSource.addEventListener('ORDER_COMPLETED', (e) => {
    const data = JSON.parse(e.data);
    showToast(`주문 ${data.orderId} 완료! ${data.message}`);
    updateNotificationBadge();
});

eventSource.addEventListener('NEW_MESSAGE', (e) => {
    const data = JSON.parse(e.data);
    showMessagePreview(data.senderName, data.content);
});

// 연결 오류 처리 (자동 재연결)
eventSource.onerror = (e) => {
    console.log('SSE 연결 오류, 3초 후 재연결...');
    // EventSource는 자동으로 재연결 시도
    // Last-Event-ID 헤더로 끊긴 지점부터 이어받기
};

// 연결 해제 (페이지 이탈 시)
window.addEventListener('beforeunload', () => {
    eventSource.close();
});
```

---

## WebSocket (STOMP)

채팅처럼 **양방향 실시간 통신**이 필요할 때 사용합니다. STOMP 프로토콜을 사용하면 구독/발행 패턴으로 쉽게 구현할 수 있습니다.

```groovy
implementation 'org.springframework.boot:spring-boot-starter-websocket'
```

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 구독 경로 접두어 (서버→클라이언트 방향)
        // /topic: 브로드캐스트 (채팅방 전체)
        // /queue: 개인 메시지
        registry.enableSimpleBroker("/topic", "/queue");

        // 발행 경로 접두어 (클라이언트→서버 방향)
        // 클라이언트가 /app/chat 으로 보내면 @MessageMapping("/chat")이 받음
        registry.setApplicationDestinationPrefixes("/app");

        // 사용자별 개인 채널 접두어
        // /user/{username}/queue/... 형식
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")           // WebSocket 연결 엔드포인트
            .setAllowedOriginPatterns("*")
            .withSockJS();  // WebSocket 미지원 브라우저를 위한 폴백
    }
}
```

---

## 채팅 구현

```java
// 채팅 메시지 DTO
public record ChatMessage(
    String roomId,       // 채팅방 ID
    String sender,       // 보낸 사람
    String content,      // 내용
    MessageType type,    // ENTER(입장), TALK(대화), LEAVE(퇴장)
    LocalDateTime sentAt
) {}

// 채팅 컨트롤러
@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;

    // 클라이언트: /app/chat/{roomId} 로 메시지 전송
    // 서버: /topic/chat/{roomId} 구독자들에게 브로드캐스트
    @MessageMapping("/chat/{roomId}")
    @SendTo("/topic/chat/{roomId}")
    public ChatMessage sendMessage(
            @DestinationVariable String roomId,
            @Payload ChatMessageRequest request,
            Principal principal) {           // WebSocket 인증된 사용자

        Long senderId = Long.parseLong(principal.getName());

        // DB에 메시지 저장
        chatService.saveMessage(roomId, senderId, request.content());

        log.info("채팅 메시지: roomId={}, sender={}", roomId, principal.getName());

        return new ChatMessage(
            roomId,
            principal.getName(),
            request.content(),
            MessageType.TALK,
            LocalDateTime.now()
        );
    }

    // 채팅방 입장
    @MessageMapping("/chat/{roomId}/enter")
    @SendTo("/topic/chat/{roomId}")
    public ChatMessage enterRoom(
            @DestinationVariable String roomId,
            Principal principal) {

        String username = principal.getName();
        chatService.addMember(roomId, Long.parseLong(username));

        return new ChatMessage(
            roomId, username,
            username + "님이 입장했습니다.",
            MessageType.ENTER,
            LocalDateTime.now()
        );
    }

    // 서버에서 직접 특정 사용자에게 메시지 전송
    public void sendPrivateMessage(String username, Object message) {
        messagingTemplate.convertAndSendToUser(
            username,                   // 수신자
            "/queue/notification",      // 경로 (/user/{username}/queue/notification)
            message
        );
    }
}
```

**클라이언트 (JavaScript):**

```javascript
import { Client } from '@stomp/stompjs';

const client = new Client({
    brokerURL: 'ws://localhost:8080/ws',
    connectHeaders: {
        Authorization: 'Bearer ' + getToken()  // JWT 인증
    },
    reconnectDelay: 3000,  // 3초 후 재연결
});

client.onConnect = () => {
    console.log('WebSocket 연결 성공');

    // 채팅방 구독
    client.subscribe('/topic/chat/room123', (message) => {
        const chat = JSON.parse(message.body);
        displayMessage(chat);
    });

    // 개인 알림 구독
    client.subscribe('/user/queue/notification', (message) => {
        const notification = JSON.parse(message.body);
        showNotification(notification);
    });

    // 입장 알림
    client.publish({
        destination: '/app/chat/room123/enter',
        body: JSON.stringify({})
    });
};

// 메시지 전송
function sendMessage(content) {
    client.publish({
        destination: '/app/chat/room123',
        body: JSON.stringify({ content })
    });
}

client.activate();
```

---

## WebSocket 보안

```java
@Configuration
public class WebSocketSecurityConfig
        extends AbstractSecurityWebSocketMessageBrokerConfigurer {

    @Override
    protected void configureInbound(MessageSecurityMetadataSourceRegistry messages) {
        messages
            .simpSubscribeDestMatchers("/user/**").authenticated()  // 개인 구독 인증 필요
            .simpDestMatchers("/app/**").authenticated()            // 발행 인증 필요
            .simpSubscribeDestMatchers("/topic/public/**").permitAll()  // 공개 채널
            .anyMessage().authenticated();
    }

    @Override
    protected boolean sameOriginDisabled() {
        return true;  // JWT 사용 시 CSRF 비활성화
    }
}

// WebSocket 연결 시 JWT 검증
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements HandshakeInterceptor {

    private final JwtTokenProvider tokenProvider;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {

        // URL 쿼리 파라미터에서 토큰 추출
        // ws://localhost:8080/ws?token={JWT}
        String token = extractTokenFromQuery(request.getURI().getQuery());

        if (token == null || !tokenProvider.validateToken(token)) {
            log.warn("WebSocket 인증 실패: token={}", token);
            return false;  // 연결 거부
        }

        // 사용자 정보를 세션에 저장 (Principal로 사용)
        attributes.put("userId", tokenProvider.getUserId(token));
        return true;  // 연결 허용
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {}

    private String extractTokenFromQuery(String query) {
        if (query == null) return null;
        return Arrays.stream(query.split("&"))
            .filter(p -> p.startsWith("token="))
            .map(p -> p.substring(6))
            .findFirst()
            .orElse(null);
    }
}
```

---

## 분산 환경 WebSocket (Redis Pub/Sub)

서버가 여러 대일 때, 한 서버에 연결된 클라이언트에게 다른 서버의 메시지를 전달해야 합니다.

```
문제:
사용자 A (서버 1에 연결)
사용자 B (서버 2에 연결)
B가 A에게 메시지 → 서버 2는 서버 1에 있는 A에게 전달 불가!

해결: Redis Pub/Sub으로 서버 간 메시지 공유
메시지 → 서버 2 → Redis "chat:room123" 채널에 발행
                  → 서버 1도 구독 중 → 수신 → A에게 전달
```

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class RedisChatService {

    private final RedisTemplate<String, Object> redisTemplate;

    // 메시지를 Redis 채널에 발행 (모든 서버에 전달됨)
    public void publish(String roomId, ChatMessage message) {
        String channel = "chat:room:" + roomId;
        redisTemplate.convertAndSend(channel, message);
        log.debug("Redis Pub: channel={}", channel);
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
            String channel = new String(message.getChannel());
            String roomId = channel.replace("chat:room:", "");

            ChatMessage chatMsg = objectMapper.readValue(
                message.getBody(), ChatMessage.class);

            // WebSocket 구독자들에게 전달
            messagingTemplate.convertAndSend(
                "/topic/chat/" + roomId, chatMsg);

        } catch (Exception e) {
            log.error("Redis 메시지 처리 실패", e);
        }
    }
}

// Redis 리스너 컨테이너 설정
@Configuration
@RequiredArgsConstructor
public class RedisSubscriberConfig {

    private final RedisChatSubscriber subscriber;

    @Bean
    public RedisMessageListenerContainer redisContainer(
            RedisConnectionFactory factory) {

        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(factory);

        // "chat:room:*" 패턴의 모든 채널 구독
        container.addMessageListener(subscriber,
            new PatternTopic("chat:room:*"));

        return container;
    }
}
```

---

## SSE vs WebSocket 선택 가이드

```
SSE 사용:
✓ 서버 → 클라이언트 단방향
✓ 구현이 단순해야 할 때
✓ HTTP/2 환경 (다중화 지원)
✓ 사용 사례: 알림, 실시간 피드, 진행 상황 표시

WebSocket 사용:
✓ 클라이언트 ↔ 서버 양방향
✓ 낮은 레이턴시 필요
✓ 고빈도 메시지 (초당 수십 회 이상)
✓ 사용 사례: 채팅, 실시간 게임, 협업 편집
```

---

## 초보자가 자주 하는 실수

**실수 1: SSE 연결 직후 이벤트 없이 반환**

```java
// 나쁜 예: 연결 즉시 이벤트 없음 → 일부 브라우저/프록시에서 503
@GetMapping("/subscribe")
public SseEmitter subscribe() {
    SseEmitter emitter = new SseEmitter();
    emitterService.add(emitter);
    return emitter;  // 초기 이벤트 없음 → 문제!
}

// 좋은 예: 연결 즉시 더미 이벤트 전송
@GetMapping("/subscribe")
public SseEmitter subscribe() {
    SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
    try {
        emitter.send(SseEmitter.event().name("connect").data("ok"));
    } catch (IOException e) {
        emitter.completeWithError(e);
    }
    emitterService.add(emitter);
    return emitter;
}
```

**실수 2: WebSocket에 일반 @RequestMapping 사용 시도**

```java
// 나쁜 예: WebSocket 핸들러에 @GetMapping 사용
@GetMapping("/chat")          // WebSocket 요청에는 HTTP 매핑 안 됨
public void handleChat() { }

// 올바른 예
@MessageMapping("/chat/{roomId}")  // STOMP 메시지 매핑
@SendTo("/topic/chat/{roomId}")
public ChatMessage handleChat(...) { }
```

**실수 3: 단일 서버에서 인메모리 브로커 쓰다가 멀티 서버로 확장 시 메시지 손실**

```java
// 단일 서버: 인메모리 브로커 (빠르지만 서버 간 공유 안 됨)
registry.enableSimpleBroker("/topic", "/queue");

// 멀티 서버: Redis 외부 브로커 (처음부터 이걸로 설계하는 게 나음)
registry.enableStompBrokerRelay("/topic", "/queue")
    .setRelayHost("redis-host");
```
