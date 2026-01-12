---
title: "JavaScript 이벤트 루프(Event Loop)"
date: "2026-01-12"
tags: ["javascript", "event-loop", "async", "frontend", "runtime"]
excerpt: "JavaScript의 비동기 처리를 담당하는 이벤트 루프의 동작 원리와 실행 순서를 알아봅니다."
---

# JavaScript 이벤트 루프(Event Loop)

이벤트 루프는 JavaScript의 비동기 처리를 가능하게 하는 핵심 메커니즘입니다. 싱글 스레드 언어인 JavaScript가 어떻게 동시성을 처리하는지 이해할 수 있습니다.

## JavaScript 런타임 구조

```
┌─────────────────────────────────┐
│         Call Stack              │  콜 스택
└─────────────────────────────────┘
            ↓ ↑
┌─────────────────────────────────┐
│        Event Loop               │  이벤트 루프
└─────────────────────────────────┘
    ↑               ↑
┌───────────┐   ┌───────────┐
│Task Queue │   │Microtask  │
│(Macro)    │   │Queue      │
└───────────┘   └───────────┘
```

---

## 주요 구성 요소

### 1. Call Stack (콜 스택)

실행할 함수들이 쌓이는 곳입니다.

```javascript
function first() {
  console.log('first');
  second();
}

function second() {
  console.log('second');
}

first();
```

**콜 스택 변화:**
```
1. [first]
2. [first, console.log]
3. [first]
4. [first, second]
5. [first, second, console.log]
6. [first, second]
7. [first]
8. []
```

---

### 2. Web APIs

브라우저가 제공하는 API들입니다.

```javascript
setTimeout(() => {
  console.log('timeout');
}, 1000);

fetch('/api/users')
  .then(res => res.json());
```

**제공하는 API:**
- `setTimeout` / `setInterval`
- DOM 이벤트
- `fetch` / AJAX
- `requestAnimationFrame`

---

### 3. Task Queue (Macro Task Queue)

비동기 작업의 콜백이 대기하는 곳입니다.

```javascript
console.log('1');

setTimeout(() => {
  console.log('2');
}, 0);

console.log('3');

// 출력: 1, 3, 2
```

**포함되는 작업:**
- `setTimeout`
- `setInterval`
- `setImmediate` (Node.js)
- I/O 작업
- UI 렌더링

---

### 4. Microtask Queue

우선순위가 높은 비동기 작업의 큐입니다.

```javascript
console.log('1');

setTimeout(() => {
  console.log('2');
}, 0);

Promise.resolve().then(() => {
  console.log('3');
});

console.log('4');

// 출력: 1, 4, 3, 2
```

**포함되는 작업:**
- `Promise.then/catch/finally`
- `async/await`
- `queueMicrotask`
- `MutationObserver`

---

## 이벤트 루프 동작 원리

### 실행 순서

```
1. Call Stack 실행
2. Call Stack이 비면
3. Microtask Queue 모두 실행
4. 렌더링 (필요시)
5. Task Queue에서 하나 실행
6. 2번으로 돌아감
```

---

### 예제: 기본 흐름

```javascript
console.log('Start');

setTimeout(() => {
  console.log('Timeout');
}, 0);

Promise.resolve()
  .then(() => console.log('Promise 1'))
  .then(() => console.log('Promise 2'));

console.log('End');
```

**실행 순서:**
```
1. 'Start' (Call Stack)
2. setTimeout → Task Queue로 이동
3. Promise → Microtask Queue로 이동
4. 'End' (Call Stack)
5. 'Promise 1' (Microtask)
6. 'Promise 2' (Microtask)
7. 'Timeout' (Task)
```

**출력:**
```
Start
End
Promise 1
Promise 2
Timeout
```

---

## Microtask vs Task

### Microtask가 먼저 실행

```javascript
setTimeout(() => console.log('Timeout'), 0);
Promise.resolve().then(() => console.log('Promise'));

// 출력:
// Promise
// Timeout
```

---

### Microtask는 한 번에 모두 실행

```javascript
setTimeout(() => console.log('Task 1'), 0);
setTimeout(() => console.log('Task 2'), 0);

Promise.resolve().then(() => console.log('Micro 1'));
Promise.resolve().then(() => console.log('Micro 2'));

// 출력:
// Micro 1
// Micro 2
// Task 1
// Task 2
```

**설명:**
- Microtask Queue: 모두 비울 때까지 실행
- Task Queue: 한 번에 하나씩 실행

---

## 복잡한 예제

### 예제 1: 중첩된 비동기

```javascript
console.log('1');

setTimeout(() => {
  console.log('2');
  Promise.resolve().then(() => console.log('3'));
}, 0);

Promise.resolve()
  .then(() => {
    console.log('4');
    setTimeout(() => console.log('5'), 0);
  });

console.log('6');
```

**실행 순서:**
```
1. '1' (동기)
2. setTimeout → Task Queue
3. Promise → Microtask Queue
4. '6' (동기)
5. '4' (Microtask)
6. setTimeout → Task Queue
7. '2' (Task)
8. '3' (Microtask - Task 내부)
9. '5' (Task)
```

**출력:**
```
1
6
4
2
3
5
```

---

### 예제 2: async/await

```javascript
console.log('1');

async function async1() {
  console.log('2');
  await async2();
  console.log('3');
}

async function async2() {
  console.log('4');
}

async1();

Promise.resolve().then(() => console.log('5'));

console.log('6');
```

**실행 순서:**
```
1. '1' (동기)
2. async1 호출 → '2' (동기)
3. async2 호출 → '4' (동기)
4. await 이후 → Microtask Queue
5. Promise → Microtask Queue
6. '6' (동기)
7. '3' (Microtask - await 이후)
8. '5' (Microtask)
```

**출력:**
```
1
2
4
6
3
5
```

---

### 예제 3: queueMicrotask

```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);

queueMicrotask(() => console.log('3'));

Promise.resolve().then(() => console.log('4'));

console.log('5');
```

**출력:**
```
1
5
3
4
2
```

`queueMicrotask`와 `Promise`는 모두 Microtask Queue에 추가됩니다.

---

## 실전 활용

### 1. 상태 업데이트 최적화

```javascript
// ❌ 매번 렌더링
for (let i = 0; i < 1000; i++) {
  updateUI(i);
}

// ✅ 한 번만 렌더링
queueMicrotask(() => {
  for (let i = 0; i < 1000; i++) {
    updateUI(i);
  }
});
```

---

### 2. 무거운 작업 분할

```javascript
function heavyTask(data) {
  const chunk = 100;

  function processChunk(start) {
    const end = Math.min(start + chunk, data.length);

    for (let i = start; i < end; i++) {
      // 무거운 작업
      process(data[i]);
    }

    if (end < data.length) {
      // 다음 청크를 Task Queue로
      setTimeout(() => processChunk(end), 0);
    }
  }

  processChunk(0);
}
```

---

### 3. 순서 보장

```javascript
// API 호출 순서 보장
async function fetchInOrder() {
  const user = await fetchUser();
  const posts = await fetchPosts(user.id);
  const comments = await fetchComments(posts[0].id);

  return { user, posts, comments };
}
```

---

## 브라우저 렌더링과 이벤트 루프

```javascript
console.log('Script start');

setTimeout(() => {
  console.log('Timeout');
}, 0);

requestAnimationFrame(() => {
  console.log('rAF');
});

Promise.resolve().then(() => {
  console.log('Promise');
});

console.log('Script end');
```

**출력 (브라우저):**
```
Script start
Script end
Promise
rAF
Timeout
```

**렌더링 타이밍:**
- Microtask 이후
- Task 실행 전
- `requestAnimationFrame`은 렌더링 직전

---

## Node.js의 이벤트 루프

Node.js는 브라우저와 다른 이벤트 루프를 가집니다.

### 페이즈(Phase)

```
   ┌───────────────────────────┐
┌─>│           timers          │  setTimeout, setInterval
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  I/O 콜백
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  내부용
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll            │  I/O 대기
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │  setImmediate
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │  소켓 종료 등
   └───────────────────────────┘
```

---

### process.nextTick

```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);
setImmediate(() => console.log('3'));

process.nextTick(() => console.log('4'));

Promise.resolve().then(() => console.log('5'));

console.log('6');
```

**출력 (Node.js):**
```
1
6
4
5
2
3
```

`process.nextTick`은 Microtask보다 우선순위가 높습니다.

---

## 디버깅 팁

### 1. 콜 스택 추적

```javascript
function a() {
  b();
}

function b() {
  c();
}

function c() {
  console.trace('Call stack');
}

a();
```

---

### 2. 이벤트 루프 시각화

```javascript
const start = Date.now();

console.log('Start');

setTimeout(() => {
  console.log('Timeout:', Date.now() - start, 'ms');
}, 100);

Promise.resolve().then(() => {
  console.log('Promise:', Date.now() - start, 'ms');
});

console.log('End');
```

---

### 3. 성능 측정

```javascript
console.time('Task');

setTimeout(() => {
  console.timeEnd('Task');
}, 0);
```

---

## 흔한 오해

### 1. setTimeout(fn, 0)이 즉시 실행?

```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
console.log('3');

// 출력: 1, 3, 2
// setTimeout은 Task Queue로 이동
```

---

### 2. Promise는 비동기?

```javascript
console.log('1');

new Promise(resolve => {
  console.log('2');  // 동기 실행
  resolve();
}).then(() => {
  console.log('3');  // 비동기 실행
});

console.log('4');

// 출력: 1, 2, 4, 3
```

Promise 생성자는 동기, then은 비동기입니다.

---

### 3. async 함수는 비동기?

```javascript
async function test() {
  console.log('1');  // 동기
  return '2';
}

test().then(console.log);  // 비동기
console.log('3');

// 출력: 1, 3, 2
```

`async` 함수 내부는 `await` 전까지 동기입니다.

---

## 요약

1. **콜 스택**: 실행 중인 함수
2. **Task Queue**: 비동기 작업 (setTimeout 등)
3. **Microtask Queue**: 우선순위 높은 비동기 (Promise 등)
4. **실행 순서**: 동기 → Microtask → Task
5. **Microtask**: 큐가 빌 때까지 실행
6. **Task**: 한 번에 하나씩 실행
7. **렌더링**: Microtask 이후, Task 전

이벤트 루프를 이해하면 JavaScript의 비동기 동작을 예측하고 최적화할 수 있습니다.