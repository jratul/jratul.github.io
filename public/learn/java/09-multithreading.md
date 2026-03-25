---
title: "멀티스레딩"
order: 9
---

우리가 사용하는 앱들은 동시에 여러 일을 합니다. 음악을 들으면서 화면을 스크롤하고, 파일을 다운로드하면서 다른 작업을 합니다. 이것이 가능한 이유가 **멀티스레딩(Multi-threading)** 입니다.

**프로세스(Process)**는 실행 중인 프로그램입니다. **스레드(Thread)**는 그 안에서 독립적으로 실행되는 흐름입니다. 주방을 프로세스라 하면, 요리사 한 명이 스레드입니다. 요리사가 여럿이면 여러 요리를 동시에 만들 수 있습니다.

---

## 스레드 생성 방법

Java 프로그램은 `main` 스레드 하나로 시작합니다. 필요하면 추가 스레드를 만들 수 있습니다.

### 방법 1: Thread 클래스 상속

```java
class MyThread extends Thread {
    private String taskName;

    public MyThread(String taskName) {
        this.taskName = taskName;
    }

    @Override
    public void run() {
        // 이 메서드가 새 스레드에서 실행됨
        for (int i = 1; i <= 5; i++) {
            System.out.println(taskName + " - " + i + "번째");
            try {
                Thread.sleep(100);  // 0.1초 대기
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }
}

MyThread t1 = new MyThread("작업A");
MyThread t2 = new MyThread("작업B");

t1.start();  // 새 스레드에서 run() 실행 → 현재 스레드는 계속 진행
t2.start();  // 또 다른 새 스레드에서 run() 실행

// 두 스레드가 동시에 실행되므로 출력 순서가 뒤섞임
// 작업A - 1번째
// 작업B - 1번째
// 작업A - 2번째
// ...
```

### 방법 2: Runnable 구현 (권장)

Thread 상속보다 이 방법이 더 유연합니다. 이미 다른 클래스를 상속하고 있는 경우에도 사용할 수 있습니다.

```java
// 람다로 간단하게 표현
Runnable task = () -> {
    for (int i = 1; i <= 3; i++) {
        System.out.println(Thread.currentThread().getName() + " - " + i);
    }
};

Thread t1 = new Thread(task, "스레드-1");  // 스레드 이름 지정
Thread t2 = new Thread(task, "스레드-2");

t1.start();
t2.start();
```

### start()와 run()의 차이 — 중요!

```java
Runnable task = () -> System.out.println("실행: " + Thread.currentThread().getName());

Thread t = new Thread(task);

t.run();   // ❌ 새 스레드 생성 안 됨! 현재(main) 스레드에서 직접 실행
           //    출력: 실행: main

t.start(); // ✅ 새 스레드 생성 후 그 스레드에서 실행
           //    출력: 실행: Thread-0
```

---

## 스레드 상태

```
NEW  →  RUNNABLE  →  TERMINATED
            ↕
    BLOCKED / WAITING / TIMED_WAITING
```

```java
Thread t = new Thread(() -> {
    try {
        Thread.sleep(2000);  // 2초 대기 → TIMED_WAITING 상태
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
});

System.out.println(t.getState());  // NEW (아직 시작 안 됨)
t.start();
Thread.sleep(100);  // 잠깐 기다림
System.out.println(t.getState());  // TIMED_WAITING (sleep 중)

t.join();  // t 스레드가 완전히 끝날 때까지 현재 스레드 대기
System.out.println(t.getState());  // TERMINATED (종료)
```

`join()`을 쓰면 다른 스레드의 완료를 기다릴 수 있습니다.

```java
Thread worker = new Thread(() -> {
    System.out.println("무거운 계산 시작...");
    // 시간이 걸리는 작업
    System.out.println("계산 완료!");
});

worker.start();
worker.join();  // worker 스레드가 끝날 때까지 main 스레드 대기
System.out.println("이제 결과를 사용할 수 있음");
```

---

## 동기화 문제 — Race Condition

여러 스레드가 **같은 데이터를 동시에 수정**하면 예상치 못한 결과가 나옵니다.

```java
class Counter {
    private int count = 0;

    public void increment() {
        count++;  // 사실은 3단계: 읽기 → 더하기 → 쓰기
        // 두 스레드가 동시에 읽으면 둘 다 같은 값을 읽고
        // 둘 다 +1 해서 쓰므로 1번 증가한 것처럼 보임
    }

    public int getCount() { return count; }
}

Counter counter = new Counter();

// 10개 스레드가 각각 1000번 증가 → 기대값: 10000
ExecutorService exec = Executors.newFixedThreadPool(10);
for (int i = 0; i < 10000; i++) {
    exec.submit(() -> counter.increment());
}
exec.shutdown();
exec.awaitTermination(5, TimeUnit.SECONDS);

System.out.println(counter.getCount());  // 9852 (매번 다름, 10000이 아님!)
```

---

## synchronized — 한 번에 하나씩

`synchronized`는 **락(자물쇠)** 과 같습니다. 한 스레드가 들어가면 다른 스레드는 나올 때까지 기다립니다.

```java
class Counter {
    private int count = 0;

    // 메서드 전체를 동기화
    public synchronized void increment() {
        count++;  // 한 번에 하나의 스레드만 실행
    }

    // 특정 블록만 동기화 (더 세밀한 제어)
    public void incrementBlock() {
        // 동기화 불필요한 코드 ...
        synchronized (this) {  // this 객체를 락으로 사용
            count++;
        }
        // 동기화 불필요한 코드 ...
    }

    public int getCount() { return count; }
}

// 이제 항상 정확히 10000
```

`synchronized`의 단점: 락을 기다리는 동안 다른 스레드들이 대기하므로 성능이 떨어질 수 있습니다.

---

## volatile — 캐시 문제 해결

CPU는 성능을 위해 메모리 값을 **캐시**에 복사해두고 씁니다. 멀티스레드 환경에서 한 스레드가 값을 바꿔도 다른 스레드는 캐시된 옛날 값을 볼 수 있습니다.

`volatile`은 "이 변수는 항상 메인 메모리에서 직접 읽고 써라"고 지시합니다.

```java
class Worker {
    // volatile 없으면: stop()이 호출되어도 run()에서 변경을 감지 못할 수 있음
    private volatile boolean running = true;

    public void run() {
        while (running) {  // volatile → 항상 최신 값 확인
            System.out.print(".");
            try { Thread.sleep(100); } catch (InterruptedException e) { break; }
        }
        System.out.println("작업 종료");
    }

    public void stop() {
        running = false;  // 다른 스레드에서 이 변경이 즉시 반영됨
    }
}

Worker worker = new Worker();
Thread workerThread = new Thread(worker::run);
workerThread.start();

Thread.sleep(500);   // 0.5초 후
worker.stop();       // 작업 중단 신호
```

`volatile`은 단순 플래그 변수에는 충분하지만, `count++` 같은 복합 연산에는 부족합니다.

---

## 스레드 풀 (ExecutorService)

스레드를 매번 새로 만들면 비용이 큽니다. 스레드 풀은 미리 스레드를 만들어두고 재사용합니다.

```java
// 4개 스레드를 미리 만들어둔 풀
ExecutorService executor = Executors.newFixedThreadPool(4);

// 작업 제출 (비동기 실행)
for (int i = 1; i <= 10; i++) {
    final int taskId = i;
    executor.submit(() -> {
        System.out.println("작업 " + taskId + " 실행: " + Thread.currentThread().getName());
        try { Thread.sleep(100); } catch (InterruptedException e) { /* ... */ }
    });
}

// 새 작업 받지 않고 기존 작업은 완료
executor.shutdown();
executor.awaitTermination(5, TimeUnit.SECONDS);  // 최대 5초 대기
System.out.println("모든 작업 완료");
```

### 결과값이 있는 작업 — Future

```java
ExecutorService exec = Executors.newFixedThreadPool(2);

// Callable: 결과값을 반환하는 작업 (Runnable은 void)
Future<Integer> future = exec.submit(() -> {
    System.out.println("계산 시작...");
    Thread.sleep(2000);  // 오래 걸리는 작업
    return 42;           // 결과 반환
});

System.out.println("다른 작업 수행 중...");  // 비동기로 진행
int result = future.get();  // 결과 준비될 때까지 대기 (블로킹)
System.out.println("결과: " + result);  // 결과: 42

exec.shutdown();
```

---

## Atomic 클래스 — 동기화 없는 원자적 연산

`synchronized` 없이도 스레드 안전한 연산을 제공합니다. 단순 카운터에는 `AtomicInteger`가 더 효율적입니다.

```java
AtomicInteger count = new AtomicInteger(0);

// 원자적 증가 (읽기-더하기-쓰기가 한 번에)
int newValue = count.incrementAndGet();  // ++count와 동일, 스레드 안전
int prev     = count.getAndIncrement();  // count++와 동일

count.addAndGet(5);   // count += 5

// CAS (Compare-And-Swap): 기대값과 같을 때만 변경
boolean changed = count.compareAndSet(5, 10);  // 5이면 10으로 변경
System.out.println(changed + ", " + count.get());  // true, 10

// 실제로 10000이 보장됨
ExecutorService exec = Executors.newFixedThreadPool(10);
AtomicInteger safeCounter = new AtomicInteger(0);

for (int i = 0; i < 10000; i++) {
    exec.submit(safeCounter::incrementAndGet);
}
exec.shutdown();
exec.awaitTermination(5, TimeUnit.SECONDS);
System.out.println(safeCounter.get());  // 항상 정확히 10000
```

---

## CompletableFuture — 비동기 작업 체이닝

비동기 작업의 결과를 가지고 추가 작업을 이어서 처리하는 현대적인 방법입니다.

```java
// 비동기 작업 시작
CompletableFuture<String> future = CompletableFuture
    .supplyAsync(() -> {
        // 별도 스레드에서 실행
        System.out.println("DB 조회 중...");
        return "Alice";  // 사용자 이름 조회
    })
    .thenApply(name -> name.toUpperCase())     // 결과 변환: "ALICE"
    .thenApply(name -> "안녕하세요, " + name)  // 추가 변환
    .exceptionally(e -> "오류 발생: " + e.getMessage()); // 예외 처리

System.out.println("다른 작업 진행 중...");
System.out.println(future.get());  // 안녕하세요, ALICE

// 두 비동기 작업을 병렬로 실행하고 결합
CompletableFuture<String> user    = CompletableFuture.supplyAsync(() -> "Alice");
CompletableFuture<Integer> score  = CompletableFuture.supplyAsync(() -> 95);

CompletableFuture<String> combined = user.thenCombine(score,
    (name, s) -> name + "님의 점수: " + s);

System.out.println(combined.get());  // Alice님의 점수: 95

// 여러 작업 중 하나라도 완료되면 처리
CompletableFuture<String> fast   = CompletableFuture.supplyAsync(() -> "빠른 서버");
CompletableFuture<String> slow   = CompletableFuture.supplyAsync(() -> {
    Thread.sleep(3000);
    return "느린 서버";
});
String first = CompletableFuture.anyOf(fast, slow).thenApply(Object::toString).get();
System.out.println(first);  // 빠른 서버
```

---

## 자주 하는 실수들

```java
// ❌ 실수 1: run() 직접 호출 (새 스레드 아님)
Thread t = new Thread(task);
t.run();   // main 스레드에서 직접 실행 → 멀티스레딩 아님!
t.start(); // ✅ 새 스레드에서 실행

// ❌ 실수 2: InterruptedException 무시
try {
    Thread.sleep(1000);
} catch (InterruptedException e) {
    // 아무것도 안 하면 인터럽트 신호 소실 → 스레드 중단 불가
}

// ✅ 인터럽트 상태 복원
try {
    Thread.sleep(1000);
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();  // 인터럽트 상태 복원
    return;  // 또는 루프 탈출
}

// ❌ 실수 3: ExecutorService shutdown 누락
ExecutorService exec = Executors.newFixedThreadPool(4);
exec.submit(task);
// shutdown 없으면 JVM이 종료되지 않음! (스레드들이 계속 대기)

// ✅ 반드시 shutdown
exec.shutdown();
// 또는 try-finally로 보장
try {
    exec.submit(task);
} finally {
    exec.shutdown();
}

// ❌ 실수 4: 공유 리스트를 여러 스레드에서 수정
List<String> shared = new ArrayList<>();
// 여러 스레드에서 shared.add(...) → ConcurrentModificationException

// ✅ 스레드 안전한 컬렉션 사용
List<String> safe = Collections.synchronizedList(new ArrayList<>());
// 또는
CopyOnWriteArrayList<String> cowList = new CopyOnWriteArrayList<>();
```
