---
title: "Kubernetes 면접 예상 질문"
order: 18
---

# Kubernetes 면접 예상 질문

Kubernetes(K8s, 컨테이너 오케스트레이션 플랫폼) 운영/개발 면접에서 빈출되는 핵심 질문들입니다.

## Q1. Kubernetes의 주요 컴포넌트를 설명해주세요

**컨트롤 플레인 (Control Plane, 클러스터 전체를 관리하는 두뇌 역할):**
```
[ API Server ]    — 모든 통신의 중심, REST API 제공
[ etcd ]          — 클러스터 상태 저장 (분산 키-값 스토어)
[ Scheduler ]     — Pod를 어느 노드에 배치할지 결정
[ Controller Manager ] — 원하는 상태 유지 (ReplicaSet, Node 등)
```

**워커 노드 (Worker Node, 실제 컨테이너가 실행되는 서버):**
```
[ kubelet ]       — API Server와 통신, 컨테이너 실행 관리
[ kube-proxy ]    — 네트워크 규칙 관리, 서비스 프록시
[ Container Runtime ] — 컨테이너 실행 (containerd, CRI-O)
```

---

## Q2. Pod, Deployment, Service의 관계를 설명해주세요

```
Service (네트워크 진입점)
  └── Deployment (Pod 배포/관리 전략)
        └── ReplicaSet (Pod 개수 유지)
              └── Pod (실제 컨테이너 실행 단위)
                    └── Container (앱 컨테이너)
```

- **Pod:** 하나 이상의 컨테이너를 묶은 최소 배포 단위
- **Deployment:** 원하는 상태(replicas, 이미지) 선언 → 롤링 업데이트 관리
- **Service:** Pod에 안정적인 네트워크 엔드포인트 제공 (Pod IP는 변경됨)

```yaml
# Deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp

# Service — labelSelector로 Pod 찾아 트래픽 전달
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
```

---

## Q3. 롤링 업데이트와 블루-그린 배포의 차이는?

**롤링 업데이트 (Kubernetes 기본):**
```
v1 v1 v1 v1
v2 v1 v1 v1   (순차적으로 교체)
v2 v2 v1 v1
v2 v2 v2 v2
```
✅ 다운타임 없음, 리소스 효율적
❌ 업데이트 중 두 버전이 공존 (API 호환성 주의)

**블루-그린 배포 (두 환경을 동시에 유지하다가 순간 전환하는 방식):**
```
Blue(v1) - 현재 운영
Green(v2) - 준비 완료
→ Service selector를 Blue에서 Green으로 전환
```
✅ 즉각 전환 및 롤백 가능
❌ 리소스 2배 필요

---

## Q4. ConfigMap과 Secret의 차이는?

```yaml
# ConfigMap — 비민감한 설정
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_PORT: "8080"
  LOG_LEVEL: "info"

# Secret — 민감한 데이터 (base64 인코딩)
apiVersion: v1
kind: Secret
type: Opaque
data:
  DB_PASSWORD: c2VjcmV0  # base64("secret")
```

**Pod에서 사용:**
```yaml
envFrom:
  - configMapRef:
      name: app-config
  - secretRef:
      name: db-secret
```

⚠️ Secret은 기본적으로 base64 인코딩(바이너리 데이터를 텍스트로 변환하는 방식)만 됩니다 (암호화 아님). 프로덕션에서는 RBAC (Role-Based Access Control, 역할 기반 접근 제어) + 암호화(etcd), 또는 Vault/External Secrets 사용을 권장합니다.

---

## Q5. HPA(Horizontal Pod Autoscaler, 수평 Pod 자동 확장기)는 어떻게 동작하나요?

메트릭을 기반으로 **Pod 개수를 자동으로 조절**합니다.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  scaleTargetRef:
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70  # CPU 70% 초과 시 스케일아웃
```

**동작 흐름:**
```
Metrics Server → CPU 사용률 측정
HPA Controller → 주기적으로 메트릭 확인
→ 목표 replicas = ceil(현재 replicas × 현재 메트릭 / 목표 메트릭)
→ Deployment replicas 수정
```

---

## Q6. Liveness Probe와 Readiness Probe의 차이는?

```yaml
livenessProbe:   # 컨테이너가 살아있는지 — 실패 시 재시작
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:  # 트래픽 받을 준비가 됐는지 — 실패 시 Service에서 제외
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

| Probe | 실패 시 동작 | 목적 |
|-------|-----------|------|
| **Liveness** | 컨테이너 재시작 | 데드락(교착 상태), 메모리 누수 감지 |
| **Readiness** | Service에서 제거 | 초기화 완료 전 트래픽 차단 |
| **Startup** | 앱 시작 완료까지 Liveness 비활성화 | 느린 앱 시작 허용 |

---

## Q7. Kubernetes 네트워킹은 어떻게 동작하나요?

**기본 원칙:**
- 모든 Pod는 NAT(Network Address Translation, 네트워크 주소 변환) 없이 다른 Pod에 접근 가능
- 모든 Node는 모든 Pod에 접근 가능

**Service 타입:**
| 타입 | 설명 |
|-----|------|
| ClusterIP (기본) | 클러스터 내부 통신용 가상 IP |
| NodePort | 각 노드의 특정 포트로 외부 노출 |
| LoadBalancer | 클라우드 LB 생성 (AWS ALB 등) |
| ExternalName | 외부 DNS를 내부 서비스로 매핑 |

**Ingress:** L7 로드밸런서(애플리케이션 계층에서 HTTP/HTTPS 기반으로 트래픽을 분산하는 장치), 도메인/경로 기반 라우팅

```yaml
rules:
  - host: api.example.com
    http:
      paths:
        - path: /users
          backend:
            service: { name: user-service, port: { number: 80 } }
```

---

## Q8. RBAC(Role-Based Access Control, 역할 기반 접근 제어)을 설명해주세요

```yaml
# Role — 특정 네임스페이스에서의 권한
kind: Role
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]

# RoleBinding — Role을 ServiceAccount에 연결
kind: RoleBinding
subjects:
  - kind: ServiceAccount
    name: my-app
roleRef:
  kind: Role
  name: pod-reader
```

**핵심 개념:**
- **Role/ClusterRole:** 권한 정의 (무엇을 할 수 있는지)
- **RoleBinding/ClusterRoleBinding:** 권한을 누가 가질지 연결
- **ServiceAccount:** Pod의 K8s API 접근 계정 (기본은 `default`)

최소 권한 원칙 — 애플리케이션에 필요한 최소한의 권한만 부여합니다.
