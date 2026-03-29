---
title: "Kotlin 면접 예상 질문"
order: 14
---

# Kotlin 면접 예상 질문

Kotlin 개발자 면접에서 자주 등장하는 핵심 질문들입니다.

## Q1. Kotlin의 Null Safety는 어떻게 동작하나요?

Kotlin은 **컴파일 타임에 NPE를 방지**합니다. 타입에 `?`를 붙여야만 null을 허용합니다.

```kotlin
var name: String = "Alice"   // non-null
var name: String? = null     // nullable

// 안전 호출
name?.length                 // null이면 null 반환

// Elvis 연산자
val len = name?.length ?: 0  // null이면 0

// 강제 언박싱 (NPE 가능 — 지양)
val len = name!!.length

// let으로 null 아닐 때만 실행
name?.let { println(it.length) }
```

Java 코드 연동 시에는 `@Nullable` / `@NonNull` 어노테이션 또는 플랫폼 타입(`String!`)에 주의합니다.

---

## Q2. data class가 일반 class와 다른 점은?

`data class`는 **데이터 보관 목적의 클래스**에 필요한 보일러플레이트를 자동 생성합니다.

자동 생성 메서드:
- `equals()` / `hashCode()` — 프로퍼티 값 기반 비교
- `toString()` — "ClassName(prop=value, ...)" 형식
- `copy()` — 일부 프로퍼티 변경한 복사본
- `componentN()` — 구조 분해 선언

```kotlin
data class User(val id: Long, val name: String)

val user1 = User(1, "Alice")
val user2 = user1.copy(name = "Bob")

val (id, name) = user1  // 구조 분해
```

❌ 상속 불가 (open 불가)
❌ 추상 클래스가 될 수 없음

---

## Q3. sealed class의 용도는 무엇인가요?

`sealed class`는 **제한된 클래스 계층**을 만들 때 사용합니다. `when` 표현식과 조합하면 컴파일러가 모든 케이스 처리를 강제합니다.

```kotlin
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

fun handleResult(result: Result<User>) = when (result) {
    is Result.Success -> showUser(result.data)
    is Result.Error   -> showError(result.message)
    Result.Loading    -> showProgress()
    // else 불필요 — 컴파일러가 모든 케이스 확인
}
```

---

## Q4. Kotlin Coroutine의 핵심 개념을 설명해주세요

코루틴은 **비동기 코드를 동기처럼 작성**할 수 있게 해주는 경량 스레드입니다.

```kotlin
// suspend 함수 — 일시 중단 가능
suspend fun fetchUser(id: Long): User {
    return withContext(Dispatchers.IO) {
        userRepository.findById(id)
    }
}

// CoroutineScope로 실행
viewModelScope.launch {
    val user = fetchUser(1)   // 블로킹 없이 대기
    updateUI(user)
}
```

**주요 Dispatcher:**
| Dispatcher | 용도 |
|-----------|------|
| `Dispatchers.Main` | UI 업데이트 (Android) |
| `Dispatchers.IO` | 네트워크, 파일 I/O |
| `Dispatchers.Default` | CPU 집약적 연산 |

**스레드 vs 코루틴:** 스레드는 OS 레벨 리소스(수백KB), 코루틴은 경량 객체(수KB). 수만 개 동시 실행 가능.

---

## Q5. object 키워드의 세 가지 용도는?

```kotlin
// 1. 싱글톤 — object declaration
object Logger {
    fun log(msg: String) = println(msg)
}
Logger.log("hello")

// 2. 동반 객체 — companion object (Java static 대체)
class User(val name: String) {
    companion object {
        fun create(name: String) = User(name)
    }
}
val user = User.create("Alice")

// 3. 익명 객체 — object expression
val comparator = object : Comparator<Int> {
    override fun compare(a: Int, b: Int) = a - b
}
```

---

## Q6. extension function의 실제 동작 원리는?

확장 함수는 **정적 메서드로 컴파일**됩니다. 클래스를 수정하지 않고 기능을 추가할 수 있습니다.

```kotlin
fun String.isPalindrome(): Boolean {
    return this == this.reversed()
}

"racecar".isPalindrome()  // true
```

**내부 컴파일 결과 (Java 상당 코드):**
```java
public static boolean isPalindrome(String $this) {
    return $this.equals(new StringBuilder($this).reverse().toString());
}
```

주의: 클래스의 private 멤버에는 접근할 수 없습니다.

---

## Q7. inline function은 언제 사용하나요?

고차 함수(람다를 받는 함수)에서 **람다 객체 생성 오버헤드를 제거**합니다.

```kotlin
// inline 없이 — 람다마다 Function 객체 생성
fun measure(block: () -> Unit) {
    val start = System.currentTimeMillis()
    block()
    println("${System.currentTimeMillis() - start}ms")
}

// inline — 호출 지점에 코드가 직접 삽입됨
inline fun measure(block: () -> Unit) { ... }
```

`reified` 키워드와 조합하면 런타임에 타입 정보를 유지할 수 있습니다.

```kotlin
inline fun <reified T> Gson.fromJson(json: String): T {
    return fromJson(json, T::class.java)
}
```

---

## Q8. Kotlin의 스코프 함수(let, run, with, apply, also)를 비교하세요

| 함수 | 수신 객체 참조 | 반환값 |
|-----|-------------|-------|
| `let` | `it` | 람다 결과 |
| `run` | `this` | 람다 결과 |
| `with` | `this` | 람다 결과 |
| `apply` | `this` | 수신 객체 |
| `also` | `it` | 수신 객체 |

```kotlin
// apply — 객체 초기화 (수신 객체 반환)
val dialog = AlertDialog.Builder(context).apply {
    setTitle("확인")
    setMessage("계속하시겠습니까?")
}.build()

// let — null 체크 후 변환
user?.let { sendEmail(it.email) }

// also — 사이드 이펙트 (로깅 등)
val user = createUser().also { log.info("생성: $it") }
```
