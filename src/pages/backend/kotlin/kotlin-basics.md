---
title: "Kotlin 기본 개념과 특징"
date: "2026-02-26"
tags: ["kotlin", "jvm", "backend", "android"]
excerpt: "Kotlin의 핵심 문법과 Java와의 차이점을 정리합니다."
---

# Kotlin 기본 개념과 특징

Kotlin은 JetBrains이 만든 JVM 기반 언어입니다. Java와 100% 상호운용되며, Android 공식 언어로 채택되어 있습니다. Java보다 간결하고 null 안전성을 언어 차원에서 지원합니다.

---

## 변수 선언

```kotlin
val name = "Alice"    // 불변 (Java의 final)
var count = 0         // 가변

val pi: Double = 3.14 // 타입 명시 (대부분 생략 가능)
```

`val`은 재할당이 불가능하고, `var`은 가능합니다. 가능하면 `val`을 우선 사용합니다.

---

## Null 안전성

Kotlin의 가장 중요한 특징입니다. 타입 시스템이 null 가능 여부를 구분합니다.

```kotlin
var name: String = "Alice"   // null 불가
var name: String? = null     // null 가능 (? 붙임)

// null 가능한 변수를 그냥 사용하면 컴파일 에러
val length = name.length     // ❌ 컴파일 에러

// 안전 호출 연산자 ?.
val length = name?.length    // null이면 null 반환

// 엘비스 연산자 ?:
val length = name?.length ?: 0  // null이면 0 반환

// !! (null이 아님을 단언, NPE 가능)
val length = name!!.length   // name이 null이면 NPE 발생
```

---

## 함수

```kotlin
// 기본
fun add(a: Int, b: Int): Int {
    return a + b
}

// 단일 표현식
fun add(a: Int, b: Int) = a + b

// 기본 인자값
fun greet(name: String = "World") = "Hello, $name!"

// 이름 있는 인자
greet(name = "Alice")
```

### 확장 함수

기존 클래스를 수정하지 않고 메서드를 추가합니다.

```kotlin
fun String.isPalindrome(): Boolean {
    return this == this.reversed()
}

"racecar".isPalindrome()  // true
```

---

## 클래스

### data class

`equals`, `hashCode`, `toString`, `copy`를 자동 생성합니다.

```kotlin
data class User(val id: Long, val name: String, val email: String)

val user = User(1, "Alice", "alice@example.com")

// copy: 일부만 변경한 새 객체 생성
val updated = user.copy(name = "Bob")

// 구조 분해
val (id, name, email) = user
```

### object

싱글톤을 간단하게 만듭니다.

```kotlin
object Logger {
    fun log(message: String) = println("[LOG] $message")
}

Logger.log("Started")
```

### companion object

Java의 `static`에 해당합니다.

```kotlin
class User private constructor(val name: String) {
    companion object {
        fun create(name: String) = User(name)
    }
}

val user = User.create("Alice")
```

### sealed class

상속 가능한 클래스를 같은 파일 내로 제한합니다. `when`과 함께 쓸 때 유용합니다.

```kotlin
sealed class Result<out T>
data class Success<T>(val data: T) : Result<T>()
data class Failure(val error: Throwable) : Result<Nothing>()
object Loading : Result<Nothing>()

fun handle(result: Result<String>) = when (result) {
    is Success -> println(result.data)
    is Failure -> println(result.error.message)
    Loading    -> println("로딩 중...")
    // else 불필요 - 모든 경우를 처리했음을 컴파일러가 보장
}
```

---

## 컬렉션

### 불변 vs 가변

```kotlin
val list = listOf(1, 2, 3)           // 읽기 전용
val mutableList = mutableListOf(1, 2, 3) // 수정 가능

val map = mapOf("a" to 1, "b" to 2)
val mutableMap = mutableMapOf("a" to 1)
```

### 컬렉션 함수

```kotlin
val numbers = listOf(1, 2, 3, 4, 5)

numbers.filter { it > 2 }            // [3, 4, 5]
numbers.map { it * 2 }               // [2, 4, 6, 8, 10]
numbers.reduce { acc, n -> acc + n } // 15
numbers.any { it > 4 }               // true
numbers.all { it > 0 }               // true
numbers.groupBy { if (it % 2 == 0) "even" else "odd" }
// {odd=[1, 3, 5], even=[2, 4]}
```

---

## when 표현식

Java의 `switch`보다 강력합니다.

```kotlin
val score = 85

val grade = when {
    score >= 90 -> "A"
    score >= 80 -> "B"
    score >= 70 -> "C"
    else        -> "F"
}

// 타입 체크와 스마트 캐스트
fun describe(obj: Any) = when (obj) {
    is String -> "문자열, 길이: ${obj.length}"  // obj가 String으로 자동 캐스트
    is Int    -> "정수: $obj"
    is List<*> -> "리스트, 크기: ${obj.size}"
    else      -> "알 수 없음"
}
```

---

## 스마트 캐스트

타입 검사 후 자동으로 캐스트됩니다.

```kotlin
fun printLength(obj: Any) {
    if (obj is String) {
        // is 검사 후 obj는 자동으로 String 타입
        println(obj.length)  // 캐스트 불필요
    }
}

// Java였다면
// if (obj instanceof String) {
//     System.out.println(((String) obj).length());
// }
```

---

## 람다와 고차 함수

```kotlin
// 람다
val multiply = { a: Int, b: Int -> a * b }
multiply(3, 4)  // 12

// 고차 함수 (함수를 인자로 받음)
fun operateOn(a: Int, b: Int, operation: (Int, Int) -> Int): Int {
    return operation(a, b)
}

operateOn(3, 4) { x, y -> x + y }  // 7

// 마지막 인자가 람다면 괄호 밖으로 꺼낼 수 있음
listOf(1, 2, 3).forEach { println(it) }
```

---

## 코루틴

비동기 처리를 동기 코드처럼 작성합니다.

```kotlin
import kotlinx.coroutines.*

suspend fun fetchUser(id: Int): User {
    delay(1000)  // 1초 대기 (스레드 블로킹 없음)
    return User(id, "Alice")
}

// 코루틴 실행
fun main() = runBlocking {
    val user = fetchUser(1)  // suspend 함수 호출
    println(user.name)
}

// 병렬 실행
fun main() = runBlocking {
    val deferred1 = async { fetchUser(1) }
    val deferred2 = async { fetchUser(2) }

    val user1 = deferred1.await()
    val user2 = deferred2.await()
}
```

`suspend` 함수는 코루틴 안에서만 호출할 수 있습니다. `delay`는 스레드를 블로킹하지 않고 코루틴만 일시 중단합니다.

---

## Java와의 주요 차이점

| 항목 | Java | Kotlin |
|------|------|--------|
| Null 안전성 | 런타임 NPE | 컴파일 타임 체크 |
| 데이터 클래스 | 직접 구현 (또는 Lombok) | `data class` 한 줄 |
| 싱글톤 | 직접 구현 | `object` 키워드 |
| 확장 메서드 | 불가 | 확장 함수 |
| 타입 추론 | 제한적 (`var` Java 10+) | 전면 지원 |
| 문자열 템플릿 | `"Hello, " + name` | `"Hello, $name"` |
| 삼항 연산자 | `a ? b : c` | `if (a) b else c` |
| 비동기 | Thread, CompletableFuture | 코루틴 |
| 기본 클래스 | `class Foo {}` (약 50줄) | `data class Foo(...)` |

---

## Java 상호운용

Kotlin은 Java 코드를 그대로 호출할 수 있고, Java에서 Kotlin 코드도 호출 가능합니다.

```kotlin
// Kotlin에서 Java 클래스 사용
import java.util.ArrayList

val list = ArrayList<String>()
list.add("Hello")

// Java의 null 반환 메서드 → 플랫폼 타입(String!)
val str: String? = someJavaMethod()  // null 가능성 명시 권장
```

```java
// Java에서 Kotlin 함수 호출
// Kotlin: fun greet(name: String) = "Hello, $name"
String result = GreetKt.greet("Alice");

// Kotlin: @JvmStatic이 없으면 Java에서 호출이 번거로움
class MyClass {
    companion object {
        @JvmStatic
        fun create() = MyClass()
    }
}
MyClass.create();  // Java에서 자연스럽게 호출
```

---

## Spring Boot와 함께 쓰기

Spring Boot는 Kotlin을 공식 지원합니다.

```kotlin
@RestController
@RequestMapping("/api/users")
class UserController(
    private val userService: UserService  // 생성자 주입
) {
    @GetMapping("/{id}")
    fun getUser(@PathVariable id: Long): ResponseEntity<User> {
        val user = userService.findById(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(user)
    }

    @PostMapping
    fun createUser(@RequestBody dto: CreateUserDto): User {
        return userService.create(dto)
    }
}

// DTO
data class CreateUserDto(
    val name: String,
    val email: String
)
```

Java 대비 코드량이 줄고, null 처리(`?: return ResponseEntity.notFound().build()`)가 간결해집니다.
