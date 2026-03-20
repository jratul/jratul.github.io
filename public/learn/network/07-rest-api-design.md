---
title: "REST API 설계 원칙"
order: 7
---

# REST API 설계 원칙

좋은 API는 쓰는 사람이 문서 없이도 직관적으로 이해할 수 있어야 한다.

---

## REST 기본 원칙

```
1. 자원(Resource) 중심
   — URI는 자원을 표현, 동사 금지
   — ❌ /getUser, /createPost, /deleteComment
   — ✅ /users, /posts, /comments

2. HTTP 메서드로 행위 표현
   GET    → 조회
   POST   → 생성
   PUT    → 전체 수정
   PATCH  → 부분 수정
   DELETE → 삭제

3. 무상태 (Stateless)
   — 서버가 클라이언트 상태를 저장하지 않음
   — 모든 요청은 자기 완결적 (인증 정보 포함)

4. 계층화 (Layered System)
   — 클라이언트는 서버 내부 구조 몰라도 됨
   — 로드밸런서, 캐시 서버 투명하게 추가 가능

5. Uniform Interface
   — 일관된 인터페이스 (표준화된 URI, HTTP 메서드)
```

---

## URI 설계 규칙

```
기본 규칙:
✅ 소문자 사용
✅ 하이픈(-) 사용 (밑줄_ 금지)
✅ 복수형 명사
✅ 계층 구조 표현
❌ 동사 사용 금지
❌ 확장자 금지 (.json, .xml)
❌ 끝에 슬래시 금지

올바른 예:
GET  /users                  → 사용자 목록
GET  /users/123              → 특정 사용자
GET  /users/123/orders       → 특정 사용자의 주문 목록
GET  /users/123/orders/456   → 특정 주문
POST /users                  → 사용자 생성
PUT  /users/123              → 사용자 수정

행위 표현 (어쩔 수 없는 경우):
POST /users/123/activate      → 계정 활성화
POST /orders/456/cancel       → 주문 취소
POST /payments/789/refund     → 환불
POST /auth/login              → 로그인
POST /auth/logout             → 로그아웃
POST /auth/refresh            → 토큰 갱신
```

---

## 버전 관리

```
방법 1 — URI 버전 (가장 일반적)
GET /v1/users
GET /v2/users

방법 2 — 헤더 버전
GET /users
Accept: application/vnd.myapp.v2+json

방법 3 — 쿼리 파라미터
GET /users?version=2

권장: URI 버전 방식
— 직관적, 테스트/캐싱 쉬움
— 브라우저에서 바로 테스트 가능
```

---

## 페이지네이션

```
Offset 방식 (간단, 대용량에서 성능 이슈):
GET /posts?page=1&size=20
GET /posts?offset=0&limit=20

응답:
{
  "data": [...],
  "page": {
    "number": 1,
    "size": 20,
    "totalElements": 500,
    "totalPages": 25
  }
}

Cursor 방식 (대용량, 실시간 데이터):
GET /posts?cursor=eyJpZCI6MTIzfQ&size=20

응답:
{
  "data": [...],
  "cursor": {
    "next": "eyJpZCI6MTQzfQ",
    "hasMore": true
  }
}
```

---

## 필터링, 정렬, 검색

```
필터링:
GET /users?status=active
GET /orders?status=pending&userId=123
GET /products?minPrice=1000&maxPrice=50000

정렬:
GET /users?sort=createdAt,desc
GET /users?sort=name,asc&sort=createdAt,desc  (다중 정렬)

검색:
GET /users?q=john
GET /products?q=맥북&category=laptop

필드 선택 (필요한 필드만):
GET /users?fields=id,name,email
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

// 에러 응답
{
  "code": "USER_NOT_FOUND",
  "message": "사용자를 찾을 수 없습니다.",
  "timestamp": "2024-01-06T10:00:00Z",
  "path": "/users/999"
}

// 유효성 검사 실패
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
ISO 8601 표준 사용:
"2024-01-06T10:00:00Z"        ← UTC
"2024-01-06T19:00:00+09:00"   ← KST

API 응답: 항상 UTC로 반환
클라이언트: 필요에 따라 로컬 시간으로 변환
```

---

## HATEOAS (Hypermedia)

```json
// 링크 정보 포함 (REST 성숙도 레벨 3)
{
  "id": 123,
  "name": "John",
  "_links": {
    "self": {"href": "/users/123"},
    "orders": {"href": "/users/123/orders"},
    "deactivate": {"href": "/users/123/deactivate", "method": "POST"}
  }
}
// 실제로는 구현 복잡도 대비 효과가 적어 잘 안 씀
```

---

## Spring Boot 구현 예시

```java
@RestController
@RequestMapping("/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // 목록 조회 (페이지네이션, 필터, 정렬)
    @GetMapping
    public ResponseEntity<Page<UserResponse>> getUsers(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String status,
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
    }

    // 생성
    @PostMapping
    public ResponseEntity<UserResponse> createUser(
        @Valid @RequestBody CreateUserRequest request
    ) {
        UserResponse user = userService.create(request);
        return ResponseEntity
            .created(URI.create("/v1/users/" + user.getId()))
            .body(user);
    }

    // 부분 수정
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
        return ResponseEntity.noContent().build();
    }
}
```
