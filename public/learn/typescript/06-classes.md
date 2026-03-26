---
title: "클래스와 접근 제어자"
order: 6
---

# 클래스와 접근 제어자

TypeScript의 클래스는 JavaScript 클래스에 타입과 접근 제어자(Access Modifier)를 추가합니다. 객체지향 프로그래밍을 더 안전하게 할 수 있습니다.

---

## 기본 클래스

### JS에서는...

```js
// JS 클래스 - 타입 없음, 접근 제어 없음
class Animal {
  constructor(name) {
    this.name = name; // 어디서든 접근 가능
  }

  speak() {
    console.log(`${this.name}이(가) 소리를 냅니다.`);
  }
}

const dog = new Animal("강아지");
dog.name = "고양이"; // 자유롭게 변경 가능 (의도치 않은 변경 위험)
```

### TS에서는...

```ts
// TS 클래스 - 타입과 접근 제어자 추가
class Animal {
  name: string; // 속성 선언 필요

  constructor(name: string) {
    this.name = name;
  }

  speak(): void {
    console.log(`${this.name}이(가) 소리를 냅니다.`);
  }
}

const dog = new Animal("강아지");
dog.speak(); // "강아지이(가) 소리를 냅니다."
```

---

## 접근 제어자 (Access Modifiers)

### public: 어디서든 접근 가능 (기본값)

```ts
class User {
  public name: string; // public은 기본값이라 생략 가능
  public email: string;

  constructor(name: string, email: string) {
    this.name = name;
    this.email = email;
  }

  public greet(): void {
    console.log(`안녕하세요, ${this.name}입니다.`);
  }
}

const user = new User("김철수", "kim@example.com");
user.name = "이영희";  // 외부에서 접근 가능
user.email = "lee@example.com"; // 외부에서 접근 가능
user.greet(); // 메서드 호출 가능
```

### private: 클래스 내부에서만 접근 가능

```ts
class BankAccount {
  public owner: string;
  private balance: number; // 외부에서 직접 접근 불가

  constructor(owner: string, initialBalance: number) {
    this.owner = owner;
    this.balance = initialBalance;
  }

  // balance를 안전하게 조회하는 메서드
  public getBalance(): number {
    return this.balance;
  }

  // balance를 안전하게 변경하는 메서드
  public deposit(amount: number): void {
    if (amount <= 0) {
      throw new Error("입금액은 0보다 커야 합니다.");
    }
    this.balance += amount;
    console.log(`${amount}원 입금 완료. 잔액: ${this.balance}원`);
  }

  public withdraw(amount: number): void {
    if (amount > this.balance) {
      throw new Error("잔액이 부족합니다.");
    }
    this.balance -= amount;
    console.log(`${amount}원 출금 완료. 잔액: ${this.balance}원`);
  }
}

const account = new BankAccount("김철수", 10000);
account.deposit(5000);     // 5000원 입금 완료. 잔액: 15000원
account.withdraw(3000);    // 3000원 출금 완료. 잔액: 12000원
console.log(account.getBalance()); // 12000

// account.balance = 999999; // 오류! private이라 직접 접근 불가
```

### protected: 클래스와 자식 클래스에서 접근 가능

```ts
class Shape {
  protected color: string; // 자식 클래스에서는 접근 가능

  constructor(color: string) {
    this.color = color;
  }

  protected getInfo(): string {
    return `색상: ${this.color}`;
  }
}

class Circle extends Shape {
  private radius: number;

  constructor(color: string, radius: number) {
    super(color); // 부모 생성자 호출
    this.radius = radius;
  }

  public describe(): void {
    // protected 속성/메서드에 자식 클래스에서 접근 가능
    console.log(`원 - ${this.getInfo()}, 반지름: ${this.radius}`);
  }
}

const circle = new Circle("빨간색", 5);
circle.describe(); // "원 - 색상: 빨간색, 반지름: 5"
// circle.color;   // 오류! protected는 외부에서 접근 불가
```

### readonly: 읽기 전용

```ts
class Config {
  readonly appName: string;  // 한 번 설정하면 변경 불가
  readonly version: string;

  constructor(appName: string, version: string) {
    this.appName = appName;
    this.version = version;
  }
}

const config = new Config("MyApp", "1.0.0");
console.log(config.appName); // "MyApp" 읽기 가능
// config.appName = "OtherApp"; // 오류! readonly는 변경 불가
```

---

## 생성자 매개변수 단축 (Parameter Properties)

속성 선언과 할당을 한 번에 처리하는 TypeScript 전용 문법입니다.

```ts
// 일반적인 방식 (길다)
class Product {
  public id: number;
  public name: string;
  private price: number;
  readonly createdAt: Date;

  constructor(id: number, name: string, price: number) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.createdAt = new Date();
  }
}

// 단축 문법 (짧고 깔끔)
class Product {
  readonly createdAt: Date = new Date();

  constructor(
    public id: number,         // public 속성 자동 생성
    public name: string,       // public 속성 자동 생성
    private price: number,     // private 속성 자동 생성
  ) {}
  // 생성자 본문이 빔!

  getPrice(): number {
    return this.price;
  }
}

const product = new Product(1, "사과", 1000);
console.log(product.id);       // 1
console.log(product.name);     // "사과"
console.log(product.getPrice()); // 1000
// console.log(product.price); // 오류! private
```

---

## getter와 setter

속성처럼 접근하지만 내부적으로 메서드를 실행합니다.

```ts
class Temperature {
  private _celsius: number; // 실제 저장 값

  constructor(celsius: number) {
    this._celsius = celsius;
  }

  // getter: temperature.celsius로 읽을 수 있음
  get celsius(): number {
    return this._celsius;
  }

  // setter: temperature.celsius = 25 처럼 설정 가능
  set celsius(value: number) {
    if (value < -273.15) {
      throw new Error("절대 영도보다 낮을 수 없습니다.");
    }
    this._celsius = value;
  }

  // 화씨 변환 getter (읽기 전용)
  get fahrenheit(): number {
    return (this._celsius * 9) / 5 + 32;
  }
}

const temp = new Temperature(20);
console.log(temp.celsius);    // 20
console.log(temp.fahrenheit); // 68

temp.celsius = 30;           // setter 실행
console.log(temp.celsius);   // 30

// temp.celsius = -300;      // 오류 발생! 유효성 검사
```

---

## 상속 (Inheritance)

```ts
// 부모 클래스
class Vehicle {
  constructor(
    public brand: string,
    public model: string,
    protected speed: number = 0,
  ) {}

  accelerate(amount: number): void {
    this.speed += amount;
    console.log(`${this.brand} ${this.model}: 현재 속도 ${this.speed}km/h`);
  }

  brake(amount: number): void {
    this.speed = Math.max(0, this.speed - amount);
    console.log(`속도 감소: ${this.speed}km/h`);
  }
}

// 자식 클래스
class ElectricCar extends Vehicle {
  private batteryLevel: number;

  constructor(brand: string, model: string, batteryLevel: number) {
    super(brand, model); // 부모 생성자 먼저 호출
    this.batteryLevel = batteryLevel;
  }

  // 부모 메서드 오버라이드
  accelerate(amount: number): void {
    if (this.batteryLevel < 10) {
      console.log("배터리 부족! 충전이 필요합니다.");
      return;
    }
    super.accelerate(amount); // 부모 메서드 호출
    this.batteryLevel -= amount * 0.1; // 배터리 소모
  }

  charge(): void {
    this.batteryLevel = 100;
    console.log("충전 완료!");
  }

  getStatus(): string {
    return `${this.brand} ${this.model} - 배터리: ${this.batteryLevel}%`;
  }
}

const tesla = new ElectricCar("Tesla", "Model 3", 80);
tesla.accelerate(30); // "Tesla Model 3: 현재 속도 30km/h"
console.log(tesla.getStatus()); // "Tesla Model 3 - 배터리: 77%"
```

---

## 추상 클래스 (Abstract Class)

직접 인스턴스를 만들 수 없고, 반드시 상속해서 사용해야 하는 클래스입니다.

```ts
// 추상 클래스 - 직접 생성 불가
abstract class Animal {
  constructor(protected name: string) {}

  // 추상 메서드 - 자식 클래스에서 반드시 구현해야 함
  abstract makeSound(): void;

  // 일반 메서드 - 공통 기능
  move(): void {
    console.log(`${this.name}이(가) 이동합니다.`);
  }
}

// 자식 클래스에서 추상 메서드 구현
class Dog extends Animal {
  makeSound(): void {
    console.log(`${this.name}: 멍멍!`);
  }
}

class Cat extends Animal {
  makeSound(): void {
    console.log(`${this.name}: 야옹~`);
  }
}

// const animal = new Animal("동물"); // 오류! 추상 클래스는 직접 생성 불가

const dog = new Dog("바둑이");
const cat = new Cat("나비");

dog.makeSound(); // "바둑이: 멍멍!"
dog.move();      // "바둑이이(가) 이동합니다."
cat.makeSound(); // "나비: 야옹~"

// 다형성: 배열에 담아 일괄 처리
const animals: Animal[] = [dog, cat];
animals.forEach(animal => animal.makeSound());
```

---

## 인터페이스 구현 (implements)

```ts
// 인터페이스 정의
interface Serializable {
  serialize(): string;
  deserialize(data: string): void;
}

interface Validatable {
  validate(): boolean;
  getErrors(): string[];
}

// 여러 인터페이스를 동시에 구현
class UserForm implements Serializable, Validatable {
  private errors: string[] = [];

  constructor(
    public name: string,
    public email: string,
    public age: number,
  ) {}

  validate(): boolean {
    this.errors = [];

    if (!this.name.trim()) {
      this.errors.push("이름을 입력해주세요.");
    }
    if (!this.email.includes("@")) {
      this.errors.push("올바른 이메일 형식이 아닙니다.");
    }
    if (this.age < 0 || this.age > 150) {
      this.errors.push("올바른 나이를 입력해주세요.");
    }

    return this.errors.length === 0;
  }

  getErrors(): string[] {
    return [...this.errors]; // 복사본 반환
  }

  serialize(): string {
    return JSON.stringify({ name: this.name, email: this.email, age: this.age });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.name = parsed.name;
    this.email = parsed.email;
    this.age = parsed.age;
  }
}

const form = new UserForm("김철수", "kim@example.com", 25);
if (form.validate()) {
  console.log("유효한 폼입니다.");
  const serialized = form.serialize();
  console.log(serialized); // JSON 문자열
} else {
  console.log("오류:", form.getErrors());
}
```

---

## 정적 멤버 (Static Members)

인스턴스 없이 클래스 자체에 속하는 속성/메서드입니다.

```ts
class Counter {
  private static count: number = 0; // 모든 인스턴스가 공유

  private id: number;

  constructor() {
    Counter.count++; // 클래스명.속성으로 접근
    this.id = Counter.count;
  }

  static getCount(): number {
    return Counter.count; // static 메서드에서 static 속성 접근
  }

  getId(): number {
    return this.id;
  }
}

const c1 = new Counter();
const c2 = new Counter();
const c3 = new Counter();

console.log(Counter.getCount()); // 3 (정적 메서드는 클래스명으로 호출)
console.log(c1.getId());         // 1
console.log(c2.getId());         // 2
```

---

## 흔한 실수와 해결법

### 실수: super() 호출 누락

```ts
class Parent {
  constructor(public name: string) {}
}

class Child extends Parent {
  constructor(name: string, public age: number) {
    // super(name); // 이걸 빠뜨리면 오류!
    super(name); // 반드시 this 사용 전에 호출
    // 이제 this.age 사용 가능
  }
}
```

### 실수: abstract 메서드 미구현

```ts
abstract class Shape {
  abstract area(): number; // 반드시 구현 필요
}

class Square extends Shape {
  constructor(private side: number) { super(); }

  // area()를 구현하지 않으면 오류!
  area(): number {
    return this.side * this.side;
  }
}
```

---

## 정리

| 접근 제어자 | 클래스 내부 | 자식 클래스 | 외부 |
|------------|-----------|------------|------|
| `public` | ✅ | ✅ | ✅ |
| `protected` | ✅ | ✅ | ❌ |
| `private` | ✅ | ❌ | ❌ |
| `readonly` | 읽기만 | 읽기만 | 읽기만 |
