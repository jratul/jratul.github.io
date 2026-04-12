---
title: "람다와 함수형 프로그래밍"
order: 16
---

람다(Lambda)는 이름 없는 인라인 함수 객체입니다. C++11에서 도입되어 STL 알고리즘, 비동기 프로그래밍, 콜백 등에 광범위하게 사용됩니다.

---

## 람다 기본 문법

```cpp
// [캡처 목록] (매개변수) -> 반환타입 { 본체 }

auto greet = []() {
    std::cout << "Hello!\n";
};
greet();  // 호출

auto add = [](int a, int b) -> int {
    return a + b;
};
std::cout << add(3, 4) << "\n";  // 7

// 반환 타입 추론 (생략 가능)
auto mul = [](int a, int b) { return a * b; };

// 즉시 실행 람다 (IIFE)
int result = [](int x) { return x * x; }(5);
std::cout << result << "\n";  // 25
```

---

## 캡처 목록

람다가 외부 변수를 사용하는 방법입니다.

```cpp
int x = 10, y = 20;

// 값으로 캡처 (복사)
auto captureByValue = [x, y]() {
    std::cout << x + y << "\n";  // 30
    // x = 100;  // 오류! 기본적으로 const
};

// mutable: 캡처한 복사본 수정 허용
auto mutableCapture = [x]() mutable {
    x += 10;   // 복사본만 수정 (원본 x는 그대로)
    std::cout << x << "\n";  // 20
};
captureByValue();    // x는 여전히 10

// 참조로 캡처 (원본 접근)
auto captureByRef = [&x, &y]() {
    x += 100;  // 원본 수정!
    std::cout << x + y << "\n";
};
captureByRef();      // x는 이제 110

// 전체 값 캡처
auto captureAll = [=]() { return x + y; };

// 전체 참조 캡처 (주의: 댕글링 위험)
auto captureAllRef = [&]() { x = 0; y = 0; };

// 혼합 캡처
auto mixed = [=, &y]() { return x + y; };  // x는 복사, y는 참조

// this 캡처
class Foo {
    int val = 42;
public:
    auto getLambda() {
        return [this]() { return val; };  // this 캡처
        // C++14: return [*this]() { return val; };  // 복사 캡처
    }
};
```

---

## 제네릭 람다 (C++14)

```cpp
// auto 매개변수 → 함수 템플릿처럼 동작
auto identity = [](auto x) { return x; };

std::cout << identity(42)     << "\n";  // 42
std::cout << identity(3.14)   << "\n";  // 3.14
std::cout << identity("hello")<< "\n";  // hello

// 여러 타입 처리
auto printPair = [](auto a, auto b) {
    std::cout << a << ", " << b << "\n";
};

printPair(1, "one");      // 1, one
printPair(3.14, true);    // 3.14, 1
```

---

## STL과 함께 사용

```cpp
#include <algorithm>
#include <vector>
#include <string>
using namespace std;

int main() {
    vector<int> v = {5, 2, 8, 1, 9, 3, 7, 4, 6};

    // 정렬
    sort(v.begin(), v.end(), [](int a, int b) { return a > b; });

    // 조건 검색
    auto it = find_if(v.begin(), v.end(), [](int x) { return x > 5; });

    // 조건 카운트
    int cnt = count_if(v.begin(), v.end(), [](int x) { return x % 2 == 0; });

    // 변환
    vector<string> words = {"apple", "BANANA", "Cherry"};
    transform(words.begin(), words.end(), words.begin(),
              [](string s) {
                  transform(s.begin(), s.end(), s.begin(), ::tolower);
                  return s;
              });

    // 삭제-제거 관용구
    v.erase(remove_if(v.begin(), v.end(), [](int x) { return x < 4; }),
            v.end());

    // 각각에 대해 실행
    for_each(v.begin(), v.end(), [](int x) {
        cout << x << " ";
    });
}
```

---

## std::function

함수 포인터, 함수 객체, 람다를 모두 저장할 수 있는 타입.

```cpp
#include <functional>

// 함수 포인터
int add(int a, int b) { return a + b; }

// std::function으로 통일
std::function<int(int, int)> fn;

fn = add;                                 // 함수 포인터
fn = [](int a, int b) { return a + b; }; // 람다
fn = std::plus<int>();                    // 함수 객체

std::cout << fn(3, 4) << "\n";  // 7

// 콜백 패턴
class Button {
    std::function<void()> onClick;
public:
    void setOnClick(std::function<void()> cb) { onClick = cb; }
    void click() { if (onClick) onClick(); }
};

Button btn;
int count = 0;
btn.setOnClick([&count]() {
    count++;
    cout << "클릭! 횟수: " << count << "\n";
});
btn.click();   // 클릭! 횟수: 1
btn.click();   // 클릭! 횟수: 2
```

---

## 고차 함수 (Higher-Order Functions)

함수를 인자로 받거나 반환하는 함수.

```cpp
// 함수를 반환하는 함수 (클로저)
auto makeAdder(int offset) {
    return [offset](int x) { return x + offset; };
}

auto add5  = makeAdder(5);
auto add10 = makeAdder(10);

cout << add5(3)  << "\n";  // 8
cout << add10(3) << "\n";  // 13

// 함수 합성
template<typename F, typename G>
auto compose(F f, G g) {
    return [=](auto x) { return f(g(x)); };
}

auto double_it  = [](int x) { return x * 2; };
auto increment  = [](int x) { return x + 1; };

auto doubleIncrement = compose(double_it, increment);
cout << doubleIncrement(5) << "\n";  // (5+1)*2 = 12
```

---

## 재귀 람다

```cpp
// std::function 사용 (오버헤드 있음)
std::function<int(int)> fib = [&](int n) -> int {
    return n <= 1 ? n : fib(n-1) + fib(n-2);
};

// C++14: 제네릭 람다로 자기 참조
auto fib2 = [](auto self, int n) -> int {
    return n <= 1 ? n : self(self, n-1) + self(self, n-2);
};
cout << fib2(fib2, 10) << "\n";  // 55
```

---

## 람다와 std::bind (비교)

```cpp
#include <functional>
using namespace std;

int add(int a, int b, int c) { return a + b + c; }

// std::bind: 인자를 고정
auto add5and6 = bind(add, 5, 6, placeholders::_1);
cout << add5and6(10) << "\n";  // 21

// 람다가 더 명확 (권장)
auto add5and6_lambda = [](int x) { return add(5, 6, x); };
cout << add5and6_lambda(10) << "\n";  // 21
```

> 현대 C++에서는 `std::bind` 보다 람다를 사용하는 것이 더 읽기 쉽고 오류가 적습니다.
