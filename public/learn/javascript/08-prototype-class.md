---
title: "프로토타입과 클래스"
order: 8
---

## 프로토타입(Prototype)이란?

자바스크립트의 모든 객체는 **프로토타입(Prototype)**이라는 숨겨진 부모 객체를 가집니다.

비유하자면: **DNA 유전**과 같아요.
부모의 특성을 자식이 물려받는 것처럼,
자바스크립트 객체는 프로토타입으로부터 메서드와 속성을 물려받습니다.

```javascript
// 배열을 만들면 배열의 메서드들을 사용할 수 있는 이유
const arr = [1, 2, 3];
arr.push(4);    // ← 이 메서드는 어디서 왔을까?
arr.map(x => x * 2);

// arr 객체 자체에는 push, map이 없어요
// Array.prototype에 있는 메서드를 물려받은 것!
console.log(arr.hasOwnProperty("push")); // false (내 것 아님)
console.log(Array.prototype.hasOwnProperty("push")); // true (여기 있음!)
```

---

## 프로토타입 체인

```javascript
// 프로토타입 체인: 없으면 계속 위로 올라가며 탐색
const dog = {
  name: "멍멍이",
  bark() {
    console.log("왈왈!");
  },
};

const puppy = Object.create(dog); // dog를 프로토타입으로 하는 객체 생성
puppy.name = "강아지";

puppy.bark(); // ✅ "왈왈!" (자신에게 없으니 dog에서 찾음)
console.log(puppy.name); // "강아지" (자신의 name 사용)

// 탐색 순서: puppy → dog → Object.prototype → null
```

---

## 생성자 함수 (ES5 방식)

같은 구조의 객체를 여러 개 만들 때 **생성자 함수**를 사용했어요:

```javascript
// 생성자 함수 (관례: 대문자로 시작)
function Person(name, age) {
  this.name = name;  // 인스턴스 속성
  this.age = age;
}

// 메서드는 prototype에 추가 (모든 인스턴스가 공유)
Person.prototype.greet = function () {
  console.log(`안녕하세요, ${this.name}입니다. (${this.age}세)`);
};

Person.prototype.birthday = function () {
  this.age++;
  console.log(`생일 축하해요! 이제 ${this.age}세입니다.`);
};

// new 키워드로 인스턴스 생성
const alice = new Person("앨리스", 25);
const bob = new Person("밥", 30);

alice.greet();   // "안녕하세요, 앨리스입니다. (25세)"
bob.greet();     // "안녕하세요, 밥입니다. (30세)"
alice.birthday(); // "생일 축하해요! 이제 26세입니다."

// 두 인스턴스는 같은 메서드 참조 (메모리 효율적)
console.log(alice.greet === bob.greet); // true (같은 함수!)
```

---

## 클래스 (ES6 이후, 권장!)

ES6부터 클래스 문법이 추가됐습니다.
내부적으로는 프로토타입을 사용하지만 **훨씬 읽기 쉬운 문법**이에요.

```javascript
class Person {
  // constructor: 인스턴스 생성 시 실행되는 함수
  constructor(name, age) {
    this.name = name; // 인스턴스 속성 설정
    this.age = age;
  }

  // 메서드 (자동으로 prototype에 추가됨)
  greet() {
    console.log(`안녕하세요, ${this.name}입니다. (${this.age}세)`);
  }

  birthday() {
    this.age++;
    console.log(`생일 축하해요! 이제 ${this.age}세입니다.`);
  }

  // getter - 속성처럼 접근
  get info() {
    return `${this.name} (${this.age}세)`;
  }

  // setter - 속성처럼 설정
  set info(value) {
    const [name, age] = value.split(",");
    this.name = name.trim();
    this.age = parseInt(age.trim());
  }

  // static 메서드 - 인스턴스 없이 클래스에서 직접 호출
  static create(name, age) {
    return new Person(name, age);
  }
}

// 인스턴스 생성
const person1 = new Person("김철수", 25);
const person2 = Person.create("이영희", 30); // static 메서드 사용

person1.greet(); // "안녕하세요, 김철수입니다. (25세)"

// getter 사용
console.log(person1.info); // "김철수 (25세)"

// setter 사용
person1.info = "박민준, 28";
console.log(person1.name); // "박민준"
console.log(person1.age);  // 28
```

---

## 클래스 상속 (extends)

**상속**으로 기존 클래스를 확장할 수 있어요:

```javascript
// 부모 클래스 (Animal)
class Animal {
  constructor(name, sound) {
    this.name = name;
    this.sound = sound;
  }

  // 모든 동물이 가진 공통 기능
  makeSound() {
    console.log(`${this.name}: ${this.sound}!`);
  }

  eat(food) {
    console.log(`${this.name}이(가) ${food}을(를) 먹습니다.`);
  }
}

// 자식 클래스 (Dog - Animal 상속)
class Dog extends Animal {
  constructor(name, breed) {
    super(name, "왈왈");  // ← 부모 constructor 호출 필수!
    this.breed = breed;    // Dog만의 추가 속성
  }

  // Dog만의 메서드 추가
  fetch() {
    console.log(`${this.name}이(가) 공을 가져옵니다!`);
  }

  // 부모 메서드 오버라이드
  makeSound() {
    console.log(`강아지 ${this.name}: 왈왈! (품종: ${this.breed})`);
  }
}

// 자식 클래스 (Cat - Animal 상속)
class Cat extends Animal {
  constructor(name) {
    super(name, "야옹");
    this.isIndoor = true; // Cat만의 속성
  }

  purr() {
    console.log(`${this.name}: 그르르르...`);
  }
}

const dog = new Dog("멍멍이", "골든 리트리버");
const cat = new Cat("냐옹이");

dog.makeSound(); // "강아지 멍멍이: 왈왈! (품종: 골든 리트리버)"
dog.eat("사료"); // "멍멍이이(가) 사료을(를) 먹습니다." (부모 메서드)
dog.fetch();     // "멍멍이이(가) 공을 가져옵니다!"

cat.makeSound(); // "냐옹이: 야옹!" (부모 메서드)
cat.purr();      // "냐옹이: 그르르르..."

// instanceof로 타입 확인
console.log(dog instanceof Dog);    // true
console.log(dog instanceof Animal); // true (부모 클래스도 true)
console.log(cat instanceof Dog);    // false
```

---

## super 키워드

```javascript
class Vehicle {
  constructor(brand, model) {
    this.brand = brand;
    this.model = model;
    this.speed = 0;
  }

  accelerate(amount) {
    this.speed += amount;
    console.log(`${this.brand} ${this.model}: 속도 ${this.speed}km/h`);
  }

  describe() {
    return `${this.brand} ${this.model}`;
  }
}

class ElectricCar extends Vehicle {
  constructor(brand, model, batteryCapacity) {
    super(brand, model);              // 부모 constructor 호출 (필수!)
    this.batteryCapacity = batteryCapacity;
    this.batteryLevel = 100;          // 전기차 전용 속성
  }

  // 부모 메서드 확장
  accelerate(amount) {
    super.accelerate(amount);         // 부모 메서드 호출
    this.batteryLevel -= amount * 0.1; // 추가 로직: 배터리 소모
    console.log(`배터리: ${this.batteryLevel.toFixed(1)}%`);
  }

  // 부모 메서드 활용
  describe() {
    return `${super.describe()} (전기차, ${this.batteryCapacity}kWh)`; // super로 부모 메서드 호출
  }

  charge() {
    this.batteryLevel = 100;
    console.log("충전 완료!");
  }
}

const tesla = new ElectricCar("Tesla", "Model 3", 75);
tesla.accelerate(50);
// "Tesla Model 3: 속도 50km/h"
// "배터리: 95.0%"

console.log(tesla.describe());
// "Tesla Model 3 (전기차, 75kWh)"
```

---

## Private 필드 (ES2022)

```javascript
class BankAccount {
  // # 으로 시작하면 private (외부 접근 불가)
  #balance = 0;
  #transactionHistory = [];

  constructor(owner, initialBalance) {
    this.owner = owner;    // public
    this.#balance = initialBalance; // private
  }

  deposit(amount) {
    if (amount <= 0) throw new Error("금액은 양수여야 합니다");
    this.#balance += amount;
    this.#transactionHistory.push({ type: "입금", amount });
    return this;
  }

  withdraw(amount) {
    if (amount > this.#balance) throw new Error("잔액 부족");
    this.#balance -= amount;
    this.#transactionHistory.push({ type: "출금", amount });
    return this;
  }

  get balance() {
    return this.#balance; // getter로만 읽기 허용
  }

  get history() {
    return [...this.#transactionHistory]; // 복사본 반환 (원본 보호)
  }
}

const account = new BankAccount("김철수", 10000);
account.deposit(5000).withdraw(3000); // 메서드 체이닝

console.log(account.balance); // 12000 (getter로 접근)
console.log(account.#balance); // ❌ SyntaxError! private 접근 불가
```

---

## 믹스인 패턴 (다중 기능 조합)

자바스크립트는 단일 상속만 지원하지만, 믹스인으로 여러 기능을 조합할 수 있어요:

```javascript
// 믹스인: 여러 클래스에 추가할 공통 기능
const Serializable = (Base) => class extends Base {
  serialize() {
    return JSON.stringify(this);
  }

  static deserialize(json) {
    return Object.assign(new this(), JSON.parse(json));
  }
};

const Timestamped = (Base) => class extends Base {
  constructor(...args) {
    super(...args);
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  touch() {
    this.updatedAt = new Date().toISOString();
  }
};

// 기본 클래스
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
}

// 믹스인 적용
class EnhancedUser extends Serializable(Timestamped(User)) {
  constructor(name, email) {
    super(name, email);
  }
}

const user = new EnhancedUser("김철수", "kim@example.com");
console.log(user.serialize()); // JSON 직렬화
console.log(user.createdAt);   // 생성 시각
```

---

## 자주 하는 실수

```javascript
// ❌ 실수 1: constructor에서 super 빠뜨리기
class Child extends Parent {
  constructor(name) {
    // super() 없이 this 사용 → ReferenceError!
    this.name = name; // ❌
  }
}

// ✅ extends면 반드시 super() 먼저
class Child extends Parent {
  constructor(name) {
    super();         // ✅ 부모 constructor 먼저
    this.name = name;
  }
}

// ❌ 실수 2: 화살표 함수를 클래스 메서드로 쓸 때 this 혼란
class Timer {
  constructor() {
    this.seconds = 0;
  }

  // ❌ 일반 메서드는 이벤트 핸들러로 쓰면 this가 바뀜
  tick() {
    this.seconds++; // this가 Timer 인스턴스를 가리키지 않을 수 있음
  }

  // ✅ 화살표 함수 필드는 this 고정
  tickArrow = () => {
    this.seconds++; // this가 항상 Timer 인스턴스
  };
}
```

---

## 정리

| 개념 | 설명 |
|------|------|
| 프로토타입 | 객체가 상속받는 부모 객체 |
| 프로토타입 체인 | 없는 속성/메서드를 상위로 올라가며 탐색 |
| 클래스 | 객체 생성 템플릿 (ES6+) |
| `constructor` | 인스턴스 생성 시 실행 |
| `extends` | 클래스 상속 |
| `super` | 부모 클래스 접근 |
| `static` | 인스턴스 없이 클래스에서 직접 호출 |
| `#field` | Private 필드 (외부 접근 불가) |
| `get/set` | 속성처럼 동작하는 메서드 |

클래스를 이해하면 **React 컴포넌트**, **TypeScript 인터페이스** 등
현대 개발에서 자주 사용하는 패턴들이 더 쉽게 이해됩니다!
