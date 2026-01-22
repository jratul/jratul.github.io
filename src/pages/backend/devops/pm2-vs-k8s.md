---
title: "Kubernetes가 있는데 PM2가 필요한가?"
date: "2026-01-18"
tags: ["kubernetes", "pm2", "nodejs", "devops", "container"]
excerpt: "Kubernetes 환경에서 PM2의 필요성과 각각의 역할을 비교합니다."
---

# Kubernetes가 있는데 PM2가 필요한가?

Kubernetes를 사용한다면 **대부분의 경우 PM2는 필요하지 않습니다.**

## PM2의 주요 기능

```
1. 프로세스 관리 (자동 재시작)
2. 클러스터 모드 (멀티 코어 활용)
3. 무중단 재배포 (Graceful Reload)
4. 로그 관리
5. 모니터링
```

---

## Kubernetes가 대체하는 기능

### 1. 프로세스 관리 → Pod 관리

**PM2:**
```bash
pm2 start app.js --name my-app
# 크래시 시 자동 재시작
```

**Kubernetes:**
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        # 크래시 시 자동으로 Pod 재생성
```

**Kubernetes가 더 강력:**
- 컨테이너 크래시 → 자동 재시작
- 노드 장애 → 다른 노드에 Pod 재생성
- Health Check → 응답 없으면 재시작

---

### 2. 클러스터 모드 → 수평 확장

**PM2:**
```bash
pm2 start app.js -i max  # CPU 코어 수만큼 프로세스
```

**Kubernetes:**
```yaml
spec:
  replicas: 10  # 10개 Pod로 확장
```

**Kubernetes가 더 유연:**
- 여러 노드에 분산
- 오토스케일링 (HPA)
- 리소스 기반 스케줄링

```yaml
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

### 3. 무중단 재배포 → Rolling Update

**PM2:**
```bash
pm2 reload app  # Graceful Reload
```

**Kubernetes:**
```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

**Kubernetes가 더 안전:**
- 새 Pod 준비 완료 후 트래픽 전환
- Readiness Probe로 정확한 준비 상태 확인
- 롤백 자동화

---

### 4. 로그 관리 → 컨테이너 로그

**PM2:**
```bash
pm2 logs
pm2 logs --lines 100
```

**Kubernetes:**
```bash
kubectl logs my-pod
kubectl logs -f my-pod  # 실시간
kubectl logs my-pod --previous  # 이전 컨테이너
```

**실제 운영:**
- Kubernetes + ELK/Loki로 중앙 집중 로깅
- PM2 로그보다 강력한 검색/분석

---

### 5. 모니터링 → Prometheus/Grafana

**PM2:**
```bash
pm2 monit
pm2 plus  # 유료
```

**Kubernetes:**
```yaml
# Prometheus + Grafana
# 더 상세한 메트릭, 알림, 대시보드
```

---

## 기능 비교표

| 기능 | PM2 | Kubernetes |
|-----|-----|-----------|
| 프로세스 재시작 | ✅ | ✅ (더 강력) |
| 멀티 프로세스 | ✅ 클러스터 모드 | ✅ 멀티 Pod |
| 무중단 배포 | ✅ | ✅ (더 안전) |
| 오토스케일링 | ❌ | ✅ HPA |
| 로드밸런싱 | ❌ (별도 필요) | ✅ Service |
| 노드 장애 복구 | ❌ | ✅ |
| 로그 관리 | ✅ 기본 | ✅ + 중앙 집중 |
| 모니터링 | ✅ 기본/유료 | ✅ Prometheus |
| 설정 복잡도 | 낮음 | 높음 |

---

## K8s에서 PM2를 쓰면 안 되는 이유

### 1. 컨테이너 철학 위반

```
컨테이너 원칙: 1 컨테이너 = 1 프로세스

PM2 클러스터 모드:
1 컨테이너 = N 프로세스 (원칙 위반)
```

**문제점:**
- Kubernetes가 리소스 사용량을 정확히 파악 못함
- 스케일링이 비효율적
- 헬스 체크가 부정확

---

### 2. 이중 관리

```
PM2: 프로세스 재시작
Kubernetes: Pod 재시작

→ 둘 다 같은 일을 함 (중복)
→ 충돌 가능성
```

**예시:**
```
1. 앱 크래시
2. PM2가 프로세스 재시작 시도
3. 동시에 Kubernetes가 컨테이너 재시작
4. 혼란...
```

---

### 3. 시그널 처리 문제

```dockerfile
# PM2가 PID 1이 됨
CMD ["pm2-runtime", "app.js"]

# SIGTERM이 PM2로 가고, 앱으로 전달이 불확실
```

**Graceful Shutdown 문제:**
- Kubernetes가 SIGTERM 전송
- PM2가 받아서 처리해야 함
- 앱까지 제대로 전달되지 않을 수 있음

---

### 4. 리소스 낭비

```yaml
# PM2 클러스터 모드 (4 프로세스)
resources:
  requests:
    cpu: "1000m"
    memory: "512Mi"

# 더 나은 방법: 4개 Pod
replicas: 4
resources:
  requests:
    cpu: "250m"
    memory: "128Mi"
```

**4개 Pod가 더 나은 이유:**
- 노드 분산 가능
- 개별 스케일링
- 장애 격리

---

## K8s에서 PM2 없이 Node.js 실행

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# PM2 없이 직접 실행
CMD ["node", "app.js"]
```

---

### Graceful Shutdown 구현

```javascript
// app.js
const express = require('express');
const app = express();

const server = app.listen(3000, () => {
  console.log('Server started on port 3000');
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');

  server.close(() => {
    console.log('HTTP server closed');
    // DB 연결 종료 등
    process.exit(0);
  });

  // 강제 종료 타임아웃
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
});
```

---

### Kubernetes 설정

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "256Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      terminationGracePeriodSeconds: 30
```

---

## 그래도 PM2가 필요한 경우

### 1. Kubernetes 없이 단일 서버

```bash
# VM이나 베어메탈에서 직접 실행
pm2 start app.js -i max
pm2 startup  # 시스템 부팅 시 자동 시작
pm2 save
```

---

### 2. 개발 환경

```bash
# 개발 중 파일 변경 감지
pm2 start app.js --watch
```

---

### 3. Docker 없이 운영

```bash
# 컨테이너화하지 않은 레거시 환경
pm2 start ecosystem.config.js
```

---

### 4. 간단한 배포

```bash
# Kubernetes가 과할 정도로 작은 프로젝트
# 단일 서버 + PM2로 충분
```

---

## 환경별 권장 사항

```
┌─────────────────────────────────────────────────────┐
│ 환경                    │ 권장 솔루션               │
├─────────────────────────────────────────────────────┤
│ 로컬 개발               │ node, nodemon            │
│ 단일 서버 (소규모)       │ PM2                      │
│ Docker (단일 컨테이너)   │ node (PM2 불필요)        │
│ Docker Compose          │ node + replicas          │
│ Kubernetes              │ node (PM2 불필요)        │
│ 서버리스 (Lambda 등)    │ 해당 없음                │
└─────────────────────────────────────────────────────┘
```

---

## Node.js 클러스터링 대안

### 1. Kubernetes replicas (권장)

```yaml
spec:
  replicas: 4  # 4개 Pod
```

---

### 2. Node.js cluster 모듈 (필요 시)

```javascript
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isPrimary) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker) => {
    cluster.fork();  // 워커 재시작
  });
} else {
  require('./app');
}
```

**주의:** K8s에서는 보통 불필요 (Pod 수로 스케일링)

---

## 요약

| 상황 | PM2 필요? |
|-----|----------|
| Kubernetes 사용 | ❌ 불필요 |
| Docker 사용 | ❌ 불필요 |
| 단일 서버 (VM) | ✅ 유용 |
| 개발 환경 | ⚠️ nodemon 대체 가능 |

**결론:**

```
Kubernetes를 사용한다면 PM2는 필요 없습니다.

- Kubernetes가 PM2의 모든 기능을 대체
- PM2 사용 시 오히려 문제 발생 가능
- 1 컨테이너 = 1 프로세스 원칙 준수
- Graceful Shutdown만 앱에서 직접 구현

PM2는 Kubernetes/Docker 이전 시대의 솔루션입니다.
컨테이너 환경에서는 오케스트레이터에게 맡기세요.
```