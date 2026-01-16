---
title: "JavaScript 배열(Array)"
date: "2026-01-17"
tags: ["javascript", "array", "data-structure", "frontend"]
excerpt: "JavaScript 배열의 생성, 조작, 그리고 다양한 메서드들을 알아봅니다."
---

# JavaScript 배열(Array)

JavaScript 배열의 생성, 조작, 그리고 다양한 메서드들을 알아봅니다.

## 배열 생성

### 리터럴 방식 (권장)

```javascript
const arr = [1, 2, 3];
const mixed = [1, 'hello', true, { name: 'Alice' }];
const empty = [];
```

---

### Array 생성자

```javascript
const arr1 = new Array(3);        // [empty × 3] (길이 3인 빈 배열)
const arr2 = new Array(1, 2, 3);  // [1, 2, 3]
const arr3 = new Array('hello');  // ['hello']
```

---

### Array.of()

```javascript
// 생성자의 혼란 해결
Array.of(3);        // [3]
Array.of(1, 2, 3);  // [1, 2, 3]
```

---

### Array.from()

```javascript
// 유사 배열 → 배열 변환
Array.from('hello');  // ['h', 'e', 'l', 'l', 'o']
Array.from({ length: 3 }, (_, i) => i);  // [0, 1, 2]

// NodeList → 배열
const divs = document.querySelectorAll('div');
const divArray = Array.from(divs);

// Set → 배열
const set = new Set([1, 2, 3]);
Array.from(set);  // [1, 2, 3]
```

---

### 배열 채우기

```javascript
// fill()
new Array(3).fill(0);  // [0, 0, 0]
new Array(3).fill({ x: 1 });  // 주의: 같은 객체 참조!

// Array.from으로 안전하게
Array.from({ length: 3 }, () => ({ x: 1 }));  // 각각 다른 객체
```

---

## 배열 접근

### 인덱스 접근

```javascript
const arr = ['a', 'b', 'c'];

arr[0];   // 'a'
arr[2];   // 'c'
arr[-1];  // undefined (음수 인덱스 미지원)
arr[10];  // undefined (범위 초과)
```

---

### at() 메서드 (ES2022)

```javascript
const arr = ['a', 'b', 'c'];

arr.at(0);   // 'a'
arr.at(-1);  // 'c' (마지막 요소)
arr.at(-2);  // 'b' (뒤에서 두 번째)
```

---

### 구조 분해

```javascript
const [first, second, ...rest] = [1, 2, 3, 4, 5];
first;  // 1
second; // 2
rest;   // [3, 4, 5]

// 기본값
const [a = 0, b = 0] = [1];
a;  // 1
b;  // 0

// 스왑
let x = 1, y = 2;
[x, y] = [y, x];  // x = 2, y = 1
```

---

## 배열 속성

### length

```javascript
const arr = [1, 2, 3];
arr.length;  // 3

// length 조작
arr.length = 5;   // [1, 2, 3, empty × 2]
arr.length = 2;   // [1, 2] (요소 삭제됨!)
arr.length = 0;   // [] (배열 비우기)
```

---

## 요소 추가/제거

### push / pop (끝)

```javascript
const arr = [1, 2];

arr.push(3);       // [1, 2, 3], 반환: 3 (새 길이)
arr.push(4, 5);    // [1, 2, 3, 4, 5]
arr.pop();         // [1, 2, 3, 4], 반환: 5 (제거된 요소)
```

---

### unshift / shift (앞)

```javascript
const arr = [1, 2];

arr.unshift(0);    // [0, 1, 2], 반환: 3 (새 길이)
arr.unshift(-2, -1);  // [-2, -1, 0, 1, 2]
arr.shift();       // [-1, 0, 1, 2], 반환: -2 (제거된 요소)
```

**성능:** push/pop이 unshift/shift보다 빠름 (인덱스 재배열 불필요)

---

### splice (임의 위치)

```javascript
const arr = [1, 2, 3, 4, 5];

// 삭제: splice(시작, 개수)
arr.splice(2, 1);     // [1, 2, 4, 5], 반환: [3]

// 추가: splice(시작, 0, 요소들)
arr.splice(2, 0, 'a', 'b');  // [1, 2, 'a', 'b', 4, 5]

// 교체: splice(시작, 개수, 요소들)
arr.splice(1, 2, 'x');  // [1, 'x', 'b', 4, 5], 반환: [2, 'a']
```

---

### toSpliced() (ES2023, 원본 유지)

```javascript
const arr = [1, 2, 3, 4, 5];
const newArr = arr.toSpliced(2, 1, 'a');

arr;     // [1, 2, 3, 4, 5] (원본 유지)
newArr;  // [1, 2, 'a', 4, 5]
```

---

## 배열 검색

### indexOf / lastIndexOf

```javascript
const arr = [1, 2, 3, 2, 1];

arr.indexOf(2);       // 1 (첫 번째 인덱스)
arr.lastIndexOf(2);   // 3 (마지막 인덱스)
arr.indexOf(5);       // -1 (없음)
arr.indexOf(2, 2);    // 3 (인덱스 2부터 검색)
```

---

### includes

```javascript
const arr = [1, 2, 3, NaN];

arr.includes(2);     // true
arr.includes(5);     // false
arr.includes(NaN);   // true (indexOf는 NaN 못 찾음)
```

---

### find / findIndex

```javascript
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
];

// 조건에 맞는 첫 번째 요소
users.find(user => user.id === 2);
// { id: 2, name: 'Bob' }

// 조건에 맞는 첫 번째 인덱스
users.findIndex(user => user.id === 2);  // 1

// 없으면
users.find(user => user.id === 5);       // undefined
users.findIndex(user => user.id === 5);  // -1
```

---

### findLast / findLastIndex (ES2023)

```javascript
const arr = [1, 2, 3, 4, 5];

arr.findLast(x => x % 2 === 0);       // 4 (마지막 짝수)
arr.findLastIndex(x => x % 2 === 0);  // 3
```

---

## 배열 순회

### forEach

```javascript
const arr = [1, 2, 3];

arr.forEach((value, index, array) => {
  console.log(value, index);
});
// 1 0
// 2 1
// 3 2

// break 불가능 (for...of 사용)
```

---

### for...of

```javascript
const arr = [1, 2, 3];

for (const value of arr) {
  console.log(value);
  if (value === 2) break;  // break 가능
}
```

---

### entries / keys / values

```javascript
const arr = ['a', 'b', 'c'];

// entries: [인덱스, 값] 쌍
for (const [index, value] of arr.entries()) {
  console.log(index, value);
}

// keys: 인덱스
[...arr.keys()];    // [0, 1, 2]

// values: 값
[...arr.values()];  // ['a', 'b', 'c']
```

---

## 배열 변환

### map

```javascript
const numbers = [1, 2, 3];

const doubled = numbers.map(x => x * 2);
// [2, 4, 6]

const users = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
];

const names = users.map(user => user.name);
// ['Alice', 'Bob']
```

---

### filter

```javascript
const numbers = [1, 2, 3, 4, 5];

const evens = numbers.filter(x => x % 2 === 0);
// [2, 4]

const users = [
  { name: 'Alice', active: true },
  { name: 'Bob', active: false },
  { name: 'Charlie', active: true }
];

const activeUsers = users.filter(user => user.active);
// [{ name: 'Alice', active: true }, { name: 'Charlie', active: true }]
```

---

### reduce

```javascript
const numbers = [1, 2, 3, 4, 5];

// 합계
const sum = numbers.reduce((acc, cur) => acc + cur, 0);
// 15

// 최댓값
const max = numbers.reduce((acc, cur) => Math.max(acc, cur), -Infinity);
// 5

// 그룹화
const items = ['apple', 'banana', 'apple', 'orange', 'banana', 'apple'];
const count = items.reduce((acc, item) => {
  acc[item] = (acc[item] || 0) + 1;
  return acc;
}, {});
// { apple: 3, banana: 2, orange: 1 }

// 배열 평탄화
const nested = [[1, 2], [3, 4], [5]];
const flat = nested.reduce((acc, cur) => acc.concat(cur), []);
// [1, 2, 3, 4, 5]
```

---

### reduceRight

```javascript
const arr = [[1, 2], [3, 4], [5]];

// 오른쪽부터 reduce
arr.reduceRight((acc, cur) => acc.concat(cur), []);
// [5, 3, 4, 1, 2]
```

---

### flat / flatMap

```javascript
const nested = [1, [2, [3, [4]]]];

nested.flat();      // [1, 2, [3, [4]]] (1단계)
nested.flat(2);     // [1, 2, 3, [4]] (2단계)
nested.flat(Infinity);  // [1, 2, 3, 4] (모든 단계)

// flatMap = map + flat(1)
const arr = [1, 2, 3];
arr.flatMap(x => [x, x * 2]);
// [1, 2, 2, 4, 3, 6]
```

---

## 배열 정렬

### sort (원본 변경)

```javascript
const arr = [3, 1, 4, 1, 5];

// 기본: 문자열 정렬!
arr.sort();  // [1, 1, 3, 4, 5]

const numbers = [10, 2, 30];
numbers.sort();  // [10, 2, 30] (문자열로 비교!)

// 숫자 정렬
numbers.sort((a, b) => a - b);  // [2, 10, 30] (오름차순)
numbers.sort((a, b) => b - a);  // [30, 10, 2] (내림차순)

// 객체 정렬
const users = [
  { name: 'Bob', age: 30 },
  { name: 'Alice', age: 25 }
];
users.sort((a, b) => a.age - b.age);
// [{ name: 'Alice', age: 25 }, { name: 'Bob', age: 30 }]
```

---

### toSorted() (ES2023, 원본 유지)

```javascript
const arr = [3, 1, 4, 1, 5];
const sorted = arr.toSorted((a, b) => a - b);

arr;     // [3, 1, 4, 1, 5] (원본 유지)
sorted;  // [1, 1, 3, 4, 5]
```

---

### reverse (원본 변경)

```javascript
const arr = [1, 2, 3];
arr.reverse();  // [3, 2, 1]
```

---

### toReversed() (ES2023, 원본 유지)

```javascript
const arr = [1, 2, 3];
const reversed = arr.toReversed();

arr;       // [1, 2, 3] (원본 유지)
reversed;  // [3, 2, 1]
```

---

## 배열 조건 검사

### every

```javascript
const numbers = [2, 4, 6, 8];

numbers.every(x => x % 2 === 0);  // true (모두 짝수)
numbers.every(x => x > 5);        // false (모두 > 5 아님)
```

---

### some

```javascript
const numbers = [1, 2, 3, 4, 5];

numbers.some(x => x > 3);   // true (하나라도 > 3)
numbers.some(x => x > 10);  // false
```

---

## 배열 복사/결합

### slice (일부 복사)

```javascript
const arr = [1, 2, 3, 4, 5];

arr.slice(1, 3);   // [2, 3] (인덱스 1~2)
arr.slice(2);      // [3, 4, 5] (인덱스 2부터 끝까지)
arr.slice(-2);     // [4, 5] (뒤에서 2개)
arr.slice();       // [1, 2, 3, 4, 5] (전체 복사, 얕은 복사)
```

---

### concat (결합)

```javascript
const arr1 = [1, 2];
const arr2 = [3, 4];

arr1.concat(arr2);        // [1, 2, 3, 4]
arr1.concat(arr2, [5]);   // [1, 2, 3, 4, 5]
arr1.concat(5, 6);        // [1, 2, 5, 6]
```

---

### Spread 연산자

```javascript
const arr1 = [1, 2];
const arr2 = [3, 4];

// 결합
[...arr1, ...arr2];  // [1, 2, 3, 4]

// 복사
const copy = [...arr1];

// 요소 추가
[0, ...arr1, 3];  // [0, 1, 2, 3]
```

---

## 배열 → 문자열

### join

```javascript
const arr = ['a', 'b', 'c'];

arr.join();      // 'a,b,c' (기본: 쉼표)
arr.join('-');   // 'a-b-c'
arr.join('');    // 'abc'
```

---

### toString

```javascript
const arr = [1, 2, 3];
arr.toString();  // '1,2,3'
```

---

## 배열 확인

### Array.isArray

```javascript
Array.isArray([1, 2, 3]);      // true
Array.isArray('hello');        // false
Array.isArray({ length: 3 });  // false (유사 배열)
```

---

## 유용한 패턴

### 중복 제거

```javascript
const arr = [1, 2, 2, 3, 3, 3];

// Set 사용
[...new Set(arr)];  // [1, 2, 3]

// filter 사용
arr.filter((item, index) => arr.indexOf(item) === index);
```

---

### 배열 비우기

```javascript
const arr = [1, 2, 3];

// 방법 1: length (권장)
arr.length = 0;

// 방법 2: 재할당 (참조 변경)
arr = [];

// 방법 3: splice
arr.splice(0, arr.length);
```

---

### 최대/최소

```javascript
const arr = [1, 2, 3, 4, 5];

Math.max(...arr);  // 5
Math.min(...arr);  // 1

// reduce
arr.reduce((max, cur) => Math.max(max, cur), -Infinity);
```

---

### 배열 섞기 (shuffle)

```javascript
const arr = [1, 2, 3, 4, 5];

// Fisher-Yates 알고리즘
for (let i = arr.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [arr[i], arr[j]] = [arr[j], arr[i]];
}
```

---

### 청크 분할

```javascript
function chunk(arr, size) {
  return Array.from(
    { length: Math.ceil(arr.length / size) },
    (_, i) => arr.slice(i * size, i * size + size)
  );
}

chunk([1, 2, 3, 4, 5], 2);  // [[1, 2], [3, 4], [5]]
```

---

## 원본 변경 vs 새 배열 반환

### 원본 변경

```javascript
push, pop, shift, unshift  // 요소 추가/제거
splice                      // 요소 추가/제거/교체
sort, reverse              // 정렬/뒤집기
fill                       // 채우기
copyWithin                 // 복사
```

---

### 새 배열 반환

```javascript
map, filter, reduce        // 변환
slice, concat              // 복사/결합
flat, flatMap             // 평탄화
toSorted, toReversed      // ES2023
toSpliced, with           // ES2023
```

---

## 요약

| 카테고리 | 메서드 |
|---------|-------|
| 생성 | `[]`, `Array.of()`, `Array.from()` |
| 추가/제거 | `push`, `pop`, `shift`, `unshift`, `splice` |
| 검색 | `indexOf`, `includes`, `find`, `findIndex` |
| 순회 | `forEach`, `for...of`, `entries` |
| 변환 | `map`, `filter`, `reduce`, `flat` |
| 정렬 | `sort`, `reverse`, `toSorted`, `toReversed` |
| 조건 | `every`, `some` |
| 복사/결합 | `slice`, `concat`, `...spread` |

**ES2023 추가:** `toSorted`, `toReversed`, `toSpliced`, `with`, `findLast`, `findLastIndex`