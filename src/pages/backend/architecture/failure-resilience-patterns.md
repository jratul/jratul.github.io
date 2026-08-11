---
title: "장애를 견디는 설계, 회복탄력성 패턴"
date: "2026-08-11"
tags: ["resilience", "circuit-breaker", "retry", "failure-handling", "distributed-system", "backend"]
excerpt: "마이크로서비스 하나의 장애가 전체로 퍼지는 연쇄 장애를 막는 Circuit Breaker, Retry, Timeout, Bulkhead 패턴과 최근 서비스 메시로 옮겨가는 흐름을 정리합니다."
---

# 장애를 견디는 설계, 회복탄력성 패턴

마이크로서비스로 시스템을 쪼개면 장애도 함께 쪼개질 거라고 기대하기 쉽습니다. 실제로는
반대인 경우가 많습니다. 서비스 하나가 느려지면 그 서비스를 호출하는 다른 서비스까지 같이
느려지고, 결국 아무 문제가 없던 서비스까지 연쇄적으로 무너집니다. 이 문서에서는 이 연쇄
장애가 왜 일어나는지, 그리고 이를 막는 대표적인 패턴들(Circuit Breaker, Retry, Timeout,
Bulkhead)을 Resilience4j 예제와 함께 정리합니다.

---

## 연쇄 장애(Cascading Failure)는 왜 일어나는가

서비스 A가 서비스 B를 호출하는 단순한 구조를 생각해봅니다. 평소에는 B가 50ms 안에
응답하지만, B의 DB가 느려지면서 응답 시간이 30초로 늘어났다고 가정합니다.

```
정상 상황
  A → B 호출 → 50ms 만에 응답 → A의 스레드 즉시 반납

B 장애 발생 시
  A → B 호출 → 30초 동안 응답 없음 → A의 스레드가 30초간 블로킹
  A로 들어오는 다른 요청들도 계속 B를 호출 → 블로킹된 스레드가 계속 쌓임
  A의 스레드 풀(예: 200개)이 전부 B 응답 대기로 소진됨
  → A는 B와 무관한 요청조차 처리할 스레드가 없어 응답 불가
  → A를 호출하던 서비스도 같은 방식으로 스레드 고갈 → 장애가 상류로 전파
```

핵심은 **A가 B의 장애를 스스로 격리하지 못했다**는 점입니다. 타임아웃도 없이 무한정
기다리고, 실패한 요청을 즉시 재시도하고, B 하나 때문에 소진된 자원이 다른 모든 기능에
영향을 준다면, 장애는 자연스럽게 시스템 전체로 퍼집니다. 회복탄력성(Resilience) 패턴들은
이 전파 경로를 하나씩 끊어내는 역할을 합니다.

---

## Circuit Breaker(서킷 브레이커) 패턴

전기 회로의 차단기와 같은 개념입니다. 과부하가 걸리면 회로를 통째로 끊어서 뒷단의 기기를
보호하듯, 호출 대상 서비스가 계속 실패하고 있다면 더 이상 요청을 보내지 않고 즉시
실패 처리해서 호출하는 쪽의 자원을 보호합니다.

서킷 브레이커는 세 가지 상태를 가지고, 실패율에 따라 상태를 전이합니다.

```
        실패율이 임계치 초과
  Closed ─────────────────────→ Open
  (정상 호출)                    (호출 즉시 차단, fallback 반환)
    ↑                              │
    │                              │ 일정 시간 경과
    │ 성공률이 임계치 이상          ↓
    └───────────────────── Half-Open
                          (제한된 수의 요청만 흘려보내
                           실제로 복구됐는지 확인)
```

- **Closed(정상)**: 모든 요청을 실제로 호출합니다. 실패율을 계속 집계합니다.
- **Open(차단)**: 실패율이 임계치를 넘으면 전이합니다. 이 상태에서는 실제 호출을 시도조차
  하지 않고 즉시 실패(또는 fallback)를 반환합니다 — 이미 무너진 서비스에 요청을 더 보내지
  않아 그 서비스가 회복할 시간을 벌어줍니다.
- **Half-Open(반개방)**: 일정 시간이 지나면 전이합니다. 소수의 요청만 실제로 흘려보내
  성공하는지 확인하고, 성공률이 충분하면 Closed로, 여전히 실패하면 다시 Open으로
  돌아갑니다.

Resilience4j로 구현하면 다음과 같습니다.

```java
// application.yml
resilience4j:
  circuitbreaker:
    instances:
      inventoryService:
        sliding-window-size: 20          # 최근 20개 호출을 기준으로 실패율 계산
        failure-rate-threshold: 50       # 실패율 50% 이상이면 Open으로 전이
        wait-duration-in-open-state: 10s # Open 상태 유지 시간
        permitted-number-of-calls-in-half-open-state: 5
```

```java
@Service
public class InventoryClient {

    private final RestClient restClient;

    @CircuitBreaker(name = "inventoryService", fallbackMethod = "fallbackCheckStock")
    public StockResponse checkStock(String productId) {
        return restClient.get()
            .uri("/inventory/{id}", productId)
            .retrieve()
            .body(StockResponse.class);
    }

    // 서킷이 Open이거나 호출이 예외를 던지면 이 메서드가 대신 호출됨
    private StockResponse fallbackCheckStock(String productId, Throwable ex) {
        // 재고를 알 수 없을 때의 안전한 기본값 — 서비스 전체가 죽는 것보다 낫다
        return StockResponse.unknown(productId);
    }
}
```

fallback 메서드의 시그니처는 원본 메서드와 반환 타입이 같아야 하고, 마지막 파라미터로
발생한 예외(`Throwable`)를 받습니다. "재고를 모르니 주문을 막는다"가 아니라 "재고를 모르니
일단 받아두고 나중에 확인한다" 같은 비즈니스 판단이 fallback 안에 들어갑니다 — 이 판단은
패턴이 대신 해주지 않고, 도메인마다 직접 정해야 하는 부분입니다.

---

## Retry(재시도)와 Exponential Backoff

네트워크 순단처럼 짧게 스쳐 지나가는 일시적 장애에는 재시도가 효과적입니다. 하지만
재시도를 잘못 설계하면 오히려 장애를 키웁니다.

```
잘못된 재시도 — Retry Storm
  요청 실패 → 즉시 재시도 → 또 실패 → 즉시 재시도 → ...
  이미 부하로 힘든 서버에 재시도 요청까지 쏟아져 부하가 배가됨
  → 회복 중이던 서버가 재시도 폭주로 다시 주저앉음
```

이를 막기 위해 재시도 간격을 매번 넓혀가는 **Exponential Backoff**를 씁니다. 1차 재시도는
1초 뒤, 2차는 2초 뒤, 3차는 4초 뒤처럼 간격을 지수적으로 늘립니다. 여기에 약간의 무작위성
(**Jitter**)을 더해, 동시에 실패한 여러 클라이언트가 정확히 같은 타이밍에 한꺼번에
재시도하는 것도 막습니다.

```java
resilience4j:
  retry:
    instances:
      inventoryService:
        max-attempts: 3
        wait-duration: 1s
        enable-exponential-backoff: true
        exponential-backoff-multiplier: 2   # 1s → 2s → 4s
        enable-randomized-wait: true        # 각 간격에 Jitter 추가
        retry-exceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
```

```java
@Retry(name = "inventoryService")
@CircuitBreaker(name = "inventoryService", fallbackMethod = "fallbackCheckStock")
public StockResponse checkStock(String productId) {
    return restClient.get()
        .uri("/inventory/{id}", productId)
        .retrieve()
        .body(StockResponse.class);
}
```

`@Retry`와 `@CircuitBreaker`를 함께 적용할 때는 순서가 중요합니다. Resilience4j는 애너테이션을
안쪽부터 감싸는 순서로 적용하므로, 위 예제에서는 `CircuitBreaker`가 `Retry`를 감싸는
구조가 됩니다 — 즉 재시도까지 모두 실패한 결과가 서킷 브레이커의 실패 집계에 반영됩니다.
그리고 서킷이 이미 **Open** 상태라면, `Retry`가 재시도를 시도하기도 전에 `CircuitBreaker`가
호출 자체를 즉시 실패시킵니다. 이미 죽은 걸 확인한 서비스에 재시도까지 얹어 부하를 주지
않는 것이 이 조합의 핵심입니다.

---

## Timeout과 Bulkhead(격벽) 패턴

### Timeout — 무한정 기다리지 않기

앞서 본 연쇄 장애 시나리오의 출발점은 "A가 B의 응답을 무한정 기다린다"는 것이었습니다.
타임아웃을 설정하면 이 대기 시간에 상한을 둘 수 있습니다.

```java
resilience4j:
  timelimiter:
    instances:
      inventoryService:
        timeout-duration: 2s   # 2초 안에 응답이 없으면 TimeoutException으로 실패 처리
```

타임아웃 자체는 실패를 막아주지 않습니다. 다만 "실패라면 얼마나 빨리 실패로 확정할지"를
정해줘서, 스레드가 무한정 잡혀 있는 상황을 방지합니다. 타임아웃으로 확정된 실패는 다시
`Retry`와 `CircuitBreaker`의 실패 집계로 흘러들어갑니다.

### Bulkhead — 장애를 구역으로 격리하기

Bulkhead는 배의 격벽에서 따온 이름입니다. 배 밑바닥에 구멍이 나도 격벽으로 구획이 나뉘어
있으면 그 구획만 침수되고 배 전체는 가라앉지 않습니다. 애플리케이션도 마찬가지로, 서비스별로
쓰는 스레드 풀이나 커넥션 풀을 분리해두면 한 서비스의 장애가 다른 서비스 호출용 자원까지
고갈시키지 않습니다.

```
격벽이 없는 경우
  공용 스레드 풀 200개
  B 서비스가 느려짐 → B 호출용으로 스레드가 계속 쌓임 → 200개 전부 소진
  → C, D 서비스는 멀쩡한데도 A가 이들을 호출할 스레드가 없어 함께 실패

격벽이 있는 경우
  B 전용 스레드 풀 30개 / C 전용 스레드 풀 30개 / D 전용 스레드 풀 30개
  B 서비스가 느려짐 → B 전용 풀 30개만 소진
  → C, D는 자기 풀이 그대로 살아있어 정상 처리 계속
```

```java
resilience4j:
  bulkhead:
    instances:
      inventoryService:
        max-concurrent-calls: 30   # 이 서비스 호출에 동시에 쓸 수 있는 자원 상한
        max-wait-duration: 0       # 초과 시 대기하지 않고 즉시 실패
```

```java
@Bulkhead(name = "inventoryService", type = Bulkhead.Type.THREADPOOL)
@TimeLimiter(name = "inventoryService")
@Retry(name = "inventoryService")
@CircuitBreaker(name = "inventoryService", fallbackMethod = "fallbackCheckStock")
public CompletableFuture<StockResponse> checkStock(String productId) {
    return CompletableFuture.supplyAsync(() ->
        restClient.get()
            .uri("/inventory/{id}", productId)
            .retrieve()
            .body(StockResponse.class)
    );
}
```

`ThreadPoolBulkhead`를 쓰면 격리를 위해 반환 타입이 `CompletableFuture`가 되어야 합니다.
호출 스레드 풀 자체를 서비스별로 물리적으로 나누기 때문입니다. 세마포어 방식
(`Bulkhead.Type.SEMAPHORE`)은 별도 스레드 풀 없이 동시 호출 수만 제한하는 더 가벼운
대안입니다.

---

## 패턴을 조합한 전체 흐름

지금까지의 애너테이션을 한 메서드에 모두 적용하면 안쪽에서 바깥쪽으로 다음 순서로
동작합니다.

```
호출
 └─ Bulkhead     : 이 서비스 호출용 자원(스레드/세마포어)에 여유가 있는지 확인
     └─ TimeLimiter : 정해진 시간 안에 응답이 오는지 감시
         └─ Retry       : 실패 시 Backoff + Jitter를 두고 재시도
             └─ CircuitBreaker : 서킷이 Open이면 재시도조차 시도하지 않고 즉시 실패
                 └─ 실제 원격 호출
```

| 패턴 | 막아주는 것 |
|------|------|
| Timeout | 응답 없는 호출에 스레드가 무한정 묶이는 것 |
| Bulkhead | 한 서비스 장애가 다른 서비스 호출용 자원까지 고갈시키는 것 |
| Retry + Backoff/Jitter | 일시적 장애를 놓치는 것, 그리고 무분별한 재시도로 장애를 키우는 것 |
| Circuit Breaker | 이미 죽은 서비스에 계속 요청을 보내 회복을 방해하는 것 |

---

## 최근 흐름 — 애플리케이션 코드에서 서비스 메시로

Hystrix(현재는 유지보수 종료)와 Resilience4j는 모두 이 패턴들을 **애플리케이션 코드
안에** 라이브러리 형태로 구현하는 방식입니다. 서비스마다 언어와 프레임워크가 다르면
이 로직을 각 언어에 맞게 각각 구현하고 설정값도 서비스마다 따로 관리해야 합니다.

최근에는 이 역할을 Istio, Linkerd 같은 **서비스 메시**(Service Mesh)로 옮기는 흐름이
자리 잡고 있습니다. 서비스 메시는 각 서비스 옆에 사이드카 프록시(Envoy 등)를 붙여서,
서킷 브레이커·재시도·타임아웃 같은 로직을 애플리케이션 코드가 아니라 이 프록시가
네트워크 계층에서 대신 처리합니다. 애플리케이션은 이런 정책이 있는지조차 모른 채
평범하게 HTTP 호출만 하면 되고, 실제 재시도·차단 여부는 인프라 설정(YAML)만으로
서비스 언어와 무관하게 일괄 제어됩니다.

```
애플리케이션 코드에 직접 구현 (Resilience4j)
  장점: 세밀한 제어(비즈니스 로직에 맞는 fallback), 별도 인프라 불필요
  단점: 언어/프레임워크마다 별도 구현, 설정이 코드베이스에 흩어짐

서비스 메시로 위임 (Istio + Envoy)
  장점: 언어 무관하게 일괄 적용, 애플리케이션 코드는 비즈니스 로직에만 집중
  단점: 사이드카 프록시 운영 부담, 장애 원인 파악에 인프라 계층 이해가 추가로 필요
```

애플리케이션 코드가 회복탄력성 로직에서 자유로워지는 대신, 그 책임이 사라지는 게
아니라 인프라 계층으로 옮겨갈 뿐이라는 점은 트레이드오프로 남습니다 — "왜 이 요청이
재시도됐는지"를 알기 위해 이제는 애플리케이션 코드가 아니라 Envoy 설정을 봐야 하는
경우가 생깁니다.

---

## 실무 적용 팁

- **fallback은 도메인 판단이 필요하다**: 서킷 브레이커가 Open됐을 때 무엇을 반환할지는
  패턴이 대신 정해주지 않습니다. "캐시된 값을 반환한다", "빈 결과를 반환한다", "요청 자체를
  거부한다" 중 어떤 게 안전한지는 그 데이터의 성격에 따라 다릅니다.
- **멱등성(Idempotency) 없이 재시도하지 않는다**: 결제 승인처럼 중복 실행되면 안 되는
  요청을 재시도하려면, 먼저 같은 요청을 여러 번 보내도 같은 결과가 되도록(예: idempotency
  key) 만들어야 합니다. 그렇지 않으면 재시도가 중복 결제 같은 사고로 이어집니다.
- **타임아웃 값은 호출 체인 전체를 고려해서 정한다**: A가 B를 3초 타임아웃으로 호출하는데
  B는 내부에서 C를 5초 타임아웃으로 호출한다면, B가 C 응답을 기다리는 사이 A는 이미
  타임아웃으로 실패 처리하고 다음 요청을 재시도할 수 있습니다 — 하위 서비스로 갈수록
  타임아웃을 더 짧게 잡는 것이 일반적입니다.
- **설정값은 실측치에서 시작한다**: 실패율 임계치, 슬라이딩 윈도우 크기, 타임아웃 시간을
  감으로 정하지 말고, 정상 상태의 p99 응답 시간과 평소 실패율을 먼저 관측한 뒤 그
  수치를 기준으로 여유를 두고 설정합니다.

---

## 실제 사용 사례

| 상황 | 적용할 패턴 |
|------|------|
| 외부 결제 PG사 API가 가끔 순단된다 | Retry(Backoff + Jitter)로 일시적 실패만 흡수 |
| 특정 마이크로서비스가 자주 느려지며 다른 서비스까지 끌고 내려간다 | Circuit Breaker로 장애 전파를 조기에 차단 |
| 여러 외부 서비스를 호출하는데 하나가 죽으면 전체 스레드 풀이 고갈된다 | Bulkhead로 서비스별 자원을 격리 |
| 응답이 느린 서비스 때문에 요청 처리 스레드가 계속 쌓인다 | Timeout으로 대기 시간에 상한을 둠 |
| 여러 언어로 된 마이크로서비스 전체에 회복탄력성 정책을 일괄 적용하고 싶다 | 서비스 메시(Istio 등)로 인프라 계층에서 처리 |
