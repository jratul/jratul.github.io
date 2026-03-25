---
title: "kubectl 기본 명령어"
order: 2
---

## kubectl이란 무엇인가

kubectl(큐브컨트롤)은 쿠버네티스 클러스터와 대화하는 CLI 도구입니다. 마치 TV 리모컨처럼, 클러스터에게 "Pod를 3개 만들어", "이 앱을 재시작해", "로그를 보여줘" 같은 명령을 보냅니다.

쿠버네티스를 배울 때 가장 먼저 손에 익혀야 할 도구입니다. kubectl 없이는 클러스터에서 아무것도 할 수 없습니다.

```bash
# 기본 명령 구조
kubectl [명령어] [리소스타입] [이름] [옵션]

# 예시
kubectl get pods              # pods 목록 조회
kubectl describe pod myapp    # myapp pod 상세 정보
kubectl delete deployment myapp  # myapp deployment 삭제
```

---

## 클러스터 연결 확인

kubectl은 `~/.kube/config` 파일을 보고 어느 클러스터에 연결할지 결정합니다. 이 설정 파일에는 여러 클러스터 정보(컨텍스트)가 담겨 있습니다.

**비유:** 마치 주소록처럼, 여러 클러스터의 주소를 저장해 두고 필요할 때 선택해서 접속합니다.

```bash
# 현재 어느 클러스터에 연결됐는지 확인 (가장 먼저 확인할 것!)
kubectl config current-context
# 출력 예시: minikube  또는  my-prod-cluster

# 저장된 모든 클러스터 목록 보기
kubectl config get-contexts
# CURRENT   NAME            CLUSTER         AUTHINFO
# *         minikube        minikube        minikube
#           prod-cluster    prod-cluster    admin-user

# 다른 클러스터로 전환 (운영 클러스터 vs 개발 클러스터 전환)
kubectl config use-context minikube

# 클러스터 기본 정보 (API 서버 주소 등)
kubectl cluster-info

# 노드(서버) 목록 확인 — 클러스터가 몇 대의 서버로 구성됐는지
kubectl get nodes
kubectl get nodes -o wide   # IP, OS, 쿠버네티스 버전 등 상세 정보
```

> 초보자 실수: 운영 클러스터를 보고 있는 줄 모르고 개발 명령을 실행하는 경우가 있습니다. 명령 전에 항상 `kubectl config current-context`로 현재 컨텍스트를 확인하세요.

---

## 리소스 조회 (get)

get 명령은 리소스 목록이나 상태를 조회합니다. 가장 자주 사용하는 명령입니다.

```bash
# Pod 목록 조회 (기본 네임스페이스)
kubectl get pods
# NAME                    READY   STATUS    RESTARTS   AGE
# myapp-7d6b4f8c4f-xkj2p  1/1     Running   0          5m
# myapp-7d6b4f8c4f-pqr9s  1/1     Running   0          5m

# 특정 네임스페이스의 Pod 조회
kubectl get pods -n prod
kubectl get pods --namespace=prod   # 동일한 표현

# 모든 네임스페이스의 Pod 조회 (전체 현황 파악)
kubectl get pods -A
kubectl get pods --all-namespaces

# 노드 정보도 함께 보기 (-o wide)
kubectl get pods -o wide
# NAME                    READY   STATUS    NODE       IP
# myapp-7d6b4f8c4f-xkj2p  1/1     Running   worker-1   10.0.0.5

# 실시간으로 변화 감시 (-w, --watch)
# Ctrl+C로 종료
kubectl get pods -w

# 여러 리소스를 한 번에 조회
kubectl get pods,services,deployments

# 특정 레이블을 가진 Pod만 조회
kubectl get pods -l app=myapp
kubectl get pods -l env=prod,tier=backend   # 여러 레이블 조건

# 상세 정보 조회 (문제 발생 시 필수)
kubectl describe pod myapp-7d6b4f8c4f-xkj2p

# YAML 형식으로 출력 (설정 백업, 분석 시 유용)
kubectl get pod myapp-7d6b4f8c4f-xkj2p -o yaml

# JSON 형식으로 출력 + 특정 필드 추출
kubectl get pod myapp-7d6b4f8c4f-xkj2p -o jsonpath='{.status.podIP}'
```

---

## 리소스 생성, 수정, 삭제

```bash
# YAML 파일로 리소스 생성 또는 수정 (가장 권장하는 방법)
kubectl apply -f deployment.yaml

# 디렉토리의 모든 YAML 파일 한 번에 적용
kubectl apply -f ./k8s/
kubectl apply -f ./k8s/ --recursive   # 하위 디렉토리까지

# 빠른 테스트용 Pod 생성 (YAML 없이)
kubectl run nginx --image=nginx:alpine
kubectl run test-pod --image=busybox --rm -it -- /bin/sh  # 임시 대화형 Pod

# 실행 중인 리소스 직접 수정 (에디터 열림)
kubectl edit deployment myapp

# 이미지만 변경할 때 (CI/CD에서 자주 사용)
kubectl set image deployment/myapp app=ghcr.io/myorg/myapp:2.0.0

# 환경변수 설정
kubectl set env deployment/myapp LOG_LEVEL=DEBUG

# YAML 파일로 삭제
kubectl delete -f deployment.yaml

# 이름으로 직접 삭제
kubectl delete pod myapp-7d6b4f8c4f-xkj2p
kubectl delete deployment myapp
kubectl delete service myapp-svc

# 레이블로 관련 리소스 전체 삭제
kubectl delete all -l app=myapp

# 강제 삭제 (Pod가 Terminating 상태에서 멈췄을 때)
kubectl delete pod myapp-xxx --force --grace-period=0
```

> 초보자 실수: `kubectl create` 대신 `kubectl apply`를 사용하세요. `create`는 리소스가 이미 존재하면 에러가 나지만, `apply`는 없으면 생성하고 있으면 업데이트합니다.

---

## 로그와 디버깅

문제가 생겼을 때 가장 먼저 확인하는 명령들입니다.

```bash
# Pod 로그 보기 (가장 기본)
kubectl logs myapp-7d6b4f8c4f-xkj2p

# 실시간으로 로그 스트리밍 (tail -f와 비슷)
kubectl logs myapp-7d6b4f8c4f-xkj2p -f

# 최근 N줄만 보기
kubectl logs myapp-7d6b4f8c4f-xkj2p --tail=100

# 이전 컨테이너 로그 보기 (크래시 후 재시작됐을 때 원인 파악)
kubectl logs myapp-7d6b4f8c4f-xkj2p --previous

# 멀티 컨테이너 Pod에서 특정 컨테이너 로그
kubectl logs myapp-7d6b4f8c4f-xkj2p -c sidecar-container

# 레이블로 여러 Pod 로그 한 번에 보기
kubectl logs -l app=myapp -f --tail=50

# Pod 내부에 접속 (컨테이너 셸)
kubectl exec -it myapp-7d6b4f8c4f-xkj2p -- /bin/sh
kubectl exec -it myapp-7d6b4f8c4f-xkj2p -- bash
kubectl exec -it myapp-7d6b4f8c4f-xkj2p -- /bin/sh -c "env | grep SPRING"

# 파일 복사 (로컬 ↔ Pod)
kubectl cp myapp-7d6b4f8c4f-xkj2p:/app/logs/app.log ./app.log  # Pod → 로컬
kubectl cp ./config.yml myapp-7d6b4f8c4f-xkj2p:/app/config.yml # 로컬 → Pod

# 포트 포워딩 (클러스터 내부 서비스를 로컬에서 접근할 때)
# http://localhost:8080 으로 Pod의 8080 포트에 접근 가능
kubectl port-forward pod/myapp-7d6b4f8c4f-xkj2p 8080:8080
kubectl port-forward service/myapp-svc 8080:80
kubectl port-forward deployment/myapp 8080:8080
```

**실전 디버깅 시나리오:** Pod가 계속 재시작될 때
```bash
# 1. 현재 상태 확인
kubectl get pods -n prod

# 2. Pod 상세 정보 (Events 섹션에서 원인 파악)
kubectl describe pod myapp-xxx -n prod

# 3. 이전 컨테이너 로그 (크래시 직전 로그)
kubectl logs myapp-xxx -n prod --previous

# 4. 이벤트만 따로 보기 (타임스탬프 순 정렬)
kubectl get events -n prod --sort-by=.lastTimestamp
```

---

## 스케일링과 롤아웃 관리

```bash
# Pod 개수 조절 (스케일 업/다운)
kubectl scale deployment myapp --replicas=5
kubectl scale deployment myapp --replicas=1   # 스케일 다운

# 롤아웃(배포) 진행 상황 확인
kubectl rollout status deployment/myapp
# 출력 예시:
# Waiting for deployment "myapp" rollout to finish: 1 out of 3 new replicas have been updated...
# Waiting for deployment "myapp" rollout to finish: 2 out of 3 new replicas have been updated...
# deployment "myapp" successfully rolled out

# 배포 히스토리 조회 (롤백 포인트)
kubectl rollout history deployment/myapp
# REVISION  CHANGE-CAUSE
# 1         Initial deployment
# 2         Updated to v2.0.0

# 특정 리비전 상세 정보
kubectl rollout history deployment/myapp --revision=2

# 이전 버전으로 롤백 (장애 발생 시 즉시 실행)
kubectl rollout undo deployment/myapp

# 특정 버전으로 롤백
kubectl rollout undo deployment/myapp --to-revision=2

# 배포 일시 중지 (여러 변경을 한 번에 적용할 때)
kubectl rollout pause deployment/myapp
# 여러 설정 변경...
kubectl set image deployment/myapp app=myapp:2.0.0
kubectl set env deployment/myapp LOG_LEVEL=INFO
# 모든 변경을 한 번에 배포
kubectl rollout resume deployment/myapp
```

---

## 네임스페이스 관리

네임스페이스는 클러스터를 논리적으로 분리하는 공간입니다. 마치 파일 시스템의 디렉토리처럼, 개발(dev), 스테이징(staging), 운영(prod) 환경을 같은 클러스터에서 격리해서 운영합니다.

```bash
# 네임스페이스 목록 조회
kubectl get namespaces
# NAME              STATUS   AGE
# default           Active   10d
# kube-system       Active   10d
# prod              Active   5d
# dev               Active   5d

# 네임스페이스 생성
kubectl create namespace dev
kubectl create namespace staging
kubectl create namespace prod

# 현재 세션의 기본 네임스페이스 변경 (매번 -n prod 입력 안 해도 됨)
kubectl config set-context --current --namespace=prod

# 특정 네임스페이스에서 명령 실행
kubectl get pods -n dev
kubectl apply -f app.yaml -n dev
kubectl delete pod myapp-xxx -n dev
```

---

## 자주 쓰는 단축어와 유용한 명령

```bash
# 리소스 타입 단축어 (타이핑 줄이기)
kubectl get po       # pods
kubectl get svc      # services
kubectl get deploy   # deployments
kubectl get ing      # ingresses
kubectl get cm       # configmaps
kubectl get secret   # secrets
kubectl get pv       # persistentvolumes
kubectl get pvc      # persistentvolumeclaims
kubectl get ns       # namespaces
kubectl get ep       # endpoints
kubectl get hpa      # horizontalpodautoscalers

# 이벤트 조회 (트러블슈팅 필수 — 리소스에 무슨 일이 있었는지)
kubectl get events --sort-by=.lastTimestamp
kubectl get events -n prod --sort-by=.lastTimestamp

# 리소스 사용량 조회 (Metrics Server 필요)
kubectl top pods
kubectl top pods --sort-by=memory
kubectl top pods --sort-by=cpu
kubectl top nodes

# 리소스 API 레퍼런스 (모르는 필드가 있을 때)
kubectl explain deployment
kubectl explain deployment.spec.strategy
kubectl explain pod.spec.containers.resources

# 모든 리소스 타입 목록
kubectl api-resources

# 특정 리소스의 API 버전
kubectl api-versions
```

---

## kubectl 자동완성 설정

명령어, 리소스 이름, 옵션을 Tab 키로 자동완성할 수 있습니다. 설정하면 생산성이 크게 올라갑니다.

```bash
# bash 자동완성 설정
echo 'source <(kubectl completion bash)' >> ~/.bashrc
# k 단축어 설정 (kubectl 대신 k만 입력)
echo 'alias k=kubectl' >> ~/.bashrc
echo 'complete -F __start_kubectl k' >> ~/.bashrc
source ~/.bashrc

# zsh 자동완성 설정
echo 'source <(kubectl completion zsh)' >> ~/.zshrc
echo 'alias k=kubectl' >> ~/.zshrc
source ~/.zshrc

# 사용 예시 (설정 후)
k get po   # = kubectl get pods
k get po -n pro<Tab>  # = -n prod 자동완성
```

---

## 자주 하는 실수와 해결법

**실수 1: STATUS가 CrashLoopBackOff**
```bash
# 원인 파악
kubectl logs myapp-xxx --previous    # 이전 실행 로그
kubectl describe pod myapp-xxx       # Events 확인
```

**실수 2: STATUS가 Pending (스케줄링 안 됨)**
```bash
kubectl describe pod myapp-xxx
# Events에서 "Insufficient memory" 또는 "No nodes available" 확인
```

**실수 3: ImagePullBackOff (이미지를 못 받음)**
```bash
kubectl describe pod myapp-xxx
# Events에서 이미지 이름이나 레지스트리 인증 확인
```

**실수 4: 운영 클러스터에서 실수로 삭제**
```bash
# 먼저 컨텍스트 확인을 습관화
kubectl config current-context
# 삭제 전 dry-run으로 확인
kubectl delete deployment myapp --dry-run=client
```
