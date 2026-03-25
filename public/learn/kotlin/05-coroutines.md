---
title: "코루틴 기초"
order: 5
---

## 비동기 프로그래밍이란?

웹에서 데이터를 불러오거나, 파일을 읽거나, DB에 쿼리를 날리는 작업들은 시간이 걸립니다. 이때 프로그램이 그냥 멈추고 기다리면 다른 일을 전혀 할 수 없게 됩니다. 이 문제를 해결하는 것이 **비동기(Asynchronous) 프로그래밍**입니다.

식당에 비유하면, 손님이 주문하고 음식이 나올 때까지 서서 기다리면(동기), 그동안 새 손님을 받을 수 없습니다. 반면 주문을 받고 번호표를 주고 다른 손님을 받으면(비동기), 훨씬 효율적으로 운영됩니다.

---

## 코루틴이란?

코루틴(Coroutine)은 **실행을 일시 중단(suspend)하고 나중에 재개(resume)할 수 있는 함수**입니다.

스레드(Thread)와 비교하면:
- **스레드**: 무거운 별도의 실행 흐름. 생성과 전환 비용이 큼
- **코루틴**: 가벼운 실행 흐름. 하나의 스레드에서 수천 개 실행 가능

```
스레드 기반 (블로킹):
스레드1: [작업] ─── [DB 대기 중...........대기 중] ─── [결과 처리]
                          (스레드가 멈춰있어 낭비!)

코루틴 기반 (논블로킹):
스레드1: [작업A 시작] → [A 일시 중단] → [작업B 실행] → [A 재개] → [A 완료]
                              ↑               ↑
                        DB 기다리는 동안    다른 일 처리
```

---

## 기본 사용 — runBlocking과 launch

코루틴을 사용하려면 먼저 의존성을 추가해야 합니다.

```kotlin
// build.gradle.kts
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
```

```kotlin
import kotlinx.coroutines.*

// runBlocking: 코루틴 세계와 일반 코드를 연결하는 다리
// 내부 코루틴이 모두 끝날 때까지 현재 스레드를 블로킹
// (테스트나 main 함수에서 사용, 실제 앱 코드에는 자제)
fun main() = runBlocking {
    println("1. 시작")       // 즉시 실행
    delay(1000)              // 1초 대기 (스레드 블로킹 없음!)
    println("2. 완료")       // 1초 후 실행
}
// 출력:
// 1. 시작
// (1초 대기)
// 2. 완료
```

```kotlin
// launch: 결과값 없는 코루틴을 백그라운드에서 실행
fun main() = runBlocking {
    println("1. 메인 시작")

    val job = launch {            // 새 코루틴 시작
        println("3. 코루틴 시작")
        delay(1000)               // 1초 대기 (이 코루틴만 중단, 메인은 계속 실행)
        println("4. 코루틴 완료") // 1초 후 실행
    }

    println("2. 메인 계속 실행")  // launch는 즉시 반환하므로 이 줄이 먼저 출력됨
    job.join()                    // 코루틴이 끝날 때까지 대기
    println("5. 모두 완료")
}
// 출력:
// 1. 메인 시작
// 3. 코루틴 시작 (또는 2와 순서 바뀔 수 있음)
// 2. 메인 계속 실행
// (1초 대기)
// 4. 코루틴 완료
// 5. 모두 완료
```

---

## suspend 함수 — 중단 가능한 함수

`suspend` 키워드가 붙은 함수는 **코루틴 내부에서만 호출**할 수 있습니다. 일반 함수에서 suspend 함수를 호출하면 컴파일 에러가 납니다.

```kotlin
// suspend 함수 정의
suspend fun fetchUser(id: Int): String {
    delay(500)          // 네트워크 요청 시뮬레이션 (0.5초 대기)
    return "User#$id"   // 결과 반환
}

suspend fun fetchScore(userId: String): Int {
    delay(300)          // DB 조회 시뮬레이션 (0.3초 대기)
    return 95           // 점수 반환
}

// suspend 함수는 코루틴 안에서 호출
fun main() = runBlocking {
    // 순차 실행 — 총 800ms (500 + 300)
    val user = fetchUser(1)     // 0.5초 기다림
    val score = fetchScore(user) // 0.3초 기다림
    println("$user 점수: $score") // User#1 점수: 95
}
```

**중요한 점:** `delay()`는 코루틴을 일시 중단하지만, 스레드는 블로킹하지 않습니다. 대기하는 동안 같은 스레드에서 다른 코루틴이 실행될 수 있습니다.

---

## async / await — 병렬 실행으로 속도 향상

여러 작업이 서로 독립적이라면 동시에 실행하면 됩니다. `async`로 코루틴을 시작하고 `await()`로 결과를 받습니다.

```kotlin
import kotlinx.coroutines.*

suspend fun fetchUserInfo(): String {
    delay(1000)  // 1초 걸리는 사용자 정보 조회
    return "사용자: Alice"
}

suspend fun fetchOrderList(): List<String> {
    delay(1000)  // 1초 걸리는 주문 목록 조회
    return listOf("주문1", "주문2", "주문3")
}

fun main() = runBlocking {
    // ─── 순차 실행 — 총 2초 소요 ───
    val start1 = System.currentTimeMillis()
    val user1 = fetchUserInfo()   // 1초 대기
    val orders1 = fetchOrderList() // 1초 대기
    println("순차: ${System.currentTimeMillis() - start1}ms")  // ~2000ms

    // ─── 병렬 실행 — 총 1초 소요 ───
    val start2 = System.currentTimeMillis()
    val userDeferred = async { fetchUserInfo() }    // 즉시 시작
    val ordersDeferred = async { fetchOrderList() } // 즉시 시작 (동시에!)
    val user2 = userDeferred.await()    // 결과를 기다림
    val orders2 = ordersDeferred.await() // 결과를 기다림
    println("병렬: ${System.currentTimeMillis() - start2}ms")  // ~1000ms

    println("$user2, 주문 수: ${orders2.size}")
}
```

**비유:** 요리사 한 명이 국도 끓이고 반찬도 만들고 밥도 짓는다면, 하나씩 순서대로 하면 오래 걸립니다. 하지만 밥은 밥솥에 넣어두고, 국을 끓이면서 반찬도 함께 준비하면(병렬) 훨씬 빨리 완성됩니다.

---

## Dispatcher — 코루틴을 어느 스레드에서 실행할까?

Dispatcher는 코루틴이 실행될 스레드를 결정합니다. 작업의 특성에 맞는 Dispatcher를 선택하면 성능이 좋아집니다.

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    // Dispatchers.Default: CPU를 많이 쓰는 작업 (계산, 정렬, 암호화 등)
    launch(Dispatchers.Default) {
        val result = (1..1_000_000).sum()  // CPU 연산
        println("계산 결과: $result")
    }

    // Dispatchers.IO: I/O 작업 (네트워크, 파일, DB 등)
    // 스레드 수를 많이 유지하여 대기 시간을 낭비하지 않음
    launch(Dispatchers.IO) {
        // 실제로는 파일 읽기, HTTP 요청 등
        println("I/O 작업 실행 중: ${Thread.currentThread().name}")
    }

    // Dispatchers.Main: UI 스레드 업데이트 (Android에서 주로 사용)
    // (콘솔 앱에서는 사용 불가)

    // Dispatchers.Unconfined: 특별한 경우에만 사용 (일반적으로 비추천)
}
```

```kotlin
// withContext: 블록 내에서만 Dispatcher를 전환
suspend fun loadUserData(userId: Long): String {
    // IO 스레드에서 데이터 불러오기
    val rawData = withContext(Dispatchers.IO) {
        println("IO 스레드에서 실행: ${Thread.currentThread().name}")
        "raw data for $userId"  // 파일/네트워크에서 읽어온 데이터
    }

    // Default 스레드에서 CPU 집약적 가공
    val processed = withContext(Dispatchers.Default) {
        println("Default 스레드에서 실행: ${Thread.currentThread().name}")
        rawData.uppercase()  // 데이터 가공
    }

    return processed  // 원래 코루틴 컨텍스트로 복귀
}
```

---

## 구조화된 동시성 (Structured Concurrency)

코루틴은 **부모-자식 관계**를 가집니다. 부모 코루틴이 취소되면 자식도 모두 취소되고, 자식이 모두 끝나야 부모가 끝납니다. 이를 "구조화된 동시성"이라고 합니다.

덕분에 코루틴이 "누수"되는 것을 방지할 수 있습니다.

```kotlin
fun main() = runBlocking {
    // coroutineScope: 자식 코루틴이 모두 끝날 때까지 대기
    coroutineScope {
        launch { delay(1000); println("자식 1 완료") }
        launch { delay(500);  println("자식 2 완료") }
        println("자식 코루틴 시작됨")
    }
    // coroutineScope가 끝날 때까지 여기 도달하지 않음
    println("모든 자식 완료 후 실행")
}
// 자식 코루틴 시작됨
// 자식 2 완료 (0.5초 후)
// 자식 1 완료 (1초 후)
// 모든 자식 완료 후 실행
```

---

## 예외 처리

```kotlin
// launch에서 예외 처리 방법 1: CoroutineExceptionHandler
val handler = CoroutineExceptionHandler { context, exception ->
    println("에러 처리: ${exception.message}")
}

fun main() = runBlocking {
    // handler를 컨텍스트로 전달
    launch(handler) {
        throw RuntimeException("무언가 잘못됨!")
    }
    delay(100)  // 에러가 처리될 시간
}
// 에러 처리: 무언가 잘못됨!

// async에서 예외 처리: await() 호출 시 예외 발생
fun main2() = runBlocking {
    val deferred = async {
        delay(100)
        throw RuntimeException("async 에러")
    }
    try {
        deferred.await()  // 여기서 예외가 던져짐
    } catch (e: RuntimeException) {
        println("잡았다: ${e.message}")  // 잡았다: async 에러
    }
}
```

---

## Flow — 여러 값을 비동기로 받기

`suspend` 함수는 값 하나를 반환합니다. 여러 값을 연속으로 받고 싶다면 `Flow`를 사용합니다. 마치 수도꼭지에서 물이 흘러나오듯, 값이 흘러나옵니다.

```kotlin
import kotlinx.coroutines.flow.*

// Flow 생성 — emit으로 값 방출
fun numbers(): Flow<Int> = flow {
    println("Flow 시작")
    for (i in 1..5) {
        emit(i)        // 값 방출
        delay(500)     // 0.5초 간격
    }
    println("Flow 종료")
}

fun main() = runBlocking {
    numbers()
        .filter { it % 2 != 0 }   // 홀수만
        .map { "값: $it" }         // 문자열로 변환
        .collect { println(it) }  // 각 값을 수집 (최종 연산)
}
// Flow 시작
// 값: 1
// 값: 3
// 값: 5
// Flow 종료
```

```kotlin
// 실전 예제: 검색 자동완성
fun searchSuggestions(query: String): Flow<List<String>> = flow {
    delay(300)  // 타이핑 후 잠시 기다림
    val results = listOf("$query apple", "$query banana", "$query cherry")
    emit(results)  // 검색 결과 방출
}

fun main() = runBlocking {
    searchSuggestions("kotlin")
        .collect { suggestions ->
            println("검색 결과: $suggestions")
        }
}
```

**Flow의 특징:** Flow는 **cold** 스트림입니다. `collect`를 호출하기 전까지는 아무것도 실행되지 않습니다. 각 `collect` 호출마다 처음부터 다시 실행됩니다.

---

## 흔한 실수들

```kotlin
// ❌ 실수 1: 일반 함수에서 suspend 함수 호출
fun loadData() {
    // val user = fetchUser(1)  // ❌ 컴파일 에러
    // suspend 함수는 코루틴 또는 다른 suspend 함수에서만 호출 가능
}
// ✅ 올바른 방법
fun loadData() {
    CoroutineScope(Dispatchers.IO).launch {
        val user = fetchUser(1)  // ✅ 코루틴 안에서 호출
    }
}

// ❌ 실수 2: UI 스레드에서 블로킹 작업
// Android에서 이렇게 하면 앱이 멈춤 (ANR)
fun onButtonClick() {
    val data = runBlocking { fetchUser(1) }  // ❌ UI 스레드 블로킹
}
// ✅ 올바른 방법: viewModelScope나 lifecycleScope 사용 (Android)

// ❌ 실수 3: delay 대신 Thread.sleep 사용
launch {
    Thread.sleep(1000)  // ❌ 스레드를 블로킹함 — 코루틴의 이점이 사라짐
    delay(1000)         // ✅ 코루틴만 중단, 스레드는 다른 코루틴 실행 가능
}

// ❌ 실수 4: async로 시작하고 await을 나중에 호출
val deferred = async { riskyOperation() }
// ... 다른 코드 실행 ...
deferred.await()  // ⚠️ 예외가 여기서 나오지만 너무 늦게 처리될 수 있음
// ✅ 예외 처리를 async 시작 시점 가까이에 두거나 try-catch로 감쌀 것
```

---

## 전체 정리

| 개념 | 설명 | 사용 예 |
|------|------|---------|
| `runBlocking` | 코루틴 진입점 (테스트/main) | `fun main() = runBlocking { }` |
| `launch` | 결과 없는 코루틴 시작 | `launch { delay(1000) }` |
| `async` | 결과 있는 코루틴 시작 | `val d = async { fetchData() }` |
| `await()` | async 결과 기다리기 | `d.await()` |
| `suspend` | 중단 가능한 함수 선언 | `suspend fun fetch()` |
| `delay()` | 코루틴 일시 중단 | `delay(1000)` |
| `withContext` | Dispatcher 일시 전환 | `withContext(Dispatchers.IO) { }` |
| `Flow` | 여러 값 비동기 스트림 | `flow { emit(1); emit(2) }` |
| `collect` | Flow 값 수집 | `.collect { println(it) }` |
| `Dispatchers.IO` | I/O 스레드풀 | 네트워크, 파일, DB |
| `Dispatchers.Default` | CPU 스레드풀 | 계산, 정렬 |
