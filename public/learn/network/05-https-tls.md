---
title: "HTTPS와 TLS"
order: 5
---

# HTTPS와 TLS

HTTP 위에 TLS(암호화 레이어)를 얹은 것이 HTTPS다. 운영 서버는 무조건 HTTPS.

---

## TLS가 하는 일

```
1. 암호화 (Encryption)
   — 전송 중 데이터를 암호화
   — 중간자 공격(MITM) 방어

2. 인증 (Authentication)
   — 서버가 진짜인지 인증서로 검증
   — "이 서버가 정말 example.com인가?"

3. 무결성 (Integrity)
   — 데이터가 전송 중 변조되지 않았음을 보장
   — MAC(Message Authentication Code)으로 검증
```

---

## TLS 핸드셰이크

```
클라이언트                          서버
    |                               |
    |—— ClientHello ———————————————→|  지원 TLS 버전, 암호 목록, 랜덤값
    |                               |
    |←— ServerHello ————————————————|  선택된 암호, 서버 랜덤값
    |←— Certificate ————————————————|  서버 인증서 (공개키 포함)
    |←— ServerHelloDone ————————————|
    |                               |
    |  [인증서 검증: CA 체인 확인]   |
    |                               |
    |—— ClientKeyExchange ——————————→|  세션키 재료 (공개키로 암호화)
    |—— ChangeCipherSpec ———————————→|  이제부터 암호화
    |—— Finished ——————————————————→|  핸드셰이크 완료 (암호화됨)
    |                               |
    |←— ChangeCipherSpec ————————————|
    |←— Finished ————————————————————|
    |                               |
    |======= 암호화된 HTTP 통신 =====|
```

```
TLS 1.3 (현재 표준):
— 핸드셰이크 1 RTT (1.2는 2 RTT)
— 0-RTT 재연결 지원
— 취약한 암호 알고리즘 제거
```

---

## 인증서 체계 (PKI)

```
인증서 신뢰 체인:
Root CA (최상위, 브라우저에 내장)
  └── Intermediate CA
        └── 서버 인증서 (example.com)

인증서 검증:
1. 서버 인증서의 서명을 Intermediate CA 공개키로 검증
2. Intermediate CA의 서명을 Root CA 공개키로 검증
3. Root CA는 브라우저/OS가 신뢰하는 목록에 있는지 확인
```

---

## 인증서 종류

```
DV (Domain Validation)
— 도메인 소유만 확인
— 빠름, 저렴, Let's Encrypt 무료 제공
— example.com용

OV (Organization Validation)
— 기업 정보 확인
— 비즈니스 사이트에 적합

EV (Extended Validation)
— 엄격한 심사
— 브라우저 주소창에 회사명 표시 (요즘은 별로 안 씀)

와일드카드 인증서:
*.example.com → www, api, admin 등 모든 서브도메인 커버

멀티도메인(SAN):
한 인증서로 여러 도메인 커버
example.com, api.example.com, example.kr
```

---

## Let's Encrypt — 무료 인증서

```bash
# Certbot 설치 (Ubuntu)
sudo apt install certbot python3-certbot-nginx

# Nginx와 연동 (자동 설정)
sudo certbot --nginx -d example.com -d www.example.com

# standalone 방식 (Nginx 일시 중단)
sudo certbot certonly --standalone -d example.com

# 인증서 위치
/etc/letsencrypt/live/example.com/
├── fullchain.pem   # 인증서 + 체인 (nginx 설정에 사용)
├── privkey.pem     # 개인키
├── cert.pem        # 인증서만
└── chain.pem       # 체인만

# 자동 갱신 (Let's Encrypt는 90일 유효)
sudo certbot renew --dry-run      # 테스트
# cron/systemd timer로 자동 실행됨
```

---

## Nginx HTTPS 설정

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;  # HTTP → HTTPS 리다이렉트
}

server {
    listen 443 ssl http2;
    server_name example.com;

    # 인증서
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # 보안 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...;
    ssl_prefer_server_ciphers off;

    # 세션 재사용
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # HSTS — 브라우저가 항상 HTTPS 사용하도록 강제
    add_header Strict-Transport-Security "max-age=63072000" always;

    # OCSP Stapling — 인증서 폐기 확인 속도 개선
    ssl_stapling on;
    ssl_stapling_verify on;

    location / {
        proxy_pass http://localhost:8080;
    }
}
```

---

## Spring Boot HTTPS 설정

```bash
# 개발용 자체 서명 인증서 생성
keytool -genkeypair \
  -alias myapp \
  -keyalg RSA \
  -keysize 2048 \
  -storetype PKCS12 \
  -keystore keystore.p12 \
  -validity 365
```

```yaml
# application.yml
server:
  port: 8443
  ssl:
    key-store: classpath:keystore.p12
    key-store-password: ${SSL_KEY_STORE_PASSWORD}
    key-store-type: PKCS12
    key-alias: myapp
```

---

## 인증서 트러블슈팅

```bash
# 인증서 정보 확인
openssl x509 -in cert.pem -text -noout
openssl x509 -in cert.pem -noout -dates   # 만료일

# 원격 서버 인증서 확인
openssl s_client -connect example.com:443 -showcerts
echo | openssl s_client -connect example.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# 만료 며칠 전인지 확인
openssl x509 -enddate -noout -in cert.pem | \
  sed 's/notAfter=//' | \
  xargs -I{} date -d {} +%s | \
  xargs -I{} expr \( {} - $(date +%s) \) / 86400

# TLS 연결 테스트
curl -v https://example.com 2>&1 | grep -E "SSL|TLS|certificate"

# 특정 TLS 버전만 테스트
curl --tlsv1.3 --tls-max 1.3 https://example.com
```

---

## 보안 헤더

```
Strict-Transport-Security (HSTS)
— 브라우저가 항상 HTTPS 사용
— max-age=63072000; includeSubDomains; preload

Content-Security-Policy (CSP)
— 리소스 로딩 출처 제한 (XSS 방어)

X-Frame-Options: DENY
— iframe 삽입 차단 (클릭재킹 방어)

X-Content-Type-Options: nosniff
— MIME 타입 스니핑 방지

Referrer-Policy: strict-origin-when-cross-origin
— 리퍼러 정보 제한
```
