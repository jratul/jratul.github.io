---
title: "React 빌드 과정"
date: "2026-02-11"
tags: ["react", "build", "babel", "bundler", "frontend"]
excerpt: "React 앱이 빌드되는 과정을 JSX 변환부터 번들링까지 단계별로 살펴봅니다."
---

# React 빌드 과정

React 앱은 브라우저가 직접 실행할 수 없는 코드(JSX, TypeScript, 모듈 시스템 등)로 작성됩니다. 빌드 과정은 이 코드를 브라우저가 이해할 수 있는 형태로 변환합니다.

```
소스 코드 (.tsx, .jsx)
        ↓
┌──────────────────────┐
│  1. JSX 변환         │  ← JSX → JavaScript
├──────────────────────┤
│  2. TypeScript 컴파일 │  ← TS → JS
├──────────────────────┤
│  3. 번들링           │  ← 여러 파일 → 하나(또는 몇 개)
├──────────────────────┤
│  4. 최적화           │  ← 압축, Tree Shaking
└──────────────────────┘
        ↓
번들 파일 (.js, .css, .html)
```

---

## JSX 변환

JSX는 JavaScript의 확장 문법입니다. 브라우저는 JSX를 이해하지 못하므로 일반 JavaScript 함수 호출로 변환해야 합니다.

### Classic Transform (React 16 이하)

```jsx
// 변환 전
import React from 'react';

function App() {
  return <div className="app">Hello</div>;
}

// 변환 후
import React from 'react';

function App() {
  return React.createElement('div', { className: 'app' }, 'Hello');
}
```

`React.createElement`를 호출하기 때문에 JSX를 사용하는 모든 파일에서 `import React from 'react'`가 필요했습니다.

---

### New JSX Transform (React 17+)

React 17부터 새로운 JSX 변환 방식이 도입되었습니다.

```jsx
// 변환 전
function App() {
  return <div className="app">Hello</div>;
}

// 변환 후
import { jsx as _jsx } from 'react/jsx-runtime';

function App() {
  return _jsx('div', { className: 'app', children: 'Hello' });
}
```

`react/jsx-runtime`에서 자동으로 import되므로 `import React`를 직접 작성할 필요가 없습니다.

---

### JSX가 변환되는 구조

중첩된 JSX가 어떻게 변환되는지 살펴보면:

```jsx
// 변환 전
function Card({ title, children }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="body">{children}</div>
    </div>
  );
}

// 변환 후 (New Transform)
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';

function Card({ title, children }) {
  return _jsxs('div', {
    className: 'card',
    children: [
      _jsx('h2', { children: title }),
      _jsx('div', { className: 'body', children: children }),
    ],
  });
}
```

- `_jsx`: 자식이 하나인 경우
- `_jsxs`: 자식이 여러 개인 경우

---

## TypeScript 컴파일

TypeScript로 작성된 코드는 타입 정보를 제거하고 JavaScript로 변환합니다.

```tsx
// 변환 전
interface Props {
  name: string;
  age: number;
}

function Profile({ name, age }: Props) {
  return <div>{name} ({age})</div>;
}

// 변환 후 (타입 정보 제거)
function Profile({ name, age }) {
  return _jsx('div', { children: `${name} (${age})` });
}
```

Vite에서는 **esbuild**가 TypeScript 변환을 처리합니다. esbuild는 Go로 작성되어 `tsc`보다 훨씬 빠르지만, 타입 체크는 수행하지 않습니다. 타입 체크는 별도로 `tsc --noEmit`을 실행해야 합니다.

---

## 번들링

여러 모듈 파일을 브라우저가 효율적으로 로드할 수 있도록 묶는 과정입니다.

### 왜 번들링이 필요한가

```
src/
├── App.tsx          (import → Header, Footer, Router)
├── Header.tsx       (import → Logo, Nav)
├── Footer.tsx       (import → Link)
├── Router.tsx       (import → Home, About, Post)
├── Home.tsx         (import → PostList, SearchBar)
├── PostList.tsx     (import → PostCard)
├── PostCard.tsx     (import → Badge, formatDate)
└── ...              수십~수백 개의 파일
```

각 파일을 개별 HTTP 요청으로 로드하면 성능이 크게 저하됩니다. 번들러가 이를 소수의 파일로 합칩니다.

---

### 번들러별 비교

| | Webpack | Vite (dev) | Vite (prod) |
|---|---|---|---|
| 방식 | 전체 번들링 | ESM (번들링 없음) | Rollup 번들링 |
| Dev 시작 속도 | 느림 | 빠름 | - |
| HMR 속도 | 보통 | 빠름 | - |
| 프로덕션 최적화 | 좋음 | - | 좋음 |

---

### Vite의 개발 서버

Vite는 개발 환경에서 번들링을 하지 않습니다. 브라우저의 Native ESM을 활용합니다.

```
기존 번들러 (Webpack):
  모든 소스 → 번들링 → 서버 시작 → 브라우저 로드

Vite:
  서버 즉시 시작 → 브라우저 요청 시 해당 파일만 변환
```

```html
<!-- 브라우저가 직접 ESM import를 처리 -->
<script type="module" src="/src/main.tsx"></script>
```

브라우저가 `main.tsx`를 요청하면, Vite가 해당 파일만 변환하여 응답합니다. import된 파일도 브라우저가 순차적으로 요청합니다.

---

### 의존성 사전 번들링 (Pre-bundling)

Vite는 `node_modules`의 의존성은 **esbuild**로 사전 번들링합니다.

```
// node_modules/react/index.js → CommonJS
// node_modules/lodash-es/index.js → 수백 개의 모듈

esbuild로 사전 번들링:
  react → .vite/deps/react.js (단일 ESM 파일)
  lodash-es → .vite/deps/lodash-es.js (단일 ESM 파일)
```

**이유:**
1. **CommonJS → ESM 변환**: `react` 같은 패키지는 CommonJS로 배포됨
2. **요청 수 감소**: `lodash-es`는 내부 모듈이 수백 개인데, 하나로 합침

---

### 프로덕션 번들링

Vite는 프로덕션 빌드에서 **Rollup**을 사용합니다.

```bash
npm run build
```

```
dist/
├── index.html
├── assets/
│   ├── index-BkH3sEa2.js      ← 메인 번들 (해시 포함)
│   ├── index-D4h5gK1x.css     ← CSS 번들
│   └── vendor-Ck9fPz7R.js     ← 라이브러리 번들 (코드 스플리팅)
```

파일명에 해시가 포함되어 있어 브라우저 캐시를 효과적으로 활용할 수 있습니다. 코드가 변경되면 해시가 바뀌고, 변경되지 않은 파일은 캐시를 그대로 사용합니다.

---

## 코드 스플리팅

하나의 거대한 번들 대신 여러 청크로 나누어 필요할 때 로드합니다.

### Dynamic Import

```tsx
import { lazy, Suspense } from 'react';

// 정적 import → 메인 번들에 포함
import Home from './pages/Home';

// 동적 import → 별도 청크로 분리
const About = lazy(() => import('./pages/About'));
const Post = lazy(() => import('./pages/Post'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/post/:slug" element={<Post />} />
      </Routes>
    </Suspense>
  );
}
```

```
빌드 결과:
  index.js     ← Home 포함 (항상 로드)
  About.js     ← /about 접근 시 로드
  Post.js      ← /post/:slug 접근 시 로드
```

---

### Vendor 청크 분리

Rollup 설정으로 `node_modules`의 라이브러리를 별도 청크로 분리할 수 있습니다.

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          markdown: ['react-markdown', 'react-syntax-highlighter'],
        },
      },
    },
  },
});
```

앱 코드가 변경되어도 vendor 청크는 캐시를 그대로 사용할 수 있습니다.

---

## 최적화

### Tree Shaking

사용하지 않는 코드를 제거합니다.

```tsx
// math.ts
export function add(a: number, b: number) {
  return a + b;
}

export function subtract(a: number, b: number) {
  return a - b;
}

export function multiply(a: number, b: number) {
  return a * b;
}

// App.tsx
import { add } from './math';

console.log(add(1, 2));

// 빌드 결과: subtract, multiply는 제거됨
```

Tree Shaking은 **ESM(ES Modules)**에서만 동작합니다. `import/export` 구문이 정적으로 분석 가능하기 때문입니다. CommonJS의 `require()`는 동적이라 분석이 어렵습니다.

---

### Minification

코드를 압축하여 파일 크기를 줄입니다.

```javascript
// 압축 전
function calculateTotalPrice(items) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

// 압축 후 (Terser/esbuild)
function calculateTotalPrice(t){let o=0;for(const l of t)o+=l.price*l.quantity;return o}
```

Vite는 기본적으로 **esbuild**를 사용하여 minify합니다.

---

### Dead Code Elimination

```tsx
// 개발 환경 전용 코드 제거
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info');
}

// 프로덕션 빌드 시:
// 1. process.env.NODE_ENV가 'production'으로 치환
// 2. if (false) { ... } 가 됨
// 3. 코드 블록 전체 제거
```

React 내부에서도 이 방식으로 개발용 경고 메시지를 프로덕션에서 제거합니다.

---

## HMR (Hot Module Replacement)

개발 중 코드를 수정하면 전체 페이지를 새로고침하지 않고 변경된 모듈만 교체합니다.

```
파일 수정
    ↓
Vite 서버가 변경 감지
    ↓
변경된 모듈만 변환
    ↓
WebSocket으로 브라우저에 전송
    ↓
브라우저가 해당 모듈만 교체
    ↓
React 컴포넌트 상태 유지
```

Vite의 React 플러그인(`@vitejs/plugin-react`)이 React Fast Refresh를 통합하여 컴포넌트 상태를 유지하면서 업데이트합니다.

```tsx
// Counter의 count가 5인 상태에서 텍스트를 수정하면
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      클릭: {count}  {/* ← 이 텍스트를 수정해도 count는 5 유지 */}
    </button>
  );
}
```

---

## 전체 빌드 파이프라인 정리

### 개발 환경 (npm run dev)

```
1. Vite 서버 시작 (즉시)
2. node_modules 사전 번들링 (esbuild)
3. 브라우저 요청 시 파일 변환
   - JSX → JS (esbuild)
   - TypeScript → JS (esbuild)
   - CSS 처리 (PostCSS)
4. HMR으로 변경 사항 실시간 반영
```

### 프로덕션 빌드 (npm run build)

```
1. TypeScript 타입 제거 + JSX 변환 (esbuild)
2. 모듈 번들링 (Rollup)
   - 의존성 그래프 분석
   - 코드 스플리팅
   - Tree Shaking
3. CSS 처리
   - PostCSS (Tailwind 등)
   - CSS 압축
4. 코드 최적화
   - Minification (esbuild)
   - Dead Code Elimination
5. 에셋 처리
   - 파일명 해싱
   - 이미지 최적화 (설정 시)
6. HTML 생성
   - 스크립트/스타일 태그 주입
   - 메타 태그 처리
```

---

## 요약

| 단계 | 역할 | 도구 (Vite 기준) |
|---|---|---|
| JSX 변환 | JSX → JavaScript 함수 호출 | esbuild |
| TS 컴파일 | 타입 제거, JS 변환 | esbuild |
| 번들링 | 모듈 합치기 | Rollup (prod) / Native ESM (dev) |
| 코드 스플리팅 | 청크 분리, 지연 로딩 | Rollup + dynamic import |
| Tree Shaking | 미사용 코드 제거 | Rollup |
| Minification | 코드 압축 | esbuild |
| HMR | 실시간 모듈 교체 | Vite + React Fast Refresh |
