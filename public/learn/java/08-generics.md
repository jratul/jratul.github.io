---
title: "제네릭"
order: 8
---

## 제네릭이란

타입을 파라미터처럼 사용하는 기능입니다. 컴파일 시점에 타입 안전성을 보장하고, 형변환 코드를 줄여줍니다.

```java
// 제네릭 없이 → Object 반환 → 매번 형변환 필요
List list = new ArrayList();
list.add("hello");
String s = (String) list.get(0);  // 형변환 필요, 잘못 쓰면 런타임 에러

// 제네릭 사용 → 컴파일 타임에 타입 체크
List<String> strings = new ArrayList<>();
strings.add("hello");
String s = strings.get(0);  // 형변환 불필요
strings.add(123);            // 컴파일 에러 (즉시 발견)
```

## 제네릭 클래스

```java
public class Box<T> {
    private T value;

    public Box(T value) {
        this.value = value;
    }

    public T get() {
        return value;
    }
}

Box<String> strBox = new Box<>("hello");
Box<Integer> intBox = new Box<>(42);

System.out.println(strBox.get());  // hello
System.out.println(intBox.get());  // 42
```

타입 파라미터 이름은 관례상 `T`(Type), `E`(Element), `K`(Key), `V`(Value), `R`(Return) 을 주로 씁니다.

## 제네릭 메서드

```java
public class Utils {
    // 메서드 레벨에서 타입 파라미터 선언
    public static <T> T firstOrDefault(List<T> list, T defaultValue) {
        return list.isEmpty() ? defaultValue : list.get(0);
    }

    public static <T extends Comparable<T>> T max(T a, T b) {
        return a.compareTo(b) >= 0 ? a : b;
    }
}

String result = Utils.firstOrDefault(List.of("a", "b"), "none");  // "a"
int bigger = Utils.max(10, 20);   // 20
String longer = Utils.max("abc", "ab");  // "abc"
```

## 와일드카드

### `?` — 알 수 없는 타입

```java
// List<Integer>, List<String> 모두 받을 수 있음
public static void printAll(List<?> list) {
    for (Object item : list) {
        System.out.println(item);
    }
}
```

### `? extends T` — 상한 경계 (T 또는 T의 하위 타입)

```java
// Number 또는 그 하위 타입(Integer, Double...)만 허용
public static double sum(List<? extends Number> list) {
    return list.stream().mapToDouble(Number::doubleValue).sum();
}

sum(List.of(1, 2, 3));       // List<Integer> → 가능
sum(List.of(1.1, 2.2));      // List<Double> → 가능
```

### `? super T` — 하한 경계 (T 또는 T의 상위 타입)

```java
// Integer의 상위 타입(Number, Object...)만 허용
public static void addNumbers(List<? super Integer> list) {
    list.add(1);
    list.add(2);
}
```

**PECS 원칙**: Producer → `extends`, Consumer → `super`

```java
// 데이터를 꺼낼 때(생산) → extends
List<? extends Number> producer = List.of(1, 2, 3);
Number n = producer.get(0);  // OK

// 데이터를 넣을 때(소비) → super
List<? super Integer> consumer = new ArrayList<Number>();
consumer.add(42);  // OK
```

## 타입 소거 (Type Erasure)

제네릭 타입 정보는 **컴파일 후 사라집니다**. JVM은 제네릭을 모릅니다.

```java
List<String> strings = new ArrayList<>();
List<Integer> integers = new ArrayList<>();

// 런타임에는 같은 타입
System.out.println(strings.getClass() == integers.getClass());  // true

// instanceof 검사 불가
if (strings instanceof List<String>) {}  // 컴파일 에러
if (strings instanceof List<?>) {}       // 가능
```

실체화 불가 타입이기 때문에 제네릭 배열 생성도 안 됩니다.

```java
T[] arr = new T[10];          // 컴파일 에러
T[] arr = (T[]) new Object[10]; // 경고와 함께 가능 (비권장)
```

## 제네릭 인터페이스

```java
public interface Repository<T, ID> {
    T findById(ID id);
    List<T> findAll();
    void save(T entity);
}

public class UserRepository implements Repository<User, Long> {
    @Override
    public User findById(Long id) { ... }

    @Override
    public List<User> findAll() { ... }

    @Override
    public void save(User user) { ... }
}
```

## 실전 예제: 페이지 응답

```java
public class PageResponse<T> {
    private final List<T> content;
    private final int totalCount;
    private final int page;
    private final int size;

    public PageResponse(List<T> content, int totalCount, int page, int size) {
        this.content = content;
        this.totalCount = totalCount;
        this.page = page;
        this.size = size;
    }

    public boolean hasNext() {
        return (long) page * size < totalCount;
    }

    // getters...
}

// 사용
PageResponse<User> userPage = new PageResponse<>(users, 100, 1, 20);
PageResponse<Order> orderPage = new PageResponse<>(orders, 50, 1, 10);
```
