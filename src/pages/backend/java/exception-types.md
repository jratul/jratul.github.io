---
title: "Java의 Checked Exception과 Unchecked Exception"
date: "2026-01-12"
tags: ["java", "exception", "error-handling", "backend"]
excerpt: "Java의 예외 처리에서 Checked Exception과 Unchecked Exception의 차이점과 사용법을 알아봅니다."
---

# Java의 Checked Exception과 Unchecked Exception

Java의 예외는 컴파일 시점에 체크 여부에 따라 Checked Exception과 Unchecked Exception으로 나뉩니다.

## 예외 계층 구조

```
Throwable
├── Error (시스템 레벨 오류)
│   ├── OutOfMemoryError
│   ├── StackOverflowError
│   └── ...
└── Exception (프로그램 레벨 예외)
    ├── RuntimeException (Unchecked)
    │   ├── NullPointerException
    │   ├── IllegalArgumentException
    │   ├── IndexOutOfBoundsException
    │   └── ...
    └── IOException (Checked)
        ├── FileNotFoundException
        ├── SQLException
        └── ...
```

---

## Checked Exception

**컴파일 시점에 확인되는 예외**입니다. 반드시 처리해야 합니다.

### 특징

- `RuntimeException`을 상속하지 않음
- 컴파일러가 예외 처리 강제
- 복구 가능한 예외
- 트랜잭션 롤백 안 함 (Spring)

---

### 대표적인 Checked Exception

```java
// IOException
FileReader file = new FileReader("file.txt");

// SQLException
Connection conn = DriverManager.getConnection(url);

// ClassNotFoundException
Class.forName("com.example.Driver");

// InterruptedException
Thread.sleep(1000);
```

---

### 처리 방법 1: try-catch

```java
public void readFile() {
    try {
        FileReader file = new FileReader("file.txt");
        // 파일 읽기
    } catch (FileNotFoundException e) {
        System.out.println("파일을 찾을 수 없습니다: " + e.getMessage());
    }
}
```

---

### 처리 방법 2: throws

```java
public void readFile() throws FileNotFoundException {
    FileReader file = new FileReader("file.txt");
    // 파일 읽기
}

// 호출하는 쪽에서 처리
public void caller() {
    try {
        readFile();
    } catch (FileNotFoundException e) {
        // 예외 처리
    }
}
```

---

### 처리하지 않으면?

```java
// ❌ 컴파일 에러
public void readFile() {
    FileReader file = new FileReader("file.txt");  // 에러!
}

// Error: Unhandled exception: java.io.FileNotFoundException
```

---

## Unchecked Exception

**컴파일 시점에 확인되지 않는 예외**입니다. 처리가 선택사항입니다.

### 특징

- `RuntimeException`을 상속
- 컴파일러가 예외 처리 강제 안 함
- 프로그래밍 오류
- 트랜잭션 롤백 (Spring)

---

### 대표적인 Unchecked Exception

```java
// NullPointerException
String str = null;
str.length();  // NPE 발생

// IllegalArgumentException
public void setAge(int age) {
    if (age < 0) {
        throw new IllegalArgumentException("나이는 0 이상이어야 합니다");
    }
}

// ArrayIndexOutOfBoundsException
int[] arr = {1, 2, 3};
int value = arr[10];  // 인덱스 초과

// ArithmeticException
int result = 10 / 0;  // 0으로 나누기
```

---

### 처리는 선택사항

```java
// ✅ 처리 안 해도 컴파일 성공
public void divide(int a, int b) {
    int result = a / b;  // ArithmeticException 발생 가능
}

// 필요하면 처리
public void divide(int a, int b) {
    try {
        int result = a / b;
    } catch (ArithmeticException e) {
        System.out.println("0으로 나눌 수 없습니다");
    }
}
```

---

## 차이점 비교

| 구분 | Checked | Unchecked |
|-----|---------|-----------|
| 상속 | Exception | RuntimeException |
| 처리 | 필수 | 선택 |
| 확인 시점 | 컴파일 타임 | 런타임 |
| 예시 | IOException, SQLException | NPE, IllegalArgumentException |
| 목적 | 복구 가능한 예외 | 프로그래밍 오류 |
| 트랜잭션 | 롤백 안 함 (Spring) | 롤백 (Spring) |

---

## 사용 기준

### Checked Exception 사용

**복구 가능한 예외**

```java
// 파일 없으면 기본값 사용
public String readConfig() {
    try {
        return Files.readString(Path.of("config.txt"));
    } catch (IOException e) {
        return "default-config";  // 복구
    }
}

// API 호출 실패 시 재시도
public Response callApi() throws ApiException {
    int retries = 3;
    while (retries > 0) {
        try {
            return api.call();
        } catch (ApiException e) {
            retries--;
            if (retries == 0) throw e;
        }
    }
}
```

---

### Unchecked Exception 사용

**프로그래밍 오류**

```java
// 잘못된 인자
public void setAge(int age) {
    if (age < 0 || age > 150) {
        throw new IllegalArgumentException("유효하지 않은 나이: " + age);
    }
    this.age = age;
}

// null 체크
public void process(User user) {
    Objects.requireNonNull(user, "user는 null일 수 없습니다");
    // 처리
}

// 상태 체크
public void withdraw(int amount) {
    if (balance < amount) {
        throw new IllegalStateException("잔액 부족");
    }
    balance -= amount;
}
```

---

## 실전 예제

### 예제 1: 파일 처리

```java
// Checked Exception
public List<String> readLines(String filename) throws IOException {
    try (BufferedReader br = new BufferedReader(new FileReader(filename))) {
        List<String> lines = new ArrayList<>();
        String line;
        while ((line = br.readLine()) != null) {
            lines.add(line);
        }
        return lines;
    }
}

// 호출하는 쪽
public void processFile() {
    try {
        List<String> lines = readLines("data.txt");
        // 처리
    } catch (IOException e) {
        log.error("파일 읽기 실패", e);
        // 대체 처리
    }
}
```

---

### 예제 2: 사용자 입력 검증

```java
// Unchecked Exception
public class User {
    private String email;
    private int age;

    public void setEmail(String email) {
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("유효하지 않은 이메일");
        }
        this.email = email;
    }

    public void setAge(int age) {
        if (age < 0 || age > 150) {
            throw new IllegalArgumentException("유효하지 않은 나이");
        }
        this.age = age;
    }
}
```

---

### 예제 3: 커스텀 예외

```java
// Checked Exception - 복구 가능
public class UserNotFoundException extends Exception {
    public UserNotFoundException(Long userId) {
        super("사용자를 찾을 수 없습니다: " + userId);
    }
}

// Unchecked Exception - 프로그래밍 오류
public class InvalidUserStateException extends RuntimeException {
    public InvalidUserStateException(String message) {
        super(message);
    }
}

// 사용
public User findUser(Long id) throws UserNotFoundException {
    return userRepository.findById(id)
        .orElseThrow(() -> new UserNotFoundException(id));
}

public void activateUser(User user) {
    if (user.isDeleted()) {
        throw new InvalidUserStateException("삭제된 사용자는 활성화할 수 없습니다");
    }
    user.setActive(true);
}
```

---

## Spring에서의 예외 처리

### 트랜잭션 롤백

```java
@Transactional
public void updateUser(User user) throws UserNotFoundException {
    // Checked Exception: 롤백 안 됨
    User existingUser = findUser(user.getId());  // UserNotFoundException

    // Unchecked Exception: 롤백 됨
    validateUser(user);  // IllegalArgumentException

    userRepository.save(user);
}

// 롤백 설정 변경
@Transactional(rollbackFor = UserNotFoundException.class)
public void updateUser(User user) throws UserNotFoundException {
    // Checked Exception도 롤백
}
```

---

### @ControllerAdvice로 전역 처리

```java
@ControllerAdvice
public class GlobalExceptionHandler {

    // Unchecked Exception
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
        IllegalArgumentException e
    ) {
        return ResponseEntity
            .badRequest()
            .body(new ErrorResponse(e.getMessage()));
    }

    // Checked Exception
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(
        UserNotFoundException e
    ) {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse(e.getMessage()));
    }

    // 모든 예외
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception e) {
        log.error("Unexpected error", e);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("서버 오류가 발생했습니다"));
    }
}
```

---

## 예외 변환

### Checked → Unchecked

```java
// 저수준 Checked Exception을 고수준 Unchecked Exception으로
public User findUser(Long id) {
    try {
        return jdbcTemplate.queryForObject(
            "SELECT * FROM users WHERE id = ?",
            userRowMapper,
            id
        );
    } catch (EmptyResultDataAccessException e) {
        // Checked를 Unchecked로 변환
        throw new UserNotFoundException(id);
    }
}
```

---

### 예외 체이닝

```java
public void processData(String filename) {
    try {
        String data = Files.readString(Path.of(filename));
        // 처리
    } catch (IOException e) {
        // 원본 예외를 포함
        throw new DataProcessingException("데이터 처리 실패", e);
    }
}

// 스택 트레이스에서 원인 확인 가능
try {
    processData("file.txt");
} catch (DataProcessingException e) {
    Throwable cause = e.getCause();  // IOException
}
```

---

## 모범 사례

### 1. 구체적인 예외 던지기

```java
// ❌ 너무 일반적
public void process() throws Exception {
    // ...
}

// ✅ 구체적
public void process() throws IOException, SQLException {
    // ...
}
```

---

### 2. 예외 삼키지 않기

```java
// ❌ 예외 무시
try {
    riskyOperation();
} catch (Exception e) {
    // 아무것도 안 함
}

// ✅ 최소한 로깅
try {
    riskyOperation();
} catch (Exception e) {
    log.error("작업 실패", e);
    throw e;  // 또는 다시 던지기
}
```

---

### 3. finally 대신 try-with-resources

```java
// ❌ finally 사용
BufferedReader br = null;
try {
    br = new BufferedReader(new FileReader("file.txt"));
    // 읽기
} catch (IOException e) {
    // 처리
} finally {
    if (br != null) {
        try {
            br.close();
        } catch (IOException e) {
            // 처리
        }
    }
}

// ✅ try-with-resources
try (BufferedReader br = new BufferedReader(new FileReader("file.txt"))) {
    // 읽기
} catch (IOException e) {
    // 처리
}  // 자동으로 close
```

---

### 4. 적절한 예외 타입 선택

```java
// 복구 가능 → Checked
public Data loadData() throws DataNotFoundException {
    // 데이터 로드 실패 시 재시도 가능
}

// 프로그래밍 오류 → Unchecked
public void setAge(int age) {
    if (age < 0) {
        throw new IllegalArgumentException("나이는 0 이상");
    }
}
```

---

## 주의사항

### 1. Checked Exception 남용

```java
// ❌ 모든 메서드에 throws
public void method1() throws Exception {
    method2();
}

public void method2() throws Exception {
    method3();
}

public void method3() throws Exception {
    // ...
}

// ✅ 적절한 지점에서 처리
public void method1() {
    try {
        method2();
    } catch (SpecificException e) {
        // 처리
    }
}
```

---

### 2. 예외로 흐름 제어

```java
// ❌ 정상 흐름을 예외로
try {
    return array[index];
} catch (ArrayIndexOutOfBoundsException e) {
    return defaultValue;
}

// ✅ 조건문 사용
if (index >= 0 && index < array.length) {
    return array[index];
} else {
    return defaultValue;
}
```

---

### 3. 과도한 catch

```java
// ❌ 너무 광범위
try {
    // ...
} catch (Throwable t) {
    // Error도 잡힘 (OutOfMemoryError 등)
}

// ✅ 필요한 예외만
try {
    // ...
} catch (IOException e) {
    // 처리
}
```

---

## 요약

1. **Checked Exception**: 컴파일 타임 체크, 처리 필수, 복구 가능
2. **Unchecked Exception**: 런타임 체크, 처리 선택, 프로그래밍 오류
3. **사용 기준**: 복구 가능하면 Checked, 프로그래밍 오류면 Unchecked
4. **Spring 트랜잭션**: Unchecked만 자동 롤백
5. **예외 변환**: 저수준을 고수준으로
6. **모범 사례**: 구체적 예외, 로깅, try-with-resources

적절한 예외 타입 선택과 처리 전략은 안정적이고 유지보수하기 좋은 코드를 만드는 핵심입니다.