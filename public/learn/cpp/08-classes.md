---
title: "클래스와 객체지향"
order: 8
---

C++의 클래스는 데이터(멤버 변수)와 동작(멤버 함수)을 하나로 묶은 사용자 정의 타입입니다.

---

## 클래스 기본 구조

```cpp
#include <iostream>
#include <string>
using namespace std;

class BankAccount {
private:     // 외부 접근 불가 (캡슐화)
    string owner;
    double balance;

public:      // 외부 접근 가능
    // 생성자 (Constructor): 객체 생성 시 자동 호출
    BankAccount(const string& owner, double initialBalance)
        : owner(owner), balance(initialBalance) {  // 멤버 초기화 리스트
    }

    // 소멸자 (Destructor): 객체 소멸 시 자동 호출
    ~BankAccount() {
        cout << owner << "의 계좌가 닫혔습니다.\n";
    }

    void deposit(double amount) {
        if (amount > 0) balance += amount;
    }

    bool withdraw(double amount) {
        if (amount > balance) {
            cout << "잔액 부족\n";
            return false;
        }
        balance -= amount;
        return true;
    }

    // const 멤버 함수: 객체의 상태를 변경하지 않음
    double getBalance() const { return balance; }
    string getOwner()   const { return owner; }

    void print() const {
        cout << owner << ": " << balance << "원\n";
    }
};

int main() {
    BankAccount acc("홍길동", 10000);
    acc.deposit(5000);
    acc.withdraw(3000);
    acc.print();     // 홍길동: 12000원

    // acc.balance = 999; // 오류! private 접근 불가

    return 0;
}
```

---

## 접근 제한자

```cpp
class Example {
public:       // 어디서든 접근 가능
    int pub;

protected:    // 자신과 자식 클래스에서만 접근 가능
    int prot;

private:      // 자신의 멤버 함수에서만 접근 가능 (기본값)
    int priv;
};

struct Point {  // struct: 기본 접근자가 public (class는 private)
    int x, y;   // 자동으로 public
};
```

---

## 생성자 종류

```cpp
class Vector2D {
public:
    double x, y;

    // 기본 생성자
    Vector2D() : x(0), y(0) {}

    // 매개변수 생성자
    Vector2D(double x, double y) : x(x), y(y) {}

    // 복사 생성자
    Vector2D(const Vector2D& other) : x(other.x), y(other.y) {
        cout << "복사 생성자 호출\n";
    }

    // 이동 생성자 (C++11)
    Vector2D(Vector2D&& other) noexcept : x(other.x), y(other.y) {
        cout << "이동 생성자 호출\n";
    }

    // 단일 인자 생성자: 암시적 변환 방지
    explicit Vector2D(double magnitude)
        : x(magnitude), y(0) {}
};

int main() {
    Vector2D v1;                // 기본 생성자
    Vector2D v2(3.0, 4.0);     // 매개변수 생성자
    Vector2D v3 = v2;           // 복사 생성자
    Vector2D v4 = std::move(v2); // 이동 생성자

    // explicit 덕분에 이런 암시적 변환 방지
    // Vector2D v5 = 5.0;  // 오류! (explicit 없으면 허용됨)
    Vector2D v6(5.0);      // 명시적 변환은 OK
}
```

---

## 멤버 초기화 리스트

생성자 본체(`{}`) 대신 콜론(`:`) 뒤에서 초기화합니다.

```cpp
class Rectangle {
    const int width;   // const 멤버는 반드시 초기화 리스트 사용
    const int height;
    int area;

public:
    Rectangle(int w, int h)
        : width(w), height(h), area(w * h) {
        // 이 시점에 width, height, area는 이미 초기화됨
        // 본체에서 width = w; 하면 const라 오류!
    }
};
```

---

## this 포인터

현재 객체를 가리키는 포인터. 멤버 함수 내에서 자신을 가리킵니다.

```cpp
class Counter {
    int count = 0;

public:
    Counter& increment() {
        count++;
        return *this;  // 자기 자신을 반환 → 메서드 체이닝
    }

    Counter& decrement() {
        count--;
        return *this;
    }

    void print() const {
        cout << count << "\n";
    }

    // 매개변수 이름이 멤버 변수와 같을 때 구분
    void setCount(int count) {
        this->count = count;  // this->count = 멤버, count = 매개변수
    }
};

int main() {
    Counter c;
    c.increment().increment().increment().decrement();
    c.print();   // 2 (메서드 체이닝)
}
```

---

## 정적(static) 멤버

클래스의 모든 인스턴스가 공유합니다.

```cpp
class Car {
public:
    static int totalCars;   // 정적 멤버 변수 (모든 Car 공유)
    string model;

    Car(const string& m) : model(m) {
        totalCars++;
    }

    ~Car() {
        totalCars--;
    }

    static int getTotal() {   // 정적 멤버 함수 (this 없음)
        return totalCars;
    }
};

// 클래스 외부에서 정의 (중요!)
int Car::totalCars = 0;

int main() {
    cout << Car::getTotal() << "\n";  // 0
    Car c1("Tesla"), c2("BMW");
    cout << Car::totalCars << "\n";   // 2
    cout << c1.getTotal()  << "\n";   // 2 (인스턴스로도 접근 가능)
}
```

---

## friend 함수/클래스

```cpp
class Matrix {
    double data[2][2];

public:
    Matrix(double a, double b, double c, double d) {
        data[0][0]=a; data[0][1]=b;
        data[1][0]=c; data[1][1]=d;
    }

    // friend 함수: 클래스의 private 멤버에 접근 가능
    friend Matrix operator*(const Matrix& a, const Matrix& b);
    friend ostream& operator<<(ostream& os, const Matrix& m);
};

Matrix operator*(const Matrix& a, const Matrix& b) {
    return Matrix(
        a.data[0][0]*b.data[0][0] + a.data[0][1]*b.data[1][0],
        a.data[0][0]*b.data[0][1] + a.data[0][1]*b.data[1][1],
        a.data[1][0]*b.data[0][0] + a.data[1][1]*b.data[1][0],
        a.data[1][0]*b.data[0][1] + a.data[1][1]*b.data[1][1]
    );
}
```

---

## 실전 예제 — 복소수 클래스

```cpp
#include <iostream>
#include <cmath>
using namespace std;

class Complex {
    double real, imag;

public:
    Complex(double r = 0, double i = 0) : real(r), imag(i) {}

    // 산술 연산자
    Complex operator+(const Complex& o) const {
        return {real + o.real, imag + o.imag};
    }
    Complex operator-(const Complex& o) const {
        return {real - o.real, imag - o.imag};
    }
    Complex operator*(const Complex& o) const {
        return {real*o.real - imag*o.imag,
                real*o.imag + imag*o.real};
    }

    // 크기
    double magnitude() const {
        return sqrt(real*real + imag*imag);
    }

    // 켤레 복소수
    Complex conjugate() const {
        return {real, -imag};
    }

    // 출력 연산자
    friend ostream& operator<<(ostream& os, const Complex& c) {
        os << c.real;
        if (c.imag >= 0) os << "+";
        os << c.imag << "i";
        return os;
    }
};

int main() {
    Complex a(3, 4), b(1, -2);
    cout << a + b << "\n";         // 4+2i
    cout << a * b << "\n";         // 11-2i
    cout << a.magnitude() << "\n"; // 5
}
```
