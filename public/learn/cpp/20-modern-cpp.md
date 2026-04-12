---
title: "모던 C++ (C++11/14/17/20)"
order: 20
---

C++11부터 언어가 크게 현대화되었습니다. 각 버전의 핵심 기능을 정리합니다.

---

## C++11 핵심 기능

### nullptr, auto, range-for

```cpp
// nullptr (0이나 NULL 대신)
int* p = nullptr;

// auto 타입 추론
auto i = 42;           // int
auto d = 3.14;         // double
auto v = vector<int>{1,2,3};

// 범위 기반 for
for (const auto& x : v) { }

// 중괄호 초기화
vector<int> vec{1, 2, 3};
map<string, int> m{{"a", 1}, {"b", 2}};
```

### constexpr

```cpp
constexpr int factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

constexpr int f5 = factorial(5);  // 컴파일 타임: 120
static_assert(f5 == 120);
```

### 이니셜라이저 리스트

```cpp
#include <initializer_list>

void printAll(initializer_list<int> list) {
    for (int x : list) cout << x << " ";
}

printAll({1, 2, 3, 4, 5});

// 클래스에서 사용
class NumberList {
public:
    NumberList(initializer_list<int> init) {
        for (int n : init) data.push_back(n);
    }
private:
    vector<int> data;
};

NumberList nl{1, 2, 3, 4, 5};
```

### enum class

```cpp
// C++03: enum — 이름 충돌 문제
enum Direction { NORTH, SOUTH, EAST, WEST };
enum Color { RED, GREEN, BLUE };
// int n = NORTH;  // 암시적 int 변환 가능 (위험)

// C++11: enum class — 강타입
enum class Direction { NORTH, SOUTH, EAST, WEST };
enum class Color { RED, GREEN, BLUE };

Direction d = Direction::NORTH;  // 범위 지정 필수
// int n = d;  // 오류! 암시적 변환 불가

// 기반 타입 지정
enum class Status : uint8_t {
    ACTIVE = 1,
    INACTIVE = 0,
};
```

---

## C++14 핵심 기능

```cpp
// 일반 람다 (auto 매개변수)
auto sum = [](auto a, auto b) { return a + b; };

// 함수 반환 타입 추론
auto square(int x) { return x * x; }  // int 자동 추론

// 변수 템플릿
template<typename T>
constexpr T pi = T(3.14159265358979);

cout << pi<double> << "\n";
cout << pi<float>  << "\n";

// 이진 리터럴 + 숫자 구분자
int flags = 0b1010'1010;
int million = 1'000'000;

// make_unique
auto ptr = make_unique<int>(42);  // C++14
```

---

## C++17 핵심 기능

### 구조화 바인딩 (Structured Bindings)

```cpp
// pair/tuple 분해
auto [first, second] = make_pair(1, "one");
cout << first << " " << second << "\n";  // 1 one

// map 순회
map<string, int> m{{"a", 1}, {"b", 2}};
for (auto& [key, val] : m) {
    cout << key << ": " << val << "\n";
}

// 배열 분해
int arr[] = {1, 2, 3};
auto& [x, y, z] = arr;
x = 10;  // arr[0] 수정
```

### if constexpr

```cpp
template<typename T>
auto getValue(T t) {
    if constexpr (is_integral_v<T>) {
        return t * 2;       // 정수: 2배
    } else if constexpr (is_floating_point_v<T>) {
        return t * 1.5;     // 실수: 1.5배
    } else {
        return t;           // 나머지: 그대로
    }
}
// 컴파일 타임에 분기 → 사용되지 않는 분기는 컴파일 안 됨
```

### std::optional

```cpp
#include <optional>

optional<string> findUser(int id) {
    if (id == 1) return "Alice";
    if (id == 2) return "Bob";
    return nullopt;  // 값 없음
}

auto user = findUser(1);
if (user.has_value()) {
    cout << *user << "\n";          // Alice
    cout << user.value() << "\n";   // Alice
}
cout << findUser(99).value_or("Unknown") << "\n";  // Unknown

// 연산
auto upper = findUser(1).transform([](const string& s) {
    string r = s;
    transform(r.begin(), r.end(), r.begin(), ::toupper);
    return r;
});
// C++23의 monadic operations
```

### std::variant

```cpp
#include <variant>

variant<int, double, string> v;
v = 42;
v = 3.14;
v = "hello";

// 현재 어떤 타입인지 확인
if (holds_alternative<string>(v)) {
    cout << get<string>(v) << "\n";  // hello
}

// visit로 패턴 매칭
visit([](auto&& val) {
    cout << val << "\n";
}, v);

// 실제 활용: 타입 안전한 유니온
using JsonValue = variant<nullptr_t, bool, int, double, string>;
JsonValue json = 42;
```

### std::string_view, std::any

```cpp
#include <string_view>
#include <any>

// string_view: 복사 없는 문자열 참조
void process(string_view sv) {   // string, const char*, 부분 문자열 모두 받음
    cout << sv.substr(0, 5) << "\n";
}

process("Hello, World!");        // const char*
process(string("Hello!"));       // string
process(string_view("Hello!").substr(0, 5));  // 복사 없는 슬라이스

// std::any: 타입 안전한 void*
any a = 42;
a = string("hello");
a = 3.14;

cout << any_cast<double>(a) << "\n";  // 3.14
try {
    any_cast<int>(a);              // bad_any_cast 예외
} catch (const bad_any_cast&) { }
```

---

## C++20 핵심 기능

### Concepts

```cpp
#include <concepts>

// 타입 제약 조건
template<typename T>
requires integral<T>
T gcd(T a, T b) {
    return b == 0 ? a : gcd(b, a % b);
}

// 축약 문법
auto square(integral auto x) { return x * x; }

// 사용자 정의 concept
template<typename T>
concept Printable = requires(T t) {
    { cout << t } -> same_as<ostream&>;
};

template<Printable T>
void print(const T& val) { cout << val << "\n"; }
```

### Ranges

```cpp
#include <ranges>
namespace views = std::views;

vector<int> v = {1,2,3,4,5,6,7,8,9,10};

// 파이프라인 스타일
auto result = v
    | views::filter([](int x) { return x % 2 == 0; })
    | views::transform([](int x) { return x * x; })
    | views::take(3);

for (int x : result) cout << x << " ";  // 4 16 36

// iota view (범위 생성)
for (int i : views::iota(1, 6)) cout << i << " ";  // 1 2 3 4 5
```

### Coroutines (기초)

```cpp
#include <coroutine>
#include <generator>  // C++23 (일부 컴파일러)

// 간단한 generator 예시
// (실제 구현은 복잡 — 여기서는 개념만)
// co_yield: 값을 생성하며 일시 중단
// co_await: 비동기 결과 대기
// co_return: 코루틴 종료
```

### std::format (C++20)

```cpp
#include <format>

string s = format("이름: {}, 나이: {}", "Alice", 30);
cout << s << "\n";  // 이름: Alice, 나이: 30

// 형식 지정
cout << format("{:.2f}", 3.14159) << "\n";  // 3.14
cout << format("{:>10}", "right")  << "\n"; // "     right"
cout << format("{:05d}", 42)       << "\n"; // "00042"
```

---

## 버전별 요약

| 버전 | 주요 기능 |
|------|-----------|
| **C++11** | auto, nullptr, range-for, lambda, move semantics, smart pointers, thread, constexpr, enum class, initializer_list |
| **C++14** | generic lambda, make_unique, relaxed constexpr, variable templates |
| **C++17** | structured bindings, if constexpr, optional, variant, string_view, any, filesystem, parallel algorithms |
| **C++20** | concepts, ranges, coroutines, format, span, 3-way comparison (<=>) |
| **C++23** | expected, flat_map, generator, stacktrace |

---

## 모던 C++ 지침 요약

```cpp
// ✅ 권장
auto ptr = make_unique<Foo>(args);  // new 대신 make_unique
for (const auto& x : container) {} // 복사 대신 const 참조
string_view sv = s;                 // 읽기 전용 문자열
[[nodiscard]] int calc();           // 반환값 무시 경고
constexpr int N = 100;              // const보다 constexpr

// ❌ 지양
Foo* raw = new Foo();               // 스마트 포인터 사용
for (int i = 0; i < v.size(); i++) // 범위 기반 for 사용
void* generic = ptr;                // any, variant 사용
#define MAX 100                     // constexpr 사용
```
