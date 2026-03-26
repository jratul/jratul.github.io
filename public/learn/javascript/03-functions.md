---
title: "함수"
order: 3
---

## 함수란? — 재사용 가능한 코드 묶음

함수(function)는 **특정 작업을 수행하는 코드 블록에 이름을 붙인 것**입니다.
레시피와 비슷합니다. "김치찌개 레시피"를 한 번 써두면 언제든 그 이름으로 불러서 똑같이 만들 수 있죠.

함수가 없다면 같은 코드를 여러 번 반복해서 작성해야 합니다.

```javascript
// 함수 없이 인사말 출력 (반복 작성)
console.log("안녕하세요, 김철수님!");
console.log("안녕하세요, 이영희님!");
console.log("안녕하세요, 박민준님!");

// 함수로 만들면 — 한 번 정의하고 여러 번 사용
function greet(name) {
  console.log(`안녕하세요, ${name}님!`);
}

greet("김철수");  // 안녕하세요, 김철수님!
greet("이영희");  // 안녕하세요, 이영희님!
greet("박민준");  // 안녕하세요, 박민준님!
```

---

## 함수 선언 — 세 가지 방법

### 1. 함수 선언문 (Function Declaration)

```javascript
// function 키워드로 선언
function add(a, b) {
  return a + b;  // 결과값을 반환
}

let result = add(3, 5);  // 함수 호출
console.log(result);     // 8

// 함수 선언문의 특징: 호이스팅 (hoisting)
// 선언 전에도 호출 가능합니다
greetKorean("홍길동");  // 에러 없이 실행됨!

function greetKorean(name) {
  console.log(`안녕하세요, ${name}님`);
}
```

### 2. 함수 표현식 (Function Expression)

```javascript
// 변수에 함수를 저장
const multiply = function(a, b) {
  return a * b;
};

console.log(multiply(4, 5));  // 20

// 함수 표현식은 호이스팅이 안 됩니다
// sayHi("철수");  // 에러! 선언 전에 호출 불가

const sayHi = function(name) {
  console.log(`Hi, ${name}!`);
};

sayHi("철수");  // Hi, 철수!
```

### 3. 화살표 함수 (Arrow Function) — 현대적 방식

```javascript
// 가장 짧은 형태
const add = (a, b) => a + b;  // 중괄호와 return 생략 가능!

// 일반적인 형태
const greet = (name) => {
  const message = `안녕하세요, ${name}님!`;
  return message;
};

// 매개변수가 하나면 소괄호 생략 가능
const double = n => n * 2;

console.log(add(3, 4));      // 7
console.log(greet("철수"));  // 안녕하세요, 철수님!
console.log(double(5));      // 10

// 매개변수가 없으면 빈 소괄호 필요
const sayHello = () => console.log("안녕!");
sayHello();  // 안녕!
```

---

## 매개변수와 인수

```javascript
// 매개변수(parameter): 함수 정의 시 사용하는 변수 이름
function introduce(name, age) {  // name, age가 매개변수
  console.log(`저는 ${name}이고 ${age}살입니다.`);
}

// 인수(argument): 함수 호출 시 전달하는 실제 값
introduce("김철수", 25);  // "김철수", 25가 인수

// 기본값(default parameter)
function greet(name, greeting = "안녕하세요") {
  // greeting에 값이 전달되지 않으면 "안녕하세요" 사용
  console.log(`${greeting}, ${name}님!`);
}

greet("이영희");              // 안녕하세요, 이영희님!
greet("박민준", "좋은 아침");  // 좋은 아침, 박민준님!
```

### 나머지 매개변수 (Rest Parameters)

```javascript
// ...을 붙이면 나머지 인수를 배열로 받음
function sum(...numbers) {
  let total = 0;
  for (let num of numbers) {
    total += num;
  }
  return total;
}

console.log(sum(1, 2, 3));        // 6
console.log(sum(1, 2, 3, 4, 5)); // 15

// 첫 번째 매개변수는 고정, 나머지는 배열로
function logInfo(label, ...items) {
  console.log(`[${label}]`, items);
}

logInfo("과일", "사과", "바나나", "딸기");
// [과일] ["사과", "바나나", "딸기"]
```

---

## return — 값 돌려주기

```javascript
function square(n) {
  return n * n;  // 계산 결과를 반환
}

let area = square(5);  // 반환된 25가 area에 저장
console.log(area);     // 25

// return이 없으면 undefined 반환
function noReturn() {
  console.log("반환값 없음");
}

let result = noReturn();  // "반환값 없음" 출력
console.log(result);      // undefined

// return은 함수를 즉시 종료시킵니다
function checkAge(age) {
  if (age < 0) {
    return;  // 음수면 여기서 종료 (조기 반환)
  }
  if (age < 18) {
    return "미성년자";
  }
  return "성인";
}

console.log(checkAge(-1));  // undefined (조기 반환)
console.log(checkAge(15));  // 미성년자
console.log(checkAge(20));  // 성인
```

---

## 함수 스코프 — 변수의 생존 범위

```javascript
let globalVar = "전역 변수";  // 어디서든 접근 가능

function myFunction() {
  let localVar = "지역 변수";  // 함수 안에서만 존재
  console.log(globalVar);  // 전역 변수 접근 가능
  console.log(localVar);   // 지역 변수 접근 가능
}

myFunction();
console.log(globalVar);  // 접근 가능
// console.log(localVar);  // 에러! 함수 밖에서 접근 불가

// 함수 안에서 선언한 변수는 밖에서 모름
function makeMessage() {
  let secret = "비밀 메시지";
  return secret;  // 직접 접근이 아니라 return으로 반환
}

let msg = makeMessage();
console.log(msg);  // 비밀 메시지
```

---

## 고차 함수 — 함수를 값처럼 다루기

JavaScript에서 함수는 **일급 객체(first-class citizen)**입니다.
변수에 저장하고, 다른 함수에 전달하고, 함수에서 반환할 수 있습니다.

```javascript
// 함수를 변수에 저장
const greet = name => `안녕, ${name}!`;

// 함수를 다른 함수의 인수로 전달 (콜백 함수)
function doTwice(fn, value) {
  fn(value);  // 첫 번째 호출
  fn(value);  // 두 번째 호출
}

doTwice(name => console.log(`Hi, ${name}!`), "철수");
// Hi, 철수!
// Hi, 철수!

// 함수를 반환하는 함수 (고차 함수)
function makeMultiplier(factor) {
  return function(number) {  // 함수를 반환!
    return number * factor;
  };
}

const double = makeMultiplier(2);  // factor가 2인 함수 생성
const triple = makeMultiplier(3);  // factor가 3인 함수 생성

console.log(double(5));  // 10
console.log(triple(5));  // 15
```

---

## 배열 메서드와 함수 — 실용적인 조합

```javascript
let numbers = [1, 2, 3, 4, 5];

// forEach: 각 요소에 함수 실행
numbers.forEach(num => {
  console.log(num * 2);  // 2, 4, 6, 8, 10
});

// map: 각 요소를 변환해서 새 배열 반환
let doubled = numbers.map(num => num * 2);
console.log(doubled);  // [2, 4, 6, 8, 10]

// filter: 조건에 맞는 요소만 추려서 새 배열 반환
let evens = numbers.filter(num => num % 2 === 0);
console.log(evens);  // [2, 4]

// reduce: 배열을 하나의 값으로 줄이기
let sum = numbers.reduce((total, num) => total + num, 0);
console.log(sum);  // 15 (1+2+3+4+5)

// 체이닝: 여러 메서드 연결
let result = numbers
  .filter(num => num > 2)    // [3, 4, 5]
  .map(num => num * 10)      // [30, 40, 50]
  .reduce((sum, n) => sum + n, 0);  // 120
console.log(result);  // 120
```

---

## 즉시 실행 함수 (IIFE)

```javascript
// 선언하자마자 바로 실행되는 함수
(function() {
  let privateVar = "외부에서 접근 불가";
  console.log("즉시 실행!");
})();  // 마지막 ()가 즉시 호출

// 화살표 함수 버전
(() => {
  console.log("화살표 IIFE");
})();

// 활용: 변수 충돌 방지, 초기화 코드
(function init() {
  const appName = "My App";
  console.log(`${appName} 초기화 완료`);
  // appName은 여기서만 존재 (전역 오염 없음)
})();
```

---

## 실용 예제 — 계산기 함수

```javascript
// 각 연산을 함수로 만들기
const calculator = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => {
    if (b === 0) {
      return "0으로 나눌 수 없습니다.";
    }
    return a / b;
  },
};

console.log(calculator.add(10, 5));       // 15
console.log(calculator.subtract(10, 5));  // 5
console.log(calculator.multiply(10, 5));  // 50
console.log(calculator.divide(10, 0));    // 0으로 나눌 수 없습니다.

// 범용 계산 함수
function calculate(a, operation, b) {
  return operation(a, b);
}

console.log(calculate(10, calculator.add, 5));       // 15
console.log(calculate(10, calculator.multiply, 5));  // 50

// 입력값 검증 함수
function validateAge(age) {
  if (typeof age !== "number") {
    return { valid: false, error: "숫자를 입력해주세요." };
  }
  if (age < 0 || age > 150) {
    return { valid: false, error: "유효하지 않은 나이입니다." };
  }
  return { valid: true, value: age };
}

console.log(validateAge("스물"));  // {valid: false, error: "숫자를 입력해주세요."}
console.log(validateAge(200));     // {valid: false, error: "유효하지 않은 나이입니다."}
console.log(validateAge(25));      // {valid: true, value: 25}
```

---

## 함수 선언 방식 비교 정리

| 방식 | 문법 | 호이스팅 | 주요 사용처 |
|------|------|---------|------------|
| 함수 선언문 | `function name() {}` | O | 일반 함수 |
| 함수 표현식 | `const name = function() {}` | X | 조건부 함수 할당 |
| 화살표 함수 | `const name = () => {}` | X | 콜백, 짧은 함수 |

**권장 방식**:
- 일반 함수: 화살표 함수 또는 함수 선언문
- 콜백: 화살표 함수 (`.map()`, `.filter()` 등)
- 메서드: 일반 함수 또는 단축 메서드 (`{}` 안)

다음 단계: 객체와 배열을 배워 더 복잡한 데이터를 다뤄봅시다.
