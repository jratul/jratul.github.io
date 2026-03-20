---
title: "GitOps와 ArgoCD"
order: 15
---

## GitOps란

**Git 저장소를 클러스터의 단일 진실 공급원(Single Source of Truth)으로 사용**하는 배포 방식.

```
기존 방식 (Push):
CI → kubectl apply → Cluster

GitOps 방식 (Pull):
Git 저장소 (매니페스트)
    ↑ 개발자가 PR 머지
    ↓ ArgoCD가 감지 후 자동 동기화
Kubernetes Cluster
```

### 장점
- 모든 변경 이력이 Git에 기록 (감사 로그)
- 롤백 = `git revert`
- 환경별 설정 코드로 관리
- 클러스터 접근 권한을 ArgoCD에만 부여

---

## ArgoCD 설치

```bash
# ArgoCD 네임스페이스 생성 및 설치
kubectl create namespace argocd
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 설치 확인
kubectl get pods -n argocd

# 초기 admin 비밀번호 확인
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath='{.data.password}' | base64 -d

# UI 접속
kubectl port-forward svc/argocd-server -n argocd 8080:443
# https://localhost:8080  (admin / 위 비밀번호)
```

### ArgoCD CLI

```bash
# CLI 설치
brew install argocd   # macOS

# 로그인
argocd login localhost:8080 --insecure

# 비밀번호 변경
argocd account update-password
```

---

## Application 등록

### UI에서 등록

1. New App 클릭
2. Repository URL, 경로, 클러스터, 네임스페이스 입력
3. Sync Policy 설정

### YAML로 선언

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-prod
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myapp-gitops.git
    targetRevision: main
    path: k8s/prod               # 매니페스트 경로

  destination:
    server: https://kubernetes.default.svc
    namespace: prod

  syncPolicy:
    automated:                   # 자동 동기화
      prune: true                # Git에서 삭제된 리소스도 K8s에서 삭제
      selfHeal: true             # 클러스터 직접 변경 시 Git 상태로 복원
    syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
```

---

## GitOps 저장소 구조

### 단일 저장소 (Monorepo)

```
myapp-gitops/
├── apps/                        # ArgoCD Application 정의
│   ├── myapp-dev.yaml
│   ├── myapp-staging.yaml
│   └── myapp-prod.yaml
├── k8s/
│   ├── base/                    # 공통 매니페스트 (Kustomize base)
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── kustomization.yaml
│   └── overlays/
│       ├── dev/
│       │   ├── kustomization.yaml
│       │   └── patch-replicas.yaml
│       ├── staging/
│       │   └── kustomization.yaml
│       └── prod/
│           ├── kustomization.yaml
│           ├── patch-replicas.yaml
│           └── patch-resources.yaml
└── helm/
    └── myapp/
```

---

## Kustomize로 환경별 설정

ArgoCD는 Kustomize를 기본 지원합니다.

### base/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- deployment.yaml
- service.yaml
- ingress.yaml
```

### overlays/prod/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
- ../../base
namespace: prod
namePrefix: ""
images:
- name: ghcr.io/myorg/myapp
  newTag: "2.5.0"          # CI/CD에서 자동 업데이트
patches:
- path: patch-replicas.yaml
- path: patch-resources.yaml
configMapGenerator:
- name: myapp-config
  literals:
  - SPRING_PROFILES_ACTIVE=prod
  - LOG_LEVEL=WARN
```

### overlays/prod/patch-replicas.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 5
```

---

## CI/CD 연동

### GitHub Actions → ArgoCD

```yaml
# .github/workflows/deploy.yml
jobs:
  update-image-tag:
    needs: build-push
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
      with:
        repository: myorg/myapp-gitops
        token: ${{ secrets.GITOPS_TOKEN }}

    - name: Update image tag
      run: |
        cd k8s/overlays/prod
        kustomize edit set image \
          ghcr.io/myorg/myapp=ghcr.io/myorg/myapp:${{ needs.build-push.outputs.image-tag }}

    - name: Commit and push
      run: |
        git config user.name "github-actions"
        git config user.email "actions@github.com"
        git commit -am "chore: update myapp to ${{ needs.build-push.outputs.image-tag }}"
        git push
    # ArgoCD가 Git 변경 감지 → 자동 동기화
```

---

## App of Apps 패턴

여러 Application을 하나의 Application으로 관리.

```yaml
# apps/root-app.yaml — 모든 앱의 진입점
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/myapp-gitops.git
    path: apps/              # 이 경로의 Application YAML들을 모두 배포
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

---

## 유용한 ArgoCD 명령어

```bash
# 앱 목록
argocd app list

# 앱 상태
argocd app get myapp-prod

# 수동 동기화
argocd app sync myapp-prod

# 롤백 (Git 히스토리 기반)
argocd app rollback myapp-prod 3    # 3번째 히스토리로

# 차이 확인 (Git vs 클러스터)
argocd app diff myapp-prod

# 앱 일시 중지 (자동 동기화 비활성화)
argocd app set myapp-prod --sync-policy none
```

---

## ApplicationSet (멀티 클러스터)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-all-clusters
  namespace: argocd
spec:
  generators:
  - clusters:
      selector:
        matchLabels:
          env: prod             # prod 레이블 붙은 모든 클러스터에 배포
  template:
    metadata:
      name: 'myapp-{{name}}'
    spec:
      source:
        repoURL: https://github.com/myorg/myapp-gitops.git
        path: k8s/overlays/prod
        targetRevision: main
      destination:
        server: '{{server}}'
        namespace: prod
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```
