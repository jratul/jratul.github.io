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

## 왜 Next.js를 쓰는가? — 구체적인 문제와 해결책

### 문제 1: SEO (검색 엔진 최적화)

순수 React 앱은 처음에 빈 HTML을 보냅니다.
구글 크롤러가 페이지를 방문하면 아무 내용도 없어 보입니다.

```html
<!-- 구글 크롤러가 보는 React 앱의 초기 HTML -->
<html>
  <body>
    <div id="root"></div>  <!-- 텅 비어 있음 -->
    <script src="/main.js"></script>
  </body>
</html>
```

Next.js는 서버에서 HTML을 완성해서 보냅니다.
크롤러가 방문하면 이미 내용이 채워진 HTML을 봅니다.

```html
<!-- 구글 크롤러가 보는 Next.js 앱의 초기 HTML -->
<html>
  <body>
    <div id="root">
      <h1>상품 목록</h1>
      <ul>
        <li>상품 A - 10,000원</li>
        <li>상품 B - 20,000원</li>
      </ul>
    </div>
  </body>
</html>
```

검색 엔진이 내용을 읽을 수 있으니 검색 결과에 잘 노출됩니다.

### 문제 2: 초기 로딩 속도

React SPA는 JS 파일이 다운로드되고 실행되기 전까지 화면이 비어 있습니다.
이 시간이 길수록 사용자 경험이 나빠집니다.

```
React (CSR) 로딩 타임라인:
0ms   → 브라우저가 빈 HTML 수신
200ms → JS 파일 다운로드 시작
800ms → JS 파일 다운로드 완료
900ms → React 실행, API 호출
1200ms → 데이터 수신, 화면 렌더링
         ↑ 사용자가 처음으로 내용을 봄

Next.js (SSR) 로딩 타임라인:
0ms   → 브라우저가 요청
300ms → 서버가 데이터 조회 + HTML 생성 완료
300ms → 완성된 HTML 수신 → 즉시 화면 표시
         ↑ 사용자가 처음으로 내용을 봄 (900ms 빠름)
500ms → JS 로드 완료, 인터랙션 활성화
```

특히 모바일이나 인터넷이 느린 환경에서 차이가 큽니다.

### 문제 3: API 통합

React만 쓰면 프론트엔드와 백엔드가 완전히 분리됩니다.
로그인 처리, DB 조회 등을 위한 별도 서버가 필요합니다.

```
React만 사용:
[브라우저] ←→ [React 앱] ←→ [Express/Fastify 서버] ←→ [데이터베이스]
                              ↑ 별도 프로젝트 필요

Next.js 사용:
[브라우저] ←→ [Next.js] ←→ [데이터베이스]
              ↑ 프론트엔드 + API 서버가 하나의 프로젝트
```

Next.js의 Route Handlers를 쓰면 같은 프로젝트 안에서 API를 만들 수 있습니다.

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

### CSR (클라이언트 사이드 렌더링)

> 순수 React의 방식. Next.js에서도 사용 가능합니다.

```
[사용자 브라우저]                    [서버]
      │                                │
      │── GET /products ──────────────▶│
      │                                │
      │◀─ 빈 HTML + JS 번들 ──────────│
      │                                │
      │ (JS 실행 중... 빈 화면)        │
      │                                │
      │── GET /api/products ──────────▶│
      │◀─ JSON 데이터 ────────────────│
      │                                │
      │ (React가 화면 그리기)          │
      │                                │
  [화면 표시]                          │
```

적합한 경우: 로그인 후 대시보드, 실시간 업데이트가 필요한 페이지

### SSR (서버 사이드 렌더링)

> 음식점 비유: **주문을 받으면 그때그때 새로 만들어 주는 음식**

사용자가 페이지를 요청할 때마다 서버에서 HTML을 만들어 전송합니다.

```
[사용자 브라우저]                    [서버]                [데이터베이스]
      │                                │                         │
      │── GET /products ──────────────▶│                         │
      │                                │── SELECT * FROM ... ───▶│
      │                                │◀─ 데이터 ───────────────│
      │                                │ (HTML 생성 중...)        │
      │◀─ 완성된 HTML ────────────────│                         │
      │                                │                         │
  [즉시 화면 표시]                     │                         │
      │                                │                         │
      │ (JS 로드 후 인터랙션 활성화)   │                         │
```

적합한 경우: 상품 상세 페이지, 로그인한 사용자마다 다른 내용, 실시간 데이터

### SSG (정적 사이트 생성)

> 음식점 비유: **미리 만들어둔 도시락**

빌드할 때 미리 HTML을 모두 만들어 둡니다.
사용자 요청 시 미리 만들어진 파일을 즉시 전달합니다.

```
빌드 타임 (배포 전 한 번):
[빌드 서버] → 모든 페이지 HTML 생성 → [CDN/파일 서버]

런타임 (사용자 요청 시):
[사용자 브라우저]                    [CDN]
      │                                │
      │── GET /blog/react-intro ───────▶│
      │◀─ 미리 만들어진 HTML ──────────│
      │                                │
  [즉시 화면 표시, 매우 빠름]          │
```

블로그, 문서 사이트처럼 내용이 자주 바뀌지 않는 곳에 적합합니다.

### ISR (증분 정적 재생성)

SSG의 단점(내용 업데이트가 느림)을 보완한 방식입니다.
일정 시간마다 백그라운드에서 페이지를 재생성합니다.

```
최초 요청:
사용자 → 캐시된 HTML 전달 (빠름)
         → 백그라운드에서 페이지 재생성 시작

1시간 후:
사용자 → 새로 생성된 HTML 전달 (업데이트됨)
```

적합한 경우: 자주 바뀌지는 않지만 최신 상태를 유지해야 하는 뉴스, 상품 목록

### 렌더링 방식 선택 기준

```
내용이 모든 사용자에게 동일하고
자주 바뀌지 않는가?
     ↓ Yes              ↓ No
    SSG          사용자마다 내용이 다른가?
                      ↓ Yes              ↓ No
                     SSR          실시간 업데이트가
                                  필요한가?
                                       ↓ Yes    ↓ No
                                      CSR       ISR
```

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
| 학습 곡선 | 낮음 | 중간 (React 알면 빠름) |
| 적합한 프로젝트 | 내부 도구, SPA | 공개 웹사이트, 풀스택 앱 |

---

## Pages Router vs App Router

Next.js에는 두 가지 라우팅 방식이 있습니다.
처음 접하면 헷갈릴 수 있으므로 차이를 명확히 알아두는 것이 중요합니다.

### Pages Router (구 방식, Next.js 12 이하)

```
pages/
├── index.tsx        → /
├── about.tsx        → /about
├── blog/
│   ├── index.tsx    → /blog
│   └── [slug].tsx   → /blog/어떤-글이든
└── api/
    └── posts.ts     → /api/posts (API 엔드포인트)
```

특징:
- `pages/` 폴더 안의 파일이 곧 라우트
- `getServerSideProps`, `getStaticProps` 함수로 데이터 패칭
- `useEffect` + `useState` 등 React Hook은 자유롭게 사용 가능

```tsx
// pages/blog/[slug].tsx — Pages Router 방식
export async function getServerSideProps(context) {
  const { slug } = context.params;
  const post = await fetchPost(slug); // 서버에서 데이터 조회
  return { props: { post } };
}

export default function BlogPost({ post }) {
  return <article><h1>{post.title}</h1></article>;
}
```

### App Router (신 방식, Next.js 13+, 현재 권장)

```
src/app/
├── page.tsx              → /
├── about/
│   └── page.tsx          → /about
├── blog/
│   ├── page.tsx          → /blog
│   └── [slug]/
│       └── page.tsx      → /blog/어떤-글이든
└── api/
    └── posts/
        └── route.ts      → /api/posts (API 엔드포인트)
```

특징:
- `app/` 폴더 안에 `page.tsx` 파일이 라우트를 만듦
- 컴포넌트가 **기본적으로 서버 컴포넌트** (useState 불가)
- 클라이언트 기능이 필요하면 `'use client'` 선언 필요
- `async/await`로 직접 데이터 패칭 (더 간단)

```tsx
// src/app/blog/[slug]/page.tsx — App Router 방식
// async 함수로 서버에서 직접 데이터 조회
export default async function BlogPost({ params }) {
  const post = await fetchPost(params.slug); // getServerSideProps 없이 직접
  return <article><h1>{post.title}</h1></article>;
}
```

### 어떤 것을 배워야 하나?

```
새 프로젝트 시작? → App Router 사용 (Next.js 공식 권장)
기존 프로젝트 유지보수? → 해당 프로젝트의 방식을 따름
```

이 학습 시리즈는 **App Router** 기준으로 설명합니다.

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

각 선택지가 무엇을 하는지:

- **TypeScript**: 타입 안전성 — 실수를 미리 잡아줌. 강력 권장
- **ESLint**: 코드 문제를 자동으로 감지하는 도구
- **Tailwind CSS**: 유틸리티 클래스 기반 CSS 프레임워크
- **src/ directory**: 소스 코드를 `src/` 폴더 안에 정리 (권장)
- **App Router**: 최신 라우팅 방식 (Pages Router보다 권장)
- **import alias**: `../../components/Button` 대신 `@/components/Button`으로 임포트

### 생성된 폴더 구조

```
my-app/
├── src/
│   └── app/                  # App Router의 핵심 폴더
│       ├── layout.tsx         # 전체 페이지를 감싸는 공통 레이아웃
│       ├── page.tsx           # 홈 페이지 (/) 내용
│       ├── globals.css        # 전역 CSS 스타일
│       └── favicon.ico        # 브라우저 탭 아이콘
├── public/                    # 정적 파일 (이미지, 폰트 등)
│   └── next.svg               # 예시 이미지
├── next.config.js             # Next.js 설정 파일
├── tailwind.config.ts         # Tailwind CSS 설정 (Tailwind 선택 시)
├── tsconfig.json              # TypeScript 설정
└── package.json               # 의존성 및 스크립트
```

각 파일/폴더의 역할:

- **`src/app/`**: 모든 페이지와 레이아웃이 여기에 위치합니다. 폴더 구조가 곧 URL 구조입니다.
- **`src/app/layout.tsx`**: 모든 페이지를 감싸는 공통 HTML 껍데기. `<html>`, `<body` 태그를 여기서 설정합니다.
- **`src/app/page.tsx`**: `/` 경로에 해당하는 홈 페이지입니다.
- **`public/`**: 이미지, 폰트 등 정적 파일을 넣는 폴더. `/image.png`처럼 직접 URL로 접근 가능합니다.
- **`next.config.js`**: Next.js의 동작을 커스터마이징하는 설정 파일입니다.

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
    "dev": "next dev",        // 개발 서버 (핫 리로드 — 코드 변경 시 즉시 반영)
    "build": "next build",    // 프로덕션 빌드 (배포용 최적화)
    "start": "next start",    // 프로덕션 서버 실행 (build 이후에 사용)
    "lint": "next lint"       // ESLint 코드 품질 검사
  }
}
```

개발 중에는 `npm run dev`만 씁니다.
배포 시에는 `npm run build` → `npm run start` 순서로 실행합니다.

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

함수 이름은 아무거나 써도 되지만, `export default`가 중요합니다.
Next.js는 `page.tsx`에서 `export default`된 컴포넌트를 해당 경로의 페이지로 사용합니다.

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

`children`에 각 페이지의 내용이 자동으로 들어갑니다.
헤더, 푸터, 네비게이션처럼 모든 페이지에 공통으로 들어가는 UI는 여기에 넣으면 됩니다.

```tsx
// 헤더와 푸터를 포함한 레이아웃 예시
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <header>내 블로그</header>
        <main>{children}</main>          {/* 각 페이지 내용 */}
        <footer>© 2025</footer>
      </body>
    </html>
  );
}
```

### 새 페이지 추가하기

`/about` 경로의 페이지를 만들려면:

```
src/app/about/page.tsx 파일을 생성
```

```tsx
// src/app/about/page.tsx
export default function About() {
  return (
    <div>
      <h1>소개 페이지</h1>
      <p>안녕하세요, 저는 개발자입니다.</p>
    </div>
  );
}
```

파일을 저장하면 `http://localhost:3000/about`에서 바로 확인할 수 있습니다.
React Router처럼 별도의 라우트 설정이 필요 없습니다.

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

서버 컴포넌트의 장점:
- `useState`, `useEffect` 없이 데이터를 바로 가져올 수 있음
- API 키 같은 비밀 정보가 브라우저에 노출되지 않음
- 데이터를 서버에서 가져와 완성된 HTML을 전송하므로 초기 로딩이 빠름

### 2. `useState`, `useEffect`를 쓰려면 `'use client'` 필요

```tsx
'use client'; // 이 선언이 있어야 React Hook 사용 가능

import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0); // 클라이언트에서만 동작

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

`'use client'`를 파일 맨 위에 선언하면 그 파일의 컴포넌트는 브라우저에서 실행됩니다.
클릭 이벤트, 입력 처리, 애니메이션 등 사용자 인터랙션이 필요한 컴포넌트에 씁니다.

```
서버 컴포넌트 (기본):
- 데이터 조회 (DB, API)
- 민감한 정보 처리
- SEO가 중요한 콘텐츠
- useState, useEffect 사용 불가

클라이언트 컴포넌트 ('use client'):
- 사용자 이벤트 처리 (클릭, 입력)
- 브라우저 API 사용 (localStorage 등)
- useState, useEffect 사용 가능
- 애니메이션, 실시간 업데이트
```

---

## 자주 하는 실수

### 실수 1: 서버 컴포넌트에서 useState 사용

```tsx
// 틀린 코드 — 서버 컴포넌트에서 useState 사용
// 에러: "useState can only be used in Client Components"
import { useState } from 'react';

export default function Page() {  // 'use client' 없음
  const [count, setCount] = useState(0);  // 에러 발생!
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

```tsx
// 올바른 코드 — 'use client' 추가
'use client';

import { useState } from 'react';

export default function Page() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### 실수 2: 서버 컴포넌트와 클라이언트 컴포넌트를 섞는 방법 오해

페이지 전체에 `'use client'`를 붙이면 서버 컴포넌트의 이점을 잃습니다.
인터랙션이 필요한 부분만 분리해서 클라이언트 컴포넌트로 만드는 것이 좋습니다.

```tsx
// 비권장: 페이지 전체를 클라이언트 컴포넌트로
'use client';

export default function Page() {
  const [liked, setLiked] = useState(false);
  // 이 페이지의 모든 내용이 클라이언트에서 렌더링됨 — SSR 이점 없음
  return (
    <div>
      <h1>게시글 제목</h1>       {/* 이건 서버에서 렌더링해도 됨 */}
      <p>긴 본문 내용...</p>     {/* 이것도 서버에서 렌더링해도 됨 */}
      <button onClick={() => setLiked(!liked)}>좋아요</button>  {/* 이것만 클라이언트 필요 */}
    </div>
  );
}
```

```tsx
// 권장: 인터랙션 부분만 분리
// components/LikeButton.tsx
'use client';
export function LikeButton() {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>좋아요</button>;
}

// app/post/page.tsx — 서버 컴포넌트
import { LikeButton } from '@/components/LikeButton';

export default async function PostPage() {
  const post = await fetchPost();  // 서버에서 데이터 조회
  return (
    <div>
      <h1>{post.title}</h1>        {/* 서버에서 렌더링 */}
      <p>{post.content}</p>        {/* 서버에서 렌더링 */}
      <LikeButton />               {/* 클라이언트에서 렌더링 */}
    </div>
  );
}
```

### 실수 3: `next/link` 대신 `<a>` 태그 사용

```tsx
// 틀린 코드 — 일반 <a> 태그
<a href="/about">소개 페이지</a>
// 클릭하면 전체 페이지가 새로고침됨 (SPA의 장점 없음)

// 올바른 코드 — next/link
import Link from 'next/link';
<Link href="/about">소개 페이지</Link>
// 클릭해도 페이지 새로고침 없이 부드럽게 전환
```

### 실수 4: 이미지를 `<img>` 태그로 사용

```tsx
// 틀린 코드 — 일반 <img> 태그
<img src="/hero.jpg" alt="히어로 이미지" />
// 자동 최적화 없음, 느린 로딩

// 올바른 코드 — next/image
import Image from 'next/image';
<Image src="/hero.jpg" alt="히어로 이미지" width={800} height={600} />
// 자동으로 WebP 변환, 지연 로딩, 크기 최적화
```

---

## 정리

Next.js는 React의 기능을 그대로 사용하면서, 프로덕션 앱 개발에 필요한 기능들을 추가로 제공합니다.

- **SEO 문제** → 서버에서 HTML 생성 (SSR/SSG)
- **느린 초기 로딩** → 완성된 HTML을 바로 전달
- **라우팅 설정** → 파일 기반 라우팅 (폴더 = URL)
- **API 서버** → Route Handlers 내장
- **이미지 최적화** → `next/image`
- **성능** → 자동 코드 분할, 캐싱

React를 알고 있다면 Next.js의 학습 곡선은 높지 않습니다.
가장 중요한 변화는 **서버 컴포넌트** 개념이며, `'use client'` 규칙만 잘 이해하면
나머지는 React와 거의 동일합니다.

다음 챕터에서는 Next.js의 핵심인 **App Router 구조**를 살펴보겠습니다.
