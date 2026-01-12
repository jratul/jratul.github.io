---
title: "JavaScript 실행 컨텍스트(Execution Context)"
date: "2026-01-12"
tags: ["javascript", "execution-context", "call-stack", "scope", "frontend"]
excerpt: "JavaScript 코드가 실행되는 환경인 실행 컨텍스트의 구조와 동작 원리를 알아봅니다."
---

# JavaScript 실행 컨텍스트(Execution Context)

실행 컨텍스트는 JavaScript 코드가 실행되는 환경입니다. 변수, 함수, this 등이 어떻게 결정되는지 이해하는 핵심 개념입니다.

## 실행 컨텍스트란?

JavaScript 엔진이 코드를 실행할 때 필요한 환경 정보를 담고 있는 객체입니다.

```javascript
function outer() {
  const x = 10;

  function inner() {
    const y = 20;
    console.log(x + y); // 30
  }

  inner();
}

outer();
```

위 코드 실행 시 생성되는 컨텍스트:
1. **전역 실행 컨텍스트** (Global Execution Context)
2. **outer 함수 실행 컨텍스트**
3. **inner 함수 실행 컨텍스트**

---

## 실행 컨텍스트의 종류

### 1. 전역 실행 컨텍스트 (Global EC)

- 코드 실행 시 가장 먼저 생성
- 전역 객체(`window`, `global`) 생성
- `this`를 전역 객체에 바인딩
- 프로그램당 하나만 존재

```javascript
var globalVar = 'global';

function globalFunc() {
  console.log('전역 함수');
}

// 전역 실행 컨텍스트에 globalVar, globalFunc 저장
```

---

### 2. 함수 실행 컨텍스트 (Function EC)

- 함수가 호출될 때마다 생성
- 함수마다 고유한 컨텍스트를 가짐
- 무한히 생성 가능

```javascript
function createContext() {
  const local = 'function scope';
  console.log(local);
}

createContext(); // 함수 실행 컨텍스트 생성
createContext(); // 새로운 함수 실행 컨텍스트 생성
```

---

### 3. Eval 실행 컨텍스트

- `eval()` 함수 내부 코드 실행 시 생성
- 보안 문제로 사용 권장하지 않음

---

## 실행 컨텍스트의 구조

실행 컨텍스트는 다음 세 가지 컴포넌트로 구성됩니다:

### 1. Variable Environment

- 변수, 함수 선언의 초기 정보 저장
- 생성 시점의 스냅샷 보존
- 변경되지 않는 초기값 유지

### 2. Lexical Environment

- 현재 컨텍스트 내의 변수와 함수 참조
- 변수 값이 변경되면 업데이트됨
- 외부 렉시컬 환경 참조(Outer) 포함

**구성 요소:**

```javascript
LexicalEnvironment = {
  EnvironmentRecord: {
    // 변수, 함수 저장
  },
  outer: <외부 렉시컬 환경 참조>
}
```

### 3. This Binding

- `this` 값이 결정되는 곳
- 함수 호출 방식에 따라 달라짐

---

## 실행 컨텍스트 생성 과정

### 1단계: Creation Phase (생성 단계)

코드 실행 전 환경을 설정합니다.

```javascript
function example() {
  console.log(a); // undefined (호이스팅)
  var a = 10;
  console.log(a); // 10
}

example();
```

**생성 단계에서 일어나는 일:**

1. **Variable Environment 생성**
   - `var` 변수: `undefined`로 초기화
   - 함수 선언: 함수 전체를 메모리에 저장

2. **Lexical Environment 생성**
   - `let`, `const` 변수: 초기화되지 않음 (TDZ)
   - 외부 환경 참조 설정

3. **This Binding 결정**

```javascript
// 생성 단계의 개념적 표현
ExecutionContext = {
  VariableEnvironment: {
    a: undefined,
  },
  LexicalEnvironment: {
    EnvironmentRecord: {},
    outer: <외부 환경>
  },
  ThisBinding: <this 값>
}
```

---

### 2단계: Execution Phase (실행 단계)

코드가 한 줄씩 실행되며 변수에 값이 할당됩니다.

```javascript
function example() {
  // 생성 단계 완료, 실행 단계 시작
  console.log(a); // undefined
  var a = 10;     // 여기서 값 할당
  console.log(a); // 10
}
```

---

## 호이스팅(Hoisting)

생성 단계에서 변수와 함수 선언이 컨텍스트 최상단으로 끌어올려지는 현상입니다.

### var 호이스팅

```javascript
console.log(x); // undefined
var x = 5;
console.log(x); // 5

// 실제 동작 (개념적)
var x; // 선언부만 호이스팅
console.log(x); // undefined
x = 5; // 할당은 원래 위치에서
console.log(x); // 5
```

---

### 함수 선언 호이스팅

```javascript
sayHello(); // "Hello!" - 정상 동작

function sayHello() {
  console.log("Hello!");
}

// 함수 전체가 호이스팅됨
```

---

### let/const는 TDZ

```javascript
console.log(y); // ReferenceError: Cannot access 'y' before initialization
let y = 10;

// let/const는 호이스팅되지만 초기화되지 않음
// TDZ(Temporal Dead Zone)에 있음
```

---

## 콜 스택(Call Stack)과 실행 컨텍스트

실행 컨텍스트는 콜 스택에 쌓입니다.

```javascript
function first() {
  console.log('first 함수');
  second();
  console.log('first 함수 끝');
}

function second() {
  console.log('second 함수');
  third();
  console.log('second 함수 끝');
}

function third() {
  console.log('third 함수');
}

first();
```

**콜 스택 변화:**

```
1. [Global EC]
2. [Global EC, first EC]
3. [Global EC, first EC, second EC]
4. [Global EC, first EC, second EC, third EC]
5. [Global EC, first EC, second EC]  // third 종료
6. [Global EC, first EC]              // second 종료
7. [Global EC]                        // first 종료
```

**출력 결과:**
```
first 함수
second 함수
third 함수
second 함수 끝
first 함수 끝
```

---

## 스코프 체인(Scope Chain)

실행 컨텍스트의 Lexical Environment가 연결되어 스코프 체인을 형성합니다.

```javascript
const global = 'global';

function outer() {
  const outerVar = 'outer';

  function inner() {
    const innerVar = 'inner';

    console.log(innerVar);  // 'inner' - 현재 스코프
    console.log(outerVar);  // 'outer' - 외부 스코프
    console.log(global);    // 'global' - 전역 스코프
  }

  inner();
}

outer();
```

**스코프 체인:**
```
inner EC → outer EC → Global EC
```

변수를 찾을 때:
1. 현재 컨텍스트에서 검색
2. 없으면 외부 환경 참조를 따라 상위로 이동
3. 전역까지 찾아도 없으면 `ReferenceError`

---

## 클로저(Closure)와 실행 컨텍스트

클로저는 외부 함수의 실행 컨텍스트가 종료되어도 외부 변수에 접근할 수 있는 현상입니다.

```javascript
function createCounter() {
  let count = 0; // createCounter EC의 변수

  return function() {
    count++;
    return count;
  };
}

const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

**동작 원리:**

1. `createCounter` 실행 → 실행 컨텍스트 생성
2. 내부 함수가 외부 변수(`count`) 참조
3. `createCounter` 종료 후에도 내부 함수가 렉시컬 환경 유지
4. `counter()`를 호출할 때마다 동일한 `count` 참조

---

## This Binding

실행 컨텍스트 생성 시 `this`가 결정됩니다.

### 1. 전역 컨텍스트

```javascript
console.log(this); // window (브라우저) / global (Node.js)
```

---

### 2. 함수 호출

```javascript
function showThis() {
  console.log(this);
}

showThis(); // window (strict mode에서는 undefined)
```

---

### 3. 메서드 호출

```javascript
const obj = {
  name: 'Object',
  showThis() {
    console.log(this); // obj
  }
};

obj.showThis();
```

---

### 4. 화살표 함수

```javascript
const obj = {
  name: 'Object',
  regularFunc: function() {
    console.log(this); // obj
  },
  arrowFunc: () => {
    console.log(this); // 상위 스코프의 this (전역)
  }
};

obj.regularFunc();
obj.arrowFunc();
```

화살표 함수는 자신만의 `this`를 생성하지 않고 외부 컨텍스트의 `this`를 사용합니다.

---

## 실전 예제

### 예제 1: 호이스팅 이해하기

```javascript
var x = 1;

function foo() {
  console.log(x); // undefined (지역 변수 호이스팅)
  var x = 2;
  console.log(x); // 2
}

foo();
console.log(x); // 1
```

**이유:**
- `foo` 함수 내부의 `var x`가 호이스팅되어 지역 변수로 동작
- 전역 변수 `x`를 가리지 않음

---

### 예제 2: 클로저 활용

```javascript
function makeAdder(x) {
  return function(y) {
    return x + y;
  };
}

const add5 = makeAdder(5);
const add10 = makeAdder(10);

console.log(add5(2));  // 7
console.log(add10(2)); // 12
```

각 함수가 독립적인 렉시컬 환경을 유지합니다.

---

### 예제 3: 콜 스택 오버플로우

```javascript
function recursive() {
  recursive(); // 무한 재귀
}

recursive(); // RangeError: Maximum call stack size exceeded
```

콜 스택에 쌓을 수 있는 컨텍스트 개수를 초과하면 에러가 발생합니다.

---

## 디버깅 팁

### Chrome DevTools에서 확인하기

```javascript
function outer() {
  const outerVar = 'outer';

  function inner() {
    debugger; // 여기서 멈춤
    const innerVar = 'inner';
    console.log(outerVar);
  }

  inner();
}

outer();
```

`debugger` 키워드를 사용하면:
- Scope 탭에서 현재 스코프 확인
- Call Stack 탭에서 실행 컨텍스트 스택 확인
- Closure 섹션에서 클로저 변수 확인

---

## 요약

1. **실행 컨텍스트**: JavaScript 코드 실행 환경
2. **생성 단계**: 변수/함수 선언 처리 (호이스팅)
3. **실행 단계**: 코드 실행 및 값 할당
4. **콜 스택**: 실행 컨텍스트가 쌓이는 구조 (LIFO)
5. **스코프 체인**: 렉시컬 환경의 연결
6. **클로저**: 외부 환경 참조 유지
7. **This**: 컨텍스트 생성 시 결정

실행 컨텍스트를 이해하면 호이스팅, 클로저, 스코프, this 바인딩 등 JavaScript의 핵심 동작 원리를 이해할 수 있습니다.