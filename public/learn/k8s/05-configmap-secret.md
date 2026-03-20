---
title: "ConfigMap과 Secret"
order: 5
---

## ConfigMap

설정값을 Pod와 분리하여 관리. 이미지 재빌드 없이 설정 변경 가능.

### 생성 방법

```bash
# 리터럴 값으로 생성
kubectl create configmap app-config \
  --from-literal=APP_ENV=production \
  --from-literal=LOG_LEVEL=INFO

# 파일로 생성
kubectl create configmap app-config --from-file=application.yml

# 디렉토리로 생성 (파일명이 키가 됨)
kubectl create configmap app-config --from-file=./config/

# YAML로 선언
```

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  namespace: prod
data:
  APP_ENV: "production"
  LOG_LEVEL: "INFO"
  SERVER_PORT: "8080"
  application.yml: |              # 파일 내용도 저장 가능
    spring:
      datasource:
        url: jdbc:postgresql://postgres-svc:5432/mydb
      jpa:
        show-sql: false
```

### Pod에 주입하는 방법

#### 환경변수로 주입

```yaml
spec:
  containers:
  - name: app
    image: myapp:1.0.0
    # 전체 ConfigMap을 환경변수로
    envFrom:
    - configMapRef:
        name: myapp-config

    # 특정 키만 선택
    env:
    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: myapp-config
          key: LOG_LEVEL
```

#### 볼륨으로 마운트

```yaml
spec:
  containers:
  - name: app
    image: myapp:1.0.0
    volumeMounts:
    - name: config-volume
      mountPath: /app/config      # /app/config/application.yml 로 파일 생성

  volumes:
  - name: config-volume
    configMap:
      name: myapp-config
```

---

## Secret

민감 정보(비밀번호, 토큰, 인증서)를 저장. Base64 인코딩됨 (암호화 ≠ Base64).

> 실제 보안을 위해서는 etcd 암호화 + RBAC + Sealed Secrets / External Secrets 사용 권장

### 생성 방법

```bash
# 리터럴로 생성
kubectl create secret generic db-secret \
  --from-literal=POSTGRES_PASSWORD=supersecret \
  --from-literal=REDIS_PASSWORD=redispass

# 파일로 생성
kubectl create secret generic tls-secret \
  --from-file=tls.crt=./cert.pem \
  --from-file=tls.key=./key.pem

# Docker 레지스트리 인증
kubectl create secret docker-registry regcred \
  --docker-server=ghcr.io \
  --docker-username=myuser \
  --docker-password=ghp_xxx
```

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
stringData:                         # 평문으로 작성 (적용 시 자동 base64)
  POSTGRES_PASSWORD: supersecret
  REDIS_PASSWORD: redispass
```

### Pod에 주입

```yaml
spec:
  containers:
  - name: app
    envFrom:
    - secretRef:
        name: db-secret

    env:
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: POSTGRES_PASSWORD

  # Private 레지스트리 이미지 풀
  imagePullSecrets:
  - name: regcred
```

---

## Spring Boot에서 활용

### ConfigMap + Secret 조합

```yaml
# deployment.yaml
spec:
  containers:
  - name: app
    image: ghcr.io/myorg/myapp:1.0.0
    envFrom:
    - configMapRef:
        name: myapp-config     # APP_ENV, LOG_LEVEL 등
    - secretRef:
        name: db-secret        # DB_PASSWORD, REDIS_PASSWORD 등
    volumeMounts:
    - name: app-config
      mountPath: /app/config

  volumes:
  - name: app-config
    configMap:
      name: myapp-config
      items:
      - key: application.yml
        path: application.yml
```

```yaml
# application.yml (ConfigMap에서 마운트)
spring:
  datasource:
    url: jdbc:postgresql://postgres-svc:5432/mydb
    username: ${POSTGRES_USER}      # Secret에서 주입된 환경변수
    password: ${POSTGRES_PASSWORD}
  data:
    redis:
      password: ${REDIS_PASSWORD}
```

---

## External Secrets (프로덕션 권장)

AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault 등 외부 시크릿 저장소와 연동.

```yaml
# External Secrets Operator 설치 후
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-secret
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: ClusterSecretStore
  target:
    name: db-secret            # 생성될 K8s Secret 이름
  data:
  - secretKey: POSTGRES_PASSWORD
    remoteRef:
      key: prod/myapp/db       # AWS Secrets Manager 경로
      property: password
```

---

## 업데이트 반영

```bash
# ConfigMap 수정
kubectl edit configmap myapp-config
# 또는
kubectl apply -f configmap.yaml

# 환경변수로 주입된 경우: Pod 재시작 필요
kubectl rollout restart deployment/myapp

# 볼륨 마운트된 경우: 자동으로 반영됨 (약 1분 내)
```

---

## 관리 팁

```bash
# 현재 ConfigMap 내용 확인
kubectl get configmap myapp-config -o yaml

# Secret 내용 확인 (base64 디코딩)
kubectl get secret db-secret -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d

# 모든 Secret 목록
kubectl get secrets
```
