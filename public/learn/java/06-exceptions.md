---
title: "예외 처리"
order: 6
---

프로그램을 실행하다 보면 예상치 못한 상황이 발생합니다. 존재하지 않는 파일을 열려고 하거나, 숫자를 0으로 나누거나, 네트워크가 갑자기 끊기는 경우처럼요. 이런 상황을 **예외(Exception)** 라고 하고, 이를 적절히 처리하는 것을 **예외 처리** 라고 합니다.

예외 처리는 자동차의 에어백과 같습니다. 사고가 나지 않으면 필요 없지만, 사고가 나면 최악의 상황을 막아주는 안전장치입니다.

---

## 예외 계층 구조

Java의 모든 예외는 하나의 계층 구조를 이룹니다.

```
Throwable (모든 오류의 최상위)
├── Error          — JVM이 심각한 문제에 부딪혔을 때 (개발자가 처리할 수 없음)
│   ├── OutOfMemoryError     (메모리가 꽉 찼을 때)
│   └── StackOverflowError   (무한 재귀 등)
└── Exception      — 개발자가 처리해야 하는 예외
    ├── Checked Exception    — 반드시 처리하거나 선언해야 함
    │   ├── IOException       (파일, 네트워크 입출력 오류)
    │   ├── SQLException      (데이터베이스 오류)
    │   └── ClassNotFoundException
    └── RuntimeException     — 처리 선택 (하지 않아도 컴파일 가능)
        ├── NullPointerException      (null인 변수 사용)
        ├── ArrayIndexOutOfBoundsException  (배열 범위 초과)
        ├── NumberFormatException     (숫자 변환 실패)
        ├── IllegalArgumentException  (잘못된 인수)
        └── ClassCastException        (잘못된 형변환)
```

**Checked Exception**: 컴파일러가 "이거 처리해!"라고 강제합니다. 파일 읽기, DB 접속 같은 외부 자원을 다룰 때 많이 나옵니다.

**RuntimeException**: 컴파일러가 강제하지 않지만, 런타임에 발생하면 프로그램이 멈춥니다. 대부분 코드 버그가 원인입니다.

---

## try-catch-finally — 예외 잡기

```java
try {
    // 예외가 발생할 수 있는 코드
    int result = 10 / 0;                   // ArithmeticException 발생!
    System.out.println("이 줄은 실행 안 됨");  // 예외 발생 시 이후 코드는 건너뜀
} catch (ArithmeticException e) {
    // 예외가 발생했을 때 처리할 코드
    System.out.println("오류: " + e.getMessage());  // / by zero
} finally {
    // 예외 발생 여부에 상관없이 항상 실행됨 (자원 정리 등)
    System.out.println("항상 실행됩니다");
}
```

### 여러 예외 처리

```java
String input = "abc";  // 숫자가 아닌 문자열

try {
    int number = Integer.parseInt(input);  // NumberFormatException 발생!
    int[] arr = new int[10];
    arr[number] = 42;                      // ArrayIndexOutOfBoundsException 발생 가능
} catch (NumberFormatException e) {
    System.out.println("숫자 형식이 아닙니다: " + input);
} catch (ArrayIndexOutOfBoundsException e) {
    System.out.println("배열 범위를 벗어났습니다");
} catch (Exception e) {
    // 위에서 잡지 못한 모든 예외 (가장 넓은 범위라 마지막에)
    System.out.println("알 수 없는 오류: " + e.getMessage());
}
```

같은 처리를 하는 예외들은 `|`로 묶을 수 있습니다.

```java
try {
    // ...
} catch (IOException | SQLException e) {
    // 두 예외 모두 같은 처리
    System.out.println("입출력 또는 DB 오류: " + e.getMessage());
}
```

---

## try-with-resources — 자동으로 닫히는 자원

파일이나 DB 연결 같은 자원은 사용 후 **반드시 닫아야** 합니다. 안 닫으면 메모리 누수가 발생합니다.

예전에는 `finally`에서 직접 닫았지만, Java 7부터 `try-with-resources`를 쓰면 **자동으로** 닫아줍니다.

```java
// ❌ 예전 방식: finally에서 직접 닫기 (코드가 지저분함)
BufferedReader reader = null;
try {
    reader = new BufferedReader(new FileReader("file.txt"));
    System.out.println(reader.readLine());
} catch (IOException e) {
    e.printStackTrace();
} finally {
    if (reader != null) {
        try {
            reader.close();  // 여기서도 예외 발생 가능 → 처리 필요
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}

// ✅ try-with-resources: 블록이 끝나면 자동으로 close() 호출
try (BufferedReader reader = new BufferedReader(new FileReader("file.txt"))) {
    String line;
    while ((line = reader.readLine()) != null) {
        System.out.println(line);
    }
} catch (IOException e) {
    e.printStackTrace();
}
// 블록 종료 시 reader.close() 자동 호출 (예외 발생해도 닫힘)
```

여러 자원도 함께 열 수 있습니다.

```java
try (
    FileInputStream input  = new FileInputStream("input.txt");
    FileOutputStream output = new FileOutputStream("output.txt")
) {
    // 두 자원 모두 블록 끝에서 자동으로 닫힘
    input.transferTo(output);
} catch (IOException e) {
    System.out.println("파일 처리 오류: " + e.getMessage());
}
```

---

## throws — 예외를 호출자에게 전달

직접 처리하지 않고 "이 메서드는 이런 예외가 날 수 있으니 호출하는 쪽에서 처리하세요"라고 선언합니다.

```java
// throws IOException: 이 메서드에서 IOException이 발생할 수 있음을 선언
public String readFile(String path) throws IOException {
    return Files.readString(Path.of(path));
    // IOException이 발생하면 이 메서드를 호출한 곳으로 전파됨
}

// 호출하는 쪽에서 처리
public void run() {
    try {
        String content = readFile("data.txt");
        System.out.println(content);
    } catch (IOException e) {
        System.out.println("파일 읽기 실패: " + e.getMessage());
    }
}
```

---

## throw — 직접 예외 던지기

예외는 시스템이 던지기도 하지만, 개발자가 직접 던질 수도 있습니다. 유효성 검사에서 잘못된 입력을 받았을 때 많이 씁니다.

```java
public class BankAccount {
    private int balance;

    public void deposit(int amount) {
        if (amount <= 0) {
            // 잘못된 입력 → 직접 예외 던짐
            throw new IllegalArgumentException("입금액은 0보다 커야 합니다. 입력값: " + amount);
        }
        balance += amount;
    }

    public void withdraw(int amount) {
        if (amount > balance) {
            throw new IllegalStateException("잔액 부족. 현재 잔액: " + balance + ", 출금 요청: " + amount);
        }
        balance -= amount;
    }
}

BankAccount account = new BankAccount();
try {
    account.deposit(-100);  // IllegalArgumentException 발생
} catch (IllegalArgumentException e) {
    System.out.println(e.getMessage());  // 입금액은 0보다 커야 합니다. 입력값: -100
}
```

---

## 커스텀 예외 — 나만의 예외 만들기

비즈니스 로직에 맞는 의미 있는 예외를 직접 만들 수 있습니다.

```java
// RuntimeException 상속: 처리 강제하지 않음 (Unchecked)
public class InsufficientBalanceException extends RuntimeException {
    private final int currentBalance;  // 추가 정보 저장 가능
    private final int requestedAmount;

    public InsufficientBalanceException(int currentBalance, int requestedAmount) {
        // 부모 생성자에 메시지 전달
        super("잔액 부족: 현재 잔액 " + currentBalance + "원, 요청 금액 " + requestedAmount + "원");
        this.currentBalance = currentBalance;
        this.requestedAmount = requestedAmount;
    }

    public int getCurrentBalance() { return currentBalance; }
    public int getRequestedAmount() { return requestedAmount; }
}

public class Account {
    private int balance;

    public Account(int balance) { this.balance = balance; }

    public void withdraw(int amount) {
        if (amount > balance) {
            throw new InsufficientBalanceException(balance, amount);
        }
        balance -= amount;
        System.out.println(amount + "원 출금 완료. 잔액: " + balance);
    }
}

// 사용
Account acc = new Account(5000);
try {
    acc.withdraw(10000);  // InsufficientBalanceException 발생
} catch (InsufficientBalanceException e) {
    System.out.println(e.getMessage());
    // 잔액 부족: 현재 잔액 5000원, 요청 금액 10000원
    System.out.println("부족한 금액: " + (e.getRequestedAmount() - e.getCurrentBalance()));
    // 부족한 금액: 5000
}
```

---

## 예외 처리 원칙

### 나쁜 예외 처리

```java
// ❌ 예외를 그냥 삼키기 (무시) — 최악의 패턴
try {
    riskyOperation();
} catch (Exception e) {
    // 아무것도 안 함 → 오류가 발생했는지 알 방법이 없음
}

// ❌ 너무 넓은 범위로 잡기
try {
    // 100줄의 코드
} catch (Exception e) {
    System.out.println("뭔가 잘못됐어요");  // 어디서 터진지 모름
}

// ❌ printStackTrace만 하고 계속 진행
try {
    int[] arr = new int[5];
    System.out.println(arr[10]);  // 범위 초과
} catch (Exception e) {
    e.printStackTrace();  // 로그는 남지만 프로그램이 잘못된 상태로 계속 실행될 수 있음
    // 뒤에서 arr[10]에 의존하는 코드가 있다면 더 큰 문제 발생
}
```

### 좋은 예외 처리

```java
// ✅ 구체적인 예외를 좁은 범위에서 처리
try {
    int value = Integer.parseInt(userInput);
} catch (NumberFormatException e) {
    System.out.println("숫자를 입력해주세요. 입력값: " + userInput);
    return; // 또는 기본값 사용
}

// ✅ 의미 있는 메시지와 함께 예외 변환
public User findUser(Long id) {
    try {
        return userRepository.findById(id);
    } catch (DatabaseException e) {
        // 하위 계층 예외를 비즈니스 예외로 변환
        throw new UserNotFoundException("사용자를 찾을 수 없습니다. ID: " + id, e);
    }
}

// ✅ 복구 가능하면 복구, 불가능하면 적절히 전파
public String readConfig(String path) {
    try {
        return Files.readString(Path.of(path));
    } catch (IOException e) {
        // 설정 파일이 없으면 기본값 사용
        System.out.println("설정 파일 없음, 기본값 사용: " + path);
        return "{}";  // 빈 JSON 반환
    }
}
```

---

## 자주 만나는 예외와 원인

```java
// NullPointerException — null인 변수의 메서드 호출
String text = null;
text.length();  // NullPointerException!

// ✅ null 체크
if (text != null) {
    text.length();
}
// 또는 Optional 사용 (07장에서 다룸)


// NumberFormatException — 숫자 변환 실패
Integer.parseInt("abc");  // NumberFormatException!

// ✅ 예외 처리 또는 검증
String input = "abc";
try {
    int num = Integer.parseInt(input);
} catch (NumberFormatException e) {
    System.out.println("올바른 숫자가 아닙니다");
}


// ArrayIndexOutOfBoundsException — 배열 범위 초과
int[] arr = new int[3];  // 인덱스 0, 1, 2만 존재
arr[5] = 10;  // ArrayIndexOutOfBoundsException!

// ✅ 범위 확인
if (index >= 0 && index < arr.length) {
    arr[index] = 10;
}


// ClassCastException — 잘못된 형변환
Object obj = "hello";
Integer num = (Integer) obj;  // ClassCastException! (String → Integer 불가)

// ✅ instanceof 확인
if (obj instanceof Integer) {
    Integer num = (Integer) obj;
}
```

---

## 예외 정보 확인 메서드

```java
try {
    int result = 10 / 0;
} catch (ArithmeticException e) {
    System.out.println(e.getMessage());   // / by zero  (예외 메시지)
    System.out.println(e.getClass());     // class java.lang.ArithmeticException
    e.printStackTrace();                  // 예외 발생 경로 전체 출력 (디버깅용)
}
```
