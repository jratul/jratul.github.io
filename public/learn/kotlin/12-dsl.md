---
title: "DSL 구축"
order: 12
---

## DSL이란 무엇인가?

**DSL(Domain Specific Language)** — 특정 도메인(분야)에 특화된 언어입니다.

예를 들어, SQL은 데이터베이스 쿼리에 특화된 언어입니다. HTML은 웹 문서 구조를 표현하는 언어입니다. 이런 것들이 DSL입니다.

**내부 DSL(Internal DSL)** 은 일반 프로그래밍 언어(여기서는 Kotlin) 안에서 특정 도메인을 표현하는 코드 스타일입니다. 외부 파싱 도구 없이 언어 기능만으로 DSL처럼 보이는 코드를 작성합니다.

여러분이 이미 본 Kotlin DSL 예시들:

```kotlin
// Gradle 빌드 스크립트
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    testImplementation("org.junit.jupiter:junit-jupiter")
}

// Ktor HTTP 라우팅
routing {
    get("/users") {
        call.respond(users)
    }
    post("/users") {
        val user = call.receive<User>()
        call.respond(HttpStatusCode.Created, user)
    }
}

// Kotlin HTML 빌더
html {
    body {
        h1 { +"안녕하세요" }
        p { +"Kotlin DSL로 만든 HTML입니다" }
    }
}
```

이런 코드가 어떻게 만들어지는지 단계적으로 알아봅니다.

---

## 람다 리시버 — DSL의 핵심

DSL을 만들 수 있는 핵심 기능은 **람다 리시버(Lambda with Receiver)** 입니다.

### 일반 람다 vs 람다 리시버

```kotlin
// 일반 람다: 매개변수를 it으로 접근
val greet: (String) -> Unit = { name ->
    println("안녕하세요, $name!")  // name을 매개변수로 받음
}
greet("Alice")

// 람다 리시버: this가 특정 타입이 됨
val greetWithReceiver: String.() -> Unit = {
    println("안녕하세요, $this!")  // this가 String이 됨
}
"Alice".greetWithReceiver()  // "Alice"에서 호출
```

**비유:** 일반 람다는 "나에게 데이터를 줘서 처리해줘"이고, 람다 리시버는 "내가 그 객체 안에 들어가서 처리할게"입니다.

### 함수 파라미터로 활용

```kotlin
// action: StringBuilder.() -> Unit
// = "StringBuilder 내부에서 실행되는 람다"
fun buildString(action: StringBuilder.() -> Unit): String {
    val sb = StringBuilder()
    sb.action()  // sb가 this가 되어 action 실행
    return sb.toString()
}

val result = buildString {
    // 이 블록 안에서 this = StringBuilder
    append("안녕")    // this.append("안녕") 과 동일
    append(", ")
    append("세상!")
    // this.append("세상!") 이지만 this.를 생략 가능
}
println(result)  // "안녕, 세상!"
```

이것이 표준 라이브러리의 `buildString`, `apply`, `with`가 동작하는 방식입니다.

---

## apply, with, run과의 관계

스코프 함수들도 람다 리시버를 활용합니다. 이미 쓰고 있는 DSL입니다!

```kotlin
// apply의 실제 구현
inline fun <T> T.apply(block: T.() -> Unit): T {
    block()  // this.block() — this가 T가 됨
    return this
}

// apply 사용
val user = User().apply {
    name = "Alice"    // this.name = "Alice"
    email = "alice@test.com"
    active = true
}

// with의 실제 구현
inline fun <T, R> with(receiver: T, block: T.() -> R): R {
    return receiver.block()
}

// with 사용
val description = with(user) {
    // 여러 프로퍼티에 this. 없이 접근
    "사용자: $name, 이메일: $email"
}

// buildList의 실제 구현
inline fun <T> buildList(builderAction: MutableList<T>.() -> Unit): List<T> {
    val list = mutableListOf<T>()
    list.builderAction()  // MutableList가 this가 됨
    return list
}

val numbers = buildList {
    add(1)
    add(2)
    addAll(listOf(3, 4, 5))
}
```

---

## 타입 안전 빌더 — HTML DSL 직접 만들기

이 예제를 통해 DSL이 어떻게 만들어지는지 단계적으로 이해합니다.

### 1단계: 태그 기본 클래스

```kotlin
// DSL 마커 어노테이션 — 중첩 스코프 오용 방지 (나중에 설명)
@DslMarker
annotation class HtmlDsl

// 모든 HTML 태그의 공통 기반
@HtmlDsl
abstract class HtmlTag(val tagName: String) {
    // 자식 태그 목록
    val children = mutableListOf<HtmlTag>()
    // 속성 목록
    val attributes = mutableMapOf<String, String>()

    // +"텍스트" 문법을 위한 연산자 오버로딩
    operator fun String.unaryPlus() {
        children.add(TextNode(this))
    }

    // 속성 설정
    fun attr(key: String, value: String) {
        attributes[key] = value
    }

    // HTML 렌더링
    open fun render(indent: Int = 0): String {
        val pad = "  ".repeat(indent)
        val attrStr = if (attributes.isEmpty()) ""
                      else " " + attributes.entries.joinToString(" ") { (k, v) -> """$k="$v"""" }
        val open = "$pad<$tagName$attrStr>"
        val close = "$pad</$tagName>"

        return if (children.isEmpty()) {
            "$open$close"
        } else {
            val inner = children.joinToString("\n") { it.render(indent + 1) }
            "$open\n$inner\n$close"
        }
    }
}

// 텍스트 노드 (태그가 아닌 순수 텍스트)
class TextNode(val text: String) : HtmlTag("") {
    override fun render(indent: Int) = "  ".repeat(indent) + text
}
```

### 2단계: 구체적인 태그 클래스

```kotlin
class Html : HtmlTag("html") {
    // body 태그 생성 + 람다 리시버로 초기화
    fun body(init: Body.() -> Unit): Body {
        val body = Body()
        body.init()          // 람다 안에서 this = Body
        children.add(body)
        return body
    }

    fun head(init: Head.() -> Unit): Head {
        val head = Head()
        head.init()
        children.add(head)
        return head
    }
}

class Head : HtmlTag("head") {
    fun title(init: Title.() -> Unit) = addChild(Title(), init)
}

class Title : HtmlTag("title")

class Body : HtmlTag("body") {
    fun h1(init: H1.() -> Unit) = addChild(H1(), init)
    fun h2(init: H2.() -> Unit) = addChild(H2(), init)
    fun p(init: P.() -> Unit) = addChild(P(), init)
    fun div(init: Div.() -> Unit) = addChild(Div(), init)
    fun ul(init: Ul.() -> Unit) = addChild(Ul(), init)
}

class H1 : HtmlTag("h1")
class H2 : HtmlTag("h2")
class P : HtmlTag("p")

class Div : HtmlTag("div") {
    fun p(init: P.() -> Unit) = addChild(P(), init)
    fun div(init: Div.() -> Unit) = addChild(Div(), init)
    fun span(init: Span.() -> Unit) = addChild(Span(), init)
}

class Span : HtmlTag("span")

class Ul : HtmlTag("ul") {
    fun li(init: Li.() -> Unit) = addChild(Li(), init)
}

class Li : HtmlTag("li")

// 공통 헬퍼 함수
private fun <T : HtmlTag> HtmlTag.addChild(tag: T, init: T.() -> Unit): T {
    tag.init()
    children.add(tag)
    return tag
}
```

### 3단계: 진입점 함수

```kotlin
// 최상위 진입점
fun html(init: Html.() -> Unit): Html {
    val html = Html()
    html.init()  // 람다 안에서 this = Html
    return html
}

// 사용 예시
val page = html {
    head {
        title { +"Kotlin DSL 예제" }
    }
    body {
        h1 { +"환영합니다" }
        p {
            +"Kotlin DSL로 만든 HTML입니다."
        }
        div {
            attr("class", "content")  // 속성 설정
            attr("id", "main")
            h2 { +"목록" }
            ul {
                li { +"항목 1" }
                li { +"항목 2" }
                li { +"항목 3" }
            }
        }
    }
}

println(page.render())
```

출력:
```html
<html>
  <head>
    <title>Kotlin DSL 예제</title>
  </head>
  <body>
    <h1>환영합니다</h1>
    <p>Kotlin DSL로 만든 HTML입니다.</p>
    <div class="content" id="main">
      <h2>목록</h2>
      <ul>
        <li>항목 1</li>
        <li>항목 2</li>
        <li>항목 3</li>
      </ul>
    </div>
  </body>
</html>
```

---

## @DslMarker — 스코프 오용 방지

중첩된 DSL 블록에서 바깥 스코프의 함수가 실수로 호출되는 것을 방지합니다.

```kotlin
// @DslMarker 없으면 이런 실수가 가능
html {
    body {
        h1 {
            body { ... }  // h1 안에서 body를 또 만드는 실수!
            html { ... }  // h1 안에서 html을 또 만드는 실수!
        }
    }
}

// @DslMarker 있으면
@DslMarker
annotation class HtmlDsl

// 모든 태그 클래스에 @HtmlDsl이 붙어 있으면
// 중첩된 람다에서 바깥 수신자의 함수를 직접 호출할 수 없음
html {
    body {
        h1 {
            // body { ... }  // ❌ 컴파일 에러!
            // html { ... }  // ❌ 컴파일 에러!
            +"제목"          // ✅ TextNode 추가만 가능
        }
    }
}
```

---

## 실전 예제: SQL 쿼리 빌더 DSL

실무에서 유용한 타입 안전 쿼리 빌더입니다.

```kotlin
// 쿼리 빌더 클래스
class QueryBuilder {
    private var tableName: String = ""
    private val selectedColumns = mutableListOf<String>()
    private val conditions = mutableListOf<String>()
    private var orderByColumn: String? = null
    private var limitCount: Int? = null
    private var offsetCount: Int? = null

    // 각 절을 설정하는 함수들
    fun from(table: String) { tableName = table }

    fun select(vararg columns: String) {
        selectedColumns.addAll(columns)
    }

    fun where(condition: String) {
        conditions.add(condition)
    }

    // 안전한 파라미터 바인딩
    fun whereEquals(column: String, value: Any?) {
        val formattedValue = when (value) {
            null -> "IS NULL"
            is String -> "= '$value'"
            is Boolean -> "= $value"
            else -> "= $value"
        }
        conditions.add("$column $formattedValue")
    }

    fun orderBy(column: String, direction: String = "ASC") {
        orderByColumn = "$column $direction"
    }

    fun limit(count: Int) { limitCount = count }

    fun offset(count: Int) { offsetCount = count }

    fun build(): String {
        require(tableName.isNotBlank()) { "from() 절이 필요합니다" }

        val cols = if (selectedColumns.isEmpty()) "*"
                   else selectedColumns.joinToString(", ")

        var sql = "SELECT $cols FROM $tableName"

        if (conditions.isNotEmpty()) {
            sql += " WHERE " + conditions.joinToString(" AND ")
        }

        orderByColumn?.let { sql += " ORDER BY $it" }
        limitCount?.let { sql += " LIMIT $it" }
        offsetCount?.let { sql += " OFFSET $it" }

        return sql
    }
}

// 진입점 함수
fun query(init: QueryBuilder.() -> Unit): String {
    return QueryBuilder().apply(init).build()
}

// 사용 예시
fun main() {
    // 간단한 쿼리
    val simpleQuery = query {
        from("users")
        select("id", "name", "email")
        whereEquals("active", true)
        orderBy("name")
        limit(10)
    }
    println(simpleQuery)
    // SELECT id, name, email FROM users WHERE active = true ORDER BY name ASC LIMIT 10

    // 복잡한 쿼리
    val complexQuery = query {
        from("orders")
        select("id", "user_id", "total_amount", "created_at")
        whereEquals("status", "COMPLETED")
        where("total_amount >= 50000")
        where("created_at >= '2026-01-01'")
        orderBy("created_at", "DESC")
        limit(20)
        offset(40)  // 3번째 페이지
    }
    println(complexQuery)
    // SELECT id, user_id, total_amount, created_at FROM orders
    // WHERE status = 'COMPLETED' AND total_amount >= 50000 AND created_at >= '2026-01-01'
    // ORDER BY created_at DESC LIMIT 20 OFFSET 40
}
```

---

## 실전 예제: 서버 설정 DSL

중첩된 설정 객체를 DSL로 표현합니다.

```kotlin
// 설정 데이터 클래스들
data class DatabaseConfig(
    val url: String,
    val username: String,
    val password: String,
    val maxPoolSize: Int,
    val connectionTimeout: Long
)

data class CacheConfig(
    val host: String,
    val port: Int,
    val ttlSeconds: Long
)

data class ServerConfig(
    val host: String,
    val port: Int,
    val ssl: Boolean,
    val requestTimeout: Long,
    val database: DatabaseConfig,
    val cache: CacheConfig?
)

// 빌더 클래스들
class ServerConfigBuilder {
    var host: String = "localhost"
    var port: Int = 8080
    var ssl: Boolean = false
    var requestTimeout: Long = 30_000L  // 30초

    private var dbConfig: DatabaseConfig? = null
    private var cacheConfig: CacheConfig? = null

    fun database(init: DatabaseConfigBuilder.() -> Unit) {
        dbConfig = DatabaseConfigBuilder().apply(init).build()
    }

    fun cache(init: CacheConfigBuilder.() -> Unit) {
        cacheConfig = CacheConfigBuilder().apply(init).build()
    }

    fun build(): ServerConfig {
        return ServerConfig(
            host = host,
            port = port,
            ssl = ssl,
            requestTimeout = requestTimeout,
            database = dbConfig ?: throw IllegalStateException("database 설정이 필요합니다"),
            cache = cacheConfig
        )
    }
}

class DatabaseConfigBuilder {
    var url: String = ""
    var username: String = ""
    var password: String = ""
    var maxPoolSize: Int = 10
    var connectionTimeout: Long = 5_000L  // 5초

    fun build() = DatabaseConfig(url, username, password, maxPoolSize, connectionTimeout)
}

class CacheConfigBuilder {
    var host: String = "localhost"
    var port: Int = 6379  // Redis 기본 포트
    var ttlSeconds: Long = 3600L  // 1시간

    fun build() = CacheConfig(host, port, ttlSeconds)
}

// 진입점
fun server(init: ServerConfigBuilder.() -> Unit): ServerConfig {
    return ServerConfigBuilder().apply(init).build()
}

// 사용
val config = server {
    host = "api.example.com"
    port = 443
    ssl = true
    requestTimeout = 60_000L  // 1분

    database {
        url = "jdbc:postgresql://db.example.com:5432/production"
        username = "appuser"
        password = System.getenv("DB_PASSWORD") ?: ""
        maxPoolSize = 20
        connectionTimeout = 10_000L
    }

    cache {
        host = "cache.example.com"
        port = 6379
        ttlSeconds = 7200L  // 2시간
    }
}

println(config)
```

---

## 실전 예제: 테스트 픽스처 DSL

테스트 데이터를 편리하게 만드는 DSL입니다.

```kotlin
// 도메인 클래스
data class User(
    val id: Long,
    val name: String,
    val email: String,
    val role: Role,
    val active: Boolean
)

enum class Role { USER, ADMIN, MODERATOR }

data class Post(
    val id: Long,
    val title: String,
    val content: String,
    val author: User,
    val published: Boolean
)

// 픽스처 빌더들
class UserFixture {
    var id: Long = 1L
    var name: String = "Alice"
    var email: String = "alice@test.com"
    var role: Role = Role.USER
    var active: Boolean = true

    fun build() = User(id, name, email, role, active)
}

class PostFixture {
    var id: Long = 1L
    var title: String = "테스트 포스트"
    var content: String = "테스트 내용입니다."
    var published: Boolean = true
    private var author: User = user()  // 기본 사용자

    fun author(init: UserFixture.() -> Unit) {
        author = UserFixture().apply(init).build()
    }

    fun build() = Post(id, title, content, author, published)
}

// 진입점 함수들
fun user(init: UserFixture.() -> Unit = {}) = UserFixture().apply(init).build()
fun post(init: PostFixture.() -> Unit = {}) = PostFixture().apply(init).build()

// 테스트에서 사용
class PostServiceTest {

    @Test
    fun `관리자는 미발행 포스트를 볼 수 있다`() {
        // DSL로 테스트 데이터 생성
        val admin = user {
            role = Role.ADMIN
            name = "관리자"
        }

        val draftPost = post {
            title = "초안 포스트"
            published = false  // 미발행
            author {
                name = "작성자"
                email = "writer@test.com"
            }
        }

        // 테스트 로직...
        assertTrue(postService.canView(admin, draftPost))
    }

    @Test
    fun `기본 사용자는 미발행 포스트를 볼 수 없다`() {
        val regularUser = user()          // 기본값 사용
        val draftPost = post { published = false }

        assertFalse(postService.canView(regularUser, draftPost))
    }
}
```

---

## 고급: 연산자 오버로딩으로 DSL 문법 만들기

```kotlin
// HTTP 라우팅 DSL 예시
class Router {
    private val routes = mutableMapOf<Pair<String, String>, Handler>()

    // "GET" / "/users" 형태로 경로 등록
    infix fun String.to(handler: Handler) {
        routes[this to ""] = handler  // 간략화된 예시
    }

    // routes[GET to "/users"] = handler
    operator fun set(key: Pair<String, String>, handler: Handler) {
        routes[key] = handler
    }

    operator fun get(method: String, path: String): Handler? {
        return routes[method to path]
    }
}

// 더 간결한 연산자 오버로딩
class Permission(val actions: MutableSet<String> = mutableSetOf()) {
    // "read" + "write" → Permission({"read", "write"})
    operator fun plus(action: String): Permission {
        return Permission((actions + action).toMutableSet())
    }

    // permission + otherPermission
    operator fun plus(other: Permission): Permission {
        return Permission((actions + other.actions).toMutableSet())
    }
}

val readOnly = Permission() + "read"
val readWrite = readOnly + "write"
val fullAccess = readWrite + "delete" + "admin"

// infix 함수로 영어처럼 읽히는 코드 작성
infix fun User.has(permission: Permission): Boolean {
    return this.permissions.containsAll(permission.actions)
}

if (user has readOnly) {
    showContent()
}
```

---

## DSL 설계 원칙

1. **진입점은 하나의 함수로** — `html { }`, `query { }` 처럼
2. **블록 안에서 this가 의미있어야 함** — 무엇 안에 있는지 명확하게
3. **@DslMarker로 스코프 오용 방지**
4. **기본값 제공으로 최소한의 코드로 사용 가능하게**
5. **타입 안전 — 잘못된 사용은 컴파일 타임에 잡기**

```kotlin
// ❌ DSL 같지 않은 코드
val config = Config()
config.setHost("localhost")
config.setPort(8080)
config.setDatabase(Database("jdbc:...", 10))

// ✅ 좋은 DSL
val config = server {
    host = "localhost"
    port = 8080
    database {
        url = "jdbc:..."
        maxPoolSize = 10
    }
}
```

DSL을 이해하면 Gradle, Spring Security, Ktor, Exposed 같은 프레임워크의 설정 코드가 어떻게 동작하는지 이해할 수 있습니다.
