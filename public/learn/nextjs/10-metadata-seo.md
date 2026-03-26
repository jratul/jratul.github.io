---
title: "메타데이터와 SEO"
order: 10
---

# 메타데이터와 SEO

검색 엔진 최적화(SEO)는 사이트가 구글 등 검색 결과에 잘 노출되도록 하는 작업입니다.
Next.js는 메타데이터 관리를 위한 강력한 API를 내장하고 있습니다.

---

## 메타데이터란?

메타데이터는 페이지 내용을 설명하는 데이터입니다.
검색 엔진, 소셜 미디어(카카오톡 링크 미리보기, 트위터 카드 등)가 이 정보를 사용합니다.

```html
<!-- HTML head에 들어가는 메타데이터 -->
<title>React Hooks 사용법 | 내 블로그</title>
<meta name="description" content="useState, useEffect 등 주요 Hooks를 예제와 함께 설명합니다." />

<!-- Open Graph (소셜 미디어 공유 시 미리보기) -->
<meta property="og:title" content="React Hooks 사용법" />
<meta property="og:image" content="https://myblog.com/og/react-hooks.png" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
```

---

## React에서는 어떻게 했나요?

기존 React에서는 `react-helmet` 같은 라이브러리를 써야 했습니다.

```tsx
// 기존 React + react-helmet
import { Helmet } from 'react-helmet-async';

function BlogPost({ post }) {
  return (
    <>
      <Helmet>
        <title>{post.title} | 내 블로그</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={post.title} />
        {/* ... */}
      </Helmet>
      <article>{/* ... */}</article>
    </>
  );
}
```

Next.js App Router는 이를 내장 기능으로 지원합니다.

---

## 정적 메타데이터

값이 바뀌지 않는 페이지는 객체를 export합니다.

```tsx
// app/about/page.tsx
import type { Metadata } from 'next';

// metadata를 export하면 Next.js가 자동으로 <head>에 적용
export const metadata: Metadata = {
  title: '소개',
  description: '안녕하세요, 프론트엔드 개발자 홍길동입니다.',
  keywords: ['프론트엔드', 'React', 'TypeScript'],
  openGraph: {
    title: '소개 | 내 블로그',
    description: '안녕하세요, 프론트엔드 개발자 홍길동입니다.',
    images: ['/og/about.png'],
  },
};

export default function AboutPage() {
  return <div>소개 페이지</div>;
}
```

---

## 루트 레이아웃 기본 메타데이터

루트 레이아웃에서 전체 사이트 기본 메타데이터를 설정합니다.

```tsx
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  // 기본 제목 + 페이지별 제목 형식
  title: {
    default: '내 블로그',              // 제목 없을 때 기본값
    template: '%s | 내 블로그',        // 페이지 제목 + 사이트 이름
    // 예: about 페이지 → '소개 | 내 블로그'
  },
  description: '개발 이야기, 배운 것들을 씁니다',

  // 사이트 기본 Open Graph
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://myblog.com',
    siteName: '내 블로그',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: '내 블로그',
      },
    ],
  },

  // Twitter/X 카드
  twitter: {
    card: 'summary_large_image',
    creator: '@myhandle',
  },

  // 검색 엔진 크롤링 허용
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

---

## 동적 메타데이터

포스트 상세 페이지처럼 데이터에 따라 메타데이터가 달라지는 경우,
`generateMetadata` 함수를 사용합니다.

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from 'next';

interface Props {
  params: { slug: string };
}

// 동적 메타데이터 생성
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // 페이지와 동일한 데이터 소스 사용 (자동으로 캐시됨, 두 번 요청 안 함)
  const post = await getPost(params.slug);

  if (!post) {
    // 포스트가 없을 때 기본 메타데이터
    return {
      title: '포스트를 찾을 수 없습니다',
    };
  }

  return {
    title: post.title,  // template에 의해 '제목 | 내 블로그' 형식이 됨
    description: post.excerpt,

    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: ['홍길동'],
      tags: post.tags,
      images: post.thumbnail
        ? [{ url: post.thumbnail, width: 1200, height: 630 }]
        : ['/og-default.png'],
    },

    // canonical URL (중복 콘텐츠 방지)
    alternates: {
      canonical: `https://myblog.com/blog/${params.slug}`,
    },
  };
}

// 페이지 컴포넌트
export default async function BlogPost({ params }: Props) {
  const post = await getPost(params.slug);
  return <article>{post.content}</article>;
}
```

---

## 정적 경로 미리 생성

동적 경로 페이지를 빌드 시 미리 생성하면 SEO와 성능에 유리합니다.

```tsx
// app/blog/[slug]/page.tsx

// 빌드 시 생성할 경로 목록 반환
export async function generateStaticParams() {
  const posts = await getAllPosts();

  // slug 목록을 반환하면 각 slug에 대해 페이지가 미리 생성됨
  return posts.map(post => ({
    slug: post.slug,
  }));
}
// 결과: /blog/react-hooks, /blog/next-js-intro, ... 페이지가 빌드 시 생성
```

---

## 구조화된 데이터 (JSON-LD)

구글 검색 결과에 리치 스니펫(별점, 가격 등)을 표시하려면 JSON-LD를 추가합니다.

```tsx
// app/blog/[slug]/page.tsx
export default async function BlogPost({ params }) {
  const post = await getPost(params.slug);

  // JSON-LD 구조화 데이터
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    author: {
      '@type': 'Person',
      name: '홍길동',
    },
    datePublished: post.date,
    dateModified: post.updatedAt || post.date,
    image: post.thumbnail || 'https://myblog.com/og-default.png',
    url: `https://myblog.com/blog/${params.slug}`,
  };

  return (
    <article>
      {/* JSON-LD 스크립트 삽입 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  );
}
```

---

## 사이트맵 생성

`app/sitemap.ts`로 동적 사이트맵을 생성합니다.

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 블로그 포스트 목록
  const posts = await getAllPosts();

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://myblog.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: 'https://myblog.com/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://myblog.com/blog',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // 동적 포스트 페이지
  const postPages: MetadataRoute.Sitemap = posts.map(post => ({
    url: `https://myblog.com/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt || post.date),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...postPages];
}
// /sitemap.xml 경로로 자동 제공됨
```

---

## robots.txt

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],  // 관리자 페이지와 API는 크롤링 차단
      },
    ],
    sitemap: 'https://myblog.com/sitemap.xml',
  };
}
// /robots.txt 경로로 자동 제공됨
```

---

## OG 이미지 동적 생성

`next/og`로 포스트별 Open Graph 이미지를 자동 생성할 수 있습니다.

```tsx
// app/og/route.tsx
import { ImageResponse } from 'next/og';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || '내 블로그';
  const description = searchParams.get('description') || '';

  return new ImageResponse(
    (
      // JSX로 이미지 레이아웃 정의
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a2e',
          padding: '60px',
        }}
      >
        {/* 블로그 이름 */}
        <div style={{ color: '#888', fontSize: 24, marginBottom: 20 }}>
          내 블로그
        </div>

        {/* 포스트 제목 */}
        <div
          style={{
            color: 'white',
            fontSize: 56,
            fontWeight: 'bold',
            textAlign: 'center',
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>

        {/* 요약 */}
        <div style={{ color: '#aaa', fontSize: 24, marginTop: 20 }}>
          {description}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
```

```tsx
// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }) {
  const post = await getPost(params.slug);

  return {
    openGraph: {
      images: [
        // 동적으로 생성된 OG 이미지 URL
        `https://myblog.com/og?title=${encodeURIComponent(post.title)}&description=${encodeURIComponent(post.excerpt)}`,
      ],
    },
  };
}
```

---

## 흔한 실수

### 실수 1: title에 사이트 이름 중복

```tsx
// ❌ 'React Hooks | 내 블로그 | 내 블로그'가 됨
export const metadata: Metadata = {
  title: 'React Hooks | 내 블로그', // 이미 사이트 이름 포함
};

// ✅ 페이지 제목만 - template이 자동으로 '| 내 블로그' 붙여줌
export const metadata: Metadata = {
  title: 'React Hooks',
};
```

### 실수 2: description 길이

```tsx
// ❌ 너무 짧거나 너무 긴 description
export const metadata: Metadata = {
  description: '블로그', // 너무 짧음
  // 또는
  description: '이 포스트에서는 React의 useState, useEffect, useContext, useReducer, useMemo, useCallback, useRef, useLayoutEffect 등 모든 훅에 대해 자세하게 설명합니다...', // 너무 김 (160자 이상)
};

// ✅ 50-160자 사이, 핵심 키워드 포함
export const metadata: Metadata = {
  description: 'useState부터 useEffect까지, React 주요 Hooks의 사용법을 예제와 함께 설명합니다.',
};
```

### 실수 3: 중복 메타데이터

```tsx
// ❌ 부모 layout과 자식 page 모두 같은 og:title 설정
// → 어떤 게 우선인지 예측하기 어려움

// ✅ layout에는 전체 기본값, page에서 페이지별 override
// app/layout.tsx
export const metadata = { title: { template: '%s | 사이트' } };

// app/blog/page.tsx
export const metadata = { title: '블로그' }; // '블로그 | 사이트'
```

---

## 메타데이터 병합 규칙

부모(layout)와 자식(page) 메타데이터가 있을 때 자식이 부모를 덮어씁니다.
단, 중첩 객체(openGraph 등)는 완전히 교체됩니다.

```tsx
// app/layout.tsx
export const metadata = {
  openGraph: {
    type: 'website',
    siteName: '내 블로그', // 공통 설정
  },
};

// app/blog/[slug]/page.tsx
export const metadata = {
  openGraph: {
    // layout의 openGraph 전체를 덮어씀!
    // siteName이 사라집니다
    title: '포스트 제목',
    type: 'article',
    // siteName: '내 블로그' ← 필요하면 명시적으로 다시 써야 함
  },
};
```

---

## 정리

- `export const metadata`: 정적 메타데이터
- `export async function generateMetadata()`: 동적 메타데이터
- `title.template`: 페이지별 제목에 사이트 이름 자동 추가
- `openGraph`: 소셜 미디어 링크 미리보기
- `app/sitemap.ts`: 자동 사이트맵 생성 (/sitemap.xml)
- `app/robots.ts`: robots.txt 자동 생성
- JSON-LD: 구조화된 데이터로 검색 결과 리치 스니펫
- `ImageResponse` (next/og): 동적 OG 이미지 생성
