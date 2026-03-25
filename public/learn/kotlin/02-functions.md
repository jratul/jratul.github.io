---
title: "함수와 확장 함수"
order: 2
---

## 함수란 무엇인가요?

함수(Function)는 **특정 작업을 수행하는 코드 묶음**입니다. 요리 레시피처럼, 한 번 만들어두면 필요할 때마다 꺼내 쓸 수 있습니다. "볶음밥 만들기"라는 레시피가 있으면, 매번 처음부터 설명하지 않고 그냥 "볶음밥 만들기 해줘"라고 하면 되는 것처럼요.

Kotlin에서 함수를 만드는 방법은 `fun` 키워드로 시작합니다.

---

## 기본 함수 선언

```kotlin
// 가장 기본적인 함수 형태
// fun 함수이름(파라미터: 타입): 반환타입 { 본문 }
fun add(a: Int, b: Int): Int {
    return a + b  // a와 b를 더한 값을 반환
}

// 함수 호출
val result = add(3, 5)  // 8이 result에 저장됨
println(result)          // 8 출력
```

```kotlin
// 반환값이 없는 함수 (Unit은 Java의 void와 같음)
// Unit은 생략 가능합니다
fun greet(name: String): Unit {
    println("안녕하세요, ${name}님!")
}

// 더 간결하게 — Unit 생략
fun greet(name: String) {
    println("안녕하세요, ${name}님!")
}

greet("홍길동")  // 안녕하세요, 홍길동님!
```

---

## 단일 표현식 함수 — 한 줄로 쓰기

함수 본문이 딱 하나의 표현식(계산식)으로 이루어진 경우, `= 표현식` 형태로 줄일 수 있습니다.

```kotlin
// 일반 형태
fun add(a: Int, b: Int): Int {
    return a + b
}

// 단일 표현식 형태 (완전히 동일한 함수)
fun add(a: Int, b: Int): Int = a + b

// 반환 타입도 추론 가능하므로 더 줄일 수 있음
fun add(a: Int, b: Int) = a + b  // Int임을 컴파일러가 알아냄
```

```kotlin
// 다양한 예제
fun square(n: Int) = n * n               // 제곱
fun isEven(n: Int) = n % 2 == 0         // 짝수 여부
fun max(a: Int, b: Int) = if (a > b) a else b  // 최댓값
fun greetUser(name: String) = "안녕하세요, ${name}님!"  // 인사말
```

**Java와 비교:**
```java
// Java에서는 반드시 중괄호와 return을 써야 했음
public int add(int a, int b) {
    return a + b;
}
```

---

## 기본 인자값 (Default Arguments) — 생략 가능한 파라미터

함수를 정의할 때 파라미터에 기본값을 지정할 수 있습니다. 호출 시 해당 파라미터를 생략하면 기본값이 사용됩니다.

Java에서는 오버로딩(같은 이름의 함수를 여러 개 만들기)으로 해결해야 했던 문제를 훨씬 간결하게 처리할 수 있습니다.

```kotlin
// 파라미터에 = 기본값 형태로 기본값 지정
fun createUser(
    name: String,            // 기본값 없음 — 반드시 입력해야 함
    age: Int = 0,            // 기본값 0
    role: String = "USER",   // 기본값 "USER"
    isActive: Boolean = true // 기본값 true
) {
    println("이름: $name, 나이: $age, 역할: $role, 활성: $isActive")
}

// 다양한 방법으로 호출 가능
createUser("Alice")                           // Alice / 0 / USER / true
createUser("Bob", 30)                         // Bob / 30 / USER / true
createUser("Carol", 25, "ADMIN")              // Carol / 25 / ADMIN / true
createUser("Dave", 20, "USER", false)         // Dave / 20 / USER / false
```

**Java에서는 이렇게 했어야 했다:**
```java
// Java — 오버로딩으로 같은 함수를 여러 번 작성
void createUser(String name) { createUser(name, 0, "USER", true); }
void createUser(String name, int age) { createUser(name, age, "USER", true); }
void createUser(String name, int age, String role) { createUser(name, age, role, true); }
void createUser(String name, int age, String role, boolean isActive) { ... }
```

---

## 이름 있는 인자 (Named Arguments) — 순서 없이 호출하기

함수 호출 시 파라미터 이름을 명시하면, 순서에 상관없이 원하는 값만 전달할 수 있습니다.

```kotlin
fun createUser(
    name: String,
    age: Int = 0,
    role: String = "USER"
) {
    println("$name / $age / $role")
}

// 이름 있는 인자 — 원하는 것만 지정
createUser("Alice")                          // Alice / 0 / USER
createUser("Bob", age = 30)                  // Bob / 30 / USER — age만 지정
createUser("Carol", role = "ADMIN")          // Carol / 0 / ADMIN — role만 지정
createUser("Dave", role = "ADMIN", age = 25) // Dave / 25 / ADMIN — 순서 바꿔도 OK
```

이름 있는 인자를 쓰면 코드가 **자기 설명적(self-explanatory)**이 됩니다. `createUser("Dave", "ADMIN", 25)` 처럼 쓰면 "ADMIN"이 role인지 name인지 바로 알기 어렵지만, `role = "ADMIN"`이라고 쓰면 한눈에 이해됩니다.

---

## 가변 인자 (vararg) — 개수가 정해지지 않은 파라미터

파라미터 앞에 `vararg`를 붙이면 여러 개의 값을 한꺼번에 받을 수 있습니다. 함수 내부에서는 배열처럼 다룰 수 있습니다.

```kotlin
// vararg — 몇 개를 넘겨도 받을 수 있음
fun sum(vararg numbers: Int): Int {
    var total = 0
    for (n in numbers) {  // numbers는 IntArray처럼 다룸
        total += n
    }
    return total
    // 또는 return numbers.sum() 으로 간결하게
}

sum(1)           // 1
sum(1, 2, 3)     // 6
sum(1, 2, 3, 4, 5) // 15
```

```kotlin
// vararg는 마지막 파라미터가 아니어도 됩니다 (하지만 보통 마지막에 씀)
fun printAll(prefix: String, vararg messages: String) {
    for (msg in messages) {
        println("[$prefix] $msg")  // prefix와 함께 출력
    }
}

printAll("INFO", "서버 시작", "포트: 8080", "준비 완료")
// [INFO] 서버 시작
// [INFO] 포트: 8080
// [INFO] 준비 완료
```

```kotlin
// 이미 배열이 있다면 * (스프레드 연산자)로 펼쳐서 전달
val numbers = intArrayOf(1, 2, 3, 4, 5)
val result = sum(*numbers)  // 배열을 개별 인자로 펼쳐서 전달
println(result)  // 15
```

---

## 확장 함수 (Extension Functions) — 기존 클래스에 기능 추가하기

확장 함수는 Kotlin의 가장 강력한 기능 중 하나입니다. **기존 클래스의 소스코드를 건드리지 않고** 새로운 메서드를 추가하는 것처럼 사용할 수 있습니다.

마치 표준 라이브러리의 `String` 클래스를 직접 수정하지 않았지만, `String`에서 바로 호출할 수 있는 메서드를 만드는 것입니다.

```kotlin
// 문법: fun 클래스이름.함수이름(파라미터): 반환타입 { 본문 }
// 본문 안에서 this는 해당 클래스의 인스턴스를 가리킴

// String 클래스에 isPalindrome (회문 판별) 함수 추가
fun String.isPalindrome(): Boolean {
    return this == this.reversed()  // this는 String 인스턴스
}

// String에 wordCount (단어 수 세기) 함수 추가
fun String.wordCount(): Int {
    return this.trim()              // 앞뒤 공백 제거
               .split("\\s+".toRegex())  // 공백으로 분리
               .size                     // 개수 반환
}

// 사용 — 마치 String의 원래 메서드처럼!
println("racecar".isPalindrome())       // true  (앞뒤가 같음)
println("hello".isPalindrome())          // false
println("level".isPalindrome())          // true
println("Hello World Kotlin".wordCount()) // 3
```

```kotlin
// Int에 factorial (팩토리얼) 추가
fun Int.factorial(): Long {
    if (this < 0) throw IllegalArgumentException("음수는 팩토리얼 불가")
    return (1..this).fold(1L) { acc, i -> acc * i }  // 1부터 this까지 곱
}

println(5.factorial())  // 120 (1×2×3×4×5)
println(0.factorial())  // 1 (0! = 1 by definition)
```

```kotlin
// 타입을 예쁘게 출력하는 확장 함수
fun Int.toKorean(): String {
    return when {
        this >= 10000 -> "${this / 10000}만 ${this % 10000}"
        else -> this.toString()
    }
}

println(50000.toKorean())   // 5만 0
println(12345.toKorean())   // 1만 2345
```

**중요한 점:** 확장 함수는 실제로 클래스를 수정하지 않습니다. 컴파일하면 정적(static) 함수로 변환됩니다. 즉, `"racecar".isPalindrome()`은 내부적으로 `isPalindrome("racecar")`와 같이 동작합니다.

---

## 람다 (Lambda) — 함수를 값처럼 다루기

람다는 **이름 없는 함수**입니다. 변수에 저장하거나 다른 함수에 전달할 수 있습니다. `{ 파라미터 -> 본문 }` 형태로 작성합니다.

```kotlin
// 람다 타입: (파라미터 타입, ...) -> 반환 타입
val multiply: (Int, Int) -> Int = { a, b -> a * b }  // a×b 계산
println(multiply(3, 4))  // 12

// 파라미터가 하나일 때는 it으로 참조 가능
val double: (Int) -> Int = { it * 2 }  // it은 람다의 유일한 파라미터
println(double(5))  // 10

// 파라미터 없는 람다
val sayHello: () -> Unit = { println("안녕하세요!") }
sayHello()  // 안녕하세요!
```

```kotlin
// 람다를 컬렉션 함수에 전달하는 일이 가장 흔한 사용 패턴
val numbers = listOf(1, 2, 3, 4, 5)

// forEach: 각 원소에 대해 실행
numbers.forEach { n -> println(n) }  // 1, 2, 3, 4, 5 각각 출력

// map: 각 원소를 변환
val doubled = numbers.map { it * 2 }  // [2, 4, 6, 8, 10]

// filter: 조건에 맞는 원소만 선택
val evens = numbers.filter { it % 2 == 0 }  // [2, 4]
```

**후행 람다 (Trailing Lambda):** 함수의 마지막 파라미터가 람다이면, 괄호 밖으로 꺼낼 수 있습니다.

```kotlin
// 아래 두 코드는 완전히 동일합니다
numbers.forEach({ println(it) })  // 괄호 안에 람다
numbers.forEach { println(it) }   // 후행 람다 — 더 읽기 좋음

// 빈 괄호는 생략 가능
numbers.map({ it * 2 })  // 괄호에 람다만 있으면
numbers.map { it * 2 }   // 이렇게 써도 됨
```

---

## 고차 함수 (Higher-Order Functions) — 함수를 받거나 반환하는 함수

고차 함수는 **함수를 파라미터로 받거나 함수를 반환하는 함수**입니다. 수학에서 "함수를 인자로 받는 함수"와 같은 개념입니다.

```kotlin
// 두 수와 연산을 받아서 계산하는 고차 함수
fun operateOn(a: Int, b: Int, op: (Int, Int) -> Int): Int {
    return op(a, b)  // 전달받은 함수(op)를 호출
}

// 다양한 연산을 전달
println(operateOn(3, 4) { x, y -> x + y })  // 7 (더하기)
println(operateOn(3, 4) { x, y -> x * y })  // 12 (곱하기)
println(operateOn(10, 4) { x, y -> x - y }) // 6 (빼기)

// 메서드 참조로 전달
println(operateOn(3, 4, Int::plus))   // 7 (Int의 + 연산자)
println(operateOn(3, 4, Int::times))  // 12 (Int의 × 연산자)
```

```kotlin
// 함수를 반환하는 함수
fun multiplier(factor: Int): (Int) -> Int {
    return { it * factor }  // factor를 기억하는 람다 반환
}

val double = multiplier(2)   // 2를 곱하는 함수
val triple = multiplier(3)   // 3을 곱하는 함수
val tenTimes = multiplier(10) // 10을 곱하는 함수

println(double(5))    // 10
println(triple(5))    // 15
println(tenTimes(5))  // 50

// 컬렉션에 활용
val numbers = listOf(1, 2, 3, 4, 5)
println(numbers.map(double))   // [2, 4, 6, 8, 10]
println(numbers.map(triple))   // [3, 6, 9, 12, 15]
```

```kotlin
// 실전 예제: 조건을 파라미터로 받는 고차 함수
fun List<Int>.customFilter(predicate: (Int) -> Boolean): List<Int> {
    val result = mutableListOf<Int>()
    for (item in this) {
        if (predicate(item)) {  // 조건(predicate)이 true면 포함
            result.add(item)
        }
    }
    return result
}

val numbers = listOf(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
val evens = numbers.customFilter { it % 2 == 0 }  // 짝수만
val bigs = numbers.customFilter { it > 5 }         // 5보다 큰 것만
println(evens)  // [2, 4, 6, 8, 10]
println(bigs)   // [6, 7, 8, 9, 10]
```

---

## 인라인 함수 (inline) — 람다 성능 최적화

고차 함수를 자주 사용하면 람다 객체를 매번 생성하는 오버헤드가 생깁니다. `inline` 키워드를 붙이면 컴파일 시 함수 본문이 호출 지점에 직접 복사되어, 함수 호출과 람다 객체 생성 비용이 사라집니다.

```kotlin
// inline 없는 경우 — 람다 객체가 매번 생성됨
fun measureTime(block: () -> Unit): Long {
    val start = System.currentTimeMillis()
    block()  // 람다 호출
    return System.currentTimeMillis() - start
}

// inline 키워드 추가 — 컴파일 시 본문이 호출 위치에 복사됨
inline fun measureTime(block: () -> Unit): Long {
    val start = System.currentTimeMillis()  // 이 코드가
    block()                                  // 호출 위치에
    return System.currentTimeMillis() - start  // 그대로 복사됨
}

// 사용
val elapsed = measureTime {
    Thread.sleep(100)  // 100ms 대기
}
println("실행 시간: ${elapsed}ms")  // 실행 시간: ~100ms
```

```kotlin
// 실전 예제: 로깅과 함께 실행
inline fun <T> withLogging(tag: String, block: () -> T): T {
    println("[$tag] 시작")         // 시작 로그
    val result = block()            // 실제 작업 실행
    println("[$tag] 완료")         // 완료 로그
    return result
}

val data = withLogging("DB조회") {
    // 실제로는 DB 조회 로직
    "사용자 데이터"
}
// [DB조회] 시작
// [DB조회] 완료
```

---

## 함수 참조 (::) — 함수를 값으로 전달하기

람다를 직접 작성하는 대신, 이미 정의된 함수를 `::함수이름` 형태로 참조하여 전달할 수 있습니다.

```kotlin
// 일반 함수 참조
fun isPositive(n: Int): Boolean = n > 0

val numbers = listOf(-3, -1, 0, 2, 4, 5)

// 람다 전달
val positives1 = numbers.filter { it > 0 }

// 함수 참조 전달 — 위와 동일한 결과
val positives2 = numbers.filter(::isPositive)

println(positives1)  // [2, 4, 5]
println(positives2)  // [2, 4, 5]
```

```kotlin
// 멤버 함수 참조
data class Person(val name: String, val age: Int)

val people = listOf(
    Person("홍길동", 30),
    Person("김영희", 25),
    Person("이철수", 35)
)

// Person::name 은 (Person) -> String 타입의 함수 참조
val names = people.map(Person::name)   // ["홍길동", "김영희", "이철수"]
val sorted = people.sortedBy(Person::age)  // 나이순 정렬

println(names)
println(sorted)
```

```kotlin
// 생성자 참조
data class Point(val x: Int, val y: Int)

val coords = listOf(Pair(1, 2), Pair(3, 4), Pair(5, 6))

// ::Point 는 (Int, Int) -> Point 타입의 함수 참조
val points = coords.map { (x, y) -> Point(x, y) }    // 람다 버전
val points2 = coords.map { Point(it.first, it.second) } // 동일

// 문자열 리스트를 Int 리스트로 변환
val strNums = listOf("1", "2", "3", "4")
val intNums = strNums.map(String::toInt)  // [1, 2, 3, 4]
```

---

## 흔한 실수들

```kotlin
// ❌ 실수 1: 반환 타입을 잘못 추론시키기
fun getUser() = null  // 반환 타입이 Nothing?이 됨 (의도와 다를 수 있음)
fun getUser(): User? = null  // 명시적으로 User?를 반환함을 알려야 함

// ❌ 실수 2: vararg와 일반 배열을 혼동
fun printAll(vararg items: String) { items.forEach { println(it) } }

val arr = arrayOf("a", "b", "c")
// printAll(arr)   // ❌ 컴파일 에러 — 배열을 vararg에 직접 전달 불가
printAll(*arr)     // ✅ 스프레드 연산자(*)로 펼쳐서 전달

// ❌ 실수 3: 람다의 마지막 표현식이 반환값
val result = listOf(1, 2, 3).map {
    val doubled = it * 2
    doubled + 1  // ← 이 값이 반환됨 (return 키워드 불필요)
}
println(result)  // [3, 5, 7]

// ❌ 실수 4: 람다에서 return 사용 시 주의
fun findFirst(numbers: List<Int>): Int? {
    numbers.forEach {
        if (it > 3) return it  // 이 return은 forEach가 아닌 findFirst 함수 전체를 반환!
    }
    return null
}
// return@forEach 로 람다에서만 빠져나오려면:
fun findFirst2(numbers: List<Int>): Int? {
    numbers.forEach {
        if (it > 3) return@forEach  // 이 이터레이션만 건너뜀
    }
    return null
}
```

---

## 전체 정리

| 개념 | 핵심 내용 | 예시 |
|------|----------|------|
| 기본 함수 | `fun 이름(파라미터): 반환타입` | `fun add(a: Int, b: Int) = a + b` |
| 기본 인자값 | 호출 시 생략 가능 | `fun f(x: Int = 0)` |
| 이름 있는 인자 | 순서 무관하게 전달 | `f(x = 10)` |
| vararg | 여러 개 인자 받기 | `fun sum(vararg n: Int)` |
| 확장 함수 | 기존 클래스에 기능 추가 | `fun String.isPalindrome()` |
| 람다 | 이름 없는 함수 | `{ a, b -> a + b }` |
| 고차 함수 | 함수를 받거나 반환 | `fun map(transform: (T) -> R)` |
| inline | 람다 오버헤드 제거 | `inline fun measure(block: () -> Unit)` |
| 함수 참조 | 함수를 값으로 전달 | `numbers.map(::double)` |
