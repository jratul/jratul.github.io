---
title: "AWS 기본 개념"
order: 1
---

# AWS 기본 개념

클라우드 인프라의 기본. 리전, AZ, IAM을 이해하면 나머지가 쉬워진다.

---

## 글로벌 인프라

```
리전 (Region):
— 지리적으로 분리된 데이터센터 군
— 예: ap-northeast-2 (서울), us-east-1 (버지니아)
— 서비스 선택 시 리전 선택 필수
— 리전 간 데이터 전송은 비용 발생

가용 영역 (AZ, Availability Zone):
— 리전 내 물리적으로 분리된 데이터센터
— 서울 리전: ap-northeast-2a, 2b, 2c, 2d
— AZ 장애가 다른 AZ에 영향 없음
— 고가용성 설계: 여러 AZ에 분산 배포

엣지 로케이션 (Edge Location):
— CloudFront CDN 캐시 서버
— 전 세계 450+ 위치
— 사용자와 가장 가까운 곳에서 콘텐츠 제공
```

---

## IAM (Identity and Access Management)

AWS 리소스 접근 제어. 모든 AWS 보안의 기반.

```
개념:
User   — 실제 사람 또는 애플리케이션
Group  — 사용자 그룹 (공통 정책 적용)
Role   — 임시 권한 부여 (EC2, Lambda 등에 할당)
Policy — 권한 정의 문서 (JSON)
```

```json
// Policy 예시: S3 특정 버킷 읽기 전용
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ]
    }
  ]
}
```

```
ARN (Amazon Resource Name):
arn:aws:s3:::my-bucket
arn:aws:ec2:ap-northeast-2:123456789:instance/i-1234567890

형식: arn:partition:service:region:account-id:resource
```

---

## IAM Best Practice

```
1. Root 계정 사용 금지
   — MFA 필수 활성화
   — 일상 작업에 root 절대 사용 금지

2. 최소 권한 원칙 (Least Privilege)
   — 필요한 권한만 부여
   — 와일드카드(*) 남용 금지

3. IAM Role 사용 (EC2, Lambda 등)
   — 액세스 키를 코드에 하드코딩 금지!
   — EC2에 Role 할당 → 인스턴스 메타데이터로 임시 자격증명 획득

4. 액세스 키 관리
   — 정기적 로테이션
   — 불필요한 키 즉시 삭제

5. MFA (Multi-Factor Authentication) 활성화
   — 콘솔 로그인 필수
   — 민감한 API 작업에도 MFA 조건 추가
```

---

## AWS CLI 설정

```bash
# 설치 (macOS)
brew install awscli

# 설치 (Ubuntu)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 자격 증명 설정
aws configure
# AWS Access Key ID: ...
# AWS Secret Access Key: ...
# Default region name: ap-northeast-2
# Default output format: json

# 여러 프로필 관리
aws configure --profile dev
aws configure --profile prod

# 프로필 사용
aws s3 ls --profile prod
export AWS_PROFILE=prod    # 환경변수로 설정
```

```bash
# 기본 명령어
aws sts get-caller-identity     # 현재 자격증명 확인
aws ec2 describe-instances      # EC2 목록
aws s3 ls                       # S3 버킷 목록
aws s3 ls s3://my-bucket        # 버킷 내 파일 목록

# EC2 인스턴스 목록 (이름 태그 포함)
aws ec2 describe-instances \
  --query 'Reservations[*].Instances[*].[Tags[?Key==`Name`].Value|[0],State.Name,PublicIpAddress]' \
  --output table
```

---

## 과금 모델

```
On-Demand:
— 사용한 만큼 지불
— 약정 없음 (유연성 최고)
— 가장 비쌈

Reserved Instances (RI):
— 1년 또는 3년 약정
— 최대 72% 할인
— 안정적인 워크로드에 적합

Spot Instances:
— 여유 컴퓨팅 자원 입찰
— 최대 90% 할인
— 인터스턴스가 중단될 수 있음
— 배치, CI/CD에 적합

Savings Plans:
— 1년 or 3년 약정, 특정 사용량 보장
— RI보다 유연 (EC2 외에 Fargate, Lambda도)

Free Tier:
— 신규 계정 12개월 무료
— t2.micro EC2 750시간/월
— S3 5GB, RDS 750시간/월 등
```

---

## 비용 관리

```bash
# AWS Cost Explorer 활성화 권장
# Budgets 설정 (알림)

# 비용 확인 (CLI)
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-02-01 \
  --granularity MONTHLY \
  --metrics "BlendedCost" \
  --query 'ResultsByTime[*].[TimePeriod.Start, Total.BlendedCost.Amount]' \
  --output table
```

```
비용 최적화 팁:
— 사용하지 않는 리소스 정리 (Elastic IP, EBS, 스냅샷)
— 적절한 인스턴스 타입 선택 (Compute Optimizer 활용)
— S3 Intelligent-Tiering 사용
— Reserved Instance 구매 (장기 워크로드)
— Spot Instance 활용 (배치, CI/CD)
— 리전별 가격 차이 확인 (us-east-1이 보통 저렴)
```

---

## 핵심 서비스 한눈에 보기

```
컴퓨팅:
EC2     — 가상 서버
Lambda  — 서버리스 함수
ECS/EKS — 컨테이너 오케스트레이션
Fargate — 서버리스 컨테이너

스토리지:
S3      — 객체 스토리지
EBS     — EC2 블록 스토리지
EFS     — 공유 파일 시스템

데이터베이스:
RDS     — 관계형 DB (MySQL, PostgreSQL 등)
Aurora  — 고성능 호환 DB
DynamoDB — NoSQL
ElastiCache — Redis/Memcached

네트워킹:
VPC     — 가상 사설 네트워크
ALB/NLB — 로드밸런서
Route53 — DNS
CloudFront — CDN
API Gateway — API 관리

보안:
IAM     — 접근 관리
WAF     — 웹 방화벽
Secrets Manager — 시크릿 관리
KMS     — 키 관리

모니터링:
CloudWatch — 지표/로그/알림
X-Ray   — 분산 추적
```
