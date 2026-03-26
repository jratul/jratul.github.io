---
title: "TypeScript란? 왜 쓰는가"
order: 1
---

# TypeScript란? 왜 쓰는가

TypeScript는 Microsoft가 만든 **JavaScript의 슈퍼셋(Superset)** 언어입니다.
슈퍼셋이란 "기존 언어를 완전히 포함하면서 기능을 추가한 언어"라는 뜻입니다.
즉, 모든 JavaScript 코드는 그대로 TypeScript 코드이기도 합니다.

---

## JavaScript의 고질적인 문제

JavaScript는 처음부터 "작고 간단한 스크립트 언어"로 설계되었습니다.
하지만 지금은 수십만 줄짜리 대규모 웹 앱을 만드는 데 쓰이고 있습니다.
이 과정에서 JavaScript의 **동적 타입** 특성이 수많은 버그를 만들어냈습니다.

```javascript
// JS: 이 코드는 아무 오류 없이 실행됩니다
function greet(user) {
  return "안녕하세요, " + user.name + "님!";
}

greet({ name: "김철수" });  // "안녕하세요, 김철수님!" — 정상
greet(undefined);           // "안녕하세요, undefined님!" — 버그지만 실행됨
greet(42);                  // "안녕하세요, undefined님!" — 이상하지만 오류 없음
```

이런 버그는 개발 중이 아니라 **실제 사용자가 쓸 때** 터집니다.
TypeScript는 이 문제를 **코드를 작성하는 시점**에 잡아줍니다.

---

## TypeScript가 하는 일: 타입 검사

TypeScript는 변수, 함수 파라미터, 반환값 등에 **타입**을 명시할 수 있게 해줍니다.
타입을 마치 **상자에 붙이는 라벨**처럼 생각해보세요.

```
[string 라벨] → 이 상자에는 문자열만 들어갈 수 있습니다
[number 라벨] → 이 상자에는 숫자만 들어갈 수 있습니다
[User 라벨]   → 이 상자에는 User 형태의 객체만 들어갈 수 있습니다
```

```typescript
// TS: 타입을 명시하면 잘못된 사용을 즉시 알려줍니다
interface User {
  name: string; // name은 반드시 문자열이어야 합니다
}

function greet(user: User): string {
  return "안녕하세요, " + user.name + "님!";
}

greet({ name: "김철수" }); // 정상
greet(undefined);          // 오류! undefined는 User가 아닙니다 (코드 작성 시점에 오류 표시)
greet(42);                 // 오류! 42는 User가 아닙니다
```

---

## JavaScript 오류 vs TypeScript 오류 — 핵심 차이

TypeScript를 써야 하는 가장 근본적인 이유는 **언제 오류를 발견하느냐**에 있습니다.

```
JavaScript: 런타임에서 터짐 (사용자가 봄)
TypeScript: 컴파일 타임에 잡힘 (개발자가 봄)
```

이 차이를 시각적으로 이해해봅시다.

```
[ JavaScript 오류 발생 흐름 ]

  개발자가 코드 작성
        ↓
  에디터에서 아무 경고 없음
        ↓
  코드 배포 (사용자에게 공개)
        ↓
  사용자가 특정 기능 사용
        ↓
  💥 런타임 오류 발생 (TypeError: Cannot read properties of undefined)
        ↓
  사용자 화면에서 에러 메시지 또는 앱이 멈춤
        ↓
  사용자가 불편함 신고 또는 그냥 이탈
```

```
[ TypeScript 오류 발생 흐름 ]

  개발자가 코드 작성
        ↓
  에디터에서 즉시 빨간 밑줄로 표시
        ↓
  개발자가 코드 작성 시점에 바로 수정
        ↓
  오류 없이 배포
        ↓
  사용자는 정상적인 앱을 사용
```

실제 사례를 코드로 보겠습니다.

```javascript
// JavaScript — 오류가 런타임에 발생

function getUserDisplayName(user) {
  return user.profile.displayName;  // user.profile이 없으면?
}

// 개발 중에는 아무 문제 없음
// 배포 후, 특정 사용자의 profile이 null인 경우:
// TypeError: Cannot read properties of null (reading 'displayName')
// → 사용자 화면이 멈춥니다
```

```typescript
// TypeScript — 오류가 코드 작성 시점에 발견

interface Profile {
  displayName: string;
}

interface User {
  profile: Profile | null;  // profile이 null일 수 있다고 명시
}

function getUserDisplayName(user: User): string {
  return user.profile.displayName;
  // 오류! user.profile이 null일 수 있습니다
  // Object is possibly 'null'. (에디터에서 즉시 표시)
}

// 올바른 처리:
function getUserDisplayNameSafe(user: User): string {
  return user.profile?.displayName ?? "이름 없음";
  // user.profile이 null이면 "이름 없음"을 반환
}
```

---

## TypeScript를 써야 하는 이유

### 1. 버그를 코드 작성 시점에 잡는다

가장 큰 이유입니다. 런타임 오류가 되기 전에, 에디터에서 빨간 줄로 알려줍니다.

```typescript
// 함수의 반환 타입을 선언하면, 실수로 잘못된 타입을 반환할 때 즉시 오류
function add(a: number, b: number): number {
  return a + b;    // 정상
}

function divide(a: number, b: number): number {
  return String(a / b);  // 오류! string을 number로 반환할 수 없습니다
}
```

### 2. 에디터 자동완성이 훨씬 강력해진다

타입 정보 덕분에 VS Code 같은 에디터가 정확한 자동완성을 제공합니다.

```typescript
interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

const product: Product = { id: 1, name: "노트북", price: 1500000, category: "전자기기" };

// product. 을 입력하는 순간 id, name, price, category가 자동완성으로 뜹니다
console.log(product.name); // 자동완성으로 입력 가능!
```

### 3. 코드가 문서가 된다

타입 선언 자체가 코드의 설명서 역할을 합니다.
협업할 때 "이 함수에 뭘 넘겨야 해요?"라고 물어볼 필요가 없어집니다.

```javascript
// JS: 파라미터가 뭔지 알려면 함수 내부를 읽어야 합니다
function createOrder(userId, items, options) {
  // ...코드를 열어봐야 알 수 있음
}
```

```typescript
// TS: 파라미터 타입만 봐도 무엇을 넘겨야 하는지 바로 알 수 있습니다
interface OrderItem {
  productId: number;
  quantity: number;
}

interface OrderOptions {
  couponCode?: string;   // ? = 선택적 (없어도 됨)
  deliveryDate?: string;
}

function createOrder(userId: number, items: OrderItem[], options: OrderOptions): void {
  // 외부에서 봐도 무엇이 필요한지 명확합니다
}
```

### 4. 리팩토링이 안전해진다

함수 이름을 바꾸거나, 파라미터를 추가하면 TypeScript가 영향받는 모든 곳을 알려줍니다.

```typescript
// 예: UserProfile 인터페이스의 필드 이름을 바꾸면
interface UserProfile {
  // userName → displayName 으로 변경
  displayName: string;
  email: string;
}

// userName을 참조하는 모든 곳에서 즉시 오류가 표시됩니다
// JavaScript였다면 일일이 찾아다녀야 했을 것입니다
```

---

## TypeScript를 안 쓰면 생기는 실제 버그 사례

TypeScript 없이 JavaScript만 쓸 때 실제로 자주 발생하는 버그 유형들입니다.

### 사례 1: API 응답 필드 이름이 바뀐 경우

```javascript
// JavaScript로 작성된 코드

// 백엔드가 처음에 이런 구조로 응답했습니다
// { user: { userName: "김철수", age: 25 } }

function displayUser(response) {
  document.getElementById("name").textContent = response.user.userName;
  //                                                          ^^^^^^^^
  //                                              이 필드를 믿고 쓰고 있음
}

// 3개월 후, 백엔드 개발자가 필드 이름을 바꿨습니다
// { user: { name: "김철수", age: 25 } }  ← userName → name으로 변경

// 결과: 화면에 이름이 사라짐. undefined가 표시됨
// 프론트엔드 개발자는 오랜 시간이 지나야 이 사실을 알게 됨
```

```typescript
// TypeScript로 작성했다면

interface UserResponse {
  user: {
    name: string;  // name으로 정의
    age: number;
  };
}

function displayUser(response: UserResponse) {
  document.getElementById("name")!.textContent = response.user.name;
}

// 백엔드가 필드 이름을 바꾸면 → 타입 정의도 바꿔야 함
// → 타입 정의를 바꾸면 → 이 타입을 쓰는 모든 곳에서 오류 표시
// → 개발자가 즉시 알고 수정 가능
```

### 사례 2: 함수 파라미터 순서 실수

```javascript
// JavaScript

function createUser(name, age, email) {
  return { name, age, email };
}

// 6개월 후, 다른 파일에서 이 함수를 호출할 때
createUser("user@example.com", 25, "김철수");
// 파라미터 순서를 잘못 넣었지만 오류 없이 실행됨
// → { name: "user@example.com", age: 25, email: "김철수" } 라는 이상한 객체가 생성
// → 데이터베이스에 잘못된 데이터가 저장될 수 있음
```

```typescript
// TypeScript

function createUser(name: string, age: number, email: string) {
  return { name, age, email };
}

createUser("user@example.com", 25, "김철수");
// 오류! "김철수"는 string이지만 email 자리가 맞는지 확인은 못 하지만,
// 아래처럼 객체로 넘기면 완전히 안전합니다

function createUserSafe(params: { name: string; age: number; email: string }) {
  return params;
}

createUserSafe({ name: "김철수", age: 25, email: "user@example.com" });
// 필드 이름으로 전달하므로 순서 실수가 없습니다
```

### 사례 3: null 체크 누락

```javascript
// JavaScript

function getFirstItemName(cart) {
  return cart.items[0].name;  // cart.items가 비어있으면?
}

getFirstItemName({ items: [] });
// TypeError: Cannot read properties of undefined (reading 'name')
// 장바구니가 비어있는 경우 앱이 터집니다
```

```typescript
// TypeScript

interface CartItem {
  name: string;
  price: number;
}

interface Cart {
  items: CartItem[];
}

function getFirstItemName(cart: Cart): string | undefined {
  return cart.items[0]?.name;  // 옵셔널 체이닝으로 안전하게 접근
  // items[0]가 없으면 undefined를 반환
}

// 반환값이 string | undefined 이므로,
// 이 함수를 쓰는 곳에서도 undefined 처리를 강제합니다
const name = getFirstItemName({ items: [] });
if (name) {
  console.log(name);  // undefined인 경우를 처리하도록 유도됨
}
```

---

## TypeScript의 동작 방식

TypeScript는 브라우저나 Node.js에서 직접 실행되지 않습니다.
**컴파일(Compile)** 과정을 거쳐 JavaScript로 변환된 후 실행됩니다.

```
TypeScript 코드 (.ts) → tsc 컴파일러 → JavaScript 코드 (.js) → 브라우저/Node.js 실행
```

이 말은 TypeScript의 타입 정보는 **개발 시에만 존재**하고, 실제 실행되는 코드에는 없다는 뜻입니다.
타입은 일종의 "안전망"이지, 런타임에 추가되는 기능이 아닙니다.

```typescript
// 작성한 TypeScript 코드
const message: string = "안녕하세요";
const count: number = 42;

// 컴파일 후 생성되는 JavaScript 코드 (타입 정보가 사라집니다)
const message = "안녕하세요";
const count = 42;
```

---

## TypeScript 개발 환경 설정

### 1단계: TypeScript 설치

```bash
# TypeScript 전역 설치
npm install -g typescript

# 버전 확인
tsc --version
# 출력 예: Version 5.3.3
```

전역 설치(`-g`)를 하면 어느 폴더에서든 `tsc` 명령어를 사용할 수 있습니다.

### 2단계: 프로젝트 초기화

```bash
# 새 폴더를 만들고 이동
mkdir my-ts-project
cd my-ts-project

# package.json 생성
npm init -y

# TypeScript 설정 파일 생성
tsc --init
```

`tsc --init`을 실행하면 `tsconfig.json` 파일이 생성됩니다.

### 3단계: tsconfig.json 이해하기

`tsconfig.json`은 TypeScript 컴파일러의 설정 파일입니다.
처음에는 내용이 많아 보이지만, 핵심 옵션 몇 가지만 알면 됩니다.

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**핵심 옵션 설명:**

| 옵션 | 설명 | 권장값 |
|------|------|--------|
| `target` | 컴파일 결과 JS 버전 | `"ES2020"` (대부분의 환경 지원) |
| `module` | 모듈 시스템 | Node.js: `"commonjs"`, 브라우저: `"esnext"` |
| `strict` | 엄격한 타입 검사 | `true` (반드시 켜기!) |
| `outDir` | 컴파일된 JS 저장 폴더 | `"./dist"` |
| `rootDir` | TS 소스 파일 위치 | `"./src"` |
| `esModuleInterop` | CommonJS 모듈을 import로 불러올 수 있게 | `true` |

**`strict: true`가 활성화하는 것들:**

```
strict: true를 켜면 아래 옵션들이 모두 켜집니다:
- strictNullChecks: null/undefined를 별도 타입으로 취급
- strictFunctionTypes: 함수 타입을 엄격하게 검사
- noImplicitAny: 타입 추론이 안 되면 any 대신 오류를 냄
- strictPropertyInitialization: 클래스 속성이 초기화되었는지 검사
```

처음에는 오류가 많아 보일 수 있지만, 이것이 TypeScript를 제대로 활용하는 방법입니다.

### 4단계: ts-node로 바로 실행하기

`tsc`로 컴파일한 후 `node`로 실행하는 과정이 번거롭다면, `ts-node`를 사용합니다.

```bash
# ts-node 설치 (개발 의존성으로)
npm install -D ts-node

# TypeScript 파일을 컴파일 없이 바로 실행
npx ts-node src/hello.ts

# 또는 tsx (더 빠른 대안)
npm install -D tsx
npx tsx src/hello.ts
```

개발 중에는 `ts-node` 또는 `tsx`로 빠르게 실행하고,
배포할 때는 `tsc`로 컴파일해서 JavaScript로 변환합니다.

### 5단계: Vite 프로젝트에서 TypeScript 바로 쓰기

React 또는 일반 웹 프로젝트에서는 Vite를 사용하면 TypeScript 설정이 훨씬 간단합니다.

```bash
# Vite + TypeScript + React 프로젝트 생성
npm create vite@latest my-app -- --template react-ts

# 또는 Vite + TypeScript (React 없이)
npm create vite@latest my-app -- --template vanilla-ts

cd my-app
npm install
npm run dev
```

Vite는 TypeScript를 내장 지원하므로 추가 설정 없이 `.ts`, `.tsx` 파일을 바로 사용할 수 있습니다.

```
Vite + TypeScript 프로젝트 구조:
my-app/
├── src/
│   ├── main.ts        ← TypeScript 파일
│   └── vite-env.d.ts  ← Vite 타입 정의
├── tsconfig.json      ← TypeScript 설정
├── vite.config.ts     ← Vite 설정 (이것도 TypeScript!)
└── package.json
```

---

## 타입 추론 (Type Inference)

TypeScript의 강력한 기능 중 하나는 **타입을 자동으로 알아내는 것**입니다.
모든 곳에 직접 타입을 쓸 필요는 없습니다.

```typescript
// 타입을 명시하지 않아도 TypeScript가 자동으로 추론합니다
const name = "김철수";   // TypeScript가 string으로 추론
const age = 25;          // TypeScript가 number로 추론
const isActive = true;   // TypeScript가 boolean으로 추론

// 잘못된 타입을 넣으면 추론 후에도 오류를 냅니다
const count = 10;
// count = "열";  // 오류! count는 number로 추론되었는데 string을 넣으려 함
```

### 배열과 객체도 추론합니다

```typescript
// 배열의 타입도 추론됩니다
const numbers = [1, 2, 3];
// TypeScript: numbers의 타입은 number[]

const mixed = [1, "hello", true];
// TypeScript: mixed의 타입은 (number | string | boolean)[]

// 배열 메서드의 결과도 추론됩니다
const doubled = numbers.map(n => n * 2);
// TypeScript: doubled의 타입은 number[]

const names = ["김철수", "이영희"];
const upperNames = names.map(n => n.toUpperCase());
// TypeScript: upperNames의 타입은 string[]
```

### 함수 반환값도 추론합니다

```typescript
// 반환 타입을 명시하지 않아도 TypeScript가 추론합니다
function add(a: number, b: number) {
  return a + b;
  // TypeScript: 반환값은 number라고 추론
}

function greet(name: string) {
  return `안녕하세요, ${name}님!`;
  // TypeScript: 반환값은 string이라고 추론
}

// 조건에 따라 다른 타입을 반환하면?
function findUser(id: number) {
  if (id === 1) {
    return { name: "김철수", age: 25 };
  }
  return null;
  // TypeScript: 반환값은 { name: string; age: number } | null 이라고 추론
}
```

### 언제 직접 타입을 써야 할까?

TypeScript가 추론하지 못하거나, 코드를 더 명확하게 만들고 싶을 때 직접 씁니다.

```typescript
// 1. 함수 파라미터는 추론이 안 됩니다 → 직접 써야 합니다
function greet(name: string) {  // 여기는 직접 써야 함
  return `안녕하세요, ${name}님!`;
}

// 2. 나중에 채울 변수는 초기값에서 추론이 안 됩니다
let userList: string[] = [];  // 빈 배열이면 any[]로 추론되므로 직접 명시
userList.push("김철수");

// 3. 여러 타입이 될 수 있는 경우 명확히 하고 싶을 때
let result: number | null = null;  // 나중에 숫자가 들어올 예정
result = 42;

// 4. 의도를 명확히 표현하고 싶을 때
const MAX_COUNT: number = 100;  // 상수도 타입을 쓰면 의도가 명확해짐
```

---

## 첫 TypeScript 파일 작성

```typescript
// src/hello.ts

// 타입을 명시한 변수
const name: string = "TypeScript";
const version: number = 5.0;
const isAwesome: boolean = true;

// 타입을 명시한 함수
function introduce(language: string, ver: number): string {
  return `${language} ${ver}에 오신 것을 환영합니다!`;
}

console.log(introduce(name, version));
// 출력: TypeScript 5에 오신 것을 환영합니다!
```

```bash
# 컴파일
tsc src/hello.ts

# 실행 (컴파일된 JS 파일)
node src/hello.js

# 혹은 ts-node로 바로 실행 (개발 시 편리)
npx ts-node src/hello.ts
```

---

## JavaScript와 TypeScript, 뭐가 다른가

| 항목 | JavaScript | TypeScript |
|------|-----------|------------|
| 타입 지정 | 없음 (동적 타입) | 있음 (정적 타입) |
| 오류 발견 | 실행 시 (런타임) | 작성 시 (컴파일타임) |
| 자동완성 | 제한적 | 강력함 |
| 파일 확장자 | `.js` | `.ts`, `.tsx` |
| 브라우저 실행 | 직접 실행 | 컴파일 후 실행 |
| 학습 곡선 | 낮음 | 조금 높음 |
| 리팩토링 안전성 | 낮음 | 높음 |
| 팀 협업 | 암묵적 약속 필요 | 타입이 명시적 계약 역할 |

---

## 자주 하는 실수

TypeScript를 처음 배울 때 흔히 저지르는 실수들을 미리 알아둡시다.

### 실수 1: any를 남용하는 것

`any`는 TypeScript의 타입 검사를 완전히 끄는 타입입니다.
오류를 없애려고 `any`를 쓰면 TypeScript를 쓰는 의미가 사라집니다.

```typescript
// 나쁜 예: any로 오류를 피함
function processData(data: any) {
  return data.name.toUpperCase();  // data가 any이므로 타입 검사 없음
  // data에 name이 없어도, name이 문자열이 아니어도 오류가 안 남
}

processData(null);        // 런타임 오류! (any라서 잡지 못함)
processData({ age: 25 }); // 런타임 오류! (name이 없지만 잡지 못함)

// 좋은 예: 타입을 명확히 정의
interface UserData {
  name: string;
  age: number;
}

function processData(data: UserData) {
  return data.name.toUpperCase();  // 안전하게 사용 가능
}

// any가 불가피한 경우: unknown을 쓰고 타입 가드를 사용
function processUnknown(data: unknown) {
  if (typeof data === "object" && data !== null && "name" in data) {
    // 여기서만 data.name 접근 가능
    console.log((data as { name: string }).name);
  }
}
```

**규칙**: `any`를 쓰고 싶을 때는 `unknown`을 먼저 고려하세요.

### 실수 2: 타입 단언(as)을 남용하는 것

`as`는 "나는 이게 이 타입이라고 확신해"라고 TypeScript에게 말하는 것입니다.
잘못 쓰면 TypeScript를 속이는 것과 같습니다.

```typescript
// 나쁜 예: as로 오류를 억지로 없앰
const element = document.getElementById("my-input") as HTMLInputElement;
element.value = "hello";
// getElementById는 null을 반환할 수 있지만, as로 강제로 HTMLInputElement 취급
// element가 실제로 null이면 런타임 오류!

// 좋은 예: null 체크 후 사용
const element = document.getElementById("my-input");
if (element instanceof HTMLInputElement) {
  element.value = "hello";  // 타입이 좁혀져서 안전
}

// 또는 옵셔널 체이닝 사용
const value = (document.getElementById("my-input") as HTMLInputElement | null)?.value;
```

**규칙**: `as`는 TypeScript보다 내가 더 많이 알고 있는 경우에만 사용하세요.
오류를 없애기 위해 `as`를 쓰는 것은 잘못입니다.

### 실수 3: 불필요한 타입 명시 (추론이 이미 되는 경우)

TypeScript가 이미 추론할 수 있는데 굳이 타입을 써서 코드를 장황하게 만드는 경우입니다.

```typescript
// 불필요한 타입 명시 (중복)
const name: string = "김철수";         // string이 뻔히 보임
const age: number = 25;               // number가 뻔히 보임
const isActive: boolean = true;       // boolean이 뻔히 보임

const numbers: number[] = [1, 2, 3];  // 값에서 이미 추론됨

// 좋은 예: 추론에 맡기기
const name = "김철수";
const age = 25;
const isActive = true;
const numbers = [1, 2, 3];

// 타입을 명시해야 하는 경우 (추론이 안 되거나 명확히 해야 할 때)
let userInput: string;  // 나중에 값을 넣을 예정
function greet(name: string): string { ... }  // 파라미터는 명시 필요

// 특히 이런 경우는 명시가 도움됩니다
const config: {
  apiUrl: string;
  timeout: number;
  retries: number;
} = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3,
};
// 나중에 필드를 추가했을 때 config 타입도 맞게 업데이트하도록 강제됨
```

---

## 흔한 오해: "TypeScript는 어렵다"

TypeScript를 처음 접하면 "타입을 왜 이렇게 많이 써야 하지?"라는 생각이 들 수 있습니다.
하지만 실제로는 TypeScript가 많은 부분에서 타입을 **자동으로 추론**해줍니다.

```typescript
// 모든 곳에 타입을 직접 쓸 필요가 없습니다
const name = "김철수";  // TypeScript가 자동으로 string으로 추론합니다
const age = 25;         // TypeScript가 자동으로 number로 추론합니다

// 이것도 유효한 TypeScript 코드입니다 (타입 추론 덕분에)
const numbers = [1, 2, 3];       // number[] 로 추론
const doubled = numbers.map(n => n * 2);  // number[] 로 추론
```

타입을 명시해야 할 때는 **TypeScript가 추론하지 못할 때**나, **코드를 더 명확하게 만들고 싶을 때**입니다.

---

## 정리

- TypeScript = JavaScript + 타입 시스템
- 버그를 런타임이 아닌 코드 작성 시점에 잡아줍니다
- JS 오류는 사용자가 보고, TS 오류는 개발자가 봅니다 — 이게 핵심 차이입니다
- 에디터 자동완성과 코드 탐색 기능이 강력해집니다
- 컴파일하면 JavaScript가 되므로, 어디서든 실행됩니다
- JavaScript를 이미 안다면 TypeScript는 그 연장선입니다
- `any` 남용, `as` 남용, 불필요한 타입 명시는 피하세요
- `strict: true`를 켜고 시작하세요

다음 챕터에서는 TypeScript의 기본 타입들을 알아보겠습니다.
