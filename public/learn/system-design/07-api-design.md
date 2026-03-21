---
title: "API 설계"
order: 7
---

# API 설계

확장 가능하고 사용하기 좋은 API 설계.

---

## REST API 설계 원칙

```
리소스 중심:
GET    /users          → 목록
GET    /users/{id}     → 상세
POST   /users          → 생성
PUT    /users/{id}     → 전체 수정
PATCH  /users/{id}     → 부분 수정
DELETE /users/{id}     → 삭제

관계 표현:
GET /users/{id}/orders         → 사용자의 주문 목록
GET /users/{id}/orders/{oid}   → 사용자의 특정 주문
POST /orders/{id}/items        → 주문에 상품 추가

상태 변경 (동사 허용):
POST /orders/{id}/cancel        → 주문 취소
POST /payments/{id}/refund      → 환불

HTTP 상태 코드:
200 OK              → 성공
201 Created         → 생성 성공
204 No Content      → 삭제 성공 (응답 본문 없음)
400 Bad Request     → 클라이언트 오류 (잘못된 입력)
401 Unauthorized    → 인증 필요
403 Forbidden       → 권한 없음
404 Not Found       → 리소스 없음
409 Conflict        → 충돌 (중복 데이터 등)
422 Unprocessable   → 유효성 검사 실패
429 Too Many Requests → 레이트 리밋
500 Internal Error  → 서버 오류
503 Service Unavailable → 서비스 불가
```

---

## API 버전 관리

```
URL 기반 (권장):
/api/v1/users
/api/v2/users

장점: 명확, 캐시 용이
단점: URL 중복

헤더 기반:
Accept: application/vnd.myapp.v2+json
X-API-Version: 2

장점: URL 깔끔
단점: 덜 직관적, 캐시 어려움

쿼리 파라미터:
/api/users?version=2

버전 관리 전략:
— v1 → v2 전환 시 충분한 공지 (6개월+)
— v1 일정 기간 유지 후 Deprecation
— 응답에 Deprecation 경고 헤더 포함
Deprecation: true
Sunset: Sat, 31 Dec 2025 00:00:00 GMT
```

---

## 페이지네이션

```
Offset 기반 (단순):
GET /posts?page=2&size=20
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 20

단점:
— OFFSET이 클수록 느림 (OFFSET 100000 스캔)
— 새 데이터 삽입 시 중복/누락

Cursor 기반 (권장):
GET /posts?cursor=eyJpZCI6MTAwfQ&size=20
cursor = Base64({"id": 100, "created_at": "2024-01-01"})

SELECT * FROM posts
WHERE created_at < {cursor.created_at}
   OR (created_at = {cursor.created_at} AND id < {cursor.id})
ORDER BY created_at DESC, id DESC
LIMIT 20

장점:
— 대용량에서 일관된 성능
— 데이터 변경에도 안전

응답:
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6ODB9",
    "hasNext": true,
    "size": 20
  }
}
```

```java
// Cursor 페이지네이션 구현
@RestController
@RequestMapping("/api/v1/posts")
public class PostController {

    @GetMapping
    public CursorPage<PostResponse> getPosts(
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "20") int size
    ) {
        PostCursor decoded = cursor != null
            ? CursorUtil.decode(cursor, PostCursor.class)
            : null;

        List<Post> posts = postRepository.findWithCursor(decoded, size + 1);

        boolean hasNext = posts.size() > size;
        List<Post> content = hasNext ? posts.subList(0, size) : posts;

        String nextCursor = hasNext
            ? CursorUtil.encode(new PostCursor(
                content.get(content.size() - 1).getId(),
                content.get(content.size() - 1).getCreatedAt()
              ))
            : null;

        return new CursorPage<>(
            content.stream().map(PostResponse::from).toList(),
            nextCursor,
            hasNext
        );
    }
}
```

---

## 응답 포맷 표준화

```java
// 공통 응답 래퍼
@Getter
@Builder
public class ApiResponse<T> {
    private final boolean success;
    private final T data;
    private final String message;
    private final String errorCode;
    private final Instant timestamp;

    public static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder()
            .success(true)
            .data(data)
            .timestamp(Instant.now())
            .build();
    }

    public static <T> ApiResponse<T> error(String errorCode, String message) {
        return ApiResponse.<T>builder()
            .success(false)
            .errorCode(errorCode)
            .message(message)
            .timestamp(Instant.now())
            .build();
    }
}

// 성공 응답:
{
  "success": true,
  "data": { "id": 1, "name": "홍길동" },
  "timestamp": "2024-01-01T12:00:00Z"
}

// 에러 응답:
{
  "success": false,
  "errorCode": "USER_NOT_FOUND",
  "message": "사용자를 찾을 수 없습니다.",
  "timestamp": "2024-01-01T12:00:00Z"
}

// 유효성 검사 오류:
{
  "success": false,
  "errorCode": "VALIDATION_ERROR",
  "message": "입력값이 올바르지 않습니다.",
  "errors": [
    { "field": "email", "message": "이메일 형식이 올바르지 않습니다." },
    { "field": "age", "message": "나이는 0 이상이어야 합니다." }
  ]
}
```

---

## 멱등성 (Idempotency)

```
결제, 주문 등 중복 요청 방지:

클라이언트가 고유 ID 생성:
POST /payments
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

서버 처리:
1. 키 존재 확인 (Redis)
2. 없으면: 처리 후 결과 저장 (24시간)
3. 있으면: 저장된 결과 반환 (재처리 안 함)
```

```java
@Component
@RequiredArgsConstructor
public class IdempotencyFilter extends OncePerRequestFilter {

    private final RedisTemplate<String, String> redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain chain) throws IOException, ServletException {
        String key = request.getHeader("Idempotency-Key");

        if (key == null || !request.getMethod().equals("POST")) {
            chain.doFilter(request, response);
            return;
        }

        String cacheKey = "idempotency:" + key;
        String cached = redisTemplate.opsForValue().get(cacheKey);

        if (cached != null) {
            // 이미 처리된 요청 → 캐시 응답 반환
            response.setStatus(200);
            response.setContentType("application/json");
            response.getWriter().write(cached);
            return;
        }

        // 처리 후 응답 캐싱
        ContentCachingResponseWrapper wrappedResponse =
            new ContentCachingResponseWrapper(response);
        chain.doFilter(request, wrappedResponse);

        String responseBody = new String(wrappedResponse.getContentAsByteArray());
        redisTemplate.opsForValue().set(cacheKey, responseBody, Duration.ofHours(24));
        wrappedResponse.copyBodyToResponse();
    }
}
```

---

## GraphQL vs REST

```
REST:
GET /users/1           → User만
GET /users/1/posts     → Posts만
GET /users/1/followers → Followers만
= 3번 요청, Over-fetching 가능

GraphQL:
query {
  user(id: 1) {
    name
    email
    posts(first: 5) {
      title
      createdAt
    }
    followers(first: 10) {
      name
    }
  }
}
= 1번 요청, 필요한 필드만

GraphQL 장점:
— 클라이언트가 필요한 데이터 지정
— Over-fetching / Under-fetching 해결
— 강력한 타입 시스템

GraphQL 단점:
— 복잡한 쿼리 → 서버 부하 (N+1 문제)
— 캐싱 어려움 (POST 기반)
— 파일 업로드 복잡

선택 기준:
REST: 단순한 CRUD, 캐싱 중요, 외부 API
GraphQL: 복잡한 데이터 요구사항, 다양한 클라이언트 (웹/모바일)
```

---

## API 문서화

```java
// Swagger/OpenAPI (springdoc-openapi)
@Operation(
    summary = "사용자 조회",
    description = "ID로 사용자를 조회합니다."
)
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공",
        content = @Content(schema = @Schema(implementation = UserResponse.class))),
    @ApiResponse(responseCode = "404", description = "사용자 없음",
        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
})
@GetMapping("/users/{id}")
public ResponseEntity<ApiResponse<UserResponse>> getUser(
    @Parameter(description = "사용자 ID", required = true)
    @PathVariable Long id
) {
    return ResponseEntity.ok(ApiResponse.ok(userService.getUser(id)));
}
```

```yaml
# application.yml
springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html
    operations-sorter: method
  default-consumes-media-type: application/json
  default-produces-media-type: application/json
```
