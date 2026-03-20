---
title: "Service Mesh (Istio)"
order: 16
---

## Service Mesh란

마이크로서비스 간 통신을 **인프라 레벨에서** 제어하는 레이어.

```
기존 방식: 앱 코드에 Retry, Circuit Breaker, mTLS 직접 구현
Service Mesh: Sidecar Proxy(Envoy)가 모든 트래픽을 대신 처리
```

### Sidecar 패턴

```
Pod
├── app container
└── envoy proxy (자동 주입)
      ↕ 모든 in/out 트래픽 처리
      - mTLS 암호화
      - 트래픽 제어 (라우팅, 재시도, 타임아웃)
      - 관찰 가능성 (메트릭, 트레이싱, 로그)
```

---

## Istio 설치

```bash
# istioctl 설치
curl -L https://istio.io/downloadIstio | sh -
export PATH=$PWD/istio-*/bin:$PATH

# 설치 (demo 프로파일 — 학습용)
istioctl install --set profile=demo -y

# 설치 확인
kubectl get pods -n istio-system

# 네임스페이스에 sidecar 자동 주입 활성화
kubectl label namespace prod istio-injection=enabled
```

---

## Traffic Management

### VirtualService (트래픽 라우팅)

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: myapp
  namespace: prod
spec:
  hosts:
  - myapp-svc
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: myapp-svc
        subset: v2            # 카나리: x-canary 헤더 있으면 v2로
  - route:
    - destination:
        host: myapp-svc
        subset: v1            # 나머지는 v1
      weight: 90
    - destination:
        host: myapp-svc
        subset: v2
      weight: 10              # 가중치 기반 트래픽 분할 (90/10)
```

### DestinationRule (서브셋 정의)

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: myapp
  namespace: prod
spec:
  host: myapp-svc
  trafficPolicy:
    connectionPool:
      http:
        http2MaxRequests: 1000
        h2UpgradePolicy: UPGRADE
    outlierDetection:             # Circuit Breaker
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

---

## 재시도와 타임아웃

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
  - myapp-svc
  http:
  - timeout: 10s              # 전체 요청 타임아웃
    retries:
      attempts: 3
      perTryTimeout: 3s
      retryOn: 5xx,connect-failure,reset
    route:
    - destination:
        host: myapp-svc
```

---

## mTLS (상호 TLS)

서비스 간 통신을 자동으로 암호화. 인증서 관리는 Istio가 담당.

```yaml
# 네임스페이스 전체 strict mTLS 적용
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: prod
spec:
  mtls:
    mode: STRICT    # DISABLE / PERMISSIVE / STRICT
```

```yaml
# 특정 서비스만
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: myapp-mtls
  namespace: prod
spec:
  selector:
    matchLabels:
      app: myapp
  mtls:
    mode: STRICT
```

---

## 인가 정책

```yaml
# myapp → postgres 접근만 허용
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: postgres-authz
  namespace: prod
spec:
  selector:
    matchLabels:
      app: postgres
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/prod/sa/myapp-sa"   # myapp ServiceAccount만 허용
    to:
    - operation:
        ports: ["5432"]
```

---

## 관찰 가능성

### Kiali (서비스 토폴로지 시각화)

```bash
# Kiali 설치
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml

# 접속
kubectl port-forward svc/kiali -n istio-system 20001:20001
# http://localhost:20001
```

Kiali에서 확인 가능:
- 서비스 간 트래픽 흐름
- 에러율, 응답 시간
- mTLS 상태
- 트래픽 가중치 설정

### Jaeger (분산 트레이싱)

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
kubectl port-forward svc/tracing -n istio-system 16686:80
```

Spring Boot에서 트레이스 ID 전파:
```yaml
# application.yml
management:
  tracing:
    sampling:
      probability: 1.0    # 100% 샘플링 (프로덕션에서는 0.1)
```

---

## 카나리 배포 예시

```bash
# v1: 100%, v2: 0%
# 점진적으로 v2 비율 증가

# v1 90%, v2 10%
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: myapp
  namespace: prod
spec:
  hosts:
  - myapp-svc
  http:
  - route:
    - destination:
        host: myapp-svc
        subset: v1
      weight: 90
    - destination:
        host: myapp-svc
        subset: v2
      weight: 10
EOF

# 메트릭 모니터링 후 문제없으면 v1 0%, v2 100%로 변경
```

---

## Istio vs 코드 레벨 구현

| 기능 | Istio | Resilience4j (코드) |
|------|-------|---------------------|
| Circuit Breaker | DestinationRule | @CircuitBreaker |
| Retry | VirtualService | @Retry |
| Timeout | VirtualService | @TimeLimiter |
| mTLS | PeerAuthentication | 직접 구현 |
| 트래픽 분할 | VirtualService | 없음 |
| 트레이싱 | 자동 | 설정 필요 |
| 언어 독립성 | 모든 언어 | JVM만 |

소규모 단일 팀: Resilience4j 코드 레벨로 충분.
대규모 멀티 팀 폴리글랏 환경: Istio가 효과적.
