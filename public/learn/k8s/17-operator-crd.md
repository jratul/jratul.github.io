---
title: "Operator 패턴과 CRD"
order: 17
---

## Operator란

**K8s의 선언적 모델을 커스텀 리소스로 확장**하는 패턴. 복잡한 상태 있는 애플리케이션(DB 클러스터, MQ 등) 운영 지식을 코드로 자동화.

```
기본 K8s: Deployment, Service, Pod 등 표준 리소스
Operator: PostgresCluster, KafkaTopic 등 커스텀 리소스

사람이 하던 일:
- PostgreSQL Primary 장애 → Standby를 Primary로 승격 → 구성 변경
Operator가 자동화:
- 장애 감지 → 자동 페일오버 → 연결 정보 업데이트
```

---

## CRD (Custom Resource Definition)

K8s API를 확장하여 새로운 리소스 타입 정의.

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myapps.myorg.io
spec:
  group: myorg.io
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            required: [image, replicas]
            properties:
              image:
                type: string
              replicas:
                type: integer
                minimum: 1
                maximum: 100
              port:
                type: integer
                default: 8080
          status:
            type: object
            properties:
              readyReplicas:
                type: integer
  scope: Namespaced
  names:
    plural: myapps
    singular: myapp
    kind: MyApp
    shortNames: [ma]
```

```yaml
# CRD 등록 후 커스텀 리소스 사용
apiVersion: myorg.io/v1
kind: MyApp
metadata:
  name: frontend
  namespace: prod
spec:
  image: ghcr.io/myorg/frontend:1.0.0
  replicas: 3
  port: 3000
```

```bash
kubectl get myapps
kubectl get ma   # 단축어
kubectl describe myapp frontend
```

---

## 유명 Operator 활용

### Strimzi (Kafka)

```bash
helm install strimzi-operator strimzi/strimzi-kafka-operator \
  --namespace kafka --create-namespace
```

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: my-cluster
  namespace: kafka
spec:
  kafka:
    replicas: 3
    version: 3.6.0
    listeners:
    - name: plain
      port: 9092
      type: internal
      tls: false
    - name: tls
      port: 9093
      type: internal
      tls: true
    config:
      default.replication.factor: 3
      min.insync.replicas: 2
    storage:
      type: persistent-claim
      size: 100Gi
      class: fast-ssd
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 10Gi
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

```yaml
# KafkaTopic CRD
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: orders
  namespace: kafka
  labels:
    strimzi.io/cluster: my-cluster
spec:
  partitions: 12
  replicas: 3
  config:
    retention.ms: 604800000   # 7일
    segment.bytes: 1073741824
```

### CloudNativePG (PostgreSQL)

```bash
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
  instances: 3          # Primary 1 + Standby 2
  imageName: ghcr.io/cloudnative-pg/postgresql:16.1

  postgresql:
    pg_hba:
    - host all all 10.0.0.0/8 scram-sha-256

  bootstrap:
    initdb:
      database: mydb
      owner: myuser
      secret:
        name: db-credentials

  storage:
    storageClass: fast-ssd
    size: 50Gi

  backup:
    retentionPolicy: "30d"
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

---

## Operator 직접 작성 (Go + controller-runtime)

### 프로젝트 초기화

```bash
# operator-sdk 설치
brew install operator-sdk

# 프로젝트 생성
operator-sdk init --domain myorg.io --repo github.com/myorg/myapp-operator

# API 생성
operator-sdk create api \
  --group apps \
  --version v1 \
  --kind MyApp \
  --resource --controller
```

### 컨트롤러 구조 (간략)

```go
// controllers/myapp_controller.go
func (r *MyAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // 1. 커스텀 리소스 조회
    myapp := &appsv1.MyApp{}
    if err := r.Get(ctx, req.NamespacedName, myapp); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // 2. 현재 상태 조회
    deployment := &appsv1.Deployment{}
    err := r.Get(ctx, types.NamespacedName{Name: myapp.Name, Namespace: myapp.Namespace}, deployment)

    // 3. Desired State와 비교 후 조정
    if errors.IsNotFound(err) {
        // Deployment 생성
        return ctrl.Result{}, r.createDeployment(ctx, myapp)
    }

    // 4. Deployment 스펙 업데이트
    if deployment.Spec.Replicas != &myapp.Spec.Replicas {
        deployment.Spec.Replicas = &myapp.Spec.Replicas
        return ctrl.Result{}, r.Update(ctx, deployment)
    }

    // 5. Status 업데이트
    myapp.Status.ReadyReplicas = deployment.Status.ReadyReplicas
    return ctrl.Result{}, r.Status().Update(ctx, myapp)
}
```

---

## Operator Lifecycle Manager (OLM)

Operator 패키지 관리 도구. OperatorHub.io에서 설치.

```bash
# OLM 설치
operator-sdk olm install

# OperatorHub에서 설치 (Prometheus Operator 예시)
kubectl create -f https://operatorhub.io/install/prometheus.yaml
```

---

## 언제 Operator를 사용할까

| 상황 | 추천 |
|------|------|
| PostgreSQL/MySQL 클러스터 | CloudNativePG, Percona Operator 사용 |
| Kafka 클러스터 | Strimzi 사용 |
| Redis 클러스터 | Redis Operator 사용 |
| 사내 공통 배포 패턴 자동화 | 직접 작성 |
| 단순 Deployment 관리 | Operator 불필요, Helm으로 충분 |
