---
title: "Helm 차트"
order: 10
---

## Helm이란

K8s 패키지 매니저. 복잡한 K8s 매니페스트를 **템플릿화**하여 재사용 가능하게 만듭니다.

```
Helm Chart = K8s 매니페스트 템플릿 + 기본값(values.yaml)
           + 버전 관리 + 의존성 관리
```

```bash
# 설치
brew install helm   # macOS
choco install kubernetes-helm   # Windows

# 버전 확인
helm version
```

---

## Helm 기본 명령어

```bash
# 차트 저장소 추가
helm repo add stable https://charts.helm.sh/stable
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# 차트 검색
helm search repo postgres
helm search hub nginx   # Helm Hub 전체 검색

# 차트 정보
helm show chart bitnami/postgresql
helm show values bitnami/postgresql    # 기본 values 확인

# 설치
helm install my-postgres bitnami/postgresql \
  --namespace prod \
  --create-namespace \
  --set auth.postgresPassword=secret \
  --set primary.persistence.size=10Gi

# 또는 values 파일로
helm install my-postgres bitnami/postgresql \
  -f my-values.yaml \
  -n prod

# 업그레이드
helm upgrade my-postgres bitnami/postgresql -f my-values.yaml -n prod

# 설치 또는 업그레이드 (idempotent)
helm upgrade --install my-postgres bitnami/postgresql -f my-values.yaml -n prod

# 목록 확인
helm list -n prod
helm list -A              # 전체 네임스페이스

# 롤백
helm rollback my-postgres 1 -n prod   # 리비전 1로 롤백
helm history my-postgres -n prod      # 배포 히스토리

# 삭제
helm uninstall my-postgres -n prod
```

---

## 차트 구조

```
mychart/
├── Chart.yaml          # 차트 메타데이터
├── values.yaml         # 기본 설정값
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── hpa.yaml
│   ├── _helpers.tpl    # 재사용 가능한 템플릿 함수
│   └── NOTES.txt       # 설치 후 출력 메시지
└── charts/             # 의존 차트
```

### Chart.yaml

```yaml
apiVersion: v2
name: myapp
description: My Spring Boot Application
type: application
version: 1.2.0          # 차트 버전
appVersion: "2.5.0"     # 앱 버전
```

---

## 차트 작성

### values.yaml

```yaml
# values.yaml
replicaCount: 2

image:
  repository: ghcr.io/myorg/myapp
  tag: ""                     # 비어있으면 Chart.yaml의 appVersion 사용
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 8080

ingress:
  enabled: true
  className: nginx
  host: api.example.com
  tls: true

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

env:
  SPRING_PROFILES_ACTIVE: prod
  LOG_LEVEL: INFO

postgresql:
  host: postgres-svc
  port: 5432
  database: mydb
```

### templates/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - containerPort: {{ .Values.service.targetPort }}
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
공통 이름 정의
*/}}
{{- define "myapp.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "myapp.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "myapp.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

---

## 환경별 values 파일

```bash
# 환경별 values 파일
helm upgrade --install myapp ./mychart \
  -f values.yaml \
  -f values-prod.yaml \   # 프로덕션 오버라이드
  -n prod
```

```yaml
# values-prod.yaml
replicaCount: 5

image:
  tag: "2.5.0"

ingress:
  host: api.example.com
  tls: true

resources:
  requests:
    memory: "1Gi"
    cpu: "1000m"
  limits:
    memory: "2Gi"
    cpu: "2000m"
```

---

## 차트 테스트 및 디버깅

```bash
# 렌더링 결과 미리보기 (실제 배포 안 함)
helm template myapp ./mychart -f values.yaml

# 문법 검사
helm lint ./mychart

# 드라이런
helm install myapp ./mychart --dry-run --debug

# 배포된 차트의 실제 values 확인
helm get values myapp -n prod
helm get manifest myapp -n prod   # 실제 적용된 매니페스트
```

---

## 유용한 공개 차트

```bash
# PostgreSQL
helm install postgres bitnami/postgresql --set auth.postgresPassword=secret

# Redis
helm install redis bitnami/redis --set auth.password=redispass

# nginx Ingress Controller
helm install ingress-nginx ingress-nginx/ingress-nginx

# cert-manager
helm install cert-manager jetstack/cert-manager --set installCRDs=true

# Prometheus + Grafana (kube-prometheus-stack)
helm install monitoring prometheus-community/kube-prometheus-stack
```
