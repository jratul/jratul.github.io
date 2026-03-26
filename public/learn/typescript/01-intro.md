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

## 설치 및 시작하기

```bash
# TypeScript 전역 설치
npm install -g typescript

# 버전 확인
tsc --version

# 현재 폴더에 TypeScript 프로젝트 초기화
tsc --init
```

`tsc --init`을 실행하면 `tsconfig.json` 파일이 생성됩니다.
이 파일이 TypeScript 컴파일러의 설정 파일입니다.

```json
// tsconfig.json (주요 옵션 설명)
{
  "compilerOptions": {
    "target": "ES2020",       // 어떤 버전의 JS로 컴파일할지
    "module": "commonjs",     // 모듈 시스템 (Node.js: commonjs, 브라우저: esnext)
    "strict": true,           // 엄격한 타입 검사 활성화 (권장!)
    "outDir": "./dist",       // 컴파일된 JS 파일 출력 폴더
    "rootDir": "./src"        // TypeScript 소스 파일 위치
  }
}
```

> **strict 모드를 켜세요**: `"strict": true`를 설정하면 가장 강력한 타입 검사가 활성화됩니다.
> 처음에는 오류가 많아 보일 수 있지만, 이것이 TypeScript를 제대로 쓰는 방법입니다.

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
- 에디터 자동완성과 코드 탐색 기능이 강력해집니다
- 컴파일하면 JavaScript가 되므로, 어디서든 실행됩니다
- JavaScript를 이미 안다면 TypeScript는 그 연장선입니다

다음 챕터에서는 TypeScript의 기본 타입들을 알아보겠습니다.
