---
title: "HTTP/1.1 — 메서드, 상태코드, 헤더"
order: 4
---

# HTTP/1.1 — 메서드, 상태코드, 헤더

백엔드 개발자가 매일 다루는 프로토콜이다. HTTP를 정확히 알아야 API를 제대로 설계할 수 있고, 클라이언트와 소통이 원활해진다.

---

## HTTP란 무엇인가?

HTTP(HyperText Transfer Protocol)는 웹에서 데이터를 주고받는 약속이다. 클라이언트(브라우저, 앱)가 서버에 **요청(Request)**을 보내면, 서버가 **응답(Response)**을 돌려보내는 구조다.

편지 주고받기와 같다. 클라이언트가 "이 데이터 주세요"라고 편지를 쓰면, 서버가 "네, 여기 있어요" 또는 "그 데이터 없어요"라고 답장을 보낸다.

---

## HTTP 요청/응답 구조

```
요청 (Request):
GET /users/123 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGci...
Content-Type: application/json
Accept: application/json

→ 위는 헤더
→ 빈 줄 한 줄
→ 아래는 바디 (POST, PUT 시)
{"name": "홍길동", "email": "hong@example.com"}

요청 구성:
1. 요청 라인: 메서드 경로 HTTP버전
2. 헤더: 요청 메타데이터 (여러 줄)
3. 빈 줄: 헤더 끝
4. 바디: 전송할 데이터 (선택적)
```

```
응답 (Response):
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 85
Cache-Control: no-cache

{"id": 123, "name": "홍길동", "email": "hong@example.com"}

응답 구성:
1. 상태 라인: HTTP버전 상태코드 상태메시지
2. 헤더: 응답 메타데이터
3. 빈 줄
4. 바디: 응답 데이터
```

---

## HTTP 메서드 — 어떤 행동을 할지

HTTP 메서드는 서버에게 "이 리소스에 무엇을 해달라"는 요청 유형이다. 메서드를 올바르게 사용하면 API가 직관적이 된다.

```
GET    — 리소스 조회
       → 데이터를 읽기만 함. 서버 상태 변경 없음.
       → 바디 없음. URL에 파라미터 포함.

POST   — 리소스 생성
       → 새 데이터 만들기. 매번 호출 시 다른 결과 가능.

PUT    — 리소스 전체 교체
       → 있으면 덮어쓰기, 없으면 생성.
       → 같은 요청 여러 번 해도 결과 동일 (멱등성).

PATCH  — 리소스 부분 수정
       → 특정 필드만 변경. PUT은 전체 교체.

DELETE — 리소스 삭제
       → 같은 요청 여러 번 해도 결과 동일 (멱등성).

HEAD   — GET과 동일하나 바디 없음
       → 헤더만 확인. 파일 크기 확인, 존재 여부 확인에 사용.

OPTIONS — 허용 메서드 확인
       → CORS preflight 요청 시 브라우저가 자동으로 보냄.

안전(Safe): 서버 상태 변경 없음 → GET, HEAD
멱등(Idempotent): 여러 번 호출해도 결과 동일 → GET, PUT, DELETE
```

---

## REST API 설계 예시

```
올바른 REST API 설계:
GET    /users          → 사용자 목록 조회
GET    /users/123      → 사용자 123 조회
POST   /users          → 새 사용자 생성
PUT    /users/123      → 사용자 123 전체 수정
PATCH  /users/123      → 사용자 123 부분 수정
DELETE /users/123      → 사용자 123 삭제

중첩 리소스:
GET    /users/123/orders       → 사용자 123의 주문 목록
GET    /users/123/orders/456   → 특정 주문
POST   /users/123/orders       → 새 주문 생성

행위 표현 (불가피한 경우에만):
POST /users/123/activate   → 계정 활성화
POST /orders/456/cancel    → 주문 취소
POST /payments/789/refund  → 환불
POST /auth/login           → 로그인
POST /auth/logout          → 로그아웃

쿼리 파라미터:
GET /users?page=1&size=20          → 페이지네이션
GET /users?status=active           → 필터링
GET /users?sort=createdAt,desc     → 정렬
GET /products?q=맥북&category=laptop → 검색
```

---

## HTTP 상태 코드 — 결과가 어떻게 됐는지

상태 코드는 서버가 "요청이 어떻게 처리됐어요"를 숫자로 표현한 것이다. 앞자리 숫자가 큰 카테고리를 나타낸다.

```
1xx — 정보 (거의 안 씀)
100 Continue — 계속 보내도 됨

2xx — 성공 (요청이 정상 처리됨)
200 OK              → 성공. GET, PUT, PATCH 응답에 주로 사용.
201 Created         → 생성 성공. POST로 새 리소스 만들었을 때.
                      Location 헤더에 새 리소스 URL 포함.
204 No Content      → 성공이나 응답 바디 없음. DELETE 응답에 주로 사용.
206 Partial Content → 일부만 반환 (Range 요청, 대용량 파일 다운로드).

3xx — 리다이렉션 (다른 곳으로 가세요)
301 Moved Permanently  → 영구 이동. 브라우저가 캐시. SEO 영향.
302 Found              → 임시 이동.
304 Not Modified       → 캐시 유효. 실제 데이터 전송 없음. 대역폭 절약.
307 Temporary Redirect → 임시 이동, 원래 메서드 유지.
308 Permanent Redirect → 영구 이동, 원래 메서드 유지.

4xx — 클라이언트 오류 (요청이 잘못됨)
400 Bad Request        → 잘못된 요청. 파라미터 형식 오류, JSON 파싱 실패.
401 Unauthorized       → 인증 필요. "로그인하세요" (토큰 없거나 만료)
403 Forbidden          → 권한 없음. 로그인은 됐지만 접근 불가.
                         401 vs 403 구분이 중요!
404 Not Found          → 리소스 없음.
405 Method Not Allowed → 허용되지 않은 메서드. GET인데 DELETE 시도.
409 Conflict           → 충돌. 이미 존재하는 이메일로 가입 시도.
422 Unprocessable Entity → 유효성 검사 실패. 이메일 형식 오류 등.
429 Too Many Requests  → 너무 많은 요청. Rate Limit 초과.

5xx — 서버 오류 (서버 쪽 문제)
500 Internal Server Error → 서버 내부 에러. NullPointerException 등.
502 Bad Gateway           → 업스트림 서버(앱 서버) 오류. Nginx가 앱에 연결 실패.
503 Service Unavailable   → 서비스 불가. 과부하, 점검 중.
504 Gateway Timeout       → 업스트림 서버 응답 타임아웃.
```

---

## HTTP 헤더 — 요청/응답의 메타데이터

```
자주 쓰는 요청 헤더:
Host              → 대상 서버 호스트명. HTTP/1.1에서 필수.
Authorization     → 인증 정보. Bearer TOKEN 또는 Basic base64
Content-Type      → 요청 바디의 형식. application/json
Accept            → 원하는 응답 형식. application/json
Accept-Encoding   → 지원하는 압축. gzip, br
Cookie            → 쿠키
User-Agent        → 클라이언트 정보 (브라우저 종류, 버전)
If-None-Match     → ETag 캐시 검증 ("abc123" 버전 이후 변경됐는지)
X-Request-ID      → 요청 추적 ID (로그 연결에 사용)
X-Forwarded-For   → 프록시 경유 시 원본 클라이언트 IP

자주 쓰는 응답 헤더:
Content-Type      → 응답 바디 형식. application/json; charset=UTF-8
Content-Length    → 바디 크기 (바이트)
Content-Encoding  → 압축 방식. gzip
Cache-Control     → 캐시 정책
ETag              → 리소스 버전 식별자. "abc123"
Location          → 리다이렉트 URL 또는 새 리소스 URL (201 응답 시)
Set-Cookie        → 쿠키 설정
WWW-Authenticate  → 401 응답 시 인증 방식 안내
X-RateLimit-Remaining → 남은 요청 횟수
```

---

## Content-Type — 데이터 형식 지정

```
API에서 자주 쓰는 Content-Type:
application/json              → JSON (REST API 기본)
application/x-www-form-urlencoded → HTML 폼 기본 형식
multipart/form-data           → 파일 업로드 시
text/plain                    → 일반 텍스트
text/html                     → HTML
application/octet-stream      → 바이너리 파일 다운로드

예시:
POST /users
Content-Type: application/json

{"name": "홍길동", "email": "hong@example.com"}

파일 업로드:
POST /files
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="photo.jpg"
Content-Type: image/jpeg
[binary data...]
```

---

## Cache-Control — 캐시 정책 지정

```
Cache-Control 지시자:
no-store       → 캐시 완전 금지. 민감한 데이터 (개인정보, 결제)
no-cache       → 저장은 하되 매번 서버 검증. ETag와 함께 사용.
public         → 공유 캐시(CDN, 프록시)에 저장 가능.
private        → 브라우저만 저장. CDN 저장 금지.
max-age=3600   → 3600초 동안 캐시 유효.
s-maxage=3600  → 공유 캐시(CDN)용 max-age.
must-revalidate → 만료 후 반드시 재검증.
immutable      → 캐시 기간 동안 절대 변경 안 됨. 버전된 파일에 사용.

실전 예시:
Cache-Control: public, max-age=86400           → CDN 1일 캐시
Cache-Control: private, max-age=3600           → 브라우저만 1시간
Cache-Control: no-cache                        → 매번 검증 (ETag 활용)
Cache-Control: public, max-age=31536000, immutable → 1년 (파일명에 해시)
Cache-Control: no-store                        → 절대 캐시 금지
```

```
ETag 동작 (대역폭 절약):
첫 번째 요청:
  GET /api/products/1
  응답: 200 OK + 데이터 + ETag: "abc123"

두 번째 요청 (캐시 검증):
  GET /api/products/1
  If-None-Match: "abc123"

  변경 없음: 304 Not Modified (바디 없음! 대역폭 절약)
  변경됨:    200 OK + 새 데이터 + ETag: "xyz789"
```

---

## HTTP 연결 관리 — Keep-Alive

```
HTTP/1.0:
— 요청마다 TCP 연결 새로 수립
— 요청 1번 = TCP 연결 + 데이터 전송 + TCP 종료
— 매우 비효율적

HTTP/1.1 (현재 기본):
— Keep-Alive 기본 활성화
— 하나의 TCP 연결에서 여러 HTTP 요청 처리
— 연결 재사용으로 3-way handshake 오버헤드 절감

Connection: keep-alive  → 연결 유지 (기본값)
Connection: close       → 요청 후 연결 종료
```

---

## Spring Boot API 응답 설계 — 올바른 상태코드 사용

```java
@RestController
@RequestMapping("/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // GET → 200 OK
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    // POST → 201 Created + Location 헤더
    @PostMapping
    public ResponseEntity<UserResponse> createUser(
        @Valid @RequestBody CreateUserRequest request
    ) {
        UserResponse user = userService.create(request);
        URI location = URI.create("/v1/users/" + user.getId());
        return ResponseEntity.created(location).body(user);
    }

    // PATCH → 200 OK
    @PatchMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(
        @PathVariable Long id,
        @Valid @RequestBody UpdateUserRequest request
    ) {
        return ResponseEntity.ok(userService.update(id, request));
    }

    // DELETE → 204 No Content (바디 없음)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

---

## 표준 에러 응답 형식

```java
// 에러 응답 DTO
public record ErrorResponse(
    String code,        // 에러 코드 (클라이언트 분기 처리용)
    String message,     // 사람이 읽는 메시지
    String timestamp,   // 발생 시각
    List<FieldError> errors  // 필드 유효성 오류 (선택)
) {}

// 전역 예외 핸들러
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NotFoundException e) {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)   // 404
            .body(new ErrorResponse(
                "RESOURCE_NOT_FOUND",
                e.getMessage(),
                Instant.now().toString(),
                null
            ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
        MethodArgumentNotValidException e
    ) {
        List<FieldError> errors = e.getBindingResult()
            .getFieldErrors().stream()
            .map(fe -> new FieldError(fe.getField(), fe.getDefaultMessage()))
            .collect(Collectors.toList());

        return ResponseEntity
            .status(HttpStatus.UNPROCESSABLE_ENTITY)  // 422
            .body(new ErrorResponse(
                "VALIDATION_FAILED",
                "입력값이 올바르지 않습니다.",
                Instant.now().toString(),
                errors
            ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception e) {
        log.error("처리되지 않은 예외", e);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)  // 500
            .body(new ErrorResponse(
                "INTERNAL_ERROR",
                "서버 오류가 발생했습니다.",
                Instant.now().toString(),
                null
            ));
    }
}
```

---

## 자주 하는 실수

```
실수 1: 401과 403 혼동
→ 401 Unauthorized = "누구세요? 인증해주세요" (토큰 없거나 만료)
→ 403 Forbidden    = "알겠어요, 근데 권한이 없어요" (로그인은 됐지만 접근 불가)
→ 모든 인증/권한 오류를 401로 처리하면 클라이언트가 구분 못함.

실수 2: 에러 응답에도 200 OK 사용
→ { "success": false, "message": "유저 없음" }를 200으로 반환
→ 클라이언트가 상태 코드로 성공/실패를 판단 못함.
→ 실패 시 반드시 4xx, 5xx 사용.

실수 3: DELETE 응답에 바디 넣기
→ DELETE는 보통 204 No Content + 바디 없음.
→ 일부 팀은 200 OK + 삭제된 리소스 반환하기도 함. 팀 규약 통일이 중요.

실수 4: Content-Type 헤더 누락
→ POST/PUT/PATCH 요청 시 Content-Type: application/json 필수.
→ 없으면 서버가 바디를 어떻게 파싱할지 모름.
→ Spring에서 @RequestBody가 파싱 실패로 400 반환.
```
