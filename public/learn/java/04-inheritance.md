---
title: "상속과 인터페이스"
order: 4
---

## 상속 (extends)

기존 클래스의 기능을 물려받아 확장합니다.

```java
public class Animal {
    protected String name;

    public Animal(String name) {
        this.name = name;
    }

    public void eat() {
        System.out.println(name + "이(가) 먹습니다.");
    }

    public String sound() {
        return "...";
    }
}

public class Dog extends Animal {
    public Dog(String name) {
        super(name);  // 부모 생성자 호출
    }

    @Override
    public String sound() {
        return "멍멍";
    }

    public void fetch() {
        System.out.println(name + "이(가) 공을 물어옵니다.");
    }
}

Dog dog = new Dog("바둑이");
dog.eat();    // 바둑이이(가) 먹습니다. (부모 메서드)
dog.fetch();  // 바둑이이(가) 공을 물어옵니다. (자식 메서드)
System.out.println(dog.sound());  // 멍멍 (오버라이딩)
```

## 다형성

부모 타입 변수로 자식 객체를 참조할 수 있습니다.

```java
Animal a1 = new Dog("바둑이");
Animal a2 = new Cat("나비");

// 실제 객체 타입에 따라 다른 메서드 실행
System.out.println(a1.sound());  // 멍멍
System.out.println(a2.sound());  // 야옹

// 자식 전용 메서드는 캐스팅 필요
if (a1 instanceof Dog dog) {  // Java 16+ 패턴 매칭
    dog.fetch();
}
```

## abstract 클래스

직접 인스턴스를 만들 수 없고, 반드시 상속해서 사용합니다.

```java
public abstract class Shape {
    // 추상 메서드: 자식이 반드시 구현
    public abstract double area();

    // 일반 메서드: 공통 로직 제공
    public void printArea() {
        System.out.println("넓이: " + area());
    }
}

public class Circle extends Shape {
    private double radius;

    public Circle(double radius) { this.radius = radius; }

    @Override
    public double area() {
        return Math.PI * radius * radius;
    }
}

Shape s = new Circle(5.0);
s.printArea();  // 넓이: 78.53...
```

## 인터페이스 (interface)

메서드 시그니처만 정의하는 계약입니다. 클래스는 여러 인터페이스를 구현할 수 있습니다.

```java
public interface Flyable {
    void fly();  // 암묵적으로 public abstract

    default String status() {
        return "비행 중";
    }
}

public interface Swimmable {
    void swim();
}

// 여러 인터페이스 구현
public class Duck extends Animal implements Flyable, Swimmable {
    public Duck(String name) { super(name); }

    @Override
    public void fly() { System.out.println(name + "이(가) 납니다."); }

    @Override
    public void swim() { System.out.println(name + "이(가) 헤엄칩니다."); }

    @Override
    public String sound() { return "꽥꽥"; }
}
```

## abstract 클래스 vs 인터페이스

| | abstract 클래스 | 인터페이스 |
|---|---|---|
| 다중 상속 | ❌ (단일만 가능) | ✅ (여러 개 구현 가능) |
| 필드 | 있음 | 상수만 (`static final`) |
| 생성자 | 있음 | ❌ |
| 메서드 구현 | 가능 | `default`, `static`만 |
| 목적 | 공통 구현 공유 | 기능 계약 정의 |
