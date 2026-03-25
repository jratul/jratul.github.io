---
title: "변수와 Null 안전성"
order: 1
---

## 변수란 무엇인가요?

변수(Variable)는 **데이터를 담아두는 상자**라고 생각하세요. 프로그램을 작성하다 보면 이름, 나이, 점수 같은 값들을 기억해두고 나중에 사용해야 할 때가 있는데, 그 값들을 저장하는 공간이 바로 변수입니다.

Kotlin에서는 변수를 만드는 방법이 두 가지입니다.

- `val` — **한 번 담으면 바꿀 수 없는 상자** (마치 영수증처럼 한 번 출력되면 내용을 고칠 수 없어요)
- `var` — **언제든지 내용을 바꿀 수 있는 상자** (마치 화이트보드처럼 지우고 다시 쓸 수 있어요)

```kotlin
val name = "Alice"    // 한 번 정하면 변경 불가 (val = value)
var count = 0         // 나중에 값을 바꿀 수 있음 (var = variable)

// val은 재할당 시 컴파일 에러 발생
// name = "Bob"  // ❌ 이렇게 하면 에러!

count = 5             // ✅ var는 자유롭게 변경 가능
count = count + 1     // count는 이제 6
```

**왜 val을 먼저 사용해야 할까요?**

값이 변하지 않아야 하는 것들(예: 사용자 ID, 설정값)을 `var`로 만들면 나중에 코드 어딘가에서 실수로 값이 바뀔 수 있습니다. `val`을 쓰면 "이 값은 절대 바뀌면 안 돼!"라고 컴파일러에게 알려주는 것이어서, 실수를 미리 막아줍니다.

---

## 기본 타입 — 변수의 종류

변수에는 종류가 있습니다. 숫자를 담는 상자, 문자를 담는 상자, 참/거짓을 담는 상자 등이 있죠.

```kotlin
val age: Int = 25            // 정수 (소수점 없는 숫자)
val price: Double = 9.99     // 실수 (소수점 있는 숫자)
val isActive: Boolean = true // 참(true) 또는 거짓(false)
val grade: Char = 'A'        // 문자 하나 (따옴표 하나 사용)
val message: String = "Hello" // 문자열 (문장, 단어 등)
val bigNumber: Long = 1_000_000_000L  // 큰 정수
val smallNum: Float = 3.14f  // 정밀도가 낮은 실수 (메모리 절약)
```

**타입 추론(Type Inference)** — Kotlin은 영리하기 때문에 값을 보고 타입을 스스로 판단합니다.

```kotlin
val x = 10       // 컴파일러가 "이건 Int구나" 하고 알아냄
val y = 3.14     // "이건 Double이구나"
val z = "World"  // "이건 String이구나"
val flag = true  // "이건 Boolean이구나"

// 위 아래는 완전히 동일한 코드입니다
val x: Int = 10
val y: Double = 3.14
val z: String = "World"
val flag: Boolean = true
```

Kotlin은 Java와 달리 `int`, `double` 같은 소문자 기본형(primitive type)이 없습니다. 모든 것이 대문자로 시작하는 `Int`, `Double` 등으로 통일되어 있습니다. 내부적으로는 컴파일러가 JVM의 기본형으로 최적화하니 성능 걱정은 없어요.

---

## Null 안전성 — "비어 있음"을 안전하게 다루기

### null이란 무엇인가요?

`null`은 **"값이 없음"** 또는 **"아직 모름"**을 뜻합니다. 예를 들어, 아직 이름을 입력하지 않은 사용자의 닉네임은 null이 되겠죠.

Java 같은 언어에서는 null을 아무 타입이나 가질 수 있어서, 프로그램이 실행 중에 갑자기 `NullPointerException(NPE)`이라는 오류로 터져 버리는 경우가 많았습니다. 이게 얼마나 흔한 문제냐 하면, Java를 만든 사람이 "null을 만든 것은 내 10억 달러짜리 실수"라고 말할 정도입니다.

Kotlin은 이 문제를 **컴파일 시점에** 미리 막아줍니다.

```kotlin
var name: String = "Alice"   // null을 담을 수 없는 타입 (non-nullable)
var name: String? = null     // null을 담을 수 있는 타입 (nullable, 타입 뒤에 ? 붙임)

// name은 null 불가이므로 안전하게 바로 사용 가능
println(name.length)   // ✅ 문제없음

var nickname: String? = null
// nickname은 null 가능이므로 그냥 쓰면 컴파일 에러!
// println(nickname.length)  // ❌ 컴파일 에러 — null일 수도 있잖아요!
```

### null을 안전하게 다루는 방법 4가지

**1. 안전 호출 연산자 `?.`** — "null이 아닐 때만 실행해줘"

```kotlin
val nickname: String? = null
val length = nickname?.length  // nickname이 null이면 length도 null이 됨 (에러 없음)
println(length)  // null 출력

val nickname2: String? = "홍길동"
val length2 = nickname2?.length  // null이 아니니까 정상 실행
println(length2)  // 3 출력
```

**2. 엘비스 연산자 `?:`** — "null이면 대신 이걸 써줘"

이름이 재밌죠? `?:` 를 옆으로 돌리면 엘비스 프레슬리의 헤어처럼 보인다고 해서 붙은 이름입니다.

```kotlin
val nickname: String? = null
val displayName = nickname ?: "익명"   // null이면 "익명" 사용
println(displayName)  // 익명

val nickname2: String? = "홍길동"
val displayName2 = nickname2 ?: "익명"  // null이 아니니까 "홍길동" 그대로 사용
println(displayName2)  // 홍길동

// 실전 사용 예 — 길이를 구하되, null이면 0을 반환
val len = nickname?.length ?: 0
println(len)  // 0
```

**3. null 아님 단언 `!!`** — "이건 절대 null 아니야! (내가 책임질게)"

```kotlin
val nickname: String? = "홍길동"
val len = nickname!!.length   // "절대 null이 아니다"라고 단언
println(len)  // 3

// 만약 nickname이 실제로 null이라면?
val nickname2: String? = null
val len2 = nickname2!!.length  // 💥 NullPointerException 발생!
```

`!!`는 위험합니다. 정말 null이 불가능하다고 확신하는 경우에만 쓰고, 가능하면 `?.`나 `?:`를 사용하세요.

**4. if 체크** — 가장 직관적인 방법

```kotlin
val nickname: String? = "홍길동"

if (nickname != null) {
    // 이 블록 안에서는 Kotlin이 알아서 nickname을 String으로 취급
    println(nickname.length)   // ✅ 안전함
    println(nickname.uppercase())  // ✅ 안전함
}

// when 표현식과도 잘 어울림
val result = when {
    nickname == null -> "이름 없음"
    nickname.length < 2 -> "이름이 너무 짧아요"
    else -> "안녕하세요, $nickname!"
}
```

---

## 스마트 캐스트 (Smart Cast) — 자동으로 타입 변환

Kotlin은 null 체크나 타입 체크를 하면, 그 이후부터 자동으로 타입을 변환해줍니다. 이를 "스마트 캐스트"라고 합니다.

```kotlin
// null 체크 후 스마트 캐스트
val name: String? = "Alice"

if (name != null) {
    // 이 블록 안에서 name은 String? 가 아니라 String으로 자동 변환됨
    println(name.length)     // ✅ String의 메서드를 자유롭게 사용
    println(name.uppercase()) // ✅
}

// 타입 체크 후 스마트 캐스트 — is 키워드
fun describe(obj: Any): String {
    return when (obj) {
        is String -> "문자열이에요: ${obj.uppercase()}"  // obj가 자동으로 String으로 변환
        is Int    -> "정수예요: ${obj * 2}"              // obj가 자동으로 Int로 변환
        is Boolean -> if (obj) "참이에요" else "거짓이에요"  // obj가 Boolean으로 변환
        is List<*> -> "리스트이고 크기는 ${obj.size}개예요"   // obj가 List로 변환
        else      -> "잘 모르겠어요: $obj"
    }
}

println(describe("hello"))  // 문자열이에요: HELLO
println(describe(42))       // 정수예요: 84
println(describe(true))     // 참이에요
println(describe(listOf(1,2,3)))  // 리스트이고 크기는 3개예요
```

---

## 문자열 템플릿 — 문자열 안에 변수 넣기

다른 언어에서는 문자열을 합치려면 `"안녕하세요, " + name + "님!"` 처럼 `+`로 연결해야 했는데, Kotlin은 훨씬 편리한 방법을 제공합니다.

```kotlin
val name = "홍길동"
val age = 30
val job = "개발자"

// $ 뒤에 변수명을 쓰면 그 값이 삽입됩니다
println("안녕하세요, $name님!")           // 안녕하세요, 홍길동님!
println("나이: ${age}살")                 // 나이: 30살
println("직업: $job")                     // 직업: 개발자

// ${} 안에는 표현식(계산식)도 쓸 수 있습니다
println("내년에는 ${age + 1}살이 돼요")    // 내년에는 31살이 돼요
println("이름 글자 수: ${name.length}자")   // 이름 글자 수: 3자
println("대문자: ${name.uppercase()}")     // 대문자: 홍길동 (영문자면 대문자 변환)

// 긴 문자열은 """ (큰따옴표 세 개)로 여러 줄로 쓸 수 있습니다
val poem = """
    안녕하세요, $name님.
    오늘은 ${age}살 ${job}의 하루를 기록합니다.
    내일도 힘내세요!
""".trimIndent()  // 앞쪽 공백을 제거해줌
println(poem)
```

---

## 타입 변환 — 타입을 다른 타입으로 바꾸기

Kotlin은 다른 타입 간의 변환을 **자동으로 해주지 않습니다**. 직접 변환 함수를 호출해야 합니다. 이게 불편해 보일 수 있지만, 타입 변환에서 발생하는 실수(예: 정수를 실수로 잘못 변환하는 것)를 예방해줍니다.

```kotlin
val i: Int = 100

// 숫자 타입 간 변환
val l: Long = i.toLong()      // Int → Long
val d: Double = i.toDouble()  // Int → Double
val f: Float = i.toFloat()    // Int → Float
val s: String = i.toString()  // Int → String ("100")

// 문자열 → 숫자 변환
val numStr = "42"
val num: Int = numStr.toInt()         // "42" → 42
val numD: Double = numStr.toDouble()  // "42" → 42.0

// 변환 실패할 수 있을 때는 OrNull 버전 사용
val safe1 = "123".toIntOrNull()   // 성공: 123
val safe2 = "abc".toIntOrNull()   // 실패: null (예외 발생하지 않음)
val safe3 = "3.14".toDoubleOrNull() // 성공: 3.14

println(safe1)  // 123
println(safe2)  // null
println(safe3)  // 3.14

// null일 경우 기본값 지정
val result = "abc".toIntOrNull() ?: 0
println(result)  // 0

// 진수 변환
val hex = "FF".toInt(16)    // 16진수 → 10진수: 255
val bin = "1010".toInt(2)   // 2진수 → 10진수: 10
println(hex)  // 255
println(bin)  // 10
```

---

## 전체 정리

| 개념 | 핵심 내용 | 예시 |
|------|----------|------|
| `val` | 변경 불가 변수 | `val name = "Alice"` |
| `var` | 변경 가능 변수 | `var count = 0` |
| 기본 타입 | Int, Double, Boolean, String 등 | `val age: Int = 25` |
| `?` (nullable) | null을 허용하는 타입 | `val name: String? = null` |
| `?.` (안전 호출) | null이면 null 반환 | `name?.length` |
| `?:` (엘비스) | null이면 기본값 사용 | `name ?: "익명"` |
| `!!` (단언) | null 아님을 단언 (위험) | `name!!.length` |
| 스마트 캐스트 | 체크 후 자동 타입 변환 | `if (x is String) x.length` |
| 문자열 템플릿 | 문자열 안에 변수 삽입 | `"안녕, $name!"` |
