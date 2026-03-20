---
title: "DaemonSet과 StatefulSet 심화"
order: 14
---

## DaemonSet

**모든 노드(또는 특정 노드)에 Pod를 1개씩 배포**. 노드가 추가되면 자동으로 Pod가 생성됨.

```
Node1: [log-collector] [node-exporter] [network-plugin]
Node2: [log-collector] [node-exporter] [network-plugin]
Node3: [log-collector] [node-exporter] [network-plugin]
```

### 주요 사용 사례
- 로그 수집 에이전트 (Fluentd, Promtail)
- 모니터링 에이전트 (node-exporter, Datadog)
- 네트워크 플러그인 (CNI)
- 스토리지 플러그인

---

### DaemonSet 작성

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: log-collector
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1    # 한 번에 1개 노드씩 업데이트
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      tolerations:
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule   # 컨트롤 플레인 노드에도 배포
      containers:
      - name: promtail
        image: grafana/promtail:latest
        args:
        - -config.file=/etc/promtail/config.yml
        volumeMounts:
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: docker-containers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: config
          mountPath: /etc/promtail
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: docker-containers
        hostPath:
          path: /var/lib/docker/containers
      - name: config
        configMap:
          name: promtail-config
```

### 특정 노드에만 배포

```yaml
spec:
  template:
    spec:
      nodeSelector:
        node-type: gpu       # GPU 노드에만 배포
```

---

## StatefulSet 심화

Deployment와 달리 StatefulSet은:
- **고정된 Pod 이름**: `mydb-0`, `mydb-1`, `mydb-2`
- **순서 있는 시작/종료**: 0 → 1 → 2 (시작), 2 → 1 → 0 (종료)
- **안정적인 네트워크 ID**: Headless Service로 `mydb-0.mydb-svc` DNS 고정
- **Pod별 독립 PVC**: `data-mydb-0`, `data-mydb-1`, `data-mydb-2`

---

### StatefulSet 작성 (Redis Cluster 예시)

```yaml
# Headless Service (StatefulSet 필수)
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster
  namespace: prod
spec:
  clusterIP: None       # Headless
  selector:
    app: redis-cluster
  ports:
  - port: 6379
    name: redis
  - port: 16379
    name: gossip
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: prod
spec:
  serviceName: redis-cluster    # Headless Service 이름
  replicas: 6                   # Redis Cluster: 마스터 3 + 슬레이브 3
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command: ["/bin/sh", "-c"]
        args:
        - |
          redis-server \
            --cluster-enabled yes \
            --cluster-config-file /data/nodes.conf \
            --cluster-node-timeout 5000 \
            --appendonly yes \
            --requirepass $(REDIS_PASSWORD)
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
        ports:
        - containerPort: 6379
          name: redis
        - containerPort: 16379
          name: gossip
        volumeMounts:
        - name: redis-data
          mountPath: /data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: [ReadWriteOnce]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 5Gi
```

---

### 업데이트 전략

```yaml
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 2    # index >= 2인 Pod만 업데이트 (카나리 배포)
      # partition: 0 → 전체 업데이트
```

### 스케일 순서

```bash
# 스케일 업: mydb-0 → mydb-1 → mydb-2 순으로 생성
kubectl scale statefulset mydb --replicas=3

# 스케일 다운: mydb-2 → mydb-1 순으로 삭제 (mydb-0은 마지막)
kubectl scale statefulset mydb --replicas=1
```

---

## Taints와 Tolerations

### Taint (노드에 설정 — "이 노드는 특별함")

```bash
# 노드에 Taint 추가
kubectl taint nodes gpu-node-1 gpu=true:NoSchedule
# NoSchedule: toleration 없으면 배포 안 됨
# PreferNoSchedule: toleration 없으면 가급적 배포 안 함
# NoExecute: 기존 Pod도 제거

# Taint 제거
kubectl taint nodes gpu-node-1 gpu=true:NoSchedule-
```

### Toleration (Pod에 설정 — "나는 이 Taint를 감수함")

```yaml
spec:
  tolerations:
  - key: "gpu"
    operator: "Equal"
    value: "true"
    effect: "NoSchedule"

  - key: "node-role.kubernetes.io/control-plane"
    operator: "Exists"
    effect: "NoSchedule"
```

### 실전 패턴

```yaml
# GPU 전용 노드에만 배포
# 노드: kubectl taint nodes gpu-node gpu=true:NoSchedule
# Pod:
spec:
  tolerations:
  - key: gpu
    operator: Equal
    value: "true"
    effect: NoSchedule
  nodeSelector:
    accelerator: nvidia-gpu
```

---

## 비교 요약

| | Deployment | StatefulSet | DaemonSet | Job |
|--|------------|-------------|-----------|-----|
| Pod 이름 | 랜덤 | 고정 (name-0) | 노드당 1개 | 랜덤 |
| 스케일링 | 자유 | 순서 있음 | 노드 수 따라감 | 완료 후 종료 |
| 스토리지 | 공유 또는 없음 | Pod별 독립 PVC | 호스트 볼륨 | 임시 |
| 사용 사례 | 웹 서버, API | DB, 캐시 클러스터 | 에이전트, 플러그인 | 배치, 마이그레이션 |
