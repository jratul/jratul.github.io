---
title: "Pub/Sub과 Streams"
order: 5
---

# Pub/Sub과 Streams

Redis를 메시지 브로커로 활용하는 두 가지 방법.

---

## Pub/Sub

발행(Publish)-구독(Subscribe) 메시징 패턴.

```
특징:
— 메시지 발행 시 구독자에게 즉시 전달
— 메시지가 저장되지 않음 (구독자 없으면 소실!)
— 1:N 브로드캐스팅에 적합
— 분산 WebSocket, 실시간 알림에 활용
```

```bash
# 구독
SUBSCRIBE channel1 channel2
PSUBSCRIBE news:*       # 패턴 구독

# 발행
PUBLISH channel1 "Hello!"
PUBLISH news:sports "경기 결과: ..."
```

```java
// Spring Data Redis Pub/Sub

// 메시지 발행
@Service
@RequiredArgsConstructor
public class NotificationPublisher {

    private final StringRedisTemplate redisTemplate;

    public void publish(String channel, Object message) {
        redisTemplate.convertAndSend(channel, JsonUtil.toJson(message));
    }
}

// 메시지 구독
@Component
public class NotificationSubscriber implements MessageListener {

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String body = new String(message.getBody());
        String channel = new String(message.getChannel());

        NotificationEvent event = JsonUtil.fromJson(body, NotificationEvent.class);
        // 처리...
        log.info("Received on {}: {}", channel, body);
    }
}

// 구독 등록
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

        // 특정 채널 구독
        container.addMessageListener(subscriber,
            new ChannelTopic("notifications"));

        // 패턴 구독
        container.addMessageListener(subscriber,
            new PatternTopic("events:*"));

        return container;
    }
}
```

---

## WebSocket + Redis Pub/Sub (분산 환경)

```java
// 서버 1에 연결된 유저에게 서버 2가 메시지 전송
// 서버 2 → Redis Publish → 서버 1 Subscribe → WebSocket 전송

@Service
@RequiredArgsConstructor
public class ChatPublisher {

    private final StringRedisTemplate redisTemplate;

    public void sendMessage(String roomId, ChatMessage message) {
        redisTemplate.convertAndSend(
            "chat:" + roomId,
            JsonUtil.toJson(message)
        );
    }
}

@Component
@RequiredArgsConstructor
public class ChatSubscriber implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String channel = new String(message.getChannel());
        String roomId = channel.replace("chat:", "");
        ChatMessage chat = JsonUtil.fromJson(
            new String(message.getBody()), ChatMessage.class);

        // 이 서버에 연결된 WebSocket 클라이언트에게 전송
        messagingTemplate.convertAndSend("/topic/chat/" + roomId, chat);
    }
}
```

---

## Redis Streams

Pub/Sub과 달리 메시지가 저장되고, 소비자 그룹 지원.

```
Pub/Sub vs Streams:
Pub/Sub:
— 메시지 저장 없음 (소실 가능)
— 실시간 브로드캐스팅
— 구독자 없으면 메시지 소실

Streams:
— 메시지 영속 저장
— 소비자 그룹 (Consumer Group)
— 메시지 확인(ACK) 지원
— 재처리 가능
— Kafka와 유사 (단, 단일 노드)
```

```bash
# 메시지 추가
XADD orders * type "NEW_ORDER" orderId "123" userId "456"
XADD orders * type "PAYMENT" orderId "123" amount "50000"
# * = 자동 ID (timestamp-sequence)

# 메시지 조회
XLEN orders                     # 메시지 수
XRANGE orders - +               # 전체
XRANGE orders - + COUNT 10      # 앞 10개
XREVRANGE orders + - COUNT 5    # 최근 5개

# 소비자 그룹 생성
XGROUP CREATE orders notification-group $ MKSTREAM
# $: 현재 이후 메시지만 수신
# 0: 처음부터 수신

# 그룹에서 메시지 읽기
XREADGROUP GROUP notification-group consumer1 COUNT 10 STREAMS orders >
# >: 미처리 메시지만

# 메시지 확인 (처리 완료)
XACK orders notification-group 1704067200000-0

# 미확인 메시지 목록 (다른 소비자가 처리 중이거나 실패)
XPENDING orders notification-group - + 10

# 오래된 미확인 메시지 재할당
XCLAIM orders notification-group consumer2 30000 1704067200000-0
# 30초(30000ms) 이상 미확인 메시지를 consumer2에 할당
```

---

## Spring + Redis Streams

```java
// 메시지 발행
@Service
@RequiredArgsConstructor
public class OrderEventPublisher {

    private final StreamOperations<String, String, String> streamOps;

    public void publishOrderCreated(Order order) {
        Map<String, String> fields = Map.of(
            "type", "ORDER_CREATED",
            "orderId", order.getId().toString(),
            "userId", order.getUserId().toString(),
            "amount", order.getAmount().toString()
        );
        streamOps.add("orders", fields);
    }
}

// 소비자 그룹 리스너
@Component
@RequiredArgsConstructor
public class OrderEventConsumer {

    @StreamListener(target = "orders", group = "notification-group")
    public void handleOrderCreated(MapRecord<String, String, String> record) {
        String type = record.getValue().get("type");

        if ("ORDER_CREATED".equals(type)) {
            String orderId = record.getValue().get("orderId");
            // 알림 발송...
            log.info("주문 생성 이벤트 처리: {}", orderId);
        }
    }
}

// 또는 수동 폴링
@Scheduled(fixedDelay = 1000)
public void pollStream() {
    List<MapRecord<String, Object, Object>> messages =
        redisTemplate.opsForStream()
            .read(Consumer.from("notification-group", "consumer1"),
                  StreamReadOptions.empty().count(10),
                  StreamOffset.create("orders", ReadOffset.lastConsumed()));

    for (MapRecord<String, Object, Object> record : messages) {
        try {
            processMessage(record);
            redisTemplate.opsForStream().acknowledge("orders", "notification-group", record.getId());
        } catch (Exception e) {
            log.error("메시지 처리 실패: {}", record.getId(), e);
            // 재처리 대기
        }
    }
}
```

---

## Pub/Sub vs Streams 선택

```
Pub/Sub 선택:
✅ 실시간 브로드캐스팅 (채팅, 알림)
✅ 메시지 소실 허용
✅ 구현 단순

Streams 선택:
✅ 메시지 소실 불허 (주문, 결제)
✅ 재처리 필요
✅ 여러 소비자 그룹 필요
✅ 메시지 히스토리 필요

실제 프로덕션에서 신뢰성 필요하면 Kafka 사용 권장
Redis Streams는 단일 노드 한계, 클러스터에서 완전 동작 안 함
```
