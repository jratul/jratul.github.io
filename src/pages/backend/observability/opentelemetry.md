---
title: "OpenTelemetry"
date: "2026-07-28"
tags: ["opentelemetry", "observability", "tracing", "metrics", "backend"]
excerpt: "로그·메트릭·트레이스를 벤더 종속 없이 표준화하는 OpenTelemetry의 핵심 개념(Trace, Span, Collector)과 실제 계측 방법을 정리합니다."
---

# OpenTelemetry

관측성(Observability)을 갖추려고 하면 금방 문제가 생깁니다. 로그는 A사 도구, 메트릭은
B사 도구, 분산 트레이싱은 C사 SDK로 각각 계측하면, 나중에 벤더를 바꿀 때마다 애플리케이션
코드를 전부 다시 고쳐야 합니다. **OpenTelemetry(OTel)**는 이 계측 코드를 벤더 중립적인
표준으로 통일한 CNCF 프로젝트입니다. 계측은 한 번만 하고, 데이터를 어디로 보낼지는 설정만
바꿔서 결정합니다.

---

## 왜 필요한가

```
OpenTelemetry 이전
  코드 안에 특정 벤더 SDK를 직접 import
  → Datadog에서 New Relic으로 바꾸려면 계측 코드 전체를 다시 작성

OpenTelemetry 이후
  코드는 OTel API/SDK로만 계측
  → 데이터를 어디로 보낼지는 Exporter 설정 한 줄로 결정
  → 벤더를 바꿔도 애플리케이션 코드는 그대로
```

관측성의 세 축(로그, 메트릭, 트레이스)을 모두 이 하나의 표준으로 다룹니다 — 세 데이터가
서로 다른 도구에 흩어져 있으면 "이 에러 로그가 어느 요청의 어느 구간에서 났는지" 연결하기
어렵지만, OTel은 처음부터 이 셋을 같은 컨텍스트(trace ID)로 엮도록 설계되어 있습니다.

---

## 핵심 개념: Trace와 Span

분산 시스템에서 요청 하나는 여러 서비스를 거칩니다. 이 요청 전체의 흐름을 **Trace**라고
부르고, Trace는 여러 개의 **Span**(개별 작업 단위)으로 구성됩니다.

```
Trace: "사용자가 주문 버튼을 누른 요청"
├── Span: API Gateway 수신               (0ms ~ 120ms)
│   └── Span: 인증 서비스 호출            (10ms ~ 40ms)
├── Span: 주문 서비스 처리                (40ms ~ 90ms)
│   └── Span: DB 쿼리(재고 확인)          (50ms ~ 70ms)
└── Span: 결제 서비스 호출                (90ms ~ 115ms)
    └── Span: 외부 PG사 API 호출          (95ms ~ 110ms)
```

각 Span은 시작·종료 시각, 이름, 부모-자식 관계(어느 Span에서 파생됐는지), 속성
(attributes), 이벤트를 갖습니다. 이 트리 구조 덕분에 "전체 요청 중 어느 구간에서
시간이 가장 오래 걸렸는지"를 한눈에 볼 수 있습니다 — 흔히 보는 워터폴(waterfall)
형태의 트레이스 시각화가 바로 이 Span 트리를 그린 것입니다.

**Context Propagation**: 서비스 A에서 서비스 B로 요청이 넘어갈 때, 지금 이 요청이
어느 Trace에 속하는지 정보(trace ID, span ID)를 HTTP 헤더 등에 실어 함께 전달합니다.
이게 없으면 서비스마다 트레이스가 끊어져서 "전체 요청 흐름"을 재구성할 수 없습니다.

```
서비스 A → 서비스 B 호출 시 헤더에 자동으로 실림
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             │  └─ trace ID (전체 요청 식별자)      └─ span ID (부모 span)
             └─ 버전
```

---

## 구성 요소: API / SDK / Collector

```
애플리케이션 코드
    ↓ (계측)
OpenTelemetry API   ← 코드에서 직접 쓰는 인터페이스(어떤 언어든 동일한 개념)
    ↓
OpenTelemetry SDK   ← API의 실제 구현체(샘플링, 배치 처리 등 담당)
    ↓ (OTLP 프로토콜로 전송)
OpenTelemetry Collector  ← 데이터를 받아 가공/필터링 후 여러 백엔드로 분배
    ↓
Jaeger / Prometheus / Datadog / New Relic / ...
```

**Collector**가 핵심입니다. 애플리케이션이 데이터를 직접 특정 벤더로 보내는 대신,
일단 Collector로 보내면 Collector가 필요에 따라 여러 백엔드로 동시에 분배하거나,
민감 정보를 마스킹하거나, 샘플링 비율을 조정할 수 있습니다. 애플리케이션 코드는
"Collector로 보낸다"는 사실만 알면 되고, 그 뒤에서 벤더가 바뀌어도 영향받지 않습니다.

---

## 계측(Instrumentation): 자동 vs 수동

**자동 계측**: Express, HTTP 클라이언트, DB 드라이버처럼 널리 쓰이는 라이브러리는
OTel이 이미 계측 코드를 만들어뒀습니다. 애플리케이션 코드를 건드리지 않고도 요청/응답,
DB 쿼리 같은 기본적인 Span이 자동으로 생깁니다.

```typescript
// Node.js — 자동 계측 등록 (애플리케이션 코드 실행 전에 로드)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: 'http://localhost:4318/v1/traces' }),
  instrumentations: [getNodeAutoInstrumentations()], // express, http, pg 등 자동 계측
});

sdk.start();
```

**수동 계측**: 비즈니스 로직에서 의미 있는 구간("재고 확인 로직", "쿠폰 계산")을
직접 Span으로 감싸고 싶을 때 씁니다.

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('order-service');

async function checkInventory(productId: string) {
  return tracer.startActiveSpan('check-inventory', async (span) => {
    span.setAttribute('product.id', productId);
    try {
      const result = await db.query(/* ... */);
      return result;
    } finally {
      span.end(); // 반드시 종료해야 함 — 안 하면 Span이 영원히 열린 채로 남음
    }
  });
}
```

실무에서는 자동 계측으로 기본 골격(HTTP 요청, DB 쿼리)을 잡고, 정말 중요한 비즈니스
로직 구간만 수동으로 추가하는 조합이 일반적입니다.

---

## 메트릭과 로그도 같은 방식으로

트레이스가 가장 널리 알려져 있지만, OTel API는 메트릭과 로그도 동일한 방식으로
다룹니다.

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('order-service');
const orderCounter = meter.createCounter('orders.created', {
  description: '생성된 주문 수',
});

orderCounter.add(1, { status: 'success' });
```

트레이스와 메트릭이 같은 SDK/Collector 파이프라인을 공유하기 때문에, 같은
서비스 이름·환경 태그를 기준으로 두 데이터를 나란히 볼 수 있습니다 — "에러율이
튄 시점의 실제 실패 요청 트레이스"를 바로 이어서 찾아볼 수 있는 이유입니다.

---

## OTLP: 전송 프로토콜

**OTLP(OpenTelemetry Protocol)**는 SDK가 Collector로, 혹은 Collector가 백엔드로
데이터를 보낼 때 쓰는 표준 전송 프로토콜입니다. gRPC와 HTTP(protobuf/JSON) 두 방식을
지원합니다. 대부분의 최신 관측성 벤더(Datadog, Grafana Cloud, Honeycomb 등)가 OTLP
수신을 지원하기 때문에, 극단적으로는 Collector 없이 SDK가 벤더 엔드포인트로 바로
OTLP를 쏘는 구성도 가능합니다 — 다만 Collector를 두면 배치 처리·재시도·샘플링을
애플리케이션 밖에서 관리할 수 있어 프로덕션에서는 Collector 경유가 일반적입니다.

---

## 실무 적용 팁

- **샘플링**: 트래픽이 많으면 모든 요청을 100% 트레이싱하는 건 비용·부하 면에서
  부담입니다. Collector 단계에서 일정 비율만 샘플링하거나, 에러가 난 요청은 무조건
  샘플링하는(tail-based sampling) 전략을 씁니다.
- **Span 종료를 빠뜨리지 않기**: 수동 계측에서 `span.end()`를 호출하지 않으면 메모리
  누수와 잘못된 지연시간 집계로 이어집니다 — `try/finally`로 감싸는 게 안전합니다.
- **속성(attribute) 남용 주의**: Span에 사용자 이메일 같은 민감 정보를 그대로 넣으면
  트레이싱 백엔드에 개인정보가 쌓입니다. Collector의 프로세서로 필터링하거나, 애초에
  계측 단계에서 넣지 않아야 합니다.
- **서비스 이름 일관성**: 모든 서비스가 같은 규칙으로 `service.name`을 지정해야
  트레이스가 서비스 경계를 넘어 하나로 이어집니다.

---

## 실제 사용 사례

| 상황 | OpenTelemetry로 얻는 것 |
|------|------|
| 마이크로서비스 지연 원인 파악 | 요청 하나가 어느 서비스, 어느 구간에서 느려졌는지 Span 트리로 즉시 확인 |
| 벤더 락인 회피 | 계측 코드는 그대로 두고 Collector 설정만 바꿔 관측성 벤더 교체 |
| 에러 발생 시점 재구성 | 에러 로그와 해당 요청의 전체 트레이스를 trace ID로 바로 연결 |
| SLO/SLI 모니터링 | 메트릭으로 응답 시간 p99, 에러율을 표준화된 방식으로 수집 |
