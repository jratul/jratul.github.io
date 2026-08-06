---
title: "Node.js BFF와 Spring Boot BE, 왜 스레드 모델이 다른가"
date: "2026-08-06"
tags: ["bff", "nodejs", "spring-boot", "thread", "event-loop", "backend"]
excerpt: "Node.js BFF는 싱글 스레드 이벤트 루프, Spring Boot는 요청당 스레드를 쓰는 멀티스레드 모델입니다. 이 차이가 왜 두 계층의 역할 분담과 맞아떨어지는지 정리합니다."
---

# Node.js BFF와 Spring Boot BE, 왜 스레드 모델이 다른가

**BFF**(Backend for Frontend)는 여러 백엔드 서비스를 프론트엔드에 맞게 조합·가공해서
내려주는 중간 계층입니다. 실무에서 이 BFF는 Node.js로, 그 뒤에 있는 핵심 도메인
서버(BE)는 Spring Boot로 짜는 조합을 자주 봅니다. 우연이 아니라 두 스택의
**스레드 모델**이 각자 맡은 역할과 잘 맞아떨어지기 때문입니다.

---

## 아키텍처 그림

```
클라이언트
    ↓
[BFF] Node.js — 여러 서비스 호출을 조합해서 프론트엔드 맞춤 응답 생성
    ↓         ↓         ↓
[BE] Spring Boot   [BE] 다른 서비스   [BE] 또 다른 서비스
   (주문 도메인)      (결제 도메인)       (재고 도메인)
```

BFF는 "여러 곳에 흩어진 데이터를 모아서 화면에 필요한 형태로 다듬는" 역할이고,
각 BE는 "자기 도메인의 비즈니스 로직과 데이터 정합성을 책임지는" 역할입니다. 이
역할 차이가 그대로 두 스택이 최적화된 작업 성격의 차이와 이어집니다.

---

## Node.js: 싱글 스레드 이벤트 루프

Node.js는 자바스크립트 코드를 **단일 스레드**에서 실행합니다. I/O 작업(네트워크
요청, 파일 읽기, DB 쿼리)은 커널/libuv에 위임하고, 결과가 오면 이벤트 루프가
콜백을 큐에 넣어 순서대로 처리합니다. 코드 자체는 하나의 스레드에서만 돌지만, I/O
작업 자체는 백그라운드에서 동시에 진행됩니다.

```typescript
// BFF: 세 서비스를 동시에 호출해서 조합
async function getProductPage(productId: string) {
  const [product, reviews, inventory] = await Promise.all([
    fetch(`http://product-service/products/${productId}`),
    fetch(`http://review-service/reviews?productId=${productId}`),
    fetch(`http://inventory-service/stock/${productId}`),
  ]);
  return { product, reviews, inventory }; // 프론트엔드가 원하는 형태로 조합
}
```

```
Promise.all 실행 시점
  요청1(product) ──┐
  요청2(review)  ──┼─ 동시에 네트워크 요청 나감 (스레드는 하나, I/O는 병렬)
  요청3(inventory)──┘
       ↓
  셋 다 응답 오면 콜백 실행 → 조합해서 반환
```

BFF가 하는 일의 대부분은 **CPU 연산이 아니라 "다른 서비스 응답을 기다리는 것"**
입니다. 이런 I/O 바운드 작업은 스레드를 여러 개 띄워봤자 대부분 대기 상태로
놀게 되므로, 싱글 스레드로도 수많은 동시 요청을 효율적으로 처리할 수 있는
Node.js의 모델과 궁합이 좋습니다.

**주의점**: 이벤트 루프가 하나뿐이므로, 무거운 동기 연산(대용량 반복문, 이미지
처리 등)이 하나라도 실행되면 그동안 다른 모든 요청 처리가 멈춥니다 — BFF에
CPU 바운드 로직을 넣지 않는 게 중요한 이유입니다.

---

## Spring Boot: 요청당 스레드(Thread-per-Request)

전통적인 Spring Boot(Spring MVC, Tomcat 내장 서버 기준)는 요청이 들어올 때마다
**스레드 풀에서 스레드를 하나 할당**해서 그 요청 전체를 처리합니다. 요청 A와
요청 B는 서로 다른 스레드에서 완전히 독립적으로, 동시에 실행됩니다.

```java
@RestController
public class OrderController {
    @PostMapping("/orders")
    public OrderResponse createOrder(@RequestBody OrderRequest request) {
        // 이 메서드 전체가 스레드 하나를 점유한 채 순차적으로 실행됨
        validateInventory(request);
        Order order = orderService.create(request);   // DB 트랜잭션
        paymentService.charge(order);                  // 결제 처리
        return OrderResponse.from(order);
    }
}
```

```
요청 A 도착 → 스레드 #1 할당 → 메서드 전체를 위에서 아래로 순차 실행 → 응답
요청 B 도착 → 스레드 #2 할당 → (A와 완전히 독립적으로 동시 진행)
요청 C 도착 → 스레드 #3 할당 → ...
```

코드는 콜백이나 `Promise` 없이 **위에서 아래로 순서대로 읽히는 동기 코드**로
짜입니다. 트랜잭션 처리, 여러 단계의 유효성 검증, 복잡한 도메인 로직처럼 "여러
단계가 순서대로, 하나라도 실패하면 롤백돼야 하는" 작업은 이렇게 스레드 하나가
전체 흐름을 순차적으로 들고 있는 모델이 오히려 이해하기 쉽고, JPA/트랜잭션
매니저 같은 Spring 생태계도 이 모델을 기준으로 성숙해 있습니다.

**주의점**: 동시 요청이 스레드 풀 크기를 넘어서면 나머지 요청은 스레드가 빌
때까지 대기합니다 — 외부 API 호출처럼 오래 블로킹되는 작업이 많으면 스레드
풀이 금방 고갈될 수 있습니다(이런 경우를 위해 Spring WebFlux라는 논블로킹
대안도 있지만, 전통적인 Spring Boot MVC 방식이 여전히 압도적으로 많이 쓰입니다).

---

## 스레드 모델 비교

| | Node.js (BFF) | Spring Boot MVC (BE) |
|---|---|---|
| 실행 모델 | 싱글 스레드 + 이벤트 루프 | 요청당 스레드(Thread-per-Request) |
| I/O 처리 | 논블로킹(non-blocking), 콜백/Promise 기반 | 블로킹(blocking), 동기 코드 |
| 코드 스타일 | `async/await`, 콜백 체인 | 위에서 아래로 순차 실행 |
| 강점인 작업 | 여러 서비스 fan-out 호출, 응답 조합 | 트랜잭션, 복잡한 도메인 로직, ORM 활용 |
| 동시 요청 처리 | 이벤트 루프가 논블로킹으로 다수 처리 | 스레드 풀 크기만큼 병렬 처리 |
| 취약점 | 무거운 동기 연산이 이벤트 루프를 블로킹 | 블로킹 작업 多 시 스레드 풀 고갈 |

---

## 왜 이 조합이 흔한가

BFF는 "여러 서비스를 호출해서 기다리고 조합하는" I/O 바운드 작업이 대부분이라
논블로킹 I/O가 강점인 Node.js가 잘 맞고, 프론트엔드와 같은 언어(JavaScript/
TypeScript)를 쓸 수 있어 프론트엔드 팀이 직접 유지보수하기도 편합니다. 반대로
핵심 도메인 서버는 트랜잭션 무결성, 복잡한 비즈니스 규칙, 데이터 일관성이
중요한데, 이런 로직은 순차적인 동기 코드로 짜는 게 오히려 안전하고, Spring의
성숙한 트랜잭션/ORM(JPA) 생태계를 그대로 활용할 수 있습니다. 각 계층이 실제로
많이 하는 작업의 성격과 두 스택이 최적화된 방향이 자연스럽게 맞아떨어지는
조합인 셈입니다.

---

## 실제 사용 사례

| 상황 | 적합한 계층 |
|------|------|
| 여러 마이크로서비스 응답을 화면 하나에 맞게 조합 | Node.js BFF — Promise.all로 병렬 fan-out |
| 주문 생성 시 재고 확인 → 결제 → 주문 저장(트랜잭션) | Spring Boot BE — 순차적 동기 로직 + @Transactional |
| 화면별로 다른 응답 형태 필요(모바일 vs 웹) | BFF에서 클라이언트별로 다르게 가공 |
| 복잡한 도메인 규칙(할인 정책, 재고 정합성) | BE에서 도메인 계층에 캡슐화 |
| 외부 결제사 API처럼 오래 걸리는 호출이 많음 | BFF(논블로킹)가 다수 대기 요청 처리에 유리 |
