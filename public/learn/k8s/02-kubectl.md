---
title: "kubectl 기본 명령어"
order: 2
---

## kubectl이란

K8s 클러스터를 제어하는 CLI 도구. 모든 K8s 작업의 시작점.

```bash
# 기본 구조
kubectl [command] [TYPE] [NAME] [flags]

# 예시
kubectl get pods
kubectl describe pod myapp-xxx
kubectl delete deployment myapp
```

---

## 클러스터 정보

```bash
# 현재 컨텍스트 확인 (어느 클러스터에 연결됐는지)
kubectl config current-context

# 컨텍스트 목록
kubectl config get-contexts

# 컨텍스트 전환
kubectl config use-context minikube

# 클러스터 정보
kubectl cluster-info

# 노드 목록
kubectl get nodes
kubectl get nodes -o wide   # IP, OS 등 상세 정보
```

---

## 오브젝트 조회

```bash
# Pod 목록
kubectl get pods
kubectl get pods -n kube-system   # 특정 네임스페이스
kubectl get pods -A               # 전체 네임스페이스
kubectl get pods -o wide          # 노드 배치 정보 포함
kubectl get pods -w               # 실시간 watch

# 여러 리소스 한 번에
kubectl get pods,services,deployments

# 상세 정보
kubectl describe pod myapp-7d6b4f8-xxx
kubectl describe node worker-1

# YAML 출력
kubectl get pod myapp-7d6b4f8-xxx -o yaml

# 레이블로 필터링
kubectl get pods -l app=myapp
kubectl get pods -l env=prod,tier=backend
```

---

## 오브젝트 생성 / 수정 / 삭제

```bash
# 파일로 생성
kubectl apply -f deployment.yaml
kubectl apply -f ./k8s/              # 디렉토리 전체 적용

# 즉시 생성 (테스트용)
kubectl run nginx --image=nginx:alpine

# 수정
kubectl edit deployment myapp        # 에디터 열림
kubectl set image deployment/myapp app=myapp:2.0.0  # 이미지 변경

# 삭제
kubectl delete -f deployment.yaml
kubectl delete pod myapp-xxx
kubectl delete deployment myapp
kubectl delete all -l app=myapp      # 레이블로 전체 삭제
```

---

## 로그 및 디버깅

```bash
# 로그
kubectl logs myapp-xxx
kubectl logs myapp-xxx -f            # 실시간 스트리밍
kubectl logs myapp-xxx --previous    # 이전 컨테이너 로그 (크래시 후)
kubectl logs myapp-xxx -c sidecar    # 특정 컨테이너 (멀티 컨테이너 Pod)

# 컨테이너 접속
kubectl exec -it myapp-xxx -- /bin/sh
kubectl exec -it myapp-xxx -- bash

# 파일 복사
kubectl cp myapp-xxx:/app/logs/app.log ./app.log
kubectl cp ./config.yml myapp-xxx:/app/config.yml

# 포트 포워딩 (로컬 테스트)
kubectl port-forward pod/myapp-xxx 8080:8080
kubectl port-forward service/myapp-svc 8080:80
kubectl port-forward deployment/myapp 8080:8080
```

---

## 스케일링 및 롤아웃

```bash
# 스케일 조정
kubectl scale deployment myapp --replicas=5

# 롤아웃 상태 확인
kubectl rollout status deployment/myapp

# 롤아웃 히스토리
kubectl rollout history deployment/myapp
kubectl rollout history deployment/myapp --revision=2

# 롤백
kubectl rollout undo deployment/myapp
kubectl rollout undo deployment/myapp --to-revision=2

# 롤아웃 일시 중지 / 재개
kubectl rollout pause deployment/myapp
kubectl rollout resume deployment/myapp
```

---

## 네임스페이스

```bash
# 네임스페이스 목록
kubectl get namespaces

# 네임스페이스 생성
kubectl create namespace dev
kubectl create namespace staging

# 기본 네임스페이스 변경
kubectl config set-context --current --namespace=dev

# 네임스페이스 지정
kubectl get pods -n dev
kubectl apply -f app.yaml -n dev
```

---

## 유용한 단축 명령어

```bash
# 리소스 타입 단축어
kubectl get po      # pods
kubectl get svc     # services
kubectl get deploy  # deployments
kubectl get ing     # ingresses
kubectl get cm      # configmaps
kubectl get secret  # secrets
kubectl get pv      # persistentvolumes
kubectl get pvc     # persistentvolumeclaims
kubectl get ns      # namespaces

# 이벤트 확인 (트러블슈팅 필수)
kubectl get events --sort-by=.lastTimestamp
kubectl get events -n dev

# 리소스 사용량
kubectl top pods
kubectl top nodes

# 오브젝트 API 레퍼런스
kubectl explain deployment
kubectl explain deployment.spec.strategy
```

---

## kubectl 자동완성 설정

```bash
# bash
echo 'source <(kubectl completion bash)' >> ~/.bashrc
echo 'alias k=kubectl' >> ~/.bashrc
echo 'complete -F __start_kubectl k' >> ~/.bashrc

# zsh
echo 'source <(kubectl completion zsh)' >> ~/.zshrc
echo 'alias k=kubectl' >> ~/.zshrc
```
