---
title: "변수와 데이터 타입"
order: 1
---

## JavaScript란?

HTML이 뼈대, CSS가 옷이라면 **JavaScript는 행동**입니다.
버튼을 클릭했을 때 무언가 일어나게 하고, 입력값을 검사하고, 서버에서 데이터를 가져오는 모든 것이 JavaScript의 역할입니다.

브라우저에서 직접 실행되는 유일한 프로그래밍 언어이며, 요즘은 서버(Node.js), 모바일 앱, 데스크탑 앱까지 만들 수 있습니다.

---

## JavaScript는 어떻게 실행되는가?

JavaScript 코드가 어떤 과정을 거쳐 실행되는지 이해하면,
왜 특정 동작이 일어나는지 훨씬 잘 이해할 수 있습니다.

### 브라우저의 JavaScript 엔진

JavaScript는 브라우저 안에 내장된 **JavaScript 엔진**이 실행합니다.

| 브라우저 | JS 엔진 |
|----------|---------|
| Chrome, Edge | V8 |
| Firefox | SpiderMonkey |
| Safari | JavaScriptCore (Nitro) |

가장 유명한 엔진은 **V8**입니다. Google이 만들었으며, Chrome 브라우저와 Node.js에서 사용됩니다.

### 코드가 실행되는 흐름

JavaScript 엔진이 코드를 처리하는 과정을 간단히 보면 이렇습니다.

```
1. 파싱 (Parsing)
   소스 코드를 읽어서 AST(추상 구문 트리)로 변환
   문법 오류(SyntaxError)가 있으면 이 단계에서 중단

2. 컴파일 (Compilation)
   AST를 바이트코드 또는 기계어로 변환
   V8 같은 현대 엔진은 JIT(Just-In-Time) 컴파일로 빠르게 최적화

3. 실행 (Execution)
   변환된 코드가 실제로 실행됨
   변수에 값이 담기고, 함수가 호출되고, 화면이 바뀜
```

```javascript
// 예: 이 코드가 실행되는 순서

console.log("1. 시작");       // 바로 실행됨

let name = "김철수";          // 변수에 값이 할당됨

function greet() {            // 함수 정의 (아직 실행 안 됨)
  console.log("안녕하세요!");
}

console.log("2. 함수 호출 전"); // 실행됨
greet();                       // 이 시점에 함수가 실행됨
console.log("3. 함수 호출 후"); // 실행됨

// 출력 순서:
// 1. 시작
// 2. 함수 호출 전
// 안녕하세요!
// 3. 함수 호출 후
```

### Node.js와 브라우저 환경의 차이

같은 JavaScript라도 실행되는 환경에 따라 할 수 있는 일이 다릅니다.

```javascript
// 브라우저에서만 가능한 것들
document.getElementById("title").textContent = "안녕!"; // DOM 조작
window.alert("경고!");                                   // 알림 창
localStorage.setItem("key", "value");                    // 로컬 스토리지
fetch("https://api.example.com/data");                   // HTTP 요청

// Node.js에서만 가능한 것들
const fs = require("fs");
fs.readFileSync("./data.txt", "utf-8");  // 파일 읽기
// process.env.DATABASE_URL               // 환경 변수
// require("http").createServer(...)      // HTTP 서버 생성

// 둘 다 가능한 것들
console.log("어디서나 출력 가능");
Math.random();
JSON.parse('{"name": "김철수"}');
```

```
브라우저 환경:
- HTML, CSS와 함께 동작
- DOM(문서 객체 모델)을 다룰 수 있음
- 사용자와 직접 상호작용
- 보안 제한: 파일 시스템 접근 불가, 동일 출처 정책

Node.js 환경:
- 서버에서 실행
- 파일, 네트워크, 데이터베이스 접근 가능
- npm 패키지 시스템 사용
- DOM 없음: document, window 객체 없음
```

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
let age = 20;
let isAdult = (age >= 18);  // age가 18 이상이면 true
console.log(isAdult);       // true
```

### 4. undefined — "아직 값이 없음"

`undefined`는 변수를 선언했지만 값을 아직 할당하지 않은 상태입니다.
JavaScript가 자동으로 부여하는 "초기 상태"입니다.

```javascript
let notAssigned;
console.log(notAssigned);  // undefined

// 존재하지 않는 객체 속성에 접근해도 undefined
const person = { name: "김철수" };
console.log(person.age);   // undefined (age 속성이 없음)

// 함수가 아무것도 반환하지 않으면 undefined
function doNothing() {
  // return 없음
}
const result = doNothing();
console.log(result);  // undefined
```

### 5. null — "의도적으로 비워둠"

`null`은 개발자가 **의도적으로** "값이 없음"을 표현할 때 사용합니다.

```javascript
let selectedUser = null;  // 아직 선택된 유저 없음

// 나중에 값이 채워질 수 있음
selectedUser = { name: "이영희", age: 28 };

// null 체크
if (selectedUser !== null) {
  console.log(`선택된 유저: ${selectedUser.name}`);
}
```

### null vs undefined — 자주 혼동하는 차이

이 둘은 비슷해 보이지만 **의미와 사용 목적이 다릅니다**.

```javascript
// undefined: JavaScript가 자동으로 만들어냄
// "아직 값을 넣지 않은 상태"

let a;               // undefined (선언만 함)
console.log(a);      // undefined

// null: 개발자가 의도적으로 설정
// "비어있다는 것을 명시적으로 표현"

let selectedItem = null;  // 선택된 아이템이 없음을 명시

// 실용적인 차이
function getUserById(id) {
  // 유저를 찾지 못하면 null을 반환 (의도적으로 없음을 알림)
  return null;
  // undefined를 반환하면 "함수가 값 반환을 잊었나?" 하는 혼동이 생길 수 있음
}

// 타입 확인 비교
console.log(typeof undefined);  // "undefined"
console.log(typeof null);       // "object" (JavaScript의 유명한 버그!)

// 동등 비교
console.log(null == undefined);   // true  (느슨한 비교)
console.log(null === undefined);  // false (엄격한 비교 — 타입이 다름)

// 실무 팁: 값이 없을 가능성이 있을 때
let user = null;  // 초기값은 null로 설정
// undefined는 "실수로 안 넣은 것"처럼 보일 수 있음
```

```
정리:
undefined = 값이 아직 할당되지 않음 (JS가 자동으로 설정)
null      = 값이 없음을 명시 (개발자가 직접 설정)

비유:
undefined = 책상 위에 아무것도 없는 상태 (처음부터 그랬음)
null      = 책상 위에 "비어있음" 표지판을 붙여놓은 상태 (의도적으로 비워둠)
```

### NaN이란? (Not a Number)

`NaN`은 "숫자가 아님"을 의미하는 특별한 값입니다.
숫자 계산이 실패했을 때 나옵니다.

```javascript
// NaN이 나오는 경우들
console.log("abc" * 2);        // NaN (문자열을 숫자 연산에 사용)
console.log(parseInt("hello")); // NaN (문자열을 숫자로 변환 실패)
console.log(undefined + 1);    // NaN
console.log(Math.sqrt(-1));    // NaN (음수의 제곱근)

// NaN의 이상한 특성: 자기 자신과도 같지 않음
console.log(NaN === NaN);  // false (!!)
console.log(NaN == NaN);   // false (!!)

// NaN 체크는 isNaN() 또는 Number.isNaN() 사용
console.log(isNaN(NaN));         // true
console.log(isNaN("hello"));     // true  (문자열도 NaN으로 취급)
console.log(Number.isNaN(NaN));  // true
console.log(Number.isNaN("hello")); // false (더 엄격함, 권장)

// 실무 예시: 사용자 입력을 숫자로 변환할 때
const userInput = "열다섯";
const num = Number(userInput);

if (Number.isNaN(num)) {
  console.log("올바른 숫자를 입력해주세요.");
} else {
  console.log(`입력한 숫자: ${num}`);
}
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

`typeof` 연산자를 사용하면 값의 타입을 문자열로 확인할 수 있습니다.

```javascript
console.log(typeof 42);           // "number"
console.log(typeof 3.14);         // "number"  (정수, 소수 모두 number)
console.log(typeof "안녕");       // "string"
console.log(typeof true);         // "boolean"
console.log(typeof undefined);    // "undefined"
console.log(typeof null);         // "object" (JavaScript의 유명한 버그!)
console.log(typeof []);           // "object" (배열도 object!)
console.log(typeof {});           // "object"
console.log(typeof function(){}); // "function"
console.log(typeof Symbol());     // "symbol"
console.log(typeof NaN);          // "number" (NaN도 number 타입!)
```

**typeof 결과 정리표:**

| 값 | typeof 결과 | 주의사항 |
|----|------------|---------|
| `42`, `3.14`, `NaN` | `"number"` | NaN도 number |
| `"hello"`, `''` | `"string"` | |
| `true`, `false` | `"boolean"` | |
| `undefined` | `"undefined"` | |
| `null` | `"object"` | JS 버그, null 체크는 `=== null` 사용 |
| `[]`, `{}`, `new Date()` | `"object"` | 배열 구분 불가 |
| `function() {}` | `"function"` | |
| `Symbol()` | `"symbol"` | |

`typeof null`이 "object"인 것은 JavaScript 초기 설계 오류입니다.
null인지 확인할 때는 `=== null`을 사용합니다.

```javascript
// null 체크 올바른 방법
let value = null;

// 잘못된 방법
if (typeof value === "object") {
  console.log("null 또는 객체");  // null과 객체를 구분 못 함
}

// 올바른 방법
if (value === null) {
  console.log("null입니다");
}

// 배열 확인 방법
const arr = [1, 2, 3];
console.log(typeof arr);         // "object" — 배열인지 모름
console.log(Array.isArray(arr)); // true — 배열 확인은 이걸 사용
```

---

## 형 변환 (Type Coercion) — JavaScript의 암묵적 형 변환

JavaScript는 연산을 수행할 때 타입이 맞지 않으면 **자동으로 타입을 변환**합니다.
이를 암묵적 형 변환(Implicit Type Coercion)이라고 하며, 예상치 못한 결과를 낳을 수 있습니다.

### + 연산자: 문자열이 있으면 문자열 연결

```javascript
// + 연산자는 하나라도 문자열이면 문자열 연결을 합니다
console.log("1" + 1);   // "11" (1이 문자열로 변환됨)
console.log(1 + "1");   // "11"
console.log("1" + 1 + 2); // "112" (왼쪽부터 순서대로)
console.log(1 + 2 + "3"); // "33" (1+2=3 먼저, 그 다음 "3"과 연결)

// 숫자끼리는 숫자 덧셈
console.log(1 + 2);   // 3
```

### - * / 연산자: 숫자로 변환 시도

```javascript
// + 를 제외한 산술 연산은 숫자로 변환 시도
console.log("5" - 1);    // 4  ("5"가 숫자 5로 변환됨)
console.log("5" * 2);    // 10 ("5"가 숫자 5로 변환됨)
console.log("10" / 2);   // 5  ("10"이 숫자로 변환됨)
console.log("5" - "3");  // 2  (둘 다 숫자로 변환됨)

// 변환이 안 되면 NaN
console.log("abc" - 1);  // NaN
```

### 불리언 변환

```javascript
// 숫자와 불리언
console.log(true + 1);   // 2  (true = 1)
console.log(false + 1);  // 1  (false = 0)
console.log(true + true); // 2

// 이런 코드를 작성하면 안 됩니다 — 의도를 알 수 없음
```

### 왜 이런 암묵적 변환이 문제인가?

```javascript
// 사용자 입력을 받아서 계산하는 예
const userInput = "5";  // input에서 받은 값은 항상 문자열

// 실수로 더하기를 하면
const result = userInput + 10;
console.log(result);  // "510" (기대: 15, 실제: "510")
// 이 버그는 찾기 어렵습니다

// 올바른 처리: 명시적으로 숫자로 변환
const result2 = Number(userInput) + 10;
console.log(result2);  // 15 (정상)
```

### == vs === — 암묵적 변환의 주범

JavaScript에는 비교 연산자가 두 가지 있습니다.

```javascript
// == (느슨한 비교): 타입을 자동 변환한 후 비교
console.log(5 == "5");         // true  (자동 변환 후 비교)
console.log(0 == false);       // true  (false가 0으로 변환)
console.log("" == false);      // true  (둘 다 0 또는 ""로 변환)
console.log(null == undefined); // true  (특별 규칙)
console.log(0 == "");          // true
console.log([] == false);      // true  (배열이 ""로, 그 다음 0으로 변환)

// === (엄격한 비교): 타입까지 같아야 true
console.log(5 === "5");         // false (타입이 다름: number vs string)
console.log(0 === false);       // false (타입이 다름: number vs boolean)
console.log("" === false);      // false
console.log(null === undefined); // false
```

### 왜 항상 ===을 써야 하는가?

```javascript
// == 를 쓰면 예상치 못한 버그가 발생합니다

function isZero(value) {
  return value == 0;  // 느슨한 비교
}

console.log(isZero(0));       // true  — 의도한 결과
console.log(isZero("0"));     // true  — 원했을 수도, 아닐 수도
console.log(isZero(""));      // true  — 빈 문자열도 0?! 의도하지 않은 결과
console.log(isZero(false));   // true  — false도 0?! 의도하지 않은 결과
console.log(isZero(null));    // true  — null도 0?! 위험

function isZeroStrict(value) {
  return value === 0;  // 엄격한 비교
}

console.log(isZeroStrict(0));       // true  — 의도한 결과
console.log(isZeroStrict("0"));     // false — 문자열 "0"은 0이 아님
console.log(isZeroStrict(""));      // false — 빈 문자열은 0이 아님
console.log(isZeroStrict(false));   // false — false는 0이 아님
console.log(isZeroStrict(null));    // false — null은 0이 아님
```

**규칙**: 항상 `===`와 `!==`를 사용합니다. `==`는 버그의 원인이 됩니다.

---

## 타입 변환 — 자동 변환과 수동 변환

### 수동 변환 (명시적 타입 변환) — 권장!

```javascript
// 문자열 → 숫자
let strAge = "25";
let numAge = Number(strAge);    // 25 (숫자)
let numAge2 = parseInt(strAge); // 25 (정수만)
let numAge3 = parseFloat("3.14"); // 3.14 (소수 포함)

console.log(Number("abc"));  // NaN (숫자로 변환 불가)
console.log(Number(""));     // 0
console.log(Number(true));   // 1
console.log(Number(false));  // 0
console.log(Number(null));   // 0
console.log(Number(undefined)); // NaN

// 숫자 → 문자열
let num = 42;
let str = String(num);     // "42"
let str2 = num.toString(); // "42"
let str3 = `${num}`;       // "42" (템플릿 리터럴)

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

## 자주 하는 실수

JavaScript를 처음 배울 때 많이 하는 실수들을 미리 알아둡시다.

### 실수 1: 숫자 입력값을 바로 계산에 쓰는 것

```javascript
// HTML input에서 받은 값은 항상 문자열입니다!

// 나쁜 예
const ageInput = "25";  // 사용자가 입력한 값
const nextYear = ageInput + 1;
console.log(nextYear);  // "251" (기대: 26, 실제: 문자열 "251")

// 좋은 예
const nextYear2 = Number(ageInput) + 1;
console.log(nextYear2);  // 26 (정상)

// 또는
const nextYear3 = parseInt(ageInput) + 1;
console.log(nextYear3);  // 26 (정상)
```

### 실수 2: == 로 비교하는 것

```javascript
// 나쁜 예
if (userInput == 0) {
  // "" (빈 문자열), false, null 도 여기 들어옵니다
}

// 좋은 예
if (userInput === 0) {
  // 정확히 숫자 0인 경우만 들어옵니다
}
```

### 실수 3: const 배열/객체가 바뀐다고 오해하는 것

```javascript
// const는 재할당을 막는 것이지, 내용 변경을 막는 것이 아닙니다
const numbers = [1, 2, 3];
numbers.push(4);  // 이건 됩니다! 배열 내용 변경은 가능
console.log(numbers);  // [1, 2, 3, 4]

// numbers = [5, 6, 7];  // 이건 오류! 재할당은 불가

const person = { name: "김철수" };
person.age = 25;  // 이건 됩니다! 객체 속성 추가 가능
console.log(person);  // { name: "김철수", age: 25 }

// person = { name: "이영희" };  // 이건 오류! 재할당은 불가
```

### 실수 4: undefined인 것을 접근하려는 것

```javascript
// 자주 발생하는 TypeError
const user = {
  name: "김철수",
  // address가 없음
};

// 나쁜 예: 바로 접근
console.log(user.address.city);
// TypeError: Cannot read properties of undefined (reading 'city')

// 좋은 예: 옵셔널 체이닝 사용
console.log(user.address?.city);  // undefined (에러 없음)

// 또는 기본값 설정
console.log(user.address?.city ?? "주소 없음");  // "주소 없음"
```

### 실수 5: NaN인지 확인을 잘못 하는 것

```javascript
const value = NaN;

// 나쁜 예
if (value === NaN) {
  console.log("NaN입니다");  // 절대 실행 안 됨! NaN !== NaN
}

// 나쁜 예
if (isNaN(value)) {
  // isNaN은 문자열도 true를 반환해서 부정확
}

// 좋은 예
if (Number.isNaN(value)) {
  console.log("NaN입니다");  // 정확하게 NaN만 감지
}
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
| `undefined` | JavaScript가 자동으로 설정하는 "아직 값 없음" |
| `null` | 개발자가 의도적으로 설정하는 "값 없음" |
| `NaN` | 숫자 계산 실패 결과, `Number.isNaN()`으로 체크 |
| 암묵적 형 변환 | `+` 연산자에서 문자열이 우선, `-*/` 는 숫자 우선 |

다음 단계: 연산자와 조건문을 배워서 프로그램에 판단 능력을 부여해봅시다.
