---
title: "Service Mesh (Istio)"
order: 16
---

## Service Mesh란 무엇인가

마이크로서비스 아키텍처에서는 수십~수백 개의 서비스가 서로 통신합니다. 각 서비스에 재시도, 타임아웃, 암호화, 인증 로직을 개별적으로 구현하면 코드 중복이 많아지고 언어마다 다르게 구현해야 합니다.

Service Mesh는 이 문제를 인프라 레벨에서 해결합니다. 각 Pod 옆에 Sidecar Proxy(Envoy)를 붙여서 모든 네트워크 트래픽을 대신 처리하게 합니다.

도로 교통에 비유하면 이렇습니다. 기존 방식은 각 운전자(서비스)가 직접 내비게이션, 블랙박스, 통행료 결제를 처리합니다. Service Mesh는 도로 시스템(인프라) 자체에서 신호등, CCTV, 하이패스를 제공하는 것과 같습니다.

```
기존 방식: 앱 코드에 직접 구현
           ┌─────────────────────────┐
           │ Spring Boot App         │
           │  - Resilience4j (재시도) │
           │  - 타임아웃 설정         │
           │  - mTLS 인증서 관리     │
           └─────────────────────────┘

Service Mesh (Istio):
           ┌────────────────────────────────────┐
           │ Pod                                │
           │  ┌──────────────┐  ┌────────────┐ │
           │  │ App Container│←→│Envoy Proxy │ │
           │  │ (비즈니스 로직)│  │(네트워크 처리)│ │
           │  └──────────────┘  └────────────┘ │
           └────────────────────────────────────┘
           Envoy가 담당: mTLS, 재시도, 타임아웃, 트레이싱
```

### Sidecar 패턴의 핵심

```
Pod
├── app container       ← 비즈니스 로직만 담당
└── envoy proxy         ← 모든 in/out 트래픽을 자동으로 가로챔
      ↓ 처리하는 것들
      - mTLS 암호화      서비스 간 통신을 자동으로 암호화
      - 트래픽 라우팅    버전별, 헤더별 트래픽 분기
      - 재시도/타임아웃  앱 코드 없이 네트워크 수준에서 처리
      - 메트릭 수집      모든 요청/응답 정보 자동 기록
      - 분산 트레이싱    요청이 어디서 얼마나 걸렸는지 추적
```

---

## Istio 설치하기

```bash
# 1. istioctl 설치 (CLI 도구)
curl -L https://istio.io/downloadIstio | sh -
export PATH=$PWD/istio-*/bin:$PATH

# 2. Istio 설치 (demo 프로파일: 학습용, 리소스 최소화)
# 프로파일 종류: minimal, demo, default, production
istioctl install --set profile=demo -y

# 3. 설치 확인
kubectl get pods -n istio-system
# NAME                                   READY   STATUS    RESTARTS
# istiod-xxx                             1/1     Running   0   ← 컨트롤 플레인
# istio-ingressgateway-xxx               1/1     Running   0   ← 외부 트래픽 진입
# istio-egressgateway-xxx                1/1     Running   0   ← 외부 트래픽 출구

# 4. 특정 네임스페이스에 Sidecar 자동 주입 활성화
# 이 레이블을 붙이면 해당 네임스페이스의 모든 Pod에 Envoy가 자동으로 추가됨
kubectl label namespace prod istio-injection=enabled

# 5. 기존 Pod 재시작 (레이블 붙이기 전에 있던 Pod는 수동 재시작 필요)
kubectl rollout restart deployment -n prod
```

---

## 트래픽 관리 — VirtualService와 DestinationRule

### VirtualService — "트래픽을 어디로 보낼까?"

VirtualService는 트래픽 라우팅 규칙을 정의합니다. 특정 헤더, URL, 가중치 등을 기준으로 트래픽을 분기할 수 있습니다.

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: myapp
  namespace: prod
spec:
  hosts:
  - myapp-svc                    # 이 서비스로 오는 트래픽에 규칙 적용
  http:
  # 규칙 1: x-canary 헤더가 있으면 v2로
  - match:
    - headers:
        x-canary:
          exact: "true"          # 헤더 값이 정확히 "true"일 때
    route:
    - destination:
        host: myapp-svc
        subset: v2               # DestinationRule에서 정의한 v2 Pod들로
  # 규칙 2: 나머지는 90% v1, 10% v2
  - route:
    - destination:
        host: myapp-svc
        subset: v1
      weight: 90                 # 90% 트래픽
    - destination:
        host: myapp-svc
        subset: v2
      weight: 10                 # 10% 트래픽 (카나리 배포)
```

### DestinationRule — "각 서브셋이 어떤 Pod인가?"

DestinationRule은 서비스의 Pod를 version 레이블로 그룹화(subset)하고, 커넥션 풀, Circuit Breaker 등을 설정합니다.

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
        http2MaxRequests: 1000       # 최대 동시 요청 수
        h2UpgradePolicy: UPGRADE     # HTTP/2로 업그레이드
    outlierDetection:                # Circuit Breaker 설정
      consecutive5xxErrors: 5        # 5xx 에러가 5번 연속 발생하면
      interval: 30s                  # 30초 평가 기간
      baseEjectionTime: 30s          # 30초 동안 트래픽 차단
      maxEjectionPercent: 50         # 전체 Pod의 최대 50%만 차단 (서비스 유지)
  subsets:
  - name: v1
    labels:
      version: v1                    # version=v1 레이블의 Pod
  - name: v2
    labels:
      version: v2                    # version=v2 레이블의 Pod
```

Pod에 레이블 추가 방법:
```yaml
# Deployment spec.template.metadata.labels에 추가
labels:
  app: myapp
  version: v1                        # 이 레이블로 subset 구분
```

---

## 재시도와 타임아웃 — 앱 코드 없이 설정

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
  - myapp-svc
  http:
  - timeout: 10s                 # 전체 요청 타임아웃: 10초 초과 시 504 반환
    retries:
      attempts: 3                # 최대 3회 재시도
      perTryTimeout: 3s          # 각 시도의 타임아웃 3초 (3회 × 3초 = 최대 9초)
      retryOn: 5xx,connect-failure,reset  # 재시도 조건: 5xx 오류, 연결 실패, 연결 재설정
    route:
    - destination:
        host: myapp-svc
```

Resilience4j를 쓰지 않아도 이 설정 하나로 재시도/타임아웃이 동작합니다.

---

## mTLS — 서비스 간 통신 자동 암호화

mTLS(Mutual TLS)는 클라이언트와 서버 양쪽이 모두 인증서를 검증하는 방식입니다. Istio가 인증서 발급/갱신을 자동으로 처리합니다.

```yaml
# 네임스페이스 전체에 strict mTLS 적용
# STRICT: TLS 없는 요청 모두 거부
# PERMISSIVE: TLS와 평문 모두 허용 (마이그레이션 기간 사용)
# DISABLE: mTLS 비활성화
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: prod                # 이 네임스페이스의 모든 서비스에 적용
spec:
  mtls:
    mode: STRICT
```

```yaml
# 특정 서비스만 mTLS 적용 (세밀한 제어)
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: myapp-mtls
  namespace: prod
spec:
  selector:
    matchLabels:
      app: myapp                 # myapp Pod들에만 적용
  mtls:
    mode: STRICT
```

---

## 인가 정책 — 누가 누구에게 접근할 수 있나

```yaml
# myapp ServiceAccount를 가진 Pod만 postgres에 접근 허용
# 이 설정이 없으면 모든 Pod가 postgres에 접근 가능 (보안 취약)
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: postgres-authz
  namespace: prod
spec:
  selector:
    matchLabels:
      app: postgres              # postgres Pod에 이 정책 적용
  rules:
  - from:
    - source:
        principals:
        # myapp ServiceAccount만 허용
        - "cluster.local/ns/prod/sa/myapp-sa"
    to:
    - operation:
        ports: ["5432"]          # 5432 포트 접근만 허용
```

mTLS + AuthorizationPolicy를 함께 사용하면 Zero Trust 보안 모델을 구현할 수 있습니다. "네트워크 안에 있다고 신뢰하지 않고, 항상 인증 후 최소 권한만 부여"하는 원칙입니다.

---

## 관찰 가능성 — 무슨 일이 일어나고 있는지 보기

### Kiali — 서비스 토폴로지 시각화

```bash
# Kiali 설치 (Istio 샘플 애드온)
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml

# 접속
kubectl port-forward svc/kiali -n istio-system 20001:20001
# http://localhost:20001
```

Kiali UI에서 볼 수 있는 것들:
- 서비스 간 트래픽 흐름을 실시간 그래프로 시각화
- 각 서비스의 에러율, 응답 시간, 처리량
- mTLS 연결 상태 (잠금 아이콘으로 표시)
- VirtualService 트래픽 가중치 조정 UI

### Jaeger — 분산 트레이싱

요청이 여러 마이크로서비스를 거칠 때 각 단계에서 얼마나 시간이 걸렸는지 추적합니다.

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
kubectl port-forward svc/tracing -n istio-system 16686:80
# http://localhost:16686
```

Spring Boot에서 트레이스 ID 헤더를 전파해야 트레이싱이 끊기지 않습니다:

```yaml
# application.yml
management:
  tracing:
    sampling:
      probability: 1.0           # 100% 샘플링 (개발/테스트용)
                                 # 운영에서는 0.01 ~ 0.1 권장 (성능 영향)
```

---

## 카나리 배포 실전 — 점진적 트래픽 전환

새 버전을 안전하게 배포하는 카나리 배포 절차입니다.

```bash
# 1단계: v2 Deployment 배포 (트래픽은 아직 v1 100%)
kubectl apply -f deployment-v2.yaml

# 2단계: 10% 트래픽을 v2로 전환
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
      weight: 90                 # v1: 90%
    - destination:
        host: myapp-svc
        subset: v2
      weight: 10                 # v2: 10%
EOF

# 3단계: Kiali와 Prometheus에서 v2 에러율, 응답 시간 확인
# 문제 없으면 50%로 증가, 이상 없으면 100%로 전환

# 4단계: v2 100% 전환
# weight: v1=0, v2=100 으로 변경 후 apply
```

---

## Istio vs 코드 레벨 구현 — 언제 무엇을 쓸까

| 기능 | Istio | Resilience4j (코드) |
|------|-------|---------------------|
| Circuit Breaker | DestinationRule | @CircuitBreaker |
| Retry | VirtualService | @Retry |
| Timeout | VirtualService | @TimeLimiter |
| mTLS | PeerAuthentication | 직접 구현 (복잡) |
| 트래픽 분할 | VirtualService weight | 불가 |
| 분산 트레이싱 | Envoy 자동 | Micrometer 설정 필요 |
| 언어 독립성 | 모든 언어 지원 | JVM 언어만 |
| 운영 복잡성 | 높음 (Istio 학습 필요) | 낮음 |

**판단 기준:**
- 단일 팀, 모두 Java/Kotlin: Resilience4j로 충분합니다.
- 여러 팀, 여러 언어(Java + Go + Python 등): Istio가 효과적입니다.
- Istio는 강력하지만 복잡도가 높아 처음에는 오버엔지니어링이 될 수 있습니다.

---

## 흔한 실수들

```
실수 1: mTLS STRICT 상태에서 레거시 서비스 연결 실패
→ 처음에는 PERMISSIVE로 시작, 모든 서비스 마이그레이션 후 STRICT 전환
→ 마이그레이션 기간 동안 PERMISSIVE로 평문/TLS 모두 허용

실수 2: Sidecar 주입 없이 VirtualService 적용
→ 네임스페이스에 istio-injection=enabled 레이블 확인
→ 기존 Pod는 재시작해야 Sidecar 주입됨

실수 3: subset 레이블 없는 Pod에 트래픽 라우팅
→ VirtualService에서 subset을 지정했는데 해당 레이블 Pod가 없으면 503
→ Deployment에 version 레이블 반드시 추가

실수 4: 프로덕션에서 100% 샘플링 트레이싱
→ Jaeger 샘플링 1.0 = 모든 요청 트레이싱 = 성능 저하
→ 운영에서는 0.01 (1%) 정도로 설정

실수 5: 리소스 요청 없이 Istio 사용
→ Envoy Sidecar도 CPU/메모리를 사용함
→ Pod resources 설정 시 Sidecar 오버헤드를 감안하여 여유 있게 설정
```
