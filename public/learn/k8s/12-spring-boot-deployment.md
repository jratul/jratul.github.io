---
title: "실전 — Spring Boot 배포"
order: 12
---

## 전체 구성 — 큰 그림부터 이해하기

Spring Boot 애플리케이션을 Kubernetes에 배포한다는 것이 처음에는 막막하게 느껴질 수 있습니다. 하지만 전체 흐름을 먼저 이해하면 각 파일의 역할이 명확해집니다.

공장에 비유하면 이렇습니다. 개발자가 코드를 작성(원자재 생산) → GitHub Actions가 Docker 이미지를 만들어 창고에 저장(제조 및 보관) → Kubernetes가 이미지를 꺼내 클러스터에 배포(유통 및 판매) → 사용자가 인터넷을 통해 접근(고객 도달).

```
GitHub Actions (CI/CD)
    ↓ 코드를 테스트하고 Docker 이미지 빌드
ghcr.io (이미지 레지스트리 — 이미지 창고)
    ↓ 이미지를 가져와서 배포
Kubernetes Cluster
    ├── Namespace: prod               ← 운영 환경 격리 공간
    │   ├── Deployment (myapp × 3)   ← 앱 Pod 3개 관리
    │   ├── Service (ClusterIP)      ← Pod들에게 트래픽 분산
    │   ├── Ingress (nginx + TLS)    ← 외부 트래픽 진입점
    │   ├── HPA (2~10 replicas)      ← 부하에 따라 Pod 수 자동 조절
    │   ├── ConfigMap (app 설정)      ← 환경변수 (비밀 아닌 것)
    │   ├── Secret (DB 비밀번호)      ← 환경변수 (민감한 것)
    │   └── ServiceMonitor           ← Prometheus 모니터링 연동
    ├── Namespace: prod (infra)
    │   ├── StatefulSet (postgres)   ← DB는 상태를 유지해야 함
    │   └── StatefulSet (redis)      ← 캐시도 StatefulSet으로
    └── Namespace: monitoring
        └── kube-prometheus-stack    ← 모니터링 도구 모음
```

---

## 디렉토리 구조 — 파일 정리 방법

```
myapp/
├── Dockerfile                    ← 이미지 빌드 설명서
├── k8s/                          ← Kubernetes 매니페스트 모음
│   ├── namespace.yaml            ← 격리 공간 정의
│   ├── configmap.yaml            ← 환경변수 (공개)
│   ├── secret.yaml               ← 환경변수 (비밀)
│   ├── deployment.yaml           ← 핵심! Pod 배포 설정
│   ├── service.yaml              ← 트래픽 분산
│   ├── ingress.yaml              ← 외부 접근 설정
│   ├── hpa.yaml                  ← 자동 스케일링
│   └── servicemonitor.yaml       ← 모니터링 연동
├── helm/
│   └── myapp/                    ← Helm 차트 (선택적으로 사용)
└── .github/
    └── workflows/
        └── deploy.yml            ← CI/CD 파이프라인 정의
```

---

## 매니페스트 작성 — 각 파일 설명

### namespace.yaml — 격리 공간 만들기

Namespace는 Kubernetes 안의 가상 클러스터입니다. 마치 회사 내의 부서처럼 운영(prod), 개발(dev), 테스트(staging)를 분리할 수 있습니다. 한 Namespace의 문제가 다른 Namespace에 영향을 주지 않습니다.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: prod                       # 운영 환경 네임스페이스 이름
  labels:
    # 보안 정책: baseline = 최소한의 보안 규칙 적용
    # restricted > baseline > privileged 순으로 엄격
    pod-security.kubernetes.io/enforce: baseline
```

### configmap.yaml — 공개 환경변수 관리

ConfigMap은 애플리케이션 설정을 코드와 분리해서 관리하는 방법입니다. 환경마다 다른 설정값(개발 DB vs 운영 DB 주소 등)을 Pod에 주입할 수 있습니다.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config               # 이름 (deployment에서 이 이름으로 참조)
  namespace: prod
data:
  SPRING_PROFILES_ACTIVE: "prod"   # Spring 프로파일: prod 설정 파일 로드
  SERVER_PORT: "8080"              # 앱 포트
  POSTGRES_HOST: "postgres-svc"   # DB 호스트 (Service 이름으로 DNS 자동 해결)
  POSTGRES_PORT: "5432"           # DB 포트
  POSTGRES_DB: "mydb"             # DB 이름
  REDIS_HOST: "redis-svc"         # Redis 호스트
  REDIS_PORT: "6379"              # Redis 포트
```

> 핵심 포인트: `POSTGRES_HOST`에 `postgres-svc`라고 적으면 Kubernetes DNS가 자동으로 해당 Service의 IP로 변환해줍니다. IP 주소를 직접 쓰지 않아도 됩니다.

### secret.yaml — 비밀 환경변수 관리

Secret은 ConfigMap과 같지만 민감한 정보(비밀번호, API 키 등)를 위한 것입니다. etcd에 암호화되어 저장되고, 접근 권한을 별도로 제어할 수 있습니다.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secret
  namespace: prod
type: Opaque                        # 일반적인 키-값 Secret 타입
stringData:                         # base64 인코딩 없이 평문으로 작성 가능
  POSTGRES_USER: myuser            # DB 사용자명
  POSTGRES_PASSWORD: supersecret   # DB 비밀번호 (실제 운영에서는 Vault 사용 권장)
  REDIS_PASSWORD: redispass        # Redis 비밀번호
  JWT_SECRET: myjwtsecret          # JWT 서명 키
```

> 주의: `stringData`로 작성하면 K8s가 자동으로 base64 인코딩합니다. Git에 Secret을 올릴 때는 반드시 암호화 도구(Sealed Secrets, External Secrets Operator)를 사용하세요.

### deployment.yaml — 핵심 설정

Deployment는 "이런 Pod를 N개 항상 실행해라"라고 선언하는 파일입니다. Pod가 죽으면 자동으로 새 Pod를 만들고, 업데이트 시 무중단으로 교체합니다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: prod
spec:
  replicas: 3                       # Pod 3개 유지 (1개 죽어도 서비스 계속)
  selector:
    matchLabels:
      app: myapp                    # 이 레이블을 가진 Pod를 관리
  strategy:
    type: RollingUpdate             # 롤링 업데이트: 하나씩 교체
    rollingUpdate:
      maxSurge: 1                   # 업데이트 중 최대 추가 Pod 수 (4개까지 허용)
      maxUnavailable: 0             # 업데이트 중 최소 3개 유지 (다운타임 없음)
  template:
    metadata:
      labels:
        app: myapp                  # Pod에 붙는 레이블 (Service가 이걸로 찾음)
    spec:
      serviceAccountName: myapp-sa  # 최소 권한 원칙: 별도 ServiceAccount 사용
      terminationGracePeriodSeconds: 60  # Pod 종료 시 60초 동안 요청 처리 완료 대기
      containers:
      - name: app
        image: ghcr.io/myorg/myapp:latest  # CI/CD에서 특정 태그로 교체됨
        ports:
        - containerPort: 8080
          name: http
        envFrom:
        - configMapRef:
            name: myapp-config      # ConfigMap의 모든 키를 환경변수로 주입
        - secretRef:
            name: myapp-secret      # Secret의 모든 키를 환경변수로 주입
        resources:
          requests:
            memory: "512Mi"         # 최소 512MB 메모리 보장 (스케줄링 기준)
            cpu: "500m"             # 최소 0.5 CPU 코어 보장 (500 밀리코어)
          limits:
            memory: "1Gi"           # 최대 1GB 메모리 (초과 시 OOM Kill)
            cpu: "1000m"            # 최대 1 CPU 코어 (초과 시 쓰로틀링)
        # 시작 프로브: 앱이 처음 뜰 때까지 기다림 (Spring Boot는 시작이 느릴 수 있음)
        startupProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          failureThreshold: 30      # 30회 실패 허용 (30 × 10s = 최대 5분 대기)
          periodSeconds: 10
        # 생존 프로브: 앱이 살아있는지 확인, 실패하면 컨테이너 재시작
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 0    # startupProbe 통과 후 즉시 시작
          periodSeconds: 10         # 10초마다 확인
          failureThreshold: 3       # 3번 연속 실패 시 재시작
        # 준비 프로브: 트래픽 받을 준비가 됐는지 확인, 실패하면 Service에서 제외
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 5          # 5초마다 확인 (더 자주)
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              # Pod 종료 전 5초 대기: Ingress가 이 Pod를 목록에서 제거할 시간
              command: ["/bin/sh", "-c", "sleep 5"]
        securityContext:
          allowPrivilegeEscalation: false  # 권한 상승 금지
          readOnlyRootFilesystem: true     # 파일시스템 읽기 전용 (보안 강화)
          runAsNonRoot: true               # root로 실행 금지
          runAsUser: 1001                  # 일반 사용자 UID로 실행
          capabilities:
            drop: ["ALL"]                  # 모든 Linux 권한 제거
      volumes:
      - name: tmp
        emptyDir: {}                # readOnlyRootFilesystem 때문에 /tmp 따로 마운트
```

### service.yaml — 트래픽 분산

Service는 여러 Pod 앞에서 로드밸런서 역할을 합니다. Pod IP는 계속 바뀌지만 Service IP는 고정되어 있어서 안정적으로 접근할 수 있습니다.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-svc                  # 이 이름으로 DNS 접근 가능: myapp-svc.prod.svc.cluster.local
  namespace: prod
  labels:
    app: myapp
spec:
  type: ClusterIP                  # 클러스터 내부에서만 접근 가능 (외부 노출 X)
  selector:
    app: myapp                     # 이 레이블의 Pod들에게 트래픽 분산
  ports:
  - name: http
    port: 80                       # Service 포트 (다른 서비스가 80으로 접근)
    targetPort: 8080               # Pod의 실제 포트로 포워딩
```

### ingress.yaml — 외부 트래픽 진입점

Ingress는 클러스터 외부에서 오는 트래픽을 내부 Service로 연결해주는 관문입니다. 도메인 기반 라우팅, HTTPS 설정, 요청 크기 제한 등을 담당합니다.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: prod
  annotations:
    # cert-manager가 Let's Encrypt에서 TLS 인증서를 자동 발급
    cert-manager.io/cluster-issuer: letsencrypt-prod
    # 요청 바디 크기 제한 (파일 업로드 등)
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    # 백엔드 응답 대기 시간 (60초 초과 시 504 Gateway Timeout)
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
spec:
  ingressClassName: nginx           # nginx Ingress Controller 사용
  tls:
  - hosts:
    - api.example.com               # HTTPS 적용할 도메인
    secretName: myapp-tls           # TLS 인증서를 저장할 Secret 이름
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix            # /로 시작하는 모든 경로
        backend:
          service:
            name: myapp-svc         # 트래픽을 이 Service로 전달
            port:
              number: 80
```

### hpa.yaml — 자동 스케일링

HPA(Horizontal Pod Autoscaler)는 CPU/메모리 사용률에 따라 Pod 수를 자동으로 늘리거나 줄입니다. 쇼핑몰의 블랙프라이데이처럼 트래픽이 급증할 때 유용합니다.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
  namespace: prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp                     # 이 Deployment를 스케일링
  minReplicas: 2                    # 최소 2개 유지 (고가용성)
  maxReplicas: 10                   # 최대 10개 (비용 제한)
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70      # CPU 70% 초과 시 스케일 아웃
  behavior:
    scaleDown:
      # 스케일 다운은 5분 안정화 후: 잠깐 트래픽 줄었다고 바로 줄이지 않음
      stabilizationWindowSeconds: 300
```

---

## GitHub Actions CI/CD — 자동화 파이프라인

코드를 push하면 자동으로 테스트 → 이미지 빌드 → 배포까지 진행합니다.

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]               # main 브랜치 push 시 실행
    tags: ['v*']                   # v1.0.0 같은 태그 push 시도 실행

env:
  REGISTRY: ghcr.io               # GitHub Container Registry
  IMAGE_NAME: ${{ github.repository }}  # 예: myorg/myapp

jobs:
  # 1단계: 테스트
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-java@v4
      with:
        java-version: '21'
        distribution: 'temurin'
        cache: gradle               # Gradle 캐시로 빌드 속도 향상
    - run: ./gradlew test           # 단위/통합 테스트 실행

  # 2단계: Docker 이미지 빌드 및 레지스트리에 push
  build-push:
    needs: test                     # test 잡이 성공해야만 실행
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.version }}  # 다음 단계로 이미지 태그 전달
    steps:
    - uses: actions/checkout@v4

    - uses: docker/login-action@v3  # ghcr.io 로그인
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}  # GitHub이 자동으로 제공하는 토큰

    - id: meta
      uses: docker/metadata-action@v5  # 이미지 태그 자동 생성
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=sha,prefix=sha-              # sha-abc1234 형태
          type=semver,pattern={{version}}   # v1.0.0 태그 push 시 1.0.0
          type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

    - uses: docker/build-push-action@v5
      with:
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        cache-from: type=gha        # GitHub Actions 캐시로 빌드 속도 향상
        cache-to: type=gha,mode=max

  # 3단계: Kubernetes에 배포
  deploy:
    needs: build-push
    runs-on: ubuntu-latest
    environment: production         # GitHub 환경 보호 규칙 적용 (승인 요청 등)
    steps:
    - uses: actions/checkout@v4

    - uses: azure/setup-kubectl@v3  # kubectl 설치

    - uses: azure/k8s-set-context@v3  # kubeconfig 설정
      with:
        method: kubeconfig
        kubeconfig: ${{ secrets.KUBECONFIG }}  # 클러스터 접근 정보 (GitHub Secret에 저장)

    # 방법 1: kubectl set image로 이미지 태그만 변경
    - name: Deploy
      run: |
        IMAGE_TAG=${{ needs.build-push.outputs.image-tag }}
        kubectl set image deployment/myapp \
          app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${IMAGE_TAG} \
          -n prod

        # 롤아웃이 완료될 때까지 대기 (실패 시 파이프라인 실패)
        kubectl rollout status deployment/myapp -n prod --timeout=5m

    # 방법 2: Helm으로 배포 (더 많은 설정 관리 가능)
    - name: Deploy with Helm
      run: |
        helm upgrade --install myapp ./helm/myapp \
          --namespace prod \
          --set image.tag=${{ needs.build-push.outputs.image-tag }} \
          --wait --timeout=5m
```

---

## 배포 후 확인 — 실제로 잘 됐는지 점검

```bash
# 롤아웃 진행 상황 확인 (완료될 때까지 대기)
kubectl rollout status deployment/myapp -n prod

# Pod 상태 확인 (Running 이어야 정상)
kubectl get pods -n prod -l app=myapp
# NAME                     READY   STATUS    RESTARTS   AGE
# myapp-5d8f9b7c6-2xkp4   1/1     Running   0          2m
# myapp-5d8f9b7c6-8lmvr   1/1     Running   0          2m
# myapp-5d8f9b7c6-qnfth   1/1     Running   0          1m

# 특정 Pod 상세 정보 (이벤트 확인)
kubectl describe pod myapp-xxx -n prod

# 실시간 로그 확인
kubectl logs -n prod -l app=myapp --tail=100 -f

# 이벤트 확인 (에러가 있다면 여기서 원인 파악)
kubectl get events -n prod --sort-by=.lastTimestamp

# Ingress 주소 확인
kubectl get ingress -n prod

# HPA 현재 상태 (현재 몇 개 실행 중인지)
kubectl get hpa -n prod

# Pod 리소스 실제 사용량 (metrics-server 필요)
kubectl top pods -n prod
```

---

## 트러블슈팅 — 자주 만나는 문제들

### 문제 1: Pod가 Pending 상태에서 멈춤

Pending = Pod가 생성됐지만 어느 노드에도 배치되지 못한 상태. 노드가 "이 Pod를 받을 수 없어"라고 거절하는 것입니다.

```bash
# describe로 Events 섹션 확인
kubectl describe pod myapp-xxx -n prod

# Events에서 원인 파악:
# Insufficient memory/cpu → 노드 리소스 부족 (더 큰 노드 필요)
# No nodes available      → nodeSelector/taint 문제 (설정 확인)
# Unbound PVC             → 스토리지 프로비저너 문제
```

### 문제 2: CrashLoopBackOff — 컨테이너가 계속 죽음

앱이 시작했다가 바로 종료되는 것을 반복하는 상태입니다. 앱 코드 오류나 환경변수 미설정이 주된 원인입니다.

```bash
# 현재 컨테이너 로그 (가장 최근)
kubectl logs myapp-xxx -n prod

# 이전 컨테이너 로그 (크래시 직전 로그가 여기 있음)
kubectl logs myapp-xxx -n prod --previous
```

### 문제 3: ImagePullBackOff — 이미지를 못 가져옴

레지스트리 인증 실패 또는 이미지가 존재하지 않는 경우입니다.

```bash
# 레지스트리 인증 Secret 확인
kubectl get secret regcred -n prod -o yaml

# ServiceAccount에 imagePullSecrets 추가
kubectl patch serviceaccount myapp-sa -n prod \
  -p '{"imagePullSecrets": [{"name": "regcred"}]}'
```

### 문제 4: 서비스에 연결이 안 됨

```bash
# Pod 내부에서 DNS 조회 테스트
kubectl exec -it myapp-xxx -n prod -- nslookup postgres-svc

# Pod 내부에서 다른 서비스 호출 테스트
kubectl exec -it myapp-xxx -n prod -- curl http://myapp-svc/actuator/health
```

---

## 흔한 실수들

```
실수 1: Secret을 Git에 평문으로 커밋
→ 반드시 Sealed Secrets 또는 External Secrets Operator 사용

실수 2: resources를 설정하지 않음
→ HPA가 동작하지 않고, 노드 리소스를 독점해 다른 Pod에 영향

실수 3: readinessProbe 없이 배포
→ 앱이 아직 시작 중인데 트래픽이 들어와서 초기 요청 실패

실수 4: livenessProbe를 너무 민감하게 설정
→ DB 연결 끊김 시 앱 재시작 → DB가 더 힘들어지는 악순환

실수 5: latest 태그 사용
→ 어떤 버전이 배포됐는지 알 수 없어 롤백/추적 불가
→ 항상 sha 또는 semver 태그 사용
```
