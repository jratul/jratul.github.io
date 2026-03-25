---
title: "스코프 함수"
order: 6
---

## 스코프 함수란 무엇인가요?

스코프 함수(Scope Function)는 **객체에 대해 코드 블록을 실행하기 위한 함수**입니다. `let`, `run`, `with`, `apply`, `also` 다섯 가지가 있으며, Kotlin 코드에서 아주 자주 등장합니다.

이들이 특별한 이유는 블록 안에서 객체를 `this` 또는 `it`으로 참조할 수 있게 해주어, 객체 이름을 반복해서 쓰지 않아도 된다는 점입니다.

```kotlin
// 스코프 함수 없이
val user = User()
user.name = "Alice"
user.email = "alice@example.com"
user.age = 30
userRepository.save(user)

// apply 스코프 함수 사용
val user = User().apply {
    name = "Alice"            // this.name 과 동일
    email = "alice@example.com"
    age = 30
}
userRepository.save(user)
```

---

## 다섯 가지 스코프 함수 한눈에 보기

헷갈리는 분들이 많아서 먼저 표로 정리하겠습니다.

| 함수 | 블록에서 객체 참조 | 반환값 | 주요 용도 |
|------|------------------|--------|----------|
| `let` | `it` | 람다 결과 | null 체크, 변환 |
| `run` | `this` | 람다 결과 | 초기화 후 결과 필요 |
| `with` | `this` | 람다 결과 | 객체 멤버 반복 호출 |
| `apply` | `this` | 수신 객체 자신 | 객체 설정/초기화 |
| `also` | `it` | 수신 객체 자신 | 부수 작업 (로깅, 검증) |

두 가지 기준으로 분류하면 외우기 쉽습니다.
- **객체를 어떻게 참조하나?** → `this` 또는 `it`
- **무엇을 반환하나?** → 람다 결과 or 수신 객체 자신

---

## let — "이걸 받아서 이렇게 해줘"

`it`으로 객체를 참조하고, **람다의 마지막 표현식을 반환**합니다.

**가장 많이 쓰이는 용도:** null이 아닐 때만 코드를 실행하기 (null 체크)

```kotlin
// ─── null 체크와 함께 사용 ───
val email: String? = getUserEmail()  // null일 수 있는 이메일

// null이 아닐 때만 블록 실행
email?.let {
    println("이메일: $it")          // it = email 의 비null 값
    sendWelcomeEmail(it)             // 안전하게 사용
    it.length                        // ← 이 값이 반환됨
}

// null이면 let 블록이 통째로 건너뜀 → 아무것도 출력 안 됨
val nullEmail: String? = null
nullEmail?.let { println("출력 안 됨") }
```

```kotlin
// ─── 변환 용도 ───
val result = "  hello world  "
    .let { it.trim() }         // "hello world"
    .let { it.uppercase() }    // "HELLO WORLD"
    .let { it.split(" ") }     // ["HELLO", "WORLD"]

println(result)  // [HELLO, WORLD]

// 중간 변수 없이 깔끔하게 체이닝
val wordCount = "  hello world kotlin  "
    .let { it.trim() }
    .let { it.split(" ") }
    .let { it.size }
println(wordCount)  // 3
```

```kotlin
// ─── 임시 변수를 바깥에 노출하지 않기 ───
// 변수 numbers는 let 블록 밖에서 사용되지 않음
val evenSum = listOf(1, 2, 3, 4, 5, 6)
    .let { numbers ->
        val evens = numbers.filter { it % 2 == 0 }
        evens.sum()  // 짝수의 합 반환
    }
println(evenSum)  // 12
```

---

## apply — "설정해줘, 그리고 자신을 돌려줘"

`this`로 객체를 참조하고, **수신 객체 자신을 반환**합니다.

**가장 많이 쓰이는 용도:** 객체를 만들고 여러 프로퍼티를 한꺼번에 설정하기

```kotlin
// ─── 객체 초기화 ───
data class User(
    var name: String = "",
    var email: String = "",
    var age: Int = 0,
    var role: String = "USER"
)

val user = User().apply {
    name = "Alice"              // this.name = "Alice"
    email = "alice@example.com" // this.email = ...
    age = 30
    role = "ADMIN"
}
// user가 반환되므로 바로 사용 가능
println(user)  // User(name=Alice, email=alice@example.com, age=30, role=ADMIN)
```

```kotlin
// ─── 빌더 패턴 대체 ───
// Java에서는 빌더 패턴이 필요했던 코드를 apply로 대체
val config = DatabaseConfig().apply {
    host = "localhost"
    port = 5432
    database = "mydb"
    username = "admin"
    maxPoolSize = 10
    connectTimeout = 30
}

// ─── 리스트 초기화 ───
val items = mutableListOf<String>().apply {
    add("첫 번째")
    add("두 번째")
    addAll(listOf("세 번째", "네 번째"))
}
println(items)  // [첫 번째, 두 번째, 세 번째, 네 번째]
```

```kotlin
// ─── 연속 설정에서 apply가 편한 이유 ───
// apply 없이
val sb = StringBuilder()
sb.append("Hello")
sb.append(", ")
sb.append("World!")
val result1 = sb.toString()

// apply 사용
val result2 = StringBuilder().apply {
    append("Hello")   // this.append("Hello")
    append(", ")
    append("World!")
}.toString()          // apply는 sb를 반환하므로 바로 .toString() 호출 가능

println(result1)  // Hello, World!
println(result2)  // Hello, World!
```

---

## also — "부수 작업도 해줘, 그리고 자신을 돌려줘"

`it`으로 객체를 참조하고, **수신 객체 자신을 반환**합니다.

**가장 많이 쓰이는 용도:** 주 흐름을 방해하지 않고 로깅, 검증, 저장 등의 부수 작업

```kotlin
// ─── 로깅과 함께 ───
val user = createUser("Alice", "alice@test.com")
    .also { println("사용자 생성됨: ${it.name}") }  // 로깅
    .also { userRepository.save(it) }               // 저장

// user는 여전히 User 객체 — also가 it(user)을 그대로 반환하기 때문

// ─── 체이닝 중간에 부수 작업 ───
val result = listOf(1, 2, 3, 4, 5)
    .filter { it % 2 == 0 }
    .also { println("필터 후: $it") }   // 중간 값 확인용 로깅
    .map { it * 10 }
    .also { println("맵 후: $it") }     // 최종 값 확인용 로깅

// 필터 후: [2, 4]
// 맵 후: [20, 40]
```

```kotlin
// ─── 검증 ───
val numbers = mutableListOf(1, 2, 3)
    .also { require(it.isNotEmpty()) { "리스트가 비어 있으면 안 됩니다" } }
    .also { println("처리할 항목 수: ${it.size}") }
// 검증 통과 후 numbers는 여전히 MutableList<Int>
```

**apply vs also 비교:**
```kotlin
// apply: this로 참조 — 멤버를 직접 호출
val user1 = User().apply {
    name = "Alice"   // this.name = "Alice"
    age = 30         // this.age = 30
}

// also: it으로 참조 — 객체를 명시적으로 접근
val user2 = User().also {
    it.name = "Alice"
    it.age = 30
}
// 결과는 같지만 멤버를 직접 설정할 때는 apply가 더 간결함
// also는 객체를 통째로 다룰 때 (저장, 출력 등) 더 자연스러움
```

---

## run — "처리하고 결과를 반환해줘"

`this`로 객체를 참조하고, **람다의 마지막 표현식을 반환**합니다.

**가장 많이 쓰이는 용도:** 객체의 여러 멤버를 이용해 결과를 계산하기

```kotlin
// ─── 객체 멤버로 결과 계산 ───
data class User(val name: String, val nickname: String?, val age: Int)

val user = User("홍길동", null, 30)

val displayName = user.run {
    // this = user
    if (nickname != null && nickname.isNotBlank()) {
        nickname  // 닉네임이 있으면 닉네임
    } else {
        "$name (${age}세)"  // 없으면 이름 + 나이
    }
}
println(displayName)  // 홍길동 (30세)
```

```kotlin
// ─── null 체크 + 변환 ───
val user: User? = findUser(1L)

val message = user?.run {
    // user가 null이 아닌 경우에만 실행
    "환영합니다, ${name}님! (${age}세)"
} ?: "로그인이 필요합니다"

println(message)
```

```kotlin
// ─── 지역 스코프 생성 (임시 변수를 바깥에 노출하지 않기) ───
// 아래 host, port, dbName은 run 블록 안에서만 유효
val dbConfig = run {
    val host = System.getenv("DB_HOST") ?: "localhost"
    val port = System.getenv("DB_PORT")?.toInt() ?: 5432
    val dbName = System.getenv("DB_NAME") ?: "mydb"
    DatabaseConfig(host, port, dbName)  // ← 이 값이 반환됨
}
// 여기서는 host, port, dbName 변수 없음
```

---

## with — "이 객체와 함께 일해줘"

수신 객체를 **인자로 받아** `this`로 참조하고, 람다의 마지막 표현식을 반환합니다.

**가장 많이 쓰이는 용도:** null이 아닌 것이 확실한 객체의 멤버를 여러 번 호출할 때

```kotlin
// ─── 기본 사용 ───
data class Product(val name: String, val price: Int, val stock: Int)
val product = Product("노트북", 1_500_000, 5)

// with 없이
println(product.name)
println("가격: ${product.price}원")
println("재고: ${product.stock}개")
val totalValue = product.price * product.stock

// with 사용
val summary = with(product) {
    println(name)              // this.name
    println("가격: ${price}원")
    println("재고: ${stock}개")
    price * stock              // ← 이 값이 summary에 저장됨
}
println("총 재고 가치: ${summary}원")  // 7,500,000원
```

```kotlin
// ─── StringBuilder로 문자열 조립 ───
val html = with(StringBuilder()) {
    append("<html>\n")
    append("  <body>\n")
    append("    <h1>안녕하세요!</h1>\n")
    append("  </body>\n")
    append("</html>")
    toString()  // ← 최종 문자열 반환
}
println(html)
```

**run vs with 비교:**
```kotlin
val user = User("Alice", 30)

// run: 수신 객체에 .run {} 으로 붙임
val result1 = user.run { "$name (${age}세)" }

// with: 인자로 전달
val result2 = with(user) { "$name (${age}세)" }

// 기능적으로 동일하지만,
// with는 null 가능 객체에 쓰면 NullPointerException 위험이 있어서
// null 가능 객체에는 user?.run {} 이 더 안전함
```

---

## takeIf / takeUnless — 조건부 반환

스코프 함수 가족은 아니지만 자주 함께 사용됩니다.

```kotlin
// takeIf: 조건이 true면 객체 반환, false면 null 반환
val age = 20
val adult = age.takeIf { it >= 18 }  // 18 이상이면 age 반환, 아니면 null
println(adult)  // 20

val minor = 15.takeIf { it >= 18 }   // 조건 불만족
println(minor)  // null

// takeUnless: 조건이 false면 객체 반환, true면 null 반환 (takeIf의 반대)
val user = getUser()
val activeUser = user.takeUnless { it.isBanned }  // 차단된 사용자면 null

// let과 조합
user.takeIf { it.isVerified }
    ?.let { sendWelcomeEmail(it) }  // 인증된 사용자에게만 이메일

// 더 읽기 좋은 조건부 처리
val filename = "report.pdf"
val pdfFile = filename.takeIf { it.endsWith(".pdf") }
    ?: "report.pdf"  // 확장자가 없으면 기본값
```

---

## 실전 예제 — 주문 처리

```kotlin
data class OrderRequest(
    val userId: Long,
    val productId: Long,
    val quantity: Int,
    val address: String
)

data class Order(
    var userId: Long = 0,
    var productId: Long = 0,
    var quantity: Int = 0,
    var address: String = ""
)

fun processOrder(request: OrderRequest?): String {
    return request
        ?.takeIf { it.quantity > 0 }        // 수량이 0보다 커야 함
        ?.let { req ->                        // null 아니고 조건 만족 → 처리
            Order().apply {                   // 주문 객체 생성 및 설정
                userId    = req.userId
                productId = req.productId
                quantity  = req.quantity
                address   = req.address
            }
        }
        ?.also { order ->
            println("주문 처리: $order")      // 로깅
            orderRepository.save(order)       // 저장
        }
        ?.run { "주문 완료 (수량: $quantity)" }  // 결과 메시지
        ?: "유효하지 않은 요청"                // null인 경우 기본 메시지
}

// 사용
println(processOrder(OrderRequest(1L, 10L, 3, "서울 강남구")))
// 주문 처리: Order(userId=1, ...)
// 주문 완료 (수량: 3)

println(processOrder(null))             // 유효하지 않은 요청
println(processOrder(OrderRequest(1L, 10L, 0, "서울")))  // 수량 0 — 유효하지 않은 요청
```

---

## 선택 가이드

어떤 스코프 함수를 써야 할지 헷갈릴 때:

```
Q1: 반환값이 객체 자신이어야 하나요?
    YES → apply (this로 참조) 또는 also (it으로 참조)
          - 객체 설정/초기화 → apply
          - 로깅/검증 같은 부수 작업 → also

    NO → 람다 결과를 반환
          - this로 참조하고 싶다 → run 또는 with
            - 수신 객체에 붙여 쓴다 → run
            - 인자로 전달한다 → with
          - it으로 참조하고 싶다 → let
            - 특히 null 체크와 함께 → ?.let { }
```

---

## 흔한 실수들

```kotlin
// ❌ 실수 1: apply와 let 혼동
val user = User()
// user.apply { println(name) }  // ✅ this.name으로 접근
// user.let { println(name) }    // ❌ name을 찾을 수 없음 — it.name 이어야 함
user.let { println(it.name) }    // ✅

// ❌ 실수 2: 너무 긴 체이닝 — 가독성 저하
val result = someObject
    .let { /* ... */ }
    .apply { /* ... */ }
    .run { /* ... */ }
    .also { /* ... */ }
    .let { /* ... */ }
// 과도한 체이닝은 오히려 읽기 어려움. 3단계 이상이면 중간 변수 도입 고려

// ❌ 실수 3: with에 null 가능 객체 전달
val user: User? = findUser(1L)
// with(user) { println(name) }  // ❌ NullPointerException 가능
user?.run { println(name) }      // ✅ null 체크와 함께

// ❌ 실수 4: 반환값 오해
val user = User()
val result = user.apply {
    name = "Alice"
    // ... 설정
}
// result는 user 자신 (apply는 수신 객체 반환)
// result는 Unit이 아님!

val result2 = user.run {
    name  // 마지막 표현식 — name이 반환됨
}
// result2 는 String (name의 값)
```

---

## 전체 정리

| 함수 | 참조 | 반환 | 기억법 |
|------|------|------|--------|
| `let` | `it` | 람다 결과 | "이걸 받아서(it) 결과를 돌려줘" |
| `run` | `this` | 람다 결과 | "내 안에서 실행하고 결과를 돌려줘" |
| `with` | `this` | 람다 결과 | "이것과 함께 작업하고 결과를 돌려줘" |
| `apply` | `this` | 수신 객체 | "설정 적용하고 나를 돌려줘" |
| `also` | `it` | 수신 객체 | "이것도 해줘, 그리고 나를 돌려줘" |
