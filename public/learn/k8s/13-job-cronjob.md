---
title: "Job과 CronJob"
order: 13
---

## Job

한 번 실행하고 완료되는 작업. Pod가 성공적으로 종료될 때까지 재실행.

```
Deployment: 계속 실행 (웹 서버)
Job:        한 번 실행 후 완료 (DB 마이그레이션, 배치)
CronJob:    주기적으로 실행 (정산, 리포트 생성)
```

---

## 기본 Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  namespace: prod
spec:
  completions: 1          # 성공 횟수 (기본 1)
  parallelism: 1          # 동시 실행 Pod 수
  backoffLimit: 3         # 실패 시 재시도 횟수
  activeDeadlineSeconds: 600   # 최대 실행 시간 (초)
  ttlSecondsAfterFinished: 3600  # 완료 후 자동 삭제 (초)
  template:
    spec:
      restartPolicy: OnFailure   # Never 또는 OnFailure (Always 불가)
      containers:
      - name: migration
        image: ghcr.io/myorg/myapp:latest
        command: ["java", "-jar", "app.jar", "--spring.batch.job.enabled=true"]
        envFrom:
        - configMapRef:
            name: myapp-config
        - secretRef:
            name: myapp-secret
```

```bash
# Job 실행 확인
kubectl get jobs -n prod
kubectl get pods -n prod -l job-name=db-migration
kubectl logs -n prod -l job-name=db-migration

# Job 수동 실행 (기존 Job에서 복제)
kubectl create job db-migration-manual --from=job/db-migration -n prod
```

---

## 병렬 Job

```yaml
spec:
  completions: 10     # 총 10번 성공해야 완료
  parallelism: 3      # 동시에 3개 Pod 실행
  # 3개씩 실행, 총 10번 성공 시 Job 완료
```

### Work Queue 패턴

```yaml
spec:
  completions: 1
  parallelism: 5      # 5개 Pod가 동시에 큐에서 작업 가져감
  # 어느 Pod든 성공하면 Job 완료
```

---

## CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-report
  namespace: prod
spec:
  schedule: "0 2 * * *"        # 매일 새벽 2시 (UTC)
  timeZone: "Asia/Seoul"        # K8s 1.27+
  concurrencyPolicy: Forbid     # Allow / Forbid / Replace
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  startingDeadlineSeconds: 300  # 예정 시간 지나도 5분 내면 실행
  jobTemplate:
    spec:
      backoffLimit: 2
      ttlSecondsAfterFinished: 86400
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: reporter
            image: ghcr.io/myorg/myapp:latest
            command: ["java", "-jar", "app.jar", "--job=dailyReport"]
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
```

### Cron 표현식

```
# ┌───── 분 (0-59)
# │ ┌──── 시 (0-23)
# │ │ ┌─── 일 (1-31)
# │ │ │ ┌── 월 (1-12)
# │ │ │ │ ┌─ 요일 (0-7, 0과 7은 일요일)
# │ │ │ │ │
  * * * * *

0 2 * * *        매일 새벽 2시
0 */6 * * *      6시간마다
0 9 * * 1-5      평일 오전 9시
0 0 1 * *        매월 1일 자정
*/15 * * * *     15분마다
```

### concurrencyPolicy

| 값 | 동작 |
|----|------|
| Allow | 이전 Job 완료 전 새 Job 시작 허용 |
| Forbid | 이전 Job 실행 중이면 새 Job 스킵 |
| Replace | 이전 Job 종료 후 새 Job 시작 |

---

## CronJob 관리

```bash
# CronJob 목록
kubectl get cronjobs -n prod

# 수동으로 즉시 실행
kubectl create job daily-report-manual \
  --from=cronjob/daily-report \
  -n prod

# CronJob 일시 중지
kubectl patch cronjob daily-report -n prod \
  -p '{"spec":{"suspend":true}}'

# 재개
kubectl patch cronjob daily-report -n prod \
  -p '{"spec":{"suspend":false}}'

# Job 히스토리 확인
kubectl get jobs -n prod --sort-by=.metadata.creationTimestamp
```

---

## Spring Batch + K8s Job 패턴

```yaml
# 배치 Job — Spring Batch와 연동
apiVersion: batch/v1
kind: CronJob
metadata:
  name: settlement-batch
  namespace: prod
spec:
  schedule: "0 1 * * *"    # 매일 새벽 1시
  timeZone: "Asia/Seoul"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 0       # 정산은 재시도 안 함
      template:
        spec:
          restartPolicy: Never
          initContainers:
          - name: wait-for-db
            image: busybox
            command: ['sh', '-c', 'until nc -z postgres-svc 5432; do sleep 2; done']
          containers:
          - name: batch
            image: ghcr.io/myorg/batch-app:latest
            env:
            - name: SPRING_BATCH_JOB_NAMES
              value: "settlementJob"
            - name: JOB_DATE
              value: "$(date -d 'yesterday' +%Y-%m-%d)"
            envFrom:
            - configMapRef:
                name: myapp-config
            - secretRef:
                name: myapp-secret
```

---

## Job 실패 처리

```yaml
spec:
  backoffLimit: 3
  podFailurePolicy:              # K8s 1.26+
    rules:
    - action: FailJob            # Job 즉시 실패 처리
      onExitCodes:
        operator: In
        values: [42]             # 복구 불가 에러 코드
    - action: Ignore             # 무시하고 재시도
      onPodConditions:
      - type: DisruptionTarget   # 노드 장애로 인한 실패
```
