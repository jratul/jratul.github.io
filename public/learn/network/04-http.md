---
title: "HTTP/1.1 — 메서드, 상태코드, 헤더"
order: 4
---

# HTTP/1.1

백엔드 개발자가 매일 다루는 프로토콜. 정확히 알아야 API를 제대로 설계할 수 있다.

---

## HTTP 기본 구조

```
요청 (Request):
GET /users/123 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGci...
Content-Type: application/json
Accept: application/json

요청 바디 (POST/PUT 시):
{"name": "John", "email": "john@example.com"}

---

응답 (Response):
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 85
Cache-Control: no-cache

{"id": 123, "name": "John", "email": "john@example.com"}
```

---

## HTTP 메서드

```
GET    — 리소스 조회 (바디 없음, 안전, 멱등)
POST   — 리소스 생성 (안전 아님, 멱등 아님)
PUT    — 리소스 전체 교체 (멱등)
PATCH  — 리소스 부분 수정
DELETE — 리소스 삭제 (멱등)
HEAD   — GET과 동일하나 바디 없음 (헤더만 확인)
OPTIONS — 허용 메서드 확인 (CORS preflight)

안전(Safe): 서버 상태 변경 없음 → GET, HEAD
멱등(Idempotent): 여러 번 호출해도 결과 동일 → GET, PUT, DELETE
```

```
REST API 설계 예시:
GET    /users          → 목록 조회
GET    /users/123      → 단건 조회
POST   /users          → 생성
PUT    /users/123      → 전체 수정
PATCH  /users/123      → 부분 수정
DELETE /users/123      → 삭제

POST   /users/123/activate   → 행위는 동사로 (리소스 아님)
GET    /users?page=1&size=20 → 페이지네이션
GET    /users?name=john      → 검색
```

---

## HTTP 상태 코드

```
1xx — 정보 (거의 안 씀)
100 Continue

2xx — 성공
200 OK              — GET, PUT, PATCH 성공
201 Created         — POST로 생성 성공 (Location 헤더 포함)
204 No Content      — DELETE 성공 (바디 없음)
206 Partial Content — Range 요청 부분 응답

3xx — 리다이렉션
301 Moved Permanently  — 영구 이동 (SEO에 영향)
302 Found              — 임시 이동
304 Not Modified       — 캐시 유효 (ETag/If-None-Match)
307 Temporary Redirect — 임시 이동 (메서드 유지)
308 Permanent Redirect — 영구 이동 (메서드 유지)

4xx — 클라이언트 오류
400 Bad Request        — 잘못된 요청 (파라미터, 형식)
401 Unauthorized       — 인증 필요 (로그인 안 됨)
403 Forbidden          — 인가 실패 (권한 없음)
404 Not Found          — 리소스 없음
405 Method Not Allowed — 허용되지 않은 메서드
409 Conflict           — 충돌 (중복 생성 등)
422 Unprocessable Entity — 유효성 검사 실패
429 Too Many Requests  — 요청 횟수 초과 (Rate Limit)

5xx — 서버 오류
500 Internal Server Error — 서버 내부 오류
502 Bad Gateway           — 업스트림 서버 오류
503 Service Unavailable   — 서비스 불가 (과부하, 점검)
504 Gateway Timeout       — 업스트림 서버 타임아웃
```

---

## HTTP 헤더

```
요청 헤더:
Host            — 대상 서버 호스트명 (필수)
Authorization   — 인증 정보 (Bearer TOKEN, Basic base64)
Content-Type    — 요청 바디 형식
Accept          — 원하는 응답 형식
Accept-Encoding — 지원하는 압축 방식 (gzip, br)
Cookie          — 쿠키
User-Agent      — 클라이언트 정보
If-None-Match   — ETag 캐시 검증
If-Modified-Since — 날짜 기반 캐시 검증
X-Request-ID    — 요청 추적 ID

응답 헤더:
Content-Type    — 응답 바디 형식
Content-Length  — 바디 크기 (바이트)
Content-Encoding — 압축 방식 (gzip)
Cache-Control   — 캐시 정책
ETag            — 리소스 버전 식별자
Location        — 리다이렉션 URL (201, 3xx)
Set-Cookie      — 쿠키 설정
WWW-Authenticate — 인증 방식 (401 응답 시)
X-RateLimit-Remaining — 남은 요청 횟수
```

---

## Content-Type

```
application/json        — JSON (API 기본)
application/xml         — XML
application/x-www-form-urlencoded — HTML 폼
multipart/form-data     — 파일 업로드
text/plain              — 텍스트
text/html               — HTML
application/octet-stream — 바이너리 파일
```

---

## Cache-Control

```
Cache-Control: no-store          — 캐시 저장 금지 (민감 정보)
Cache-Control: no-cache          — 매번 검증 (ETag 사용)
Cache-Control: max-age=3600      — 3600초 캐시
Cache-Control: public            — 공유 캐시 가능 (CDN)
Cache-Control: private           — 브라우저만 캐시
Cache-Control: must-revalidate   — 만료 후 반드시 재검증

ETag 동작:
서버 → 클라이언트: ETag: "abc123"
다음 요청: If-None-Match: "abc123"
서버 판단:
  변경 없음 → 304 Not Modified (바디 없음, 대역폭 절약)
  변경됨   → 200 OK + 새 ETag
```

---

## HTTP 연결 관리

```
HTTP/1.0: 요청마다 TCP 연결 → 비효율
HTTP/1.1: Keep-Alive 기본 (연결 재사용)

Connection: keep-alive   → 연결 유지
Connection: close        → 요청 후 연결 종료

HTTP/1.1 파이프라이닝:
여러 요청을 연속 전송 (응답 순서는 보장)
→ 실제로는 HOL(Head-of-Line) blocking 문제로 잘 안 씀
```

---

## 실무 — Spring Boot API 응답 설계

```java
// 성공 응답
@GetMapping("/users/{id}")
public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
    return ResponseEntity.ok(userService.findById(id));
}

// 생성 응답 (201 + Location)
@PostMapping("/users")
public ResponseEntity<UserResponse> createUser(@RequestBody CreateUserRequest req) {
    UserResponse user = userService.create(req);
    URI location = URI.create("/users/" + user.getId());
    return ResponseEntity.created(location).body(user);
}

// 삭제 응답 (204)
@DeleteMapping("/users/{id}")
public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
    userService.delete(id);
    return ResponseEntity.noContent().build();
}

// 에러 응답 표준화
@ExceptionHandler(UserNotFoundException.class)
public ResponseEntity<ErrorResponse> handleNotFound(UserNotFoundException e) {
    return ResponseEntity
        .status(HttpStatus.NOT_FOUND)
        .body(new ErrorResponse("USER_NOT_FOUND", e.getMessage()));
}
```

```java
// 표준 에러 응답 형식
record ErrorResponse(
    String code,        // 에러 코드 (클라이언트가 분기 처리)
    String message,     // 사람이 읽는 메시지
    String timestamp,   // 발생 시각
    List<FieldError> errors  // 필드 유효성 오류 (선택)
) {}
```
