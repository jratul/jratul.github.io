---
title: "Grafana, Loki, Prometheus — 모니터링 스택 밑바닥부터"
date: "2026-09-10"
tags: ["grafana", "loki", "prometheus", "observability", "logql", "promql", "monitoring", "backend"]
excerpt: "서버가 죽었는지 어떻게 아는가라는 질문부터 시작해서, 메트릭이 뭔지, Prometheus가 왜 그렇게 설계됐는지, Loki와 Grafana가 어떻게 맞물리는지를 처음 보는 사람도 따라올 수 있게 정리합니다."
---

# Grafana, Loki, Prometheus — 모니터링 스택 밑바닥부터

Prometheus, Grafana, Loki라는 이름은 자주 들리는데 막상 "Prometheus가 정확히 뭘 하는 물건인가"라고 물으면 설명하기 애매한 경우가 많습니다. 이 글은 셋 중 아무것도 모른다고 가정하고, 왜 이런 도구가 필요해졌는지부터 시작해서 각 도구의 내부 동작 방식, 그리고 실제로 셋을 어떻게 같이 쓰는지까지 순서대로 다룹니다.

---

## 1. 왜 이런 도구가 필요한가

서버 한 대로 서비스를 운영한다고 해봅시다. 문제가 생기면 SSH로 접속해서 로그 파일을 `tail -f`로 보거나, `top`으로 CPU/메모리를 확인하면 됩니다. 서버가 한 대뿐이면 이 정도로 충분합니다.

그런데 서버가 10대, 100대가 되고, 그 위에서 수십 개의 서비스가 돌아가기 시작하면 이 방식은 무너집니다.

- 어떤 서버, 어떤 서비스에 문제가 생겼는지조차 알아내기 어렵다 (100대를 한 대씩 SSH로 들어가 확인할 수 없다)
- "지금 CPU가 몇 %인지"는 알 수 있어도 "어제 새벽 3시에 CPU가 튀었는지"는 그 순간을 놓치면 알 방법이 없다 (수치가 휘발된다)
- 로그가 서버마다 흩어져 있어서, 요청 하나가 여러 서버를 거쳐 처리되는 구조에서는 그 흐름을 추적하기 어렵다

그래서 필요해진 게 **모니터링 시스템**입니다. 핵심 아이디어는 단순합니다.

1. 각 서버/서비스의 상태를 숫자(메트릭)로 계속 뽑아서 한 곳에 시간 순으로 쌓아둔다
2. 로그도 각 서버에 흩어두지 말고 한 곳에 모아둔다
3. 쌓인 데이터를 그래프로 보고, 이상하면 사람에게 알려준다

이 세 가지 역할을 각각 Prometheus(메트릭 수집·저장), Loki(로그 수집·저장), Grafana(수집된 걸 그래프로 보여주기)가 나눠 맡습니다. 셋을 합쳐서 흔히 **PLG 스택**(Prometheus, Loki, Grafana)이라고 부릅니다.

---

## 2. 메트릭(Metric)이 정확히 뭔가

Prometheus를 이해하려면 먼저 "메트릭"이라는 단어부터 정확히 짚어야 합니다. 메트릭은 **시간에 따라 변하는 숫자를 기록한 데이터**입니다. 이렇게 시간+값 쌍이 쭉 이어진 데이터를 **시계열**(Time Series)이라고 부릅니다.

```
시각                값
14:00:00           102
14:00:15           98
14:00:30           145
14:00:45           130
```

이것만으로는 "무엇의" 값인지 알 수 없습니다. 그래서 메트릭에는 이름과 **레이블**(Label)이라는 꼬리표가 붙습니다.

```
http_requests_total{method="GET", status="200", instance="api-server-1"}
```

- `http_requests_total`: 메트릭 이름 — "HTTP 요청이 총 몇 번 들어왔나"
- `{method="GET", status="200", instance="api-server-1"}`: 레이블 — 이 숫자가 정확히 무엇에 대한 것인지 나타내는 꼬리표

레이블 조합이 다르면 완전히 다른 시계열로 취급됩니다. 즉 `method="GET"`인 것과 `method="POST"`인 것은 각각 독립적으로 시간에 따라 값이 쌓입니다. 이 "이름 + 레이블 조합 하나당 시계열 하나"라는 데이터 모델이 Prometheus, 그리고 뒤에서 볼 Loki까지 관통하는 핵심 개념입니다.

### 메트릭의 4가지 종류

메트릭은 아무 숫자나 막 기록하는 게 아니라, 값이 변하는 방식에 따라 정해진 4가지 타입 중 하나로 다뤄집니다. 이걸 모르고 넘어가면 나중에 PromQL을 봐도 왜 `rate()` 같은 함수가 필요한지 이해할 수 없습니다.

| 타입 | 설명 | 예시 |
|---|---|---|
| Counter(카운터) | 0에서 시작해서 계속 증가만 하는 값. 재시작하면 0으로 리셋 | 총 요청 수, 총 에러 수 |
| Gauge(게이지) | 오르내리는 값. 특정 시점의 스냅샷 | 현재 메모리 사용량, 현재 활성 커넥션 수 |
| Histogram(히스토그램) | 값을 미리 정한 구간(버킷)별로 몇 개씩 들어갔는지 기록 | 응답 시간 분포(0~100ms 몇 건, 100~500ms 몇 건...) |
| Summary(서머리) | 클라이언트 쪽에서 미리 분위수(p50, p95 등)를 계산해 기록 | 응답 시간의 p95 |

Counter가 헷갈리기 쉬운데, "총 요청 수"처럼 절대 줄어들지 않는 숫자입니다. "지금 초당 몇 건씩 요청이 오는가"(요청률)를 알고 싶다면 이 누적값 자체가 아니라 **누적값이 얼마나 빠르게 늘고 있는지**를 계산해야 합니다. 이 계산을 해주는 함수가 뒤에서 볼 PromQL의 `rate()`입니다.

Histogram은 조금 더 자세히 볼 가치가 있습니다. "응답 시간의 평균"만 알면 함정에 빠지기 쉽습니다 — 999건이 10ms이고 1건이 10초여도 평균은 크게 튀지 않을 수 있습니다. 그래서 "응답 시간이 100ms 이하인 요청이 몇 %인가, 500ms 이하는 몇 %인가"처럼 **분포**를 보는 게 훨씬 유용하고, Histogram이 이걸 위한 타입입니다.

---

## 3. Prometheus란 무엇인가

Prometheus는 SoundCloud에서 만들어 2012년 공개한 오픈소스 모니터링 시스템으로, 위에서 설명한 시계열 데이터를 **직접 수집하고, 저장하고, 조회하는 기능을 모두 갖춘 하나의 시스템**입니다. Kubernetes에 이어 CNCF(Cloud Native Computing Foundation)의 두 번째 졸업(Graduated) 프로젝트이기도 합니다.

### Pull 방식 — Prometheus가 먼저 요청하러 간다

Prometheus를 처음 접하면 가장 낯선 부분이 데이터를 가져오는 방향입니다. 일반적으로 "모니터링 대상이 데이터를 보낸다"(Push)고 생각하기 쉬운데, Prometheus는 반대로 동작합니다. **Prometheus 서버가 각 대상에게 주기적으로 찾아가서 값을 긁어옵니다.** 이를 스크레이핑(Scraping)이라고 부릅니다.

```
Push 방식 (Prometheus는 이 방식을 쓰지 않음)
[서버 A] ──메트릭 전송──→ [수집 서버]
[서버 B] ──메트릭 전송──→
[서버 C] ──메트릭 전송──→

Pull 방식 (Prometheus)
[Prometheus] ──15초마다 요청──→ [서버 A의 /metrics]
             ──15초마다 요청──→ [서버 B의 /metrics]
             ──15초마다 요청──→ [서버 C의 /metrics]
```

모니터링 대상이 되는 각 서버/서비스는 `/metrics`라는 HTTP 엔드포인트를 열어두기만 하면 됩니다. Prometheus는 미리 정해진 목록(어떤 주소들을 스크레이핑할지)을 갖고, 정해진 주기마다 그 주소들의 `/metrics`에 HTTP GET을 날려서 응답을 받아옵니다.

**왜 굳이 반대로 하는가:**

- 대상이 살아있는지 자체를 스크레이핑 성공/실패로 바로 알 수 있습니다(`up` 메트릭이 자동으로 생깁니다). Push 방식은 대상이 죽어서 아무것도 안 보내는 것과, 원래 보낼 게 없어서 안 보내는 것을 구분하기 어렵습니다.
- 어떤 대상을 감시할지 Prometheus 한 곳에서 중앙 관리할 수 있습니다. 대상 서버 쪽 설정을 일일이 바꿀 필요가 없습니다.
- 대상 입장에서는 "누가 긁어가든 말든" `/metrics`만 노출하면 되므로 구현이 단순합니다.

다만 Pull 방식은 "짧게 실행되고 끝나는 배치 작업"처럼 스크레이핑할 시점에 대상이 이미 사라지고 없는 경우에는 맞지 않습니다. 이런 경우를 위해 **Pushgateway**라는 중간 다리를 따로 둡니다 — 배치 작업이 끝나기 직전에 결과를 Pushgateway에 밀어넣고(Push), Prometheus는 평소처럼 Pushgateway를 스크레이핑(Pull)해서 값을 가져갑니다.

### /metrics 엔드포인트는 실제로 이렇게 생겼다

`/metrics`에 접속하면 사람이 읽을 수 있는 단순한 텍스트가 나옵니다.

```
# HELP http_requests_total 처리한 HTTP 요청의 총 개수
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 8842
http_requests_total{method="POST",status="500"} 3

# HELP process_resident_memory_bytes 현재 상주 메모리(RSS) 바이트
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 4.8234496e+07

# HELP http_request_duration_seconds HTTP 요청 처리 시간 분포
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 8210
http_request_duration_seconds_bucket{le="0.5"} 8790
http_request_duration_seconds_bucket{le="1"} 8830
http_request_duration_seconds_bucket{le="+Inf"} 8845
http_request_duration_seconds_sum 421.7
http_request_duration_seconds_count 8845
```

`# HELP`는 설명, `# TYPE`은 앞서 본 4가지 타입 중 무엇인지 알려주는 주석입니다. Histogram은 실제로는 `_bucket`(구간별 누적 개수), `_sum`(전체 합), `_count`(전체 개수) 여러 시계열의 묶음으로 노출된다는 점이 특이합니다. `le="0.1"`은 "0.1초 이하인 요청이 지금까지 8,210건"이라는 뜻이고, `le="+Inf"`는 전체 개수와 같아집니다.

이 텍스트를 애플리케이션이 직접 만들어 내려면 각 언어의 Prometheus 클라이언트 라이브러리(Java의 `micrometer`, Node.js의 `prom-client` 등)를 코드에 넣으면 됩니다. 반대로 애플리케이션을 건드릴 수 없는 기존 시스템(리눅스 서버 자체, MySQL, Redis 등)은 그 시스템의 상태를 대신 읽어서 `/metrics` 형식으로 변환해주는 작은 프록시 프로그램을 붙이는데, 이를 **Exporter**라고 부릅니다. 리눅스 서버의 CPU/메모리/디스크를 노출하는 `node_exporter`가 가장 대표적입니다.

### Prometheus 전체 구성 요소

```
[node_exporter]  [내 애플리케이션]  [mysqld_exporter]
      │  /metrics       │  /metrics          │  /metrics
      └────────┬────────┴────────┬───────────┘
               ▼                 ▼
         ┌─────────────────────────────┐
         │        Prometheus Server     │
         │  1) Scraper — 주기적으로 긁어옴 │
         │  2) TSDB — 로컬 디스크에 시계열 저장│
         │  3) PromQL 엔진 — 쿼리 처리    │
         └───────────┬─────────────────┘
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
      [Grafana]            [Alertmanager]
     (그래프로 조회)         (규칙 위반 시 알림 발송)
```

- **Prometheus Server**: 스크레이핑, 저장(TSDB), 쿼리(PromQL)를 모두 담당하는 본체
- **Exporter**: 대상 시스템의 상태를 `/metrics` 형식으로 변환해 노출하는 작은 프로그램
- **Service Discovery**: 서버 목록을 파일에 일일이 적지 않고, Kubernetes/AWS 등에서 현재 떠 있는 대상 목록을 자동으로 알아오는 기능
- **Alertmanager**: Prometheus가 아니라 별도로 떠 있는 프로세스로, 알림 규칙에 걸린 이벤트를 받아 Slack/이메일/PagerDuty로 실제 알림을 보내는 역할

### 스크레이핑 대상을 지정하는 설정 파일

```yaml
# prometheus.yml
global:
  scrape_interval: 15s # 15초마다 긁어온다

scrape_configs:
  - job_name: "node" # 이 그룹의 이름
    static_configs:
      - targets: ["server-a:9100", "server-b:9100"] # node_exporter 주소들

  - job_name: "my-api"
    static_configs:
      - targets: ["api-server:8080"]
```

`static_configs`는 대상 주소를 직접 나열하는 가장 단순한 방식입니다. Kubernetes 환경에서는 이렇게 고정하지 않고 `kubernetes_sd_configs`를 써서 "지금 떠 있는 파드 목록"을 자동으로 계속 찾아오게 만드는 게 일반적입니다 — 파드는 배포될 때마다 IP가 바뀌기 때문입니다.

### TSDB — 시계열을 어떻게 저장하나

Prometheus는 별도의 외부 데이터베이스 없이, 자체 내장 시계열 데이터베이스(TSDB)에 로컬 디스크로 저장합니다. 시간 순으로 들어오는 숫자는 일반 데이터베이스보다 훨씬 잘 압축됩니다 — 값이 조금씩만 바뀌는 경우가 많고, 타임스탬프도 일정한 간격이기 때문입니다. Prometheus는 이 특성을 이용한 압축 방식으로 시계열 하나당 평균 1~2바이트 수준까지 압축합니다. 다만 로컬 디스크 기반이라 기본적으로는 보관 기간과 단일 서버 용량의 한계가 있는데, 이 한계를 넘어서기 위한 확장 저장소가 뒤에서 다룰 Mimir 같은 프로젝트입니다.

---

## 4. PromQL — Prometheus의 쿼리 언어

PromQL(Prometheus Query Language)은 쌓인 시계열 데이터에서 원하는 값을 뽑아내는 전용 쿼리 언어입니다. 하나씩 단계를 밟아가며 보겠습니다.

```promql
# 1. 메트릭 이름만 쓰면 — 현재(가장 최근) 값을 레이블 조합별로 전부 보여준다
http_requests_total

# 2. 레이블로 필터링 — status가 500인 것만
http_requests_total{status="500"}

# 3. 대괄호를 붙이면 "지난 N분간의 값들"(Range Vector)이 된다 — 그래프 한 점이 아니라 구간
http_requests_total{status="500"}[5m]

# 4. rate() — Counter가 초당 얼마나 빠르게 증가하는지 계산 (Range Vector에만 쓸 수 있음)
rate(http_requests_total{status="500"}[5m])

# 5. sum by — 인스턴스가 여러 대여도 status별로 합쳐서 하나의 선으로
sum(rate(http_requests_total[5m])) by (status)

# 6. 히스토그램에서 p95 레이턴시(응답 시간 분포의 상위 95% 지점) 계산
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

가장 헷갈리는 부분이 3~4번입니다. `http_requests_total{status="500"}`처럼 대괄호 없이 쓰면 "지금 이 순간의 값 하나"(Instant Vector)를 뜻하고, `[5m]`처럼 대괄호를 붙이면 "지난 5분 동안 쌓인 값들의 목록"(Range Vector)이 됩니다. `rate()`는 이 목록을 받아서 "그 5분 동안 초당 평균 몇 건씩 늘었는지" 하나의 숫자로 계산해줍니다. Counter는 계속 누적되기만 하는 값이라 그 자체로는 그래프로 그려도 우상향 직선만 보이므로, 실제로 그래프에 쓰는 건 거의 항상 `http_requests_total` 자체가 아니라 `rate(http_requests_total[5m])`입니다.

6번의 `histogram_quantile`은 앞서 본 `_bucket{le="..."}` 데이터를 이용해 "응답 시간이 빠른 95%는 몇 초 이내인가"를 근사 계산합니다. `le`는 label로 sum by 안에 반드시 남겨둬야 하는 특수한 레이블입니다.

### Alertmanager — 규칙을 걸어 사람에게 알린다

PromQL로 표현한 조건을 계속 감시하다가 참이 되면 알림을 보내는 규칙을 정의합니다.

```yaml
# alert-rules.yml
groups:
  - name: api-alerts
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status="500"}[5m])) > 10
        for: 2m # 2분 동안 계속 조건을 만족해야 발동 (순간적인 튐 무시)
        labels:
          severity: critical
        annotations:
          summary: "5xx 에러율이 높습니다"
          description: "지난 5분간 초당 5xx 응답이 {{ $value }}건입니다"
```

Prometheus 서버는 이 규칙을 스스로 계속 평가하다가 조건을 만족하면 Alertmanager로 이벤트를 넘깁니다. Alertmanager는 같은 종류의 알림을 그룹으로 묶어 한꺼번에 보내거나(그룹핑), 이미 더 큰 장애 알림이 나갔으면 관련된 하위 알림은 억제하거나(Inhibition), 담당자에게 라우팅하는 등 "알림 그 자체를 관리"하는 역할을 Prometheus 서버에서 분리해서 담당합니다.

---

## 5. Grafana — Prometheus 혼자서는 부족한 부분을 채운다

Prometheus 자체에도 아주 간단한 그래프 화면이 내장되어 있긴 하지만, 여러 데이터 소스를 한 화면에 모으거나, 보기 좋은 대시보드를 팀과 공유하거나, 알림을 다양한 채널로 보내는 기능은 없습니다. **Grafana는 데이터를 직접 수집하거나 저장하지 않고, 이미 다른 곳에 쌓여있는 데이터를 가져와 시각화하는 계층**입니다.

```
[Prometheus] ──┐
[Loki]        ──┼──→ [Grafana] → 대시보드 / 알림
[Tempo]       ──┤
[CloudWatch]  ──┘
   (데이터 소스)      (시각화만 담당, 데이터를 저장하지 않음)
```

이 구조 덕분에 회사마다 이미 쓰고 있는 모니터링 도구가 제각각이어도, 그 위에 Grafana 하나만 얹으면 하나의 화면에서 다 볼 수 있습니다. 기본 흐름은 세 단계입니다.

1. **데이터 소스(Data Source) 등록** — "이 Grafana는 이 주소의 Prometheus, 저 주소의 Loki를 본다"고 연결 정보를 등록
2. **패널(Panel)에 쿼리 작성** — 패널 하나가 그래프 하나. PromQL이나 LogQL 쿼리를 입력하면 그 결과가 그래프/표/숫자로 그려짐
3. **대시보드(Dashboard)로 묶기** — 여러 패널을 한 화면에 배치해서 "API 서버 대시보드"처럼 하나의 화면으로 구성

### 대시보드 변수(Variables)

같은 대시보드를 서버 하나가 아니라 여러 서버·환경에 재사용하려고 드롭다운으로 값을 바꿀 수 있게 만드는 기능입니다.

```
드롭다운: $environment = [production, staging, development]
쿼리: http_requests_total{env="$environment"}
```

`$environment` 값을 바꾸면 대시보드 안의 모든 패널 쿼리가 그 값으로 다시 실행됩니다. 서버·서비스별로 똑같은 대시보드를 수십 개 복사해둘 필요가 없어집니다.

### 알림(Alerting)

패널의 쿼리 결과가 특정 조건을 만족하면 Slack·이메일·PagerDuty 등으로 알림을 보내는 기능이 Grafana 자체에도 내장되어 있습니다. 앞서 본 Prometheus의 Alertmanager와 역할이 겹쳐 보일 수 있는데, Grafana의 알림은 "데이터 소스가 Prometheus든 Loki든 CloudWatch든 상관없이 같은 화면에서 규칙을 관리할 수 있다"는 점이 다릅니다. 어느 한쪽만 써도 되고, PromQL 알림 규칙은 Alertmanager에 맡기고 로그 기반 알림만 Grafana로 보완하는 것도 흔한 조합입니다.

### Explore — 대시보드를 만들기 전에 그때그때 파고드는 화면

대시보드가 "미리 만들어둔 고정된 그래프 모음"이라면, Explore는 장애 대응 중처럼 즉흥적으로 쿼리를 바꿔가며 파고들 때 쓰는 화면입니다. 데이터 소스를 Prometheus로 뒀다가 바로 Loki로 바꿔서 같은 시간대의 로그를 확인하는 식으로, 대시보드에 저장할 필요 없는 일회성 조회에 씁니다.

---

## 6. Loki — 로그판 Prometheus

메트릭은 "지금 에러율이 몇 %인지" 같은 숫자는 잘 보여주지만, "정확히 어떤 요청이 왜 실패했는지" 같은 구체적인 내용은 알려주지 못합니다. 그 역할은 로그가 맡습니다. Loki는 Grafana Labs가 만든 로그 저장 시스템으로, 앞서 배운 Prometheus의 사고방식(이름 + 레이블로 시계열을 식별)을 로그에도 그대로 적용합니다. 그래서 "로그판 Prometheus"라고 부릅니다.

Loki의 가장 큰 특징은 **로그 내용 전체를 색인하지 않는다**는 설계입니다. 로그 검색이라고 하면 흔히 떠올리는 Elasticsearch(ELK 스택)와 정확히 반대 방향입니다.

| | Elasticsearch(ELK) | Loki |
|---|---|---|
| 색인 대상 | 로그 본문 전체(풀텍스트) | 레이블(label)만 — 본문은 색인 안 함 |
| 검색 방식 | 아무 단어로나 빠르게 검색 | 레이블로 먼저 좁힌 뒤 본문은 순차 스캔 |
| 저장 비용 | 색인 크기가 원본 로그보다 훨씬 커짐(보통 원본의 몇 배 수준) | 본문은 압축된 청크로 객체 스토리지에 저장, 훨씬 저렴 |
| 풀텍스트 검색 성능 | 뛰어남 | 레이블 없이 본문 전체를 훑는 검색은 느림 |
| 운영 복잡도 | 클러스터 운영이 상대적으로 무거움 | 컴포넌트가 단순해 운영 부담이 적음 |

### 왜 로그 본문을 색인하지 않아도 되나

Elasticsearch는 로그 한 줄 한 줄에 들어있는 모든 단어를 "이 단어가 어느 로그에 있었는지" 미리 찾아볼 수 있게 역색인(Inverted Index)해둡니다. 사전에서 단어를 찾듯 어떤 단어로도 빠르게 찾을 수 있지만, 이 색인 자체의 크기가 원본 로그보다 훨씬 커지는 대가를 치릅니다.

Loki는 실무에서 로그를 찾는 흐름을 다르게 봅니다. 사람들은 로그 전체에서 아무 단어나 검색하기보다, 대개 "어떤 서비스(`service="checkout"`)의, 어떤 레벨(`level="error"`) 로그"처럼 **레이블로 먼저 크게 좁힌 다음** 그 안에서 본문을 눈으로 확인합니다. Loki는 이 흐름에 맞춰 레이블로 좁혀진 소수의 로그 스트림만 실제로 읽어서 순차 스캔합니다. 전체 로그 중 극히 일부만 읽으면 되므로, 본문 전체를 미리 색인해두지 않아도 실용적인 속도가 나옵니다. 대신 레이블 없이 "본문 전체에서 이 단어를 찾아줘" 같은 질의는 Loki가 잘하는 영역이 아닙니다 — 그래서 레이블을 어떻게 설계하는지가 Loki를 잘 쓰는 핵심입니다.

### Loki 아키텍처

```
로그 발생 → Promtail/Alloy (수집 에이전트)
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

`Promtail`(또는 최근에는 통합 에이전트인 `Grafana Alloy`)이 서버·컨테이너에서 로그를 읽어 레이블을 붙여 Loki로 전송하면, Loki는 이를 압축된 청크로 만들어 S3 같은 객체 스토리지에 쌓아둡니다. 조회할 때는 레이블로 대상 청크를 좁힌 뒤 그것만 꺼내 읽습니다.

수집 에이전트 설정은 대략 이런 모습입니다.

```yaml
# promtail-config.yml
server:
  http_listen_port: 9080

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: system
    static_configs:
      - targets: [localhost]
        labels:
          job: varlogs
          service: checkout # 이 파일에서 나오는 로그는 전부 service="checkout" 레이블이 붙는다
          __path__: /var/log/checkout/*.log
```

`labels`에 적은 값들이 곧 이 로그 스트림을 식별하는 레이블이 됩니다. 레이블 종류를 너무 잘게 쪼개면(예: 요청마다 달라지는 user_id를 레이블로 넣는 등) 스트림 수가 폭발적으로 늘어나 오히려 성능이 나빠지므로, 레이블은 "서비스, 환경, 레벨"처럼 값의 종류가 제한적인 것 위주로 붙이는 게 원칙입니다.

### LogQL — Loki의 쿼리 언어

Grafana에서 Loki 데이터를 조회할 때 쓰는 언어로, PromQL과 사고방식이 비슷합니다.

```logql
# 1. 레이블 셀렉터 — service가 checkout인 스트림만
{service="checkout"}

# 2. 라인 필터 — 그 중 "timeout"이라는 단어가 포함된 줄만
{service="checkout"} |= "timeout"

# 3. 레벨까지 좁히고, 특정 단어는 제외
{service="checkout", level="error"} != "healthcheck"

# 4. JSON 로그를 파싱해서 필드로 필터링
{service="checkout"} | json | status_code >= 500

# 5. 집계 — 5분 단위로 에러 로그 발생 건수를 세서 그래프로
sum(count_over_time({service="checkout", level="error"}[5m]))
```

`{...}` 안의 레이블 셀렉터로 먼저 스트림을 좁히고, `|=`(포함)·`!=`(제외)·`|json`(파싱) 같은 파이프라인 연산자를 이어 붙여 점점 좁혀가는 방식입니다. 5번처럼 로그를 집계하면 메트릭처럼 그래프로 그릴 수도 있습니다 — "에러 로그가 갑자기 늘었다"는 사실 자체를 하나의 시계열 그래프로 확인할 수 있다는 뜻입니다.

---

## 7. 셋을 한꺼번에 띄워보기

말로만 보면 감이 잘 안 올 수 있어서, 로컬에서 Prometheus + Grafana + Loki + Promtail + node_exporter를 한번에 띄우는 최소 구성을 봅니다.

```yaml
# docker-compose.yml
services:
  node_exporter:
    image: prom/node-exporter
    ports: ["9100:9100"]

  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports: ["9090:9090"]

  loki:
    image: grafana/loki
    ports: ["3100:3100"]

  promtail:
    image: grafana/promtail
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml

  grafana:
    image: grafana/grafana
    ports: ["3000:3000"]
    depends_on: [prometheus, loki]
```

`docker compose up`으로 띄운 뒤 브라우저에서 `localhost:3000`(Grafana)에 접속해 데이터 소스로 `http://prometheus:9090`과 `http://loki:3100`을 등록하면, `node_exporter`가 노출하는 서버 CPU/메모리 그래프와 `/var/log`에 쌓이는 로그를 같은 화면에서 볼 수 있습니다. 실제 운영 환경에서는 여기에 인증, 영속 볼륨, 여러 대의 서버 구성이 추가되지만, "메트릭은 Prometheus로, 로그는 Loki로, 보는 건 Grafana로"라는 뼈대는 동일합니다.

---

## 8. 실전 흐름 — 메트릭에서 로그로, 로그에서 메트릭으로

셋을 같이 쓰는 실용적인 이유는 장애 대응 시 아래 흐름을 매끄럽게 오갈 수 있기 때문입니다.

```
1. Grafana 대시보드에서 에러율 그래프(Prometheus)가 튄 시점을 발견
2. 그 시간대를 그대로 선택해 Explore 화면에서 Loki로 전환
3. 같은 시간대, 같은 서비스 레이블로 로그를 조회
4. LogQL로 에러 메시지를 필터링해 원인 파악
```

메트릭이 "언제, 어디서 이상이 생겼는지"를 알려주고, 로그가 "정확히 무슨 일이 있었는지"를 알려주는 역할 분담이며, Grafana는 이 둘을 오가는 이동 비용을 줄여주는 도구입니다.

---

## 9. 최근 흐름 — LGTM 스택

Grafana Labs는 Loki(로그), Grafana(시각화)에 이어 Tempo(분산 트레이싱), Mimir(장기 보관이 가능한 Prometheus 호환 메트릭 저장소)까지 자체 생태계를 갖추고, 이 네 가지를 묶어 **LGTM 스택**(Loki, Grafana, Tempo, Mimir)이라고 부릅니다. 앞서 본 Prometheus의 로컬 TSDB는 보관 기간이나 단일 서버 용량에 한계가 있는데, Mimir는 이를 객체 스토리지 기반으로 수평 확장하고 장기 보관까지 가능하게 만든 프로젝트입니다. [OpenTelemetry](/post/backend/observability/opentelemetry)로 계측을 표준화하고 그 데이터를 LGTM 스택으로 받는 조합이 흔한 구성으로 자리잡고 있습니다.

또한 로그 수집 에이전트도 기존의 Promtail(로그 전용) 대신, 로그·메트릭·트레이스를 한 번에 수집할 수 있는 통합 에이전트 **Grafana Alloy**로 옮겨가는 추세입니다. 수집기 하나로 세 종류의 관측 데이터를 모두 처리해 운영 부담을 줄이려는 방향입니다.

---

## 정리

- 서버가 늘어나면 사람이 일일이 들여다볼 수 없으므로, 상태를 숫자(메트릭)와 텍스트(로그)로 한 곳에 모아 쌓아두는 시스템이 필요해졌다.
- 메트릭은 이름 + 레이블로 식별되는 시계열이며, Counter/Gauge/Histogram/Summary 네 가지 타입으로 나뉜다.
- Prometheus는 대상이 노출한 `/metrics`를 직접 찾아가 긁어오는(Pull) 방식으로 메트릭을 수집·저장하고, PromQL로 조회한다. 애플리케이션이 아닌 시스템은 Exporter가 대신 `/metrics`를 노출해준다.
- Grafana는 데이터를 저장하지 않고, Prometheus·Loki 등 여러 데이터 소스를 하나의 대시보드·알림 화면으로 모아 보여주는 시각화 계층이다.
- Loki는 로그 본문을 색인하지 않고 레이블로만 스트림을 식별해 Elasticsearch보다 훨씬 저렴하게 로그를 다루는 대신, 레이블 없는 풀텍스트 검색에는 약하다.
- 메트릭이 "언제 이상이 생겼는지"를, 로그가 "무슨 일이 있었는지"를 알려주는 역할 분담이며, 셋을 같이 쓰면 이 둘을 오가는 장애 대응 흐름이 매끄러워진다.
- Loki, Tempo, Mimir가 Grafana와 함께 LGTM 스택으로 묶이며, 로그·메트릭·트레이스를 한 생태계로 통합하는 흐름이 이어지고 있다.
