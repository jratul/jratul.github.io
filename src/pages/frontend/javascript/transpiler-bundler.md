---
title: "JS 트랜스파일러와 번들러"
date: "2026-03-03"
tags: ["javascript", "build", "webpack", "vite", "esbuild", "swc", "babel", "frontend"]
excerpt: "트랜스파일러와 번들러의 역할 차이, 그리고 Vite·Next.js 등 주요 도구가 내부적으로 무엇을 사용하는지 정리합니다."
---

# JS 트랜스파일러와 번들러

빌드 도구를 다루다 보면 Babel, SWC, esbuild, Webpack, Rollup, Vite 같은 이름들이 뒤섞여 나옵니다. 이 도구들은 역할이 다릅니다.

```
소스 코드 (.ts, .tsx, .jsx)
        ↓
  [트랜스파일러]  ← TS 제거, JSX 변환, 최신 문법 → 구버전 JS
        ↓
  [번들러]       ← 여러 파일 → 하나의 번들, Tree Shaking
        ↓
브라우저가 실행할 수 있는 JS
```

두 작업이 항상 분리되어 있지는 않습니다. esbuild처럼 둘 다 처리하는 도구도 있고, Vite처럼 개발/프로덕션 단계에서 서로 다른 도구를 조합하기도 합니다.

---

## 트랜스파일러

**트랜스파일러(Transpiler)** 는 코드를 같은 수준의 다른 코드로 변환합니다. 컴파일러가 고수준 → 저수준(기계어)으로 변환하는 것과 구별됩니다.

JS 트랜스파일러가 하는 일:

```
TypeScript → JavaScript  (타입 제거)
JSX        → JavaScript  (React.createElement 변환)
ESNext     → ES5/ES2015  (최신 문법 → 구버전 호환)
```

### Babel

가장 오래된 JS 트랜스파일러입니다. JavaScript로 작성되어 있고, 플러그인 생태계가 풍부합니다.

```js
// 입력 (최신 문법)
const greet = (name = 'World') => `Hello, ${name}!`;

// 출력 (ES5)
"use strict";
var greet = function() {
  var name = arguments.length > 0 && arguments[0] !== undefined
    ? arguments[0] : 'World';
  return "Hello, ".concat(name, "!");
};
```

```bash
# 설치
npm install -D @babel/core @babel/cli @babel/preset-env

# .babelrc
{
  "presets": [
    ["@babel/preset-env", { "targets": "> 0.25%, not dead" }],
    "@babel/preset-react",
    "@babel/preset-typescript"
  ]
}
```

Babel은 TypeScript를 **타입 검사 없이** 제거만 합니다. 실제 타입 검사는 `tsc`가 담당합니다.

---

### SWC

Rust로 작성된 트랜스파일러입니다. Babel과 동일한 역할을 하지만 훨씬 빠릅니다.

```
Babel 대비 속도:
- 단일 스레드: ~20배
- 병렬 처리:  ~70배
```

Next.js 12부터 기본 트랜스파일러로 채택되었습니다. Babel 플러그인과는 호환되지 않으므로, 커스텀 Babel 플러그인에 의존하는 프로젝트는 SWC로 바로 전환하기 어렵습니다.

---

### tsc (TypeScript Compiler)

TypeScript 공식 컴파일러입니다. 타입 검사와 JS 변환을 모두 수행합니다.

```bash
tsc --noEmit        # 타입 검사만 (파일 생성 안 함)
tsc                 # 타입 검사 + JS 파일 생성
```

빌드 속도 때문에 대부분의 번들러 환경에서는 `tsc`를 JS 변환에 쓰지 않고 타입 검사 전용으로만 씁니다. 변환은 SWC나 esbuild에 맡깁니다.

```json
// package.json
{
  "scripts": {
    "build": "vite build",
    "type-check": "tsc --noEmit"  // 타입 검사만 별도로
  }
}
```

---

## 번들러

**번들러(Bundler)** 는 여러 JS 파일과 의존성을 하나(또는 몇 개)의 파일로 묶습니다.

번들러가 하는 일:

```
import 추적     → 모든 의존 파일을 그래프로 파악
코드 합치기     → 하나의 번들 파일 생성
Tree Shaking    → 사용하지 않는 코드 제거
Code Splitting  → 필요할 때 로드되는 청크로 분리
Asset 처리      → CSS, 이미지, 폰트 등을 번들에 포함
```

### Webpack

2012년부터 사용된 가장 보편적인 번들러입니다. 설정이 복잡하지만 그만큼 유연합니다.

```js
// webpack.config.js
module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'babel-loader',  // Babel로 트랜스파일
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};
```

Webpack 자체는 트랜스파일 기능이 없습니다. `babel-loader`, `ts-loader`, `swc-loader` 등의 로더를 통해 트랜스파일러를 연결합니다.

---

### Rollup

라이브러리 번들링에 최적화된 번들러입니다. Tree Shaking이 Webpack보다 강력하고, ESM 출력이 깔끔합니다.

```js
// rollup.config.js
export default {
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.cjs.js', format: 'cjs' },  // CommonJS
    { file: 'dist/index.esm.js', format: 'esm' },  // ES Module
  ],
  plugins: [typescript()],
};
```

React, Vue 같은 오픈소스 라이브러리 대부분이 Rollup으로 빌드합니다. 애플리케이션 번들링보다는 패키지 배포에 적합합니다.

---

### esbuild

Go로 작성된 번들러이자 트랜스파일러입니다. 속도가 극단적으로 빠릅니다.

```
Webpack 대비 번들 속도: ~100배
```

```js
// esbuild API
require('esbuild').build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  minify: true,
  outfile: 'dist/bundle.js',
  target: ['es2020'],
});
```

트랜스파일과 번들을 모두 처리하지만, TypeScript 타입 검사는 하지 않습니다. Vite의 개발 서버와 프로덕션 번들링(일부), tsup, Vitest 등이 내부적으로 esbuild를 씁니다.

---

## 주요 프레임워크/도구의 선택

### Vite

개발과 프로덕션에서 서로 다른 도구를 씁니다.

```
개발 서버:
  트랜스파일 → esbuild (각 파일 개별 변환, 극도로 빠름)
  번들       → 없음 (Native ESM으로 브라우저가 직접 import)

프로덕션 빌드:
  트랜스파일 → esbuild
  번들       → Rollup (Tree Shaking, Code Splitting 품질)
```

개발 서버에서 번들링을 하지 않기 때문에 서버 시작이 빠릅니다. 파일 수정 시에도 변경된 파일만 재변환하므로 HMR(Hot Module Replacement)이 빠릅니다.

```
Webpack 기반 CRA:
  npm start → 전체 번들 생성 후 서버 시작 (수십 초)
  파일 수정 → 영향받는 모듈 재번들 (수초)

Vite:
  npm run dev → 즉시 서버 시작 (1초 미만)
  파일 수정  → 변경 파일만 재변환 (수십 ms)
```

---

### Next.js

```
컴파일(트랜스파일):
  Next.js 11 이전 → Babel
  Next.js 12+     → SWC (기본값)

번들러:
  Next.js 14 이전 → Webpack (기본값)
  Next.js 15+     → Turbopack (Rust 기반, 개발 서버 기본값)
                    프로덕션은 여전히 Webpack 또는 진행 중
```

커스텀 Babel 설정이 있으면 SWC 대신 Babel로 폴백됩니다.

---

### Create React App (CRA)

```
트랜스파일 → Babel
번들       → Webpack
```

현재는 유지보수 모드이며, 새 프로젝트에는 Vite나 Next.js 권장입니다.

---

### 라이브러리 패키지 배포

```
tsup (내부적으로 esbuild 사용):
  트랜스파일 → esbuild
  번들       → esbuild (또는 Rollup 모드)
  타입 선언  → tsc --emitDeclarationOnly

Rollup + @rollup/plugin-typescript:
  트랜스파일 → tsc 또는 esbuild
  번들       → Rollup
```

---

## 정리

| 도구 | 종류 | 언어 | 특징 |
|------|------|------|------|
| Babel | 트랜스파일러 | JavaScript | 풍부한 플러그인, 느림 |
| SWC | 트랜스파일러 | Rust | Babel 대체, ~20배 빠름 |
| tsc | 트랜스파일러 | TypeScript | 타입 검사 포함, 느림 |
| esbuild | 트랜스파일러 + 번들러 | Go | 극도로 빠름, 타입 검사 없음 |
| Webpack | 번들러 | JavaScript | 복잡한 설정, 풍부한 생태계 |
| Rollup | 번들러 | JavaScript | 라이브러리 배포에 적합 |
| Vite | 번들러(Rollup + esbuild) | JavaScript | 빠른 개발 서버 |
| Turbopack | 번들러 | Rust | Webpack 후계, Next.js 개발 서버 |

---

## 흐름 요약

```
2015년경: Babel + Webpack 조합이 표준
2020년경: Vite 등장, 개발 서버 패러다임 변화
2022년경: SWC·esbuild 등 네이티브 도구 주류 진입
현재:     Rust/Go 기반 도구가 JS 기반 도구 대체 중
```

타입 검사(`tsc --noEmit`)와 트랜스파일(SWC/esbuild)을 분리하는 것이 현재의 일반적인 방식입니다. 타입 검사는 CI에서, 트랜스파일은 빌드 도구에서 각자 처리합니다.
