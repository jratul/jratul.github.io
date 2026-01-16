---
title: "equals와 hashCode는 왜 함께 정의해야 하는가"
date: "2026-01-16"
tags: ["java", "equals", "hashcode", "object", "backend"]
excerpt: "Java에서 equals와 hashCode를 함께 오버라이드해야 하는 이유와 올바른 구현 방법을 알아봅니다."
---

# equals와 hashCode는 왜 함께 정의해야 하는가

Java에서 `equals()`와 `hashCode()`를 함께 오버라이드해야 하는 이유와 올바른 구현 방법을 알아봅니다.

## 기본 동작

### Object.equals()

```java
// Object 클래스의 기본 구현
public boolean equals(Object obj) {
    return (this == obj);  // 참조 비교 (동일성)
}
```

**기본 동작:** 같은 객체를 가리키는지 비교 (메모리 주소)

---

### Object.hashCode()

```java
// Object 클래스의 기본 구현
public native int hashCode();  // 메모리 주소 기반
```

**기본 동작:** 객체의 메모리 주소를 기반으로 해시코드 생성

---

## 문제 상황

### equals만 오버라이드한 경우

```java
public class User {
    private Long id;
    private String name;

    // equals만 오버라이드
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(id, user.id);
    }

    // hashCode는 오버라이드 안 함!
}
```

---

### HashSet에서 문제 발생

```java
User user1 = new User(1L, "Alice");
User user2 = new User(1L, "Alice");

// equals로는 같음
System.out.println(user1.equals(user2));  // true

// HashSet에 추가
Set<User> users = new HashSet<>();
users.add(user1);
users.add(user2);

// 예상: 1개 (같은 사용자니까)
// 실제: 2개! (hashCode가 다르니까)
System.out.println(users.size());  // 2
```

**왜?** HashSet은 먼저 `hashCode()`로 버킷을 찾고, 그 다음 `equals()`로 비교합니다.

---

### HashMap에서 문제 발생

```java
User user1 = new User(1L, "Alice");
User user2 = new User(1L, "Alice");

Map<User, String> map = new HashMap<>();
map.put(user1, "Value1");

// 같은 사용자로 조회
String value = map.get(user2);

// 예상: "Value1"
// 실제: null! (hashCode가 다르니까)
System.out.println(value);  // null
```

---

## Hash 기반 컬렉션의 동작

### HashSet/HashMap 저장 원리

```
1. hashCode() 호출 → 버킷 인덱스 계산
2. 해당 버킷에서 equals()로 비교
3. 같으면 기존 값 사용, 다르면 추가

┌─────────────────────────────────────┐
│         HashSet 내부 구조           │
├─────────────────────────────────────┤
│ Bucket[0]: [User(1, Alice)]         │
│ Bucket[1]: [User(2, Bob)]           │
│ Bucket[2]: [User(1, Alice)] ← 중복! │
│ ...                                 │
└─────────────────────────────────────┘

hashCode가 다르면 다른 버킷에 저장됨
→ equals를 비교할 기회조차 없음!
```

---

### 올바른 동작

```
User(1, Alice).hashCode() → 12345 → Bucket[5]
User(1, Alice).hashCode() → 12345 → Bucket[5] → equals 비교 → 동일!

두 객체의 hashCode가 같아야 같은 버킷에서 equals 비교 가능
```

---

## 계약 (Contract)

### equals-hashCode 계약

```java
// 1. equals가 true면 hashCode도 같아야 함
if (a.equals(b)) {
    assert a.hashCode() == b.hashCode();  // 필수!
}

// 2. hashCode가 같아도 equals는 다를 수 있음 (해시 충돌)
if (a.hashCode() == b.hashCode()) {
    // a.equals(b)는 true일 수도, false일 수도 있음
}

// 3. equals가 false면 hashCode는 상관없음 (다르면 더 좋음)
if (!a.equals(b)) {
    // hashCode가 달라야 성능이 좋음 (버킷 분산)
}
```

---

### 계약 위반 시

```java
// equals만 오버라이드 → 계약 위반!
// hashCode가 다르면 같은 버킷에 들어가지 않음
// → HashSet, HashMap이 제대로 동작하지 않음

// 증상:
// - HashSet에 중복 저장됨
// - HashMap에서 값을 찾지 못함
// - 디버깅이 매우 어려움
```

---

## 올바른 구현

### 수동 구현

```java
public class User {
    private Long id;
    private String name;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);  // equals에서 사용한 필드로!
    }
}
```

---

### Objects.hash() 사용

```java
@Override
public int hashCode() {
    return Objects.hash(id, name, email);  // 여러 필드 조합
}

// Objects.hash 내부 동작
public static int hash(Object... values) {
    return Arrays.hashCode(values);
}
```

---

### 직접 계산

```java
@Override
public int hashCode() {
    int result = 17;  // 소수로 시작
    result = 31 * result + (id != null ? id.hashCode() : 0);
    result = 31 * result + (name != null ? name.hashCode() : 0);
    return result;
}

// 31을 사용하는 이유:
// - 홀수 소수
// - 31 * i == (i << 5) - i 로 최적화 가능
```

---

### Lombok 사용

```java
import lombok.EqualsAndHashCode;

@EqualsAndHashCode
public class User {
    private Long id;
    private String name;
}

// 특정 필드만 사용
@EqualsAndHashCode(of = {"id"})
public class User {
    private Long id;
    private String name;  // equals/hashCode에서 제외
}

// 특정 필드 제외
@EqualsAndHashCode(exclude = {"createdAt"})
public class User {
    private Long id;
    private String name;
    private LocalDateTime createdAt;  // 제외됨
}
```

---

### IDE 자동 생성

```java
// IntelliJ: Alt + Insert → equals() and hashCode()
// Eclipse: Source → Generate hashCode() and equals()

@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;
    User user = (User) o;
    return Objects.equals(id, user.id) &&
           Objects.equals(name, user.name);
}

@Override
public int hashCode() {
    return Objects.hash(id, name);
}
```

---

### Java 16+ Record

```java
// Record는 자동으로 equals, hashCode 생성
public record User(Long id, String name) {}

User user1 = new User(1L, "Alice");
User user2 = new User(1L, "Alice");

user1.equals(user2);   // true
user1.hashCode() == user2.hashCode();  // true
```

---

## 주의사항

### 1. 같은 필드 사용

```java
// ❌ 잘못된 구현
@Override
public boolean equals(Object o) {
    // id로 비교
    return Objects.equals(id, other.id);
}

@Override
public int hashCode() {
    // name으로 해시코드 생성 (다른 필드!)
    return Objects.hash(name);
}

// ✅ 올바른 구현
@Override
public boolean equals(Object o) {
    return Objects.equals(id, other.id);
}

@Override
public int hashCode() {
    return Objects.hash(id);  // 같은 필드!
}
```

---

### 2. 불변 필드 사용

```java
// ❌ 가변 필드로 hashCode 계산
public class User {
    private String name;  // 변경 가능

    @Override
    public int hashCode() {
        return Objects.hash(name);
    }

    public void setName(String name) {
        this.name = name;  // hashCode가 바뀜!
    }
}

// 문제 시나리오
Set<User> users = new HashSet<>();
User user = new User("Alice");
users.add(user);  // hashCode로 버킷 결정

user.setName("Bob");  // hashCode 변경!

users.contains(user);  // false! (다른 버킷에서 찾음)
```

**해결책:** ID나 불변 필드만 사용

---

### 3. JPA 엔티티에서의 주의

```java
// ❌ 생성 전 id가 null
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Override
    public int hashCode() {
        return Objects.hash(id);  // persist 전에는 null!
    }
}

// 문제
User user = new User();
Set<User> users = new HashSet<>();
users.add(user);  // hashCode = hash(null)

em.persist(user);  // id = 1L, hashCode 변경!

users.contains(user);  // false!
```

**해결책 1: 비즈니스 키 사용**
```java
@Entity
public class User {
    @Id @GeneratedValue
    private Long id;

    @Column(unique = true)
    private String email;  // 비즈니스 키

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User)) return false;
        User user = (User) o;
        return Objects.equals(email, user.email);
    }

    @Override
    public int hashCode() {
        return Objects.hash(email);
    }
}
```

**해결책 2: 고정 hashCode**
```java
@Entity
public class User {
    @Id @GeneratedValue
    private Long id;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User)) return false;
        User user = (User) o;
        return id != null && Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();  // 고정 값!
    }
}
```

---

### 4. 상속 관계에서의 주의

```java
// ❌ instanceof 사용 시 문제
public class Point {
    private int x, y;

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof Point)) return false;
        Point p = (Point) o;
        return x == p.x && y == p.y;
    }
}

public class ColorPoint extends Point {
    private String color;

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof ColorPoint)) return false;
        ColorPoint cp = (ColorPoint) o;
        return super.equals(o) && Objects.equals(color, cp.color);
    }
}

// 대칭성 위반!
Point p = new Point(1, 2);
ColorPoint cp = new ColorPoint(1, 2, "red");

p.equals(cp);   // true (Point의 equals)
cp.equals(p);   // false (ColorPoint의 equals)
```

**해결책: getClass() 사용**
```java
@Override
public boolean equals(Object o) {
    if (o == null || getClass() != o.getClass()) return false;
    // ...
}
```

---

## equals 규약

```java
// 1. 반사성 (Reflexive)
a.equals(a);  // 항상 true

// 2. 대칭성 (Symmetric)
if (a.equals(b)) {
    b.equals(a);  // 반드시 true
}

// 3. 추이성 (Transitive)
if (a.equals(b) && b.equals(c)) {
    a.equals(c);  // 반드시 true
}

// 4. 일관성 (Consistent)
a.equals(b);  // 여러 번 호출해도 같은 결과

// 5. null 비교
a.equals(null);  // 항상 false
```

---

## 테스트 코드

```java
@Test
void equals_hashCode_contract() {
    User user1 = new User(1L, "Alice");
    User user2 = new User(1L, "Alice");
    User user3 = new User(2L, "Bob");

    // 반사성
    assertThat(user1.equals(user1)).isTrue();

    // 대칭성
    assertThat(user1.equals(user2)).isTrue();
    assertThat(user2.equals(user1)).isTrue();

    // equals가 true면 hashCode도 같음
    assertThat(user1.hashCode()).isEqualTo(user2.hashCode());

    // equals가 false
    assertThat(user1.equals(user3)).isFalse();

    // null 비교
    assertThat(user1.equals(null)).isFalse();
}

@Test
void hashSet_works_correctly() {
    User user1 = new User(1L, "Alice");
    User user2 = new User(1L, "Alice");

    Set<User> users = new HashSet<>();
    users.add(user1);
    users.add(user2);

    assertThat(users).hasSize(1);  // 중복 제거됨
}

@Test
void hashMap_works_correctly() {
    User user1 = new User(1L, "Alice");
    User user2 = new User(1L, "Alice");

    Map<User, String> map = new HashMap<>();
    map.put(user1, "Value");

    assertThat(map.get(user2)).isEqualTo("Value");  // 조회 성공
}
```

---

## 요약

1. **equals만 오버라이드하면 안 됨**: Hash 컬렉션이 제대로 동작 안 함
2. **계약**: equals가 true면 hashCode도 같아야 함
3. **같은 필드 사용**: equals와 hashCode에서 같은 필드 사용
4. **불변 필드 권장**: hashCode는 불변 필드로 계산
5. **JPA 엔티티 주의**: ID가 생성 전 null일 수 있음 → 비즈니스 키 사용
6. **Lombok/@Record 추천**: 직접 구현보다 자동 생성 권장

**한 줄 요약:** `equals()`를 오버라이드하면 **반드시** `hashCode()`도 함께 오버라이드하세요.