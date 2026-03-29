---
title: "Network 면접 예상 질문"
order: 11
---

# Network / HTTP 면접 예상 질문

네트워크 및 HTTP 면접에서 빈출되는 핵심 질문들입니다.

## Q1. TCP 3-way handshake를 설명해주세요

TCP 연결을 맺는 과정으로, 신뢰성 있는 통신 채널을 수립합니다.

```
Client                    Server
  |  ── SYN ──────────►  |   1. 연결 요청 (SYN)
  |  ◄── SYN+ACK ──────  |   2. 요청 수락 + 연결 요청 (SYN+ACK)
  |  ── ACK ──────────►  |   3. 수락 확인 (ACK)
  |     연결 수립!         |
```

**4-way handshake (연결 종료):**
```
FIN → ACK → FIN → ACK
```

**TCP vs UDP:**
| TCP | UDP |
|-----|-----|
| 연결 지향 | 비연결 |
| 순서 보장, 재전송 | 순서/재전송 없음 |
| 느림 | 빠름 |
| HTTP, 이메일 | 스트리밍, DNS, 게임 |

---

## Q2. HTTP와 HTTPS의 차이는?

**HTTP:** 평문 전송 → 도청 가능

**HTTPS:** HTTP + **TLS/SSL** 암호화

**TLS Handshake 과정:**
```
1. Client Hello — 지원하는 암호화 목록 전송
2. Server Hello — 사용할 암호화 방식 선택 + 인증서 전송
3. 인증서 검증 — CA(Certificate Authority)로 서명 확인
4. 세션 키 교환 — 대칭 키 암호화로 실제 데이터 암호화
5. 암호화 통신 시작
```

**HTTPS 이점:**
- 도청 방지 (암호화)
- 위변조 방지 (무결성)
- 서버 신원 확인 (인증)
- SEO 점수 향상

---

## Q3. HTTP/1.1, HTTP/2, HTTP/3의 차이를 설명해주세요

**HTTP/1.1:**
- HOL(Head-of-Line) Blocking 문제 — 앞 요청이 지연되면 뒤 요청도 대기
- 요청마다 TCP 연결 (Keep-Alive로 재사용)

**HTTP/2:**
- **멀티플렉싱** — 하나의 TCP 연결로 여러 요청/응답 동시 처리
- **헤더 압축** (HPACK)
- **서버 푸시** — 클라이언트 요청 전에 리소스 선제 전송
- ❌ TCP 레벨 HOL Blocking은 여전히 존재

**HTTP/3:**
- TCP 대신 **QUIC (UDP 기반)** 사용
- 연결 수립 속도 향상 (0-RTT)
- 패킷 손실 시에도 다른 스트림에 영향 없음

---

## Q4. REST API 설계 원칙을 설명해주세요

**REST 6가지 제약 조건:**
1. **클라이언트-서버 분리**
2. **무상태(Stateless)** — 각 요청은 독립적
3. **캐시 가능** — 응답에 캐시 가능 여부 명시
4. **계층화 시스템** — 클라이언트는 중간 서버 존재를 몰라도 됨
5. **Code on Demand** (선택)
6. **균일한 인터페이스**

**RESTful URI 설계:**
```
✅ GET    /users          — 목록 조회
✅ GET    /users/1        — 단건 조회
✅ POST   /users          — 생성
✅ PUT    /users/1        — 전체 수정
✅ PATCH  /users/1        — 부분 수정
✅ DELETE /users/1        — 삭제

❌ GET    /getUser        — 동사 사용 금지
❌ POST   /users/delete/1 — 행위를 URI에 포함
```

---

## Q5. DNS 동작 과정을 설명해주세요

도메인 이름을 IP 주소로 변환하는 과정입니다.

```
1. 브라우저 캐시 확인
2. OS 캐시 확인 (/etc/hosts)
3. Local DNS 서버 (ISP 제공) 조회
4. Local DNS 캐시 없으면 → Root DNS 서버 질의
5. Root → TLD(.com) DNS 서버 → 권한 DNS 서버
6. 권한 DNS → IP 주소 반환
7. Local DNS 캐시 저장 후 클라이언트 응답
```

**DNS 레코드 타입:**
| 타입 | 용도 |
|-----|------|
| A | 도메인 → IPv4 |
| AAAA | 도메인 → IPv6 |
| CNAME | 도메인 별칭 |
| MX | 메일 서버 |
| TXT | 검증 정보 |

---

## Q6. 쿠키, 세션, JWT의 차이와 장단점은?

**쿠키:**
- 브라우저에 저장, HTTP 요청마다 자동 전송
- `HttpOnly`(JS 접근 금지), `Secure`(HTTPS만), `SameSite`(CSRF 방지) 옵션 중요

**세션:**
- 서버 메모리/DB에 상태 저장, 쿠키에 세션 ID만 전달
- ✅ 서버에서 즉시 무효화 가능
- ❌ 서버 확장(스케일아웃) 시 세션 공유 문제

**JWT:**
- 서버가 상태 저장 안 함 (Stateless)
- ✅ 마이크로서비스, 서버 확장에 유리
- ❌ 토큰 탈취 시 만료 전까지 무효화 어려움
- Access Token(단기) + Refresh Token(장기)로 보완

---

## Q7. CORS란 무엇이고 어떻게 해결하나요?

**CORS(Cross-Origin Resource Sharing):** 브라우저가 보안을 위해 **다른 출처(origin) 간 요청을 기본 차단**하는 정책입니다.

출처 = `프로토콜 + 도메인 + 포트`

```
frontend: https://example.com
backend:  https://api.example.com  ← 서브도메인도 다른 출처!
```

**해결 방법:**

```java
// Spring Boot — 서버에서 허용 헤더 추가
@CrossOrigin(origins = "https://example.com")
@GetMapping("/api/data")
public Data getData() { ... }

// 또는 전역 설정
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("https://example.com")
            .allowedMethods("GET", "POST", "PUT", "DELETE");
    }
}
```

---

## Q8. 로드밸런서의 동작 방식과 알고리즘을 설명해주세요

**L4 vs L7 로드밸런서:**

| 비교 | L4 (Transport) | L7 (Application) |
|-----|---------------|-----------------|
| 기준 | IP + Port | HTTP 헤더, URL, 쿠키 |
| 속도 | 빠름 | 상대적으로 느림 |
| 기능 | 단순 분산 | URL 기반 라우팅, 콘텐츠 기반 분산 |

**분산 알고리즘:**
- **Round Robin:** 순서대로 돌아가며 분산
- **Least Connection:** 현재 연결 수가 가장 적은 서버로
- **IP Hash:** 클라이언트 IP 기반 → 세션 일관성 보장
- **Weighted:** 서버 성능 비율에 따라 분산
