---
title: "VPC"
order: 3
---

# VPC (Virtual Private Cloud)

AWS에서 직접 관리하는 격리된 가상 네트워크.

---

## VPC 기본 구조

```
VPC (10.0.0.0/16)
├── Public Subnet (10.0.1.0/24)  — 인터넷 접근 가능
│   ├── NAT Gateway
│   ├── Bastion Host
│   └── ALB
├── Private Subnet (10.0.10.0/24) — 인터넷 직접 접근 불가
│   ├── EC2 앱 서버
│   └── (NAT Gateway 통해 외부 요청 가능)
└── DB Subnet (10.0.20.0/24)      — 완전히 격리
    └── RDS

인터넷 게이트웨이 (IGW)
— VPC ↔ 인터넷 연결
— Public Subnet의 라우팅 테이블에 연결

NAT Gateway
— Private Subnet → 인터넷 (아웃바운드만)
— 인터넷 → Private Subnet 불가
— 소프트웨어 업데이트, 외부 API 호출에 사용
```

---

## VPC 생성

```bash
# VPC 생성
aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=my-vpc}]'
# → VpcId: vpc-xxx

# 인터넷 게이트웨이 생성 및 연결
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway --vpc-id vpc-xxx --internet-gateway-id igw-xxx

# Public Subnet 생성
aws ec2 create-subnet \
  --vpc-id vpc-xxx \
  --cidr-block 10.0.1.0/24 \
  --availability-zone ap-northeast-2a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-subnet-a}]'

# Private Subnet 생성
aws ec2 create-subnet \
  --vpc-id vpc-xxx \
  --cidr-block 10.0.10.0/24 \
  --availability-zone ap-northeast-2a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-subnet-a}]'
```

---

## 라우팅 테이블

```bash
# Public 라우팅 테이블 (인터넷 게이트웨이 경로 추가)
aws ec2 create-route-table --vpc-id vpc-xxx
aws ec2 create-route \
  --route-table-id rtb-xxx \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id igw-xxx
aws ec2 associate-route-table \
  --route-table-id rtb-xxx \
  --subnet-id subnet-xxx  # Public Subnet

# Private 라우팅 테이블 (NAT Gateway 경로)
aws ec2 create-route-table --vpc-id vpc-xxx
aws ec2 create-route \
  --route-table-id rtb-yyy \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id nat-xxx
aws ec2 associate-route-table \
  --route-table-id rtb-yyy \
  --subnet-id subnet-yyy  # Private Subnet
```

---

## NAT Gateway

```bash
# Elastic IP 할당 (NAT Gateway용)
aws ec2 allocate-address --domain vpc
# → AllocationId: eipalloc-xxx

# NAT Gateway 생성 (Public Subnet에 위치)
aws ec2 create-nat-gateway \
  --subnet-id subnet-public-a \
  --allocation-id eipalloc-xxx

# 비용: 약 $32/월 + 데이터 처리 비용 (0.059$/GB)
# AZ별로 하나 필요 (고가용성)
```

---

## 보안 그룹 vs NACL

```
보안 그룹 (Security Group):
— 인스턴스 레벨
— 상태 저장 (Stateful): 인바운드 허용 시 아웃바운드 자동 허용
— 허용 규칙만 (거부 규칙 없음)
— 즉시 적용

NACL (Network ACL):
— 서브넷 레벨
— 상태 비저장 (Stateless): 인바운드/아웃바운드 별도 설정
— 허용/거부 모두 설정 가능
— 규칙 번호 순서대로 평가

실무:
— 대부분 Security Group으로 해결
— NACL은 서브넷 전체 차단이 필요할 때 (IP 차단 등)
```

---

## VPC Peering

```
두 VPC 간 직접 연결 (다른 계정, 다른 리전도 가능)

사용 예:
— 개발 VPC ↔ 공통 서비스 VPC (CI/CD, 모니터링)
— 같은 회사 다른 팀의 VPC 연결

주의:
— CIDR 겹치면 안 됨
— 전이적 라우팅 안 됨 (A-B, B-C 연결해도 A-C 직접 불가)
— 대규모 연결은 Transit Gateway 사용
```

---

## Bastion Host (점프 서버)

```
목적:
Private Subnet의 EC2에 SSH 접근을 위한 중간 서버

구성:
개발자 PC → [Bastion Host (Public)] → [앱 서버 (Private)]

Bastion Host 보안:
— 최소화된 인스턴스 (t3.nano)
— SSH만 허용, 특정 IP에서만
— MFA 적용
— 접속 로그 기록
```

```bash
# ~/.ssh/config
Host bastion
    HostName 1.2.3.4     # Bastion 공인 IP
    User ubuntu
    IdentityFile ~/.ssh/key.pem

Host app-server
    HostName 10.0.10.100  # 앱 서버 사설 IP
    User ubuntu
    IdentityFile ~/.ssh/key.pem
    ProxyJump bastion     # Bastion 경유

ssh app-server    # 자동으로 Bastion 통해 접속
```

---

## VPC Flow Logs

```bash
# 네트워크 트래픽 로깅
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-xxx \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/flowlogs

# 분석:
# — 보안 사고 조사
# — 네트워크 최적화
# — 비정상 트래픽 탐지

# Athena로 S3에 저장된 Flow Log 쿼리
SELECT
  srcaddr,
  dstaddr,
  dstport,
  protocol,
  action,
  COUNT(*) as count
FROM vpc_flow_logs
WHERE action = 'REJECT'
GROUP BY srcaddr, dstaddr, dstport, protocol, action
ORDER BY count DESC;
```

---

## 실전 VPC 아키텍처

```
[인터넷]
    ↓
[인터넷 게이트웨이]
    ↓
[ALB — Public Subnet (2a, 2c)]
    ↓
[EC2 앱 서버 — Private Subnet (2a, 2c)]  ← NAT GW로 외부 접근
    ↓
[RDS — DB Subnet (2a, 2c)]  ← 완전 격리

보안 그룹 설계:
sg-alb:    인바운드 80, 443 from 0.0.0.0/0
sg-app:    인바운드 8080 from sg-alb
           인바운드 22 from sg-bastion
sg-db:     인바운드 5432 from sg-app
sg-bastion: 인바운드 22 from 특정 IP
```
