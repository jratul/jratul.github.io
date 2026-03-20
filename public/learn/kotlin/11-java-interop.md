---
title: "Java 상호운용"
order: 11
---

## Kotlin ↔ Java 상호운용

Kotlin은 Java와 100% 상호운용됩니다. 같은 프로젝트에서 두 언어를 자유롭게 섞어 쓸 수 있습니다.

---

## Kotlin에서 Java 코드 사용

대부분 그냥 씁니다. 주의할 부분은 null 처리입니다.

```kotlin
// Java 클래스를 그냥 사용
import java.util.ArrayList
import java.util.Date

val list = ArrayList<String>()
list.add("hello")

val date = Date()
```

### 플랫폼 타입

Java 메서드의 반환값은 null 여부를 알 수 없어 **플랫폼 타입** (`String!`)으로 취급됩니다.

```java
// Java
public class JavaApi {
    public String getName() { return null; }
    @Nullable public String getNullableName() { return null; }
    @NotNull public String getNonNullName() { return "Alice"; }
}
```

```kotlin
val api = JavaApi()

val name = api.name           // String! (플랫폼 타입, null일 수 있음)
name.length                   // NPE 가능성 있음

// 안전하게 처리
val safeLen = api.name?.length ?: 0

// @Nullable / @NotNull 어노테이션이 있으면 Kotlin이 인식
val nullable: String? = api.nullableName
val nonNull: String  = api.nonNullName
```

### Java 컬렉션

```kotlin
// Java List → Kotlin에서 사용
val javaList: java.util.List<String> = getJavaList()
val len = javaList.size           // Kotlin 프로퍼티로 접근
javaList.forEach { println(it) }  // Kotlin 확장 함수 사용 가능

// Kotlin 컬렉션 → Java 전달
val kotlinList = listOf("a", "b")
acceptJavaList(kotlinList)  // 그냥 전달 가능
```

---

## Java에서 Kotlin 코드 사용

Kotlin 코드를 Java에서 쓸 때는 몇 가지 어노테이션이 필요할 수 있습니다.

### @JvmStatic

`companion object`의 멤버를 Java의 static처럼 호출합니다.

```kotlin
class User(val name: String) {
    companion object {
        @JvmStatic
        fun create(name: String) = User(name)

        val DEFAULT_NAME = "Unknown"  // @JvmField 없이는 Companion.DEFAULT_NAME
        @JvmField val DEFAULT = User("Unknown")
    }
}
```

```java
// @JvmStatic 없으면
User user = User.Companion.create("Alice");

// @JvmStatic 있으면
User user = User.create("Alice");

// @JvmField
String name = User.DEFAULT.getName();
```

### @JvmOverloads

기본 인자값이 있는 Kotlin 함수를 Java에서 오버로드 형태로 사용합니다.

```kotlin
// Kotlin
@JvmOverloads
fun createButton(
    text: String,
    width: Int = 100,
    height: Int = 50,
    color: String = "blue"
) { ... }
```

```java
// @JvmOverloads 덕분에 Java에서 다양하게 호출 가능
createButton("확인");
createButton("확인", 200);
createButton("확인", 200, 80);
createButton("확인", 200, 80, "red");
```

### @JvmName

Java에서 보이는 함수/파일 이름을 변경합니다.

```kotlin
// 파일명 변경 (파일 최상단에)
@file:JvmName("StringUtils")

fun String.capitalizeFirst(): String = ...
```

```java
// 파일명이 StringUtilsKt 대신 StringUtils
StringUtils.capitalizeFirst("hello");
```

### @Throws

Kotlin은 checked exception이 없지만, Java 호환을 위해 선언합니다.

```kotlin
@Throws(IOException::class, ParseException::class)
fun readFile(path: String): String { ... }
```

```java
try {
    String content = FileReaderKt.readFile("data.txt");
} catch (IOException | ParseException e) {
    e.printStackTrace();
}
```

---

## data class와 Java

```kotlin
data class Point(val x: Int, val y: Int)
```

Java에서는 `equals`, `hashCode`, `toString`, `copy`(Java에서는 노출 안 됨) 를 사용할 수 있습니다.

```java
Point p1 = new Point(1, 2);
Point p2 = new Point(1, 2);
System.out.println(p1.equals(p2)); // true
System.out.println(p1);            // Point(x=1, y=2)
int x = p1.getX();                 // getter로 접근
```

`val` → `getX()`, `var` → `getX()` + `setX()` 생성됩니다.

---

## 확장 함수 호출

Java에서는 확장 함수를 static 메서드로 호출합니다.

```kotlin
// Kotlin
fun String.isPalindrome(): Boolean = this == this.reversed()

// 파일: StringExtensions.kt
```

```java
// Java에서 호출
boolean result = StringExtensionsKt.isPalindrome("racecar");
```

---

## SAM 변환

Java의 함수형 인터페이스를 Kotlin 람다로 전달합니다.

```java
// Java 인터페이스
public interface OnClickListener {
    void onClick(View view);
}
```

```kotlin
// Kotlin에서 SAM 변환
button.setOnClickListener { view ->
    println("클릭됨: $view")
}

// Executor도 SAM 변환
val executor: Executor = Executor { runnable -> runnable.run() }
// 또는
val executor = Executor { it.run() }
```

Kotlin 함수형 인터페이스는 `fun interface`로 선언합니다.

```kotlin
fun interface Validator<T> {
    fun validate(value: T): Boolean
}

val notEmpty = Validator<String> { it.isNotBlank() }
```

---

## 혼합 프로젝트 실전 팁

```kotlin
// 1. Java 레거시 코드는 그대로 두고 Kotlin으로 점진적 전환
// 2. 새 파일은 Kotlin으로 작성
// 3. Java API 반환값은 ?.let { } 로 안전하게 처리
val result = javaService.getData()?.let { process(it) } ?: defaultValue

// 4. Spring Boot에서는 Kotlin 전용 설정 추가
@SpringBootApplication
class MyApp

fun main(args: Array<String>) {
    runApplication<MyApp>(*args)
}

// 5. Jackson과 함께 쓸 때 kotlin-module 추가 필수
// implementation 'com.fasterxml.jackson.module:jackson-module-kotlin'

// data class의 기본값, 이름 있는 인자가 올바르게 역직렬화됨
data class Request(
    val name: String = "",
    val age: Int = 0
)
```
