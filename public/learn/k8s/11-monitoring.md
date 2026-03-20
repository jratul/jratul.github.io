---
title: "모니터링 (Prometheus, Grafana)"
order: 11
---

## 모니터링 스택 개요

```
앱 (Spring Boot Actuator)
    ↓ /actuator/prometheus
Prometheus ← 메트릭 수집 (pull 방식)
    ↓
Grafana     ← 시각화 대시보드
    ↓
AlertManager ← 알림 (Slack, PagerDuty 등)
```

---

## kube-prometheus-stack 설치

Prometheus + Grafana + AlertManager + 각종 Exporter를 한 번에 설치.

```bash
# Helm 저장소 추가
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# 설치
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.adminPassword=admin123 \
  --set prometheus.prometheusSpec.retention=15d

# 설치 확인
kubectl get pods -n monitoring
```

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| prometheus-server | 메트릭 수집 및 저장 |
| grafana | 대시보드 |
| alertmanager | 알림 라우팅 |
| kube-state-metrics | K8s 오브젝트 상태 메트릭 |
| node-exporter | 노드 리소스 메트릭 |

---

## Grafana 접속

```bash
# 포트 포워딩
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80

# 브라우저에서 http://localhost:3000
# ID: admin / PW: admin123
```

기본 제공 대시보드:
- **K8s / Compute Resources / Namespace** — 네임스페이스별 CPU/메모리
- **K8s / Compute Resources / Pod** — Pod별 리소스
- **Node Exporter / Nodes** — 노드 시스템 메트릭

---

## Spring Boot 메트릭 수집

### 의존성

```gradle
implementation 'org.springframework.boot:spring-boot-starter-actuator'
implementation 'io.micrometer:micrometer-registry-prometheus'
```

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  endpoint:
    prometheus:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}
      environment: ${spring.profiles.active}
```

### ServiceMonitor (Prometheus가 자동 스크레이핑)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: myapp-monitor
  namespace: prod
  labels:
    release: monitoring     # kube-prometheus-stack의 레이블과 매칭
spec:
  selector:
    matchLabels:
      app: myapp
  endpoints:
  - port: http              # Service의 포트 이름
    path: /actuator/prometheus
    interval: 15s
  namespaceSelector:
    matchNames:
    - prod
```

```yaml
# Service에 포트 이름 지정
apiVersion: v1
kind: Service
metadata:
  name: myapp-svc
  labels:
    app: myapp
spec:
  selector:
    app: myapp
  ports:
  - name: http              # 포트 이름 지정
    port: 80
    targetPort: 8080
```

---

## 커스텀 메트릭

```java
// Spring Boot에서 커스텀 메트릭 등록
@Component
public class OrderMetrics {

    private final Counter orderCounter;
    private final Timer orderProcessingTimer;
    private final Gauge pendingOrders;

    public OrderMetrics(MeterRegistry registry, OrderRepository orderRepository) {
        orderCounter = Counter.builder("orders.created.total")
            .description("Total orders created")
            .tag("status", "success")
            .register(registry);

        orderProcessingTimer = Timer.builder("order.processing.duration")
            .description("Order processing time")
            .register(registry);

        Gauge.builder("orders.pending", orderRepository, repo -> repo.countByStatus("PENDING"))
            .description("Pending orders count")
            .register(registry);
    }

    public void recordOrder() {
        orderCounter.increment();
    }

    public <T> T timeOrder(Supplier<T> supplier) {
        return orderProcessingTimer.recordCallable(supplier::get);
    }
}
```

---

## AlertManager 알림 설정

```yaml
# values.yaml (kube-prometheus-stack)
alertmanager:
  config:
    global:
      slack_api_url: 'https://hooks.slack.com/services/xxx'

    route:
      group_by: ['alertname', 'namespace']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      receiver: 'slack-prod'
      routes:
      - match:
          severity: critical
        receiver: 'pagerduty'

    receivers:
    - name: 'slack-prod'
      slack_configs:
      - channel: '#alerts-prod'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

    - name: 'pagerduty'
      pagerduty_configs:
      - routing_key: 'xxx'
```

### PrometheusRule (알림 규칙)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: myapp-alerts
  namespace: prod
  labels:
    release: monitoring
spec:
  groups:
  - name: myapp
    interval: 30s
    rules:
    - alert: HighErrorRate
      expr: |
        rate(http_server_requests_seconds_count{status=~"5.."}[5m])
        / rate(http_server_requests_seconds_count[5m]) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate on {{ $labels.instance }}"
        description: "Error rate is {{ $value | humanizePercentage }}"

    - alert: PodCrashLooping
      expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Pod {{ $labels.pod }} is crash looping"

    - alert: HighMemoryUsage
      expr: |
        container_memory_usage_bytes{container="app"}
        / container_spec_memory_limit_bytes{container="app"} > 0.85
      for: 10m
      labels:
        severity: warning
      annotations:
        description: "Memory usage > 85% on {{ $labels.pod }}"
```

---

## Loki (로그 수집)

```bash
# Loki + Promtail 설치
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set promtail.enabled=true \
  --set grafana.enabled=false   # 기존 grafana 사용
```

Grafana에서 Loki 데이터소스 추가 후 로그 쿼리:

```logql
# myapp의 ERROR 로그
{namespace="prod", app="myapp"} |= "ERROR"

# 응답 시간 > 1초인 요청
{app="myapp"} | json | duration > 1s
```

---

## 유용한 PromQL 쿼리

```promql
# Pod CPU 사용률
rate(container_cpu_usage_seconds_total{namespace="prod"}[5m]) * 100

# Pod 메모리 사용량
container_memory_working_set_bytes{namespace="prod"}

# HTTP 요청 처리율 (Spring Boot)
rate(http_server_requests_seconds_count{job="myapp"}[1m])

# 99th percentile 응답 시간
histogram_quantile(0.99, rate(http_server_requests_seconds_bucket[5m]))

# Pod 재시작 횟수
kube_pod_container_status_restarts_total{namespace="prod"}
```
