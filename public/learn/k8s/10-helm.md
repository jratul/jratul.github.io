---
title: "Helm 차트"
order: 10
---

## Helm이란 무엇인가

Helm은 쿠버네티스의 패키지 매니저입니다. npm이 Node.js 패키지를 관리하듯, Helm은 K8s 리소스 묶음을 관리합니다.

**왜 필요한가?**
Spring Boot 앱을 배포하려면 Deployment, Service, Ingress, HPA, ConfigMap, Secret, ServiceMonitor... 수많은 YAML 파일이 필요합니다. 환경(dev/staging/prod)마다 이미지 태그, 레플리카 수, 리소스 설정이 다릅니다.

Helm을 쓰면:
- YAML을 템플릿화해서 환경별로 재사용
- 버전 관리 및 롤백
- 외부 패키지(PostgreSQL, Redis, nginx 등) 간편 설치

```
Helm Chart = 템플릿(YAML) + 기본값(values.yaml) + 메타데이터(Chart.yaml)
           + 버전 관리 + 의존성 관리
```

---

## Helm 설치와 기본 명령어

```bash
# 설치
brew install helm                    # macOS
choco install kubernetes-helm        # Windows
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash  # Linux

# 버전 확인
helm version
```

### 저장소 관리

```bash
# 자주 쓰는 저장소 추가
helm repo add bitnami https://charts.bitnami.com/bitnami          # DB, 미들웨어
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io                 # cert-manager
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts

# 저장소 목록 확인
helm repo list

# 저장소 업데이트 (최신 차트 정보 동기화)
helm repo update

# 차트 검색
helm search repo postgres            # 저장소에서 검색
helm search hub nginx                # Artifact Hub(공개 저장소) 전체 검색
```

### 차트 설치 및 관리

```bash
# 차트 정보 먼저 확인
helm show chart bitnami/postgresql           # 차트 메타데이터
helm show values bitnami/postgresql          # 기본 설정값 (매우 많음)
helm show values bitnami/postgresql > pg-default-values.yaml  # 파일로 저장

# 설치 (release 이름: my-postgres)
helm install my-postgres bitnami/postgresql \
  --namespace prod \
  --create-namespace \
  --set auth.postgresPassword=supersecret \
  --set primary.persistence.size=20Gi \
  --set primary.resources.requests.memory=512Mi

# values 파일로 설치 (권장 — 설정이 많을 때)
helm install my-postgres bitnami/postgresql \
  -f my-postgres-values.yaml \
  -n prod

# 업그레이드
helm upgrade my-postgres bitnami/postgresql \
  -f my-postgres-values.yaml \
  -n prod

# 설치 또는 업그레이드 (idempotent — CI/CD에서 자주 사용)
helm upgrade --install my-postgres bitnami/postgresql \
  -f my-postgres-values.yaml \
  -n prod \
  --wait                    # 배포 완료까지 대기
  --timeout 5m              # 최대 5분 대기

# 목록 확인
helm list -n prod
# NAME          NAMESPACE  REVISION  STATUS    CHART
# my-postgres   prod       3         deployed  postgresql-13.2.0

# 전체 네임스페이스
helm list -A

# 배포 히스토리
helm history my-postgres -n prod
# REVISION  STATUS      CHART              DESCRIPTION
# 1         superseded  postgresql-13.0.0  Install complete
# 2         superseded  postgresql-13.1.0  Upgrade complete
# 3         deployed    postgresql-13.2.0  Upgrade complete

# 롤백 (리비전 2로)
helm rollback my-postgres 2 -n prod

# 삭제
helm uninstall my-postgres -n prod
```

---

## 차트 구조

```
mychart/
├── Chart.yaml          # 차트 메타데이터 (이름, 버전, 설명)
├── values.yaml         # 기본 설정값 (사용자가 오버라이드 가능)
├── templates/
│   ├── deployment.yaml   # Deployment 템플릿
│   ├── service.yaml      # Service 템플릿
│   ├── ingress.yaml      # Ingress 템플릿
│   ├── configmap.yaml    # ConfigMap 템플릿
│   ├── hpa.yaml          # HPA 템플릿
│   ├── serviceaccount.yaml
│   ├── _helpers.tpl      # 재사용 가능한 헬퍼 함수
│   └── NOTES.txt         # 설치 후 출력되는 안내 메시지
└── charts/             # 의존 차트 (postgresql, redis 등)
```

### Chart.yaml

```yaml
apiVersion: v2
name: myapp
description: My Spring Boot Application Helm Chart
type: application
version: 1.3.0          # 차트 버전 (변경 시 증가)
appVersion: "2.5.0"     # 앱 버전 (image.tag 기본값)

dependencies:           # 의존 차트 (postgresql, redis 등)
- name: postgresql
  version: "13.x.x"
  repository: https://charts.bitnami.com/bitnami
  condition: postgresql.enabled   # values.yaml에서 활성화 여부 제어
```

---

## values.yaml 작성

```yaml
# values.yaml — 기본값 (모든 환경에서 공통)
replicaCount: 2

image:
  repository: ghcr.io/myorg/myapp
  tag: ""                        # 비우면 Chart.yaml의 appVersion 사용
  pullPolicy: IfNotPresent

imagePullSecrets:
- name: regcred                  # 프라이빗 레지스트리 인증

serviceAccount:
  create: true
  name: myapp-sa

service:
  type: ClusterIP
  port: 80
  targetPort: 8080

ingress:
  enabled: true
  className: nginx
  host: api.example.com
  tls: true
  certIssuer: letsencrypt-prod   # cert-manager issuer

resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

# 환경변수 (ConfigMap)
env:
  SPRING_PROFILES_ACTIVE: prod
  LOG_LEVEL: INFO
  SERVER_PORT: "8080"

# DB 설정 (연결 주소만, 비밀번호는 Secret으로)
database:
  host: postgres-svc
  port: "5432"
  name: mydb

# 내장 postgresql 활성화 여부 (개발 환경용)
postgresql:
  enabled: false
```

---

## 템플릿 작성

### templates/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}   # 헬퍼 함수로 이름 생성
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}     # autoscaling이 꺼져있을 때만 replicas 설정
  {{- end }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ .Values.serviceAccount.name }}
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - name: http
          containerPort: {{ .Values.service.targetPort }}
        env:
        {{- range $key, $value := .Values.env }}
        - name: {{ $key }}
          value: {{ $value | quote }}
        {{- end }}
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
```

### templates/_helpers.tpl

```yaml
{{/*
차트 전체 이름 (release-chart 형식)
*/}}
{{- define "myapp.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
공통 레이블
*/}}
{{- define "myapp.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector 레이블 (변경 불가)
*/}}
{{- define "myapp.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

---

## 환경별 values 파일

```bash
# 환경별로 다른 values 파일 사용
helm upgrade --install myapp ./mychart \
  -f values.yaml \           # 공통 기본값
  -f values-prod.yaml \      # 운영 환경 오버라이드
  -n prod
```

```yaml
# values-prod.yaml — 운영 환경 오버라이드
replicaCount: 5

image:
  tag: "2.5.0"               # 명시적 버전 태그

ingress:
  host: api.example.com

resources:
  requests:
    memory: "1Gi"
    cpu: "1000m"
  limits:
    memory: "2Gi"
    cpu: "2000m"

autoscaling:
  minReplicas: 3
  maxReplicas: 20

env:
  SPRING_PROFILES_ACTIVE: prod
  LOG_LEVEL: WARN             # 운영에서는 WARN 이상만
```

```yaml
# values-dev.yaml — 개발 환경
replicaCount: 1

ingress:
  host: dev-api.example.com
  tls: false                  # 개발에서는 TLS 불필요

resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"

autoscaling:
  enabled: false              # 개발에서는 자동 스케일링 불필요

postgresql:
  enabled: true               # 개발에서는 내장 PostgreSQL 사용
```

---

## 차트 테스트와 디버깅

```bash
# 렌더링 결과 미리보기 (실제 배포 안 함)
helm template myapp ./mychart -f values.yaml

# 특정 템플릿만 렌더링
helm template myapp ./mychart -s templates/deployment.yaml

# 문법 검사
helm lint ./mychart

# 드라이런 (클러스터에 적용하지 않고 YAML만 출력)
helm install myapp ./mychart --dry-run --debug

# 배포된 차트의 실제 values 확인
helm get values myapp -n prod

# 배포된 차트의 실제 매니페스트 확인
helm get manifest myapp -n prod

# 릴리스 상태 확인
helm status myapp -n prod
```

---

## 유용한 공개 차트 예시

```bash
# PostgreSQL (프로덕션급 설정)
helm upgrade --install postgres bitnami/postgresql \
  --namespace prod \
  --set auth.postgresPassword=secret \
  --set auth.database=mydb \
  --set primary.persistence.size=20Gi \
  --set primary.persistence.storageClass=fast-ssd

# Redis (Sentinel 고가용성)
helm upgrade --install redis bitnami/redis \
  --namespace prod \
  --set auth.password=redispass \
  --set replica.replicaCount=3

# nginx Ingress Controller
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.replicaCount=2

# cert-manager (TLS 자동화)
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true

# Prometheus + Grafana + AlertManager (모니터링 풀스택)
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --set grafana.adminPassword=admin123

# Loki (로그 수집)
helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring \
  --set promtail.enabled=true
```
