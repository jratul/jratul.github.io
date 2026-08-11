---
title: "분산 트랜잭션, 2PC 대신 Saga와 Outbox"
date: "2026-08-11"
tags: ["distributed-transaction", "saga", "outbox-pattern", "microservices", "messaging", "backend"]
excerpt: "마이크로서비스에서 단일 DB 트랜잭션이 불가능해질 때, 2PC의 한계와 그 대안인 Saga 패턴, Outbox 패턴을 정리합니다."
---

# 분산 트랜잭션, 2PC 대신 Saga와 Outbox

한 DB 안에서의 트랜잭션 격리 수준은 [트랜잭션 격리 수준(Isolation Level)](/post/backend/database/transaction-isolation)에서 다뤘습니다. 이 글은 여러 서비스, 여러 DB에 걸친 트랜잭션을 다룹니다. 격리 수준은 하나의 DB 안에서 동시 실행되는 트랜잭션들이 서로를 얼마나 침범하는지의 문제였다면, 여기서는 애초에 하나의 트랜잭션으로 묶을 수 없는 상황에서 원자성을 어떻게 흉내 낼 것인가의 문제입니다.

---

## 왜 문제가 되는가

모놀리식 애플리케이션에서는 주문을 생성하면서 재고를 차감하고 결제를 처리하는 로직을 다음처럼 하나의 트랜잭션으로 묶을 수 있습니다.

```java
@Transactional
public void placeOrder(OrderRequest request) {
    orderRepository.save(new Order(request));
    inventoryRepository.decreaseStock(request.getProductId(), request.getQuantity());
    paymentRepository.charge(request.getUserId(), request.getAmount());
}
```

세 작업 중 하나라도 실패하면 `@Transactional`이 전체를 롤백합니다. 단일 DB 커넥션 위에서 동작하기 때문에 가능한 일입니다.

이제 이 세 작업이 각각 Order 서비스, Inventory 서비스, Payment 서비스로 쪼개지고 서비스마다 자신만의 DB를 갖는다고 가정합니다. Order 서비스의 코드는 더 이상 Inventory DB에도, Payment DB에도 접근할 수 없습니다. 접근할 수 있다 해도 서로 다른 DB에 걸친 하나의 로컬 트랜잭션은 존재하지 않습니다. 재고 차감은 성공했는데 결제가 실패하면, 누군가 나서서 재고를 원래대로 되돌려 놓아야 합니다. 이게 분산 트랜잭션 문제입니다.

```
[Order 서비스] --- 자체 DB
[Inventory 서비스] --- 자체 DB
[Payment 서비스] --- 자체 DB

주문 생성 → 재고 차감 → 결제 처리
   ✅          ✅          ❌  (실패!)

재고는 이미 차감됐는데 결제가 실패했다면?
→ 누가, 언제, 어떻게 재고를 되돌릴 것인가
```

---

## 2PC(Two-Phase Commit)의 한계

분산 환경에서 원자성을 보장하는 전통적인 방법으로 2PC(Two-Phase Commit, 2단계 커밋)가 있습니다. 코디네이터(Coordinator) 하나가 여러 참여자(Participant)의 커밋 여부를 조율하는 프로토콜입니다.

```
1단계 (Prepare)
  코디네이터 → 참여자 A: "커밋할 수 있어?"
  코디네이터 → 참여자 B: "커밋할 수 있어?"
  참여자 A, B: 각자 로컬에서 커밋 준비(Lock 획득, Undo/Redo 로그 기록) 후 "OK" 응답

2단계 (Commit)
  모든 참여자가 OK면 → 코디네이터가 전원에게 "커밋해" 지시
  하나라도 실패면 → 코디네이터가 전원에게 "롤백해" 지시
```

의사코드로 보면 다음과 같은 흐름입니다.

```
function twoPhaseCommit(participants):
    // Phase 1: Prepare
    for p in participants:
        response = p.prepare()
        if response != OK:
            for p2 in participants:
                p2.rollback()
            return FAILED

    // Phase 2: Commit
    for p in participants:
        p.commit()
    return SUCCESS
```

문제는 2단계 사이의 시간입니다. 참여자는 Prepare 단계에서 응답한 뒤 Commit 지시가 올 때까지 획득한 Lock을 풀지 못하고 대기합니다. 이 상태에서 코디네이터가 장애로 죽으면, 참여자들은 커밋해야 할지 롤백해야 할지 알 수 없는 채로 Lock을 계속 쥐고 블로킹됩니다. 이를 in-doubt(불확정) 상태라고 부릅니다.

- 코디네이터 장애 시 전체 참여자가 블로킹된다 (단일 장애점)
- 모든 참여자가 응답할 때까지 Lock을 걸고 대기해야 해서 가용성과 처리량이 떨어진다
- 참여자 수가 늘어날수록 네트워크 왕복과 Lock 보유 시간이 함께 늘어난다

이런 특성 때문에 2PC는 서비스가 독립적으로 배포되고 네트워크 파티션이 일상적인 마이크로서비스 환경에는 잘 맞지 않습니다. 실무에서 MSA 간 트랜잭션에 2PC를 직접 쓰는 경우는 거의 없습니다.

---

## Saga 패턴

Saga는 하나의 큰 트랜잭션을 여러 개의 로컬 트랜잭션으로 쪼개고, 각 로컬 트랜잭션이 자신의 서비스 안에서 즉시 커밋되도록 하는 방식입니다. 중간에 어느 단계가 실패하면, 이미 커밋된 이전 단계들을 취소하기 위한 **보상 트랜잭션**(Compensating Transaction)을 순서를 거슬러 실행합니다.

```
정상 흐름:
  T1(주문 생성) → T2(재고 차감) → T3(결제 처리) → 완료

T3 실패 시:
  T1(주문 생성) → T2(재고 차감) → T3(결제 실패)
                                       ↓
  C1(주문 취소) ← C2(재고 복원) ← 보상 시작
```

핵심은 각 로컬 트랜잭션이 자신의 DB 안에서는 원자적으로 커밋되지만, 전체 흐름의 원자성은 Lock이 아니라 실패 시 역방향으로 실행되는 보상 트랜잭션으로 흉내 낸다는 점입니다. Saga를 조율하는 방식은 크게 두 가지로 나뉩니다.

### Choreography(코레오그래피) 방식

중앙 조정자 없이, 각 서비스가 이벤트를 발행하고 다른 서비스가 그 이벤트를 구독해서 다음 단계를 스스로 트리거합니다.

```
Order 서비스: 주문 생성 → "OrderCreated" 이벤트 발행
                              ↓ (구독)
Inventory 서비스: 재고 차감 → "StockDecreased" 이벤트 발행
                              ↓ (구독)
Payment 서비스: 결제 처리 실패 → "PaymentFailed" 이벤트 발행
                              ↓ (구독)
Inventory 서비스: "StockRestored" (보상)
                              ↓ (구독)
Order 서비스: "OrderCancelled" (보상)
```

```java
// Inventory 서비스: OrderCreated를 구독해서 스스로 다음 단계를 수행
@EventListener
public void on(OrderCreatedEvent event) {
    try {
        inventoryService.decreaseStock(event.getProductId(), event.getQuantity());
        eventPublisher.publish(new StockDecreasedEvent(event.getOrderId()));
    } catch (OutOfStockException e) {
        eventPublisher.publish(new StockDecreaseFailedEvent(event.getOrderId()));
    }
}

// PaymentFailed를 구독해서 스스로 보상(재고 복원)을 수행
@EventListener
public void on(PaymentFailedEvent event) {
    inventoryService.restoreStock(event.getOrderId());
    eventPublisher.publish(new StockRestoredEvent(event.getOrderId()));
}
```

각 서비스가 자기 역할만 알면 되므로 서비스 간 결합도가 낮습니다. 반면 서비스 수가 늘어날수록 "지금 전체 흐름이 어디까지 진행됐는지"를 한눈에 파악하기 어려워집니다. 이벤트 구독 관계가 여러 서비스에 흩어져 있어서, 흐름을 이해하려면 코드를 서비스별로 따라다녀야 합니다.

### Orchestration(오케스트레이션) 방식

중앙 오케스트레이터가 각 서비스를 순서대로 명시적으로 호출하고, 실패 시 보상 트랜잭션 실행도 오케스트레이터가 직접 지시합니다.

```java
public class OrderSagaOrchestrator {

    public void execute(OrderRequest request) {
        String orderId = orderService.createOrder(request);
        try {
            inventoryService.decreaseStock(request.getProductId(), request.getQuantity());
        } catch (Exception e) {
            orderService.cancelOrder(orderId);
            return;
        }

        try {
            paymentService.charge(request.getUserId(), request.getAmount());
        } catch (Exception e) {
            inventoryService.restoreStock(request.getProductId(), request.getQuantity());
            orderService.cancelOrder(orderId);
            return;
        }

        orderService.confirmOrder(orderId);
    }
}
```

흐름 전체가 한 클래스 안에 순서대로 드러나기 때문에 어느 단계에서 무엇을 보상해야 하는지 추적하기 쉽습니다. 단점은 오케스트레이터에 비즈니스 흐름 로직이 집중된다는 점입니다. 참여 서비스가 늘어날수록 오케스트레이터가 점점 비대해지고, 오케스트레이터 자체의 가용성도 신경 써야 합니다.

### 비교

| 항목 | Choreography | Orchestration |
|---|---|---|
| 조정 방식 | 이벤트 발행/구독, 중앙 조정자 없음 | 중앙 오케스트레이터가 순서대로 호출 |
| 결합도 | 서비스 간 결합도 낮음 | 오케스트레이터와 각 서비스 간 결합 |
| 흐름 가시성 | 서비스 수가 늘면 추적 어려움 | 흐름이 한곳에 명시적으로 드러남 |
| 로직 위치 | 각 서비스에 분산 | 오케스트레이터에 집중 |
| 적합한 규모 | 참여 서비스가 적고 단순한 흐름 | 참여 서비스가 많고 흐름이 복잡한 경우 |

참여 서비스가 2~3개 수준이면 Choreography로도 충분히 관리할 수 있지만, 단계가 늘어나고 분기(조건에 따라 다른 보상이 필요한 경우 등)가 많아지면 Orchestration이 흐름을 파악하기 훨씬 쉽습니다.

---

## Outbox 패턴

Saga를 Choreography로 구현하든 Orchestration으로 구현하든, 각 단계는 결국 "내 DB에 상태를 커밋"하면서 동시에 "다음 단계를 위해 메시지 브로커에 이벤트를 발행"해야 합니다. 그런데 이 둘은 서로 다른 두 시스템입니다.

```java
@Transactional
public void decreaseStock(Long productId, int quantity) {
    inventoryRepository.decreaseStock(productId, quantity);   // DB 커밋
    kafkaTemplate.send("stock-decreased", new StockDecreasedEvent(productId)); // 메시지 발행
}
```

이 코드는 두 가지 방식으로 깨질 수 있습니다.

- DB 커밋은 성공했는데 메시지 발행 직전에 프로세스가 죽으면, 이벤트가 영영 발행되지 않는다
- 메시지는 먼저 발행됐는데 DB 커밋이 실패해서 롤백되면, 실제로 일어나지 않은 일에 대한 이벤트가 이미 나가버린다

DB 트랜잭션과 메시지 브로커 발행은 서로 다른 리소스라서 하나의 트랜잭션으로 묶을 수 없습니다. 이를 이중 쓰기 문제(dual write problem)라고 부릅니다.

Outbox 패턴은 이 문제를 "메시지 발행"을 별도 시스템에 대한 쓰기가 아니라, **같은 DB 트랜잭션 안에서의 테이블 쓰기**로 바꿔서 해결합니다. 비즈니스 테이블을 갱신하는 트랜잭션 안에 Outbox 테이블에 이벤트 레코드를 함께 남깁니다.

```
[하나의 로컬 트랜잭션]
  UPDATE inventory SET stock = stock - 1 WHERE product_id = 1;
  INSERT INTO outbox (id, aggregate_id, event_type, payload, published)
    VALUES (..., 1, 'StockDecreased', '{"productId":1,"quantity":1}', false);
  COMMIT;
```

```java
@Transactional
public void decreaseStock(Long productId, int quantity) {
    inventoryRepository.decreaseStock(productId, quantity);

    Outbox outbox = new Outbox(
        productId.toString(),
        "StockDecreased",
        toJson(new StockDecreasedEvent(productId, quantity))
    );
    outboxRepository.save(outbox);
    // 여기서 Kafka로 직접 send()하지 않는다
}
```

이 트랜잭션은 하나의 DB 안에서만 일어나므로 원자성이 보장됩니다. 재고 차감과 이벤트 기록은 항상 함께 성공하거나 함께 롤백됩니다.

이제 남은 일은 Outbox 테이블에 쌓인, 아직 발행되지 않은(`published = false`) 레코드를 실제 메시지 브로커로 내보내는 것입니다. 이 역할을 하는 별도 프로세스(Relay 혹은 Publisher)가 주기적으로 Outbox 테이블을 폴링하거나, DB의 변경 로그(트랜잭션 로그, WAL/binlog)를 실시간으로 읽어 브로커에 전달합니다.

```
[Outbox 테이블 폴링 방식]
Relay 프로세스가 주기적으로:
  SELECT * FROM outbox WHERE published = false ORDER BY id LIMIT 100;
  각 레코드를 Kafka로 발행
  발행 성공 시 UPDATE outbox SET published = true WHERE id = ?;

[CDC 방식]
DB의 트랜잭션 로그(binlog/WAL)를 CDC 도구가 실시간으로 tail
  → outbox 테이블에 INSERT가 발생하는 순간 감지
  → 별도 폴링 쿼리 없이 즉시 Kafka로 전달
```

폴링 방식은 구현이 간단하지만 폴링 주기만큼 지연이 생기고, 폴링 쿼리 자체가 DB에 부하를 줍니다. CDC(Change Data Capture, 변경 데이터 캡처) 방식은 트랜잭션 로그를 직접 읽기 때문에 애플리케이션 쿼리 부하 없이 거의 실시간으로 이벤트를 전달할 수 있습니다. Debezium이 이 방식을 구현하는 데 흔히 쓰이는 CDC 도구입니다. MySQL의 binlog, PostgreSQL의 logical replication을 읽어 Kafka Connect를 통해 Outbox 테이블의 변경을 자동으로 이벤트 스트림으로 바꿔줍니다.

---

## 정리

- 2PC는 코디네이터 장애 시 전체 참여자가 블로킹되는 구조적 문제 때문에 마이크로서비스 간 트랜잭션에는 거의 쓰이지 않는다
- Saga는 로컬 트랜잭션들의 연쇄 + 실패 시 보상 트랜잭션으로 분산 환경의 원자성을 흉내 낸다
- Choreography는 결합도가 낮지만 흐름 추적이 어렵고, Orchestration은 흐름이 명확하지만 오케스트레이터에 로직이 집중된다
- DB 커밋과 메시지 발행 사이의 이중 쓰기 문제는 Outbox 패턴 + CDC(또는 폴링)로 해결한다

Saga는 강한 일관성(Strong Consistency)이 아니라 최종 일관성(Eventual Consistency)을 전제로 합니다. 재고 차감과 결제 사이에 잠깐이라도 "재고는 줄었는데 결제는 아직 안 끝난" 상태가 존재할 수 있다는 것을 감수할 수 있는 경우에만 적합합니다. 반대로 그 찰나의 불일치도 허용할 수 없는 도메인(예: 동일 계좌의 이중 출금 방지)이라면 애초에 서비스 경계를 다시 그려서 하나의 트랜잭션 범위 안에 두는 편이 낫습니다.

최근에는 Temporal, Camunda 같은 워크플로 오케스트레이션 도구들이 Saga의 오케스트레이션 방식을 표준화된 형태로 제공하는 흐름도 있습니다. 각 단계와 보상 로직을 직접 이벤트 리스너나 오케스트레이터 클래스로 짜는 대신, 워크플로 정의로 선언하고 재시도·타임아웃·상태 영속화를 플랫폼에 위임하는 방식입니다. 참여 단계가 많고 장기간 실행되는 흐름일수록 이런 도구를 검토해볼 만합니다.
