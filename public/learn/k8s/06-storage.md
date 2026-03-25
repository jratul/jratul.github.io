---
title: "스토리지 (PV, PVC, StorageClass)"
order: 6
---

## 왜 영구 스토리지가 필요한가

Pod는 삭제되면 컨테이너 내부의 모든 데이터가 사라집니다. 그런데 데이터베이스, 파일 업로드 저장소 등은 Pod가 재시작돼도 데이터가 유지돼야 합니다.

**비유:**
- Pod는 임시 사무실입니다. 직원(컨테이너)이 퇴근하면 책상 위 메모는 사라집니다.
- PersistentVolume(PV)는 외부 창고입니다. 영구 보관해야 할 물건은 이 창고에 넣습니다.
- PersistentVolumeClaim(PVC)는 창고 사용 신청서입니다. "10GB짜리 창고 공간 주세요"라고 요청합니다.

```
PersistentVolume (PV)        ← 실제 스토리지 (관리자가 생성 또는 자동 프로비저닝)
        ↑ 바인딩
PersistentVolumeClaim (PVC)  ← 스토리지 요청 (개발자가 작성)
        ↑ 마운트
Pod (볼륨으로 접근)
```

---

## PersistentVolume (PV)

실제 스토리지 리소스를 나타냅니다. 관리자가 미리 생성하거나 StorageClass로 자동 생성합니다.

```yaml
# pv.yaml — 로컬 개발/테스트용 PV (프로덕션에서는 hostPath 사용 금지)
apiVersion: v1
kind: PersistentVolume
metadata:
  name: postgres-pv
spec:
  capacity:
    storage: 10Gi                         # 스토리지 용량
  accessModes:
  - ReadWriteOnce                         # 단일 노드에서만 읽기/쓰기
  persistentVolumeReclaimPolicy: Retain   # PVC 삭제 후 PV 데이터 보존
  storageClassName: standard              # StorageClass 이름
  hostPath:                               # 노드의 로컬 경로 (개발용)
    path: /data/postgres
```

### AccessMode — 접근 방식

| 모드 | 약어 | 설명 | 사용 예 |
|------|------|------|---------|
| ReadWriteOnce | RWO | 단일 노드에서 읽기/쓰기 | DB, 단일 인스턴스 앱 |
| ReadOnlyMany | ROX | 여러 노드에서 읽기 전용 | 설정 파일, 공유 데이터 |
| ReadWriteMany | RWX | 여러 노드에서 읽기/쓰기 | NFS, 공유 파일 스토리지 |
| ReadWriteOncePod | RWOP | 단일 Pod만 읽기/쓰기 | 독점 접근 필요 시 |

### ReclaimPolicy — PVC 삭제 후 처리

| 정책 | 설명 |
|------|------|
| Retain | PV 보존 (데이터 유지, 수동 정리 필요) |
| Delete | PV와 외부 스토리지 삭제 |
| Recycle | 데이터 삭제 후 재사용 (deprecated) |

---

## PersistentVolumeClaim (PVC)

개발자가 작성하는 스토리지 요청서입니다.

```yaml
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: prod
spec:
  accessModes:
  - ReadWriteOnce               # PV의 accessModes와 일치해야 함
  resources:
    requests:
      storage: 10Gi             # 요청하는 용량
  storageClassName: standard    # 어떤 StorageClass로 프로비저닝할지
```

```bash
# PVC 상태 확인
kubectl get pvc -n prod
# NAME           STATUS   VOLUME        CAPACITY   ACCESS MODES   STORAGECLASS
# postgres-pvc   Bound    postgres-pv   10Gi       RWO            standard

# STATUS가 Pending이면 매칭되는 PV가 없거나 StorageClass 문제
kubectl describe pvc postgres-pvc -n prod
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
    - name: POSTGRES_DB
      value: mydb
    volumeMounts:
    - name: postgres-data
      mountPath: /var/lib/postgresql/data   # PostgreSQL 데이터 디렉토리

  volumes:
  - name: postgres-data
    persistentVolumeClaim:
      claimName: postgres-pvc              # 위에서 만든 PVC 이름
```

---

## StorageClass — 동적 프로비저닝

매번 관리자가 PV를 수동으로 만들 필요 없이, PVC를 만들면 자동으로 PV를 프로비저닝합니다.

**비유:** 창고 자동 대여 서비스입니다. "10GB 창고 주세요"라고 신청하면 자동으로 창고가 만들어집니다.

```yaml
# storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"  # 기본 StorageClass로 설정
provisioner: ebs.csi.aws.com        # AWS EBS CSI 드라이버 (실제 스토리지 생성)
parameters:
  type: gp3                          # EBS 볼륨 타입
  iops: "3000"                       # IOPS 설정
  throughput: "125"                  # 처리량 (MB/s)
reclaimPolicy: Delete                # PVC 삭제 시 PV도 삭제
allowVolumeExpansion: true           # 볼륨 확장 허용 (용량 늘리기)
```

### 주요 클라우드별 StorageClass

```yaml
# AWS EBS gp3
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: aws-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"                  # 암호화 활성화
reclaimPolicy: Delete
allowVolumeExpansion: true

---
# GCP Persistent Disk
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gcp-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
reclaimPolicy: Delete
allowVolumeExpansion: true

---
# Azure Disk
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-ssd
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
reclaimPolicy: Delete
allowVolumeExpansion: true
```

```bash
# StorageClass 목록 확인
kubectl get storageclass
# NAME                 PROVISIONER             RECLAIMPOLICY   DEFAULT
# standard (default)   rancher.io/local-path   Delete          true
# fast-ssd             ebs.csi.aws.com         Delete          false
```

---

## StatefulSet — 상태가 있는 앱 관리

데이터베이스처럼 상태가 있는 앱을 위한 오브젝트입니다. Deployment와 달리:
- **고정된 Pod 이름**: `postgres-0`, `postgres-1`, `postgres-2`
- **각 Pod마다 독립적인 PVC 자동 생성**
- **순서대로 시작/종료**: 0→1→2 (시작), 2→1→0 (종료)
- **안정적인 네트워크 ID**: `postgres-0.postgres-headless.prod.svc.cluster.local`

```yaml
# Headless Service — StatefulSet에 반드시 필요
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
  namespace: prod
spec:
  clusterIP: None       # Headless: 각 Pod IP를 직접 반환
  selector:
    app: postgres
  ports:
  - port: 5432
    name: postgres
---
# StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: prod
spec:
  serviceName: postgres-headless    # Headless Service 이름 (DNS 생성에 사용)
  replicas: 1                       # 개발용 단일 인스턴스
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
        - name: POSTGRES_DB
          value: mydb
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata   # 데이터 디렉토리 지정
        ports:
        - containerPort: 5432
          name: postgres
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"

  # 각 Pod마다 독립적인 PVC 자동 생성
  # postgres-0 → data-postgres-0
  # postgres-1 → data-postgres-1
  volumeClaimTemplates:
  - metadata:
      name: postgres-data           # PVC 이름 접두사
    spec:
      accessModes: [ReadWriteOnce]
      storageClassName: standard    # 또는 fast-ssd
      resources:
        requests:
          storage: 20Gi
```

```bash
# StatefulSet 확인
kubectl get statefulset -n prod
# NAME       READY   AGE
# postgres   1/1     5m

# 자동 생성된 PVC 확인
kubectl get pvc -n prod
# NAME                   STATUS   VOLUME                CAPACITY
# postgres-data-postgres-0   Bound    pvc-xxxx-yyyy         20Gi

# 특정 Pod에 직접 접속
kubectl exec -it postgres-0 -n prod -- psql -U postgres mydb
```

---

## EmptyDir — 임시 공유 볼륨

Pod 안의 컨테이너들이 파일을 공유할 때 사용합니다. Pod 삭제 시 데이터가 사라집니다.

```yaml
spec:
  containers:
  - name: app
    image: myapp:1.0.0
    volumeMounts:
    - name: shared-data
      mountPath: /tmp/shared       # 앱이 파일을 쓰는 경로

  - name: sidecar
    image: busybox:latest
    volumeMounts:
    - name: shared-data
      mountPath: /shared           # 사이드카가 파일을 읽는 경로 (같은 볼륨)

  volumes:
  - name: shared-data
    emptyDir: {}                   # 디스크 기반 임시 볼륨

  - name: fast-cache
    emptyDir:
      medium: Memory               # 메모리 기반 (더 빠르지만 재시작 시 소멸)
      sizeLimit: 256Mi             # 메모리 사용량 제한
```

---

## 볼륨 스냅샷과 백업

```yaml
# 볼륨 스냅샷 생성 (특정 시점 백업)
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot-20241225
  namespace: prod
spec:
  volumeSnapshotClassName: csi-aws-vsc    # 스냅샷 클래스
  source:
    persistentVolumeClaimName: postgres-data-postgres-0   # 백업할 PVC

---
# 스냅샷에서 새 PVC 복원
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-restored
  namespace: prod
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 20Gi
  dataSource:
    name: postgres-snapshot-20241225
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

---

## 볼륨 용량 늘리기

StorageClass에 `allowVolumeExpansion: true`가 설정된 경우, 운영 중에도 볼륨을 확장할 수 있습니다.

```bash
# PVC 편집으로 용량 늘리기
kubectl edit pvc postgres-data-postgres-0 -n prod
# storage: 20Gi → 50Gi로 변경

# 변경 확인
kubectl get pvc postgres-data-postgres-0 -n prod
# STATUS가 Bound이고 CAPACITY가 늘어있으면 성공

# 일부 파일시스템은 Pod 재시작 필요
kubectl delete pod postgres-0 -n prod   # StatefulSet이 자동으로 재생성
```

---

## 트러블슈팅

**PVC가 Pending 상태일 때:**
```bash
kubectl describe pvc postgres-pvc -n prod
# Events에서 원인 확인:
# - no persistent volumes available → PV 없음, StorageClass 확인
# - can't bind since no storage class is set → storageClassName 확인
```

**Pod가 볼륨을 마운트하지 못할 때:**
```bash
kubectl describe pod postgres-0 -n prod
# Events에서 원인 확인:
# - couldn't find key PGDATA → volumeMounts 경로 확인
# - Multi-Attach error → RWO 볼륨이 이미 다른 노드에 마운트됨 → Pod 강제 삭제
```
