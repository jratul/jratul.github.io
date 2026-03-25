---
title: "제네릭"
order: 8
---

Java를 사용하다 보면 `List<String>`, `Map<String, Integer>` 처럼 꺾쇠괄호 안에 타입을 쓰는 경우를 자주 봅니다. 이것이 바로 **제네릭(Generics)** 입니다.

제네릭은 **클래스나 메서드에서 사용할 타입을 나중에 지정**할 수 있도록 하는 기능입니다. 택배 상자에 비유하면, 상자 자체의 구조(크기, 재질)는 동일하지만 안에 뭘 담을지(책, 옷, 전자제품)는 나중에 결정하는 것과 같습니다.

---

## 제네릭 없이 쓰면 어떤 문제가 생길까?

```java
// ❌ 제네릭 없이 사용 (Raw Type)
List list = new ArrayList();  // 어떤 타입이든 담을 수 있음
list.add("hello");
list.add(123);          // 정수도 들어감
list.add(new Object()); // 뭐든 들어감

// 꺼낼 때마다 형변환 필요, 틀리면 런타임에 에러 발생
String s = (String) list.get(0);  // OK
String s2 = (String) list.get(1); // ClassCastException! (123은 Integer)
```

제네릭을 쓰면 컴파일 시점에 타입을 확인해서 이런 실수를 미리 막아줍니다.

```java
// ✅ 제네릭 사용
List<String> strings = new ArrayList<>();  // String만 담겠다고 명시
strings.add("hello");
// strings.add(123);  // 컴파일 에러! 즉시 발견

String s = strings.get(0);  // 형변환 불필요
```

---

## 제네릭 클래스 만들기

`<T>` 는 "나중에 정해질 타입"을 나타내는 자리표시자입니다. T는 Type의 줄임말입니다.

```java
// T: 이 클래스에서 사용할 타입 (나중에 String, Integer 등으로 결정됨)
public class Box<T> {
    private T value;  // T 타입의 값을 담음

    public Box(T value) {
        this.value = value;
    }

    public T get() {
        return value;  // T 타입을 반환
    }

    public void set(T value) {
        this.value = value;
    }

    @Override
    public String toString() {
        return "Box[" + value + "]";
    }
}

// 사용할 때 T에 실제 타입을 지정
Box<String>  strBox  = new Box<>("hello");  // T = String
Box<Integer> intBox  = new Box<>(42);       // T = Integer
Box<Double>  dblBox  = new Box<>(3.14);     // T = Double

System.out.println(strBox.get());   // hello
System.out.println(intBox.get());   // 42

String s = strBox.get();  // 형변환 불필요, 타입 안전
// Integer n = strBox.get();  // 컴파일 에러! (Box<String>에서 Integer 꺼낼 수 없음)
```

### 타입 파라미터 이름 관례

| 이름 | 의미 | 주로 쓰이는 곳 |
|------|------|----------------|
| `T` | Type | 일반적인 타입 |
| `E` | Element | 컬렉션의 요소 타입 |
| `K` | Key | Map의 키 타입 |
| `V` | Value | Map의 값 타입 |
| `R` | Return | 반환 타입 |
| `N` | Number | 숫자 타입 |

---

## 여러 타입 파라미터

```java
// K와 V: 두 개의 타입 파라미터
public class Pair<K, V> {
    private K first;   // 첫 번째 요소
    private V second;  // 두 번째 요소

    public Pair(K first, V second) {
        this.first = first;
        this.second = second;
    }

    public K getFirst()  { return first; }
    public V getSecond() { return second; }

    @Override
    public String toString() {
        return "(" + first + ", " + second + ")";
    }
}

Pair<String, Integer> nameAge  = new Pair<>("Alice", 30);
Pair<String, String>  cityCode = new Pair<>("Seoul", "KR");

System.out.println(nameAge);   // (Alice, 30)
System.out.println(cityCode);  // (Seoul, KR)

String name = nameAge.getFirst();  // String 타입으로 안전하게 꺼냄
int age = nameAge.getSecond();     // Integer 자동 언박싱
```

---

## 제네릭 메서드

클래스 전체가 아니라 특정 메서드에만 제네릭을 적용할 수 있습니다.

```java
public class Utils {

    // 리스트가 비어 있으면 기본값 반환
    // <T>: 이 메서드에서 사용할 타입 파라미터
    public static <T> T firstOrDefault(List<T> list, T defaultValue) {
        return list.isEmpty() ? defaultValue : list.get(0);
    }

    // 두 값 중 더 큰 것 반환 (Comparable을 구현한 타입만 허용)
    public static <T extends Comparable<T>> T max(T a, T b) {
        return a.compareTo(b) >= 0 ? a : b;
    }

    // 배열을 리스트로 변환
    @SafeVarargs
    public static <T> List<T> listOf(T... elements) {
        return new ArrayList<>(Arrays.asList(elements));
    }
}

// 사용
String first = Utils.firstOrDefault(List.of("a", "b"), "없음");  // "a"
String empty = Utils.firstOrDefault(List.of(), "없음");            // "없음"

int bigger = Utils.max(10, 20);        // 20
String longer = Utils.max("abc", "ab"); // "abc" (사전순 뒤)
// Java가 타입을 추론하므로 <Integer>를 명시하지 않아도 됨
```

---

## 경계 있는 타입 파라미터 (Bounded Type Parameters)

`<T extends 타입>` 으로 사용 가능한 타입의 범위를 제한할 수 있습니다.

```java
// Number를 상속한 타입만 허용 (Integer, Double, Long 등)
public static <T extends Number> double sum(List<T> list) {
    double total = 0;
    for (T item : list) {
        total += item.doubleValue();  // Number의 메서드 사용 가능
    }
    return total;
}

sum(List.of(1, 2, 3));          // Integer → OK (5.0 반환)
sum(List.of(1.5, 2.5));         // Double → OK  (4.0 반환)
// sum(List.of("a", "b"));      // String → 컴파일 에러

// 여러 타입 동시 제한: T는 Comparable도 구현하고 Number도 상속해야 함
public static <T extends Number & Comparable<T>> T clamp(T value, T min, T max) {
    if (value.compareTo(min) < 0) return min;
    if (value.compareTo(max) > 0) return max;
    return value;
}

System.out.println(clamp(5, 1, 10));   // 5 (범위 안)
System.out.println(clamp(-1, 1, 10));  // 1 (최솟값)
System.out.println(clamp(15, 1, 10));  // 10 (최댓값)
```

---

## 와일드카드 (?)

`?`는 "어떤 타입인지 모르겠지만 이 조건은 맞아야 해"를 표현합니다.

### 비제한 와일드카드 `?`

```java
// 어떤 타입의 List든 받을 수 있음
public static void printAll(List<?> list) {
    for (Object item : list) {  // Object로만 꺼낼 수 있음
        System.out.println(item);
    }
}

printAll(List.of(1, 2, 3));       // Integer 리스트도 OK
printAll(List.of("a", "b"));      // String 리스트도 OK
printAll(List.of(1.0, 2.0));      // Double 리스트도 OK
```

### 상한 경계 와일드카드 `? extends T` — 읽기 전용

"T 또는 T의 자식 타입만 허용" (T 계층의 어떤 자식인지는 모름)

```java
// Number 또는 그 하위 타입(Integer, Double 등) 리스트 허용
public static double sumNumbers(List<? extends Number> list) {
    double sum = 0;
    for (Number n : list) {  // Number로 꺼낼 수 있음
        sum += n.doubleValue();
    }
    return sum;
}

sumNumbers(List.of(1, 2, 3));      // List<Integer> → OK
sumNumbers(List.of(1.5, 2.5));     // List<Double>  → OK
// list.add(1);  // ❌ 추가 불가 (어떤 구체적 타입인지 모르므로)
```

### 하한 경계 와일드카드 `? super T` — 쓰기 전용

"T 또는 T의 부모 타입만 허용"

```java
// Integer의 상위 타입(Number, Object 등) 리스트에 Integer를 추가
public static void addIntegers(List<? super Integer> list) {
    list.add(1);   // Integer는 항상 들어갈 수 있음
    list.add(2);
    list.add(3);
}

List<Number>  numbers = new ArrayList<>();
List<Object>  objects = new ArrayList<>();

addIntegers(numbers);  // OK (Number는 Integer의 상위 타입)
addIntegers(objects);  // OK (Object도 상위 타입)
```

### PECS 원칙

헷갈릴 때의 기억법: **P**roducer **E**xtends, **C**onsumer **S**uper

- 데이터를 **꺼내서(produce)** 쓸 때 → `? extends T`
- 데이터를 **넣을(consume)** 때 → `? super T`

---

## 타입 소거 (Type Erasure)

제네릭 타입 정보는 **컴파일 후에는 사라집니다**. JVM은 제네릭을 모릅니다.

```java
List<String>  strings  = new ArrayList<>();
List<Integer> integers = new ArrayList<>();

// 컴파일 후 두 타입은 동일한 클래스
System.out.println(strings.getClass() == integers.getClass());  // true
System.out.println(strings.getClass().getName());  // java.util.ArrayList

// instanceof로 제네릭 타입 확인 불가
if (strings instanceof List<String>) {}  // 컴파일 에러!
if (strings instanceof List<?>) {}       // ✅ 가능 (와일드카드 사용)

// 제네릭 배열 생성 불가
// T[] arr = new T[10];  // 컴파일 에러
// T[] arr = (T[]) new Object[10];  // 경고는 있지만 실행은 됨
```

---

## 실전 예제 — 페이지 응답 클래스

실무에서 자주 쓰이는 페이징 처리 클래스를 제네릭으로 만들어 봅니다.

```java
// T: 페이지에 담길 데이터 타입 (User, Product 등 뭐든 가능)
public class Page<T> {
    private final List<T> content;    // 현재 페이지 데이터
    private final int totalElements;  // 전체 데이터 수
    private final int pageNumber;     // 현재 페이지 번호 (1부터 시작)
    private final int pageSize;       // 페이지 당 데이터 수

    public Page(List<T> content, int totalElements, int pageNumber, int pageSize) {
        this.content = content;
        this.totalElements = totalElements;
        this.pageNumber = pageNumber;
        this.pageSize = pageSize;
    }

    // 전체 페이지 수 계산
    public int totalPages() {
        return (int) Math.ceil((double) totalElements / pageSize);
    }

    // 다음 페이지가 있는지
    public boolean hasNext() {
        return pageNumber < totalPages();
    }

    // 이전 페이지가 있는지
    public boolean hasPrevious() {
        return pageNumber > 1;
    }

    public List<T> getContent()  { return content; }
    public int getTotalElements() { return totalElements; }

    @Override
    public String toString() {
        return "Page " + pageNumber + "/" + totalPages() +
               " (전체 " + totalElements + "개)";
    }
}

// 다양한 타입에 재사용
record User(Long id, String name) {}
record Product(String name, int price) {}

// 사용자 페이지
List<User> users = List.of(new User(1L, "Alice"), new User(2L, "Bob"));
Page<User> userPage = new Page<>(users, 50, 1, 10);
System.out.println(userPage);       // Page 1/5 (전체 50개)
System.out.println(userPage.hasNext()); // true

// 상품 페이지 (같은 클래스로!)
List<Product> products = List.of(new Product("노트북", 1200000));
Page<Product> productPage = new Page<>(products, 30, 3, 10);
System.out.println(productPage);    // Page 3/3 (전체 30개)
System.out.println(productPage.hasNext());  // false
```

---

## 자주 하는 실수들

```java
// ❌ 실수 1: 기본 타입을 제네릭에 직접 사용
List<int> list = new ArrayList<>();  // 컴파일 에러! int는 기본 타입

// ✅ 래퍼 클래스 사용
List<Integer> list = new ArrayList<>();  // Integer는 클래스

// ❌ 실수 2: 제네릭 클래스 배열 생성
Pair<String, Integer>[] arr = new Pair<String, Integer>[10];  // 에러

// ✅ 리스트 사용
List<Pair<String, Integer>> list = new ArrayList<>();

// ❌ 실수 3: static 멤버에서 타입 파라미터 사용
public class Container<T> {
    private static T defaultValue;  // 컴파일 에러! static에서 T 사용 불가
    // static은 클래스에 속하지만 T는 인스턴스마다 다르기 때문
}

// ✅ static에는 별도 타입 파라미터
public class Container<T> {
    public static <U> U getDefault(U value) {  // 별도 U 파라미터
        return value;
    }
}
```
