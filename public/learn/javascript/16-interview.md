---
title: "JavaScript 면접 예상 질문"
order: 16
---

# JavaScript 면접 예상 질문

JavaScript 개발자 면접에서 빈출되는 핵심 질문들입니다.

## Q1. 이벤트 루프(Event Loop)를 설명해주세요

JavaScript는 **단일 스레드**이지만 비동기 처리가 가능한 이유가 이벤트 루프입니다.

```
[ Call Stack ]   현재 실행 중인 함수 스택
[ Web APIs ]     setTimeout, fetch 등 비동기 작업 처리
[ Callback Queue / Task Queue ]   콜백 대기 줄
[ Microtask Queue ]  Promise.then, queueMicrotask
[ Event Loop ]   Call Stack이 비면 큐에서 꺼내서 실행
```

**실행 순서:**
1. 동기 코드 실행
2. **Microtask Queue 우선** (Promise.then, MutationObserver)
3. Task Queue (setTimeout, setInterval)

```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// 출력: 1, 4, 3, 2
```

---

## Q2. 클로저(Closure)란 무엇인가요?

함수가 **자신이 생성될 때의 외부 스코프 변수에 계속 접근**할 수 있는 기능입니다.

```javascript
function makeCounter() {
    let count = 0;            // makeCounter 스코프의 변수
    return function() {
        count++;
        return count;
    };
}

const counter = makeCounter();
counter(); // 1
counter(); // 2  — count 변수를 클로저로 유지
```

**활용 예시:**
- 데이터 은닉 (private 변수 패턴)
- 팩토리 함수
- 메모이제이션

---

## Q3. var, let, const의 차이를 설명해주세요

| 비교 | `var` | `let` | `const` |
|-----|-------|-------|---------|
| 스코프 | 함수 스코프 | 블록 스코프 | 블록 스코프 |
| 호이스팅 | O (undefined로 초기화) | O (TDZ 존재) | O (TDZ 존재) |
| 재선언 | 가능 | 불가 | 불가 |
| 재할당 | 가능 | 가능 | 불가 |

**TDZ (Temporal Dead Zone):** `let`/`const`는 선언 전 접근 시 `ReferenceError` 발생

```javascript
console.log(a); // undefined (var 호이스팅)
var a = 1;

console.log(b); // ReferenceError (TDZ)
let b = 2;
```

---

## Q4. 프로토타입(Prototype)과 상속을 설명해주세요

JavaScript는 **프로토타입 체인** 기반의 상속을 사용합니다.

```javascript
function Animal(name) {
    this.name = name;
}
Animal.prototype.speak = function() {
    return `${this.name} 소리냄`;
};

const dog = new Animal('멍멍이');
dog.speak();  // 프로토타입 체인으로 Animal.prototype.speak 찾음
```

```
dog → Animal.prototype → Object.prototype → null
```

**ES6 class 문법**은 프로토타입 기반의 문법적 설탕(syntactic sugar)입니다.

```javascript
class Animal {
    constructor(name) { this.name = name; }
    speak() { return `${this.name} 소리냄`; }
}
class Dog extends Animal {
    speak() { return `${super.speak()}: 왈왈`; }
}
```

---

## Q5. Promise와 async/await의 관계는?

`async/await`는 **Promise를 동기 코드처럼 작성**하는 문법입니다.

```javascript
// Promise 체이닝
fetchUser(id)
    .then(user => fetchPosts(user.id))
    .then(posts => renderPosts(posts))
    .catch(err => handleError(err));

// async/await — 같은 동작
async function loadUserPosts(id) {
    try {
        const user = await fetchUser(id);
        const posts = await fetchPosts(user.id);
        renderPosts(posts);
    } catch (err) {
        handleError(err);
    }
}
```

**병렬 실행:**
```javascript
// ❌ 순차 실행 (불필요한 대기)
const user = await fetchUser(id);
const settings = await fetchSettings(id);

// ✅ 병렬 실행
const [user, settings] = await Promise.all([
    fetchUser(id),
    fetchSettings(id)
]);
```

---

## Q6. this 바인딩 규칙을 설명해주세요

`this`는 **호출 방식**에 따라 달라집니다.

```javascript
// 1. 메서드 호출 — 호출한 객체
const obj = { name: 'Alice', greet() { return this.name; } };
obj.greet();  // 'Alice'

// 2. 일반 함수 호출 — undefined (strict mode) or window
function greet() { return this; }
greet();  // window 또는 undefined

// 3. 화살표 함수 — 상위 스코프의 this 캡처
const obj2 = {
    name: 'Bob',
    greet: () => this.name  // ❌ 화살표 함수는 상위(전역) this
};

// 4. 명시적 바인딩
greet.call(obj, arg1);
greet.apply(obj, [arg1]);
const boundGreet = greet.bind(obj);
```

---

## Q7. 얕은 복사(shallow copy)와 깊은 복사(deep copy)의 차이는?

```javascript
const original = { a: 1, nested: { b: 2 } };

// 얕은 복사 — 중첩 객체는 참조 공유
const shallow = { ...original };
shallow.nested.b = 99;
console.log(original.nested.b); // 99 — 원본도 변경!

// 깊은 복사 방법들
// 1. JSON (함수, undefined 제외)
const deep1 = JSON.parse(JSON.stringify(original));

// 2. structuredClone (최신 브라우저/Node.js)
const deep2 = structuredClone(original);

// 3. Lodash cloneDeep
const deep3 = _.cloneDeep(original);
```

---

## Q8. 호이스팅(Hoisting)이란?

변수/함수 **선언부가 스코프 최상단으로 끌어올려지는** 동작입니다.

```javascript
// 실제 코드
console.log(greet()); // 정상 동작 — 함수 선언은 완전히 호이스팅
console.log(name);    // undefined — var는 선언만 호이스팅

function greet() { return 'hello'; }
var name = 'Alice';

// 함수 표현식은 변수처럼 동작
console.log(sayHi()); // TypeError — sayHi는 undefined
var sayHi = function() { return 'hi'; };
```

---

## Q9. 이벤트 버블링과 캡처링을 설명해주세요

```
캡처링 (위 → 아래): document → html → body → div → button
버블링 (아래 → 위): button → div → body → html → document
```

```javascript
// 기본: 버블링 단계에서 실행
element.addEventListener('click', handler);

// 캡처링 단계에서 실행
element.addEventListener('click', handler, { capture: true });

// 버블링 중단
element.addEventListener('click', e => {
    e.stopPropagation();
});

// 이벤트 위임 (부모에서 자식 이벤트 처리)
document.querySelector('#list').addEventListener('click', e => {
    if (e.target.tagName === 'LI') handleItemClick(e.target);
});
```

---

## Q10. 메모리 누수가 발생하는 대표적인 경우는?

```javascript
// 1. 제거하지 않은 이벤트 리스너
const handler = () => {};
element.addEventListener('click', handler);
// 컴포넌트 제거 시 반드시 제거
element.removeEventListener('click', handler);

// 2. 전역 변수
window.bigData = fetchHugeData(); // GC 불가

// 3. 클로저로 인한 참조 유지
function attach() {
    const bigArray = new Array(1000000);
    element.onclick = function() {
        // bigArray를 참조하지 않아도 클로저 때문에 유지됨
    };
}

// 4. clearInterval/clearTimeout 누락
const timer = setInterval(task, 1000);
// 반드시: clearInterval(timer);
```
