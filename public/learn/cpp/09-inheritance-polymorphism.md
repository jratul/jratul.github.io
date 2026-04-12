---
title: "상속과 다형성"
order: 9
---

상속은 기존 클래스를 재사용하고 확장하는 메커니즘입니다. 다형성은 같은 인터페이스로 다른 동작을 구현합니다.

---

## 상속 기본

```cpp
#include <iostream>
#include <string>
using namespace std;

// 기반 클래스 (Base Class, 부모 클래스)
class Animal {
protected:          // 자식 클래스에서 접근 가능
    string name;
    int    age;

public:
    Animal(const string& name, int age)
        : name(name), age(age) {}

    virtual ~Animal() {}  // 가상 소멸자 (다형성 사용 시 필수!)

    void breathe() const {
        cout << name << "이(가) 숨을 쉽니다.\n";
    }

    // virtual: 자식 클래스에서 재정의 가능
    virtual void makeSound() const {
        cout << name << ": ...\n";
    }

    virtual string getType() const { return "Animal"; }
};

// 파생 클래스 (Derived Class, 자식 클래스)
class Dog : public Animal {  // public 상속 (가장 일반적)
    string breed;

public:
    Dog(const string& name, int age, const string& breed)
        : Animal(name, age),    // 부모 생성자 호출
          breed(breed) {}

    // override: 부모의 virtual 함수를 재정의 (C++11, 권장)
    void makeSound() const override {
        cout << name << ": 멍멍!\n";
    }

    string getType() const override { return "Dog"; }

    void fetch() const {
        cout << name << "이(가) 공을 가져왔습니다.\n";
    }
};

class Cat : public Animal {
public:
    Cat(const string& name, int age) : Animal(name, age) {}

    void makeSound() const override {
        cout << name << ": 야옹~\n";
    }

    string getType() const override { return "Cat"; }
};

int main() {
    Dog d("바둑이", 3, "진돗개");
    Cat c("나비", 2);

    d.breathe();      // Animal의 함수 (상속)
    d.makeSound();    // Dog의 함수 (재정의)
    d.fetch();        // Dog 전용 함수

    c.makeSound();    // Cat의 함수
}
```

---

## 다형성 (Polymorphism)

부모 포인터/참조로 자식 객체를 가리켜 다른 동작을 수행합니다.

```cpp
int main() {
    // 업캐스팅: 자식 → 부모 (자동)
    Animal* animals[] = {
        new Dog("바둑이", 3, "진돗개"),
        new Cat("나비", 2),
        new Dog("해피", 1, "푸들"),
    };

    // 런타임 다형성: 실제 타입에 맞는 함수 호출
    for (Animal* a : animals) {
        a->makeSound();   // 각 동물의 소리 출력
        cout << a->getType() << "\n";
    }
    // 바둑이: 멍멍! / Dog
    // 나비: 야옹~ / Cat
    // 해피: 멍멍! / Dog

    // 다운캐스팅: 부모 → 자식 (dynamic_cast로 안전하게)
    for (Animal* a : animals) {
        Dog* d = dynamic_cast<Dog*>(a);
        if (d != nullptr) {
            d->fetch();   // Dog만 fetch 가능
        }
    }

    // 메모리 해제 (가상 소멸자가 없으면 자식 소멸자 미호출!)
    for (Animal* a : animals) delete a;
}
```

---

## 순수 가상 함수와 추상 클래스

순수 가상 함수를 하나라도 가지면 **추상 클래스** — 인스턴스 생성 불가.

```cpp
class Shape {  // 추상 클래스
public:
    virtual ~Shape() {}

    virtual double area()      const = 0;  // 순수 가상 함수
    virtual double perimeter() const = 0;
    virtual void   draw()      const = 0;

    // 구체적인 구현도 가능
    void printInfo() const {
        cout << "넓이: " << area()
             << ", 둘레: " << perimeter() << "\n";
    }
};

class Circle : public Shape {
    double radius;
public:
    Circle(double r) : radius(r) {}

    double area()      const override { return 3.14159 * radius * radius; }
    double perimeter() const override { return 2 * 3.14159 * radius; }
    void   draw()      const override { cout << "⬤ (반지름=" << radius << ")\n"; }
};

class Rectangle : public Shape {
    double w, h;
public:
    Rectangle(double w, double h) : w(w), h(h) {}

    double area()      const override { return w * h; }
    double perimeter() const override { return 2 * (w + h); }
    void   draw()      const override { cout << "▬ (" << w << "x" << h << ")\n"; }
};

int main() {
    // Shape s;  // 오류! 추상 클래스 인스턴스화 불가

    Shape* shapes[] = {
        new Circle(5),
        new Rectangle(4, 6),
    };

    for (Shape* s : shapes) {
        s->draw();
        s->printInfo();
        delete s;
    }
}
```

---

## 상속 접근 지정자

```cpp
class Base {
public:    int pub  = 1;
protected: int prot = 2;
private:   int priv = 3;
};

class PublicDerived    : public    Base { };  // pub→pub, prot→prot
class ProtectedDerived : protected Base { };  // pub→prot, prot→prot
class PrivateDerived   : private   Base { };  // pub→priv, prot→priv
```

실무에서는 거의 항상 `public` 상속을 사용합니다.

---

## 다중 상속

```cpp
class Flyable {
public:
    virtual void fly() const { cout << "날고 있습니다\n"; }
};

class Swimmable {
public:
    virtual void swim() const { cout << "수영하고 있습니다\n"; }
};

class Duck : public Animal, public Flyable, public Swimmable {
public:
    Duck(const string& name) : Animal(name, 1) {}

    void makeSound() const override { cout << name << ": 꽥꽥!\n"; }
};

Duck d("도날드");
d.fly();    // Flyable에서
d.swim();   // Swimmable에서
d.makeSound(); // Duck에서
```

### 다이아몬드 문제와 가상 상속

```cpp
class A { public: int x = 10; };
class B : virtual public A { };   // virtual 상속
class C : virtual public A { };   // virtual 상속
class D : public B, public C { }; // A가 하나만 상속됨

D d;
d.x = 42;  // 모호하지 않음! (가상 상속 덕분에 A가 하나)
```

---

## final과 override

```cpp
class Base {
public:
    virtual void method() {}
    virtual void sealed() final {}  // 더 이상 재정의 불가
};

class Derived : public Base {
public:
    void method() override {}      // 명시적으로 재정의 표시
    // void sealed() override {}   // 오류! final이라 재정의 불가
};

class FinalClass final : public Base {  // 이 클래스를 상속할 수 없음
};

// class Child : public FinalClass {};  // 오류!
```

---

## 실전 예제 — 도형 계산기

```cpp
#include <iostream>
#include <vector>
#include <memory>
#include <cmath>
using namespace std;

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual string name() const = 0;
};

class Circle : public Shape {
    double r;
public:
    Circle(double r) : r(r) {}
    double area() const override { return M_PI * r * r; }
    string name() const override { return "원"; }
};

class Triangle : public Shape {
    double base, height;
public:
    Triangle(double b, double h) : base(b), height(h) {}
    double area() const override { return 0.5 * base * height; }
    string name() const override { return "삼각형"; }
};

class Rectangle : public Shape {
    double w, h;
public:
    Rectangle(double w, double h) : w(w), h(h) {}
    double area() const override { return w * h; }
    string name() const override { return "직사각형"; }
};

int main() {
    vector<unique_ptr<Shape>> shapes;
    shapes.push_back(make_unique<Circle>(5));
    shapes.push_back(make_unique<Triangle>(6, 4));
    shapes.push_back(make_unique<Rectangle>(3, 7));

    double totalArea = 0;
    for (const auto& s : shapes) {
        cout << s->name() << " 넓이: " << s->area() << "\n";
        totalArea += s->area();
    }
    cout << "총 넓이: " << totalArea << "\n";
}
```
