---
title: "ViewModel과 상태 관리"
order: 5
---

## 왜 ViewModel이 필요한가?

화면 회전이나 다크 모드 전환 시 Activity/Fragment가 **재생성**됩니다. 이때 UI에서 직접 데이터를 갖고 있으면 모두 사라집니다.

**ViewModel**은 Activity/Fragment보다 오래 살아남아 **데이터를 유지**합니다.

```
Activity 생명주기:   onCreate → onDestroy → onCreate(회전 후 재생성)
ViewModel 생명주기: onCreate → (회전해도 살아있음) → onDestroy(앱 종료시)
```

---

## ViewModel 기본 사용

```kotlin
// build.gradle.kts
implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.0")
implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.0")
implementation("androidx.activity:activity-ktx:1.9.0")
```

```kotlin
// ViewModel 작성
class CounterViewModel : ViewModel() {

    // _count: 내부에서만 변경 가능 (MutableStateFlow)
    private val _count = MutableStateFlow(0)
    // count: 외부에서 읽기만 가능 (StateFlow)
    val count: StateFlow<Int> = _count.asStateFlow()

    fun increment() {
        _count.value++
    }

    fun decrement() {
        _count.value--
    }

    fun reset() {
        _count.value = 0
    }
}
```

```kotlin
// Activity에서 ViewModel 사용
class CounterActivity : AppCompatActivity() {

    // by viewModels(): Activity가 재생성돼도 같은 인스턴스 반환
    private val viewModel: CounterViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCounterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // StateFlow 관찰 — lifecycleScope 사용
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.count.collect { count ->
                    binding.countText.text = count.toString()
                }
            }
        }

        binding.incrementBtn.setOnClickListener { viewModel.increment() }
        binding.decrementBtn.setOnClickListener { viewModel.decrement() }
    }
}
```

### Compose에서 ViewModel 사용

```kotlin
@Composable
fun CounterScreen(
    viewModel: CounterViewModel = viewModel()  // Compose용 viewModel()
) {
    val count by viewModel.count.collectAsStateWithLifecycle()

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text("Count: $count", fontSize = 32.sp)
        Row {
            Button(onClick = viewModel::decrement) { Text("-") }
            Spacer(modifier = Modifier.width(8.dp))
            Button(onClick = viewModel::increment) { Text("+") }
        }
    }
}
```

---

## UiState 패턴

실무에서는 로딩/성공/실패 상태를 하나의 sealed class로 관리합니다.

```kotlin
// UiState 정의
sealed class UiState<out T> {
    object Loading : UiState<Nothing>()
    data class Success<T>(val data: T) : UiState<T>()
    data class Error(val message: String) : UiState<Nothing>()
}
```

```kotlin
class UserViewModel(
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<UiState<User>>(UiState.Loading)
    val uiState: StateFlow<UiState<User>> = _uiState.asStateFlow()

    init {
        loadUser()
    }

    fun loadUser() {
        viewModelScope.launch {  // ViewModel이 살아있는 동안만 실행
            _uiState.value = UiState.Loading
            try {
                val user = userRepository.getUser()
                _uiState.value = UiState.Success(user)
            } catch (e: Exception) {
                _uiState.value = UiState.Error(e.message ?: "알 수 없는 오류")
            }
        }
    }
}
```

```kotlin
// Compose에서 UiState 처리
@Composable
fun UserScreen(viewModel: UserViewModel = viewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    when (val state = uiState) {
        is UiState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        is UiState.Success -> {
            UserContent(user = state.data)
        }
        is UiState.Error -> {
            ErrorContent(
                message = state.message,
                onRetry = viewModel::loadUser
            )
        }
    }
}
```

---

## StateFlow vs SharedFlow

| | StateFlow | SharedFlow |
|--|-----------|-----------|
| 초기값 | 필요 | 불필요 |
| 구독자에게 | 항상 최신값 전달 | 설정에 따라 다름 |
| 같은 값 | 방출 안 함 | 방출 |
| 주요 용도 | UI 상태 | 일회성 이벤트 |

```kotlin
class LoginViewModel : ViewModel() {

    // UI 상태: StateFlow (현재 상태를 항상 알 수 있어야 함)
    private val _loginState = MutableStateFlow<LoginState>(LoginState.Idle)
    val loginState: StateFlow<LoginState> = _loginState.asStateFlow()

    // 일회성 이벤트: SharedFlow (토스트, 내비게이션 등)
    private val _events = MutableSharedFlow<LoginEvent>()
    val events: SharedFlow<LoginEvent> = _events.asSharedFlow()

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _loginState.value = LoginState.Loading
            try {
                val user = authRepository.login(email, password)
                _loginState.value = LoginState.Success(user)
                _events.emit(LoginEvent.NavigateToHome)  // 화면 이동 이벤트
            } catch (e: Exception) {
                _loginState.value = LoginState.Error
                _events.emit(LoginEvent.ShowError(e.message ?: "로그인 실패"))
            }
        }
    }
}

sealed class LoginEvent {
    object NavigateToHome : LoginEvent()
    data class ShowError(val message: String) : LoginEvent()
}
```

```kotlin
// Compose에서 일회성 이벤트 처리
@Composable
fun LoginScreen(viewModel: LoginViewModel = viewModel()) {
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                is LoginEvent.NavigateToHome -> {
                    // 내비게이션 처리
                }
                is LoginEvent.ShowError -> {
                    Toast.makeText(context, event.message, Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    // UI 구성...
}
```

---

## SavedStateHandle — 프로세스 종료 후 복구

앱이 백그라운드에 있다가 시스템에 의해 강제 종료되면 ViewModel도 사라집니다. `SavedStateHandle`을 사용하면 이 경우도 복구할 수 있습니다.

```kotlin
class SearchViewModel(
    private val savedStateHandle: SavedStateHandle
) : ViewModel() {

    // 키를 통해 Bundle에 저장됨 — 프로세스 종료 후에도 복구 가능
    val searchQuery: StateFlow<String> = savedStateHandle.getStateFlow(
        key = "search_query",
        initialValue = ""
    )

    fun updateQuery(query: String) {
        savedStateHandle["search_query"] = query  // 자동으로 저장됨
    }
}
```

---

## ViewModel 팩토리 — 의존성 주입

ViewModel에 파라미터를 전달할 때는 Factory를 만들어야 합니다. (Hilt를 사용하면 불필요 — 11장)

```kotlin
class UserViewModel(
    private val userId: Int,
    private val repository: UserRepository
) : ViewModel() {

    companion object {
        fun provideFactory(
            userId: Int,
            repository: UserRepository
        ) = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return UserViewModel(userId, repository) as T
            }
        }
    }
}

// Activity에서 사용
val viewModel: UserViewModel by viewModels {
    UserViewModel.provideFactory(
        userId = intent.getIntExtra("USER_ID", -1),
        repository = UserRepositoryImpl()
    )
}
```
