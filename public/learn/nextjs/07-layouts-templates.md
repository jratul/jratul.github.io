---
title: "레이아웃과 템플릿"
order: 7
---

# 레이아웃과 템플릿

Next.js App Router의 레이아웃 시스템은 페이지 간 공통 UI를 효율적으로 관리할 수 있게 해줍니다.
헤더, 네비게이션, 사이드바처럼 여러 페이지에서 반복되는 요소를 한 곳에서 관리할 수 있습니다.

---

## React에서는 어떻게 했나요?

기존 React에서 공통 레이아웃을 적용하려면 직접 구성해야 했습니다.

```tsx
// 기존 React - App.tsx에서 직접 레이아웃 처리
function App() {
  return (
    <Router>
      <Header />           {/* 모든 페이지에 헤더 */}
      <Sidebar />          {/* 특정 페이지에는 사이드바 */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/about" element={<About />} />
      </Routes>
      <Footer />           {/* 모든 페이지에 푸터 */}
    </Router>
  );
}
```

페이지마다 다른 레이아웃이 필요하면 조건문이 많아져 복잡해집니다.

---

## Next.js 레이아웃 시스템

App Router는 파일 기반으로 레이아웃을 자동으로 적용합니다.

```
app/
├── layout.tsx         ← 모든 페이지에 적용되는 루트 레이아웃
├── page.tsx           ← / (홈 페이지)
├── blog/
│   ├── layout.tsx     ← /blog/* 에만 적용되는 레이아웃
│   ├── page.tsx       ← /blog
│   └── [slug]/
│       └── page.tsx   ← /blog/[slug]
├── dashboard/
│   ├── layout.tsx     ← /dashboard/* 에만 적용되는 레이아웃
│   └── page.tsx       ← /dashboard
```

---

## 루트 레이아웃

`app/layout.tsx`는 모든 페이지에 적용되는 최상위 레이아웃입니다. **반드시 존재해야 합니다.**

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// 전체 사이트 기본 메타데이터
export const metadata: Metadata = {
  title: {
    default: '내 블로그',          // 기본 제목
    template: '%s | 내 블로그',    // 페이지별 제목 형식
  },
  description: '개발 이야기를 씁니다',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

// 루트 레이아웃: html, body 태그를 포함해야 함
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {/* 모든 페이지에 나타나는 헤더 */}
        <header className="h-16 border-b flex items-center px-6">
          <a href="/" className="font-bold text-lg">내 블로그</a>
          <nav className="ml-auto flex gap-4">
            <a href="/blog">블로그</a>
            <a href="/about">소개</a>
          </nav>
        </header>

        {/* 각 페이지 내용이 여기에 렌더링됨 */}
        <main className="min-h-screen">
          {children}
        </main>

        {/* 모든 페이지에 나타나는 푸터 */}
        <footer className="border-t py-8 text-center text-gray-500">
          © 2025 내 블로그
        </footer>
      </body>
    </html>
  );
}
```

---

## 중첩 레이아웃

특정 경로에만 적용되는 레이아웃을 추가할 수 있습니다.

```tsx
// app/dashboard/layout.tsx
// /dashboard/* 경로에만 추가로 적용됨
interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex">
      {/* 대시보드 전용 사이드바 */}
      <aside className="w-64 min-h-screen border-r p-4">
        <nav className="space-y-2">
          <a href="/dashboard" className="block p-2 hover:bg-gray-100 rounded">
            개요
          </a>
          <a href="/dashboard/posts" className="block p-2 hover:bg-gray-100 rounded">
            포스트 관리
          </a>
          <a href="/dashboard/users" className="block p-2 hover:bg-gray-100 rounded">
            사용자 관리
          </a>
          <a href="/dashboard/settings" className="block p-2 hover:bg-gray-100 rounded">
            설정
          </a>
        </nav>
      </aside>

      {/* 대시보드 페이지 내용 */}
      <div className="flex-1 p-8">
        {children}
      </div>
    </div>
  );
}
```

레이아웃이 중첩되는 방식:

```
RootLayout (app/layout.tsx)
└── DashboardLayout (app/dashboard/layout.tsx)
    └── page.tsx 내용
```

`/dashboard` 페이지에 접근하면 루트 레이아웃의 헤더/푸터 + 대시보드의 사이드바 + 페이지 내용이 모두 표시됩니다.

---

## 레이아웃은 상태를 유지합니다

레이아웃의 핵심 특징: **페이지 이동 시 레이아웃은 다시 렌더링되지 않습니다.**

```tsx
'use client';
// app/dashboard/layout.tsx
import { useState } from 'react';

export default function DashboardLayout({ children }) {
  // 사이드바 열림/닫힘 상태
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // /dashboard → /dashboard/posts 이동해도
  // 이 상태가 유지됨! (사이드바가 열려있으면 그대로)
  return (
    <div className="flex">
      <button onClick={() => setSidebarOpen(!sidebarOpen)}>
        메뉴
      </button>
      {sidebarOpen && (
        <aside>{/* ... */}</aside>
      )}
      <main>{children}</main>
    </div>
  );
}
```

---

## template.tsx: 매번 새로 렌더링

`layout.tsx`와 달리 `template.tsx`는 페이지 이동 시 **항상 새로 마운트**됩니다.

```tsx
// app/blog/template.tsx
// /blog/post-1 → /blog/post-2 이동할 때마다 새로 생성됨
export default function BlogTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {children}
    </div>
  );
}
```

언제 `template.tsx`를 쓰나요?
- 페이지 전환 시 애니메이션을 넣고 싶을 때
- 페이지마다 독립적인 상태가 필요할 때
- `useEffect`가 페이지 이동할 때마다 실행되어야 할 때

```tsx
'use client';
// app/blog/template.tsx
import { useEffect } from 'react';

export default function BlogTemplate({ children }) {
  // 포스트 페이지 이동마다 실행됨 (layout에서는 최초 1회만)
  useEffect(() => {
    // 페이지뷰 추적
    analytics.trackPageView(window.location.pathname);
  }, []);

  return (
    // 페이드인 애니메이션
    <div className="animate-fade-in">
      {children}
    </div>
  );
}
```

---

## 특수 파일들

레이아웃 외에 App Router에서 특별한 역할을 하는 파일들이 있습니다.

### not-found.tsx

```tsx
// app/not-found.tsx - 전체 앱의 404 페이지
export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <p className="mt-4 text-gray-600">페이지를 찾을 수 없습니다</p>
      <a href="/" className="mt-6 inline-block text-blue-500">
        홈으로 돌아가기
      </a>
    </div>
  );
}
```

```tsx
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';

async function BlogPost({ params }) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound(); // app/blog/not-found.tsx 또는 app/not-found.tsx 표시
  }

  return <article>{post.content}</article>;
}
```

### loading.tsx

```tsx
// app/blog/loading.tsx - 블로그 섹션 로딩 중 표시
export default function BlogLoading() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-full" />
        </div>
      ))}
    </div>
  );
}
```

### error.tsx

```tsx
'use client'; // error.tsx는 반드시 클라이언트 컴포넌트
// app/dashboard/error.tsx

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="text-center py-10">
      <h2>대시보드를 불러오지 못했습니다</h2>
      <p className="text-sm text-gray-500">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        다시 시도
      </button>
    </div>
  );
}
```

---

## 라우트 그룹

URL에 영향 없이 레이아웃을 그룹화할 수 있습니다. 폴더명을 `(괄호)`로 감쌉니다.

```
app/
├── (marketing)/         ← URL에 포함 안 됨
│   ├── layout.tsx       ← 마케팅 페이지 전용 레이아웃
│   ├── page.tsx         ← / (홈)
│   ├── about/
│   │   └── page.tsx     ← /about
│   └── pricing/
│       └── page.tsx     ← /pricing
├── (app)/               ← URL에 포함 안 됨
│   ├── layout.tsx       ← 앱 전용 레이아웃 (로그인 필요)
│   ├── dashboard/
│   │   └── page.tsx     ← /dashboard
│   └── settings/
│       └── page.tsx     ← /settings
```

```tsx
// app/(marketing)/layout.tsx
// 마케팅 페이지 - 화려한 헤더, 큰 CTA 버튼
export default function MarketingLayout({ children }) {
  return (
    <div>
      <header className="bg-gradient-to-r from-purple-600 to-blue-500 text-white">
        <nav>마케팅 헤더</nav>
      </header>
      {children}
    </div>
  );
}
```

```tsx
// app/(app)/layout.tsx
// 앱 페이지 - 사이드바, 알림 등 앱 UI
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function AppLayout({ children }) {
  const session = await getSession();

  // 로그인 안 했으면 로그인 페이지로
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex">
      <AppSidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

---

## 병렬 라우트 (Parallel Routes)

같은 페이지에서 여러 섹션을 독립적으로 렌더링할 수 있습니다.

```
app/
├── layout.tsx
├── @analytics/          ← @로 시작하는 슬롯
│   └── page.tsx
├── @team/               ← 또 다른 슬롯
│   └── page.tsx
└── page.tsx
```

```tsx
// app/layout.tsx
// analytics와 team 슬롯을 props로 받음
export default function Layout({
  children,
  analytics,  // @analytics/page.tsx
  team,       // @team/page.tsx
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <div>
      <div>{children}</div>
      <div className="grid grid-cols-2 gap-4 mt-8">
        <div>{analytics}</div>  {/* 분석 데이터 */}
        <div>{team}</div>       {/* 팀 정보 */}
      </div>
    </div>
  );
}
```

각 슬롯은 독립적으로 로딩됩니다. analytics가 느리게 로딩되어도 team은 먼저 표시될 수 있습니다.

---

## 실전 예시: 블로그 레이아웃 구성

```
app/
├── layout.tsx              ← 전체 헤더/푸터
├── page.tsx                ← 홈 (/)
├── (blog)/
│   ├── layout.tsx          ← 블로그 공통 레이아웃
│   ├── blog/
│   │   ├── page.tsx        ← 블로그 목록 (/blog)
│   │   └── [slug]/
│   │       ├── page.tsx    ← 포스트 상세 (/blog/slug)
│   │       └── loading.tsx
│   └── tags/
│       └── [tag]/
│           └── page.tsx    ← 태그별 목록 (/tags/react)
└── (admin)/
    ├── layout.tsx          ← 관리자 레이아웃 (인증 필요)
    └── admin/
        ├── page.tsx        ← 관리자 대시보드
        └── posts/
            └── page.tsx    ← 포스트 관리
```

```tsx
// app/(blog)/layout.tsx
export default function BlogLayout({ children }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/* 메인 콘텐츠 */}
        <main className="flex-1">{children}</main>

        {/* 사이드바 */}
        <aside className="w-64 hidden lg:block">
          <RecentPosts />
          <TagCloud />
        </aside>
      </div>
    </div>
  );
}
```

---

## 레이아웃에서 데이터 페칭

레이아웃도 서버 컴포넌트이므로 데이터를 가져올 수 있습니다.

```tsx
// app/layout.tsx
async function RootLayout({ children }) {
  // 네비게이션 메뉴 데이터를 서버에서 가져옴
  const categories = await getCategories();

  return (
    <html lang="ko">
      <body>
        <header>
          <nav>
            {/* 동적 카테고리 메뉴 */}
            {categories.map(cat => (
              <a key={cat.id} href={`/category/${cat.slug}`}>
                {cat.name}
              </a>
            ))}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

---

## 흔한 실수

### 실수 1: 루트 레이아웃에서 html/body 태그 누락

```tsx
// ❌ html, body 태그 없음
export default function RootLayout({ children }) {
  return (
    <div>
      <header>헤더</header>
      {children}
    </div>
  );
}

// ✅ 루트 레이아웃에는 반드시 html, body 포함
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <header>헤더</header>
        {children}
      </body>
    </html>
  );
}
```

### 실수 2: 중첩 레이아웃에서 html/body 중복

```tsx
// ❌ 중첩 레이아웃에 html/body 넣으면 중복됨!
export default function DashboardLayout({ children }) {
  return (
    <html>       {/* 이미 RootLayout에 있음 */}
      <body>
        {children}
      </body>
    </html>
  );
}

// ✅ 중첩 레이아웃에서는 html/body 없이
export default function DashboardLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

### 실수 3: layout에서 template이 필요한 경우를 놓침

```tsx
// 페이지마다 다른 배경색 애니메이션이 필요한 경우
// layout에서는 한 번만 마운트되므로 페이지 이동 시 애니메이션 안 됨

// ❌ layout - 페이지 이동 시 재마운트 안 됨
export default function Layout({ children }) {
  return <div className="fade-in">{children}</div>; // 최초 1회만
}

// ✅ template - 페이지 이동 시 항상 새로 마운트됨
export default function Template({ children }) {
  return <div className="fade-in">{children}</div>; // 이동마다 실행
}
```

---

## 정리

- `layout.tsx`: 여러 페이지에서 공유하는 UI. 페이지 이동 시 유지됨
- `template.tsx`: layout과 유사하지만 페이지 이동 시 새로 마운트
- `loading.tsx`: 데이터 로딩 중 표시할 스켈레톤 UI
- `error.tsx`: 에러 발생 시 표시할 UI (클라이언트 컴포넌트)
- `not-found.tsx`: 404 페이지
- 라우트 그룹 `(name)`: URL에 영향 없이 레이아웃 그룹화
- 중첩 레이아웃: 루트 → 섹션 → 페이지 순서로 자동 중첩 적용
