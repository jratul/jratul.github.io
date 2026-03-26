---
title: "스코프와 클로저"
order: 7
---

## 스코프(Scope)란?

**스코프**는 변수가 "살아있는 범위"입니다.
어떤 변수를 어디서 접근할 수 있는지 결정하는 규칙이에요.

마치 집 안의 물건은 집 안에서만 쓸 수 있고,
방 안의 물건은 그 방 안에서만 쓸 수 있는 것처럼요.

```javascript
// 전역 스코프 (어디서든 접근 가능)
const globalVar = "나는 전역 변수";

function myFunction() {
  // 함수 스코프 (함수 안에서만 접근 가능)
  const localVar = "나는 지역 변수";

  console.log(globalVar); // ✅ 전역 변수는 안에서 접근 가능
  console.log(localVar);  // ✅ 지역 변수도 같은 범위라 접근 가능
}

myFunction();
console.log(globalVar); // ✅ 전역이라 접근 가능
console.log(localVar);  // ❌ ReferenceError! 함수 밖에서 지역 변수 접근 불가
```

---

## 스코프의 종류

### 1. 전역 스코프 (Global Scope)

```javascript
// 함수나 블록 밖에서 선언 → 전역 스코프
const appName = "My App";
let userCount = 0;

function showInfo() {
  console.log(appName);    // ✅ 전역이라 어디서든 접근
  userCount++;             // ✅ 전역이라 수정도 가능
}

// ⚠️ 전역 변수는 최소화하는 게 좋아요
// 여러 곳에서 수정되면 버그 찾기가 어려워짐
```

### 2. 함수 스코프 (Function Scope)

```javascript
function calculateTotal(price, quantity) {
  const tax = 0.1;                        // 함수 안에서만 존재
  const subtotal = price * quantity;      // 함수 안에서만 존재
  const total = subtotal * (1 + tax);     // 함수 안에서만 존재

  return total;
}

console.log(calculateTotal(1000, 3)); // 3300
console.log(tax);      // ❌ ReferenceError!
console.log(subtotal); // ❌ ReferenceError!
```

### 3. 블록 스코프 (Block Scope) - let, const

```javascript
// let, const는 {} 블록 안에서만 유효
if (true) {
  let blockVar = "블록 변수";    // {} 안에서만 존재
  const blockConst = "블록 상수"; // {} 안에서만 존재
  var oldVar = "var 변수";       // var는 블록 무시! 함수 스코프

  console.log(blockVar);   // ✅ "블록 변수"
}

console.log(blockVar);   // ❌ ReferenceError!
console.log(blockConst); // ❌ ReferenceError!
console.log(oldVar);     // ✅ "var 변수" (var는 블록 밖에서도 접근됨)
```

---

## var vs let vs const (중요!)

```javascript
// var의 문제점 1: 블록 스코프 무시
for (var i = 0; i < 3; i++) {
  // i는 for 블록 안에서만 쓰려고 했는데...
}
console.log(i); // 3 ← var는 블록 밖으로 새어나옴!

// let은 블록 스코프 존중
for (let j = 0; j < 3; j++) {
  // j는 for 블록 안에서만 유효
}
console.log(j); // ❌ ReferenceError! 블록 밖에선 없음

// var의 문제점 2: 중복 선언 허용 → 실수 감지 못함
var name = "철수";
var name = "영희"; // ❌ 같은 이름 또 선언해도 오류 없음 → 버그의 원인

// let, const는 중복 선언 금지
let name2 = "철수";
let name2 = "영희"; // ✅ SyntaxError! 중복 선언 감지해줌

// var의 문제점 3: 호이스팅으로 인한 혼란
console.log(hoistVar); // undefined (오류 없이 그냥 실행됨)
var hoistVar = "나중에 선언";

console.log(hoistLet); // ❌ ReferenceError! (let은 선언 전 접근 불가)
let hoistLet = "나중에 선언";
```

> **결론**: `var`는 쓰지 마세요. `const`를 기본으로 쓰고, 값이 바뀌어야 할 때만 `let`을 사용하세요.

---

## 스코프 체인 (Scope Chain)

내부 스코프에서 변수를 찾을 때, **없으면 바깥쪽으로 계속 탐색**합니다.

```javascript
const level1 = "레벨 1"; // 전역

function outer() {
  const level2 = "레벨 2"; // outer 스코프

  function inner() {
    const level3 = "레벨 3"; // inner 스코프

    // 안쪽에서 바깥쪽으로 탐색 (스코프 체인)
    console.log(level3); // ✅ 자신의 스코프에서 찾음
    console.log(level2); // ✅ outer 스코프에서 찾음
    console.log(level1); // ✅ 전역 스코프에서 찾음
  }

  inner();
  console.log(level3); // ❌ ReferenceError! 안쪽은 접근 불가
}

outer();
```

변수를 찾는 순서: **현재 스코프 → 바깥 스코프 → ... → 전역 스코프**

---

## 클로저(Closure)란?

**클로저**는 함수가 자신이 생성될 때의 스코프를 기억하는 것입니다.

비유: 클로저는 **백팩**과 같아요.
함수가 밖으로 나갈 때 주변 변수들을 백팩에 넣어서 들고 나갑니다.
나중에 그 함수를 실행하면, 백팩에서 꺼내 쓸 수 있어요.

```javascript
function makeCounter() {
  let count = 0; // makeCounter의 지역 변수

  // 내부 함수가 count를 기억 (클로저!)
  function increment() {
    count++;
    console.log(count);
  }

  return increment; // 함수를 반환
}

const counter = makeCounter(); // makeCounter 실행이 끝나도...
counter(); // 1 ← count는 여전히 살아있음!
counter(); // 2
counter(); // 3

// makeCounter를 또 호출하면 새로운 count 생성
const counter2 = makeCounter();
counter2(); // 1 ← 독립적인 count!
counter();  // 4 ← 기존 counter의 count
```

`makeCounter`가 실행을 마쳐도 `count` 변수는 사라지지 않아요.
`increment` 함수가 `count`를 백팩에 담아서 기억하고 있기 때문이죠!

---

## 클로저 활용 예제

### 1. 데이터 은닉 (Private 변수)

```javascript
function createBankAccount(initialBalance) {
  let balance = initialBalance; // 외부에서 직접 접근 불가

  return {
    // 잔액 확인 (읽기만 가능)
    getBalance() {
      return balance;
    },

    // 입금
    deposit(amount) {
      if (amount <= 0) return "금액이 올바르지 않습니다";
      balance += amount; // 클로저로 balance 접근
      return `입금 완료. 잔액: ${balance}원`;
    },

    // 출금
    withdraw(amount) {
      if (amount > balance) return "잔액이 부족합니다";
      balance -= amount; // 클로저로 balance 접근
      return `출금 완료. 잔액: ${balance}원`;
    },
  };
}

const account = createBankAccount(10000);
console.log(account.getBalance()); // 10000
console.log(account.deposit(5000)); // "입금 완료. 잔액: 15000원"
console.log(account.withdraw(3000)); // "출금 완료. 잔액: 12000원"
console.log(account.balance); // undefined (직접 접근 불가!)
```

### 2. 함수 팩토리

```javascript
// 특정 값이 "고정"된 함수를 만드는 함수
function multiply(multiplier) {
  return function (number) {
    return number * multiplier; // multiplier를 기억 (클로저)
  };
}

const double = multiply(2);  // multiplier = 2 고정
const triple = multiply(3);  // multiplier = 3 고정
const tenTimes = multiply(10); // multiplier = 10 고정

console.log(double(5));   // 10
console.log(triple(5));   // 15
console.log(tenTimes(5)); // 50

// 실용 예시: 세금 계산기
function makeTaxCalculator(taxRate) {
  return function (price) {
    return price * (1 + taxRate); // taxRate 기억
  };
}

const addVAT = makeTaxCalculator(0.1);        // 부가세 10%
const addLuxuryTax = makeTaxCalculator(0.3);   // 사치세 30%

console.log(addVAT(10000));       // 11000
console.log(addLuxuryTax(10000)); // 13000
```

### 3. 메모이제이션 (캐싱)

```javascript
// 같은 인자로 호출된 결과를 기억해서 재사용
function memoize(fn) {
  const cache = {}; // 결과를 저장하는 캐시 (클로저)

  return function (n) {
    if (cache[n] !== undefined) {
      console.log(`캐시에서 반환: ${n}`);
      return cache[n]; // 이미 계산된 결과 반환
    }

    const result = fn(n); // 처음엔 직접 계산
    cache[n] = result;    // 결과 캐싱
    return result;
  };
}

// 피보나치 수열 (느린 버전)
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const fastFib = memoize(fibonacci);
console.log(fastFib(10)); // 55 (계산)
console.log(fastFib(10)); // 55 (캐시에서 즉시 반환)
```

---

## 클로저와 루프 (유명한 함정!)

```javascript
// ❌ var를 사용한 루프 - 클로저 함정
for (var i = 0; i < 3; i++) {
  setTimeout(function () {
    console.log(i); // 0, 1, 2가 아닌...
  }, 1000);
}
// 1초 후 출력: 3, 3, 3
// 이유: var i는 루프가 끝난 후 3이 되고,
//       3개의 함수가 모두 같은 i를 바라보기 때문

// ✅ let을 사용한 루프 - 각 반복마다 새로운 스코프
for (let j = 0; j < 3; j++) {
  setTimeout(function () {
    console.log(j); // 0, 1, 2 올바르게 출력
  }, 1000);
}
// 1초 후 출력: 0, 1, 2
// 이유: let j는 각 반복마다 새로운 j를 생성함

// ✅ 즉시 실행 함수(IIFE)로 해결 (ES5 시절 방법)
for (var k = 0; k < 3; k++) {
  (function (k) { // 즉시 실행 함수로 각 k를 캡처
    setTimeout(function () {
      console.log(k); // 0, 1, 2
    }, 1000);
  })(k);
}
```

---

## 즉시 실행 함수 (IIFE)

**IIFE(Immediately Invoked Function Expression)**는 정의하자마자 바로 실행되는 함수입니다.

```javascript
// 기본 IIFE 형태
(function () {
  const secret = "나만 아는 비밀"; // 외부에서 접근 불가
  console.log("즉시 실행됨!");
})();

// 화살표 함수 IIFE
(() => {
  console.log("화살표 IIFE");
})();

// 값 반환하는 IIFE
const result = (function () {
  const x = 10;
  const y = 20;
  return x + y; // 30 반환
})();

console.log(result); // 30

// 사용 사례: 전역 변수 오염 방지
(function () {
  // 여기서 선언한 변수들은 전역을 오염시키지 않음
  const config = { debug: true };
  const utils = {};
  // ...
})();
```

---

## 클로저 실전 예제: 이벤트 핸들러

```javascript
// 여러 버튼에 각각 다른 색상 설정
const colors = ["빨강", "파랑", "초록"];
const buttons = document.querySelectorAll(".color-btn");

buttons.forEach((btn, index) => {
  // 각 버튼이 자신의 index와 color를 기억 (클로저)
  const color = colors[index];

  btn.addEventListener("click", () => {
    // color 변수가 클로저로 캡처됨
    document.body.style.backgroundColor = color;
    console.log(`${color} 버튼 클릭됨`);
  });
});
```

---

## 호이스팅(Hoisting)

자바스크립트는 코드 실행 전에 변수/함수 선언을 맨 위로 끌어올립니다.

```javascript
// 함수 선언식은 완전히 호이스팅됨 → 선언 전에 호출 가능
sayHello(); // ✅ "안녕하세요!" (선언 전에도 호출 가능)

function sayHello() {
  console.log("안녕하세요!");
}

// 함수 표현식은 변수만 호이스팅됨 → 선언 전에 호출 불가
greet(); // ❌ TypeError: greet is not a function

const greet = function () {
  console.log("반갑습니다!");
};

// var는 선언만 호이스팅 (값은 undefined)
console.log(myVar); // undefined (오류 아님!)
var myVar = "나중에 선언";

// let/const는 TDZ(Temporal Dead Zone)로 접근 불가
console.log(myLet); // ❌ ReferenceError!
let myLet = "나중에 선언";
```

---

## 정리

### 스코프 규칙
- **전역 스코프**: 어디서든 접근 가능
- **함수 스코프**: 함수 안에서만 접근 가능
- **블록 스코프**: `{}` 블록 안에서만 접근 가능 (let, const)
- **스코프 체인**: 안쪽에서 바깥쪽으로 변수 탐색

### 클로저 핵심
- 함수는 자신이 생성된 스코프를 기억한다
- 외부 함수가 종료되어도 내부 함수가 사용하는 변수는 살아있다
- **데이터 은닉**, **함수 팩토리**, **메모이제이션** 등에 활용

### var 사용 금지 이유
- 블록 스코프 무시
- 중복 선언 허용
- 예측 불가한 호이스팅 동작

클로저는 처음엔 어렵게 느껴지지만, 자바스크립트의 핵심 개념입니다.
React의 훅(useState, useEffect 등)도 클로저를 활용하므로 꼭 이해해두세요!
