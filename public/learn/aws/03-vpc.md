---
title: "VPC"
order: 3
---

# VPC (Virtual Private Cloud)

VPC는 **나만의 가상 네트워크**다. 아파트 단지처럼, AWS 내에서 나만의 구역을 만들고 그 안에서 리소스를 배치한다. 다른 AWS 사용자들과는 네트워크가 완전히 분리된다.

처음에는 복잡해 보이지만, 핵심은 단순하다. **"인터넷에서 직접 접근 가능한 구역(퍼블릭)"과 "불가능한 구역(프라이빗)"을 나눠서, 서버는 프라이빗에, 웹 입구만 퍼블릭에 두는 것**이다.

---

## VPC 기본 구조

```
인터넷
  ↓
인터넷 게이트웨이 (IGW)
  ↓
VPC (10.0.0.0/16) - 나만의 가상 네트워크
  ├── 퍼블릭 서브넷 (10.0.1.0/24) - 인터넷 접근 가능
  │     ├── NAT Gateway (프라이빗이 인터넷에 나갈 때 사용)
  │     ├── Bastion Host (프라이빗 서버 SSH 접속용)
  │     └── ALB (로드밸런서, 사용자 요청 받음)
  │
  ├── 프라이빗 서브넷 (10.0.10.0/24) - 인터넷 직접 접근 불가
  │     └── EC2 앱 서버 (실제 서비스)
  │
  └── DB 서브넷 (10.0.20.0/24) - 완전 격리
        └── RDS 데이터베이스
```

**왜 이렇게 나누는가?**
```
보안 원칙: 인터넷에서 직접 접근 가능한 리소스 최소화

앱 서버를 프라이빗에 두면:
- 인터넷에서 직접 해킹 시도 불가능
- ALB만 퍼블릭 → ALB가 검증된 요청만 앱 서버에 전달

DB를 DB 서브넷에 두면:
- 앱 서버에서만 DB 접근 가능
- 혹시 앱 서버가 뚫려도 DB까지 바로 접근 불가
```

---

## CIDR 표기법 이해하기

IP 주소 범위를 표현하는 방법이다. 처음엔 어렵게 느껴지지만 패턴만 이해하면 된다.

```
10.0.0.0/16 → 10.0.0.0 ~ 10.0.255.255 (65,536개 IP)
10.0.1.0/24 → 10.0.1.0 ~ 10.0.1.255 (256개 IP)
10.0.1.0/28 → 10.0.1.0 ~ 10.0.1.15 (16개 IP)

/뒤 숫자가 클수록 범위가 좁아짐:
/8  → 1,600만 개 IP (너무 큼)
/16 → 65,536개 IP (VPC에 적당)
/24 → 256개 IP (서브넷에 적당)
/32 → 1개 IP (특정 IP 지정)

VPC 설계 예:
VPC:         10.0.0.0/16     (전체 주소 공간)
퍼블릭-2a:   10.0.1.0/24     (AZ-a 퍼블릭)
퍼블릭-2c:   10.0.2.0/24     (AZ-c 퍼블릭)
프라이빗-2a: 10.0.10.0/24    (AZ-a 프라이빗)
프라이빗-2c: 10.0.11.0/24    (AZ-c 프라이빗)
DB-2a:       10.0.20.0/24    (AZ-a DB)
DB-2c:       10.0.21.0/24    (AZ-c DB)
```

---

## 인터넷 게이트웨이 (IGW)

IGW는 **VPC와 인터넷을 연결하는 문**이다. 이것이 없으면 VPC 안의 리소스가 인터넷에 접근할 수 없다.

```bash
# VPC 생성
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=my-vpc}]'
# → VpcId: vpc-xxx

# 인터넷 게이트웨이 생성
aws ec2 create-internet-gateway
# → InternetGatewayId: igw-xxx

# VPC에 IGW 연결
aws ec2 attach-internet-gateway \
  --vpc-id vpc-xxx \
  --internet-gateway-id igw-xxx

# 퍼블릭 서브넷 생성 (AZ-a)
aws ec2 create-subnet \
  --vpc-id vpc-xxx \
  --cidr-block 10.0.1.0/24 \
  --availability-zone ap-northeast-2a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-subnet-2a}]'

# 프라이빗 서브넷 생성 (AZ-a)
aws ec2 create-subnet \
  --vpc-id vpc-xxx \
  --cidr-block 10.0.10.0/24 \
  --availability-zone ap-northeast-2a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-subnet-2a}]'
```

---

## 라우팅 테이블

라우팅 테이블은 **트래픽이 어디로 가야 하는지 알려주는 지도**다.

```bash
# 퍼블릭 서브넷용 라우팅 테이블 (인터넷 게이트웨이로 내보냄)
aws ec2 create-route-table --vpc-id vpc-xxx
# → RouteTableId: rtb-public

# 기본 경로: 모든 트래픽(0.0.0.0/0)을 IGW로
aws ec2 create-route \
  --route-table-id rtb-public \
  --destination-cidr-block 0.0.0.0/0 \   # 어디로 가든
  --gateway-id igw-xxx                    # IGW를 통해

# 퍼블릭 서브넷에 연결
aws ec2 associate-route-table \
  --route-table-id rtb-public \
  --subnet-id subnet-public-2a

# 프라이빗 서브넷용 라우팅 테이블 (NAT Gateway로 내보냄)
aws ec2 create-route-table --vpc-id vpc-xxx
# → RouteTableId: rtb-private

# 기본 경로: 모든 트래픽을 NAT Gateway로
aws ec2 create-route \
  --route-table-id rtb-private \
  --destination-cidr-block 0.0.0.0/0 \   # 어디로 가든
  --nat-gateway-id nat-xxx               # NAT GW를 통해 (단방향)

# 프라이빗 서브넷에 연결
aws ec2 associate-route-table \
  --route-table-id rtb-private \
  --subnet-id subnet-private-2a
```

---

## NAT Gateway — 프라이빗 서버의 외부 접근

프라이빗 서브넷의 서버는 인터넷에서 직접 접근할 수 없지만, 패키지 설치나 외부 API 호출을 위해 **나가는 요청**은 해야 한다. NAT Gateway가 이를 가능하게 한다.

```
NAT Gateway 동작:
프라이빗 EC2 → NAT Gateway → 인터넷
인터넷 → NAT Gateway → 프라이빗 EC2 (불가!)

즉, 나가는 것만 가능, 들어오는 것은 불가
→ 소프트웨어 업데이트, 외부 API 호출 가능
→ 인터넷에서 직접 해킹 시도 불가
```

```bash
# NAT Gateway용 고정 IP 할당
aws ec2 allocate-address --domain vpc
# → AllocationId: eipalloc-xxx

# NAT Gateway 생성 (퍼블릭 서브넷에 위치해야 함!)
aws ec2 create-nat-gateway \
  --subnet-id subnet-public-2a \        # 퍼블릭 서브넷에 생성
  --allocation-id eipalloc-xxx
# 생성 완료까지 1-2분 대기
```

**NAT Gateway 비용 주의:**
```
비용: 약 $32/월 고정 + 데이터 처리 $0.059/GB
AZ별로 하나씩 필요 (고가용성)
→ 2개 AZ라면 월 $64+ 기본 비용

개발 환경에서 비용 절감:
→ NAT Gateway 대신 NAT Instance (EC2로 직접 구성, 더 복잡하지만 저렴)
→ 또는 단일 NAT Gateway (단일 장애점이 되지만 개발에선 OK)
```

---

## 보안 그룹 vs NACL

두 가지 방화벽 도구가 있다.

```
보안 그룹 (Security Group):
- 인스턴스 레벨 방화벽 (EC2, RDS 등에 붙음)
- Stateful: 요청이 허용되면 응답은 자동 허용
- 허용 규칙만 존재 (거부 규칙 없음)
- 실시간으로 변경 가능 (재시작 불필요)
- 실무에서 대부분 이것만 씀

NACL (Network ACL):
- 서브넷 레벨 방화벽 (서브넷 전체에 적용)
- Stateless: 인바운드/아웃바운드 규칙 별도 설정
- 허용 + 거부 규칙 모두 가능
- 규칙 번호 순서대로 평가
- 특정 IP 전체 차단 등 서브넷 수준 방어에 사용
```

**언제 NACL을 쓸까?**
```
보안 그룹으로 대부분 해결됨.
NACL은 특수한 경우:
- 특정 악의적 IP를 서브넷 전체에서 차단
- 추가적인 보안 레이어 필요 시
- DDoS 방어 (특정 IP 블록)
```

---

## Bastion Host — 프라이빗 서버 SSH 접속

프라이빗 서브넷의 EC2는 인터넷에서 직접 SSH 접속이 안 된다. Bastion Host(점프 서버)는 퍼블릭에 있는 중간 서버로, 이것을 거쳐 프라이빗 서버에 접속한다.

```
구조:
개발자 PC → SSH → Bastion (퍼블릭) → SSH → 앱 서버 (프라이빗)

Bastion Host 보안 설정:
- 최소한의 인스턴스 (t3.nano)
- SSH 포트만 열고, 특정 IP에서만 허용
- MFA 인증 추가 권장
- 모든 접속 로그 기록
```

```bash
# ~/.ssh/config 설정으로 편리하게 접속

Host bastion
    HostName 1.2.3.4          # Bastion 공인 IP
    User ubuntu
    IdentityFile ~/.ssh/my-key.pem

Host app-server
    HostName 10.0.10.100      # 앱 서버 사설 IP
    User ubuntu
    IdentityFile ~/.ssh/my-key.pem
    ProxyJump bastion         # Bastion을 경유해서 접속

# 사용법: Bastion 자동 경유
ssh app-server
```

**SSM Session Manager 대안:**
```
Bastion Host 없이 프라이빗 EC2에 접속하는 현대적인 방법:
- AWS Systems Manager Session Manager
- SSH 키 없이 웹 콘솔이나 CLI로 접속
- 별도 포트 개방 불필요
- 접속 로그 자동 저장
- IAM 권한으로 접근 제어
→ 보안상 Bastion보다 더 권장
```

---

## VPC Flow Logs — 네트워크 트래픽 로깅

VPC Flow Logs는 VPC 내 모든 네트워크 트래픽을 기록한다. 보안 사고 조사나 이상 트래픽 탐지에 유용하다.

```bash
# Flow Log 활성화 (CloudWatch에 저장)
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-xxx \
  --traffic-type ALL \           # ACCEPT, REJECT, ALL
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/flowlogs \
  --deliver-logs-permission-arn arn:aws:iam::xxx:role/flow-log-role
```

---

## VPC Peering — VPC 간 연결

두 VPC를 직접 연결할 수 있다. 다른 AWS 계정끼리, 다른 리전끼리도 가능하다.

```
사용 예:
- 개발 VPC ↔ 공통 서비스 VPC (Jenkins, Nexus 등)
- 회사 내 서로 다른 팀의 VPC 연결

주의사항:
- CIDR가 겹치면 Peering 불가
  (10.0.0.0/16 ↔ 10.0.0.0/16: 불가)
  (10.0.0.0/16 ↔ 10.1.0.0/16: 가능)

- 전이적 라우팅 안 됨
  A-B Peering, B-C Peering 있어도 A에서 C 직접 불가
  A-C도 별도로 Peering 필요

- 많은 VPC 연결이 필요하면:
  Transit Gateway 사용 (VPC 허브 역할)
```

---

## 실전 VPC 아키텍처 설계

```
실무에서 자주 쓰는 구성:

[인터넷]
    ↓
[인터넷 게이트웨이]
    ↓
[ALB — 퍼블릭 서브넷 2a, 2c]  ← HTTPS 443 포트만 열기
    ↓
[EC2 앱 서버 — 프라이빗 서브넷 2a, 2c]  ← ALB에서만 접근
    ↓
[RDS — DB 서브넷 2a, 2c]  ← 앱 서버에서만 접근
    ↑
[NAT Gateway] ← 앱 서버가 외부 API 호출할 때

보안 그룹 설계:
sg-alb:
  인바운드: 80, 443 from 0.0.0.0/0

sg-app:
  인바운드: 8080 from sg-alb (ALB에서만)
  인바운드: 22 from sg-bastion (Bastion에서만)

sg-rds:
  인바운드: 5432 from sg-app (앱 서버에서만)

sg-bastion:
  인바운드: 22 from 회사/집 IP
```

---

## 자주 하는 실수

```
1. 프라이빗 서브넷에 인터넷 게이트웨이 연결
   - 프라이빗은 IGW와 직접 연결하면 안 됨
   - NAT Gateway를 경유해야 함

2. DB를 퍼블릭 서브넷에 배치
   - DB는 절대 퍼블릭 서브넷에 두면 안 됨
   - 반드시 프라이빗 또는 전용 DB 서브넷에

3. AZ 하나에만 배포
   - AZ 장애 시 전체 서비스 중단
   - 퍼블릭, 프라이빗 서브넷 모두 최소 2개 AZ에 생성

4. NAT Gateway 개발 환경에서 방치
   - 약 $32/월이 계속 나감
   - 개발 환경에서는 필요 없으면 삭제

5. VPC 기본값(default VPC) 그냥 사용
   - 기본 VPC는 모든 서브넷이 퍼블릭
   - 운영 환경에서는 직접 VPC를 설계해서 사용
```
