---
title: "클래스"
order: 3
---

## 클래스란 무엇인가요?

클래스(Class)는 **데이터와 그 데이터를 다루는 기능을 하나로 묶은 설계도**입니다. 붕어빵 틀이 클래스라면, 실제 붕어빵은 인스턴스(객체)입니다. 틀 하나로 붕어빵을 여러 개 만들 수 있듯이, 클래스 하나로 여러 객체를 만들 수 있습니다.

Kotlin의 클래스는 Java에 비해 훨씬 간결합니다.

---

## 기본 클래스

```kotlin
// Java에서는 필드 선언, 생성자, getter/setter를 따로 작성해야 했음
// Kotlin에서는 주 생성자(primary constructor)에 모두 포함

class Person(val name: String, var age: Int) {
    // val name → getter만 자동 생성 (읽기 전용)
    // var age  → getter + setter 자동 생성 (읽기/쓰기 가능)

    // 메서드 정의
    fun introduce(): String {
        return "안녕하세요, 저는 ${name}이고 ${age}살입니다."
    }

    // 단일 표현식 함수로 간결하게
    fun isAdult() = age >= 18
}

// 객체 생성 — Kotlin에는 new 키워드가 없음
val alice = Person("Alice", 30)
val bob = Person("Bob", 17)

println(alice.name)         // Alice (getter 호출)
println(alice.age)          // 30
println(alice.introduce())  // 안녕하세요, 저는 Alice이고 30살입니다.
println(alice.isAdult())    // true

alice.age = 31              // var이므로 변경 가능
// alice.name = "Alicia"    // ❌ val이므로 변경 불가 — 컴파일 에러
```

**Java와 비교:**
```java
// Java — 40줄이 넘는 코드를 작성해야 함
public class Person {
    private final String name;
    private int age;

    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public String getName() { return name; }
    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
    // toString, equals, hashCode 등 직접 작성...
}
```

---

## init 블록 — 생성자에서 초기화 로직 실행

객체가 생성될 때 추가 로직을 실행하고 싶다면 `init` 블록을 사용합니다.

```kotlin
class User(val name: String, val age: Int) {
    val displayName: String  // 나중에 초기화

    init {
        // 객체 생성 시 실행되는 블록
        require(name.isNotBlank()) { "이름은 비어 있을 수 없습니다" }
        require(age >= 0) { "나이는 0 이상이어야 합니다" }

        displayName = "${name}님"  // init 블록에서 초기화
        println("User 객체 생성: $name")
    }
}

val user = User("홍길동", 25)  // "User 객체 생성: 홍길동" 출력
// val bad = User("", 25)  // ❌ IllegalArgumentException: 이름은 비어 있을 수 없습니다
```

---

## 보조 생성자 (Secondary Constructor)

주 생성자 외에 추가 생성자가 필요하다면 `constructor` 키워드로 정의합니다. 단, 반드시 주 생성자를 `this(...)`로 호출해야 합니다.

```kotlin
class Rectangle(val width: Double, val height: Double) {
    val area = width * height  // 프로퍼티 선언 시 초기화

    // 정사각형을 만드는 보조 생성자
    constructor(side: Double) : this(side, side) {
        // 주 생성자 this(side, side)를 먼저 호출
        println("정사각형: ${side}×${side}")
    }
}

val rect = Rectangle(3.0, 4.0)  // width=3, height=4
val square = Rectangle(5.0)     // width=5, height=5 (정사각형)
println(rect.area)    // 12.0
println(square.area)  // 25.0
```

---

## data class — 데이터를 담는 클래스

`data class`는 **데이터를 담는 것이 주 목적인 클래스**입니다. `data` 키워드 하나로 `equals`, `hashCode`, `toString`, `copy` 메서드가 자동으로 생성됩니다.

```kotlin
// data 키워드 하나면 충분
data class User(val id: Long, val name: String, val email: String)

val user = User(1L, "Alice", "alice@example.com")

// toString — 내용을 보기 좋게 출력
println(user)  // User(id=1, name=Alice, email=alice@example.com)

// equals — 내용이 같으면 같은 객체로 취급
val user1 = User(1L, "Alice", "alice@example.com")
val user2 = User(1L, "Alice", "alice@example.com")
println(user1 == user2)  // true (Java였다면 false — 참조 비교)

// copy — 일부만 변경한 새 객체 생성
val updated = user.copy(name = "Bob")  // name만 Bob으로 변경
println(updated)  // User(id=1, name=Bob, email=alice@example.com)
println(user)     // User(id=1, name=Alice, email=alice@example.com) — 원본 불변

// 구조 분해 (Destructuring)
val (id, name, email) = user  // 각 프로퍼티를 별도 변수로 분해
println("$id: $name <$email>")  // 1: Alice <alice@example.com>
```

**Java와 비교:**
```java
// Java 14+ record와 유사하지만, Kotlin은 훨씬 더 많은 기능 제공
record User(long id, String name, String email) {}
// copy, 구조 분해 없음
```

**data class 주의사항:**
```kotlin
// data class는 주 생성자에 val/var 파라미터가 1개 이상 있어야 함
// 상속은 가능하지만 권장하지 않음 (equals/hashCode가 복잡해짐)

// ✅ 올바른 사용
data class Point(val x: Double, val y: Double)

// ❌ data class를 상속받는 data class — 문제 발생 가능
// data class Point3D(val z: Double) : Point(0.0, 0.0)
```

---

## sealed class — 제한된 계층 구조

`sealed class`는 **하위 클래스를 같은 파일 안으로 제한**합니다. 이를 통해 `when` 표현식으로 모든 경우를 빠짐없이 처리할 수 있습니다.

API 응답, UI 상태, 에러 타입 등을 표현할 때 매우 유용합니다.

```kotlin
// 네트워크 요청 결과를 sealed class로 표현
sealed class NetworkResult<out T>

data class Success<T>(val data: T) : NetworkResult<T>()  // 성공
data class Failure(val error: String, val code: Int) : NetworkResult<Nothing>()  // 실패
object Loading : NetworkResult<Nothing>()  // 로딩 중

// when 표현식 — else 없이 모든 경우를 처리
fun handleResult(result: NetworkResult<String>) {
    when (result) {
        is Success -> println("성공: ${result.data}")
        is Failure -> println("실패 (${result.code}): ${result.error}")
        Loading    -> println("로딩 중...")
        // else를 안 써도 됨 — 컴파일러가 모든 경우가 처리됐는지 확인
    }
}

// 사용 예
handleResult(Success("사용자 데이터"))  // 성공: 사용자 데이터
handleResult(Failure("네트워크 오류", 503))  // 실패 (503): 네트워크 오류
handleResult(Loading)  // 로딩 중...
```

```kotlin
// 실전 예제: UI 상태 관리
sealed class UiState<out T> {
    object Idle : UiState<Nothing>()
    object Loading : UiState<Nothing>()
    data class Success<T>(val data: T) : UiState<T>()
    data class Error(val message: String) : UiState<Nothing>()
}

fun renderUi(state: UiState<List<String>>) = when (state) {
    UiState.Idle    -> println("대기 중")
    UiState.Loading -> println("로딩 스피너 표시")
    is UiState.Success -> println("데이터 표시: ${state.data}")
    is UiState.Error   -> println("에러 메시지 표시: ${state.message}")
}
```

---

## object — 싱글톤 만들기

`object` 키워드로 **싱글톤(Singleton)** — 프로그램 전체에서 딱 하나만 존재하는 객체를 만들 수 있습니다. `getInstance()` 패턴 없이 언어 차원에서 지원합니다.

```kotlin
// Logger 싱글톤 — 앱 전체에서 하나만 존재
object Logger {
    private val logs = mutableListOf<String>()  // 로그 저장소

    fun log(message: String) {
        val timestamp = System.currentTimeMillis()
        logs.add("[$timestamp] $message")
        println("[LOG] $message")
    }

    fun getHistory(): List<String> = logs.toList()  // 불변 복사본 반환

    fun clear() = logs.clear()  // 로그 초기화
}

// 사용 — 클래스처럼 보이지만 객체 생성 없이 바로 사용
Logger.log("서버 시작")
Logger.log("사용자 로그인: Alice")
println(Logger.getHistory())
// [[타임스탬프] 서버 시작, [타임스탬프] 사용자 로그인: Alice]
```

```kotlin
// 익명 object — 인터페이스를 즉석에서 구현
interface ClickListener {
    fun onClick(view: String)
}

val listener = object : ClickListener {
    override fun onClick(view: String) {
        println("$view 클릭됨!")
    }
}

listener.onClick("버튼")  // 버튼 클릭됨!
```

---

## companion object — Java의 static 대체

`companion object`는 클래스 안에 들어가는 `object`입니다. Java의 `static` 멤버(클래스 레벨 멤버)를 Kotlin에서 표현하는 방법입니다.

```kotlin
class User private constructor(  // private 생성자 — 직접 생성 불가
    val name: String,
    val role: String
) {
    companion object {
        // 팩토리 메서드 패턴
        fun create(name: String) = User(name, "USER")        // 일반 사용자 생성
        fun createAdmin(name: String) = User(name, "ADMIN")  // 관리자 생성

        // 상수 정의
        const val MAX_NAME_LENGTH = 50
        const val DEFAULT_ROLE = "USER"
    }
}

// 클래스명.메서드명 형태로 호출 — Java의 static 메서드와 동일
val user = User.create("Alice")         // User(name=Alice, role=USER)
val admin = User.createAdmin("Bob")     // User(name=Bob, role=ADMIN)
println(User.MAX_NAME_LENGTH)           // 50

// User("Alice", "USER") 은 private 생성자라 호출 불가
```

---

## 인터페이스 (Interface)

인터페이스는 **클래스가 반드시 구현해야 하는 계약**입니다. Kotlin 인터페이스는 Java 8+처럼 기본 구현(default method)을 가질 수 있습니다.

```kotlin
// 인터페이스 정의
interface Printable {
    fun print()  // 추상 메서드 — 반드시 구현해야 함

    // 기본 구현이 있는 메서드 — 선택적으로 오버라이드
    fun printWithBorder() {
        println("=".repeat(30))
        print()
        println("=".repeat(30))
    }
}

interface Saveable {
    fun save(): Boolean  // 추상 메서드
    fun isSaved(): Boolean = false  // 기본 구현 (기본값 false)
}

// 여러 인터페이스 구현 가능 (Java와 동일)
class Report(val title: String, val content: String) : Printable, Saveable {
    private var saved = false

    override fun print() {
        println("제목: $title")   // 반드시 구현
        println("내용: $content")
    }

    override fun save(): Boolean {
        println("$title 저장 완료")
        saved = true
        return true
    }

    override fun isSaved(): Boolean = saved  // 기본 구현 오버라이드
}

val report = Report("2026 보고서", "올해의 결산")
report.printWithBorder()  // 테두리와 함께 출력
report.save()             // 저장
println(report.isSaved()) // true
```

---

## 상속 (Inheritance)

Kotlin의 모든 클래스는 기본적으로 `final`(상속 불가)입니다. 상속을 허용하려면 `open` 키워드를 붙여야 합니다.

```kotlin
// open 키워드 — 상속 가능
open class Animal(val name: String) {
    open fun sound(): String = "..."  // 자식 클래스에서 오버라이드 가능

    fun breathe() = println("${name}이 숨을 쉽니다")  // final — 오버라이드 불가
}

// : 상위클래스() 형태로 상속
class Dog(name: String) : Animal(name) {
    override fun sound() = "멍멍!"  // override 키워드 필수
}

class Cat(name: String) : Animal(name) {
    override fun sound() = "야옹!"
}

val dog = Dog("바둑이")
val cat = Cat("나비")

println(dog.sound())   // 멍멍!
println(cat.sound())   // 야옹!
dog.breathe()          // 바둑이이 숨을 쉽니다
```

```kotlin
// 추상 클래스 (abstract) — 직접 인스턴스화 불가
abstract class Shape {
    abstract fun area(): Double      // 반드시 구현해야 하는 추상 메서드
    abstract fun perimeter(): Double

    fun describe() = "넓이: ${area()}, 둘레: ${perimeter()}"  // 구현된 메서드
}

class Circle(val radius: Double) : Shape() {
    override fun area() = Math.PI * radius * radius  // 원 넓이
    override fun perimeter() = 2 * Math.PI * radius  // 원 둘레
}

class Square(val side: Double) : Shape() {
    override fun area() = side * side          // 정사각형 넓이
    override fun perimeter() = 4 * side        // 정사각형 둘레
}

val circle = Circle(5.0)
val square = Square(4.0)
println(circle.describe())  // 넓이: 78.54..., 둘레: 31.41...
println(square.describe())  // 넓이: 16.0, 둘레: 16.0
```

---

## enum class — 열거형

고정된 상수 집합을 표현할 때 사용합니다. 단순한 상수보다 타입 안전성이 높습니다.

```kotlin
// 기본 enum
enum class Direction {
    NORTH, SOUTH, EAST, WEST;

    // enum에도 메서드 추가 가능
    fun opposite() = when (this) {
        NORTH -> SOUTH
        SOUTH -> NORTH
        EAST  -> WEST
        WEST  -> EAST
    }
}

val dir = Direction.NORTH
println(dir)           // NORTH
println(dir.opposite()) // SOUTH
println(dir.name)      // "NORTH" (문자열)
println(dir.ordinal)   // 0 (0부터 시작하는 인덱스)
```

```kotlin
// 프로퍼티가 있는 enum
enum class HttpStatus(val code: Int, val message: String) {
    OK(200, "OK"),
    CREATED(201, "Created"),
    BAD_REQUEST(400, "Bad Request"),
    NOT_FOUND(404, "Not Found"),
    INTERNAL_SERVER_ERROR(500, "Internal Server Error");

    fun isSuccess() = code in 200..299
    fun isError() = code >= 400
}

val status = HttpStatus.NOT_FOUND
println("${status.code} ${status.message}")  // 404 Not Found
println(status.isError())   // true
println(status.isSuccess()) // false

// 이름으로 찾기
val ok = HttpStatus.valueOf("OK")  // HttpStatus.OK
println(ok.code)  // 200
```

---

## 흔한 실수들

```kotlin
// ❌ 실수 1: data class에서 var을 남발
data class User(var id: Long, var name: String)  // var은 불변성을 깨뜨림
// 가능하면 val을 사용하고, 변경이 필요하면 copy()를 사용하세요
data class User(val id: Long, val name: String)  // ✅

// ❌ 실수 2: sealed class를 다른 파일에서 상속 시도
// sealed class는 같은 파일 안에서만 상속 가능합니다

// ❌ 실수 3: open 없이 상속 시도
class Base { }
// class Child : Base()  // ❌ 컴파일 에러 — Base가 final
open class Base2 { }
class Child : Base2()  // ✅

// ❌ 실수 4: companion object의 멤버를 인스턴스로 접근
class Config {
    companion object {
        val DEFAULT_TIMEOUT = 30
    }
}
val c = Config()
// c.DEFAULT_TIMEOUT  // ⚠️ 경고 — 컴파일은 되지만 권장하지 않음
Config.DEFAULT_TIMEOUT  // ✅ 클래스명으로 접근해야 명확함
```

---

## 전체 정리

| 클래스 종류 | 사용 목적 | 특징 |
|------------|----------|------|
| `class` | 일반 클래스 | 기본적으로 final |
| `data class` | 데이터 보관 | equals/hashCode/toString/copy 자동 생성 |
| `sealed class` | 제한된 계층 | when에서 else 불필요 |
| `object` | 싱글톤 | 인스턴스 하나만 존재 |
| `companion object` | static 대체 | 클래스명으로 접근 |
| `abstract class` | 추상화 | 직접 인스턴스화 불가 |
| `enum class` | 상수 집합 | 타입 안전한 열거형 |
| `interface` | 계약 정의 | 기본 구현 가능, 다중 구현 가능 |
