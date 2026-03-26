---
title: "파일 기반 라우팅"
order: 3
---

# 파일 기반 라우팅

## 파일 기반 라우팅이란?

React에서는 URL 경로를 직접 코드로 설정했습니다.

```tsx
// React + React Router 방식 — 코드로 라우팅 설정
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:id" element={<BlogDetailPage />} />
        {/* 페이지가 늘어날수록 이 파일이 길어짐 */}
      </Routes>
    </BrowserRouter>
  );
}
```

Next.js에서는 **폴더와 파일의 위치가 곧 URL**입니다.

```
app/page.tsx          → /
app/about/page.tsx    → /about
app/blog/page.tsx     → /blog
app/blog/[id]/page.tsx → /blog/123, /blog/456, ...
```

별도의 라우팅 설정 파일이 필요 없습니다.

---

## 정적 라우팅

가장 기본적인 형태입니다. 폴더 이름이 URL 경로가 됩니다.

```
app/
├── page.tsx                → /
├── about/
│   └── page.tsx            → /about
├── contact/
│   └── page.tsx            → /contact
└── blog/
    └── page.tsx            → /blog
```

```tsx
// app/about/page.tsx
export default function AboutPage() {
  return (
    <div>
      <h1>소개</h1>
      <p>안녕하세요, 개발자 블로그입니다.</p>
    </div>
  );
}
```

---

## 동적 라우팅 — `[param]`

URL의 일부가 변수인 경우에 사용합니다.
블로그 포스트 ID, 사용자 이름 등이 여기에 해당합니다.

```
app/
└── blog/
    └── [id]/
        └── page.tsx   → /blog/1, /blog/2, /blog/hello-world, ...
```

```tsx
// app/blog/[id]/page.tsx
// params에 URL 파라미터가 담겨 옵니다
export default async function BlogPost({
  params,
}: {
  params: { id: string }; // URL의 [id] 부분
}) {
  const { id } = params;

  // 서버에서 직접 데이터 조회
  const post = await fetch(`https://api.example.com/posts/${id}`).then(r =>
    r.json()
  );

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

### 여러 동적 세그먼트

```
app/
└── shop/
    └── [category]/
        └── [productId]/
            └── page.tsx  → /shop/clothes/shirt-001
```

```tsx
// app/shop/[category]/[productId]/page.tsx
export default function ProductPage({
  params,
}: {
  params: {
    category: string; // "clothes"
    productId: string; // "shirt-001"
  };
}) {
  return (
    <div>
      <p>카테고리: {params.category}</p>
      <p>상품 ID: {params.productId}</p>
    </div>
  );
}
```

---

## Catch-all 라우팅 — `[...param]`

폴더 깊이에 상관없이 모든 경로를 캐치합니다.

```
app/
└── docs/
    └── [...slug]/
        └── page.tsx
```

```
/docs/intro                → slug = ['intro']
/docs/getting-started      → slug = ['getting-started']
/docs/guide/installation   → slug = ['guide', 'installation']
/docs/guide/setup/windows  → slug = ['guide', 'setup', 'windows']
```

```tsx
// app/docs/[...slug]/page.tsx
export default function DocsPage({
  params,
}: {
  params: { slug: string[] }; // 경로 세그먼트 배열
}) {
  // /docs/guide/installation → ['guide', 'installation']
  const path = params.slug.join('/');

  return (
    <div>
      <p>현재 경로: {path}</p>
    </div>
  );
}
```

### Optional Catch-all — `[[...param]]`

기본 경로(`/docs`)도 함께 처리하고 싶을 때 사용합니다.

```
app/
└── docs/
    └── [[...slug]]/
        └── page.tsx
```

```
/docs          → slug = undefined (파라미터 없음)
/docs/intro    → slug = ['intro']
/docs/guide/setup → slug = ['guide', 'setup']
```

---

## 페이지 이동 — `Link` 컴포넌트

React에서 `<a>` 태그를 사용하면 페이지 전체가 새로고침됩니다.
Next.js에서는 `Link` 컴포넌트를 사용합니다.

```tsx
import Link from 'next/link';

export default function Navigation() {
  return (
    <nav>
      {/* 일반 링크 */}
      <Link href="/">홈</Link>
      <Link href="/about">소개</Link>
      <Link href="/blog">블로그</Link>

      {/* 동적 링크 */}
      <Link href={`/blog/${post.id}`}>{post.title}</Link>

      {/* 객체 형태로도 사용 가능 */}
      <Link
        href={{
          pathname: '/blog/[id]',
          query: { id: post.id },
        }}
      >
        {post.title}
      </Link>
    </nav>
  );
}
```

### Link와 `<a>`의 차이

```tsx
// 잘못된 방식 — 페이지 전체 새로고침 발생
<a href="/about">소개</a>

// 올바른 방식 — SPA처럼 페이지 일부만 교체
<Link href="/about">소개</Link>
```

### 미리 불러오기 (Prefetching)

`Link` 컴포넌트는 뷰포트에 들어오면 해당 페이지를 **미리 불러옵니다**.
클릭하는 순간 이미 데이터가 준비되어 있어 즉시 화면이 전환됩니다.

```tsx
{/* prefetch를 비활성화하고 싶은 경우 */}
<Link href="/heavy-page" prefetch={false}>
  무거운 페이지
</Link>
```

---

## 프로그래밍 방식 이동 — `useRouter`

버튼 클릭, 폼 제출 후 이동 등 이벤트 핸들러 안에서 이동할 때 사용합니다.

```tsx
'use client'; // useRouter는 클라이언트 컴포넌트에서만 사용 가능

import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const success = await login(/* 로그인 처리 */);

    if (success) {
      router.push('/dashboard');    // 이동 (히스토리에 추가)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 폼 내용 */}
      <button type="submit">로그인</button>
    </form>
  );
}
```

### router 메서드

```tsx
const router = useRouter();

router.push('/about');       // 이동 (뒤로가기 가능)
router.replace('/about');    // 이동 (현재 히스토리 교체, 뒤로가기 불가)
router.back();               // 뒤로 가기
router.forward();            // 앞으로 가기
router.refresh();            // 현재 페이지 서버 데이터 새로고침
```

---

## 현재 경로 확인 — `usePathname`, `useSearchParams`

```tsx
'use client';

import { usePathname, useSearchParams } from 'next/navigation';

export default function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname(); // 현재 URL 경로 ("/blog")
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      // 현재 페이지이면 활성화 스타일 적용
      className={isActive ? 'font-bold text-blue-600' : 'text-gray-600'}
    >
      {label}
    </Link>
  );
}
```

```tsx
'use client';

import { useSearchParams } from 'next/navigation';

export default function SearchPage() {
  // URL: /search?q=nextjs&page=2
  const searchParams = useSearchParams();
  const query = searchParams.get('q');    // "nextjs"
  const page = searchParams.get('page'); // "2"

  return (
    <div>
      <p>검색어: {query}</p>
      <p>페이지: {page}</p>
    </div>
  );
}
```

---

## URL 파라미터 업데이트

```tsx
'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleCategoryChange(category: string) {
    // 기존 쿼리스트링 복사
    const params = new URLSearchParams(searchParams.toString());
    params.set('category', category);
    params.set('page', '1'); // 카테고리 변경 시 첫 페이지로

    // URL 업데이트 (페이지 이동 없이)
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <button onClick={() => handleCategoryChange('react')}>React</button>
      <button onClick={() => handleCategoryChange('nextjs')}>Next.js</button>
    </div>
  );
}
```

---

## 리다이렉트

### 서버 컴포넌트에서 리다이렉트

```tsx
import { redirect } from 'next/navigation';

async function ProtectedPage() {
  const user = await getUser();

  // 로그인하지 않은 경우 로그인 페이지로 이동
  if (!user) {
    redirect('/login');
  }

  return <div>보호된 페이지</div>;
}
```

### `next.config.js`에서 리다이렉트 설정

```js
// next.config.js
module.exports = {
  async redirects() {
    return [
      {
        source: '/old-blog/:id',  // 기존 URL
        destination: '/blog/:id', // 새 URL
        permanent: true,          // 301 리다이렉트 (영구)
      },
      {
        source: '/temp-page',
        destination: '/new-page',
        permanent: false,         // 302 리다이렉트 (임시)
      },
    ];
  },
};
```

---

## Middleware — 모든 요청을 가로채기

미들웨어는 요청이 처리되기 전에 실행됩니다.
인증 확인, A/B 테스트, 로케일 처리 등에 활용합니다.

```tsx
// middleware.ts (app/ 폴더와 같은 레벨 또는 src/ 안에)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  // /dashboard로 시작하는 경로는 인증 필요
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!token) {
      // 로그인 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 요청을 계속 진행
  return NextResponse.next();
}

// 미들웨어를 적용할 경로 설정
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
```

---

## 실전 예제: 블로그 라우팅 구조

```
app/
├── layout.tsx               # 전체 레이아웃 (헤더, 푸터)
├── page.tsx                 # 홈 (/) — 최신 포스트 목록
├── (auth)/                  # 인증 관련 (URL에 미포함)
│   ├── layout.tsx           # 인증 페이지 전용 레이아웃
│   ├── login/
│   │   └── page.tsx         # /login
│   └── signup/
│       └── page.tsx         # /signup
├── blog/
│   ├── layout.tsx           # 블로그 레이아웃 (사이드바)
│   ├── page.tsx             # /blog — 포스트 목록
│   └── [slug]/
│       ├── page.tsx         # /blog/hello-world
│       └── not-found.tsx    # 포스트 없을 때 404
├── tag/
│   └── [tag]/
│       └── page.tsx         # /tag/react, /tag/nextjs
└── api/
    └── posts/
        └── route.ts         # /api/posts API
```

---

## 흔한 실수

### 실수 1: `page.tsx` 없이 폴더만 만들기

```
app/
└── about/        ← page.tsx가 없으면 /about 접근 불가
    └── team/
        └── page.tsx  ← /about/team만 접근 가능
```

폴더를 만들었다고 자동으로 라우팅되지 않습니다. 반드시 `page.tsx`가 있어야 합니다.

### 실수 2: `useRouter`를 서버 컴포넌트에서 사용

```tsx
// 잘못된 코드 — 서버 컴포넌트에서 useRouter 사용
import { useRouter } from 'next/navigation'; // ❌

export default function Page() {
  const router = useRouter(); // 에러!
  // ...
}
```

```tsx
// 올바른 코드 — 'use client' 추가
'use client';

import { useRouter } from 'next/navigation'; // ✅

export default function Page() {
  const router = useRouter();
  // ...
}
```

### 실수 3: `next/router` vs `next/navigation`

```tsx
// Pages Router용 (구 버전)
import { useRouter } from 'next/router'; // ❌ App Router에서 사용 불가

// App Router용 (새 버전)
import { useRouter } from 'next/navigation'; // ✅
```

---

## 정리

- **폴더 구조 = URL 구조** (직관적, 라우팅 설정 파일 불필요)
- **동적 라우팅**: `[param]`, `[...param]`, `[[...param]]`
- **페이지 이동**: `Link` 컴포넌트 (자동 prefetch)
- **프로그래밍 이동**: `useRouter` (클라이언트 컴포넌트에서만)
- **현재 경로 확인**: `usePathname`, `useSearchParams`
- **미들웨어**: 요청 전처리 (인증, 리다이렉트 등)

다음 챕터에서는 Next.js의 가장 핵심적인 개념인 **서버 컴포넌트와 클라이언트 컴포넌트**를 알아보겠습니다.
