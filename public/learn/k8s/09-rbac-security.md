---
title: "RBAC와 보안"
order: 9
---

## RBAC 개념

Role-Based Access Control: **누가(Subject)**, **어떤 리소스(Resource)에**, **어떤 작업(Verb)을** 할 수 있는지 정의.

```
Subject (누가)          → Role/ClusterRole (무엇을)
ServiceAccount              get, list, create, delete...
User                        pods, deployments, secrets...
Group
    ↓
RoleBinding / ClusterRoleBinding (연결)
```

---

## Role과 ClusterRole

### Role (네임스페이스 범위)

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: prod
rules:
- apiGroups: [""]             # "" = core API group
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "update", "patch"]
```

### ClusterRole (클러스터 전체 범위)

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-admin
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
```

### 주요 Verb

| Verb | 설명 |
|------|------|
| get | 단일 리소스 조회 |
| list | 목록 조회 |
| watch | 실시간 변화 감시 |
| create | 생성 |
| update | 전체 수정 |
| patch | 부분 수정 |
| delete | 삭제 |

---

## RoleBinding

Role을 Subject에 연결.

```yaml
# RoleBinding (네임스페이스 범위)
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-pod-reader
  namespace: prod
subjects:
- kind: ServiceAccount
  name: ci-deployer
  namespace: prod
- kind: User
  name: alice@example.com
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

```yaml
# ClusterRoleBinding (클러스터 전체)
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
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
```

---

## ServiceAccount

Pod가 API Server와 통신할 때 사용하는 계정.

```yaml
# ServiceAccount 생성
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: prod
```

```yaml
# Deployment에 ServiceAccount 지정
spec:
  template:
    spec:
      serviceAccountName: myapp-sa
      automountServiceAccountToken: false   # 불필요 시 토큰 마운트 비활성화
```

```yaml
# CI/CD용 ServiceAccount — 특정 네임스페이스에만 배포 권한
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer
  namespace: prod
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "update", "patch"]
- apiGroups: [""]
  resources: ["services", "configmaps"]
  verbs: ["get", "list", "create", "update", "patch"]
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

## Pod 보안

### SecurityContext

```yaml
spec:
  securityContext:
    runAsNonRoot: true          # root로 실행 금지
    runAsUser: 1001
    runAsGroup: 1001
    fsGroup: 1001               # 볼륨 소유 그룹
    seccompProfile:
      type: RuntimeDefault      # seccomp 프로파일 적용

  containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false   # 권한 상승 금지
      readOnlyRootFilesystem: true      # 읽기 전용 파일시스템
      capabilities:
        drop: ["ALL"]                   # 모든 capability 제거
        add: ["NET_BIND_SERVICE"]       # 필요한 것만 추가
```

### Pod Security Admission (K8s 1.25+)

네임스페이스 레벨에서 보안 정책 강제.

```yaml
# 네임스페이스에 레이블 추가
apiVersion: v1
kind: Namespace
metadata:
  name: prod
  labels:
    pod-security.kubernetes.io/enforce: restricted   # 엄격한 보안 강제
    pod-security.kubernetes.io/warn: restricted
```

| 레벨 | 설명 |
|------|------|
| privileged | 제한 없음 (클러스터 관리 시스템용) |
| baseline | 기본 보안 (known privilege escalation 방지) |
| restricted | 최고 수준 보안 |

---

## RBAC 검증

```bash
# 특정 사용자/SA가 리소스에 접근 가능한지 확인
kubectl auth can-i get pods --as=alice@example.com
kubectl auth can-i delete deployments --as=system:serviceaccount:prod:ci-deployer -n prod

# 현재 사용자 권한 확인
kubectl auth can-i --list
kubectl auth can-i --list -n prod

# RBAC 관련 리소스 확인
kubectl get rolebindings,clusterrolebindings -A | grep alice
```

---

## Image Pull Policy

```yaml
spec:
  containers:
  - name: app
    image: myapp:1.0.0
    imagePullPolicy: IfNotPresent   # Always / IfNotPresent / Never
```

| 정책 | 동작 |
|------|------|
| Always | 매번 레지스트리에서 pull |
| IfNotPresent | 로컬에 없을 때만 pull |
| Never | 로컬에서만 사용 (에러 가능) |

---

## Secret 암호화 (etcd)

```yaml
# /etc/kubernetes/encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
- resources:
  - secrets
  providers:
  - aescbc:
      keys:
      - name: key1
        secret: <base64-encoded-32-byte-key>
  - identity: {}   # 암호화 없는 기존 데이터 읽기용
```

프로덕션에서는 AWS KMS, GCP KMS, HashiCorp Vault 등 외부 KMS 연동 권장.
