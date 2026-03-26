---
title: "CloudFront와 Route53"
order: 9
---

# CloudFront와 Route53

콘텐츠를 빠르게 전달하고 도메인을 관리하는 서비스.
CloudFront = 전세계 배달 네트워크, Route53 = 주소록 서비스다.

---

## CloudFront란

**CloudFront = 전세계 배달 네트워크(CDN)**

```
서울 사용자가 미국 서버의 이미지를 요청하면:
Without CloudFront:
  서울 → 태평양 → 미국 서버 → 태평양 → 서울
  거리: 약 20,000km 왕복 → 200~300ms 지연

With CloudFront:
  서울 → 서울 엣지 로케이션 (캐시에 있으면) → 서울
  거리: 수 km → 수 ms 지연

CloudFront는 전 세계 450+ 곳에 엣지 로케이션을 운영함
→ 사용자 가장 가까운 곳에서 콘텐츠 제공
```

**CloudFront 동작 흐름**:

```
1. 사용자가 가장 가까운 엣지 로케이션에 요청
2. 캐시 HIT → 즉시 반환 (오리진 접속 없음)
3. 캐시 MISS → 오리진(S3, ALB 등)에서 콘텐츠 가져옴
4. 가져온 콘텐츠를 엣지에 캐시 → 다음 요청은 빠르게

오리진(Origin) = 실제 콘텐츠가 있는 곳:
- S3 버킷 (정적 파일: HTML, CSS, JS, 이미지)
- ALB + EC2/ECS (API 서버)
- 커스텀 HTTP 서버

장점:
- 레이턴시 감소 (가까운 곳에서 서빙)
- 오리진 서버 부하 감소 (캐시 히트율이 높으면 오리진 거의 안 씀)
- DDoS 방어 (Shield Standard 기본 포함)
- HTTPS 자동 적용 (ACM 인증서 무료)
- 비용 절감 (EC2에서 직접 서빙보다 저렴)
```

---

## CloudFront 배포 생성 — 실전 설정

콘솔(AWS Console)에서 설정하거나 CLI/Terraform으로 자동화할 수 있다.

```bash
# CLI로 CloudFront 배포 생성 (S3 오리진)
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "my-distribution-2024",
    "Origins": {
      "Quantity": 1,
      "Items": [{
        "Id": "s3-origin",
        "DomainName": "my-bucket.s3.ap-northeast-2.amazonaws.com",
        "S3OriginConfig": {"OriginAccessIdentity": ""}
      }]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "s3-origin",
      "ViewerProtocolPolicy": "redirect-to-https",
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
      "Compress": true
    },
    "Comment": "My App CloudFront",
    "Enabled": true
  }'
```

**콘솔에서 주요 설정 항목**:

```
Origin 설정:
- Origin domain: S3 버킷 또는 ALB DNS명
- Protocol: HTTPS only (권장)
- OAC (Origin Access Control): S3 직접 접근 차단

Default Cache Behavior:
- Viewer protocol policy: Redirect HTTP to HTTPS (권장)
- Cache key: 기본 정책 또는 커스텀
- Compress objects automatically: Yes (Gzip, Brotli)

Settings:
- Price class: 전체 / 아시아 포함 / 미주+유럽 (비용 vs 성능)
- SSL certificate: ACM 인증서 연결
- Default root object: index.html (SPA 배포 시)
```

---

## 캐시 정책 설정 — URL 패턴별 다르게

```
동작(Behavior) 우선순위 설정:
/static/*    → 정적 파일 (오래 캐시)
/api/public/* → 짧은 캐시
/api/*        → 캐시 없음 (동적 API)
/*            → HTML (짧은 캐시 또는 캐시 없음)
```

```bash
# Behavior 1: 정적 파일 (CSS, JS, 이미지)
경로 패턴: /static/*
캐시 정책: 1년 (파일명에 해시 포함: main.abc123.js)
Compress: Yes
이유: 파일명이 변경되면 URL이 바뀜 → 내용이 같으면 영원히 캐시 가능

# Behavior 2: 공개 API (카탈로그, 공지사항)
경로 패턴: /api/public/*
캐시 정책: 60초
Headers: Cache-Control 오리진 응답 준수

# Behavior 3: 인증 필요 API
경로 패턴: /api/*
캐시 정책: 캐시 없음 (CachingDisabled)
Headers: Authorization 포워딩 필수

# Behavior 4: HTML 파일
경로 패턴: /* (기본값)
캐시 정책: TTL 0~60초 또는 no-cache
이유: SPA에서 index.html은 최신 버전이어야 함
```

---

## OAC — S3를 CloudFront만 접근 가능하게

S3 버킷을 직접 공개하면 CloudFront를 우회할 수 있다.
OAC(Origin Access Control)로 S3를 CloudFront만 접근 가능하게 잠금한다.

```bash
# 1. OAC 생성
aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "my-s3-oac",
    "OriginAccessControlOriginType": "s3",
    "SigningBehavior": "always",
    "SigningProtocol": "sigv4"
  }'
# 출력에서 Id 기록 (배포 설정에 사용)

# 2. CloudFront 배포에 OAC 연결
# OriginAccessControlId: 위에서 얻은 Id 사용

# 3. S3 버킷 정책 업데이트 (CloudFront만 허용)
aws s3api put-bucket-policy --bucket my-bucket --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontOAC",
    "Effect": "Allow",
    "Principal": {
      "Service": "cloudfront.amazonaws.com"
    },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/DISTRIBUTION_ID"
      }
    }
  }]
}'

# 4. S3 버킷 Block Public Access 활성화 (모두 차단)
aws s3api put-public-access-block \
  --bucket my-bucket \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

---

## Lambda@Edge와 CloudFront Functions

CloudFront에서 요청/응답을 수정하는 서버리스 함수다.

```javascript
// CloudFront Functions: 경량 (서버 부하 없음, 전 세계 엣지에서 실행)
// URL 리라이팅 예시 (SPA 라우팅)
function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // /product/123 → /index.html (SPA에서 모든 경로를 index.html로)
    if (!uri.includes('.') && uri !== '/') {
        request.uri = '/index.html';
    }

    return request;
}

// 보안 헤더 자동 추가 (응답에)
function handler(event) {
    var response = event.response;
    var headers = response.headers;

    // HTTPS 강제 (1년)
    headers['strict-transport-security'] = {
        value: 'max-age=63072000; includeSubdomains; preload'
    };
    // 콘텐츠 타입 스니핑 방지
    headers['x-content-type-options'] = { value: 'nosniff' };
    // 클릭재킹 방지
    headers['x-frame-options'] = { value: 'DENY' };
    // XSS 필터
    headers['x-xss-protection'] = { value: '1; mode=block' };
    // CORS
    headers['access-control-allow-origin'] = { value: 'https://example.com' };

    return response;
}
```

```
CloudFront Functions vs Lambda@Edge:
CF Functions: 빠름(서브ms), 저렴, 단순 로직 (URL 조작, 헤더 수정)
Lambda@Edge: 느림(수ms), 비쌈, 복잡 로직 (인증, DB 쿼리)
```

---

## Route53 — DNS 서비스

**Route53 = 주소록(DNS) + 헬스체크 + 스마트 라우팅**

인터넷의 전화번호부다. `example.com`을 실제 서버 IP로 연결해준다.

```
DNS 레코드 타입:
A     → 도메인 → IPv4 주소
      example.com → 54.123.45.67

AAAA  → 도메인 → IPv6 주소

CNAME → 도메인 → 다른 도메인 (루트 도메인에는 사용 불가)
      www.example.com → example.com (불가: 루트)
      api.example.com → api-server.example.com (가능)

ALIAS → AWS 리소스로 직접 (루트 도메인 가능! AWS 특수 기능)
      example.com → xxx.cloudfront.net (가능!)
      example.com → my-lb-123.ap-northeast-2.elb.amazonaws.com (가능!)

MX    → 이메일 서버 지정
TXT   → 도메인 소유 확인, SPF, DKIM
NS    → 네임서버

ALIAS의 특징:
- CloudFront, ALB, S3, ElasticBeanstalk 직접 가리킴
- 루트 도메인(example.com)에서도 사용 가능 (CNAME은 불가)
- 쿼리 비용 없음
```

```bash
# 도메인 등록 또는 외부 도메인 이전
# 콘솔: Route53 → Hosted zones → Create hosted zone

# CLI로 A 레코드 생성 (CloudFront ALIAS)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "d1234567890.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }, {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "d1234567890.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

---

## 라우팅 정책 — 스마트 트래픽 관리

```
Simple (기본):
- 단일 리소스로 라우팅
- 레코드 하나에 IP 하나

Weighted (가중치):
- 트래픽을 비율로 분산
- 예: v1 서버 90%, v2 서버 10% (A/B 테스트, 블루/그린 배포)

Latency (레이턴시):
- 응답이 가장 빠른 리전으로 라우팅
- 멀티 리전 서비스에 사용
- 예: 서울 → ap-northeast-2 (가까운 곳)

Failover (장애 전환):
- Primary가 헬스체크 실패 시 Secondary로 전환
- 재해복구(DR) 구성에 필수

Geolocation (지역 기반):
- 사용자 위치 기반 라우팅
- 예: 한국 사용자 → ap-northeast-2, 미국 사용자 → us-east-1
- 서비스 지역 제한, 언어별 분리에 활용

Multivalue Answer:
- 여러 IP 반환 (헬스체크 통과한 것만)
- 간단한 로드밸런싱
```

```bash
# 가중치 라우팅 예시 (블루/그린 배포)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "api.example.com",
          "Type": "A",
          "SetIdentifier": "blue",
          "Weight": 90,
          "AliasTarget": {
            "HostedZoneId": "...",
            "DNSName": "blue-alb.ap-northeast-2.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      },
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "api.example.com",
          "Type": "A",
          "SetIdentifier": "green",
          "Weight": 10,
          "AliasTarget": {
            "HostedZoneId": "...",
            "DNSName": "green-alb.ap-northeast-2.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }'
```

---

## ACM — 무료 HTTPS 인증서

```bash
# HTTPS 인증서 발급 (완전 무료!)
# CloudFront용 인증서는 반드시 us-east-1 리전에 생성!
aws acm request-certificate \
  --domain-name example.com \
  --subject-alternative-names "*.example.com" \    # 와일드카드 서브도메인도 포함
  --validation-method DNS \                         # DNS 검증 방식 권장
  --region us-east-1                               # CloudFront는 반드시 us-east-1!

# 검증용 CNAME 레코드 확인
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc-123 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
# 출력: CNAME 이름과 값 → Route53에 추가하면 자동 검증

# Route53에 추가하면 수 분 후 자동 검증 완료
```

---

## 전체 HTTPS 아키텍처

실무에서 가장 많이 쓰는 구성이다.

```
사용자 브라우저
    ↓ HTTPS
Route53 (example.com → CloudFront ALIAS)
    ↓
CloudFront (us-east-1 ACM 인증서)
    ├── /static/* → S3 버킷 (OAC)
    │              CSS, JS, 이미지
    └── /*        → ALB (ap-northeast-2)
                      ↓
                    ECS 태스크 (Spring Boot API)
                      ↓
                    RDS (PostgreSQL)
```

**설정 순서**:

```bash
# 1. ACM에서 인증서 발급 (us-east-1)
aws acm request-certificate --region us-east-1 ...

# 2. S3 버킷 생성 (정적 파일용)
aws s3 mb s3://my-app-static

# 3. ALB 생성 (API 서버 앞단)
# (EC2/ECS 구성 시 자동 생성됨)

# 4. CloudFront 배포 생성
# - Origins: S3 버킷, ALB
# - Behaviors: /static/* → S3, /* → ALB
# - Certificate: 1번에서 발급한 ACM 인증서

# 5. Route53 Hosted Zone 설정
# - example.com → CloudFront ALIAS
# - www.example.com → CloudFront ALIAS

# 6. S3 OAC 설정
# CloudFront만 S3 접근 가능하도록

# 7. CloudFront 캐시 무효화 (배포 후)
aws cloudfront create-invalidation \
  --distribution-id DIST_ID \
  --paths "/static/*" "/index.html"
```

---

## 자주 하는 실수

```bash
# 실수 1: CloudFront용 ACM 인증서를 ap-northeast-2에서 발급
# CloudFront는 글로벌 서비스 → 인증서도 글로벌 리전(us-east-1)이어야 함
# 해결: 반드시 --region us-east-1 옵션 사용

# 실수 2: S3를 public으로 열고 CloudFront로 연결
# S3 버킷이 공개면 CloudFront 우회해서 S3 직접 접근 가능
# 해결: OAC 설정 + S3 Block Public Access 활성화

# 실수 3: 배포 후 캐시 때문에 변경사항 안 보임
# CloudFront가 이전 버전을 캐시하고 있음
# 해결: Invalidation 생성
aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/*"

# 실수 4: CNAME 레코드를 루트 도메인에 사용 시도
# CNAME은 루트 도메인(example.com)에 사용 불가 (DNS 표준 제약)
# 해결: ALIAS 레코드 사용 (Route53 특수 기능)

# 실수 5: TTL을 너무 짧게 설정
# 모든 요청이 오리진으로 → CloudFront 의미 없음
# 해결: 정적 파일은 길게 (1년), HTML은 짧게 (0~60초)
```
