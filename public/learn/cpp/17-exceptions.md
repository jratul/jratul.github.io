---
title: "예외 처리"
order: 17
---

예외 처리는 프로그램 실행 중 발생하는 오류를 체계적으로 다루는 방법입니다.

---

## try / catch / throw

```cpp
#include <iostream>
#include <stdexcept>
using namespace std;

double divide(double a, double b) {
    if (b == 0.0) {
        throw runtime_error("0으로 나눌 수 없습니다");  // 예외 발생
    }
    return a / b;
}

int main() {
    try {
        cout << divide(10, 2) << "\n";   // 5
        cout << divide(10, 0) << "\n";   // 예외 발생!
        cout << "이 줄은 실행 안 됨\n";
    }
    catch (const runtime_error& e) {    // 특정 예외 타입
        cout << "오류: " << e.what() << "\n";
    }
    catch (const exception& e) {        // 모든 표준 예외
        cout << "표준 예외: " << e.what() << "\n";
    }
    catch (...) {                        // 모든 예외 (catch-all)
        cout << "알 수 없는 예외\n";
    }

    cout << "프로그램 계속 실행\n";
    return 0;
}
```

---

## 표준 예외 계층

```
exception
├── bad_alloc          new 실패 (메모리 부족)
├── bad_cast           dynamic_cast 실패
├── bad_typeid         typeid null 역참조
├── ios_base::failure  I/O 오류
└── logic_error        프로그램 로직 오류
│   ├── domain_error       수학적 도메인 오류
│   ├── invalid_argument   잘못된 인자
│   ├── length_error       너무 긴 길이
│   └── out_of_range       범위 초과
└── runtime_error      런타임 오류
    ├── overflow_error     오버플로우
    ├── underflow_error    언더플로우
    └── range_error        범위 오류
```

```cpp
// 표준 예외 사용
#include <stdexcept>

void checkAge(int age) {
    if (age < 0)    throw invalid_argument("나이는 0 이상이어야 합니다");
    if (age > 150)  throw out_of_range("나이가 너무 큽니다: " + to_string(age));
}

try {
    checkAge(-1);
} catch (const invalid_argument& e) {
    cerr << e.what() << "\n";
} catch (const out_of_range& e) {
    cerr << e.what() << "\n";
}
```

---

## 사용자 정의 예외

```cpp
#include <stdexcept>
#include <string>

// exception 또는 파생 클래스를 상속
class DatabaseError : public runtime_error {
    int errorCode;
public:
    DatabaseError(const string& msg, int code)
        : runtime_error(msg), errorCode(code) {}

    int getCode() const { return errorCode; }
};

class ConnectionError : public DatabaseError {
public:
    ConnectionError(const string& host)
        : DatabaseError("연결 실패: " + host, 1001) {}
};

void connectDB(const string& host) {
    if (host.empty()) throw ConnectionError("(빈 호스트)");
    // ...
}

try {
    connectDB("");
} catch (const ConnectionError& e) {
    cerr << e.what() << " (코드: " << e.getCode() << ")\n";
} catch (const DatabaseError& e) {
    cerr << "DB 오류: " << e.what() << "\n";
}
```

---

## 스택 되감기 (Stack Unwinding)

예외가 발생하면 콜 스택을 거슬러 올라가며 지역 객체들의 소멸자가 호출됩니다.

```cpp
class Guard {
    string name;
public:
    Guard(const string& n) : name(n) {
        cout << name << " 생성\n";
    }
    ~Guard() {
        cout << name << " 소멸 (자동)\n";  // 예외 발생 시에도 호출됨!
    }
};

void innerFunc() {
    Guard g2("g2");
    throw runtime_error("깊은 곳에서 예외");
}

void outerFunc() {
    Guard g1("g1");
    innerFunc();
}

int main() {
    try {
        outerFunc();
    } catch (const exception& e) {
        cout << "잡힘: " << e.what() << "\n";
    }
}
// 출력:
// g1 생성
// g2 생성
// g2 소멸 (자동)
// g1 소멸 (자동)
// 잡힘: 깊은 곳에서 예외
```

이것이 RAII가 예외 안전성을 보장하는 이유입니다.

---

## noexcept

함수가 예외를 던지지 않음을 명시합니다.

```cpp
// noexcept: 예외 없음 보장
void safeFunction() noexcept {
    // 예외를 던지면 std::terminate() 호출 (프로그램 종료)
}

// 조건부 noexcept
template<typename T>
void moveData(T& a, T& b) noexcept(noexcept(std::swap(a, b))) {
    std::swap(a, b);
}

// 이동 생성자/대입 연산자는 noexcept 권장
// → STL 컨테이너가 이동을 사용하도록 허용됨
class MyClass {
public:
    MyClass(MyClass&&) noexcept = default;
    MyClass& operator=(MyClass&&) noexcept = default;
};
```

---

## 예외 안전성 수준

| 수준 | 설명 |
|------|------|
| **No-throw guarantee** | 절대 예외 안 던짐 (noexcept) |
| **Strong guarantee** | 예외 발생 시 상태가 원래대로 (commit or rollback) |
| **Basic guarantee** | 예외 발생 시 유효한 상태 유지, 값은 변할 수 있음 |
| **No guarantee** | 예외 시 프로그램 상태 미정의 |

```cpp
// Strong guarantee 구현 예시 (copy-and-swap)
class Safe {
    vector<int> data;
public:
    Safe& operator=(const Safe& other) {
        // 임시 복사 → 성공하면 swap (실패해도 *this 불변)
        Safe temp(other);
        std::swap(data, temp.data);
        return *this;
    }
};
```

---

## 함수 try 블록

생성자 초기화 리스트의 예외를 처리합니다.

```cpp
class Widget {
    Resource r1, r2;
public:
    Widget(int a, int b)
    try : r1(a), r2(b) {       // 함수 try 블록
        // 초기화 성공 후 본체
    } catch (const exception& e) {
        // r1 또는 r2 초기화 중 발생한 예외 처리
        cerr << "Widget 생성 실패: " << e.what() << "\n";
        throw;  // 예외 재전파 (생성자 실패)
    }
};
```
