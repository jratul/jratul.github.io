---
title: "개념과 아키텍처"
order: 1
---

## Kubernetes가 왜 필요한가

웹 서비스를 만들었다고 상상해봅시다. 처음에는 서버 한 대에 도커(Docker)로 앱을 실행했습니다.

그런데 시간이 지나면서 이런 일들이 생깁니다.

- 밤새 앱이 죽었는데 아무도 모르고 있었다
- 갑자기 사용자가 몰려서 서버가 느려졌다
- 새 버전을 배포하는 동안 서비스가 잠깐 멈췄다
- 서버가 여러 대로 늘었는데, 각 서버에 일일이 배포해야 한다

**Kubernetes(K8s)** 는 이런 문제를 자동으로 해결해주는 도구입니다.

> 비유: Kubernetes는 "컨테이너 관리 자동화 시스템"입니다. 마치 식당 매니저처럼 "주방(서버)에 요리사(앱)가 3명 있어야 한다"고 선언하면, 한 명이 아프면 자동으로 새 요리사를 채용하고, 손님이 많으면 더 뽑는 식으로 동작합니다.

### Docker만으로는 부족한 이유

```
Docker로만 운영할 때 겪는 문제:

1. 앱이 죽으면 수동으로 재시작해야 함
   docker run -d myapp  ← 매번 직접 입력

2. 트래픽이 늘면 수동으로 서버 추가
   서버A: docker run myapp
   서버B: docker run myapp  ← 일일이 반복

3. 새 버전 배포 시 잠깐 다운타임 발생
   docker stop myapp-old
   docker run myapp-new  ← 이 사이에 서비스 중단!

4. 서버 10대에 배포하려면? 10번 반복...
```

Kubernetes는 이 모든 것을 **자동으로** 처리합니다.

---

## Kubernetes 클러스터 구조

**클러스터(Cluster)** 란 여러 서버(컴퓨터)를 하나처럼 묶어서 사용하는 단위입니다.

> 비유: 클러스터는 "회사"와 같습니다. 회사에는 경영진(Control Plane)과 실제 일하는 직원들(Worker Node)이 있습니다.

```
Kubernetes Cluster (회사 전체)
│
├── Control Plane (경영진 — 두뇌 역할)
│   ├── API Server        ← 모든 요청의 접수창구. "이렇게 해줘"를 받아들임
│   ├── etcd              ← 회사 장부. 클러스터의 모든 상태를 기록하는 DB
│   ├── Scheduler         ← 인사담당자. 어느 직원(노드)에게 일을 줄지 결정
│   └── Controller Manager ← 감독관. "직원 3명 있어야 해"라는 규칙을 항상 지킴
│
└── Worker Node (직원들 — 실제 일하는 서버)
    ├── kubelet           ← 각 직원의 개인 비서. 경영진 지시를 받아 실행
    ├── kube-proxy        ← 회사 안내데스크. 외부 연락을 올바른 담당자에게 연결
    └── Container Runtime ← 실제 업무 실행 도구 (containerd). 컨테이너를 실제로 실행
```

### kubectl이란?

`kubectl`은 K8s 클러스터에 명령을 내리는 CLI 도구입니다. API Server와 통신합니다.

```bash
# kubectl이 없으면 클러스터를 제어할 수 없습니다
# 마치 회사 경영진에게 지시를 전달하는 전화기 같은 역할

kubectl get pods        # 현재 실행 중인 앱 목록 조회
kubectl apply -f app.yaml  # 설정 파일대로 앱 배포
```

---

## 핵심 오브젝트 — K8s가 다루는 것들

K8s에서 관리하는 모든 것을 **오브젝트(Object)** 라고 부릅니다. 마치 회사에 직원, 팀, 부서가 있는 것처럼요.

### Pod (팟)

**Pod는 K8s의 가장 작은 실행 단위**입니다.

> 비유: Pod는 "사무실 책상"입니다. 한 책상에 1명 또는 여러 명이 앉아서 함께 일할 수 있습니다.

```
Pod
├── 컨테이너 1 (주 앱)
└── 컨테이너 2 (보조 앱, 선택사항)

특징:
- 같은 Pod 안 컨테이너들은 localhost로 서로 통신
- 같은 Pod 안 컨테이너들은 파일(볼륨)을 공유
- Pod가 죽으면 새 Pod로 교체됨 (IP 주소가 바뀜!)
```

Pod는 일회성입니다. 죽으면 새로 만들어지고, IP도 바뀝니다. 그래서 Pod에 직접 접속하면 안 되고, Service를 통해야 합니다.

### Deployment (디플로이먼트)

**Pod를 선언적으로 관리하는 오브젝트**입니다.

> 비유: Deployment는 "채용 공고"입니다. "이런 능력을 가진 직원 3명 채용"이라고 선언하면, 부족하면 채용하고 많으면 해고합니다.

```yaml
# "nginx 앱을 3개 실행하라"고 선언
replicas: 3  # 항상 3개 유지

# 1개가 죽으면? → 자동으로 1개 새로 생성
# 2개가 죽으면? → 자동으로 2개 새로 생성
```

롤링 업데이트(무중단 배포)와 롤백도 지원합니다.

### Service (서비스)

**Pod에 고정된 주소(IP + DNS)를 부여**합니다.

> 비유: Service는 "회사 대표전화번호"입니다. 담당자(Pod)가 바뀌어도 번호는 같습니다.

```
문제: Pod A가 죽으면 → 새 Pod B가 생성 → IP가 바뀜
     다른 앱이 A의 IP를 알고 있었다면? → 연결 끊김!

해결: Service (고정 DNS: myapp-svc)
     myapp-svc는 항상 동일 → 뒤에서 Pod가 바뀌어도 OK
```

### Ingress (인그레스)

**외부 트래픽을 내부 Service로 연결하는 라우터**입니다.

> 비유: Ingress는 "건물 안내데스크"입니다. "인사부 찾으시면 3층, 개발부 찾으시면 5층"처럼 도메인/경로에 따라 다른 서비스로 안내합니다.

```
외부 사용자 → api.example.com/users → User Service
              api.example.com/orders → Order Service
              admin.example.com → Admin Service
```

### ConfigMap / Secret

**설정값과 비밀정보를 앱과 분리해서 관리**합니다.

> 비유: ConfigMap은 "회사 규정집", Secret은 "금고"입니다. 앱 코드(직원)는 규정집과 금고에서 필요한 정보를 가져옵니다.

```
이점: 앱 이미지는 그대로 두고 설정만 바꿀 수 있음
     개발환경/운영환경 설정을 따로 관리
```

### Namespace (네임스페이스)

**클러스터 안에서 논리적으로 환경을 구분**합니다.

> 비유: Namespace는 "회사 부서"입니다. 개발팀, 영업팀처럼 분리해서 관리합니다.

```bash
# 흔히 이렇게 사용
namespace: dev      # 개발 환경
namespace: staging  # 테스트 환경
namespace: prod     # 운영 환경
```

---

## K8s의 핵심 철학 — 선언적 모델

K8s의 가장 중요한 개념은 **"선언적(Declarative) 방식"**입니다.

### 명령적 방식 vs 선언적 방식

```
명령적 방식 (How): "1번 서버에 로그인해서, docker run 명령을 실행하고, ..."
→ 직접 단계별로 지시

선언적 방식 (What): "nginx Pod 3개가 있어야 한다"
→ 원하는 상태(Desired State)만 선언
→ K8s가 알아서 그 상태를 만들고 유지
```

```yaml
# "이런 상태가 되어야 한다"고 선언
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 3          # 원하는 상태: nginx 3개
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
        ports:
        - containerPort: 80
```

이 파일을 적용하면:

```
현재 상태: nginx Pod 0개
원하는 상태: nginx Pod 3개
→ Controller Manager가 차이를 감지
→ 자동으로 Pod 3개 생성

나중에 Pod 1개가 죽으면:
현재 상태: nginx Pod 2개
원하는 상태: nginx Pod 3개
→ 자동으로 Pod 1개 추가 생성
```

---

## 오브젝트들의 관계도

```
인터넷 사용자
    ↓
[Ingress]           ← 도메인/경로에 따라 라우팅 (안내데스크)
    ↓
[Service]           ← 고정 주소, 로드밸런싱 (대표전화)
    ↓
[Pod] [Pod] [Pod]   ← 실제 앱이 실행되는 곳
    ↑
[Deployment]        ← Pod 수 유지, 업데이트 관리 (채용공고)
    ↑
[ConfigMap]         ← 설정값 (규정집)
[Secret]            ← 비밀정보 (금고)
    ↑
[PersistentVolume]  ← 영구 저장소 (하드디스크)
```

---

## 로컬 실습 환경 만들기

실제 클라우드 없이도 내 컴퓨터에서 K8s를 실습할 수 있습니다.

### minikube 설치 (가장 쉬운 방법)

minikube는 로컬 컴퓨터에 미니 K8s 클러스터를 만들어줍니다.

```bash
# macOS (Homebrew 사용)
brew install minikube

# Windows (Chocolatey 사용)
choco install minikube

# 클러스터 시작 (처음 실행 시 수 분 소요)
minikube start

# 클러스터 상태 확인
minikube status
# minikube: Running
# cluster: Running
# kubectl: Correctly Configured

# 웹 대시보드 열기 (브라우저에서 시각적으로 확인)
minikube dashboard

# 클러스터 중지
minikube stop

# 클러스터 삭제
minikube delete
```

### kind 설치 (Docker 기반)

kind(Kubernetes in Docker)는 Docker 컨테이너 안에 K8s 노드를 만듭니다.

```bash
# macOS/Linux
go install sigs.k8s.io/kind@latest
# 또는
brew install kind

# 클러스터 생성
kind create cluster --name my-cluster

# 클러스터 목록 확인
kind get clusters

# 클러스터 삭제
kind delete cluster --name my-cluster
```

### kubectl 설치

kubectl은 K8s 클러스터를 제어하는 명령줄 도구입니다.

```bash
# macOS
brew install kubectl

# Windows
choco install kubernetes-cli

# 설치 확인
kubectl version --client
# Client Version: v1.29.0

# 현재 연결된 클러스터 확인
kubectl cluster-info
# Kubernetes control plane is running at https://127.0.0.1:52634
```

---

## 첫 번째 앱 배포해보기

개념 설명이 어렵게 느껴진다면, 직접 해보는 것이 가장 빠릅니다.

```bash
# 1. minikube 클러스터 시작
minikube start

# 2. nginx 웹서버 배포 (가장 간단한 방법)
kubectl create deployment nginx --image=nginx:alpine

# 3. 배포 확인
kubectl get deployments
# NAME    READY   UP-TO-DATE   AVAILABLE
# nginx   1/1     1            1

# 4. Pod 확인
kubectl get pods
# NAME                     READY   STATUS    RESTARTS
# nginx-7854ff8877-xk5rd   1/1     Running   0

# 5. 외부에서 접근할 수 있게 Service 생성
kubectl expose deployment nginx --port=80 --type=NodePort

# 6. 브라우저에서 열기
minikube service nginx

# 7. 정리
kubectl delete deployment nginx
kubectl delete service nginx
```

이 몇 줄로 웹서버 배포, 외부 접근, 삭제까지 할 수 있습니다.
