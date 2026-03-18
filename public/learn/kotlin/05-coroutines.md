---
title: "코루틴 기초"
order: 5
---

## 코루틴이란

코루틴은 **중단(suspend)하고 재개(resume)할 수 있는 함수**입니다. 스레드를 블로킹하지 않고 비동기 작업을 동기 코드처럼 작성할 수 있습니다.

```
스레드 기반 비동기:
  Thread 1 ─── [작업] ─── [대기 중(블로킹)] ─── [결과 처리]
                                ↑
                         다른 작업 불가

코루틴 기반 비동기:
  Thread 1 ─── [작업] ─── [중단] ─── [다른 코루틴 실행] ─── [재개] ─── [결과 처리]
```

## 기본 사용

```kotlin
import kotlinx.coroutines.*

// runBlocking: 코루틴 환경 시작 (테스트, main 함수에서 사용)
fun main() = runBlocking {
    println("시작")
    delay(1000)  // 1초 대기 (스레드 블로킹 없음)
    println("완료")
}

// launch: 결과 없는 코루틴 실행
fun main() = runBlocking {
    val job = launch {
        delay(1000)
        println("코루틴 완료")
    }
    println("메인 계속 실행")
    job.join()  // 코루틴이 끝날 때까지 대기
}
// 출력: 메인 계속 실행 → (1초 후) 코루틴 완료
```

## suspend 함수

`suspend` 키워드가 붙은 함수는 코루틴 내에서만 호출할 수 있습니다.

```kotlin
suspend fun fetchUser(id: Int): String {
    delay(500)  // 네트워크 요청 시뮬레이션
    return "User#$id"
}

suspend fun fetchScore(userId: String): Int {
    delay(300)
    return 95
}

fun main() = runBlocking {
    // 순차 실행 (총 800ms)
    val user = fetchUser(1)
    val score = fetchScore(user)
    println("$user: $score")
}
```

## async / await: 병렬 실행

```kotlin
fun main() = runBlocking {
    // 순차 실행: 500ms + 300ms = 800ms
    val user1 = fetchUser(1)
    val user2 = fetchUser(2)

    // 병렬 실행: max(500ms, 500ms) = 500ms
    val deferred1 = async { fetchUser(1) }
    val deferred2 = async { fetchUser(2) }
    val u1 = deferred1.await()
    val u2 = deferred2.await()
    println("$u1, $u2")
}
```

## CoroutineScope와 Dispatcher

### Dispatcher

코루틴이 실행될 스레드를 결정합니다.

```kotlin
// Dispatchers.Default: CPU 연산 (스레드풀)
// Dispatchers.IO: 파일/네트워크 I/O (스레드풀, 더 많은 스레드)
// Dispatchers.Main: UI 스레드 (Android)

launch(Dispatchers.IO) {
    val data = readFile("data.txt")  // I/O 작업
}

launch(Dispatchers.Default) {
    val result = heavyCalculation()  // CPU 연산
}
```

### withContext: Dispatcher 전환

```kotlin
suspend fun loadAndProcess(): String {
    val raw = withContext(Dispatchers.IO) {
        // I/O 스레드에서 실행
        readFile("data.txt")
    }
    // 원래 Dispatcher로 복귀
    return process(raw)
}
```

## 예외 처리

```kotlin
// launch: try-catch 또는 CoroutineExceptionHandler
val handler = CoroutineExceptionHandler { _, e ->
    println("에러 처리: ${e.message}")
}

launch(handler) {
    throw RuntimeException("오류 발생")
}

// async: await()에서 예외 발생
val deferred = async {
    throw RuntimeException("async 오류")
}
try {
    deferred.await()
} catch (e: RuntimeException) {
    println("처리: ${e.message}")
}
```

## Flow: 여러 값을 비동기로

```kotlin
import kotlinx.coroutines.flow.*

fun countDown(): Flow<Int> = flow {
    for (i in 5 downTo 1) {
        emit(i)      // 값 방출
        delay(1000)
    }
}

fun main() = runBlocking {
    countDown()
        .filter { it % 2 != 0 }
        .map { "카운트: $it" }
        .collect { println(it) }
}
// 카운트: 5
// 카운트: 3
// 카운트: 1
```
