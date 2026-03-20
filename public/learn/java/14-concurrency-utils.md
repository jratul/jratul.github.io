---
title: "동시성 유틸리티"
order: 14
---

## java.util.concurrent

챕터 9에서 기본 스레드 생성과 `synchronized`를 다뤘습니다. 이 챕터는 실무에서 쓰는 고수준 동시성 도구를 다룹니다.

## Lock 인터페이스

`synchronized`보다 세밀한 제어가 가능합니다.

```java
import java.util.concurrent.locks.*;

ReentrantLock lock = new ReentrantLock();

// 기본 사용
lock.lock();
try {
    // 임계 구역
} finally {
    lock.unlock();  // 반드시 finally에서 해제
}

// 시도 후 포기 (tryLock)
if (lock.tryLock(1, TimeUnit.SECONDS)) {
    try {
        // 1초 안에 락을 얻으면 실행
    } finally {
        lock.unlock();
    }
} else {
    // 락을 못 얻었을 때 처리
}
```

### ReadWriteLock

읽기는 동시에, 쓰기는 단독으로 허용합니다.

```java
ReadWriteLock rwLock = new ReentrantReadWriteLock();
Lock readLock  = rwLock.readLock();
Lock writeLock = rwLock.writeLock();

// 읽기 (여러 스레드 동시 가능)
readLock.lock();
try {
    return data;
} finally {
    readLock.unlock();
}

// 쓰기 (단독 접근)
writeLock.lock();
try {
    data = newData;
} finally {
    writeLock.unlock();
}
```

읽기가 쓰기보다 훨씬 많은 캐시 구현에 적합합니다.

## 동시성 컬렉션

일반 컬렉션은 멀티스레드 환경에서 안전하지 않습니다.

```java
// ❌ 동시 수정 → ConcurrentModificationException
Map<String, Integer> map = new HashMap<>();
// 여러 스레드에서 동시에 put/get하면 데이터 깨짐

// ✅ ConcurrentHashMap
ConcurrentHashMap<String, Integer> cmap = new ConcurrentHashMap<>();
cmap.put("a", 1);
cmap.get("a");

// 원자적 연산
cmap.putIfAbsent("b", 2);
cmap.computeIfAbsent("c", k -> k.length());
cmap.merge("a", 1, Integer::sum);  // "a"의 값에 1을 더함

// ✅ CopyOnWriteArrayList (쓰기 시 전체 복사, 읽기 많을 때 적합)
CopyOnWriteArrayList<String> list = new CopyOnWriteArrayList<>();
list.add("hello");

// ✅ ConcurrentLinkedQueue (비블로킹 큐)
ConcurrentLinkedQueue<Task> queue = new ConcurrentLinkedQueue<>();
queue.offer(task);
Task t = queue.poll();  // 없으면 null
```

## BlockingQueue

생산자-소비자 패턴에 적합한 큐입니다. 빈 큐에서 꺼내거나 꽉 찬 큐에 넣으면 대기합니다.

```java
BlockingQueue<String> queue = new LinkedBlockingQueue<>(10);

// 생산자 스레드
Thread producer = new Thread(() -> {
    try {
        queue.put("item1");  // 꽉 차면 대기
        queue.put("item2");
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
});

// 소비자 스레드
Thread consumer = new Thread(() -> {
    try {
        String item = queue.take();  // 비어 있으면 대기
        System.out.println("처리: " + item);
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
});
```

## 동기화 보조 도구

### CountDownLatch

N개의 작업이 완료될 때까지 대기합니다.

```java
int workerCount = 5;
CountDownLatch latch = new CountDownLatch(workerCount);

for (int i = 0; i < workerCount; i++) {
    final int id = i;
    new Thread(() -> {
        System.out.println("Worker " + id + " 완료");
        latch.countDown();  // 카운트 1 감소
    }).start();
}

latch.await();  // 카운트가 0이 될 때까지 대기
System.out.println("모든 작업 완료");
```

### CyclicBarrier

N개 스레드가 모두 특정 지점에 도달할 때까지 대기하고, 이후 일제히 진행합니다. CountDownLatch와 달리 재사용 가능합니다.

```java
CyclicBarrier barrier = new CyclicBarrier(3, () -> {
    System.out.println("모든 스레드 준비 완료, 동시 출발!");
});

for (int i = 0; i < 3; i++) {
    final int id = i;
    new Thread(() -> {
        System.out.println("스레드 " + id + " 준비");
        try {
            barrier.await();  // 3개 스레드가 모두 도달할 때까지 대기
            System.out.println("스레드 " + id + " 실행");
        } catch (Exception e) { ... }
    }).start();
}
```

### Semaphore

동시에 접근할 수 있는 스레드 수를 제한합니다.

```java
// 동시에 최대 3개 스레드만 허용
Semaphore semaphore = new Semaphore(3);

Runnable task = () -> {
    try {
        semaphore.acquire();  // 허가 획득 (없으면 대기)
        System.out.println("작업 중: " + Thread.currentThread().getName());
        Thread.sleep(1000);
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    } finally {
        semaphore.release();  // 허가 반납
    }
};

// DB 커넥션 풀, API rate limiting 등에 활용
```

## ForkJoinPool

분할 정복 방식으로 작업을 병렬 처리합니다.

```java
class SumTask extends RecursiveTask<Long> {
    private final long[] arr;
    private final int start, end;
    private static final int THRESHOLD = 1000;

    SumTask(long[] arr, int start, int end) {
        this.arr = arr; this.start = start; this.end = end;
    }

    @Override
    protected Long compute() {
        if (end - start <= THRESHOLD) {
            // 작은 구간은 직접 계산
            long sum = 0;
            for (int i = start; i < end; i++) sum += arr[i];
            return sum;
        }
        // 두 개로 분할
        int mid = (start + end) / 2;
        SumTask left  = new SumTask(arr, start, mid);
        SumTask right = new SumTask(arr, mid, end);
        left.fork();                  // 비동기 실행
        return right.compute() + left.join();  // 결과 합산
    }
}

long[] data = new long[1_000_000];
ForkJoinPool pool = ForkJoinPool.commonPool();
long total = pool.invoke(new SumTask(data, 0, data.length));
```

`parallelStream()`은 내부적으로 ForkJoinPool을 사용합니다.

## 스레드 안전한 싱글톤

```java
// ✅ Enum 싱글톤 (가장 안전)
enum Singleton {
    INSTANCE;
    public void doSomething() { ... }
}

// ✅ 초기화-온-디맨드 홀더 (지연 초기화, 스레드 안전)
class Singleton {
    private Singleton() {}

    private static class Holder {
        private static final Singleton INSTANCE = new Singleton();
    }

    public static Singleton getInstance() {
        return Holder.INSTANCE;
    }
}

// ✅ double-checked locking (volatile 필수)
class Singleton {
    private static volatile Singleton instance;

    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

## ThreadLocal

스레드마다 독립적인 변수를 유지합니다. 스레드 컨텍스트 정보 저장에 자주 씁니다.

```java
ThreadLocal<String> userContext = new ThreadLocal<>();

// 스레드 A
userContext.set("user-alice");
String user = userContext.get();  // "user-alice"

// 스레드 B (독립된 공간)
userContext.set("user-bob");
String user = userContext.get();  // "user-bob"

// 반드시 사용 후 제거 (스레드 풀 환경에서 메모리 누수 방지)
userContext.remove();
```

Spring의 `SecurityContextHolder`가 ThreadLocal로 인증 정보를 관리합니다.
