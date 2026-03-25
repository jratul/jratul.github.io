---
title: "예외 처리와 응답 포맷"
order: 4
---

## 예외 처리가 왜 중요한가요?

예외를 제대로 처리하지 않으면 두 가지 문제가 생깁니다:

1. **보안 문제**: 스택 트레이스(오류 상세 정보)가 그대로 응답으로 나가면 서버 내부 구조가 노출됨
2. **UX 문제**: 프론트엔드 개발자가 오류를 처리하기 어려워짐

Spring Boot의 기본 동작을 먼저 확인해 보겠습니다:

```bash
# 예외 처리를 아무것도 안 하면 Spring Boot 기본 응답:
{
  "timestamp": "2026-03-25T10:30:00.000+00:00",
  "status": 500,
  "error": "Internal Server Error",
  "path": "/api/users/99"
}
# → 어떤 오류인지 알 수가 없음!
```

우리가 원하는 응답:

```json
{
  "code": "USER_NOT_FOUND",
  "message": "사용자 ID 99를 찾을 수 없습니다.",
  "timestamp": "2026-03-25T10:30:00"
}
```

---

## 표준 에러 응답 형식 만들기

먼저 API 전체에서 일관되게 쓸 에러 응답 객체를 만듭니다:

```java
// 모든 API 오류 응답에 사용할 표준 형식
public record ErrorResponse(
    String code,              // 오류 코드 (프론트에서 구분에 사용)
    String message,           // 사람이 읽을 수 있는 오류 메시지
    LocalDateTime timestamp   // 오류 발생 시각
) {
    // 정적 팩토리 메서드 — 편리하게 생성
    public static ErrorResponse of(String code, String message) {
        return new ErrorResponse(code, message, LocalDateTime.now());
    }
}
```

응답 예시:

```json
{
  "code": "USER_NOT_FOUND",
  "message": "사용자 ID 99를 찾을 수 없습니다.",
  "timestamp": "2026-03-25T10:30:00"
}
```

---

## 커스텀 예외 클래스 만들기

예외를 계층 구조로 설계하면 처리가 편리해집니다:

```java
// 1단계: 기반 예외 클래스 (모든 비즈니스 예외의 부모)
public abstract class BusinessException extends RuntimeException {
    private final String code;  // 에러 코드

    protected BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() { return code; }
}

// 2단계: 구체적인 예외 클래스들
public class UserNotFoundException extends BusinessException {
    public UserNotFoundException(Long id) {
        super("USER_NOT_FOUND", "사용자 ID " + id + "를 찾을 수 없습니다.");
    }
}

public class EmailAlreadyExistsException extends BusinessException {
    public EmailAlreadyExistsException(String email) {
        super("EMAIL_ALREADY_EXISTS", "이메일 " + email + "은 이미 사용 중입니다.");
    }
}

public class InsufficientStockException extends BusinessException {
    public InsufficientStockException(Long productId, int requested, int available) {
        super("INSUFFICIENT_STOCK",
            "상품 " + productId + ": 요청 수량 " + requested + ", 재고 " + available);
    }
}

public class OrderNotFoundException extends BusinessException {
    public OrderNotFoundException(Long id) {
        super("ORDER_NOT_FOUND", "주문 ID " + id + "를 찾을 수 없습니다.");
    }
}
```

이렇게 하면 Service 코드가 자연스러워집니다:

```java
@Service
public class UserService {
    public UserDto findById(Long id) {
        return userRepository.findById(id)
            .map(UserDto::from)
            .orElseThrow(() -> new UserNotFoundException(id));  // 명확한 예외
    }
}
```

---

## @RestControllerAdvice — 전역 예외 처리기

모든 Controller에서 발생하는 예외를 한 곳에서 처리합니다. 각 Controller마다 try-catch를 쓸 필요가 없어집니다.

```java
@RestControllerAdvice  // 모든 @RestController에서 발생하는 예외를 잡음
@Slf4j                 // Lombok: log 필드 자동 생성
public class GlobalExceptionHandler {

    // 우리가 정의한 비즈니스 예외 처리
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException e) {
        log.warn("비즈니스 예외 발생: code={}, message={}", e.getCode(), e.getMessage());

        // 에러 코드에 따라 HTTP 상태 코드 결정
        HttpStatus status = resolveHttpStatus(e.getCode());
        return ResponseEntity.status(status)
            .body(ErrorResponse.of(e.getCode(), e.getMessage()));
    }

    // 입력값 검증 실패 (@RequestBody @Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidationException(MethodArgumentNotValidException e) {
        // 모든 필드 오류를 하나의 메시지로 합침
        String message = e.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .collect(Collectors.joining(", "));

        log.warn("입력값 검증 실패: {}", message);
        return ErrorResponse.of("VALIDATION_FAILED", message);
    }

    // @PathVariable, @RequestParam 타입 불일치
    // 예: GET /users/abc (abc는 Long으로 변환 불가)
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        String message = "파라미터 '" + e.getName() + "'의 값이 올바르지 않습니다: " + e.getValue();
        return ErrorResponse.of("INVALID_PARAMETER", message);
    }

    // 존재하지 않는 URL 요청
    @ExceptionHandler(NoHandlerFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(NoHandlerFoundException e) {
        return ErrorResponse.of("NOT_FOUND", "요청한 URL을 찾을 수 없습니다: " + e.getRequestURL());
    }

    // HTTP 메서드 불일치 (GET으로 요청했는데 POST만 허용하는 경우)
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    @ResponseStatus(HttpStatus.METHOD_NOT_ALLOWED)
    public ErrorResponse handleMethodNotAllowed(HttpRequestMethodNotSupportedException e) {
        return ErrorResponse.of("METHOD_NOT_ALLOWED",
            "허용되지 않는 HTTP 메서드: " + e.getMethod());
    }

    // 예상치 못한 모든 예외 (마지막 보루)
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleUnexpectedException(Exception e) {
        // 운영에서는 스택 트레이스 전체를 로그로만 남기고, 응답에는 일반 메시지만
        log.error("예상치 못한 오류 발생", e);
        return ErrorResponse.of("INTERNAL_ERROR", "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }

    // 에러 코드 → HTTP 상태 코드 변환
    private HttpStatus resolveHttpStatus(String code) {
        return switch (code) {
            case "USER_NOT_FOUND", "ORDER_NOT_FOUND", "PRODUCT_NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "EMAIL_ALREADY_EXISTS", "DUPLICATE_ORDER" -> HttpStatus.CONFLICT;
            case "INSUFFICIENT_STOCK", "INVALID_PARAMETER" -> HttpStatus.BAD_REQUEST;
            case "UNAUTHORIZED" -> HttpStatus.UNAUTHORIZED;
            case "ACCESS_DENIED" -> HttpStatus.FORBIDDEN;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }
}
```

---

## 입력값 검증 (@Valid)

요청 데이터가 올바른지 자동으로 검증합니다. `build.gradle`에 아래 의존성이 필요합니다:

```groovy
implementation 'org.springframework.boot:spring-boot-starter-validation'
```

```java
public record CreateUserRequest(
    @NotBlank(message = "이름은 필수입니다.")
    @Size(min = 2, max = 50, message = "이름은 2자 이상 50자 이하여야 합니다.")
    String name,

    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "올바른 이메일 형식이 아닙니다.")
    String email,

    @NotBlank(message = "비밀번호는 필수입니다.")
    @Size(min = 8, message = "비밀번호는 8자 이상이어야 합니다.")
    String password,

    @NotNull(message = "나이는 필수입니다.")
    @Min(value = 0, message = "나이는 0 이상이어야 합니다.")
    @Max(value = 150, message = "나이는 150 이하여야 합니다.")
    Integer age
) {}
```

Controller에서 `@Valid`를 붙이면 자동 검증:

```java
@PostMapping
@ResponseStatus(HttpStatus.CREATED)
public UserDto create(@RequestBody @Valid CreateUserRequest request) {
    // @Valid가 검증 실패하면 MethodArgumentNotValidException 발생
    // GlobalExceptionHandler가 자동으로 처리해줌
    return userService.create(request);
}
```

검증 실패 시 응답:

```json
{
  "code": "VALIDATION_FAILED",
  "message": "email: 올바른 이메일 형식이 아닙니다., password: 비밀번호는 8자 이상이어야 합니다.",
  "timestamp": "2026-03-25T10:30:00"
}
```

### 커스텀 검증 어노테이션

기본 제공 어노테이션으로 부족할 때 직접 만들 수 있습니다:

```java
// 전화번호 형식 검증 어노테이션
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PhoneNumberValidator.class)
public @interface ValidPhoneNumber {
    String message() default "올바른 전화번호 형식이 아닙니다.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

// 실제 검증 로직
public class PhoneNumberValidator implements ConstraintValidator<ValidPhoneNumber, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) return true;  // null은 @NotNull이 처리
        return value.matches("^\\d{3}-\\d{3,4}-\\d{4}$");  // 010-1234-5678 형식
    }
}

// 사용
public record CreateUserRequest(
    @NotBlank String name,
    @ValidPhoneNumber String phone  // 커스텀 어노테이션 사용
) {}
```

---

## HTTP 상태 코드 가이드

올바른 상태 코드를 반환하는 것이 좋은 API의 기본입니다:

| 상황 | 상태 코드 | 예시 |
|------|----------|------|
| 조회 성공 | 200 OK | 사용자 정보 반환 |
| 생성 성공 | 201 Created | 새 사용자 등록 |
| 삭제 성공 | 204 No Content | 사용자 삭제 (응답 바디 없음) |
| 입력값 오류 | 400 Bad Request | 이메일 형식 오류, 필수값 누락 |
| 인증 필요 | 401 Unauthorized | 로그인 안 한 상태에서 접근 |
| 권한 없음 | 403 Forbidden | 일반 사용자가 관리자 API 접근 |
| 리소스 없음 | 404 Not Found | 존재하지 않는 사용자 ID 조회 |
| 중복 | 409 Conflict | 이미 있는 이메일로 회원가입 |
| 서버 오류 | 500 Internal Server Error | 예상치 못한 서버 오류 |

---

## 자주 하는 실수들

```java
// ❌ 실수 1: 스택 트레이스를 응답에 포함
@ExceptionHandler(Exception.class)
public ErrorResponse handleException(Exception e) {
    return ErrorResponse.of("ERROR", e.getMessage());
    // e.getMessage()에 내부 정보가 포함될 수 있음
    // 예: "Connection to db.internal:5432 refused" → DB 정보 노출!
}

// ✅ 해결: 일반적인 메시지만 응답으로, 상세 내용은 로그로
@ExceptionHandler(Exception.class)
public ErrorResponse handleException(Exception e) {
    log.error("Unexpected error", e);  // 로그에는 전체 스택 트레이스 저장
    return ErrorResponse.of("INTERNAL_ERROR", "서버 오류가 발생했습니다.");
}

// ❌ 실수 2: CheckedException에 @Transactional 롤백이 안 됨
@Transactional
public void processFile(String path) throws IOException {  // CheckedException
    // IOException 발생 시 기본적으로 롤백 안 됨!
    saveToDb();
    parseFile(path);  // 여기서 IOException 발생
    // saveToDb()는 커밋됨 → 데이터 불일치
}

// ✅ 해결: rollbackFor 지정 또는 RuntimeException으로 래핑
@Transactional(rollbackFor = Exception.class)
public void processFile(String path) throws IOException {
    saveToDb();
    parseFile(path);
}

// ❌ 실수 3: 모든 예외를 500으로 처리
@ExceptionHandler(Exception.class)
@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)  // 모든 예외를 500으로!
public ErrorResponse handleAll(Exception e) { ... }

// ✅ 해결: 예외 타입별로 적절한 상태 코드
@ExceptionHandler(UserNotFoundException.class)
@ResponseStatus(HttpStatus.NOT_FOUND)  // 404로
public ErrorResponse handleNotFound(UserNotFoundException e) { ... }
```

---

## 실전 예제 — 주문 생성 API의 예외 처리

```java
// Service
@Service
@Transactional
public class OrderService {

    public OrderDto createOrder(Long userId, CreateOrderRequest request) {
        // 1. 사용자 존재 확인
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));

        // 2. 상품 존재 확인
        Product product = productRepository.findById(request.productId())
            .orElseThrow(() -> new ProductNotFoundException(request.productId()));

        // 3. 재고 확인
        if (product.getStock() < request.quantity()) {
            throw new InsufficientStockException(
                request.productId(), request.quantity(), product.getStock()
            );
        }

        // 4. 주문 생성
        product.decreaseStock(request.quantity());
        Order order = Order.create(user, product, request.quantity());
        return OrderDto.from(orderRepository.save(order));
    }
}

// 각 예외에 대한 응답:
// UserNotFoundException    → 404: "사용자 ID 1을 찾을 수 없습니다."
// ProductNotFoundException → 404: "상품 ID 10을 찾을 수 없습니다."
// InsufficientStockException → 400: "상품 10: 요청 수량 5, 재고 2"
```
