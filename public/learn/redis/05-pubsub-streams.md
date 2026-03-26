---
title: "Pub/Sub과 Streams"
order: 5
---

# Pub/Sub과 Streams

Redis를 메시지 브로커로 활용하는 두 가지 방법.

---

## 메시지 브로커란

```
기존 방식 (직접 호출):
서비스 A → HTTP 요청 → 서비스 B

문제:
- 서비스 B가 죽어있으면? → A도 실패
- B가 느리면? → A도 느려짐
- B에 접속이 몰리면? → B 과부하

메시지 브로커 방식:
서비스 A → 메시지 발행 → [중간 브로커] → 서비스 B 수신

장점:
- A와 B는 서로 모름 (느슨한 결합)
- B가 죽어있어도 메시지는 브로커에 보관
- B가 여러 개이면 메시지를 나눠서 처리 (부하 분산)
```

Redis는 간단한 메시지 브로커 역할을 할 수 있다.
복잡한 메시징이 필요하면 Kafka나 RabbitMQ를 써야 하지만,
**간단한 실시간 통신**에는 Redis만으로 충분하다.

---

## Pub/Sub — 실시간 브로드캐스팅

**발행(Publish) - 구독(Subscribe) 패턴**

```
발행자: "notifications" 채널에 메시지 발행
           ↓
구독자1, 구독자2, 구독자3: 동시에 메시지 수신

특징:
- 메시지가 저장되지 않음 (휘발성)
- 구독자 없으면 메시지 소실
- 실시간 브로드캐스팅에 최적
```

```bash
# Redis CLI에서 직접 테스트
# 창 1: 구독
SUBSCRIBE notifications
SUBSCRIBE chat:room:123

# 창 2: 발행
PUBLISH notifications "서버 점검 예정: 오늘 새벽 2시"
PUBLISH chat:room:123 "안녕하세요!"

# 패턴 구독 (와일드카드)
PSUBSCRIBE news:*         # news:sports, news:tech 모두 수신
PSUBSCRIBE chat:room:*    # 모든 채팅방 메시지 수신
```

```java
// Spring Data Redis Pub/Sub

// 메시지 발행 서비스
@Service
@RequiredArgsConstructor
public class NotificationPublisher {

    private final StringRedisTemplate redisTemplate;

    public void publishNotification(String userId, NotificationEvent event) {
        String channel = "notifications:" + userId;      // 사용자별 채널
        String message = JsonUtil.toJson(event);
        redisTemplate.convertAndSend(channel, message);
    }

    public void broadcastAnnouncement(AnnouncementEvent event) {
        String message = JsonUtil.toJson(event);
        redisTemplate.convertAndSend("announcements", message);  // 전체 공지
    }
}

// 메시지 수신 리스너
@Component
@Slf4j
public class NotificationSubscriber implements MessageListener {

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String channel = new String(message.getChannel(), StandardCharsets.UTF_8);
        String body = new String(message.getBody(), StandardCharsets.UTF_8);

        log.info("메시지 수신 - 채널: {}, 내용: {}", channel, body);

        try {
            NotificationEvent event = JsonUtil.fromJson(body, NotificationEvent.class);
            // 처리 로직...
            processNotification(event);
        } catch (Exception e) {
            log.error("메시지 처리 실패: {}", body, e);
        }
    }
}

// 구독 설정
@Configuration
@RequiredArgsConstructor
public class RedisSubscriberConfig {

    @Bean
    public RedisMessageListenerContainer listenerContainer(
        RedisConnectionFactory factory,
        NotificationSubscriber subscriber
    ) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(factory);
        container.setTaskExecutor(Executors.newFixedThreadPool(4));  // 4개 스레드

        // 특정 채널 구독
        container.addMessageListener(subscriber,
            new ChannelTopic("announcements"));

        // 패턴 구독 (notifications:* = 모든 사용자 알림)
        container.addMessageListener(subscriber,
            new PatternTopic("notifications:*"));

        return container;
    }
}
```

---

## WebSocket + Redis Pub/Sub — 분산 채팅 서버

여러 서버가 있을 때 WebSocket 메시지를 모든 서버의 클라이언트에 전달하는 패턴이다.

```
서버 1 (user:A 연결)      Redis Pub/Sub      서버 2 (user:B 연결)
        ↑                     ↑                     ↑
     user:A         ───── Publish ──────>    Subscribe → user:B에게 전달
 "user:B에게 메시지"       chat:room:1
```

```java
// 채팅 메시지 발행 (어느 서버든 Redis에 publish)
@Service
@RequiredArgsConstructor
public class ChatPublisher {

    private final StringRedisTemplate redisTemplate;

    public void sendMessage(String roomId, ChatMessage message) {
        String channel = "chat:" + roomId;
        redisTemplate.convertAndSend(channel, JsonUtil.toJson(message));
    }
}

// 채팅 메시지 수신 (Redis에서 받아서 이 서버에 연결된 WebSocket에 전달)
@Component
@RequiredArgsConstructor
@Slf4j
public class ChatSubscriber implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;  // WebSocket 발송

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String channel = new String(message.getChannel(), StandardCharsets.UTF_8);
        String roomId = channel.replace("chat:", "");
        ChatMessage chat = JsonUtil.fromJson(
            new String(message.getBody(), StandardCharsets.UTF_8),
            ChatMessage.class
        );

        // 이 서버에 WebSocket으로 연결된 클라이언트에게 전송
        messagingTemplate.convertAndSend("/topic/chat/" + roomId, chat);
        log.debug("채팅 전달 - 방: {}, 발신: {}", roomId, chat.getSenderId());
    }
}

// 구독 동적 등록 (채팅방 생성 시)
@Service
@RequiredArgsConstructor
public class ChatRoomService {

    private final RedisMessageListenerContainer listenerContainer;
    private final ChatSubscriber chatSubscriber;

    public void subscribeRoom(String roomId) {
        // 방이 생성되면 해당 채널 구독 시작
        listenerContainer.addMessageListener(chatSubscriber,
            new PatternTopic("chat:" + roomId));
    }
}
```

---

## Redis Streams — 영속적 메시지 큐

Pub/Sub의 단점(메시지 소실)을 해결한 버전이다.
**Kafka와 유사한 개념**이지만 단순하고 가볍다.

```
Pub/Sub vs Streams:

Pub/Sub:
- 메시지 저장 없음 → 구독자 없으면 소실
- 실시간 브로드캐스팅에 적합

Streams:
- 메시지 영구 저장 (명시적 삭제 전까지)
- 소비자 그룹: 여러 소비자가 나눠서 처리
- ACK 지원: "처리했다"고 확인해야 완료
- 처리 실패 시 재처리 가능
- 주문, 결제 등 소실되면 안 되는 메시지에 적합
```

```bash
# Redis CLI에서 Streams 기본 사용

# 메시지 추가 (* = 자동 ID)
XADD orders * type "ORDER_PLACED" orderId "123" userId "456" amount "50000"
XADD orders * type "ORDER_PAID" orderId "123" paymentId "789"

# 메시지 조회
XLEN orders                          # 전체 메시지 수
XRANGE orders - +                    # 전체 조회
XRANGE orders - + COUNT 10           # 앞 10개
XREVRANGE orders + - COUNT 5         # 최근 5개

# 소비자 그룹 생성
XGROUP CREATE orders payment-group $ MKSTREAM
# $: 지금 이후 메시지만 (이전 메시지 무시)
# 0: 처음부터 모든 메시지 받기

# 그룹으로 메시지 읽기
XREADGROUP GROUP payment-group consumer1 COUNT 10 STREAMS orders >
# >: 아직 처리 안 한 메시지

# 처리 완료 확인 (ACK)
XACK orders payment-group 1704067200000-0

# 미확인 메시지 목록 (처리 실패한 것들)
XPENDING orders payment-group - + 10

# 오래된 미확인 메시지 재할당 (다른 소비자에게)
XCLAIM orders payment-group consumer2 30000 1704067200000-0
# 30000ms = 30초 이상 미확인된 메시지를 consumer2에 재할당
```

```java
// Spring Boot + Redis Streams

// 메시지 발행
@Service
@RequiredArgsConstructor
public class OrderEventPublisher {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String STREAM_KEY = "orders";

    public void publishOrderCreated(Order order) {
        // Map 형태로 메시지 필드 구성
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("type", "ORDER_CREATED");
        fields.put("orderId", order.getId().toString());
        fields.put("userId", order.getUserId().toString());
        fields.put("amount", order.getTotalAmount().toString());
        fields.put("createdAt", Instant.now().toString());

        redisTemplate.opsForStream().add(STREAM_KEY, fields);
    }
}

// 메시지 수동 폴링 소비자
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventConsumer {

    private final StringRedisTemplate redisTemplate;

    @Scheduled(fixedDelay = 1000)  // 1초마다 폴링
    public void pollMessages() {
        List<MapRecord<String, Object, Object>> messages =
            redisTemplate.opsForStream()
                .read(
                    Consumer.from("notification-group", "consumer-" + getInstanceId()),
                    StreamReadOptions.empty().count(10).block(Duration.ofSeconds(1)),
                    StreamOffset.create("orders", ReadOffset.lastConsumed())
                );

        if (messages == null || messages.isEmpty()) return;

        for (MapRecord<String, Object, Object> record : messages) {
            try {
                String type = (String) record.getValue().get("type");
                String orderId = (String) record.getValue().get("orderId");

                log.info("이벤트 처리: type={}, orderId={}", type, orderId);
                processEvent(type, orderId, record.getValue());

                // 처리 성공 → ACK
                redisTemplate.opsForStream()
                    .acknowledge("orders", "notification-group", record.getId());

            } catch (Exception e) {
                log.error("이벤트 처리 실패: {}", record.getId(), e);
                // ACK 안 하면 pending 상태 → 나중에 재처리 가능
            }
        }
    }

    private void processEvent(String type, String orderId, Map<Object, Object> data) {
        switch (type) {
            case "ORDER_CREATED" -> sendOrderConfirmationEmail(orderId);
            case "ORDER_PAID"    -> sendPaymentReceiptEmail(orderId);
            case "ORDER_SHIPPED" -> sendShippingNotification(orderId);
        }
    }
}
```

---

## Pub/Sub vs Streams 선택 기준

```
Pub/Sub 선택:
✅ 실시간성이 핵심 (채팅, 실시간 알림, 게임)
✅ 메시지 소실 허용 가능
✅ 구현이 단순해야 함
✅ 브로드캐스팅 (1:N 전파)

예시:
- 채팅 메시지
- 가격 변동 알림
- 시스템 공지사항 (접속 중인 사용자에게 즉시)
- WebSocket + 분산 서버

Streams 선택:
✅ 메시지 소실 절대 안 됨 (주문, 결제, 중요 이벤트)
✅ 재처리 필요 (실패 복구)
✅ 여러 소비자 그룹이 독립적으로 처리
✅ 메시지 히스토리 필요

예시:
- 주문 생성 이벤트 (결제, 재고, 알림 각각 처리)
- 결제 처리
- 사용자 가입 (이메일 발송, 웰컴 포인트, 분석)

진짜 프로덕션에서 신뢰성이 필요하다면:
→ Kafka 또는 RabbitMQ 사용 권장
   (Redis Streams는 단일 노드 한계, 클러스터에서 완전히 동작 안 함)
```

---

## 자주 하는 실수

```java
// 실수 1: Pub/Sub에서 메시지 소실 허용 안 되는 이벤트에 사용
redisTemplate.convertAndSend("payment-events", paymentData);
// 구독자가 잠깐 죽어있으면? → 메시지 소실 → 결제 처리 안 됨!
// 해결: 결제 같은 중요 이벤트는 Streams 또는 Kafka 사용

// 실수 2: Streams에서 ACK 누락
for (MapRecord<String, Object, Object> record : messages) {
    processMessage(record);
    // ACK 빠뜨림! → pending 상태로 남아 계속 재처리됨
    // 해결: 처리 성공 후 반드시 acknowledge()
}

// 실수 3: 소비자 그룹 이름 오타로 메시지 중복 처리
// XGROUP CREATE orders "notification-group" ...
// XREADGROUP GROUP "notifcation-group" consumer1 ...  ← 오타!
// → 다른 그룹으로 인식 → 같은 메시지를 두 그룹이 처리

// 실수 4: Streams 크기 무제한 성장
XADD orders * type "ORDER_PLACED" ...
// → 메시지가 계속 쌓임 → 메모리 폭발
// 해결: MAXLEN으로 크기 제한
XADD orders MAXLEN ~ 10000 * type "ORDER_PLACED" ...
// ~ = 근사치로 10000개 유지 (정확히 10000개보다 효율적)
```
