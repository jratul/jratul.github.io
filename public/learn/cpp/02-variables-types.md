---
title: "변수와 타입"
order: 2
---

C++는 **정적 타입** 언어입니다. 변수를 선언할 때 타입을 명시하면 컴파일러가 메모리 크기와 허용 연산을 결정합니다.

---

## 기본 타입

```cpp
#include <iostream>
#include <climits>   // 정수 한계값
#include <cfloat>    // 실수 한계값
using namespace std;

int main() {
    // 정수형
    bool    flag  = true;           // 1 byte  (true / false)
    char    ch    = 'A';            // 1 byte  (문자 또는 -128~127)
    short   s     = 30000;          // 2 bytes (-32,768 ~ 32,767)
    int     n     = 2'147'483'647;  // 4 bytes (C++14: 숫자 구분자 ' 사용 가능)
    long    l     = 2147483647L;    // 4 or 8 bytes (플랫폼 의존)
    long long ll  = 9'223'372'036'854'775'807LL; // 8 bytes

    // 부호 없는 정수형
    unsigned int  u  = 4294967295U;
    unsigned long long ull = 18446744073709551615ULL;

    // 실수형
    float       f  = 3.14f;         // 4 bytes, 약 7자리 정밀도
    double      d  = 3.14159265;    // 8 bytes, 약 15자리 정밀도
    long double ld = 3.14159265L;   // 10-16 bytes

    // 크기 확인
    cout << "int size: "    << sizeof(int)    << " bytes\n";
    cout << "double size: " << sizeof(double) << " bytes\n";
    cout << "INT_MAX: "     << INT_MAX        << "\n";
    cout << "DBL_MAX: "     << DBL_MAX        << "\n";

    return 0;
}
```

### 고정 너비 정수 (권장)

플랫폼마다 `long`의 크기가 다를 수 있습니다. 이식성을 위해 `<cstdint>` 사용:

```cpp
#include <cstdint>

int8_t   a = 127;           // 정확히 1 byte
int16_t  b = 32767;         // 정확히 2 bytes
int32_t  c = 2147483647;    // 정확히 4 bytes
int64_t  d = 9223372036854775807LL; // 정확히 8 bytes

uint8_t  ua = 255;          // 부호 없는 1 byte
uint32_t uc = 4294967295U;  // 부호 없는 4 bytes
```

---

## 변수 선언과 초기화

C++에는 3가지 초기화 문법이 있습니다.

```cpp
int a = 10;      // 복사 초기화 (C 스타일)
int b(20);       // 직접 초기화
int c{30};       // 유니폼(중괄호) 초기화 — C++11, 권장

// 중괄호 초기화는 narrowing conversion을 막아줌
int x = 3.14;   // OK (3으로 잘림, 경고는 있지만 컴파일됨)
int y{3.14};    // 오류! narrowing conversion 불허

// 여러 변수 선언
int p = 1, q = 2, r = 3;

// 초기화 없이 선언 → 지역 변수는 쓰레기 값!
int garbage;
// cout << garbage; // 미정의 동작(Undefined Behavior)
```

---

## auto — 타입 추론

컴파일러가 초기화 값으로 타입을 자동 추론합니다.

```cpp
auto i = 42;            // int
auto d = 3.14;          // double
auto s = "hello";       // const char*
auto str = std::string("world"); // std::string

auto sum = i + d;       // double (int + double = double)

// 반복자에서 특히 유용
std::vector<int> vec = {1, 2, 3};
auto it = vec.begin();  // std::vector<int>::iterator

// 함수 반환 타입 추론 (C++14)
auto add(int a, int b) { return a + b; }  // int
```

> `auto`는 타입을 숨기는 것이 아니라 **컴파일 타임에 타입을 결정**합니다. 런타임 오버헤드 없음.

---

## const와 constexpr

```cpp
const int MAX = 100;     // 런타임 상수 — 초기화 후 변경 불가
// MAX = 200;            // 오류!

// constexpr: 컴파일 타임 상수 (더 강력)
constexpr int SIZE = 256;
constexpr double PI = 3.14159265358979;

// constexpr 함수: 컴파일 타임에 계산 가능
constexpr int square(int x) { return x * x; }
constexpr int s = square(5);  // 컴파일 타임에 25 계산

// 배열 크기에 사용 가능
int arr[SIZE];        // OK (SIZE는 컴파일 타임 상수)
// int arr2[MAX];    // MAX는 const지만 일부 컴파일러에서 허용 안 됨
```

---

## 타입 변환

### 암시적 변환 (Implicit Conversion)

```cpp
int i = 42;
double d = i;        // int → double (정보 손실 없음, 안전)
int j = 3.99;        // double → int (소수점 버림, 정보 손실 — 경고!)
char c = 65;         // int → char ('A')

// 산술 변환 규칙: 작은 타입이 큰 타입으로 승격됨
int a = 5;
double b = 2.0;
auto r = a / b;      // double (a가 double로 승격)
auto q = a / 2;      // int (둘 다 int면 정수 나눗셈)
cout << q;           // 2 (소수점 버림!)
```

### 명시적 변환 (Explicit Cast)

```cpp
// C++ 스타일 캐스트 (권장)
int i = 42;
double d = static_cast<double>(i);        // 안전한 변환
int j = static_cast<int>(3.99);          // 3 (소수점 버림)

// dynamic_cast: 상속 관계에서 다운캐스트 (안전, 런타임 체크)
// const_cast: const 제거 (꼭 필요할 때만)
// reinterpret_cast: 비트 단위 재해석 (위험, 저수준)

// C 스타일 캐스트 (비권장)
double pi = 3.14;
int n = (int)pi;    // 어떤 캐스트인지 불명확
```

---

## 리터럴 접미사

```cpp
42       // int
42L      // long
42LL     // long long
42U      // unsigned int
42ULL    // unsigned long long

3.14     // double
3.14f    // float
3.14L    // long double

true     // bool
false    // bool

'A'      // char
"hello"  // const char[]
L"wide"  // const wchar_t[]
u8"utf8" // const char[] (UTF-8, C++11)

0xFF     // 16진수 (255)
0b1010   // 2진수 (10, C++14)
010      // 8진수 (8)

1'000'000  // 숫자 구분자 (C++14)
```

---

## decltype — 표현식의 타입 추론

```cpp
int x = 5;
decltype(x) y = 10;         // y는 int
decltype(x + 3.0) z = 0.0; // z는 double

// 함수 반환 타입에 활용
template<typename T, typename U>
auto multiply(T a, U b) -> decltype(a * b) {
    return a * b;
}
```

---

## 변수 범위(Scope)와 수명(Lifetime)

```cpp
int global = 100;  // 전역 변수: 프로그램 전체에서 접근 가능

int main() {
    int local = 10;  // 지역 변수: main 함수 안에서만 유효

    {
        int inner = 20;    // 블록 변수: 이 { } 안에서만 유효
        cout << inner;     // OK
        cout << local;     // OK (바깥 블록 접근 가능)
    }
    // cout << inner;      // 오류! inner는 소멸됨

    static int counter = 0;  // 정적 지역 변수: 함수가 끊겨도 값 유지
    counter++;

    return 0;
}
```

| 종류 | 범위 | 수명 |
|------|------|------|
| 전역 변수 | 파일 전체 | 프로그램 시작~종료 |
| 지역 변수 | 선언된 블록 | 블록 진입~탈출 |
| 정적 지역 변수 | 선언된 블록 | 프로그램 시작~종료 |
| 동적 변수 | 직접 관리 | new~delete |
