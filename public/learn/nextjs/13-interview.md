---
title: "Next.js 면접 예상 질문"
order: 13
---

# Next.js 면접 예상 질문

Next.js 개발자 면접에서 빈출되는 핵심 질문들입니다.

## Q1. CSR, SSR, SSG, ISR의 차이를 설명해주세요

| 방식 | 렌더링 위치 | 데이터 갱신 | 사용 케이스 |
|-----|-----------|------------|------------|
| **CSR** | 브라우저 | 항상 최신 | 대시보드, 인증 필요 페이지 |
| **SSR** | 서버 (요청마다) | 항상 최신 | 실시간 데이터, 사용자별 다른 페이지 |
| **SSG** | 빌드 타임 | 재배포 시 갱신 | 블로그, 문서, 마케팅 페이지 |
| **ISR** | 빌드 타임 + 백그라운드 | 주기적 자동 갱신 | 뉴스, 상품 목록 |

```typescript
// SSG (App Router — 기본값)
export default async function Page() {
    const data = await fetch('https://api.example.com/posts', {
        cache: 'force-cache'  // 빌드 타임에 캐시
    });
}

// SSR
const data = await fetch(url, { cache: 'no-store' });

// ISR
const data = await fetch(url, { next: { revalidate: 60 } });  // 60초마다 갱신
```

---

## Q2. App Router와 Pages Router의 차이는?

| 비교 | Pages Router | App Router (Next.js 13+) |
|-----|-------------|--------------------------|
| 디렉토리 | `pages/` | `app/` |
| 기본 컴포넌트 | Client Component | **Server Component** |
| 레이아웃 | `_app.tsx`, `_document.tsx` | `layout.tsx` (중첩 가능) |
| 데이터 패칭 | `getServerSideProps`, `getStaticProps` | async/await 직접 사용 |
| 로딩/에러 | 수동 구현 | `loading.tsx`, `error.tsx` 내장 |
| 스트리밍 | 제한적 | `Suspense` 기반 스트리밍 지원 |

---

## Q3. Server Component와 Client Component의 차이는?

**Server Component (기본):**
- 서버에서만 실행 — 클라이언트에 JS 번들 포함 안 됨
- DB, 파일시스템 직접 접근 가능
- `useState`, `useEffect`, 이벤트 핸들러 사용 불가

**Client Component (`'use client'` 선언):**
- 브라우저에서 실행 (SSR로 HTML 생성 후 하이드레이션)
- React Hooks 사용 가능
- 브라우저 API 접근 가능

```tsx
// Server Component — 데이터 패칭
async function PostList() {
    const posts = await db.post.findMany();  // 서버에서만 실행
    return <ul>{posts.map(p => <PostItem key={p.id} post={p} />)}</ul>;
}

// Client Component — 인터랙션
'use client';
function LikeButton({ postId }) {
    const [liked, setLiked] = useState(false);
    return <button onClick={() => setLiked(l => !l)}>{liked ? '❤️' : '🤍'}</button>;
}
```

---

## Q4. Next.js의 캐싱 전략을 설명해주세요

Next.js App Router는 4가지 레이어의 캐싱을 제공합니다.

```
1. Request Memoization  — 동일 요청을 렌더링 도중 중복 제거
2. Data Cache           — fetch 결과를 영구 캐시 (CDN)
3. Full Route Cache     — 정적 페이지 HTML/RSC Payload 캐시
4. Router Cache         — 클라이언트 측 내비게이션 캐시
```

```typescript
// 캐시 제어
fetch(url, { cache: 'force-cache' })    // 영구 캐시 (SSG)
fetch(url, { cache: 'no-store' })       // 캐시 안 함 (SSR)
fetch(url, { next: { revalidate: 60 }}) // 60초 TTL (ISR)

// 수동 캐시 무효화
import { revalidatePath, revalidateTag } from 'next/cache';
revalidatePath('/blog');
revalidateTag('posts');
```

---

## Q5. Next.js의 이미지 최적화는 어떻게 동작하나요?

`<Image>` 컴포넌트가 자동으로 처리합니다.

```tsx
import Image from 'next/image';

<Image
    src="/hero.jpg"
    alt="히어로 이미지"
    width={800}
    height={400}
    priority          // LCP 이미지에 preload
    placeholder="blur" // 로딩 중 blur 플레이스홀더
/>
```

**자동 최적화:**
- WebP/AVIF 변환 (브라우저 지원 기준)
- 요청 시 리사이징 (서버/CDN에서 처리)
- `sizes` 속성으로 반응형 이미지 제공
- 자동 lazy loading (priority 없는 경우)

외부 이미지는 `next.config.js`의 `remotePatterns`에 도메인 등록 필요합니다.

---

## Q6. Middleware는 어디에서 실행되고 무엇에 사용하나요?

미들웨어는 **Edge Runtime에서 요청이 완료되기 전에 실행**됩니다.

```typescript
// middleware.ts (루트에 위치)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token');

    // 인증 체크
    if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 헤더 추가
    const response = NextResponse.next();
    response.headers.set('x-custom-header', 'value');
    return response;
}

export const config = {
    matcher: ['/((?!api|_next|favicon.ico).*)']
};
```

**활용:** 인증/인가, A/B 테스팅, 지역화(i18n), 봇 차단

---

## Q7. Server Actions란 무엇인가요?

Server Actions는 클라이언트에서 **서버 함수를 직접 호출**하는 기능입니다.

```typescript
// app/actions.ts
'use server';

export async function createPost(formData: FormData) {
    const title = formData.get('title') as string;
    await db.post.create({ data: { title } });
    revalidatePath('/posts');
}

// 폼에서 사용
function CreatePostForm() {
    return (
        <form action={createPost}>
            <input name="title" />
            <button type="submit">작성</button>
        </form>
    );
}
```

**장점:** API Route 없이 폼 처리 가능, JS 비활성화 환경에서도 작동

---

## Q8. Next.js에서 환경 변수를 어떻게 관리하나요?

```bash
# .env.local (git에 포함하지 않음)
DATABASE_URL=postgresql://...          # 서버에서만 접근 가능
NEXT_PUBLIC_API_URL=https://api.example.com  # NEXT_PUBLIC_ 접두사: 클라이언트에도 노출
```

```typescript
// 서버 컴포넌트 / API Route
const dbUrl = process.env.DATABASE_URL;

// 클라이언트 컴포넌트
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

⚠️ `NEXT_PUBLIC_` 없는 변수는 클라이언트 번들에 포함되지 않습니다. 시크릿 키는 절대 `NEXT_PUBLIC_`으로 노출하면 안 됩니다.
