---
title: "람다와 스트림"
order: 7
---

## 함수형 인터페이스

메서드가 **하나**인 인터페이스입니다. 람다로 구현할 수 있습니다.

```java
@FunctionalInterface
public interface Calculator {
    int calculate(int a, int b);
}

Calculator add = (a, b) -> a + b;
Calculator mul = (a, b) -> a * b;

System.out.println(add.calculate(3, 4));  // 7
System.out.println(mul.calculate(3, 4));  // 12
```

## 표준 함수형 인터페이스

자주 쓰는 패턴은 `java.util.function`에 미리 정의되어 있습니다.

```java
// Function<T, R>: T를 받아 R을 반환
Function<String, Integer> length = String::length;
System.out.println(length.apply("hello"));  // 5

// Predicate<T>: T를 받아 boolean 반환
Predicate<Integer> isEven = n -> n % 2 == 0;
System.out.println(isEven.test(4));  // true

// Consumer<T>: T를 받아 아무것도 반환 안 함
Consumer<String> print = System.out::println;
print.accept("Hello");  // Hello

// Supplier<T>: 아무것도 안 받고 T를 반환
Supplier<String> greeting = () -> "안녕하세요";
System.out.println(greeting.get());  // 안녕하세요
```

## 스트림 (Stream)

컬렉션을 함수형 스타일로 처리합니다. **원본 데이터를 변경하지 않습니다.**

```
List → stream() → 중간 연산(0개 이상) → 최종 연산(1개)
```

### 중간 연산 (Intermediate)

```java
List<String> names = List.of("Alice", "Bob", "Carol", "Dave", "Eve");

// filter: 조건에 맞는 것만
names.stream()
     .filter(name -> name.length() > 3)  // Alice, Carol, Dave
     .forEach(System.out::println);

// map: 변환
List<Integer> lengths = names.stream()
    .map(String::length)
    .collect(Collectors.toList());  // [5, 3, 5, 4, 3]

// sorted: 정렬
names.stream()
     .sorted()
     .forEach(System.out::println);

// distinct: 중복 제거
List<Integer> nums = List.of(1, 2, 2, 3, 3, 3);
nums.stream()
    .distinct()
    .forEach(System.out::print);  // 123
```

### 최종 연산 (Terminal)

```java
List<Integer> numbers = List.of(1, 2, 3, 4, 5);

// collect: 컬렉션으로 수집
List<Integer> evens = numbers.stream()
    .filter(n -> n % 2 == 0)
    .collect(Collectors.toList());  // [2, 4]

// reduce: 하나의 값으로 합산
int sum = numbers.stream()
    .reduce(0, Integer::sum);  // 15

// count
long count = numbers.stream().filter(n -> n > 3).count();  // 2

// anyMatch / allMatch / noneMatch
boolean hasEven = numbers.stream().anyMatch(n -> n % 2 == 0);  // true
boolean allPos  = numbers.stream().allMatch(n -> n > 0);        // true
boolean noneNeg = numbers.stream().noneMatch(n -> n < 0);       // true

// findFirst
Optional<Integer> first = numbers.stream()
    .filter(n -> n > 3)
    .findFirst();  // Optional[4]
first.ifPresent(System.out::println);  // 4
```

## Optional

`null` 대신 값이 있을 수도 없을 수도 있음을 명시합니다.

```java
Optional<String> opt = Optional.of("hello");
Optional<String> empty = Optional.empty();

System.out.println(opt.isPresent());         // true
System.out.println(opt.get());               // hello
System.out.println(empty.orElse("default")); // default
System.out.println(opt.map(String::toUpperCase).orElse(""));  // HELLO
```

## 실전 예제

```java
record Product(String name, String category, int price) {}

List<Product> products = List.of(
    new Product("노트북", "전자기기", 1_200_000),
    new Product("마우스", "전자기기", 30_000),
    new Product("책상", "가구", 250_000),
    new Product("의자", "가구", 180_000),
    new Product("모니터", "전자기기", 350_000)
);

// 전자기기 중 가격이 100,000원 이상인 것의 이름 목록, 가격 내림차순
List<String> result = products.stream()
    .filter(p -> p.category().equals("전자기기"))
    .filter(p -> p.price() >= 100_000)
    .sorted(Comparator.comparingInt(Product::price).reversed())
    .map(Product::name)
    .collect(Collectors.toList());

System.out.println(result);  // [노트북, 모니터]

// 카테고리별 그룹화
Map<String, List<Product>> byCategory = products.stream()
    .collect(Collectors.groupingBy(Product::category));
```
