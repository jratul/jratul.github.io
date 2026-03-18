---
title: "함수와 확장 함수"
order: 2
---

## 함수 선언

```kotlin
// 기본
fun add(a: Int, b: Int): Int {
    return a + b
}

// 단일 표현식 (반환 타입 추론)
fun add(a: Int, b: Int) = a + b

// 반환값 없음 (Unit = Java의 void)
fun greet(name: String) {
    println("Hello, $name!")
}
```

## 기본 인자값과 이름 있는 인자

```kotlin
fun createUser(
    name: String,
    age: Int = 0,
    role: String = "USER"
) {
    println("$name / $age / $role")
}

// 기본값 사용
createUser("Alice")                          // Alice / 0 / USER
createUser("Bob", age = 30)                  // Bob / 30 / USER
createUser("Carol", role = "ADMIN", age = 25) // Carol / 25 / ADMIN
```

## 가변 인자 (vararg)

```kotlin
fun sum(vararg numbers: Int): Int {
    return numbers.sum()
}

sum(1, 2, 3)       // 6
sum(1, 2, 3, 4, 5) // 15

// 배열을 펼쳐서 전달
val arr = intArrayOf(1, 2, 3)
sum(*arr)  // spread operator
```

## 확장 함수

기존 클래스를 수정하지 않고 새 메서드를 추가합니다.

```kotlin
// String에 메서드 추가
fun String.isPalindrome(): Boolean {
    return this == this.reversed()
}

fun String.wordCount(): Int {
    return this.trim().split("\\s+".toRegex()).size
}

"racecar".isPalindrome()        // true
"hello".isPalindrome()          // false
"Hello World Kotlin".wordCount() // 3

// Int에 메서드 추가
fun Int.factorial(): Long {
    return (1..this).fold(1L) { acc, i -> acc * i }
}

5.factorial()  // 120
```

확장 함수는 실제로 클래스를 수정하지 않습니다. 컴파일 시 정적 함수로 변환됩니다.

## 람다

```kotlin
// 람다 타입: (파라미터 타입) -> 반환 타입
val multiply: (Int, Int) -> Int = { a, b -> a * b }
multiply(3, 4)  // 12

// 파라미터가 하나면 it으로 참조
val double: (Int) -> Int = { it * 2 }
double(5)  // 10

// 마지막 파라미터가 람다면 괄호 밖으로
listOf(1, 2, 3).forEach { println(it) }
listOf(1, 2, 3).map { it * 2 }  // [2, 4, 6]
listOf(1, 2, 3).filter { it > 1 }  // [2, 3]
```

## 고차 함수

```kotlin
fun operateOn(a: Int, b: Int, op: (Int, Int) -> Int): Int {
    return op(a, b)
}

operateOn(3, 4) { x, y -> x + y }  // 7
operateOn(3, 4, Int::times)         // 12 (메서드 참조)

// 함수를 반환하는 함수
fun multiplier(factor: Int): (Int) -> Int {
    return { it * factor }
}

val triple = multiplier(3)
triple(5)  // 15
```

## 인라인 함수

람다를 자주 쓰는 고차 함수에 `inline`을 붙이면 호출 오버헤드가 사라집니다.

```kotlin
inline fun measure(block: () -> Unit): Long {
    val start = System.currentTimeMillis()
    block()
    return System.currentTimeMillis() - start
}

val elapsed = measure {
    Thread.sleep(100)
}
println("${elapsed}ms")  // ~100ms
```
