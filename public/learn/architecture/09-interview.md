---
title: "아키텍처 면접 예상 질문"
order: 9
---

# 소프트웨어 아키텍처 면접 예상 질문

아키텍처 설계 면접에서 빈출되는 핵심 질문들입니다.

## Q1. 레이어드 아키텍처(Layered Architecture)를 설명해주세요

코드를 **역할에 따라 계층으로 분리**하는 가장 일반적인 아키텍처입니다.

```
[ Presentation Layer ]  HTTP 요청/응답 처리 (Controller)
         ↓
[ Application Layer ]   비즈니스 흐름 조율 (Service)
         ↓
[ Domain Layer ]        핵심 비즈니스 로직 (Entity, Domain Service)
         ↓
[ Infrastructure Layer ] DB, 외부 API, 메시징 (Repository, Client)
```

**의존성 규칙:** 위 레이어만 아래 레이어에 의존 (역방향 금지)

**장점:** 단순, 이해하기 쉬움
**단점:** 도메인 로직이 DB/프레임워크에 의존하면 테스트 어려움

---

## Q2. 헥사고날 아키텍처(Hexagonal Architecture)란?

**포트와 어댑터 패턴**이라고도 합니다. 핵심 비즈니스 로직이 외부 의존성(DB, API, UI)으로부터 완전히 격리됩니다.

```
       [ REST API ]    [ CLI ]
            ↓              ↓
       [ Input Adapter (Controller) ]
                   ↓
       [ Application Core (Use Cases) ]
         ↑                    ↑
  [ Port ]              [ Port ]
     ↑                       ↑
[ DB Adapter ]       [ Email Adapter ]
[ Repository ]       [ SMTP Client ]
```

**핵심 원칙:**
- 도메인이 인프라를 모름 (인터페이스로만 소통)
- 어댑터 교체 시 도메인 수정 불필요
- 도메인 단위 테스트가 DB 없이도 가능

---

## Q3. DDD(Domain-Driven Design)의 핵심 개념을 설명해주세요

**전략적 설계:**
- **Bounded Context:** 도메인 모델이 유효한 경계
- **Ubiquitous Language:** 도메인 전문가와 개발자가 같은 용어 사용

**전술적 설계:**

| 개념 | 설명 |
|-----|------|
| **Entity** | 고유 식별자가 있는 객체 (User, Order) |
| **Value Object** | 식별자 없이 값으로만 구분 (Money, Address) |
| **Aggregate** | 일관성 경계. Aggregate Root로만 접근 |
| **Repository** | Aggregate의 저장/조회 추상화 |
| **Domain Event** | 도메인에서 발생한 사실 (OrderPlaced) |
| **Application Service** | Use Case 조율, 도메인 로직 직접 포함 금지 |

---

## Q4. CQRS 패턴을 설명해주세요

**Command Query Responsibility Segregation:** 읽기와 쓰기 모델을 **분리**합니다.

```
Command (쓰기):
  Command → Command Handler → Domain Model → Write DB

Query (읽기):
  Query → Query Handler → Read Model → Read DB (최적화된 뷰)
```

**장점:**
- 읽기 모델을 조회에 최적화 (정규화 해제 가능)
- 읽기/쓰기 독립적 확장 가능
- Event Sourcing과 결합 시 시너지

**단점:**
- 복잡도 증가
- 읽기/쓰기 간 **일시적 불일치** (Eventual Consistency)

---

## Q5. 마이크로서비스 아키텍처의 장단점과 분리 기준은?

**장점:**
- 독립 배포/확장
- 기술 스택 자유
- 장애 격리

**단점:**
- 분산 시스템 복잡도 (네트워크 오류, 분산 트랜잭션)
- 서비스 간 통신 오버헤드
- 운영 비용 증가 (서비스 디스커버리, 모니터링, CI/CD)

**서비스 분리 기준:**
- **비즈니스 도메인** (가장 중요) — DDD Bounded Context 기준
- **데이터 소유권** — 서비스가 자신의 DB를 소유
- **변경 빈도** — 같이 바뀌는 것은 같이 배포

**언제 쓰지 말아야 하나:**
- 팀이 작을 때 (2 Pizza Rule 미만)
- 도메인이 명확하지 않을 때
- 모놀리스로 먼저 시작 후 분리하는 "Strangler Fig" 패턴 추천

---

## Q6. 이벤트 드리븐 아키텍처(EDA)란 무엇인가요?

서비스 간 통신을 **직접 호출 대신 이벤트로 처리**합니다.

```
주문 서비스 → OrderPlaced 이벤트 발행 (Kafka)
  ├── 결제 서비스 구독 → 결제 처리
  ├── 재고 서비스 구독 → 재고 감소
  └── 알림 서비스 구독 → 이메일 발송
```

**장점:**
- 느슨한 결합 (발행자가 구독자를 모름)
- 비동기 처리로 응답 속도 향상
- 서비스 추가 시 기존 서비스 수정 불필요

**단점:**
- 이벤트 순서 보장 어려움
- 중복 이벤트 처리 필요 (멱등성)
- 전체 흐름 추적 어려움 (분산 트레이싱 필요)

---

## Q7. Saga 패턴으로 분산 트랜잭션을 어떻게 처리하나요?

마이크로서비스에서는 ACID 트랜잭션 사용이 어렵습니다. Saga는 각 서비스의 로컬 트랜잭션을 조율합니다.

**Choreography Saga:**
```
주문 생성 → OrderCreated 이벤트
  → 결제 서비스: 결제 시도 → PaymentCompleted
    → 배송 서비스: 배송 시작

실패 시: PaymentFailed → 주문 취소 이벤트 발행 (보상 트랜잭션)
```

**Orchestration Saga:**
```
Saga Orchestrator가 각 단계를 직접 호출하고 조율
실패 시 Orchestrator가 보상 트랜잭션 호출
```

| 비교 | Choreography | Orchestration |
|-----|-------------|---------------|
| 중앙 조율자 | 없음 | 있음 |
| 결합도 | 낮음 | 중간 |
| 흐름 가시성 | 낮음 | 높음 |
| 복잡도 | 단순 서비스 | 복잡 워크플로우 |

---

## Q8. 모놀리스에서 마이크로서비스로 전환 시 고려사항은?

**Strangler Fig 패턴:**
```
1. 새 기능은 새 서비스로
2. 기존 기능을 점진적으로 마이그레이션
3. 모놀리스의 해당 기능 제거
```

**선행 조건:**
- CI/CD (Continuous Integration/Continuous Deployment, 지속적 통합/배포) 파이프라인 구축
- 컨테이너화 (Docker/Kubernetes)
- 서비스 모니터링 & 분산 트레이싱
- API Gateway 설정

**흔한 실수:**
- 지나치게 작은 서비스 (nano service)
- DB 공유 마이크로서비스 (안티패턴)
- 동기 HTTP로 서비스 간 의존성 체인 형성
