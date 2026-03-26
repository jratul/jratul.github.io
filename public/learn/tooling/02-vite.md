---
title: "Vite — 빠른 빌드 도구"
order: 2
---

# Vite — 빠른 빌드 도구

React 프로젝트를 만들 때 `npm create vite@latest`를 써본 적 있을 겁니다.
Vite(비트)는 **개발 서버를 즉시 시작하고 빠르게 빌드해주는 도구**입니다.

왜 이렇게 빠를까요? 그 비밀을 알아봅시다.

---

## Webpack 시대의 문제점

예전에는 **Webpack**이 표준이었습니다.
Webpack은 프로젝트의 모든 파일을 **미리 하나로 합쳐서(번들링)** 개발 서버를 시작했습니다.

```
[Webpack 방식]
파일 1000개 → 전부 분석 → 번들 생성 → 서버 시작
(파일이 많을수록 기다리는 시간↑, 프로젝트가 커지면 30초~2분 대기)
```

파일 하나 수정하면? 다시 번들링... 매번 기다려야 했습니다.

---

## Vite가 빠른 이유 3가지

### 이유 1: ESM (ES Modules) 활용

Vite는 미리 번들링하지 않습니다. **브라우저가 직접 모듈을 불러오게** 합니다.

```javascript
// 브라우저가 직접 이해할 수 있는 ESM
import React from '/node_modules/react/...'
import App from '/src/App.tsx'

// 필요한 파일만 그때그때 요청 → 서버 시작이 즉각적!
```

```
[Vite 방식]
서버 즉시 시작 → 브라우저가 필요한 파일 요청 시 그때 변환
(파일 1000개여도 서버 시작은 <1초)
```

### 이유 2: esbuild (Go로 만든 초고속 번들러)

Vite는 의존성(node_modules) 사전 번들링에 **esbuild**를 사용합니다.
esbuild는 Go 언어로 작성되어, JavaScript로 만들어진 Webpack보다 **10~100배 빠릅니다**.

```
JavaScript 기반 번들러: 1000ms
esbuild (Go 기반): 10ms
```

### 이유 3: HMR (Hot Module Replacement) — 번개같은 새로고침

코드를 수정했을 때 페이지 전체를 새로고침하는 게 아니라,
**수정된 모듈만 교체**합니다.

```
[기존 방식] 파일 수정 → 전체 페이지 새로고침 (상태 초기화)
[HMR 방식]  파일 수정 → 해당 컴포넌트만 교체 (상태 유지!)
```

React 컴포넌트를 수정하면 폼에 입력한 값이 날아가지 않고,
수정한 컴포넌트만 바뀝니다.

---

## Vite 설치 및 프로젝트 생성

```bash
# React + TypeScript 프로젝트 생성
npm create vite@latest my-app -- --template react-ts

# 또는 대화형으로
npm create vite@latest
# ✔ Project name: my-app
# ✔ Select a framework: React
# ✔ Select a variant: TypeScript

cd my-app
npm install
npm run dev  # 개발 서버 시작
```

생성되는 파일 구조:
```
my-app/
├── src/
│   ├── App.tsx          # 루트 컴포넌트
│   ├── App.css
│   ├── main.tsx         # 진입점
│   └── index.css
├── public/              # 정적 파일 (빌드 시 그대로 복사)
├── index.html           # 진입점 HTML (Vite는 HTML이 진입점!)
├── vite.config.ts       # Vite 설정 파일
├── tsconfig.json
└── package.json
```

---

## vite.config.ts 상세 해설

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // ── 플러그인 ───────────────────────────────────────
  plugins: [
    react(), // React 지원: JSX 변환, Fast Refresh(HMR) 활성화
  ],

  // ── 경로 별칭 ────────────────────────────────────────
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 이제 '../../../components/Button' 대신 '@/components/Button' 사용 가능
    },
  },

  // ── 개발 서버 설정 ───────────────────────────────────
  server: {
    port: 3000,        // 기본 포트 (기본값: 5173)
    open: true,        // 서버 시작 시 브라우저 자동 열기
    host: true,        // 네트워크에서 접근 허용 (같은 WiFi의 다른 기기에서 테스트 시)
    proxy: {
      // API 서버가 다른 포트에 있을 때 CORS 우회
      '/api': {
        target: 'http://localhost:8080', // 백엔드 서버 주소
        changeOrigin: true,              // Origin 헤더 변경
        rewrite: path => path.replace(/^\/api/, ''), // /api 경로 제거
      },
    },
  },

  // ── 프리뷰 서버 (npm run preview) 설정 ───────────────
  preview: {
    port: 4173,        // 빌드 결과물 미리보기 포트
  },

  // ── 빌드 설정 ────────────────────────────────────────
  build: {
    outDir: 'dist',           // 빌드 결과물 폴더 (기본값: dist)
    sourcemap: false,         // 소스맵 생성 여부 (개발: true, 배포: false)
    minify: 'esbuild',        // 코드 압축 (esbuild가 가장 빠름)
    target: 'es2015',         // 지원할 최소 브라우저 버전
    chunkSizeWarningLimit: 500, // 청크 크기 경고 기준 (kB)

    rollupOptions: {
      // 번들 분할 전략 (코드 스플리팅)
      output: {
        manualChunks: {
          // vendor: 잘 바뀌지 않는 라이브러리들을 별도 파일로
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
        // 파일명 패턴
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },

  // ── CSS 설정 ─────────────────────────────────────────
  css: {
    modules: {
      // CSS Modules 클래스명 형식
      localsConvention: 'camelCase', // .my-class → myClass
    },
  },
})
```

---

## 환경 변수 (.env)

Vite는 `.env` 파일로 환경별 설정을 관리합니다.
**반드시 `VITE_` 접두사**를 붙여야 브라우저에서 사용할 수 있습니다.

```bash
# .env (모든 환경 공통)
VITE_APP_TITLE=나의 앱

# .env.development (개발 환경)
VITE_API_URL=http://localhost:8080
VITE_DEBUG=true

# .env.production (프로덕션 환경)
VITE_API_URL=https://api.myapp.com
VITE_DEBUG=false

# .env.local (로컬 전용, git에 올리지 않음 - .gitignore에 추가 필요)
VITE_API_KEY=내_비밀_키  # 절대 git에 올리면 안 되는 값
```

```typescript
// 코드에서 사용
const apiUrl = import.meta.env.VITE_API_URL  // ✅ VITE_ 접두사
const title = import.meta.env.VITE_APP_TITLE

// Vite가 기본 제공하는 환경 변수
console.log(import.meta.env.MODE)      // "development" 또는 "production"
console.log(import.meta.env.DEV)       // 개발 환경이면 true
console.log(import.meta.env.PROD)      // 프로덕션이면 true
console.log(import.meta.env.BASE_URL)  // 앱의 base path

// ❌ 절대 금지: process.env는 Vite에서 동작하지 않음
const secret = process.env.API_KEY  // undefined!
```

TypeScript에서 환경 변수 타입 정의:

```typescript
// src/vite-env.d.ts (Vite가 자동 생성, 또는 직접 추가)
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_TITLE: string
  // 직접 사용하는 환경 변수 추가
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

---

## 플러그인 시스템

Vite는 플러그인으로 기능을 확장합니다.

```bash
# 자주 쓰는 플러그인 설치
npm install -D @vitejs/plugin-react     # React 지원
npm install -D @vitejs/plugin-react-swc # React + SWC (더 빠름)
npm install -D vite-plugin-pwa          # PWA 지원
npm install -D vite-tsconfig-paths      # tsconfig의 paths 사용
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc' // SWC 기반 (빠름!)
import { VitePWA } from 'vite-plugin-pwa'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    react(),

    // PWA 플러그인 설정
    VitePWA({
      registerType: 'autoUpdate',         // 서비스 워커 자동 업데이트
      manifest: {
        name: '나의 앱',
        short_name: '앱',
        theme_color: '#ffffff',
      },
    }),

    // tsconfig.json의 paths 별칭 자동 인식
    tsconfigPaths(),
  ],
})
```

---

## 빌드 최적화

### 코드 스플리팅 (Code Splitting)

앱 전체를 하나의 파일로 만들면 초기 로딩이 느립니다.
코드 스플리팅은 **필요할 때만 코드를 불러오게** 나눕니다.

```typescript
// React.lazy로 동적 임포트 (페이지 단위 분할)
import React, { lazy, Suspense } from 'react'

// ❌ 이렇게 하면 모든 페이지가 처음부터 로드됨
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'

// ✅ 필요할 때만 로드 (lazy loading)
const AdminPage = lazy(() => import('./pages/AdminPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))

function App() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </Suspense>
  )
}
```

### manualChunks로 번들 분할

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // node_modules의 패키지를 vendor로 분리
          if (id.includes('node_modules')) {
            // React 관련: 별도 청크
            if (id.includes('react')) {
              return 'react-vendor'
            }
            // 나머지 라이브러리들: 하나로 묶기
            return 'vendor'
          }
        },
      },
    },
  },
})

// 결과:
// dist/assets/react-vendor-abc123.js  (React, React-DOM)
// dist/assets/vendor-def456.js        (기타 라이브러리)
// dist/assets/index-ghi789.js         (앱 코드)
```

분리된 파일은 브라우저가 캐싱합니다.
앱 코드만 바뀌어도 vendor는 다시 다운로드하지 않아 빠릅니다.

---

## Webpack vs Vite 비교

| 항목 | Webpack | Vite |
|------|---------|------|
| 개발 서버 시작 | 느림 (전체 번들링) | 매우 빠름 (ESM) |
| HMR 속도 | 보통 | 매우 빠름 |
| 설정 복잡도 | 복잡 | 간단 |
| 생태계 | 풍부 (오래됨) | 빠르게 성장 중 |
| 빌드 엔진 | JavaScript | esbuild + Rollup |
| SSR 지원 | 직접 설정 필요 | 내장 지원 |
| CRA 대체 | O | O (더 권장) |

**결론:** 새 프로젝트에서는 Vite를 쓰세요.
기존 Webpack 프로젝트를 굳이 마이그레이션할 필요는 없습니다.

---

## 흔한 실수들

### 실수 1: process.env 사용

```typescript
// ❌ 동작하지 않음
const url = process.env.REACT_APP_API_URL

// ✅ Vite 방식
const url = import.meta.env.VITE_API_URL
```

### 실수 2: public 폴더 vs src 폴더 자산 혼동

```
public/              ← 빌드 시 그대로 복사, URL로 직접 접근
  logo.png           → /logo.png 으로 접근

src/assets/          ← Vite가 처리 (해시 이름, 최적화)
  logo.png           → import logoUrl from './assets/logo.png'
```

```typescript
// src 내 이미지: import 사용 (해시 파일명으로 캐시 최적화)
import logoUrl from '@/assets/logo.png'
<img src={logoUrl} />

// public 이미지: 절대 경로 사용 (파일명 그대로)
<img src="/logo.png" />
```

### 실수 3: 빌드 결과물 확인 없이 배포

```bash
# 배포 전 반드시 확인!
npm run build         # 빌드
npm run preview       # 빌드 결과물을 로컬에서 미리보기

# http://localhost:4173 에서 실제 배포 환경처럼 확인
```

---

## 정리

Vite를 선택해야 하는 이유:

- **개발 서버**: 파일 수가 늘어도 시작 속도가 일정하게 빠름
- **HMR**: 코드 수정이 거의 즉각적으로 반영
- **설정 간단**: Webpack에 비해 설정이 훨씬 직관적
- **TypeScript 기본 지원**: 별도 설정 없이 바로 사용

Vite는 현대 프론트엔드 개발의 표준이 되어가고 있습니다.
React, Vue, Svelte 등 대부분의 프레임워크가 Vite를 기본 빌드 도구로 채택했습니다.
