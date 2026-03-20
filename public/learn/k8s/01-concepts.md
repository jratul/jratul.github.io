---
title: "개념과 아키텍처"
order: 1
---

## 왜 Kubernetes인가

Docker만으로 운영 시 한계:
- 컨테이너가 죽으면 수동으로 재시작
- 트래픽 증가 시 수동 스케일링
- 여러 서버에 수동 배포
- 롤링 업데이트 직접 구현 필요

Kubernetes(K8s)는 이를 자동화하는 **컨테이너 오케스트레이션 플랫폼**입니다.

---

## 클러스터 구조

```
Kubernetes Cluster
├── Control Plane (마스터)
│   ├── API Server        ← 모든 요청의 진입점
│   ├── etcd              ← 클러스터 상태 저장 (분산 KV 스토어)
│   ├── Scheduler         ← Pod를 어느 노드에 배치할지 결정
│   └── Controller Manager ← 선언된 상태 유지 (Deployment, ReplicaSet 등)
│
└── Worker Node (1개 이상)
    ├── kubelet           ← API Server와 통신, 컨테이너 실행 관리
    ├── kube-proxy        ← 네트워크 규칙 관리 (Service → Pod 라우팅)
    └── Container Runtime ← containerd (실제 컨테이너 실행)
```

---

## 핵심 오브젝트

### Pod
- K8s의 **최소 배포 단위**
- 1개 이상의 컨테이너를 묶은 단위
- 같은 Pod 내 컨테이너는 localhost로 통신, 볼륨 공유
- Pod는 일회성 — 죽으면 새 Pod로 교체됨 (IP 변경)

### Deployment
- Pod의 **선언적 관리** 오브젝트
- "replicas: 3"을 선언하면 항상 3개 유지
- 롤링 업데이트 / 롤백 지원
- 내부적으로 ReplicaSet을 생성

### Service
- Pod에 **고정 IP + DNS 이름** 부여
- Pod가 교체돼도 Service 주소는 변하지 않음
- 로드 밸런싱 역할

### Ingress
- **HTTP/HTTPS 라우팅** (도메인/경로 기반)
- 외부 트래픽 → Service → Pod

### ConfigMap / Secret
- 설정값(ConfigMap), 민감정보(Secret)를 Pod와 분리하여 관리

### Namespace
- 클러스터 내 **논리적 격리** 단위
- dev, staging, production 등 환경 분리에 활용

---

## 선언적 모델 (Declarative)

K8s의 핵심 철학: **원하는 상태(Desired State)를 선언**하면 K8s가 현재 상태를 그쪽으로 맞춤

```yaml
# "nginx Pod를 3개 실행하고 싶다"고 선언
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 3          # 원하는 상태
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
```

Controller Manager가 현재 상태(2개)와 원하는 상태(3개)를 비교해 자동으로 1개 추가.

---

## 로컬 실습 환경

### minikube (추천)
```bash
# macOS
brew install minikube

# Windows (Chocolatey)
choco install minikube

# 클러스터 시작
minikube start

# 상태 확인
minikube status

# 대시보드
minikube dashboard
```

### kind (Kubernetes in Docker)
```bash
# 설치
go install sigs.k8s.io/kind@latest

# 클러스터 생성
kind create cluster --name dev

# 삭제
kind delete cluster --name dev
```

### kubectl 설치
```bash
# macOS
brew install kubectl

# Windows
choco install kubernetes-cli

# 버전 확인
kubectl version --client
```

---

## K8s 오브젝트 관계도

```
Internet
    ↓
[Ingress]          ← 도메인/경로 라우팅
    ↓
[Service]          ← 고정 엔드포인트, 로드 밸런싱
    ↓
[Pod] [Pod] [Pod]  ← 실제 컨테이너
    ↑
[Deployment]       ← Pod 수 유지, 업데이트 관리
    ↑
[ConfigMap/Secret] ← 설정/시크릿 주입
    ↑
[PersistentVolume] ← 영구 스토리지
```
