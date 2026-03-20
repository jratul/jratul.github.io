---
title: "HTTP/2와 HTTP/3"
order: 6
---

# HTTP/2와 HTTP/3

HTTP/1.1의 성능 한계를 극복한 현대 HTTP 프로토콜.

---

## HTTP/1.1의 문제점

```
HOL (Head-of-Line) Blocking:
— 요청 6개 동시 전송 한계 (브라우저 per-domain 제한)
— 앞 요청이 느리면 뒤 요청이 대기
— 해결책으로 도메인 샤딩, 리소스 병합, 스프라이트 등 사용

텍스트 기반 헤더:
— 매 요청마다 같은 헤더 반복 전송 (Cookie, User-Agent 등)
— 압축 없음 → 헤더만 수백 바이트
```

---

## HTTP/2

2015년 표준화. 현재 웹의 주류.

```
주요 특징:

1. 멀티플렉싱 (Multiplexing)
   — 하나의 TCP 연결에서 여러 요청/응답 동시 처리
   — 순서 상관없이 병렬 처리
   — HOL blocking 해결 (TCP 레벨은 여전히 존재)

2. 헤더 압축 (HPACK)
   — 반복되는 헤더를 인덱스로 전송
   — 헤더 크기 85% 감소

3. 서버 푸시 (Server Push)
   — 클라이언트 요청 없이 리소스 미리 전송
   — HTML 요청 시 CSS/JS를 미리 전송
   — 실제로는 잘 안 씀 (복잡도 대비 효과 미미)

4. 바이너리 프레이밍
   — 텍스트 대신 바이너리로 통신 (파싱 효율 향상)

5. 스트림 우선순위
   — 중요한 리소스를 먼저 처리
```

```
HTTP/1.1:
GET /style.css  ──→
                ←── CSS 응답 (대기)
GET /script.js  ──→
                ←── JS 응답

HTTP/2:
GET /style.css  ──→  (스트림 1)
GET /script.js  ──→  (스트림 3)   ← 동시 전송
                ←── CSS 응답 (스트림 1)
                ←── JS 응답 (스트림 3)  ← 동시 수신
```

---

## HTTP/2 설정

```nginx
# Nginx — HTTP/2 활성화
server {
    listen 443 ssl http2;  # http2 추가
    ...
}
```

```yaml
# Spring Boot — HTTP/2 활성화 (HTTPS 필요)
server:
  http2:
    enabled: true
  ssl:
    enabled: true
```

---

## HTTP/3

2022년 표준화. QUIC 프로토콜 기반.

```
HTTP/2의 남은 문제:
TCP 기반 → TCP 레벨 HOL blocking
패킷 손실 시 모든 스트림 대기
연결 이동 시 재연결 (모바일 핸드오버)

HTTP/3 해결책:
TCP 대신 QUIC(UDP 기반) 사용
→ 스트림 레벨 독립적 처리
→ 패킷 손실이 해당 스트림에만 영향
→ Connection ID로 IP 변경에도 연결 유지
→ 0-RTT 재연결 지원
```

```
QUIC 특징:
— UDP 기반이지만 신뢰성 직접 구현
— TLS 1.3 기본 내장 (분리 불가)
— 연결 설정이 1 RTT (TLS 포함)
— 0-RTT 가능 (이전 연결 정보 재사용)
```

---

## 버전별 비교

| 항목 | HTTP/1.1 | HTTP/2 | HTTP/3 |
|------|----------|--------|--------|
| 전송 계층 | TCP | TCP | QUIC(UDP) |
| 멀티플렉싱 | 제한적 | 지원 | 지원 |
| 헤더 압축 | 없음 | HPACK | QPACK |
| HOL Blocking | TCP+HTTP | TCP | 없음 |
| 0-RTT | 없음 | 없음 | 지원 |
| 이동성 | 없음 | 없음 | Connection ID |

---

## 확인 방법

```bash
# curl로 HTTP 버전 확인
curl -I --http2 https://example.com
curl -I --http3 https://example.com

# 응답에서 확인
# HTTP/2 200
# HTTP/3 200

# 서버가 지원하는 HTTP 버전 확인
curl -sI https://example.com | grep -i "http\|alt-svc"
# alt-svc: h3=":443"; ma=86400  ← HTTP/3 지원 알림
```

---

## 실무 고려사항

```
HTTP/2 도입 시:
✅ 리소스가 많은 페이지에서 성능 향상
✅ 도메인 샤딩, CSS 스프라이트 등 HTTP/1.1 최적화 기법 제거 가능
⚠️  HTTPS 필수 (실질적으로)
⚠️  서버 푸시는 신중하게 (오히려 느려질 수 있음)

HTTP/3 도입 시:
✅ 모바일 사용자, 불안정한 네트워크에서 특히 효과적
✅ CDN (Cloudflare, AWS CloudFront 등)에서 쉽게 활성화
⚠️  UDP 차단하는 기업 방화벽 환경 주의
⚠️  일부 리버스 프록시 설정 필요

AWS CloudFront → HTTP/3 자동 지원
Cloudflare     → HTTP/3 자동 지원
nginx          → 별도 컴파일 필요 (nginx-quic 브랜치)
```
