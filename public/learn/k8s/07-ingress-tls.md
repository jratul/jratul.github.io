---
title: "Ingress와 TLS"
order: 7
---

## Ingress 아키텍처 이해

Ingress는 HTTP/HTTPS 트래픽을 클러스터 내부 Service로 라우팅하는 규칙입니다. 하지만 규칙만으로는 동작하지 않습니다. 실제로 트래픽을 처리하는 **Ingress Controller**가 필요합니다.

**비유:** Ingress는 교통 법규(규칙)이고, Ingress Controller는 실제로 서 있는 교통 경찰관(실행자)입니다.

```
인터넷 (사용자)
    ↓ http://api.example.com
LoadBalancer (외부 IP 1개 = 요금 1개)
    ↓
Ingress Controller Pod (nginx 또는 traefik)
    ↓ 호스트/경로 매칭
    ├── api.example.com        → api-svc:80    → API Pod들
    ├── admin.example.com      → admin-svc:80  → Admin Pod들
    └── example.com/static     → static-svc:80 → Static Pod들
```

LoadBalancer를 서비스마다 만들면 외부 IP도 그만큼 필요(= 비용 증가)합니다. Ingress를 사용하면 외부 IP 하나로 여러 서비스를 운영할 수 있습니다.

---

## Ingress Controller 설치

### nginx Ingress Controller (가장 널리 사용)

```bash
# Helm으로 설치 (권장)
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2               # 고가용성을 위해 2개
  # --set controller.service.type=LoadBalancer  # 기본값 (클라우드)
  # --set controller.service.type=NodePort      # 온프레미스

# minikube (학습 환경)
minikube addons enable ingress

# 설치 확인
kubectl get pods -n ingress-nginx
# NAME                                        READY   STATUS
# ingress-nginx-controller-5d8b7d6d88-abc12   1/1     Running

# 외부 IP 확인 (클라우드 환경)
kubectl get svc -n ingress-nginx
# NAME                       TYPE           EXTERNAL-IP
# ingress-nginx-controller   LoadBalancer   203.0.113.50
```

---

## 기본 Ingress 설정

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: prod
  annotations:
    # nginx 관련 설정 (Ingress Controller에 따라 다름)
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"     # 최대 요청 크기 10MB
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"   # 읽기 타임아웃 60초
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "10" # 연결 타임아웃 10초
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"   # 전송 타임아웃 60초
spec:
  ingressClassName: nginx    # 어떤 Ingress Controller를 사용할지
  rules:
  - host: api.example.com    # 이 도메인으로 오는 요청
    http:
      paths:
      - path: /              # 모든 경로 (/로 시작하는 모든 URL)
        pathType: Prefix     # Prefix: 접두사 매칭
        backend:
          service:
            name: api-svc    # 이 Service로 전달
            port:
              number: 80
```

---

## TLS/HTTPS 설정

### cert-manager로 자동 인증서 발급 (Let's Encrypt)

Let's Encrypt를 통해 무료 TLS 인증서를 자동으로 발급받고 갱신합니다.

```bash
# 1. cert-manager 설치
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# 2. 설치 확인
kubectl get pods -n cert-manager
```

```yaml
# 2. ClusterIssuer 생성 (Let's Encrypt 발급자 설정)
# letsencrypt-prod: 실제 인증서 (도메인 소유 확인 필요)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com          # 인증서 만료 알림 이메일
    privateKeySecretRef:
      name: letsencrypt-prod          # ACME 계정 키 저장 Secret
    solvers:
    - http01:                         # HTTP-01 챌린지 방식
        ingress:
          class: nginx

---
# letsencrypt-staging: 테스트용 (rate limit 없음, 브라우저 신뢰 안 함)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-staging
    solvers:
    - http01:
        ingress:
          class: nginx
```

```yaml
# 3. Ingress에 TLS 적용
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: prod
  annotations:
    # cert-manager가 자동으로 인증서 발급
    cert-manager.io/cluster-issuer: letsencrypt-prod
    # HTTP → HTTPS 리다이렉트
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls-cert          # cert-manager가 이 이름으로 Secret 자동 생성
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

```bash
# 인증서 발급 상태 확인
kubectl get certificate -n prod
# NAME           READY   SECRET         AGE
# api-tls-cert   True    api-tls-cert   5m   ← True이면 발급 완료

kubectl describe certificate api-tls-cert -n prod
```

### 수동 인증서 등록

```bash
# 기존 인증서(Let's Encrypt, 사내 CA 등)를 직접 등록
kubectl create secret tls api-tls-cert \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n prod
```

---

## 고급 라우팅 설정

### 경로 재작성 (Path Rewrite)

```yaml
# /api/users → /users 로 경로 변경 후 전달
metadata:
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /api(/|$)(.*)     # 캡처 그룹 $2 = api 이후 경로
        pathType: ImplementationSpecific
        backend:
          service:
            name: api-svc
            port:
              number: 80
```

### Rate Limiting — 과도한 요청 제한

```yaml
metadata:
  annotations:
    # Rate Limiting: 초당 100 요청 제한
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-connections: "20"
    # 화이트리스트 IP는 제한 없음
    nginx.ingress.kubernetes.io/limit-whitelist: "192.168.1.0/24"
```

### CORS 설정

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://example.com,https://admin.example.com"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "Authorization, Content-Type, X-Request-ID"
    nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
    nginx.ingress.kubernetes.io/cors-max-age: "86400"   # preflight 캐시 1일
```

### 인증 (Basic Auth)

```bash
# htpasswd 파일 생성
htpasswd -c auth admin
# 비밀번호 입력...

# Secret으로 등록
kubectl create secret generic basic-auth \
  --from-file=auth \
  -n prod
```

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Protected Area"
```

### 세션 어피니티 (Sticky Session)

세션 기반 앱에서 같은 사용자의 요청을 항상 같은 Pod로 보냅니다.

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "SERVERID"
    nginx.ingress.kubernetes.io/session-cookie-expires: "172800"   # 2일 (초)
    nginx.ingress.kubernetes.io/session-cookie-max-age: "172800"
```

---

## 환경별 Ingress 설정

```yaml
# prod 네임스페이스 — 실제 도메인 + TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: prod
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts: [api.example.com]
    secretName: prod-tls-cert
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
# staging 네임스페이스 — 스테이징 도메인 (TLS 선택사항)
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

## 실전 Spring Boot Ingress 설정

```yaml
# Spring Boot 앱을 위한 완전한 Ingress 설정
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: spring-app-ingress
  namespace: prod
  annotations:
    # TLS
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"

    # 타임아웃 (Spring Boot 응답 시간에 맞게)
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "10"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "120"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "120"

    # 파일 업로드 크기
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"

    # CORS (프론트엔드 도메인 허용)
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://example.com"

    # 헬스체크 경로 제외 (로그 노이즈 줄이기)
    nginx.ingress.kubernetes.io/configuration-snippet: |
      location /actuator/health {
        access_log off;
        return 200;
      }
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls-cert
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: spring-app-svc
            port:
              number: 80
```

---

## 트러블슈팅

```bash
# 1. Ingress 상태 확인
kubectl describe ingress myapp-ingress -n prod
# Annotations, Rules, Events 확인

# 2. Ingress Controller 로그
kubectl logs -n ingress-nginx \
  -l app.kubernetes.io/component=controller \
  -f --tail=50

# 3. Ingress Controller가 Ingress를 인식했는지
kubectl get ingress -A
# NAME             NAMESPACE   HOSTS              ADDRESS         PORTS
# myapp-ingress    prod        api.example.com    203.0.113.50    80, 443

# 4. cert-manager 인증서 상태
kubectl get certificate -n prod
kubectl describe certificate api-tls-cert -n prod

# 5. DNS 확인 (외부에서 접근 안 될 때)
# Ingress의 ADDRESS가 DNS에 등록됐는지 확인
nslookup api.example.com
dig api.example.com

# 6. 로컬 테스트 (/etc/hosts에 임시 등록)
echo "203.0.113.50 api.example.com" | sudo tee -a /etc/hosts
curl https://api.example.com/actuator/health
```

**자주 하는 실수:**
- Ingress를 만들었는데 `ingressClassName: nginx`를 빠트리면 Controller가 무시합니다
- cert-manager 없이 TLS secretName만 설정하면 인증서 발급이 안 됩니다
- Service의 포트 이름과 Ingress의 포트 번호가 불일치하면 502 에러가 납니다
