---
title: "객체와 배열"
order: 4
---

## 객체(Object)란?

변수는 하나의 값만 저장할 수 있어요. 그런데 "사람"을 표현하려면?
이름, 나이, 직업... 여러 정보가 필요하죠.

**객체는 관련된 정보를 하나로 묶는 상자**입니다.

```javascript
// 일반 변수로 사람 표현 → 관리가 어려움
const name = "김철수";
const age = 25;
const job = "개발자";

// 객체로 표현 → 깔끔하게 묶임
const person = {
  name: "김철수",   // 키: 값 형태
  age: 25,
  job: "개발자",
};
```

객체는 **키(key)와 값(value)의 쌍**으로 이루어집니다.
마치 서랍장처럼 각 서랍(키)에 내용물(값)이 들어있는 구조예요.

---

## 객체 만들기와 접근하기

```javascript
// 객체 생성
const book = {
  title: "자바스크립트 입문",   // 제목
  author: "홍길동",             // 저자
  pages: 350,                   // 페이지 수
  isPublished: true,            // 출판 여부
};

// 값 읽기 - 점 표기법 (가장 많이 사용)
console.log(book.title);    // "자바스크립트 입문"
console.log(book.author);   // "홍길동"

// 값 읽기 - 대괄호 표기법 (변수로 키를 지정할 때 유용)
console.log(book["pages"]); // 350

const key = "isPublished";
console.log(book[key]);     // true (변수로 접근 가능!)

// 값 수정
book.pages = 400;           // 페이지 수 변경
console.log(book.pages);    // 400

// 새로운 속성 추가
book.price = 28000;         // 가격 추가
console.log(book.price);    // 28000

// 속성 삭제
delete book.isPublished;    // isPublished 제거
console.log(book.isPublished); // undefined (없어짐)
```

---

## 객체 안의 함수 (메서드)

객체 안에 함수를 넣을 수도 있어요. 이걸 **메서드(method)**라고 합니다.

```javascript
const calculator = {
  value: 0,                    // 현재 값

  // 더하기 메서드
  add: function (num) {
    this.value += num;         // this = 이 객체 자신을 가리킴
    return this;               // 메서드 체이닝을 위해 자신 반환
  },

  // 빼기 메서드 (화살표 함수 단축형)
  subtract(num) {
    this.value -= num;
    return this;
  },

  // 결과 출력 메서드
  result() {
    console.log("결과:", this.value);
    return this;
  },
};

calculator.add(10).add(5).subtract(3).result(); // 결과: 12
```

> **주의**: 객체 메서드에서 `this`는 그 객체를 가리킵니다.
> 화살표 함수에서는 `this`가 다르게 동작하므로 메서드엔 일반 함수를 쓰세요.

---

## 객체 순회하기

객체의 모든 키와 값을 하나씩 살펴보고 싶을 때:

```javascript
const scores = {
  국어: 90,
  영어: 85,
  수학: 92,
  과학: 88,
};

// for...in 반복문으로 순회
for (const subject in scores) {
  console.log(`${subject}: ${scores[subject]}점`);
  // 국어: 90점
  // 영어: 85점
  // 수학: 92점
  // 과학: 88점
}

// Object.keys() - 키 배열로 가져오기
const subjects = Object.keys(scores);
console.log(subjects); // ["국어", "영어", "수학", "과학"]

// Object.values() - 값 배열로 가져오기
const values = Object.values(scores);
console.log(values);   // [90, 85, 92, 88]

// Object.entries() - [키, 값] 쌍의 배열로 가져오기
const entries = Object.entries(scores);
console.log(entries);
// [["국어", 90], ["영어", 85], ["수학", 92], ["과학", 88]]
```

---

## 배열(Array)란?

배열은 **순서가 있는 값들의 목록**입니다.
쇼핑 목록, 학생 명단, 점수 목록처럼 같은 종류의 데이터를 여러 개 다룰 때 사용해요.

```javascript
// 배열 생성
const fruits = ["사과", "바나나", "딸기", "포도"];
//               0번     1번     2번    3번  ← 인덱스(0부터 시작!)

// 인덱스로 접근
console.log(fruits[0]); // "사과"  (첫 번째)
console.log(fruits[2]); // "딸기"  (세 번째)
console.log(fruits[fruits.length - 1]); // "포도" (마지막)

// 배열 길이
console.log(fruits.length); // 4

// 값 변경
fruits[1] = "오렌지";       // 바나나 → 오렌지로 변경
console.log(fruits);         // ["사과", "오렌지", "딸기", "포도"]
```

---

## 배열 핵심 메서드

### 추가/제거

```javascript
const todo = ["운동하기", "책 읽기"];

// push() - 맨 뒤에 추가
todo.push("코딩 공부");
console.log(todo); // ["운동하기", "책 읽기", "코딩 공부"]

// pop() - 맨 뒤에서 제거 (제거된 값 반환)
const removed = todo.pop();
console.log(removed); // "코딩 공부"
console.log(todo);    // ["운동하기", "책 읽기"]

// unshift() - 맨 앞에 추가
todo.unshift("아침 먹기");
console.log(todo); // ["아침 먹기", "운동하기", "책 읽기"]

// shift() - 맨 앞에서 제거
todo.shift();
console.log(todo); // ["운동하기", "책 읽기"]
```

### 탐색

```javascript
const numbers = [10, 20, 30, 40, 50];

// indexOf() - 값의 위치 찾기 (없으면 -1)
console.log(numbers.indexOf(30));  // 2
console.log(numbers.indexOf(99));  // -1 (없음)

// includes() - 값 포함 여부 확인
console.log(numbers.includes(20)); // true
console.log(numbers.includes(99)); // false

// find() - 조건에 맞는 첫 번째 요소 반환
const found = numbers.find(n => n > 25);
console.log(found); // 30 (25보다 큰 첫 번째 값)

// findIndex() - 조건에 맞는 첫 번째 인덱스 반환
const idx = numbers.findIndex(n => n > 25);
console.log(idx); // 2
```

### 변환 (가장 많이 씀!)

```javascript
const students = [
  { name: "김철수", score: 85 },
  { name: "이영희", score: 92 },
  { name: "박민준", score: 78 },
];

// map() - 각 요소를 변환해서 새 배열 만들기
const names = students.map(student => student.name);
console.log(names); // ["김철수", "이영희", "박민준"]

const scores = students.map(student => student.score);
console.log(scores); // [85, 92, 78]

// filter() - 조건에 맞는 요소만 골라서 새 배열 만들기
const highScorers = students.filter(student => student.score >= 85);
console.log(highScorers);
// [{name: "김철수", score: 85}, {name: "이영희", score: 92}]

// reduce() - 모든 요소를 하나의 값으로 합치기
const totalScore = scores.reduce((sum, score) => sum + score, 0);
// sum: 누적값, score: 현재 값, 0: 초기값
console.log(totalScore); // 255

const average = totalScore / scores.length;
console.log(average); // 85
```

---

## map, filter, reduce 활용 예제

실제로 어떻게 쓰는지 Todo 앱으로 확인해봐요:

```javascript
const todos = [
  { id: 1, text: "장보기", done: true },
  { id: 2, text: "운동하기", done: false },
  { id: 3, text: "책 읽기", done: true },
  { id: 4, text: "청소하기", done: false },
];

// 완료된 할 일만 필터링
const doneTodos = todos.filter(todo => todo.done);
console.log(doneTodos.length); // 2

// 미완료 할 일만 필터링
const pendingTodos = todos.filter(todo => !todo.done);
console.log(pendingTodos.map(t => t.text)); // ["운동하기", "청소하기"]

// id로 특정 할 일 찾기
const targetTodo = todos.find(todo => todo.id === 2);
console.log(targetTodo); // {id: 2, text: "운동하기", done: false}

// 완료 처리 (map으로 새 배열 생성)
const updatedTodos = todos.map(todo =>
  todo.id === 2
    ? { ...todo, done: true }  // id가 2면 done을 true로 변경
    : todo                      // 나머지는 그대로
);
```

---

## 배열 복사와 합치기

```javascript
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];

// 배열 합치기 - concat()
const combined = arr1.concat(arr2);
console.log(combined); // [1, 2, 3, 4, 5, 6]

// 스프레드 연산자로 합치기 (더 많이 씀)
const merged = [...arr1, ...arr2];
console.log(merged); // [1, 2, 3, 4, 5, 6]

// 배열 복사 (참조 복사 주의!)
const original = [1, 2, 3];

// ❌ 잘못된 복사 - 같은 배열을 가리킴
const wrongCopy = original;
wrongCopy.push(4);
console.log(original); // [1, 2, 3, 4] ← 원본도 바뀜!

// ✅ 올바른 복사 - 새로운 배열 생성
const rightCopy = [...original]; // 스프레드로 복사
rightCopy.push(5);
console.log(original);  // [1, 2, 3, 4] ← 원본 유지
console.log(rightCopy); // [1, 2, 3, 4, 5]
```

---

## 자주 하는 실수

```javascript
// ❌ 실수 1: 인덱스가 0부터 시작하는 것을 잊음
const arr = ["a", "b", "c"];
console.log(arr[1]); // "b" (두 번째 요소는 인덱스 1)
console.log(arr[3]); // undefined (범위 초과)

// ❌ 실수 2: map/filter가 원본을 바꾸지 않음을 모름
const nums = [1, 2, 3];
nums.map(n => n * 2); // 이 결과를 변수에 저장해야 함!
console.log(nums);    // [1, 2, 3] ← 원본 그대로

const doubled = nums.map(n => n * 2); // 반환값을 저장해야 함
console.log(doubled); // [2, 4, 6]

// ❌ 실수 3: forEach는 새 배열을 반환하지 않음
const result = nums.forEach(n => n * 2); // forEach는 undefined 반환
console.log(result); // undefined
```

---

## 구조 분해 할당 (Destructuring)

객체와 배열에서 값을 쉽게 꺼내는 방법:

```javascript
// 객체 구조 분해
const user = { name: "김철수", age: 25, city: "서울" };

// 예전 방식
const name1 = user.name;
const age1 = user.age;

// 구조 분해 방식 (훨씬 간결!)
const { name, age, city } = user;
console.log(name); // "김철수"
console.log(age);  // 25

// 다른 변수명으로 받기
const { name: userName, age: userAge } = user;
console.log(userName); // "김철수"

// 기본값 설정
const { job = "미정" } = user;
console.log(job); // "미정" (user에 job이 없으니 기본값 사용)

// 배열 구조 분해
const colors = ["빨강", "초록", "파랑"];
const [first, second, third] = colors;
console.log(first);  // "빨강"
console.log(second); // "초록"

// 일부만 가져오기
const [, , blue] = colors; // 첫 두 개 건너뜀
console.log(blue); // "파랑"
```

---

## 정리

| 개념 | 설명 | 예시 |
|------|------|------|
| 객체 | 관련 데이터를 키-값으로 묶음 | `{ name: "철수", age: 25 }` |
| 배열 | 순서 있는 데이터 목록 | `["사과", "바나나"]` |
| map | 각 요소 변환 → 새 배열 | `arr.map(x => x * 2)` |
| filter | 조건에 맞는 요소 선별 | `arr.filter(x => x > 5)` |
| reduce | 하나의 값으로 합산 | `arr.reduce((a, b) => a + b, 0)` |
| 구조 분해 | 값을 변수로 꺼내기 | `const { name } = user` |

객체와 배열은 자바스크립트에서 가장 많이 사용하는 자료구조입니다.
특히 `map`, `filter`, `reduce`는 React에서 매우 자주 쓰이니 꼭 익혀두세요!
