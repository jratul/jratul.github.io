---
title: "예외 처리와 응답 포맷"
order: 4
---

## 기본 예외 처리

Spring Boot는 처리되지 않은 예외를 기본적으로 `/error`로 포워딩합니다. 직접 처리하려면 `@ExceptionHandler`를 사용합니다.

## @RestControllerAdvice

전역 예외 처리기입니다. 모든 Controller의 예외를 한 곳에서 처리합니다.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 비즈니스 예외
    @ExceptionHandler(UserNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleUserNotFound(UserNotFoundException e) {
        return ErrorResponse.of("USER_NOT_FOUND", e.getMessage());
    }

    // 입력값 검증 실패 (@Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .collect(Collectors.joining(", "));
        return ErrorResponse.of("VALIDATION_FAILED", message);
    }

    // 예상치 못한 예외
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleUnexpected(Exception e) {
        log.error("Unexpected error", e);
        return ErrorResponse.of("INTERNAL_ERROR", "서버 오류가 발생했습니다.");
    }
}
```

## 표준 에러 응답 형식

```java
public record ErrorResponse(
    String code,
    String message,
    LocalDateTime timestamp
) {
    public static ErrorResponse of(String code, String message) {
        return new ErrorResponse(code, message, LocalDateTime.now());
    }
}
```

```json
{
  "code": "USER_NOT_FOUND",
  "message": "사용자 ID 42를 찾을 수 없습니다.",
  "timestamp": "2026-03-18T10:30:00"
}
```

## 커스텀 예외

```java
// 기반 예외
public abstract class BusinessException extends RuntimeException {
    private final String code;

    protected BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() { return code; }
}

// 구체적인 예외
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
```

이렇게 하면 `GlobalExceptionHandler`에서 `BusinessException`만 잡아도 됩니다.

```java
@ExceptionHandler(BusinessException.class)
public ResponseEntity<ErrorResponse> handleBusiness(BusinessException e) {
    HttpStatus status = resolveStatus(e.getCode());
    return ResponseEntity.status(status)
        .body(ErrorResponse.of(e.getCode(), e.getMessage()));
}
```

## 입력값 검증

```java
public record CreateUserRequest(
    @NotBlank(message = "이름은 필수입니다.")
    @Size(max = 50, message = "이름은 50자 이하여야 합니다.")
    String name,

    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "올바른 이메일 형식이 아닙니다.")
    String email,

    @NotNull(message = "나이는 필수입니다.")
    @Min(value = 0, message = "나이는 0 이상이어야 합니다.")
    @Max(value = 150, message = "나이는 150 이하여야 합니다.")
    Integer age
) {}
```

```java
@PostMapping
public UserDto create(@RequestBody @Valid CreateUserRequest request) {
    // @Valid가 있으면 검증 실패 시 MethodArgumentNotValidException 발생
    return userService.create(request);
}
```

## HTTP 상태 코드 기준

| 상황 | 상태 코드 |
|------|----------|
| 정상 조회 | 200 OK |
| 정상 생성 | 201 Created |
| 정상 삭제 | 204 No Content |
| 입력값 오류 | 400 Bad Request |
| 인증 필요 | 401 Unauthorized |
| 권한 없음 | 403 Forbidden |
| 리소스 없음 | 404 Not Found |
| 서버 오류 | 500 Internal Server Error |
