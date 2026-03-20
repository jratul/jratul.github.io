---
title: "스코프 함수"
order: 6
---

## 스코프 함수란

객체의 컨텍스트 안에서 코드 블록을 실행하는 함수입니다. `let`, `run`, `with`, `apply`, `also` 다섯 가지가 있습니다. Kotlin 코드에서 매우 자주 사용합니다.

```
구분 기준
  1. 블록 안에서 객체를 어떻게 참조하는가: this vs it
  2. 블록의 반환값이 무엇인가: 람다 결과 vs 수신 객체 자신
```

| 함수 | 참조 방식 | 반환값 | 주 용도 |
|------|-----------|--------|---------|
| `let` | `it` | 람다 결과 | null 체크, 변환 |
| `run` | `this` | 람다 결과 | 초기화 + 결과 반환 |
| `with` | `this` | 람다 결과 | 객체 멤버 반복 호출 |
| `apply` | `this` | 수신 객체 | 객체 초기화/설정 |
| `also` | `it` | 수신 객체 | 부수 작업 (로깅 등) |

---

## let

`it`으로 객체를 참조하고, 람다의 결과를 반환합니다.

```kotlin
// null 체크와 함께 사용 (가장 자주 쓰는 패턴)
val name: String? = "Alice"
val length = name?.let { it.length }  // null이면 null, 아니면 length

// null이면 실행 안 함
user?.let {
    println("사용자: ${it.name}")
    sendEmail(it.email)
}

// 변환
val result = "  hello  ".let { it.trim().uppercase() }  // "HELLO"

// 임시 변수 없이 체이닝
val numbers = listOf(1, 2, 3, 4, 5)
numbers.filter { it % 2 == 0 }
    .let { evens ->
        println("짝수 개수: ${evens.size}")
        evens.sum()
    }
```

---

## apply

`this`로 객체를 참조하고, **수신 객체 자신**을 반환합니다. 객체 설정에 적합합니다.

```kotlin
// 객체 초기화
val user = User().apply {
    name = "Alice"
    email = "alice@example.com"
    age = 30
}

// 빌더 패턴 대체
val intent = Intent(context, DetailActivity::class.java).apply {
    putExtra("id", 1L)
    putExtra("title", "제목")
    flags = Intent.FLAG_ACTIVITY_NEW_TASK
}

// 리스트 초기화
val list = mutableListOf<String>().apply {
    add("first")
    add("second")
    addAll(otherList)
}
```

`apply`는 설정 후 **같은 객체**를 돌려주므로, 연속 설정에 편리합니다.

---

## also

`it`으로 객체를 참조하고, **수신 객체 자신**을 반환합니다. 주 흐름을 방해하지 않는 부수 작업(로깅, 검증)에 씁니다.

```kotlin
val user = createUser()
    .also { println("생성된 사용자: $it") }  // 로깅
    .also { userRepository.save(it) }        // 저장

// 체이닝에서 중간 검증
val numbers = mutableListOf(1, 2, 3)
    .also { require(it.isNotEmpty()) { "비어 있으면 안 됩니다" } }
    .also { println("처리할 개수: ${it.size}") }
```

`apply`와 `also` 비교:

```kotlin
// apply: this로 참조, 멤버를 직접 사용
user.apply { name = "Alice" }

// also: it으로 참조, 객체를 명시적으로 사용
user.also { it.name = "Alice" }
```

---

## run

`this`로 객체를 참조하고, **람다의 결과**를 반환합니다. 초기화 후 결과가 필요할 때 씁니다.

```kotlin
val result = user.run {
    "${name}의 이메일은 ${email}입니다."
}

// null 체크 + 변환
val displayName = user?.run {
    if (nickname.isNotBlank()) nickname else name
} ?: "익명"

// 지역 스코프 생성 (임시 변수를 바깥에 노출하지 않으려 할 때)
val config = run {
    val host = System.getenv("DB_HOST") ?: "localhost"
    val port = System.getenv("DB_PORT")?.toInt() ?: 5432
    DatabaseConfig(host, port)
}
```

---

## with

수신 객체를 인자로 받고, `this`로 참조하며, 람다 결과를 반환합니다. null이 아닌 객체에 반복 작업을 할 때 씁니다.

```kotlin
val output = with(StringBuilder()) {
    append("이름: Alice\n")
    append("나이: 30\n")
    append("이메일: alice@example.com")
    toString()
}

// run과 비교 — run은 수신 객체에, with는 인자로 전달
user.run { "${name}: ${email}" }  // run
with(user) { "${name}: ${email}" }  // with (동일한 결과)
```

---

## takeIf / takeUnless

조건에 따라 수신 객체 또는 null을 반환합니다.

```kotlin
// takeIf: 조건이 true면 객체, false면 null
val validUser = user.takeIf { it.age >= 18 }

// takeUnless: 조건이 false면 객체, true면 null
val activeUser = user.takeUnless { it.isBanned }

// let과 조합
user.takeIf { it.isVerified }
    ?.let { sendWelcomeEmail(it) }
```

---

## 선택 가이드

```
설정/초기화, 같은 객체 반환이 필요하다 → apply
부수 작업(로깅, 검증), 체이닝을 끊지 않으려 한다 → also
null 가능 객체 처리, 변환 결과가 필요하다 → let
객체 멤버를 여러 번 호출, 결과가 필요하다 → run / with
조건부로 객체를 넘기거나 null로 만든다 → takeIf / takeUnless
```

---

## 실전 예제

```kotlin
data class Order(
    var userId: Long = 0,
    var productId: Long = 0,
    var quantity: Int = 0,
    var address: String = ""
)

fun processOrder(request: OrderRequest?): OrderResult {
    // null 체크 + 객체 설정 + 로깅 + 반환
    return request
        ?.takeIf { it.quantity > 0 }
        ?.let { req ->
            Order().apply {
                userId    = req.userId
                productId = req.productId
                quantity  = req.quantity
                address   = req.address
            }
        }
        ?.also { order -> println("주문 처리: $order") }
        ?.also { order -> orderRepository.save(order) }
        ?.run { OrderResult.success(id) }
        ?: OrderResult.failure("유효하지 않은 요청")
}
```
