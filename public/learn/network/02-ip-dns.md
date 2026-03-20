---
title: "IP 주소, 서브넷, DNS"
order: 2
---

# IP 주소, 서브넷, DNS

서버 네트워크 설계와 트러블슈팅의 기본.

---

## IP 주소 체계

```
공인 IP (Public IP)
— 인터넷에서 유일한 주소
— ISP 또는 클라우드 프로바이더가 할당
— 예: EC2 인스턴스의 외부 IP

사설 IP (Private IP)
— 내부 네트워크에서만 사용
— 인터넷 라우팅 불가
— NAT를 통해 공인 IP로 변환
— 10.x.x.x, 172.16-31.x.x, 192.168.x.x

고정 IP (Static IP)
— 변경되지 않는 IP (AWS Elastic IP)

동적 IP (Dynamic IP)
— DHCP로 할당, 재시작 시 변경 가능
```

---

## 서브넷 설계

```
CIDR 표기: IP주소/프리픽스길이

/32 = 단일 호스트 (255.255.255.255)
/31 = 2개 IP (포인트-투-포인트 링크)
/30 = 4개 IP (사용 가능 2개)
/29 = 8개 IP (사용 가능 6개)
/28 = 16개 IP (사용 가능 14개)
/27 = 32개 IP
/26 = 64개 IP
/25 = 128개 IP
/24 = 256개 IP (사용 가능 254개) ← 가장 흔함
/23 = 512개 IP
/22 = 1024개 IP
/16 = 65536개 IP
/8  = 16,777,216개 IP

주의: 각 서브넷에서 첫 번째(네트워크 주소)와
      마지막(브로드캐스트) IP는 사용 불가
```

```
AWS VPC 설계 예시:
VPC: 10.0.0.0/16 (65536개 IP)
├── ap-northeast-2a (서울)
│   ├── public-subnet-a:  10.0.1.0/24   (인터넷 게이트웨이 연결)
│   └── private-subnet-a: 10.0.10.0/24  (NAT 게이트웨이 통해 외부 접근)
├── ap-northeast-2b
│   ├── public-subnet-b:  10.0.2.0/24
│   └── private-subnet-b: 10.0.20.0/24
└── ap-northeast-2c
    ├── public-subnet-c:  10.0.3.0/24
    └── private-subnet-c: 10.0.30.0/24

규칙:
- 웹 서버 → public subnet
- 앱 서버, DB → private subnet (외부에서 직접 접근 불가)
```

---

## NAT (Network Address Translation)

```
사설 IP → 공인 IP 변환

집/사무실 공유기:
192.168.1.10 → [NAT] → 203.xxx.xxx.1 (공인 IP)
192.168.1.11 → [NAT] → 203.xxx.xxx.1 (같은 공인 IP, 포트로 구분)

AWS:
private subnet의 EC2 → NAT Gateway → 인터넷
(EC2는 공인 IP 없어도 외부 통신 가능)
```

---

## DNS (Domain Name System)

IP 주소를 사람이 읽기 쉬운 도메인으로 변환.

```
조회 순서:
1. 브라우저 캐시
2. OS 캐시
3. /etc/hosts 파일
4. 로컬 DNS 서버 (공유기/ISP)
5. 루트 DNS 서버
6. TLD DNS 서버 (.com, .kr 등)
7. 권한 DNS 서버 (도메인 소유자가 관리)
```

---

## DNS 레코드 타입

```
A     — 도메인 → IPv4
        example.com → 93.184.216.34

AAAA  — 도메인 → IPv6
        example.com → 2606:2800:...

CNAME — 도메인 → 다른 도메인 (별칭)
        www.example.com → example.com
        api.example.com → myapp.elb.amazonaws.com

MX    — 메일 서버 지정
        example.com MX → mail.example.com

TXT   — 텍스트 (도메인 소유 확인, SPF, DKIM)
        example.com TXT "v=spf1 include:_spf.google.com ~all"

NS    — 권한 DNS 서버 지정
        example.com NS → ns1.cloudflare.com

PTR   — IP → 도메인 (역방향)
        93.184.216.34 → example.com

SRV   — 서비스 위치 (쿠버네티스 서비스 디스커버리 등)
```

---

## DNS 조회 명령어

```bash
# dig — 상세 조회
dig example.com
dig example.com A           # A 레코드
dig example.com MX          # MX 레코드
dig example.com +short      # 결과만
dig @8.8.8.8 example.com   # Google DNS 서버로 조회
dig -x 93.184.216.34        # 역방향 조회

# nslookup
nslookup example.com
nslookup example.com 8.8.8.8

# host
host example.com

# 캐시 TTL 확인 (dig 결과에서)
# example.com. 300 IN A 93.184.216.34
#              ↑
#              TTL: 300초 후 캐시 만료
```

---

## /etc/hosts — 로컬 DNS 오버라이드

DNS 조회 전에 먼저 확인하는 파일. 개발 환경에서 유용.

```bash
cat /etc/hosts

# 기본 내용
127.0.0.1   localhost
::1         localhost

# 개발 환경 설정 예시
127.0.0.1   api.local
127.0.0.1   auth.local
10.0.0.5    db.internal
10.0.0.6    cache.internal
```

---

## /etc/resolv.conf — DNS 서버 설정

```bash
cat /etc/resolv.conf

# nameserver — 사용할 DNS 서버
nameserver 8.8.8.8      # Google DNS
nameserver 8.8.4.4      # Google DNS 보조
nameserver 1.1.1.1      # Cloudflare DNS

# search — 도메인 검색 접미사
search example.com      # "api" 입력 시 "api.example.com" 조회
```

---

## DNS 트러블슈팅

```bash
# 도메인 → IP 확인
dig +short api.example.com

# 특정 DNS 서버로 조회 (다른 결과 비교)
dig @1.1.1.1 example.com
dig @8.8.8.8 example.com
dig @169.254.169.253 example.com  # AWS VPC DNS

# TTL 확인 (캐시 만료 시간)
dig example.com | grep -A1 "ANSWER SECTION"

# DNS 전파 확인 (레코드 변경 후)
dig @ns1.cloudflare.com example.com  # 권한 서버 직접 조회

# Kubernetes 내부 DNS
kubectl exec -it pod-name -- nslookup kubernetes.default
kubectl exec -it pod-name -- cat /etc/resolv.conf
# search default.svc.cluster.local svc.cluster.local cluster.local
# nameserver 10.96.0.10  ← CoreDNS
```

---

## 실무 패턴

```
서비스 URL 설계:
api.example.com       → ALB → 앱 서버
admin.example.com     → ALB → 관리 서버
cdn.example.com       → CloudFront

CNAME vs A 레코드:
- 루트 도메인(example.com)은 CNAME 불가 → A 레코드 또는 ALIAS 사용
- 서브도메인(www.example.com)은 CNAME 사용 가능

Health Check + DNS Failover:
Route53 → Health Check → 정상이면 A, 비정상이면 B로 전환
```
