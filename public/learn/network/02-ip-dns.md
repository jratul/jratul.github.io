---
title: "IP 주소, 서브넷, DNS"
order: 2
---

# IP 주소, 서브넷, DNS

서버를 운영하거나 AWS에서 인프라를 구성하면 반드시 만나는 개념들이다. IP 주소 체계를 모르면 VPC 설계를 할 수 없고, DNS를 모르면 도메인 연결을 할 수 없다.

---

## IP 주소 체계 — 공인 vs 사설

인터넷의 IP 주소는 크게 **공인 IP**와 **사설 IP**로 나뉜다.

```
공인 IP (Public IP):
— 인터넷에서 전 세계적으로 유일한 주소
— ISP(통신사) 또는 클라우드 제공자가 할당
— 예: AWS EC2 인스턴스의 외부 IP, 집 공유기의 WAN IP
— 이 IP로 외부에서 직접 접근 가능

사설 IP (Private IP):
— 내부 네트워크(집, 회사, VPC)에서만 사용
— 인터넷에서 라우팅 불가 (바깥 세상에서 찾을 수 없음)
— NAT를 통해 공인 IP로 변환되어 외부와 통신
— 회사마다 같은 사설 IP를 써도 충돌 없음

사설 IP 범위 (이 범위는 인터넷에서 라우팅 안 됨):
10.0.0.0/8         → 10.x.x.x
172.16.0.0/12      → 172.16.x.x ~ 172.31.x.x
192.168.0.0/16     → 192.168.x.x ← 집 공유기가 보통 사용

고정 IP (Static IP):
— 변경되지 않는 IP
— AWS에서는 Elastic IP라고 부름
— 서버 재시작해도 IP 유지

동적 IP (Dynamic IP):
— DHCP로 자동 할당, 재시작 시 변경될 수 있음
— 집에서 사용하는 인터넷이 보통 동적 IP
```

---

## 서브넷 설계 — 네트워크 나누기

큰 네트워크를 작은 단위로 쪼개는 것을 **서브넷팅**이라 한다. AWS VPC를 설계할 때 반드시 필요한 개념이다.

```
CIDR 표기: IP주소/프리픽스길이

/32 = 단일 호스트 1개     (특정 IP 하나)
/30 = 호스트 4개           (사용 가능 2개)
/29 = 호스트 8개           (사용 가능 6개)
/28 = 호스트 16개          (사용 가능 14개)
/27 = 호스트 32개          (사용 가능 30개)
/26 = 호스트 64개          (사용 가능 62개)
/25 = 호스트 128개         (사용 가능 126개)
/24 = 호스트 256개         (사용 가능 254개) ← 가장 흔히 씀
/23 = 호스트 512개         (사용 가능 510개)
/22 = 호스트 1,024개
/16 = 호스트 65,536개     ← AWS VPC 기본
/8  = 호스트 16,777,216개

주의: 첫 번째 주소(네트워크 주소)와 마지막 주소(브로드캐스트)는
      실제 사용 불가. /24면 실제 사용 가능한 것은 254개.
      AWS에서는 추가로 3개를 예약해서 251개만 사용 가능.
```

---

## AWS VPC 서브넷 설계 실전 예시

실무에서 가장 많이 쓰는 구조다. 외부 접근 가능 여부에 따라 Public/Private으로 분리한다.

```
VPC: 10.0.0.0/16 (65,536개 IP)
├── ap-northeast-2a (서울 AZ-a)
│   ├── public-subnet-a:  10.0.1.0/24   (ALB, NAT Gateway)
│   └── private-subnet-a: 10.0.10.0/24  (앱 서버)
│   └── db-subnet-a:      10.0.20.0/24  (RDS)
├── ap-northeast-2b (서울 AZ-b)
│   ├── public-subnet-b:  10.0.2.0/24
│   └── private-subnet-b: 10.0.11.0/24
│   └── db-subnet-b:      10.0.21.0/24
└── ap-northeast-2c (서울 AZ-c)
    ├── public-subnet-c:  10.0.3.0/24
    └── private-subnet-c: 10.0.12.0/24
    └── db-subnet-c:      10.0.22.0/24

배치 원칙:
— 외부 접근 필요: ALB, NAT Gateway → Public Subnet
— 앱 서버: 외부에서 직접 접근 불가 → Private Subnet
— 데이터베이스: 더 격리 → DB Subnet (인터넷 라우팅 없음)
```

---

## NAT — 사설 IP로 인터넷 나가기

Private Subnet의 EC2 인스턴스는 공인 IP가 없다. 하지만 소프트웨어 업데이트나 외부 API를 호출할 때 인터넷이 필요하다. 이때 NAT(Network Address Translation)를 사용한다.

**택배 비유:** 회사 내부 직원(사설 IP)이 외부에 편지를 보낼 때, 회사 대표 주소(공인 IP)로 발송하고 답장도 회사 대표 주소로 받은 다음 내부 직원에게 전달하는 것과 같다.

```
NAT 동작 방식:
Private Subnet EC2 (10.0.10.5)
    ↓
NAT Gateway (Public Subnet, 공인 IP 있음)
    ↓
인터넷 (외부에서는 NAT Gateway의 공인 IP만 보임)

집 공유기:
192.168.1.10 (PC) → 공유기 NAT → 203.xxx.xxx.1 (공인 IP)
192.168.1.11 (노트북) → 공유기 NAT → 203.xxx.xxx.1 (같은 공인 IP, 포트로 구분)

AWS NAT Gateway:
— Public Subnet에 위치
— Elastic IP 연결 필요
— 비용: 약 $32/월 + 데이터 처리 비용
— 고가용성을 위해 AZ별로 하나씩 생성 권장
```

---

## DNS — 전화번호부 같은 시스템

DNS(Domain Name System)는 `google.com` 같은 사람이 읽기 편한 도메인을 `142.250.196.78` 같은 IP 주소로 변환해준다. 전화번호부에서 이름으로 번호를 찾는 것과 같다.

**DNS가 없으면?** 인터넷을 사용할 때 모든 사이트를 IP 주소로 기억해야 한다. 구글 주소는 `142.250.196.78`, 네이버는 `223.130.195.200`...

```
DNS 조회 순서 (캐시부터 확인):
1. 브라우저 캐시 확인 (가장 빠름)
2. OS 캐시 확인
3. /etc/hosts 파일 확인 (로컬 오버라이드)
4. 로컬 DNS 서버 확인 (공유기, ISP)
5. 루트 DNS 서버 (전 세계 13개 클러스터)
6. TLD DNS 서버 (.com, .kr, .net 담당)
7. 권한 DNS 서버 (도메인 소유자가 관리)
→ 결과 캐시 저장 → IP 주소 반환
```

---

## DNS 레코드 타입 — 도메인 설정의 종류

```
A 레코드:
— 도메인 → IPv4 주소 매핑
— example.com → 93.184.216.34
— 가장 기본적인 레코드

AAAA 레코드:
— 도메인 → IPv6 주소 매핑
— example.com → 2606:2800:220:1:248:1893:25c8:1946

CNAME 레코드 (별칭):
— 도메인 → 다른 도메인 매핑
— www.example.com → example.com
— api.example.com → myapp.elb.amazonaws.com
— 주의: 루트 도메인(example.com)에는 사용 불가

MX 레코드:
— 메일 서버 지정
— example.com MX → mail.example.com (우선순위 포함)

TXT 레코드:
— 텍스트 정보 저장
— 도메인 소유권 확인, SPF, DKIM 설정
— example.com TXT "v=spf1 include:_spf.google.com ~all"

NS 레코드:
— 이 도메인의 DNS 서버를 어디서 관리하는지
— example.com NS → ns1.cloudflare.com

PTR 레코드:
— IP → 도메인 역방향 조회
— 93.184.216.34 → example.com

ALIAS / ANAME 레코드 (AWS Route53):
— CNAME처럼 도메인을 다른 도메인에 매핑
— 루트 도메인에도 사용 가능 (CNAME 제한 없음)
— example.com → xxx.cloudfront.net
```

---

## DNS 조회 명령어 — 실제로 써보기

```bash
# dig — 가장 강력한 DNS 조회 도구
dig example.com                    # 기본 A 레코드 조회
dig example.com A                  # A 레코드만 조회
dig example.com MX                 # MX 레코드 조회
dig example.com +short             # IP 주소만 출력
dig @8.8.8.8 example.com          # Google DNS로 조회
dig @1.1.1.1 example.com          # Cloudflare DNS로 조회
dig -x 93.184.216.34               # 역방향 조회 (IP → 도메인)

# 결과 읽는 법
# example.com. 300 IN A 93.184.216.34
#              ↑
#              TTL: 300초 후 캐시 만료

# nslookup — 간단한 조회
nslookup example.com
nslookup example.com 8.8.8.8       # 특정 DNS 서버로 조회

# host — 더 간단하게
host example.com
```

---

## /etc/hosts — 로컬 DNS 오버라이드

DNS 조회 전에 가장 먼저 확인하는 파일이다. 개발 환경에서 특정 도메인을 로컬로 리다이렉트할 때 유용하다.

```bash
# /etc/hosts 내용 확인
cat /etc/hosts

# 기본 내용
127.0.0.1   localhost
::1         localhost

# 개발 환경 설정 예시
# 로컬에서 api.local 을 127.0.0.1로 연결
127.0.0.1   api.local
127.0.0.1   auth.local
127.0.0.1   admin.local

# 특정 내부 서버를 도메인으로 접근
10.0.0.5    db.internal
10.0.0.6    cache.internal
10.0.0.7    monitoring.internal
```

---

## /etc/resolv.conf — 어떤 DNS 서버를 쓸지 설정

```bash
cat /etc/resolv.conf

# 사용할 DNS 서버 지정
nameserver 8.8.8.8        # Google DNS (빠르고 안정적)
nameserver 8.8.4.4        # Google DNS 보조
nameserver 1.1.1.1        # Cloudflare DNS (프라이버시 중심)

# 도메인 검색 접미사
# "api" 만 입력해도 "api.example.com" 으로 검색
search example.com

# AWS VPC 내부에서는 자동으로 설정됨
# nameserver 169.254.169.253  ← AWS VPC DNS 서버
```

---

## DNS 트러블슈팅 — 도메인 문제 찾기

```bash
# 1. 도메인이 올바른 IP로 해석되는지 확인
dig +short api.example.com
# 예상 IP: 1.2.3.4
# 실제 IP: 5.6.7.8  → DNS 레코드 잘못 설정됨

# 2. 여러 DNS 서버로 비교 (같은 값이 나와야 정상)
dig @1.1.1.1 example.com
dig @8.8.8.8 example.com
dig @169.254.169.253 example.com  # AWS VPC 내부 DNS

# 3. TTL 확인 (DNS 변경 후 언제 전파되나?)
dig example.com | grep -A1 "ANSWER SECTION"
# 300이면 300초(5분) 후에 캐시 만료 → 새 레코드 적용

# 4. 권한 DNS 서버 직접 조회 (변경 즉시 확인)
dig @ns1.cloudflare.com example.com

# 5. 쿠버네티스 내부 DNS 확인
kubectl exec -it my-pod -- nslookup kubernetes.default
kubectl exec -it my-pod -- cat /etc/resolv.conf
# search default.svc.cluster.local svc.cluster.local cluster.local
# nameserver 10.96.0.10  ← CoreDNS 서비스 IP
```

---

## 실무 패턴 — DNS 설계

```
서비스 URL 설계:
api.example.com       → ALB → 앱 서버들
admin.example.com     → ALB → 관리자 서버
cdn.example.com       → CloudFront CDN
ws.example.com        → WebSocket 서버

CNAME vs A 레코드 선택:
— 루트 도메인(example.com)은 CNAME 사용 불가
  → AWS Route53의 ALIAS 레코드 사용 (CLoudFront, ALB 직접 연결)
— 서브도메인(www.example.com)은 CNAME 사용 가능

DNS Failover 패턴 (Route53 Health Check):
1. Primary 서버에 Health Check 설정
2. Primary 응답 없으면 Secondary로 자동 전환
3. DNS TTL을 짧게 (60초) 설정해야 빠른 전환
→ 장애 시 자동 복구, 다운타임 최소화

TTL 전략:
— 변경 예정 없는 레코드: 86400초 (1일)
— 변경 예정인 레코드:    300초 (5분)
— 긴급 변경 필요할 수 있는 레코드: 60초
— DNS 변경 전에 TTL을 줄여두면 전파 속도 빨라짐
```

---

## 자주 하는 실수

```
실수 1: DNS 변경 후 바로 반영되길 기대
→ TTL 시간 동안 캐시됨. 기존 TTL이 86400초(1일)면 하루 동안 기다려야.
→ 변경 전에 미리 TTL을 300초로 줄여두는 것이 좋음.

실수 2: CNAME을 루트 도메인에 사용
→ example.com에 CNAME은 DNS 표준상 불가.
→ www.example.com에는 가능. 루트는 A 레코드 또는 AWS ALIAS 레코드 사용.

실수 3: DNS 전파됐는데 왜 아직 옛날 IP가 보이지?
→ OS나 브라우저 캐시에 TTL 동안 남아있을 수 있음.
→ 확인: dig @8.8.8.8 example.com (외부 DNS로 직접 조회)

실수 4: 내부 서비스 도메인 설계 실수
→ 쿠버네티스 서비스: service-name.namespace.svc.cluster.local
→ 같은 네임스페이스면: service-name 만으로 접근 가능
→ 다른 네임스페이스: service-name.other-namespace 형식
```
