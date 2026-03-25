---
title: "RBAC와 보안"
order: 9
---

## RBAC란 무엇인가

RBAC(Role-Based Access Control)는 역할 기반 접근 제어입니다. "누가(Subject)", "어떤 리소스에(Resource)", "어떤 작업을 할 수 있는지(Verb)"를 정의합니다.

**비유:** 회사의 직책별 권한과 같습니다.
- 개발자 → 자기 팀 네임스페이스의 Pod 조회/로그 확인 가능
- CI/CD 봇 → 특정 네임스페이스에 Deployment 업데이트 가능
- 클러스터 관리자 → 모든 리소스에 모든 작업 가능

```
Subject (누가)              Role/ClusterRole (무엇을)
─────────────────           ────────────────────────────
ServiceAccount    →    get, list pods
User              →    create, update deployments
Group             →    delete, watch services
        ↓
RoleBinding / ClusterRoleBinding (연결)
```

---

## Role vs ClusterRole

### Role — 특정 네임스페이스 내 권한

```yaml
# role.yaml — prod 네임스페이스 내 Pod 조회만 허용
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader           # 역할 이름
  namespace: prod            # 이 네임스페이스에만 적용
rules:
- apiGroups: [""]            # "" = core API group (Pod, Service, ConfigMap 등)
  resources: ["pods", "pods/log"]   # 접근할 리소스
  verbs: ["get", "list", "watch"]   # 허용할 작업

- apiGroups: ["apps"]        # apps API group (Deployment, StatefulSet 등)
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch", "update", "patch"]

- apiGroups: [""]
  resources: ["services", "configmaps"]
  verbs: ["get", "list"]
```

### ClusterRole — 클러스터 전체 범위 권한

```yaml
# clusterrole.yaml — 모든 네임스페이스에서 Node 정보 조회
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-reader          # 네임스페이스 없음 = 클러스터 전체
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["metrics.k8s.io"]
  resources: ["nodes", "pods"]
  verbs: ["get", "list"]
```

### 주요 Verb (작업) 목록

| Verb | 설명 | HTTP 메서드 |
|------|------|------------|
| get | 단일 리소스 조회 | GET |
| list | 목록 조회 | GET (컬렉션) |
| watch | 실시간 변화 감시 | GET (스트림) |
| create | 생성 | POST |
| update | 전체 수정 | PUT |
| patch | 부분 수정 | PATCH |
| delete | 삭제 | DELETE |
| deletecollection | 다수 삭제 | DELETE (컬렉션) |

---

## RoleBinding — 역할 연결

Role만 만들면 아무것도 안 됩니다. RoleBinding으로 "누구에게" 적용할지 연결해야 합니다.

```yaml
# rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-pod-reader          # RoleBinding 이름
  namespace: prod               # 이 네임스페이스에서 적용
subjects:                       # 누구에게 부여할지
- kind: ServiceAccount
  name: ci-deployer             # ServiceAccount 이름
  namespace: prod               # ServiceAccount의 네임스페이스
- kind: User
  name: alice@example.com       # 사용자 이름 (K8s는 자체 사용자 DB 없음, 외부 인증 연동)
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: dev-team                # 그룹 이름
  apiGroup: rbac.authorization.k8s.io
roleRef:                        # 어떤 역할을 부여할지
  kind: Role                    # Role 또는 ClusterRole
  name: pod-reader              # Role 이름
  apiGroup: rbac.authorization.k8s.io
```

```yaml
# ClusterRoleBinding — 클러스터 전체 범위로 적용
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-admin-binding
subjects:
- kind: User
  name: admin@example.com
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-admin            # K8s 기본 제공 ClusterRole (모든 권한)
  apiGroup: rbac.authorization.k8s.io
```

---

## ServiceAccount — Pod의 신원

Pod가 쿠버네티스 API 서버와 통신할 때 사용하는 계정입니다. 예를 들어 앱이 다른 Pod를 조회하거나 ConfigMap을 읽을 때 ServiceAccount 권한이 필요합니다.

```yaml
# serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: prod
  annotations:
    # AWS IAM Role 연동 (EKS IRSA)
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/myapp-role
```

```yaml
# Deployment에 ServiceAccount 지정
spec:
  template:
    spec:
      serviceAccountName: myapp-sa
      automountServiceAccountToken: false   # API 호출 안 하면 토큰 마운트 비활성화
```

### CI/CD용 ServiceAccount 설정

CI/CD 파이프라인(GitHub Actions 등)이 클러스터에 배포할 때 필요한 최소 권한만 부여합니다.

```yaml
# CI/CD 배포 Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer
  namespace: prod
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "update", "patch"]   # 배포 업데이트만 가능
- apiGroups: [""]
  resources: ["services", "configmaps"]
  verbs: ["get", "list", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]             # 배포 상태 확인용
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deployer-binding
  namespace: prod
subjects:
- kind: ServiceAccount
  name: ci-deployer
  namespace: prod
roleRef:
  kind: Role
  name: deployer
  apiGroup: rbac.authorization.k8s.io
```

---

## Pod 보안 설정

### SecurityContext — 컨테이너 보안 설정

```yaml
spec:
  # Pod 레벨 보안 설정 (모든 컨테이너에 적용)
  securityContext:
    runAsNonRoot: true          # root 사용자로 실행 금지
    runAsUser: 1001             # 특정 UID로 실행
    runAsGroup: 1001
    fsGroup: 1001               # 볼륨 파일 소유 그룹
    seccompProfile:
      type: RuntimeDefault      # seccomp 기본 프로파일 (시스템 콜 제한)

  containers:
  - name: app
    image: myapp:1.0.0
    # 컨테이너 레벨 보안 설정
    securityContext:
      allowPrivilegeEscalation: false   # su, sudo 등 권한 상승 금지
      readOnlyRootFilesystem: true      # 루트 파일시스템 읽기 전용
      capabilities:
        drop: ["ALL"]                   # 모든 Linux capability 제거
        add: ["NET_BIND_SERVICE"]       # 1024 미만 포트 바인딩이 필요할 때만 추가
    volumeMounts:
    - name: tmp
      mountPath: /tmp                   # 읽기 전용 파일시스템이면 /tmp도 볼륨으로

  volumes:
  - name: tmp
    emptyDir: {}
```

> Spring Boot는 기본적으로 임시 파일을 `/tmp`에 씁니다. `readOnlyRootFilesystem: true`를 설정하면 `/tmp`를 emptyDir로 마운트해야 합니다.

### Pod Security Admission — 네임스페이스 보안 수준

K8s 1.25부터 기본 제공됩니다. 네임스페이스에 레이블을 추가해서 보안 정책을 강제합니다.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: prod
  labels:
    # enforce: 위반 Pod 실행 거부
    pod-security.kubernetes.io/enforce: restricted
    # warn: 경고만 (실행은 허용)
    pod-security.kubernetes.io/warn: restricted
    # audit: 감사 로그만 기록
    pod-security.kubernetes.io/audit: restricted
```

| 보안 레벨 | 설명 | 사용 예 |
|----------|------|---------|
| privileged | 제한 없음 | kube-system, 시스템 컴포넌트 |
| baseline | 기본 보안 (권한 상승 방지) | 일반 앱 |
| restricted | 최고 수준 (runAsNonRoot 등 필수) | 보안 민감 앱 |

---

## RBAC 검증

```bash
# 특정 사용자/SA가 특정 작업을 할 수 있는지 확인
kubectl auth can-i get pods --as=alice@example.com -n prod
# yes 또는 no

kubectl auth can-i delete deployments \
  --as=system:serviceaccount:prod:ci-deployer \
  -n prod
# no

# 현재 사용자의 권한 목록
kubectl auth can-i --list -n prod

# 특정 ServiceAccount의 권한 확인
kubectl auth can-i --list \
  --as=system:serviceaccount:prod:myapp-sa \
  -n prod

# RBAC 리소스 확인
kubectl get roles,rolebindings -n prod
kubectl get clusterroles,clusterrolebindings | grep myapp
```

---

## 이미지 보안

### imagePullPolicy 설정

```yaml
spec:
  containers:
  - name: app
    image: myapp:1.0.0
    imagePullPolicy: IfNotPresent   # 로컬에 없을 때만 레지스트리에서 pull

# Always: 매번 레지스트리에서 pull (latest 태그 사용 시 권장)
# IfNotPresent: 로컬에 없을 때만 pull (기본값, 명시적 버전 태그 사용 시)
# Never: 로컬에서만 사용 (에어갭 환경)
```

> `latest` 태그 대신 `sha-abc1234` 또는 `v1.2.3` 같은 명시적 태그를 사용하세요. latest는 이미지가 바뀌어도 알기 어렵습니다.

---

## etcd 암호화 (Secret 암호화)

기본적으로 K8s Secret은 etcd에 평문으로 저장됩니다. etcd 파일에 직접 접근하면 Secret 내용을 볼 수 있습니다.

```yaml
# /etc/kubernetes/encryption-config.yaml (관리자 설정)
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
- resources:
  - secrets
  providers:
  - aescbc:                  # AES-CBC 암호화
      keys:
      - name: key1
        secret: <base64-32바이트-키>
  - identity: {}             # 기존 데이터 읽기용 (미암호화)
```

프로덕션에서는 AWS KMS, GCP KMS, HashiCorp Vault 같은 외부 KMS와 연동하는 것이 권장됩니다.

---

## 실전 보안 체크리스트

```bash
# 1. root로 실행 중인 Pod 확인
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.securityContext.runAsUser}{"\n"}{end}'

# 2. imagePullPolicy: Always를 사용하지 않는 Pod
kubectl get pods -A -o yaml | grep -A2 "imagePullPolicy"

# 3. 과도한 권한을 가진 ServiceAccount
kubectl get clusterrolebindings -o yaml | grep -B5 "cluster-admin"

# 4. 네트워크 정책이 없는 네임스페이스
kubectl get networkpolicies -A

# 5. 읽기/쓰기 가능한 PVC 확인
kubectl get pvc -A
```
