---
title: "ES6+ 핵심 문법"
order: 12
---

## ES6란?

**ES6(ECMAScript 2015)**는 자바스크립트에 많은 현대적 문법을 추가한 버전입니다.
그 이후에도 매년 새로운 기능이 추가되어 ES7, ES8, ES9... 계속 발전하고 있어요.

이 챕터에서는 **현업에서 매일 사용하는 핵심 문법들**을 정리합니다.

---

## 1. 구조 분해 할당 (Destructuring)

객체와 배열에서 값을 꺼내 변수에 할당하는 간결한 방법:

```javascript
// 객체 구조 분해
const user = { name: "김철수", age: 25, city: "서울" };

// 기존 방식
const name = user.name;
const age = user.age;

// 구조 분해 방식
const { name, age, city } = user;
console.log(name, age, city); // "김철수" 25 "서울"

// 다른 변수명으로 받기
const { name: userName, age: userAge } = user;

// 기본값 설정
const { name, job = "미정" } = user; // user.job이 없으면 "미정"

// 함수 매개변수에 구조 분해
function displayUser({ name, age, city = "위치 미상" }) {
  console.log(`${name} (${age}세, ${city})`);
}
displayUser(user); // "김철수 (25세, 서울)"

// 배열 구조 분해
const colors = ["빨강", "초록", "파랑"];
const [first, second, third] = colors;

// 일부 건너뛰기
const [, , blue] = colors;       // 세 번째만
const [red, ...rest] = colors;   // 나머지는 rest 배열로

// 중첩 구조 분해
const company = {
  name: "테크 회사",
  address: {
    city: "서울",
    district: "강남구",
  },
};
const { address: { city: companyCity } } = company;
console.log(companyCity); // "서울"
```

---

## 2. 스프레드 연산자 (Spread Operator `...`)

배열/객체를 **펼쳐서** 사용하는 연산자:

```javascript
// 배열 펼치기
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];

const combined = [...arr1, ...arr2];   // [1, 2, 3, 4, 5, 6] 합치기
const withNew = [...arr1, 0, ...arr2]; // [1, 2, 3, 0, 4, 5, 6] 중간에 삽입

// 배열 복사 (진짜 복사!)
const original = [1, 2, 3];
const copy = [...original];
copy.push(4);
console.log(original); // [1, 2, 3] 원본 유지

// 객체 펼치기
const base = { color: "blue", size: "M" };
const updated = { ...base, color: "red" }; // color를 빨강으로 덮어씀
console.log(updated); // { color: "red", size: "M" }

// 객체 복사 + 병합
const user = { name: "철수", age: 25 };
const userWithJob = { ...user, job: "개발자" }; // 속성 추가
const withUpdatedAge = { ...user, age: 26 };     // 특정 속성 업데이트

// 함수 인자에 배열 펼치기
function sum(a, b, c) {
  return a + b + c;
}
const nums = [1, 2, 3];
console.log(sum(...nums)); // 6 (sum(1, 2, 3)과 동일)

// Math 함수에 활용
const numbers = [5, 3, 8, 1, 9, 2];
console.log(Math.max(...numbers)); // 9
console.log(Math.min(...numbers)); // 1
```

---

## 3. 나머지 매개변수 (Rest Parameters `...`)

함수에서 **여러 인자를 배열로 받는** 방법:

```javascript
// 인자 개수가 정해지지 않은 함수
function sum(...numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}
console.log(sum(1, 2, 3));       // 6
console.log(sum(1, 2, 3, 4, 5)); // 15

// 앞 인자는 고정, 나머지는 rest로
function greet(greeting, ...names) {
  names.forEach(name => console.log(`${greeting}, ${name}!`));
}
greet("안녕하세요", "철수", "영희", "민준");
// "안녕하세요, 철수!"
// "안녕하세요, 영희!"
// "안녕하세요, 민준!"
```

---

## 4. 옵셔널 체이닝 (Optional Chaining `?.`)

**null 또는 undefined인지 확인하면서 안전하게 접근**하는 방법:

```javascript
const user = {
  name: "김철수",
  address: {
    city: "서울",
  },
  // phone 속성이 없음
};

// ❌ 예전 방식 (불편하고 길다)
const city = user && user.address && user.address.city;
const phone = user && user.phone && user.phone.mobile;

// ✅ 옵셔널 체이닝 (간결!)
const city = user?.address?.city;        // "서울"
const phone = user?.phone?.mobile;       // undefined (에러 없음!)
const zipCode = user?.address?.zipCode;  // undefined (에러 없음!)

// 배열에도 사용
const firstFriend = user?.friends?.[0]; // 없으면 undefined

// 메서드 호출에도 사용
user?.sendMessage?.("안녕");  // sendMessage가 없으면 그냥 건너뜀

// 기본값과 함께 사용 (Nullish Coalescing과 조합)
const displayCity = user?.address?.city ?? "위치 미상";
console.log(displayCity); // "서울"

const displayPhone = user?.phone?.mobile ?? "전화번호 없음";
console.log(displayPhone); // "전화번호 없음"
```

---

## 5. Nullish Coalescing (`??`)

`null` 또는 `undefined`일 때만 기본값을 사용:

```javascript
// ?? vs || 차이가 중요!

// || (OR): falsy 값(null, undefined, 0, "", false)이면 기본값 사용
const count1 = 0 || 10;      // 10 (0은 falsy!)
const name1 = "" || "이름 없음"; // "이름 없음" ("" 는 falsy!)

// ?? (Nullish): null, undefined일 때만 기본값 사용
const count2 = 0 ?? 10;      // 0 (0은 null/undefined가 아님!)
const name2 = "" ?? "이름 없음"; // "" (빈 문자열은 null/undefined가 아님!)
const missing = null ?? "기본값"; // "기본값"

// 실용 예시: 서버에서 온 데이터 처리
const serverData = {
  score: 0,       // 0점도 유효한 점수
  nickname: "",   // 빈 닉네임도 유효
  age: null,      // 미입력
};

// ❌ || 쓰면 0과 ""를 잘못 처리
const score1 = serverData.score || "미입력"; // "미입력" (0을 잘못 처리!)
const nickname1 = serverData.nickname || "익명"; // "익명" (빈 문자열을 잘못 처리!)

// ✅ ?? 쓰면 올바르게 처리
const score2 = serverData.score ?? "미입력";    // 0 (올바름!)
const nickname2 = serverData.nickname ?? "익명"; // "" (올바름!)
const age = serverData.age ?? "나이 미입력";     // "나이 미입력" (null이니까 기본값)
```

---

## 6. 논리 할당 연산자

```javascript
// &&= : 왼쪽이 truthy일 때만 오른쪽 값으로 할당
let a = 1;
a &&= 2; // a가 truthy(1)니까 2로 변경
console.log(a); // 2

let b = null;
b &&= 2; // b가 falsy(null)니까 변경 없음
console.log(b); // null

// ||= : 왼쪽이 falsy일 때만 오른쪽 값으로 할당
let c = null;
c ||= "기본값"; // c가 null이니까 "기본값"으로 변경
console.log(c); // "기본값"

let d = "기존값";
d ||= "기본값"; // d가 truthy니까 변경 없음
console.log(d); // "기존값"

// ??= : 왼쪽이 null/undefined일 때만 오른쪽 값으로 할당
let e = null;
e ??= "기본값"; // null이니까 "기본값"으로 변경
console.log(e); // "기본값"
```

---

## 7. 템플릿 리터럴 (Template Literal)

```javascript
const name = "김철수";
const age = 25;

// 기존 문자열 연결 (불편)
const msg1 = "안녕하세요, " + name + "님! 나이는 " + age + "세입니다.";

// 템플릿 리터럴 (백틱 사용, 훨씬 편리!)
const msg2 = `안녕하세요, ${name}님! 나이는 ${age}세입니다.`;

// 표현식도 사용 가능
const price = 1000;
const qty = 3;
const total = `총 금액: ${price * qty}원 (${qty}개)`;

// 여러 줄 문자열
const html = `
  <div class="user-card">
    <h2>${name}</h2>
    <p>나이: ${age}세</p>
  </div>
`;

// 중첩 템플릿
const items = ["사과", "바나나", "딸기"];
const list = `
  <ul>
    ${items.map(item => `<li>${item}</li>`).join("")}
  </ul>
`;
```

---

## 8. 단축 속성명과 계산된 속성명

```javascript
const name = "김철수";
const age = 25;
const job = "개발자";

// 단축 속성명: 변수명과 키 이름이 같을 때
const user1 = { name: name, age: age, job: job }; // 기존 방식
const user2 = { name, age, job };                  // 단축 방식 (동일!)

// 계산된 속성명: 동적으로 키 이름 설정
const key = "score";
const obj = {
  [key]: 100,              // { score: 100 }
  [`${key}_max`]: 100,    // { score_max: 100 }
};

// 동적 키로 객체 업데이트 (React 상태 관리에서 자주 사용)
function updateField(fieldName, value) {
  return { [fieldName]: value }; // 동적으로 키 이름 결정
}

console.log(updateField("email", "kim@example.com")); // { email: "kim@example.com" }
console.log(updateField("phone", "010-1234-5678"));   // { phone: "010-1234-5678" }
```

---

## 9. for...of 반복문

```javascript
// 배열 순회 (인덱스가 필요 없을 때)
const fruits = ["사과", "바나나", "딸기"];

for (const fruit of fruits) {
  console.log(fruit); // "사과", "바나나", "딸기"
}

// 인덱스도 필요하면 entries() 사용
for (const [index, fruit] of fruits.entries()) {
  console.log(`${index}: ${fruit}`); // "0: 사과", "1: 바나나", "2: 딸기"
}

// 문자열 순회
for (const char of "안녕") {
  console.log(char); // "안", "녕"
}

// Map, Set 순회도 가능
const map = new Map([["a", 1], ["b", 2]]);
for (const [key, value] of map) {
  console.log(`${key}: ${value}`);
}
```

---

## 10. Symbol, Map, Set

```javascript
// Symbol: 유일한 값 (충돌 방지)
const id1 = Symbol("id");
const id2 = Symbol("id");
console.log(id1 === id2); // false (같은 설명이라도 다른 값!)

const obj = {
  [Symbol("secret")]: "비밀 값",  // 숨겨진 키
  name: "공개 값",
};

// Map: 어떤 값이든 키로 사용 가능
const map = new Map();
map.set("name", "김철수");   // 문자열 키
map.set(1, "숫자 키");       // 숫자 키
map.set({}, "객체 키");      // 객체 키!

console.log(map.get("name")); // "김철수"
console.log(map.size);        // 3 (Map의 크기)
console.log(map.has("name")); // true

// Map 순회
for (const [key, value] of map) {
  console.log(key, "→", value);
}

// Set: 중복 없는 값의 집합
const set = new Set([1, 2, 3, 2, 1]); // 중복 자동 제거
console.log(set);         // Set {1, 2, 3}
console.log(set.size);    // 3

set.add(4);               // 추가
set.delete(2);            // 삭제
console.log(set.has(1));  // true

// Set으로 배열 중복 제거
const arr = [1, 2, 3, 2, 1, 4];
const unique = [...new Set(arr)];
console.log(unique); // [1, 2, 3, 4]
```

---

## 11. 배열 메서드 (ES2019+)

```javascript
// flat() - 중첩 배열 펼치기
const nested = [1, [2, 3], [4, [5, 6]]];
console.log(nested.flat());   // [1, 2, 3, 4, [5, 6]] (1단계)
console.log(nested.flat(2));  // [1, 2, 3, 4, 5, 6] (2단계)
console.log(nested.flat(Infinity)); // 완전히 펼치기

// flatMap() - map 후 flat(1)
const sentences = ["Hello World", "안녕 세상"];
const words = sentences.flatMap(s => s.split(" "));
console.log(words); // ["Hello", "World", "안녕", "세상"]

// Object.fromEntries() - [키, 값] 배열 → 객체 변환
const entries = [["name", "철수"], ["age", 25]];
const obj = Object.fromEntries(entries);
console.log(obj); // { name: "철수", age: 25 }

// Map → 객체 변환에도 사용
const map = new Map([["a", 1], ["b", 2]]);
const fromMap = Object.fromEntries(map);
console.log(fromMap); // { a: 1, b: 2 }

// at() - 인덱스로 접근 (음수 가능)
const arr = [1, 2, 3, 4, 5];
console.log(arr.at(0));  // 1 (첫 번째)
console.log(arr.at(-1)); // 5 (마지막)
console.log(arr.at(-2)); // 4 (뒤에서 두 번째)
```

---

## 12. 로직 단순화 패턴

```javascript
// 조건부 실행 - && 활용
const isLoggedIn = true;
isLoggedIn && console.log("로그인 상태"); // isLoggedIn이 true일 때만 실행

// 삼항 연산자
const score = 85;
const grade = score >= 90 ? "A" : score >= 80 ? "B" : "C";

// 객체로 switch 대체
const statusMessages = {
  200: "성공",
  404: "찾을 수 없음",
  500: "서버 오류",
};
const status = 404;
const message = statusMessages[status] ?? "알 수 없는 상태";
console.log(message); // "찾을 수 없음"

// 배열로 포함 여부 체크
const allowedRoles = ["admin", "editor", "moderator"];
const userRole = "admin";

// ❌ 긴 if문
if (userRole === "admin" || userRole === "editor" || userRole === "moderator") {}

// ✅ includes 활용
if (allowedRoles.includes(userRole)) {
  console.log("접근 허용");
}
```

---

## 정리

| 문법 | 설명 | 예시 |
|------|------|------|
| 구조 분해 | 객체/배열에서 값 꺼내기 | `const { name } = user` |
| 스프레드 `...` | 배열/객체 펼치기/합치기 | `[...arr1, ...arr2]` |
| 나머지 `...` | 여러 인자를 배열로 | `function fn(...args)` |
| 옵셔널 체이닝 `?.` | 안전한 속성 접근 | `user?.address?.city` |
| Nullish `??` | null/undefined 기본값 | `value ?? "기본"` |
| 템플릿 리터럴 | 문자열 보간 | `` `${name}님` `` |
| 단축 속성명 | 키=값이 같을 때 생략 | `{ name, age }` |
| 계산된 속성명 | 동적 키 | `{ [key]: value }` |
| `flat/flatMap` | 중첩 배열 처리 | `arr.flat()` |
| `at()` | 음수 인덱스 접근 | `arr.at(-1)` |

이 문법들은 현대 자바스크립트 개발에서 매일 사용됩니다.
특히 React 개발에서 구조 분해, 스프레드, 옵셔널 체이닝은 거의 필수입니다!
