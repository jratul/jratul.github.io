---
title: "브라우저에 URL을 입력했을 때의 처리 과정"
date: "2026-01-14"
tags: ["browser", "network", "dns", "http", "frontend"]
excerpt: "브라우저 주소창에 URL을 입력하고 엔터를 눌렀을 때 페이지가 표시되기까지의 전체 과정을 알아봅니다."
---

# 브라우저에 URL을 입력했을 때의 처리 과정

브라우저 주소창에 URL을 입력하고 엔터를 눌렀을 때 페이지가 표시되기까지의 전체 과정을 알아봅니다.

## 전체 흐름

```
1. URL 입력 및 파싱
2. HSTS 확인
3. DNS 조회
4. TCP 연결 (3-way Handshake)
5. TLS 핸드셰이크 (HTTPS)
6. HTTP 요청 전송
7. 서버 처리 및 응답
8. 브라우저 렌더링
   - DOM 생성
   - CSSOM 생성
   - Render Tree 생성
   - Layout
   - Paint
   - Composite
```

---

## 1. URL 입력 및 파싱

### URL 구조

```
https://www.example.com:443/path/to/page?key=value#section

프로토콜: https
호스트: www.example.com
포트: 443 (생략 가능, HTTPS 기본값)
경로: /path/to/page
쿼리 스트링: ?key=value
프래그먼트: #section
```

---

### URL 파싱

```javascript
const url = new URL('https://www.example.com:443/path?key=value#section');

console.log(url.protocol);  // 'https:'
console.log(url.hostname);  // 'www.example.com'
console.log(url.port);      // '443'
console.log(url.pathname);  // '/path'
console.log(url.search);    // '?key=value'
console.log(url.hash);      // '#section'
```

---

### 자동 완성 및 검색

```
입력: "examp"
  ↓
브라우저 확인:
1. 북마크
2. 히스토리
3. 자동 완성 제안

입력: "javascript tutorial"
  ↓
검색 엔진 쿼리:
https://www.google.com/search?q=javascript+tutorial
```

---

## 2. HSTS 확인

**HSTS (HTTP Strict Transport Security)**: HTTPS 강제 사용

```
브라우저 확인:
1. HSTS 프리로드 리스트에 있는가?
2. 이전에 HSTS 헤더를 받았는가?

→ 있으면: http:// → https://로 자동 변경
→ 없으면: 입력한 프로토콜 그대로 사용
```

**HSTS 헤더 예시:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 3. DNS 조회

**DNS (Domain Name System)**: 도메인 이름을 IP 주소로 변환

### DNS 조회 과정

```
www.example.com → 93.184.216.34

1. 브라우저 캐시 확인
   └─ 없음
2. 운영체제 캐시 확인 (hosts 파일)
   └─ 없음
3. 라우터 캐시 확인
   └─ 없음
4. ISP DNS 서버 확인
   └─ 없음
5. 재귀적 DNS 조회 시작
```

---

### 재귀적 DNS 조회

```
ISP DNS 서버 (Recursive Resolver)
  ↓ 1. 루트 네임서버에 요청
Root DNS Server (.com 담당 서버 알려줌)
  ↓ 2. TLD 네임서버에 요청
TLD DNS Server (.com, example.com 담당 서버 알려줌)
  ↓ 3. Authoritative 네임서버에 요청
Authoritative DNS Server (최종 IP 주소 반환)
  ↓ 4. IP 주소 반환
ISP DNS 서버 (캐시 저장)
  ↓ 5. 브라우저에 IP 주소 전달
브라우저 (캐시 저장)
```

---

### DNS 캐시

```
브라우저 캐시:   60초
OS 캐시:        수 분
라우터 캐시:    수 분
ISP DNS 캐시:   TTL (Time To Live) 값에 따라

예시:
example.com. 3600 IN A 93.184.216.34
            ↑
            TTL (3600초 = 1시간)
```

---

### DNS 조회 확인

```bash
# Windows
nslookup example.com

# Linux/Mac
dig example.com

# 응답 예시
example.com.  3600  IN  A  93.184.216.34
```

---

## 4. TCP 연결 (3-way Handshake)

**TCP (Transmission Control Protocol)**: 신뢰성 있는 연결 지향 프로토콜

### 3-way Handshake

```
클라이언트                    서버
   │                           │
   │── SYN (seq=100) ─────────→│  1. 연결 요청
   │                           │
   │←─ SYN-ACK (seq=200, ack=101) ─│  2. 연결 수락
   │                           │
   │── ACK (seq=101, ack=201) →│  3. 연결 확인
   │                           │
   │      연결 수립 완료!         │
```

**설명:**
- **SYN**: 연결 시작 (Synchronize)
- **ACK**: 확인 응답 (Acknowledgment)
- **seq**: 시퀀스 번호
- **ack**: 확인 번호

---

### 연결 종료 (4-way Handshake)

```
클라이언트                    서버
   │                           │
   │── FIN ──────────────────→│  1. 연결 종료 요청
   │                           │
   │←─ ACK ──────────────────│  2. 종료 확인
   │                           │
   │←─ FIN ──────────────────│  3. 서버도 종료
   │                           │
   │── ACK ──────────────────→│  4. 최종 확인
   │                           │
   │      연결 종료 완료!         │
```

---

## 5. TLS 핸드셰이크 (HTTPS)

**TLS (Transport Layer Security)**: 암호화된 통신

### TLS 핸드셰이크 과정

```
클라이언트                    서버
   │                           │
   │── Client Hello ─────────→│  1. 지원 암호화 방식 전달
   │                           │
   │←─ Server Hello ─────────│  2. 암호화 방식 선택
   │←─ Certificate ──────────│  3. 서버 인증서 전달
   │←─ Server Hello Done ────│
   │                           │
   │── Client Key Exchange ──→│  4. 세션 키 생성 정보
   │── Change Cipher Spec ───→│
   │── Finished ─────────────→│
   │                           │
   │←─ Change Cipher Spec ───│  5. 암호화 통신 시작
   │←─ Finished ─────────────│
   │                           │
   │   암호화 통신 시작!          │
```

---

### 인증서 검증

```
1. 인증서 유효기간 확인
2. 인증서가 신뢰할 수 있는 CA에서 발급되었는지 확인
3. 인증서가 해당 도메인에 유효한지 확인
4. 인증서가 취소되지 않았는지 확인 (CRL/OCSP)

✅ 모두 통과 → 안전한 연결 (자물쇠 아이콘)
❌ 실패 → 경고 메시지 (주의 필요)
```

---

### HTTP vs HTTPS

```
HTTP (포트 80):
- 평문 통신
- 도청 가능
- 중간자 공격 가능

HTTPS (포트 443):
- 암호화 통신
- 기밀성 보장
- 무결성 보장
- 인증 보장
```

---

## 6. HTTP 요청 전송

### HTTP 요청 구조

```http
GET /path/to/page HTTP/1.1
Host: www.example.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
Accept: text/html,application/xhtml+xml
Accept-Language: ko-KR,ko;q=0.9,en-US;q=0.8
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
Cookie: session_id=abc123
```

**구성 요소:**
- **요청 라인**: 메서드, 경로, HTTP 버전
- **헤더**: 요청 메타데이터
- **바디**: POST/PUT 요청 시 데이터

---

### HTTP 메서드

```
GET:    리소스 조회
POST:   리소스 생성
PUT:    리소스 전체 수정
PATCH:  리소스 부분 수정
DELETE: 리소스 삭제
HEAD:   GET과 동일하지만 바디 없음
OPTIONS: 서버가 지원하는 메서드 확인
```

---

### HTTP 버전

```
HTTP/1.1:
- 한 번에 하나의 요청/응답
- Keep-Alive로 연결 재사용
- 헤더 압축 없음

HTTP/2:
- 멀티플렉싱 (동시에 여러 요청)
- 헤더 압축 (HPACK)
- 서버 푸시
- 바이너리 프로토콜

HTTP/3:
- QUIC 프로토콜 (UDP 기반)
- 더 빠른 연결
- 패킷 손실에 강함
```

---

## 7. 서버 처리 및 응답

### 서버 처리 흐름

```
1. 웹 서버 (Nginx, Apache)
   ↓ 정적 파일? → 바로 응답
   ↓ 동적 요청? → 애플리케이션 서버로 전달
2. 애플리케이션 서버 (Node.js, Spring Boot)
   ↓ 라우팅
   ↓ 컨트롤러 실행
   ↓ 비즈니스 로직 처리
   ↓ 데이터베이스 조회
3. 응답 생성
   ↓ HTML, JSON 등
4. 클라이언트로 전송
```

---

### HTTP 응답 구조

```http
HTTP/1.1 200 OK
Date: Mon, 14 Jan 2026 10:00:00 GMT
Server: nginx/1.20.1
Content-Type: text/html; charset=UTF-8
Content-Length: 1234
Content-Encoding: gzip
Cache-Control: max-age=3600
Set-Cookie: session_id=xyz789; HttpOnly; Secure
Connection: keep-alive

<!DOCTYPE html>
<html>
  <head>
    <title>Example</title>
  </head>
  <body>
    <h1>Hello World</h1>
  </body>
</html>
```

---

### HTTP 상태 코드

```
1xx: 정보 응답
  100 Continue

2xx: 성공
  200 OK
  201 Created
  204 No Content

3xx: 리다이렉션
  301 Moved Permanently (영구 이동)
  302 Found (임시 이동)
  304 Not Modified (캐시 사용)

4xx: 클라이언트 오류
  400 Bad Request
  401 Unauthorized (인증 필요)
  403 Forbidden (권한 없음)
  404 Not Found
  429 Too Many Requests

5xx: 서버 오류
  500 Internal Server Error
  502 Bad Gateway
  503 Service Unavailable
  504 Gateway Timeout
```

---

## 8. 브라우저 렌더링

### 렌더링 파이프라인

```
1. HTML 파싱 → DOM Tree
2. CSS 파싱 → CSSOM Tree
3. DOM + CSSOM → Render Tree
4. Layout (Reflow): 위치/크기 계산
5. Paint: 픽셀 단위로 그리기
6. Composite: 레이어 합성
```

---

### HTML 파싱 중 추가 리소스 로드

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="style.css">  <!-- CSS 로드 (렌더링 차단) -->
    <script src="header.js"></script>         <!-- JS 로드 (파싱 차단) -->
  </head>
  <body>
    <img src="image.jpg">                     <!-- 이미지 로드 (비동기) -->
    <script src="app.js" defer></script>      <!-- JS 로드 (지연) -->
  </body>
</html>
```

**추가 요청:**
```
GET /style.css
GET /header.js
GET /image.jpg
GET /app.js
```

---

### 리소스 우선순위

```
1. HTML (가장 높음)
2. CSS (렌더링 차단 리소스)
3. JavaScript (파싱 차단 리소스)
4. 폰트
5. 이미지 (뷰포트 내)
6. 이미지 (뷰포트 외)
```

---

## 캐시 활용

### 브라우저 캐시

```http
# 서버 응답
Cache-Control: max-age=3600
ETag: "abc123"
Last-Modified: Mon, 14 Jan 2026 10:00:00 GMT

# 다음 요청 시 (캐시 검증)
If-None-Match: "abc123"
If-Modified-Since: Mon, 14 Jan 2026 10:00:00 GMT

# 서버 응답 (변경 없음)
304 Not Modified
```

---

### 캐시 전략

```
Cache-Control: no-store
→ 캐시 안 함 (민감한 정보)

Cache-Control: no-cache
→ 매번 서버에 검증 (최신 데이터 필요)

Cache-Control: max-age=3600
→ 3600초 동안 캐시 사용

Cache-Control: public, max-age=31536000, immutable
→ 1년 동안 캐시 (변경 없는 리소스)
```

---

## 성능 최적화

### 1. DNS 프리페칭

```html
<link rel="dns-prefetch" href="https://api.example.com">
```

**효과:** DNS 조회를 미리 수행

---

### 2. 프리커넥트

```html
<link rel="preconnect" href="https://api.example.com">
```

**효과:** DNS 조회 + TCP 연결 + TLS 핸드셰이크 미리 수행

---

### 3. 프리로드

```html
<link rel="preload" href="/style.css" as="style">
<link rel="preload" href="/font.woff2" as="font" crossorigin>
```

**효과:** 중요한 리소스를 우선 로드

---

### 4. HTTP/2 서버 푸시

```
서버: "HTML 요청을 받았으니 CSS와 JS도 필요할 거야"
     → CSS, JS를 미리 푸시
```

---

### 5. CDN 사용

```
사용자 (서울) → CDN 서버 (서울)   ✅ 빠름 (10ms)
사용자 (서울) → 오리진 서버 (미국) ❌ 느림 (200ms)
```

---

## 실전 타임라인 예시

```
0ms:    사용자가 URL 입력 및 엔터
10ms:   DNS 조회 (캐시 히트)
30ms:   TCP 3-way Handshake
80ms:   TLS 핸드셰이크
100ms:  HTTP 요청 전송
200ms:  서버 응답 도착 (TTFB)
210ms:  HTML 파싱 시작
220ms:  CSS 요청 (병렬)
230ms:  JS 요청 (병렬)
240ms:  이미지 요청 (병렬)
350ms:  CSS 로드 완료
400ms:  JS 로드 및 실행 완료
500ms:  이미지 로드 완료
550ms:  첫 화면 렌더링 완료 (FCP)
800ms:  모든 리소스 로드 완료 (Load Event)
1000ms: JavaScript 실행 완료 (TTI)
```

---

## 네트워크 도구로 확인

### Chrome DevTools

```
F12 → Network 탭
- Waterfall: 타임라인 시각화
- Timing: 각 단계별 시간
  - Queueing: 대기 시간
  - Stalled: 지연 시간
  - DNS Lookup: DNS 조회
  - Initial Connection: TCP 연결
  - SSL: TLS 핸드셰이크
  - Request Sent: 요청 전송
  - Waiting (TTFB): 첫 바이트까지 대기
  - Content Download: 다운로드
```

---

### curl로 확인

```bash
# DNS 조회부터 다운로드까지 시간 측정
curl -w "\
DNS Lookup:     %{time_namelookup}s\n\
TCP Connect:    %{time_connect}s\n\
TLS Handshake:  %{time_appconnect}s\n\
TTFB:           %{time_starttransfer}s\n\
Total:          %{time_total}s\n" \
-o /dev/null -s https://www.example.com
```

---

## 요약

```
1. URL 입력 및 파싱
   - 프로토콜, 호스트, 경로 분리
   - HSTS 확인 (HTTP → HTTPS 전환)

2. DNS 조회
   - 도메인 → IP 주소 변환
   - 캐시 활용 (브라우저 → OS → 라우터 → ISP)
   - 재귀적 DNS 조회 (루트 → TLD → Authoritative)

3. TCP 연결
   - 3-way Handshake (SYN → SYN-ACK → ACK)

4. TLS 핸드셰이크 (HTTPS)
   - 암호화 방식 협상
   - 인증서 검증
   - 세션 키 생성

5. HTTP 요청/응답
   - 요청: 메서드, 헤더, 바디
   - 응답: 상태 코드, 헤더, 바디

6. 브라우저 렌더링
   - HTML/CSS 파싱
   - Render Tree → Layout → Paint → Composite

7. 최적화
   - DNS 프리페칭, 프리커넥트
   - 캐시 활용
   - CDN 사용
   - HTTP/2, HTTP/3
```

전체 과정은 보통 **100ms ~ 2000ms** 정도 소요되며, 네트워크 상태와 서버 위치에 따라 달라집니다.