---
title: "Android 테스트"
order: 11
---

## 테스트 종류

Android 테스트는 실행 위치에 따라 두 가지로 나뉩니다.

| | 단위 테스트 (Unit Test) | 계측 테스트 (Instrumented Test) |
|--|----------------------|-------------------------------|
| 실행 위치 | JVM (PC) | 실제 기기 또는 에뮬레이터 |
| 속도 | 빠름 | 느림 |
| 디렉토리 | `src/test/` | `src/androidTest/` |
| 대상 | ViewModel, Repository, UseCase | Activity, Fragment, Compose UI |

---

## 단위 테스트 설정

```kotlin
// build.gradle.kts
testImplementation("junit:junit:4.13.2")
testImplementation("org.mockito:mockito-core:5.11.0")
testImplementation("org.mockito.kotlin:mockito-kotlin:5.3.1")
testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
testImplementation("app.cash.turbine:turbine:1.1.0")  // Flow 테스트
testImplementation("com.google.truth:truth:1.4.2")     // Truth assertion
```

---

## ViewModel 테스트

```kotlin
class UserViewModelTest {

    // 코루틴 테스트용 디스패처 설정
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var fakeRepository: FakeUserRepository
    private lateinit var viewModel: UserViewModel

    @Before
    fun setUp() {
        fakeRepository = FakeUserRepository()
        viewModel = UserViewModel(fakeRepository)
    }

    @Test
    fun `초기 상태는 Loading이어야 한다`() {
        // assertThat (Truth 라이브러리)
        assertThat(viewModel.uiState.value).isInstanceOf(UiState.Loading::class.java)
    }

    @Test
    fun `사용자 로드 성공 시 Success 상태가 된다`() = runTest {
        // Given
        val expectedUser = User(id = 1, name = "홍길동", email = "hong@test.com")
        fakeRepository.setUser(expectedUser)

        // When
        viewModel.loadUser(1)

        // Then
        assertThat(viewModel.uiState.value).isInstanceOf(UiState.Success::class.java)
        val state = viewModel.uiState.value as UiState.Success
        assertThat(state.data.name).isEqualTo("홍길동")
    }

    @Test
    fun `사용자 로드 실패 시 Error 상태가 된다`() = runTest {
        // Given
        fakeRepository.setShouldThrowError(true)

        // When
        viewModel.loadUser(1)

        // Then
        assertThat(viewModel.uiState.value).isInstanceOf(UiState.Error::class.java)
    }

    @Test
    fun `Flow 상태 변화를 Turbine으로 테스트`() = runTest {
        viewModel.uiState.test {
            // 초기값
            assertThat(awaitItem()).isInstanceOf(UiState.Loading::class.java)

            // 로드 실행
            viewModel.loadUser(1)

            // 최종 상태
            assertThat(awaitItem()).isInstanceOf(UiState.Success::class.java)

            cancelAndConsumeRemainingEvents()
        }
    }
}

// MainDispatcherRule — viewModelScope의 Dispatchers.Main을 테스트용으로 교체
class MainDispatcherRule(
    private val dispatcher: TestCoroutineDispatcher = TestCoroutineDispatcher()
) : TestWatcher() {
    override fun starting(description: Description) {
        Dispatchers.setMain(dispatcher)
    }
    override fun finished(description: Description) {
        Dispatchers.resetMain()
    }
}
```

---

## Fake Repository 패턴

Mock 대신 Fake 구현체를 만들면 테스트가 더 명확해집니다.

```kotlin
// 테스트용 Fake Repository
class FakeUserRepository : UserRepository {

    private var user: User? = null
    private var shouldThrowError = false

    fun setUser(user: User) { this.user = user }
    fun setShouldThrowError(value: Boolean) { shouldThrowError = value }

    override suspend fun getUser(id: Int): User {
        if (shouldThrowError) throw IOException("Network error")
        return user ?: throw Exception("User not found")
    }

    override fun getUsers(): Flow<List<User>> = flow {
        if (shouldThrowError) throw IOException("Network error")
        emit(listOfNotNull(user))
    }
}
```

---

## Repository 테스트

```kotlin
class UserRepositoryTest {

    private val mockApiService = mock<ApiService>()
    private val mockUserDao = mock<UserDao>()
    private lateinit var repository: UserRepositoryImpl

    @Before
    fun setUp() {
        repository = UserRepositoryImpl(mockUserDao, mockApiService)
    }

    @Test
    fun `DB에 있으면 API를 호출하지 않는다`() = runTest {
        // Given
        val user = User(1, "홍길동", "hong@test.com")
        whenever(mockUserDao.getUserById(1)).thenReturn(user)

        // When
        val result = repository.getUser(1)

        // Then
        assertThat(result).isEqualTo(user)
        verify(mockApiService, never()).getUser(any())  // API 호출 안 됨
    }

    @Test
    fun `DB에 없으면 API를 호출한다`() = runTest {
        // Given
        whenever(mockUserDao.getUserById(1)).thenReturn(null)
        val apiUser = User(1, "홍길동", "hong@test.com")
        whenever(mockApiService.getUserById(1)).thenReturn(apiUser)

        // When
        val result = repository.getUser(1)

        // Then
        assertThat(result).isEqualTo(apiUser)
        verify(mockApiService).getUserById(1)
    }
}
```

---

## Room 테스트

```kotlin
@RunWith(AndroidJUnit4::class)
class UserDaoTest {

    private lateinit var db: AppDatabase
    private lateinit var userDao: UserDao

    @Before
    fun setUp() {
        // 인메모리 DB 사용 — 테스트 후 자동 삭제
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java
        ).allowMainThreadQueries()  // 테스트에서는 메인 스레드 허용
         .build()
        userDao = db.userDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    @Test
    fun insertAndGetUser() = runTest {
        // Given
        val user = User(name = "홍길동", email = "hong@test.com")

        // When
        val id = userDao.insertUser(user)
        val loaded = userDao.getUserById(id.toInt())

        // Then
        assertThat(loaded?.name).isEqualTo("홍길동")
        assertThat(loaded?.email).isEqualTo("hong@test.com")
    }

    @Test
    fun getAllUsers_returnsAll() = runTest {
        // Given
        userDao.insertUser(User(name = "사용자1", email = "user1@test.com"))
        userDao.insertUser(User(name = "사용자2", email = "user2@test.com"))

        // When
        val users = userDao.getAllUsers().first()

        // Then
        assertThat(users).hasSize(2)
    }
}
```

---

## Compose UI 테스트

```kotlin
// build.gradle.kts
androidTestImplementation("androidx.compose.ui:ui-test-junit4")
debugImplementation("androidx.compose.ui:ui-test-manifest")
```

```kotlin
@RunWith(AndroidJUnit4::class)
class LoginScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `이메일과 비밀번호 입력 후 로그인 버튼 클릭`() {
        composeTestRule.setContent {
            LoginScreen(onLoginSuccess = {})
        }

        // 이메일 입력
        composeTestRule
            .onNodeWithText("이메일")  // 텍스트로 노드 찾기
            .performTextInput("test@example.com")

        // 비밀번호 입력
        composeTestRule
            .onNodeWithText("비밀번호")
            .performTextInput("password123")

        // 로그인 버튼 클릭
        composeTestRule
            .onNodeWithText("로그인")
            .performClick()

        // 로딩 인디케이터 표시 확인
        composeTestRule
            .onNodeWithContentDescription("로딩 중")
            .assertIsDisplayed()
    }

    @Test
    fun `빈 입력으로 로그인 시도 시 에러 표시`() {
        composeTestRule.setContent {
            LoginScreen(onLoginSuccess = {})
        }

        composeTestRule
            .onNodeWithText("로그인")
            .performClick()

        composeTestRule
            .onNodeWithText("이메일을 입력해주세요")
            .assertIsDisplayed()
    }

    @Test
    fun `목록 스크롤 테스트`() {
        val items = (1..20).map { "아이템 $it" }

        composeTestRule.setContent {
            LazyColumn {
                items(items) { item ->
                    Text(item, modifier = Modifier.testTag("item_$item"))
                }
            }
        }

        // 아이템 20번으로 스크롤
        composeTestRule
            .onNodeWithTag("item_20")
            .performScrollTo()
            .assertIsDisplayed()
    }
}
```

---

## 테스트 커버리지 체크리스트

```
✅ ViewModel
  - 초기 상태
  - 성공 케이스
  - 실패/에러 케이스
  - 사용자 액션 처리

✅ Repository
  - 캐시 히트 / 미스
  - 네트워크 요청 분기
  - 에러 전파

✅ DAO
  - CRUD 각각
  - 트랜잭션
  - 쿼리 조건

✅ Compose UI
  - 초기 렌더링
  - 사용자 상호작용
  - 상태 변화에 따른 UI 변경
```
