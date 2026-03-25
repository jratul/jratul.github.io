---
title: "Service와 네트워킹"
order: 4
---

## Service가 왜 필요한가

Pod는 언제든 삭제되고 새로 만들어질 수 있습니다. 새로 만들어진 Pod는 IP 주소가 바뀝니다. 그렇다면 다른 서비스가 이 Pod에 어떻게 안정적으로 접근할 수 있을까요?

**비유:** Pod가 배달원이라면, 배달원은 매일 바뀝니다(Pod 재시작 = 새 배달원). 하지만 고객은 배달원이 누구든 "치킨집 전화번호(Service)"로 주문하면 됩니다. Service는 고정된 전화번호이고, 내부적으로 현재 가용한 Pod에게 연결해 줍니다.

```
클라이언트
    ↓ http://myapp-svc:80 (변하지 않는 주소)
Service (고정 IP + DNS)
    ↓ 로드밸런싱
Pod (10.0.0.5) ←→ Pod (10.0.0.6) ←→ Pod (10.0.0.7)
```

---

## ClusterIP — 클러스터 내부 통신

클러스터 내부에서만 접근 가능한 Service입니다. Pod 간 통신에 사용합니다.

```yaml
# service-clusterip.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-svc     # 이 이름이 DNS 주소가 됩니다
  namespace: prod
spec:
  type: ClusterIP     # 기본값 (생략 가능)
  selector:
    app: myapp        # app=myapp 레이블을 가진 Pod로 트래픽 전달
  ports:
  - name: http
    port: 80          # Service 포트 (외부에서 접근하는 포트)
    targetPort: 8080  # Pod의 실제 포트 (컨테이너 포트)
    protocol: TCP
```

```bash
# 같은 네임스페이스에서 접근
curl http://myapp-svc
curl http://myapp-svc:80

# 다른 네임스페이스에서 접근 (서비스명.네임스페이스)
curl http://myapp-svc.prod

# 완전한 FQDN (Fully Qualified Domain Name)
curl http://myapp-svc.prod.svc.cluster.local

# 테스트용 Pod를 만들어서 내부 DNS 확인
kubectl run curl-test --image=curlimages/curl --rm -it -- sh
# Pod 내부에서:
curl http://myapp-svc.prod/actuator/health
```

---

## NodePort — 외부에서 노드 IP로 접근

각 노드의 특정 포트를 열어서 외부에서 접근 가능하게 합니다. 주로 개발/테스트 환경이나 온프레미스 환경에서 사용합니다.

```yaml
spec:
  type: NodePort
  selector:
    app: myapp
  ports:
  - port: 80            # Service 포트 (클러스터 내부)
    targetPort: 8080    # Pod 포트
    nodePort: 30080     # 노드 포트 (30000-32767 범위, 생략 시 자동 할당)
```

```bash
# 접근 방법: 아무 노드 IP:NodePort
curl http://192.168.1.100:30080
curl http://192.168.1.101:30080  # 다른 노드도 같은 포트로 접근 가능

# minikube에서 접근
minikube service myapp-svc --url
```

> NodePort는 포트 범위가 30000-32767로 제한되고, 모든 노드에 같은 포트가 열립니다. 프로덕션에서는 LoadBalancer나 Ingress를 사용하세요.

---

## LoadBalancer — 클라우드 로드 밸런서

클라우드 환경(AWS, GCP, Azure)에서 외부 로드 밸런서를 자동으로 생성합니다.

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
# 외부 IP 확인 (클라우드에서 자동 할당, 시간이 걸릴 수 있음)
kubectl get svc myapp-svc -n prod
# NAME        TYPE           CLUSTER-IP    EXTERNAL-IP      PORT(S)
# myapp-svc   LoadBalancer   10.96.0.100   203.0.113.50     80:30080/TCP

# 외부 IP가 할당되면 직접 접근 가능
curl http://203.0.113.50/actuator/health
```

> LoadBalancer는 각 Service마다 별도의 외부 IP(=요금)가 필요합니다. 여러 서비스를 운영할 때는 Ingress를 사용하면 IP 하나로 여러 서비스를 라우팅할 수 있습니다.

---

## ExternalName — 외부 서비스 추상화

클러스터 내부에서 외부 DNS를 내부 Service처럼 사용할 수 있습니다. 외부 DB나 SaaS 서비스에 접근할 때 유용합니다.

```yaml
# 클러스터 내에서 'legacy-db'라는 이름으로 외부 DB에 접근
apiVersion: v1
kind: Service
metadata:
  name: legacy-db
  namespace: prod
spec:
  type: ExternalName
  externalName: legacy.database.company.internal  # 외부 DNS 이름
```

```bash
# 클러스터 내부에서 외부 DB에 접근
# legacy.database.company.internal 대신 legacy-db로 접근 가능
jdbc:postgresql://legacy-db:5432/mydb
```

---

## Headless Service — Pod IP 직접 반환

로드 밸런싱 없이 Pod의 IP를 직접 반환합니다. StatefulSet(DB 클러스터)에서 특정 Pod에 직접 접근할 때 사용합니다.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
  namespace: prod
spec:
  clusterIP: None       # clusterIP를 None으로 설정 = Headless
  selector:
    app: postgres
  ports:
  - port: 5432
```

```bash
# DNS 조회 시 개별 Pod IP 목록 반환
nslookup postgres-headless.prod.svc.cluster.local
# Address: 10.0.0.10  (postgres-0)
# Address: 10.0.0.11  (postgres-1)
# Address: 10.0.0.12  (postgres-2)

# StatefulSet의 특정 Pod에 직접 접근
# 형식: pod이름.서비스이름.네임스페이스.svc.cluster.local
jdbc:postgresql://postgres-0.postgres-headless.prod.svc.cluster.local:5432/mydb
```

---

## Ingress — HTTP/HTTPS 라우팅

Ingress는 HTTP/HTTPS 트래픽을 여러 Service로 라우팅하는 규칙입니다. 하나의 외부 IP로 여러 서비스를 운영할 수 있습니다.

**비유:** Ingress는 호텔 안내데스크입니다. "api.example.com에서 왔어요" → "3층 API 서버로 가세요", "admin.example.com에서 왔어요" → "5층 관리자 페이지로 가세요"처럼 목적지를 안내합니다.

```
인터넷
  ↓ 203.0.113.50 (외부 IP 1개)
Ingress Controller (nginx)
  ↓ 호스트/경로 매칭
  api.example.com    → api-svc:80
  admin.example.com  → admin-svc:80
  example.com/static → static-svc:80
```

### Ingress Controller 설치

Ingress 규칙만으로는 동작하지 않습니다. 실제 라우팅을 처리하는 Ingress Controller를 먼저 설치해야 합니다.

```bash
# minikube (학습 환경)
minikube addons enable ingress

# Helm으로 nginx Ingress Controller 설치 (일반 환경)
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# 설치 확인
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

### 기본 Ingress 설정

```yaml
# ingress.yaml — 호스트 기반 라우팅
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: prod
  annotations:
    # nginx 설정 커스터마이징
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"         # 최대 요청 크기
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"       # 읽기 타임아웃
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "10"    # 연결 타임아웃
spec:
  ingressClassName: nginx    # 어떤 Ingress Controller를 사용할지
  rules:
  - host: api.example.com    # 이 호스트로 오는 요청
    http:
      paths:
      - path: /              # 모든 경로
        pathType: Prefix
        backend:
          service:
            name: api-svc    # 이 Service로 전달
            port:
              number: 80

  - host: admin.example.com  # 다른 호스트
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
# 하나의 도메인에서 경로로 서비스 구분
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /api       # /api/* → API 서버
        pathType: Prefix
        backend:
          service:
            name: api-svc
            port:
              number: 80

      - path: /admin     # /admin/* → 관리자 페이지
        pathType: Prefix
        backend:
          service:
            name: admin-svc
            port:
              number: 80

      - path: /          # /* → 프론트엔드 (마지막에 위치해야 함)
        pathType: Prefix
        backend:
          service:
            name: frontend-svc
            port:
              number: 80
```

### TLS/HTTPS 설정

```yaml
spec:
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls-cert    # TLS 인증서가 담긴 Secret
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
# 수동으로 TLS Secret 생성 (인증서 파일이 있을 때)
kubectl create secret tls api-tls-cert \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n prod
```

---

## NetworkPolicy — 네트워크 방화벽

기본적으로 모든 Pod는 서로 통신할 수 있습니다. NetworkPolicy로 특정 Pod만 통신하도록 제한할 수 있습니다.

**비유:** 회사 내부 네트워크에서 개발팀은 DB 서버에 접근할 수 있지만, 일반 직원은 못 하도록 방화벽을 설정하는 것과 같습니다.

```yaml
# myapp Pod에서만 postgres Pod의 5432 포트 접근 허용
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-myapp-to-postgres
  namespace: prod
spec:
  podSelector:
    matchLabels:
      app: postgres        # 이 정책을 적용할 대상 Pod
  policyTypes:
  - Ingress                # 인바운드 트래픽 제어
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: myapp       # myapp Pod에서 오는 트래픽만 허용
    ports:
    - protocol: TCP
      port: 5432           # 5432 포트만 허용
```

```yaml
# 기본적으로 모든 트래픽 차단 (화이트리스트 방식)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: prod
spec:
  podSelector: {}          # 네임스페이스 내 모든 Pod
  policyTypes:
  - Ingress
  - Egress
  # ingress/egress 규칙 없음 = 모두 차단
```

---

## K8s 내부 DNS 동작 방식

쿠버네티스는 CoreDNS를 통해 Service에 자동으로 DNS 이름을 부여합니다.

```
DNS 형식: {서비스명}.{네임스페이스}.svc.cluster.local

예시:
myapp-svc.prod.svc.cluster.local     → 10.96.0.100
postgres-svc.prod.svc.cluster.local  → 10.96.0.101
redis-svc.prod.svc.cluster.local     → 10.96.0.102
```

**접근 편의성:** 같은 네임스페이스 안에서는 서비스명만으로 접근 가능합니다.

```bash
# prod 네임스페이스 안의 Pod에서
curl http://myapp-svc           # 같은 네임스페이스
curl http://myapp-svc.prod      # 명시적 네임스페이스 지정
curl http://redis-svc:6379      # 다른 서비스 접근

# 다른 네임스페이스(dev)에서 prod 서비스에 접근
curl http://myapp-svc.prod
curl http://postgres-svc.prod:5432
```

---

## 트러블슈팅

**Service에 접근이 안 될 때:**
```bash
# 1. Service 상태 확인
kubectl get svc myapp-svc -n prod
kubectl describe svc myapp-svc -n prod

# 2. Endpoints 확인 (Pod가 연결됐는지)
kubectl get endpoints myapp-svc -n prod
# ADDRESS            PORTS
# 10.0.0.5:8080      ← Pod IP가 연결됨
# (비어있으면 selector 레이블 불일치)

# 3. Pod 레이블 확인
kubectl get pods -n prod --show-labels
kubectl get pods -n prod -l app=myapp

# 4. Pod 내부에서 직접 DNS 테스트
kubectl exec -it myapp-xxx -n prod -- nslookup postgres-svc
kubectl exec -it myapp-xxx -n prod -- curl http://myapp-svc/actuator/health

# 5. Ingress 상태
kubectl describe ingress myapp-ingress -n prod
kubectl get events -n prod
```
