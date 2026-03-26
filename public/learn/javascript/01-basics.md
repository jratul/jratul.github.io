---
title: "변수와 데이터 타입"
order: 1
---

## JavaScript란?

HTML이 뼈대, CSS가 옷이라면 **JavaScript는 행동**입니다.
버튼을 클릭했을 때 무언가 일어나게 하고, 입력값을 검사하고, 서버에서 데이터를 가져오는 모든 것이 JavaScript의 역할입니다.

브라우저에서 직접 실행되는 유일한 프로그래밍 언어이며, 요즘은 서버(Node.js), 모바일 앱, 데스크탑 앱까지 만들 수 있습니다.

---

## 변수 — 이름표 붙은 상자

변수(variable)는 **데이터를 담아두는 상자**입니다.
상자에 이름표를 붙여두면 나중에 그 이름으로 내용물을 꺼낼 수 있습니다.

```javascript
// let으로 변수를 선언합니다
let age = 25;         // age라는 상자에 25를 넣음
let name = "김철수";  // name이라는 상자에 "김철수"를 넣음

console.log(age);   // 25 출력
console.log(name);  // 김철수 출력

// 나중에 내용을 바꿀 수 있습니다
age = 26;
console.log(age);   // 26 출력
```

---

## var, let, const — 세 가지 선언 방식

JavaScript에는 변수를 선언하는 방법이 세 가지 있습니다.

```javascript
var oldWay = "오래된 방식";   // 예전 방식, 사용 자제
let changeable = "바꿀 수 있음";  // 값을 바꿀 수 있는 변수
const fixed = "고정값";           // 한 번 정하면 못 바꾸는 변수
```

### let vs const — 언제 무엇을 쓸까?

```javascript
// const: 변하지 않는 값 (대부분의 경우)
const PI = 3.14159;
const userName = "홍길동";

// let: 나중에 값이 바뀌는 경우
let score = 0;
score = score + 10;  // 점수가 올라감
score += 10;         // 같은 표현, 더 짧게

// const인데 왜 에러가 날까요?
// const PI = 3.14;
// PI = 3;  // 에러! const는 재할당 불가
```

### 초보자 실수: var를 쓰면 안 되는 이유

```javascript
// var는 함수 범위(function scope)를 가집니다
// 의도치 않은 버그를 만들 수 있어요

var x = 1;
if (true) {
  var x = 2;  // 같은 x를 덮어씀!
  console.log(x);  // 2
}
console.log(x);  // 2 (1이길 기대했는데 2가 나옴 — 버그!)

// let은 블록 범위(block scope)를 가집니다
let y = 1;
if (true) {
  let y = 2;  // 이 y는 if 블록 안에서만 존재
  console.log(y);  // 2
}
console.log(y);  // 1 (바깥 y는 그대로)
```

**규칙**: 기본적으로 `const`를 쓰고, 값이 바뀌어야 할 때만 `let`을 씁니다. `var`는 쓰지 않습니다.

---

## 데이터 타입 — 상자에 담는 내용물의 종류

JavaScript의 기본 데이터 타입 7가지를 알아봅니다.

### 1. 숫자 (Number)

```javascript
let integer = 42;        // 정수
let decimal = 3.14;      // 소수
let negative = -10;      // 음수

// 특별한 숫자값들
let infinity = Infinity;   // 무한대
let notANumber = NaN;      // "숫자가 아님" (계산 실패 시 나옴)

console.log(10 / 0);    // Infinity
console.log("abc" * 2); // NaN (문자에 곱하기를 하면)
```

### 2. 문자열 (String)

```javascript
let single = '작은따옴표도 됩니다';
let double = "큰따옴표도 됩니다";
let template = `백틱은 변수를 넣을 수 있어요`;

let greeting = "안녕하세요";
let userName = "김철수";

// 옛날 방식: 문자열 이어붙이기
let old = "안녕하세요, " + userName + "님!";

// 현대적 방식: 템플릿 리터럴 (백틱 사용)
let modern = `안녕하세요, ${userName}님!`;  // 훨씬 편리!

console.log(modern);  // 안녕하세요, 김철수님!

// 문자열 길이
console.log(greeting.length);  // 5
```

### 3. 불리언 (Boolean)

```javascript
let isLoggedIn = true;   // 로그인 상태
let isAdmin = false;     // 관리자 아님

// 조건에 따라 true/false가 결정되기도 합니다
let isAdult = (age >= 18);  // age가 18 이상이면 true
```

### 4. undefined

```javascript
// 값을 아직 할당하지 않은 변수
let notAssigned;
console.log(notAssigned);  // undefined

// "존재하지만 값이 없는 상태"
```

### 5. null

```javascript
// 의도적으로 "값이 없음"을 나타냄
let selectedUser = null;  // 아직 선택된 유저 없음

// undefined와의 차이: null은 개발자가 의도적으로 설정
```

### 6. 심볼 (Symbol) — 고급

```javascript
// 고유한 식별자를 만들 때 사용 (초보 때는 잘 안 씀)
const id = Symbol("id");
```

### 7. BigInt — 고급

```javascript
// 매우 큰 정수를 다룰 때 (초보 때는 잘 안 씀)
const bigNumber = 9007199254740991n;
```

---

## typeof — 타입 확인하기

```javascript
console.log(typeof 42);          // "number"
console.log(typeof "안녕");      // "string"
console.log(typeof true);        // "boolean"
console.log(typeof undefined);   // "undefined"
console.log(typeof null);        // "object" (JavaScript의 유명한 버그!)
console.log(typeof []);          // "object" (배열도 object!)
console.log(typeof {});          // "object"
console.log(typeof function(){}); // "function"
```

`typeof null`이 "object"인 것은 JavaScript 초기 설계 오류입니다. null인지 확인할 때는 `=== null`을 사용합니다.

---

## 타입 변환 — 자동 변환과 수동 변환

### 자동 변환 (암묵적 타입 변환) — 주의가 필요!

```javascript
// JavaScript는 자동으로 타입을 변환합니다
// 이게 때로 예상치 못한 결과를 냅니다

console.log("5" + 3);    // "53" (숫자 3이 문자열로 변환됨!)
console.log("5" - 3);    // 2 (문자열 "5"가 숫자로 변환됨)
console.log("5" * "3");  // 15 (둘 다 숫자로 변환됨)
console.log(true + 1);   // 2 (true가 1로 변환됨)
console.log(false + 1);  // 1 (false가 0으로 변환됨)

// 이런 혼란스러운 동작 때문에 타입에 주의해야 합니다!
```

### 수동 변환 (명시적 타입 변환) — 권장!

```javascript
// 문자열 → 숫자
let strAge = "25";
let numAge = Number(strAge);   // 25 (숫자)
let numAge2 = parseInt(strAge); // 25 (정수만)
let numAge3 = parseFloat("3.14"); // 3.14 (소수 포함)

console.log(Number("abc"));  // NaN (숫자로 변환 불가)
console.log(Number(""));     // 0

// 숫자 → 문자열
let num = 42;
let str = String(num);    // "42"
let str2 = num.toString(); // "42"
let str3 = `${num}`;      // "42" (템플릿 리터럴)

// 다른 타입 → 불리언
console.log(Boolean(0));         // false
console.log(Boolean(""));        // false
console.log(Boolean(null));      // false
console.log(Boolean(undefined)); // false
console.log(Boolean(NaN));       // false
// 위 다섯 가지가 falsy (거짓같은 값)

console.log(Boolean(1));        // true
console.log(Boolean("안녕"));   // true
console.log(Boolean([]));       // true (빈 배열도 true!)
console.log(Boolean({}));       // true (빈 객체도 true!)
```

---

## == vs === — 초보자 필수 주의사항

JavaScript에는 비교 연산자가 두 가지 있습니다.

```javascript
// == (느슨한 비교): 타입을 자동 변환한 후 비교
console.log(5 == "5");    // true (자동 변환!)
console.log(0 == false);  // true (자동 변환!)
console.log(null == undefined); // true

// === (엄격한 비교): 타입까지 같아야 true
console.log(5 === "5");    // false (타입이 다름)
console.log(0 === false);  // false (타입이 다름)
console.log(null === undefined); // false

// 항상 ===를 사용하세요! ==는 버그의 원인이 됩니다.
```

**규칙**: 비교할 때는 항상 `===`와 `!==`를 사용합니다.

---

## 실용 예제 — 사용자 입력 처리

```javascript
// HTML 입력 폼에서 값을 받아 처리하는 예제

// 사용자가 나이를 입력했다고 가정
let inputAge = "25";  // input에서 받은 값은 항상 문자열!

// 숫자로 변환해서 계산
let numericAge = Number(inputAge);

if (numericAge >= 18) {
  console.log("성인입니다.");
} else {
  console.log("미성년자입니다.");
}

// 이름과 나이로 메시지 만들기
const personName = "이영희";
const personAge = 30;
const message = `${personName}님은 ${personAge}세입니다.`;
console.log(message);  // 이영희님은 30세입니다.

// 점수 계산기
let score = 85;
let grade;

if (score >= 90) {
  grade = "A";
} else if (score >= 80) {
  grade = "B";
} else if (score >= 70) {
  grade = "C";
} else {
  grade = "F";
}

console.log(`점수: ${score}, 학점: ${grade}`);  // 점수: 85, 학점: B
```

---

## 정리

| 개념 | 핵심 |
|------|------|
| `let` | 값을 바꿀 수 있는 변수 |
| `const` | 값을 바꿀 수 없는 변수 (기본으로 사용) |
| `var` | 사용하지 말 것 |
| `===` | 타입까지 비교하는 엄격한 동등 연산자 |
| `==` | 타입 변환 후 비교 (사용 자제) |
| `typeof` | 값의 타입 확인 |

다음 단계: 연산자와 조건문을 배워서 프로그램에 판단 능력을 부여해봅시다.
