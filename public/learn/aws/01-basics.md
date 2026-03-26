---
title: "AWS 기본 개념"
order: 1
---

# AWS 기본 개념

AWS(Amazon Web Services)는 세계에서 가장 많이 쓰이는 클라우드 플랫폼이다. 서버, 스토리지, 네트워크, 데이터베이스 등 인프라 자원을 인터넷으로 빌려 쓸 수 있다.

**클라우드 = 남의 컴퓨터를 인터넷으로 빌려 쓰는 것**이라고 생각하면 된다. 예전에는 서버를 직접 사서 데이터센터에 넣고 관리해야 했지만, 이제는 AWS에서 필요한 만큼만 빌리면 된다.

---

## 클라우드가 왜 좋은가

```
전통적인 방식 (온프레미스):
- 서버 구입비 수천만 원
- 데이터센터 임대, 전기세, 냉방비
- 관리 인력 필요
- 트래픽 폭증 대비로 항상 여유 서버 유지
- 구축까지 수개월

AWS (클라우드):
- 초기 비용 없음
- 사용한 만큼만 지불 (시간/분 단위)
- 트래픽에 따라 서버 수 자동 조절
- 몇 분 만에 서버 생성
- 전 세계 어디서든 데이터센터 이용
```

---

## AWS 글로벌 인프라

AWS는 전 세계에 데이터센터를 가지고 있다. 이를 이해하려면 리전, 가용 영역, 엣지 로케이션 세 가지 개념을 알아야 한다.

### 리전 (Region)

리전은 **지리적으로 분리된 데이터센터 집합**이다. 쉽게 말해 "어느 나라, 어느 도시에 있는 AWS 데이터센터를 쓸 것인가"를 선택하는 것이다.

```
주요 리전:
ap-northeast-2    → 서울 (한국 서비스라면 여기!)
ap-northeast-1    → 도쿄
ap-southeast-1    → 싱가포르
us-east-1         → 버지니아 북부 (AWS 기본 리전, 서비스 가장 먼저 출시)
us-west-2         → 오레곤
eu-west-1         → 아일랜드
eu-central-1      → 프랑크푸르트

리전 선택 기준:
1. 사용자 위치 (가까울수록 빠름)
2. 법적 요건 (개인정보보호법 - 한국 사용자 데이터는 한국에?)
3. 서비스 지원 여부 (최신 서비스는 us-east-1에서 먼저 출시)
4. 비용 (리전마다 가격 다름, us-east-1이 보통 저렴)
```

**초보자 실수 주의:** AWS 콘솔에서 리전을 변경하는 것을 잊고 작업하면, 다른 리전에서 만든 리소스가 안 보인다. 항상 콘솔 우측 상단에서 현재 리전을 확인하자.

```
리전 간 데이터 전송:
- 같은 리전 내: 무료 (대부분)
- 리전 간: 유료 (GB당 약 $0.02)
- → 멀티 리전 아키텍처 설계 시 비용 고려 필수
```

---

### 가용 영역 (AZ, Availability Zone)

가용 영역은 **리전 내 물리적으로 분리된 데이터센터**다. 서울 리전(`ap-northeast-2`) 안에도 여러 개의 독립된 건물이 있다.

```
서울 리전의 가용 영역:
ap-northeast-2a  (데이터센터 A)
ap-northeast-2b  (데이터센터 B)
ap-northeast-2c  (데이터센터 C)
ap-northeast-2d  (데이터센터 D)

각 AZ의 특징:
- 별도의 전력, 냉방, 네트워크
- 화재, 홍수 등 재해로부터 독립적
- AZ 간 지연: 수 ms (같은 리전이라 빠름)
```

**왜 중요한가?** 서버를 하나의 AZ에만 두면, 그 AZ에 문제가 생길 때 서비스가 중단된다. 여러 AZ에 분산해두면 하나가 다운되어도 나머지가 계속 동작한다.

```
고가용성 설계 예시:

단일 AZ (위험):
서울-2a: 서버 2대 → 2a 장애 시 전체 서비스 중단

멀티 AZ (권장):
서울-2a: 서버 1대
서울-2c: 서버 1대
→ 2a 장애 시 2c가 계속 서비스
```

---

### 엣지 로케이션 (Edge Location)

엣지 로케이션은 **CloudFront CDN(콘텐츠 배달 네트워크)의 캐시 서버**가 있는 곳이다. 전 세계 450개 이상의 도시에 있다.

```
동작 원리:
사용자(부산) → 서울 엣지 로케이션에서 캐시된 이미지 제공
사용자(뉴욕) → 뉴욕 엣지 로케이션에서 캐시된 이미지 제공

효과:
- 한국 서버에서 뉴욕까지 직접 전송: 150ms
- 뉴욕 엣지 로케이션 캐시: 5ms
- → 30배 빠름!
```

---

## IAM (Identity and Access Management)

IAM은 **AWS 리소스에 누가, 무엇을 할 수 있는지 관리하는 시스템**이다. 회사로 치면 사원증 시스템과 비슷하다. 사원마다 접근 가능한 구역이 다르듯, IAM으로 AWS 권한을 세밀하게 제어한다.

```
IAM의 4가지 핵심 개념:

User (사용자)
- 실제 사람 또는 애플리케이션
- 예: 개발자 홍길동, CI/CD 봇

Group (그룹)
- 여러 사용자를 묶는 단위
- 예: 개발팀 그룹, 운영팀 그룹
- 그룹에 정책을 붙이면 멤버 전체에 적용

Role (역할)
- 사람이 아닌 AWS 서비스에 부여하는 권한
- 예: EC2 서버가 S3에 파일 업로드할 권한
- 임시 자격증명 (시간이 지나면 만료)

Policy (정책)
- 권한을 정의한 JSON 문서
- "S3 버킷에서 읽을 수 있다" 같은 규칙
```

### Policy (정책) 예시

```json
// S3 특정 버킷 읽기만 허용하는 정책
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",         // 허용 (Deny도 가능)
      "Action": [
        "s3:GetObject",          // 파일 다운로드
        "s3:ListBucket"          // 파일 목록 조회
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket",       // 버킷 자체
        "arn:aws:s3:::my-bucket/*"      // 버킷 안의 모든 파일
      ]
    }
  ]
}
```

### ARN (Amazon Resource Name)

ARN은 **AWS의 모든 리소스를 고유하게 식별하는 주소**다.

```
ARN 형식:
arn:aws:서비스:리전:계정ID:리소스

예시:
arn:aws:s3:::my-bucket
  → S3 버킷 (리전, 계정ID 없음 - 전역 서비스)

arn:aws:ec2:ap-northeast-2:123456789012:instance/i-1234567890abcdef0
  → 서울 리전의 특정 EC2 인스턴스

arn:aws:iam::123456789012:role/my-app-role
  → IAM Role (리전 없음 - 전역 서비스)
```

---

## IAM 보안 모범 사례

처음 AWS 계정을 만들면 무엇이든 할 수 있는 루트(root) 계정이 생긴다. 이 계정을 일상적으로 사용하는 것은 매우 위험하다.

```
1. 루트 계정은 잠가두기
   - MFA(2단계 인증) 반드시 활성화
   - 루트 계정은 청구서 확인, 계정 삭제 등 특수 작업에만 사용
   - 일상 업무는 IAM 사용자로

2. 최소 권한 원칙 (Least Privilege)
   - 필요한 권한만 부여
   - 와일드카드(*) 남용하지 않기
   - 나쁜 예: "Action": "*", "Resource": "*" (모든 것 허용)
   - 좋은 예: 딱 필요한 서비스, 딱 필요한 리소스만

3. EC2, Lambda 등 서비스에는 IAM Role 사용
   - 절대 액세스 키를 코드에 직접 넣지 말 것!
   - 코드에 키를 넣으면 GitHub에 올라가는 순간 해킹 당함
   - EC2에 Role을 붙이면 코드에서 자동으로 권한 획득

4. 액세스 키 관리
   - 주기적으로 교체 (90일마다 권장)
   - 퇴사한 직원 키 즉시 삭제
   - 필요 없어진 키는 즉시 비활성화

5. MFA 활성화
   - 콘솔 로그인에 반드시 적용
   - 중요한 API 작업에도 MFA 조건 추가 가능
```

**초보자 실수 주의:** AWS 액세스 키를 GitHub 공개 저장소에 실수로 올리는 사고가 자주 발생한다. 키가 노출되면 수백만 원의 과금 피해가 발생할 수 있다. `.gitignore`에 항상 자격증명 파일을 추가하자.

---

## AWS CLI 설치와 설정

AWS CLI는 터미널에서 AWS를 제어하는 도구다. 콘솔을 클릭하는 것보다 빠르고 자동화하기 쉽다.

```bash
# macOS 설치
brew install awscli

# Ubuntu/Debian 설치
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Windows (PowerShell)
# https://aws.amazon.com/cli/ 에서 .msi 다운로드

# 설치 확인
aws --version
```

```bash
# 자격증명 설정 (처음 한 번)
aws configure
# AWS Access Key ID: AKIAIOSFODNN7EXAMPLE
# AWS Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
# Default region name: ap-northeast-2      ← 서울 리전
# Default output format: json

# 여러 계정/환경을 쓰는 경우 프로필 사용
aws configure --profile dev      # 개발 환경
aws configure --profile prod     # 운영 환경

# 특정 프로필로 명령 실행
aws s3 ls --profile prod

# 환경변수로 기본 프로필 설정
export AWS_PROFILE=dev
```

```bash
# 현재 자격증명 확인 (내가 누구인지)
aws sts get-caller-identity
# {
#   "UserId": "AIDAIOSFODNN7EXAMPLE",
#   "Account": "123456789012",
#   "Arn": "arn:aws:iam::123456789012:user/홍길동"
# }

# 기본 명령어 모음
aws s3 ls                              # S3 버킷 목록
aws ec2 describe-instances             # EC2 인스턴스 목록
aws rds describe-db-instances          # RDS 목록

# EC2 목록 보기 좋게 출력
aws ec2 describe-instances \
  --query 'Reservations[*].Instances[*].[Tags[?Key==`Name`].Value|[0],State.Name,PublicIpAddress]' \
  --output table
```

---

## 과금 모델 이해하기

AWS 요금은 복잡하다. 처음에는 어떤 요금제가 있는지만 이해하자.

```
On-Demand (온디맨드):
- 약정 없이 쓴 만큼 지불
- 가장 비싸지만 가장 유연
- 새 서비스 시작, 트래픽 예측 어려울 때

Reserved Instances (예약 인스턴스):
- 1년 또는 3년 약정
- 최대 72% 할인
- 예: 항상 켜두는 DB 서버에 적합

Spot Instances (스팟):
- AWS의 남는 서버를 경매 방식으로 구입
- 최대 90% 할인!
- 단, 언제든 AWS가 회수할 수 있음
- 중단되어도 괜찮은 배치 작업, CI/CD 빌드 서버에 적합

Savings Plans:
- Reserved보다 유연한 약정 방식
- EC2뿐 아니라 Fargate, Lambda도 포함
- 컴퓨팅 사용량 약정 (어떤 인스턴스 타입이든)

Free Tier (무료):
- 신규 계정 12개월 무료 (일부 서비스)
- t2.micro EC2 750시간/월
- S3 5GB
- RDS t2.micro 750시간/월
- Lambda 월 100만 건
```

---

## 비용 관리 - 초보자 필독

AWS는 쓰면 쓸수록 돈이 나간다. 공부하다가 깜빡 잊고 켜둔 서버가 한 달 수십만 원이 나온 사례가 많다.

```
자주 발생하는 과금 실수:

1. EC2 인스턴스를 stop 하지 않고 방치
   - stop: 서버 꺼짐 (스토리지 비용만 발생)
   - terminate: 완전 삭제 (비용 0)
   - 공부 후 terminate 잊으면 계속 과금!

2. Elastic IP (고정 IP)를 인스턴스에 연결하지 않으면 과금
   - 연결하지 않은 Elastic IP: $0.005/시간 = 월 약 $3.6
   - 사용하지 않으면 즉시 반납

3. NAT Gateway 방치
   - 약 $32/월 고정비 + 데이터 전송 비용
   - 개발 환경에서 사용 후 삭제 잊지 말 것

4. 스냅샷, AMI 방치
   - EBS 스냅샷은 계속 비용 발생
   - 필요 없는 스냅샷 정기적으로 삭제

5. 데이터 전송 비용
   - AWS → 인터넷: 유료 (GB당 약 $0.09)
   - 리전 간 전송: 유료
   - 같은 리전, 같은 AZ 내: 무료
```

```bash
# 예산 알림 설정 (필수!)
# AWS 콘솔 → Billing → Budgets → Create budget

# CLI로 비용 확인
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-02-01 \
  --granularity MONTHLY \
  --metrics "BlendedCost" \
  --query 'ResultsByTime[*].[TimePeriod.Start,Total.BlendedCost.Amount]' \
  --output table
```

---

## AWS 핵심 서비스 한눈에 보기

AWS에는 200개 이상의 서비스가 있다. 처음에는 자주 쓰는 것들만 알면 된다.

```
컴퓨팅 (서버):
EC2        → 가상 서버 (가장 기본)
Lambda     → 코드만 올리면 실행 (서버리스)
ECS        → Docker 컨테이너 실행
Fargate    → 서버 없이 컨테이너 실행

스토리지 (저장):
S3         → 무한 용량 파일 저장 (이미지, 동영상, 백업)
EBS        → EC2에 붙이는 하드디스크
EFS        → 여러 EC2가 공유하는 파일시스템

데이터베이스:
RDS        → MySQL, PostgreSQL 등 관계형 DB
Aurora     → AWS 최적화 고성능 DB
DynamoDB   → NoSQL (완전 관리형)
ElastiCache → Redis, Memcached (캐시)

네트워킹:
VPC        → 나만의 가상 네트워크
ALB/NLB    → 트래픽 분산 (로드밸런서)
Route 53   → 도메인 관리, DNS
CloudFront → CDN (전 세계 빠른 콘텐츠 배달)
API Gateway → API 관리

보안:
IAM        → 권한 관리
WAF        → 웹 방화벽 (SQL 인젝션, XSS 방어)
Secrets Manager → DB 비밀번호 등 안전하게 저장
KMS        → 암호화 키 관리
Certificate Manager → HTTPS 인증서 무료 발급

모니터링:
CloudWatch → 서버 지표, 로그, 알림
X-Ray      → 요청 추적 (어디서 느린지 찾기)
```

---

## 처음 시작하는 사람을 위한 로드맵

```
1단계: 계정 만들기
- AWS 계정 생성
- 루트 MFA 활성화
- IAM 사용자 생성 (루트 대신 사용할)
- 예산 알림 설정 ($10 넘으면 이메일)

2단계: 첫 서버 만들기
- EC2 t2.micro (무료 티어)로 서버 생성
- SSH 접속해보기
- 웹 서버(nginx) 설치해보기
- 사용 후 종료(terminate)

3단계: 스토리지 맛보기
- S3 버킷 만들어서 파일 올리기
- 정적 웹사이트 호스팅 해보기

4단계: 네트워크 이해
- VPC 구조 이해
- 퍼블릭/프라이빗 서브넷 차이

5단계: 실전 배포
- RDS로 데이터베이스 만들기
- EC2 + RDS 연결
- 로드밸런서(ALB) 앞에 놓기
- 도메인 연결
```

---

## 학습 팁

```
공식 문서를 두려워하지 말자:
- docs.aws.amazon.com (한국어 지원)
- 각 서비스별 Getting Started 가이드가 있음

실습 환경:
- AWS Free Tier로 12개월 무료 실습
- 단, 월 예산 알림 설정 필수!
- 실습 후 항상 리소스 정리

자격증 (나중에):
- AWS SAA (Solutions Architect Associate): 취업/이직에 도움
- 시험 준비하면서 개념 정리하기 좋음
```
