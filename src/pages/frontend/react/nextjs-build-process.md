---
title: "Next.js 빌드 과정"
date: "2026-02-11"
tags: ["nextjs", "react", "build", "ssr", "frontend"]
excerpt: "Next.js 앱이 빌드되는 과정을 서버 컴포넌트, 정적 생성, 번들 최적화 단계별로 살펴봅니다."
---

# Next.js 빌드 과정

Next.js는 React 앱을 빌드할 때 단순 번들링을 넘어 **서버 컴포넌트 분리, 페이지별 렌더링 전략 결정, 자동 최적화**까지 수행합니다.

```
next build 실행
       ↓
┌─────────────────────────┐
│  1. 코드 컴파일          │  ← SWC (Rust 기반)
├─────────────────────────┤
│  2. 서버/클라이언트 분리  │  ← RSC 경계 분석
├─────────────────────────┤
│  3. 페이지별 렌더링      │  ← Static / Dynamic 판별
├─────────────────────────┤
│  4. 번들 최적화          │  ← 코드 스플리팅, Tree Shaking
└─────────────────────────┘
       ↓
.next/ 디렉토리 생성
```

---

## 컴파일 (SWC)

Next.js는 Babel 대신 **SWC**를 사용합니다. SWC는 Rust로 작성되어 Babel보다 훨씬 빠릅니다.

### SWC가 처리하는 것

```
JSX 변환       →  React.createElement / jsx-runtime
TypeScript     →  타입 제거
최신 JS 문법    →  하위 호환 코드로 변환
Minification   →  코드 압축
```

```tsx
// 변환 전
const Profile = ({ name }: { name: string }) => (
  <div className="profile">
    <span>{name}</span>
  </div>
);

// SWC 변환 후
const Profile = ({ name }) => (
  _jsxs("div", {
    className: "profile",
    children: _jsx("span", { children: name })
  })
);
```

---

### Babel과의 비교

| | Babel | SWC |
|---|---|---|
| 언어 | JavaScript | Rust |
| 속도 | 기준 | ~20배 빠름 |
| 설정 | .babelrc | next.config.js |
| 플러그인 | 풍부한 생태계 | 제한적 (주요 기능 내장) |

커스텀 Babel 플러그인이 필요한 경우 `.babelrc`를 추가하면 SWC 대신 Babel을 사용할 수 있지만, 빌드 속도가 느려집니다.

---

## 서버/클라이언트 컴포넌트 분리

App Router에서 Next.js는 **서버 컴포넌트(RSC)와 클라이언트 컴포넌트를 분리**하여 각각 다른 번들로 만듭니다.

### 경계 분석

```
app/
├── layout.tsx          ← 서버 컴포넌트 (기본)
├── page.tsx            ← 서버 컴포넌트 (기본)
└── components/
    ├── Header.tsx      ← 서버 컴포넌트
    ├── SearchBar.tsx   ← 'use client' → 클라이언트 컴포넌트
    └── PostList.tsx    ← 서버 컴포넌트
```

```tsx
// SearchBar.tsx
'use client';  // ← 이 지시어가 경계를 만듦

import { useState } from 'react';

export function SearchBar() {
  const [query, setQuery] = useState('');
  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

---

### 빌드 시 분리 과정

```
소스 코드 분석
      ↓
┌─────────────────────────────────────┐
│  'use client' 지시어 탐색            │
│  → 클라이언트 경계(boundary) 식별     │
└──────────┬──────────────────────────┘
           ↓
    ┌──────┴──────┐
    ↓             ↓
서버 번들      클라이언트 번들
(Node.js)     (브라우저)
```

**서버 번들:**
- 서버 컴포넌트의 렌더링 로직
- 데이터 fetching (`async` 컴포넌트)
- 브라우저로 전송되지 않음

**클라이언트 번들:**
- `'use client'` 컴포넌트와 그 하위 의존성
- React 런타임, 상태 관리, 이벤트 핸들러
- 브라우저로 전송됨

---

### RSC Payload

서버 컴포넌트의 렌더링 결과는 **RSC Payload**라는 직렬화된 형태로 클라이언트에 전달됩니다.

```
서버에서:
  서버 컴포넌트 실행 → RSC Payload 생성

RSC Payload 내용:
  - 서버 컴포넌트의 렌더링 결과 (HTML이 아닌 React 트리)
  - 클라이언트 컴포넌트가 들어갈 자리 (placeholder)
  - 클라이언트 컴포넌트에 전달할 props

클라이언트에서:
  RSC Payload + 클라이언트 번들 → 완성된 UI
```

---

## 페이지별 렌더링 전략

`next build` 실행 시 각 페이지의 렌더링 전략이 자동으로 결정됩니다.

### 빌드 출력 예시

```
Route (app)                    Size   First Load JS
┌ ○ /                          5.2 kB      89 kB
├ ○ /about                     1.8 kB      85 kB
├ ● /post/[slug]               3.4 kB      87 kB
├ λ /api/search                0 B          0 B
└ ○ /not-found                 1.2 kB      85 kB

○  Static    (정적 생성)
●  SSG       (동적 파라미터로 정적 생성)
λ  Dynamic   (서버에서 동적 렌더링)
```

---

### Static Generation (정적 생성)

빌드 시점에 HTML을 생성합니다.

```tsx
// app/about/page.tsx
// 동적 요소가 없으면 자동으로 정적 생성
export default function About() {
  return <div>About 페이지</div>;
}
```

동적 파라미터가 있는 경우 `generateStaticParams`로 경로를 지정합니다.

```tsx
// app/post/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map(post => ({ slug: post.slug }));
}

// 빌드 시 각 slug에 대해 HTML 생성
// /post/react-basics → post/react-basics.html
// /post/nextjs-guide → post/nextjs-guide.html
```

---

### Dynamic Rendering (동적 렌더링)

요청 시점에 서버에서 렌더링합니다. 다음 조건에서 자동으로 동적 렌더링으로 전환됩니다.

```tsx
// 동적 렌더링이 되는 경우

// 1. 동적 함수 사용
import { cookies, headers } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();  // 요청마다 다름 → 동적
  return <div>{cookieStore.get('theme')?.value}</div>;
}

// 2. searchParams 사용
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q: string }>;
}) {
  const { q } = await searchParams;  // 요청마다 다름 → 동적
  return <div>검색: {q}</div>;
}

// 3. 명시적 설정
export const dynamic = 'force-dynamic';
```

---

### ISR (Incremental Static Regeneration)

정적 페이지를 일정 간격으로 재생성합니다.

```tsx
// 60초마다 페이지 재생성
export const revalidate = 60;

export default async function Page() {
  const data = await fetch('https://api.example.com/posts');
  const posts = await data.json();
  return <PostList posts={posts} />;
}
```

```
첫 요청: 빌드된 정적 HTML 반환
60초 경과 후 요청:
  1. 기존 HTML 즉시 반환 (stale)
  2. 백그라운드에서 페이지 재생성
  3. 다음 요청부터 새 HTML 반환
```

---

## 번들 최적화

### 자동 코드 스플리팅

Next.js는 페이지 단위로 자동 코드 스플리팅합니다.

```
/          → page-index.js
/about     → page-about.js
/post/[id] → page-post.js

공통 모듈   → commons.js (React, 공유 컴포넌트 등)
```

사용자가 `/` 페이지에 접근하면 `page-index.js`와 `commons.js`만 로드합니다. `/about` 페이지의 코드는 해당 페이지에 접근할 때 로드됩니다.

---

### 자동 최적화 기능들

#### 이미지 최적화

```tsx
import Image from 'next/image';

// 빌드 시: 이미지 크기 분석, 메타데이터 추출
// 런타임: 요청 디바이스에 맞는 크기/포맷(WebP, AVIF)으로 변환
<Image src="/photo.jpg" width={800} height={600} alt="사진" />

// 생성되는 HTML
<img
  srcset="/_next/image?url=/photo.jpg&w=640 640w,
          /_next/image?url=/photo.jpg&w=828 828w,
          /_next/image?url=/photo.jpg&w=1080 1080w"
  sizes="(max-width: 768px) 100vw, 800px"
  loading="lazy"
/>
```

---

#### 폰트 최적화

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

// 빌드 시:
// 1. Google Fonts에서 폰트 다운로드
// 2. 셀프 호스팅 파일로 변환
// 3. CSS에 인라인 삽입
// → 외부 네트워크 요청 제거, 레이아웃 시프트 방지
```

---

#### Link 프리페칭

```tsx
import Link from 'next/link';

// 뷰포트에 보이는 Link의 대상 페이지를 미리 로드
<Link href="/about">About</Link>

// 프로덕션에서:
// 1. Link가 뷰포트에 진입
// 2. /about 페이지의 JS 청크를 prefetch
// 3. 클릭 시 즉시 전환
```

---

## 빌드 출력 구조

```
.next/
├── cache/                   ← 빌드 캐시 (증분 빌드용)
├── server/
│   ├── app/                 ← App Router 서버 번들
│   │   ├── page.js          ← / 페이지 서버 코드
│   │   ├── about/page.js
│   │   └── post/[slug]/page.js
│   ├── chunks/              ← 서버 코드 청크
│   └── app-paths-manifest.json
├── static/
│   ├── chunks/              ← 클라이언트 JS 청크
│   │   ├── app/layout-[hash].js
│   │   ├── pages/index-[hash].js
│   │   └── webpack-[hash].js
│   ├── css/                 ← CSS 번들
│   └── media/               ← 폰트, 이미지 등
├── BUILD_ID                 ← 빌드 식별자
├── build-manifest.json      ← 페이지별 필요한 에셋 매핑
└── prerender-manifest.json  ← 정적 생성된 페이지 목록
```

---

## 전체 빌드 파이프라인

```
next build
    ↓
1. 환경 설정 로드
   - next.config.js 파싱
   - 환경 변수 주입
    ↓
2. 코드 컴파일 (SWC)
   - JSX 변환
   - TypeScript 컴파일
   - 최신 문법 변환
    ↓
3. 정적 분석
   - 라우트 수집 (app/, pages/)
   - 서버/클라이언트 컴포넌트 분리
   - 미들웨어 감지
    ↓
4. 페이지별 렌더링
   - 정적 페이지: HTML 생성
   - 동적 페이지: 서버 번들만 생성
   - generateStaticParams 실행
    ↓
5. 번들 최적화
   - 코드 스플리팅
   - Tree Shaking
   - Minification
   - 에셋 해싱
    ↓
6. 출력
   - .next/ 디렉토리 생성
   - 매니페스트 파일 생성
   - 빌드 통계 출력
```

---

## Turbopack (베타)

Next.js 14+에서는 Webpack 대신 **Turbopack**을 사용할 수 있습니다. Turbopack도 Rust로 작성되었습니다.

```bash
# 개발 서버에서 Turbopack 사용
next dev --turbopack
```

```
Webpack:
  파일 변경 → 관련 모듈 그래프 재계산 → 번들 재생성

Turbopack:
  파일 변경 → 변경된 함수 단위만 재계산 (함수 레벨 캐싱)
```

Turbopack은 증분 계산 엔진을 사용하여 변경된 부분만 다시 처리합니다. 프로젝트 규모가 클수록 Webpack 대비 이점이 커집니다.

---

## React 빌드와의 차이

| | React (Vite) | Next.js |
|---|---|---|
| 빌드 결과 | 정적 파일 (HTML, JS, CSS) | 서버 코드 + 정적 파일 |
| 렌더링 | CSR (클라이언트) | SSR + SSG + CSR |
| 코드 스플리팅 | 수동 (`lazy()`) | 자동 (페이지 단위) |
| 컴파일러 | esbuild | SWC |
| 이미지 최적화 | 별도 설정 필요 | 내장 (`next/image`) |
| 폰트 최적화 | 수동 | 내장 (`next/font`) |

---

## 요약

- **SWC**: Rust 기반 컴파일러로 JSX/TS 변환 및 코드 압축
- **RSC 분리**: 서버 컴포넌트와 클라이언트 컴포넌트를 별도 번들로 분리
- **렌더링 전략**: 페이지별로 Static / Dynamic / ISR을 자동 판별
- **자동 최적화**: 코드 스플리팅, 이미지, 폰트, 프리페칭이 기본 제공
- **Turbopack**: 함수 레벨 캐싱으로 대규모 프로젝트에서 빠른 빌드 제공
