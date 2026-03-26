---
title: "Next.js란? React와의 차이"
order: 1
---

# Next.js란? React와의 차이

## Next.js를 왜 배워야 할까?

React로 개발하다 보면 이런 문제들을 만납니다.

- 검색엔진에 내 사이트가 잘 안 잡힌다 (SEO 문제)
- 첫 화면이 뜨는 데 너무 오래 걸린다 (빈 HTML + JS 로딩 대기)
- 페이지 라우팅을 직접 설정해야 한다 (React Router)
- API 서버를 따로 만들어야 한다 (Express, Fastify 등)

Next.js는 이 문제들을 해결하기 위해 React 위에 만들어진 **풀스택 프레임워크**입니다.

> React가 "엔진"이라면, Next.js는 그 엔진을 탑재한 "자동차"입니다.
> 엔진만 있으면 직접 차체를 만들어야 하지만, 자동차는 타면 바로 달릴 수 있습니다.

---

## React만 사용했을 때의 문제점

### CSR (클라이언트 사이드 렌더링)의 한계

순수 React 앱이 작동하는 방식을 떠올려 봅시다.

```
브라우저 요청
     ↓
서버: 빈 HTML 파일 전송 (<div id="root"></div>)
     ↓
브라우저: JS 파일 다운로드
     ↓
브라우저: React가 JS를 실행해 화면 그리기 (hydration)
     ↓
사용자: 화면을 봄
```

이 방식의 문제점은 두 가지입니다.

**1. 느린 초기 로딩 (FCP, First Contentful Paint)**

사용자는 JS가 실행되기 전까지 빈 화면을 봅니다.
인터넷이 느리거나 기기 성능이 낮으면 더 오래 기다려야 합니다.

**2. SEO 불리**

구글 같은 검색 크롤러가 페이지를 방문했을 때 HTML에 내용이 없습니다.
JS를 실행하지 않는 크롤러는 빈 페이지를 수집합니다.

```html
<!-- React 앱의 초기 HTML - 크롤러가 보는 내용 -->
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div> <!-- 텅 비어 있음 -->
    <script src="/main.js"></script>
  </body>
</html>
```

---

## Next.js가 제공하는 렌더링 방식

Next.js는 여러 가지 렌더링 전략을 제공합니다.

### SSR (서버 사이드 렌더링)

> 음식점 비유: **주문을 받으면 그때그때 새로 만들어 주는 음식**

사용자가 페이지를 요청할 때마다 서버에서 HTML을 만들어 전송합니다.

```
사용자 요청
     ↓
서버: 데이터 조회 + HTML 생성
     ↓
브라우저: 완성된 HTML 수신 → 즉시 화면 표시
     ↓
브라우저: JS 로드 후 상호작용 활성화
```

### SSG (정적 사이트 생성)

> 음식점 비유: **미리 만들어둔 도시락**

빌드할 때 미리 HTML을 모두 만들어 둡니다.
사용자 요청 시 미리 만들어진 파일을 즉시 전달합니다.

블로그, 문서 사이트처럼 내용이 자주 바뀌지 않는 곳에 적합합니다.

### ISR (증분 정적 재생성)

SSG의 단점(내용 업데이트가 느림)을 보완한 방식입니다.
일정 시간마다 백그라운드에서 페이지를 재생성합니다.

---

## React vs Next.js 비교

| 항목 | React (CRA/Vite) | Next.js |
|------|-----------------|---------|
| 렌더링 | CSR만 지원 | CSR, SSR, SSG, ISR |
| 라우팅 | React Router 필요 | 파일 기반 라우팅 내장 |
| API | 별도 서버 필요 | Route Handlers 내장 |
| SEO | 추가 작업 필요 | 기본 지원 |
| 이미지 최적화 | 직접 구현 | next/image 컴포넌트 |
| 설정 | webpack 직접 설정 | 기본 설정 제공 |

---

## Next.js 프로젝트 시작하기

```bash
# Next.js 프로젝트 생성
npx create-next-app@latest my-app

# 설정 선택지 (권장 답변)
# TypeScript? → Yes
# ESLint? → Yes
# Tailwind CSS? → Yes (선택사항)
# src/ directory? → Yes (권장)
# App Router? → Yes (최신 방식)
# import alias? → Yes (@/*)
```

### 생성된 폴더 구조

```
my-app/
├── src/
│   └── app/              # App Router의 핵심 폴더
│       ├── layout.tsx    # 전체 레이아웃
│       ├── page.tsx      # 홈 페이지 (/)
│       └── globals.css   # 전역 CSS
├── public/               # 정적 파일 (이미지 등)
├── next.config.js        # Next.js 설정
├── package.json
└── tsconfig.json
```

---

## 개발 서버 실행

```bash
cd my-app
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 Next.js 앱이 실행됩니다.

### 주요 npm 스크립트

```json
{
  "scripts": {
    "dev": "next dev",        // 개발 서버 (핫 리로드)
    "build": "next build",    // 프로덕션 빌드
    "start": "next start",    // 프로덕션 서버 실행
    "lint": "next lint"       // ESLint 검사
  }
}
```

---

## 처음 보게 되는 파일들

### `src/app/page.tsx` — 홈 페이지

```tsx
// 이 파일이 "/" 경로의 페이지가 됩니다
export default function Home() {
  return (
    <main>
      <h1>안녕하세요, Next.js!</h1>
    </main>
  );
}
```

### `src/app/layout.tsx` — 전체 레이아웃

```tsx
// 모든 페이지를 감싸는 공통 레이아웃
export default function RootLayout({
  children,
}: {
  children: React.ReactNode; // 각 페이지의 내용이 여기 들어옴
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

React에서는 `index.html`에 직접 `<html>`, `<body>`를 작성했지만,
Next.js에서는 `layout.tsx`에서 관리합니다.

---

## React 개발자가 알아야 할 변화

### 1. 컴포넌트가 기본적으로 서버에서 실행됩니다

React에서는 모든 컴포넌트가 브라우저에서 실행됩니다.
Next.js App Router에서는 컴포넌트가 **기본적으로 서버에서 실행**됩니다.

```tsx
// React에서 - 브라우저에서 실행
function BlogList() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    // 브라우저에서 API 호출
    fetch('/api/posts').then(r => r.json()).then(setPosts);
  }, []);

  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

```tsx
// Next.js에서 - 서버에서 실행 (더 간단!)
async function BlogList() {
  // 서버에서 직접 데이터 조회 (useEffect 불필요)
  const posts = await fetch('https://api.example.com/posts').then(r => r.json());

  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

### 2. `useState`, `useEffect`를 쓰려면 `'use client'` 필요

```tsx
'use client'; // 이 선언이 있어야 React Hook 사용 가능

import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0); // 클라이언트에서만 동작

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

---

## 정리

Next.js는 React의 기능을 그대로 사용하면서, 프로덕션 앱 개발에 필요한 기능들을 추가로 제공합니다.

- **SEO 문제** → 서버에서 HTML 생성 (SSR/SSG)
- **라우팅 설정** → 파일 기반 라우팅 (폴더 = URL)
- **API 서버** → Route Handlers 내장
- **이미지 최적화** → `next/image`
- **성능** → 자동 코드 분할, 캐싱

React를 알고 있다면 Next.js의 학습 곡선은 높지 않습니다.
다음 챕터에서는 Next.js의 핵심인 **App Router 구조**를 살펴보겠습니다.
