---
title: "OSI 7계층과 TCP/IP"
order: 1
---

# OSI 7계층과 TCP/IP

네트워크의 기반 개념. 트러블슈팅할 때 어느 계층 문제인지 파악하는 데 필수다.

---

## OSI 7계층

```
7. 응용 계층 (Application)  — HTTP, FTP, DNS, SMTP
6. 표현 계층 (Presentation) — 암호화, 압축, 인코딩 (SSL/TLS)
5. 세션 계층 (Session)      — 연결 관리, 동기화
4. 전송 계층 (Transport)    — TCP, UDP, 포트 번호
3. 네트워크 계층 (Network)  — IP, 라우팅
2. 데이터링크 계층 (Data Link) — MAC 주소, 이더넷, 스위치
1. 물리 계층 (Physical)     — 케이블, 신호
```

실무에서는 4계층(TCP/UDP)과 7계층(HTTP)을 가장 많이 다룬다.

---

## TCP/IP 4계층

OSI 7계층을 실용적으로 줄인 모델. 실제 인터넷이 이 기반.

```
4. 응용 계층 (Application) — HTTP, HTTPS, DNS, FTP, SSH
3. 전송 계층 (Transport)   — TCP, UDP
2. 인터넷 계층 (Internet)  — IP, ICMP
1. 네트워크 접근 계층      — 이더넷, Wi-Fi
```

---

## IP 주소

```
IPv4: 32비트, 4개 옥텟
예: 192.168.1.100

클래스:
A: 1.0.0.0   ~ 126.255.255.255  (대형 네트워크)
B: 128.0.0.0 ~ 191.255.255.255  (중형)
C: 192.0.0.0 ~ 223.255.255.255  (소형 — 가장 흔함)

사설 IP (인터넷에서 라우팅 안 됨):
10.0.0.0/8       (10.x.x.x)
172.16.0.0/12    (172.16.x.x ~ 172.31.x.x)
192.168.0.0/16   (192.168.x.x)

특수 IP:
127.0.0.1        — loopback (자기 자신)
0.0.0.0          — 모든 인터페이스
255.255.255.255  — 브로드캐스트
```

---

## 서브넷 마스크 (CIDR)

```
192.168.1.0/24
           ↑
           24비트가 네트워크 부분, 나머지 8비트가 호스트

/24 → 255.255.255.0   → 호스트 256개 (사용 가능 254개)
/25 → 255.255.255.128 → 호스트 128개
/16 → 255.255.0.0     → 호스트 65536개
/8  → 255.0.0.0       → 호스트 1677만개

AWS VPC 예시:
VPC:       10.0.0.0/16      → 65536개 IP
Public:    10.0.1.0/24      → 256개 IP
Private:   10.0.2.0/24      → 256개 IP
```

---

## TCP — 연결 지향 프로토콜

신뢰성 있는 데이터 전송. HTTP, HTTPS, SSH가 TCP 사용.

```
3-way Handshake (연결 수립):
클라이언트 → 서버: SYN
서버 → 클라이언트: SYN-ACK
클라이언트 → 서버: ACK
→ 연결 수립 완료

4-way Handshake (연결 종료):
클라이언트 → 서버: FIN
서버 → 클라이언트: ACK
서버 → 클라이언트: FIN
클라이언트 → 서버: ACK
→ 연결 종료
```

```
TCP 특성:
✅ 순서 보장 — 패킷이 다른 순서로 도착해도 순서대로 재조립
✅ 신뢰성   — 손실된 패킷 재전송
✅ 흐름 제어 — 수신자 처리 속도에 맞춰 전송 속도 조절
✅ 혼잡 제어 — 네트워크 혼잡 시 전송 속도 감소
❌ 오버헤드  — 연결 수립/유지 비용
```

---

## UDP — 비연결 프로토콜

빠르지만 신뢰성 없음. DNS, 게임, 스트리밍, WebRTC가 UDP 사용.

```
UDP 특성:
✅ 빠름      — 연결 수립 없이 바로 전송
✅ 낮은 지연 — 실시간 통신에 적합
❌ 순서 보장 없음
❌ 재전송 없음 — 손실 패킷 그냥 버림
❌ 흐름 제어 없음
```

---

## 포트 번호

```
범위:
0-1023      — Well-known 포트 (root 권한 필요)
1024-49151  — 등록된 포트 (앱 서버)
49152-65535 — 동적/사설 포트 (클라이언트 임시 포트)

주요 포트:
22    — SSH
25    — SMTP
53    — DNS
80    — HTTP
443   — HTTPS
3306  — MySQL
5432  — PostgreSQL
6379  — Redis
8080  — HTTP 대체 (개발/앱 서버)
27017 — MongoDB
```

---

## 패킷의 여정

```
브라우저에서 https://api.example.com/users 요청 시:

1. DNS 조회: api.example.com → 93.184.216.34
2. TCP 연결: 3-way handshake (포트 443)
3. TLS 핸드셰이크: 암호화 협상
4. HTTP 요청: GET /users HTTP/1.1
5. 서버 처리
6. HTTP 응답: 200 OK + JSON
7. TCP 연결 종료 또는 재사용 (Keep-Alive)
```

---

## 실무 연관

```
L4 로드밸런서 — TCP 레벨에서 분산 (IP:Port 기준)
L7 로드밸런서 — HTTP 레벨에서 분산 (URL, 헤더 기준)

AWS:
NLB (Network Load Balancer) → L4
ALB (Application Load Balancer) → L7

Kubernetes:
Service (ClusterIP/NodePort) → L4
Ingress → L7

"포트가 열려있는데 연결이 안 된다" 디버깅:
1. 서비스 실행 중? (systemctl status)
2. 포트 리스닝? (ss -tlnp | grep PORT)
3. 방화벽 차단? (ufw status)
4. 경로 있음? (ping, traceroute)
5. DNS 올바름? (dig, nslookup)
```
