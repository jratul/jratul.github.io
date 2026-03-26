---
title: "DaemonSet과 StatefulSet 심화"
order: 14
---

## DaemonSet이란 — "모든 노드에 하나씩"

DaemonSet은 클러스터의 모든 노드(또는 선택한 노드)에 Pod를 1개씩 자동으로 배포합니다. 새 노드가 추가되면 자동으로 Pod가 생성되고, 노드가 제거되면 Pod도 함께 삭제됩니다.

경비원에 비유하면 이렇습니다. 건물(클러스터)에 여러 층(노드)이 있을 때 각 층마다 경비원(DaemonSet Pod)을 배치하는 것과 같습니다. 새 층이 생기면 자동으로 경비원이 배치됩니다.

```
클러스터 구조:
Node1:  [log-collector]  [node-exporter]  [network-plugin]  [app Pod들...]
Node2:  [log-collector]  [node-exporter]  [network-plugin]  [app Pod들...]
Node3:  [log-collector]  [node-exporter]  [network-plugin]  [app Pod들...]

← DaemonSet Pod: 각 노드에 1개씩 항상 존재
```

### 주요 사용 사례

```
로그 수집 에이전트   — Fluentd, Promtail (각 노드의 /var/log 수집)
모니터링 에이전트    — node-exporter (CPU, 메모리, 디스크 메트릭)
                     Datadog Agent, New Relic Agent
네트워크 플러그인    — CNI (Calico, Flannel) — Pod 네트워크 담당
스토리지 플러그인    — CSI 드라이버 (스토리지 마운트 처리)
보안 에이전트        — Falco (컨테이너 런타임 보안 모니터링)
```

---

## DaemonSet 작성 — Promtail 예시

Promtail은 각 노드의 로그를 Loki(로그 저장소)로 전송하는 에이전트입니다. 모든 노드에서 실행돼야 하므로 DaemonSet이 적합합니다.

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
      maxUnavailable: 1            # 한 번에 1개 노드씩 업데이트 (로그 수집 공백 최소화)
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      tolerations:
      # 컨트롤 플레인 노드에도 배포 (일반적으로 NoSchedule taint 있음)
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule
      containers:
      - name: promtail
        image: grafana/promtail:latest
        args:
        - -config.file=/etc/promtail/config.yml
        volumeMounts:
        - name: varlog
          mountPath: /var/log       # 노드의 /var/log를 컨테이너에서 읽음
          readOnly: true
        - name: docker-containers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: config
          mountPath: /etc/promtail
        resources:
          requests:
            memory: "64Mi"          # 로그 수집기는 가볍게 유지
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
      volumes:
      - name: varlog
        hostPath:
          path: /var/log            # 실제 노드의 파일시스템 마운트
      - name: docker-containers
        hostPath:
          path: /var/lib/docker/containers
      - name: config
        configMap:
          name: promtail-config     # Promtail 설정 ConfigMap
```

> 핵심 포인트: `hostPath` 볼륨은 노드의 실제 파일시스템을 컨테이너에서 접근할 수 있게 합니다. DaemonSet에서 자주 쓰이는 패턴입니다.

### 특정 노드에만 배포하기

```yaml
spec:
  template:
    spec:
      nodeSelector:
        node-type: gpu             # "node-type=gpu" 레이블이 있는 노드에만 배포
```

GPU 드라이버 모니터링처럼 특정 하드웨어에서만 필요한 에이전트에 유용합니다.

---

## StatefulSet 심화 — 상태 있는 앱을 위한 특별 배포

Deployment와 StatefulSet의 가장 큰 차이는 "개성(identity)"입니다.

Deployment의 Pod는 모두 동일하고 교체 가능합니다. 편의점 아르바이트생처럼 누가 와도 같은 일을 합니다. 반면 StatefulSet의 Pod는 각자 고유한 이름과 저장소를 갖습니다. 특정 서버 역할(Primary DB, 특정 샤드)이 있는 전문 직원과 같습니다.

```
StatefulSet의 특징:
1. 고정된 Pod 이름     mydb-0, mydb-1, mydb-2 (랜덤 해시 없음)
2. 순서 있는 시작      mydb-0 → mydb-1 → mydb-2 (모두 준비 후 다음 시작)
3. 순서 있는 종료      mydb-2 → mydb-1 → mydb-0 (역순으로 종료)
4. 안정적인 DNS        mydb-0.mydb-svc.prod.svc.cluster.local (고정 주소)
5. Pod별 독립 PVC      data-mydb-0, data-mydb-1, data-mydb-2 (각자의 데이터)
```

### 언제 StatefulSet을 쓸까?

```
StatefulSet 필요:
- PostgreSQL, MySQL 클러스터 (Primary가 고정 이름 필요)
- Redis Cluster (노드 간 gossip 통신에 고정 주소 필요)
- Kafka, ZooKeeper (순서 있는 노드 ID 필요)
- Elasticsearch (각 노드가 특정 샤드 담당)

Deployment로 충분:
- 웹 서버, API 서버 (상태 없음, 어느 Pod나 동일)
- 워커 프로세스 (큐에서 작업을 가져와 처리)
```

---

## StatefulSet 작성 — Redis Cluster 예시

Redis Cluster는 마스터 3개 + 슬레이브 3개로 구성합니다. 각 노드가 고유한 역할과 데이터를 갖기 때문에 StatefulSet이 적합합니다.

```yaml
# Headless Service: StatefulSet이 DNS 이름을 갖으려면 반드시 필요
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster
  namespace: prod
spec:
  clusterIP: None                   # Headless = IP 없음, DNS로만 접근
  selector:
    app: redis-cluster
  ports:
  - port: 6379
    name: redis
  - port: 16379
    name: gossip                    # Redis Cluster 노드 간 통신 포트
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: prod
spec:
  serviceName: redis-cluster        # 반드시 위 Headless Service 이름 지정
  replicas: 6                       # 마스터 3 + 슬레이브 3
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
            --cluster-enabled yes \                # Redis Cluster 모드 활성화
            --cluster-config-file /data/nodes.conf \  # 클러스터 노드 정보 저장
            --cluster-node-timeout 5000 \          # 5초 응답 없으면 장애 판정
            --appendonly yes \                     # AOF 지속성 활성화
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
          mountPath: /data            # 각 Pod의 독립 볼륨에 데이터 저장
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
  # volumeClaimTemplates: 각 Pod마다 자동으로 PVC를 생성
  volumeClaimTemplates:
  - metadata:
      name: redis-data               # Pod 이름에 따라 data-redis-cluster-0, -1, -2...
    spec:
      accessModes: [ReadWriteOnce]   # 하나의 노드에만 마운트 (일반적인 DB 설정)
      storageClassName: fast-ssd     # SSD 스토리지 클래스 사용
      resources:
        requests:
          storage: 5Gi               # 각 Pod마다 5GB
```

각 Pod의 DNS 이름은 자동으로 생성됩니다:
- `redis-cluster-0.redis-cluster.prod.svc.cluster.local`
- `redis-cluster-1.redis-cluster.prod.svc.cluster.local`
- ... (패턴: `{pod-name}.{service-name}.{namespace}.svc.cluster.local`)

---

## StatefulSet 업데이트 전략 — 카나리 배포

StatefulSet의 `partition` 옵션을 사용하면 일부 Pod만 먼저 업데이트해볼 수 있습니다.

```yaml
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 2    # index >= 2 인 Pod만 업데이트 (redis-cluster-2~5)
      # partition: 0 → 모든 Pod 업데이트
      # partition: 3 → redis-cluster-3, 4, 5만 업데이트
```

카나리 배포 절차:
1. `partition: 5` → redis-cluster-5만 새 버전으로 업데이트
2. 5번 노드 정상 동작 확인
3. `partition: 3` → 3, 4, 5번 업데이트
4. 이상 없으면 `partition: 0` → 전체 업데이트

### 스케일 순서

```bash
# 스케일 업: mydb-0이 준비된 후 mydb-1 시작, mydb-1이 준비된 후 mydb-2 시작
kubectl scale statefulset mydb --replicas=3

# 스케일 다운: mydb-2 먼저 삭제, 완료 후 mydb-1 삭제 (mydb-0은 마지막)
kubectl scale statefulset mydb --replicas=1
```

순서를 지키는 이유: DB 클러스터에서 Primary(mydb-0)는 마지막에 종료해야 데이터 손실을 막을 수 있습니다.

---

## Taints와 Tolerations — 노드 선택 심화

### Taint란 무엇인가

Taint는 노드에 붙이는 "경고 표시"입니다. "이 노드는 특별한 용도이니 일반 Pod는 오지 마세요"라는 의미입니다.

공사장 울타리에 비유하면, Taint는 울타리이고 Toleration은 공사 관계자 출입증입니다.

```bash
# 노드에 Taint 추가
kubectl taint nodes gpu-node-1 gpu=true:NoSchedule

# Taint 효과 종류:
# NoSchedule     — toleration 없는 Pod는 이 노드에 배치 안 됨
# PreferNoSchedule — 가급적 배치 안 함 (다른 노드 없으면 배치됨)
# NoExecute      — 기존에 실행 중인 Pod도 제거 + 새 Pod도 배치 안 됨

# Taint 제거 (끝에 - 추가)
kubectl taint nodes gpu-node-1 gpu=true:NoSchedule-
```

### Toleration이란 무엇인가

Toleration은 Pod에 설정하는 "나는 이 Taint를 감수하겠다"는 허가증입니다.

```yaml
spec:
  tolerations:
  # gpu=true:NoSchedule taint를 가진 노드에 배치 허용
  - key: "gpu"
    operator: "Equal"
    value: "true"
    effect: "NoSchedule"

  # 컨트롤 플레인 노드에도 배치 허용 (DaemonSet에서 자주 사용)
  - key: "node-role.kubernetes.io/control-plane"
    operator: "Exists"              # value 무관, key만 존재하면 됨
    effect: "NoSchedule"
```

### GPU 전용 노드 설정 패턴

머신러닝 학습 작업처럼 GPU가 필요한 Pod만 GPU 노드에 배치하는 패턴입니다.

```yaml
# 노드 설정: kubectl taint nodes gpu-node gpu=true:NoSchedule
# Pod 설정:
spec:
  tolerations:
  - key: gpu
    operator: Equal
    value: "true"
    effect: NoSchedule              # Taint를 감수
  nodeSelector:
    accelerator: nvidia-gpu         # 추가로 이 레이블의 노드만 선택
```

Taint + Toleration만으로는 "GPU 노드에 배치될 수 있다"는 의미입니다. `nodeSelector`나 `nodeAffinity`를 함께 써야 "반드시 GPU 노드에 배치"가 됩니다.

---

## Deployment vs StatefulSet vs DaemonSet vs Job 비교

| | Deployment | StatefulSet | DaemonSet | Job |
|--|------------|-------------|-----------|-----|
| Pod 이름 | 랜덤 (myapp-abc123) | 고정 (mydb-0) | 노드당 1개 | 랜덤 |
| 스케일링 | 자유 (동시에 모두) | 순서 있음 (하나씩) | 노드 수 따라감 | 완료 후 종료 |
| 스토리지 | 공유 또는 없음 | Pod별 독립 PVC | 호스트 볼륨 | 임시 |
| 재시작 | 항상 | 항상 | 항상 | 성공 시 종료 |
| 사용 사례 | 웹 서버, API | DB, 캐시 클러스터 | 에이전트, 플러그인 | 배치, 마이그레이션 |
| 업데이트 | 빠름 (병렬) | 느림 (순서 있음) | 롤링 | 해당 없음 |

---

## 흔한 실수들

```
실수 1: StatefulSet에 Headless Service 미설정
→ Pod가 DNS 이름을 가질 수 없어 클러스터 멤버십 구성 불가
→ spec.serviceName과 Headless Service(clusterIP: None) 반드시 필요

실수 2: StatefulSet PVC 삭제 후 재생성 시 데이터 손실
→ StatefulSet을 삭제해도 PVC는 자동 삭제 안 됨 (의도적 설계)
→ kubectl delete pvc data-mydb-0 으로 수동 삭제 필요

실수 3: DaemonSet에 resources 미설정
→ 노드의 모든 리소스를 잠식할 수 있음
→ 로그 수집기 메모리 누수로 노드 전체 다운

실수 4: Taint 없이 nodeSelector만 사용
→ GPU 노드에 일반 Pod도 배치될 수 있음
→ GPU 노드를 전용으로 쓰려면 Taint 필수
```
