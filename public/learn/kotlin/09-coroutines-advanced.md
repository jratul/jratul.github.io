---
title: "코루틴 심화"
order: 9
---

## 복습: 기본 코루틴

챕터 5에서 기본 코루틴, suspend 함수, async/await, Dispatcher, Flow를 다뤘습니다. 이 챕터는 실무에서 자주 쓰는 심화 주제를 다룹니다.

---

## 구조화된 동시성 (Structured Concurrency)

코루틴은 항상 특정 스코프 안에서 실행됩니다. 부모 코루틴이 취소되면 자식도 모두 취소됩니다.

```kotlin
// coroutineScope: 자식이 모두 완료될 때까지 대기
suspend fun fetchDashboard(): Dashboard = coroutineScope {
    val users  = async { fetchUsers() }
    val orders = async { fetchOrders() }
    val stats  = async { fetchStats() }

    // 하나라도 실패하면 나머지 자동 취소
    Dashboard(users.await(), orders.await(), stats.await())
}

// supervisorScope: 자식 하나가 실패해도 다른 자식은 계속 실행
suspend fun fetchOptional() = supervisorScope {
    val required = async { fetchRequired() }
    val optional = async { fetchOptional() }

    val optResult = try { optional.await() } catch (e: Exception) { null }
    Dashboard(required.await(), optResult)
}
```

`coroutineScope`는 하나가 실패하면 전체를 취소하고, `supervisorScope`는 독립적으로 실패를 처리합니다.

---

## Job과 취소

```kotlin
val job = CoroutineScope(Dispatchers.IO).launch {
    repeat(10) { i ->
        delay(500)
        println("작업 $i")
    }
}

delay(1200)
job.cancel()  // 취소 요청
job.join()    // 취소 완료까지 대기
println("취소됨")
// 작업 0, 작업 1, 작업 2 출력 후 종료
```

### 취소 처리

`delay`, `yield` 같은 suspension point에서만 취소가 확인됩니다. CPU 집약적 작업은 직접 확인해야 합니다.

```kotlin
suspend fun heavyWork() = coroutineScope {
    launch {
        for (i in 0..1_000_000) {
            // 주기적으로 취소 확인
            if (i % 1000 == 0) yield()  // 또는 ensureActive()
            doWork(i)
        }
    }
}

// 취소 시 정리 작업
val job = launch {
    try {
        delay(Long.MAX_VALUE)
    } finally {
        // 취소 후 항상 실행
        println("정리 중...")
        withContext(NonCancellable) {
            // 취소 불가 컨텍스트에서 DB 정리 등
            cleanup()
        }
    }
}
```

---

## Channel

코루틴 간에 값을 주고받는 통신 채널입니다. 생산자-소비자 패턴에 씁니다.

```kotlin
import kotlinx.coroutines.channels.*

// 기본 채널 (랑데뷰: 생산자와 소비자가 만날 때까지 대기)
val channel = Channel<Int>()

// 생산자
launch {
    for (i in 1..5) {
        channel.send(i)      // 소비자가 받을 때까지 대기
        println("전송: $i")
    }
    channel.close()
}

// 소비자
for (value in channel) {     // close 시 자동 종료
    println("수신: $value")
}
```

### 채널 종류

```kotlin
// 버퍼 채널 — 버퍼가 찰 때까지 즉시 전송
val buffered = Channel<Int>(capacity = 10)

// 무한 버퍼
val unlimited = Channel<Int>(Channel.UNLIMITED)

// 최신값만 유지
val conflated = Channel<Int>(Channel.CONFLATED)
```

### produce / actor

```kotlin
// produce: 채널을 반환하는 코루틴
val squares = produce {
    for (i in 1..5) send(i * i)
}

squares.consumeEach { println(it) }  // 1, 4, 9, 16, 25
```

---

## SharedFlow와 StateFlow

`Flow`는 cold(구독 시 시작)이지만, `SharedFlow`와 `StateFlow`는 hot(항상 실행 중)입니다.

### SharedFlow

여러 구독자에게 이벤트를 브로드캐스트합니다.

```kotlin
class EventBus {
    private val _events = MutableSharedFlow<AppEvent>()
    val events: SharedFlow<AppEvent> = _events.asSharedFlow()

    suspend fun emit(event: AppEvent) = _events.emit(event)
}

// 구독자 1
scope.launch {
    eventBus.events.collect { event ->
        println("구독자 1: $event")
    }
}

// 구독자 2
scope.launch {
    eventBus.events.collect { event ->
        println("구독자 2: $event")
    }
}

eventBus.emit(AppEvent.UserLoggedIn("Alice"))
// 구독자 1, 2 모두 수신
```

### StateFlow

현재 상태를 보관하고, 구독 시 최신값을 즉시 받습니다. Android ViewModel의 상태 관리에 많이 씁니다.

```kotlin
class CounterViewModel {
    private val _count = MutableStateFlow(0)
    val count: StateFlow<Int> = _count.asStateFlow()

    fun increment() { _count.update { it + 1 } }
    fun decrement() { _count.update { it - 1 } }
}

val vm = CounterViewModel()

scope.launch {
    vm.count.collect { count ->
        println("현재 카운트: $count")  // 구독 즉시 0 수신
    }
}

vm.increment()  // 1
vm.increment()  // 2
vm.decrement()  // 1
```

### SharedFlow vs StateFlow 비교

```
SharedFlow
  - 초기값 없음
  - 구독 후 발행된 값만 수신
  - 일회성 이벤트 (알림, 에러 메시지) 에 적합

StateFlow
  - 초기값 필수
  - 구독 즉시 최신값 수신
  - 연속적인 상태 관리 (UI 상태, 로딩 여부) 에 적합
```

---

## Flow 심화

### 오류 처리

```kotlin
flow {
    emit(1)
    throw RuntimeException("오류!")
    emit(2)
}
.catch { e ->
    println("오류 처리: ${e.message}")
    emit(-1)  // 대체값 방출
}
.collect { println(it) }
// 1, 오류 처리: 오류!, -1
```

### 여러 Flow 결합

```kotlin
val flow1 = flow { emit(1); delay(100); emit(2) }
val flow2 = flow { emit("A"); delay(150); emit("B") }

// zip: 쌍으로 묶기
flow1.zip(flow2) { n, s -> "$n$s" }
    .collect { println(it) }  // 1A, 2B

// combine: 어느 쪽이든 새 값 오면 최신값 조합
combine(flow1, flow2) { n, s -> "$n$s" }
    .collect { println(it) }  // 1A, 2A, 2B

// flatMapLatest: 새 값 오면 이전 Flow 취소
searchQuery
    .debounce(300)
    .flatMapLatest { query -> searchApi(query) }
    .collect { results -> updateUI(results) }
```

### 버퍼와 배압

```kotlin
flow {
    repeat(10) {
        emit(it)
        delay(100)  // 생산 속도
    }
}
.buffer(5)             // 버퍼로 배압 처리
.collect {
    delay(300)         // 소비가 더 느려도 OK
    println(it)
}

// conflate: 소비가 느리면 중간값 건너뜀
.conflate()

// collectLatest: 새 값 오면 이전 collect 취소
.collectLatest { value ->
    delay(200)
    println("처리: $value")  // 마지막 값만 처리
}
```

---

## 코루틴 컨텍스트

```kotlin
// 여러 컨텍스트 요소 결합
val context = Dispatchers.IO + CoroutineName("fetcher") + SupervisorJob()

launch(context) {
    println(coroutineContext[CoroutineName])  // CoroutineName(fetcher)
}

// withContext: 블록 내에서만 컨텍스트 변경
suspend fun fetchAndSave() {
    val data = withContext(Dispatchers.IO) { fetchFromNetwork() }  // IO 스레드
    withContext(Dispatchers.Main) { updateUI(data) }               // 메인 스레드
}
```
