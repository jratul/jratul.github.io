---
title: "위임 (Delegation)"
order: 8
---

## 위임이란 무엇인가?

"위임"은 일상에서도 자주 쓰는 개념입니다. 팀장이 모든 일을 직접 하지 않고 팀원에게 특정 업무를 맡기는 것처럼, 객체가 자신의 일 일부를 다른 객체에게 맡기는 패턴입니다.

프로그래밍에서 위임이 필요한 이유는 **상속의 한계** 때문입니다. Java와 Kotlin은 단일 상속만 허용하기 때문에, 여러 클래스의 기능을 조합하려면 다른 방법이 필요합니다.

Kotlin은 `by` 키워드로 위임을 **언어 수준에서** 지원합니다. 반복적인 코드 없이 위임 패턴을 간결하게 구현할 수 있습니다.

---

## 클래스 위임 — 상속 없이 기능 재사용

### 문제 상황

로그를 출력하는 `Printer` 기능이 있는데, 거기에 "로깅" 기능만 추가하고 싶습니다. 상속을 쓰면 간단하지만, 이미 다른 클래스를 상속하고 있다면 불가능합니다.

```kotlin
// 프린터 인터페이스 정의
interface Printer {
    fun print(text: String)      // 텍스트 출력
    fun printLine(text: String)  // 텍스트 출력 + 줄바꿈
}

// 기본 구현체 — 콘솔에 출력하는 프린터
class ConsolePrinter : Printer {
    override fun print(text: String) = print(text)       // 콘솔 출력
    override fun printLine(text: String) = println(text) // 콘솔 출력 + 줄바꿈
}
```

### by 키워드로 위임

```kotlin
// LoggingPrinter는 Printer를 구현하는데,
// 그 구현을 delegate(ConsolePrinter)에게 위임한다
class LoggingPrinter(private val delegate: Printer) : Printer by delegate {

    // printLine은 직접 오버라이드해서 로그를 추가
    override fun printLine(text: String) {
        println("[LOG ${System.currentTimeMillis()}] $text")  // 로그 시각 추가
        delegate.printLine(text)  // 실제 출력은 delegate에게 맡김
    }

    // print는 오버라이드하지 않음 → delegate.print()가 자동으로 호출됨
}

fun main() {
    val console = ConsolePrinter()
    val logger = LoggingPrinter(console)

    logger.print("hello")        // ConsolePrinter.print() 호출
    logger.printLine("world")    // LoggingPrinter.printLine() 호출 (로그 추가됨)
}
```

`by delegate`가 없었다면 `Printer`의 모든 메서드를 직접 구현해야 했습니다.

```kotlin
// by delegate 없이 작성하면 이렇게 됩니다 — 보일러플레이트 코드!
class LoggingPrinterManual(private val delegate: Printer) : Printer {
    override fun print(text: String) = delegate.print(text)        // 그냥 위임
    override fun printLine(text: String) {                          // 오버라이드
        println("[LOG] $text")
        delegate.printLine(text)
    }
}
```

메서드가 10개라면 10개 모두 작성해야 합니다. `by`를 쓰면 오버라이드할 것만 작성하면 됩니다.

---

### 실전 예제: 캐싱 List

```kotlin
// 원본 List에 캐싱 기능을 추가하는 예제
class CachedList<T>(private val source: List<T>) : List<T> by source {
    private var cachedSize: Int? = null  // 크기 캐시

    // size는 직접 구현 — 캐시 활용
    override val size: Int
        get() {
            if (cachedSize == null) {
                println("크기 계산 중...")  // 처음 한 번만 실행
                cachedSize = source.size
            }
            return cachedSize!!
        }

    // 나머지 List 메서드는 source에 위임 (contains, get, iterator 등)
}

fun main() {
    val original = listOf(1, 2, 3, 4, 5)
    val cached = CachedList(original)

    println(cached.size)      // "크기 계산 중..." + 5
    println(cached.size)      // 5 (캐시에서 즉시 반환)
    println(cached.contains(3))  // true (source.contains 호출)
    println(cached[0])           // 1 (source.get 호출)
}
```

---

## 프로퍼티 위임 — getter/setter를 다른 객체에 맡기기

프로퍼티의 읽기(get)/쓰기(set) 동작을 다른 객체에게 맡기는 기능입니다. Kotlin은 자주 사용하는 패턴을 표준 라이브러리로 제공합니다.

---

### lazy — 필요할 때 초기화

**비유:** 배달 음식을 주문해두고, 배고플 때 가져오는 것. 미리 만들어두지 않고 필요할 때만 준비합니다.

```kotlin
class HeavyService {
    // lazy: 처음 접근할 때 한 번만 계산하고, 그 이후엔 저장된 값을 반환
    val config: Map<String, String> by lazy {
        println("설정 파일 로딩 중...")  // 처음 접근할 때만 실행
        loadConfigFromFile()             // 비용이 큰 작업
    }

    val database: Database by lazy {
        println("DB 연결 중...")  // 처음 접근할 때만 실행
        Database.connect("jdbc:postgresql://localhost/mydb")
    }

    private fun loadConfigFromFile(): Map<String, String> {
        // 실제로는 파일을 읽는 로직
        return mapOf("host" to "localhost", "port" to "8080")
    }
}

fun main() {
    val service = HeavyService()
    println("서비스 객체 생성됨")  // 아직 config나 database 초기화 안 됨

    // 여기서 처음 접근!
    println(service.config["host"])  // "설정 파일 로딩 중..." 출력 후 "localhost"
    println(service.config["port"])  // 이미 초기화됨, 바로 "8080" 반환

    // database는 config를 사용하지 않는 경우 초기화되지 않음
}
```

**lazy의 장점:**
- 앱 시작 시간 단축 (무거운 초기화를 나중으로 미룸)
- 사용하지 않는 리소스는 초기화하지 않음
- 기본적으로 스레드 안전 (`LazyThreadSafetyMode.SYNCHRONIZED`)

```kotlin
// 스레드 안전이 필요 없는 단순한 경우 (성능 향상)
val data: List<String> by lazy(LazyThreadSafetyMode.NONE) {
    loadData()
}
```

---

### observable — 값 변경 감지

**비유:** 집에 CCTV를 달아두는 것. 누군가 들어오면 (값이 바뀌면) 알림이 옵니다.

```kotlin
import kotlin.properties.Delegates

class FormField {
    // observable: 값이 바뀔 때마다 콜백 실행
    // 파라미터: 초기값, 콜백(프로퍼티, 이전값, 새값)
    var value: String by Delegates.observable("") { property, old, new ->
        println("${property.name} 변경: '$old' → '$new'")  // 변경 감지
        validateField(new)  // 유효성 검사
    }

    var isValid: Boolean = true
        private set

    private fun validateField(value: String) {
        isValid = value.isNotBlank()  // 빈 값이면 유효하지 않음
    }
}

fun main() {
    val field = FormField()
    field.value = "Alice"   // value 변경: '' → 'Alice'
    field.value = "Bob"     // value 변경: 'Alice' → 'Bob'
    field.value = ""        // value 변경: 'Bob' → ''
    println(field.isValid)  // false
}
```

**실전 활용: UI 상태 변경 감지**

```kotlin
class ViewModel {
    // 상태가 변경될 때마다 UI 업데이트
    var isLoading: Boolean by Delegates.observable(false) { _, _, isLoading ->
        if (isLoading) showLoadingSpinner()   // 로딩 표시
        else hideLoadingSpinner()              // 로딩 숨김
    }

    var errorMessage: String? by Delegates.observable(null) { _, _, message ->
        message?.let { showError(it) }  // 에러 메시지 표시
    }

    fun fetchData() {
        isLoading = true       // 자동으로 스피너 표시
        try {
            // 데이터 로딩...
        } catch (e: Exception) {
            errorMessage = e.message  // 자동으로 에러 표시
        } finally {
            isLoading = false  // 자동으로 스피너 숨김
        }
    }
}
```

---

### vetoable — 조건부 변경 허용

**비유:** 경비원이 입장을 통제하는 것. 조건을 만족할 때만 들어올 수 있습니다.

```kotlin
import kotlin.properties.Delegates

class UserProfile {
    // vetoable: 콜백이 true를 반환할 때만 값 변경 허용
    var age: Int by Delegates.vetoable(0) { _, oldValue, newValue ->
        val isValid = newValue in 0..150  // 0~150 범위만 허용
        if (!isValid) {
            println("나이 $newValue 는 유효하지 않습니다 (현재: $oldValue 유지)")
        }
        isValid  // true면 변경 허용, false면 거부
    }

    var name: String by Delegates.vetoable("") { _, _, newValue ->
        val isValid = newValue.length in 2..50  // 2~50자만 허용
        if (!isValid) println("이름 '$newValue' 은 유효하지 않습니다")
        isValid
    }
}

fun main() {
    val profile = UserProfile()
    profile.age = 25    // 허용 → age = 25
    profile.age = -1    // 거부 "나이 -1 는 유효하지 않습니다 (현재: 25 유지)"
    profile.age = 200   // 거부
    println(profile.age)  // 25

    profile.name = "Alice"  // 허용
    profile.name = "A"      // 거부 — 1글자는 안 됨
    println(profile.name)   // "Alice"
}
```

---

### notNull — 기본형 타입의 늦은 초기화

`lateinit var`은 참조 타입(String, List 등)만 쓸 수 있고, `Int`, `Boolean`, `Double` 같은 기본형에는 사용할 수 없습니다. 이때 `Delegates.notNull()`을 씁니다.

```kotlin
import kotlin.properties.Delegates

class GamePlayer {
    // lateinit var score: Int  // ❌ 컴파일 에러 — Int는 lateinit 불가
    var score: Int by Delegates.notNull()  // ✅ 기본형 타입에도 사용 가능
    var health: Double by Delegates.notNull()

    fun initialize(initialScore: Int, initialHealth: Double) {
        score = initialScore    // 초기화
        health = initialHealth  // 초기화
    }

    fun printStatus() {
        println("점수: $score, 체력: $health")  // 초기화 안 하면 IllegalStateException
    }
}

fun main() {
    val player = GamePlayer()
    // player.printStatus()  // ❌ IllegalStateException: score not initialized

    player.initialize(100, 95.5)
    player.printStatus()  // "점수: 100, 체력: 95.5"
}
```

---

## Map 위임 — Map을 객체처럼 사용

Map에서 값을 가져오는 동작을 프로퍼티처럼 사용할 수 있습니다. 설정 파일이나 JSON 데이터를 객체로 래핑할 때 유용합니다.

```kotlin
// 읽기 전용 Map 위임
class ServerConfig(private val map: Map<String, Any>) {
    val host: String by map    // map["host"]와 동일
    val port: Int by map       // map["port"]와 동일
    val debug: Boolean by map  // map["debug"]와 동일
    val maxConnections: Int by map
}

fun main() {
    // JSON 파싱 결과나 설정 파일을 그대로 전달
    val config = ServerConfig(mapOf(
        "host" to "api.example.com",
        "port" to 443,
        "debug" to false,
        "maxConnections" to 100
    ))

    println(config.host)            // "api.example.com"
    println(config.port)            // 443
    println(config.debug)           // false
    println(config.maxConnections)  // 100
}
```

```kotlin
// 쓰기 가능한 MutableMap 위임
class MutableConfig(private val map: MutableMap<String, Any>) {
    var host: String by map  // getter + setter 모두 map에 위임
    var port: Int by map
}

fun main() {
    val map = mutableMapOf<String, Any>("host" to "localhost", "port" to 8080)
    val config = MutableConfig(map)

    config.host = "production.example.com"  // map["host"] = "production.example.com"
    config.port = 443                        // map["port"] = 443

    println(map)  // {host=production.example.com, port=443}
}
```

**실전 예제: 환경 변수 설정 객체**

```kotlin
// 환경 변수나 시스템 프로퍼티를 타입 안전하게 접근
class AppConfig(env: Map<String, String>) {
    val databaseUrl: String by env          // DB_URL 환경변수
    val apiKey: String by env               // API_KEY 환경변수

    // 기본값이 필요하면 withDefault 활용
    private val envWithDefault = env.withDefault { key ->
        throw IllegalStateException("환경변수 '$key' 가 설정되지 않았습니다")
    }
}
```

---

## 커스텀 위임 만들기

`getValue` / `setValue` 연산자 함수를 구현하면 직접 위임 객체를 만들 수 있습니다.

```kotlin
import kotlin.reflect.KProperty

// 만료 시간이 있는 캐시 위임
class ExpiringCache<T>(
    private val ttlMillis: Long,  // 캐시 유효 시간 (밀리초)
    private val compute: () -> T  // 값 계산 함수
) {
    private var cachedValue: T? = null
    private var lastUpdated: Long = 0

    // getValue: 프로퍼티 읽기 시 호출됨
    // thisRef: 프로퍼티를 소유한 객체 (어떤 클래스든 사용 가능하게 Any?)
    // property: 프로퍼티 메타정보 (이름, 타입 등)
    operator fun getValue(thisRef: Any?, property: KProperty<*>): T {
        val now = System.currentTimeMillis()

        // 캐시가 없거나 만료됐으면 다시 계산
        if (cachedValue == null || now - lastUpdated > ttlMillis) {
            println("${property.name}: 캐시 갱신 중...")
            cachedValue = compute()  // 비용이 큰 계산 실행
            lastUpdated = now
        }

        return cachedValue!!  // 캐시된 값 반환
    }
}

// 편의 함수
fun <T> expiring(ttlMillis: Long, compute: () -> T) = ExpiringCache(ttlMillis, compute)

class WeatherService {
    // 5분마다 날씨 데이터 갱신
    val temperature: Double by expiring(5 * 60 * 1000L) {
        fetchTemperatureFromApi()  // 실제로는 API 호출
    }

    // 1시간마다 통계 갱신
    val statistics: Map<String, Int> by expiring(60 * 60 * 1000L) {
        computeStatistics()  // 비용이 큰 통계 계산
    }

    private fun fetchTemperatureFromApi(): Double = 23.5  // 예시
    private fun computeStatistics(): Map<String, Int> = mapOf("requests" to 1000)  // 예시
}
```

```kotlin
// 쓰기도 지원하는 커스텀 위임
class Validated<T>(
    private var value: T,
    private val validator: (T) -> Boolean,
    private val errorMessage: (T) -> String
) {
    operator fun getValue(thisRef: Any?, property: KProperty<*>): T = value

    operator fun setValue(thisRef: Any?, property: KProperty<*>, newValue: T) {
        if (validator(newValue)) {
            value = newValue  // 유효하면 저장
        } else {
            throw IllegalArgumentException(errorMessage(newValue))  // 유효하지 않으면 예외
        }
    }
}

class User {
    // 이메일은 @가 포함된 경우만 허용
    var email: String by Validated(
        value = "",
        validator = { it.contains("@") },
        errorMessage = { "'$it' 은 유효한 이메일이 아닙니다" }
    )

    // 나이는 0~150만 허용
    var age: Int by Validated(
        value = 0,
        validator = { it in 0..150 },
        errorMessage = { "나이는 0~150 사이여야 합니다 (입력: $it)" }
    )
}

fun main() {
    val user = User()
    user.email = "alice@test.com"  // 성공
    user.age = 25                  // 성공

    // user.email = "not-an-email"  // IllegalArgumentException
    // user.age = -1               // IllegalArgumentException
}
```

---

## value class (인라인 클래스) — 타입 안전성 + 제로 비용

**문제:** `Long`으로 표현되는 값이 여러 종류 있을 때, 실수로 잘못된 값을 전달할 수 있습니다.

```kotlin
// 이런 실수가 생길 수 있음
fun transferMoney(fromId: Long, toId: Long, amount: Long) {
    // fromId와 toId를 헷갈리면? amount를 userId 자리에 넣으면?
}

transferMoney(1000L, 2L, 500L)  // 맞는 건지 한눈에 알기 어려움
```

**해결:** `value class`로 각각 다른 타입으로 만들기

```kotlin
@JvmInline
value class UserId(val value: Long)  // 사용자 ID

@JvmInline
value class Amount(val value: Long) {  // 금액
    init {
        require(value > 0) { "금액은 0보다 커야 합니다" }  // 유효성 검사
    }

    operator fun plus(other: Amount) = Amount(value + other.value)   // 덧셈
    operator fun minus(other: Amount) = Amount(value - other.value)  // 뺄셈
}

@JvmInline
value class Email(val value: String) {
    init {
        require(value.contains("@")) { "유효하지 않은 이메일: $value" }
    }
}

// 이제 타입이 다르므로 컴파일러가 실수를 잡아줌
fun transferMoney(fromId: UserId, toId: UserId, amount: Amount) {
    println("${fromId.value} → ${toId.value}: ${amount.value}원 이체")
}

fun main() {
    val from = UserId(1L)
    val to = UserId(2L)
    val amount = Amount(50000L)

    transferMoney(from, to, amount)  // ✅ 명확함
    // transferMoney(amount, to, from)  // ❌ 컴파일 에러 — 타입 불일치

    // 런타임에는 UserId = Long, Amount = Long으로 처리 (성능 오버헤드 없음)
    val total = Amount(30000L) + Amount(20000L)  // Amount(50000)
    println(total.value)  // 50000
}
```

**value class의 핵심 특징:**
- `@JvmInline` 어노테이션 필수
- 프로퍼티를 하나만 가질 수 있음
- 런타임에는 내부 타입으로 처리 → 성능 오버헤드 없음
- 타입 안전성만 추가됨

---

## lateinit — 나중에 초기화할 프로퍼티

의존성 주입(DI) 프레임워크나 테스트에서, 객체 생성 시점에 값을 알 수 없는 경우가 있습니다. `lateinit var`을 쓰면 nullable 없이 늦은 초기화가 가능합니다.

```kotlin
class UserController {
    // Spring이 나중에 주입해줌 — 생성자에 넣을 수 없는 상황
    @Autowired
    lateinit var userService: UserService

    @Autowired
    lateinit var emailService: EmailService

    fun getUser(id: Long): User {
        // 주입 전에 호출되면 UninitializedPropertyAccessException
        return userService.findById(id)
    }
}
```

```kotlin
// 초기화 여부 확인 방법
class Component {
    lateinit var dependency: Dependency

    fun isReady(): Boolean {
        return ::dependency.isInitialized  // :: 뒤에 프로퍼티 이름
    }

    fun execute() {
        if (!::dependency.isInitialized) {
            throw IllegalStateException("dependency가 초기화되지 않았습니다")
        }
        dependency.doWork()
    }
}
```

**lateinit 사용 조건:**
- `var`이어야 함 (`val` 불가)
- 참조 타입이어야 함 (`Int`, `Boolean` 등 기본형 불가 → `Delegates.notNull()` 사용)
- nullable(`?`) 타입 불가

---

## 흔한 실수

```kotlin
// ❌ 실수 1: lazy를 var로 선언 (lazy는 val에만 사용 가능)
// var data: List<String> by lazy { loadData() }  // 컴파일 에러

// ✅ 올바른 사용
val data: List<String> by lazy { loadData() }

// ❌ 실수 2: lateinit을 기본형에 사용
// lateinit var count: Int  // 컴파일 에러

// ✅ 올바른 사용
var count: Int by Delegates.notNull()

// ❌ 실수 3: notNull 초기화 전 접근
var score: Int by Delegates.notNull()
// println(score)  // IllegalStateException!

// ✅ 초기화 후 접근
score = 0
println(score)  // 0

// ❌ 실수 4: value class에 프로퍼티 2개 이상
// @JvmInline
// value class BadClass(val a: Int, val b: Int)  // 컴파일 에러
```

---

## 정리

| 위임 종류 | 사용 시점 |
|-----------|-----------|
| `클래스 by` | 인터페이스 구현을 다른 객체에게 위임 (데코레이터 패턴) |
| `by lazy` | 처음 접근할 때 초기화되는 읽기 전용 프로퍼티 |
| `by observable` | 값 변경을 감지하고 싶을 때 |
| `by vetoable` | 조건에 따라 값 변경을 허용/거부 |
| `by Delegates.notNull()` | 기본형 타입의 늦은 초기화 |
| `by map` | Map을 프로퍼티처럼 사용 |
| `커스텀 위임` | 특수한 getter/setter 로직이 필요할 때 |
| `value class` | 타입 안전성 + 성능 유지 |
| `lateinit var` | DI 프레임워크나 테스트에서 나중에 초기화 |
