---
title: "HPA와 리소스 관리"
order: 8
---

## 리소스 관리가 왜 중요한가

쿠버네티스 클러스터는 여러 앱이 노드(서버)를 공유합니다. 한 앱이 리소스를 마음껏 쓰면 다른 앱이 죽을 수 있습니다. 따라서 각 Pod가 사용할 리소스의 최소량과 최대량을 설정해야 합니다.

**비유:** 공동 사무실에서 각자 책상(requests)과 창고(limits)를 배정받습니다. 내 창고보다 더 많은 짐(메모리)을 들이면 강제로 짐을 빼야 합니다(OOMKilled).

---

## CPU와 메모리 단위

```yaml
resources:
  requests:
    memory: "512Mi"   # 최소 보장 메모리 (스케줄링 기준)
    cpu: "500m"       # 최소 보장 CPU (0.5 코어)
  limits:
    memory: "1Gi"     # 최대 사용 메모리 (초과 시 OOMKilled = 컨테이너 재시작)
    cpu: "1000m"      # 최대 사용 CPU (초과 시 스로틀링, 종료 안 됨)
```

**CPU 단위:**
- `1` = 1 vCPU 코어
- `500m` = 0.5 코어 (m = millicores, 1000m = 1 코어)
- `100m` = 0.1 코어

**메모리 단위:**
- `Mi` = MiB (1024 × 1024 바이트) — 1024 기반
- `Gi` = GiB — 1024 기반
- `M` = MB (1000 × 1000 바이트) — 1000 기반 (잘 안 씀)

**CPU vs 메모리 초과 시 동작 차이:**

| | CPU 초과 | 메모리 초과 |
|---|---------|-----------|
| 동작 | 스로틀링 (느려짐) | OOMKilled (재시작) |
| 영향 | 성능 저하 | 서비스 중단 |
| 복구 | 자동 회복 | Pod 재시작 필요 |

---

## QoS 클래스 — Pod 우선순위

쿠버네티스는 리소스 설정에 따라 Pod에 우선순위를 자동으로 부여합니다. 노드 자원이 부족해지면 우선순위 낮은 Pod부터 종료됩니다.

| QoS 클래스 | 조건 | 노드 압박 시 |
|-----------|------|------------|
| Guaranteed | requests == limits (모든 컨테이너) | 가장 마지막에 종료 |
| Burstable | requests < limits 또는 일부 설정 | 중간에 종료 |
| BestEffort | requests/limits 미설정 | 가장 먼저 종료 |

```bash
# Pod의 QoS 클래스 확인
kubectl get pod myapp-xxx -o jsonpath='{.status.qosClass}'
```

> 프로덕션 서비스는 반드시 requests == limits로 설정해서 Guaranteed 클래스를 확보하세요.

---

## HPA (Horizontal Pod Autoscaler)

CPU나 메모리 사용량에 따라 Pod 수를 자동으로 늘리거나 줄입니다.

**비유:** 마트 계산대와 같습니다. 손님이 많으면 계산대를 더 열고(스케일 아웃), 한산하면 계산대를 닫습니다(스케일 다운).

```
트래픽 증가 → CPU 70% 초과 → HPA: Pod 3개 → 5개
트래픽 감소 → CPU 30% 이하 → HPA: Pod 5개 → 2개
```

### HPA 설정 전 준비: Metrics Server

HPA가 CPU/메모리 사용량을 알려면 Metrics Server가 필요합니다.

```bash
# minikube
minikube addons enable metrics-server

# 일반 K8s 클러스터
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# 설치 확인
kubectl top pods
kubectl top nodes
```

### 기본 HPA 설정

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
  namespace: prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp              # 어떤 Deployment를 스케일할지
  minReplicas: 2             # 최소 Pod 수 (0은 불가 — 트래픽 없을 때도 2개)
  maxReplicas: 10            # 최대 Pod 수 (무한정 늘어나지 않도록)
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70    # 평균 CPU 70% 초과 시 스케일 아웃
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80    # 평균 메모리 80% 초과 시 스케일 아웃

  # 스케일링 동작 제어
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 스케일 다운 전 5분 안정화 (급격한 축소 방지)
      policies:
      - type: Pods
        value: 2                       # 한 번에 최대 2개씩 줄임
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0   # 스케일 업은 즉시
      policies:
      - type: Percent
        value: 100                     # 한 번에 최대 현재의 100% 추가
        periodSeconds: 60
```

```bash
# HPA 상태 확인
kubectl get hpa -n prod
# NAME        REFERENCE          TARGETS         MINPODS   MAXPODS   REPLICAS
# myapp-hpa   Deployment/myapp   45%/70%         2         10        3
# TARGETS: 현재사용률/목표사용률

# 상세 이벤트 확인
kubectl describe hpa myapp-hpa -n prod
# 스케일 업/다운 히스토리와 이유 확인 가능
```

### 커스텀 메트릭 HPA (초당 요청 수 기반)

```yaml
# Prometheus Adapter 설치 후 사용
spec:
  metrics:
  # Pod당 초당 HTTP 요청 수 기반 스케일링
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second    # Prometheus에서 가져온 메트릭
      target:
        type: AverageValue
        averageValue: "1000"              # Pod당 초당 1000 요청이 기준

  # 외부 메트릭 (SQS 큐 길이 등)
  - type: External
    external:
      metric:
        name: sqs_queue_depth
        selector:
          matchLabels:
            queue: order-queue
      target:
        type: AverageValue
        averageValue: "100"               # 큐 길이 100 기준
```

---

## VPA (Vertical Pod Autoscaler)

HPA가 Pod 개수를 조정한다면, VPA는 각 Pod의 requests/limits를 자동으로 조정합니다.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-vpa
  namespace: prod
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Off"       # Off: 추천값만 계산, 실제 변경 안 함
    # updateMode: "Initial" # 새 Pod 생성 시만 적용
    # updateMode: "Auto"    # 자동 적용 (Pod 재시작 발생)
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 4000m
        memory: 4Gi
```

```bash
# VPA 추천값 확인
kubectl describe vpa myapp-vpa -n prod
# CONTAINER NAME  LOWER BOUND   TARGET     UPPER BOUND
# app             200m / 256Mi  500m/512Mi  2000m/2Gi
```

> HPA와 VPA를 동시에 CPU 기반으로 사용하면 충돌이 발생합니다. VPA는 `Off` 모드로 추천값 참고용으로만 쓰고, 스케일링은 HPA로 하세요.

---

## LimitRange — 네임스페이스 기본 리소스 설정

resources를 설정하지 않은 Pod에 기본값을 적용하고, 최대/최소값을 제한합니다.

```yaml
# limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: prod
spec:
  limits:
  - type: Container
    default:                # requests/limits 미설정 시 자동 적용
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:         # requests 미설정 시 자동 적용
      cpu: "100m"
      memory: "128Mi"
    max:                    # 이 이상 설정 불가 (초과 시 Pod 생성 거부)
      cpu: "4"
      memory: "8Gi"
    min:                    # 이 이하 설정 불가
      cpu: "50m"
      memory: "64Mi"
```

---

## ResourceQuota — 네임스페이스 총량 제한

팀별로 네임스페이스를 사용할 때, 특정 팀이 클러스터 자원을 독차지하지 못하도록 제한합니다.

```yaml
# resourcequota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: prod-quota
  namespace: prod
spec:
  hard:
    # CPU 총량 제한
    requests.cpu: "20"         # 네임스페이스 전체 CPU 요청 합계 최대 20코어
    limits.cpu: "40"
    # 메모리 총량 제한
    requests.memory: "40Gi"
    limits.memory: "80Gi"
    # 오브젝트 수 제한
    pods: "100"                # 최대 Pod 100개
    services: "30"
    services.loadbalancers: "5"  # LoadBalancer 타입 Service 최대 5개 (비용 제한)
    persistentvolumeclaims: "20"
    configmaps: "50"
    secrets: "50"
```

```bash
# ResourceQuota 사용 현황 확인
kubectl describe resourcequota prod-quota -n prod
# Resource                Used    Hard
# --------                ----    ----
# limits.cpu              8       40
# limits.memory           16Gi    80Gi
# pods                    24      100
```

---

## PodDisruptionBudget — 노드 유지보수 시 최소 가용성 보장

노드 유지보수(kubectl drain)나 클러스터 업그레이드 시, 최소한의 Pod는 항상 실행되도록 보장합니다.

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
  namespace: prod
spec:
  minAvailable: 2         # 항상 최소 2개 Pod 실행 유지
  # maxUnavailable: 1     # 또는 최대 1개까지만 중단 허용
  selector:
    matchLabels:
      app: myapp
```

```bash
# 노드 유지보수 시 (PDB 조건 만족해야 drain 진행)
kubectl drain worker-1 --ignore-daemonsets --delete-emptydir-data

# PDB 상태 확인
kubectl get pdb -n prod
# NAME        MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS
# myapp-pdb   2               N/A               1
```

---

## 리소스 모니터링

```bash
# 실시간 리소스 사용량
kubectl top pods -n prod
# NAME                    CPU(cores)   MEMORY(bytes)
# myapp-7d6b4f8c4f-xkj2p  250m         445Mi

# CPU 사용량 높은 순서로 정렬
kubectl top pods -n prod --sort-by=cpu

# 메모리 사용량 높은 순서로 정렬
kubectl top pods -n prod --sort-by=memory

# 노드 리소스 사용량
kubectl top nodes

# 노드 상세 리소스 현황
kubectl describe node worker-1 | grep -A 20 "Allocated resources"
# Resource           Requests       Limits
# --------           --------       ------
# cpu                4250m (53%)    8000m (100%)
# memory             8640Mi (54%)   16384Mi (102%)
```

---

## 실전 리소스 설정 가이드

Spring Boot 앱의 일반적인 리소스 설정 예시:

```yaml
resources:
  requests:
    # JVM 최소 메모리 + OS 여유분 고려
    memory: "512Mi"    # JVM 힙 256Mi + 오버헤드 256Mi
    cpu: "250m"        # 0.25 코어 (정상 부하 기준)
  limits:
    memory: "1Gi"      # 최대 메모리 (OOM 방지, requests의 2배 정도)
    cpu: "1000m"       # 1 코어 (피크 처리용)
```

> JVM 앱은 메모리 사용량이 크므로 `JAVA_OPTS`로 힙 크기를 명시하세요:
> `-Xms256m -Xmx512m` 또는 컨테이너 메모리 limits의 75% 이하로 설정
