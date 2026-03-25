---
title: "제네릭"
order: 7
---

## 제네릭이란 무엇인가요?

제네릭(Generic)은 **타입을 파라미터로 받아 여러 타입에 재사용할 수 있는 코드**를 만드는 방법입니다.

예를 들어, "상자" 클래스를 만든다고 합시다. 사과 상자, 책 상자, 전화기 상자를 별도로 만들어야 할까요? 아닙니다. 그냥 "어떤 물건이든 담을 수 있는 상자"를 만들면 됩니다. 제네릭이 바로 이 역할을 합니다.

---

## 기본 제네릭 클래스와 함수

```kotlin
// T는 타입 파라미터 — "어떤 타입이든 올 수 있어"
class Box<T>(val value: T) {
    fun show() = "상자 안에는 $value 이(가) 있습니다"
}

// 사용 시 타입 지정
val intBox = Box<Int>(42)         // T = Int
val strBox = Box<String>("hello") // T = String
val listBox = Box(listOf(1, 2, 3)) // 타입 추론 가능 → T = List<Int>

println(intBox.value)   // 42
println(strBox.show())  // 상자 안에는 hello 이(가) 있습니다
```

```kotlin
// 제네릭 함수
fun <T> List<T>.secondOrNull(): T? {
    return if (size >= 2) get(1) else null
}

println(listOf(10, 20, 30).secondOrNull())  // 20
println(listOf(10).secondOrNull())          // null
println(listOf("a", "b", "c").secondOrNull())  // "b"

// 타입 제약 — T : Comparable<T> : T는 비교 가능한 타입이어야 함
fun <T : Comparable<T>> max(a: T, b: T): T {
    return if (a > b) a else b
}

println(max(3, 7))       // 7
println(max("apple", "banana"))  // banana (알파벳 순으로 banana가 더 큼)
// println(max(listOf(1), listOf(2)))  // ❌ List는 Comparable 아님
```

---

## 타입 제약 (Type Constraints)

`T : 상위타입` 형태로 T가 특정 타입의 하위 타입이어야 한다는 제약을 걸 수 있습니다.

```kotlin
// Number의 하위 타입만 허용 (Int, Double, Long 등)
fun <T : Number> sum(list: List<T>): Double {
    return list.fold(0.0) { acc, n -> acc + n.toDouble() }
}

println(sum(listOf(1, 2, 3)))         // 6.0 (Int 리스트)
println(sum(listOf(1.5, 2.5, 3.0)))   // 7.0 (Double 리스트)
// println(sum(listOf("a", "b")))      // ❌ String은 Number 아님

// 여러 인터페이스를 동시에 만족해야 할 때 where 사용
interface Printable { fun print() }
interface Saveable { fun save() }

fun <T> process(item: T) where T : Printable, T : Saveable {
    item.print()
    item.save()
}
```

---

## 변성 (Variance) — 제네릭 타입의 계층 관계

이 부분이 제네릭에서 가장 이해하기 어려운 개념입니다. 천천히 읽어보세요.

### 왜 변성이 필요한가?

```kotlin
// Int는 Number의 하위 타입임 — 당연함
val n: Number = 42  // Int를 Number 변수에 담을 수 있음

// 그렇다면 List<Int>는 List<Number>의 하위 타입일까?
val ints: List<Int> = listOf(1, 2, 3)
// val nums: List<Number> = ints  // Kotlin 기본은 이게 안 됨! 왜?
```

**왜 이게 문제가 될 수 있을까요?** 만약 `List<Int>`를 `List<Number>`에 담을 수 있다면:

```kotlin
// 만약 이게 허용된다고 가정
val ints: MutableList<Int> = mutableListOf(1, 2, 3)
val nums: MutableList<Number> = ints  // 가정: 허용됨

nums.add(3.14)  // Double을 Number 리스트에 추가 — 허용됨
// 하지만 ints와 nums는 같은 리스트! ints에 Double이 들어가 버렸다!
println(ints)   // [1, 2, 3, 3.14] — 타입 안전성 깨짐!
```

이 문제 때문에 Kotlin은 제네릭을 기본적으로 **불변(Invariant)**으로 처리합니다.

---

### 불변 (Invariant) — 기본값

```kotlin
class Box<T>(var value: T)  // 기본은 불변

val intBox: Box<Int> = Box(42)
// val numBox: Box<Number> = intBox  // ❌ 컴파일 에러
// Int가 Number의 하위 타입이어도, Box<Int>와 Box<Number>는 아무 관계 없음
```

---

### 공변 (Covariant) — `out` 키워드

`out T`는 "T를 생산(반환)만 하고 소비(입력)하지 않는다"는 의미입니다. 이때 `Box<Int>`를 `Box<Number>`에 담을 수 있게 됩니다.

```kotlin
// out T — T는 반환만 하고 입력 받지 않음
class ReadOnlyBox<out T>(val value: T) {
    fun get(): T = value      // ✅ T를 반환하는 것은 OK
    // fun put(t: T) {}       // ❌ T를 입력 받는 것은 불가
}

val intBox: ReadOnlyBox<Int> = ReadOnlyBox(42)
val numBox: ReadOnlyBox<Number> = intBox  // ✅ out이므로 허용

// 왜 안전할까?
// ReadOnlyBox는 값을 꺼내기만 하고 넣지 않으므로
// intBox를 numBox로 사용해도 타입 안전성이 깨지지 않음
println(numBox.get())  // 42 (Number로 취급되지만 실제로는 Int)
```

**실제 예:** `List<out E>`가 대표적입니다. 그래서 `List<Int>`를 `List<Number>`에 담을 수 있습니다.

```kotlin
val ints: List<Int> = listOf(1, 2, 3)
val nums: List<Number> = ints  // ✅ List는 out으로 선언되어 있음
// nums.add(3.14)  // ❌ List는 읽기 전용이므로 add 없음 — 안전!
```

---

### 반공변 (Contravariant) — `in` 키워드

`in T`는 "T를 소비(입력)만 하고 생산(반환)하지 않는다"는 의미입니다. 이때 `Box<Number>`를 `Box<Int>`에 담을 수 있게 됩니다.

```kotlin
// in T — T를 입력 받기만 하고 반환하지 않음
class Consumer<in T> {
    fun consume(value: T) {
        println("소비: $value")  // ✅ T를 입력으로 받는 것은 OK
    }
    // fun produce(): T { ... }  // ❌ T를 반환하는 것은 불가
}

val numConsumer: Consumer<Number> = Consumer()
val intConsumer: Consumer<Int> = numConsumer  // ✅ in이므로 허용

// 왜 안전할까?
// Number를 소비할 수 있는 소비자는 Int도 소비할 수 있음 (Int는 Number의 하위 타입)
intConsumer.consume(42)    // ✅
intConsumer.consume(100)   // ✅
```

**실제 예:** `Comparator<in T>`가 대표적입니다.

```kotlin
val numberComparator: Comparator<Number> = Comparator { a, b ->
    a.toDouble().compareTo(b.toDouble())
}

// Number 비교기를 Int 비교에 사용 가능
val intComparator: Comparator<Int> = numberComparator  // ✅
println(intComparator.compare(3, 7))  // -1 (3이 7보다 작음)
```

---

### 정리: out, in, 불변

```
out T (공변):
  - 생산자 (Producer) — T를 반환만 함
  - Producer<Child>를 Producer<Parent> 변수에 담을 수 있음
  - 비유: 읽기 전용 책 — 내용을 읽을 수 있지만 내용을 덮어쓸 수 없음
  - 예: List<out E>, Flow<out T>

in T (반공변):
  - 소비자 (Consumer) — T를 입력만 받음
  - Consumer<Parent>를 Consumer<Child> 변수에 담을 수 있음
  - 비유: 쓰레기통 — 무엇이든 넣을 수 있지만 꺼낼 수 없음
  - 예: Comparator<in T>, Comparable<in T>

불변 (기본):
  - 생산자이자 소비자 — T를 반환하고 입력도 받음
  - Box<Child>와 Box<Parent>는 아무 관계 없음
  - 예: MutableList<T>, MutableMap<K, V>
```

---

## 사용 지점 변성

클래스 선언이 아닌, **사용하는 곳에서** 변성을 지정하는 방법입니다.

```kotlin
// MutableList는 기본적으로 불변(invariant)
// 하지만 특정 함수에서만 공변으로 사용할 때
fun copyAll(source: MutableList<out Number>, dest: MutableList<Number>) {
    // source에는 out이 붙어서 읽기만 가능
    for (n in source) {
        dest.add(n)
    }
}

val ints = mutableListOf(1, 2, 3)
val numbers = mutableListOf<Number>()
copyAll(ints, numbers)  // ✅
println(numbers)  // [1, 2, 3]
```

---

## reified 타입 파라미터 — 런타임에 타입 정보 유지

Java와 Kotlin 제네릭은 **타입 소거(Type Erasure)** 때문에 런타임에 제네릭 타입 정보가 사라집니다.

```kotlin
// ❌ 일반 제네릭 — 런타임에 T의 타입 정보 없음
fun <T> List<Any>.filterType(): List<T> {
    // T::class  // ❌ 컴파일 에러 — 런타임에 T가 뭔지 모름
    return emptyList()
}
```

`inline` 함수에 `reified`를 붙이면 컴파일러가 T를 실제 타입으로 치환해주어, 런타임에도 타입 정보를 사용할 수 있습니다.

```kotlin
// ✅ reified — T::class 사용 가능
inline fun <reified T> List<Any>.filterByType(): List<T> {
    return filter { it is T }  // is T 체크 가능
           .map { it as T }    // T로 캐스팅 가능
}

val mixed: List<Any> = listOf(1, "hello", 2.5, "world", 3, true)

val strings = mixed.filterByType<String>()  // ["hello", "world"]
val ints = mixed.filterByType<Int>()        // [1, 3]
println(strings)  // [hello, world]
println(ints)     // [1, 3]
```

```kotlin
// 실전 활용 1: 타입 체크 함수
inline fun <reified T> Any.isInstanceOf(): Boolean = this is T

println(42.isInstanceOf<Int>())     // true
println(42.isInstanceOf<String>())  // false
println("hi".isInstanceOf<String>()) // true

// 실전 활용 2: 타입으로 Enum 찾기
inline fun <reified T : Enum<T>> findEnumByName(name: String): T? {
    return enumValues<T>().find { it.name == name }
}

enum class Color { RED, GREEN, BLUE }
val color = findEnumByName<Color>("RED")  // Color.RED
println(color)  // RED
```

---

## 타입 별칭 (typealias)

복잡한 제네릭 타입에 짧고 의미 있는 이름을 붙입니다.

```kotlin
// 복잡한 타입에 이름 붙이기
typealias UserId = Long
typealias UserMap = Map<UserId, User>
typealias Callback<T> = (Result<T>) -> Unit

// 함수 타입에 이름 붙이기
typealias Predicate<T> = (T) -> Boolean
typealias Transform<T, R> = (T) -> R

// 사용 — 훨씬 읽기 좋음
fun fetchUser(id: UserId, onResult: Callback<User>) { ... }

val isAdult: Predicate<Int> = { it >= 18 }
val toString: Transform<Int, String> = { it.toString() }

println(isAdult(20))    // true
println(isAdult(15))    // false
println(toString(42))   // "42"
```

---

## 스타 프로젝션 (`*`) — 타입을 모를 때

제네릭 타입이 무엇인지 모를 때 또는 중요하지 않을 때 `*`를 사용합니다. Java의 `<?>`에 해당합니다.

```kotlin
// 리스트의 타입이 무엇인지 모를 때
fun printSize(list: List<*>) {
    println("크기: ${list.size}")  // 원소 타입 몰라도 size는 접근 가능
    // list.add("x")  // ❌ 타입을 모르니 추가 불가
    for (item in list) {
        println(item)  // Any?로 다뤄짐
    }
}

printSize(listOf(1, 2, 3))        // 크기: 3, 1, 2, 3
printSize(listOf("a", "b", "c"))  // 크기: 3, a, b, c
printSize(listOf(true, false))    // 크기: 2, true, false
```

---

## 실전 예제: 제네릭 리포지토리

제네릭을 활용하면 모든 엔티티 타입에 재사용 가능한 리포지토리를 만들 수 있습니다.

```kotlin
// 인터페이스 정의 — T: 엔티티 타입, ID: 식별자 타입
interface Repository<T, ID> {
    fun findById(id: ID): T?
    fun findAll(): List<T>
    fun save(entity: T): T
    fun delete(id: ID): Boolean
    fun count(): Int
}

// 메모리 기반 구현 — T와 ID를 어떤 타입이든 사용 가능
class InMemoryRepository<T : Any, ID : Any>(
    private val getId: (T) -> ID  // 엔티티에서 ID를 추출하는 함수
) : Repository<T, ID> {

    private val store = mutableMapOf<ID, T>()  // ID → 엔티티 맵

    override fun findById(id: ID): T? = store[id]

    override fun findAll(): List<T> = store.values.toList()

    override fun save(entity: T): T {
        val id = getId(entity)  // 엔티티에서 ID 추출
        store[id] = entity
        return entity
    }

    override fun delete(id: ID): Boolean {
        return store.remove(id) != null
    }

    override fun count(): Int = store.size
}

// 사용 예
data class User(val id: Long, val name: String)
data class Product(val sku: String, val name: String, val price: Int)

// User 리포지토리
val userRepo = InMemoryRepository<User, Long> { it.id }
userRepo.save(User(1L, "Alice"))
userRepo.save(User(2L, "Bob"))
println(userRepo.findById(1L))   // User(id=1, name=Alice)
println(userRepo.count())        // 2

// Product 리포지토리 (ID가 String)
val productRepo = InMemoryRepository<Product, String> { it.sku }
productRepo.save(Product("APPLE-001", "사과", 1000))
productRepo.save(Product("BANANA-001", "바나나", 500))
println(productRepo.findAll())   // [Product(sku=APPLE-001, ...), Product(sku=BANANA-001, ...)]
```

---

## 흔한 실수들

```kotlin
// ❌ 실수 1: 타입 소거 때문에 런타임 타입 체크 실패
val list: List<String> = listOf("a", "b")
// if (list is List<String>)  // ⚠️ 경고 — 런타임에 List<String> 확인 불가
if (list is List<*>)  // ✅ 타입 인자 없이 List인지만 확인

// ❌ 실수 2: 무공변 타입을 공변처럼 사용
fun sumNumbers(list: List<Number>) { /* ... */ }
val ints: List<Int> = listOf(1, 2, 3)
// sumNumbers(ints)  // ❌ 불변이라 안 됨
// ← 실제로 List는 out E로 선언되어 있어서 이건 되긴 하지만,
//   MutableList는 안 됨:
fun addNumber(list: MutableList<Number>) { list.add(3.14) }
val mutableInts: MutableList<Int> = mutableListOf(1, 2, 3)
// addNumber(mutableInts)  // ❌ 안전하지 않아서 컴파일 에러

// ❌ 실수 3: reified 없이 타입 체크
// 이 코드는 경고 또는 에러가 남
fun <T> checkType(value: Any): Boolean {
    // return value is T  // ❌ 런타임에 T 정보 없음
    return false
}
// ✅ inline + reified 사용
inline fun <reified T> checkType(value: Any): Boolean = value is T
```

---

## 전체 정리

| 개념 | 설명 | 예시 |
|------|------|------|
| `<T>` | 타입 파라미터 | `class Box<T>` |
| `<T : Number>` | 타입 제약 | `T는 Number의 하위 타입` |
| 불변 (기본) | 타입 계층 없음 | `Box<Int> ≠ Box<Number>` |
| `out T` (공변) | 생산자, 반환만 | `List<Int> ≤ List<Number>` |
| `in T` (반공변) | 소비자, 입력만 | `Comparator<Number> ≤ Comparator<Int>` |
| `reified` | 런타임 타입 정보 유지 | `inline fun <reified T>` |
| `typealias` | 타입에 별명 붙이기 | `typealias UserId = Long` |
| `List<*>` | 타입 모를 때 | `fun print(list: List<*>)` |
