---
title: "Babel & SWC — 트랜스파일러"
order: 4
---

# Babel & SWC — 트랜스파일러

최신 JavaScript를 쓰고 싶은데, 구형 브라우저가 지원하지 않는다면 어떻게 할까요?
**트랜스파일러**는 최신 코드를 구형 브라우저도 이해할 수 있는 코드로 변환해줍니다.

마치 **방언을 표준어로 번역하는 것**처럼, 새로운 문법을 오래된 문법으로 바꿔줍니다.

---

## 트랜스파일러가 왜 필요한가?

```javascript
// 내가 쓴 최신 코드
const add = (a, b) => a + b          // 화살표 함수 (ES6)
const { name, age } = person         // 구조분해 (ES6)
const message = `안녕, ${name}!`     // 템플릿 리터럴 (ES6)
class Animal { ... }                 // 클래스 (ES6)
async function fetchData() { ... }   // async/await (ES2017)

// 구형 브라우저(IE11 등)가 이해하는 코드 (트랜스파일 후)
var add = function(a, b) { return a + b }  // function 표현식
var name = person.name; var age = person.age  // 개별 할당
var message = '안녕, ' + name + '!'    // 문자열 연결
function Animal() { ... }              // 생성자 함수
function fetchData() {                 // Promise 체인
  return fetch(url).then(function(res) { ... })
}
```

또한 트랜스파일러는 **JSX**도 처리합니다:

```jsx
// JSX (브라우저가 이해 못함)
const element = <div className="app"><h1>안녕!</h1></div>

// 변환 후 (순수 JavaScript)
const element = React.createElement(
  'div',
  { className: 'app' },
  React.createElement('h1', null, '안녕!')
)
```

---

## Babel

**Babel**은 JavaScript 트랜스파일러의 표준입니다.
2014년 등장해 현재까지 가장 널리 사용됩니다.

### Babel 구조: 코어 + 프리셋 + 플러그인

```
Babel 코어(@babel/core): 변환 엔진
  └── 프리셋(preset): 여러 플러그인의 묶음
        └── 플러그인(plugin): 특정 문법 하나를 변환하는 단위
```

### 설치

```bash
# 필수: Babel 코어
npm install -D @babel/core

# 자주 쓰는 프리셋
npm install -D @babel/preset-env       # 최신 JS → 구형 JS
npm install -D @babel/preset-react     # JSX → JS
npm install -D @babel/preset-typescript # TypeScript 타입 제거

# Webpack에서 Babel 사용
npm install -D babel-loader
```

### babel.config.js 또는 .babelrc

```javascript
// babel.config.js (프로젝트 루트에 위치, 모든 파일에 적용)
module.exports = {
  presets: [
    // ── @babel/preset-env ──────────────────────────────
    [
      '@babel/preset-env',
      {
        // 어떤 브라우저를 지원할지 (Browserslist 쿼리)
        targets: {
          browsers: '> 0.5%, last 2 versions, not dead',
          // 또는 Node.js 버전: node: 'current'
        },

        // 폴리필 처리 방식
        useBuiltIns: 'usage', // 사용한 기능의 폴리필만 자동 추가
        // 'entry': import 'core-js'를 직접 명시해야 함
        // false: 폴리필 추가 안 함

        corejs: { version: 3, proposals: true }, // core-js 버전

        // 모듈 변환 방식 (번들러가 있으면 false 권장)
        modules: false,
        // false: ESM 유지 → Tree Shaking 가능
        // 'auto': Webpack 환경에 맞게 자동
      },
    ],

    // ── @babel/preset-react ──────────────────────────────
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
        // automatic: React 17+ → import React 불필요
        // classic: React 16 이하 → import React from 'react' 필요
      },
    ],

    // ── @babel/preset-typescript ──────────────────────────
    '@babel/preset-typescript',
    // TypeScript 타입을 제거만 함 (타입 검사는 tsc가 담당)
  ],

  plugins: [
    // 클래스 프로퍼티 (현재 preset-env에 포함됨)
    // '@babel/plugin-proposal-class-properties',

    // 데코레이터 (실험적 기능)
    // ['@babel/plugin-proposal-decorators', { legacy: true }],
  ],

  // 환경별 설정
  env: {
    test: {
      // 테스트 환경에서는 모듈을 CommonJS로 변환 (Jest 호환)
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
    },
    production: {
      // 프로덕션에서만 적용할 플러그인
      plugins: ['transform-remove-console'], // console.log 제거
    },
  },
}
```

---

## 실제 변환 예시

### 화살표 함수

```javascript
// 입력
const greet = name => `안녕, ${name}!`
const add = (a, b) => a + b

// 출력 (ES5)
var greet = function(name) { return '안녕, ' + name + '!' }
var add = function(a, b) { return a + b }
```

### async/await

```javascript
// 입력
async function fetchUser(id) {
  const response = await fetch('/api/users/' + id)
  const data = await response.json()
  return data
}

// 출력 (ES5 + 폴리필)
function fetchUser(id) {
  return _asyncToGenerator(function*() {
    var response = yield fetch('/api/users/' + id)
    var data = yield response.json()
    return data
  })()
}
```

### 구조분해 할당

```javascript
// 입력
const { name, age, ...rest } = person
const [first, second, ...others] = array

// 출력
var name = person.name
var age = person.age
var rest = _objectWithoutProperties(person, ['name', 'age'])
var first = array[0]
var second = array[1]
var others = array.slice(2)
```

### 클래스

```javascript
// 입력
class Animal {
  #name  // private 필드

  constructor(name) {
    this.#name = name
  }

  speak() {
    return `${this.#name}가 소리를 냅니다`
  }
}

// 출력 (간략화)
function Animal(name) {
  _classPrivateFieldInitSpec(this, _name, name)
}
Animal.prototype.speak = function() {
  return _classPrivateFieldGet(this, _name) + '가 소리를 냅니다'
}
```

---

## Polyfill — 없는 기능을 채워주는 것

트랜스파일러는 **문법**만 변환합니다.
`Promise`, `Array.includes()`, `fetch` 같은 **새로운 API**는 폴리필이 필요합니다.

```javascript
// Array.includes는 ES7의 새로운 메서드
// 구형 브라우저에는 이 메서드 자체가 없음
[1, 2, 3].includes(2) // IE11에서 에러!

// 폴리필이 없는 기능을 직접 구현해서 추가
if (!Array.prototype.includes) {
  Array.prototype.includes = function(value) {
    return this.indexOf(value) !== -1
  }
}
```

### core-js: 폴리필 라이브러리

`core-js`는 모든 최신 JS 기능의 폴리필을 제공합니다.

```bash
npm install core-js@3  # 반드시 프로덕션 의존성으로 설치!
```

```javascript
// 수동으로 폴리필 추가 (useBuiltIns: 'entry')
// 진입점 파일 최상단에 추가
import 'core-js/stable'     // 모든 폴리필 (번들 크기 증가)
import 'regenerator-runtime/runtime'  // async/await 폴리필

// 자동으로 필요한 것만 추가 (useBuiltIns: 'usage') ← 권장
// babel.config.js에 설정하면 자동으로 필요한 폴리필만 삽입
```

---

## SWC — Rust 기반의 초고속 트랜스파일러

**SWC (Speedy Web Compiler)** 는 Rust로 만들어진 트랜스파일러입니다.
Babel과 동일한 역할을 하지만 **20~70배 빠릅니다**.

### 왜 빠른가?

```
Babel: JavaScript로 만들어짐 → 싱글스레드 → 느림
SWC:   Rust로 만들어짐 → 멀티스레드 병렬 처리 → 빠름

벤치마크 (대형 프로젝트 기준):
- Babel: 20초
- SWC: 0.5초
```

### SWC 사용처

- **Next.js**: v12부터 기본 트랜스파일러로 SWC 채택
- **Vite**: `@vitejs/plugin-react-swc` 사용 시
- **Jest**: `@swc/jest`로 테스트 변환 속도 개선

### SWC 설치 및 설정

```bash
# Vite + React 프로젝트에서 SWC 사용
npm install -D @vitejs/plugin-react-swc

# Jest에서 SWC 사용
npm install -D @swc/core @swc/jest
```

```typescript
// vite.config.ts - SWC 플러그인 사용
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'  // react-swc 사용!

export default defineConfig({
  plugins: [react()],
  // 나머지 설정은 동일
})
```

```json
// .swcrc (SWC 설정 파일)
{
  "jsc": {
    "parser": {
      "syntax": "typescript",   // TypeScript 파싱
      "tsx": true,              // TSX 지원
      "decorators": false       // 데코레이터 비활성화
    },
    "transform": {
      "react": {
        "runtime": "automatic" // React 17+ automatic runtime
      }
    },
    "target": "es2015",        // 출력 타겟
    "loose": false             // 엄격한 변환 (느리지만 정확)
  },
  "module": {
    "type": "commonjs"         // Jest는 CommonJS 필요
  }
}
```

```javascript
// jest.config.js - SWC로 Jest 변환 속도 개선
module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',  // babel-jest 대신 swc/jest 사용
      {
        jsc: {
          transform: {
            react: { runtime: 'automatic' },
          },
        },
      },
    ],
  },
}
```

---

## Babel vs SWC 비교

| 항목 | Babel | SWC |
|------|-------|-----|
| 언어 | JavaScript | Rust |
| 속도 | 기준 | 20~70배 빠름 |
| 플러그인 생태계 | 매우 풍부 | 성장 중 |
| 커스터마이징 | 자유로움 | 제한적 |
| TypeScript 지원 | preset-typescript | 내장 |
| 성숙도 | 매우 성숙 | 빠르게 성장 |
| Next.js | 지원 | 기본값 (v12+) |

**언제 무엇을 쓸까?**
- 새 프로젝트 + Vite: `@vitejs/plugin-react-swc` (빠름)
- Next.js: 기본으로 SWC (별도 설정 불필요)
- 특수한 Babel 플러그인이 필요한 경우: Babel 유지
- 기존 Babel 프로젝트: 굳이 마이그레이션 불필요

---

## 흔한 실수들

### 실수 1: TypeScript 타입 오류를 Babel이 잡아줄 거라 생각

```typescript
// ❌ 잘못된 이해
// Babel은 타입을 "제거"만 합니다. 타입 오류를 검사하지 않아요!

const add = (a: number, b: number): number => a + b
add('hello', 'world')  // 타입 오류지만 Babel은 통과!

// ✅ 타입 검사는 tsc(TypeScript 컴파일러)가 담당
// package.json scripts에 추가
// "type-check": "tsc --noEmit"
```

### 실수 2: preset 순서 잘못 지정

```javascript
// ❌ 순서 잘못 - 예상치 못한 동작
{
  presets: [
    '@babel/preset-typescript',
    '@babel/preset-react',  // TypeScript 처리 전에 React JSX 처리 시도
  ]
}

// ✅ 올바른 순서 (프리셋은 뒤에서부터 실행됨)
{
  presets: [
    '@babel/preset-env',        // 3번째 실행
    '@babel/preset-react',      // 2번째 실행
    '@babel/preset-typescript', // 1번째 실행 (TypeScript 먼저 처리)
  ]
}
```

### 실수 3: core-js를 devDependencies에 설치

```bash
# ❌ 잘못된 예 - 런타임에 필요한 폴리필이 배포에서 빠짐
npm install -D core-js

# ✅ 올바른 예 - 프로덕션 의존성으로 설치
npm install core-js
```

### 실수 4: targets 설정 없이 불필요한 변환

```javascript
// ❌ 현대 브라우저만 지원하는데도 모든 문법을 변환
{
  presets: ['@babel/preset-env']  // targets 없음 → 구형 브라우저까지 지원하는 코드로 변환
}

// ✅ 지원 브라우저 명시 → 불필요한 변환 건너뜀 (번들 크기↓, 속도↑)
{
  presets: [
    ['@babel/preset-env', {
      targets: 'last 2 Chrome versions'
    }]
  ]
}
```

---

## 정리

트랜스파일러를 선택하는 기준:

1. **Vite 새 프로젝트**: `@vitejs/plugin-react-swc` (빠른 빌드)
2. **Next.js**: SWC 기본 내장 (별도 설정 불필요)
3. **Webpack 기반**: `babel-loader` + `@babel/preset-env, react, typescript`
4. **Jest**: `@swc/jest` 사용 시 테스트 속도 대폭 개선

핵심 기억사항:
- 트랜스파일러는 **문법 변환** 담당
- 폴리필(core-js)은 **API 구현** 담당
- **타입 검사**는 트랜스파일러가 아닌 `tsc`가 담당
