---
title: "AWS 면접 예상 질문"
order: 11
---

# AWS 면접 예상 질문

AWS 클라우드 면접에서 빈출되는 핵심 질문들입니다.

## Q1. EC2의 인스턴스 타입과 구매 옵션을 설명해주세요

**인스턴스 패밀리:**
| 타입 | 특징 | 사용 케이스 |
|-----|------|------------|
| t (Burstable) | CPU 크레딧 기반 | 개발/테스트, 웹서버 |
| m (General) | 균형 잡힌 CPU/메모리 | 앱 서버 |
| c (Compute) | 고성능 CPU | 게임 서버, 미디어 인코딩 |
| r (Memory) | 대용량 메모리 | 인메모리 DB, 분석 |
| i (Storage) | 고속 NVMe SSD | DB, 데이터 웨어하우스 |

**구매 옵션:**
- **On-Demand:** 초당 과금, 유연성 최대
- **Reserved (예약):** 1~3년 약정, 최대 72% 할인
- **Spot:** 남는 용량, 최대 90% 할인, 2분 예고 후 종료 가능
- **Savings Plans:** 특정 사용량 약정, Reserved보다 유연

---

## Q2. VPC의 주요 컴포넌트를 설명해주세요

```
VPC (가상 사설 네트워크)
├── Public Subnet  — Internet Gateway로 외부 연결
│   └── EC2 (웹 서버, Load Balancer)
├── Private Subnet — 외부 직접 접근 불가
│   └── EC2 (앱 서버, DB)
└── NAT Gateway    — Private Subnet → 인터넷 아웃바운드 허용
```

**보안 레이어:**
- **Security Group:** 인스턴스 레벨, Stateful (응답 자동 허용)
- **NACL:** 서브넷 레벨, Stateless (인/아웃 각각 설정)

**실무 설계 패턴:**
```
인터넷 → ALB (Public Subnet) → App Server (Private) → RDS (Private)
```

---

## Q3. S3의 스토리지 클래스를 설명해주세요

| 클래스 | 접근 빈도 | 가용성 | 비용 |
|-------|---------|-------|-----|
| Standard | 자주 | 99.99% | 높음 |
| Standard-IA | 가끔 | 99.9% | 중간 |
| One Zone-IA | 가끔 (단일 AZ) | 99.5% | 낮음 |
| Glacier Instant | 드물게 | 99.9% | 저렴 |
| Glacier Flexible | 아카이브 | - | 매우 저렴 |
| Intelligent-Tiering | 패턴 불명확 | 자동 조정 | 관리 비용 |

**S3 보안:**
```
버킷 정책 + IAM 정책 + ACL(레거시)

# 퍼블릭 접근 차단 (기본 활성화 권장)
Block all public access: ON

# 특정 IAM Role에만 접근 허용
{
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::ACCOUNT:role/AppRole" },
  "Action": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::my-bucket/*"
}
```

---

## Q4. RDS와 Aurora의 차이는?

| 비교 | RDS | Aurora |
|-----|-----|--------|
| 호환 | MySQL, PostgreSQL, Oracle, SQL Server | MySQL, PostgreSQL 호환 |
| 성능 | 표준 | MySQL의 5배, PostgreSQL의 3배 |
| 스토리지 | 단일 EBS, 수동 증가 | 자동 증가 (최대 128TB) |
| 복제 | 싱글 AZ / Multi-AZ | 3 AZ × 2 복사 = 6개 복사본 자동 |
| 장애 복구 | ~1-2분 | ~30초 이하 |
| 비용 | 낮음 | RDS 대비 높음 |

**Aurora Serverless v2:** 용량을 자동으로 조절 (ACU 단위), 간헐적 워크로드에 적합.

---

## Q5. ElastiCache는 언제 사용하나요?

Redis 또는 Memcached 관리형 서비스로, **DB 부하 감소 및 응답 속도 개선**에 사용합니다.

**주요 사용 패턴:**
```
캐싱: DB 조회 결과를 Redis에 저장 → 반복 요청은 Redis에서 응답
세션: HTTP 세션을 Redis에 저장 → 서버 확장 시에도 세션 공유
순위표: Redis Sorted Set으로 실시간 랭킹
Pub/Sub: 실시간 알림, 채팅
분산 락: SETNX 또는 Redlock 패턴
```

**Read-Through 캐시 패턴:**
```
1. 캐시 조회 → 캐시 미스
2. DB 조회
3. 결과를 캐시에 저장 (TTL 설정)
4. 응답 반환
```

---

## Q6. Lambda의 콜드 스타트(Cold Start)를 설명하고 해결 방법은?

**콜드 스타트:** Lambda가 새 실행 환경을 초기화할 때 발생하는 지연

```
트래픽 없음 → 컨테이너 종료
새 요청 → 새 컨테이너 초기화 (200ms ~ 수 초 지연)
```

**발생 조건:** 첫 호출, 동시성 급증, 배포 후, 15분 이상 유휴

**해결 방법:**
- **Provisioned Concurrency:** 미리 컨테이너 워밍업 (비용 발생)
- **Keep-Warm:** EventBridge로 주기적 ping (임시방편)
- **경량화:** 패키지 크기 줄이기, 의존성 최소화
- **SnapStart (Java):** 스냅샷으로 초기화 시간 단축

---

## Q7. ECS와 EKS의 차이를 설명해주세요

| 비교 | ECS | EKS |
|-----|-----|-----|
| 오케스트레이션 | AWS 자체 | Kubernetes |
| 학습 곡선 | 낮음 | 높음 |
| 운영 복잡도 | 낮음 | 높음 |
| 이식성 | AWS 종속 | 쿠버네티스 표준 |
| Fargate 지원 | O | O |
| 생태계 | AWS 통합 최적화 | 풍부한 K8s 생태계 |

**ECS Fargate:** 서버리스 컨테이너 — EC2 관리 불필요

```
ECS 추천: AWS에만 배포, 팀 규모 작음, 빠른 도입
EKS 추천: 멀티 클라우드 가능성, K8s 경험팀, 대규모 마이크로서비스
```

---

## Q8. IAM 보안 모범 사례는?

```
1. 루트 계정 사용 금지 — MFA 활성화 후 잠금
2. 최소 권한 원칙 — 필요한 권한만 부여
3. 인라인 정책보다 관리형 정책 사용
4. Access Key 대신 IAM Role 사용 (EC2, Lambda)
5. 정기적 자격 증명 교체
6. CloudTrail로 API 호출 감사
```

```json
// 최소 권한 예시 — 특정 S3 버킷만 읽기
{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:ListBucket"],
    "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
    ]
}
```

**Permission Boundary:** IAM 엔티티가 가질 수 있는 최대 권한 한도 설정 (위임 시 권한 상승 방지)
