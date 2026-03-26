---
title: "Java 상호운용"
order: 11
---

## Kotlin과 Java는 공존할 수 있다

Kotlin은 JVM 위에서 동작하며, Java 바이트코드로 컴파일됩니다. 이 덕분에 **Kotlin과 Java는 같은 프로젝트 안에서 자유롭게 섞어 쓸 수 있습니다.**

현실에서는 이런 상황이 자주 있습니다:
- 기존 Java 프로젝트에 Kotlin을 점진적으로 도입
- Java로 작성된 라이브러리를 Kotlin에서 사용
- Kotlin 코드를 Java 코드에서 호출

---

## Kotlin에서 Java 코드 사용

### 기본 사용 — 그냥 쓰면 됩니다

```kotlin
// Java 표준 라이브러리 클래스 사용
import java.util.ArrayList
import java.util.HashMap
import java.util.Date

fun main() {
    // Java 클래스를 Kotlin에서 그대로 사용
    val list = ArrayList<String>()
    list.add("Hello")
    list.add("World")

    // Kotlin의 확장 함수도 Java 클래스에 사용 가능
    list.forEach { println(it) }  // Kotlin 확장 함수
    val filtered = list.filter { it.startsWith("H") }  // Kotlin 확장 함수

    // Java getter/setter → Kotlin 프로퍼티로 접근
    val sb = java.lang.StringBuilder()
    sb.append("Hello")
    println(sb.length)  // sb.getLength() 대신 프로퍼티처럼 사용
}
```

Kotlin 컴파일러가 Java의 `getXxx()` / `setXxx()` 패턴을 자동으로 프로퍼티(`xxx`)로 변환합니다.

### 플랫폼 타입 — null 처리 주의

Java 메서드의 반환값이 null일 수 있는지 없는지 Kotlin 컴파일러가 알 수 없습니다. 이런 타입을 **플랫폼 타입**(`String!`)이라고 합니다.

```java
// Java 코드
public class JavaApi {
    // 어노테이션 없음 → Kotlin이 null 여부 모름
    public String getName() {
        return null;  // null 반환 가능!
    }

    // @Nullable → Kotlin이 String?로 인식
    @Nullable
    public String getNullableName() {
        return null;
    }

    // @NotNull → Kotlin이 String으로 인식
    @NotNull
    public String getNonNullName() {
        return "Alice";
    }
}
```

```kotlin
val api = JavaApi()

// 어노테이션 없는 경우 — 플랫폼 타입 (String!)
val name = api.name           // String! — null일 수도 있음
// name.length                // ❌ NPE 발생 가능!

// 안전하게 처리하는 방법
val safeLen = api.name?.length ?: 0       // 안전한 호출
val nonNullName = api.name!!              // null이면 NullPointerException (확신할 때만)

// @Nullable이 있는 경우 — Kotlin이 String?로 처리
val nullable: String? = api.nullableName
val len = nullable?.length ?: -1         // 반드시 null 처리

// @NotNull이 있는 경우 — Kotlin이 String으로 처리
val nonNull: String = api.nonNullName    // null 처리 불필요
println(nonNull.length)                   // 안전
```

**실무 팁:** Java 코드를 직접 수정할 수 있다면 `@Nullable` / `@NotNull` (또는 JetBrains의 `@Nullable` / `@NotNull`) 어노테이션을 추가하는 것이 좋습니다. Kotlin이 타입을 정확히 인식합니다.

### Java 컬렉션과 Kotlin 컬렉션

```kotlin
// Java 메서드에서 List<String>을 받을 때
fun processJavaList(javaList: java.util.List<String>) {
    // Kotlin의 확장 함수를 그대로 사용 가능
    val upper = javaList.map { it.uppercase() }  // Kotlin 확장 함수
    javaList.forEach { println(it) }

    // size (Kotlin 프로퍼티로 접근)
    println("크기: ${javaList.size}")  // getSize() 대신
}

// Kotlin 컬렉션을 Java에 전달
val kotlinList: List<String> = listOf("a", "b", "c")
// Java가 기대하는 java.util.List<String>을 그냥 전달 가능
acceptJavaList(kotlinList)  // 호환됨

// 주의: Kotlin의 불변 List를 Java에서 수정하려 하면 UnsupportedOperationException
```

---

## Java에서 Kotlin 코드 사용

Kotlin 코드를 Java에서 사용할 때는 Kotlin의 문법이 Java에서 어떻게 보이는지 알아야 합니다.

### @JvmStatic — companion object를 static으로

Kotlin의 `companion object`는 Java의 `static`이 아닙니다. Java에서 호출하려면 `Companion` 객체를 통해야 합니다.

```kotlin
// Kotlin
class User(val name: String) {
    companion object {
        // @JvmStatic 없으면 Java에서 User.Companion.create()로 호출해야 함
        @JvmStatic
        fun create(name: String) = User(name)

        @JvmStatic
        fun getDefaultName() = "Unknown"

        // @JvmField: Java에서 Companion.DEFAULT_NAME 대신 User.DEFAULT_NAME으로 접근
        @JvmField
        val DEFAULT = User("Unknown")

        const val MAX_NAME_LENGTH = 50  // const val은 자동으로 static final
    }
}
```

```java
// Java에서 사용

// @JvmStatic 없으면
User user1 = User.Companion.create("Alice");  // Companion 필요
String name = User.Companion.getDefaultName();

// @JvmStatic 있으면
User user2 = User.create("Alice");            // 깔끔!
String name2 = User.getDefaultName();

// @JvmField
User defaultUser = User.DEFAULT;              // Companion 없이 바로 접근

// const val
int max = User.MAX_NAME_LENGTH;               // static final처럼
```

### @JvmOverloads — 기본 인자값을 Java에서 사용

Kotlin의 기본 인자값은 Java에서 지원되지 않습니다. `@JvmOverloads`를 붙이면 Java에서 오버로드 형태로 사용할 수 있습니다.

```kotlin
// Kotlin
@JvmOverloads
fun createButton(
    text: String,
    width: Int = 100,   // 기본값
    height: Int = 50,   // 기본값
    color: String = "blue"  // 기본값
) {
    println("버튼 생성: $text, ${width}x$height, $color")
}
```

```java
// @JvmOverloads 덕분에 Java에서 다양하게 호출 가능
createButton("확인");                          // width=100, height=50, color="blue"
createButton("확인", 200);                     // height=50, color="blue"
createButton("확인", 200, 80);                 // color="blue"
createButton("확인", 200, 80, "red");          // 모두 지정

// @JvmOverloads 없으면 Java에서는 모든 인자 필수
// createButton("확인", 100, 50, "blue");      // 모두 넣어야만 함
```

### @JvmName — Java에서 보이는 이름 변경

```kotlin
// 파일 최상단에 선언
@file:JvmName("StringUtils")  // 파일명이 StringUtilsKt 대신 StringUtils

fun String.isPalindrome(): Boolean = this == this.reversed()
fun String.capitalizeFirst(): String = this.replaceFirstChar { it.uppercase() }
```

```java
// @file:JvmName 없으면
StringExtensionsKt.isPalindrome("racecar");  // Kt 접미사

// @file:JvmName("StringUtils") 있으면
StringUtils.isPalindrome("racecar");          // 더 자연스러운 이름
```

```kotlin
// 이름 충돌 해결
// 같은 파일에 확장 함수가 여러 개인데 이름이 겹칠 때
@JvmName("filterListOfStrings")
fun List<String>.filter(predicate: (String) -> Boolean): List<String> {
    return this.filter(predicate)
}
```

### @Throws — Java의 checked exception 선언

Kotlin은 checked exception이 없지만, Java 코드에서 호출할 때를 위해 선언합니다.

```kotlin
import java.io.IOException
import java.text.ParseException

// @Throws 없으면 Java에서 try-catch 없이 호출 가능 (catch하지 않아도 컴파일 통과)
// @Throws 있으면 Java에서 반드시 try-catch 또는 throws 선언 필요
@Throws(IOException::class, ParseException::class)
fun readAndParseFile(path: String): ParsedData {
    val content = java.io.File(path).readText()  // IOException 가능
    return parseContent(content)                  // ParseException 가능
}
```

```java
// @Throws가 있으면 Java에서 예외 처리 강제
try {
    ParsedData data = FileReaderKt.readAndParseFile("data.txt");
} catch (IOException | ParseException e) {
    e.printStackTrace();
}
```

---

## data class와 Java

```kotlin
data class Point(val x: Int, val y: Int)
data class Person(var name: String, val birthday: LocalDate)
```

Java에서 data class를 사용하면:

```java
// 생성
Point p1 = new Point(1, 2);

// getter (val → getX(), var → getX() + setX())
int x = p1.getX();       // val이라 getter만
String name = person.getName();     // var이라 getter
person.setName("Bob");              // var이라 setter도 있음

// equals, hashCode (자동 생성)
Point p2 = new Point(1, 2);
System.out.println(p1.equals(p2));  // true
System.out.println(p1.hashCode() == p2.hashCode());  // true

// toString (자동 생성)
System.out.println(p1);  // Point(x=1, y=2)

// copy는 Java에서 노출되지 않음 (component 함수들은 노출됨)
// p1.component1()  // 1 (x값)
// p1.component2()  // 2 (y값)
```

---

## 확장 함수 — Java에서 static으로 호출

Kotlin의 확장 함수는 Java에서는 첫 번째 인자로 수신 객체를 받는 static 메서드로 보입니다.

```kotlin
// StringExtensions.kt 파일
package com.example.utils

fun String.isPalindrome(): Boolean {
    return this == this.reversed()
}

fun String.truncate(maxLength: Int, suffix: String = "..."): String {
    return if (this.length <= maxLength) this
    else this.take(maxLength) + suffix
}
```

```java
// Java에서 호출 — static 메서드로 호출
import com.example.utils.StringExtensionsKt;

boolean result = StringExtensionsKt.isPalindrome("racecar");  // true

// 기본값이 있는 경우 — @JvmOverloads 없으면 모든 인자 필수
String truncated = StringExtensionsKt.truncate("Very long text", 10, "...");
// @JvmOverloads 있으면
// String truncated = StringExtensionsKt.truncate("Very long text", 10);
```

---

## SAM 변환 — Java 함수형 인터페이스를 람다로

Single Abstract Method(SAM) 인터페이스 — 추상 메서드가 하나인 인터페이스

```java
// Java 인터페이스
@FunctionalInterface
public interface OnClickListener {
    void onClick(View view);
}

// Java의 Comparator, Runnable, Callable 등도 SAM
```

```kotlin
// Java SAM 인터페이스를 Kotlin 람다로 자동 변환
button.setOnClickListener { view ->
    println("클릭됨: ${view.id}")
}

// Runnable
val runnable = Runnable {
    println("실행 중")
}

// Executor
val executor: Executor = Executor { runnable ->
    Thread(runnable).start()
}
// 또는 더 간결하게
val executor2 = Executor { Thread(it).start() }

// Comparator
val comparator = Comparator<String> { a, b -> a.length - b.length }
listOf("banana", "apple", "kiwi").sortedWith(comparator)
```

### Kotlin 함수형 인터페이스 — fun interface

Kotlin에서 SAM처럼 쓸 수 있는 인터페이스를 선언할 때 `fun interface`를 씁니다.

```kotlin
// fun interface 선언
fun interface Validator<T> {
    fun validate(value: T): Boolean
}

fun interface EventHandler<T> {
    fun handle(event: T)
}

// 람다로 구현
val notEmpty = Validator<String> { it.isNotBlank() }
val lengthOk = Validator<String> { it.length in 2..50 }

// 조합
val usernameValidator = Validator<String> { value ->
    notEmpty.validate(value) && lengthOk.validate(value)
}

fun main() {
    println(usernameValidator.validate("Alice"))  // true
    println(usernameValidator.validate(""))       // false
    println(usernameValidator.validate("A"))      // false
}
```

---

## 혼합 프로젝트 실전 팁

### 점진적 Kotlin 도입 전략

```kotlin
// 팁 1: Java 레거시 코드는 건드리지 않고, 새 파일만 Kotlin으로 작성
// 기존 Java: UserService.java (그대로 유지)
// 새 파일: OrderService.kt (Kotlin으로 작성)

// 팁 2: Java API 반환값은 안전하게 처리
val result = javaService.getData()?.let { data ->
    processData(data)  // data가 null이 아닐 때만 실행
} ?: defaultValue

// 팁 3: Java에서 오는 컬렉션 변환
val javaList: java.util.List<User> = legacyService.getUsers()
val kotlinList: List<User> = javaList.toList()  // 불변 Kotlin List로 변환
```

### Spring Boot에서 Kotlin 사용

```kotlin
@SpringBootApplication
class MyApp

// main 함수는 최상위 함수로 선언
fun main(args: Array<String>) {
    runApplication<MyApp>(*args)  // *args: 배열 펼치기
}

// Service 클래스
@Service
class UserService(
    // 생성자 주입 — @Autowired 없어도 됨 (Spring이 자동 인식)
    private val userRepository: UserRepository,
    private val emailService: EmailService
) {
    fun findById(id: Long): User {
        return userRepository.findById(id).orElseThrow {
            EntityNotFoundException("사용자를 찾을 수 없습니다: $id")
        }
    }
}

// Repository
interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): User?  // Optional 대신 nullable 타입
    fun findAllByActive(active: Boolean): List<User>
}
```

### Jackson으로 JSON 직렬화/역직렬화

```kotlin
// build.gradle에 추가 필수
// implementation 'com.fasterxml.jackson.module:jackson-module-kotlin'

// data class + 기본값 + 이름 있는 인자가 올바르게 동작하려면 kotlin-module 필수
@JsonInclude(JsonInclude.Include.NON_NULL)
data class CreateUserRequest(
    val name: String,
    val email: String,
    val age: Int? = null,           // 선택적 필드
    val roles: List<String> = emptyList()  // 기본값
)

// ObjectMapper 설정
@Bean
fun objectMapper(): ObjectMapper {
    return ObjectMapper()
        .registerModule(KotlinModule.Builder().build())  // Kotlin 모듈 등록
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
}
```

### Null 처리 패턴

```kotlin
// Java Optional을 Kotlin nullable로 변환
fun findUser(id: Long): User? {
    return userRepository.findById(id).orElse(null)  // Optional → nullable
}

// 또는 확장 함수 활용
fun <T> Optional<T>.orNull(): T? = this.orElse(null)

val user: User? = userRepository.findById(1L).orNull()

// Java API의 불안전한 호출 처리 패턴
val userName = javaApi.getUser(id)
    ?.takeIf { it.isActive }   // 활성 사용자만
    ?.name                      // 이름 가져오기
    ?: "알 수 없음"             // null이면 기본값
```

---

## 흔한 실수

```kotlin
// ❌ 실수 1: 플랫폼 타입을 무조건 신뢰
val name = javaApi.name      // String! — null일 수 있음
println(name.length)          // NPE 발생 가능!

// ✅ 안전하게 처리
println(name?.length ?: 0)

// ❌ 실수 2: @JvmStatic 없이 companion object 사용 (Java에서)
// Java 코드:
// User user = User.create("Alice");  // MissingMethodException
// User user = User.Companion.create("Alice");  // 이렇게 해야 함

// ✅ @JvmStatic 추가
companion object {
    @JvmStatic
    fun create(name: String) = User(name)
}

// ❌ 실수 3: Spring에서 kotlin-module 없이 data class 역직렬화
// {"name": "Alice", "age": 25} → data class User(val name: String, val age: Int)
// kotlin-module 없으면 기본 생성자 없다는 에러 발생

// ✅ build.gradle에 추가
// implementation 'com.fasterxml.jackson.module:jackson-module-kotlin'
```
