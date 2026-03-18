---
title: "예외 처리"
order: 6
---

## 예외 계층 구조

```
Throwable
├── Error          - JVM 수준 오류 (OutOfMemoryError 등), 처리 불가
└── Exception
    ├── Checked Exception   - 반드시 처리 또는 선언 필요
    │   ├── IOException
    │   ├── SQLException
    │   └── ...
    └── RuntimeException    - Unchecked, 처리 선택
        ├── NullPointerException
        ├── ArrayIndexOutOfBoundsException
        ├── IllegalArgumentException
        └── ...
```

## try-catch-finally

```java
try {
    int result = 10 / 0;
} catch (ArithmeticException e) {
    System.out.println("산술 오류: " + e.getMessage());
} catch (Exception e) {
    System.out.println("알 수 없는 오류: " + e.getMessage());
} finally {
    System.out.println("항상 실행됨");  // 예외 여부와 관계없이
}
```

여러 예외를 한 번에 잡을 수도 있습니다.

```java
try {
    // ...
} catch (IOException | SQLException e) {
    System.out.println("입출력 또는 DB 오류: " + e.getMessage());
}
```

## try-with-resources

`Closeable` 자원을 자동으로 닫아줍니다. `finally`에서 `close()`를 직접 호출할 필요가 없습니다.

```java
try (BufferedReader br = new BufferedReader(new FileReader("file.txt"))) {
    String line;
    while ((line = br.readLine()) != null) {
        System.out.println(line);
    }
} catch (IOException e) {
    e.printStackTrace();
}
// br.close()가 자동 호출됨
```

## throws 선언

Checked Exception을 직접 처리하지 않고 호출자에게 위임합니다.

```java
public String readFile(String path) throws IOException {
    return Files.readString(Path.of(path));
}

// 호출하는 쪽에서 처리
try {
    String content = readFile("data.txt");
} catch (IOException e) {
    System.out.println("파일 읽기 실패: " + e.getMessage());
}
```

## 커스텀 예외

```java
public class InsufficientBalanceException extends RuntimeException {
    private final int amount;

    public InsufficientBalanceException(int amount) {
        super("잔액 부족: " + amount + "원이 필요합니다.");
        this.amount = amount;
    }

    public int getAmount() { return amount; }
}

public class Account {
    private int balance;

    public void withdraw(int amount) {
        if (amount > balance) {
            throw new InsufficientBalanceException(amount - balance);
        }
        balance -= amount;
    }
}
```

## 예외 처리 원칙

```java
// ❌ 예외를 무시하면 안 됨
try {
    riskyOperation();
} catch (Exception e) {
    // 아무것도 안 함
}

// ❌ 너무 넓은 범위로 잡으면 안 됨
try {
    // 100줄의 코드
} catch (Exception e) {
    // 어디서 터진지 모름
}

// ✅ 구체적인 예외를 좁은 범위에서
try {
    int value = Integer.parseInt(input);
} catch (NumberFormatException e) {
    System.out.println("숫자 형식이 아닙니다: " + input);
}
```
