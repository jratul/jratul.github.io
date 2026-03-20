---
title: "HPA와 리소스 관리"
order: 8
---

## 리소스 요청과 제한

### requests vs limits

```yaml
spec:
  containers:
  - name: app
    resources:
      requests:
        memory: "512Mi"   # 스케줄링 시 보장되는 최소 자원
        cpu: "500m"       # 0.5 CPU 코어
      limits:
        memory: "1Gi"     # 초과 시 OOMKilled
        cpu: "1000m"      # 초과해도 종료 안 됨, 스로틀링만
```

| | requests | limits |
|---|---|---|
| CPU | 최소 보장량, 스케줄링 기준 | 초과 시 스로틀링 |
| Memory | 최소 보장량 | 초과 시 OOMKilled (컨테이너 재시작) |

### CPU 단위
- `1` = 1 vCPU/코어
- `500m` = 0.5 코어 (m = millicores)
- `100m` = 0.1 코어

### Memory 단위
- `Mi` = MiB (1024²)
- `Gi` = GiB
- `M` = MB (1000²)

---

## QoS 클래스

K8s는 리소스 설정에 따라 Pod에 우선순위를 부여합니다.

| QoS | 조건 | 노드 압박 시 |
|-----|------|------------|
| Guaranteed | requests == limits (모든 컨테이너) | 마지막에 종료 |
| Burstable | requests < limits | 중간에 종료 |
| BestEffort | requests/limits 없음 | 가장 먼저 종료 |

```bash
kubectl get pod myapp-xxx -o jsonpath='{.status.qosClass}'
```

---

## HPA (Horizontal Pod Autoscaler)

CPU/메모리 사용량에 따라 **Pod 수를 자동 조정**.

### 기본 설정

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70    # CPU 70% 초과 시 스케일 아웃
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

```bash
# Metrics Server 설치 (HPA 동작 전제)
minikube addons enable metrics-server
# 또는
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# HPA 상태 확인
kubectl get hpa
# NAME        REFERENCE          TARGETS   MINPODS   MAXPODS   REPLICAS
# myapp-hpa   Deployment/myapp   45%/70%   2         10        3

kubectl describe hpa myapp-hpa
```

### 커스텀 메트릭 (Prometheus)

```yaml
# Prometheus Adapter 설치 후
spec:
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second    # Prometheus 메트릭
      target:
        type: AverageValue
        averageValue: 1000               # Pod당 초당 1000 요청
```

---

## VPA (Vertical Pod Autoscaler)

Pod의 **requests/limits를 자동 조정** (Pod 재시작 발생).

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Auto"    # Off / Initial / Recreation / Auto
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 4
        memory: 4Gi
```

> HPA와 VPA를 CPU 기반으로 동시에 사용하면 충돌 발생. VPA는 `Off` 모드로 권장값만 조회하고 HPA로 수평 스케일링 사용 권장.

---

## LimitRange

네임스페이스 내 기본 리소스 제한 설정.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: prod
spec:
  limits:
  - type: Container
    default:              # requests/limits 미설정 시 기본값
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    max:                  # 최대값 제한
      cpu: "2"
      memory: "4Gi"
    min:                  # 최소값 제한
      cpu: "50m"
      memory: "64Mi"
```

---

## ResourceQuota

네임스페이스 전체 리소스 총량 제한.

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: prod-quota
  namespace: prod
spec:
  hard:
    requests.cpu: "10"           # 네임스페이스 전체 CPU 요청 합계
    requests.memory: "20Gi"
    limits.cpu: "20"
    limits.memory: "40Gi"
    pods: "50"                   # 최대 Pod 수
    services: "20"
    persistentvolumeclaims: "10"
```

```bash
kubectl describe resourcequota prod-quota -n prod
# Name:                   prod-quota
# Namespace:              prod
# Resource                Used    Hard
# --------                ----    ----
# limits.cpu              4       20
# limits.memory           8Gi     40Gi
# pods                    12      50
```

---

## 노드 압박 시 Pod 퇴거 (Eviction)

```yaml
# Pod Disruption Budget — 최소 실행 Pod 수 보장
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  minAvailable: 2         # 최소 2개는 항상 실행 유지
  # maxUnavailable: 1     # 또는 최대 1개까지만 중단 허용
  selector:
    matchLabels:
      app: myapp
```

노드 유지보수(`kubectl drain`) 시 PDB 조건을 만족해야만 Pod 퇴거 진행.

---

## 모니터링

```bash
# 실시간 리소스 사용량
kubectl top pods
kubectl top pods --sort-by=memory
kubectl top nodes

# 리소스 사용량 상세
kubectl describe node worker-1 | grep -A 10 "Allocated resources"
```
