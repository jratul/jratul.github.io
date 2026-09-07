---
title: "Grafana와 Loki"
date: "2026-09-08"
tags: ["grafana", "loki", "observability", "logql", "monitoring", "backend"]
excerpt: "무엇이든 붙일 수 있는 시각화 계층 Grafana와, 로그 전체를 색인하지 않고도 싸게 검색하는 Loki의 설계를 LogQL 예제와 함께 정리합니다."
---

# Grafana와 Loki

[로그(Log)와 메트릭(Metric)](/post/backend/observability/logs-metrics) 글에서 Grafana와 Loki를 로깅 스택의 한 조합으로 잠깐 언급했습니다. 이 글에서는 그 둘을 각각 더 깊게 봅니다 — Grafana가 왜 "시각화 계층"으로 불리는지, 그리고 Loki가 왜 Elasticsearch보다 훨씬 싸게 로그를 다룰 수 있는지가 핵심입니다.

---

## Grafana — 데이터는 담지 않고 보여주기만 한다

Grafana 자체는 로그도, 메트릭도 저장하지 않습니다. Prometheus, Loki, InfluxDB, CloudWatch, Elasticsearch 등 **다른 시스템에 이미 쌓여있는 데이터를 가져와 대시보드로 보여주는 계층**입니다.

```
[Prometheus] ──┐
[Loki]        ──┼──→ [Grafana] → 대시보드 / 알림
[Tempo]       ──┤
[CloudWatch]  ──┘
   (데이터 소스)      (시각화만 담당)
```

이 구조 덕분에 회사마다 이미 쓰고 있는 모니터링 도구가 제각각이어도, 그 위에 Grafana 하나만 얹으면 하나의 화면에서 다 볼 수 있습니다. 데이터 소스(Data Source)를 등록하고, 패널(Panel)에 쿼리를 입력하고, 여러 패널을 대시보드로 묶는 게 기본 흐름입니다.

### 대시보드 변수(Variables)

같은 대시보드를 서버 하나가 아니라 여러 서버/환경에 재사용하려고 드롭다운으로 값을 바꿀 수 있게 만드는 기능입니다.

```
드롭다운: $environment = [production, staging, development]
쿼리: http_requests_total{env="$environment"}
```

`$environment` 값을 바꾸면 대시보드 안의 모든 패널 쿼리가 그 값으로 다시 실행됩니다. 서버/서비스별로 똑같은 대시보드를 수십 개 복사해둘 필요가 없어집니다.

### 알림(Alerting)

패널의 쿼리 결과가 특정 조건을 만족하면 Slack/이메일/PagerDuty 등으로 알림을 보내는 기능이 Grafana 자체에 내장되어 있습니다. 데이터 소스가 Prometheus든 Loki든 동일한 알림 규칙 UI로 다룰 수 있다는 점이 장점입니다.

---

## Loki — 로그판 Prometheus

Loki는 Grafana Labs가 만든 로그 저장 시스템으로, **"로그 내용 전체를 색인하지 않는다"**는 설계로 유명합니다. Elasticsearch가 로그 한 줄 한 줄의 모든 단어를 역색인(inverted index)하는 것과 정반대 방향입니다.

| | Elasticsearch(ELK) | Loki |
|---|---|---|
| 색인 대상 | 로그 본문 전체(풀텍스트) | 레이블(label)만 — 본문은 색인 안 함 |
| 검색 방식 | 아무 단어로나 빠르게 검색 | 레이블로 먼저 좁힌 뒤 본문은 순차 스캔 |
| 저장 비용 | 색인 크기가 커서 스토리지 비용이 큼 | 본문은 압축된 청크로 객체 스토리지에 저장, 훨씬 저렴 |
| 풀텍스트 검색 성능 | 뛰어남 | 레이블 없이 본문 전체를 훑는 검색은 느림 |
| 운영 복잡도 | 클러스터 운영이 상대적으로 무거움 | 컴포넌트가 단순해 운영 부담이 적음 |

Prometheus가 메트릭에 레이블(예: `job="api", instance="10.0.0.1"`)을 붙여 시계열을 식별하듯, Loki도 로그 스트림에 똑같은 방식의 레이블을 붙여 식별합니다. "Prometheus와 똑같은 사고방식으로 로그를 다룬다"는 게 Loki의 핵심 설계 철학입니다.

### 왜 로그 본문을 색인하지 않아도 되나

실무에서 로그를 찾는 흐름을 떠올려보면, 대개 "어떤 서비스(`service="checkout"`)의, 어떤 레벨(`level="error"`) 로그"처럼 **레이블로 먼저 크게 좁힌 다음** 그 안에서 본문을 확인합니다. Loki는 이 흐름에 맞춰, 레이블로 좁혀진 소수의 스트림만 실제로 읽어서 스캔합니다. 전체 로그 중 극히 일부만 읽으면 되므로 본문 전체를 색인해두지 않아도 실용적인 속도가 나옵니다.

---

## Loki 아키텍처

```
로그 발생 → Promtail/Alloy(수집 에이전트)
              │ 레이블을 붙여서 전송
              ▼
         Distributor (수신 후 라우팅)
              │
              ▼
          Ingester (메모리에 모았다가 청크로 묶어 저장)
              │
              ▼
       객체 스토리지 (S3, GCS 등) ← 실제 로그 본문이 저장되는 곳
              │
              ▼
          Querier (쿼리 요청 시 필요한 청크만 읽어서 응답)
```

`Promtail`(또는 최근에는 통합 에이전트인 `Grafana Alloy`)이 서버/컨테이너에서 로그를 읽어 레이블을 붙여 Loki로 전송하면, Loki는 이를 압축된 청크로 만들어 S3 같은 객체 스토리지에 쌓아둡니다. 조회할 때는 레이블로 대상 청크를 좁힌 뒤 그것만 꺼내 읽습니다.

---

## LogQL — Loki의 쿼리 언어

Grafana에서 Loki 데이터를 조회할 때 쓰는 언어로, PromQL(Prometheus 쿼리 언어)과 문법이 비슷합니다.

```logql
# 1. 레이블 셀렉터 — service가 checkout인 스트림만
{service="checkout"}

# 2. 라인 필터 — 그 중 "timeout"이라는 단어가 포함된 줄만
{service="checkout"} |= "timeout"

# 3. 레벨까지 좁히고, 특정 단어는 제외
{service="checkout", level="error"} != "healthcheck"

# 4. JSON 로그를 파싱해서 필드로 필터링
{service="checkout"} | json | status_code >= 500

# 5. 집계 — 5분 단위로 에러 로그 발생 건수 세기
sum(count_over_time({service="checkout", level="error"}[5m]))
```

`{...}` 안의 레이블 셀렉터로 먼저 스트림을 좁히고, `|=`(포함)/`!=`(제외)/`|json`(파싱) 같은 파이프라인 연산자를 이어 붙여 점점 좁혀가는 방식입니다. 마지막 예제처럼 로그를 집계하면 메트릭처럼 그래프로 그릴 수도 있습니다 — "에러 로그가 갑자기 늘었다"는 것 자체를 하나의 시계열 그래프로 확인할 수 있다는 뜻입니다.

---

## 메트릭에서 로그로, 로그에서 메트릭으로

Grafana의 실용적인 장점은 Prometheus 메트릭 그래프와 Loki 로그를 한 화면에서 오갈 수 있다는 점입니다. 흔한 장애 대응 흐름은 이렇습니다.

```
1. Grafana 대시보드에서 에러율 그래프(Prometheus)가 튄 시점을 발견
2. 그 시간대를 그대로 선택해 Explore 화면에서 Loki로 전환
3. 같은 시간대, 같은 서비스 레이블로 로그를 조회
4. LogQL로 에러 메시지를 필터링해 원인 파악
```

메트릭이 "언제, 어디서 이상이 생겼는지"를 알려주고, 로그가 "정확히 무슨 일이 있었는지"를 알려주는 역할 분담이며, Grafana는 이 둘을 오가는 이동 비용을 줄여주는 도구입니다.

---

## 최근 흐름 — LGTM 스택

Grafana Labs는 Loki(로그), Grafana(시각화)에 이어 Tempo(분산 트레이싱), Mimir(장기 보관이 가능한 Prometheus 호환 메트릭 저장소)까지 자체 생태계를 갖추고, 이 네 가지를 묶어 **LGTM 스택**(Loki, Grafana, Tempo, Mimir)이라고 부릅니다. [OpenTelemetry](/post/backend/observability/opentelemetry)로 계측을 표준화하고 그 데이터를 LGTM 스택으로 받는 조합이 흔한 구성으로 자리잡고 있습니다.

또한 로그 수집 에이전트도 기존의 Promtail(로그 전용) 대신, 로그·메트릭·트레이스를 한 번에 수집할 수 있는 통합 에이전트 **Grafana Alloy**로 옮겨가는 추세입니다. 수집기 하나로 세 종류의 관측 데이터를 모두 처리해 운영 부담을 줄이려는 방향입니다.

---

## 정리

- Grafana는 데이터를 저장하지 않고, 여러 데이터 소스를 하나의 화면(대시보드/알림)으로 모아 보여주는 시각화 계층이다.
- Loki는 로그 본문을 색인하지 않고 레이블로만 스트림을 식별해, Elasticsearch보다 훨씬 저렴하게 로그를 다룬다.
- 그 대신 레이블 없이 본문 전체를 뒤지는 풀텍스트 검색에는 약하다 — 레이블 설계가 Loki를 잘 쓰는 핵심이다.
- LogQL은 레이블 셀렉터 뒤에 필터/파싱/집계 연산자를 파이프로 이어 붙이는 방식이며, PromQL과 사고방식이 비슷하다.
- Loki, Tempo, Mimir가 Grafana와 함께 LGTM 스택으로 묶이며, 로그/메트릭/트레이스를 한 생태계로 통합하는 흐름이 이어지고 있다.
