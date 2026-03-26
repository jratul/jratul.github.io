---
title: "API 설계"
order: 7
---

## API 설계란 무엇인가

API(Application Programming Interface)는 **서비스들이 서로 소통하는 약속**입니다. 좋은 API 설계는 사용하기 쉽고, 변경에 유연하며, 실수를 줄여줍니다.

**현실 비유:** 카페 메뉴판이 API입니다. 메뉴판은 "아메리카노 주세요"처럼 명확한 주문 방법을 알려줍니다. 커피가 어떻게 만들어지는지(구현)는 몰라도 됩니다.

---

## REST API 설계 원칙

REST는 **리소스 중심**으로 URL을 설계합니다. 동사 대신 명사를 씁니다.

```
리소스 중심 URL 설계:
GET    /users          → 사용자 목록 조회
GET    /users/{id}     → 특정 사용자 조회
POST   /users          → 사용자 생성
PUT    /users/{id}     → 사용자 전체 수정 (모든 필드 제공)
PATCH  /users/{id}     → 사용자 부분 수정 (일부 필드만 제공)
DELETE /users/{id}     → 사용자 삭제

관계 표현 (중첩 리소스):
GET  /users/{id}/orders           → 특정 사용자의 주문 목록
GET  /users/{id}/orders/{orderId} → 특정 사용자의 특정 주문
POST /orders/{id}/items           → 주문에 상품 추가

상태 변경 액션 (동사 허용 - 리소스로 표현하기 어려울 때):
POST /orders/{id}/cancel          → 주문 취소
POST /payments/{id}/refund        → 환불 처리
POST /users/{id}/follow           → 팔로우
```

**나쁜 예:**
```
GET  /getUser?id=1       → 동사를 URL에 쓰지 않음
POST /createOrder        → 메서드(POST)로 이미 생성 표현
GET  /user/delete/1      → GET으로 삭제 요청
```

---

## HTTP 상태 코드

클라이언트가 결과를 이해할 수 있는 표준 코드입니다.

```
2xx 성공:
200 OK              → 일반 성공 (조회, 수정)
201 Created         → 생성 성공 (POST 응답, Location 헤더로 새 리소스 위치 전달)
202 Accepted        → 요청 수락됨 (비동기 처리, 아직 완료 안 됨)
204 No Content      → 성공했지만 응답 본문 없음 (삭제 성공)

4xx 클라이언트 오류:
400 Bad Request     → 잘못된 요청 (필수 파라미터 없음, 타입 오류)
401 Unauthorized    → 인증 필요 (로그인 안 함 또는 토큰 만료)
403 Forbidden       → 권한 없음 (로그인은 했지만 접근 권한 없음)
404 Not Found       → 리소스 없음
405 Method Not Allowed → 해당 메서드 지원 안 함
409 Conflict        → 충돌 (중복 이메일, 낙관적 잠금 충돌)
422 Unprocessable   → 유효성 검사 실패 (형식은 맞지만 내용이 잘못됨)
429 Too Many Requests → Rate Limit 초과

5xx 서버 오류:
500 Internal Server Error  → 서버 내부 오류
502 Bad Gateway            → 업스트림 서버 오류
503 Service Unavailable    → 서비스 불가 (점검, 과부하)
```

---

## API 버전 관리

API는 변경되지만 기존 클라이언트가 깨지면 안 됩니다.

```
방법 1: URL 경로 버전 (권장)
/api/v1/users
/api/v2/users  (v2에서 응답 형식 변경)

장점: 명확함, 브라우저 주소창에서 바로 보임, CDN 캐시 용이
단점: URL에 버전 중복

방법 2: 헤더 버전
GET /api/users
Accept: application/vnd.myapp.v2+json
X-API-Version: 2

장점: URL 깔끔
단점: 덜 직관적, 브라우저에서 테스트 어려움, 캐시 복잡

방법 3: 쿼리 파라미터
/api/users?version=2

단점: 표준이 아님, 실수로 누락 가능
```

```
버전 관리 전략:
1. v1 출시
2. v2 개발 (v1은 유지)
3. v2 안정화 후 v1 Deprecation 선언 (최소 6개월 전)
4. 응답 헤더로 경고:
   Deprecation: true
   Sunset: Sat, 31 Dec 2025 00:00:00 GMT
5. v1 중단
```

---

## 페이지네이션

대량의 데이터를 분할해서 제공합니다.

### Offset 기반 (단순하지만 문제 있음)

```
GET /posts?page=2&size=20

SQL: SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 20

문제점:
1. OFFSET이 클수록 느려짐
   OFFSET 100000이면 앞에 100000건을 스캔하고 버림
2. 데이터 변경 시 중복/누락
   1페이지 읽는 중 새 데이터 삽입 → 2페이지에서 1페이지 데이터 다시 보임
```

### Cursor 기반 (권장)

```
GET /posts?cursor=eyJpZCI6MTAwfQ&size=20
cursor = Base64({"id": 100, "created_at": "2024-01-01T12:00:00"})

SQL:
SELECT * FROM posts
WHERE (created_at, id) < ({cursor.created_at}, {cursor.id})
ORDER BY created_at DESC, id DESC
LIMIT 20

장점:
- 데이터 양이 많아도 일정한 성능 (인덱스 활용)
- 중간에 데이터 변경돼도 안전
```

```java
// Cursor 페이지네이션 구현
@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
public class PostController {

    @GetMapping
    public CursorPage<PostResponse> getPosts(
        @RequestParam(required = false) String cursor,  // 없으면 첫 페이지
        @RequestParam(defaultValue = "20") int size
    ) {
        // cursor 디코딩 (Base64 → 객체)
        PostCursor decoded = cursor != null
            ? CursorUtil.decode(cursor, PostCursor.class)
            : null;

        // size+1개를 요청해서 다음 페이지 존재 여부 확인
        List<Post> posts = postRepository.findWithCursor(decoded, size + 1);

        boolean hasNext = posts.size() > size;
        List<Post> content = hasNext ? posts.subList(0, size) : posts;

        // 마지막 아이템으로 다음 커서 생성
        String nextCursor = hasNext
            ? CursorUtil.encode(new PostCursor(
                content.get(content.size() - 1).getId(),
                content.get(content.size() - 1).getCreatedAt()
              ))
            : null;

        return new CursorPage<>(
            content.stream().map(PostResponse::from).toList(),
            nextCursor,
            hasNext,
            content.size()
        );
    }
}
```

**응답 형식:**

```json
{
  "data": [
    {"id": 100, "title": "포스트 제목", "createdAt": "2024-01-01T12:00:00"},
    ...
  ],
  "pagination": {
    "nextCursor": "eyJpZCI6ODB9",
    "hasNext": true,
    "size": 20
  }
}
```

---

## 응답 포맷 표준화

일관된 응답 형식은 클라이언트 개발을 쉽게 만듭니다.

```java
// 공통 응답 래퍼
@Getter
@Builder
public class ApiResponse<T> {
    private final boolean success;   // 성공 여부
    private final T data;            // 응답 데이터 (성공 시)
    private final String message;    // 메시지
    private final String errorCode;  // 에러 코드 (실패 시)
    private final Instant timestamp; // 응답 시각

    // 성공 응답 생성
    public static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder()
            .success(true)
            .data(data)
            .timestamp(Instant.now())
            .build();
    }

    // 에러 응답 생성
    public static <T> ApiResponse<T> error(String errorCode, String message) {
        return ApiResponse.<T>builder()
            .success(false)
            .errorCode(errorCode)
            .message(message)
            .timestamp(Instant.now())
            .build();
    }
}
```

**응답 예시:**

```json
// 성공 응답
{
  "success": true,
  "data": {
    "id": 1,
    "name": "홍길동",
    "email": "hong@example.com"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}

// 에러 응답
{
  "success": false,
  "errorCode": "USER_NOT_FOUND",
  "message": "사용자를 찾을 수 없습니다.",
  "timestamp": "2024-01-01T12:00:00Z"
}

// 유효성 검사 오류 (필드별 오류 포함)
{
  "success": false,
  "errorCode": "VALIDATION_ERROR",
  "message": "입력값이 올바르지 않습니다.",
  "errors": [
    { "field": "email", "message": "이메일 형식이 올바르지 않습니다." },
    { "field": "age", "message": "나이는 1 이상이어야 합니다." }
  ],
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 멱등성 (Idempotency)

같은 요청을 여러 번 보내도 결과가 같아야 합니다. 특히 결제, 주문처럼 중복 처리가 치명적인 경우에 중요합니다.

**현실 비유:** 엘리베이터 버튼은 멱등성이 있습니다. 여러 번 눌러도 한 번 누른 것과 같습니다.

```
HTTP 메서드별 멱등성:
GET    멱등 (여러 번 조회해도 서버 상태 변경 없음)
PUT    멱등 (같은 데이터로 여러 번 수정해도 결과 같음)
DELETE 멱등 (이미 삭제된 것 다시 삭제 → 404지만 결과는 같음)
POST   비멱등! (여러 번 호출 → 여러 개 생성됨)
PATCH  비멱등 (경우에 따라 다름)
```

```
POST /payments 두 번 호출하면? → 결제 두 번 됨!

해결: Idempotency-Key 헤더
POST /payments
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000  (클라이언트가 생성)

서버 처리:
1. 이 키로 이미 처리됐는지 확인 (Redis)
2. 없으면: 처리 후 결과를 키와 함께 저장 (24시간)
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

        // POST만 멱등성 적용 (GET, PUT은 기본적으로 멱등)
        if (key == null || !request.getMethod().equals("POST")) {
            chain.doFilter(request, response);
            return;
        }

        String cacheKey = "idempotency:" + key;
        String cached = redisTemplate.opsForValue().get(cacheKey);

        if (cached != null) {
            // 이미 처리된 요청 → 캐시에서 이전 응답 반환
            response.setStatus(HttpStatus.OK.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(cached);
            return;
        }

        // 처음 처리: 응답을 캡처해서 저장
        ContentCachingResponseWrapper wrappedResponse =
            new ContentCachingResponseWrapper(response);
        chain.doFilter(request, wrappedResponse);

        // 성공 응답만 캐시 (실패는 재처리 가능해야 함)
        if (response.getStatus() < 400) {
            String responseBody = new String(wrappedResponse.getContentAsByteArray(),
                StandardCharsets.UTF_8);
            redisTemplate.opsForValue().set(cacheKey, responseBody, Duration.ofHours(24));
        }

        wrappedResponse.copyBodyToResponse();
    }
}
```

---

## GraphQL vs REST

### REST 방식의 문제

```
사용자 프로필 페이지에 필요한 데이터:
- 사용자 정보
- 최근 5개 포스트
- 팔로워 수

REST:
GET /users/1           → User { id, name, email, bio, profileImage, createdAt }
GET /users/1/posts     → Posts[10개] (5개만 필요하지만 10개 응답)
GET /users/1/stats     → Stats { followers, following, postCount }
= 3번 요청, Over-fetching 문제
```

### GraphQL 방식

```graphql
query {
  user(id: 1) {
    name
    bio
    posts(first: 5) {    # 필요한 5개만
      title
      createdAt
    }
    stats {
      followerCount      # 필요한 것만 지정
    }
  }
}
= 1번 요청, 필요한 필드만
```

### 선택 기준

```
REST 선택:
- 단순한 CRUD 위주
- 캐싱이 중요한 경우 (HTTP 캐시 헤더 활용)
- 외부에 공개하는 API
- 팀이 REST에 익숙

GraphQL 선택:
- 클라이언트마다 다른 데이터가 필요한 경우
- 다양한 클라이언트 (웹, iOS, Android)
- Over-fetching / Under-fetching이 심한 경우

GraphQL 주의사항:
- N+1 문제 (DataLoader로 해결 필요)
- POST 기반이라 HTTP 캐싱 어려움
- 파일 업로드 별도 처리
```

---

## API 문서화 (Swagger/OpenAPI)

```java
// springdoc-openapi 사용
@Operation(
    summary = "사용자 조회",
    description = "사용자 ID로 사용자 상세 정보를 조회합니다."
)
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공",
        content = @Content(schema = @Schema(implementation = UserResponse.class))),
    @ApiResponse(responseCode = "404", description = "사용자 없음",
        content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
    @ApiResponse(responseCode = "401", description = "인증 필요")
})
@GetMapping("/api/v1/users/{id}")
public ResponseEntity<ApiResponse<UserResponse>> getUser(
    @Parameter(description = "사용자 ID", required = true, example = "1")
    @PathVariable Long id
) {
    return ResponseEntity.ok(ApiResponse.ok(userService.getUser(id)));
}
```

```yaml
# application.yml
springdoc:
  api-docs:
    path: /api-docs          # OpenAPI JSON 경로
  swagger-ui:
    path: /swagger-ui.html   # Swagger UI 경로
    operations-sorter: method
  default-consumes-media-type: application/json
  default-produces-media-type: application/json
```

---

## 트레이드오프 분석

```
Offset vs Cursor 페이지네이션:
──────────────────────────────
Offset
장점: 구현 단순, 특정 페이지 바로 이동 가능
단점: 대용량에서 느림, 데이터 변경 시 중복/누락
적합: 데이터 변경 드문 정적 목록, 관리자 페이지

Cursor
장점: 대용량에서도 일정 성능, 데이터 변경에 안전
단점: 특정 페이지 이동 불가 (무한 스크롤에 적합)
적합: 소셜 피드, 채팅, 무한 스크롤

REST vs GraphQL:
────────────────
REST
장점: 단순, HTTP 캐싱, 팀 익숙
단점: Over/Under-fetching, 다수의 API 호출

GraphQL
장점: 유연한 데이터 요청, 단일 엔드포인트
단점: 복잡도 증가, N+1 위험, 캐싱 어려움
```

---

## 초보자가 자주 하는 실수

**실수 1: GET 요청으로 데이터 변경**

```
GET /users/1/delete   → GET은 부작용 없어야 함
DELETE /users/1       → 올바른 방법
```

**실수 2: 200 OK에 에러 내용 담기**

```json
// 나쁜 예: HTTP 200인데 내용은 에러
HTTP 200 OK
{ "result": "fail", "message": "사용자 없음" }

// 올바른 예
HTTP 404 Not Found
{ "success": false, "errorCode": "USER_NOT_FOUND" }
```

**실수 3: API 버전 없이 배포 후 변경**

```
v1 응답: { "name": "홍길동" }
변경 후: { "firstName": "길동", "lastName": "홍" }
→ 기존 클라이언트 모두 깨짐

올바른 방법:
/api/v1/users/1 → { "name": "홍길동" }      (유지)
/api/v2/users/1 → { "firstName": "길동" }  (신규)
```
