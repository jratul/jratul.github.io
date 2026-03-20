---
title: "멀티스레딩"
order: 9
---

## 스레드란

프로세스 내에서 독립적으로 실행되는 흐름입니다. Java 애플리케이션은 main 스레드 하나로 시작하고, 필요에 따라 추가 스레드를 만들 수 있습니다.

```
프로세스 (JVM)
├── main 스레드
├── 스레드 1  ← 독립 실행
└── 스레드 2  ← 독립 실행
```

## 스레드 생성

### Thread 상속

```java
class MyThread extends Thread {
    @Override
    public void run() {
        System.out.println("실행 중: " + Thread.currentThread().getName());
    }
}

MyThread t = new MyThread();
t.start();  // 새 스레드에서 run() 실행
            // t.run() 은 현재 스레드에서 실행 (스레드 아님)
```

### Runnable 구현 (권장)

```java
Runnable task = () -> {
    System.out.println("실행 중: " + Thread.currentThread().getName());
};

Thread t = new Thread(task);
t.start();
```

## 스레드 상태

```
NEW → RUNNABLE → (BLOCKED / WAITING / TIMED_WAITING) → TERMINATED
```

```java
Thread t = new Thread(() -> {
    try {
        Thread.sleep(1000);  // TIMED_WAITING 상태
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
});

System.out.println(t.getState());  // NEW
t.start();
System.out.println(t.getState());  // RUNNABLE 또는 TIMED_WAITING
t.join();                          // t가 끝날 때까지 현재 스레드 대기
System.out.println(t.getState());  // TERMINATED
```

## 동기화 문제

여러 스레드가 공유 자원에 동시에 접근하면 데이터가 깨질 수 있습니다.

```java
class Counter {
    private int count = 0;

    public void increment() {
        count++;  // 읽기 → 더하기 → 쓰기 (3단계, 원자적이지 않음)
    }

    public int getCount() { return count; }
}

Counter counter = new Counter();

// 10개 스레드가 각각 1000번 increment → 기대값 10000
// 실제 결과는 매번 다름 (경쟁 조건, Race Condition)
```

## synchronized

한 번에 하나의 스레드만 실행되도록 잠급니다.

```java
class Counter {
    private int count = 0;

    public synchronized void increment() {  // 메서드 잠금
        count++;
    }

    public int getCount() {
        return count;
    }
}

// 블록 단위로도 가능
public void increment() {
    synchronized (this) {  // this 객체를 락으로 사용
        count++;
    }
}
```

`synchronized`는 간단하지만 성능에 영향을 줄 수 있습니다.

## volatile

변수 값을 CPU 캐시가 아닌 메인 메모리에서 직접 읽고 씁니다.

```java
class Worker {
    private volatile boolean running = true;

    public void run() {
        while (running) {  // volatile 없으면 변경을 못 볼 수 있음
            // 작업 수행
        }
    }

    public void stop() {
        running = false;
    }
}
```

## Executor와 스레드 풀

매번 스레드를 생성하는 것은 비용이 큽니다. 스레드 풀을 사용해 재사용합니다.

```java
// 고정 크기 스레드 풀
ExecutorService executor = Executors.newFixedThreadPool(4);

// 작업 제출
executor.submit(() -> System.out.println("작업 1"));
executor.submit(() -> System.out.println("작업 2"));

// 종료 (새 작업 거부, 기존 작업은 완료)
executor.shutdown();

// 결과값이 있는 작업
ExecutorService exec = Executors.newFixedThreadPool(2);

Future<Integer> future = exec.submit(() -> {
    Thread.sleep(1000);
    return 42;
});

System.out.println("다른 작업 수행 중...");
int result = future.get();  // 결과가 나올 때까지 대기
System.out.println("결과: " + result);  // 42

exec.shutdown();
```

## Atomic 클래스

`synchronized` 없이 원자적 연산을 제공합니다.

```java
AtomicInteger count = new AtomicInteger(0);

// 원자적으로 증가
count.incrementAndGet();
count.addAndGet(5);

// CAS (Compare-And-Swap)
count.compareAndSet(5, 10);  // 값이 5이면 10으로 변경

// 여러 스레드에서 안전하게 사용
ExecutorService exec = Executors.newFixedThreadPool(10);
for (int i = 0; i < 1000; i++) {
    exec.submit(count::incrementAndGet);
}
exec.shutdown();
exec.awaitTermination(5, TimeUnit.SECONDS);
System.out.println(count.get());  // 항상 1000
```

## CompletableFuture

비동기 작업을 체이닝할 수 있습니다.

```java
CompletableFuture<String> future = CompletableFuture
    .supplyAsync(() -> {
        // 비동기로 실행
        return "hello";
    })
    .thenApply(s -> s.toUpperCase())  // "HELLO"
    .thenApply(s -> s + "!")          // "HELLO!"
    .exceptionally(e -> "오류: " + e.getMessage());

System.out.println(future.get());  // HELLO!

// 두 작업 병렬 실행 후 결합
CompletableFuture<String> f1 = CompletableFuture.supplyAsync(() -> "Hello");
CompletableFuture<String> f2 = CompletableFuture.supplyAsync(() -> "World");

CompletableFuture<String> combined = f1.thenCombine(f2, (a, b) -> a + " " + b);
System.out.println(combined.get());  // Hello World
```

## 주요 주의사항

```java
// ❌ 스레드 생성 후 run() 직접 호출 → 새 스레드 아님
Thread t = new Thread(task);
t.run();   // 현재 스레드에서 실행됨
t.start(); // 새 스레드에서 실행됨 ✅

// ❌ InterruptedException 무시
try {
    Thread.sleep(1000);
} catch (InterruptedException e) {
    // 아무것도 안 하면 인터럽트 신호 소실
}

// ✅ 인터럽트 상태 복원
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();
}

// ❌ 스레드 풀 shutdown 없이 종료
ExecutorService exec = Executors.newFixedThreadPool(4);
exec.submit(task);
// shutdown 없으면 JVM이 종료되지 않을 수 있음

// ✅
exec.shutdown();
```
