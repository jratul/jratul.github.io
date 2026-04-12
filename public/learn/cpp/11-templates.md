---
title: "템플릿 — 제네릭 프로그래밍"
order: 11
---

템플릿은 타입을 매개변수로 받는 **제네릭 코드**를 작성하는 방법입니다. C++의 강력한 컴파일 타임 다형성 메커니즘입니다.

---

## 함수 템플릿

```cpp
#include <iostream>
using namespace std;

// T는 타입 매개변수 (임의의 이름 가능)
template<typename T>
T myMax(T a, T b) {
    return (a > b) ? a : b;
}

// 여러 타입 매개변수
template<typename T, typename U>
auto add(T a, U b) -> decltype(a + b) {
    return a + b;
}

int main() {
    cout << myMax(3, 7)       << "\n";  // 7  (int 버전 생성)
    cout << myMax(3.14, 2.71) << "\n";  // 3.14 (double 버전 생성)
    cout << myMax('a', 'z')   << "\n";  // z  (char 버전 생성)

    cout << add(3, 4.5) << "\n";  // 7.5 (int + double)

    // 명시적 타입 지정
    cout << myMax<double>(3, 4.5) << "\n";  // 4.5
}
```

---

## 클래스 템플릿

```cpp
template<typename T>
class Stack {
    vector<T> data;

public:
    void push(const T& val) { data.push_back(val); }
    void pop()              { data.pop_back(); }
    T&   top()              { return data.back(); }
    bool empty() const      { return data.empty(); }
    int  size()  const      { return data.size(); }
};

int main() {
    Stack<int>    intStack;
    Stack<string> strStack;

    intStack.push(1);
    intStack.push(2);
    cout << intStack.top() << "\n";  // 2

    strStack.push("hello");
    strStack.push("world");
    cout << strStack.top() << "\n";  // world
}
```

---

## 비타입 템플릿 매개변수

타입뿐 아니라 값도 매개변수로 받을 수 있습니다.

```cpp
template<typename T, int N>
class FixedArray {
    T data[N];
    int size = 0;

public:
    void push(const T& val) {
        if (size < N) data[size++] = val;
    }

    T& operator[](int i) { return data[i]; }
    int capacity() const { return N; }
    int count()    const { return size; }
};

int main() {
    FixedArray<int, 5> arr;
    arr.push(10); arr.push(20);
    cout << arr[0] << "\n";       // 10
    cout << arr.capacity() << "\n"; // 5
}
```

---

## 템플릿 특수화

특정 타입에 대해 다른 구현을 제공합니다.

```cpp
// 일반 템플릿
template<typename T>
void print(const T& val) {
    cout << val << "\n";
}

// bool 타입 전체 특수화 (full specialization)
template<>
void print<bool>(const bool& val) {
    cout << (val ? "true" : "false") << "\n";
}

// 포인터 타입 부분 특수화 (partial specialization — 클래스 템플릿만 가능)
template<typename T>
class Wrapper {
public:
    T value;
    Wrapper(T v) : value(v) {}
    void info() const { cout << "값: " << value << "\n"; }
};

template<typename T>
class Wrapper<T*> {    // 포인터 특수화
public:
    T* value;
    Wrapper(T* v) : value(v) {}
    void info() const { cout << "포인터가 가리키는 값: " << *value << "\n"; }
};

int main() {
    print(42);      // 42
    print(true);    // true (특수화 버전)

    int x = 100;
    Wrapper<int>  w1(42);    // 일반 버전
    Wrapper<int*> w2(&x);   // 포인터 특수화

    w1.info();  // 값: 42
    w2.info();  // 포인터가 가리키는 값: 100
}
```

---

## 가변 인자 템플릿 (Variadic Templates, C++11)

임의 개수의 인자를 받는 템플릿.

```cpp
// 재귀 종료 조건
void printAll() { cout << "\n"; }

// 가변 인자 템플릿
template<typename First, typename... Rest>
void printAll(First first, Rest... rest) {
    cout << first << " ";
    printAll(rest...);    // 나머지 인자로 재귀 호출
}

// 폴드 표현식 (C++17, 더 간결)
template<typename... Args>
void printFold(Args... args) {
    ((cout << args << " "), ...);  // , 연산자 폴드
    cout << "\n";
}

template<typename... Args>
auto sum(Args... args) {
    return (args + ...);  // + 연산자 폴드
}

int main() {
    printAll(1, "hello", 3.14, true);
    // 1 hello 3.14 1

    printFold(1, 2, 3, 4, 5);
    // 1 2 3 4 5

    cout << sum(1, 2, 3, 4, 5) << "\n";  // 15
}
```

---

## 타입 트레이트 (Type Traits, C++11)

컴파일 타임에 타입 속성을 검사합니다.

```cpp
#include <type_traits>

template<typename T>
void process(T val) {
    if constexpr (is_integral_v<T>) {         // C++17
        cout << "정수: " << val << "\n";
    } else if constexpr (is_floating_point_v<T>) {
        cout << "실수: " << val << "\n";
    } else {
        cout << "기타 타입\n";
    }
}

// SFINAE (Substitution Failure Is Not An Error)
template<typename T,
         typename = enable_if_t<is_arithmetic_v<T>>>
T square(T x) { return x * x; }

int main() {
    process(42);       // 정수: 42
    process(3.14);     // 실수: 3.14
    process("hello");  // 기타 타입

    cout << square(5)    << "\n";  // 25
    cout << square(2.5)  << "\n";  // 6.25
    // square("hello");  // 컴파일 오류 (enable_if 조건 미충족)

    // 유용한 타입 트레이트
    static_assert(is_same_v<int, int>);            // OK
    static_assert(is_base_of_v<Animal, Dog>);      // OK
    static_assert(is_polymorphic_v<Animal>);       // OK (virtual 있음)
}
```

---

## 실전 예제 — 제네릭 pair

```cpp
template<typename T1, typename T2>
struct MyPair {
    T1 first;
    T2 second;

    MyPair(T1 f, T2 s) : first(f), second(s) {}

    bool operator==(const MyPair& o) const {
        return first == o.first && second == o.second;
    }

    bool operator<(const MyPair& o) const {
        if (first != o.first) return first < o.first;
        return second < o.second;
    }
};

// 헬퍼 함수 (타입 추론)
template<typename T1, typename T2>
MyPair<T1, T2> makePair(T1 a, T2 b) {
    return {a, b};
}

int main() {
    auto p1 = makePair(1, "one");
    auto p2 = makePair(3.14, true);

    cout << p1.first << " " << p1.second << "\n";  // 1 one

    // 정렬 가능
    vector<MyPair<int, string>> v = {{3,"c"},{1,"a"},{2,"b"}};
    sort(v.begin(), v.end());
    for (auto& p : v) cout << p.first << " ";  // 1 2 3
}
```
