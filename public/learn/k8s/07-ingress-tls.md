---
title: "Ingress와 TLS"
order: 7
---

## Ingress 아키텍처

```
인터넷
  ↓
LoadBalancer Service (외부 IP)
  ↓
Ingress Controller Pod (nginx/traefik)
  ↓ 호스트/경로 매칭
Service A (api.example.com/*)
Service B (admin.example.com/*)
Service C (example.com/static/*)
```

---

## Ingress Controller 설치

### nginx Ingress Controller

```bash
# 헬름으로 설치 (추천)
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# minikube
minikube addons enable ingress

# 설치 확인
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

---

## 기본 Ingress 설정

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "10"
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-svc
            port:
              number: 80
```

---

## TLS 인증서

### cert-manager로 자동 발급 (Let's Encrypt)

```bash
# cert-manager 설치
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

```yaml
# ClusterIssuer (Let's Encrypt)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

```yaml
# Ingress에 TLS 적용
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls-cert      # cert-manager가 자동 생성
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-svc
            port:
              number: 80
```

### 수동 인증서

```bash
kubectl create secret tls api-tls-cert \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n prod
```

---

## 고급 라우팅

### 경로 재작성

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /api(/|$)(.*)      # /api/users → /users
        pathType: ImplementationSpecific
        backend:
          service:
            name: api-svc
            port:
              number: 80
```

### 요청 제한

```yaml
metadata:
  annotations:
    # Rate Limiting
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-connections: "20"

    # 요청 크기
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"

    # CORS
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://example.com"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE"
    nginx.ingress.kubernetes.io/cors-allow-headers: "Authorization, Content-Type"
```

### 인증 (Basic Auth)

```bash
# htpasswd 생성
htpasswd -c auth admin
kubectl create secret generic basic-auth --from-file=auth
```

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Admin Area"
```

### 세션 어피니티 (Sticky Session)

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "SERVERID"
    nginx.ingress.kubernetes.io/session-cookie-expires: "172800"
```

---

## 멀티 Ingress (네임스페이스 분리)

```yaml
# prod 네임스페이스
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: prod
spec:
  ingressClassName: nginx
  tls:
  - hosts: [api.example.com]
    secretName: prod-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-svc
            port:
              number: 80
---
# staging 네임스페이스
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: staging
spec:
  ingressClassName: nginx
  rules:
  - host: staging-api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-svc
            port:
              number: 80
```

---

## 트러블슈팅

```bash
# Ingress 상태 확인
kubectl describe ingress myapp-ingress

# Ingress Controller 로그
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller -f

# cert-manager 인증서 상태
kubectl get certificate
kubectl describe certificate api-tls-cert

# DNS 확인
kubectl get ingress
# NAME             HOSTS              ADDRESS        PORTS
# myapp-ingress    api.example.com    203.0.113.50   80, 443

# 로컬 테스트 (/etc/hosts 추가)
echo "203.0.113.50 api.example.com" >> /etc/hosts
curl https://api.example.com/actuator/health
```
