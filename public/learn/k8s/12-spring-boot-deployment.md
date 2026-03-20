---
title: "실전 — Spring Boot 배포"
order: 12
---

## 전체 구성

```
GitHub Actions (CI/CD)
    ↓ docker build & push
ghcr.io (이미지 레지스트리)
    ↓ helm upgrade
Kubernetes Cluster
    ├── Namespace: prod
    │   ├── Deployment (myapp × 3)
    │   ├── Service (ClusterIP)
    │   ├── Ingress (nginx + TLS)
    │   ├── HPA (2~10 replicas)
    │   ├── ConfigMap (app 설정)
    │   ├── Secret (DB 비밀번호)
    │   └── ServiceMonitor (Prometheus)
    ├── Namespace: prod (infra)
    │   ├── StatefulSet (postgres)
    │   └── StatefulSet (redis)
    └── Namespace: monitoring
        └── kube-prometheus-stack
```

---

## 디렉토리 구조

```
myapp/
├── Dockerfile
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   └── servicemonitor.yaml
├── helm/
│   └── myapp/              # Helm 차트 (선택)
└── .github/
    └── workflows/
        └── deploy.yml
```

---

## 매니페스트 작성

### namespace.yaml

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: prod
  labels:
    pod-security.kubernetes.io/enforce: baseline
```

### configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  namespace: prod
data:
  SPRING_PROFILES_ACTIVE: "prod"
  SERVER_PORT: "8080"
  POSTGRES_HOST: "postgres-svc"
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "mydb"
  REDIS_HOST: "redis-svc"
  REDIS_PORT: "6379"
```

### secret.yaml

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secret
  namespace: prod
type: Opaque
stringData:
  POSTGRES_USER: myuser
  POSTGRES_PASSWORD: supersecret
  REDIS_PASSWORD: redispass
  JWT_SECRET: myjwtsecret
```

### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: myapp
    spec:
      serviceAccountName: myapp-sa
      terminationGracePeriodSeconds: 60
      containers:
      - name: app
        image: ghcr.io/myorg/myapp:latest   # CI/CD에서 교체
        ports:
        - containerPort: 8080
          name: http
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
        startupProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          failureThreshold: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 5
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]   # 트래픽 드레인 대기
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1001
          capabilities:
            drop: ["ALL"]
      volumes:
      - name: tmp
        emptyDir: {}
```

### service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-svc
  namespace: prod
  labels:
    app: myapp
spec:
  type: ClusterIP
  selector:
    app: myapp
  ports:
  - name: http
    port: 80
    targetPort: 8080
```

### ingress.yaml

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: prod
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.example.com
    secretName: myapp-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: myapp-svc
            port:
              number: 80
```

### hpa.yaml

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
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300   # 스케일 다운은 5분 안정화 후
```

---

## GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
    tags: ['v*']

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-java@v4
      with:
        java-version: '21'
        distribution: 'temurin'
        cache: gradle
    - run: ./gradlew test

  build-push:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.version }}
    steps:
    - uses: actions/checkout@v4

    - uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=sha,prefix=sha-
          type=semver,pattern={{version}}
          type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

    - uses: docker/build-push-action@v5
      with:
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy:
    needs: build-push
    runs-on: ubuntu-latest
    environment: production
    steps:
    - uses: actions/checkout@v4

    - uses: azure/setup-kubectl@v3

    - uses: azure/k8s-set-context@v3
      with:
        method: kubeconfig
        kubeconfig: ${{ secrets.KUBECONFIG }}

    # 이미지 태그 업데이트 후 배포
    - name: Deploy
      run: |
        IMAGE_TAG=${{ needs.build-push.outputs.image-tag }}
        kubectl set image deployment/myapp \
          app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${IMAGE_TAG} \
          -n prod

        kubectl rollout status deployment/myapp -n prod --timeout=5m

    # 또는 Helm으로 배포
    - name: Deploy with Helm
      run: |
        helm upgrade --install myapp ./helm/myapp \
          --namespace prod \
          --set image.tag=${{ needs.build-push.outputs.image-tag }} \
          --wait --timeout=5m
```

---

## 배포 후 확인

```bash
# 롤아웃 상태
kubectl rollout status deployment/myapp -n prod

# Pod 상태
kubectl get pods -n prod -l app=myapp
kubectl describe pod myapp-xxx -n prod

# 로그
kubectl logs -n prod -l app=myapp --tail=100 -f

# 이벤트 (에러 확인)
kubectl get events -n prod --sort-by=.lastTimestamp

# Ingress 주소
kubectl get ingress -n prod

# HPA 상태
kubectl get hpa -n prod

# 리소스 사용량
kubectl top pods -n prod
```

---

## 트러블슈팅

### Pod가 Pending 상태

```bash
kubectl describe pod myapp-xxx -n prod
# Events에서 원인 확인:
# - Insufficient memory/cpu → 노드 리소스 부족
# - No nodes available → nodeSelector/taint 확인
# - Unbound PVC → 스토리지 프로비저너 확인
```

### CrashLoopBackOff

```bash
# 현재 로그
kubectl logs myapp-xxx -n prod
# 이전 컨테이너 로그 (크래시 직전)
kubectl logs myapp-xxx -n prod --previous
```

### ImagePullBackOff

```bash
# Secret 확인
kubectl get secret regcred -n prod -o yaml
# SA에 imagePullSecrets 추가
kubectl patch serviceaccount myapp-sa -n prod \
  -p '{"imagePullSecrets": [{"name": "regcred"}]}'
```

### 서비스 연결 안 됨

```bash
# DNS 확인 (Pod 내부에서)
kubectl exec -it myapp-xxx -n prod -- nslookup postgres-svc
kubectl exec -it myapp-xxx -n prod -- curl http://myapp-svc/actuator/health
```
