---
title: "DSL 구축"
order: 12
---

## DSL이란

Domain Specific Language — 특정 도메인에 특화된 언어입니다. Kotlin은 언어 기능을 조합해 외부 DSL 없이도 읽기 쉬운 내부 DSL을 만들 수 있습니다.

```kotlin
// Kotlin DSL로 만든 코드들
html {
    body {
        h1 { +"제목" }
        p { +"내용" }
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.junit.jupiter:junit-jupiter")
}

routing {
    get("/users") { call.respond(users) }
    post("/users") { ... }
}
```

이런 코드가 어떻게 만들어지는지 알아봅니다.

---

## 람다 리시버 (Lambda with Receiver)

DSL의 핵심입니다. 람다 블록 안에서 `this`가 특정 타입이 됩니다.

```kotlin
// 일반 람다: it으로 접근
val greet: (String) -> String = { "Hello, $it!" }

// 람다 리시버: this가 String이 됨
val greet: String.() -> String = { "Hello, $this!" }

"Alice".greet()  // "Hello, Alice!"
```

함수 파라미터로 쓸 때:

```kotlin
fun buildString(action: StringBuilder.() -> Unit): String {
    val sb = StringBuilder()
    sb.action()  // sb가 this가 되어 action 실행
    return sb.toString()
}

val result = buildString {
    append("Hello")   // this.append("Hello")
    append(", ")
    append("World!")
}
// "Hello, World!"
```

이게 표준 라이브러리의 `buildString`이 동작하는 방식입니다.

---

## 타입 안전 빌더

HTML DSL을 직접 만들어봅니다.

```kotlin
// 태그 기반 클래스
@DslMarker
annotation class HtmlDsl

@HtmlDsl
abstract class Tag(private val name: String) {
    private val children = mutableListOf<Tag>()
    private val attributes = mutableMapOf<String, String>()

    protected fun <T : Tag> initTag(tag: T, init: T.() -> Unit): T {
        tag.init()
        children.add(tag)
        return tag
    }

    fun attr(key: String, value: String) {
        attributes[key] = value
    }

    operator fun String.unaryPlus() {  // +"텍스트"
        children.add(TextNode(this))
    }

    fun render(indent: Int = 0): String {
        val pad = "  ".repeat(indent)
        val attrStr = attributes.entries.joinToString(" ") { (k, v) -> """$k="$v"""" }
        val open = if (attrStr.isBlank()) "<$name>" else "<$name $attrStr>"
        val inner = children.joinToString("\n") { it.render(indent + 1) }
        return "$pad$open\n$inner\n$pad</$name>"
    }
}

class TextNode(private val text: String) : Tag("text") {
    override fun render(indent: Int) = "  ".repeat(indent) + text
}

class Html : Tag("html") {
    fun body(init: Body.() -> Unit) = initTag(Body(), init)
}

class Body : Tag("body") {
    fun h1(init: H1.() -> Unit) = initTag(H1(), init)
    fun p(init: P.() -> Unit)   = initTag(P(), init)
    fun div(init: Div.() -> Unit) = initTag(Div(), init)
}

class H1 : Tag("h1")
class P  : Tag("p")
class Div : Tag("div") {
    fun p(init: P.() -> Unit) = initTag(P(), init)
}

fun html(init: Html.() -> Unit): Html {
    val html = Html()
    html.init()
    return html
}

// 사용
val page = html {
    body {
        h1 { +"Kotlin DSL" }
        p  { +"람다 리시버로 만든 HTML" }
        div {
            attr("class", "content")
            p { +"중첩 가능" }
        }
    }
}
println(page.render())
```

---

## @DslMarker

중첩된 DSL 블록에서 바깥 스코프 함수가 실수로 호출되는 것을 방지합니다.

```kotlin
@DslMarker
annotation class HtmlDsl

// @HtmlDsl이 붙은 클래스끼리는 암시적 this 사용 불가
html {
    body {
        h1 {
            body { ... }  // ❌ 컴파일 에러 — h1 안에서 body 호출 방지
        }
    }
}
```

---

## 실전 예제: 쿼리 빌더 DSL

```kotlin
class QueryBuilder {
    private var table: String = ""
    private val conditions = mutableListOf<String>()
    private val columns = mutableListOf<String>()
    private var limitVal: Int? = null
    private var orderByCol: String? = null

    fun from(table: String) { this.table = table }
    fun select(vararg cols: String) { columns.addAll(cols) }
    fun where(condition: String) { conditions.add(condition) }
    fun limit(n: Int) { limitVal = n }
    fun orderBy(col: String) { orderByCol = col }

    fun build(): String {
        val cols = if (columns.isEmpty()) "*" else columns.joinToString(", ")
        var sql = "SELECT $cols FROM $table"
        if (conditions.isNotEmpty()) sql += " WHERE ${conditions.joinToString(" AND ")}"
        orderByCol?.let { sql += " ORDER BY $it" }
        limitVal?.let { sql += " LIMIT $it" }
        return sql
    }
}

fun query(init: QueryBuilder.() -> Unit): String {
    return QueryBuilder().apply(init).build()
}

val sql = query {
    from("users")
    select("id", "name", "email")
    where("age >= 18")
    where("active = true")
    orderBy("name")
    limit(20)
}
// SELECT id, name, email FROM users WHERE age >= 18 AND active = true ORDER BY name LIMIT 20
```

---

## 실전 예제: 설정 DSL

```kotlin
data class ServerConfig(
    val host: String,
    val port: Int,
    val ssl: Boolean,
    val timeout: Int,
    val database: DatabaseConfig
)

data class DatabaseConfig(
    val url: String,
    val maxPoolSize: Int
)

class ServerConfigBuilder {
    var host: String = "localhost"
    var port: Int = 8080
    var ssl: Boolean = false
    var timeout: Int = 30
    private var dbConfig: DatabaseConfig = DatabaseConfig("jdbc:h2:mem:test", 10)

    fun database(init: DatabaseConfigBuilder.() -> Unit) {
        dbConfig = DatabaseConfigBuilder().apply(init).build()
    }

    fun build() = ServerConfig(host, port, ssl, timeout, dbConfig)
}

class DatabaseConfigBuilder {
    var url: String = ""
    var maxPoolSize: Int = 10

    fun build() = DatabaseConfig(url, maxPoolSize)
}

fun server(init: ServerConfigBuilder.() -> Unit): ServerConfig {
    return ServerConfigBuilder().apply(init).build()
}

val config = server {
    host = "api.example.com"
    port = 443
    ssl = true
    timeout = 60

    database {
        url = "jdbc:postgresql://localhost/mydb"
        maxPoolSize = 20
    }
}
```

---

## 실전 예제: 테스트 픽스처 DSL

```kotlin
data class User(val id: Long, val name: String, val email: String, val role: String)

class UserFixture {
    var id: Long = 1L
    var name: String = "Alice"
    var email: String = "alice@test.com"
    var role: String = "USER"
    fun build() = User(id, name, email, role)
}

fun user(init: UserFixture.() -> Unit = {}) = UserFixture().apply(init).build()

// 테스트에서 사용
val admin = user {
    name = "Admin"
    email = "admin@test.com"
    role = "ADMIN"
}

val guest = user { role = "GUEST" }
val default = user()
```

---

## apply, with, run과의 관계

스코프 함수도 람다 리시버를 활용합니다.

```kotlin
// apply의 시그니처
inline fun <T> T.apply(block: T.() -> Unit): T {
    block()  // this.block()과 동일
    return this
}

// buildList의 시그니처
inline fun <T> buildList(builderAction: MutableList<T>.() -> Unit): List<T> {
    val list = mutableListOf<T>()
    list.builderAction()
    return list
}

val list = buildList {
    add("a")
    add("b")
    addAll(listOf("c", "d"))
}
```

DSL을 이해하면 표준 라이브러리와 프레임워크 코드가 어떻게 동작하는지 파악할 수 있습니다.
