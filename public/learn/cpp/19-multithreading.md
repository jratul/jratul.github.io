---
title: "멀티스레딩"
order: 19
---

C++11부터 표준 스레딩 라이브러리가 포함되어 플랫폼 독립적인 멀티스레드 프로그래밍이 가능합니다.

---

## std::thread 기본

```cpp
#include <thread>
#include <iostream>
using namespace std;

void printMessage(const string& msg, int times) {
    for (int i = 0; i < times; i++) {
        cout << msg << " " << i << "\n";
    }
}

int main() {
    // 스레드 생성 (즉시 실행 시작)
    thread t1(printMessage, "Thread 1", 3);
    thread t2(printMessage, "Thread 2", 3);

    // 람다로 생성
    thread t3([]() {
        cout << "Lambda thread\n";
    });

    // join: 스레드 완료 대기
    t1.join();
    t2.join();
    t3.join();

    // detach: 분리 (join 없이 독립 실행)
    thread bg([]() {
        // 백그라운드 작업
    });
    bg.detach();  // detach 후 join 불가

    // 하드웨어 지원 스레드 수
    cout << "CPU 코어 수: " << thread::hardware_concurrency() << "\n";

    return 0;
}
```

---

## 뮤텍스 (Mutex) — 경쟁 조건 방지

```cpp
#include <mutex>
#include <vector>

mutex mtx;         // 뮤텍스
int counter = 0;   // 공유 자원

void increment(int n) {
    for (int i = 0; i < n; i++) {
        mtx.lock();       // 잠금
        counter++;        // 임계 구역 (critical section)
        mtx.unlock();     // 해제
    }
}

// RAII 방식: lock_guard (더 안전, 권장)
void increment_safe(int n) {
    for (int i = 0; i < n; i++) {
        lock_guard<mutex> lock(mtx);  // 생성 시 lock, 소멸 시 unlock
        counter++;
        // 예외 발생 시에도 자동 해제!
    }
}

// unique_lock: 더 유연 (조건 변수 등에 필요)
void increment_unique(int n) {
    for (int i = 0; i < n; i++) {
        unique_lock<mutex> lock(mtx);
        counter++;
        lock.unlock();    // 중간에 해제 가능
        // 다른 작업...
        lock.lock();      // 다시 잠금
    }
}

int main() {
    thread t1(increment_safe, 100000);
    thread t2(increment_safe, 100000);
    t1.join();
    t2.join();
    cout << counter << "\n";  // 항상 200000
}
```

---

## 조건 변수 (Condition Variable)

스레드 간 신호를 주고받는 메커니즘.

```cpp
#include <condition_variable>
#include <queue>

mutex              mtx;
condition_variable cv;
queue<int>         taskQueue;
bool               done = false;

// 생산자
void producer() {
    for (int i = 0; i < 10; i++) {
        {
            lock_guard<mutex> lock(mtx);
            taskQueue.push(i);
            cout << "생산: " << i << "\n";
        }
        cv.notify_one();   // 소비자 깨우기
        this_thread::sleep_for(chrono::milliseconds(10));
    }
    {
        lock_guard<mutex> lock(mtx);
        done = true;
    }
    cv.notify_all();
}

// 소비자
void consumer(int id) {
    while (true) {
        unique_lock<mutex> lock(mtx);
        cv.wait(lock, []() { return !taskQueue.empty() || done; });

        while (!taskQueue.empty()) {
            int task = taskQueue.front();
            taskQueue.pop();
            lock.unlock();
            cout << "소비자 " << id << ": " << task << "\n";
            lock.lock();
        }

        if (done && taskQueue.empty()) break;
    }
}

int main() {
    thread prod(producer);
    thread cons1(consumer, 1);
    thread cons2(consumer, 2);

    prod.join(); cons1.join(); cons2.join();
}
```

---

## atomic — 원자적 연산

뮤텍스 없이 간단한 공유 변수를 안전하게 처리합니다.

```cpp
#include <atomic>

atomic<int> atomicCounter{0};   // 원자적 int

void atomicIncrement(int n) {
    for (int i = 0; i < n; i++) {
        atomicCounter++;               // 원자적 증가
        atomicCounter.fetch_add(1);    // 동일한 의미
    }
}

// Compare-And-Swap (CAS)
int expected = 0;
if (atomicCounter.compare_exchange_strong(expected, 100)) {
    cout << "0 → 100 성공\n";
} else {
    cout << "실패, 현재 값: " << expected << "\n";
}

// atomic flag: 스핀락 구현
atomic_flag lock = ATOMIC_FLAG_INIT;

void spinLock() {
    while (lock.test_and_set(memory_order_acquire)) {}  // 잠금 획득
}

void spinUnlock() {
    lock.clear(memory_order_release);  // 잠금 해제
}
```

---

## future와 async

비동기 작업의 결과를 미래에 받는 패턴.

```cpp
#include <future>

// async: 비동기 함수 실행
int heavyComputation(int n) {
    this_thread::sleep_for(chrono::seconds(1));
    return n * n;
}

int main() {
    // 비동기 실행
    future<int> f1 = async(launch::async, heavyComputation, 10);
    future<int> f2 = async(launch::async, heavyComputation, 20);

    // 다른 작업 수행 중...
    cout << "계산 중...\n";

    // 결과 가져오기 (완료될 때까지 대기)
    cout << "f1 결과: " << f1.get() << "\n";  // 100
    cout << "f2 결과: " << f2.get() << "\n";  // 400

    // promise: 수동으로 결과 설정
    promise<string> prom;
    future<string> fut = prom.get_future();

    thread([](promise<string> p) {
        this_thread::sleep_for(chrono::milliseconds(100));
        p.set_value("완료!");  // 결과 전달
    }, std::move(prom)).detach();

    cout << fut.get() << "\n";  // "완료!"

    return 0;
}
```

---

## 스레드 풀 패턴

```cpp
#include <thread>
#include <queue>
#include <functional>
#include <atomic>
#include <vector>
#include <condition_variable>
using namespace std;

class ThreadPool {
    vector<thread>          workers;
    queue<function<void()>> tasks;
    mutex                   queueMtx;
    condition_variable      cv;
    atomic<bool>            stop{false};

public:
    ThreadPool(int n) {
        for (int i = 0; i < n; i++) {
            workers.emplace_back([this]() {
                while (true) {
                    function<void()> task;
                    {
                        unique_lock<mutex> lock(queueMtx);
                        cv.wait(lock, [this]() {
                            return stop || !tasks.empty();
                        });
                        if (stop && tasks.empty()) return;
                        task = std::move(tasks.front());
                        tasks.pop();
                    }
                    task();
                }
            });
        }
    }

    void enqueue(function<void()> task) {
        {
            lock_guard<mutex> lock(queueMtx);
            tasks.push(std::move(task));
        }
        cv.notify_one();
    }

    ~ThreadPool() {
        stop = true;
        cv.notify_all();
        for (auto& w : workers) w.join();
    }
};

int main() {
    ThreadPool pool(4);

    for (int i = 0; i < 8; i++) {
        pool.enqueue([i]() {
            cout << "작업 " << i << " 실행 (스레드: "
                 << this_thread::get_id() << ")\n";
        });
    }

    this_thread::sleep_for(chrono::milliseconds(100));
}
```
