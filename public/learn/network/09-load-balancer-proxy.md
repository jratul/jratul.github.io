---
title: "로드밸런서와 프록시"
order: 9
---

# 로드밸런서와 프록시

트래픽을 여러 서버에 분산하고, 클라이언트와 서버 사이에서 요청을 중계하는 구조.

마트의 계산대를 생각해보자. 손님이 100명 줄 서 있을 때 계산대 1개로 처리하면 오래 기다려야 한다. 계산대를 10개 열고 안내원이 "3번 계산대 가세요"라고 분산시키면 효율적이다. 이 안내원이 바로 로드밸런서다.

---

## 프록시란 무엇인가

```
프록시(Proxy) = 대리인
누군가를 대신해서 요청을 전달하는 중간자

포워드 프록시 (Forward Proxy):
클라이언트를 대신 (클라이언트 입장의 대리인)

클라이언트 → [프록시] → 인터넷 → 서버

— 클라이언트 IP를 서버가 모름 (익명성)
— 기업 내부 인터넷 접근 제어
— VPN 원리와 유사
— 캐싱으로 대역폭 절약
예: 회사에서 특정 사이트 차단, 학교 인터넷 필터링

리버스 프록시 (Reverse Proxy):
서버를 대신 (서버 입장의 대리인)

클라이언트 → [리버스 프록시] → 서버들

— 서버 내부 구조(IP, 포트)를 클라이언트가 모름
— 하나의 주소로 여러 서버에 분산
— SSL 처리, 캐싱, 압축 처리
— 로드밸런서 역할
예: Nginx, HAProxy, AWS ALB
```

---

## L4 vs L7 로드밸런서

```
네트워크 계층(OSI 7계층)에 따라 어떤 정보를 보고 분산하는지가 달라진다.

L4 (Transport Layer, 4계층):
— TCP/UDP 레벨에서 분산
— IP 주소 + 포트 번호만 보고 결정
— 빠름 (패킷 내용을 해석하지 않음)
— SSL 암호화된 내용도 그대로 전달 가능
— AWS NLB, HAProxy TCP 모드
용도: 빠른 처리가 필요한 경우, TCP 기반 서비스

L7 (Application Layer, 7계층):
— HTTP 레벨에서 분산
— URL 경로, HTTP 헤더, 쿠키까지 보고 결정
— 더 지능적인 라우팅 가능
— SSL 복호화 → 내용 분석 → 다시 암호화
— AWS ALB, Nginx, HAProxy HTTP 모드
용도: HTTP 서비스, 마이크로서비스

L7 라우팅 예시:
/api/*    → API 서버 그룹 (3대)
/static/* → 정적 파일 서버 그룹 (2대)
/admin/*  → 관리자 서버 (1대, IP 제한)
/ws       → WebSocket 서버 그룹 (2대)

→ 경로에 따라 다른 서버로 보낼 수 있다!
```

---

## 로드밸런싱 알고리즘

```
Round Robin (라운드 로빈):
서버 A → 서버 B → 서버 C → 서버 A → 서버 B → ...
— 순서대로 돌아가며 분산
— 서버 사양이 같을 때 적합
— 가장 단순하고 일반적

Weighted Round Robin (가중 라운드 로빈):
서버 A (가중치 3): 요청 3개
서버 B (가중치 1): 요청 1개
— 고사양 서버에 더 많은 요청
— 서버 스펙이 다를 때 활용

Least Connections (최소 연결):
현재 연결 수: A=10, B=3, C=7
→ 다음 요청은 B로!
— 현재 처리 중인 요청 수가 가장 적은 서버로
— 처리 시간이 다른 경우 효과적
— 데이터베이스 연결 풀에 적합

IP Hash:
클라이언트 IP 기반으로 항상 같은 서버로
192.168.1.1 → 항상 서버 A
192.168.1.2 → 항상 서버 B
— 세션 유지가 필요할 때 (Sticky Session)
— 세션을 Redis에 저장하면 필요 없음

Random (무작위):
— 무작위 서버 선택
— 간단한 경우에 사용
```

---

## Nginx 리버스 프록시 설정

```nginx
# /etc/nginx/nginx.conf

# upstream: 백엔드 서버 그룹 정의
upstream api_servers {
    least_conn;                          # 최소 연결 방식 선택

    server 10.0.1.10:8080 weight=3;     # 고사양 서버 (가중치 3)
    server 10.0.1.11:8080 weight=1;     # 일반 서버 (가중치 1)
    server 10.0.1.12:8080 backup;       # 위 서버 모두 실패 시 사용

    # 서버 실패 감지 설정
    # max_fails=3: 3번 실패 시 30초간 제외
    # fail_timeout=30s: 30초 후 다시 시도
    server 10.0.1.10:8080 max_fails=3 fail_timeout=30s;
}

# 정적 파일 서버 그룹
upstream static_servers {
    server 10.0.2.10:80;
    server 10.0.2.11:80;
    keepalive 32;                        # 업스트림 연결 재사용 (성능 향상)
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL 인증서 설정 (SSL Termination)
    ssl_certificate /etc/ssl/certs/api.crt;
    ssl_certificate_key /etc/ssl/private/api.key;

    # API 요청 → 앱 서버로 프록시
    location /api/ {
        proxy_pass http://api_servers;

        # 클라이언트 원본 정보를 백엔드에 전달
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;          # 실제 클라이언트 IP
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;               # http 또는 https

        # 연결 타임아웃 설정
        proxy_connect_timeout 5s;   # 백엔드 연결 시도 시간
        proxy_send_timeout    60s;  # 요청 전송 시간
        proxy_read_timeout    60s;  # 응답 기다리는 시간

        # 버퍼링 설정 (응답을 메모리에 임시 저장)
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # 정적 파일 → 캐시 적용
    location /static/ {
        proxy_pass http://static_servers;
        proxy_cache_valid 200 7d;  # 200 응답을 7일 캐시
        expires 7d;                 # 브라우저 캐시 7일
        add_header Cache-Control "public, immutable";
    }

    # 헬스 체크 엔드포인트 (로그 제외로 노이즈 감소)
    location /health {
        proxy_pass http://api_servers;
        access_log off;             # 헬스체크 로그는 필요 없음
    }

    # 관리자 페이지 → IP 제한
    location /admin/ {
        proxy_pass http://api_servers;
        allow 10.0.0.0/8;          # 내부 IP만 허용
        deny all;                   # 나머지 차단
    }
}

# HTTP → HTTPS 리다이렉트
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;  # 영구 리다이렉트
}
```

---

## 헬스 체크

서버가 죽었는데 계속 트래픽을 보내면 사용자가 에러를 만난다. 헬스 체크로 죽은 서버를 자동으로 제외한다.

```
Passive 헬스 체크 (수동):
실제 요청이 실패할 때 감지
→ 일정 횟수 이상 실패 시 서버 제외
→ 일정 시간 후 다시 시도

Active 헬스 체크 (능동):
로드밸런서가 주기적으로 서버에 직접 확인
GET /health → 200이면 정상
→ 더 빠른 감지 (요청 실패 전에 제외)
→ Nginx Plus, AWS ALB 지원
```

```yaml
# AWS ALB 헬스 체크 설정
HealthCheck:
  Path: /actuator/health           # Spring Boot Actuator 활용
  Protocol: HTTP
  Port: 8080
  HealthyThresholdCount: 2         # 2번 성공하면 정상으로 판단
  UnhealthyThresholdCount: 3       # 3번 실패하면 비정상으로 판단
  Interval: 30                     # 30초마다 체크
  Timeout: 5                       # 5초 내 응답 없으면 실패
```

```java
// Spring Boot Actuator 헬스 체크 엔드포인트
// GET /actuator/health → {"status": "UP"} 또는 {"status": "DOWN"}

// 커스텀 헬스 인디케이터 (DB 연결, 외부 서비스 상태 포함)
@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    private final DataSource dataSource;

    @Override
    public Health health() {
        try {
            // DB 연결 확인
            dataSource.getConnection().isValid(1);
            return Health.up()
                .withDetail("database", "PostgreSQL")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

---

## SSL 종료 (SSL Termination)

```
SSL Termination 구조:
클라이언트 ←HTTPS(암호화)→ 로드밸런서 ←HTTP(평문)→ 서버들

장점:
— 서버에서 TLS 암복호화 부하 제거
— 인증서 관리를 한 곳에서 (갱신이 쉬움)
— 서버 간 통신은 내부 네트워크라 HTTP로 충분
— 로드밸런서에서 SSL 하드웨어 가속 활용 가능

고려사항:
— 내부 통신도 암호화 필요하면 SSL Passthrough 사용
  (로드밸런서가 암호화 내용을 그대로 전달)
— X-Forwarded-Proto: https 헤더로 원본 프로토콜 전달
  (서버가 클라이언트가 HTTPS로 왔음을 알 수 있음)
```

```java
// Spring Boot에서 HTTPS 리다이렉트 처리
// (로드밸런서가 SSL 종료한 경우)

// application.yml
// server:
//   forward-headers-strategy: framework  # X-Forwarded-* 헤더 신뢰

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 프록시 뒤에 있으므로 X-Forwarded-Proto 헤더 신뢰
            .requiresChannel(channel -> channel
                .requestMatchers(r -> r.getHeader("X-Forwarded-Proto") != null)
                .requiresSecure()
            );
        return http.build();
    }
}
```

---

## Rate Limiting (속도 제한)

로드밸런서에서 과도한 요청을 차단한다. 특정 IP가 API를 남용하거나 DDoS 공격을 막는다.

```nginx
http {
    # 속도 제한 영역 정의
    # $binary_remote_addr: IP별로 제한
    # zone=api_limit:10m: 10MB 메모리 사용 (약 16만 IP 저장 가능)
    # rate=10r/s: 초당 10요청 허용
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    # JWT 토큰(사용자)별 제한 (분당 100요청)
    limit_req_zone $http_authorization zone=user_limit:10m rate=100r/m;

    server {
        location /api/ {
            # burst=20: 순간 최대 20요청 허용 (초과분 대기)
            # nodelay: 대기 없이 즉시 거부
            limit_req zone=api_limit burst=20 nodelay;
            limit_req_status 429;               # 초과 시 429 Too Many Requests

            proxy_pass http://api_servers;
        }

        location /api/auth/ {
            # 로그인 시도 엄격히 제한 (브루트포스 방어)
            limit_req zone=api_limit burst=5 nodelay;
            limit_req_status 429;
            proxy_pass http://api_servers;
        }
    }
}
```

---

## 실무 아키텍처 패턴

```
일반적인 웹 서비스 아키텍처:

인터넷
    │
    ↓
[CloudFront / CDN]          ← 정적 파일, 엣지 캐싱
    │
    ↓
[AWS ALB — L7 로드밸런서]   ← SSL 종료, 경로 기반 라우팅
    ├── /api/*  → [ECS/EC2 앱 서버 그룹 (3대)]
    ├── /ws     → [WebSocket 서버 그룹 (2대)]
    └── /*      → [S3 정적 파일]

앱 서버 내부:
    ↓
[Nginx (리버스 프록시)]     ← Rate Limiting, 로그
    ↓
[Spring Boot :8080]         ← 비즈니스 로직
    ├── [RDS PostgreSQL (Primary + Replica)]
    ├── [ElastiCache Redis]
    └── [Elasticsearch]

모니터링:
    ↓
[CloudWatch / Datadog]      ← 로드밸런서 메트릭, 서버 메트릭
```

---

## 흔한 실수와 주의사항

```
실수 1: 헬스 체크 엔드포인트를 무겁게 구현
❌ 헬스 체크 시 DB 연결 + 외부 API 호출
✅ 빠른 응답 (100ms 이내), 기본적인 상태만 확인

실수 2: X-Forwarded-For 신뢰 설정 누락
— 로드밸런서 뒤에서 getRemoteAddr() 호출 시
  항상 로드밸런서 IP가 나옴
— X-Forwarded-For 헤더에서 실제 클라이언트 IP 추출
— Spring: server.forward-headers-strategy=framework

실수 3: 세션을 서버 로컬에 저장
❌ HttpSession (단일 서버에만 유효)
✅ Redis에 세션 저장 (spring-session-data-redis)
   또는 JWT 사용 (Stateless)

실수 4: 로드밸런서 없이 단일 서버 운영
— 서버 하나가 죽으면 서비스 전체 중단
— 최소 2대 이상 + 로드밸런서 구성 권장

실수 5: 스티키 세션에 과의존
— Sticky Session: 같은 사용자 → 항상 같은 서버
— 서버 재시작 시 세션 유실
— Redis 세션이 더 안전
```
