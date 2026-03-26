---
title: "REST API 설계 원칙"
order: 7
---

# REST API 설계 원칙

좋은 API는 쓰는 사람이 문서 없이도 직관적으로 이해할 수 있어야 한다.

식당의 메뉴판을 생각해보자. 좋은 메뉴판은 음식 이름만 봐도 무엇인지 알 수 있다. API도 마찬가지다. `/getUser` 대신 `GET /users/123`이라고 쓰면, 동사 없이도 "사용자 123번을 조회한다"는 의미가 명확해진다.

---

## REST란 무엇인가

REST(Representational State Transfer)는 웹의 설계 원칙을 그대로 API 설계에 적용한 아키텍처 스타일이다.

2000년 Roy Fielding이 박사 논문에서 제안했으며, 오늘날 웹 API의 표준이 되었다.

```
REST의 핵심 아이디어:
"자원(Resource)을 URL로 표현하고, 행위(Verb)는 HTTP 메서드로 표현하라"

자원 = 명사  (users, posts, orders)
행위 = 동사  (GET, POST, PUT, PATCH, DELETE)

❌ 나쁜 설계 (동사를 URL에 넣음):
/getUser?id=123
/createPost
/deleteComment?id=456
/updateUserProfile

✅ 좋은 설계 (명사 + HTTP 메서드):
GET    /users/123
POST   /posts
DELETE /comments/456
PATCH  /users/123/profile
```

---

## REST 5가지 기본 원칙

```
1. 자원(Resource) 중심
   — URI는 자원을 표현, 동사 금지
   — ❌ /getUser, /createPost, /deleteComment
   — ✅ /users, /posts, /comments

2. HTTP 메서드로 행위 표현
   GET    → 조회 (데이터를 읽는다)
   POST   → 생성 (새 데이터를 만든다)
   PUT    → 전체 수정 (데이터를 통째로 교체)
   PATCH  → 부분 수정 (일부 필드만 변경)
   DELETE → 삭제 (데이터를 지운다)

3. 무상태 (Stateless)
   — 서버가 클라이언트 상태를 저장하지 않음
   — 모든 요청은 자기 완결적 (인증 정보 포함)
   — 세션 대신 JWT 토큰 사용

4. 계층화 (Layered System)
   — 클라이언트는 서버 내부 구조 몰라도 됨
   — 로드밸런서, 캐시 서버 투명하게 추가 가능

5. Uniform Interface (일관된 인터페이스)
   — 모든 API가 같은 규칙을 따름
   — 한 번 배우면 다른 엔드포인트도 예측 가능
```

---

## HTTP 메서드 상세 이해

```
GET /users/123
— 데이터 조회만 함
— 서버 상태를 변경하지 않음 (안전한 메서드)
— 같은 요청을 여러 번 해도 결과 동일 (멱등성)
— 캐싱 가능

POST /users
— 새 자원 생성
— 서버 상태 변경됨
— 같은 요청 여러 번 = 여러 개 생성 (멱등성 없음!)
— 응답: 201 Created + Location 헤더

PUT /users/123
— 자원 전체 교체
— 요청 바디에 없는 필드는 null/기본값으로
— 멱등성 있음 (여러 번 해도 같은 결과)

PATCH /users/123
— 자원 일부만 수정
— 요청 바디에 있는 필드만 변경
— 이름만 바꾸고 싶을 때 사용

DELETE /users/123
— 자원 삭제
— 응답: 204 No Content (바디 없음)
— 멱등성 있음
```

---

## URI 설계 규칙

```
기본 규칙:
✅ 소문자 사용                   /users, /posts
✅ 하이픈(-) 단어 구분           /user-profiles, /order-items
✅ 복수형 명사                   /users (단수 /user 금지)
✅ 계층 구조 표현                /users/123/orders/456
❌ 동사 사용 금지                /getUser, /createPost
❌ 확장자 금지                   /users.json, /products.xml
❌ 끝에 슬래시 금지              /users/ (트레일링 슬래시)
❌ 밑줄 금지                     /user_profiles (하이픈 사용)

올바른 예:
GET  /users                  → 사용자 목록
GET  /users/123              → 특정 사용자
GET  /users/123/orders       → 특정 사용자의 주문 목록
GET  /users/123/orders/456   → 특정 사용자의 특정 주문
POST /users                  → 사용자 생성
PUT  /users/123              → 사용자 전체 수정
PATCH /users/123             → 사용자 부분 수정
DELETE /users/123            → 사용자 삭제

행위 표현 (동사가 꼭 필요한 경우):
POST /users/123/activate      → 계정 활성화
POST /orders/456/cancel       → 주문 취소
POST /payments/789/refund     → 환불
POST /auth/login              → 로그인
POST /auth/logout             → 로그아웃
POST /auth/refresh            → 토큰 갱신
```

---

## HTTP 상태 코드

API 응답의 "결과 신호"다. 음식점에서 주문 후 "완료", "품절", "주문 오류"를 알려주는 것처럼.

```
2xx — 성공
200 OK              → 조회/수정 성공 (일반 성공)
201 Created         → 생성 성공 (POST 응답)
204 No Content      → 삭제 성공 (응답 바디 없음)

3xx — 리다이렉트
301 Moved Permanently → 영구 이동 (URL 변경)
302 Found             → 임시 이동

4xx — 클라이언트 오류 (사용자 잘못)
400 Bad Request     → 잘못된 요청 형식
401 Unauthorized    → 인증 필요 (로그인 안 됨)
403 Forbidden       → 권한 없음 (로그인은 됐지만 접근 불가)
404 Not Found       → 자원 없음
405 Method Not Allowed → 허용하지 않는 HTTP 메서드
409 Conflict        → 충돌 (중복 이메일 등)
422 Unprocessable   → 유효성 검사 실패
429 Too Many Requests → 속도 제한 초과

5xx — 서버 오류 (서버 잘못)
500 Internal Server Error → 서버 내부 오류
502 Bad Gateway     → 게이트웨이/프록시 오류
503 Service Unavailable → 서비스 일시 중단
504 Gateway Timeout → 게이트웨이 타임아웃

주의:
401 vs 403 혼동하지 말 것
— 401: "누구세요? 로그인 필요"
— 403: "당신이 누군지 알지만 권한이 없어요"
```

---

## 버전 관리

API를 바꾸면 기존 클라이언트(앱, 파트너 시스템)가 깨진다. 버전 관리로 하위 호환성을 유지한다.

```
방법 1 — URI 버전 (가장 일반적, 권장)
GET /v1/users
GET /v2/users

장점: 직관적, 브라우저에서 바로 테스트 가능, 캐싱 쉬움
단점: URL 중복 (v1, v2 코드 동시 유지)

방법 2 — 헤더 버전
GET /users
Accept: application/vnd.myapp.v2+json

장점: URL 깔끔
단점: 덜 직관적, 브라우저 테스트 어려움

방법 3 — 쿼리 파라미터
GET /users?version=2

장점: 구현 간단
단점: 표준이 아님, 캐싱 어려울 수 있음

권장: URI 버전 방식 (/v1/, /v2/)
— 직관적, 테스트/캐싱 쉬움
— 브라우저에서 바로 테스트 가능
— 팀원이 API 버전 즉시 확인 가능

버전 관리 정책:
— v1 → v2 전환 시 충분한 공지 (최소 6개월)
— v1을 일정 기간 유지 후 Deprecation
— 응답에 Deprecation 경고 헤더 포함
  Deprecation: true
  Sunset: Sat, 31 Dec 2025 00:00:00 GMT
```

---

## 페이지네이션

수백만 개의 데이터를 한 번에 보내면 서버도 터지고 클라이언트도 처리 못한다. 데이터를 나눠서 보내는 것이 페이지네이션이다.

```
Offset 방식 (간단, 소규모에 적합):
GET /posts?page=1&size=20
GET /posts?offset=0&limit=20

→ SQL: SELECT * FROM posts LIMIT 20 OFFSET 0

장점: 구현 간단, 원하는 페이지로 바로 이동 가능
단점:
— OFFSET이 클수록 느림 (OFFSET 100000이면 10만 행 스캔)
— 새 데이터 삽입 시 중복/누락 발생

응답:
{
  "data": [...],
  "page": {
    "number": 1,        // 현재 페이지
    "size": 20,         // 페이지당 항목 수
    "totalElements": 500, // 전체 항목 수
    "totalPages": 25    // 전체 페이지 수
  }
}

Cursor 방식 (대용량, 실시간 데이터에 적합):
GET /posts?cursor=eyJpZCI6MTIzfQ&size=20
cursor = Base64({"id": 100, "created_at": "2024-01-01"})

→ SQL: WHERE created_at < {cursor.created_at} LIMIT 20

장점:
— 대용량에서 일관된 성능 (인덱스 활용)
— 실시간 데이터 추가에도 중복/누락 없음
단점:
— 특정 페이지로 바로 이동 불가 (이전/다음만 가능)
— 구현 복잡

응답:
{
  "data": [...],
  "cursor": {
    "next": "eyJpZCI6MTQzfQ",  // 다음 페이지 커서
    "hasMore": true             // 다음 페이지 존재 여부
  }
}

선택 기준:
— 게시판 목록, 상품 목록: Offset (페이지 이동 필요)
— 무한 스크롤, 피드: Cursor (실시간 데이터)
```

---

## 필터링, 정렬, 검색

```
필터링 (특정 조건으로 데이터 선택):
GET /users?status=active
GET /orders?status=pending&userId=123
GET /products?minPrice=1000&maxPrice=50000
GET /products?category=laptop&brand=samsung

정렬:
GET /users?sort=createdAt,desc           // 최신순
GET /users?sort=name,asc                 // 이름순
GET /users?sort=name,asc&sort=createdAt,desc  // 다중 정렬

검색:
GET /users?q=john                        // 이름에 john 포함
GET /products?q=맥북&category=laptop     // 복합 검색

필드 선택 (필요한 필드만 받아 성능 향상):
GET /users?fields=id,name,email

임베딩 (관련 데이터 함께 조회):
GET /posts?embed=author,comments
```

---

## 응답 형식 표준화

```json
// 성공 응답 (단건)
{
  "id": 123,
  "name": "John",
  "email": "john@example.com",
  "createdAt": "2024-01-06T10:00:00Z"
}

// 성공 응답 (목록)
{
  "data": [
    {"id": 1, "name": "Alice"},
    {"id": 2, "name": "Bob"}
  ],
  "page": {
    "number": 1,
    "size": 20,
    "totalElements": 100,
    "totalPages": 5
  }
}

// 에러 응답 (일관된 형식 유지)
{
  "code": "USER_NOT_FOUND",
  "message": "사용자를 찾을 수 없습니다.",
  "timestamp": "2024-01-06T10:00:00Z",
  "path": "/users/999"
}

// 유효성 검사 실패 (필드별 에러 표시)
{
  "code": "VALIDATION_FAILED",
  "message": "입력값이 유효하지 않습니다.",
  "errors": [
    {"field": "email", "message": "올바른 이메일 형식이 아닙니다."},
    {"field": "password", "message": "8자 이상이어야 합니다."}
  ]
}
```

---

## 날짜/시간 형식

```
ISO 8601 표준 사용 (전 세계 어디서든 파싱 가능):
"2024-01-06T10:00:00Z"        ← UTC (권장)
"2024-01-06T19:00:00+09:00"   ← KST (한국 시간)

API 응답: 항상 UTC로 반환
클라이언트: 필요에 따라 로컬 시간으로 변환

이유:
— 타임존이 다른 서버/클라이언트 간 혼란 방지
— "2024-01-06 19:00:00" 같은 형식은 타임존 정보 없음
— ISO 8601은 모든 언어에서 파싱 라이브러리 지원
```

---

## Spring Boot 구현 예시

```java
@RestController
@RequestMapping("/v1/users")  // URI 버전 적용
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // 목록 조회 (페이지네이션, 필터, 정렬)
    @GetMapping
    public ResponseEntity<Page<UserResponse>> getUsers(
        @RequestParam(defaultValue = "0") int page,    // 기본 0페이지
        @RequestParam(defaultValue = "20") int size,   // 기본 20개
        @RequestParam(required = false) String status, // 필터 (선택)
        @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        Pageable pageable = PageRequest.of(page, size,
            Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(userService.findAll(status, pageable));
    }

    // 단건 조회
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.findById(id));
        // 없으면 404 예외 (GlobalExceptionHandler에서 처리)
    }

    // 생성
    @PostMapping
    public ResponseEntity<UserResponse> createUser(
        @Valid @RequestBody CreateUserRequest request  // @Valid로 검증
    ) {
        UserResponse user = userService.create(request);
        return ResponseEntity
            .created(URI.create("/v1/users/" + user.getId()))  // 201 + Location 헤더
            .body(user);
    }

    // 부분 수정 (이름, 프로필 등 일부 필드만)
    @PatchMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(
        @PathVariable Long id,
        @Valid @RequestBody UpdateUserRequest request
    ) {
        return ResponseEntity.ok(userService.update(id, request));
    }

    // 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();  // 204 No Content
    }

    // 계정 활성화 (행위가 필요한 경우)
    @PostMapping("/{id}/activate")
    public ResponseEntity<Void> activateUser(@PathVariable Long id) {
        userService.activate(id);
        return ResponseEntity.ok().build();
    }
}
```

---

## 전역 예외 처리

```java
// 일관된 에러 응답을 위해 반드시 구현
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 자원 없음 → 404
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(EntityNotFoundException e) {
        return ResponseEntity.status(404)
            .body(ErrorResponse.of("NOT_FOUND", e.getMessage()));
    }

    // 유효성 검사 실패 → 422
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidation(
        MethodArgumentNotValidException e
    ) {
        List<FieldError> errors = e.getBindingResult().getFieldErrors()
            .stream()
            .map(fe -> new FieldError(fe.getField(), fe.getDefaultMessage()))
            .toList();

        return ResponseEntity.status(422)
            .body(ValidationErrorResponse.of("VALIDATION_FAILED", errors));
    }

    // 서버 내부 오류 → 500
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception e) {
        log.error("Unexpected error", e);
        return ResponseEntity.status(500)
            .body(ErrorResponse.of("INTERNAL_ERROR", "서버 오류가 발생했습니다."));
    }
}
```

---

## 흔한 실수와 올바른 방법

```
실수 1: URL에 동사 사용
❌ GET /getUser/123
✅ GET /users/123

실수 2: HTTP 메서드 오용
❌ GET /users/123/delete  (GET으로 삭제)
✅ DELETE /users/123

실수 3: 상태 코드 무시하고 200만 사용
❌ POST /users → 200 OK (생성인데 200?)
✅ POST /users → 201 Created

실수 4: 에러도 200으로 반환
❌ 200 OK + {"success": false, "error": "not found"}
✅ 404 Not Found + {"code": "USER_NOT_FOUND", ...}

실수 5: 민감 데이터를 URL에 포함
❌ GET /users?password=1234
✅ POST /auth/login + 요청 바디에 비밀번호

실수 6: 일관성 없는 응답 형식
❌ 어떤 API는 {"result": {...}}, 어떤 API는 {"data": {...}}
✅ 팀 내 응답 형식 통일 (공통 ApiResponse<T> 사용)
```

---

## HATEOAS (참고)

```json
// REST 성숙도 레벨 3: 링크 정보 포함
// 실제로는 구현 복잡도 대비 효과가 적어 잘 안 씀
{
  "id": 123,
  "name": "John",
  "_links": {
    "self": {"href": "/users/123"},
    "orders": {"href": "/users/123/orders"},
    "deactivate": {"href": "/users/123/deactivate", "method": "POST"}
  }
}

// 클라이언트가 링크만 따라가면 API 탐색 가능
// 하지만 실무에서는 Swagger 문서가 더 실용적
```
