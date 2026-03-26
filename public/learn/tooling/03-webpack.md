---
title: "Webpack 번들러"
order: 3
---

# Webpack 번들러

Webpack은 2012년에 등장해 현재까지도 가장 널리 쓰이는 번들러입니다.
React의 공식 스타터인 Create React App(CRA)도 내부적으로 Webpack을 사용했습니다.
Vite가 등장했지만, 수많은 기업 프로젝트에서 여전히 Webpack을 쓰고 있어
기본 개념은 반드시 알아야 합니다.

---

## 번들링이 왜 필요한가?

웹 초창기에는 HTML 파일 하나에 `<script>` 태그로 JS 파일을 불러왔습니다.

```html
<!-- 예전 방식 -->
<script src="jquery.js"></script>
<script src="lodash.js"></script>
<script src="react.js"></script>
<script src="app.js"></script>
<script src="utils.js"></script>
<!-- 파일이 늘어날수록 HTTP 요청 수가 늘어남 -->
```

문제점:
1. **HTTP 요청 수 증가**: 파일 하나마다 서버에 요청 → 느림
2. **전역 변수 충돌**: 모든 JS 파일이 같은 전역 스코프를 공유
3. **의존성 순서**: `jquery.js`가 먼저 로드되어야 하는 등 순서 관리가 복잡

**번들러**는 이 문제를 해결합니다.
마치 여러 짐을 하나의 캐리어에 싸듯이, 모든 파일을 하나(또는 몇 개)의 파일로 합칩니다.

```
[번들링 전]           [번들링 후]
app.js          →
utils.js        →    bundle.js (하나의 파일!)
react.js        →
lodash.js       →
```

---

## Webpack의 핵심 개념 4가지

Webpack 설정은 4가지 핵심 개념으로 이루어집니다.

### 1. Entry (진입점)

번들링을 시작하는 파일입니다.
Webpack은 여기서 시작해서 `import`를 따라가며 모든 의존성을 분석합니다.

```javascript
// webpack.config.js
module.exports = {
  entry: './src/index.js',  // 여기서 시작!
  // 또는 여러 진입점
  entry: {
    main: './src/index.js',
    admin: './src/admin.js', // 어드민 페이지 별도 번들
  },
}
```

```javascript
// src/index.js (진입점)
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'     // Webpack이 이걸 따라가서 App.js도 분석
ReactDOM.render(<App />, document.getElementById('root'))
```

### 2. Output (출력)

번들 파일을 어디에, 어떤 이름으로 저장할지 설정합니다.

```javascript
const path = require('path')  // Node.js 내장 경로 모듈

module.exports = {
  output: {
    path: path.resolve(__dirname, 'dist'), // 절대 경로로 dist 폴더
    filename: '[name].[contenthash].js',  // 파일명에 해시 포함 (캐시 무효화)
    // [name]: entry의 키 이름 (main, admin 등)
    // [contenthash]: 파일 내용 기반 해시 (내용 변경 시에만 파일명 변경)
    clean: true, // 빌드 전 dist 폴더 초기화
  },
}
```

### 3. Loaders (변환기)

Webpack은 기본적으로 JavaScript와 JSON만 이해합니다.
Loader는 다른 파일 형식을 JavaScript로 변환합니다.

CSS, 이미지, TypeScript 등 → JavaScript로 변환 → 번들에 포함

```javascript
module.exports = {
  module: {
    rules: [
      // TypeScript/JSX → JavaScript 변환
      {
        test: /\.(ts|tsx)$/,   // .ts, .tsx 파일에 적용
        use: 'babel-loader',    // babel-loader 사용
        exclude: /node_modules/, // node_modules는 제외
      },

      // CSS 파일 처리
      {
        test: /\.css$/,
        use: [
          'style-loader',  // CSS를 <style> 태그로 주입 (오른쪽→왼쪽 순서!)
          'css-loader',    // CSS의 @import, url() 처리
        ],
      },

      // SASS/SCSS 파일 처리
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',  // SCSS → CSS 변환 (먼저 실행됨)
        ],
        // 실행 순서: sass-loader → css-loader → style-loader
      },

      // 이미지 파일 처리 (Webpack 5 내장)
      {
        test: /\.(png|jpg|gif|svg|webp)$/,
        type: 'asset/resource',  // 파일을 dist 폴더에 복사
        // 또는 'asset/inline': base64로 인라인 (작은 이미지에 유용)
      },

      // 폰트 파일
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
      },
    ],
  },
}
```

### 4. Plugins (플러그인)

Loader가 파일을 변환한다면, Plugin은 번들링 과정 전반에 관여합니다.
HTML 생성, 파일 복사, 환경변수 주입 등을 담당합니다.

```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin')  // HTML 생성
const MiniCssExtractPlugin = require('mini-css-extract-plugin') // CSS 파일 분리
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer') // 번들 분석

module.exports = {
  plugins: [
    // index.html 자동 생성 + 번들 스크립트 자동 주입
    new HtmlWebpackPlugin({
      template: './public/index.html', // 기반이 될 HTML 템플릿
      title: '나의 앱',
    }),

    // CSS를 별도 파일로 추출 (프로덕션에서 권장)
    new MiniCssExtractPlugin({
      filename: 'styles/[name].[contenthash].css',
    }),

    // 번들 크기 시각화 (어떤 패키지가 얼마나 큰지 확인)
    process.env.ANALYZE && new BundleAnalyzerPlugin(),
  ].filter(Boolean),
}
```

---

## babel-loader 상세 설정

babel-loader는 최신 JS/TS/JSX를 구형 브라우저가 이해할 수 있는 JS로 변환합니다.

```bash
npm install -D babel-loader @babel/core @babel/preset-env @babel/preset-react @babel/preset-typescript
```

```javascript
// babel.config.js
module.exports = {
  presets: [
    [
      '@babel/preset-env',  // 최신 JS 문법 → 구형 브라우저 지원 문법
      {
        targets: '> 0.25%, not dead',  // 지원할 브라우저 범위
        useBuiltIns: 'usage',          // 필요한 폴리필만 자동 추가
        corejs: 3,                     // core-js 버전
      },
    ],
    [
      '@babel/preset-react',  // JSX → React.createElement 변환
      { runtime: 'automatic' }, // React 17+: import React 생략 가능
    ],
    '@babel/preset-typescript', // TypeScript 타입 제거
  ],
}
```

```javascript
// webpack.config.js에서 babel-loader 설정
{
  test: /\.(js|jsx|ts|tsx)$/,
  use: {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true, // 변환 결과 캐시 → 재빌드 속도 향상
    },
  },
  exclude: /node_modules/,
}
```

---

## webpack.config.js 전체 예시 (단계별 설명)

```javascript
// webpack.config.js
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const isDev = process.env.NODE_ENV === 'development' // 개발/프로덕션 구분

module.exports = {
  // ── 모드 ───────────────────────────────────────────
  mode: isDev ? 'development' : 'production',
  // development: 빠른 빌드, 소스맵, 디버깅 용이
  // production: 코드 압축, 최적화, 트리 쉐이킹

  // ── 진입점 ─────────────────────────────────────────
  entry: './src/index.tsx',

  // ── 출력 ───────────────────────────────────────────
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isDev
      ? '[name].js'               // 개발: 간단한 이름
      : '[name].[contenthash].js', // 프로덕션: 해시 포함
    publicPath: '/',              // 파일 요청 기준 경로
    clean: true,                  // 이전 빌드 파일 삭제
  },

  // ── 소스맵 ─────────────────────────────────────────
  devtool: isDev
    ? 'eval-source-map'  // 개발: 빠르고 정확한 소스맵
    : 'source-map',      // 프로덕션: 별도 파일로 소스맵 생성

  // ── 모듈 (Loaders) ──────────────────────────────────
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          // 개발: style 태그로 주입 (HMR 지원)
          // 프로덕션: 별도 CSS 파일로 추출
          'css-loader',
        ],
      },
      {
        test: /\.(png|jpg|svg|gif|webp)$/,
        type: 'asset',              // 크기에 따라 자동 결정
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024,      // 8KB 이하: base64 인라인
            // 8KB 초과: 파일로 분리
          },
        },
      },
    ],
  },

  // ── 확장자 해석 ─────────────────────────────────────
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    // import 시 확장자 생략 가능: import App from './App'
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // import Button from '@/components/Button'
    },
  },

  // ── 플러그인 ───────────────────────────────────────
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    !isDev && new MiniCssExtractPlugin({
      filename: 'styles/[name].[contenthash].css',
    }),
  ].filter(Boolean), // false 값 제거

  // ── 최적화 (프로덕션) ─────────────────────────────
  optimization: {
    splitChunks: {
      chunks: 'all',         // 비동기/동기 모두 분할
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',   // node_modules를 vendors.js로 분리
          chunks: 'all',
        },
      },
    },
    runtimeChunk: 'single',  // Webpack 런타임을 별도 파일로 분리
  },
}
```

---

## webpack-dev-server와 HMR

개발할 때는 매번 빌드하지 않고 `webpack-dev-server`를 사용합니다.

```bash
npm install -D webpack-dev-server
```

```javascript
// webpack.config.js
module.exports = {
  devServer: {
    port: 3000,               // 개발 서버 포트
    hot: true,                // HMR 활성화 (파일 수정 시 페이지 부분 갱신)
    open: true,               // 브라우저 자동 열기
    historyApiFallback: true, // SPA 라우팅: 404 시 index.html 반환
    compress: true,           // gzip 압축

    // 백엔드 API 프록시 (CORS 우회)
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },

    // 정적 파일 서빙
    static: {
      directory: path.join(__dirname, 'public'),
    },
  },
}
```

```json
// package.json
{
  "scripts": {
    "start": "webpack serve --mode development",
    "build": "webpack --mode production",
    "build:analyze": "ANALYZE=true webpack --mode production"
  }
}
```

---

## 개발 vs 프로덕션 설정 분리

설정이 복잡해지면 파일을 분리합니다.

```javascript
// webpack.common.js (공통 설정)
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: './src/index.tsx',
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './public/index.html' }),
  ],
}
```

```javascript
// webpack.dev.js (개발 전용)
const { merge } = require('webpack-merge') // 설정 병합 도구
const common = require('./webpack.common')

module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-source-map',  // 빠른 소스맵
  devServer: {
    port: 3000,
    hot: true,
    historyApiFallback: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'], // 개발: 스타일 태그로 주입
      },
    ],
  },
})
```

```javascript
// webpack.prod.js (프로덕션 전용)
const { merge } = require('webpack-merge')
const common = require('./webpack.common')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',       // 별도 파일로 소스맵
  output: {
    filename: '[name].[contenthash].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'], // 별도 파일로 추출
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' }),
  ],
  optimization: {
    minimizer: [
      new TerserPlugin(),          // JS 압축
      new CssMinimizerPlugin(),    // CSS 압축
    ],
    splitChunks: { chunks: 'all' }, // 코드 스플리팅
  },
})
```

```json
// package.json
{
  "scripts": {
    "start": "webpack serve --config webpack.dev.js",
    "build": "webpack --config webpack.prod.js"
  }
}
```

---

## 코드 스플리팅

코드 스플리팅은 번들을 여러 파일로 나눠 **초기 로딩 속도를 개선**합니다.

### 방법 1: Dynamic Import

```javascript
// ❌ 정적 임포트: 무조건 처음에 다 로드
import HeavyLibrary from 'heavy-library'

// ✅ 동적 임포트: 필요할 때만 로드
// Webpack이 별도 청크 파일로 자동 분리!
const loadHeavyLibrary = async () => {
  const { default: HeavyLibrary } = await import('heavy-library')
  HeavyLibrary.doSomething()
}

// React에서 페이지 단위 코드 스플리팅
const AdminPage = React.lazy(() => import('./pages/AdminPage'))
```

### 방법 2: Entry Points 분리

```javascript
module.exports = {
  entry: {
    main: './src/index.js',      // 메인 앱
    admin: './src/admin.js',     // 관리자 앱 (별도 번들)
  },
}
```

---

## Tree Shaking — 불필요한 코드 제거

나무를 흔들어 죽은 잎을 떨어뜨리듯,
**사용하지 않는 코드를 번들에서 제거**합니다.

```javascript
// utils.js
export function add(a, b) { return a + b }       // 사용
export function subtract(a, b) { return a - b }  // 미사용
export function multiply(a, b) { return a * b }  // 미사용

// app.js
import { add } from './utils'  // add만 사용
console.log(add(1, 2))

// Tree Shaking 결과: subtract, multiply는 번들에 포함 안 됨!
```

Tree Shaking이 작동하려면:
1. `mode: 'production'` 설정
2. ESM(`import/export`) 사용 (CommonJS `require` 불가)
3. `package.json`에 `"sideEffects": false` 표시

```json
// package.json (라이브러리 개발 시)
{
  "sideEffects": false  // 부작용 없음 → Webpack이 적극적으로 트리쉐이킹
  // 또는
  "sideEffects": ["*.css", "*.scss"]  // CSS 파일은 부작용 있음 (제거하면 안 됨)
}
```

---

## 성능 최적화 팁

### 빌드 속도 개선

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true, // 변환 캐시 활성화
            },
          },
        ],
        // node_modules 제외: 이미 컴파일된 코드이므로 변환 불필요
        exclude: /node_modules/,
      },
    ],
  },

  // 병렬 처리 (CPU 코어 활용)
  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true, // 멀티스레드 압축
      }),
    ],
  },
}
```

### 번들 크기 분석

```bash
npm install -D webpack-bundle-analyzer

# 분석 실행
npx webpack --config webpack.prod.js
# 브라우저에서 번들 구성 시각화 확인
```

---

## 흔한 실수들

### 실수 1: node_modules에 Loader 적용

```javascript
// ❌ 느림: node_modules의 모든 파일을 변환
{
  test: /\.js$/,
  use: 'babel-loader',
  // exclude 없음 → node_modules도 변환!
}

// ✅ 빠름: node_modules 제외
{
  test: /\.js$/,
  use: 'babel-loader',
  exclude: /node_modules/, // 반드시 추가!
}
```

### 실수 2: 개발 환경에서 MiniCssExtractPlugin 사용

```javascript
// ❌ 개발 환경에서 CSS 파일 추출 → HMR 동작 안 함
{
  test: /\.css$/,
  use: [MiniCssExtractPlugin.loader, 'css-loader'],
}

// ✅ 개발: style-loader, 프로덕션: MiniCssExtractPlugin
{
  test: /\.css$/,
  use: [
    isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
    'css-loader',
  ],
}
```

### 실수 3: contenthash 없이 배포

```javascript
// ❌ 파일명 고정 → 브라우저 캐시로 인해 업데이트가 반영 안 됨
filename: 'bundle.js'

// ✅ contenthash 사용 → 내용이 바뀔 때만 파일명 변경
filename: '[name].[contenthash].js'
```

---

## 정리

Webpack을 이해하는 핵심:

- **Entry**: 분석 시작 파일
- **Output**: 결과 파일 저장 위치
- **Loader**: 비-JS 파일을 JS로 변환 (babel-loader, css-loader 등)
- **Plugin**: 번들링 과정 전반을 제어 (HtmlWebpackPlugin 등)
- **Code Splitting**: 번들을 나눠 초기 로딩 속도 개선
- **Tree Shaking**: 미사용 코드 제거

Vite를 쓰더라도 내부적으로 Rollup(Webpack과 유사한 번들러)을 사용하므로,
번들링의 기본 개념을 이해하면 어떤 도구를 써도 설정과 최적화가 수월합니다.
