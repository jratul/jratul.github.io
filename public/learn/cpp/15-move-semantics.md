---
title: "이동 시맨틱과 rvalue 참조"
order: 15
---

C++11의 이동 시맨틱은 불필요한 복사를 줄여 성능을 크게 향상시킵니다. 현대 C++ 코드를 이해하는 데 필수적인 개념입니다.

---

## lvalue와 rvalue

```cpp
int a = 10;    // a: lvalue (이름이 있고, 주소를 가짐)
               // 10: rvalue (임시 값, 주소 없음)

int b = a + 5; // a+5: rvalue (임시 계산 결과)
               // b:   lvalue

// lvalue 참조
int& lref = a;    // OK
// int& lref = 10; // 오류! rvalue에 lvalue 참조 불가
const int& cref = 10; // OK (const lvalue 참조는 rvalue에 바인딩 가능)

// rvalue 참조 (&&)
int&& rref = 10;    // OK
int&& rref2 = a + 5; // OK (임시값)
// int&& rref3 = a;  // 오류! a는 lvalue
```

---

## 복사 vs 이동

```cpp
#include <iostream>
#include <vector>
#include <string>
using namespace std;

class Buffer {
    int*   data;
    size_t size;

public:
    Buffer(size_t n) : data(new int[n]), size(n) {
        cout << "생성 (" << size << ")\n";
    }

    // 복사 생성자: 깊은 복사
    Buffer(const Buffer& other) : data(new int[other.size]), size(other.size) {
        copy(other.data, other.data + size, data);
        cout << "복사 (" << size << ")\n";  // 비용이 큼
    }

    // 이동 생성자: 포인터만 훔침
    Buffer(Buffer&& other) noexcept
        : data(other.data), size(other.size) {
        other.data = nullptr;  // 원본 소유권 포기
        other.size = 0;
        cout << "이동 (" << size << ")\n";  // 거의 공짜
    }

    // 복사 대입
    Buffer& operator=(const Buffer& other) {
        if (this != &other) {
            delete[] data;
            data = new int[other.size];
            size = other.size;
            copy(other.data, other.data + size, data);
        }
        return *this;
    }

    // 이동 대입
    Buffer& operator=(Buffer&& other) noexcept {
        if (this != &other) {
            delete[] data;       // 기존 자원 해제
            data = other.data;   // 소유권 이전
            size = other.size;
            other.data = nullptr;
            other.size = 0;
        }
        return *this;
    }

    ~Buffer() { delete[] data; }

    size_t getSize() const { return size; }
};

int main() {
    Buffer b1(1000);         // 생성
    Buffer b2(b1);           // 복사 (비용 큼)
    Buffer b3(std::move(b1)); // 이동 (거의 공짜)
    // b1은 이제 빈 상태

    // 함수 반환값은 자동으로 이동됨 (RVO/NRVO)
    auto getBuffer = []() { return Buffer(500); };  // 이동 또는 RVO
    Buffer b4 = getBuffer();
}
```

---

## std::move

`lvalue`를 `rvalue`로 캐스팅합니다 (실제 이동은 일어나지 않음, 이동을 허용하는 표시).

```cpp
vector<string> words = {"apple", "banana", "cherry"};
string s = "hello world";

// s를 이동하여 추가 (s는 이후 유효하지 않은 상태)
words.push_back(std::move(s));
// s는 이제 비어있거나 미정의 상태 — 사용하면 안 됨!

// 컨테이너 이동
vector<int> a = {1, 2, 3, 4, 5};
vector<int> b = std::move(a);   // O(1)으로 이동
// a는 빈 벡터

// 주의: move 후 원본은 '이동된 상태(moved-from state)'
// 재사용하려면 재할당해야 함
a = {6, 7, 8};  // 다시 사용 가능
```

---

## 완벽 전달 (Perfect Forwarding)

함수 인자를 원래 값 카테고리(lvalue/rvalue)를 유지한 채 전달합니다.

```cpp
template<typename T>
void wrapper(T&& arg) {                    // 포워딩 참조 (universal reference)
    realFunction(std::forward<T>(arg));    // 완벽 전달
}

// 예시: make_unique 구현
template<typename T, typename... Args>
unique_ptr<T> myMakeUnique(Args&&... args) {
    return unique_ptr<T>(new T(std::forward<Args>(args)...));
}

struct Point {
    int x, y;
    Point(int x, int y) : x(x), y(y) {}
};

int main() {
    // 완벽 전달: lvalue는 lvalue로, rvalue는 rvalue로 전달
    int a = 5;
    auto p1 = myMakeUnique<Point>(a, 10);   // a는 lvalue로 전달
    auto p2 = myMakeUnique<Point>(3, 4);    // 3, 4는 rvalue로 전달
}
```

---

## Rule of Five / Zero

C++11에서 소멸자, 복사/이동 생성자, 복사/이동 대입 중 하나를 정의하면 나머지도 고려해야 합니다.

```cpp
// Rule of Zero: 자원 관리를 클래스에 위임하면 아무것도 정의 안 해도 됨
class Good {
    vector<int> data;     // vector가 자원 관리
    string      name;     // string이 자원 관리
    // 생성자, 소멸자, 복사/이동 = 컴파일러 자동 생성
};

// Rule of Five: 직접 자원 관리 시 5개 전부 정의
class ManualResource {
    int* data;
public:
    ManualResource(int n) : data(new int[n]) {}
    ~ManualResource()                                 { delete[] data; }
    ManualResource(const ManualResource& o)           { /* 깊은 복사 */ }
    ManualResource(ManualResource&& o) noexcept       { /* 이동 */ }
    ManualResource& operator=(const ManualResource& o){ /* 복사 대입 */ return *this; }
    ManualResource& operator=(ManualResource&& o) noexcept { /* 이동 대입 */ return *this; }
};

// 복사/이동 비활성화
class NonCopyable {
public:
    NonCopyable() = default;
    NonCopyable(const NonCopyable&)            = delete;  // 복사 금지
    NonCopyable& operator=(const NonCopyable&) = delete;
    NonCopyable(NonCopyable&&)                 = default; // 이동 허용
    NonCopyable& operator=(NonCopyable&&)      = default;
};
```

---

## 이동 시맨틱의 성능 효과

```cpp
#include <chrono>
#include <vector>
#include <string>
using namespace std;
using namespace chrono;

int main() {
    const int N = 100000;
    vector<string> v;
    v.reserve(N);

    // 복사 삽입
    auto t1 = high_resolution_clock::now();
    for (int i = 0; i < N; i++) {
        string s(100, 'a');
        v.push_back(s);         // 복사
    }
    auto t2 = high_resolution_clock::now();

    v.clear(); v.reserve(N);

    // 이동 삽입
    for (int i = 0; i < N; i++) {
        string s(100, 'a');
        v.push_back(std::move(s));  // 이동
    }
    auto t3 = high_resolution_clock::now();

    cout << "복사: " << duration_cast<milliseconds>(t2-t1).count() << "ms\n";
    cout << "이동: " << duration_cast<milliseconds>(t3-t2).count() << "ms\n";
    // 이동이 훨씬 빠름 (문자열 길이에 비례해 차이가 커짐)
}
```
