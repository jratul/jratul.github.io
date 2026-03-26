---
title: "스타일링 (CSS Modules, Tailwind)"
order: 8
---

# 스타일링 (CSS Modules, Tailwind)

Next.js는 다양한 스타일링 방법을 지원합니다.
CSS Modules, Tailwind CSS, CSS-in-JS 등 각 방법의 특징을 알고 상황에 맞게 선택합시다.

---

## 전역 CSS

`app/globals.css`에 전역 스타일을 작성합니다.

```css
/* app/globals.css */

/* 폰트 임포트 */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap');

/* CSS 변수 (디자인 토큰) */
:root {
  --color-primary: #6366f1;
  --color-primary-dark: #4f46e5;
  --color-text: #111827;
  --color-text-muted: #6b7280;
  --color-bg: #ffffff;
  --color-border: #e5e7eb;

  --font-sans: 'Noto Sans KR', sans-serif;
  --radius: 8px;
}

/* 다크 모드 */
@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #f9fafb;
    --color-bg: #111827;
    --color-border: #374151;
  }
}

/* 기본 스타일 초기화 */
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  font-family: var(--font-sans);
  color: var(--color-text);
  background-color: var(--color-bg);
  line-height: 1.6;
}

a {
  color: var(--color-primary);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
```

루트 레이아웃에서 가져옵니다.

```tsx
// app/layout.tsx
import './globals.css'; // 전역 CSS 임포트

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

---

## CSS Modules

CSS Modules는 클래스 이름을 자동으로 고유하게 만들어 스타일 충돌을 방지합니다.

```
비유: 같은 이름의 파일도 폴더가 다르면 충돌 없는 것처럼,
CSS Modules도 같은 클래스명이 다른 컴포넌트에 있어도 충돌하지 않습니다.
```

### 기본 사용법

```css
/* components/Button/Button.module.css */

/* 클래스명이 자동으로 고유해짐 */
/* 예: .button → .Button_button__x7Kp3 */
.button {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.primary {
  background-color: #6366f1;
  color: white;
}

.primary:hover {
  background-color: #4f46e5;
}

.secondary {
  background-color: transparent;
  color: #6366f1;
  border: 1px solid #6366f1;
}

.secondary:hover {
  background-color: #f0f4ff;
}

/* 비활성화 상태 */
.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

```tsx
// components/Button/Button.tsx
import styles from './Button.module.css'; // .module.css 파일 임포트

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

function Button({ variant = 'primary', disabled, children, onClick }: ButtonProps) {
  return (
    <button
      // styles 객체로 클래스명 참조
      className={`${styles.button} ${styles[variant]}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default Button;
```

### 여러 클래스 조합하기

```tsx
import styles from './Card.module.css';

// 조건부 클래스 적용
function Card({ highlighted, size }: { highlighted: boolean; size: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      className={[
        styles.card,                              // 기본 카드 스타일
        highlighted ? styles.highlighted : '',    // 조건부
        styles[size],                             // 동적 클래스
      ].join(' ')}
    >
      내용
    </div>
  );
}
```

---

## Tailwind CSS

Tailwind CSS는 미리 만들어진 유틸리티 클래스를 조합해 스타일을 만드는 방식입니다.

### Next.js + Tailwind 설정

```bash
# 설치 (create-next-app 시 선택하면 자동 설정)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tailwind가 클래스를 찾을 파일 경로
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 커스텀 색상 추가
      colors: {
        primary: {
          50: '#f0f4ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
      },
      // 커스텀 폰트
      fontFamily: {
        sans: ['Pretendard', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

```css
/* app/globals.css */
@tailwind base;       /* 기본 CSS 초기화 */
@tailwind components; /* 컴포넌트 레이어 */
@tailwind utilities;  /* 유틸리티 클래스들 */
```

### Tailwind 기본 예시

```tsx
// Tailwind 클래스로 버튼 만들기
function Button({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="
        inline-flex items-center    /* flex 레이아웃 */
        px-4 py-2                   /* padding */
        bg-indigo-500               /* 배경색 */
        hover:bg-indigo-600         /* 호버 배경색 */
        text-white                  /* 글자색 */
        text-sm font-medium         /* 폰트 */
        rounded-md                  /* 모서리 둥글게 */
        transition-colors           /* 색상 전환 애니메이션 */
        disabled:opacity-50         /* 비활성화 스타일 */
        disabled:cursor-not-allowed
      "
    >
      {children}
    </button>
  );
}
```

### 반응형 디자인

Tailwind의 반응형 접두사: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

```tsx
// 반응형 그리드 레이아웃
function PostGrid({ posts }) {
  return (
    <div
      className="
        grid
        grid-cols-1           /* 모바일: 1열 */
        sm:grid-cols-2        /* 640px 이상: 2열 */
        lg:grid-cols-3        /* 1024px 이상: 3열 */
        gap-4                 /* 간격 */
      "
    >
      {posts.map(post => (
        <div key={post.id} className="border rounded-lg p-4">
          <h2 className="font-bold text-lg">{post.title}</h2>
          <p className="text-gray-600 text-sm mt-1">{post.excerpt}</p>
        </div>
      ))}
    </div>
  );
}
```

### 다크 모드

```tsx
// dark: 접두사로 다크 모드 스타일 지정
function Card() {
  return (
    <div
      className="
        bg-white dark:bg-gray-800          /* 배경: 라이트/다크 */
        text-gray-900 dark:text-gray-100   /* 글자: 라이트/다크 */
        border border-gray-200 dark:border-gray-700
        rounded-lg p-6
        shadow-sm dark:shadow-none
      "
    >
      카드 내용
    </div>
  );
}
```

```javascript
// tailwind.config.js - 다크 모드 설정
module.exports = {
  darkMode: 'class', // 'class' 또는 'media'
  // 'class': <html class="dark"> 방식 (수동 토글)
  // 'media': 시스템 설정 따라감
};
```

### cn() 유틸리티 함수

조건부 클래스 적용을 편하게 하려면 `clsx`와 `tailwind-merge`를 조합합니다.

```bash
npm install clsx tailwind-merge
```

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// 조건부 클래스 + Tailwind 충돌 해결
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
import { cn } from '@/lib/utils';

interface ButtonProps {
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string; // 외부에서 추가 클래스 주입
  children: React.ReactNode;
}

function Button({ variant = 'primary', size = 'md', className, children }: ButtonProps) {
  return (
    <button
      className={cn(
        // 기본 스타일 (항상 적용)
        'inline-flex items-center rounded-md font-medium transition-colors',

        // variant에 따른 스타일
        variant === 'primary' && 'bg-indigo-500 text-white hover:bg-indigo-600',
        variant === 'ghost' && 'bg-transparent hover:bg-gray-100',

        // size에 따른 스타일
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',

        // 외부 클래스 (충돌 시 외부 클래스가 우선)
        className
      )}
    >
      {children}
    </button>
  );
}
```

---

## CSS-in-JS

`styled-components`, `emotion` 같은 CSS-in-JS 라이브러리는 서버 컴포넌트와 함께 사용할 때 주의가 필요합니다.

서버 컴포넌트에서는 런타임 스타일 주입이 동작하지 않기 때문에, 클라이언트 컴포넌트에서만 사용하거나 별도 설정이 필요합니다.

```tsx
// styled-components를 Next.js에서 쓰려면 registry 설정 필요
'use client';

import React, { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';

export default function StyledComponentsRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleElement();
    styledComponentsStyleSheet.instance.clearTag();
    return <>{styles}</>;
  });

  if (typeof window !== 'undefined') return <>{children}</>;

  return (
    <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>
      {children}
    </StyleSheetManager>
  );
}
```

일반적으로는 **CSS Modules + Tailwind 조합**이 Next.js와 가장 잘 어울립니다.

---

## @layer로 Tailwind 커스터마이징

자주 쓰는 스타일 조합을 컴포넌트로 추출합니다.

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 커스텀 컴포넌트 클래스 */
@layer components {
  .btn {
    @apply inline-flex items-center px-4 py-2 rounded-md font-medium transition-colors;
  }

  .btn-primary {
    @apply bg-indigo-500 text-white hover:bg-indigo-600;
  }

  .btn-secondary {
    @apply border border-indigo-500 text-indigo-500 hover:bg-indigo-50;
  }

  /* 카드 기본 스타일 */
  .card {
    @apply bg-white rounded-lg border border-gray-200 shadow-sm p-6;
  }
}

/* 커스텀 유틸리티 */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

```tsx
// 정의한 커스텀 클래스 사용
function Page() {
  return (
    <div>
      <button className="btn btn-primary">저장</button>
      <button className="btn btn-secondary">취소</button>
      <div className="card">카드 내용</div>
    </div>
  );
}
```

---

## 실전 예시: 블로그 포스트 카드

```tsx
// components/PostCard.tsx
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  thumbnail?: string;
  tags: string[];
}

function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <article
        className={cn(
          // 기본 카드 스타일
          'group border rounded-xl overflow-hidden',
          'bg-white dark:bg-gray-800',
          'hover:shadow-lg transition-shadow duration-200',
          // 주요 포스트는 더 크게
          featured ? 'col-span-2 row-span-2' : ''
        )}
      >
        {/* 썸네일 */}
        {post.thumbnail && (
          <div className="relative h-48 overflow-hidden">
            <Image
              src={post.thumbnail}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        {/* 내용 */}
        <div className="p-5">
          {/* 태그 */}
          <div className="flex flex-wrap gap-2 mb-3">
            {post.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* 제목 */}
          <h2
            className={cn(
              'font-bold text-gray-900 dark:text-white',
              'group-hover:text-indigo-600 transition-colors',
              featured ? 'text-2xl' : 'text-lg'
            )}
          >
            {post.title}
          </h2>

          {/* 요약 */}
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
            {post.excerpt}
          </p>

          {/* 날짜 */}
          <time className="mt-4 block text-xs text-gray-400">
            {post.date}
          </time>
        </div>
      </article>
    </Link>
  );
}
```

---

## 흔한 실수

### 실수 1: Tailwind 클래스 동적 생성

```tsx
// ❌ 동적으로 생성된 클래스는 Tailwind가 감지 못함
function Tag({ color }: { color: string }) {
  // 빌드 시 이 클래스가 번들에 포함되지 않을 수 있음!
  return <span className={`bg-${color}-100 text-${color}-600`}>{/* ... */}</span>;
}

// ✅ 완전한 클래스명을 명시적으로 사용
const colorMap = {
  red: 'bg-red-100 text-red-600',
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
};

function Tag({ color }: { color: keyof typeof colorMap }) {
  return <span className={colorMap[color]}>{/* ... */}</span>;
}
```

### 실수 2: CSS Modules와 전역 CSS 혼용 실수

```css
/* ❌ CSS Module 파일에서 전역 클래스 override */
/* Button.module.css */
.button {
  /* 이 안에서는 전역 클래스에 영향을 줄 수 없음 */
  .some-global-class { /* 의도대로 동작 안 함 */ }
}

/* ✅ :global() 사용 */
.button :global(.icon) {
  /* .button 안의 .icon 클래스(전역)에 스타일 적용 */
  margin-right: 8px;
}
```

### 실수 3: 인라인 스타일 과용

```tsx
// ❌ 인라인 스타일은 재사용도 안 되고 반응형도 어려움
function Component() {
  return (
    <div style={{ display: 'flex', padding: '16px', backgroundColor: '#fff' }}>
      {/* ... */}
    </div>
  );
}

// ✅ Tailwind 또는 CSS Module 사용
function Component() {
  return (
    <div className="flex p-4 bg-white">
      {/* ... */}
    </div>
  );
}
```

---

## 정리

| 방법 | 장점 | 단점 | 추천 상황 |
|------|------|------|-----------|
| CSS Modules | 스타일 충돌 없음, 기존 CSS 문법 | 클래스 조합이 번거로움 | 복잡한 컴포넌트 스타일 |
| Tailwind CSS | 빠른 개발, 일관된 디자인 | 클래스가 길어짐 | 대부분의 경우 |
| CSS-in-JS | 동적 스타일 용이 | 서버 컴포넌트 설정 복잡 | 클라이언트 전용 동적 스타일 |
| 전역 CSS | 심플 | 클래스 충돌 가능 | 기본 스타일, 리셋 |

- **Next.js 권장**: Tailwind CSS + CSS Modules 조합
- **cn() 함수**: 조건부 클래스 적용을 깔끔하게 처리
- **@layer**: 자주 쓰는 Tailwind 조합을 컴포넌트 클래스로 추출
- **다크 모드**: `dark:` 접두사 또는 CSS 변수 활용
