---
title: "제네릭"
order: 7
---

## 기본 제네릭

Java 제네릭과 기본 개념은 같습니다. 타입을 파라미터로 받아 재사용 가능한 코드를 만듭니다.

```kotlin
class Box<T>(val value: T)

val intBox = Box(42)
val strBox = Box("hello")

println(intBox.value)  // 42
println(strBox.value)  // hello

// 제네릭 함수
fun <T> List<T>.secondOrNull(): T? = if (size >= 2) get(1) else null

listOf(1, 2, 3).secondOrNull()  // 2
listOf(1).secondOrNull()        // null
```

---

## 변성 (Variance)

Java의 와일드카드(`? extends`, `? super`)와 같은 개념이지만 **선언 지점 변성**으로 더 명확합니다.

### 불변 (Invariant) — 기본값

```kotlin
class Box<T>(var value: T)

val intBox: Box<Int> = Box(42)
val numBox: Box<Number> = intBox  // ❌ 컴파일 에러
// Int가 Number의 하위 타입이어도 Box<Int>는 Box<Number>가 아님
```

### 공변 (Covariant) — `out`

`out T`는 T를 **생산(반환)만** 합니다. `Box<Int>`를 `Box<Number>`로 사용할 수 있습니다.

```kotlin
class Box<out T>(val value: T)  // val → 읽기만 가능

val intBox: Box<Int> = Box(42)
val numBox: Box<Number> = intBox  // ✅ Int는 Number의 하위 타입이므로 가능

// out이면 T를 반환할 수만 있고, 인자로 받을 수 없음
class Producer<out T>(private val value: T) {
    fun produce(): T = value      // ✅ 반환 가능
    // fun consume(t: T) {}       // ❌ 인자로 받기 불가
}
```

`List<out E>`가 대표적인 예입니다. 그래서 `List<Int>`를 `List<Number>`에 할당할 수 있습니다.

### 반공변 (Contravariant) — `in`

`in T`는 T를 **소비(인자)만** 합니다. `Box<Number>`를 `Box<Int>`로 사용할 수 있습니다.

```kotlin
class Consumer<in T> {
    fun consume(value: T) { println(value) }  // ✅ 인자로 받기 가능
    // fun produce(): T { ... }               // ❌ 반환 불가
}

val numConsumer: Consumer<Number> = Consumer()
val intConsumer: Consumer<Int> = numConsumer  // ✅ Number를 받을 수 있으면 Int도 받을 수 있음

// Comparator<in T>가 대표적인 예
val comparator: Comparator<Number> = Comparator { a, b -> a.toDouble().compareTo(b.toDouble()) }
val intComparator: Comparator<Int> = comparator  // ✅
```

---

## 사용 지점 변성

클래스 선언 시가 아니라 사용하는 곳에서 변성을 지정합니다.

```kotlin
// MutableList는 불변(invariant)이지만 사용 지점에서 out 지정 가능
fun copyTo(source: MutableList<out Number>, dest: MutableList<Number>) {
    dest.addAll(source)
}

val ints: MutableList<Int> = mutableListOf(1, 2, 3)
val nums: MutableList<Number> = mutableListOf()
copyTo(ints, nums)  // ✅
```

---

## reified 타입 파라미터

Java에서는 제네릭 타입이 런타임에 소거되어 `T::class`를 사용할 수 없습니다. Kotlin의 `inline` 함수에서 `reified`를 쓰면 타입 정보가 유지됩니다.

```kotlin
// ❌ 일반 제네릭 함수 — T 타입 정보 없음
fun <T> List<Any>.filterIsInstance(): List<T> {
    // T::class 사용 불가
}

// ✅ reified — 런타임에 T 타입 접근 가능
inline fun <reified T> List<Any>.filterByType(): List<T> {
    return filter { it is T }.map { it as T }
}

val mixed: List<Any> = listOf(1, "hello", 2, "world", 3)
val strings: List<String> = mixed.filterByType<String>()  // ["hello", "world"]
val ints: List<Int>    = mixed.filterByType<Int>()        // [1, 2, 3]
```

### 실전 활용: JSON 역직렬화

```kotlin
inline fun <reified T> String.fromJson(): T {
    return objectMapper.readValue(this, T::class.java)
}

val user: User = """{"name": "Alice", "age": 30}""".fromJson()
val users: List<User> = """[{"name": "Alice"}]""".fromJson()
```

### 타입 체크

```kotlin
inline fun <reified T> Any.isInstanceOf(): Boolean = this is T

42.isInstanceOf<Int>()     // true
42.isInstanceOf<String>()  // false
```

---

## 타입 별칭 (typealias)

복잡한 타입에 이름을 붙입니다.

```kotlin
typealias UserId = Long
typealias UserMap = Map<UserId, User>
typealias Callback<T> = (Result<T>) -> Unit

// 함수 타입에 이름 붙이기
typealias OnSuccess<T> = (T) -> Unit
typealias OnError = (Throwable) -> Unit

fun fetchUser(id: UserId, onSuccess: OnSuccess<User>, onError: OnError) { ... }
```

---

## 스타 프로젝션 (`*`)

타입 인자를 모를 때 씁니다. Java의 `<?>`에 해당합니다.

```kotlin
fun printSize(list: List<*>) {
    println(list.size)  // 원소 타입 모르지만 size는 접근 가능
    // list.add("x")    // ❌ 타입을 모르니 추가 불가
}

printSize(listOf(1, 2, 3))      // 3
printSize(listOf("a", "b"))     // 2
```

---

## 실전 예제: 제네릭 리포지토리

```kotlin
interface Repository<T, ID> {
    fun findById(id: ID): T?
    fun findAll(): List<T>
    fun save(entity: T): T
    fun delete(id: ID)
}

class InMemoryRepository<T : Any, ID : Any>(
    private val getId: (T) -> ID
) : Repository<T, ID> {
    private val store = mutableMapOf<ID, T>()

    override fun findById(id: ID): T? = store[id]
    override fun findAll(): List<T> = store.values.toList()
    override fun save(entity: T): T = entity.also { store[getId(it)] = it }
    override fun delete(id: ID) { store.remove(id) }
}

data class User(val id: Long, val name: String)

val repo = InMemoryRepository<User, Long> { it.id }
repo.save(User(1L, "Alice"))
repo.save(User(2L, "Bob"))
println(repo.findById(1L))   // User(id=1, name=Alice)
println(repo.findAll().size) // 2
```
