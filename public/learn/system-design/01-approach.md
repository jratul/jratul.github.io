---
title: "시스템 설계 접근법"
order: 1
---

# 시스템 설계 접근법

대규모 시스템을 설계할 때의 사고 방식과 프레임워크.

---

## 설계 면접 프레임워크

```
1단계: 요구사항 명확화 (5분)
  - 기능적 요구사항: 무엇을 해야 하는가?
  - 비기능적 요구사항: 규모, 성능, 가용성

2단계: 규모 추정 (3분)
  - DAU (Daily Active Users)
  - QPS (Queries Per Second)
  - 저장소 용량

3단계: 고수준 설계 (10분)
  - API 엔드포인트
  - 컴포넌트 다이어그램
  - 데이터 흐름

4단계: 상세 설계 (15분)
  - 핵심 컴포넌트 deep dive
  - 병목 지점 해결
  - 트레이드오프 설명

5단계: 마무리 (5분)
  - 장애 시나리오
  - 모니터링
  - 추가 개선점
```

---

## 규모 추정 (Back-of-envelope)

```
기준 수치 암기:

시간 단위:
— 1일 = 86,400초 ≈ 10^5초
— 1개월 ≈ 2.5 × 10^6초
— 1년 ≈ 3 × 10^7초

데이터 크기:
— ASCII 문자: 1 Byte
— 유니코드 문자: 2-4 Bytes
— 1K = 10^3 Bytes
— 1M = 10^6 Bytes
— 1G = 10^9 Bytes
— 1T = 10^12 Bytes

QPS 계산 예시 (트위터):
— DAU: 3억명
— 1인당 평균 트윗: 2개/일
— 쓰기 QPS: 3억 × 2 / 86,400 ≈ 7,000 QPS
— 피크 QPS: 7,000 × 3 ≈ 21,000 QPS
— 읽기:쓰기 = 100:1 → 읽기 QPS: 700,000

저장소 계산 예시:
— 1일 신규 트윗: 7,000 × 86,400 ≈ 6억 개
— 트윗 하나: 280자 × 2B = 560B ≈ 1KB
— 1일 저장: 6억 × 1KB = 600GB/일
— 5년 저장: 600GB × 365 × 5 ≈ 1.1PB
```

---

## 핵심 설계 원칙

```
단일 책임 (Single Responsibility):
— 각 서비스/컴포넌트는 한 가지 일만

느슨한 결합 (Loose Coupling):
— 컴포넌트 간 의존성 최소화
— 이벤트 드리븐 아키텍처로 분리

높은 응집도 (High Cohesion):
— 관련된 기능은 한 곳에

실패 대비 설계 (Design for Failure):
— "무엇이 잘못될 수 있는가?" 항상 질문
— Circuit Breaker, Retry, Timeout
— Graceful Degradation

점진적 확장 (Incremental Scalability):
— 처음부터 과설계 금지
— 필요할 때 확장
```

---

## 설계 트레이드오프

```
일관성 vs 가용성 (CAP 정리):
— CP 시스템: 일관성 우선 (은행, 재고)
— AP 시스템: 가용성 우선 (SNS, 조회수)

지연시간 vs 처리량:
— 캐시 추가 → 지연 감소, 복잡도 증가
— 비동기 처리 → 처리량 증가, 응답 지연

성능 vs 비용:
— SSD vs HDD (10배 차이)
— 캐시 vs DB (100배 차이)

정규화 vs 비정규화:
— 정규화: 쓰기 성능 좋음, 읽기 복잡
— 비정규화: 읽기 빠름, 데이터 중복

동기 vs 비동기:
— 동기: 단순, 강한 일관성
— 비동기: 복잡, 높은 처리량, 느슨한 결합
```

---

## 고가용성 패턴

```
Replication (복제):
— Primary-Replica DB
— 읽기 부하 분산
— 장애 시 Failover

Load Balancing (부하 분산):
— Round Robin
— Least Connections
— IP Hash (세션 유지)

Failover:
— Active-Active: 양쪽 동시 서비스
— Active-Passive: 한쪽 대기 (Standby)
— 자동 장애 감지 → 전환

Health Check:
— 주기적 상태 확인
— 비정상 노드 자동 제외

Graceful Degradation:
— 일부 기능 비활성화로 핵심 기능 유지
예: 추천 서비스 장애 → 기본 피드만 표시
```

---

## SLA / SLO / SLI

```
SLI (Service Level Indicator):
— 측정값: 가용성%, 응답시간, 에러율

SLO (Service Level Objective):
— 목표값: 가용성 99.9%, p99 < 200ms

SLA (Service Level Agreement):
— 계약: SLO 미충족 시 환불 등

가용성 계산:
99%    = 3.65일/년 다운타임 (two nines)
99.9%  = 8.7시간/년 (three nines)
99.99% = 52분/년 (four nines)
99.999%= 5분/년 (five nines)

에러 예산 (Error Budget):
— 99.9% SLO = 0.1% 에러 허용
— 한 달: 43.8분의 다운타임 허용
— 에러 예산 소진 시 → 새 기능 대신 안정성 개선
```

---

## 분산 시스템 문제

```
네트워크 신뢰성:
— 패킷 손실, 지연, 순서 뒤바뀜
— TCP로 신뢰성 보장 but 성능 트레이드오프

클락 동기화:
— 분산 시스템의 시간은 불일치
— NTP로 동기화 (수 ms 오차)
— 논리 시계 (Lamport Clock) 사용

멱등성 (Idempotency):
— 같은 요청 여러 번 → 결과 동일
— 네트워크 재시도 시 중복 처리 방지
— 고유 request_id로 중복 체크

Two Generals Problem:
— 네트워크로는 100% 합의 불가
— 실용적 해결: 여러 번 확인, 타임아웃

분산 트랜잭션:
— 2PC (Two-Phase Commit): 느림, 블로킹
— Saga 패턴: 보상 트랜잭션으로 롤백
— Outbox 패턴: 로컬 트랜잭션 + 이벤트
```
