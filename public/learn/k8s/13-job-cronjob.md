---
title: "Job과 CronJob"
order: 13
---

## Job이란 무엇인가 — Deployment와의 차이

Kubernetes에서 애플리케이션을 실행하는 방법은 크게 두 가지입니다. "계속 실행"과 "한 번 실행 후 종료"입니다.

식당에 비유하면 이렇습니다. Deployment는 홀 직원처럼 항상 자리를 지키며 손님(요청)을 맞이합니다. Job은 배달 기사처럼 주문을 받아 배달을 완료하면 임무가 끝납니다. CronJob은 매일 새벽 청소부처럼 정해진 시간에 와서 일을 마치고 떠납니다.

```
Deployment: 계속 실행 — 웹 서버, API 서버
            죽으면 자동으로 재시작

Job:        한 번 실행 후 완료 — DB 마이그레이션, 데이터 집계
            성공적으로 끝날 때까지 재시도

CronJob:    주기적으로 실행 — 정산, 리포트 생성, 캐시 갱신
            정해진 일정에 Job을 생성
```

Job은 Pod가 성공(exit code 0)으로 종료될 때까지 재실행합니다. 반면 Deployment는 Pod가 종료되면 무조건 새로 시작합니다.

---

## 기본 Job 작성하기

### 가장 간단한 예: DB 마이그레이션

Spring Boot 애플리케이션을 처음 배포하거나 업데이트할 때, DB 스키마 변경(Flyway, Liquibase)을 안전하게 실행하는 예시입니다.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration                      # Job 이름
  namespace: prod
spec:
  completions: 1                          # 성공 횟수 목표 (기본값 1)
  parallelism: 1                          # 동시에 실행할 Pod 수 (기본값 1)
  backoffLimit: 3                         # 실패 시 최대 재시도 횟수
  activeDeadlineSeconds: 600              # 최대 실행 시간 10분 (초과 시 강제 종료)
  ttlSecondsAfterFinished: 3600           # 완료 후 1시간 뒤 자동 삭제
  template:
    spec:
      restartPolicy: OnFailure            # 실패 시 재시작 (Always는 Job에서 사용 불가)
      containers:
      - name: migration
        image: ghcr.io/myorg/myapp:latest
        # Spring Boot를 마이그레이션 모드로 실행
        command: ["java", "-jar", "app.jar", "--spring.batch.job.enabled=true"]
        envFrom:
        - configMapRef:
            name: myapp-config            # DB 호스트, 포트 등 설정 주입
        - secretRef:
            name: myapp-secret            # DB 비밀번호 주입
```

```bash
# Job 실행 상태 확인
kubectl get jobs -n prod
# NAME           COMPLETIONS   DURATION   AGE
# db-migration   1/1           45s        5m    ← 1/1 = 완료

# Job이 만든 Pod 확인
kubectl get pods -n prod -l job-name=db-migration
# NAME                 READY   STATUS      RESTARTS   AGE
# db-migration-x9k2p   0/1     Completed   0          5m

# 마이그레이션 로그 확인
kubectl logs -n prod -l job-name=db-migration

# 같은 Job을 수동으로 다시 실행 (이미 있는 Job에서 복제)
kubectl create job db-migration-manual --from=job/db-migration -n prod
```

---

## 병렬 Job — 여러 Pod가 동시에 작업

대량의 데이터를 처리할 때 여러 Pod를 동시에 실행하면 훨씬 빠릅니다.

### 패턴 1: 고정 횟수 완료

```yaml
spec:
  completions: 10     # 총 10번 성공해야 Job 완료
  parallelism: 3      # 동시에 최대 3개 Pod 실행
  # 처리 순서: 3개 → 3개 → 3개 → 1개 = 총 10번 성공
```

예: 10개 리포트 파일을 생성해야 할 때, 3개씩 병렬로 처리.

### 패턴 2: Work Queue 패턴

```yaml
spec:
  completions: 1      # 하나만 성공하면 Job 완료
  parallelism: 5      # 5개 Pod가 동시에 큐에서 작업 가져감
  # 가장 먼저 성공한 Pod가 나오면 Job 완료, 나머지는 중단
```

예: Redis 큐에서 여러 Pod가 작업을 나눠서 처리. 큐가 비면 Job 종료.

---

## CronJob — 정해진 시간에 실행

CronJob은 Linux의 cron과 같은 개념입니다. 정해진 일정에 Job을 자동으로 생성합니다.

### 실전 예: 일일 리포트 생성

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-report
  namespace: prod
spec:
  schedule: "0 2 * * *"              # 매일 새벽 2시 실행 (UTC 기준)
  timeZone: "Asia/Seoul"             # Kubernetes 1.27+: 한국 시간 기준
  concurrencyPolicy: Forbid          # 이전 Job 실행 중이면 새 Job 건너뜀
  successfulJobsHistoryLimit: 3      # 성공한 Job 기록 3개 유지
  failedJobsHistoryLimit: 1          # 실패한 Job 기록 1개 유지
  startingDeadlineSeconds: 300       # 예정 시간을 5분 지나도 실행 시도
  jobTemplate:
    spec:
      backoffLimit: 2                # 실패 시 2회 재시도
      ttlSecondsAfterFinished: 86400 # 완료 후 24시간 뒤 삭제
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
                memory: "512Mi"      # 배치는 메모리를 많이 쓸 수 있으므로 명시
                cpu: "500m"
              limits:
                memory: "1Gi"
                cpu: "1000m"
```

---

## Cron 표현식 — 시간 설정 방법

Cron 표현식은 5개 필드로 구성됩니다. 처음에는 헷갈리지만 패턴을 익히면 쉽습니다.

```
# ┌───── 분 (0-59)
# │ ┌──── 시 (0-23)
# │ │ ┌─── 일 (1-31)
# │ │ │ ┌── 월 (1-12)
# │ │ │ │ ┌─ 요일 (0-7, 0과 7은 일요일)
# │ │ │ │ │
  * * * * *

자주 쓰는 패턴:
0 2 * * *        매일 새벽 2시 (매일, 2시, 분은 0분)
0 */6 * * *      6시간마다 (0시, 6시, 12시, 18시)
0 9 * * 1-5      평일(월-금) 오전 9시
0 0 1 * *        매월 1일 자정
*/15 * * * *     15분마다
0 8,18 * * *     매일 8시와 18시 (두 번)
```

> 팁: https://crontab.guru 사이트에서 표현식을 입력하면 언제 실행되는지 확인할 수 있습니다.

---

## concurrencyPolicy — 중복 실행 제어

Job이 오래 걸릴 때 다음 스케줄 시간이 돼버리면 어떻게 할까요?

| 값 | 동작 | 언제 사용 |
|----|------|-----------|
| Allow | 이전 Job 완료 전 새 Job 시작 허용 | 실행이 겹쳐도 괜찮을 때 |
| Forbid | 이전 Job 실행 중이면 새 Job 스킵 | 중복 실행이 문제가 될 때 (정산 등) |
| Replace | 이전 Job 종료하고 새 Job 시작 | 최신 실행이 중요할 때 |

정산 배치처럼 "같은 날 두 번 실행되면 안 되는" 경우 `Forbid`를 사용합니다.

---

## CronJob 관리 명령어

```bash
# CronJob 목록 확인 (다음 실행 시간 포함)
kubectl get cronjobs -n prod
# NAME           SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE
# daily-report   0 2 * * *     False     0        5h

# 수동으로 즉시 실행 (테스트할 때 유용)
kubectl create job daily-report-manual \
  --from=cronjob/daily-report \
  -n prod

# CronJob 일시 중지 (공지 기간, 시스템 점검 등)
kubectl patch cronjob daily-report -n prod \
  -p '{"spec":{"suspend":true}}'

# CronJob 재개
kubectl patch cronjob daily-report -n prod \
  -p '{"spec":{"suspend":false}}'

# Job 실행 이력 확인 (최신순)
kubectl get jobs -n prod --sort-by=.metadata.creationTimestamp
```

---

## Spring Batch + Kubernetes Job 패턴

Spring Batch와 Kubernetes Job을 함께 쓰는 실전 패턴입니다. initContainers로 DB가 준비됐는지 먼저 확인하는 방법도 포함합니다.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: settlement-batch             # 정산 배치
  namespace: prod
spec:
  schedule: "0 1 * * *"             # 매일 새벽 1시 (한국 시간 새벽 10시)
  timeZone: "Asia/Seoul"
  concurrencyPolicy: Forbid          # 정산은 중복 실행 절대 금지
  jobTemplate:
    spec:
      backoffLimit: 0                # 정산은 실패 시 재시도 안 함 (중복 처리 방지)
      template:
        spec:
          restartPolicy: Never       # 실패해도 재시작 안 함
          initContainers:
          - name: wait-for-db
            image: busybox
            # DB가 준비될 때까지 대기 (배치 시작 전 DB 연결 확인)
            command: ['sh', '-c', 'until nc -z postgres-svc 5432; do sleep 2; done']
          containers:
          - name: batch
            image: ghcr.io/myorg/batch-app:latest
            env:
            - name: SPRING_BATCH_JOB_NAMES
              value: "settlementJob"  # 실행할 Spring Batch Job 이름
            - name: JOB_DATE
              value: "$(date -d 'yesterday' +%Y-%m-%d)"  # 어제 날짜로 실행
            envFrom:
            - configMapRef:
                name: myapp-config
            - secretRef:
                name: myapp-secret
```

---

## Job 실패 처리 — 세밀한 제어

Kubernetes 1.26+에서 `podFailurePolicy`를 사용하면 실패 원인에 따라 다른 행동을 취할 수 있습니다.

```yaml
spec:
  backoffLimit: 3
  podFailurePolicy:
    rules:
    # 복구 불가능한 오류: 즉시 Job 실패 처리 (재시도 낭비 없음)
    - action: FailJob
      onExitCodes:
        operator: In
        values: [42]               # exit code 42 = 데이터 오류 등 재시도 무의미
    # 노드 장애로 인한 실패: 무시하고 다른 노드에서 재시도
    - action: Ignore
      onPodConditions:
      - type: DisruptionTarget     # 노드 점검, 스팟 인스턴스 회수 등
```

---

## 흔한 실수들

```
실수 1: restartPolicy: Always 사용
→ Job에서는 Always 사용 불가 (Never 또는 OnFailure만 허용)
→ Always로 설정하면 Job 생성 자체가 실패

실수 2: backoffLimit을 정산 배치에서 높게 설정
→ 정산이 3번 실행되면 3배 처리됨 (금전 오류 발생 가능)
→ 정산/결제 배치는 backoffLimit: 0, restartPolicy: Never 권장

실수 3: ttlSecondsAfterFinished 미설정
→ 완료된 Job과 Pod가 계속 쌓여 클러스터 리소스 낭비
→ 적절한 TTL 설정 필수

실수 4: timeZone 미설정
→ schedule이 UTC 기준으로 동작
→ "새벽 2시 실행"이 한국 시간 오전 11시에 실행될 수 있음
→ Kubernetes 1.27+ 에서 timeZone: "Asia/Seoul" 설정
```
