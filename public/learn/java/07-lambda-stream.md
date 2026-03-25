---
title: "람다와 스트림"
order: 7
---

Java 8에서 도입된 **람다(Lambda)** 와 **스트림(Stream)** 은 코드를 훨씬 간결하고 읽기 쉽게 만들어줍니다. 처음에는 낯설어 보이지만, 익숙해지면 반복문보다 훨씬 표현력이 좋습니다.

---

## 람다 표현식이란?

람다는 **이름 없는 함수**입니다. 매서드를 변수처럼 다룰 수 있게 해줍니다.

요리 레시피로 비유하면, 기존에는 "볶음 요리하는 방법"이라는 이름의 레시피가 있어야 했다면, 람다는 "재료를 기름에 볶는다"는 동작 자체를 곧바로 전달하는 방식입니다.

```java
// 기존 방식: 인터페이스를 직접 구현
Runnable r1 = new Runnable() {
    @Override
    public void run() {
        System.out.println("안녕하세요!");
    }
};

// 람다 방식: 간결하게 표현
Runnable r2 = () -> System.out.println("안녕하세요!");

// 실행은 동일
r1.run();  // 안녕하세요!
r2.run();  // 안녕하세요!
```

람다 문법: `(매개변수) -> { 실행 내용 }`

```java
// 매개변수 없음
() -> System.out.println("hello")

// 매개변수 하나 (괄호 생략 가능)
name -> System.out.println(name)

// 매개변수 여러 개
(a, b) -> System.out.println(a + b)

// 반환값 있음 (중괄호 생략 시 return도 생략)
(a, b) -> a + b

// 여러 줄이면 중괄호 필요
(a, b) -> {
    int sum = a + b;
    return sum;
}
```

---

## 함수형 인터페이스

람다는 **추상 메서드가 딱 하나인 인터페이스**에 사용할 수 있습니다. 이런 인터페이스를 **함수형 인터페이스**라고 합니다.

```java
@FunctionalInterface  // 추상 메서드가 2개 이상이면 컴파일 에러 → 안전장치
public interface Calculator {
    int calculate(int a, int b);  // 추상 메서드 하나만
}

// 람다로 구현
Calculator add = (a, b) -> a + b;
Calculator sub = (a, b) -> a - b;
Calculator mul = (a, b) -> a * b;

System.out.println(add.calculate(10, 3));  // 13
System.out.println(sub.calculate(10, 3));  // 7
System.out.println(mul.calculate(10, 3));  // 30
```

---

## 표준 함수형 인터페이스 (java.util.function)

매번 직접 만들 필요 없이 Java가 미리 준비해둔 함수형 인터페이스들이 있습니다.

### Function\<T, R\> — 입력받아 변환

```java
// Function<입력타입, 반환타입>
Function<String, Integer> length = s -> s.length();
Function<String, String> upper  = s -> s.toUpperCase();

System.out.println(length.apply("hello"));   // 5
System.out.println(upper.apply("hello"));    // HELLO

// 함수 합성: andThen (앞 → 뒤 순서로 실행)
Function<String, String> lengthToString = length.andThen(n -> "길이: " + n);
System.out.println(lengthToString.apply("hello"));  // 길이: 5
```

### Predicate\<T\> — 조건 검사 (true/false 반환)

```java
Predicate<Integer> isEven   = n -> n % 2 == 0;
Predicate<String> isBlank   = s -> s.isBlank();
Predicate<Integer> isPositive = n -> n > 0;

System.out.println(isEven.test(4));    // true
System.out.println(isEven.test(5));    // false
System.out.println(isBlank.test(""));  // true

// 조건 조합
Predicate<Integer> isEvenAndPositive = isEven.and(isPositive);
Predicate<Integer> isEvenOrNegative  = isEven.or(n -> n < 0);
Predicate<Integer> isOdd             = isEven.negate();  // 반대

System.out.println(isEvenAndPositive.test(4));   // true
System.out.println(isEvenAndPositive.test(-4));  // false
```

### Consumer\<T\> — 입력만 받고 반환 없음

```java
Consumer<String> print   = s -> System.out.println(s);
Consumer<String> logFile = s -> saveToLog(s);  // 부수효과만 있음

print.accept("안녕하세요");  // 안녕하세요

// forEach에서 자주 사용
List<String> names = List.of("Alice", "Bob", "Carol");
names.forEach(print);  // 각 이름 출력
```

### Supplier\<T\> — 인수 없이 값 생성

```java
Supplier<String> greeting  = () -> "안녕하세요!";
Supplier<Integer> randomNum = () -> (int)(Math.random() * 100);
Supplier<LocalDate> today  = LocalDate::now;  // 메서드 참조

System.out.println(greeting.get());   // 안녕하세요!
System.out.println(randomNum.get());  // 0~99 중 랜덤 숫자
```

---

## 메서드 참조 (::)

람다에서 이미 있는 메서드를 그대로 호출하는 경우, `::` 로 더 간결하게 표현할 수 있습니다.

```java
// 람다와 메서드 참조 비교
Function<String, Integer> f1 = s -> Integer.parseInt(s);
Function<String, Integer> f2 = Integer::parseInt;  // 동일

Consumer<String> c1 = s -> System.out.println(s);
Consumer<String> c2 = System.out::println;  // 동일

// 인스턴스 메서드
String str = "hello";
Supplier<Integer> s1 = () -> str.length();
Supplier<Integer> s2 = str::length;  // 동일
```

---

## 스트림 (Stream)

스트림은 컬렉션을 **파이프라인 방식**으로 처리합니다. 마치 공장 생산 라인처럼, 데이터가 단계를 거치며 변환됩니다.

```
List (원본 데이터)
  → stream()           : 스트림 시작
  → filter(...)        : 조건으로 걸러내기 (중간 연산)
  → map(...)           : 변환 (중간 연산)
  → collect(...)       : 결과 수집 (최종 연산, 여기서 실제로 실행됨)
```

**중요**: 스트림은 **원본 데이터를 수정하지 않습니다**. 새로운 결과를 만들어냅니다.

---

## 중간 연산 — 데이터 가공

중간 연산은 스트림을 반환하므로 계속 이어 붙일 수 있습니다.

```java
List<String> names = List.of("Alice", "Bob", "Carol", "Dave", "Eve");

// filter: 조건을 만족하는 요소만 통과
names.stream()
     .filter(name -> name.length() > 3)  // 4글자 초과
     .forEach(System.out::println);
// Alice
// Carol
// Dave

// map: 각 요소를 다른 값으로 변환
List<Integer> lengths = names.stream()
    .map(name -> name.length())  // 이름 → 길이로 변환
    .collect(Collectors.toList());
System.out.println(lengths);  // [5, 3, 5, 4, 3]

// map으로 대문자 변환
List<String> upper = names.stream()
    .map(String::toUpperCase)
    .collect(Collectors.toList());
System.out.println(upper);  // [ALICE, BOB, CAROL, DAVE, EVE]

// sorted: 정렬
names.stream()
     .sorted()                     // 알파벳 오름차순
     .forEach(System.out::println); // Alice, Bob, Carol, Dave, Eve

// sorted with Comparator: 커스텀 정렬
names.stream()
     .sorted((a, b) -> a.length() - b.length())  // 길이 오름차순
     .forEach(System.out::println);

// distinct: 중복 제거
List<Integer> nums = List.of(1, 2, 2, 3, 3, 3, 4);
nums.stream()
    .distinct()
    .forEach(System.out::print);  // 1234

// limit / skip: 개수 제한 / 건너뛰기
names.stream()
     .skip(1)    // 첫 번째 건너뜀
     .limit(3)   // 최대 3개만
     .forEach(System.out::println);  // Bob, Carol, Dave
```

---

## 최종 연산 — 결과 수집

최종 연산이 호출될 때 실제로 스트림이 실행됩니다.

```java
List<Integer> numbers = List.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

// collect: 리스트로 수집
List<Integer> evens = numbers.stream()
    .filter(n -> n % 2 == 0)
    .collect(Collectors.toList());  // [2, 4, 6, 8, 10]

// 집계
long count = numbers.stream().filter(n -> n > 5).count();   // 5
int sum    = numbers.stream().mapToInt(Integer::intValue).sum();  // 55
int max    = numbers.stream().mapToInt(Integer::intValue).max().getAsInt(); // 10
double avg = numbers.stream().mapToInt(Integer::intValue).average().getAsDouble(); // 5.5

// 조건 검사
boolean anyOver5  = numbers.stream().anyMatch(n -> n > 5);  // true (하나라도 만족)
boolean allPos    = numbers.stream().allMatch(n -> n > 0);   // true (모두 만족)
boolean noneNeg   = numbers.stream().noneMatch(n -> n < 0);  // true (하나도 만족 안 함)

// findFirst / findAny
Optional<Integer> firstOver5 = numbers.stream()
    .filter(n -> n > 5)
    .findFirst();  // Optional[6]
firstOver5.ifPresent(System.out::println);  // 6

// reduce: 모든 요소를 하나로 합산
int product = numbers.stream()
    .reduce(1, (a, b) -> a * b);  // 1*2*3*...*10 = 3628800
```

---

## Optional — null을 안전하게 다루기

스트림의 일부 메서드는 결과가 없을 수도 있어서 `Optional`을 반환합니다. `Optional`은 "값이 있을 수도 없을 수도 있는 컨테이너"입니다.

```java
Optional<String> present = Optional.of("hello");    // 값 있음
Optional<String> empty   = Optional.empty();         // 값 없음
Optional<String> nullable = Optional.ofNullable(null); // null도 허용

// 값 존재 여부 확인
System.out.println(present.isPresent());  // true
System.out.println(empty.isEmpty());      // true

// 값 꺼내기
System.out.println(present.get());               // hello (없으면 NoSuchElementException)
System.out.println(empty.orElse("기본값"));       // 기본값
System.out.println(empty.orElseGet(() -> "동적 기본값")); // 동적 기본값
// empty.orElseThrow(() -> new RuntimeException("값 없음")); // 예외 던지기

// 변환
present.map(String::toUpperCase)
       .ifPresent(System.out::println);  // HELLO

// null 체크 대신 Optional 사용
// ❌ 전통 방식
String name = getName();
if (name != null) {
    System.out.println(name.toUpperCase());
}

// ✅ Optional 방식
Optional.ofNullable(getName())
    .map(String::toUpperCase)
    .ifPresent(System.out::println);
```

---

## collect — 다양한 수집 방법

```java
import java.util.stream.Collectors;

List<String> names = List.of("Alice", "Bob", "Carol", "Alice", "Dave");

// 리스트로
List<String> list = names.stream().collect(Collectors.toList());

// Set으로 (중복 제거)
Set<String> set = names.stream().collect(Collectors.toSet());

// 문자열로 합치기
String joined = names.stream().collect(Collectors.joining(", "));
System.out.println(joined);  // Alice, Bob, Carol, Alice, Dave

String joinedBrackets = names.stream()
    .collect(Collectors.joining(", ", "[", "]"));
System.out.println(joinedBrackets);  // [Alice, Bob, Carol, Alice, Dave]

// 그룹화
record Person(String name, String city) {}
List<Person> people = List.of(
    new Person("Alice", "Seoul"),
    new Person("Bob", "Busan"),
    new Person("Carol", "Seoul"),
    new Person("Dave", "Daegu")
);

Map<String, List<Person>> byCity = people.stream()
    .collect(Collectors.groupingBy(Person::city));
System.out.println(byCity.get("Seoul"));  // [Alice, Carol]

// 개수 세기
Map<String, Long> countByCity = people.stream()
    .collect(Collectors.groupingBy(Person::city, Collectors.counting()));
System.out.println(countByCity);  // {Seoul=2, Busan=1, Daegu=1}
```

---

## 실전 예제 — 상품 목록 처리

```java
record Product(String name, String category, int price) {}

List<Product> products = List.of(
    new Product("노트북", "전자기기", 1_200_000),
    new Product("마우스", "전자기기",    30_000),
    new Product("책상",   "가구",        250_000),
    new Product("의자",   "가구",        180_000),
    new Product("모니터", "전자기기",    350_000),
    new Product("키보드", "전자기기",     80_000)
);

// 전자기기 중 10만원 이상, 가격 내림차순으로 이름만 출력
List<String> result = products.stream()
    .filter(p -> p.category().equals("전자기기"))  // 전자기기 필터
    .filter(p -> p.price() >= 100_000)             // 10만원 이상 필터
    .sorted(Comparator.comparingInt(Product::price).reversed())  // 가격 내림차순
    .map(Product::name)                            // 이름만 추출
    .collect(Collectors.toList());

System.out.println(result);  // [노트북, 모니터]

// 카테고리별 평균 가격
Map<String, Double> avgByCategory = products.stream()
    .collect(Collectors.groupingBy(
        Product::category,
        Collectors.averagingInt(Product::price)
    ));
System.out.println(avgByCategory);
// {전자기기=415000.0, 가구=215000.0}

// 전체 금액 합계
int total = products.stream()
    .mapToInt(Product::price)
    .sum();
System.out.println("전체 합계: " + total + "원");  // 2090000원
```
