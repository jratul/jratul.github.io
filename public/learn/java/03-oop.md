---
title: "클래스와 객체"
order: 3
---

프로그래밍을 하다 보면 "사람", "자동차", "상품" 같은 **실세계의 개념**을 코드로 표현해야 할 때가 많습니다. 이를 위한 Java의 핵심 개념이 바로 **클래스(Class)** 와 **객체(Object)** 입니다.

클래스는 **붕어빵 틀**과 같습니다. 같은 틀로 여러 붕어빵을 찍어낼 수 있듯이, 하나의 클래스로 여러 객체를 만들 수 있습니다. 객체는 그렇게 만들어진 **실제 붕어빵** 입니다.

---

## 클래스 정의

클래스는 **필드(데이터)** 와 **메서드(동작)** 로 구성됩니다.

```java
public class Person {
    // 필드 (인스턴스 변수): 이 객체가 가지는 데이터
    private String name;  // private: 클래스 외부에서 직접 접근 불가
    private int age;

    // 생성자: 객체를 처음 만들 때 호출됨 (클래스명과 동일)
    public Person(String name, int age) {
        this.name = name;  // this.name: 이 객체의 name 필드
        this.age = age;    // name(매개변수)와 구분하기 위해 this. 사용
    }

    // 메서드: 객체가 할 수 있는 동작
    public void introduce() {
        System.out.println("안녕하세요, " + name + "입니다. " + age + "살입니다.");
    }

    // Getter: 외부에서 필드 값을 읽을 때 사용
    public String getName() { return name; }
    public int getAge() { return age; }

    // Setter: 외부에서 필드 값을 변경할 때 사용 (유효성 검사 가능)
    public void setAge(int age) {
        if (age >= 0) this.age = age;  // 0 이상인 경우만 허용
    }
}
```

---

## 객체 생성 및 사용

클래스라는 틀로 실제 객체를 찍어냅니다. `new` 키워드를 사용합니다.

```java
// new Person(...) → 새 객체 생성, alice 변수에 저장
Person alice = new Person("Alice", 30);
Person bob   = new Person("Bob", 25);   // 다른 객체도 만들 수 있음

// 점(.) 으로 메서드 호출
alice.introduce();  // 안녕하세요, Alice입니다. 30살입니다.
bob.introduce();    // 안녕하세요, Bob입니다. 25살입니다.

// Getter로 데이터 읽기
System.out.println(alice.getName());  // Alice

// Setter로 데이터 변경
alice.setAge(31);
System.out.println(alice.getAge());   // 31
```

alice와 bob은 **같은 클래스**에서 만들어졌지만 **서로 독립적인 데이터**를 가집니다. 이것이 객체의 핵심입니다.

---

## 접근 제한자 — 정보 은닉

필드를 `private`으로 막고 메서드를 통해서만 접근하게 하는 것을 **캡슐화(Encapsulation)** 라고 합니다. 자판기처럼 내부 동작은 숨기고 버튼(메서드)만 외부에 공개하는 개념입니다.

| 제한자 | 같은 클래스 | 같은 패키지 | 자식 클래스 | 어디서나 |
|--------|:-----------:|:-----------:|:-----------:|:--------:|
| `private` | ✅ | ❌ | ❌ | ❌ |
| (없음, default) | ✅ | ✅ | ❌ | ❌ |
| `protected` | ✅ | ✅ | ✅ | ❌ |
| `public` | ✅ | ✅ | ✅ | ✅ |

```java
// ❌ private 필드에 직접 접근 — 컴파일 에러
alice.name = "Carol";  // 에러: name has private access in Person

// ✅ 공개된 메서드를 통해 접근
alice.getName();         // OK
alice.setAge(32);        // OK
```

왜 필드를 private로 막을까요? 나이에 음수 값이 들어오는 것처럼, **잘못된 데이터가 들어오는 것을 방지**할 수 있기 때문입니다.

---

## static — 클래스에 속하는 멤버

일반 필드와 메서드는 **객체마다** 따로 존재합니다. 반면 `static` 멤버는 **클래스 전체에서 딱 하나**만 존재하고 모든 객체가 공유합니다.

학교 교실 비유로 생각해보세요. 학생(객체)마다 이름이 다르지만, 교실 이름(static)은 모든 학생이 공유합니다.

```java
public class Counter {
    private static int count = 0;  // static: 모든 Counter 객체가 공유
    private int id;                // 인스턴스 변수: 객체마다 따로 존재

    public Counter() {
        count++;          // 객체가 만들어질 때마다 공유 카운터 증가
        this.id = count;  // 이 객체의 고유 번호 저장
    }

    public static int getCount() { return count; }  // static 메서드
    public int getId() { return id; }
}

Counter a = new Counter();  // count = 1, a.id = 1
Counter b = new Counter();  // count = 2, b.id = 2
Counter c = new Counter();  // count = 3, c.id = 3

// static 메서드는 클래스명으로 호출
System.out.println(Counter.getCount());  // 3 (모든 객체가 공유한 값)
System.out.println(a.getId());           // 1 (a만의 값)
System.out.println(b.getId());           // 2 (b만의 값)
```

`Math.sqrt()`, `Integer.parseInt()` 처럼 자주 쓰는 유틸리티 메서드들도 static입니다.

---

## 생성자 오버로딩

같은 이름의 생성자를 매개변수만 다르게 여러 개 만들 수 있습니다. 이를 **오버로딩(Overloading)** 이라고 합니다.

```java
public class Rectangle {
    private int width;
    private int height;

    // 기본 생성자: 인수 없이 호출하면 1x1 직사각형
    public Rectangle() {
        this(1, 1);  // this(...): 같은 클래스의 다른 생성자 호출
    }

    // 정사각형 생성자: 가로=세로인 경우
    public Rectangle(int size) {
        this(size, size);  // 한 값으로 가로, 세로 모두 설정
    }

    // 직사각형 생성자: 가로와 세로가 다른 경우
    public Rectangle(int width, int height) {
        this.width = width;
        this.height = height;
    }

    public int area() {
        return width * height;  // 넓이 계산
    }

    public String toString() {
        return width + "x" + height + " (넓이: " + area() + ")";
    }
}

Rectangle r1 = new Rectangle();        // 1x1, area=1
Rectangle r2 = new Rectangle(5);       // 5x5, area=25
Rectangle r3 = new Rectangle(3, 4);    // 3x4, area=12

System.out.println(r1);  // 1x1 (넓이: 1)
System.out.println(r2);  // 5x5 (넓이: 25)
System.out.println(r3);  // 3x4 (넓이: 12)
```

---

## toString, equals, hashCode

Java의 모든 클래스는 `Object` 클래스를 자동으로 상속받습니다. `Object`에는 유용한 메서드들이 있고, 이를 **오버라이드(Override)** 해서 클래스에 맞게 재정의할 수 있습니다.

### toString — 객체를 문자열로 표현

```java
public class Point {
    private int x, y;

    public Point(int x, int y) {
        this.x = x;
        this.y = y;
    }

    // toString이 없으면 "Point@1a2b3c" 같은 의미 없는 주소가 출력됨
    @Override
    public String toString() {
        return "Point(" + x + ", " + y + ")";
    }
}

Point p = new Point(3, 4);
System.out.println(p);           // Point(3, 4)   ← toString 자동 호출
System.out.println("위치: " + p); // 위치: Point(3, 4)
```

### equals — 내용 비교

```java
Point p1 = new Point(1, 2);
Point p2 = new Point(1, 2);

// equals 미재정의 시: 메모리 주소 비교 (다른 객체 → false)
System.out.println(p1 == p2);        // false (다른 객체)
System.out.println(p1.equals(p2));   // false (기본 equals도 주소 비교)
```

```java
public class Point {
    private int x, y;

    public Point(int x, int y) { this.x = x; this.y = y; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;              // 같은 객체면 true
        if (!(o instanceof Point)) return false; // 타입이 다르면 false
        Point p = (Point) o;
        return x == p.x && y == p.y;            // 필드 값 비교
    }

    // equals를 재정의하면 hashCode도 반드시 재정의해야 함
    @Override
    public int hashCode() {
        return Objects.hash(x, y);  // x, y를 기반으로 해시 코드 생성
    }
}

Point p1 = new Point(1, 2);
Point p2 = new Point(1, 2);

System.out.println(p1.equals(p2));  // true (내용이 같으니 true)
System.out.println(p1 == p2);       // false (여전히 다른 객체)
```

`String`의 `equals`도 내용을 비교합니다. `"hello".equals("hello")`가 `true`인 것도 이 때문입니다.

---

## 자주 하는 실수들

```java
// ❌ 실수 1: start() 대신 run() 직접 호출 (나중에 스레드에서도 중요)
// → this를 빠뜨리면 어떻게 될까?

public class BankAccount {
    private int balance = 1000;

    public void deposit(int amount) {
        balance = balance + amount;  // OK: this.balance와 동일
    }

    // ❌ 아래처럼 매개변수명과 필드명이 같을 때 this를 빠뜨리면 문제
    public void setBalance(int balance) {
        balance = balance;  // 잘못됨: 매개변수 자신에게 대입 (필드 안 바뀜)
    }

    // ✅ this로 명확히 구분
    public void setBalanceCorrect(int balance) {
        this.balance = balance;  // this.balance: 필드, balance: 매개변수
    }
}
```

```java
// ❌ 실수 2: static 메서드에서 인스턴스 변수 접근
public class Example {
    private int value = 10;

    public static void staticMethod() {
        System.out.println(value);  // 컴파일 에러! static에서 인스턴스 변수 접근 불가
        // static 메서드는 어떤 특정 객체에 속하지 않기 때문
    }
}
```

```java
// ❌ 실수 3: 생성자를 호출할 때 new 빠뜨리기
Person alice = Person("Alice", 30);  // 컴파일 에러
Person alice = new Person("Alice", 30);  // ✅ new 필요
```

---

## 전체 예제 — 은행 계좌

배운 내용을 종합한 예제입니다.

```java
public class BankAccount {
    private String owner;     // 계좌 주인
    private int balance;      // 잔액
    private static int totalAccounts = 0;  // 전체 계좌 수 (공유)

    // 계좌 생성
    public BankAccount(String owner, int initialBalance) {
        this.owner = owner;
        this.balance = initialBalance;
        totalAccounts++;  // 계좌가 만들어질 때마다 증가
    }

    // 입금
    public void deposit(int amount) {
        if (amount <= 0) {
            System.out.println("입금액은 0보다 커야 합니다.");
            return;
        }
        balance += amount;
        System.out.println(owner + " 계좌에 " + amount + "원 입금. 잔액: " + balance);
    }

    // 출금
    public void withdraw(int amount) {
        if (amount > balance) {
            System.out.println("잔액 부족! 현재 잔액: " + balance);
            return;
        }
        balance -= amount;
        System.out.println(owner + " 계좌에서 " + amount + "원 출금. 잔액: " + balance);
    }

    // 잔액 조회
    public int getBalance() { return balance; }

    // 전체 계좌 수 조회 (static)
    public static int getTotalAccounts() { return totalAccounts; }

    @Override
    public String toString() {
        return owner + "의 계좌 (잔액: " + balance + "원)";
    }
}

// 사용
BankAccount alice = new BankAccount("Alice", 10000);
BankAccount bob   = new BankAccount("Bob", 5000);

alice.deposit(3000);    // Alice 계좌에 3000원 입금. 잔액: 13000
bob.withdraw(10000);    // 잔액 부족! 현재 잔액: 5000
bob.withdraw(2000);     // Bob 계좌에서 2000원 출금. 잔액: 3000

System.out.println(BankAccount.getTotalAccounts());  // 2
System.out.println(alice);  // Alice의 계좌 (잔액: 13000원)
```
