---
title: "Pod와 Deployment"
order: 3
---

## Pod

### 기본 Pod 명세

```yaml
# pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    app: myapp
    version: "1.0"
spec:
  containers:
  - name: app
    image: myapp:1.0.0
    ports:
    - containerPort: 8080
    env:
    - name: SPRING_PROFILES_ACTIVE
      value: "prod"
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
      limits:
        memory: "512Mi"
        cpu: "500m"
    livenessProbe:
      httpGet:
        path: /actuator/health/liveness
        port: 8080
      initialDelaySeconds: 60
      periodSeconds: 10
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /actuator/health/readiness
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 5
```

### Liveness vs Readiness Probe

| | Liveness | Readiness |
|---|---|---|
| 목적 | 컨테이너가 살아있는지 | 트래픽 받을 준비됐는지 |
| 실패 시 | 컨테이너 재시작 | Service에서 제외 (트래픽 차단) |
| 사용 예 | 데드락 감지 | DB 연결 완료 후 트래픽 수신 |

```yaml
# Startup Probe — 초기 기동 시간이 긴 앱에 사용
startupProbe:
  httpGet:
    path: /actuator/health
    port: 8080
  failureThreshold: 30    # 30 * 10s = 최대 300초 대기
  periodSeconds: 10
```

---

## Deployment

### 기본 Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp          # 이 레이블을 가진 Pod를 관리
  template:               # Pod 템플릿
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: ghcr.io/myorg/myapp:1.0.0
        ports:
        - containerPort: 8080
        envFrom:
        - configMapRef:
            name: myapp-config
        - secretRef:
            name: myapp-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 5
      terminationGracePeriodSeconds: 60   # 종료 전 대기 시간
```

---

## 업데이트 전략

### RollingUpdate (기본값)

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # 동시에 추가 생성할 Pod 수 (또는 %)
      maxUnavailable: 0  # 동시에 종료할 Pod 수 (0 = 무중단)
```

동작 순서:
1. 새 Pod 1개 생성 (replicas: 3 → 4개)
2. 새 Pod Readiness 통과 시 구 Pod 1개 종료 (4 → 3개)
3. 반복

### Recreate

```yaml
spec:
  strategy:
    type: Recreate    # 전체 종료 후 새로 시작 (다운타임 발생)
```

DB 스키마 변경 등 구 버전과 공존 불가 시 사용.

---

## ReplicaSet

Deployment가 자동으로 생성하는 오브젝트. 직접 다룰 일은 거의 없음.

```bash
# Deployment가 만든 ReplicaSet 확인
kubectl get replicasets
# NAME                DESIRED   CURRENT   READY
# myapp-7d6b4f8c4f   3         3         3
# myapp-5d9c7f9b8d   0         0         0   ← 이전 버전 (롤백용)
```

---

## 실전 배포 흐름

```bash
# 1. 배포
kubectl apply -f deployment.yaml

# 2. 롤아웃 진행 상황 확인
kubectl rollout status deployment/myapp
# Waiting for deployment "myapp" rollout to finish: 1 out of 3 new replicas have been updated...
# deployment "myapp" successfully rolled out

# 3. 이미지 업데이트
kubectl set image deployment/myapp app=ghcr.io/myorg/myapp:2.0.0

# 4. 문제 발생 시 롤백
kubectl rollout undo deployment/myapp

# 5. 특정 버전으로 롤백
kubectl rollout history deployment/myapp
kubectl rollout undo deployment/myapp --to-revision=2
```

---

## 멀티 컨테이너 Pod 패턴

### Sidecar 패턴

```yaml
spec:
  containers:
  - name: app
    image: myapp:1.0.0
    ports:
    - containerPort: 8080

  - name: log-collector         # 로그 수집 사이드카
    image: fluent/fluent-bit
    volumeMounts:
    - name: log-volume
      mountPath: /var/log/app

  volumes:
  - name: log-volume
    emptyDir: {}                # Pod 내 공유 임시 볼륨
```

### Init Container

```yaml
spec:
  initContainers:
  - name: wait-for-db           # DB 준비될 때까지 대기
    image: busybox
    command: ['sh', '-c', 'until nc -z postgres 5432; do sleep 1; done']

  containers:
  - name: app
    image: myapp:1.0.0
```

Init Container가 완료된 후에만 메인 컨테이너 시작.

---

## Pod 배치 제어

```yaml
spec:
  # 특정 노드에 배치
  nodeSelector:
    kubernetes.io/arch: amd64

  # 노드 어피니티 (더 세밀한 제어)
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: node-type
            operator: In
            values: [high-mem]

    # 같은 앱 Pod끼리 다른 노드에 분산 배치
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: myapp
          topologyKey: kubernetes.io/hostname
```
