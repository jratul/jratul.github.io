---
title: "서버리스(Serverless)"
date: "2026-07-11"
tags: ["serverless", "faas", "aws-lambda", "vercel", "cloudflare-workers", "devops"]
excerpt: "서버가 없는 게 아니라 서버 관리를 안 하는 것. FaaS의 동작 원리, Cold Start, 과금 방식, 언제 써야 하는지를 정리합니다."
---

# 서버리스(Serverless)

이름과 달리 서버가 사라지는 게 아닙니다. 서버는 여전히 존재하지만, 그 서버를 프로비저닝하고
스케일링하고 패치하는 일을 개발자가 아니라 클라우드 provider가 대신 합니다. 개발자는 코드
(주로 함수 단위)만 올리고, 실행은 요청이 들어올 때마다 provider가 알아서 처리합니다.

---

## 전통적 서버 vs 서버리스

```
전통적 서버 (VM, 컨테이너)
  요청이 없어도 서버가 항상 켜져 있음
  → 개발자가 인스턴스 개수/사양을 직접 정하고 관리
  → 트래픽이 몰리면 수동/자동 스케일링 설정 필요
  → 놀고 있는 시간에도 비용 발생

서버리스 (FaaS)
  요청이 들어올 때만 함수가 실행됨
  → provider가 실행 환경을 그때그때 만들고 없앰
  → 트래픽에 따라 자동으로 인스턴스 수가 늘고 줆
  → 실행된 만큼만 과금 (요청 수 × 실행 시간)
```

핵심은 "서버 없음"이 아니라 "서버 관리 없음"입니다. 개발자 입장에서는 인프라를 신경 쓰지
않고 비즈니스 로직에만 집중할 수 있습니다.

---

## FaaS: 서버리스의 핵심 형태

서버리스를 실제로 구현하는 방식이 **FaaS(Function as a Service)**입니다. 코드를 함수 단위로
배포하면, provider가 HTTP 요청·이벤트가 들어올 때마다 그 함수를 실행합니다.

```typescript
// AWS Lambda 함수 예시
export const handler = async (event: APIGatewayProxyEvent) => {
  const { name } = JSON.parse(event.body ?? '{}');

  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Hello, ${name}!` }),
  };
};
```

이 함수 하나가 배포되면, 매 요청마다 provider가 (필요 시) 새 실행 환경을 만들어 이 코드를
실행하고, 응답을 준 뒤 정리합니다. 대표적인 FaaS 서비스:

| Provider | 서비스명 |
|---|---|
| AWS | Lambda |
| Google Cloud | Cloud Functions |
| Azure | Functions |
| Vercel | Serverless Functions / Edge Functions |
| Cloudflare | Workers |

---

## Cold Start

서버리스의 가장 큰 트레이드오프입니다. 함수가 한동안 호출되지 않으면 provider가 실행
환경을 내려버리고, 다음 요청이 왔을 때 처음부터 다시 컨테이너를 띄우고 런타임을 초기화한
뒤 코드를 실행합니다. 이 과정이 **Cold Start**이고, 짧게는 수백 ms에서 길게는 몇 초까지
지연이 생깁니다.

```
Cold Start (실행 환경이 없는 상태)
  요청 → 컨테이너 생성 → 런타임 초기화 → 코드 실행 → 응답
        └──────────── 여기서 지연 발생 ────────────┘

Warm Start (직전 요청으로 실행 환경이 살아있는 상태)
  요청 → 코드 실행 → 응답  (지연 거의 없음)
```

**완화 방법**:
- 함수를 가볍게 유지(불필요한 의존성 제거) — 초기화 시간 단축
- Provisioned Concurrency(AWS) 같은 "항상 웜 상태 유지" 옵션 사용 (비용 증가)
- Edge Function(V8 isolate 기반, Cloudflare Workers·Vercel Edge)은 컨테이너 대신
  훨씬 가벼운 격리 단위를 써서 Cold Start가 거의 없음

---

## 상태를 갖지 않는다 (Stateless)

함수 인스턴스는 요청 사이에 상태를 보장하지 않습니다. 이번 요청에서 메모리에 저장한
값이 다음 요청에서도 남아있을 거라 기대하면 안 됩니다.

```typescript
// ❌ 잘못된 가정: 이 카운터는 요청마다 초기화될 수 있음
let requestCount = 0;

export const handler = async () => {
  requestCount++; // 인스턴스가 재사용되면 유지되지만, 새 인스턴스면 다시 0부터
  return { count: requestCount };
};
```

세션, 파일 업로드 임시 저장, 카운터 같은 상태는 함수 바깥의 별도 저장소(DB, Redis,
Object Storage)에 둬야 합니다.

---

## 실행 시간 제한

대부분의 FaaS는 함수 하나가 실행될 수 있는 최대 시간을 제한합니다.

| Provider | 기본/최대 실행 시간 |
|---|---|
| AWS Lambda | 최대 15분 |
| Vercel Serverless Functions | 플랜에 따라 10초 ~ 수 분 |
| Cloudflare Workers | 기본 밀리초~초 단위(CPU 시간 기준) |

오래 걸리는 배치 작업이나 스트리밍처럼 장시간 연결이 필요한 작업은 서버리스 함수
하나로 처리하기 어렵습니다 — 큐(Queue)로 작업을 쪼개거나, 별도의 상시 서버/워커로
분리하는 게 일반적입니다.

---

## 과금 방식

전통적 서버는 인스턴스를 켜둔 시간만큼 과금되지만, 서버리스는 보통 두 축으로 과금됩니다.

```
비용 = (요청 수 × 요청당 단가) + (실행 시간 × 메모리 사용량 × 시간당 단가)
```

트래픽이 0이면 비용도 0에 가깝습니다(콜드스타트 대비용 유지 비용 등은 별도). 반대로
꾸준히 높은 트래픽이 있는 서비스는, 어느 지점부터는 상시 켜둔 서버보다 오히려 비쌀 수
있습니다 — 서버리스는 "트래픽이 들쭉날쭉한 서비스"에 특히 유리합니다.

---

## FaaS vs BaaS

서버리스라는 말이 FaaS만 가리키는 건 아닙니다. **BaaS(Backend as a Service)**도 넓은
의미의 서버리스에 포함됩니다 — 직접 백엔드 코드를 짜는 대신, 인증·DB·스토리지 같은
백엔드 기능 자체를 관리형 서비스로 가져다 쓰는 방식입니다.

```
FaaS: 내가 짠 함수를 provider가 실행해줌 (AWS Lambda, Cloudflare Workers)
BaaS: 백엔드 기능 자체를 provider가 API로 제공함 (Firebase, Supabase, Auth0)
```

실무에서는 둘을 섞어 씁니다. 예를 들어 인증은 Supabase(BaaS), 커스텀 비즈니스 로직은
Vercel Serverless Function(FaaS)으로 처리하는 식입니다.

---

## 언제 서버리스가 맞는가

| 적합한 경우 | 덜 적합한 경우 |
|---|---|
| 트래픽이 불규칙하거나 예측하기 어려움 | 항상 일정하게 높은 트래픽(상시 서버가 더 저렴) |
| 이벤트 기반 처리(파일 업로드 트리거, webhook) | 낮은 지연이 항상 보장돼야 함(Cold Start 민감) |
| 빠르게 프로토타입/MVP를 만들어야 함 | 오래 걸리는 배치/스트리밍 작업 |
| 인프라 관리 인력 없이 소규모 팀 운영 | WebSocket처럼 장시간 연결 유지가 필요한 경우 |

---

## 실제 사용 사례

| 용도 | 예시 |
|------|------|
| API 엔드포인트 | Next.js API Route를 Vercel Serverless Function으로 배포 |
| 이벤트 처리 | S3 업로드 시 썸네일 생성(AWS Lambda 트리거) |
| 인증 미들웨어 | Cloudflare Workers에서 요청마다 토큰 검증 후 라우팅 |
| 이미지 최적화 | 요청 시점에 이미지를 리사이즈해 반환(Edge Function) |
| 정기 작업 | Cron으로 매일 새벽 리포트 생성 후 이메일 발송 |
