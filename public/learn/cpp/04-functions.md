---
title: "함수"
order: 4
---

함수는 코드를 재사용 가능한 단위로 묶는 방법입니다. C++의 함수는 오버로딩, 디폴트 인자, 인라인 등 강력한 기능을 제공합니다.

---

## 함수 기본

```cpp
#include <iostream>
using namespace std;

// 함수 선언 (prototype) — 정의보다 먼저 사용하려면 필요
int add(int a, int b);

int main() {
    cout << add(3, 4) << "\n";  // 7
    return 0;
}

// 함수 정의
int add(int a, int b) {
    return a + b;
}
```

### 반환 타입

```cpp
void printHello() {          // 반환값 없음
    cout << "Hello!\n";
    // return; 생략 가능
}

int getMax(int a, int b) {   // int 반환
    return (a > b) ? a : b;
}

// 여러 값 반환: pair 또는 struct 사용
#include <tuple>
pair<int, int> divmod(int a, int b) {
    return {a / b, a % b};
}

auto [q, r] = divmod(17, 5);  // C++17 구조화 바인딩
cout << q << " " << r;        // 3 2
```

---

## 값 전달 vs 참조 전달

```cpp
// 값 전달 (pass by value): 복사본 전달
void doubleValue(int x) {
    x *= 2;    // 원본 영향 없음
}

// 참조 전달 (pass by reference): 원본 전달
void doubleRef(int& x) {
    x *= 2;    // 원본 변경됨
}

// const 참조: 읽기 전용, 복사 비용 없음 (큰 객체에 필수)
void printName(const string& name) {
    cout << name << "\n";
    // name = "변경"; // 오류!
}

int main() {
    int a = 5;
    doubleValue(a);  cout << a;  // 5 (변화 없음)
    doubleRef(a);    cout << a;  // 10 (변경됨)

    string s = "Alice";
    printName(s);    // 복사 없이 전달
}
```

---

## 기본 인자 (Default Arguments)

```cpp
void greet(string name, string greeting = "Hello") {
    cout << greeting << ", " << name << "!\n";
}

greet("Alice");            // Hello, Alice!
greet("Bob", "Hi");        // Hi, Bob!

// 주의: 기본 인자는 오른쪽부터 설정
// void f(int a = 1, int b) { }  // 오류! b에 기본값 없음
void f(int a, int b = 2, int c = 3) { }  // OK
```

---

## 함수 오버로딩 (Overloading)

같은 이름, 다른 매개변수 타입 또는 개수.

```cpp
int    abs(int x)    { return x < 0 ? -x : x; }
double abs(double x) { return x < 0 ? -x : x; }
float  abs(float x)  { return x < 0 ? -x : x; }

abs(-5);    // int 버전 호출
abs(-3.14); // double 버전 호출

// 주의: 반환 타입만 다른 오버로딩은 불가
// int foo() { }
// double foo() { }  // 오류!
```

---

## inline 함수

함수 호출 오버헤드가 중요한 작은 함수에 사용. 컴파일러가 호출 코드에 함수 본체를 직접 삽입.

```cpp
inline int square(int x) {
    return x * x;
}

// 컴파일러가 다음과 같이 처리할 수 있음:
// int result = square(5);
// → int result = 5 * 5;  (함수 호출 없이)
```

> 현대 컴파일러는 `inline` 없이도 자동 인라인화합니다. `inline`의 현재 주된 역할은 헤더에 함수 정의를 넣을 때 중복 정의 오류 방지.

---

## 재귀 함수

```cpp
// 팩토리얼
long long factorial(int n) {
    if (n <= 1) return 1;         // 기저 조건 (base case)
    return n * factorial(n - 1);  // 재귀 호출
}

// 피보나치 (메모이제이션 없이는 비효율)
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}

// 최대공약수 (유클리드 알고리즘)
int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}

int main() {
    cout << factorial(10) << "\n";  // 3628800
    cout << fib(10) << "\n";        // 55
    cout << gcd(48, 18) << "\n";    // 6
}
```

---

## 함수 포인터

함수 자체를 변수로 저장하고 전달할 수 있습니다.

```cpp
#include <iostream>
#include <functional>
using namespace std;

int add(int a, int b) { return a + b; }
int mul(int a, int b) { return a * b; }

// 함수 포인터 타입: 반환타입 (*이름)(매개변수타입들)
int (*operation)(int, int);

int apply(int a, int b, int (*func)(int, int)) {
    return func(a, b);
}

int main() {
    operation = add;
    cout << operation(3, 4) << "\n";  // 7

    cout << apply(5, 3, add) << "\n"; // 8
    cout << apply(5, 3, mul) << "\n"; // 15

    // std::function (더 유연, 람다도 저장 가능)
    function<int(int, int)> fn = add;
    fn = mul;
    cout << fn(4, 5) << "\n";  // 20
}
```

---

## 실전 예제 — 정렬 비교 함수

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

bool ascending(int a, int b)  { return a < b; }
bool descending(int a, int b) { return a > b; }

int main() {
    vector<int> v = {5, 2, 8, 1, 9, 3};

    sort(v.begin(), v.end(), ascending);
    for (int x : v) cout << x << " ";   // 1 2 3 5 8 9
    cout << "\n";

    sort(v.begin(), v.end(), descending);
    for (int x : v) cout << x << " ";   // 9 8 5 3 2 1
    cout << "\n";
}
```
