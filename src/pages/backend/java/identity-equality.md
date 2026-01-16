---
title: "동일성(Identity)과 동등성(Equality)"
date: "2026-01-16"
tags: ["java", "identity", "equality", "object", "backend"]
excerpt: "Java에서 객체 비교의 두 가지 방식인 동일성과 동등성의 차이를 알아봅니다."
---

# 동일성(Identity)과 동등성(Equality)

Java에서 객체를 비교할 때 사용하는 두 가지 개념입니다.

## 정의

### 동일성 (Identity)

**같은 객체인가?** (메모리 주소 비교)

```java
Object a = new Object();
Object b = a;  // 같은 객체 참조

a == b  // true (동일함)
```

---

### 동등성 (Equality)

**같은 값인가?** (내용 비교)

```java
String a = new String("hello");
String b = new String("hello");

a == b        // false (다른 객체)
a.equals(b)   // true (같은 값)
```

---

## 비교 연산자

### == 연산자 (동일성)

```java
// 참조 타입: 메모리 주소 비교
String a = new String("hello");
String b = new String("hello");
String c = a;

a == b  // false (다른 객체)
a == c  // true (같은 객체)

// 원시 타입: 값 비교
int x = 10;
int y = 10;

x == y  // true (값이 같음)
```

---

### equals() 메서드 (동등성)

```java
// Object 기본 구현 (동일성과 같음)
public boolean equals(Object obj) {
    return (this == obj);
}

// String의 오버라이드 (내용 비교)
public boolean equals(Object anObject) {
    if (this == anObject) return true;
    if (anObject instanceof String) {
        String aString = (String) anObject;
        // 문자 하나하나 비교
        return this.value.equals(aString.value);
    }
    return false;
}
```

---

## 예시로 이해하기

### 쌍둥이 비유

```
동일성: 같은 사람인가?
  - 홍길동(본인) == 홍길동(본인) → true
  - 홍길동 == 홍길동 쌍둥이 → false (다른 사람)

동등성: 생김새가 같은가?
  - 홍길동.equals(홍길동 쌍둥이) → true (똑같이 생김)
```

---

### 실제 객체로 비교

```java
public class Person {
    private String name;
    private int age;

    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
}

Person person1 = new Person("Alice", 25);
Person person2 = new Person("Alice", 25);
Person person3 = person1;

// 동일성 (==)
person1 == person2  // false (다른 객체)
person1 == person3  // true (같은 객체)

// 동등성 (equals)
person1.equals(person2)  // false (Object 기본 구현)
person1.equals(person3)  // true (같은 객체니까)
```

---

### equals 오버라이드 후

```java
public class Person {
    private String name;
    private int age;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Person person = (Person) o;
        return age == person.age && Objects.equals(name, person.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, age);
    }
}

Person person1 = new Person("Alice", 25);
Person person2 = new Person("Alice", 25);

// 동일성 (==)
person1 == person2       // false (여전히 다른 객체)

// 동등성 (equals)
person1.equals(person2)  // true (같은 값!)
```

---

## 메모리 구조

```
Stack                    Heap
┌─────────┐
│ person1 │ ──────────→ ┌───────────────────┐
└─────────┘             │ Person            │
                        │ name: "Alice"     │
                        │ age: 25           │
                        └───────────────────┘

┌─────────┐
│ person2 │ ──────────→ ┌───────────────────┐
└─────────┘             │ Person            │
                        │ name: "Alice"     │
                        │ age: 25           │
                        └───────────────────┘

┌─────────┐
│ person3 │ ──────────→ (person1과 같은 주소)
└─────────┘

동일성: person1과 person3은 같은 주소 → 동일함
동등성: person1과 person2는 같은 내용 → 동등함
```

---

## String의 특수 케이스

### String Literal vs new String

```java
// String Literal (String Pool 사용)
String a = "hello";
String b = "hello";

a == b        // true! (같은 Pool 객체)
a.equals(b)   // true

// new String (새 객체 생성)
String c = new String("hello");
String d = new String("hello");

c == d        // false (다른 객체)
c.equals(d)   // true (같은 값)
```

---

### String Pool (String Intern)

```java
String Pool (Heap 내부)
┌────────────────────────────┐
│ "hello"  ←── a, b 참조     │
│ "world"                    │
│ ...                        │
└────────────────────────────┘

Heap (일반 영역)
┌───────────────────┐
│ "hello" ←── c     │
└───────────────────┘
┌───────────────────┐
│ "hello" ←── d     │
└───────────────────┘
```

---

### intern() 메서드

```java
String a = "hello";
String b = new String("hello");
String c = b.intern();  // Pool에서 가져옴

a == b  // false
a == c  // true (Pool의 같은 객체)
```

---

## Wrapper 클래스

### Integer 캐싱

```java
Integer a = 127;
Integer b = 127;
a == b  // true (캐싱 범위: -128 ~ 127)

Integer c = 128;
Integer d = 128;
c == d  // false (캐싱 범위 초과)

c.equals(d)  // true (값 비교)
```

---

### 캐싱 범위

```java
// -128 ~ 127 범위는 캐싱됨
Integer.valueOf(127) == Integer.valueOf(127)  // true
Integer.valueOf(128) == Integer.valueOf(128)  // false

// Boolean, Byte, Short, Long, Character도 유사
Boolean.valueOf(true) == Boolean.valueOf(true)    // true
Character.valueOf('A') == Character.valueOf('A')  // true (0~127)
```

---

## 언제 무엇을 사용할까

### == 사용

```java
// 1. 원시 타입 비교
int a = 10;
int b = 10;
if (a == b) { ... }

// 2. null 체크
if (obj == null) { ... }

// 3. 의도적으로 같은 객체인지 확인
if (this == other) return true;

// 4. enum 비교
if (status == Status.ACTIVE) { ... }
```

---

### equals() 사용

```java
// 1. 문자열 비교
if (name.equals("Alice")) { ... }

// 2. 객체 값 비교
if (user1.equals(user2)) { ... }

// 3. Wrapper 클래스 비교
Integer a = 200;
Integer b = 200;
if (a.equals(b)) { ... }  // true

// 4. null-safe 비교
if (Objects.equals(a, b)) { ... }
```

---

## Objects.equals()

```java
// null-safe 비교
Objects.equals(null, null);     // true
Objects.equals(null, "hello");  // false
Objects.equals("hello", null);  // false
Objects.equals("hello", "hello"); // true

// 내부 구현
public static boolean equals(Object a, Object b) {
    return (a == b) || (a != null && a.equals(b));
}
```

---

## JPA에서의 동일성과 동등성

### 영속성 컨텍스트와 동일성

```java
// 같은 영속성 컨텍스트 내에서는 동일성 보장
User user1 = em.find(User.class, 1L);
User user2 = em.find(User.class, 1L);

user1 == user2  // true! (1차 캐시에서 같은 객체 반환)
```

---

### 다른 영속성 컨텍스트

```java
// 트랜잭션 1
User user1 = em1.find(User.class, 1L);

// 트랜잭션 2
User user2 = em2.find(User.class, 1L);

user1 == user2       // false (다른 객체)
user1.equals(user2)  // equals 구현에 따라 다름
```

---

### JPA 엔티티 equals 구현

```java
@Entity
public class User {
    @Id
    @GeneratedValue
    private Long id;

    private String name;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User)) return false;
        User user = (User) o;
        // ID로 동등성 비교 (ID가 null이면 false)
        return id != null && Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
```

---

## 비교 정리

| 구분 | 동일성 (Identity) | 동등성 (Equality) |
|-----|-----------------|-----------------|
| 연산자/메서드 | `==` | `equals()` |
| 비교 대상 | 메모리 주소 | 내용 (값) |
| 기본 동작 | 같은 객체인지 | Object: 같은 객체인지 |
| 원시 타입 | 값 비교 | N/A |
| String | Pool이면 true | 항상 내용 비교 |
| 커스텀 객체 | 같은 인스턴스 | equals 오버라이드 필요 |

---

## 자주 하는 실수

### 1. 문자열 비교에 == 사용

```java
// ❌ 잘못된 방법
String input = getUserInput();
if (input == "admin") { ... }  // false일 수 있음

// ✅ 올바른 방법
if ("admin".equals(input)) { ... }  // null-safe
if (input != null && input.equals("admin")) { ... }
```

---

### 2. Integer 비교에 == 사용

```java
// ❌ 잘못된 방법
Integer a = someMethod();  // 128 반환
Integer b = 128;
if (a == b) { ... }  // false일 수 있음!

// ✅ 올바른 방법
if (a.equals(b)) { ... }
if (Objects.equals(a, b)) { ... }  // null-safe
```

---

### 3. equals 오버라이드 없이 비교

```java
// ❌ equals 오버라이드 안 함
public class Point {
    int x, y;
}

Point p1 = new Point(1, 2);
Point p2 = new Point(1, 2);
p1.equals(p2);  // false (Object의 기본 구현)

// ✅ equals 오버라이드
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof Point)) return false;
    Point point = (Point) o;
    return x == point.x && y == point.y;
}
```

---

### 4. null 체크 누락

```java
// ❌ NullPointerException 위험
String name = user.getName();  // null일 수 있음
if (name.equals("admin")) { ... }

// ✅ null-safe
if ("admin".equals(name)) { ... }
if (Objects.equals(name, "admin")) { ... }
```

---

## 요약

1. **동일성 (==)**: 같은 객체인가 (메모리 주소)
2. **동등성 (equals)**: 같은 값인가 (내용)
3. **원시 타입**: == 사용 (값 비교)
4. **참조 타입**: equals() 사용 (내용 비교)
5. **String Literal**: Pool에서 같은 객체 → == 가능하지만 equals() 권장
6. **Wrapper 캐싱**: -128~127은 캐싱 → equals() 권장
7. **null-safe**: Objects.equals() 사용
8. **JPA**: 같은 영속성 컨텍스트에서는 동일성 보장

**핵심:** 참조 타입은 항상 `equals()`로 비교하고, 커스텀 객체는 `equals()`와 `hashCode()`를 함께 오버라이드하세요.