---
title: "WebSocket과 Server-Sent Events"
order: 8
---

# WebSocket과 Server-Sent Events

HTTP는 클라이언트가 요청해야 응답이 온다. 실시간 데이터 전송이 필요할 때 WebSocket과 SSE를 쓴다.

택배 추적을 생각해보자. 보통 HTTP는 "택배 어디까지 왔어요?"라고 직접 물어야 한다. SSE는 택배 회사가 상태 바뀔 때마다 문자를 보내주는 것이다. WebSocket은 전화 연결처럼 양방향으로 계속 대화할 수 있는 것이다.

---

## 세 가지 방식 비교

| 항목 | HTTP 폴링 | SSE | WebSocket |
|------|-----------|-----|-----------|
| 방향 | 단방향 (클→서버→클) | 단방향 (서버→클) | 양방향 |
| 연결 | 요청마다 새 연결 | 지속 연결 | 지속 연결 |
| 프로토콜 | HTTP | HTTP | ws:// wss:// |
| 브라우저 지원 | ✅ | ✅ | ✅ |
| 자동 재연결 | ❌ (수동 구현) | ✅ (내장) | ❌ (수동 구현) |
| 용도 | 일반 API | 알림, 피드, 주가 | 채팅, 게임, 협업 |
| 구현 난이도 | 쉬움 | 보통 | 어려움 |
| 방화벽 통과 | 쉬움 | 쉬움 | 간혹 문제 |

---

## Long Polling (레거시, 이해용)

```
일반 폴링 (Polling):
1초마다 "새 메시지 있어요?" 요청
→ 대부분 "없음" 응답
→ 불필요한 요청 폭발

롱 폴링 (Long Polling):
클라이언트 → 서버에 요청
서버: 새 데이터 생길 때까지 응답 보류 (최대 30초)
새 데이터 생기면 응답
클라이언트: 응답 받자마자 다시 요청

장점: 실시간에 가까운 응답
단점: 연결 자원 소비, 서버 스레드 점유
→ SSE/WebSocket이 있으므로 새 프로젝트에서는 사용 안 함
```

---

## SSE (Server-Sent Events)

서버에서 클라이언트로 단방향 스트리밍. HTTP 기반이라 방화벽도 잘 통과한다.

```
SSE 프로토콜:
Content-Type: text/event-stream  ← 이 헤더가 핵심

각 이벤트 형식:
data: {"type":"notification","message":"새 댓글"}
                                              ← 빈 줄로 이벤트 구분

data: {"type":"alert","count":5}

id: 123
data: 메시지 본문
retry: 3000                       ← 재연결 간격 (ms)

필드 설명:
data  — 전송할 데이터 (필수)
id    — 이벤트 ID (재연결 시 마지막 받은 ID부터 재수신)
event — 이벤트 타입 (커스텀 이벤트 구분)
retry — 재연결 대기 시간 (밀리초)
빈 줄 — 이벤트 구분자 (반드시 필요)
```

```java
// Spring Boot SSE 구현
@RestController
public class NotificationController {

    // userId → SseEmitter 매핑 (접속 중인 사용자 관리)
    private final Map<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    // 클라이언트가 구독 시작
    @GetMapping(value = "/notifications/subscribe",
                produces = MediaType.TEXT_EVENT_STREAM_VALUE)  // SSE 핵심 헤더
    public SseEmitter subscribe(@AuthenticationPrincipal UserDetails user) {
        Long userId = Long.parseLong(user.getUsername());

        // 30분 타임아웃 (Nginx 기본 타임아웃보다 짧게)
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);

        emitters.put(userId, emitter);

        // 연결 종료/타임아웃/에러 시 맵에서 제거
        emitter.onCompletion(() -> emitters.remove(userId));
        emitter.onTimeout(() -> emitters.remove(userId));
        emitter.onError(e -> emitters.remove(userId));

        // 초기 연결 확인 이벤트 전송
        // (안 보내면 일부 환경에서 503 에러 발생)
        try {
            emitter.send(SseEmitter.event()
                .name("connect")
                .data("connected"));
        } catch (IOException e) {
            emitters.remove(userId);
        }

        return emitter;
    }

    // 특정 사용자에게 알림 전송 (다른 서비스에서 호출)
    public void sendNotification(Long userId, Object data) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                    .name("notification")
                    .data(data, MediaType.APPLICATION_JSON));
            } catch (IOException e) {
                // 전송 실패 → 연결 끊어진 것으로 간주
                emitters.remove(userId);
            }
        }
    }

    // 전체 사용자에게 브로드캐스트
    public void broadcast(Object data) {
        emitters.forEach((userId, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                    .name("broadcast")
                    .data(data, MediaType.APPLICATION_JSON));
            } catch (IOException e) {
                emitters.remove(userId);
            }
        });
    }
}
```

---

## WebSocket

양방향 실시간 통신. HTTP로 핸드셰이크 후 독립 프로토콜로 업그레이드된다.

```
연결 과정 (HTTP 업그레이드):

1. 클라이언트 → 서버: 업그레이드 요청
GET /ws HTTP/1.1
Host: example.com
Upgrade: websocket          ← WebSocket으로 업그레이드 요청
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13

2. 서버 → 클라이언트: 수락
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

3. 이후 WebSocket 프레임으로 양방향 통신
클라이언트 → 서버: 메시지 전송 가능
서버 → 클라이언트: 메시지 전송 가능
둘 다 언제든지 메시지 전송 가능!
```

---

## STOMP 프로토콜

WebSocket은 저수준 프로토콜이라 메시지 형식이 정해지지 않았다. STOMP는 WebSocket 위에서 동작하는 메시지 프로토콜로 채팅방 구독/발행을 편리하게 처리한다.

```
STOMP 개념:
Destination: 메시지를 보낼 주소 (채팅방 개념)
Subscribe:   특정 destination 구독 (수신)
Publish:     특정 destination으로 메시지 발행 (송신)

예시:
/topic/chat/123  → 채팅방 123 구독 (브로드캐스트)
/queue/user/456  → 사용자 456에게만 전송 (개인 메시지)
/app/chat.send   → 서버 핸들러로 전달
```

```java
// Spring Boot WebSocket + STOMP 설정
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // /topic, /queue로 시작하는 경로 → 메시지 브로커로 처리
        config.enableSimpleBroker("/topic", "/queue");

        // /app으로 시작하는 경로 → 컨트롤러 @MessageMapping으로 처리
        config.setApplicationDestinationPrefixes("/app");

        // 사용자별 개인 메시지 prefix
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")       // WebSocket 연결 URL
            .setAllowedOriginPatterns("*") // CORS 설정
            .withSockJS();                 // SockJS fallback (WebSocket 미지원 환경)
    }
}

// 채팅 컨트롤러
@Controller
public class ChatController {

    // /app/chat.send 으로 발행 → /topic/chat 구독자 전원에게 전송
    @MessageMapping("/chat.send")
    @SendTo("/topic/chat")
    public ChatMessage send(ChatMessage message) {
        message.setTimestamp(Instant.now());
        return message;  // 리턴값이 /topic/chat 구독자에게 전송됨
    }

    // 입장 알림
    @MessageMapping("/chat.join")
    @SendTo("/topic/chat")
    public ChatMessage join(ChatMessage message) {
        message.setContent(message.getSender() + " 님이 입장했습니다.");
        return message;
    }

    // 특정 사용자에게만 전송 (1:1 메시지)
    @MessageMapping("/chat.private")
    public void sendPrivate(
        @Payload PrivateMessage message,
        Principal principal  // 현재 접속자 정보
    ) {
        // /user/{userId}/queue/messages 구독자에게 전송
        messagingTemplate.convertAndSendToUser(
            message.getRecipientId().toString(),
            "/queue/messages",
            message
        );
    }
}
```

---

## 클라이언트 연결 (JavaScript)

```javascript
// SSE 클라이언트 - 서버 알림 구독
const eventSource = new EventSource('/notifications/subscribe');

// 커스텀 이벤트 타입 수신
eventSource.addEventListener('notification', (e) => {
    const data = JSON.parse(e.data);
    console.log('알림:', data);
    showNotification(data);  // UI에 알림 표시
});

// 브로드캐스트 이벤트
eventSource.addEventListener('broadcast', (e) => {
    const data = JSON.parse(e.data);
    console.log('공지:', data);
});

// 연결 에러 (자동 재연결됨)
eventSource.onerror = () => {
    console.log('SSE 연결 끊김, 자동 재연결 시도...');
    // 브라우저가 자동으로 재연결 (retry 값에 따라)
};

// 연결 종료 (로그아웃 시)
// eventSource.close();


// WebSocket + STOMP 클라이언트
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const client = new Client({
    // SockJS 사용 (일부 환경에서 WebSocket 대체)
    webSocketFactory: () => new SockJS('/ws'),

    onConnect: () => {
        console.log('WebSocket 연결됨');

        // 채팅방 구독 (메시지 수신)
        client.subscribe('/topic/chat', (message) => {
            const data = JSON.parse(message.body);
            console.log('새 메시지:', data);
            addMessageToUI(data);
        });

        // 개인 알림 구독
        client.subscribe('/user/queue/notifications', (message) => {
            console.log('개인 알림:', JSON.parse(message.body));
        });

        // 입장 알림 발행
        client.publish({
            destination: '/app/chat.join',
            body: JSON.stringify({ sender: 'Alice', content: '' })
        });
    },

    // 재연결 설정 (5초마다 시도)
    reconnectDelay: 5000,

    onDisconnect: () => {
        console.log('WebSocket 연결 끊김');
    }
});

client.activate();

// 메시지 전송 함수
function sendMessage(text) {
    client.publish({
        destination: '/app/chat.send',
        body: JSON.stringify({
            sender: 'Alice',
            content: text,
            roomId: 123
        })
    });
}
```

---

## 분산 환경에서의 WebSocket

```
문제 상황:
서버가 여러 대(스케일 아웃)일 때
클라이언트 A는 서버 1에 연결
클라이언트 B는 서버 2에 연결

A가 B에게 메시지 → 서버 1은 B의 연결을 모름!
→ 메시지 전달 불가

해결책 — Redis Pub/Sub:
서버 1 → Redis "chat:room:123" 채널에 발행
서버 2 → 같은 채널 구독 중 → 수신
서버 2 → 연결된 B에게 메시지 전달

구조:
[클라이언트 A] ─ WebSocket ─ [서버 1] ─→ Redis Pub/Sub
[클라이언트 B] ─ WebSocket ─ [서버 2] ←─ Redis Pub/Sub
```

```java
// Redis Pub/Sub으로 분산 WebSocket 구현
@Configuration
public class RedisConfig {

    // Redis 구독 리스너 컨테이너 설정
    @Bean
    public RedisMessageListenerContainer redisContainer(
        RedisConnectionFactory factory,
        ChatMessageSubscriber subscriber
    ) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(factory);
        // chat: 로 시작하는 모든 채널 구독
        container.addMessageListener(subscriber, new PatternTopic("chat:*"));
        return container;
    }
}

@Service
@RequiredArgsConstructor
public class ChatService {

    private final SimpMessagingTemplate messagingTemplate;  // WebSocket 전송
    private final StringRedisTemplate redisTemplate;       // Redis 발행

    // 채팅방에 메시지 브로드캐스트
    public void broadcast(String roomId, ChatMessage message) {
        // Redis 채널에 발행 → 모든 서버에서 수신
        redisTemplate.convertAndSend(
            "chat:" + roomId,
            JsonUtil.toJson(message));
    }
}

@Component
@RequiredArgsConstructor
public class ChatMessageSubscriber implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        // Redis 채널명에서 roomId 추출
        String channel = new String(message.getChannel());
        String roomId = channel.replace("chat:", "");

        // 메시지 파싱
        ChatMessage chatMessage = JsonUtil.fromJson(
            new String(message.getBody()), ChatMessage.class);

        // 이 서버에 연결된 해당 채팅방 구독자에게 전송
        messagingTemplate.convertAndSend(
            "/topic/chat/" + roomId, chatMessage);
    }
}
```

---

## 연결 관리와 하트비트

```java
// WebSocket 연결/해제 이벤트 처리
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final RedisTemplate<String, String> redisTemplate;

    // 연결됨
    @EventListener
    public void handleConnect(SessionConnectedEvent event) {
        String sessionId = event.getMessage().getHeaders()
            .get("simpSessionId", String.class);
        log.info("WebSocket connected: {}", sessionId);
    }

    // 구독 시작
    @EventListener
    public void handleSubscribe(SessionSubscribeEvent event) {
        String destination = event.getMessage().getHeaders()
            .get("simpDestination", String.class);
        log.info("Subscribed to: {}", destination);
    }

    // 연결 끊김 (비정상 종료 포함)
    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        log.info("WebSocket disconnected: {}", sessionId);
        // 온라인 상태 업데이트 등 처리
    }
}
```

---

## 언제 무엇을 쓸까

```
SSE를 선택하는 경우:
✅ 서버 → 클라이언트 단방향 (알림, 실시간 피드, 주가 정보, 진행률)
✅ HTTP 기반이라 방화벽, 프록시 통과 쉬움
✅ 자동 재연결 내장 (구현 간단)
✅ 구현과 디버깅이 단순

실제 사용 예:
- GitHub Actions 빌드 로그 실시간 표시
- 이메일/앱 알림 푸시
- 뉴스 피드 업데이트
- ChatGPT 같은 AI 스트리밍 응답

WebSocket을 선택하는 경우:
✅ 양방향 실시간 통신 (채팅, 게임, 협업 도구)
✅ 높은 빈도의 메시지 교환 (게임 상태, 실시간 편집)
✅ 낮은 레이턴시 필요 (10ms 이하)

실제 사용 예:
- 카카오톡, 슬랙 채팅
- 온라인 게임
- Google Docs 공동 편집
- 주식 트레이딩 화면

Long Polling (레거시):
— SSE/WebSocket 사용 불가할 때만 (매우 드문 경우)
— 클라이언트가 응답 오면 즉시 다시 요청
— 요즘은 거의 쓰지 않음

결정 트리:
클라이언트 → 서버 메시지도 필요한가?
    YES → WebSocket
    NO  → SSE
```

---

## 흔한 실수와 주의사항

```
실수 1: SSE에서 연결 수 제한 무시
— HTTP/1.1: 도메인당 최대 6개 연결 제한
— HTTP/2: 제한 없음 (멀티플렉싱)
— 개발 환경에서 탭 여러 개 열면 연결 안 될 수 있음

실수 2: WebSocket 서버 확장 시 세션 공유 누락
— 서버 여러 대 → Redis Pub/Sub 필수
— Sticky Session만으로는 불완전 (서버 재시작 시 모든 연결 끊김)

실수 3: 메시지 누락 처리 안 함
— 연결 끊겼다가 재연결 시 그 사이 메시지 누락
— SSE: id + Last-Event-ID 헤더로 재전송 요청
— WebSocket: 재연결 후 미수신 메시지 별도 요청

실수 4: 인증 처리 누락
— WebSocket 연결 시 JWT 검증 필수
— 쿼리 파라미터로 토큰 전달: ws://server/ws?token=...
— 또는 STOMP CONNECT 프레임 헤더에 토큰 포함
```
