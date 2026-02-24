---
title: "Kubernetes 기본 개념"
date: "2026-02-24"
tags: ["kubernetes", "devops", "container", "orchestration"]
excerpt: "Kubernetes의 핵심 개념과 주요 오브젝트를 정리합니다."
---

# Kubernetes 기본 개념

Kubernetes(K8s)는 컨테이너 오케스트레이션 플랫폼입니다. 여러 서버에 걸쳐 컨테이너를 배포, 확장, 관리하는 작업을 자동화합니다.

```
컨테이너를 직접 관리하면:
- 어떤 서버에 올릴지 직접 결정
- 서버 죽으면 수동 복구
- 트래픽 몰리면 수동으로 컨테이너 추가

Kubernetes를 쓰면:
- 빈 서버에 자동 배치
- Pod 죽으면 자동 재시작
- CPU/메모리 기준으로 자동 스케일링
```

---

## 아키텍처

Kubernetes 클러스터는 **Control Plane**과 **Node**로 구성됩니다.

```
Kubernetes 클러스터
├── Control Plane (마스터)
│   ├── API Server      - 모든 요청의 진입점
│   ├── etcd            - 클러스터 상태 저장소 (key-value DB)
│   ├── Scheduler       - Pod를 어느 Node에 배치할지 결정
│   └── Controller Manager - 현재 상태 → 원하는 상태로 유지
│
└── Node (워커)
    ├── kubelet         - API Server와 통신, Pod 실행 관리
    ├── kube-proxy      - 네트워크 규칙 관리
    └── Container Runtime (Docker, containerd 등)
```

### Control Plane

클러스터를 제어하는 두뇌 역할입니다.

- **API Server**: `kubectl` 명령이나 다른 컴포넌트가 통신하는 REST API 서버
- **etcd**: 클러스터의 모든 상태(어떤 Pod가 어디서 실행 중인지 등)를 저장
- **Scheduler**: 새 Pod를 어떤 Node에 배치할지 결정 (리소스, 제약 조건 고려)
- **Controller Manager**: 선언된 상태와 실제 상태를 비교하고 차이를 맞춤

### Node

실제로 컨테이너가 실행되는 서버입니다.

---

## 핵심 오브젝트

### Pod

Kubernetes에서 배포의 최소 단위입니다. 1개 이상의 컨테이너를 담고, 같은 Pod 안의 컨테이너는 네트워크와 스토리지를 공유합니다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: app
      image: my-app:1.0
      ports:
        - containerPort: 3000
```

Pod는 직접 생성하지 않는 게 일반적입니다. Pod가 죽으면 재시작되지 않기 때문에 Deployment를 통해 관리합니다.

---

### Deployment

Pod를 선언적으로 관리합니다. "이 Pod를 3개 유지해라"고 선언하면, Pod가 죽어도 자동으로 다시 생성합니다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3          # Pod 3개 유지
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:1.0
          ports:
            - containerPort: 3000
```

```bash
# Deployment 생성
kubectl apply -f deployment.yaml

# 상태 확인
kubectl get deployments
kubectl get pods

# 이미지 업데이트 (롤링 업데이트)
kubectl set image deployment/my-app app=my-app:2.0

# 롤백
kubectl rollout undo deployment/my-app
```

---

### Service

Pod는 IP가 바뀌기 때문에 직접 접근하면 안 됩니다. Service는 Pod 집합에 고정된 접근 지점을 제공합니다.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-service
spec:
  selector:
    app: my-app      # 이 라벨을 가진 Pod로 트래픽 전달
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP    # 클러스터 내부 접근용
```

Service 타입:

| 타입 | 설명 |
|------|------|
| `ClusterIP` | 클러스터 내부에서만 접근 가능 (기본값) |
| `NodePort` | 각 Node의 특정 포트로 외부 접근 가능 |
| `LoadBalancer` | 클라우드 로드밸런서 프로비저닝 (AWS, GCP 등) |

---

### Ingress

외부 HTTP/HTTPS 트래픽을 클러스터 내부 Service로 라우팅합니다. 도메인 기반 라우팅이나 경로 기반 라우팅을 설정합니다.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /users
            pathType: Prefix
            backend:
              service:
                name: user-service
                port:
                  number: 80
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  number: 80
```

---

### ConfigMap / Secret

설정값과 민감한 데이터를 컨테이너 이미지와 분리합니다.

```yaml
# ConfigMap - 일반 설정값
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_HOST: "postgres-service"
  LOG_LEVEL: "info"

---

# Secret - 민감한 데이터 (base64 인코딩)
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
data:
  DATABASE_PASSWORD: cGFzc3dvcmQ=   # "password"의 base64
```

Pod에서 환경변수로 주입:

```yaml
spec:
  containers:
    - name: app
      image: my-app:1.0
      env:
        - name: DATABASE_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DATABASE_HOST
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: DATABASE_PASSWORD
```

---

### Namespace

클러스터 내에서 리소스를 논리적으로 분리하는 가상 클러스터입니다.

```bash
# Namespace 생성
kubectl create namespace production
kubectl create namespace staging

# 특정 Namespace에 배포
kubectl apply -f deployment.yaml -n production

# Namespace별 Pod 조회
kubectl get pods -n production
kubectl get pods --all-namespaces
```

---

## 주요 kubectl 명령어

```bash
# 리소스 조회
kubectl get pods
kubectl get pods -o wide        # Node 정보 포함
kubectl get all                 # 모든 리소스

# 상세 정보
kubectl describe pod my-pod
kubectl describe deployment my-app

# 로그
kubectl logs my-pod
kubectl logs my-pod -f          # 실시간 스트리밍
kubectl logs my-pod -c app      # 특정 컨테이너

# Pod 접속
kubectl exec -it my-pod -- /bin/sh

# 리소스 삭제
kubectl delete pod my-pod
kubectl delete -f deployment.yaml

# 스케일링
kubectl scale deployment my-app --replicas=5

# 포트 포워딩 (로컬 테스트용)
kubectl port-forward pod/my-pod 8080:3000
```

---

## 선언적 관리 vs 명령적 관리

Kubernetes는 **선언적(Declarative)** 방식을 권장합니다.

```bash
# 명령적 방식 (뭘 할지 직접 지시)
kubectl create deployment my-app --image=my-app:1.0
kubectl scale deployment my-app --replicas=3

# 선언적 방식 (원하는 상태를 파일로 정의)
kubectl apply -f deployment.yaml
```

선언적 방식의 장점:
- YAML 파일을 Git으로 버전 관리 가능
- `kubectl apply`로 생성/수정 모두 처리
- 클러스터 상태를 코드로 재현 가능 (GitOps)

---

## HPA (Horizontal Pod Autoscaler)

CPU/메모리 사용량에 따라 Pod 수를 자동으로 조절합니다.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70   # CPU 70% 초과 시 스케일 업
```

---

## 오브젝트 관계 요약

```
외부 트래픽
    │
    ▼
 Ingress (도메인/경로 라우팅)
    │
    ▼
 Service (고정 엔드포인트, 로드밸런싱)
    │
    ▼
 Pod × N (실제 컨테이너)
    │
    ▲
 Deployment (Pod 수 유지, 롤링 업데이트)
```

ConfigMap/Secret은 Pod에 설정값을 주입하고, Namespace는 이 모든 리소스를 논리적으로 구분합니다.
