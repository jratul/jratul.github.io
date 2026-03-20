---
title: "스토리지 (PV, PVC, StorageClass)"
order: 6
---

## 왜 영구 스토리지가 필요한가

Pod는 삭제되면 내부 데이터가 사라집니다. DB, 파일 저장소 등은 Pod 생명주기와 무관하게 데이터를 보존해야 합니다.

```
PersistentVolume (PV)     ← 실제 스토리지 (관리자가 생성 또는 동적 프로비저닝)
        ↑
PersistentVolumeClaim (PVC) ← 스토리지 요청 (개발자가 작성)
        ↑
Pod (볼륨 마운트)
```

---

## PersistentVolume (PV)

실제 스토리지 리소스. 관리자가 사전에 생성하거나 StorageClass로 자동 생성.

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: postgres-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
  - ReadWriteOnce           # 단일 노드에서 읽기/쓰기
  persistentVolumeReclaimPolicy: Retain   # PVC 삭제 후 PV 보존
  storageClassName: standard
  hostPath:                 # 로컬 개발용 (프로덕션에서는 사용 금지)
    path: /data/postgres
```

### AccessMode

| 모드 | 설명 | 사용 예 |
|------|------|---------|
| ReadWriteOnce (RWO) | 단일 노드 읽기/쓰기 | DB, 단일 인스턴스 앱 |
| ReadOnlyMany (ROX) | 여러 노드 읽기 전용 | 설정 파일, 공유 데이터 |
| ReadWriteMany (RWX) | 여러 노드 읽기/쓰기 | NFS, 공유 파일 스토리지 |

---

## PersistentVolumeClaim (PVC)

개발자가 스토리지를 요청하는 오브젝트.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard    # StorageClass 지정
```

```bash
kubectl get pvc
# NAME           STATUS   VOLUME        CAPACITY   ACCESS MODES
# postgres-pvc   Bound    postgres-pv   10Gi       RWO
```

---

## Pod에서 PVC 사용

```yaml
spec:
  containers:
  - name: postgres
    image: postgres:16-alpine
    env:
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: POSTGRES_PASSWORD
    volumeMounts:
    - name: postgres-data
      mountPath: /var/lib/postgresql/data

  volumes:
  - name: postgres-data
    persistentVolumeClaim:
      claimName: postgres-pvc     # PVC 이름 참조
```

---

## StorageClass (동적 프로비저닝)

PVC 생성 시 자동으로 PV를 프로비저닝. 관리자가 PV를 미리 만들 필요 없음.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs   # AWS EBS
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
reclaimPolicy: Delete                 # PVC 삭제 시 PV도 삭제
allowVolumeExpansion: true            # 볼륨 확장 허용
```

```bash
# 기본 StorageClass 확인
kubectl get storageclass
# NAME                 PROVISIONER             RECLAIMPOLICY
# standard (default)   rancher.io/local-path   Delete
# fast-ssd             kubernetes.io/aws-ebs   Delete
```

### 주요 클라우드 StorageClass

```yaml
# AWS EBS (gp3)
provisioner: ebs.csi.aws.com
parameters:
  type: gp3

# GCP Persistent Disk
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd

# Azure Disk
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
```

---

## StatefulSet

DB처럼 상태가 있는 애플리케이션을 위한 오브젝트. Deployment와 달리:
- Pod에 고정된 이름 부여 (postgres-0, postgres-1, ...)
- 각 Pod마다 독립적인 PVC 자동 생성
- 순서대로 시작/종료

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres         # Headless Service 이름
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: POSTGRES_PASSWORD
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data

  volumeClaimTemplates:         # 각 Pod마다 PVC 자동 생성
  - metadata:
      name: postgres-data
    spec:
      accessModes: [ReadWriteOnce]
      storageClassName: standard
      resources:
        requests:
          storage: 10Gi
```

---

## EmptyDir (임시 공유 볼륨)

Pod 내 컨테이너 간 파일 공유. Pod 삭제 시 데이터 소멸.

```yaml
spec:
  containers:
  - name: app
    volumeMounts:
    - name: tmp-dir
      mountPath: /tmp
  - name: sidecar
    volumeMounts:
    - name: tmp-dir
      mountPath: /shared

  volumes:
  - name: tmp-dir
    emptyDir: {}
  - name: tmpfs-vol
    emptyDir:
      medium: Memory    # 메모리 기반 (빠르지만 Pod 재시작 시 소멸)
      sizeLimit: 256Mi
```

---

## 볼륨 스냅샷

```yaml
# 스냅샷 생성
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot
spec:
  volumeSnapshotClassName: csi-aws-vsc
  source:
    persistentVolumeClaimName: postgres-pvc

# 스냅샷에서 복원
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-restored
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 10Gi
  dataSource:
    name: postgres-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```
