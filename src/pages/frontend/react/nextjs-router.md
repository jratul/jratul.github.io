---
title: "Next.js Page Router vs App Router"
date: "2026-01-18"
tags: ["nextjs", "react", "router", "ssr", "frontend"]
excerpt: "Next.js의 두 가지 라우팅 시스템인 Page Router와 App Router의 차이점을 비교합니다."
---

# Next.js Page Router vs App Router

Next.js의 두 가지 라우팅 시스템인 Page Router와 App Router의 차이점을 비교합니다.

## 개요

```
Page Router (pages/):
- Next.js 초기부터 사용
- 안정적, 레퍼런스 많음
- 파일 기반 라우팅

App Router (app/):
- Next.js 13에서 도입
- React Server Components 기반
- 더 많은 기능, 새로운 패러다임
```

---

## 디렉토리 구조

### Page Router

```
pages/
├── index.tsx          → /
├── about.tsx          → /about
├── blog/
│   ├── index.tsx      → /blog
│   └── [slug].tsx     → /blog/:slug
├── api/
│   └── users.ts       → /api/users
├── _app.tsx           → 전역 레이아웃
├── _document.tsx      → HTML 문서
└── 404.tsx            → 404 페이지
```

---

### App Router

```
app/
├── page.tsx           → /
├── layout.tsx         → 루트 레이아웃
├── about/
│   └── page.tsx       → /about
├── blog/
│   ├── page.tsx       → /blog
│   └── [slug]/
│       └── page.tsx   → /blog/:slug
├── api/
│   └── users/
│       └── route.ts   → /api/users
├── loading.tsx        → 로딩 UI
├── error.tsx          → 에러 UI
└── not-found.tsx      → 404 페이지
```

---

## 라우팅 규칙

### Page Router

```tsx
// pages/blog/[slug].tsx
import { useRouter } from 'next/router';

export default function BlogPost() {
  const router = useRouter();
  const { slug } = router.query;

  return <div>Post: {slug}</div>;
}
```

**파일명이 곧 라우트:**
- `pages/index.tsx` → `/`
- `pages/about.tsx` → `/about`
- `pages/blog/[slug].tsx` → `/blog/:slug`

---

### App Router

```tsx
// app/blog/[slug]/page.tsx
interface Props {
  params: { slug: string };
}

export default function BlogPost({ params }: Props) {
  return <div>Post: {params.slug}</div>;
}
```

**폴더 구조가 라우트:**
- `app/page.tsx` → `/`
- `app/about/page.tsx` → `/about`
- `app/blog/[slug]/page.tsx` → `/blog/:slug`

---

## 레이아웃

### Page Router

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app';
import Layout from '../components/Layout';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
```

**특징:**
- `_app.tsx` 하나로 전역 레이아웃
- 중첩 레이아웃 구현이 복잡함

---

### App Router

```tsx
// app/layout.tsx (루트 레이아웃)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}

// app/blog/layout.tsx (중첩 레이아웃)
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="blog-container">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

**특징:**
- 폴더별 `layout.tsx`로 중첩 레이아웃
- 레이아웃은 리렌더링되지 않음 (상태 유지)

---

## 데이터 페칭

### Page Router

```tsx
// pages/posts.tsx

// SSR (서버 사이드 렌더링)
export async function getServerSideProps() {
  const res = await fetch('https://api.example.com/posts');
  const posts = await res.json();

  return {
    props: { posts },
  };
}

// SSG (정적 생성)
export async function getStaticProps() {
  const res = await fetch('https://api.example.com/posts');
  const posts = await res.json();

  return {
    props: { posts },
    revalidate: 60,  // ISR: 60초마다 재생성
  };
}

// 동적 경로 + SSG
export async function getStaticPaths() {
  const res = await fetch('https://api.example.com/posts');
  const posts = await res.json();

  const paths = posts.map((post) => ({
    params: { slug: post.slug },
  }));

  return { paths, fallback: 'blocking' };
}

export default function Posts({ posts }) {
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

---

### App Router

```tsx
// app/posts/page.tsx

// 기본: 서버 컴포넌트 (SSR과 유사)
async function getPosts() {
  const res = await fetch('https://api.example.com/posts');
  return res.json();
}

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

// 캐싱 옵션
async function getPosts() {
  // SSG와 유사 (빌드 시 캐시)
  const res = await fetch('https://api.example.com/posts', {
    cache: 'force-cache',
  });

  // SSR과 유사 (매 요청마다)
  const res = await fetch('https://api.example.com/posts', {
    cache: 'no-store',
  });

  // ISR과 유사 (60초마다 재검증)
  const res = await fetch('https://api.example.com/posts', {
    next: { revalidate: 60 },
  });

  return res.json();
}
```

---

## 서버 컴포넌트 vs 클라이언트 컴포넌트

### Page Router

```tsx
// 모든 컴포넌트가 클라이언트에서 실행
// (getServerSideProps 등은 서버에서 실행)

export default function Page() {
  const [count, setCount] = useState(0);  // OK

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

---

### App Router

```tsx
// 기본: 서버 컴포넌트
// app/page.tsx
export default async function Page() {
  const data = await fetchData();  // 서버에서 실행
  return <div>{data}</div>;
}

// 클라이언트 컴포넌트 (명시적 선언)
// app/components/Counter.tsx
'use client';

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

**서버 컴포넌트:**
- 서버에서만 실행
- DB 직접 접근 가능
- 번들 크기에 포함 안 됨
- useState, useEffect 사용 불가

**클라이언트 컴포넌트:**
- `'use client'` 선언 필요
- 브라우저에서 실행
- useState, useEffect 사용 가능
- 이벤트 핸들러 사용 가능

---

## API 라우트

### Page Router

```tsx
// pages/api/users.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    res.status(200).json({ users: [] });
  } else if (req.method === 'POST') {
    const user = req.body;
    res.status(201).json(user);
  }
}
```

---

### App Router (Route Handlers)

```tsx
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ users: [] });
}

export async function POST(request: NextRequest) {
  const user = await request.json();
  return NextResponse.json(user, { status: 201 });
}
```

---

## 로딩 & 에러 처리

### Page Router

```tsx
// 직접 구현 필요
import { useState, useEffect } from 'react';

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/data')
      .then((res) => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error!</div>;

  return <div>{data}</div>;
}
```

---

### App Router

```tsx
// app/posts/loading.tsx
export default function Loading() {
  return <div>Loading...</div>;
}

// app/posts/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}

// app/posts/page.tsx
export default async function PostsPage() {
  const posts = await getPosts();  // 로딩 중 loading.tsx 표시
  return <PostList posts={posts} />;
}
```

**특징:**
- `loading.tsx`: 자동 Suspense 경계
- `error.tsx`: 자동 에러 경계
- 파일만 만들면 자동 적용

---

## 메타데이터

### Page Router

```tsx
// pages/about.tsx
import Head from 'next/head';

export default function About() {
  return (
    <>
      <Head>
        <title>About Us</title>
        <meta name="description" content="About our company" />
      </Head>
      <div>About Page</div>
    </>
  );
}
```

---

### App Router

```tsx
// app/about/page.tsx
import type { Metadata } from 'next';

// 정적 메타데이터
export const metadata: Metadata = {
  title: 'About Us',
  description: 'About our company',
  openGraph: {
    title: 'About Us',
    description: 'About our company',
  },
};

export default function About() {
  return <div>About Page</div>;
}

// 동적 메타데이터
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPost(params.slug);

  return {
    title: post.title,
    description: post.excerpt,
  };
}
```

---

## 네비게이션

### Page Router

```tsx
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Navigation() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/about');
  };

  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <button onClick={handleClick}>Go to About</button>
    </nav>
  );
}
```

---

### App Router

```tsx
import Link from 'next/link';
import { useRouter } from 'next/navigation';  // 다른 import!

export default function Navigation() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/about');
  };

  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <button onClick={handleClick}>Go to About</button>
    </nav>
  );
}
```

**주의:** `next/router` → `next/navigation`

---

## 미들웨어

둘 다 동일하게 `middleware.ts` 사용:

```tsx
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 인증 체크
  const token = request.cookies.get('token');

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

---

## 비교 요약

| 기능 | Page Router | App Router |
|-----|-------------|------------|
| 디렉토리 | `pages/` | `app/` |
| 라우팅 | 파일 기반 | 폴더 기반 |
| 레이아웃 | `_app.tsx` | `layout.tsx` (중첩) |
| 데이터 페칭 | getServerSideProps, getStaticProps | async 컴포넌트, fetch 옵션 |
| 기본 컴포넌트 | 클라이언트 | 서버 |
| 로딩 UI | 직접 구현 | `loading.tsx` |
| 에러 UI | 직접 구현 | `error.tsx` |
| 메타데이터 | `<Head>` | `metadata` export |
| API | `pages/api/` | `app/api/route.ts` |
| 안정성 | 매우 안정 | 안정 (13.4+) |

---

## 언제 무엇을 사용?

### Page Router 선택

```
✅ 기존 프로젝트 유지보수
✅ 안정성이 최우선
✅ 레퍼런스가 많이 필요
✅ 서버 컴포넌트가 불필요
```

---

### App Router 선택

```
✅ 새 프로젝트 시작
✅ 서버 컴포넌트 활용
✅ 중첩 레이아웃 필요
✅ Streaming SSR 필요
✅ 최신 기능 사용
```

---

## 마이그레이션

```tsx
// 점진적 마이그레이션 가능
// pages/와 app/ 동시 사용

project/
├── pages/           // 기존 라우트
│   └── old-page.tsx
├── app/             // 새 라우트
│   └── new-page/
│       └── page.tsx
```

**주의:** 같은 경로는 app/가 우선

---

## 요약

1. **Page Router**: 안정적, 레퍼런스 많음, 클라이언트 컴포넌트 기본
2. **App Router**: 최신 기능, 서버 컴포넌트 기본, 중첩 레이아웃
3. **데이터 페칭**: getServerSideProps → async 컴포넌트 + fetch 옵션
4. **서버 컴포넌트**: App Router의 핵심, 번들 크기 감소
5. **로딩/에러**: App Router는 파일 기반 자동 처리
6. **선택 기준**: 새 프로젝트는 App Router, 기존 프로젝트는 Page Router 유지

**현재 권장:** 새 프로젝트는 **App Router**를 사용하세요. Next.js의 방향성이며, React Server Components의 이점을 누릴 수 있습니다.