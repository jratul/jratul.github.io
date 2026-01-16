---
title: "JavaScript 호이스팅(Hoisting)"
date: "2026-01-17"
tags: ["javascript", "hoisting", "var", "let", "const", "frontend"]
excerpt: "JavaScript에서 변수와 함수 선언이 끌어올려지는 호이스팅의 동작 원리를 알아봅니다."
---

# JavaScript 호이스팅(Hoisting)

호이스팅은 **변수와 함수 선언이 코드의 최상단으로 끌어올려지는 것처럼 동작**하는 JavaScript의 특성입니다.

## 호이스팅이란?

```javascript
console.log(name);  // undefined (에러 아님!)
var name = 'Alice';
console.log(name);  // 'Alice'
```

**실제로 JavaScript 엔진이 해석하는 방식:**

```javascript
var name;           // 선언이 끌어올려짐
console.log(name);  // undefined
name = 'Alice';     // 할당은 그 자리에
console.log(name);  // 'Alice'
```

---

## var의 호이스팅

### 선언만 호이스팅

```javascript
console.log(a);  // undefined
var a = 10;
console.log(a);  // 10

// 위 코드는 아래와 같이 동작
var a;           // 선언 호이스팅
console.log(a);  // undefined
a = 10;          // 할당은 제자리
console.log(a);  // 10
```

---

### 함수 스코프

```javascript
function example() {
  console.log(x);  // undefined
  var x = 5;
  console.log(x);  // 5
}

// 블록 스코프가 아님!
if (true) {
  var y = 10;
}
console.log(y);  // 10 (블록 밖에서 접근 가능)
```

---

### 문제 상황

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => {
    console.log(i);  // 3, 3, 3
  }, 100);
}

// var는 함수 스코프라 i가 공유됨
// 루프 종료 후 i = 3
```

---

## let과 const의 호이스팅

### TDZ (Temporal Dead Zone)

```javascript
console.log(name);  // ReferenceError!
let name = 'Alice';

// let도 호이스팅되지만 TDZ에 있어서 접근 불가
```

**TDZ 구간:**

```javascript
// ┌─────────────────── TDZ 시작
// │
console.log(name);  // ReferenceError
// │
// └─────────────────── TDZ 끝
let name = 'Alice';  // 선언 + 초기화
console.log(name);   // 'Alice'
```

---

### const도 동일

```javascript
console.log(PI);  // ReferenceError
const PI = 3.14;
```

---

### 블록 스코프

```javascript
if (true) {
  let x = 10;
  const y = 20;
}
console.log(x);  // ReferenceError
console.log(y);  // ReferenceError

// 블록 밖에서 접근 불가
```

---

### for 루프에서의 차이

```javascript
// let은 블록 스코프
for (let i = 0; i < 3; i++) {
  setTimeout(() => {
    console.log(i);  // 0, 1, 2
  }, 100);
}

// 각 반복마다 새로운 i가 생성됨
```

---

## 함수 호이스팅

### 함수 선언문

```javascript
sayHello();  // 'Hello!' (호출 가능!)

function sayHello() {
  console.log('Hello!');
}

// 함수 선언문은 전체가 호이스팅됨
```

---

### 함수 표현식

```javascript
sayHello();  // TypeError: sayHello is not a function

var sayHello = function() {
  console.log('Hello!');
};

// var sayHello만 호이스팅되고, 함수 할당은 안 됨
// sayHello는 undefined 상태
```

---

### 화살표 함수

```javascript
sayHello();  // TypeError (var) 또는 ReferenceError (let/const)

const sayHello = () => {
  console.log('Hello!');
};

// 변수 호이스팅 규칙을 따름
```

---

### 함수 선언문 vs 함수 표현식

```javascript
// 함수 선언문: 전체 호이스팅
function declaration() {
  return 'declaration';
}

// 함수 표현식: 변수만 호이스팅
var expression = function() {
  return 'expression';
};

// 권장: 함수 표현식 (예측 가능한 동작)
const arrow = () => {
  return 'arrow';
};
```

---

## 호이스팅 우선순위

### 함수 선언이 변수보다 우선

```javascript
console.log(typeof foo);  // 'function'

var foo = 'hello';

function foo() {
  return 'world';
}

console.log(typeof foo);  // 'string'
```

**해석 순서:**

```javascript
function foo() {      // 1. 함수 선언 호이스팅
  return 'world';
}
// var foo;           // 2. 변수 선언 호이스팅 (이미 foo 있으므로 무시)

console.log(typeof foo);  // 'function'
foo = 'hello';            // 3. 변수 할당
console.log(typeof foo);  // 'string'
```

---

### 같은 이름의 함수가 여러 개

```javascript
foo();  // 'second'

function foo() {
  console.log('first');
}

function foo() {
  console.log('second');
}

// 나중에 선언된 함수가 덮어씀
```

---

## 클래스 호이스팅

### 클래스는 TDZ 적용

```javascript
const instance = new MyClass();  // ReferenceError

class MyClass {
  constructor() {
    this.name = 'MyClass';
  }
}

// 클래스도 호이스팅되지만 TDZ에 있음
```

---

### 클래스 표현식도 동일

```javascript
const instance = new MyClass();  // ReferenceError

const MyClass = class {
  constructor() {
    this.name = 'MyClass';
  }
};
```

---

## 실행 컨텍스트와 호이스팅

### 실행 컨텍스트 생성 단계

```javascript
// 1. 생성 단계 (Creation Phase)
// - 변수 객체 생성
// - 스코프 체인 생성
// - this 바인딩

// 2. 실행 단계 (Execution Phase)
// - 코드 실행
// - 변수 할당
```

---

### 변수 객체 (Variable Object)

```javascript
function example(a, b) {
  var c = 10;
  function inner() {}
  var d = function() {};
}

example(1, 2);

// 생성 단계의 변수 객체:
// {
//   arguments: { 0: 1, 1: 2, length: 2 },
//   a: 1,
//   b: 2,
//   c: undefined,      // var 선언
//   inner: function,   // 함수 선언 (전체)
//   d: undefined       // var 선언
// }
```

---

## 실전 예제

### 예제 1: 변수 섀도잉

```javascript
var x = 'global';

function foo() {
  console.log(x);  // undefined (지역 x가 호이스팅됨)
  var x = 'local';
  console.log(x);  // 'local'
}

foo();
console.log(x);  // 'global'
```

---

### 예제 2: 조건문 안의 함수 선언

```javascript
// ❌ 비권장: 브라우저마다 동작이 다를 수 있음
if (true) {
  function foo() {
    return 'inside if';
  }
}

console.log(foo());  // 'inside if' 또는 에러

// ✅ 권장: 함수 표현식 사용
let foo;
if (true) {
  foo = function() {
    return 'inside if';
  };
}
```

---

### 예제 3: 즉시 실행 함수 (IIFE)

```javascript
// 호이스팅 문제 회피
(function() {
  var privateVar = 'private';
  console.log(privateVar);
})();

console.log(privateVar);  // ReferenceError
```

---

### 예제 4: 클로저와 호이스팅

```javascript
// ❌ var 사용 시 문제
var funcs = [];
for (var i = 0; i < 3; i++) {
  funcs.push(function() {
    console.log(i);
  });
}
funcs[0]();  // 3
funcs[1]();  // 3
funcs[2]();  // 3

// ✅ let 사용
var funcs = [];
for (let i = 0; i < 3; i++) {
  funcs.push(function() {
    console.log(i);
  });
}
funcs[0]();  // 0
funcs[1]();  // 1
funcs[2]();  // 2
```

---

## 호이스팅 비교표

| 선언 방식 | 호이스팅 | 초기화 | 스코프 | TDZ |
|---------|--------|-------|-------|-----|
| var | ✅ | undefined | 함수 | ❌ |
| let | ✅ | ❌ | 블록 | ✅ |
| const | ✅ | ❌ | 블록 | ✅ |
| 함수 선언문 | ✅ (전체) | 함수 | 함수 | ❌ |
| 함수 표현식 | 변수만 | undefined/TDZ | 변수에 따름 | 변수에 따름 |
| 클래스 | ✅ | ❌ | 블록 | ✅ |

---

## 베스트 프랙티스

### 1. var 대신 let/const 사용

```javascript
// ❌ var
var name = 'Alice';

// ✅ const (변경 없음)
const name = 'Alice';

// ✅ let (변경 필요)
let count = 0;
count++;
```

---

### 2. 변수는 사용 전에 선언

```javascript
// ❌ 호이스팅에 의존
console.log(value);
var value = 10;

// ✅ 선언 후 사용
const value = 10;
console.log(value);
```

---

### 3. 함수 표현식 권장

```javascript
// ❌ 함수 선언문 (호이스팅)
function process() { ... }

// ✅ 함수 표현식 (명시적)
const process = function() { ... };

// ✅ 화살표 함수
const process = () => { ... };
```

---

### 4. 스코프 최소화

```javascript
// ❌ 넓은 스코프
let result;
if (condition) {
  result = 'yes';
} else {
  result = 'no';
}

// ✅ 블록 스코프 활용
const result = condition ? 'yes' : 'no';
```

---

## 요약

1. **호이스팅**: 선언이 스코프 최상단으로 끌어올려지는 동작
2. **var**: 선언만 호이스팅, undefined로 초기화, 함수 스코프
3. **let/const**: 호이스팅되지만 TDZ, 블록 스코프
4. **함수 선언문**: 전체가 호이스팅 (선언 전에 호출 가능)
5. **함수 표현식**: 변수 호이스팅 규칙 따름
6. **클래스**: 호이스팅되지만 TDZ 적용
7. **TDZ**: 선언 전 접근 시 ReferenceError

**권장 사항:**
- var 대신 let/const 사용
- 변수는 사용 전에 선언
- 함수 표현식 또는 화살표 함수 사용