---
title: "얕은 복사(Shallow Copy)와 깊은 복사(Deep Copy)"
date: "2026-01-14"
tags: ["javascript", "copy", "clone", "immutability", "frontend"]
excerpt: "JavaScript에서 객체와 배열을 복사하는 방법과 얕은 복사, 깊은 복사의 차이를 알아봅니다."
---

# 얕은 복사(Shallow Copy)와 깊은 복사(Deep Copy)

JavaScript에서 객체와 배열을 복사하는 방법과 얕은 복사, 깊은 복사의 차이를 알아봅니다.

## 원시 타입 vs 참조 타입

### 원시 타입 (Primitive Type)

```javascript
// 값 복사
let a = 10;
let b = a;  // 값 복사

b = 20;

console.log(a);  // 10 (변경 안 됨)
console.log(b);  // 20
```

**원시 타입:** number, string, boolean, null, undefined, symbol, bigint

---

### 참조 타입 (Reference Type)

```javascript
// 참조 복사
let obj1 = { value: 10 };
let obj2 = obj1;  // 참조 복사 (같은 객체 참조)

obj2.value = 20;

console.log(obj1.value);  // 20 (변경됨!)
console.log(obj2.value);  // 20
```

**참조 타입:** Object, Array, Function

---

### 메모리 구조

```javascript
// 원시 타입
let a = 10;
let b = a;

Memory:
  a: 10
  b: 10  (별도 공간)

// 참조 타입
let obj1 = { value: 10 };
let obj2 = obj1;

Memory:
  obj1 → Heap: { value: 10 }
  obj2 → Heap: { value: 10 }  (같은 주소!)
```

---

## 얕은 복사 (Shallow Copy)

**1단계 깊이까지만 복사**하고, 중첩된 객체는 참조를 복사합니다.

### 1. Spread Operator (...)

```javascript
// 객체
const original = { a: 1, b: 2 };
const copy = { ...original };

copy.a = 10;

console.log(original.a);  // 1 (변경 안 됨)
console.log(copy.a);      // 10
```

```javascript
// 배열
const original = [1, 2, 3];
const copy = [...original];

copy[0] = 10;

console.log(original);  // [1, 2, 3]
console.log(copy);      // [10, 2, 3]
```

---

### 2. Object.assign()

```javascript
const original = { a: 1, b: 2 };
const copy = Object.assign({}, original);

copy.a = 10;

console.log(original.a);  // 1
console.log(copy.a);      // 10
```

**병합도 가능:**
```javascript
const obj1 = { a: 1 };
const obj2 = { b: 2 };
const merged = Object.assign({}, obj1, obj2);

console.log(merged);  // { a: 1, b: 2 }
```

---

### 3. Array.prototype.slice()

```javascript
const original = [1, 2, 3];
const copy = original.slice();

copy[0] = 10;

console.log(original);  // [1, 2, 3]
console.log(copy);      // [10, 2, 3]
```

---

### 4. Array.prototype.concat()

```javascript
const original = [1, 2, 3];
const copy = [].concat(original);

copy[0] = 10;

console.log(original);  // [1, 2, 3]
console.log(copy);      // [10, 2, 3]
```

---

### 얕은 복사의 문제점

```javascript
const original = {
  name: 'Alice',
  address: {
    city: 'Seoul'
  }
};

const copy = { ...original };

// 1단계 속성은 독립적
copy.name = 'Bob';
console.log(original.name);  // 'Alice' (변경 안 됨)

// 중첩 객체는 참조 복사!
copy.address.city = 'Busan';
console.log(original.address.city);  // 'Busan' (변경됨!)
```

**문제:** 중첩된 객체는 여전히 같은 참조를 공유합니다.

---

## 깊은 복사 (Deep Copy)

**모든 중첩된 객체까지 완전히 복사**합니다.

### 1. JSON.parse(JSON.stringify())

```javascript
const original = {
  name: 'Alice',
  address: {
    city: 'Seoul',
    detail: {
      dong: 'Gangnam'
    }
  }
};

const copy = JSON.parse(JSON.stringify(original));

copy.address.city = 'Busan';
copy.address.detail.dong = 'Haeundae';

console.log(original.address.city);         // 'Seoul' (변경 안 됨!)
console.log(original.address.detail.dong);  // 'Gangnam' (변경 안 됨!)
```

---

### JSON 방식의 한계

```javascript
const obj = {
  date: new Date(),
  regex: /test/,
  func: () => console.log('hello'),
  undef: undefined,
  symbol: Symbol('id'),
  nan: NaN,
  infinity: Infinity
};

const copy = JSON.parse(JSON.stringify(obj));

console.log(copy);
// {
//   date: "2024-01-14T..." (문자열로 변환)
//   regex: {} (빈 객체)
//   func: undefined (제거됨)
//   undef: undefined (제거됨)
//   symbol: undefined (제거됨)
//   nan: null
//   infinity: null
// }
```

**제한사항:**
- 함수 제거됨
- undefined 제거됨
- Symbol 제거됨
- Date → 문자열
- RegExp → 빈 객체
- NaN/Infinity → null
- 순환 참조 불가능

---

### 2. structuredClone() (최신)

```javascript
const original = {
  name: 'Alice',
  date: new Date(),
  regex: /test/,
  address: {
    city: 'Seoul'
  }
};

const copy = structuredClone(original);

copy.address.city = 'Busan';

console.log(original.address.city);  // 'Seoul' (변경 안 됨!)
console.log(copy.date instanceof Date);  // true (Date 유지!)
```

**장점:**
- Date, RegExp, Map, Set 지원
- 순환 참조 가능
- 성능 좋음

**제한사항:**
- 함수 복사 불가
- DOM 노드 복사 불가
- Error 객체 복사 불가

---

### 3. 재귀 함수로 직접 구현

```javascript
function deepCopy(obj) {
  // null이거나 원시 타입이면 그대로 반환
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Date
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  // RegExp
  if (obj instanceof RegExp) {
    return new RegExp(obj);
  }

  // Array
  if (Array.isArray(obj)) {
    return obj.map(item => deepCopy(item));
  }

  // Object
  const copy = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      copy[key] = deepCopy(obj[key]);
    }
  }
  return copy;
}
```

**사용:**
```javascript
const original = {
  name: 'Alice',
  date: new Date(),
  address: {
    city: 'Seoul',
    detail: {
      dong: 'Gangnam'
    }
  },
  hobbies: ['reading', 'gaming']
};

const copy = deepCopy(original);

copy.address.detail.dong = 'Haeundae';
copy.hobbies.push('coding');

console.log(original.address.detail.dong);  // 'Gangnam' (변경 안 됨!)
console.log(original.hobbies);  // ['reading', 'gaming'] (변경 안 됨!)
```

---

### 4. 라이브러리 사용

#### Lodash

```javascript
import _ from 'lodash';

const original = {
  name: 'Alice',
  address: {
    city: 'Seoul'
  }
};

// 깊은 복사
const copy = _.cloneDeep(original);

copy.address.city = 'Busan';
console.log(original.address.city);  // 'Seoul'
```

---

## 배열 복사

### 얕은 복사

```javascript
const original = [1, 2, [3, 4]];

// Spread
const copy1 = [...original];

// slice
const copy2 = original.slice();

// concat
const copy3 = [].concat(original);

// Array.from
const copy4 = Array.from(original);

// 문제: 중첩 배열은 참조 복사
copy1[2][0] = 100;
console.log(original[2][0]);  // 100 (변경됨!)
```

---

### 깊은 복사

```javascript
const original = [1, 2, [3, 4, [5, 6]]];

// JSON 방식
const copy1 = JSON.parse(JSON.stringify(original));

// structuredClone
const copy2 = structuredClone(original);

// 재귀 함수
const copy3 = deepCopy(original);

copy1[2][2][0] = 100;
console.log(original[2][2][0]);  // 5 (변경 안 됨!)
```

---

## 실전 예제

### 예제 1: React State 업데이트

```javascript
// ❌ 직접 수정 (불변성 위반)
const [user, setUser] = useState({
  name: 'Alice',
  address: { city: 'Seoul' }
});

const updateCity = () => {
  user.address.city = 'Busan';  // 직접 수정 (안 됨!)
  setUser(user);
};

// ✅ 새 객체 생성 (얕은 복사)
const updateCity = () => {
  setUser({
    ...user,
    address: {
      ...user.address,
      city: 'Busan'
    }
  });
};

// ✅ Immer 라이브러리 사용
import { produce } from 'immer';

const updateCity = () => {
  setUser(produce(draft => {
    draft.address.city = 'Busan';
  }));
};
```

---

### 예제 2: Redux Reducer

```javascript
// ❌ 직접 수정
function reducer(state, action) {
  switch (action.type) {
    case 'ADD_TODO':
      state.todos.push(action.payload);  // 직접 수정 (안 됨!)
      return state;
  }
}

// ✅ 새 배열 생성
function reducer(state, action) {
  switch (action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        todos: [...state.todos, action.payload]
      };
    case 'UPDATE_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.id
            ? { ...todo, ...action.payload }
            : todo
        )
      };
  }
}
```

---

### 예제 3: 객체 병합

```javascript
const defaults = {
  theme: 'light',
  language: 'ko',
  notifications: {
    email: true,
    push: false
  }
};

const userSettings = {
  theme: 'dark',
  notifications: {
    push: true
  }
};

// ❌ 얕은 병합 (notifications가 완전히 덮어써짐)
const settings1 = { ...defaults, ...userSettings };
console.log(settings1.notifications);
// { push: true } (email이 사라짐!)

// ✅ 깊은 병합
const settings2 = {
  ...defaults,
  ...userSettings,
  notifications: {
    ...defaults.notifications,
    ...userSettings.notifications
  }
};
console.log(settings2.notifications);
// { email: true, push: true }

// ✅ Lodash merge
import _ from 'lodash';
const settings3 = _.merge({}, defaults, userSettings);
```

---

### 예제 4: 배열 업데이트

```javascript
const todos = [
  { id: 1, text: 'Learn React', done: false },
  { id: 2, text: 'Learn Redux', done: false }
];

// ❌ 직접 수정
todos[0].done = true;

// ✅ 새 배열 생성
const newTodos = todos.map(todo =>
  todo.id === 1
    ? { ...todo, done: true }
    : todo
);

// ✅ filter로 삭제
const filtered = todos.filter(todo => todo.id !== 1);

// ✅ concat으로 추가
const added = todos.concat({ id: 3, text: 'Learn TypeScript', done: false });

// ✅ Spread로 추가
const added2 = [...todos, { id: 3, text: 'Learn TypeScript', done: false }];
```

---

## 성능 고려사항

### 얕은 복사가 충분한 경우

```javascript
// 1단계 객체
const user = { name: 'Alice', age: 25 };
const copy = { ...user };  // 빠르고 충분함

// 평탄한 배열
const numbers = [1, 2, 3, 4, 5];
const copy2 = [...numbers];  // 빠르고 충분함
```

---

### 깊은 복사가 필요한 경우

```javascript
// 중첩 객체
const user = {
  name: 'Alice',
  address: {
    city: 'Seoul',
    detail: { dong: 'Gangnam' }
  }
};
const copy = structuredClone(user);  // 깊은 복사 필요

// 중첩 배열
const matrix = [[1, 2], [3, 4], [5, 6]];
const copy2 = structuredClone(matrix);  // 깊은 복사 필요
```

---

### 성능 비교

```javascript
const obj = { /* 복잡한 객체 */ };

// 빠름 → 느림
1. Spread / Object.assign     (얕은 복사)
2. structuredClone             (깊은 복사)
3. 재귀 함수                    (깊은 복사)
4. JSON.parse(JSON.stringify)  (깊은 복사, 제한 많음)
5. Lodash _.cloneDeep          (깊은 복사, 기능 많음)
```

---

## 불변성 유지 패턴

### 객체 업데이트

```javascript
// 1단계
const updated = { ...obj, name: 'Bob' };

// 2단계
const updated = {
  ...obj,
  address: {
    ...obj.address,
    city: 'Busan'
  }
};

// 3단계
const updated = {
  ...obj,
  address: {
    ...obj.address,
    detail: {
      ...obj.address.detail,
      dong: 'Haeundae'
    }
  }
};
```

---

### 배열 업데이트

```javascript
// 추가
const added = [...arr, newItem];
const added2 = [newItem, ...arr];

// 삭제
const removed = arr.filter(item => item.id !== targetId);

// 수정
const updated = arr.map(item =>
  item.id === targetId
    ? { ...item, ...updates }
    : item
);

// 정렬 (원본 유지)
const sorted = [...arr].sort((a, b) => a - b);
```

---

## 순환 참조 처리

### 순환 참조 객체

```javascript
const obj = { name: 'Alice' };
obj.self = obj;  // 순환 참조

// ❌ JSON 방식 에러
JSON.parse(JSON.stringify(obj));  // Error: Converting circular structure to JSON

// ✅ structuredClone 가능
const copy = structuredClone(obj);
console.log(copy.self === copy);  // true

// ✅ 재귀 함수 (Map으로 추적)
function deepCopyWithCircular(obj, map = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 이미 복사한 객체면 반환
  if (map.has(obj)) {
    return map.get(obj);
  }

  const copy = Array.isArray(obj) ? [] : {};
  map.set(obj, copy);

  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      copy[key] = deepCopyWithCircular(obj[key], map);
    }
  }

  return copy;
}
```

---

## 복사 방법 선택 가이드

### 얕은 복사 사용

```javascript
// ✅ 1단계 객체/배열
const obj = { a: 1, b: 2 };
const copy = { ...obj };

// ✅ 불변성 유지 (React/Redux)
const newState = { ...state, value: newValue };

// ✅ 배열 조작
const newArr = [...arr, newItem];
```

---

### 깊은 복사 사용

```javascript
// ✅ 중첩 객체/배열
const obj = { a: { b: { c: 1 } } };
const copy = structuredClone(obj);

// ✅ 독립적인 복사본 필요
const template = { /* 복잡한 객체 */ };
const instance = structuredClone(template);

// ✅ Date, RegExp 등 포함
const data = { date: new Date(), regex: /test/ };
const copy = structuredClone(data);
```

---

## 요약

1. **얕은 복사**: 1단계만 복사, 중첩 객체는 참조 복사
   - `{ ...obj }`, `[...arr]`, `Object.assign()`, `slice()`, `concat()`
2. **깊은 복사**: 모든 중첩 객체까지 완전히 복사
   - `structuredClone()` (최신, 추천)
   - `JSON.parse(JSON.stringify())` (제한 많음)
   - 재귀 함수 직접 구현
   - Lodash `_.cloneDeep()`
3. **사용 시기**:
   - 평탄한 구조 → 얕은 복사
   - 중첩 구조 → 깊은 복사
   - React/Redux → 얕은 복사로 불변성 유지
4. **성능**: 얕은 복사가 빠르지만, 중첩 객체는 깊은 복사 필요
5. **순환 참조**: `structuredClone()` 또는 WeakMap 활용

불변성 유지가 중요한 React/Redux에서는 **Spread 연산자로 얕은 복사**를 주로 사용합니다.