---
title: "HTTP/2와 HTTP/3"
order: 6
---

# HTTP/2와 HTTP/3

HTTP/1.1은 1997년에 만들어진 프로토콜이다. 웹이 단순한 문서 공유에서 복잡한 애플리케이션으로 발전하면서 HTTP/1.1의 한계가 드러났다. HTTP/2와 HTTP/3은 이 한계를 극복하기 위해 만들어졌다.

---

## HTTP/1.1의 문제점

```
문제 1: HOL (Head-of-Line) Blocking
— 브라우저는 도메인당 동시 연결을 6개로 제한
— 6개 요청을 보내고 나면 이전 응답을 기다려야 함
— 앞 요청이 느리면(이미지 파일 등) 뒤 요청이 대기
— 결과적으로 페이지 로드가 느려짐

문제 2: 중복 헤더 전송
— 매 요청마다 같은 헤더를 반복 전송
— Cookie, User-Agent, Authorization 등이 매번 포함
— 헤더만 수백 바이트, 실제 데이터보다 헤더가 클 수도 있음

문제 3: 텍스트 기반 프로토콜
— 사람이 읽기 쉽지만 파싱 비용이 높음
— 바이너리보다 크기가 큼

해결책으로 나온 임시방편들:
— 도메인 샤딩: static1.example.com, static2.example.com으로 연결 수 늘리기
— 스프라이트: 여러 아이콘을 하나의 이미지로 묶기
— 인라인 리소스: CSS/JS를 HTML에 직접 삽입
→ HTTP/2 이후에는 이런 최적화 기법이 불필요해짐
```

---

## HTTP/2 — 2015년 표준화

HTTP/2는 구글의 SPDY 프로토콜을 기반으로 만들어졌다. 현재 웹의 주류 프로토콜이다.

```
핵심 개념: 하나의 TCP 연결에서 여러 요청을 동시에 처리

주요 특징:

1. 멀티플렉싱 (Multiplexing) ← 가장 중요
   — 하나의 TCP 연결에서 여러 요청/응답을 동시에 처리
   — "스트림"이라는 가상 채널로 구분
   — 순서와 관계없이 병렬 처리
   → HTTP/1.1의 HOL Blocking 해결 (TCP 레벨은 여전히 존재)

2. 헤더 압축 (HPACK)
   — 반복되는 헤더를 인덱스 번호로 전송
   — 이미 보낸 헤더는 다시 보내지 않음
   — 헤더 크기 85% 감소 효과

3. 바이너리 프레이밍
   — 텍스트 대신 바이너리로 통신
   — 파싱 효율 향상, 크기 감소

4. 서버 푸시 (Server Push)
   — HTML 요청 시 CSS/JS를 미리 전송
   — 클라이언트가 요청하기 전에 서버가 예측해서 보냄
   — 실제로는 잘 안 씀 (구현 복잡, 효과 제한적)

5. 스트림 우선순위
   — 중요한 리소스를 먼저 처리
```

---

## HTTP/1.1 vs HTTP/2 통신 비교

```
HTTP/1.1 (순차 처리):
GET /style.css  ——→
                ←—— CSS 응답 (300ms)
GET /script.js  ——→                  (앞 요청 끝나야 다음 가능)
                ←—— JS 응답 (200ms)
GET /image.png  ——→
                ←—— 이미지 응답 (500ms)
총 시간: 300 + 200 + 500 = 1000ms

HTTP/2 (병렬 처리):
GET /style.css  ——→ (스트림 1)
GET /script.js  ——→ (스트림 3) ← 동시 전송!
GET /image.png  ——→ (스트림 5)
                ←—— JS 응답 (스트림 3, 200ms)
                ←—— CSS 응답 (스트림 1, 300ms)
                ←—— 이미지 응답 (스트림 5, 500ms)
총 시간: max(300, 200, 500) = 500ms ← 절반!
```

---

## HTTP/2 설정

```nginx
# Nginx에서 HTTP/2 활성화
server {
    listen 443 ssl http2;  # 'http2' 추가만 하면 됨
    # HTTPS가 있어야 HTTP/2 사용 가능 (실질적으로)
}
```

```yaml
# Spring Boot에서 HTTP/2 활성화
server:
  http2:
    enabled: true    # HTTP/2 활성화
  ssl:
    enabled: true    # HTTPS 필요
```

---

## HTTP/3 — 2022년 표준화

HTTP/2를 써도 TCP 레벨 HOL Blocking은 여전히 존재한다. HTTP/3는 이를 근본적으로 해결하기 위해 TCP 대신 QUIC 프로토콜을 사용한다.

```
HTTP/2의 남은 문제:
TCP 기반이라 TCP 레벨 HOL Blocking 존재
패킷 하나가 손실되면 모든 스트림이 대기
Wi-Fi ↔ LTE 전환 시 연결 재수립 필요 (IP 변경)

HTTP/3 해결책:
UDP 기반의 QUIC 프로토콜 사용

— 각 스트림이 독립적: 패킷 손실이 해당 스트림에만 영향
— Connection ID: IP 바뀌어도 연결 유지 (모바일 핸드오버)
— 0-RTT 재연결: 이전 연결 정보 저장해서 재연결 빠름
— TLS 1.3 내장: 별도 TLS 핸드셰이크 없이 연결과 동시에 암호화
```

```
QUIC 특징:
— UDP 기반이지만 신뢰성을 QUIC 레이어에서 직접 구현
— TLS 1.3이 기본 내장 (HTTP/2처럼 별도 계층이 아님)
— 연결 설정이 1 RTT (TLS 포함, HTTP/2는 TCP + TLS = 2~3 RTT)
— 0-RTT 가능 (이전 연결 세션 키 재사용)
```

---

## 버전별 비교

| 항목 | HTTP/1.1 | HTTP/2 | HTTP/3 |
|------|----------|--------|--------|
| 전송 계층 | TCP | TCP | QUIC(UDP) |
| 멀티플렉싱 | 제한적 (6개) | 무제한 | 무제한 |
| 헤더 압축 | 없음 | HPACK | QPACK |
| HOL Blocking | HTTP+TCP | TCP만 | 없음 |
| 0-RTT 재연결 | 없음 | 없음 | 지원 |
| 이동성 | 없음 | 없음 | Connection ID |
| 암호화 | 선택적 | 실질적 필수 | 항상 (내장) |

---

## 현재 지원 현황 확인 방법

```bash
# curl로 HTTP 버전 확인
curl -I --http2 https://example.com        # HTTP/2로 강제 연결
curl -I --http3 https://example.com        # HTTP/3로 강제 연결

# 응답 첫 줄에서 확인
# HTTP/2 200
# HTTP/3 200

# alt-svc 헤더로 HTTP/3 지원 여부 확인
curl -sI https://example.com | grep -i "alt-svc"
# alt-svc: h3=":443"; ma=86400  ← HTTP/3 지원한다는 신호

# 서버에서 지원 버전 확인
curl -sI https://www.google.com | head -20
```

---

## 실무에서 어떻게 활용하나?

```
HTTP/2 도입 시:
✅ 리소스가 많은 페이지에서 성능 향상 (SPA 웹앱)
✅ 도메인 샤딩, CSS 스프라이트 등 불필요해짐
✅ Nginx/ALB에서 설정 몇 줄이면 활성화
⚠️  HTTPS 필요 (실질적으로)
⚠️  서버 푸시는 신중하게 (오히려 느려질 수 있음)

HTTP/3 도입 시:
✅ 모바일 사용자, 불안정한 네트워크에서 효과적
✅ CDN에서 쉽게 활성화 (CloudFront, Cloudflare)
✅ 추가 코드 변경 없음 (하위 호환)
⚠️  UDP를 차단하는 기업 방화벽 환경 주의
⚠️  일부 오래된 프록시 서버에서 문제 가능

현실적인 선택:
1순위: CloudFront 또는 Cloudflare 앞에 두기
       → HTTP/3 자동 지원, 설정 필요 없음

2순위: AWS ALB 사용
       → HTTP/2 기본 지원

3순위: Nginx에서 직접 설정
       → HTTP/2는 바로 가능
       → HTTP/3는 별도 컴파일 필요 (nginx-quic)
```

---

## Spring Boot 환경에서 HTTP/2 제대로 쓰기

```yaml
# application.yml
server:
  port: 8443
  http2:
    enabled: true      # HTTP/2 활성화
  ssl:
    enabled: true
    key-store: classpath:keystore.p12
    key-store-password: ${KEYSTORE_PASSWORD}
    key-store-type: PKCS12

# 참고: ALB 뒤에 있을 때는 Spring Boot에서 HTTP/2 설정 불필요
# ALB ←HTTPS/H2→ 클라이언트
# ALB ←HTTP→ Spring Boot (내부 통신)
```

---

## 자주 하는 실수

```
실수 1: HTTP/2가 알아서 빠를 거라 기대
→ HTTP/2는 네트워크 레이턴시 문제를 해결하지 않음.
→ 서버 응답 자체가 느리면 HTTP/2도 느림.
→ 가장 중요한 건 서버 로직과 DB 쿼리 최적화.

실수 2: HTTP/1.1 최적화 기법을 HTTP/2에서도 유지
→ 도메인 샤딩: HTTP/2에서 오히려 성능 저하 (연결 분산)
→ 파일 번들링: 작은 파일 여러 개가 HTTP/2에서 더 효율적
→ 인라인 CSS/JS: 캐싱 불가 → HTTP/2에서는 별도 파일이 낫다

실수 3: HTTP/3가 항상 빠르다고 생각
→ 안정적인 유선 네트워크에서는 HTTP/2와 차이 거의 없음
→ 모바일, 불안정한 Wi-Fi 환경에서 효과적

실수 4: HTTP/2 설정하면서 HTTPS 안 챙기기
→ HTTP/2는 기술적으로 평문(h2c)도 가능하지만 브라우저가 지원 안 함
→ 현실에서는 HTTPS가 없으면 HTTP/2 사용 불가
```
