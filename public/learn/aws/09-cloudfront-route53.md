---
title: "CloudFront와 Route53"
order: 9
---

# CloudFront와 Route53

콘텐츠를 빠르게 전달하고 도메인을 관리하는 서비스.

---

## CloudFront

전 세계 450+ 엣지 로케이션에서 콘텐츠를 캐시하고 전달하는 CDN.

```
동작:
1. 사용자가 가장 가까운 엣지 로케이션에 요청
2. 캐시 히트 → 즉시 반환
3. 캐시 미스 → 오리진(S3, ALB 등)에서 가져옴 → 캐시 저장 → 반환

오리진 지원:
— S3 버킷
— ALB (Application Load Balancer)
— EC2 인스턴스
— 커스텀 HTTP 서버

장점:
— 레이턴시 감소 (가까운 위치에서 서빙)
— 오리진 부하 감소
— DDoS 방어 (Shield Standard 기본 포함)
— HTTPS 자동 적용 (ACM 인증서 무료)
```

---

## CloudFront 배포 생성

```bash
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "unique-id-123",
    "Origins": {
      "Quantity": 1,
      "Items": [{
        "Id": "s3-origin",
        "DomainName": "my-bucket.s3.amazonaws.com",
        "S3OriginConfig": {"OriginAccessIdentity": ""}
      }]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "s3-origin",
      "ViewerProtocolPolicy": "redirect-to-https",
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
      "Compress": true
    },
    "Comment": "My CloudFront",
    "Enabled": true
  }'
```

---

## 캐시 정책 설정

```
동작 (Behavior) 설정:

/static/* → 정적 파일 캐시
  Cache: TTL max (365일, 파일명에 해시 포함)
  Compress: Yes

/api/public/* → 짧은 캐시
  Cache: TTL 60초
  Headers: Cache-Control 오리진 준수

/api/private/* → 캐시 없음
  Cache: Disabled
  Forward All Headers

/* → HTML
  Cache: TTL 0 (항상 오리진 검증)
```

---

## OAC (Origin Access Control)

```bash
# S3 버킷을 CloudFront만 접근 가능하게

# 1. OAC 생성
aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "my-oac",
    "OriginAccessControlOriginType": "s3",
    "SigningBehavior": "always",
    "SigningProtocol": "sigv4"
  }'

# 2. S3 버킷 정책 (CloudFront만 허용)
{
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "cloudfront.amazonaws.com"
    },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::123456789:distribution/DIST_ID"
      }
    }
  }]
}
```

---

## Lambda@Edge / CloudFront Functions

```javascript
// CloudFront Functions: 요청/응답 수정 (경량, 빠름)
// URL 리라이팅 예시
function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // /blog/123 → /blog.html?id=123
    if (uri.startsWith('/blog/')) {
        var id = uri.replace('/blog/', '');
        request.uri = '/blog.html';
        request.querystring = {id: {value: id}};
    }

    return request;
}

// 보안 헤더 추가
function handler(event) {
    var response = event.response;
    var headers = response.headers;

    headers['strict-transport-security'] = {
        value: 'max-age=63072000; includeSubdomains; preload'
    };
    headers['x-content-type-options'] = {value: 'nosniff'};
    headers['x-frame-options'] = {value: 'DENY'};

    return response;
}
```

---

## Route53

AWS의 DNS 서비스. 도메인 등록 및 라우팅.

```
레코드 타입:
A     — 도메인 → IPv4
AAAA  — 도메인 → IPv6
CNAME — 도메인 → 다른 도메인 (루트 도메인 사용 불가)
ALIAS — AWS 리소스로 직접 (루트 도메인도 가능)
MX    — 메일 서버
TXT   — 텍스트 (SPF, DKIM, 도메인 소유 확인)
NS    — 네임서버
SOA   — 도메인 권한 정보

ALIAS 특수 기능:
— CloudFront, ALB, S3, Elastic IP 직접 가리킴
— CNAME과 달리 루트 도메인(example.com) 사용 가능
— 조회 비용 없음 (CNAME은 추가 조회 발생)
```

```bash
# Hosted Zone 생성
aws route53 create-hosted-zone \
  --name example.com \
  --caller-reference unique-id-123

# A 레코드 생성 (ALIAS)
aws route53 change-resource-record-sets \
  --hosted-zone-id ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "xxx.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

---

## 라우팅 정책

```
Simple (기본):
— 단일 리소스로 라우팅

Weighted (가중치):
— 트래픽 비율로 분산
— A/B 테스트, 블루/그린 배포
예: v1 90%, v2 10%

Latency (지연 시간):
— 레이턴시 낮은 리전으로 라우팅
— 멀티 리전 서비스에 사용

Failover (장애 전환):
— Primary 장애 시 Secondary로 전환
— Health Check 필요

Geolocation (지역):
— 사용자 위치 기반 라우팅
— 한국 → ap-northeast-2, 미국 → us-east-1

Geoproximity:
— 위치 + 편향값으로 라우팅

Multivalue Answer:
— 여러 IP 반환 (간단한 로드밸런싱)
```

---

## ACM (AWS Certificate Manager)

```bash
# HTTPS 인증서 발급 (무료!)
aws acm request-certificate \
  --domain-name example.com \
  --subject-alternative-names "*.example.com" \
  --validation-method DNS \
  --region us-east-1  # CloudFront용은 반드시 us-east-1!

# DNS 검증 레코드 추가 (Route53)
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:... \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'

# 위 결과의 CNAME 레코드를 Route53에 추가 → 자동 검증
```

---

## 전체 HTTPS 구성

```
도메인: example.com (Route53에서 구매/관리)
    ↓ ALIAS 레코드
CloudFront 배포 (us-east-1의 ACM 인증서)
    ├── /static/* → S3 버킷 (OAC)
    └── /*        → ALB
                      └── ECS 태스크
```

```bash
# 설정 순서:
# 1. ACM에서 인증서 발급 (us-east-1)
# 2. S3 버킷 생성 (정적 파일)
# 3. CloudFront 배포 생성 (인증서 연결)
# 4. Route53에서 CloudFront ALIAS 레코드 생성
# 5. CloudFront → S3 OAC 설정
# 6. CloudFront → ALB 동작 추가
```
