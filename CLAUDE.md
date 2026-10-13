# jratul.github.io - Personal Blog Project

## Project Overview
Vite + React + TypeScript 기반의 개인 블로그
GitHub Pages를 통한 정적 사이트 배포

## Workflow Rules
- 블로그 포스트를 작성하면 `npm run generate:index`로 인덱스를 재생성한 후, 커밋하고 푸시까지 완료할 것
- 학습 콘텐츠를 추가/수정하면 `npm run generate:learn`으로 인덱스를 재생성한 후, 커밋하고 푸시까지 완료할 것
- **새 블로그 포스트의 frontmatter `date`는 절대 이전 포스트 값을 복사하거나 기억에 의존하지
  말고, 작성 직전에 `date "+%Y-%m-%d"`(Bash) 같은 명령으로 실제 현재 날짜를 확인해 그
  값을 동적으로 채울 것. 세션 시작 시점의 날짜 컨텍스트가 있어도, 시간이 지나 실제 날짜가
  바뀌었을 수 있으므로 포스트 작성 시점마다 다시 확인한다.
- **포스트 작성 요청을 받으면 먼저 `src/pages`에 같은 주제를 다루는 기존 포스트가 있는지
  검색부터 한다** (제목/파일명뿐 아니라 본문 키워드까지 grep). 같은 주제이거나 상당 부분
  겹치는 기존 포스트가 있으면 바로 새 글을 쓰지 말고, 사용자에게 "이미 있는데 어떻게 할지"
  (기존 글 보완/수정할지, 그래도 별도 글로 새로 쓸지, 관점을 다르게 할지)를 먼저 물어본다.
  주제가 겹치지 않거나(예: 기존 글은 개념 전반을 다루고 새 요청은 두 스택을 비교하는 등
  관점이 명확히 다름) 확인 결과 중복이 없으면 확인 없이 바로 작성한다.

## Learn 페이지 (학습 섹션)

### 개요
블로그와 별도로 Java/Kotlin/Spring/C++/Unity/인프라/CS 등 29개 카테고리를 단계별로 학습할 수 있는 섹션.
- URL: `/learn/:category` (목차), `/learn/:category/:lessonSlug` (레슨 상세)
- 헤더의 "학습" 링크는 드롭다운이 아니라 `/learn/html`로 바로 이동하는 단순 링크.
  카테고리 선택 UI는 데스크탑에서는 좌측 `LearnSidebar`(그룹별 접기/펼치기), 모바일에서는
  `Learn.tsx` 내부의 `MobileCategorySelector` 드롭다운으로 제공됨.
- 목차 페이지(`Learn.tsx`)는 레슨 목록만 보여주고, 클릭하면 `LearnLessonPage.tsx`로 라우팅되는
  방식(아코디언으로 같은 페이지 내에서 펼치는 구조가 아님).

### 콘텐츠 파일 위치
```
public/learn/
├── java/       ← 순서-이름.md 형식 파일들
├── kotlin/
├── spring/
├── cpp/
└── ...         ← src/types/learn.ts의 LearnCategory에 정의된 29개 카테고리
```

### 데이터 로딩 구조 (중요)
- `learn-index.json`에는 **본문(content)이 들어있지 않다** — `id`/`category`/`order`/`title`
  메타데이터만 담아 목차·사이드바·이전/다음 네비게이션에 쓴다(전체 학습 콘텐츠를 한 번에
  내려받지 않기 위한 성능 최적화).
- 레슨 상세 화면은 `useLessonContent` 훅(`src/hooks/useLessonContent.ts`)이 해당 레슨의
  원본 `.md` 파일(`/learn/{category}/{slug}.md`)을 그때그때 fetch해서 프론트매터를 제거한 뒤 렌더링한다.
- 새 필드를 추가하려면 `scripts/generate-learn-index.ts`(인덱스 생성)와
  `useLessonContent`/`stripFrontmatter`(본문 fetch) 양쪽을 함께 고려해야 한다.

### 새 학습 콘텐츠 추가 방법
1. `public/learn/{category}/` 디렉토리에 `{순서}-{이름}.md` 파일 생성
   - 예: `public/learn/java/08-generics.md`
2. frontmatter 형식:
   ```markdown
   ---
   title: "제네릭"
   order: 8
   ---
   ```
3. `npm run generate:learn` 실행하여 인덱스 재생성
4. 커밋 및 푸시

### 관련 파일
- `scripts/generate-learn-index.ts` — 학습 인덱스(메타데이터만) 생성 스크립트
- `public/learn-index.json` — 생성된 인덱스 (gitignore 대상)
- `src/types/learn.ts` — LearnLesson, LearnCategory, CATEGORY_META, LEARN_GROUPS
- `src/hooks/useLearn.ts` — 인덱스 fetch(+ 모듈 레벨 캐시) 훅
- `src/hooks/useLessonContent.ts` — 레슨 본문 개별 fetch 훅
- `src/pages/Learn.tsx` — 카테고리별 목차 페이지
- `src/pages/LearnLessonPage.tsx` — 레슨 상세 페이지
- `src/components/learn/LearnSidebar.tsx` — 데스크탑 사이드바 네비게이션

## Tech Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS (커스텀 유틸리티 클래스 직접 조합 — shadcn/ui나 별도 컴포넌트
  라이브러리는 도입하지 않음; `src/components/ui`는 비어있는 예약 디렉토리)
- **Routing**: React Router v6
- **Markdown**: react-markdown + remark/rehype plugins
- **Code Highlighting**: react-syntax-highlighter
- **SEO**: react-helmet-async
- **Date Formatting**: date-fns
- **Code Quality**: ESLint + Prettier
- **Deployment**: GitHub Pages (GitHub Actions)

## Design System

### Color Palette
디자인 참고: `ref/design.jpg`

#### Primary Colors (Tailwind Custom Colors)
```js
// tailwind.config.js에 추가할 컬러
{
  primary: {
    50: '#f0f4ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',  // Main Purple
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  accent: {
    cyan: '#06b6d4',     // Bright Cyan
    blue: '#3b82f6',     // Electric Blue
    purple: '#8b5cf6',   // Vivid Purple
    pink: '#ec4899',     // Hot Pink
  },
  dark: {
    bg: '#0a0a1f',       // Deep Dark Blue (main background)
    card: '#1a1a3e',     // Dark Purple Card
    border: '#2d2d5f',   // Subtle Border
  }
}
```

#### Design Characteristics
- **Base**: Dark theme (`bg-[#0a0a1f]`)
- **Gradient**: Purple to Cyan (`from-purple-600 via-blue-500 to-cyan-400`)
- **Glow Effects**: Neon-style shadows and borders
- **Glass Morphism**: Semi-transparent cards with backdrop blur
- **Typography**:
  - **Font**: Pretendard (한글 최적화 폰트)
  - **Letter Spacing**: `tracking-tight` (전역 적용)
  - **Weights**: Thin(100) ~ Black(900) 전체 제공

### Component Style Guidelines

#### 컴포넌트 스타일 가이드
> shadcn/ui는 실제로 도입되지 않았다. 아래 가이드는 원래 shadcn/ui 컴포넌트를 커스터마이징하는
> 전제로 작성됐지만, 실제로는 TailwindCSS 클래스를 컴포넌트에 직접 적용하는 방식으로 구현됐다.
> 색상/스타일 방향성 자체는 유효하다.

- **Cards**:
  - Base: `bg-dark-card` (dark purple)
  - Border: `border-dark-border` with gradient on hover
  - Shadow: Neon glow effect on hover

- **Buttons**:
  - Primary: Purple gradient background (`bg-gradient-to-r from-purple-600 to-blue-500`)
  - Secondary: Outlined with glow effect
  - Ghost: Subtle hover with backdrop blur

- **Input/SearchBar**:
  - Dark background with subtle border
  - Focus: Cyan glow effect (`ring-cyan-400`)
  - Placeholder: Muted text

- **Badge (Tags)**:
  - Gradient background or outlined style
  - Size variants for tag cloud
  - Interactive hover states

- **Navigation**: Transparent with blur effect (`backdrop-blur-lg`)
- **Icons**: Gradient fills or single accent colors

## Project Structure (Planned)
```
jratul.github.io/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   └── separator.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Layout.tsx
│   │   ├── blog/
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostList.tsx
│   │   │   ├── PostDetail.tsx
│   │   │   ├── TagCloud.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── MarkdownRenderer.tsx  # 마크다운 렌더링 컴포넌트
│   │   ├── seo/
│   │   │   └── SEO.tsx      # react-helmet-async wrapper
│   │   └── custom/
│   │       └── GradientText.tsx
│   ├── lib/
│   │   └── utils.ts         # shadcn/ui utility functions
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Post.tsx         # 포스트 상세 페이지
│   │   ├── About.tsx
│   │   └── NotFound.tsx     # 404 페이지
│   ├── styles/
│   │   └── globals.css
│   ├── types/
│   │   └── blog.ts
│   ├── utils/
│   │   ├── posts.ts         # 포스트 관련 유틸
│   │   ├── readingTime.ts   # 읽기 시간 계산
│   │   └── formatDate.ts    # 날짜 포맷팅
│   ├── hooks/
│   │   └── usePosts.ts      # Post 검색/필터링 훅
│   ├── App.tsx
│   └── main.tsx
├── scripts/
│   └── generate-posts-index.ts  # 빌드 시 포스트 인덱스 생성
├── public/
│   ├── fonts/           # Pretendard font files (복사할 위치)
│   ├── posts/           # Markdown blog posts
│   │   ├── fe/
│   │   │   ├── react/
│   │   │   │   ├── useEffect.md
│   │   │   │   └── images/  # 해당 포스트 이미지
│   │   │   └── vue/
│   │   ├── be/
│   │   └── ...
│   ├── posts-index.json # 빌드 시 생성되는 포스트 인덱스
│   ├── sitemap.xml      # SEO용 사이트맵 (빌드 시 생성)
│   ├── robots.txt       # 검색 엔진 크롤러 설정
│   └── 404.html         # SPA fallback
├── ref/
│   ├── design.jpg       # Design reference
│   └── Pretendard-*.woff2  # Pretendard font files
├── .github/
│   └── workflows/
│       └── deploy.yml   # GitHub Pages deployment
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── eslint.config.js
├── .prettierrc
├── .prettierignore
└── CLAUDE.md
```

## UI/UX Structure

### Main Page Layout
```
┌─────────────────────────────────────┐
│         Header / Navigation         │
├─────────────────────────────────────┤
│                                     │
│        Search Bar (Global)          │
│   [Search by title/content/tag]     │
│                                     │
├─────────────────────────────────────┤
│                                     │
│         Tag Cloud (Word Art)        │
│    태그1   태그2    태그3            │
│        태그4    태그5                │
│   (크기 = 사용 빈도)                 │
│   (클릭 시 필터링)                   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│         Post List (Grid)            │
│   ┌─────┐ ┌─────┐ ┌─────┐          │
│   │Post1│ │Post2│ │Post3│          │
│   └─────┘ └─────┘ └─────┘          │
│   (태그/검색어 필터링 결과)          │
│                                     │
└─────────────────────────────────────┘
```

### Key Features

#### 1. Tag Cloud (Word Art)
- **기능**: 모든 태그를 워드 클라우드 형태로 시각화
- **크기**: 태그 사용 빈도에 비례한 폰트 크기
- **인터랙션**:
  - 클릭 시 해당 태그의 포스트만 필터링
  - 호버 시 Glow 효과 + 포스트 개수 표시
  - 다중 선택 가능 (OR 조건)
- **스타일**: 그라데이션 텍스트 + 네온 효과

#### 2. Search Functionality
- **검색 범위**: 제목(title) + 내용(content) + 태그(tags)
- **실시간 검색**: 입력 시 즉시 필터링
- **검색 결과**: 아래 Post List에 동적으로 반영
- **하이라이트**: 검색어 매칭 부분 강조 표시

#### 3. Post List (Filtered)
- **레이아웃**: Grid (Desktop: 3열, Tablet: 2열, Mobile: 1열)
- **카드 정보**:
  - 썸네일 (optional)
  - 제목
  - 발행일
  - 태그 배지
  - 요약문 (첫 2-3줄)
- **필터링**: 태그 클릭 또는 검색어 입력 시 동적 필터링
- **상태 표시**: "전체 N개 포스트" / "태그명으로 필터링: N개" / "검색 결과: N개"

#### 4. Responsive Design
- **Mobile First** 접근
- **Breakpoints**:
  - Mobile: < 640px (1열)
  - Tablet: 640px - 1024px (2열)
  - Desktop: > 1024px (3열)
- **Tag Cloud**: 모바일에서는 줄바꿈, 데스크탑에서는 랜덤 배치

## Data Architecture

### 포스트 검색 시스템

#### 빌드 타임 인덱스 생성 방식 (Build-time Index Generation)

정적 사이트에서 검색 기능을 구현하기 위해 **빌드 시점에 모든 마크다운 파일을 읽어 JSON 인덱스를 생성**하는 방식을 사용합니다.

> **실제 스캔 경로는 `public/posts`가 아니라 `src/pages`다.** 아래 예시는 초기 설계 문서이며,
> 실제 구현(`scripts/generate-posts-index.ts`)은 `src/pages/**/*.md`를 스캔해
> slug를 `frontend/react/useEffect` 형태로 생성한다. `public/posts`는 사용하지 않는 빈 디렉토리다.

```
빌드 프로세스:
1. scripts/generate-posts-index.ts 실행
2. src/pages/**/*.md 파일들을 재귀적으로 스캔
3. 각 마크다운 파일에서 메타데이터 + 내용 추출
4. public/posts-index.json 생성

런타임 프로세스:
1. 앱 로드 시 posts-index.json을 한 번만 fetch
2. 메모리에 인덱스 보관
3. 검색/필터링은 메모리 내에서 처리 (빠름!)
```

#### 포스트 메타데이터 구조

```typescript
// src/types/blog.ts
interface PostMeta {
  slug: string;           // 파일 경로 기반 slug (예: "fe/react/useEffect")
  title: string;          // 포스트 제목
  date: string;           // 발행일 (YYYY-MM-DD)
  tags: string[];         // 태그 배열
  excerpt: string;        // 요약문 (첫 2-3줄)
  content: string;        // 검색용 전체 내용 (마크다운 제거)
  readingTime: number;    // 읽기 예상 시간 (분)
  filePath: string;       // 원본 파일 경로
}

interface PostsIndex {
  posts: PostMeta[];
  lastGenerated: string;  // 인덱스 생성 시각
}
```

#### 빌드 스크립트 예시

```typescript
// scripts/generate-posts-index.ts
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

function scanMarkdownFiles(dir: string): PostMeta[] {
  const posts: PostMeta[] = [];

  // 재귀적으로 .md 파일 찾기
  function scan(currentDir: string) {
    const files = fs.readdirSync(currentDir);

    files.forEach(file => {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (file.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const { data, content: markdown } = matter(content);

        // slug 생성: src/pages/frontend/react/useEffect.md → "frontend/react/useEffect"
        const relativePath = path.relative('src/pages', fullPath);
        const slug = relativePath.replace(/\.md$/, '');

        // 읽기 시간 계산 (평균 200 단어/분)
        const words = markdown.split(/\s+/).length;
        const readingTime = Math.ceil(words / 200);

        posts.push({
          slug,
          title: data.title || slug,
          date: data.date || new Date().toISOString(),
          tags: data.tags || [],
          excerpt: data.excerpt || markdown.slice(0, 150),
          content: markdown.replace(/[#*`]/g, ''), // 마크다운 문법 제거
          readingTime,
          filePath: fullPath,
        });
      }
    });
  }

  scan(dir);
  return posts;
}

// 실행
const posts = scanMarkdownFiles('src/pages');
const index = {
  posts,
  lastGenerated: new Date().toISOString(),
};

fs.writeFileSync(
  'public/posts-index.json',
  JSON.stringify(index, null, 2)
);

console.log(`✅ Generated index with ${posts.length} posts`);
```

#### 런타임 검색 훅

```typescript
// src/hooks/usePosts.ts
import { useState, useMemo } from 'react';
import postsIndex from '/posts-index.json';

export function usePosts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 태그 클라우드용 데이터
  const tagFrequency = useMemo(() => {
    const freq = new Map<string, number>();
    postsIndex.posts.forEach(post => {
      post.tags.forEach(tag => {
        freq.set(tag, (freq.get(tag) || 0) + 1);
      });
    });
    return freq;
  }, []);

  // 필터링된 포스트
  const filteredPosts = useMemo(() => {
    return postsIndex.posts.filter(post => {
      // 태그 필터링
      if (selectedTags.length > 0) {
        const hasTag = post.tags.some(tag => selectedTags.includes(tag));
        if (!hasTag) return false;
      }

      // 검색어 필터링
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          post.title.toLowerCase().includes(query) ||
          post.content.toLowerCase().includes(query) ||
          post.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [searchQuery, selectedTags]);

  return {
    posts: filteredPosts,
    allPosts: postsIndex.posts,
    searchQuery,
    setSearchQuery,
    selectedTags,
    setSelectedTags,
    tagFrequency,
  };
}
```

#### package.json 스크립트

```json
{
  "scripts": {
    "dev": "vite",
    "build": "npm run generate:index && vite build",
    "generate:index": "tsx scripts/generate-posts-index.ts",
    "preview": "vite preview"
  },
  "devDependencies": {
    "gray-matter": "^4.0.3",  // 마크다운 frontmatter 파싱
    "tsx": "^4.7.0"            // TypeScript 스크립트 실행
  }
}
```

#### 마크다운 파일 예시

```markdown
---
title: "React useEffect 완벽 가이드"
date: "2024-01-06"
tags: ["react", "hooks", "frontend"]
excerpt: "useEffect의 동작 원리와 올바른 사용법을 알아봅니다."
---

# React useEffect 완벽 가이드

useEffect는 React의 대표적인 훅입니다...

## 코드 예시

\`\`\`tsx
useEffect(() => {
  console.log('마운트!');
}, []);
\`\`\`

## 이미지 사용

![설명](./images/example.png)
```

**이미지 경로 규칙:**
- 포스트 소스(`src/pages/**/*.md`)는 Vite가 URL로 직접 서빙하지 않으므로, 이미지는 `public/`
  아래에 두고 절대 경로(`/images/...`)로 참조해야 한다. 상대 경로(`./images/example.png`)는
  현재 어떤 포스트에서도 실제로 쓰이지 않는 미검증 컨벤션이니, 이미지가 필요해지면
  `public/images/{slug 경로}/` 아래에 두는 절대 경로 방식을 우선 검토할 것.

#### 장점
- ✅ 빠른 검색 속도 (메모리 내 검색)
- ✅ 구현 간단
- ✅ 서버 불필요 (완전 정적)
- ✅ 포스트 100개 정도까지는 성능 문제 없음

#### 고려사항
- 포스트가 수백 개 이상이면 초기 로딩 크기 증가
- 필요 시 나중에 lazy loading이나 pagination으로 최적화 가능

## Features (MVP) — 구현 완료 (2026-07 기준)
- [x] 다크 테마 UI with 보라/파란 그라데이션
- [x] **태그 클라우드 (Word Art)**
  - [x] 태그별 사용 빈도 계산
  - [x] 빈도에 따른 동적 폰트 크기
  - [x] 클릭 필터링 기능
  - [x] 그라데이션 + Glow 효과
- [x] **검색 기능**
  - [x] 제목/내용/태그 통합 검색
  - [x] 실시간 필터링
  - [ ] 검색어 하이라이트 — 미구현 (PostCard/PostList에 매칭 텍스트 강조 없음)
- [x] **포스트 목록**
  - [x] Grid 레이아웃 (반응형)
  - [x] 태그/검색 필터링 결과 표시
  - [x] 포스트 카드 컴포넌트
- [x] 마크다운 기반 포스트 렌더링
- [x] 포스트 상세 페이지
- [x] About 페이지
- [x] 반응형 디자인 (Mobile-first)
- [x] GitHub Pages 자동 배포
- [x] 학습 섹션(`/learn`) — 최초 MVP 이후 추가된 기능, 위 "Learn 페이지" 절 참고

## Development Setup
```bash
# 프로젝트 초기화
npm create vite@latest . -- --template react-ts

# 기본 의존성 설치
npm install
npm install react-router-dom
npm install react-helmet-async
npm install date-fns

# 마크다운 관련
npm install react-markdown remark-gfm rehype-raw rehype-slug rehype-autolink-headings
npm install react-syntax-highlighter
npm install -D @types/react-syntax-highlighter

# TailwindCSS 설치
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# (참고) shadcn/ui는 초기 설계 단계에서만 검토되었고 실제로는 도입하지 않았다.
# 현재 컴포넌트는 shadcn/ui 없이 TailwindCSS 유틸리티 클래스만으로 직접 작성되어 있다.

# 포스트 인덱스 생성을 위한 의존성
npm install -D gray-matter tsx

# ESLint & Prettier
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
npm install -D eslint-plugin-react eslint-plugin-react-hooks

# Pretendard 폰트 파일 복사
mkdir -p public/fonts
cp ref/Pretendard-*.woff2 public/fonts/

# 포스트 인덱스 생성 (개발 중)
npm run generate:index

# 개발 서버 실행
npm run dev

# 프로덕션 빌드 (인덱스 생성 포함)
npm run build
```

### shadcn/ui 설정
- **Style**: New York (모던하고 깔끔한 스타일)
- **Base Color**: Slate (다크 테마와 잘 어울림)
- **CSS Variables**: Yes (커스텀 컬러 시스템 적용 용이)
- **Components Path**: `@/components/ui`
- **Utils Path**: `@/lib/utils`

### Pretendard 폰트 설정
```css
/* src/styles/globals.css */
@font-face {
  font-family: 'Pretendard';
  font-weight: 100;
  src: url('/fonts/Pretendard-Thin.woff2') format('woff2');
}
@font-face {
  font-family: 'Pretendard';
  font-weight: 200;
  src: url('/fonts/Pretendard-ExtraLight.woff2') format('woff2');
}
@font-face {
  font-family: 'Pretendard';
  font-weight: 300;
  src: url('/fonts/Pretendard-Light.woff2') format('woff2');
}
@font-face {
  font-family: 'Pretendard';
  font-weight: 400;
  src: url('/fonts/Pretendard-Regular.woff2') format('woff2');
}
@font-face {
  font-family: 'Pretendard';
  font-weight: 500;
  src: url('/fonts/Pretendard-Medium.woff2') format('woff2');
}
@font-face {
  font-family: 'Pretendard';
  font-weight: 600;
  src: url('/fonts/Pretendard-SemiBold.woff2') format('woff2');
}
@font-face {
  font-family: 'Pretendard';
  font-weight: 700;
  src: url('/fonts/Pretendard-Bold.woff2') format('woff2');
}
@font-face {
  font-family: 'Pretendard';
  font-weight: 800;
  src: url('/fonts/Pretendard-ExtraBold.woff2') format('woff2');
}
@font-face {
  font-family: 'Pretendard';
  font-weight: 900;
  src: url('/fonts/Pretendard-Black.woff2') format('woff2');
}

body {
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.025em; /* tracking-tight */
}
```

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'sans-serif'],
      },
      letterSpacing: {
        // tracking-tight를 기본으로 사용
      }
    }
  }
}
```

## Additional Configurations

### ESLint 설정

이 프로젝트는 ESLint 9를 쓰므로 `.eslintrc.cjs`(legacy config)가 아니라 **`eslint.config.js`
(flat config)**를 사용한다. `.eslintrc.*`만 있고 `eslint.config.js`가 없으면 ESLint 9는
`npm run lint`를 아예 실행하지 못하고 즉시 실패하니 주의. 실제 설정은 프로젝트 루트의
`eslint.config.js` 참고 — `src/**/*.{ts,tsx}`에는 브라우저 글로벌 + React/React Hooks/
react-refresh/prettier 규칙을, `scripts/**/*.ts`와 `*.config.{js,ts}`에는 Node 글로벌을 적용하는
두 블록으로 나뉘어 있다.

### Prettier 설정
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

```
// .prettierignore
dist
node_modules
.github
*.md
pnpm-lock.yaml
package-lock.json
```

### React Router 설정

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Post from './pages/Post';
import About from './pages/About';
import NotFound from './pages/NotFound';

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/post/:slug" element={<Post />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
```

### 마크다운 렌더러 컴포넌트

```tsx
// src/components/blog/MarkdownRenderer.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Props {
  content: string;
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeSlug, rehypeAutolinkHeadings]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

### SEO 컴포넌트

```tsx
// src/components/seo/SEO.tsx
import { Helmet } from 'react-helmet-async';

interface Props {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
}

export default function SEO({
  title = 'jratul의 기술 블로그',
  description = 'Frontend & Backend 개발 이야기',
  keywords = ['개발', 'React', 'TypeScript', '블로그'],
  image = '/og-image.png',
  url = 'https://jratul.github.io',
}: Props) {
  const fullTitle = title === 'jratul의 기술 블로그' ? title : `${title} | jratul의 기술 블로그`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
```

### 유틸리티 함수들

```typescript
// src/utils/readingTime.ts
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}
```

```typescript
// src/utils/formatDate.ts
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export function formatDate(dateString: string): string {
  return format(new Date(dateString), 'yyyy년 M월 d일', { locale: ko });
}

export function formatDateRelative(dateString: string): string {
  return format(new Date(dateString), 'yyyy.MM.dd');
}
```

## Deployment

### GitHub Actions 워크플로우

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### SPA 라우팅 처리

```html
<!-- public/404.html -->
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <script>
      // SPA fallback: GitHub Pages에서 404 발생 시 index.html로 리다이렉트
      sessionStorage.redirect = location.href;
    </script>
    <meta http-equiv="refresh" content="0;URL='/'"></meta>
  </head>
  <body></body>
</html>
```

```html
<!-- index.html - head에 추가 -->
<script>
  // SPA fallback 처리
  (function() {
    var redirect = sessionStorage.redirect;
    delete sessionStorage.redirect;
    if (redirect && redirect != location.href) {
      history.replaceState(null, null, redirect);
    }
  })();
</script>
```

### robots.txt

```
# public/robots.txt
User-agent: *
Allow: /
Sitemap: https://jratul.github.io/sitemap.xml
```

### Sitemap 생성 스크립트

```typescript
// scripts/generate-sitemap.ts
import fs from 'fs';
import path from 'path';

interface Post {
  slug: string;
  date: string;
}

const baseUrl = 'https://jratul.github.io';

function generateSitemap(posts: Post[]): string {
  const urls = [
    { loc: '/', priority: '1.0' },
    { loc: '/about', priority: '0.8' },
    ...posts.map(post => ({
      loc: `/post/${post.slug}`,
      lastmod: post.date,
      priority: '0.9'
    }))
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${baseUrl}${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
}

// posts-index.json 읽어서 sitemap 생성
const postsIndex = JSON.parse(fs.readFileSync('public/posts-index.json', 'utf-8'));
const sitemap = generateSitemap(postsIndex.posts);
fs.writeFileSync('public/sitemap.xml', sitemap);

console.log('✅ Generated sitemap.xml');
```

### package.json 스크립트 업데이트

```json
{
  "scripts": {
    "dev": "vite",
    "build": "npm run generate:index && npm run generate:sitemap && vite build",
    "generate:index": "tsx scripts/generate-posts-index.ts",
    "generate:sitemap": "tsx scripts/generate-sitemap.ts",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "type-check": "tsc --noEmit"
  }
}
```

### Vite 설정

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/', // GitHub Pages username.github.io의 경우
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
```

### tsconfig.json 경로 설정

```json
// tsconfig.app.json에 추가 — baseUrl은 deprecated라 쓰지 않는다 (commit e212ab5에서 제거됨)
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Blog Post Writing Guidelines

블로그 포스트 작성 시 다음 가이드라인을 준수합니다:

### 작성 스타일
- **담백한 투**: "완벽 가이드", "마스터하기" 같은 과장된 표현 지양
- **간결함**: 핵심만 전달, 불필요한 수식어 최소화
- **실용성**: 이론보다 실제 활용 예제 중심

### 구조
- **구분선 활용**: 섹션 간 구분을 위해 `---` 사용
  ```markdown
  ## 기본 개념

  내용...

  ---

  ## 실용 예제

  내용...
  ```

### 제목 예시
- ❌ "JavaScript 클로저 완벽 가이드"
- ✅ "JavaScript 클로저(Closure)"

- ❌ "React Hooks 마스터하기"
- ✅ "React Hooks 사용법"

### Frontmatter 형식
```markdown
---
title: "간결한 제목"
date: "YYYY-MM-DD"
tags: ["tag1", "tag2", "tag3"]
excerpt: "1-2문장 요약"
---
```

`date`는 `date "+%Y-%m-%d"`로 확인한 실제 현재 날짜를 쓴다 — 이전 포스트 날짜를
복사하지 않는다 (자세한 내용은 상단 "Workflow Rules" 참고).

## Notes
- Vite base path는 `/`로 설정 (username.github.io이므로)
- GitHub Pages SPA 라우팅은 404.html fallback으로 처리
- 빌드 시 포스트 인덱스와 sitemap 자동 생성
- ESLint & Prettier로 코드 품질 관리
- 마크다운 내 이미지는 절대 경로(`/images/...`, `public/` 기준) 사용 — 상세 규칙은
  위 "이미지 경로 규칙" 절 참고

## 관련 문서
- [README.md](./README.md) — 프로젝트 개요, 시작하기 가이드
- [TECH.md](./TECH.md) — 파일별 기술 상세와 비자명한 구현 예시
- [PROJECT.md](./PROJECT.md) — 설정 파일 역할, 패키지별 사용처
