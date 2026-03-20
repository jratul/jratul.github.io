---
title: "Service와 네트워킹"
order: 4
---

## Service가 필요한 이유

Pod는 언제든 재시작될 수 있고, 재시작 시 IP가 바뀝니다. Service는 Pod에 **고정된 DNS 이름과 IP**를 부여합니다.

```
클라이언트 → myapp-service:80 (고정) → Pod(10.0.0.5)
                                      → Pod(10.0.0.6)  ← 로드밸런싱
                                      → Pod(10.0.0.7)
```

---

## Service 타입

### ClusterIP (기본값)

클러스터 내부에서만 접근 가능.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-svc
spec:
  type: ClusterIP
  selector:
    app: myapp          # 이 레이블을 가진 Pod로 트래픽 전달
  ports:
  - port: 80            # Service 포트
    targetPort: 8080    # Pod 포트
    protocol: TCP
```

```bash
# 클러스터 내부에서 접근
curl http://myapp-svc        # 같은 네임스페이스
curl http://myapp-svc.prod   # 다른 네임스페이스에서 (svc.namespace)
curl http://myapp-svc.prod.svc.cluster.local  # FQDN
```

### NodePort

각 노드의 포트를 통해 외부 접근 가능.

```yaml
spec:
  type: NodePort
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 8080
    nodePort: 30080     # 30000-32767 범위, 생략 시 자동 할당
```

```bash
# 노드 IP:NodePort로 접근
curl http://192.168.1.100:30080
```

### LoadBalancer

클라우드 환경(AWS/GCP/Azure)에서 외부 로드 밸런서 자동 생성.

```yaml
spec:
  type: LoadBalancer
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 8080
```

```bash
kubectl get svc myapp-svc
# NAME        TYPE           CLUSTER-IP    EXTERNAL-IP      PORT(S)
# myapp-svc   LoadBalancer   10.96.0.100   203.0.113.50     80:30080/TCP
```

### ExternalName

외부 DNS 이름으로 리다이렉트.

```yaml
spec:
  type: ExternalName
  externalName: db.example.com   # 클러스터 내부에서 db-svc로 접근 시 외부로 라우팅
```

---

## Headless Service

로드 밸런싱 없이 Pod IP 직접 반환. StatefulSet(DB 클러스터 등)에서 사용.

```yaml
spec:
  clusterIP: None       # Headless
  selector:
    app: postgres
```

```bash
# DNS 쿼리 시 개별 Pod IP 목록 반환
nslookup postgres-svc
# Address: 10.0.0.10  (postgres-0)
# Address: 10.0.0.11  (postgres-1)
```

---

## Ingress

HTTP/HTTPS 라우팅 규칙 정의. 실제 라우팅은 Ingress Controller(nginx, traefik 등)가 수행.

### Ingress Controller 설치

```bash
# minikube
minikube addons enable ingress

# nginx ingress controller (일반 K8s)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
```

### 기본 Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
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
            name: myapp-svc
            port:
              number: 80

  - host: admin.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-svc
            port:
              number: 80
```

### 경로 기반 라우팅

```yaml
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-svc
            port:
              number: 80
      - path: /admin
        pathType: Prefix
        backend:
          service:
            name: admin-svc
            port:
              number: 80
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-svc
            port:
              number: 80
```

### TLS 설정

```yaml
spec:
  tls:
  - hosts:
    - api.example.com
    secretName: tls-secret    # TLS 인증서가 저장된 Secret

  rules:
  - host: api.example.com
    ...
```

```bash
# TLS Secret 생성
kubectl create secret tls tls-secret \
  --cert=cert.pem \
  --key=key.pem
```

---

## NetworkPolicy

Pod 간 트래픽을 제한하는 방화벽 규칙.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-db
spec:
  podSelector:
    matchLabels:
      app: postgres           # 이 정책을 적용할 Pod
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: myapp          # myapp Pod에서만 postgres 접근 허용
    ports:
    - protocol: TCP
      port: 5432
```

```yaml
# 모든 인그레스 차단 후 허용 목록만 열기
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}             # 네임스페이스 내 모든 Pod
  policyTypes:
  - Ingress
  - Egress
```

---

## DNS 동작 방식

K8s 내부 DNS(CoreDNS)가 Service에 자동으로 DNS 레코드 생성.

```
서비스명.네임스페이스.svc.cluster.local

예:
myapp-svc.default.svc.cluster.local → 10.96.0.100
postgres-svc.prod.svc.cluster.local → 10.96.0.101
```

같은 네임스페이스에서는 서비스명만으로 접근 가능:
```bash
curl http://myapp-svc        # 같은 네임스페이스
curl http://myapp-svc.prod   # 다른 네임스페이스
```
