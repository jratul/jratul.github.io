---
title: "GitOps와 ArgoCD"
order: 15
---

## GitOps란 무엇인가 — 배포를 코드로 관리하기

GitOps는 "Git 저장소의 내용 = 클러스터의 실제 상태"가 되도록 관리하는 방식입니다. Git이 유일한 진실의 원천(Single Source of Truth)이 됩니다.

도서관에 비유하면 이렇습니다. 기존 방식은 사서(개발자)가 직접 책을 꽂는 방식입니다. GitOps는 도서 목록(Git)에 등록하면 자동화된 시스템(ArgoCD)이 책을 올바른 위치에 꽂아주는 방식입니다. 목록(Git)만 봐도 현재 도서관(클러스터) 상태를 알 수 있습니다.

```
기존 CI/CD 방식 (Push):
개발자 → CI 파이프라인 → kubectl apply → 클러스터
         (코드 빌드)     (클러스터에 직접 접근)

GitOps 방식 (Pull):
개발자 → Git PR 머지 → Git 저장소 변경 감지
                           ↓
                     ArgoCD가 자동 동기화
                           ↓
                       클러스터 업데이트
```

### GitOps의 장점

```
1. 완전한 변경 이력
   모든 배포 변경이 Git 커밋으로 기록됨
   언제, 누가, 무엇을 바꿨는지 추적 가능

2. 쉬운 롤백
   기존: kubectl rollout undo (히스토리 제한적)
   GitOps: git revert (무제한 히스토리)

3. 환경 일관성
   개발/스테이징/운영 환경 설정을 코드로 관리
   "내 환경에서는 됐는데" 문제 감소

4. 최소 권한 원칙
   개발자는 Git만 접근, 클러스터 직접 접근 불필요
   ArgoCD만 클러스터에 접근 권한을 가짐

5. 자동 복구
   누군가 kubectl로 직접 변경해도 ArgoCD가 Git 상태로 되돌림
   설정 드리프트(drift) 방지
```

---

## ArgoCD 설치하기

ArgoCD는 Git 저장소를 지속적으로 모니터링하다가 변경이 감지되면 클러스터를 자동으로 업데이트합니다.

```bash
# 1. ArgoCD 전용 네임스페이스 생성 및 설치
kubectl create namespace argocd
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 2. 모든 Pod가 Running 상태가 될 때까지 대기
kubectl get pods -n argocd -w
# NAME                                  READY   STATUS    RESTARTS
# argocd-server-xxx                     1/1     Running   0
# argocd-application-controller-xxx    1/1     Running   0
# argocd-repo-server-xxx               1/1     Running   0

# 3. 초기 admin 비밀번호 확인 (자동 생성됨)
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath='{.data.password}' | base64 -d

# 4. ArgoCD UI 접속 (포트 포워딩)
kubectl port-forward svc/argocd-server -n argocd 8080:443
# https://localhost:8080 에서 admin / 위 비밀번호로 로그인
```

### ArgoCD CLI 설치 및 사용

```bash
# CLI 설치
brew install argocd   # macOS
# Linux: https://github.com/argoproj/argo-cd/releases 에서 바이너리 다운로드

# CLI로 로그인
argocd login localhost:8080 --insecure

# 처음 로그인 후 비밀번호 변경 (보안 필수)
argocd account update-password
```

---

## Application 등록 — ArgoCD에게 무엇을 배포할지 알려주기

ArgoCD Application은 "이 Git 경로의 내용을 이 클러스터 네임스페이스에 배포하라"는 선언입니다.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-prod
  namespace: argocd              # ArgoCD가 설치된 네임스페이스
spec:
  project: default               # ArgoCD 프로젝트 (권한 그룹)

  source:
    repoURL: https://github.com/myorg/myapp-gitops.git  # 매니페스트 저장소
    targetRevision: main         # 브랜치 또는 태그
    path: k8s/prod               # 저장소 내 매니페스트 경로

  destination:
    server: https://kubernetes.default.svc   # 현재 클러스터
    namespace: prod              # 배포할 네임스페이스

  syncPolicy:
    automated:                   # 자동 동기화 활성화
      prune: true                # Git에서 삭제된 리소스를 클러스터에서도 삭제
      selfHeal: true             # 클러스터 직접 변경 시 Git 상태로 자동 복원
    syncOptions:
    - CreateNamespace=true       # 네임스페이스 없으면 자동 생성
    - PrunePropagationPolicy=foreground  # 삭제 순서 제어
    retry:
      limit: 3                   # 동기화 실패 시 최대 3회 재시도
      backoff:
        duration: 5s             # 첫 재시도 5초 후
        factor: 2                # 재시도마다 2배씩 증가 (5s, 10s, 20s)
```

---

## GitOps 저장소 구조 — 어떻게 파일을 정리할까

### 단일 저장소 구조 (권장)

```
myapp-gitops/
├── apps/                        # ArgoCD Application 정의 파일들
│   ├── myapp-dev.yaml           # 개발 환경 Application
│   ├── myapp-staging.yaml       # 스테이징 환경 Application
│   └── myapp-prod.yaml          # 운영 환경 Application
├── k8s/
│   ├── base/                    # 모든 환경 공통 설정
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── kustomization.yaml
│   └── overlays/                # 환경별 덮어쓰기 설정
│       ├── dev/
│       │   ├── kustomization.yaml
│       │   └── patch-replicas.yaml  # 개발: 1개 레플리카
│       ├── staging/
│       │   └── kustomization.yaml
│       └── prod/
│           ├── kustomization.yaml
│           ├── patch-replicas.yaml  # 운영: 5개 레플리카
│           └── patch-resources.yaml # 운영: 더 많은 리소스 할당
└── helm/
    └── myapp/
```

---

## Kustomize로 환경별 설정 관리

Kustomize는 YAML을 복사하지 않고 환경마다 다른 설정을 적용하는 도구입니다. ArgoCD가 기본으로 지원합니다.

### base/kustomization.yaml — 공통 설정

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- deployment.yaml           # 공통 Deployment 정의
- service.yaml              # 공통 Service 정의
- ingress.yaml              # 공통 Ingress 정의
```

### overlays/prod/kustomization.yaml — 운영 환경 설정

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
- ../../base               # 공통 설정을 기반으로

namespace: prod            # 모든 리소스를 prod 네임스페이스에 배포

images:
- name: ghcr.io/myorg/myapp
  newTag: "2.5.0"          # CI/CD 파이프라인이 이 값을 자동으로 업데이트

patches:
- path: patch-replicas.yaml    # 레플리카 수 변경
- path: patch-resources.yaml   # 리소스 요청량 변경

configMapGenerator:
- name: myapp-config
  literals:
  - SPRING_PROFILES_ACTIVE=prod
  - LOG_LEVEL=WARN           # 운영에서는 WARN 레벨로 로그 줄임
```

### overlays/prod/patch-replicas.yaml — 레플리카 수 패치

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 5               # 운영에서는 5개 (base에서는 1개)
```

---

## CI/CD 연동 — 코드 변경 → 자동 배포 흐름

### GitHub Actions가 GitOps 저장소를 업데이트

```yaml
# .github/workflows/deploy.yml
jobs:
  update-image-tag:
    needs: build-push            # 이미지 빌드 완료 후 실행
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
      with:
        repository: myorg/myapp-gitops  # GitOps 저장소 체크아웃
        token: ${{ secrets.GITOPS_TOKEN }}  # GitOps 저장소 쓰기 권한 토큰

    - name: Update image tag
      run: |
        cd k8s/overlays/prod
        # kustomize로 이미지 태그 업데이트
        kustomize edit set image \
          ghcr.io/myorg/myapp=ghcr.io/myorg/myapp:${{ needs.build-push.outputs.image-tag }}

    - name: Commit and push
      run: |
        git config user.name "github-actions"
        git config user.email "actions@github.com"
        git commit -am "chore: update myapp to ${{ needs.build-push.outputs.image-tag }}"
        git push
        # 이 push를 ArgoCD가 감지하여 자동으로 클러스터 업데이트
```

전체 흐름:
1. 개발자가 코드를 `main`에 push
2. GitHub Actions가 테스트 → 이미지 빌드 → 이미지 레지스트리에 push
3. GitHub Actions가 GitOps 저장소의 이미지 태그를 업데이트하고 커밋
4. ArgoCD가 GitOps 저장소 변경을 감지
5. ArgoCD가 클러스터에 새 이미지 배포

---

## App of Apps 패턴 — 여러 앱을 하나로 관리

여러 마이크로서비스가 있을 때 각각 ArgoCD Application을 등록하는 대신, 하나의 Application이 나머지 Application들을 관리하도록 합니다.

```yaml
# apps/root-app.yaml — 모든 앱의 진입점 (이것만 수동으로 등록)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/myapp-gitops.git
    path: apps/              # 이 경로의 모든 Application YAML을 자동 배포
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd        # Application 리소스는 argocd 네임스페이스에 생성
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

`apps/` 디렉토리에 `myapp-dev.yaml`, `myapp-prod.yaml` 등을 추가하면 `root-app`이 자동으로 해당 Application을 생성합니다.

---

## 유용한 ArgoCD 명령어

```bash
# 모든 앱 목록 및 상태 확인
argocd app list
# NAME          CLUSTER       NAMESPACE  PROJECT  STATUS  HEALTH   SYNCPOLICY
# myapp-prod    in-cluster    prod       default  Synced  Healthy  Auto

# 특정 앱 상세 정보 (최근 배포, 리소스 목록)
argocd app get myapp-prod

# 수동 동기화 (자동 동기화 비활성화 시 또는 즉시 배포 필요 시)
argocd app sync myapp-prod

# 롤백 (Git 히스토리 기반)
argocd app history myapp-prod      # 히스토리 목록
argocd app rollback myapp-prod 3   # 3번 히스토리 상태로 롤백

# Git vs 클러스터 차이 확인 (배포 전 검토)
argocd app diff myapp-prod

# 자동 동기화 일시 비활성화 (긴급 패치 등)
argocd app set myapp-prod --sync-policy none

# 다시 자동 동기화 활성화
argocd app set myapp-prod --sync-policy automated
```

---

## ApplicationSet — 멀티 클러스터 배포

여러 클러스터에 같은 앱을 배포해야 할 때 ApplicationSet을 사용하면 각 클러스터마다 Application을 수동으로 만들 필요가 없습니다.

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
          env: prod              # "env=prod" 레이블이 붙은 모든 클러스터에 배포
  template:
    metadata:
      name: 'myapp-{{name}}'    # 클러스터 이름으로 Application 자동 명명
    spec:
      source:
        repoURL: https://github.com/myorg/myapp-gitops.git
        path: k8s/overlays/prod
        targetRevision: main
      destination:
        server: '{{server}}'    # 각 클러스터의 API 서버 주소 자동 주입
        namespace: prod
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

---

## 흔한 실수들

```
실수 1: selfHeal: true 없이 운영
→ 누군가 kubectl로 직접 설정을 변경해도 감지 안 됨
→ Git과 실제 상태가 달라지는 "드리프트" 발생

실수 2: GitOps 저장소에 Secret 평문 저장
→ Git 히스토리에 비밀번호가 영원히 남음
→ Sealed Secrets 또는 External Secrets Operator 필수

실수 3: 이미지 레지스트리와 GitOps 저장소를 같이 씀
→ 소스 코드와 배포 설정을 분리하는 것이 GitOps의 핵심
→ 앱 코드 저장소 ≠ GitOps 저장소 (별도 운영 권장)

실수 4: prune: true 없이 운영
→ Git에서 리소스를 삭제해도 클러스터에는 그대로 남음
→ 좀비 리소스가 쌓여 혼란 발생

실수 5: 개발자에게 클러스터 직접 접근 권한 부여
→ GitOps의 의미가 없어짐
→ 배포는 Git PR → 머지 → ArgoCD 자동 배포로만 이루어져야 함
```
