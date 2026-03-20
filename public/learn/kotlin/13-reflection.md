---
title: "리플렉션"
order: 13
---

## Kotlin 리플렉션

런타임에 클래스, 함수, 프로퍼티 정보를 다루는 API입니다. Java 리플렉션(`java.lang.reflect`)보다 Kotlin 언어 모델에 맞게 설계됐습니다.

```groovy
// build.gradle — kotlin-reflect 의존성 추가
implementation "org.jetbrains.kotlin:kotlin-reflect"
```

---

## KClass

`Class<T>`의 Kotlin 버전입니다.

```kotlin
// KClass 얻기
val kClass: KClass<String> = String::class
val kClass: KClass<out Any> = "hello"::class  // 인스턴스로부터

// 비교
String::class.java          // java.lang.Class<String>
String::class               // kotlin.reflect.KClass<String>

// 기본 정보
kClass.simpleName           // "String"
kClass.qualifiedName        // "kotlin.String"
kClass.isData               // false
kClass.isSealed             // false
kClass.isAbstract           // false
kClass.objectInstance       // object 클래스면 인스턴스 반환

// 인스턴스 생성
data class Point(val x: Int, val y: Int)

val kClass = Point::class
val instance = kClass.primaryConstructor!!.call(1, 2)  // Point(x=1, y=2)
```

---

## 함수 참조 (::)

함수를 값으로 다룹니다.

```kotlin
fun double(x: Int) = x * 2

// 함수 참조
val fn: (Int) -> Int = ::double
println(fn(5))  // 10

// 컬렉션 함수에 전달
listOf(1, 2, 3).map(::double)  // [2, 4, 6]

// 멤버 함수 참조
data class User(val name: String, val age: Int)

val getName: (User) -> String = User::name.getter  // 프로퍼티 getter
val users = listOf(User("Alice", 30), User("Bob", 25))

users.map(User::name)        // ["Alice", "Bob"]
users.sortedBy(User::age)    // 나이 순 정렬
users.filter { it.age > 20 } // 람다와 혼용

// 생성자 참조
val createUser: (String, Int) -> User = ::User
val newUser = createUser("Charlie", 35)
```

---

## KFunction

```kotlin
fun greet(name: String, greeting: String = "Hello"): String {
    return "$greeting, $name!"
}

val fn: KFunction<String> = ::greet

// 메타정보
println(fn.name)          // "greet"
println(fn.returnType)    // kotlin.String
fn.parameters.forEach {
    println("${it.name}: ${it.type} (optional=${it.isOptional})")
}
// name: kotlin.String (optional=false)
// greeting: kotlin.String (optional=true)

// 호출
fn.call("Alice", "Hi")           // "Hi, Alice!"

// 이름 있는 인자로 호출 (기본값 활용)
fn.callBy(mapOf(
    fn.parameters[0] to "Alice"  // greeting은 기본값 사용
))  // "Hello, Alice!"
```

---

## KProperty

프로퍼티를 런타임에 다룹니다.

```kotlin
data class User(val name: String, var age: Int)

val user = User("Alice", 30)

// 프로퍼티 참조
val nameProp: KProperty1<User, String> = User::name
val ageProp: KMutableProperty1<User, Int> = User::age

// 값 읽기
println(nameProp.get(user))   // "Alice"
println(ageProp.get(user))    // 30

// 값 쓰기 (var인 경우)
ageProp.set(user, 31)
println(user.age)  // 31

// 클래스의 모든 프로퍼티 탐색
User::class.memberProperties.forEach { prop ->
    println("${prop.name} = ${prop.get(user)}")
}
// name = Alice
// age = 31
```

---

## 실전 예제: 간단한 직렬화

```kotlin
fun Any.toMap(): Map<String, Any?> {
    return this::class.memberProperties.associate { prop ->
        prop.name to prop.getter.call(this)
    }
}

data class User(val id: Long, val name: String, val email: String)

val user = User(1L, "Alice", "alice@test.com")
println(user.toMap())
// {id=1, name=Alice, email=alice@test.com}
```

---

## 실전 예제: 어노테이션 + 리플렉션

```kotlin
@Target(AnnotationTarget.PROPERTY)
@Retention(AnnotationRetention.RUNTIME)
annotation class Column(val name: String = "", val nullable: Boolean = true)

@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class Table(val name: String)

@Table("users")
data class User(
    @Column("user_id", nullable = false) val id: Long,
    @Column("user_name", nullable = false) val name: String,
    @Column val email: String?
)

fun generateInsertSql(obj: Any): String {
    val kClass = obj::class
    val tableName = kClass.findAnnotation<Table>()?.name ?: kClass.simpleName!!

    val columns = kClass.memberProperties.mapNotNull { prop ->
        val col = prop.findAnnotation<Column>() ?: return@mapNotNull null
        val colName = col.name.ifBlank { prop.name }
        val value = prop.getter.call(obj)
        colName to value
    }

    val cols = columns.joinToString(", ") { it.first }
    val vals = columns.joinToString(", ") { "'${it.second}'" }

    return "INSERT INTO $tableName ($cols) VALUES ($vals)"
}

val user = User(1L, "Alice", "alice@test.com")
println(generateInsertSql(user))
// INSERT INTO users (user_id, user_name, email) VALUES ('1', 'Alice', 'alice@test.com')
```

JPA, Jackson, Spring이 이 방식으로 동작합니다.

---

## 실전 예제: 제네릭 매퍼

```kotlin
// Map을 data class로 변환
inline fun <reified T : Any> Map<String, Any?>.toObject(): T {
    val kClass = T::class
    val constructor = kClass.primaryConstructor
        ?: error("${kClass.simpleName}에 주 생성자가 없습니다")

    val args = constructor.parameters.associateWith { param ->
        this[param.name]
    }

    return constructor.callBy(args)
}

data class Config(val host: String, val port: Int, val debug: Boolean)

val map = mapOf("host" to "localhost", "port" to 8080, "debug" to true)
val config: Config = map.toObject<Config>()
println(config)  // Config(host=localhost, port=8080, debug=true)
```

---

## 리플렉션의 한계와 주의사항

```kotlin
// 1. 성능 — 리플렉션은 일반 호출보다 느림
//    반복 호출 시 KFunction/KProperty를 캐시해서 사용

// 2. 타입 안전성 — 런타임 오류 가능성
val prop = User::class.memberProperties.find { it.name == "nonExistent" }
prop?.getter?.call(user)  // null이므로 안전하지만, get()은 예외 가능

// 3. private 멤버 접근
val prop = User::class.memberProperties.find { it.name == "secret" }!!
prop.isAccessible = true  // private 접근 허용
println(prop.getter.call(user))

// 4. reified 없이는 타입 소거
fun <T : Any> create(kClass: KClass<T>): T {
    return kClass.primaryConstructor!!.call()
}
// vs
inline fun <reified T : Any> create(): T {
    return T::class.primaryConstructor!!.call()
}
```

---

## sealed class와 리플렉션

```kotlin
sealed class Result<out T>
data class Success<T>(val data: T) : Result<T>()
data class Failure(val error: String) : Result<Nothing>()

// sealed class의 모든 서브클래스 탐색
val subclasses = Result::class.sealedSubclasses
subclasses.forEach { println(it.simpleName) }
// Success
// Failure

// when과 결합해 모든 케이스를 동적으로 처리
fun <T> describe(result: Result<T>): String {
    return result::class.simpleName ?: "Unknown"
}
```
