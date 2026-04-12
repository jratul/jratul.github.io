---
title: "연산자 오버로딩"
order: 10
---

C++에서는 사용자 정의 타입에 기존 연산자(`+`, `-`, `==`, `<<` 등)의 의미를 부여할 수 있습니다.

---

## 산술 연산자

```cpp
#include <iostream>
using namespace std;

class Vector2D {
public:
    double x, y;

    Vector2D(double x = 0, double y = 0) : x(x), y(y) {}

    // + 연산자: const 참조로 받고 새 객체 반환
    Vector2D operator+(const Vector2D& o) const {
        return {x + o.x, y + o.y};
    }

    Vector2D operator-(const Vector2D& o) const {
        return {x - o.x, y - o.y};
    }

    // 스칼라 곱
    Vector2D operator*(double scalar) const {
        return {x * scalar, y * scalar};
    }

    // 단항 마이너스
    Vector2D operator-() const {
        return {-x, -y};
    }

    // += 연산자: 참조 반환
    Vector2D& operator+=(const Vector2D& o) {
        x += o.x; y += o.y;
        return *this;
    }
};

// 스칼라 * 벡터 (멤버 함수로 구현 불가 → 전역 함수)
Vector2D operator*(double scalar, const Vector2D& v) {
    return v * scalar;
}

int main() {
    Vector2D a(3, 4), b(1, 2);
    Vector2D c = a + b;     // (4, 6)
    Vector2D d = a * 2.0;   // (6, 8)
    Vector2D e = 3.0 * b;   // (3, 6)
    a += b;                  // a = (4, 6)
}
```

---

## 비교 연산자

```cpp
class Point {
public:
    int x, y;
    Point(int x, int y) : x(x), y(y) {}

    bool operator==(const Point& o) const {
        return x == o.x && y == o.y;
    }

    bool operator!=(const Point& o) const {
        return !(*this == o);   // == 재활용
    }

    bool operator<(const Point& o) const {
        if (x != o.x) return x < o.x;
        return y < o.y;
    }

    bool operator<=(const Point& o) const { return !(o < *this); }
    bool operator> (const Point& o) const { return o < *this; }
    bool operator>=(const Point& o) const { return !(*this < o); }
};

// C++20: spaceship 연산자 (<=>) 하나로 모든 비교 자동 생성
class Point20 {
public:
    int x, y;
    auto operator<=>(const Point20&) const = default;  // 전부 자동 생성!
    bool operator==(const Point20&) const = default;
};
```

---

## 스트림 연산자 (<<, >>)

```cpp
#include <iostream>
using namespace std;

class Complex {
public:
    double real, imag;
    Complex(double r = 0, double i = 0) : real(r), imag(i) {}

    // 멤버 함수로 구현 불가 → friend 함수로
    friend ostream& operator<<(ostream& os, const Complex& c) {
        os << c.real;
        if (c.imag >= 0) os << "+";
        os << c.imag << "i";
        return os;   // 연쇄 출력 지원 (cout << a << b)
    }

    friend istream& operator>>(istream& is, Complex& c) {
        is >> c.real >> c.imag;
        return is;
    }
};

int main() {
    Complex a(3, 4), b(1, -2);
    cout << a << " and " << b << "\n";  // 3+4i and 1-2i

    Complex c;
    cin >> c;   // 실수부 허수부 입력
}
```

---

## 인덱스 연산자 []

```cpp
class SafeArray {
    int* data;
    int  size;

public:
    SafeArray(int n) : data(new int[n]()), size(n) {}
    ~SafeArray() { delete[] data; }

    // 읽기/쓰기 버전
    int& operator[](int i) {
        if (i < 0 || i >= size)
            throw out_of_range("Index out of bounds");
        return data[i];
    }

    // const 버전 (const 객체에 적용)
    const int& operator[](int i) const {
        if (i < 0 || i >= size)
            throw out_of_range("Index out of bounds");
        return data[i];
    }
};

int main() {
    SafeArray arr(5);
    arr[0] = 10;
    arr[1] = 20;
    cout << arr[0] << "\n";  // 10
    // arr[10] = 5;  // throw out_of_range
}
```

---

## 함수 호출 연산자 ()

객체를 함수처럼 사용할 수 있는 **함수 객체(Functor)** 를 만듭니다.

```cpp
class Multiplier {
    int factor;
public:
    Multiplier(int f) : factor(f) {}

    int operator()(int x) const {
        return x * factor;
    }
};

class Adder {
    int offset;
public:
    Adder(int o) : offset(o) {}
    int operator()(int x) const { return x + offset; }
};

int main() {
    Multiplier triple(3);
    Adder      add10(10);

    cout << triple(5) << "\n";  // 15
    cout << add10(7)  << "\n";  // 17

    // STL 알고리즘과 함께 사용
    vector<int> v = {1, 2, 3, 4, 5};
    transform(v.begin(), v.end(), v.begin(), triple);
    // v = {3, 6, 9, 12, 15}
}
```

---

## 역참조, 화살표 연산자 (스마트 포인터 구현)

```cpp
template<typename T>
class SimplePtr {
    T* ptr;

public:
    SimplePtr(T* p = nullptr) : ptr(p) {}
    ~SimplePtr() { delete ptr; }

    T& operator*()  { return *ptr; }        // *sp
    T* operator->() { return ptr; }         // sp->member
    explicit operator bool() const {        // if (sp)
        return ptr != nullptr;
    }
};

struct Foo {
    int x = 42;
    void print() const { cout << x << "\n"; }
};

int main() {
    SimplePtr<Foo> sp(new Foo());
    cout << (*sp).x << "\n";  // 42
    sp->print();               // 42
    if (sp) cout << "유효\n";
}
```

---

## 타입 변환 연산자

```cpp
class Celsius {
    double temp;
public:
    Celsius(double t) : temp(t) {}

    // Celsius → double 변환
    explicit operator double() const { return temp; }

    // Celsius → Fahrenheit 변환
    operator double() const { return temp; }  // explicit 없으면 암시적 변환
};

class Fahrenheit {
    double temp;
public:
    Fahrenheit(double t) : temp(t) {}

    // Fahrenheit ← Celsius 변환 생성자
    Fahrenheit(const Celsius& c) : temp(c * 9.0/5.0 + 32) {}
};
```

---

## 오버로딩 불가 연산자

다음 연산자는 오버로딩할 수 **없습니다**:

| 연산자 | 이름 |
|--------|------|
| `::` | 범위 지정 |
| `.` | 멤버 접근 |
| `.*` | 멤버 포인터 접근 |
| `?:` | 삼항 연산자 |
| `sizeof` | 크기 |
| `typeid` | 타입 식별 |
