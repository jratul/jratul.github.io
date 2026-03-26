---
title: "모듈 시스템 (import/export)"
order: 13
---

## 모듈이란?

**모듈**은 코드를 파일 단위로 분리하고 재사용하는 시스템입니다.

모듈이 없던 시절엔 모든 코드가 하나의 파일에 있거나, 전역 변수로 공유했어요:

```html
<!-- 예전 방식: 모든 스크립트가 같은 전역 공간을 공유 -->
<script src="utils.js"></script>
<script src="user.js"></script>
<script src="app.js"></script>
<!-- 변수명이 겹치면 충돌 발생! -->
```

모듈 시스템을 쓰면:
- **파일별로 독립적인 스코프** (변수 충돌 없음)
- **필요한 것만 가져다 쓰기** (코드 재사용)
- **의존 관계가 명확** (어디서 무엇을 쓰는지 한눈에 파악)

---

## export (내보내기)

다른 파일에서 사용할 코드를 **내보냅니다**:

```javascript
// math.js

// 방법 1: 선언과 동시에 export
export const PI = 3.14159;

export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

export class Calculator {
  constructor() {
    this.history = [];
  }

  add(a, b) {
    const result = a + b;
    this.history.push(`${a} + ${b} = ${result}`);
    return result;
  }
}

// 방법 2: 맨 아래에 한 번에 export
const multiply = (a, b) => a * b;
const divide = (a, b) => {
  if (b === 0) throw new Error("0으로 나눌 수 없습니다");
  return a / b;
};

export { multiply, divide }; // 여러 개 한번에 내보내기
```

---

## export default (기본 내보내기)

파일당 **하나만** 기본으로 내보낼 수 있어요:

```javascript
// greeting.js

// default export - 파일의 "주인공"
export default function greet(name) {
  return `안녕하세요, ${name}님!`;
}

// 또는 이름 없이 내보내기도 가능
export default class UserService {
  getUser(id) { /* ... */ }
  createUser(data) { /* ... */ }
}

// 또는 값도 가능
export default {
  apiUrl: "https://api.example.com",
  timeout: 5000,
};
```

---

## import (가져오기)

```javascript
// app.js

// named export 가져오기
import { add, subtract, PI } from "./math.js";
console.log(add(1, 2));    // 3
console.log(PI);           // 3.14159

// 이름을 바꿔서 가져오기 (as)
import { add as sum, subtract as minus } from "./math.js";
console.log(sum(1, 2));   // 3

// 모두 가져오기 (namespace import)
import * as math from "./math.js";
console.log(math.add(1, 2));    // 3
console.log(math.PI);           // 3.14159
console.log(math.multiply(3, 4)); // 12

// default export 가져오기 (이름 자유롭게 지정 가능)
import greet from "./greeting.js";     // 이름 마음대로 가능
import sayHello from "./greeting.js";  // 이름 달라도 OK

// default + named 동시에 가져오기
import greet, { add, PI } from "./combined.js";
```

---

## 모듈 파일 구조 예시

실제 프로젝트에서 어떻게 구조화하는지 예시:

```
src/
├── utils/
│   ├── math.js        ← 수학 관련 유틸리티
│   ├── date.js        ← 날짜 관련 유틸리티
│   └── string.js      ← 문자열 관련 유틸리티
├── services/
│   ├── api.js         ← API 통신
│   └── auth.js        ← 인증 관련
├── components/
│   ├── Button.js      ← 버튼 컴포넌트
│   └── Modal.js       ← 모달 컴포넌트
└── app.js             ← 진입점
```

```javascript
// utils/string.js
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export function removeSpaces(str) {
  return str.replace(/\s+/g, "");
}

// utils/date.js
export function formatDate(date) {
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function isToday(date) {
  const today = new Date();
  const d = new Date(date);
  return (
    today.getFullYear() === d.getFullYear() &&
    today.getMonth() === d.getMonth() &&
    today.getDate() === d.getDate()
  );
}
```

---

## index.js로 모아서 내보내기 (Re-export)

여러 파일의 export를 하나로 모으는 패턴:

```javascript
// utils/index.js - 한 곳에서 모아서 내보내기
export { capitalize, truncate, removeSpaces } from "./string.js";
export { formatDate, isToday } from "./date.js";
export { add, subtract, PI } from "./math.js";

// 사용하는 쪽에서는 간결하게 가져올 수 있음
import { capitalize, formatDate, add } from "./utils/index.js";
// 또는 경로 줄이기 (index.js는 생략 가능)
import { capitalize, formatDate, add } from "./utils";
```

---

## 동적 import (Dynamic Import)

필요할 때만 모듈을 불러오는 방법 (코드 스플리팅):

```javascript
// 정적 import: 파일 로드 시 항상 불러옴
import { heavyModule } from "./heavy.js"; // 무겁더라도 항상 로드

// 동적 import: 필요한 시점에만 불러옴 (Promise 반환)
async function loadModule() {
  // 버튼 클릭 시에만 무거운 모듈 로드
  const module = await import("./heavy.js");
  module.heavyFunction();
}

// 실용 예시: 조건부 로드
async function initEditor() {
  const btn = document.getElementById("open-editor");

  btn.addEventListener("click", async () => {
    // 에디터는 클릭했을 때만 로드 (초기 로딩 시간 단축)
    const { CodeEditor } = await import("./CodeEditor.js");
    const editor = new CodeEditor("#editor-container");
    editor.init();
  });
}

// 언어에 따라 다른 모듈 로드
async function loadLocale(lang) {
  const messages = await import(`./locales/${lang}.js`);
  return messages.default; // default export
}

const koMessages = await loadLocale("ko"); // 한국어
const enMessages = await loadLocale("en"); // 영어
```

---

## CommonJS vs ES Modules

Node.js에서는 두 가지 모듈 시스템을 볼 수 있어요:

```javascript
// CommonJS (require/module.exports) - Node.js 전통 방식
// math.cjs
const PI = 3.14159;
function add(a, b) { return a + b; }
module.exports = { PI, add }; // 내보내기

// 사용하는 쪽
const { PI, add } = require("./math.cjs"); // 가져오기
const math = require("./math.cjs");         // 또는 전체 가져오기

// ES Modules (import/export) - 현대 방식, 브라우저 + 최신 Node.js
// math.js
export const PI = 3.14159;
export function add(a, b) { return a + b; }

// 사용하는 쪽
import { PI, add } from "./math.js";
```

> **언제 무엇을 쓰나요?**
> - 브라우저 (Vite, React 등): ES Modules (`import/export`)
> - Node.js 신규 프로젝트: ES Modules 권장
> - 기존 Node.js 라이브러리/레거시: CommonJS (`require`)
> - 요즘은 대부분 ES Modules을 사용합니다!

---

## 실전 예제: 서비스 모듈 분리

```javascript
// services/auth.js - 인증 관련 서비스
const TOKEN_KEY = "auth_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn() {
  return !!getToken(); // 토큰이 있으면 로그인 상태
}

// services/api.js - API 통신
import { getToken } from "./auth.js"; // auth 모듈 사용

const BASE_URL = "https://api.example.com";

export async function request(endpoint, options = {}) {
  const token = getToken();  // auth 모듈에서 토큰 가져옴

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// pages/login.js - 로그인 페이지
import { setToken, isLoggedIn } from "../services/auth.js";
import { request } from "../services/api.js";

if (isLoggedIn()) {
  window.location.href = "/dashboard"; // 이미 로그인했으면 이동
}

async function handleLogin(email, password) {
  try {
    const { token } = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setToken(token);               // 토큰 저장
    window.location.href = "/dashboard";
  } catch (error) {
    console.error("로그인 실패:", error.message);
  }
}
```

---

## 자주 하는 실수

```javascript
// ❌ 실수 1: 경로에 확장자 누락 (브라우저에서 필수!)
import { add } from "./math"; // ❌ 브라우저에서는 .js 필요
import { add } from "./math.js"; // ✅

// ❌ 실수 2: default export를 중괄호로 가져오기
// greeting.js: export default function greet() {}
import { greet } from "./greeting.js"; // ❌ default는 중괄호 없이!
import greet from "./greeting.js";     // ✅

// ❌ 실수 3: named export를 중괄호 없이 가져오기
// math.js: export function add() {}
import add from "./math.js"; // ❌ named는 중괄호 필요!
import { add } from "./math.js"; // ✅

// ❌ 실수 4: 순환 의존성
// a.js: import { b } from './b.js'
// b.js: import { a } from './a.js'
// → 무한 루프! 모듈 구조를 다시 설계해야 함

// ✅ 해결: 공통 모듈을 분리
// common.js: 공통 코드
// a.js: import from './common.js'
// b.js: import from './common.js'
```

---

## HTML에서 ES 모듈 사용

```html
<!-- type="module" 추가 필수! -->
<script type="module" src="./app.js"></script>

<!-- 인라인 모듈 -->
<script type="module">
  import { greet } from "./greeting.js";
  document.getElementById("msg").textContent = greet("세상");
</script>
```

> **주의**: 모듈 스크립트는 기본적으로 `defer` 동작 (DOM 로드 후 실행).
> 로컬 파일로 테스트 시 CORS 에러가 발생할 수 있으니 로컬 서버(VSCode Live Server 등)를 사용하세요.

---

## 정리

| 구문 | 설명 |
|------|------|
| `export const x = ...` | named export |
| `export { a, b, c }` | 여러 개 한번에 export |
| `export default fn` | default export (파일당 1개) |
| `import { a, b } from "./file"` | named import |
| `import fn from "./file"` | default import |
| `import * as ns from "./file"` | 전체 import |
| `import { a as alias }` | 이름 바꿔서 import |
| `const m = await import("./file")` | 동적 import |

모듈 시스템을 활용하면 코드를 **역할별로 분리**하여 **유지보수하기 쉬운 구조**를 만들 수 있습니다.
React, Vue 등 현대 프레임워크는 모두 모듈 시스템을 적극 활용하니 꼭 익혀두세요!
