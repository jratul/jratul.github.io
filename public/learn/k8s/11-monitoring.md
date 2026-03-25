---
title: "모니터링 (Prometheus, Grafana)"
order: 11
---

## 모니터링이 왜 필요한가

앱을 쿠버네티스에 배포하면 "지금 앱이 잘 돌아가고 있나?", "서버가 힘들어하고 있나?", "에러가 몇 번 났나?"를 알아야 합니다. 모니터링 없이는 문제가 생겨도 사용자 불만이 들어올 때까지 모릅니다.

**비유:**
- Prometheus는 건강 검진 기계입니다. 주기적으로 앱의 상태(CPU, 메모리, 에러율, 응답시간)를 측정합니다.
- Grafana는 건강 검진 결과지를 시각화하는 대시보드입니다. 그래프로 보여줍니다.
- AlertManager는 이상 수치가 나오면 슬랙이나 문자로 알림을 보내는 당직 의사입니다.

```
앱 (Spring Boot Actuator)
    ↓ /actuator/prometheus (메트릭 노출)
Prometheus ← 15초마다 수집 (pull 방식)
    ↓ 쿼리/알림
Grafana     ← 시각화 대시보드
    ↓ 알림 규칙 위반 시
AlertManager ← Slack, Email, PagerDuty로 알림
```

---

## kube-prometheus-stack 설치

Prometheus + Grafana + AlertManager + 각종 Exporter를 한 번에 설치하는 패키지입니다.

```bash
# Helm 저장소 추가
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# 설치 (기본 설정)
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.adminPassword=admin123 \
  --set prometheus.prometheusSpec.retention=15d \      # 메트릭 15일 보존
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName=standard \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi

# 설치 확인
kubectl get pods -n monitoring
# NAME                                                   READY   STATUS
# monitoring-grafana-xxxx                                3/3     Running
# monitoring-kube-prometheus-operator-xxxx               1/1     Running
# monitoring-prometheus-0                                2/2     Running
# monitoring-alertmanager-0                              2/2     Running
# monitoring-kube-state-metrics-xxxx                     1/1     Running
# monitoring-prometheus-node-exporter-xxxx               1/1     Running  ← 각 노드마다
```

### 주요 컴포넌트 설명

| 컴포넌트 | 역할 |
|---------|------|
| prometheus-server | 메트릭 수집 및 시계열 DB에 저장 |
| grafana | 시각화 대시보드 |
| alertmanager | 알림 규칙 평가 및 라우팅 |
| kube-state-metrics | K8s 오브젝트 상태 메트릭 (Pod 수, Deployment 상태 등) |
| node-exporter | 노드 시스템 메트릭 (CPU, 메모리, 디스크, 네트워크) |
| prometheus-operator | ServiceMonitor, PrometheusRule 등 CRD 관리 |

---

## Grafana 접속과 기본 대시보드

```bash
# 포트 포워딩으로 로컬에서 접속
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80

# 브라우저에서 http://localhost:3000
# ID: admin / PW: admin123 (설치 시 설정한 값)

# 또는 Ingress로 외부 접근 설정
```

**기본 제공 대시보드:**
- `Kubernetes / Compute Resources / Namespace` — 네임스페이스별 CPU/메모리
- `Kubernetes / Compute Resources / Pod` — Pod별 리소스 사용량
- `Kubernetes / Networking / Namespace` — 네트워크 트래픽
- `Node Exporter / Nodes` — 노드 시스템 메트릭
- `Kubernetes / Persistent Volumes` — 스토리지 사용량

---

## Spring Boot 메트릭 수집 설정

### 의존성 추가

```gradle
// build.gradle
implementation 'org.springframework.boot:spring-boot-starter-actuator'
implementation 'io.micrometer:micrometer-registry-prometheus'
```

### application.yml 설정

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus,metrics  # 노출할 엔드포인트
      base-path: /actuator
  endpoint:
    health:
      show-details: when_authorized
      probes:
        enabled: true    # liveness, readiness 엔드포인트 활성화
    prometheus:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}   # 메트릭에 앱 이름 태그 추가
      environment: ${spring.profiles.active}    # 환경 태그 추가
    distribution:
      percentiles-histogram:
        http.server.requests: true              # HTTP 요청 히스토그램 활성화
      percentiles:
        http.server.requests: 0.5, 0.95, 0.99  # 50th, 95th, 99th 백분위수

spring:
  application:
    name: myapp   # 메트릭 태그로 사용됨
```

```bash
# 메트릭 엔드포인트 확인 (Pod 내부에서 또는 포트포워딩 후)
kubectl port-forward deployment/myapp 8080:8080 -n prod
curl http://localhost:8080/actuator/prometheus
# # HELP http_server_requests_seconds_count ...
# # TYPE http_server_requests_seconds_count counter
# http_server_requests_seconds_count{...} 1234
```

---

## ServiceMonitor — 자동 메트릭 수집

Prometheus가 어떤 Service를 스크레이핑할지 알려주는 설정입니다.

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: myapp-monitor
  namespace: prod
  labels:
    release: monitoring        # kube-prometheus-stack의 레이블 selector와 일치해야 함
spec:
  selector:
    matchLabels:
      app: myapp               # 이 레이블을 가진 Service를 모니터링
  namespaceSelector:
    matchNames:
    - prod
  endpoints:
  - port: http                 # Service의 포트 이름 (숫자 아님)
    path: /actuator/prometheus # 메트릭 수집 경로
    interval: 15s              # 수집 주기
    scrapeTimeout: 10s
```

```yaml
# Service에 포트 이름 추가 (ServiceMonitor가 이름으로 참조)
apiVersion: v1
kind: Service
metadata:
  name: myapp-svc
  namespace: prod
  labels:
    app: myapp                 # ServiceMonitor selector와 일치
spec:
  selector:
    app: myapp
  ports:
  - name: http                 # 포트 이름 지정 (숫자만 있으면 ServiceMonitor 동작 안 함)
    port: 80
    targetPort: 8080
```

---

## 커스텀 메트릭 — 비즈니스 메트릭

HTTP 응답시간 외에 주문 수, 대기 중인 작업 수 등 비즈니스 메트릭도 추가할 수 있습니다.

```java
// OrderMetrics.java — 주문 관련 커스텀 메트릭
@Component
public class OrderMetrics {

    private final Counter orderCreatedCounter;     // 누적 주문 수
    private final Counter orderFailedCounter;      // 실패한 주문 수
    private final Timer orderProcessingTimer;      // 주문 처리 시간
    private final AtomicInteger pendingOrders;     // 현재 대기 중인 주문 수

    public OrderMetrics(MeterRegistry registry, OrderRepository orderRepository) {
        // Counter: 증가만 하는 카운터 (주문 생성 수, 에러 수 등)
        orderCreatedCounter = Counter.builder("orders.created.total")
            .description("Total number of orders created")
            .tag("type", "all")
            .register(registry);

        orderFailedCounter = Counter.builder("orders.failed.total")
            .description("Total number of failed orders")
            .register(registry);

        // Timer: 실행 시간 측정 (히스토그램으로 p50, p95, p99 계산 가능)
        orderProcessingTimer = Timer.builder("order.processing.duration")
            .description("Order processing time in seconds")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);

        // Gauge: 현재 값 (줄어들 수도 있음 — 대기 중인 주문 수, 캐시 사이즈 등)
        pendingOrders = new AtomicInteger(0);
        Gauge.builder("orders.pending", pendingOrders, AtomicInteger::get)
            .description("Number of pending orders")
            .register(registry);
    }

    public void recordOrderCreated() {
        orderCreatedCounter.increment();
        pendingOrders.incrementAndGet();
    }

    public void recordOrderCompleted(long durationMs) {
        orderProcessingTimer.record(durationMs, TimeUnit.MILLISECONDS);
        pendingOrders.decrementAndGet();
    }

    public void recordOrderFailed() {
        orderFailedCounter.increment();
        pendingOrders.decrementAndGet();
    }
}
```

---

## AlertManager — 알림 설정

```yaml
# values.yaml에 AlertManager 설정 추가
alertmanager:
  config:
    global:
      slack_api_url: 'https://hooks.slack.com/services/T00/B00/XXX'
      resolve_timeout: 5m

    route:
      group_by: ['alertname', 'namespace', 'pod']
      group_wait: 30s           # 알림 그룹화 대기 시간
      group_interval: 5m        # 그룹 알림 반복 간격
      repeat_interval: 4h       # 동일 알림 반복 간격
      receiver: 'slack-ops'
      routes:
      - match:
          severity: critical    # critical은 PagerDuty로
        receiver: 'pagerduty'
      - match:
          severity: warning     # warning은 Slack으로
        receiver: 'slack-ops'

    receivers:
    - name: 'slack-ops'
      slack_configs:
      - channel: '#k8s-alerts'
        title: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}'
        text: |
          *환경*: {{ .GroupLabels.namespace }}
          {{ range .Alerts }}
          *내용*: {{ .Annotations.description }}
          *시작*: {{ .StartsAt.Format "2006-01-02 15:04:05" }}
          {{ end }}

    - name: 'pagerduty'
      pagerduty_configs:
      - routing_key: 'your-pagerduty-key'
```

### PrometheusRule — 알림 규칙

```yaml
# prometheusrule.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: myapp-alerts
  namespace: prod
  labels:
    release: monitoring        # kube-prometheus-stack과 연동
spec:
  groups:
  - name: myapp
    interval: 30s
    rules:
    # HTTP 에러율 5% 초과 시 알림
    - alert: HighErrorRate
      expr: |
        rate(http_server_requests_seconds_count{
          job="myapp",
          status=~"5.."
        }[5m])
        /
        rate(http_server_requests_seconds_count{job="myapp"}[5m])
        > 0.05
      for: 5m                  # 5분 이상 지속될 때만 알림
      labels:
        severity: critical
      annotations:
        summary: "{{ $labels.instance }}에서 HTTP 에러율 높음"
        description: "에러율: {{ $value | humanizePercentage }}"

    # Pod가 크래시루프 상태일 때
    - alert: PodCrashLooping
      expr: rate(kube_pod_container_status_restarts_total[15m]) * 60 * 15 > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Pod {{ $labels.pod }} 재시작 반복"
        description: "네임스페이스: {{ $labels.namespace }}"

    # 메모리 사용률 85% 초과 시
    - alert: HighMemoryUsage
      expr: |
        container_memory_working_set_bytes{container="app", namespace="prod"}
        /
        container_spec_memory_limit_bytes{container="app", namespace="prod"}
        > 0.85
      for: 10m
      labels:
        severity: warning
      annotations:
        description: "{{ $labels.pod }} 메모리 사용률: {{ $value | humanizePercentage }}"

    # Pod 수가 최솟값 미달 시
    - alert: DeploymentReplicasMismatch
      expr: |
        kube_deployment_status_replicas_available{namespace="prod"}
        < kube_deployment_spec_replicas{namespace="prod"}
      for: 5m
      labels:
        severity: critical
      annotations:
        description: "{{ $labels.deployment }} 가용 Pod 수 부족"
```

---

## Loki — 로그 수집

Prometheus가 메트릭을 수집한다면, Loki는 로그를 수집하고 Grafana에서 조회할 수 있게 합니다.

```bash
# Loki + Promtail 설치 (기존 Grafana에 추가)
helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring \
  --set promtail.enabled=true \
  --set grafana.enabled=false   # 이미 설치한 Grafana 사용

# 설치 확인 (각 노드에 Promtail Pod가 실행됨)
kubectl get pods -n monitoring
```

Grafana에서 Loki 데이터소스 추가 후 LogQL로 쿼리:

```logql
# prod 네임스페이스 myapp의 ERROR 로그
{namespace="prod", app="myapp"} |= "ERROR"

# 특정 요청 ID 추적
{namespace="prod"} |= "request-id: abc123"

# 응답 시간 1초 초과 요청 (JSON 파싱)
{namespace="prod", app="myapp"} | json | duration > 1s

# 최근 5분간 에러 발생 빈도
rate({namespace="prod"} |= "ERROR" [5m])
```

---

## 유용한 PromQL 쿼리

Grafana 패널이나 Alert 규칙 작성 시 사용하는 쿼리입니다.

```promql
# Pod CPU 사용률 (%)
rate(container_cpu_usage_seconds_total{namespace="prod", container!=""}[5m]) * 100

# Pod 메모리 사용량 (MiB)
container_memory_working_set_bytes{namespace="prod", container!=""} / 1024 / 1024

# HTTP 요청 처리율 (초당 요청 수)
rate(http_server_requests_seconds_count{job="myapp"}[1m])

# HTTP 응답 시간 99th percentile
histogram_quantile(0.99,
  rate(http_server_requests_seconds_bucket{job="myapp"}[5m])
)

# HTTP 에러율
rate(http_server_requests_seconds_count{job="myapp", status=~"5.."}[5m])
/
rate(http_server_requests_seconds_count{job="myapp"}[5m])

# Pod 재시작 횟수
kube_pod_container_status_restarts_total{namespace="prod"}

# Deployment 가용 Pod 수 vs 원하는 Pod 수
kube_deployment_status_replicas_available{namespace="prod"}
kube_deployment_spec_replicas{namespace="prod"}

# 노드 CPU 사용률
1 - avg by (node) (rate(node_cpu_seconds_total{mode="idle"}[5m]))
```
