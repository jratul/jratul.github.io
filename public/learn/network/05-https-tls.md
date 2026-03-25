---
title: "HTTPS와 TLS"
order: 5
---

# HTTPS와 TLS

HTTP는 데이터를 평문으로 전송한다. 중간에 누군가 패킷을 가로채면 비밀번호, 신용카드 번호가 그대로 노출된다. HTTPS는 HTTP에 TLS 암호화를 추가해서 이 문제를 해결한다.

**운영 서버는 무조건 HTTPS다.** HTTP로 운영하면 사용자 데이터가 위험에 노출된다.

---

## TLS가 하는 세 가지 일

```
1. 암호화 (Encryption):
   — 전송 중인 데이터를 암호화
   — 중간자(MITM: Man-In-The-Middle) 공격 방어
   — 가로채도 해독 불가

2. 인증 (Authentication):
   — 서버가 진짜인지 인증서로 검증
   — "내가 접속하는 이 서버가 정말 naver.com인가?"
   — 피싱 사이트 방어

3. 무결성 (Integrity):
   — 데이터가 전송 중 변조되지 않았음을 보장
   — MAC(Message Authentication Code)으로 검증
   — 해커가 데이터를 몰래 수정했다면 탐지 가능
```

---

## TLS 핸드셰이크 — 암호화 협상 과정

브라우저와 서버가 처음 연결할 때 어떤 암호화 방식을 쓸지 협상하는 과정이다.

```
클라이언트                          서버
    |                               |
    |—— ClientHello ————————————————→|  지원 TLS 버전, 암호 알고리즘 목록, 랜덤값
    |                               |
    |←— ServerHello ————————————————|  선택된 암호 알고리즘, 서버 랜덤값
    |←— Certificate ————————————————|  서버 인증서 (공개키 포함)
    |←— ServerHelloDone ————————————|
    |                               |
    |  [인증서 검증: CA 체인 확인]   |  "이 인증서 믿어도 되는가?"
    |                               |
    |—— ClientKeyExchange ——————————→|  세션키 재료 (서버 공개키로 암호화)
    |—— ChangeCipherSpec ———————————→|  "이제부터 암호화해서 통신"
    |—— Finished ——————————————————→|  핸드셰이크 완료 확인 (암호화됨)
    |                               |
    |←— ChangeCipherSpec ————————————|
    |←— Finished ————————————————————|
    |                               |
    |========= 암호화된 HTTP 통신 ===|

TLS 1.3 (현재 표준):
— 핸드셰이크가 1 RTT (TLS 1.2는 2 RTT)
— 0-RTT 재연결 지원 (이전 방문 기억)
— 취약한 암호 알고리즘 제거 (RSA 키 교환 제거)
```

---

## 인증서 체계 — 어떻게 신뢰를 검증하나?

인증서는 "이 서버가 정말 example.com이다"를 보증하는 디지털 문서다. 현실의 공증처럼 제3자(CA)가 보증해준다.

```
인증서 신뢰 체인:
Root CA (최상위 인증 기관)
  └── 브라우저/OS에 내장되어 있음 (DigiCert, Let's Encrypt 등)
      └── Intermediate CA (중간 인증 기관)
            └── 서버 인증서 (example.com)

검증 과정:
1. 서버 인증서의 서명을 Intermediate CA 공개키로 검증
2. Intermediate CA의 서명을 Root CA 공개키로 검증
3. Root CA가 브라우저/OS의 신뢰 목록에 있는지 확인
→ 모두 통과하면 "이 서버는 신뢰할 수 있음"

자체 서명 인증서 (Self-signed):
— CA의 검증 없이 직접 서명
— 브라우저가 "보안 위험" 경고 표시
— 개발 환경에서만 사용. 운영에서는 금지!
```

---

## 인증서 종류

```
DV (Domain Validation):
— 도메인 소유만 확인 (파일 업로드 또는 DNS 레코드로 증명)
— 빠름, 저렴, Let's Encrypt 무료 제공
— 일반 웹사이트, API 서버에 충분
— 예: 이 블로그, 개인 프로젝트

OV (Organization Validation):
— 기업 정보 추가 확인 (회사 실제 존재 여부)
— 기업 웹사이트, 전자상거래에 적합

EV (Extended Validation):
— 가장 엄격한 심사 (회사 방문 심사까지)
— 예전에는 주소창이 녹색으로 표시됐으나 요즘은 거의 안 씀

와일드카드 인증서 (*)  :
— *.example.com → www, api, admin 등 모든 서브도메인에 적용
— 서브도메인이 여러 개일 때 관리 편리

멀티도메인 (SAN):
— 하나의 인증서로 여러 다른 도메인 커버
— example.com, api.example.com, example.kr 모두 포함
```

---

## Let's Encrypt — 무료 SSL 인증서

Let's Encrypt는 90일 유효한 무료 DV 인증서를 자동으로 발급/갱신해준다. 개인 프로젝트부터 실무까지 많이 사용한다.

```bash
# Certbot 설치 (Ubuntu)
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Nginx와 자동 연동 (Nginx 설정까지 자동으로 수정)
sudo certbot --nginx -d example.com -d www.example.com

# standalone 방식 (Nginx를 일시 중단하고 직접 80포트 사용)
sudo certbot certonly --standalone -d example.com

# 발급된 인증서 위치
/etc/letsencrypt/live/example.com/
├── fullchain.pem   # 인증서 + 체인 (Nginx에서 이것 사용)
├── privkey.pem     # 개인키 (절대 공개 금지!)
├── cert.pem        # 인증서만
└── chain.pem       # 체인만

# 자동 갱신 테스트 (실제 갱신 아님)
sudo certbot renew --dry-run

# cron이나 systemd timer로 자동 갱신됨 (보통 자동 설정됨)
# 수동으로 갱신
sudo certbot renew
```

---

## Nginx HTTPS 설정

```nginx
# HTTP → HTTPS 리다이렉트
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS 서버
server {
    listen 443 ssl http2;
    server_name example.com;

    # Let's Encrypt 인증서
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # 보안 설정 (TLS 1.2와 1.3만 허용)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # 세션 재사용 (성능 개선, 핸드셰이크 생략)
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS: 브라우저가 앞으로 항상 HTTPS 사용 (63072000초 = 2년)
    add_header Strict-Transport-Security "max-age=63072000" always;

    # OCSP Stapling: 인증서 폐기 확인을 서버가 미리 해줌 (성능 개선)
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Spring Boot HTTPS 설정 — 개발 환경

```bash
# 개발용 자체 서명 인증서 생성 (프로덕션에서는 사용 금지!)
keytool -genkeypair \
  -alias myapp \
  -keyalg RSA \
  -keysize 2048 \
  -storetype PKCS12 \
  -keystore keystore.p12 \
  -validity 365 \
  -dname "CN=localhost, OU=Dev, O=MyApp, L=Seoul, ST=Seoul, C=KR"
```

```yaml
# application.yml (개발 환경)
server:
  port: 8443
  ssl:
    key-store: classpath:keystore.p12
    key-store-password: ${SSL_KEY_STORE_PASSWORD}
    key-store-type: PKCS12
    key-alias: myapp

# 운영 환경에서는 Nginx/ALB에서 SSL 종료 후
# HTTP로 Spring Boot에 전달하는 방식 권장
# → Spring Boot는 SSL 처리 부담 없음
```

---

## SSL 인증서 트러블슈팅

```bash
# 로컬 인증서 정보 확인
openssl x509 -in cert.pem -text -noout     # 전체 정보
openssl x509 -in cert.pem -noout -dates    # 유효기간만

# 원격 서버 인증서 확인
openssl s_client -connect example.com:443 -showcerts

# 만료 날짜 확인 (간단하게)
echo | openssl s_client -connect example.com:443 2>/dev/null \
  | openssl x509 -noout -dates

# TLS 버전 테스트
curl -v --tlsv1.3 --tls-max 1.3 https://example.com
curl -v --tlsv1.2 --tls-max 1.2 https://example.com

# 인증서 체인 검증
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt cert.pem
```

---

## 보안 응답 헤더

HTTPS 설정 외에도 추가 보안 헤더를 설정하면 더 안전해진다.

```
Strict-Transport-Security (HSTS):
— 브라우저가 이 도메인은 앞으로 항상 HTTPS 사용
— max-age=63072000; includeSubDomains; preload
— 한 번 설정하면 만료 전까지 HTTP로 접근 불가

Content-Security-Policy (CSP):
— 허용된 출처에서만 리소스 로딩
— XSS(Cross-Site Scripting) 공격 방어
— default-src 'self'; script-src 'self' https://cdn.example.com

X-Frame-Options: DENY:
— iframe으로 사이트 삽입 차단
— 클릭재킹(Clickjacking) 공격 방어

X-Content-Type-Options: nosniff:
— MIME 타입 스니핑 방지
— 브라우저가 Content-Type 무시하고 실행하는 것 방어

Referrer-Policy: strict-origin-when-cross-origin:
— 다른 사이트로 이동 시 리퍼러 정보 제한
```

---

## 자주 하는 실수

```
실수 1: 개발 환경 자체 서명 인증서를 운영에 사용
→ 브라우저 경고 표시. 사용자가 불신.
→ Let's Encrypt 무료 인증서 사용.

실수 2: 인증서 만료를 모르고 있다가 서비스 중단
→ Let's Encrypt 자동 갱신 설정 확인.
→ CloudWatch 등으로 만료 30일 전 알림 설정.

실수 3: HTTP와 HTTPS 혼용 (Mixed Content)
→ HTTPS 사이트에서 HTTP 리소스 로딩.
→ 브라우저가 차단하거나 경고 표시.
→ 모든 리소스 URL을 https://로 변경.

실수 4: 내부 통신도 HTTP로 (SSL 종료 후)
→ ALB에서 SSL 종료 후 내부는 HTTP 사용.
→ 이는 일반적으로 OK (내부 VPC는 신뢰할 수 있음).
→ 민감한 데이터는 내부도 HTTPS 고려.

실수 5: HSTS를 성급하게 적용
→ HSTS 적용 후 HTTP로 다운그레이드 불가 (만료 전).
→ 처음에는 max-age를 짧게 (3600) 설정해서 테스트 후 늘리기.
```
