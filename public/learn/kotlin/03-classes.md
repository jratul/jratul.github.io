---
title: "클래스"
order: 3
---

## 기본 클래스

```kotlin
class Person(val name: String, var age: Int) {
    // val → getter만, var → getter + setter 자동 생성

    fun introduce() = "안녕하세요, $name ($age세)입니다."
}

val alice = Person("Alice", 30)
println(alice.name)          // Alice
println(alice.introduce())   // 안녕하세요, Alice (30세)입니다.
alice.age = 31               // var이므로 변경 가능
```

## data class

`equals`, `hashCode`, `toString`, `copy`를 자동 생성합니다.

```kotlin
data class User(val id: Long, val name: String, val email: String)

val user = User(1, "Alice", "alice@example.com")

println(user)  // User(id=1, name=Alice, email=alice@example.com)

// copy: 일부만 바꾼 새 객체
val updated = user.copy(name = "Bob")

// 구조 분해
val (id, name, email) = user
println("$id: $name <$email>")

// equals는 내용 비교
val u1 = User(1, "Alice", "alice@example.com")
val u2 = User(1, "Alice", "alice@example.com")
println(u1 == u2)  // true (Java였다면 false)
```

## sealed class

같은 파일 내로 하위 클래스를 제한합니다. `when`과 함께 모든 경우를 빠짐없이 처리할 수 있습니다.

```kotlin
sealed class Result<out T>
data class Success<T>(val data: T) : Result<T>()
data class Failure(val error: Throwable) : Result<Nothing>()
object Loading : Result<Nothing>()

fun handle(result: Result<String>) = when (result) {
    is Success -> println("성공: ${result.data}")
    is Failure -> println("실패: ${result.error.message}")
    Loading    -> println("로딩 중...")
    // else 불필요 → 누락 시 컴파일 에러
}
```

## object

싱글톤을 간단하게 만듭니다.

```kotlin
object Logger {
    private val logs = mutableListOf<String>()

    fun log(message: String) {
        logs.add(message)
        println("[LOG] $message")
    }

    fun history() = logs.toList()
}

Logger.log("시작")
Logger.log("완료")
Logger.history()  // [시작, 완료]
```

## companion object

Java의 `static`에 해당합니다.

```kotlin
class User private constructor(val name: String, val role: String) {
    companion object {
        fun create(name: String) = User(name, "USER")
        fun createAdmin(name: String) = User(name, "ADMIN")

        const val MAX_NAME_LENGTH = 50
    }
}

val user = User.create("Alice")
val admin = User.createAdmin("Bob")
println(User.MAX_NAME_LENGTH)  // 50
```

## 인터페이스

```kotlin
interface Printable {
    fun print()

    // default 구현
    fun printWithBorder() {
        println("--- 시작 ---")
        print()
        println("--- 끝 ---")
    }
}

interface Saveable {
    fun save(): Boolean
}

class Report(val title: String) : Printable, Saveable {
    override fun print() = println("제목: $title")
    override fun save(): Boolean {
        println("$title 저장 완료")
        return true
    }
}

val r = Report("2026 보고서")
r.printWithBorder()
r.save()
```

## enum class

```kotlin
enum class Direction {
    NORTH, SOUTH, EAST, WEST;

    fun opposite() = when (this) {
        NORTH -> SOUTH
        SOUTH -> NORTH
        EAST  -> WEST
        WEST  -> EAST
    }
}

val dir = Direction.NORTH
println(dir.opposite())  // SOUTH
println(Direction.values().toList())  // [NORTH, SOUTH, EAST, WEST]
```
