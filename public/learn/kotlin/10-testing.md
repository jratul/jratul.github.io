---
title: "테스트 (JUnit 5 + MockK)"
order: 10
---

## 테스트가 왜 중요한가?

프로그램이 복잡해질수록, 코드를 수정하면 다른 부분이 망가지는 경우가 많습니다. 테스트는 이런 회귀 버그(regression bug)를 방지하는 안전망입니다.

좋은 테스트는:
- 코드가 의도대로 동작하는지 검증
- 리팩토링 시 자신감 부여
- 코드의 사용 방법을 문서화
- 버그를 조기에 발견

---

## Kotlin 테스트 환경 설정

Java에서는 주로 Mockito를 씁니다. Kotlin에서는 Kotlin 문법에 최적화된 **MockK**를 사용하면 훨씬 편합니다.

```groovy
// build.gradle
dependencies {
    // JUnit 5
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.0'

    // MockK — Kotlin 전용 모킹 라이브러리
    testImplementation 'io.mockk:mockk:1.13.8'

    // 코루틴 테스트
    testImplementation 'org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3'

    // 테스트 런타임
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}

test {
    useJUnitPlatform()  // JUnit 5 활성화
}
```

---

## JUnit 5 + Kotlin 기본

### 첫 테스트 작성

테스트는 `Calculator` 클래스가 있다고 가정합니다.

```kotlin
// 테스트 대상 클래스
class Calculator {
    fun add(a: Int, b: Int): Int = a + b
    fun subtract(a: Int, b: Int): Int = a - b
    fun multiply(a: Int, b: Int): Int = a * b
    fun divide(a: Int, b: Int): Int {
        if (b == 0) throw ArithmeticException("0으로 나눌 수 없습니다")
        return a / b
    }
}
```

```kotlin
import org.junit.jupiter.api.*
import org.junit.jupiter.api.Assertions.*

class CalculatorTest {

    // 각 테스트마다 새 인스턴스 생성 (테스트 간 독립성 보장)
    private val calc = Calculator()

    @Test
    fun `두 수의 합을 반환한다`() {  // 백틱: 자연어로 테스트 이름 작성 가능
        // given: 준비
        val a = 2
        val b = 3

        // when: 실행
        val result = calc.add(a, b)

        // then: 검증
        assertEquals(5, result)  // 예상값, 실제값 순서
    }

    @Test
    fun `음수끼리 더하면 음수를 반환한다`() {
        assertEquals(-5, calc.add(-2, -3))
    }

    @Test
    fun `0으로 나누면 ArithmeticException이 발생한다`() {
        // 예외 발생을 검증
        val exception = assertThrows<ArithmeticException> {
            calc.divide(10, 0)
        }
        assertEquals("0으로 나눌 수 없습니다", exception.message)
    }

    @Test
    fun `여러 조건을 한 번에 검증한다`() {
        data class User(val id: Long, val name: String, val email: String, val active: Boolean)
        val user = User(1L, "Alice", "alice@test.com", true)

        // assertAll: 모든 조건을 한 번에 실행, 하나가 실패해도 나머지 계속 확인
        assertAll(
            { assertEquals("Alice", user.name) },
            { assertEquals("alice@test.com", user.email) },
            { assertTrue(user.active) },
            { assertTrue(user.id > 0) }
        )
        // assertAll 없이 쓰면 첫 번째 실패에서 멈춤
    }
}
```

### 테스트 생명주기

```kotlin
class UserServiceTest {

    companion object {
        @JvmStatic
        @BeforeAll
        fun setUpClass() {
            // 이 클래스의 모든 테스트 전에 한 번만 실행
            // 비용이 큰 설정 (DB 연결 등)
            println("테스트 클래스 시작")
        }

        @JvmStatic
        @AfterAll
        fun tearDownClass() {
            // 이 클래스의 모든 테스트 후에 한 번만 실행
            println("테스트 클래스 종료")
        }
    }

    @BeforeEach
    fun setUp() {
        // 각 테스트 전에 실행
        // MockK 상태 초기화, 테스트 데이터 설정
        println("테스트 시작")
    }

    @AfterEach
    fun tearDown() {
        // 각 테스트 후에 실행
        // 리소스 정리
        println("테스트 종료")
    }

    @Test
    fun `테스트 이름`() {
        // 실제 테스트 로직
    }

    @Test
    @Disabled("아직 구현 안 됨")  // 테스트 건너뛰기
    fun `미완성 테스트`() { }

    @Test
    @DisplayName("사용자 ID로 조회 시 사용자를 반환한다")  // 테스트 보고서에 표시될 이름
    fun testFindById() { }
}
```

---

## MockK 기본 — 의존성 흉내내기

**Mock이란?** 테스트하려는 클래스가 의존하는 다른 클래스를 가짜로 대체하는 것입니다.

예를 들어 `UserService`가 `UserRepository`(DB)에 의존한다면, 테스트에서 DB를 실제로 연결하지 않고 가짜 `UserRepository`를 사용합니다.

```kotlin
// 테스트 대상
class UserService(private val userRepository: UserRepository) {
    fun findById(id: Long): User {
        return userRepository.findById(id)
            ?: throw UserNotFoundException("사용자를 찾을 수 없습니다: $id")
    }

    fun create(name: String, email: String): User {
        if (userRepository.existsByEmail(email)) {
            throw DuplicateEmailException("이미 존재하는 이메일: $email")
        }
        val user = User(id = 0, name = name, email = email)
        return userRepository.save(user)
    }
}
```

### MockK 어노테이션 방식

```kotlin
import io.mockk.*
import io.mockk.impl.annotations.*
import org.junit.jupiter.api.*
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)  // MockK JUnit 5 확장
class UserServiceTest {

    @MockK  // UserRepository의 Mock 생성
    lateinit var userRepository: UserRepository

    @InjectMockKs  // UserService에 Mock 주입
    lateinit var userService: UserService

    @BeforeEach
    fun setUp() {
        clearAllMocks()  // 각 테스트 전에 Mock 상태 초기화
    }

    @Test
    fun `ID로 사용자를 조회하면 사용자를 반환한다`() {
        // given: Mock 동작 설정
        val mockUser = User(1L, "Alice", "alice@test.com")
        every { userRepository.findById(1L) } returns mockUser  // 1L 전달 시 mockUser 반환

        // when: 실제 호출
        val result = userService.findById(1L)

        // then: 결과 검증
        assertEquals("Alice", result.name)
        assertEquals("alice@test.com", result.email)

        // Mock이 실제로 호출됐는지 확인
        verify { userRepository.findById(1L) }  // 정확히 1L로 호출됐어야 함
    }

    @Test
    fun `존재하지 않는 ID로 조회하면 UserNotFoundException이 발생한다`() {
        // given
        every { userRepository.findById(99L) } returns null  // null 반환

        // when & then
        assertThrows<UserNotFoundException> {
            userService.findById(99L)
        }
    }

    @Test
    fun `이미 존재하는 이메일로 가입하면 DuplicateEmailException이 발생한다`() {
        // given
        every { userRepository.existsByEmail("alice@test.com") } returns true  // 이미 존재

        // when & then
        assertThrows<DuplicateEmailException> {
            userService.create("Bob", "alice@test.com")
        }

        // 이메일 중복 시 save는 호출되면 안 됨
        verify(exactly = 0) { userRepository.save(any()) }
    }
}
```

---

## Stubbing 패턴 — 다양한 Mock 동작 설정

```kotlin
// 값 반환
every { repo.findById(1L) } returns user

// null 반환
every { repo.findById(99L) } returns null

// 예외 던지기
every { repo.save(any()) } throws DataAccessException("DB 연결 오류")

// 어떤 인자든 상관없이 (any())
every { repo.findByName(any()) } returns user
every { repo.findById(any<Long>()) } returns user

// 여러 번 호출 시 다른 반환값
every { repo.findAll() } returnsMany listOf(
    listOf(user1),           // 첫 번째 호출
    listOf(user1, user2),    // 두 번째 호출
    emptyList()              // 세 번째 이후 호출
)

// Unit을 반환하는 함수 (void)
every { repo.delete(any()) } just Runs

// 인자를 가공해서 반환 (answers)
every { repo.save(any()) } answers { firstArg() }  // 전달받은 첫 번째 인자를 그대로 반환

// 람다 캡처 — 전달된 인자를 나중에 검사
val savedUserSlot = slot<User>()
every { repo.save(capture(savedUserSlot)) } answers { firstArg() }

userService.create("Alice", "alice@test.com")

// 실제로 저장하려 한 User 객체 검사
assertEquals("Alice", savedUserSlot.captured.name)
assertEquals("alice@test.com", savedUserSlot.captured.email)
```

---

## Verify — 호출 검증

```kotlin
// 단순 호출 확인
verify { repo.save(user) }

// 정확히 n번 호출됐는지
verify(exactly = 1) { repo.findById(1L) }
verify(exactly = 2) { repo.findAll() }
verify(exactly = 0) { repo.delete(any()) }  // 한 번도 호출 안 됨

// 적어도 n번
verify(atLeast = 1) { repo.findAll() }

// 최대 n번
verify(atMost = 3) { repo.findById(any()) }

// 순서 검증 — 이 순서대로 호출됐어야 함
verifyOrder {
    repo.findById(1L)       // 먼저 조회
    repo.save(any())        // 그 다음에 저장
}

// 지정한 Mock들 외에 다른 호출이 없었는지 확인
confirmVerified(repo)  // 검증되지 않은 호출이 있으면 실패
```

---

## 코루틴 테스트

### runTest — suspend 함수 테스트

```kotlin
import kotlinx.coroutines.test.*
import io.mockk.coEvery   // suspend 함수용 every
import io.mockk.coVerify  // suspend 함수용 verify

@ExtendWith(MockKExtension::class)
class UserServiceTest {

    @MockK
    lateinit var userRepository: UserRepository

    @Test
    fun `suspend 함수를 테스트한다`() = runTest {
        // given
        // coEvery: suspend 함수에 대한 Mock 설정
        coEvery { userRepository.findById(1L) } returns User(1L, "Alice")

        // when
        val result = userService.findById(1L)  // suspend 함수 호출

        // then
        assertEquals("Alice", result.name)

        // coVerify: suspend 함수 호출 검증
        coVerify { userRepository.findById(1L) }
    }

    @Test
    fun `delay가 있는 코드를 빠르게 테스트한다`() = runTest {
        // runTest 안에서 delay는 실제로 기다리지 않음
        // delay(3000)이 있어도 테스트는 즉시 완료됨

        var result: String? = null

        launch {
            delay(3000)       // 실제로 3초 기다리지 않음
            result = "완료"
        }

        advanceTimeBy(3001)   // 가상으로 3001ms 진행
        assertEquals("완료", result)
    }
}
```

### TestDispatcher — 시간 제어

```kotlin
@Test
fun `Flow 테스트`() = runTest {
    val results = mutableListOf<Int>()

    // 백그라운드에서 Flow 수집
    backgroundScope.launch {
        flow {
            emit(1)
            delay(1000)  // 1초 후
            emit(2)
            delay(1000)  // 1초 후
            emit(3)
        }.collect { results.add(it) }
    }

    // 아직 1.5초만 경과
    advanceTimeBy(1500)
    assertEquals(listOf(1, 2), results)  // 1, 2만 수집됨

    // 모든 코루틴이 완료될 때까지 진행
    advanceUntilIdle()
    assertEquals(listOf(1, 2, 3), results)  // 모두 수집됨
}

@Test
fun `timeout 테스트`() = runTest {
    // withTimeout 내부의 delay도 가상 시간으로 처리
    val result = withTimeout(5000) {
        delay(3000)  // 3초 기다리는 것처럼 동작하지만 실제로는 즉시
        "성공"
    }
    assertEquals("성공", result)
}
```

---

## 파라미터화 테스트 — 여러 케이스를 한 번에

같은 로직을 다양한 입력으로 테스트할 때 씁니다.

```kotlin
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.*

class ValidatorTest {

    @ParameterizedTest
    @ValueSource(strings = [
        "alice@test.com",
        "bob@example.org",
        "user.name+tag@domain.co.kr"
    ])
    fun `유효한 이메일 형식`(email: String) {
        assertTrue(EmailValidator.isValid(email), "실패한 이메일: $email")
    }

    @ParameterizedTest
    @ValueSource(strings = ["", " ", "not-an-email", "@no-local.com", "no-at-sign"])
    fun `유효하지 않은 이메일 형식`(email: String) {
        assertFalse(EmailValidator.isValid(email), "통과해선 안 되는 이메일: $email")
    }

    @ParameterizedTest
    @CsvSource(
        "2, 3, 5",     // a=2, b=3, expected=5
        "10, -5, 5",   // a=10, b=-5, expected=5
        "0, 0, 0",     // a=0, b=0, expected=0
        "-1, -1, -2"   // a=-1, b=-1, expected=-2
    )
    fun `덧셈 테스트`(a: Int, b: Int, expected: Int) {
        assertEquals(expected, Calculator().add(a, b))
    }

    @ParameterizedTest
    @MethodSource("passwordProvider")  // companion object의 메서드에서 데이터 제공
    fun `비밀번호 강도 검사`(password: String, expectedStrength: PasswordStrength) {
        assertEquals(expectedStrength, PasswordChecker.check(password))
    }

    companion object {
        @JvmStatic
        fun passwordProvider() = Stream.of(
            Arguments.of("abc",         PasswordStrength.WEAK),
            Arguments.of("password123", PasswordStrength.MEDIUM),
            Arguments.of("P@ssw0rd!",   PasswordStrength.STRONG)
        )
    }
}
```

---

## 테스트 픽스처 — 테스트 데이터 준비

```kotlin
class UserServiceTest {

    @BeforeEach
    fun setUp() {
        clearAllMocks()  // MockK 상태 초기화
    }

    // 테스트 데이터를 만드는 팩토리 함수
    // 기본값을 지정해두면 필요한 필드만 변경 가능
    private fun createUser(
        id: Long = 1L,
        name: String = "Alice",
        email: String = "alice@test.com",
        role: String = "USER",
        active: Boolean = true
    ) = User(id = id, name = name, email = email, role = role, active = active)

    @Test
    fun `관리자는 모든 사용자를 조회할 수 있다`() {
        val admin = createUser(role = "ADMIN")  // 역할만 변경
        val users = listOf(
            createUser(id = 1L, name = "Alice"),
            createUser(id = 2L, name = "Bob")
        )
        // ...
    }

    @Test
    fun `비활성 사용자는 로그인할 수 없다`() {
        val inactiveUser = createUser(active = false)  // active만 변경
        // ...
    }
}
```

---

## Nested 테스트 — 테스트 구조화

```kotlin
@ExtendWith(MockKExtension::class)
class UserServiceTest {

    @MockK lateinit var userRepository: UserRepository
    @InjectMockKs lateinit var userService: UserService

    @Nested
    @DisplayName("findById 메서드")
    inner class FindById {

        @Test
        fun `존재하는 ID로 조회 시 사용자를 반환한다`() {
            every { userRepository.findById(1L) } returns User(1L, "Alice")
            assertEquals("Alice", userService.findById(1L).name)
        }

        @Test
        fun `존재하지 않는 ID로 조회 시 예외가 발생한다`() {
            every { userRepository.findById(99L) } returns null
            assertThrows<UserNotFoundException> { userService.findById(99L) }
        }
    }

    @Nested
    @DisplayName("create 메서드")
    inner class Create {

        @Test
        fun `새 사용자를 생성하고 반환한다`() {
            every { userRepository.existsByEmail(any()) } returns false
            every { userRepository.save(any()) } answers { firstArg() }

            val result = userService.create("Bob", "bob@test.com")
            assertEquals("Bob", result.name)
        }

        @Test
        fun `중복 이메일로 생성 시 예외가 발생한다`() {
            every { userRepository.existsByEmail("existing@test.com") } returns true

            assertThrows<DuplicateEmailException> {
                userService.create("Bob", "existing@test.com")
            }
        }
    }
}
```

---

## 좋은 테스트 작성 원칙

### 테스트 이름: 상황\_동작\_결과

```kotlin
// ❌ 모호한 이름
fun testUser() { }
fun test1() { }
fun 유저서비스테스트() { }

// ✅ 명확한 이름 — 무엇을, 어떤 상황에서, 어떤 결과인지
fun `이메일 없이 회원가입 시 IllegalArgumentException이 발생한다`() { }
fun `비밀번호가 8자 미만이면 가입에 실패한다`() { }
fun `이미 가입된 이메일로 요청하면 DuplicateEmailException이 발생한다`() { }
```

### 테스트 하나에 검증은 하나

```kotlin
// ❌ 하나의 테스트에 너무 많은 책임
@Test
fun `사용자 테스트`() {
    val user = service.create("Alice", "alice@test.com")
    assertNotNull(user.id)
    assertEquals("Alice", user.name)
    assertTrue(user.isActive)
    verify { emailService.sendWelcome(any()) }
    // 실패 시 어떤 조건 때문에 실패했는지 파악하기 어려움
}

// ✅ 각 관심사를 별도 테스트로 분리
@Test
fun `사용자 생성 후 ID가 부여된다`() {
    val user = service.create("Alice", "alice@test.com")
    assertNotNull(user.id)
}

@Test
fun `사용자 생성 후 활성 상태이다`() {
    val user = service.create("Alice", "alice@test.com")
    assertTrue(user.isActive)
}

@Test
fun `사용자 생성 시 웰컴 이메일이 발송된다`() {
    service.create("Alice", "alice@test.com")
    verify { emailService.sendWelcome(any()) }
}
```

### given-when-then 구조 유지

```kotlin
@Test
fun `재고가 부족하면 주문에 실패한다`() {
    // given: 테스트 전제 조건 설정
    val product = Product(id = 1L, name = "사과", stock = 5)
    every { productRepository.findById(1L) } returns product

    // when: 테스트할 동작 실행
    val exception = assertThrows<InsufficientStockException> {
        orderService.order(productId = 1L, quantity = 10)  // 재고(5)보다 많이 주문
    }

    // then: 결과 검증
    assertEquals("재고가 부족합니다. 현재 재고: 5", exception.message)
    verify(exactly = 0) { orderRepository.save(any()) }  // 주문 저장 안 됨
}
```

---

## 흔한 실수

```kotlin
// ❌ 실수 1: every 설정 없이 Mock 사용
@Test
fun `설정 없는 Mock 호출`() {
    // every 없이 호출하면 MockKException 발생
    // userRepository.findById(1L)  ← 설정이 없어서 에러!
}

// ✅ relaxed Mock 사용 (모든 함수가 기본값 반환)
@MockK(relaxed = true)
lateinit var userRepository: UserRepository
// 이제 설정 없이도 null, 0, false, 빈 컬렉션 등 기본값 반환

// ❌ 실수 2: suspend 함수에 every 사용
every { repo.findById(1L) } returns user  // suspend 함수에 every 쓰면 오류

// ✅ coEvery 사용
coEvery { repo.findById(1L) } returns user

// ❌ 실수 3: 테스트 간 Mock 상태 공유
// @BeforeEach에서 clearAllMocks() 안 하면 이전 테스트의 설정이 남음

// ✅ 매 테스트 전에 초기화
@BeforeEach
fun setUp() {
    clearAllMocks()
}
```
