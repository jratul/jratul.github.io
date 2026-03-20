---
title: "로드밸런서와 프록시"
order: 9
---

# 로드밸런서와 프록시

트래픽을 여러 서버에 분산하고, 클라이언트와 서버 사이에서 요청을 중계하는 구조.

---

## 프록시 종류

```
포워드 프록시 (Forward Proxy):
클라이언트 → [프록시] → 서버

— 클라이언트 요청을 대신 전달
— 클라이언트 IP를 서버가 모름
— 기업 방화벽, VPN, 캐싱에 활용

리버스 프록시 (Reverse Proxy):
클라이언트 → [리버스 프록시] → 서버

— 서버 앞에 위치
— 서버 내부 구조 숨김
— 로드밸런싱, SSL 종료, 캐싱, 압축 처리
— Nginx, HAProxy, AWS ALB가 리버스 프록시 역할
```

---

## L4 vs L7 로드밸런서

```
L4 (Transport Layer):
— TCP/UDP 레벨에서 분산
— IP:Port 기준으로만 라우팅
— 빠름, 단순
— AWS NLB, HAProxy TCP 모드

L7 (Application Layer):
— HTTP 레벨에서 분산
— URL, 헤더, 쿠키 기반 라우팅 가능
— SSL 종료, 헤더 수정, 캐싱 가능
— AWS ALB, Nginx, HAProxy HTTP 모드

예:
L7: /api/* → API 서버들
    /static/* → 정적 파일 서버들
    /admin/* → 관리자 서버
```

---

## 로드밸런싱 알고리즘

```
Round Robin (기본):
— 순서대로 돌아가며 분산
— 서버 사양이 동일할 때 적합

Weighted Round Robin:
— 가중치에 따라 분산
— 서버 A(가중치 3): 요청 3개
— 서버 B(가중치 1): 요청 1개

Least Connections:
— 현재 연결 수가 적은 서버에 전달
— 요청 처리 시간이 다를 때 효과적

IP Hash:
— 클라이언트 IP 기반으로 고정 서버에 연결
— 세션 유지 필요할 때 (Sticky Session)

Random:
— 무작위 선택
```

---

## Nginx 리버스 프록시

```nginx
# upstream — 백엔드 서버 그룹
upstream api_servers {
    least_conn;                         # 최소 연결 방식

    server 10.0.1.10:8080 weight=3;    # 가중치 3
    server 10.0.1.11:8080 weight=1;
    server 10.0.1.12:8080 backup;      # 나머지 실패 시 사용
}

upstream static_servers {
    server 10.0.2.10:80;
    server 10.0.2.11:80;
    keepalive 32;                       # 업스트림 연결 재사용
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # API 요청 → 앱 서버로
    location /api/ {
        proxy_pass http://api_servers;

        # 원본 정보 전달
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 타임아웃
        proxy_connect_timeout 5s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;

        # 버퍼링
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # 정적 파일 → 캐시
    location /static/ {
        proxy_pass http://static_servers;
        proxy_cache_valid 200 7d;
        expires 7d;
    }

    # 헬스 체크 엔드포인트는 로그 제외
    location /health {
        proxy_pass http://api_servers;
        access_log off;
    }
}
```

---

## 헬스 체크

```nginx
# Nginx Plus 또는 커스텀 헬스 체크
upstream api_servers {
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;

    # 기본 passive 헬스 체크
    # 실패 시 일시적으로 제외
}

# 실패 임계값 설정
server 10.0.1.10:8080 max_fails=3 fail_timeout=30s;
```

```yaml
# AWS ALB 헬스 체크 설정
HealthCheck:
  Path: /actuator/health
  Protocol: HTTP
  Port: 8080
  HealthyThresholdCount: 2     # 2번 성공하면 정상
  UnhealthyThresholdCount: 3   # 3번 실패하면 비정상
  Interval: 30                 # 30초 간격
  Timeout: 5                   # 5초 내 응답
```

---

## SSL 종료 (SSL Termination)

```
클라이언트 ←HTTPS→ 로드밸런서 ←HTTP→ 서버

장점:
— 서버에서 TLS 처리 부하 제거
— 인증서 관리 중앙화
— 서버 간 통신은 내부 네트워크라 HTTP로 충분

주의:
— 내부 통신도 암호화 필요하면 SSL passthrough 사용
— X-Forwarded-Proto: https 헤더로 원본 프로토콜 전달
```

```java
// Spring Boot에서 HTTPS 리다이렉트 (SSL 종료 환경)
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Bean
    public TomcatServletWebServerFactory tomcatFactory() {
        TomcatServletWebServerFactory factory = new TomcatServletWebServerFactory();
        factory.addConnectorCustomizers(connector -> {
            // X-Forwarded-* 헤더 신뢰
        });
        return factory;
    }
}

// application.yml
server:
  forward-headers-strategy: framework  # X-Forwarded-* 헤더 처리
```

---

## Rate Limiting (속도 제한)

```nginx
# Nginx Rate Limiting
http {
    # 요청 제한 존 정의 (IP별, 초당 10req)
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    # JWT 사용자별 제한
    limit_req_zone $http_authorization zone=user_limit:10m rate=100r/m;

    server {
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            limit_req_status 429;

            proxy_pass http://api_servers;
        }
    }
}
```

---

## 실무 아키텍처 예시

```
인터넷
    ↓
[CloudFront / CDN]
    ↓
[AWS ALB — L7 로드밸런서]
    ├── /api/*  → [ECS/EC2 앱 서버 그룹]
    └── /*      → [S3 정적 파일]

앱 서버 그룹
    └── [Nginx (리버스 프록시)]
            ↓
        [Spring Boot :8080]
            ↓
        [RDS PostgreSQL (Multi-AZ)]
        [ElastiCache Redis]
```
