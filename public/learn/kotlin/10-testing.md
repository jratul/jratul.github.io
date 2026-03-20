---
title: "테스트 (JUnit 5 + MockK)"
order: 10
---

## Kotlin 테스트 환경

Java의 Mockito 대신 Kotlin에 최적화된 **MockK**를 주로 씁니다.

```groovy
// build.gradle
testImplementation 'org.junit.jupiter:junit-jupiter:5.10.0'
testImplementation 'io.mockk:mockk:1.13.8'
testImplementation 'org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3'
```

---

## JUnit 5 + Kotlin 기본

```kotlin
class CalculatorTest {

    private val calc = Calculator()

    @Test
    fun `두 수의 합을 반환한다`() {  // 백틱으로 자연어 테스트 이름
        val result = calc.add(2, 3)
        assertEquals(5, result)
    }

    @Test
    fun `0으로 나누면 예외가 발생한다`() {
        assertThrows<ArithmeticException> {
            calc.divide(10, 0)
        }
    }

    @Test
    fun `여러 조건을 한 번에 검증한다`() {
        val user = User(1L, "Alice", "alice@test.com")
        assertAll(
            { assertEquals("Alice", user.name) },
            { assertEquals("alice@test.com", user.email) },
            { assertTrue(user.isActive) }
        )
    }
}
```

백틱(`` ` ``)으로 감싼 함수 이름은 공백과 특수문자를 포함할 수 있어 가독성이 높습니다.

---

## MockK 기본

### Mock 생성과 Stubbing

```kotlin
@ExtendWith(MockKExtension::class)
class UserServiceTest {

    @MockK
    lateinit var userRepository: UserRepository

    @InjectMockKs
    lateinit var userService: UserService

    @Test
    fun `ID로 사용자를 조회한다`() {
        // given
        val mockUser = User(1L, "Alice", "alice@test.com")
        every { userRepository.findById(1L) } returns mockUser

        // when
        val result = userService.findById(1L)

        // then
        assertEquals("Alice", result.name)
        verify { userRepository.findById(1L) }
    }

    @Test
    fun `존재하지 않는 사용자 조회 시 예외가 발생한다`() {
        every { userRepository.findById(99L) } returns null

        assertThrows<UserNotFoundException> {
            userService.findById(99L)
        }
    }
}
```

### Stubbing 패턴

```kotlin
// 값 반환
every { repo.findById(1L) } returns user

// null 반환
every { repo.findById(99L) } returns null

// 예외 던지기
every { repo.save(any()) } throws DataAccessException("DB 오류")

// 인자 무관
every { repo.findByName(any()) } returns user
every { repo.findById(any<Long>()) } returns user

// 여러 번 호출 시 다른 반환값
every { repo.findAll() } returnsMany listOf(
    listOf(user1),
    listOf(user1, user2)
)

// void 함수
every { repo.delete(any()) } just Runs

// 람다 캡처
every { repo.save(capture(userSlot)) } answers { firstArg() }
```

### 검증 (Verify)

```kotlin
// 호출 여부
verify { repo.save(user) }
verify(exactly = 2) { repo.findById(any()) }
verify(exactly = 0) { repo.delete(any()) }  // never
verify(atLeast = 1) { repo.findAll() }

// 순서 검증
verifyOrder {
    repo.findById(1L)
    repo.save(any())
}

// 호출 없음 검증
confirmVerified(repo)
```

### Slot으로 인자 캡처

```kotlin
val slot = slot<User>()

every { repo.save(capture(slot)) } answers { firstArg() }

userService.create("Alice", "alice@test.com")

assertEquals("Alice", slot.captured.name)
assertEquals("alice@test.com", slot.captured.email)
```

---

## 코루틴 테스트

`runTest`를 사용하면 `delay`를 가상으로 처리해 빠르게 실행됩니다.

```kotlin
import kotlinx.coroutines.test.*

class UserServiceTest {

    @MockK
    lateinit var userRepository: UserRepository

    @Test
    fun `suspend 함수 테스트`() = runTest {
        // given
        coEvery { userRepository.findById(1L) } returns User(1L, "Alice")

        // when
        val result = userService.findById(1L)  // suspend 함수

        // then
        assertEquals("Alice", result.name)
        coVerify { userRepository.findById(1L) }
    }

    @Test
    fun `delay가 있는 코드를 빠르게 테스트`() = runTest {
        // delay(1000)이 실제로 1초 기다리지 않음
        val result = withTimeout(5000) {
            slowOperation()  // 내부에 delay(3000) 있어도 즉시 실행
        }
        assertEquals("완료", result)
    }
}
```

`coEvery`, `coVerify`는 suspend 함수용 MockK API입니다.

### TestDispatcher

```kotlin
@Test
fun `시간 제어 테스트`() = runTest {
    val flow = flow {
        emit(1)
        delay(1000)
        emit(2)
        delay(1000)
        emit(3)
    }

    val results = mutableListOf<Int>()

    backgroundScope.launch {
        flow.collect { results.add(it) }
    }

    advanceTimeBy(1500)  // 1.5초 진행
    assertEquals(listOf(1, 2), results)

    advanceUntilIdle()   // 모든 코루틴 완료
    assertEquals(listOf(1, 2, 3), results)
}
```

---

## 파라미터화 테스트

```kotlin
@ParameterizedTest
@ValueSource(strings = ["alice@test.com", "bob@example.org"])
fun `유효한 이메일 형식 검증`(email: String) {
    assertTrue(EmailValidator.isValid(email))
}

@ParameterizedTest
@CsvSource(
    "2, 3, 5",
    "10, -5, 5",
    "0, 0, 0"
)
fun `덧셈 테스트`(a: Int, b: Int, expected: Int) {
    assertEquals(expected, calc.add(a, b))
}

@ParameterizedTest
@MethodSource("invalidInputs")
fun `유효하지 않은 입력 테스트`(input: String) {
    assertThrows<IllegalArgumentException> {
        process(input)
    }
}

companion object {
    @JvmStatic
    fun invalidInputs() = Stream.of("", "  ", "invalid!")
}
```

---

## 테스트 픽스처

```kotlin
class UserServiceTest {

    @BeforeEach
    fun setUp() {
        clearAllMocks()  // MockK 상태 초기화
    }

    // 공통 테스트 데이터
    private fun createUser(
        id: Long = 1L,
        name: String = "Alice",
        email: String = "alice@test.com"
    ) = User(id, name, email)

    @Test
    fun `이름으로 사용자 검색`() {
        val user = createUser(name = "Bob")
        every { repo.findByName("Bob") } returns listOf(user)

        val result = service.searchByName("Bob")
        assertEquals(1, result.size)
    }
}
```

---

## 좋은 테스트 원칙

```kotlin
// ✅ 테스트 이름: 상황_동작_결과
fun `이메일 없이 회원가입 시 IllegalArgumentException이 발생한다`()

// ✅ 테스트 하나에 검증은 하나 (또는 관련된 것끼리)
@Test
fun `사용자 생성 후 ID가 부여된다`() {
    val user = service.create("Alice", "alice@test.com")
    assertNotNull(user.id)  // ID 부여 여부만 검증
}

// ❌ 하나의 테스트에 너무 많은 검증
@Test
fun `사용자 테스트`() {
    val user = service.create(...)
    assertNotNull(user.id)
    assertEquals("Alice", user.name)
    assertTrue(user.isActive)
    verify { emailService.sendWelcome(any()) }
    // 실패 시 어떤 조건이 문제인지 파악 어려움
}
```
