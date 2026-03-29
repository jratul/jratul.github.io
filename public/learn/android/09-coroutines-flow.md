---
title: "코루틴과 Flow"
order: 9
---

## Android에서 코루틴이 필요한 이유

Android 앱은 **메인 스레드(UI 스레드)**에서 실행됩니다. 네트워크 요청이나 DB 접근처럼 오래 걸리는 작업을 메인 스레드에서 하면 UI가 멈추고 **ANR(Application Not Responding)** 오류가 발생합니다.

코루틴은 **비동기 작업을 동기 코드처럼 작성**할 수 있게 해줍니다.

```kotlin
// ❌ 메인 스레드에서 네트워크 요청 — ANR 발생
fun loadData() {
    val data = api.getData()  // 수 초 동안 UI 멈춤
    updateUI(data)
}

// ✅ 코루틴으로 비동기 처리
fun loadData() {
    lifecycleScope.launch {
        val data = withContext(Dispatchers.IO) {
            api.getData()  // IO 스레드에서 실행
        }
        updateUI(data)  // 다시 메인 스레드에서 실행
    }
}
```

---

## Coroutine Scope — Android에서 제공하는 스코프

```kotlin
// 1. lifecycleScope — Activity/Fragment 생명주기에 연결
class MyActivity : AppCompatActivity() {
    fun loadData() {
        lifecycleScope.launch {
            // Activity가 destroyed되면 자동 취소됨
            val data = repository.getData()
            binding.textView.text = data.toString()
        }
    }
}

// 2. repeatOnLifecycle — 특정 Lifecycle 상태일 때만 실행
lifecycleScope.launch {
    repeatOnLifecycle(Lifecycle.State.STARTED) {
        // STARTED 상태일 때만 실행, STOPPED되면 취소, STARTED되면 재시작
        viewModel.uiState.collect { state ->
            updateUI(state)
        }
    }
}

// 3. viewModelScope — ViewModel 생명주기에 연결
class MyViewModel : ViewModel() {
    fun loadData() {
        viewModelScope.launch {
            // ViewModel이 cleared될 때 자동 취소
            val data = repository.getData()
            _state.value = data
        }
    }
}
```

---

## Dispatcher — 어느 스레드에서 실행할지

```kotlin
viewModelScope.launch {

    // Dispatchers.Main — UI 업데이트 (기본값)
    withContext(Dispatchers.Main) {
        binding.progress.isVisible = true
    }

    // Dispatchers.IO — 네트워크, 파일, DB 작업
    val data = withContext(Dispatchers.IO) {
        api.fetchData()         // 네트워크 요청
        database.queryAll()     // DB 쿼리
        File("data.txt").readText() // 파일 읽기
    }

    // Dispatchers.Default — CPU 집약적 계산
    val processed = withContext(Dispatchers.Default) {
        data.sortedBy { it.score }   // 정렬
            .filter { it.isActive }  // 필터링
            .take(100)               // 상위 100개
    }

    binding.recyclerView.adapter = MyAdapter(processed)
}
```

---

## async/await — 병렬 실행

```kotlin
// 순차 실행 — 총 2초 소요
suspend fun loadSequential() {
    val user = fetchUser()    // 1초
    val posts = fetchPosts()  // 1초
    // 총 2초
}

// 병렬 실행 — 총 1초 소요
suspend fun loadParallel() {
    val userDeferred = coroutineScope {
        async { fetchUser() }   // 동시에 시작
    }
    val postsDeferred = coroutineScope {
        async { fetchPosts() }  // 동시에 시작
    }

    // 또는 한 블록 안에서
    coroutineScope {
        val userDeferred = async { fetchUser() }
        val postsDeferred = async { fetchPosts() }

        val user = userDeferred.await()   // 완료 대기
        val posts = postsDeferred.await()

        updateUI(user, posts)
    }
}
```

---

## Flow — 연속적인 데이터 스트림

`Flow`는 **여러 값을 비동기로 순차 방출**하는 스트림입니다. 단일 값을 반환하는 `suspend fun`과 달리, 여러 값을 연속으로 방출할 수 있습니다.

```kotlin
// Flow 생성
fun countDown(): Flow<Int> = flow {
    for (i in 10 downTo 0) {
        emit(i)             // 값 방출
        delay(1000)         // 1초 대기
    }
}

// Flow 수집
lifecycleScope.launch {
    countDown().collect { value ->
        binding.countText.text = value.toString()
    }
}
```

### Flow 연산자

```kotlin
val numbers = flowOf(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

// map — 변환
numbers.map { it * 2 }           // 2, 4, 6, 8, 10, ...

// filter — 필터링
numbers.filter { it % 2 == 0 }  // 2, 4, 6, 8, 10

// transform — 복잡한 변환
numbers.transform { value ->
    if (value % 2 == 0) emit(value * 10)  // 짝수만 10배로 방출
}

// take — 앞에서 N개만
numbers.take(3)  // 1, 2, 3

// flatMapLatest — 새 값이 오면 이전 작업 취소하고 새로 시작
searchQuery.flatMapLatest { query ->
    flow { emit(api.search(query)) }  // 빠르게 타이핑하면 마지막 것만 요청
}

// debounce — 입력이 멈춘 후 지정 시간 뒤에 처리
searchQuery
    .debounce(300)        // 300ms 동안 새 값이 없으면 처리
    .filter { it.length >= 2 }
    .flatMapLatest { query -> searchFlow(query) }

// combine — 여러 Flow를 하나로 합치기
combine(userFlow, settingsFlow) { user, settings ->
    UserProfile(user, settings)
}

// zip — 두 Flow의 쌍을 맞춰서 방출
flowA.zip(flowB) { a, b -> "$a + $b" }
```

---

## StateFlow vs Flow

```kotlin
class SearchViewModel : ViewModel() {

    // 검색어 상태 (MutableStateFlow)
    private val _query = MutableStateFlow("")

    // 검색 결과 (StateFlow로 노출)
    val searchResults: StateFlow<List<Item>> = _query
        .debounce(300)
        .filter { it.isNotEmpty() }
        .flatMapLatest { query ->
            flow { emit(repository.search(query)) }
                .catch { emit(emptyList()) }  // 에러 발생 시 빈 목록
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun updateQuery(query: String) {
        _query.value = query
    }
}
```

---

## 에러 처리

```kotlin
// catch 연산자
flow {
    emit(api.fetchData())
}
.catch { e ->
    // 에러를 잡아서 기본값 방출
    emit(emptyList())
    // 또는 에러 상태로 전환
    _errorState.value = e.message
}
.collect { data ->
    // 성공 처리
}

// retry
flow {
    emit(api.fetchData())
}
.retry(3) { cause ->
    // IOException이면 재시도 (최대 3번)
    cause is IOException
}
.catch { emit(emptyList()) }
```

---

## Channel — 핫 스트림

Flow는 Cold(수집할 때마다 새로 실행)지만, Channel은 **생산자와 소비자가 독립적으로 동작**하는 핫 스트림입니다.

```kotlin
class EventViewModel : ViewModel() {

    // SharedFlow로 일회성 이벤트 전달
    private val _events = MutableSharedFlow<Event>()
    val events: SharedFlow<Event> = _events.asSharedFlow()

    fun showToast(message: String) {
        viewModelScope.launch {
            _events.emit(Event.ShowToast(message))
        }
    }
}

// Activity에서 이벤트 수신
lifecycleScope.launch {
    repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.events.collect { event ->
            when (event) {
                is Event.ShowToast -> toast(event.message)
                is Event.Navigate -> navigateTo(event.destination)
            }
        }
    }
}
```

---

## WorkManager — 백그라운드 작업 보장

앱이 종료되거나 기기가 재시작되어도 반드시 실행되어야 하는 작업에 사용합니다.

```kotlin
// build.gradle.kts
implementation("androidx.work:work-runtime-ktx:2.9.0")
```

```kotlin
// Worker 정의
class SyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val data = inputData.getString("DATA_KEY") ?: ""
            repository.sync(data)
            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry()  // 최대 3번 재시도
            else Result.failure()
        }
    }
}

// 작업 예약
val syncRequest = OneTimeWorkRequestBuilder<SyncWorker>()
    .setInputData(workDataOf("DATA_KEY" to "some data"))
    .setConstraints(
        Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)  // 네트워크 연결 필요
            .setRequiresBatteryNotLow(true)                  // 배터리 부족 시 제외
            .build()
    )
    .setBackoffCriteria(
        BackoffPolicy.EXPONENTIAL,
        WorkRequest.MIN_BACKOFF_MILLIS,
        TimeUnit.MILLISECONDS
    )
    .build()

WorkManager.getInstance(context).enqueue(syncRequest)

// 주기적 작업 (최소 15분 간격)
val periodicRequest = PeriodicWorkRequestBuilder<SyncWorker>(
    repeatInterval = 1,
    repeatIntervalTimeUnit = TimeUnit.HOURS
).build()

WorkManager.getInstance(context)
    .enqueueUniquePeriodicWork(
        "sync_work",
        ExistingPeriodicWorkPolicy.KEEP,  // 이미 있으면 유지
        periodicRequest
    )
```
