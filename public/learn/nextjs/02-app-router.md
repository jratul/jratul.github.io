---
title: "App Router 구조"
order: 2
---

# App Router 구조

## App Router란?

Next.js 13에서 새롭게 도입된 라우팅 시스템입니다.
기존의 `pages/` 디렉토리 방식(Pages Router)을 대체하며, 더 강력한 기능을 제공합니다.

> 집 비유: **Pages Router는 각 방이 독립된 원룸**, **App Router는 공용 공간(거실, 주방)과 개인 공간(방)이 구분된 아파트**입니다.

Next.js 공식 문서도 새 프로젝트에는 App Router를 권장합니다.

---

## 폴더 구조 비교

### Pages Router (구 방식)

```
pages/
├── index.tsx          # → /
├── about.tsx          # → /about
├── blog/
│   ├── index.tsx      # → /blog
│   └── [id].tsx       # → /blog/123
└── _app.tsx           # 공통 레이아웃 (단 하나만 가능)
```

### App Router (새 방식)

```
app/
├── layout.tsx         # 루트 레이아웃 (필수)
├── page.tsx           # → /
├── about/
│   └── page.tsx       # → /about
├── blog/
│   ├── layout.tsx     # /blog 하위 공통 레이아웃
│   ├── page.tsx       # → /blog
│   └── [id]/
│       └── page.tsx   # → /blog/123
└── globals.css
```

가장 큰 차이점: App Router는 **각 경로마다 레이아웃을 중첩**할 수 있습니다.

---

## 핵심 파일들

App Router에서 특별한 의미를 갖는 파일명들이 있습니다.

| 파일명 | 역할 |
|--------|------|
| `page.tsx` | URL에 대응하는 페이지 컴포넌트 |
| `layout.tsx` | 해당 경로와 하위 경로의 공통 레이아웃 |
| `loading.tsx` | 로딩 중에 표시할 UI |
| `error.tsx` | 에러 발생 시 표시할 UI |
| `not-found.tsx` | 404 페이지 |
| `route.ts` | API 엔드포인트 (Route Handler) |
| `template.tsx` | 레이아웃과 비슷하지만 매 이동마다 새로 마운트 |

---

## `page.tsx` — 페이지 컴포넌트

`page.tsx`는 특정 URL에 접근했을 때 보여주는 컴포넌트입니다.

```tsx
// app/page.tsx → "/"에 접근하면 보이는 페이지
export default function HomePage() {
  return (
    <div>
      <h1>홈 페이지</h1>
      <p>Next.js App Router에 오신 것을 환영합니다.</p>
    </div>
  );
}
```

```tsx
// app/about/page.tsx → "/about"에 접근하면 보이는 페이지
export default function AboutPage() {
  return (
    <div>
      <h1>소개 페이지</h1>
    </div>
  );
}
```

---

## `layout.tsx` — 레이아웃 컴포넌트

레이아웃은 여러 페이지에서 **공통으로 사용하는 UI**입니다.
헤더, 네비게이션, 사이드바 등이 여기 들어갑니다.

### 루트 레이아웃 (필수)

```tsx
// app/layout.tsx — 모든 페이지를 감싸는 최상위 레이아웃
import type { Metadata } from 'next';

// 메타데이터도 layout에서 설정
export const metadata: Metadata = {
  title: '내 블로그',
  description: '개발 이야기를 씁니다',
};

export default function RootLayout({
  children,                    // 현재 활성 페이지 컴포넌트
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <header>
          <nav>헤더 네비게이션</nav>  {/* 모든 페이지에서 보임 */}
        </header>

        <main>{children}</main>     {/* 각 페이지 내용 */}

        <footer>푸터</footer>        {/* 모든 페이지에서 보임 */}
      </body>
    </html>
  );
}
```

### 중첩 레이아웃

```tsx
// app/blog/layout.tsx — /blog 하위 경로에만 적용되는 레이아웃
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex' }}>
      {/* 블로그 섹션의 사이드바 */}
      <aside>
        <h3>카테고리</h3>
        <ul>
          <li>JavaScript</li>
          <li>React</li>
          <li>Next.js</li>
        </ul>
      </aside>

      {/* 블로그 포스트 내용 */}
      <div>{children}</div>
    </div>
  );
}
```

레이아웃이 중첩되는 모습:

```
RootLayout (app/layout.tsx)
  └── BlogLayout (app/blog/layout.tsx)
        └── BlogDetailPage (app/blog/[id]/page.tsx)
```

실제로 화면에 렌더링되는 구조:

```html
<!-- RootLayout이 제공하는 HTML -->
<html>
  <body>
    <header>헤더</header>
    <main>
      <!-- BlogLayout이 제공하는 HTML -->
      <aside>카테고리 사이드바</aside>
      <div>
        <!-- BlogDetailPage 내용 -->
        <h1>포스트 제목</h1>
        <p>내용...</p>
      </div>
    </main>
    <footer>푸터</footer>
  </body>
</html>
```

---

## `loading.tsx` — 로딩 UI

페이지 데이터를 불러오는 동안 보여줄 UI입니다.
Next.js가 자동으로 Suspense로 감싸줍니다.

```tsx
// app/blog/loading.tsx
export default function BlogLoading() {
  return (
    <div>
      {/* 스켈레톤 UI */}
      <div className="skeleton-title" />
      <div className="skeleton-content" />
      <div className="skeleton-content" />
    </div>
  );
}
```

React에서는 직접 `Suspense`로 감싸야 했습니다:

```tsx
// React 방식 - 직접 Suspense 사용
<Suspense fallback={<LoadingSpinner />}>
  <BlogList />
</Suspense>
```

Next.js에서는 `loading.tsx` 파일 하나로 해결됩니다.

---

## `error.tsx` — 에러 UI

예상치 못한 에러가 발생했을 때 보여줄 UI입니다.
React의 Error Boundary 역할을 합니다.

```tsx
'use client'; // error.tsx는 반드시 클라이언트 컴포넌트

import { useEffect } from 'react';

export default function BlogError({
  error,   // 발생한 에러 객체
  reset,   // 페이지를 다시 시도하는 함수
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 에러 로깅 서비스에 기록
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>문제가 발생했습니다</h2>
      <p>{error.message}</p>
      <button onClick={reset}>다시 시도</button>
    </div>
  );
}
```

---

## `not-found.tsx` — 404 페이지

존재하지 않는 경로에 접근하거나, `notFound()` 함수를 호출하면 표시됩니다.

```tsx
// app/not-found.tsx — 전역 404 페이지
import Link from 'next/link';

export default function NotFound() {
  return (
    <div>
      <h2>페이지를 찾을 수 없습니다</h2>
      <p>요청하신 페이지가 존재하지 않습니다.</p>
      <Link href="/">홈으로 돌아가기</Link>
    </div>
  );
}
```

```tsx
// app/blog/[id]/page.tsx — 특정 포스트가 없을 때 404로 이동
import { notFound } from 'next/navigation';

async function BlogPost({ params }: { params: { id: string } }) {
  const post = await getPost(params.id);

  if (!post) {
    notFound(); // not-found.tsx를 보여줌
  }

  return <article>{post.title}</article>;
}
```

---

## 레이아웃 유지와 리렌더링

레이아웃의 중요한 특성 중 하나는 **페이지 이동 시 레이아웃이 유지**된다는 것입니다.

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <nav>
          {/* 페이지 이동해도 네비게이션은 리렌더링되지 않음 */}
          <Link href="/">홈</Link>
          <Link href="/about">소개</Link>
        </nav>
        <main>{children}</main> {/* 이 부분만 교체됨 */}
      </body>
    </html>
  );
}
```

React Router에서는 매 페이지마다 전체가 리렌더링될 수 있었지만,
Next.js App Router는 레이아웃을 캐시해서 불필요한 리렌더링을 방지합니다.

---

## 그룹 라우팅 — `(폴더명)`

URL 경로에는 포함되지 않지만, 레이아웃을 분리하고 싶을 때 사용합니다.

```
app/
├── (marketing)/          # URL에 포함되지 않음
│   ├── layout.tsx        # 마케팅 레이아웃
│   ├── page.tsx          # → /
│   └── about/
│       └── page.tsx      # → /about
├── (shop)/               # URL에 포함되지 않음
│   ├── layout.tsx        # 쇼핑 레이아웃 (사이드바 등)
│   ├── products/
│   │   └── page.tsx      # → /products
│   └── cart/
│       └── page.tsx      # → /cart
└── layout.tsx            # 최상위 레이아웃
```

마케팅 페이지와 쇼핑 페이지는 레이아웃이 다르지만,
URL에는 `(marketing)`, `(shop)`이 포함되지 않습니다.

---

## 병렬 라우팅 — `@폴더명`

같은 URL에서 여러 페이지를 동시에 렌더링할 때 사용합니다.
대시보드처럼 여러 영역이 각각 독립적으로 데이터를 불러오는 경우에 유용합니다.

```
app/
└── dashboard/
    ├── layout.tsx
    ├── page.tsx
    ├── @analytics/       # 분석 슬롯
    │   └── page.tsx
    └── @revenue/         # 수익 슬롯
        └── page.tsx
```

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,    // @analytics 슬롯
  revenue,      // @revenue 슬롯
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  revenue: React.ReactNode;
}) {
  return (
    <div>
      {children}
      <div className="grid grid-cols-2">
        {analytics}   {/* 분석 차트 */}
        {revenue}     {/* 수익 차트 */}
      </div>
    </div>
  );
}
```

---

## 정리

App Router의 핵심은 **폴더 구조 = URL 구조**이고, 특별한 파일명으로 각 역할을 지정합니다.

- `page.tsx` → 해당 URL의 페이지
- `layout.tsx` → 공통 레이아웃 (중첩 가능)
- `loading.tsx` → 로딩 UI (자동 Suspense)
- `error.tsx` → 에러 UI (Error Boundary)
- `not-found.tsx` → 404 UI
- `route.ts` → API 엔드포인트

다음 챕터에서는 파일 기반 라우팅의 더 자세한 내용을 알아보겠습니다.
