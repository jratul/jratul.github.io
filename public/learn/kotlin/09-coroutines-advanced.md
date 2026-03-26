---
title: "코루틴 심화"
order: 9
---

## 이 챕터를 읽기 전에

챕터 5에서 기본 코루틴, `suspend` 함수, `async/await`, `Dispatcher`, `Flow` 기초를 다뤘습니다. 이 챕터는 실무에서 자주 마주치는 심화 주제를 다룹니다. 기본 코루틴을 이미 사용해봤다면 이 챕터부터 읽어도 됩니다.

---

## 구조화된 동시성 (Structured Concurrency)

### 왜 필요한가?

전통적인 스레드 방식에서는 백그라운드 작업이 "떠돌아다니는" 문제가 있었습니다. 작업을 시작했지만 취소를 잊거나, 부모가 종료됐는데 자식 작업이 계속 실행되는 문제입니다.

코루틴의 구조화된 동시성은 이런 문제를 해결합니다: **코루틴은 항상 특정 스코프 안에서 실행되고, 부모가 취소되면 자식도 자동으로 취소됩니다.**

### coroutineScope — 하나라도 실패하면 전체 취소

```kotlin
// 대시보드 데이터를 병렬로 가져오기
suspend fun fetchDashboard(): Dashboard = coroutineScope {
    // 세 작업을 동시에 시작
    val users  = async { fetchUsers() }   // 사용자 목록
    val orders = async { fetchOrders() }  // 주문 목록
    val stats  = async { fetchStats() }   // 통계 데이터

    // 모두 완료될 때까지 기다림
    // 하나라도 예외 발생 → 나머지 자동 취소 → 예외 전파
    Dashboard(
        users = users.await(),
        orders = orders.await(),
        stats = stats.await()
    )
}
```

**동작 방식:** `fetchUsers()`가 실패하면 아직 실행 중인 `fetchOrders()`와 `fetchStats()`가 즉시 취소됩니다. 네트워크 리소스를 낭비하지 않습니다.

### supervisorScope — 독립적인 실패 처리

```kotlin
// 일부 데이터가 없어도 대시보드를 보여주고 싶은 경우
suspend fun fetchDashboardOptional() = supervisorScope {
    val required = async { fetchRequiredData() }  // 필수 데이터
    val optional = async { fetchOptionalData() }  // 선택 데이터 (없어도 됨)

    // optional 실패해도 required는 계속 실행됨
    val optResult = try {
        optional.await()
    } catch (e: Exception) {
        println("선택 데이터 로딩 실패, 기본값 사용: ${e.message}")
        null  // 기본값
    }

    Dashboard(
        required = required.await(),  // 이건 반드시 성공해야 함
        optional = optResult
    )
}
```

| | coroutineScope | supervisorScope |
|--|--|--|
| 자식 하나 실패 시 | 나머지 모두 취소 | 다른 자식들 계속 실행 |
| 사용 상황 | 모든 데이터가 필요할 때 | 일부 실패를 허용할 때 |

---

## Job과 취소

### Job 기본 사용

```kotlin
// launch는 Job을 반환
val job = CoroutineScope(Dispatchers.IO).launch {
    repeat(10) { i ->
        delay(500)              // 0.5초 대기
        println("진행 중: $i")  // 0, 1, 2, ...
    }
}

delay(1300)      // 1.3초 후
job.cancel()     // 취소 요청 (즉시 중단은 아님, suspension point에서 중단)
job.join()       // 취소 완료까지 기다림
println("취소 완료")
// "진행 중: 0", "진행 중: 1", "진행 중: 2" 출력 후 종료
```

### 취소 처리 — suspension point에서만 취소됨

중요한 개념: **취소는 `delay`, `yield` 같은 suspension point에서만 확인됩니다.** CPU 집약적인 반복문은 취소 확인을 직접 해야 합니다.

```kotlin
// ❌ 취소가 되지 않는 코드
suspend fun badWork() = coroutineScope {
    launch {
        for (i in 0..1_000_000) {
            heavyComputation(i)  // suspension point 없음 → 취소 무시됨
        }
    }
}

// ✅ 주기적으로 취소 확인
suspend fun goodWork() = coroutineScope {
    launch {
        for (i in 0..1_000_000) {
            if (i % 10_000 == 0) {
                yield()          // 다른 코루틴에게 실행 기회를 주면서 취소 확인
                // 또는: ensureActive()  // 취소 상태면 CancellationException 던짐
            }
            heavyComputation(i)
        }
    }
}
```

### 취소 후 정리 작업

```kotlin
val job = launch {
    try {
        println("작업 시작")
        delay(Long.MAX_VALUE)  // 오랫동안 실행되는 작업
    } catch (e: CancellationException) {
        println("취소됨: ${e.message}")
        throw e  // CancellationException은 반드시 다시 던져야 함!
    } finally {
        // 취소 여부에 관계없이 항상 실행 (try-finally처럼)
        println("정리 중...")

        // finally 블록은 이미 취소된 상태라서 suspend 함수 호출 불가
        // 정리 작업에 suspend 함수가 필요하면 NonCancellable 사용
        withContext(NonCancellable) {
            delay(100)          // ← 이렇게 해야 실행됨
            cleanupDatabase()   // DB 연결 해제 등 정리 작업
        }
    }
}

delay(500)
job.cancel()
job.join()
```

**주의:** `CancellationException`을 catch해서 삼키면 안 됩니다. 코루틴이 취소됐다는 신호가 전달되지 않아 구조화된 동시성이 깨집니다.

---

## Channel — 코루틴 간 데이터 전달

**비유:** Channel은 생산자와 소비자를 연결하는 컨베이어 벨트입니다. 생산자는 벨트에 물건을 올리고, 소비자는 벨트에서 물건을 가져갑니다.

### 기본 채널

```kotlin
import kotlinx.coroutines.channels.*

// 기본 Channel (Rendezvous): 소비자가 받을 때까지 생산자가 대기
val channel = Channel<String>()

// 생산자 코루틴
launch {
    val items = listOf("사과", "바나나", "딸기")
    for (item in items) {
        channel.send(item)         // 소비자가 받을 때까지 여기서 대기
        println("전송 완료: $item")
    }
    channel.close()  // 더 이상 보낼 게 없으면 닫기
}

// 소비자 코루틴
launch {
    for (item in channel) {         // channel.close() 시 반복문 자동 종료
        println("수신: $item")
        delay(100)                  // 처리 시간
    }
    println("모든 아이템 처리 완료")
}
```

### 채널 종류와 특성

```kotlin
// 1. 기본 채널 (Rendezvous) — 버퍼 없음, 양쪽이 만날 때까지 대기
val basic = Channel<Int>()

// 2. 버퍼 채널 — 버퍼가 찰 때까지 생산자가 블록되지 않음
val buffered = Channel<Int>(capacity = 10)

// 3. 무한 버퍼 채널 — 메모리가 허용하는 한 계속 전송 가능 (주의: OutOfMemory 가능)
val unlimited = Channel<Int>(Channel.UNLIMITED)

// 4. Conflated 채널 — 최신 값만 유지, 소비자가 느려도 중간값 버림
val conflated = Channel<Int>(Channel.CONFLATED)
```

**실전 예제: 이미지 처리 파이프라인**

```kotlin
suspend fun processImages(imageUrls: List<String>) = coroutineScope {
    val downloadChannel = Channel<ByteArray>(capacity = 5)   // 다운로드 버퍼
    val resizeChannel = Channel<ByteArray>(capacity = 5)     // 리사이즈 버퍼

    // 1단계: 다운로드
    launch {
        for (url in imageUrls) {
            val imageData = downloadImage(url)  // 이미지 다운로드
            downloadChannel.send(imageData)     // 다음 단계로 전달
        }
        downloadChannel.close()
    }

    // 2단계: 리사이즈
    launch {
        for (imageData in downloadChannel) {
            val resized = resizeImage(imageData)  // 이미지 리사이즈
            resizeChannel.send(resized)
        }
        resizeChannel.close()
    }

    // 3단계: 저장
    launch {
        for (imageData in resizeChannel) {
            saveImage(imageData)  // 저장
        }
        println("모든 이미지 처리 완료")
    }
}
```

### produce 빌더

채널을 반환하는 코루틴을 더 간결하게 작성할 수 있습니다.

```kotlin
// produce: 코루틴 + 채널을 한 번에 생성
val numbers = produce {
    for (i in 1..5) {
        delay(100)       // 0.1초마다
        send(i * i)      // 제곱수 전송
    }
}

// 소비
numbers.consumeEach { value ->
    println("받음: $value")  // 1, 4, 9, 16, 25
}
```

---

## SharedFlow와 StateFlow — Hot Flow

### Cold vs Hot Flow

**Cold Flow (일반 Flow):** 구독자가 생길 때 데이터 생성 시작. 구독자마다 독립적인 스트림.

```kotlin
// Cold Flow — collect 할 때마다 새로 시작
val coldFlow = flow {
    println("시작")  // collect할 때마다 실행됨
    emit(1)
    emit(2)
}
```

**Hot Flow (SharedFlow/StateFlow):** 구독자 없어도 데이터가 흐름. 여러 구독자가 같은 데이터 공유.

### SharedFlow — 이벤트 브로드캐스트

```kotlin
// 이벤트 버스 패턴
class EventBus {
    // MutableSharedFlow: 내부에서 이벤트 발행
    private val _events = MutableSharedFlow<AppEvent>(
        extraBufferCapacity = 64  // 구독자가 느려도 64개까지 버퍼
    )
    // SharedFlow: 외부에 공개 (읽기만 가능)
    val events: SharedFlow<AppEvent> = _events.asSharedFlow()

    suspend fun publish(event: AppEvent) {
        _events.emit(event)  // 이벤트 발행
    }
}

// 사용 예시
val bus = EventBus()

// 구독자 1 — 알림 처리
scope.launch {
    bus.events.collect { event ->
        when (event) {
            is UserLoggedIn -> sendWelcomeNotification(event.userId)
            is OrderPlaced -> updateOrderCount()
            else -> { /* 무시 */ }
        }
    }
}

// 구독자 2 — 로그 기록
scope.launch {
    bus.events.collect { event ->
        logEvent(event)  // 모든 이벤트 로그
    }
}

// 이벤트 발행
bus.publish(UserLoggedIn(userId = 1))
// → 구독자 1, 2 모두 수신
```

**replay 파라미터:** 새 구독자가 이전 이벤트를 받을 수 있게 설정

```kotlin
// 마지막 3개 이벤트를 새 구독자에게 즉시 전달
val _events = MutableSharedFlow<AppEvent>(replay = 3)
```

### StateFlow — 상태 관리

**비유:** StateFlow는 화이트보드에 현재 상태를 적어두는 것과 같습니다. 누가 봐도 항상 최신 상태를 볼 수 있습니다.

```kotlin
class TodoViewModel {
    // 현재 상태를 보관 — 초기값 필수
    private val _todos = MutableStateFlow<List<Todo>>(emptyList())
    val todos: StateFlow<List<Todo>> = _todos.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    fun addTodo(text: String) {
        // update: thread-safe하게 현재 값 기반으로 업데이트
        _todos.update { currentList ->
            currentList + Todo(id = currentList.size + 1, text = text)
        }
    }

    suspend fun loadTodos() {
        _isLoading.value = true   // 로딩 시작
        try {
            val loaded = fetchTodosFromServer()
            _todos.value = loaded  // 상태 업데이트
        } finally {
            _isLoading.value = false  // 로딩 종료
        }
    }
}

// UI에서 사용
scope.launch {
    viewModel.todos.collect { todos ->
        renderTodoList(todos)  // 상태가 바뀔 때마다 UI 업데이트
    }
}

// 구독 즉시 현재 상태를 받음 (SharedFlow와 차이점)
scope.launch {
    viewModel.isLoading.collect { loading ->
        if (loading) showSpinner() else hideSpinner()
    }
}
```

### SharedFlow vs StateFlow 선택 기준

```
SharedFlow 사용:
  ✅ 일회성 이벤트 (네비게이션, 토스트 메시지, 에러 다이얼로그)
  ✅ 같은 이벤트를 여러 번 발행해야 할 때
  ✅ 구독 전 이벤트를 놓쳐도 괜찮을 때

StateFlow 사용:
  ✅ 현재 상태를 유지해야 할 때 (UI 상태, 로딩 여부, 데이터)
  ✅ 구독 시 즉시 현재값이 필요할 때
  ✅ 같은 값이 연속으로 오면 무시하고 싶을 때
```

---

## Flow 심화

### 오류 처리

```kotlin
// catch 연산자 — Flow 중간에 오류 처리
flow {
    emit("데이터 1")
    emit("데이터 2")
    throw IOException("네트워크 오류!")
    emit("데이터 3")  // 실행 안 됨
}
.catch { e ->
    println("오류 처리: ${e.message}")  // "오류 처리: 네트워크 오류!"
    emit("기본값")  // 대체 데이터 방출 가능
}
.collect { data ->
    println(data)
}
// "데이터 1", "데이터 2", "오류 처리: 네트워크 오류!", "기본값"

// retry — 실패 시 재시도
flow { emit(fetchData()) }
    .retry(3) { cause ->         // 최대 3번 재시도
        cause is IOException     // IOException만 재시도, 다른 예외는 그냥 전파
    }
    .collect { data -> process(data) }

// retryWhen — 더 세밀한 재시도 제어
flow { emit(fetchData()) }
    .retryWhen { cause, attempt ->
        if (cause is IOException && attempt < 3) {
            delay(1000L * (attempt + 1))  // 1초, 2초, 3초 후 재시도 (지수 백오프)
            true  // 재시도
        } else {
            false  // 더 이상 재시도 안 함
        }
    }
    .collect { data -> process(data) }
```

### Flow 결합

```kotlin
val userFlow = flow {
    emit(User(1, "Alice"))
    delay(100)
    emit(User(2, "Bob"))
}

val scoreFlow = flow {
    emit(Score(100))
    delay(150)
    emit(Score(200))
}

// zip: 두 Flow를 쌍으로 묶음 (느린 쪽 속도에 맞춤)
userFlow.zip(scoreFlow) { user, score ->
    "${user.name}: ${score.value}점"
}.collect { println(it) }
// "Alice: 100점", "Bob: 200점"

// combine: 어느 쪽이든 새 값이 오면 최신값 조합
combine(userFlow, scoreFlow) { user, score ->
    "${user.name}: ${score.value}점"
}.collect { println(it) }
// 더 많은 조합 출력 (타이밍에 따라 다름)

// merge: 여러 Flow를 하나로 합침 (순서 보장 안 됨)
merge(userFlow.map { it.name }, scoreFlow.map { it.value.toString() })
    .collect { println(it) }
```

### flatMapLatest — 검색 자동완성

```kotlin
// 실시간 검색: 새 쿼리가 오면 이전 검색 취소
val searchQuery = MutableStateFlow("")

searchQuery
    .debounce(300)  // 300ms 동안 입력 없으면 검색 시작
    .filter { it.length >= 2 }  // 2글자 이상만 검색
    .distinctUntilChanged()     // 같은 쿼리 연속 입력 무시
    .flatMapLatest { query ->
        // 새 쿼리 오면 이전 API 호출 자동 취소
        searchApi(query)
    }
    .catch { e ->
        println("검색 오류: ${e.message}")
        emit(emptyList())
    }
    .collect { results ->
        updateSearchResults(results)
    }
```

### 버퍼와 배압 처리

**배압(Backpressure):** 생산자가 소비자보다 빠를 때 발생하는 문제. Flow는 기본적으로 소비자 속도에 맞춰 생산자가 기다립니다.

```kotlin
// 생산자: 100ms마다 데이터 생성
// 소비자: 500ms마다 처리 (5배 느림)
val fastProducer = flow {
    repeat(10) { i ->
        emit(i)
        delay(100)  // 빠른 생산
    }
}

// 기본: 생산자가 소비자 속도에 맞춰 대기 (안전하지만 느림)
fastProducer.collect { value ->
    delay(500)  // 느린 소비
    println("처리: $value")
}

// buffer: 버퍼에 쌓아두고 생산자를 계속 실행
fastProducer
    .buffer(capacity = 5)  // 최대 5개까지 버퍼
    .collect { value ->
        delay(500)
        println("처리: $value")
    }

// conflate: 소비자가 느리면 중간값 건너뜀 (최신값만 처리)
fastProducer
    .conflate()  // 처리 중에 온 값은 버리고 최신값만 유지
    .collect { value ->
        delay(500)
        println("처리 (최신값): $value")  // 일부 값 건너뜀
    }

// collectLatest: 새 값이 오면 이전 처리 취소하고 새 값으로 시작
fastProducer
    .collectLatest { value ->
        delay(300)                   // 처리 중에 새 값이 오면 여기서 취소됨
        println("완료: $value")      // 마지막 값만 완료됨
    }
```

---

## 코루틴 컨텍스트

코루틴이 어떤 스레드에서 실행될지, 어떤 이름을 가질지 등을 설정하는 정보입니다.

```kotlin
// 여러 컨텍스트 요소를 + 로 결합
val myContext = Dispatchers.IO +                // 어디서 실행할지
               CoroutineName("data-fetcher") +  // 이름 (디버깅용)
               SupervisorJob()                  // 자식 하나 실패해도 나머지 계속

val scope = CoroutineScope(myContext)

scope.launch {
    // 현재 컨텍스트 정보 확인
    println(coroutineContext[CoroutineName])    // CoroutineName(data-fetcher)
    println(coroutineContext[Job])              // Job 인스턴스
}
```

### withContext — 특정 블록만 다른 스레드에서 실행

```kotlin
suspend fun fetchAndProcess(): ProcessedData {
    // IO 스레드에서 데이터 가져오기
    val raw = withContext(Dispatchers.IO) {
        fetchFromNetwork()  // 네트워크 요청
    }

    // Default 스레드에서 CPU 집약적 처리
    val processed = withContext(Dispatchers.Default) {
        heavyComputation(raw)  // 계산
    }

    // Main 스레드에서 UI 업데이트 (Android)
    withContext(Dispatchers.Main) {
        updateUI(processed)
    }

    return processed
}
```

**Dispatcher 종류:**

| Dispatcher | 특성 | 사용 예 |
|--|--|--|
| `Dispatchers.Main` | UI 스레드 | UI 업데이트 (Android) |
| `Dispatchers.IO` | 필요에 따라 스레드 생성 | 파일, 네트워크, DB |
| `Dispatchers.Default` | CPU 개수만큼 스레드 | 정렬, 계산, JSON 파싱 |
| `Dispatchers.Unconfined` | 특정 스레드 없음 | 테스트 등 특수한 경우 |

---

## 예외 처리

```kotlin
// CoroutineExceptionHandler — 처리되지 않은 예외 최후 처리
val handler = CoroutineExceptionHandler { context, exception ->
    println("처리되지 않은 예외: ${exception.message}")
    // 로그 기록, 오류 보고 등
}

val scope = CoroutineScope(Dispatchers.Default + handler)

scope.launch {
    throw RuntimeException("예상치 못한 오류!")
}
// "처리되지 않은 예외: 예상치 못한 오류!" 출력

// async에서는 await() 시 예외 발생
val deferred = scope.async {
    throw RuntimeException("async 오류!")
}

try {
    deferred.await()  // 여기서 예외 발생
} catch (e: RuntimeException) {
    println("catch: ${e.message}")
}
```

---

## 흔한 실수

```kotlin
// ❌ 실수 1: GlobalScope 사용 (메모리 누수 위험)
GlobalScope.launch {
    delay(5000)
    updateUI()  // 화면이 이미 닫혔을 수도 있음
}

// ✅ 명시적인 스코프 사용
viewModelScope.launch {  // ViewModel 파괴 시 자동 취소
    delay(5000)
    updateUI()
}

// ❌ 실수 2: suspend 함수를 새 스레드로 감싸기
launch {
    withContext(Dispatchers.IO) {
        Thread.sleep(1000)  // 스레드를 블로킹함 — 코루틴 의미 없음
    }
}

// ✅ delay 사용 (코루틴 친화적)
launch {
    delay(1000)  // 스레드를 블로킹하지 않음
}

// ❌ 실수 3: CancellationException 무시
launch {
    try {
        delay(Long.MAX_VALUE)
    } catch (e: Exception) {
        // CancellationException도 여기서 잡힘 → 코루틴이 취소되지 않음!
        println("오류: ${e.message}")
    }
}

// ✅ CancellationException은 다시 던지기
launch {
    try {
        delay(Long.MAX_VALUE)
    } catch (e: CancellationException) {
        throw e  // 반드시 다시 던지기
    } catch (e: Exception) {
        println("다른 오류: ${e.message}")
    }
}
```
