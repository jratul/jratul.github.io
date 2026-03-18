---
title: "클래스와 객체"
order: 3
---

## 클래스 정의

클래스는 객체를 만들기 위한 설계도입니다.

```java
public class Person {
    // 필드 (인스턴스 변수)
    private String name;
    private int age;

    // 생성자
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }

    // 메서드
    public void introduce() {
        System.out.println("안녕하세요, " + name + "입니다. " + age + "살입니다.");
    }

    // Getter
    public String getName() { return name; }
    public int getAge() { return age; }

    // Setter
    public void setAge(int age) {
        if (age >= 0) this.age = age;
    }
}
```

## 객체 생성

```java
Person alice = new Person("Alice", 30);
alice.introduce();  // 안녕하세요, Alice입니다. 30살입니다.

System.out.println(alice.getName());  // Alice
alice.setAge(31);
```

## 접근 제한자

| 제한자 | 같은 클래스 | 같은 패키지 | 자식 클래스 | 전체 |
|--------|-----------|-----------|-----------|------|
| `private` | ✅ | ❌ | ❌ | ❌ |
| `(default)` | ✅ | ✅ | ❌ | ❌ |
| `protected` | ✅ | ✅ | ✅ | ❌ |
| `public` | ✅ | ✅ | ✅ | ✅ |

## static

`static` 멤버는 객체가 아닌 클래스에 속합니다.

```java
public class Counter {
    private static int count = 0;  // 클래스 변수 (공유됨)
    private int id;                // 인스턴스 변수 (각 객체마다)

    public Counter() {
        count++;
        this.id = count;
    }

    public static int getCount() { return count; }
    public int getId() { return id; }
}

Counter a = new Counter();  // count = 1
Counter b = new Counter();  // count = 2
Counter c = new Counter();  // count = 3

System.out.println(Counter.getCount());  // 3
System.out.println(a.getId());           // 1
```

## 생성자 오버로딩

```java
public class Rectangle {
    private int width;
    private int height;

    // 기본 생성자
    public Rectangle() {
        this(1, 1);  // 다른 생성자 호출
    }

    // 정사각형
    public Rectangle(int size) {
        this(size, size);
    }

    // 직사각형
    public Rectangle(int width, int height) {
        this.width = width;
        this.height = height;
    }

    public int area() {
        return width * height;
    }
}

Rectangle r1 = new Rectangle();      // 1x1
Rectangle r2 = new Rectangle(5);    // 5x5
Rectangle r3 = new Rectangle(3, 4); // 3x4, area=12
```

## toString / equals / hashCode

```java
public class Point {
    private int x, y;

    public Point(int x, int y) {
        this.x = x;
        this.y = y;
    }

    @Override
    public String toString() {
        return "Point(" + x + ", " + y + ")";
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Point)) return false;
        Point p = (Point) o;
        return x == p.x && y == p.y;
    }

    @Override
    public int hashCode() {
        return Objects.hash(x, y);
    }
}

Point p1 = new Point(1, 2);
Point p2 = new Point(1, 2);

System.out.println(p1);           // Point(1, 2)
System.out.println(p1.equals(p2)); // true
```
