---
title: "상속과 인터페이스"
order: 4
---

프로그래밍을 하다 보면 비슷한 클래스를 여러 개 만들어야 할 때가 있습니다. 예를 들어 `Dog`, `Cat`, `Bird` 클래스는 모두 이름이 있고, 먹고, 소리를 내는 공통점이 있습니다. 이 공통 부분을 한 곳에 모아두고 **물려받아** 재사용하는 것이 **상속(Inheritance)** 입니다.

부모가 재산을 자식에게 물려주듯이, 부모 클래스의 코드를 자식 클래스가 그대로 받아서 씁니다.

---

## 상속 (extends)

`extends` 키워드로 부모 클래스를 지정합니다.

```java
// 부모 클래스 (공통 속성과 동작)
public class Animal {
    protected String name;  // protected: 자식 클래스에서 접근 가능

    public Animal(String name) {
        this.name = name;
    }

    public void eat() {
        System.out.println(name + "이(가) 먹습니다.");
    }

    public String sound() {
        return "...";  // 기본 소리 (자식이 덮어씌울 예정)
    }
}

// 자식 클래스 (Animal을 상속)
public class Dog extends Animal {

    // super(name): 부모 클래스의 생성자 호출 — 반드시 첫 줄에
    public Dog(String name) {
        super(name);
    }

    // @Override: 부모 메서드를 자식이 다시 정의 (오버라이딩)
    @Override
    public String sound() {
        return "멍멍";  // Animal의 "..."을 덮어씌움
    }

    // 자식만의 추가 기능
    public void fetch() {
        System.out.println(name + "이(가) 공을 물어옵니다.");
    }
}

public class Cat extends Animal {
    public Cat(String name) {
        super(name);
    }

    @Override
    public String sound() {
        return "야옹";
    }
}
```

```java
Dog dog = new Dog("바둑이");
dog.eat();    // 바둑이이(가) 먹습니다.  ← 부모 메서드 사용
dog.fetch();  // 바둑이이(가) 공을 물어옵니다.  ← 자식 메서드
System.out.println(dog.sound());  // 멍멍  ← 오버라이딩된 메서드
```

---

## 다형성 (Polymorphism) — 같은 타입, 다른 동작

**다형성**은 "같은 코드가 여러 형태로 동작할 수 있다"는 개념입니다. 부모 타입 변수로 자식 객체를 담을 수 있고, 실제 객체의 종류에 따라 다른 메서드가 실행됩니다.

리모컨 버튼 하나가 TV에 꽂히면 TV를 켜고, 에어컨에 꽂히면 에어컨을 켜는 것과 비슷합니다.

```java
// Animal 타입 변수에 Dog, Cat 객체를 모두 담을 수 있음
Animal a1 = new Dog("바둑이");
Animal a2 = new Cat("나비");

// 호출하는 메서드는 같지만, 실제 실행되는 코드는 다름
System.out.println(a1.sound());  // 멍멍 (Dog의 sound)
System.out.println(a2.sound());  // 야옹 (Cat의 sound)

// 리스트에 여러 동물을 담아 일괄 처리 가능
List<Animal> animals = List.of(
    new Dog("바둑이"),
    new Cat("나비"),
    new Dog("흰둥이")
);

for (Animal animal : animals) {
    System.out.println(animal.name + ": " + animal.sound());
}
// 바둑이: 멍멍
// 나비: 야옹
// 흰둥이: 멍멍
```

### 자식 전용 메서드 호출 — 캐스팅

부모 타입으로 선언하면 자식만의 메서드는 바로 호출할 수 없습니다. 캐스팅이 필요합니다.

```java
Animal a = new Dog("바둑이");

// ❌ 컴파일 에러: Animal 타입에는 fetch()가 없음
a.fetch();

// ✅ instanceof로 타입 확인 후 캐스팅
if (a instanceof Dog) {
    Dog d = (Dog) a;  // Animal → Dog 로 변환
    d.fetch();        // 이제 사용 가능
}

// ✅ Java 16+: 패턴 매칭 (더 간결)
if (a instanceof Dog d) {
    d.fetch();  // 자동으로 Dog 타입 변수 d 생성
}
```

---

## abstract 클래스 — 반드시 상속해서 써야 하는 클래스

`abstract` 클래스는 직접 객체를 만들 수 없고, 반드시 상속해서 사용합니다. **공통 코드를 제공하면서, 일부 메서드는 자식이 반드시 구현하도록 강제**할 때 씁니다.

악보에 비유하면, abstract 클래스는 멜로디의 뼈대(박자, 음 높이 기록)는 있지만, 실제 연주는 각 악기(자식 클래스)가 합니다.

```java
// abstract 클래스: 직접 new Shape()는 불가
public abstract class Shape {
    private String color;  // 공통 필드

    public Shape(String color) {
        this.color = color;
    }

    // 추상 메서드: 구현 없음, 자식이 반드시 구현해야 함
    public abstract double area();

    // 일반 메서드: 공통 로직 제공
    public void printInfo() {
        System.out.println(color + " 도형, 넓이: " + area());
    }
}

// 자식 클래스는 area()를 반드시 구현해야 함
public class Circle extends Shape {
    private double radius;

    public Circle(String color, double radius) {
        super(color);           // 부모 생성자 호출
        this.radius = radius;
    }

    @Override
    public double area() {
        return Math.PI * radius * radius;  // 원의 넓이
    }
}

public class Rectangle extends Shape {
    private double width, height;

    public Rectangle(String color, double width, double height) {
        super(color);
        this.width = width;
        this.height = height;
    }

    @Override
    public double area() {
        return width * height;  // 직사각형의 넓이
    }
}

// 사용
Shape c = new Circle("빨간", 5.0);
Shape r = new Rectangle("파란", 3.0, 4.0);

c.printInfo();  // 빨간 도형, 넓이: 78.53...
r.printInfo();  // 파란 도형, 넓이: 12.0

// Shape s = new Shape("green");  // ❌ 컴파일 에러: abstract 클래스는 직접 생성 불가
```

---

## 인터페이스 (interface) — 기능의 계약서

인터페이스는 "이 기능을 반드시 구현하겠다"는 **약속(계약)** 입니다. 클래스가 어떤 능력을 가질지를 정의합니다.

USB 규격처럼 생각하면 됩니다. USB 규격을 따르는 기기라면(implements Pluggable) 어떤 USB 포트에도 꽂을 수 있습니다.

```java
// 인터페이스: 메서드 목록만 정의 (몸체 없음)
public interface Flyable {
    void fly();  // 자동으로 public abstract

    // default 메서드: 인터페이스에서 기본 구현 제공 (Java 8+)
    default String status() {
        return "비행 중";
    }
}

public interface Swimmable {
    void swim();
}

public interface Runnable {
    void run();
}
```

클래스는 **여러 인터페이스를 동시에 구현**할 수 있습니다. (상속은 하나만 가능)

```java
// Animal을 상속하면서 Flyable, Swimmable 인터페이스도 구현
public class Duck extends Animal implements Flyable, Swimmable {

    public Duck(String name) {
        super(name);
    }

    @Override
    public void fly() {
        System.out.println(name + "이(가) 낮게 납니다.");
    }

    @Override
    public void swim() {
        System.out.println(name + "이(가) 물 위에서 헤엄칩니다.");
    }

    @Override
    public String sound() {
        return "꽥꽥";
    }
}

Duck duck = new Duck("도널드");
duck.fly();    // 도널드이(가) 낮게 납니다.
duck.swim();   // 도널드이(가) 물 위에서 헤엄칩니다.
duck.eat();    // 도널드이(가) 먹습니다. (Animal에서 상속)
System.out.println(duck.status());  // 비행 중 (default 메서드)
```

---

## abstract 클래스 vs 인터페이스

헷갈리기 쉬운 두 개념입니다. 결정 기준은 간단합니다.

- **"공통 코드를 물려주고 싶다"** → abstract 클래스
- **"이 기능을 반드시 구현하도록 강제하고 싶다"** → 인터페이스

| 비교 항목 | abstract 클래스 | 인터페이스 |
|-----------|:---------------:|:----------:|
| 다중 상속/구현 | ❌ 하나만 가능 | ✅ 여러 개 가능 |
| 필드 | 모든 종류 가능 | 상수만 (`static final`) |
| 생성자 | 있음 | ❌ 없음 |
| 메서드 구현 | 가능 | `default`, `static`만 가능 |
| 주요 목적 | 공통 구현 공유 | 기능 계약 정의 |

---

## 자주 하는 실수들

```java
// ❌ 실수 1: @Override 없이 오버라이딩 (오타 시 새 메서드가 됨)
class Cat extends Animal {
    public String Sounds() {  // 대문자 S → 오버라이딩 안 됨, 새 메서드 생성
        return "야옹";
    }
}

// ✅ @Override 붙이면 컴파일러가 오타를 잡아줌
class Cat extends Animal {
    @Override
    public String sound() {  // 오타 나면 컴파일 에러로 즉시 발견
        return "야옹";
    }
}
```

```java
// ❌ 실수 2: 부모 생성자 호출을 빠뜨림
class Dog extends Animal {
    public Dog(String name) {
        // super(name) 호출 안 함 → 컴파일 에러
        // (부모에 기본 생성자가 없으면 자식이 반드시 super() 호출해야 함)
    }
}

// ✅ 반드시 첫 줄에 super() 호출
class Dog extends Animal {
    public Dog(String name) {
        super(name);  // 부모 생성자 먼저 호출
    }
}
```

```java
// ❌ 실수 3: 인터페이스 메서드 일부만 구현
class FlyingCar implements Flyable, Runnable {
    @Override
    public void fly() { ... }
    // run()을 구현하지 않음 → 컴파일 에러
}

// ✅ 모든 인터페이스 메서드 구현
class FlyingCar implements Flyable, Runnable {
    @Override
    public void fly() { System.out.println("날아갑니다"); }

    @Override
    public void run() { System.out.println("달립니다"); }
}
```

---

## 실전 예제 — 결제 시스템

인터페이스를 활용한 실용적인 예제입니다.

```java
// 결제 기능의 계약: 모든 결제 수단이 구현해야 함
public interface PaymentMethod {
    boolean pay(int amount);   // 결제
    String getName();          // 결제 수단 이름
}

// 신용카드 결제
public class CreditCard implements PaymentMethod {
    private String cardNumber;
    private int limit;

    public CreditCard(String cardNumber, int limit) {
        this.cardNumber = cardNumber;
        this.limit = limit;
    }

    @Override
    public boolean pay(int amount) {
        if (amount > limit) {
            System.out.println("신용카드 한도 초과");
            return false;
        }
        limit -= amount;
        System.out.println("신용카드로 " + amount + "원 결제 완료");
        return true;
    }

    @Override
    public String getName() { return "신용카드"; }
}

// 카카오페이 결제
public class KakaoPay implements PaymentMethod {
    private int balance;

    public KakaoPay(int balance) {
        this.balance = balance;
    }

    @Override
    public boolean pay(int amount) {
        if (amount > balance) {
            System.out.println("카카오페이 잔액 부족");
            return false;
        }
        balance -= amount;
        System.out.println("카카오페이로 " + amount + "원 결제 완료");
        return true;
    }

    @Override
    public String getName() { return "카카오페이"; }
}

// 결제 처리 — PaymentMethod 타입으로 받아 어떤 수단이든 처리 가능
public class Checkout {
    public void process(PaymentMethod payment, int amount) {
        System.out.println("결제 수단: " + payment.getName());
        boolean success = payment.pay(amount);
        System.out.println(success ? "결제 성공!" : "결제 실패!");
    }
}

// 사용
Checkout checkout = new Checkout();
checkout.process(new CreditCard("1234-5678", 500000), 30000);  // 카드 결제
checkout.process(new KakaoPay(10000), 30000);                   // 잔액 부족
```
