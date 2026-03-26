---
title: "Operator 패턴과 CRD"
order: 17
---

## Operator란 무엇인가 — 운영 지식의 자동화

Kubernetes는 기본적으로 Deployment, Service, Pod 같은 표준 리소스를 관리합니다. 하지만 PostgreSQL 클러스터, Kafka 클러스터 같은 복잡한 애플리케이션은 기본 리소스만으로는 관리하기 어렵습니다.

숙련된 DB 관리자가 하는 일을 생각해보면, Primary 서버 장애 감지 → Standby를 Primary로 승격 → 앱 연결 정보 업데이트 → 새 Standby 준비와 같은 복잡한 절차가 필요합니다. Operator는 이 "운영 지식"을 코드로 구현하여 자동화합니다.

```
기본 K8s 리소스:
kubectl get deployment, service, pod, configmap...

Operator가 추가하는 커스텀 리소스:
kubectl get postgrescluster   ← CloudNativePG가 추가
kubectl get kafka             ← Strimzi가 추가
kubectl get redis             ← Redis Operator가 추가

Operator = CRD(새로운 리소스 타입 정의) + Controller(리소스를 원하는 상태로 유지)
```

### Operator가 자동화하는 것들

```
기존에 사람이 하던 일          →  Operator가 자동으로

PostgreSQL Primary 장애        → 자동 페일오버 + 앱 연결 업데이트
Kafka 파티션 리밸런싱          → 브로커 추가 시 자동 리밸런스
인증서 만료                    → 자동 갱신 (cert-manager)
스케일 아웃 후 DB 초기화       → 새 레플리카 자동 복제 설정
```

---

## CRD — 새로운 리소스 타입 만들기

CRD(Custom Resource Definition)는 Kubernetes API를 확장하여 새로운 리소스 타입을 정의합니다. CRD를 등록하면 `kubectl get myapp` 처럼 커스텀 리소스를 다룰 수 있습니다.

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myapps.myorg.io              # 형식: {plural}.{group}
spec:
  group: myorg.io                    # API 그룹 이름 (보통 도메인 형태)
  versions:
  - name: v1
    served: true                     # 이 버전을 API 서버에서 제공
    storage: true                    # etcd에 저장하는 버전 (하나만 true)
    schema:
      openAPIV3Schema:               # 유효성 검사 스키마 (잘못된 값 거부)
        type: object
        properties:
          spec:
            type: object
            required: [image, replicas]   # 필수 필드
            properties:
              image:
                type: string
              replicas:
                type: integer
                minimum: 1           # 최소값 검사
                maximum: 100         # 최대값 검사
              port:
                type: integer
                default: 8080        # 기본값
          status:                    # 현재 상태 기록 (컨트롤러가 업데이트)
            type: object
            properties:
              readyReplicas:
                type: integer
  scope: Namespaced                  # Namespaced 또는 Cluster 범위
  names:
    plural: myapps                   # kubectl get myapps
    singular: myapp                  # kubectl get myapp
    kind: MyApp                      # YAML에서 kind: MyApp
    shortNames: [ma]                 # kubectl get ma (단축어)
```

CRD를 등록한 후 실제로 커스텀 리소스를 사용하는 방법:

```yaml
# CRD 등록 후 커스텀 리소스 생성
apiVersion: myorg.io/v1
kind: MyApp                          # CRD에서 정의한 kind
metadata:
  name: frontend
  namespace: prod
spec:
  image: ghcr.io/myorg/frontend:1.0.0
  replicas: 3
  port: 3000
```

```bash
# 커스텀 리소스 다루기
kubectl get myapps                   # 목록
kubectl get ma                       # 단축어
kubectl describe myapp frontend      # 상세 정보
kubectl delete myapp frontend        # 삭제
```

---

## 유명 Operator 활용하기 — 직접 만들지 않아도 됩니다

대부분의 경우 이미 잘 만들어진 Operator를 가져다 쓰는 것이 효율적입니다.

### Strimzi — Kafka 클러스터 관리

Strimzi를 사용하면 Kafka 클러스터를 Kubernetes 방식으로 선언적으로 관리할 수 있습니다.

```bash
# Strimzi Operator 설치
helm install strimzi-operator strimzi/strimzi-kafka-operator \
  --namespace kafka --create-namespace
```

```yaml
# Kafka 클러스터 생성 (YAML 하나로!)
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: my-cluster
  namespace: kafka
spec:
  kafka:
    replicas: 3                      # Kafka 브로커 3개
    version: 3.6.0
    listeners:
    - name: plain
      port: 9092
      type: internal
      tls: false                     # 클러스터 내부 평문 통신
    - name: tls
      port: 9093
      type: internal
      tls: true                      # TLS 암호화 통신
    config:
      default.replication.factor: 3  # 데이터를 3개 브로커에 복제
      min.insync.replicas: 2         # 최소 2개에 쓰여야 성공 (데이터 안전)
    storage:
      type: persistent-claim
      size: 100Gi                    # 브로커당 100GB
      class: fast-ssd
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 10Gi
  entityOperator:
    topicOperator: {}                # KafkaTopic CRD 사용 활성화
    userOperator: {}                 # KafkaUser CRD 사용 활성화
```

```yaml
# KafkaTopic 생성 (kubectl apply 한 번으로 토픽 생성)
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: orders
  namespace: kafka
  labels:
    strimzi.io/cluster: my-cluster   # 어느 클러스터의 토픽인지 지정
spec:
  partitions: 12                     # 파티션 수 (처리량에 따라 설정)
  replicas: 3                        # 레플리카 수 (브로커 수 이하)
  config:
    retention.ms: 604800000          # 7일간 데이터 보존 (604800000ms = 7일)
    segment.bytes: 1073741824        # 세그먼트 파일 크기 1GB
```

### CloudNativePG — PostgreSQL 클러스터 관리

Primary-Standby 구성, 자동 페일오버, S3 백업을 YAML 하나로 설정합니다.

```bash
# CloudNativePG Operator 설치
helm install cnpg cnpg/cloudnative-pg \
  --namespace cnpg-system --create-namespace
```

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
  namespace: prod
spec:
  instances: 3                       # Primary 1 + Standby 2 (고가용성)
  imageName: ghcr.io/cloudnative-pg/postgresql:16.1

  postgresql:
    pg_hba:
    # 10.0.0.0/8 범위에서 scram-sha-256 인증으로 접근 허용
    - host all all 10.0.0.0/8 scram-sha-256

  bootstrap:
    initdb:
      database: mydb
      owner: myuser
      secret:
        name: db-credentials         # DB 비밀번호가 저장된 Secret

  storage:
    storageClass: fast-ssd
    size: 50Gi                       # Primary와 각 Standby 모두 50GB

  backup:
    retentionPolicy: "30d"           # 30일간 백업 보존
    barmanObjectStore:
      destinationPath: s3://my-bucket/postgres-backup
      s3Credentials:
        accessKeyId:
          name: aws-creds
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: aws-creds
          key: SECRET_ACCESS_KEY
```

Operator가 자동으로 처리하는 것들:
- Primary 장애 시 Standby 자동 승격
- 새 인스턴스 추가 시 자동으로 데이터 복제
- 매일 S3에 자동 백업

---

## Operator 직접 작성하기 — Go + controller-runtime

사내 공통 배포 패턴이 있거나, 팀 전용 추상화가 필요할 때 Operator를 직접 만들 수 있습니다.

### 프로젝트 초기화

```bash
# operator-sdk 설치 (macOS)
brew install operator-sdk

# 새 Operator 프로젝트 생성
operator-sdk init --domain myorg.io --repo github.com/myorg/myapp-operator

# MyApp 리소스와 컨트롤러 생성
operator-sdk create api \
  --group apps \
  --version v1 \
  --kind MyApp \
  --resource --controller   # CRD + Controller 코드 자동 생성
```

### 컨트롤러 핵심 구조 — Reconcile 루프

컨트롤러의 핵심은 `Reconcile` 함수입니다. 이 함수는 "현재 상태를 원하는 상태로 맞추는" 작업을 반복합니다.

```go
// controllers/myapp_controller.go
func (r *MyAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // 1. 커스텀 리소스 조회 (사용자가 정의한 MyApp)
    myapp := &appsv1.MyApp{}
    if err := r.Get(ctx, req.NamespacedName, myapp); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // 2. 현재 상태 조회 (실제 Deployment가 있는지 확인)
    deployment := &appsv1.Deployment{}
    err := r.Get(ctx, types.NamespacedName{
        Name:      myapp.Name,
        Namespace: myapp.Namespace,
    }, deployment)

    // 3. Desired State와 비교 후 조정
    if errors.IsNotFound(err) {
        // Deployment가 없으면 새로 생성
        return ctrl.Result{}, r.createDeployment(ctx, myapp)
    }

    // 4. 레플리카 수가 다르면 업데이트
    if deployment.Spec.Replicas != &myapp.Spec.Replicas {
        deployment.Spec.Replicas = &myapp.Spec.Replicas
        return ctrl.Result{}, r.Update(ctx, deployment)
    }

    // 5. Status 업데이트 (현재 실행 중인 레플리카 수 기록)
    myapp.Status.ReadyReplicas = deployment.Status.ReadyReplicas
    return ctrl.Result{}, r.Status().Update(ctx, myapp)
}
```

컨트롤 루프의 핵심 원칙:
- `Reconcile`은 언제 몇 번 호출돼도 결과가 같아야 합니다(멱등성).
- 항상 "원하는 상태(Spec)"와 "현재 상태"를 비교합니다.
- 차이가 없으면 아무 것도 하지 않습니다.

---

## Operator Lifecycle Manager (OLM)

OLM은 Operator 자체를 패키지 매니저로 관리하는 도구입니다. OperatorHub.io에서 수백 개의 Operator를 검색하고 설치할 수 있습니다.

```bash
# OLM 설치
operator-sdk olm install

# OperatorHub.io에서 Prometheus Operator 설치 예시
kubectl create -f https://operatorhub.io/install/prometheus.yaml

# 설치된 Operator 확인
kubectl get csv -A   # ClusterServiceVersion 목록
```

---

## 언제 무엇을 쓸까 — 의사결정 가이드

| 상황 | 추천 방법 |
|------|-----------|
| PostgreSQL/MySQL 클러스터 | CloudNativePG 또는 Percona Operator 사용 |
| Kafka 클러스터 | Strimzi 사용 |
| Redis 클러스터 | Redis Operator 사용 |
| TLS 인증서 관리 | cert-manager 사용 |
| 사내 공통 배포 패턴 자동화 | 직접 Operator 작성 |
| 단순 Deployment 관리 | Operator 불필요, Helm으로 충분 |

---

## 흔한 실수들

```
실수 1: 모든 것을 Operator로 만들려는 시도
→ 단순한 배포는 Helm 차트로 충분
→ Operator는 "사람이 직접 해야 하는 복잡한 운영 작업"이 있을 때 유용

실수 2: CRD 스키마 검사 미설정
→ 잘못된 값이 들어와도 오류 없이 etcd에 저장됨
→ openAPIV3Schema에 required, minimum, maximum 등 반드시 추가

실수 3: Reconcile 함수에서 외부 상태에 의존
→ 같은 입력에 다른 결과가 나오면 컨트롤러가 무한 루프에 빠질 수 있음
→ 항상 멱등성 보장

실수 4: CRD 버전 관리 소홀
→ v1beta1 → v1 마이그레이션 시 기존 데이터 변환 필요
→ CRD 설계 시 버전 호환성 고려

실수 5: Operator 없이 직접 Kafka/PostgreSQL 운영
→ 페일오버, 백업, 업그레이드를 수동으로 처리하면 실수 가능성 높음
→ 검증된 Operator를 사용하는 것이 훨씬 안전
```
