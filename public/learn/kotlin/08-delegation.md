---
title: "위임 (Delegation)"
order: 8
---

## 위임이란

다른 객체에게 일을 맡기는 패턴입니다. Kotlin은 `by` 키워드로 위임을 언어 차원에서 지원합니다.

---

## 클래스 위임

인터페이스 구현을 다른 객체에 위임합니다. 상속 없이 기능을 재사용합니다.

```kotlin
interface Printer {
    fun print(text: String)
    fun printLine(text: String)
}

class ConsolePrinter : Printer {
    override fun print(text: String) = print(text)
    override fun printLine(text: String) = println(text)
}

// by로 위임 — ConsolePrinter의 구현을 그대로 사용
class LoggingPrinter(private val delegate: Printer) : Printer by delegate {
    // printLine만 오버라이드
    override fun printLine(text: String) {
        println("[LOG] $text")
        delegate.printLine(text)
    }
    // print는 delegate에 위임됨
}

val printer = LoggingPrinter(ConsolePrinter())
printer.print("hello")       // ConsolePrinter의 print 실행
printer.printLine("world")   // LoggingPrinter의 printLine 실행
```

데코레이터 패턴을 보일러플레이트 없이 구현할 수 있습니다.

---

## 프로퍼티 위임

프로퍼티의 getter/setter 동작을 다른 객체에 위임합니다.

### lazy — 지연 초기화

처음 접근할 때 한 번만 초기화됩니다.

```kotlin
class UserService {
    // 첫 번째 접근 시 한 번만 계산
    val heavyData: List<String> by lazy {
        println("데이터 로딩 중...")
        loadFromDatabase()
    }
}

val service = UserService()
// 여기서 heavyData에 접근 안 함 → 초기화 안 됨

val data = service.heavyData  // "데이터 로딩 중..." 출력 후 초기화
val data2 = service.heavyData // 이미 초기화됨, 그냥 반환
```

`lazy`는 기본적으로 스레드 안전합니다. (`LazyThreadSafetyMode.SYNCHRONIZED`)

### observable — 변경 감지

값이 변경될 때마다 콜백을 실행합니다.

```kotlin
import kotlin.properties.Delegates

class User {
    var name: String by Delegates.observable("초기값") { property, old, new ->
        println("${property.name}: '$old' → '$new'")
    }
}

val user = User()
user.name = "Alice"  // name: '초기값' → 'Alice'
user.name = "Bob"    // name: 'Alice' → 'Bob'
```

### vetoable — 조건부 변경

조건이 충족될 때만 값을 변경합니다.

```kotlin
var age: Int by Delegates.vetoable(0) { _, _, newValue ->
    newValue >= 0  // 0 이상일 때만 변경 허용
}

age = 25   // 허용
age = -1   // 거부 → 25 유지
println(age)  // 25
```

### notNull — 늦은 초기화 (nullable 아닌 타입)

`lateinit`이 불가능한 타입(Int, Boolean 등 기본형)에 씁니다.

```kotlin
var count: Int by Delegates.notNull()

// count = 42  // 사용 전에 반드시 초기화
// println(count)  // 초기화 전 접근 시 IllegalStateException
```

---

## Map 위임

Map의 값으로 프로퍼티를 위임합니다. 동적 속성이나 설정 객체에 유용합니다.

```kotlin
class Config(private val map: Map<String, Any>) {
    val host: String by map
    val port: Int    by map
    val debug: Boolean by map
}

val config = Config(mapOf(
    "host" to "localhost",
    "port" to 5432,
    "debug" to true
))

println(config.host)   // localhost
println(config.port)   // 5432
println(config.debug)  // true
```

MutableMap을 쓰면 setter도 위임됩니다.

```kotlin
class MutableConfig(private val map: MutableMap<String, Any>) {
    var host: String by map
    var port: Int by map
}

val map = mutableMapOf<String, Any>("host" to "localhost", "port" to 5432)
val config = MutableConfig(map)
config.host = "192.168.0.1"
println(map["host"])  // 192.168.0.1
```

---

## 커스텀 위임

`getValue` / `setValue`를 구현하면 직접 위임 객체를 만들 수 있습니다.

```kotlin
import kotlin.reflect.KProperty

class Cached<T>(private val compute: () -> T) {
    private var cachedValue: T? = null
    private var lastComputed: Long = 0
    private val ttl = 5000L  // 5초

    operator fun getValue(thisRef: Any?, property: KProperty<*>): T {
        val now = System.currentTimeMillis()
        if (cachedValue == null || now - lastComputed > ttl) {
            cachedValue = compute()
            lastComputed = now
            println("${property.name} 캐시 갱신")
        }
        return cachedValue!!
    }
}

class WeatherService {
    val currentTemp: Double by Cached { fetchTemperatureFromApi() }
}
```

---

## value class (인라인 클래스)

단일 프로퍼티를 감싸는 타입입니다. 런타임에 래퍼 객체 없이 기본형으로 최적화됩니다.

```kotlin
@JvmInline
value class UserId(val value: Long)

@JvmInline
value class Email(val value: String) {
    init {
        require(value.contains("@")) { "유효하지 않은 이메일" }
    }
}

fun findUser(id: UserId): User? = ...
fun sendEmail(email: Email) = ...

// Long과 String을 직접 쓰면 실수 가능
// findUser(1L)                  // ❌ 타입 안전하지 않음
findUser(UserId(1L))             // ✅
sendEmail(Email("alice@test.com")) // ✅
```

런타임에는 `UserId`가 `Long`으로, `Email`이 `String`으로 처리됩니다. 타입 안전성을 확보하면서 성능 오버헤드가 없습니다.

---

## lateinit

nullable을 쓰지 않고 나중에 초기화할 수 있습니다. var이어야 하고, 기본형 타입은 불가합니다.

```kotlin
class UserController {
    @Autowired
    lateinit var userService: UserService  // DI로 나중에 주입

    fun getUser(id: Long): User {
        // userService를 주입 전에 호출하면 UninitializedPropertyAccessException
        return userService.findById(id)
    }
}

// 초기화 여부 확인
if (::userService.isInitialized) {
    println("초기화됨")
}
```
