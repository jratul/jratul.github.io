---
title: "동시성 유틸리티"
order: 14
---

## 왜 고수준 동시성 도구가 필요한가

챕터 9에서 `Thread`를 직접 만들고 `synchronized`로 동기화했습니다. 그런데 실무에서는 더 복잡한 상황이 생깁니다.

- "락을 얻을 때까지 1초만 기다리다가 포기하고 싶다"
- "읽기는 여러 스레드가 동시에 해도 되지만, 쓰기는 혼자만 해야 한다"
- "10개의 작업이 모두 끝나야 다음 단계로 진행해야 한다"

`java.util.concurrent` 패키지는 이런 상황을 위한 고수준 도구들을 제공합니다.

---

## Lock 인터페이스 — synchronized의 업그레이드

`synchronized`는 블록을 벗어나면 자동으로 해제되지만, 중간에 "포기"하거나 "기다리다가 취소"할 수 없습니다. `Lock` 인터페이스는 더 세밀한 제어를 가능하게 합니다.

```java
import java.util.concurrent.locks.*;

// ReentrantLock: synchronized와 비슷하지만 더 유연
ReentrantLock lock = new ReentrantLock();

// 기본 사용 — synchronized 블록과 동일한 효과
lock.lock();  // 락 획득 (없으면 대기)
try {
    // 임계 구역 — 한 번에 하나의 스레드만
    balance += amount;
} finally {
    lock.unlock();  // 반드시 finally에서 해제! (예외 발생해도 항상 실행)
}
```

```java
// tryLock: 기다리다가 포기 가능
if (lock.tryLock(1, TimeUnit.SECONDS)) {  // 최대 1초 대기
    try {
        processOrder();
    } finally {
        lock.unlock();
    }
} else {
    // 1초 안에 락을 못 얻음 → 다른 처리
    System.out.println("서버가 바빠서 나중에 다시 시도해주세요.");
}

// 초보자 실수: finally에서 unlock 안 하면 데드락 발생!
lock.lock();
processOrder();  // 여기서 예외 발생하면?
lock.unlock();   // ❌ 실행 안 됨 → 락이 영원히 잠김
```

---

### ReadWriteLock — 읽기는 공유, 쓰기는 독점

캐시처럼 **읽기가 쓰기보다 훨씬 많은** 상황에서 성능을 높입니다. 여러 스레드가 동시에 읽을 수 있되, 쓸 때는 혼자만 접근합니다.

마치 도서관 열람실처럼 — 여러 사람이 동시에 책을 읽을 수 있지만, 책 내용을 수정할 때는 혼자만 접근해야 합니다.

```java
public class UserCache {

    private final ReadWriteLock rwLock = new ReentrantReadWriteLock();
    private final Lock readLock  = rwLock.readLock();   // 여러 스레드 동시 획득 가능
    private final Lock writeLock = rwLock.writeLock();  // 하나의 스레드만 획득 가능
    private final Map<Long, User> cache = new HashMap<>();

    // 읽기: 여러 스레드가 동시에 실행 가능
    public User get(Long id) {
        readLock.lock();
        try {
            return cache.get(id);
        } finally {
            readLock.unlock();
        }
    }

    // 쓰기: 단 하나의 스레드만 실행 가능 (읽기 중인 스레드도 모두 대기)
    public void put(Long id, User user) {
        writeLock.lock();
        try {
            cache.put(id, user);
        } finally {
            writeLock.unlock();
        }
    }

    public void invalidate(Long id) {
        writeLock.lock();
        try {
            cache.remove(id);
        } finally {
            writeLock.unlock();
        }
    }
}
```

---

## 동시성 컬렉션

일반 `HashMap`, `ArrayList`는 멀티스레드 환경에서 **데이터가 망가질 수 있습니다**.

```java
// ❌ HashMap은 스레드 안전하지 않음
Map<String, Integer> map = new HashMap<>();

// 스레드 A와 B가 동시에 put하면?
// → 내부 버킷 배열이 엉켜서 무한루프나 데이터 손실 발생 가능!

// ✅ ConcurrentHashMap 사용
ConcurrentHashMap<String, Integer> cmap = new ConcurrentHashMap<>();

// 단순 put/get
cmap.put("apple", 1);
cmap.get("apple");  // 1

// 원자적 연산 — 이것들은 단일 원자 연산으로 보장됨
cmap.putIfAbsent("banana", 2);       // banana가 없을 때만 추가
cmap.computeIfAbsent("cherry", k -> k.length());  // 없으면 함수로 계산해서 넣기
cmap.merge("apple", 1, Integer::sum); // apple 값에 1을 더함 (없으면 1로 설정)

// 카운터 예시 (페이지 방문 횟수 집계)
cmap.merge(pageUrl, 1, Integer::sum);
```

```java
// ✅ CopyOnWriteArrayList — 읽기가 매우 많고 쓰기가 드문 경우
// 쓰기 시 내부 배열 전체를 복사 → 쓰기는 느리지만 읽기는 락 없이 안전
CopyOnWriteArrayList<EventListener> listeners = new CopyOnWriteArrayList<>();

// 리스너 등록 (드물게 발생)
listeners.add(new MyListener());

// 이벤트 발생 시 전체 리스너 순회 (매우 자주 발생) → 락 없이 빠름
for (EventListener listener : listeners) {
    listener.onEvent(event);
}

// ✅ ConcurrentLinkedQueue — 비블로킹 큐 (락 없이 스레드 안전)
ConcurrentLinkedQueue<Task> taskQueue = new ConcurrentLinkedQueue<>();
taskQueue.offer(new Task("task1"));  // 추가
Task task = taskQueue.poll();        // 꺼내기 (없으면 null)
```

---

## BlockingQueue — 생산자-소비자 패턴

BlockingQueue는 **생산자(Producer)**가 데이터를 넣고 **소비자(Consumer)**가 데이터를 꺼내는 패턴에 최적화된 큐입니다.

- 큐가 **비었을 때** `take()`를 호출하면 → 데이터가 올 때까지 기다림
- 큐가 **꽉 찼을 때** `put()`을 호출하면 → 공간이 생길 때까지 기다림

마치 식당 주방과 홀처럼 — 주방(생산자)이 음식을 만들면 픽업창구(큐)에 놓고, 서빙직원(소비자)이 가져갑니다. 픽업창구가 꽉 차면 주방은 기다리고, 비어있으면 직원이 기다립니다.

```java
BlockingQueue<Order> orderQueue = new LinkedBlockingQueue<>(100);  // 최대 100개

// 주방 스레드 (생산자)
Thread kitchen = new Thread(() -> {
    while (true) {
        try {
            Order order = getNextOrder();
            orderQueue.put(order);  // 큐가 꽉 차면 공간이 생길 때까지 대기
            System.out.println("주문 접수: " + order.getId());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            break;
        }
    }
});

// 서빙 스레드 (소비자)
Thread server = new Thread(() -> {
    while (true) {
        try {
            Order order = orderQueue.take();  // 큐가 비면 주문이 올 때까지 대기
            serveOrder(order);
            System.out.println("주문 서빙: " + order.getId());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            break;
        }
    }
});

kitchen.start();
server.start();
```

---

## 동기화 보조 도구

### CountDownLatch — N개 완료 대기

N개의 이벤트가 모두 완료될 때까지 기다리는 도구입니다. 딱 한 번만 사용할 수 있습니다.

실생활 비유: 소풍을 출발하기 전에 모든 학생(5명)이 모이면 출발합니다. 한 명씩 도착할 때마다 카운트다운.

```java
int workerCount = 5;
CountDownLatch startLatch = new CountDownLatch(1);    // 시작 신호용
CountDownLatch doneLatch = new CountDownLatch(workerCount);  // 완료 대기용

// 5개의 워커 스레드
for (int i = 0; i < workerCount; i++) {
    final int id = i;
    new Thread(() -> {
        try {
            startLatch.await();  // 시작 신호 대기 (모두 동시에 시작)
            System.out.println("Worker " + id + " 작업 시작");
            doWork(id);
            doneLatch.countDown();  // 완료 시 카운트 1 감소
            System.out.println("Worker " + id + " 완료");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }).start();
}

System.out.println("모든 워커 준비 완료, 시작!");
startLatch.countDown();  // 모든 워커에게 동시 시작 신호

doneLatch.await();  // 카운트가 0이 될 때까지 (= 모든 워커 완료) 대기
System.out.println("모든 작업 완료!");
```

### CyclicBarrier — 모두 모이면 동시 출발

N개의 스레드가 모두 특정 지점에 도달해야 다음 단계로 진행합니다. CountDownLatch와 달리 **재사용** 가능합니다.

실생활 비유: 릴레이 경주에서 모든 팀이 출발선에 서면 동시에 출발 신호를 줍니다.

```java
CyclicBarrier barrier = new CyclicBarrier(3, () -> {
    // 모든 스레드가 모였을 때 실행되는 콜백
    System.out.println("=== 모든 스레드 준비 완료, 다음 단계 시작 ===");
});

Runnable task = () -> {
    String name = Thread.currentThread().getName();
    try {
        // 1단계 작업
        System.out.println(name + " 1단계 완료");
        barrier.await();  // 3개 스레드가 모두 여기 올 때까지 대기

        // 2단계 작업 (동시에 시작)
        System.out.println(name + " 2단계 시작");
        barrier.await();  // 재사용 가능! 다시 모일 때까지 대기

        System.out.println(name + " 완료");
    } catch (Exception e) {
        Thread.currentThread().interrupt();
    }
};

new Thread(task, "Thread-A").start();
new Thread(task, "Thread-B").start();
new Thread(task, "Thread-C").start();
```

### Semaphore — 동시 접근 수 제한

동시에 접근할 수 있는 스레드의 **수를 제한**합니다. 공유 자원의 용량이 제한될 때 사용합니다.

실생활 비유: 주차장에 자리가 10개밖에 없을 때, 10대까지는 들어가도 되고 그 이상은 대기해야 합니다.

```java
// API Rate Limiting: 동시에 최대 5개 요청만 처리
Semaphore semaphore = new Semaphore(5);

void callExternalApi(String url) {
    try {
        semaphore.acquire();  // 허가 획득 (5개 중 하나 가져가기, 없으면 대기)
        System.out.println("API 호출: " + url + " (남은 허가: " + semaphore.availablePermits() + ")");
        doApiCall(url);
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    } finally {
        semaphore.release();  // 허가 반납 (반드시 finally에서!)
    }
}

// DB 커넥션 풀처럼 제한된 자원 관리에도 활용
```

---

## ForkJoinPool — 분할 정복 병렬 처리

큰 작업을 작은 조각으로 **재귀적으로 분할**해서 병렬 처리합니다. `parallelStream()`이 내부적으로 ForkJoinPool을 사용합니다.

```java
class SumTask extends RecursiveTask<Long> {
    private final long[] numbers;
    private final int start, end;
    private static final int THRESHOLD = 1000;  // 이 크기 이하는 직접 처리

    SumTask(long[] numbers, int start, int end) {
        this.numbers = numbers;
        this.start = start;
        this.end = end;
    }

    @Override
    protected Long compute() {
        int size = end - start;

        if (size <= THRESHOLD) {
            // 충분히 작으면 직접 계산
            long sum = 0;
            for (int i = start; i < end; i++) {
                sum += numbers[i];
            }
            return sum;
        }

        // 크면 반으로 분할
        int mid = (start + end) / 2;
        SumTask leftTask  = new SumTask(numbers, start, mid);
        SumTask rightTask = new SumTask(numbers, mid, end);

        leftTask.fork();          // 왼쪽 작업을 비동기로 다른 스레드에서 실행
        long rightResult = rightTask.compute();  // 오른쪽은 현재 스레드에서 실행
        long leftResult  = leftTask.join();      // 왼쪽 완료 대기

        return leftResult + rightResult;
    }
}

// 실행
long[] bigArray = new long[10_000_000];
Arrays.fill(bigArray, 1L);

ForkJoinPool pool = ForkJoinPool.commonPool();
long total = pool.invoke(new SumTask(bigArray, 0, bigArray.length));
System.out.println("합계: " + total);  // 10000000

// 더 간단한 방법 (내부적으로 같은 ForkJoinPool 사용)
long total2 = LongStream.of(bigArray).parallel().sum();
```

---

## 스레드 안전한 싱글톤 패턴

```java
// ✅ 방법 1: Enum 싱글톤 (가장 안전하고 간단)
enum AppConfig {
    INSTANCE;  // JVM이 클래스 로딩 시 딱 한 번만 생성

    private final String dbUrl = "jdbc:postgresql://localhost/mydb";
    public String getDbUrl() { return dbUrl; }
    public void doSomething() { System.out.println("실행"); }
}

AppConfig.INSTANCE.doSomething();
AppConfig.INSTANCE.getDbUrl();
```

```java
// ✅ 방법 2: Holder 패턴 (지연 초기화 + 스레드 안전)
public class ExpensiveService {
    private ExpensiveService() {}  // 외부에서 생성 불가

    // 내부 클래스는 getInstance()가 처음 호출될 때 로드됨
    private static class Holder {
        // 클래스 로딩 시 JVM이 한 번만 실행 → 스레드 안전!
        private static final ExpensiveService INSTANCE = new ExpensiveService();
    }

    public static ExpensiveService getInstance() {
        return Holder.INSTANCE;  // 처음 호출될 때 내부 클래스 로드 → 인스턴스 생성
    }
}
```

```java
// ✅ 방법 3: double-checked locking (volatile 필수!)
public class LazyService {
    private static volatile LazyService instance;  // volatile 없으면 버그!

    private LazyService() {}

    public static LazyService getInstance() {
        if (instance == null) {  // 첫 번째 체크 (성능 최적화)
            synchronized (LazyService.class) {
                if (instance == null) {  // 두 번째 체크 (스레드 안전)
                    instance = new LazyService();
                }
            }
        }
        return instance;
    }
}

// volatile이 없으면? JVM 명령어 재정렬로 인해 초기화 안 된 인스턴스가 반환될 수 있음
// → volatile로 모든 스레드가 최신 값을 읽도록 보장
```

---

## ThreadLocal — 스레드별 독립 변수

스레드마다 **독립적인 변수**를 유지합니다. 마치 각 스레드가 자신만의 사물함을 가지는 것과 같습니다.

```java
// 사용자 인증 정보를 ThreadLocal로 관리
public class SecurityContext {

    private static final ThreadLocal<UserInfo> currentUser = new ThreadLocal<>();

    public static void setUser(UserInfo user) {
        currentUser.set(user);  // 현재 스레드의 사물함에 저장
    }

    public static UserInfo getUser() {
        return currentUser.get();  // 현재 스레드의 사물함에서 꺼내기
    }

    public static void clear() {
        currentUser.remove();  // ⚠ 스레드 재사용(풀) 환경에서는 반드시 제거!
    }
}

// HTTP 요청 처리 흐름
// Filter에서:
SecurityContext.setUser(new UserInfo(userId, role));

// Controller에서:
UserInfo user = SecurityContext.getUser();  // 같은 요청 스레드이므로 동일 값
System.out.println("현재 사용자: " + user.getName());

// 요청 완료 후 (Filter 또는 인터셉터에서):
SecurityContext.clear();  // 반드시 제거! 안 하면 다음 요청에 오염됨
```

```java
// Spring의 SecurityContextHolder도 ThreadLocal 기반
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
String username = auth.getName();  // 현재 요청의 인증 사용자 이름
```

**ThreadLocal 사용 시 주의사항:**
- 스레드 풀에서 스레드가 재사용되므로, 요청 처리가 끝나면 **반드시 `remove()` 호출**
- 메모리 누수의 원인이 될 수 있음
- 부모 스레드에서 자식 스레드로 값을 전달하려면 `InheritableThreadLocal` 사용

---

## 정리: 상황별 도구 선택 가이드

| 상황 | 도구 |
|------|------|
| 단순 공유 자원 보호 | `synchronized` 또는 `ReentrantLock` |
| 읽기 多, 쓰기 少 | `ReadWriteLock` |
| 여러 스레드가 동시에 Map 사용 | `ConcurrentHashMap` |
| 생산자-소비자 패턴 | `BlockingQueue` |
| N개 작업 완료 대기 | `CountDownLatch` |
| N개 스레드 동시 진행 | `CyclicBarrier` |
| 동시 접근 수 제한 | `Semaphore` |
| 분할 정복 병렬 처리 | `ForkJoinPool` |
| 스레드별 독립 변수 | `ThreadLocal` |
