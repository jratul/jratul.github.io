---
title: "Pod와 Deployment"
order: 3
---

## Pod란 무엇인가

Pod는 쿠버네티스에서 가장 작은 배포 단위입니다. 도커 컨테이너를 하나 이상 담는 "컨테이너의 집"이라고 생각하면 됩니다.

**비유:** 도커 컨테이너가 방이라면, Pod는 그 방들이 모인 아파트입니다. 같은 Pod 안의 컨테이너들은 네트워크(IP)와 스토리지를 공유합니다.

```
Pod (IP: 10.0.0.5)
├── 메인 앱 컨테이너 (Spring Boot, 포트 8080)
└── 사이드카 컨테이너 (로그 수집, 같은 IP 공유)
```

Pod는 임시적입니다. 노드 장애나 재배포 시 Pod는 삭제되고 새로 만들어집니다. 따라서 실제 서비스에서는 Pod를 직접 만들지 않고 Deployment를 통해 관리합니다.

---

## 기본 Pod 작성

```yaml
# pod.yaml — 학습/테스트 목적으로만 직접 Pod 작성
apiVersion: v1           # API 버전 (Pod는 core API, 그룹명 생략)
kind: Pod                # 리소스 타입
metadata:
  name: myapp            # Pod 이름 (클러스터 내 고유)
  namespace: default     # 소속 네임스페이스 (생략 시 default)
  labels:
    app: myapp           # 레이블: Service나 Deployment가 Pod를 찾을 때 사용
    version: "1.0"
spec:
  containers:
  - name: app            # 컨테이너 이름 (Pod 내 고유)
    image: myapp:1.0.0   # 도커 이미지
    ports:
    - containerPort: 8080  # 컨테이너가 사용하는 포트 (문서 목적, 실제 개방은 Service가 담당)
    env:
    - name: SPRING_PROFILES_ACTIVE   # 환경변수 이름
      value: "prod"                  # 환경변수 값
    resources:
      requests:                      # 스케줄링 시 최소 보장 자원
        memory: "256Mi"              # 256 MiB 메모리
        cpu: "250m"                  # 0.25 CPU 코어 (250 millicores)
      limits:                        # 최대 사용 가능 자원 (초과 시 제한)
        memory: "512Mi"
        cpu: "500m"
    livenessProbe:                   # "컨테이너가 살아있는지" 확인
      httpGet:
        path: /actuator/health/liveness
        port: 8080
      initialDelaySeconds: 60        # 컨테이너 시작 후 60초 대기 (Spring Boot 기동 시간)
      periodSeconds: 10              # 10초마다 확인
      failureThreshold: 3            # 3번 연속 실패 시 컨테이너 재시작
    readinessProbe:                  # "트래픽 받을 준비가 됐는지" 확인
      httpGet:
        path: /actuator/health/readiness
        port: 8080
      initialDelaySeconds: 30        # 30초 대기
      periodSeconds: 5               # 5초마다 확인
      failureThreshold: 3            # 3번 실패 시 Service에서 제외 (트래픽 차단)
```

---

## Liveness vs Readiness vs Startup Probe

세 가지 헬스체크는 목적이 다릅니다.

| Probe | 목적 | 실패 시 | 사용 예 |
|-------|------|---------|---------|
| Liveness | 컨테이너가 살아있는지 | 컨테이너 재시작 | 데드락, 무한루프 감지 |
| Readiness | 트래픽 받을 준비가 됐는지 | Service에서 제외 | DB 연결 완료 후 트래픽 수신 |
| Startup | 처음 기동이 완료됐는지 | Liveness가 시작 안 됨 | 기동 시간이 긴 앱 |

**비유:**
- Startup: 가게가 문을 열기 위해 준비하는 시간 (청소, 진열)
- Readiness: 손님 받을 준비 완료 여부 (준비되면 입장 허용)
- Liveness: 가게가 정상 운영 중인지 (문 잠겼으면 다시 열기)

```yaml
# Spring Boot 앱에서 세 가지 Probe 조합 (권장 설정)
spec:
  containers:
  - name: app
    image: myapp:1.0.0

    # Startup Probe: 최대 300초(30번 × 10초) 기동 시간 허용
    # 이 Probe가 성공하기 전까지 Liveness Probe는 실행되지 않음
    startupProbe:
      httpGet:
        path: /actuator/health
        port: 8080
      failureThreshold: 30   # 30번 실패까지 허용 = 최대 300초
      periodSeconds: 10

    # Liveness Probe: 데드락 등 비정상 상태 감지 → 재시작
    livenessProbe:
      httpGet:
        path: /actuator/health/liveness
        port: 8080
      initialDelaySeconds: 0   # startupProbe가 있으면 0으로
      periodSeconds: 10
      failureThreshold: 3

    # Readiness Probe: DB, Redis 연결 완료 후 트래픽 수신
    readinessProbe:
      httpGet:
        path: /actuator/health/readiness
        port: 8080
      initialDelaySeconds: 0
      periodSeconds: 5
      failureThreshold: 3
```

---

## Deployment란 무엇인가

Deployment는 Pod를 관리하는 상위 오브젝트입니다. "Pod를 3개 유지하고, 새 버전 배포 시 무중단으로 교체해"라고 선언하면 Deployment가 알아서 처리합니다.

**비유:** Pod가 직원이라면, Deployment는 "항상 3명의 직원이 근무해야 하고, 교육(업데이트) 시 한 명씩 교체해"라고 지시하는 매니저입니다.

```yaml
# deployment.yaml — 실제 서비스에서는 Deployment를 사용
apiVersion: apps/v1       # apps API 그룹
kind: Deployment
metadata:
  name: myapp
  namespace: prod          # prod 네임스페이스에 배포
spec:
  replicas: 3              # Pod 3개 유지 (하나 죽으면 새로 만듦)
  selector:
    matchLabels:
      app: myapp           # app=myapp 레이블을 가진 Pod를 이 Deployment가 관리
  template:                # Pod 템플릿 (여기부터 Pod 정의)
    metadata:
      labels:
        app: myapp         # 반드시 selector.matchLabels와 일치해야 함
    spec:
      containers:
      - name: app
        image: ghcr.io/myorg/myapp:1.0.0    # 프라이빗 레지스트리 이미지
        ports:
        - containerPort: 8080
          name: http        # 포트 이름 지정 (ServiceMonitor 등에서 참조)
        envFrom:
        - configMapRef:
            name: myapp-config     # ConfigMap의 모든 키를 환경변수로 주입
        - secretRef:
            name: myapp-secret     # Secret의 모든 키를 환경변수로 주입
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        startupProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          failureThreshold: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          periodSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          periodSeconds: 5
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              # 종료 전 5초 대기 — Service가 트래픽 라우팅을 멈출 시간 확보
              command: ["/bin/sh", "-c", "sleep 5"]
      terminationGracePeriodSeconds: 60   # 컨테이너에 SIGTERM 후 60초 대기 후 강제 종료
```

---

## 업데이트 전략

### RollingUpdate (기본값) — 무중단 배포

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # 동시에 추가로 만들 수 있는 Pod 수 (또는 %)
      maxUnavailable: 0  # 동시에 종료될 수 있는 Pod 수 (0 = 항상 replicas 수 유지)
```

**동작 순서 (replicas: 3, maxSurge: 1, maxUnavailable: 0):**
1. 새 Pod 1개 생성 → 총 4개 (기존 3 + 새 1)
2. 새 Pod Readiness 통과 → 기존 Pod 1개 종료 → 총 3개
3. 반복 → 모든 Pod가 새 버전으로 교체

### Recreate — 다운타임 허용

```yaml
spec:
  strategy:
    type: Recreate    # 기존 Pod 전체 종료 후 새 Pod 생성
```

DB 스키마 변경처럼 구 버전과 신 버전이 동시에 실행될 수 없는 경우에 사용합니다.

---

## 실전 배포 흐름

```bash
# 1. 처음 배포
kubectl apply -f deployment.yaml

# 2. 배포 진행 상황 실시간 확인
kubectl rollout status deployment/myapp -n prod
# Waiting for deployment "myapp" rollout to finish: 1 out of 3 new replicas have been updated...
# deployment "myapp" successfully rolled out

# 3. 이미지 업데이트 (새 버전 배포)
kubectl set image deployment/myapp app=ghcr.io/myorg/myapp:2.0.0 -n prod

# 4. 배포 완료 확인
kubectl get pods -n prod -l app=myapp
# NAME                    READY   STATUS    RESTARTS   AGE
# myapp-9b7d8c5f2-abc12   1/1     Running   0          2m   ← 새 버전
# myapp-9b7d8c5f2-def34   1/1     Running   0          1m
# myapp-9b7d8c5f2-ghi56   1/1     Running   0          30s

# 5. 문제 발생 시 즉시 롤백
kubectl rollout undo deployment/myapp -n prod

# 6. 특정 버전으로 롤백
kubectl rollout history deployment/myapp -n prod
kubectl rollout undo deployment/myapp --to-revision=2 -n prod
```

---

## ReplicaSet — Deployment 내부 동작

Deployment가 자동으로 생성하는 오브젝트입니다. 직접 다룰 일은 거의 없지만, 롤백 원리를 이해하는 데 중요합니다.

```bash
kubectl get replicasets -n prod
# NAME                    DESIRED   CURRENT   READY   AGE
# myapp-9b7d8c5f2         3         3         3       5m  ← 현재 버전
# myapp-7d6b4f8c4f        0         0         0       30m ← 이전 버전 (롤백용 보존)
```

배포 시 새 ReplicaSet이 만들어지고, 이전 ReplicaSet의 Pod 수가 0이 됩니다. 롤백 시 이전 ReplicaSet의 Pod 수를 다시 올립니다.

---

## 멀티 컨테이너 Pod 패턴

### Sidecar 패턴 — 보조 컨테이너

```yaml
# 메인 앱 + 로그 수집 사이드카
spec:
  containers:
  - name: app                      # 메인 애플리케이션
    image: myapp:1.0.0
    ports:
    - containerPort: 8080
    volumeMounts:
    - name: log-volume
      mountPath: /app/logs         # 로그 파일을 공유 볼륨에 저장

  - name: log-collector            # 로그 수집 사이드카 (Fluent Bit)
    image: fluent/fluent-bit:latest
    volumeMounts:
    - name: log-volume
      mountPath: /var/log/app      # 앱이 쓴 로그 파일을 읽어서 전송

  volumes:
  - name: log-volume
    emptyDir: {}                   # Pod 내 공유 임시 볼륨 (Pod 삭제 시 소멸)
```

### Init Container 패턴 — 사전 작업

Init Container는 메인 컨테이너가 시작하기 전에 실행됩니다. 완료되면 종료되고 메인 컨테이너가 시작됩니다.

```yaml
spec:
  initContainers:
  - name: wait-for-db              # DB가 준비될 때까지 대기
    image: busybox:latest
    # postgres가 5432 포트로 응답할 때까지 1초마다 재시도
    command: ['sh', '-c', 'until nc -z postgres-svc 5432; do echo "DB 대기 중..."; sleep 1; done']

  - name: db-migration             # DB 마이그레이션 실행
    image: ghcr.io/myorg/myapp:1.0.0
    command: ["java", "-jar", "app.jar", "--spring.batch.job.enabled=true"]
    envFrom:
    - secretRef:
        name: myapp-secret

  containers:
  - name: app                      # Init Container가 모두 완료된 후 시작
    image: ghcr.io/myorg/myapp:1.0.0
```

---

## Pod 배치 제어

### nodeSelector — 특정 노드에만 배포

```yaml
spec:
  nodeSelector:
    kubernetes.io/arch: amd64      # AMD64 아키텍처 노드에만
    node-type: high-mem            # 노드에 커스텀 레이블이 있을 때
```

### affinity — 세밀한 배치 제어

```yaml
spec:
  affinity:
    # 특정 노드 타입에 배포 (필수 조건)
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: node-type
            operator: In
            values: ["high-mem", "standard"]   # 둘 중 하나에 배포

    # 같은 앱의 Pod끼리 다른 노드에 분산 (고가용성)
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100                # 선호도 가중치
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: myapp           # app=myapp Pod와
          topologyKey: kubernetes.io/hostname  # 다른 노드(hostname)에 배치 선호
```

> **고가용성 팁:** podAntiAffinity로 같은 앱의 Pod를 다른 노드에 배치하면, 노드 한 대가 다운돼도 서비스가 계속됩니다.

---

## 자주 하는 실수

**실수 1: Deployment에서 selector와 template 레이블 불일치**
```yaml
# 잘못된 예
spec:
  selector:
    matchLabels:
      app: myapp      # app=myapp을 관리
  template:
    metadata:
      labels:
        app: my-app   # ❌ 하이픈 차이 — Deployment가 Pod를 찾지 못함
```

**실수 2: livenessProbe 설정이 너무 빡빡해서 계속 재시작**
```yaml
# 잘못된 예 — Spring Boot는 기동에 30초 이상 걸릴 수 있음
livenessProbe:
  initialDelaySeconds: 10    # ❌ 10초 안에 기동 안 되면 재시작 반복
  failureThreshold: 1        # ❌ 한 번만 실패해도 재시작

# 올바른 예 — startupProbe로 기동 시간 확보
startupProbe:
  failureThreshold: 30        # ✅ 최대 300초 기동 시간 허용
  periodSeconds: 10
```

**실수 3: resources를 설정하지 않아서 OOMKilled**
```yaml
# 반드시 설정하세요
resources:
  requests:
    memory: "512Mi"   # 최소 보장 메모리
    cpu: "500m"
  limits:
    memory: "1Gi"     # 초과 시 OOMKilled
    cpu: "1000m"
```
