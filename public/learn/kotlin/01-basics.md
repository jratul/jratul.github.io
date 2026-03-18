---
title: "변수와 Null 안전성"
order: 1
---

## 변수 선언

```kotlin
val name = "Alice"    // 불변 (final)
var count = 0         // 가변

val pi: Double = 3.14 // 타입 명시
```

`val`은 재할당이 불가능합니다. 가능하면 `val`을 우선 사용합니다.

## 기본 타입

Kotlin에는 기본 타입(primitive)과 참조 타입의 구분이 없습니다. 컴파일러가 JVM의 `int`, `double` 등으로 최적화합니다.

```kotlin
val age: Int = 25
val price: Double = 9.99
val isActive: Boolean = true
val grade: Char = 'A'
val message: String = "Hello"

// 타입 추론 (대부분 생략 가능)
val x = 10       // Int
val y = 3.14     // Double
val z = "World"  // String
```

## Null 안전성

Kotlin의 가장 중요한 특징입니다. 타입 뒤에 `?`를 붙여야 null을 허용합니다.

```kotlin
var name: String = "Alice"   // null 불가
var name: String? = null     // null 가능
```

null 가능한 변수를 그냥 쓰면 컴파일 에러가 납니다.

```kotlin
val str: String? = null

// ❌ 컴파일 에러
println(str.length)

// ✅ 안전 호출 ?.
println(str?.length)   // null이면 null 반환

// ✅ 엘비스 연산자 ?:
val len = str?.length ?: 0   // null이면 0

// ✅ !! (null이 아님을 단언, NPE 가능)
val len2 = str!!.length   // str이 null이면 NPE
```

## 스마트 캐스트

null 검사나 타입 검사 후에는 자동으로 캐스트됩니다.

```kotlin
val str: String? = getValue()

if (str != null) {
    // 이 블록 안에서는 str이 String (non-null)으로 자동 캐스트
    println(str.length)
}

// is로 타입 확인
fun describe(obj: Any): String {
    return when (obj) {
        is String -> "문자열: ${obj.uppercase()}"  // String으로 자동 캐스트
        is Int    -> "정수: ${obj * 2}"            // Int로 자동 캐스트
        else      -> "기타"
    }
}
```

## 문자열 템플릿

```kotlin
val name = "Alice"
val age = 30

println("이름: $name, 나이: $age")
println("내년 나이: ${age + 1}")
println("이름 길이: ${name.length}")

// 여러 줄 문자열
val text = """
    첫 번째 줄
    두 번째 줄
    세 번째 줄
""".trimIndent()
```

## 타입 변환

Kotlin은 암묵적 타입 변환이 없습니다. 명시적으로 변환해야 합니다.

```kotlin
val i: Int = 100
val l: Long = i.toLong()    // toLong()
val d: Double = i.toDouble() // toDouble()
val s: String = i.toString() // toString()

// 문자열 → 숫자
val num = "42".toInt()
val safe = "abc".toIntOrNull()  // 실패하면 null 반환
```
