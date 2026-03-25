---
title: "ConfigMap과 Secret"
order: 5
---

## 왜 설정을 분리해야 하는가

도커 이미지에 설정값을 직접 넣으면 환경(개발/스테이징/운영)마다 이미지를 다시 빌드해야 합니다. 또한 비밀번호 같은 민감한 정보가 이미지에 포함되면 보안에 위험합니다.

**비유:**
- ConfigMap은 회사 공지사항 게시판입니다. 누구나 볼 수 있는 설정 정보(서버 주소, 로그 레벨 등)를 담습니다.
- Secret은 회사 금고입니다. 비밀번호, API 키 등 민감한 정보를 따로 보관합니다.
- Pod는 출근할 때 게시판과 금고에서 필요한 정보를 가져와서 일합니다.

```
ConfigMap (공개 설정)          Secret (민감 정보)
APP_ENV=production             DB_PASSWORD=supersecret
LOG_LEVEL=INFO                 JWT_SECRET=myjwtsecret
SERVER_PORT=8080               REDIS_PASSWORD=redispass
          ↓                              ↓
              Pod (환경변수로 주입 또는 볼륨 마운트)
```

---

## ConfigMap 생성

```bash
# 방법 1: 커맨드라인에서 직접 생성
kubectl create configmap app-config \
  --from-literal=APP_ENV=production \
  --from-literal=LOG_LEVEL=INFO \
  --from-literal=SERVER_PORT=8080

# 방법 2: properties 파일에서 생성 (파일명이 키, 내용이 값)
kubectl create configmap app-config --from-file=application.properties

# 방법 3: 디렉토리에서 생성 (각 파일이 하나의 키-값)
kubectl create configmap app-config --from-file=./config/

# 방법 4: YAML로 선언 (권장 — Git으로 관리 가능)
kubectl apply -f configmap.yaml
```

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  namespace: prod
data:
  # 단순 키-값
  APP_ENV: "production"
  LOG_LEVEL: "INFO"
  SERVER_PORT: "8080"
  POSTGRES_HOST: "postgres-svc"      # 서비스 이름으로 DB 주소 지정
  POSTGRES_PORT: "5432"
  REDIS_HOST: "redis-svc"
  REDIS_PORT: "6379"

  # 파일 내용도 키-값으로 저장 가능 (| = 멀티라인 문자열)
  application.yml: |
    spring:
      datasource:
        url: jdbc:postgresql://postgres-svc:5432/mydb
      jpa:
        show-sql: false
      data:
        redis:
          host: redis-svc
          port: 6379
```

---

## ConfigMap을 Pod에 주입하는 방법

### 방법 1: 전체를 환경변수로 주입

```yaml
spec:
  containers:
  - name: app
    image: myapp:1.0.0
    # ConfigMap의 모든 키를 환경변수로 주입
    envFrom:
    - configMapRef:
        name: myapp-config   # APP_ENV, LOG_LEVEL 등이 모두 환경변수가 됨
```

### 방법 2: 특정 키만 환경변수로 주입

```yaml
spec:
  containers:
  - name: app
    env:
    - name: MY_LOG_LEVEL        # 환경변수 이름 (ConfigMap 키와 달라도 됨)
      valueFrom:
        configMapKeyRef:
          name: myapp-config    # ConfigMap 이름
          key: LOG_LEVEL        # ConfigMap의 키
    - name: MY_PORT
      valueFrom:
        configMapKeyRef:
          name: myapp-config
          key: SERVER_PORT
```

### 방법 3: 파일로 마운트 (application.yml을 파일로)

```yaml
spec:
  containers:
  - name: app
    image: myapp:1.0.0
    volumeMounts:
    - name: config-volume
      mountPath: /app/config    # 이 경로에 파일이 생성됨
      readOnly: true

  volumes:
  - name: config-volume
    configMap:
      name: myapp-config        # ConfigMap 이름
      items:                    # 특정 키만 파일로 만들기
      - key: application.yml    # ConfigMap의 키
        path: application.yml   # 생성될 파일명
# 결과: /app/config/application.yml 파일이 생성됨
```

---

## Secret 생성

Secret은 민감한 데이터를 저장합니다. 내부적으로 Base64 인코딩됩니다 (암호화가 아닙니다).

> Base64는 단순 인코딩이므로 누구나 디코딩할 수 있습니다. Secret의 실제 보안은 RBAC(접근 제어)와 etcd 암호화로 보장합니다.

```bash
# 방법 1: 커맨드라인에서 직접 생성
kubectl create secret generic db-secret \
  --from-literal=POSTGRES_PASSWORD=supersecret \
  --from-literal=REDIS_PASSWORD=redispass \
  --from-literal=JWT_SECRET=myjwtsecret

# 방법 2: 파일에서 생성
kubectl create secret generic tls-secret \
  --from-file=tls.crt=./cert.pem \
  --from-file=tls.key=./key.pem

# 방법 3: Docker 레지스트리 인증 (프라이빗 이미지 풀)
kubectl create secret docker-registry regcred \
  --docker-server=ghcr.io \
  --docker-username=myuser \
  --docker-password=ghp_xxxxxxxxxxxx \
  -n prod
```

```yaml
# secret.yaml — stringData로 평문 작성 (kubectl apply 시 자동으로 base64 변환)
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secret
  namespace: prod
type: Opaque             # 일반 시크릿 (키-값 형식)
stringData:              # 평문으로 작성 (data 필드는 base64로 직접 인코딩)
  POSTGRES_USER: myuser
  POSTGRES_PASSWORD: supersecret123
  REDIS_PASSWORD: redispass456
  JWT_SECRET: very-long-jwt-secret-key-here
```

---

## Secret을 Pod에 주입

ConfigMap과 동일한 방식으로 주입합니다.

```yaml
spec:
  containers:
  - name: app
    image: myapp:1.0.0
    # ConfigMap + Secret 조합 (일반적인 패턴)
    envFrom:
    - configMapRef:
        name: myapp-config       # APP_ENV, LOG_LEVEL 등 공개 설정
    - secretRef:
        name: myapp-secret       # DB_PASSWORD, JWT_SECRET 등 민감 정보

    # 특정 Secret 키만 환경변수로
    env:
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: myapp-secret
          key: POSTGRES_PASSWORD

  # 프라이빗 레지스트리 이미지 풀 (imagePullSecrets)
  imagePullSecrets:
  - name: regcred
```

---

## Spring Boot에서 활용

### ConfigMap + Secret 조합 예시

```yaml
# deployment.yaml (핵심 부분)
spec:
  containers:
  - name: app
    image: ghcr.io/myorg/myapp:1.0.0
    envFrom:
    - configMapRef:
        name: myapp-config       # SPRING_PROFILES_ACTIVE, LOG_LEVEL 등
    - secretRef:
        name: myapp-secret       # DB_PASSWORD, REDIS_PASSWORD 등
    volumeMounts:
    - name: app-config-volume
      mountPath: /app/config     # application.yml 파일 마운트 위치

  volumes:
  - name: app-config-volume
    configMap:
      name: myapp-config
      items:
      - key: application.yml
        path: application.yml
```

```yaml
# ConfigMap에 저장된 application.yml
# 환경변수(Secret)와 함께 사용하는 패턴
spring:
  datasource:
    url: jdbc:postgresql://postgres-svc:5432/mydb
    username: ${POSTGRES_USER}         # Secret에서 주입된 환경변수 참조
    password: ${POSTGRES_PASSWORD}     # Secret에서 주입된 환경변수 참조
    hikari:
      maximum-pool-size: 10
  data:
    redis:
      host: redis-svc
      port: 6379
      password: ${REDIS_PASSWORD}
  jpa:
    show-sql: false
    hibernate:
      ddl-auto: none
```

---

## External Secrets — 프로덕션 권장 방식

프로덕션 환경에서는 Secret을 쿠버네티스 내에 직접 저장하지 않고, AWS Secrets Manager나 HashiCorp Vault 같은 전문 도구를 사용하는 것이 권장됩니다.

External Secrets Operator를 설치하면 외부 비밀 저장소의 값을 K8s Secret으로 자동 동기화합니다.

```yaml
# External Secrets Operator 설치 후 사용 예시
# AWS Secrets Manager에서 Secret 자동 생성
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-secret
  namespace: prod
spec:
  refreshInterval: 1h             # 1시간마다 외부 저장소와 동기화
  secretStoreRef:
    name: aws-secretsmanager      # AWS Secrets Manager 연결 설정
    kind: ClusterSecretStore
  target:
    name: myapp-secret            # 생성될 K8s Secret 이름
  data:
  - secretKey: POSTGRES_PASSWORD  # K8s Secret의 키
    remoteRef:
      key: prod/myapp/database    # AWS Secrets Manager 경로
      property: password          # JSON의 특정 필드
  - secretKey: REDIS_PASSWORD
    remoteRef:
      key: prod/myapp/redis
      property: password
```

---

## ConfigMap/Secret 업데이트

```bash
# ConfigMap 수정
kubectl edit configmap myapp-config -n prod
# 또는 YAML 파일 수정 후
kubectl apply -f configmap.yaml

# Secret 수정
kubectl edit secret myapp-secret -n prod
```

**중요: 환경변수로 주입된 경우 Pod 재시작 필요**
```bash
# ConfigMap/Secret 변경 후 Pod 재시작 (환경변수 방식)
kubectl rollout restart deployment/myapp -n prod

# 볼륨 마운트 방식은 약 1-2분 내 자동 반영
# (단, 앱에서 파일을 재읽어야 반영됨)
```

---

## 조회 및 관리

```bash
# ConfigMap 내용 확인
kubectl get configmap myapp-config -n prod -o yaml
kubectl describe configmap myapp-config -n prod

# Secret 내용 확인 (base64 디코딩)
kubectl get secret myapp-secret -n prod \
  -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d

# 모든 ConfigMap 목록
kubectl get configmaps -n prod

# 모든 Secret 목록
kubectl get secrets -n prod
```

---

## 자주 하는 실수

**실수 1: Secret을 Git에 커밋**
```bash
# .gitignore에 추가
secret.yaml
*-secret.yaml
secrets/
```

**실수 2: 환경변수 이름 충돌**
```yaml
# ConfigMap과 Secret에 같은 키가 있으면 나중에 오는 것이 덮어씀
envFrom:
- configMapRef:
    name: myapp-config    # LOG_LEVEL=INFO
- secretRef:
    name: myapp-secret    # LOG_LEVEL=DEBUG ← 이게 최종값
```

**실수 3: ConfigMap 변경 후 재시작 안 함**
```bash
# 환경변수로 주입된 경우 변경사항이 즉시 반영 안 됨
# 반드시 재시작 필요
kubectl rollout restart deployment/myapp -n prod
```

**실수 4: stringData vs data 혼용**
```yaml
# stringData: 평문으로 작성 (권장)
stringData:
  password: mypassword

# data: base64로 인코딩해서 작성
data:
  password: bXlwYXNzd29yZA==  # echo -n 'mypassword' | base64
```
