---
title: "리플렉션"
order: 13
---

## 리플렉션이란 무엇인가?

**리플렉션(Reflection)** 은 프로그램이 실행 중(런타임)에 자기 자신을 들여다보고 조작하는 기능입니다.

**비유:** 사람이 거울을 보는 것과 같습니다. 보통은 앞만 보며 행동하지만(일반 코드), 거울을 통해 자신의 모습을 확인하고 수정할 수 있습니다(리플렉션).

프로그래밍에서 리플렉션을 사용하면:
- 클래스의 이름, 프로퍼티, 함수 목록을 코드로 조회
- 함수 이름을 문자열로 받아서 실행
- 어노테이션 정보를 런타임에 읽기

이런 기능은 프레임워크 개발에 필수입니다. **Spring, JPA, Jackson, Gson**이 모두 리플렉션으로 동작합니다.

---

## 의존성 추가

```groovy
// build.gradle — kotlin-reflect 의존성 추가 (기본 포함이 아님!)
implementation "org.jetbrains.kotlin:kotlin-reflect"
```

---

## KClass — 클래스를 나타내는 객체

Java의 `Class<T>`에 해당하는 Kotlin 버전입니다.

```kotlin
// KClass 얻는 방법 1: 클래스 리터럴
val kClass1: KClass<String> = String::class

// KClass 얻는 방법 2: 인스턴스로부터
val text = "Hello"
val kClass2: KClass<out String> = text::class

// KClass 얻는 방법 3: Java Class로부터
val kClass3: KClass<String> = String::class.java.kotlin

// Java Class ↔ Kotlin KClass 변환
val javaClass: Class<String> = String::class.java   // KClass → java.lang.Class
val kotlinClass: KClass<String> = javaClass.kotlin  // java.lang.Class → KClass
```

### KClass로 클래스 정보 조회

```kotlin
data class User(val id: Long, val name: String, var email: String)

val kClass = User::class

// 기본 정보
println(kClass.simpleName)      // "User"
println(kClass.qualifiedName)   // "com.example.User"
println(kClass.isData)          // true (data class이므로)
println(kClass.isSealed)        // false
println(kClass.isAbstract)      // false
println(kClass.isFinal)         // true (기본적으로 final)
println(kClass.visibility)      // KVisibility.PUBLIC

// 생성자
kClass.constructors.forEach { constructor ->
    println("생성자: ${constructor.parameters.map { it.name }}")
}

// 주 생성자
val primaryConstructor = kClass.primaryConstructor
println("주 생성자 파라미터: ${primaryConstructor?.parameters?.map { it.name }}")
// [id, name, email]
```

### 인스턴스 동적 생성

```kotlin
data class Point(val x: Int, val y: Int)

// 리플렉션으로 인스턴스 생성
val kClass = Point::class
val constructor = kClass.primaryConstructor!!

// 위치 기반 인자
val p1 = constructor.call(1, 2)   // Point(x=1, y=2)
println(p1)  // Point(x=1, y=2)

// 이름 기반 인자 (기본값 활용 가능)
data class Config(val host: String, val port: Int = 8080, val ssl: Boolean = false)

val configConstructor = Config::class.primaryConstructor!!

val config = configConstructor.callBy(mapOf(
    configConstructor.parameters.first { it.name == "host" } to "localhost"
    // port, ssl은 기본값 사용
))
println(config)  // Config(host=localhost, port=8080, ssl=false)
```

---

## 함수 참조 (::) — 함수를 값으로 다루기

함수 참조는 코루틴, 컬렉션 처리에서 많이 씁니다.

```kotlin
// 최상위 함수 참조
fun double(x: Int) = x * 2

val fn: (Int) -> Int = ::double   // 함수를 변수에 저장
println(fn(5))                     // 10

// 컬렉션에 전달
val numbers = listOf(1, 2, 3, 4, 5)
val doubled = numbers.map(::double)     // [2, 4, 6, 8, 10]
val evens = numbers.filter(::isEven)    // [2, 4]

fun isEven(n: Int) = n % 2 == 0
```

### 멤버 함수/프로퍼티 참조

```kotlin
data class User(val id: Long, val name: String, val age: Int)

val users = listOf(
    User(1, "Alice", 30),
    User(2, "Bob", 25),
    User(3, "Charlie", 35)
)

// 프로퍼티 참조 — 컬렉션 함수에 전달
val names: List<String> = users.map(User::name)      // ["Alice", "Bob", "Charlie"]
val sortedByAge = users.sortedBy(User::age)           // 나이 순 정렬
val adults = users.filter { it.age >= 30 }            // 람다와 혼용

// 멤버 함수 참조
val allUpperNames = users.map(User::name).map(String::uppercase)  // 대문자로

// 참조를 변수에 저장
val getName: (User) -> String = User::name  // 프로퍼티 getter
val getAge: (User) -> Int = User::age
```

### 생성자 참조

```kotlin
// 생성자 참조 — User(name, age) 를 값으로 다루기
val createUser: (Long, String, Int) -> User = ::User

val newUser = createUser(4L, "Diana", 28)
println(newUser)  // User(id=4, name=Diana, age=28)

// 파싱 결과를 객체로 변환
val rawData = listOf(
    Triple(1L, "Alice", 30),
    Triple(2L, "Bob", 25)
)

val users = rawData.map { (id, name, age) -> User(id, name, age) }
// 또는
// val users = rawData.map { ::User.call(it.first, it.second, it.third) }
```

---

## KFunction — 함수를 런타임에 조작

```kotlin
fun greet(name: String, greeting: String = "안녕하세요"): String {
    return "$greeting, $name!"
}

val fn: KFunction<String> = ::greet

// 함수 메타정보
println(fn.name)                  // "greet"
println(fn.returnType)            // kotlin.String
println(fn.isSuspend)             // false

// 파라미터 정보
fn.parameters.forEach { param ->
    println("${param.name}: ${param.type} (선택적=${param.isOptional})")
}
// name: kotlin.String (선택적=false)
// greeting: kotlin.String (선택적=true)

// 호출 — 위치 기반
val result1 = fn.call("Alice", "반갑습니다")  // "반갑습니다, Alice!"

// 호출 — 이름 기반 (기본값 활용)
val nameParam = fn.parameters.first { it.name == "name" }
val result2 = fn.callBy(mapOf(nameParam to "Bob"))  // "안녕하세요, Bob!" (기본값 사용)
```

---

## KProperty — 프로퍼티를 런타임에 조작

```kotlin
data class User(val id: Long, val name: String, var email: String)

val user = User(1L, "Alice", "alice@test.com")

// 프로퍼티 참조 — KProperty1<수신자타입, 반환타입>
val nameProp: KProperty1<User, String> = User::name
val emailProp: KMutableProperty1<User, String> = User::email  // var이므로 KMutableProperty1

// 값 읽기
println(nameProp.get(user))    // "Alice"
println(emailProp.get(user))   // "alice@test.com"

// 값 쓰기 (var인 경우만 가능)
emailProp.set(user, "newemail@test.com")
println(user.email)  // "newemail@test.com"

// val은 쓰기 불가
// nameProp.set(user, "Bob")  // ❌ 컴파일 에러 — KProperty1은 set 없음

// 클래스의 모든 멤버 프로퍼티
User::class.memberProperties.forEach { prop ->
    println("${prop.name} = ${prop.get(user)}")
}
// id = 1
// name = Alice
// email = newemail@test.com
```

---

## 실전 예제 1: 간단한 직렬화

객체를 Map으로, Map을 객체로 변환하는 유틸리티입니다.

```kotlin
// 객체 → Map
fun Any.toMap(): Map<String, Any?> {
    return this::class.memberProperties
        .associate { prop ->
            prop.name to prop.getter.call(this)  // 프로퍼티 이름 → 값 쌍
        }
}

// Map → 객체
inline fun <reified T : Any> Map<String, Any?>.toObject(): T {
    val kClass = T::class
    val constructor = kClass.primaryConstructor
        ?: error("${kClass.simpleName}에 주 생성자가 없습니다")

    // 생성자 파라미터 이름으로 Map에서 값 찾기
    val args = constructor.parameters.associateWith { param ->
        this[param.name]
    }

    return constructor.callBy(args)
}

// 사용
data class Product(val id: Long, val name: String, val price: Int)

val product = Product(1L, "사과", 1500)

val map = product.toMap()
println(map)  // {id=1, name=사과, price=1500}

val restored: Product = map.toObject<Product>()
println(restored)   // Product(id=1, name=사과, price=1500)
println(product == restored)  // true
```

---

## 실전 예제 2: 어노테이션 + 리플렉션

어노테이션을 통해 런타임에 동작을 결정합니다. JPA, Jackson, Spring이 이 방식으로 동작합니다.

```kotlin
// 어노테이션 정의
@Target(AnnotationTarget.PROPERTY)
@Retention(AnnotationRetention.RUNTIME)  // 런타임에 읽을 수 있어야 함
annotation class Column(
    val name: String = "",        // DB 컬럼명 (비어있으면 프로퍼티 이름 사용)
    val nullable: Boolean = true  // null 허용 여부
)

@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class Table(val name: String)

// 어노테이션 적용
@Table("products")
data class Product(
    @Column("product_id", nullable = false) val id: Long,
    @Column("product_name", nullable = false) val name: String,
    @Column("unit_price") val price: Int,
    @Column val description: String?  // 컬럼명은 "description"
)

// 어노테이션을 읽어서 SQL 생성
fun generateInsertSql(obj: Any): String {
    val kClass = obj::class

    // @Table 어노테이션에서 테이블명 읽기
    val tableName = kClass.findAnnotation<Table>()?.name
        ?: kClass.simpleName!!  // 어노테이션 없으면 클래스명 사용

    // @Column 어노테이션이 있는 프로퍼티만 처리
    val columnValues = kClass.memberProperties.mapNotNull { prop ->
        val columnAnnotation = prop.findAnnotation<Column>()
            ?: return@mapNotNull null  // @Column 없는 프로퍼티 건너뜀

        val columnName = columnAnnotation.name.ifBlank { prop.name }  // 이름 결정
        val value = prop.getter.call(obj)  // 실제 값 읽기

        Pair(columnName, value)
    }

    val columns = columnValues.joinToString(", ") { it.first }
    val values = columnValues.joinToString(", ") { (_, v) ->
        when (v) {
            null -> "NULL"
            is String -> "'${v}'"
            else -> v.toString()
        }
    }

    return "INSERT INTO $tableName ($columns) VALUES ($values)"
}

fun main() {
    val product = Product(1L, "사과", 1500, "신선한 사과")
    println(generateInsertSql(product))
    // INSERT INTO products (product_id, product_name, unit_price, description)
    // VALUES (1, '사과', 1500, '신선한 사과')
}
```

---

## 실전 예제 3: 유효성 검사 프레임워크

어노테이션 기반 유효성 검사기를 만듭니다.

```kotlin
// 유효성 검사 어노테이션들
@Target(AnnotationTarget.PROPERTY)
@Retention(AnnotationRetention.RUNTIME)
annotation class NotBlank(val message: String = "빈 값은 허용되지 않습니다")

@Target(AnnotationTarget.PROPERTY)
@Retention(AnnotationRetention.RUNTIME)
annotation class MinLength(val min: Int, val message: String = "")

@Target(AnnotationTarget.PROPERTY)
@Retention(AnnotationRetention.RUNTIME)
annotation class MaxLength(val max: Int, val message: String = "")

@Target(AnnotationTarget.PROPERTY)
@Retention(AnnotationRetention.RUNTIME)
annotation class Email(val message: String = "유효한 이메일 형식이 아닙니다")

// 유효성 검사기
data class ValidationError(val field: String, val message: String)

fun validate(obj: Any): List<ValidationError> {
    val errors = mutableListOf<ValidationError>()
    val kClass = obj::class

    kClass.memberProperties.forEach { prop ->
        val value = prop.getter.call(obj)
        val fieldName = prop.name

        // @NotBlank 검사
        prop.findAnnotation<NotBlank>()?.let { annotation ->
            if (value is String && value.isBlank()) {
                errors.add(ValidationError(fieldName, annotation.message))
            }
        }

        // @MinLength 검사
        prop.findAnnotation<MinLength>()?.let { annotation ->
            if (value is String && value.length < annotation.min) {
                val msg = annotation.message.ifBlank {
                    "${fieldName}은 최소 ${annotation.min}자 이상이어야 합니다"
                }
                errors.add(ValidationError(fieldName, msg))
            }
        }

        // @MaxLength 검사
        prop.findAnnotation<MaxLength>()?.let { annotation ->
            if (value is String && value.length > annotation.max) {
                val msg = annotation.message.ifBlank {
                    "${fieldName}은 최대 ${annotation.max}자까지 허용됩니다"
                }
                errors.add(ValidationError(fieldName, msg))
            }
        }

        // @Email 검사
        prop.findAnnotation<Email>()?.let { annotation ->
            if (value is String && !value.contains("@")) {
                errors.add(ValidationError(fieldName, annotation.message))
            }
        }
    }

    return errors
}

// 사용
data class SignUpRequest(
    @NotBlank
    @MinLength(2, message = "이름은 2자 이상이어야 합니다")
    @MaxLength(50)
    val name: String,

    @NotBlank
    @Email
    val email: String,

    @NotBlank
    @MinLength(8, message = "비밀번호는 8자 이상이어야 합니다")
    val password: String
)

fun main() {
    val request = SignUpRequest(name = "A", email = "not-valid", password = "1234")
    val errors = validate(request)

    errors.forEach { error ->
        println("${error.field}: ${error.message}")
    }
    // name: 이름은 2자 이상이어야 합니다
    // email: 유효한 이메일 형식이 아닙니다
    // password: 비밀번호는 8자 이상이어야 합니다
}
```

---

## sealed class와 리플렉션

```kotlin
sealed class Shape
data class Circle(val radius: Double) : Shape()
data class Rectangle(val width: Double, val height: Double) : Shape()
data class Triangle(val base: Double, val height: Double) : Shape()

// sealed class의 모든 하위 클래스 탐색
val subclasses = Shape::class.sealedSubclasses
subclasses.forEach { println(it.simpleName) }
// Circle
// Rectangle
// Triangle

// 동적 처리 — 새 하위 클래스 추가 시 자동으로 처리
fun describeAllShapes(): List<String> {
    return Shape::class.sealedSubclasses.map { kClass ->
        val name = kClass.simpleName ?: "Unknown"
        val params = kClass.primaryConstructor?.parameters
            ?.joinToString(", ") { "${it.name}: ${it.type}" }
            ?: "파라미터 없음"
        "$name($params)"
    }
}

println(describeAllShapes())
// [Circle(radius: kotlin.Double), Rectangle(width: kotlin.Double, height: kotlin.Double), ...]
```

---

## private 멤버 접근

리플렉션을 사용하면 private 멤버에도 접근할 수 있습니다. 주로 테스트에서 씁니다.

```kotlin
class SecretBox {
    private val secret = "비밀 내용"
    private fun getSecret() = secret
}

val box = SecretBox()
val prop = SecretBox::class.memberProperties.find { it.name == "secret" }!!

// private 프로퍼티 접근
prop.isAccessible = true  // 접근 허용
println(prop.getter.call(box))  // "비밀 내용"

// 테스트에서의 활용 예
class UserServiceTest {
    @Test
    fun `내부 캐시 검증`() {
        val service = UserService()
        service.findById(1L)  // 캐시 활성화

        // 내부 캐시 상태 직접 확인 (테스트 목적)
        val cacheProp = UserService::class.memberProperties
            .find { it.name == "cache" }!!
        cacheProp.isAccessible = true

        val cache = cacheProp.getter.call(service)
        assertNotNull(cache)
    }
}
```

---

## 리플렉션의 한계와 주의사항

```kotlin
// 1. 성능 — 리플렉션은 일반 호출보다 수십~수백 배 느림
// 반복 호출이 필요하면 KFunction, KProperty를 캐싱

class UserMapper {
    // 매번 리플렉션 탐색 → 느림
    fun mapBad(user: User): Map<String, Any?> {
        return user::class.memberProperties.associate { it.name to it.getter.call(user) }
    }

    // 한 번만 탐색하고 캐싱 → 훨씬 빠름
    private val userProperties = User::class.memberProperties.toList()

    fun mapGood(user: User): Map<String, Any?> {
        return userProperties.associate { it.name to it.getter.call(user) }
    }
}

// 2. 타입 안전성 없음 — 런타임 오류 가능
val prop = User::class.memberProperties.find { it.name == "nonExistent" }
prop?.getter?.call(user)  // prop이 null이면 NPE 위험

// 3. 컴파일러 최적화 못 받음 — 인라인, 특수 최적화 불가

// 4. reified 없이는 타입 소거 문제
// 제네릭 타입을 리플렉션으로 얻으려면 reified 필요
inline fun <reified T : Any> createInstance(): T {
    return T::class.primaryConstructor!!.call()
}

// reified 없으면 KClass 직접 전달
fun <T : Any> createInstance(kClass: KClass<T>): T {
    return kClass.primaryConstructor!!.call()
}
```

---

## 언제 리플렉션을 써야 하나?

```
✅ 리플렉션이 적합한 경우:
- 프레임워크/라이브러리 개발 (Spring, JPA, Jackson 같은)
- 어노테이션 기반 처리
- 제네릭 유틸리티 (직렬화, 매핑, 유효성 검사)
- 테스트에서 내부 상태 확인

❌ 리플렉션이 부적합한 경우:
- 성능이 중요한 반복 로직
- 단순한 조건 분기 (when으로 해결 가능)
- 타입 안전성이 중요한 비즈니스 로직
```

리플렉션을 직접 쓸 일은 많지 않습니다. 하지만 Spring, JPA, Jackson이 어떻게 동작하는지 이해하면 문제가 생겼을 때 원인을 파악할 수 있습니다.
