---
title: "데이터 페칭"
order: 5
---

# 데이터 페칭

Next.js에서 데이터를 가져오는 방식은 React와 꽤 다릅니다.
어떤 방식이 있는지, 각각 언제 쓰는지 실용적인 예제와 함께 살펴봅니다.

---

## React에서는 어떻게 했나요?

기존 React에서는 주로 `useEffect` 안에서 fetch를 했습니다.

```tsx
// 기존 React 방식
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div>로딩 중...</div>;
  return <div>{user?.name}</div>;
}
```

이 방식의 문제:
1. 브라우저에서 실행되므로 데이터 로딩이 늦게 시작됨
2. 로딩 상태 관리가 번거로움
3. 서버에서 가져오면 더 빠를 데이터도 클라이언트에서 가져옴

---

## Next.js 서버 컴포넌트에서 데이터 페칭

App Router에서는 서버 컴포넌트가 `async/await`를 직접 지원합니다.

```tsx
// app/users/[id]/page.tsx
// async 키워드 - 서버에서 비동기로 실행됨
async function UserPage({ params }: { params: { id: string } }) {
  // await로 데이터를 기다림 - 로딩 상태 관리 불필요!
  const user = await fetch(`https://api.example.com/users/${params.id}`)
    .then(res => {
      if (!res.ok) throw new Error('사용자를 찾을 수 없습니다');
      return res.json();
    });

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

export default UserPage;
```

훨씬 간결합니다. useState와 useEffect가 사라졌습니다.

---

## 데이터 페칭 전략 3가지

### 1. 정적 생성 (Static Generation / SSG)

빌드 시점에 데이터를 가져와 HTML을 미리 만들어 놓습니다.

```
비유: 미리 만들어 둔 도시락
배달 주문이 들어오면 즉시 내어줄 수 있습니다.
```

```tsx
// app/blog/[slug]/page.tsx
// fetch에 캐시 옵션을 지정하지 않으면 기본값이 'force-cache' (정적 생성)
async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await fetch(
    `https://api.example.com/posts/${params.slug}`,
    { cache: 'force-cache' } // 빌드 시 캐시, 이후 캐시된 결과 반환
  ).then(res => res.json());

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  );
}
```

**언제 쓰나요?**
- 블로그 포스트, 마케팅 페이지, 제품 상세 페이지
- 데이터가 자주 변하지 않는 곳
- 빠른 응답 속도가 중요한 곳

### 2. 서버 사이드 렌더링 (Server-Side Rendering / SSR)

매 요청마다 서버에서 데이터를 가져와 HTML을 만듭니다.

```
비유: 주문받아 만드는 음식
손님(요청)이 올 때마다 새로 만듭니다.
최신 재료(데이터)를 사용할 수 있습니다.
```

```tsx
// app/dashboard/page.tsx
async function Dashboard() {
  const data = await fetch(
    'https://api.example.com/dashboard',
    { cache: 'no-store' } // 캐시 안 함 = 매 요청마다 새로 가져옴
  ).then(res => res.json());

  return (
    <div>
      <h1>대시보드</h1>
      <p>실시간 방문자: {data.visitors}</p>
      <p>오늘 매출: {data.revenue}원</p>
    </div>
  );
}
```

**언제 쓰나요?**
- 로그인한 사용자별 맞춤 데이터
- 실시간 재고 정보
- 개인화된 콘텐츠

### 3. 점진적 정적 재생성 (ISR - Incremental Static Regeneration)

정적 생성의 속도 + 주기적 데이터 갱신을 결합합니다.

```
비유: 일정 시간마다 도시락을 새로 만드는 방식
오전에 만든 도시락을 점심까지 내어주다가, 2시간마다 새로 만듭니다.
```

```tsx
// app/news/page.tsx
async function NewsPage() {
  const news = await fetch(
    'https://api.example.com/news',
    {
      next: { revalidate: 3600 } // 1시간(3600초)마다 재검증
    }
  ).then(res => res.json());

  return (
    <div>
      {news.map(article => (
        <div key={article.id}>
          <h2>{article.title}</h2>
        </div>
      ))}
    </div>
  );
}
```

**언제 쓰나요?**
- 뉴스, 블로그 포스트 목록
- 상품 가격 정보 (매시간 갱신)
- 자주 바뀌지는 않지만 최신 상태가 필요한 데이터

---

## 데이터 페칭 옵션 정리

```tsx
// 1. 정적 생성 (기본값과 동일)
fetch(url, { cache: 'force-cache' });

// 2. SSR - 캐시 안 함
fetch(url, { cache: 'no-store' });

// 3. ISR - 60초마다 재검증
fetch(url, { next: { revalidate: 60 } });

// 4. 특정 태그로 수동 재검증 (나중에 서술)
fetch(url, { next: { tags: ['posts'] } });
```

---

## 여러 데이터를 동시에 가져오기

```tsx
// ❌ 순차적으로 가져오면 느림 (폭포수 현상)
async function SlowPage() {
  const user = await fetchUser();     // 1초 대기
  const posts = await fetchPosts();   // 1초 대기 (총 2초)
  const comments = await fetchComments(); // 1초 대기 (총 3초)
  // ...
}
```

```tsx
// ✅ Promise.all로 병렬 처리
async function FastPage() {
  // 세 요청을 동시에 시작
  const [user, posts, comments] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchComments(),
  ]);
  // 가장 오래 걸리는 것 기준으로 1초 만에 완료!

  return (
    <div>
      <h1>{user.name}</h1>
      <PostList posts={posts} />
      <CommentList comments={comments} />
    </div>
  );
}
```

---

## 데이터베이스 직접 접근

서버 컴포넌트에서는 ORM(Prisma, Drizzle 등)을 직접 사용할 수 있습니다.

```tsx
// app/products/page.tsx
import { db } from '@/lib/db'; // Prisma 클라이언트

async function ProductsPage() {
  // Prisma로 데이터베이스 직접 조회
  const products = await db.product.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    take: 20, // 최대 20개
    include: {
      category: true, // 카테고리 정보 포함
    },
  });

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>{product.category.name}</p>
          <strong>{product.price.toLocaleString()}원</strong>
        </div>
      ))}
    </div>
  );
}
```

API 엔드포인트를 거치지 않아도 됩니다. 코드가 간결해지고 네트워크 왕복도 줄어듭니다.

---

## 로딩 UI

데이터를 가져오는 동안 표시할 로딩 화면은 `loading.tsx` 파일로 만듭니다.

```
app/
├── blog/
│   ├── page.tsx      ← 블로그 목록 페이지
│   └── loading.tsx   ← 로딩 중 표시할 UI
```

```tsx
// app/blog/loading.tsx
// 데이터 페칭 중에 자동으로 표시됨
export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* 스켈레톤 UI */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="mb-4 p-4 border rounded">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6 mt-1" />
        </div>
      ))}
    </div>
  );
}
```

---

## 에러 처리

데이터 페칭 중 에러가 나면 `error.tsx`가 표시됩니다.

```
app/
├── blog/
│   ├── page.tsx
│   ├── loading.tsx
│   └── error.tsx     ← 에러 발생 시 표시할 UI
```

```tsx
'use client'; // error.tsx는 반드시 클라이언트 컴포넌트여야 함

interface ErrorProps {
  error: Error;
  reset: () => void; // 페이지 재시도 함수
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="text-center py-20">
      <h2>데이터를 불러오는 데 실패했습니다</h2>
      <p className="text-gray-500">{error.message}</p>
      <button
        onClick={reset} // 버튼 클릭 시 재시도
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        다시 시도
      </button>
    </div>
  );
}
```

---

## Suspense로 부분 로딩

페이지 전체가 아니라 특정 부분만 로딩 UI를 보여주고 싶을 때 `Suspense`를 씁니다.

```tsx
// app/shop/page.tsx
import { Suspense } from 'react';
import ProductList from './ProductList';
import Recommendations from './Recommendations';

async function ShopPage() {
  // 빠른 데이터 (카테고리)는 바로 렌더링
  const categories = await getCategories();

  return (
    <div>
      <h1>쇼핑몰</h1>

      {/* 카테고리는 즉시 표시 */}
      <CategoryNav categories={categories} />

      {/* 상품 목록은 따로 로딩 */}
      <Suspense fallback={<ProductSkeleton />}>
        <ProductList />
      </Suspense>

      {/* 추천 상품은 또 따로 로딩 */}
      <Suspense fallback={<div>추천 상품 로딩 중...</div>}>
        <Recommendations />
      </Suspense>
    </div>
  );
}
```

이렇게 하면 빠른 데이터부터 순서대로 화면에 나타납니다. 사용자 경험이 좋아집니다.

---

## 캐시 무효화 (Revalidation)

데이터가 변경되었을 때 캐시를 갱신하는 방법입니다.

### 경로 기반 재검증

```tsx
// app/actions/post.ts
'use server'; // 서버 액션

import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  // 포스트 저장
  await db.post.create({
    data: {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    },
  });

  // /blog 경로의 캐시 무효화 → 다음 요청 시 새 데이터 가져옴
  revalidatePath('/blog');
}
```

### 태그 기반 재검증

```tsx
// 데이터 페칭 시 태그 지정
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { tags: ['products'] } // 'products' 태그로 캐시
  });
  return res.json();
}

// 나중에 특정 태그의 캐시만 무효화
import { revalidateTag } from 'next/cache';

export async function updateProduct(id: string, data: unknown) {
  await saveProduct(id, data);
  revalidateTag('products'); // 'products' 태그 캐시 전체 무효화
}
```

---

## 클라이언트 컴포넌트에서 데이터 페칭

클라이언트 컴포넌트에서도 데이터를 가져올 수 있습니다. 주로 사용자 인터랙션에 반응할 때 씁니다.

```tsx
'use client';

import { useState, useEffect } from 'react';

// 검색 결과처럼 사용자 입력에 따라 바뀌는 데이터
function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;

    setLoading(true);
    fetch(`/api/search?q=${query}`)
      .then(res => res.json())
      .then(data => {
        setResults(data);
        setLoading(false);
      });
  }, [query]); // query가 바뀔 때마다 재요청

  if (loading) return <div>검색 중...</div>;

  return (
    <ul>
      {results.map(item => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
}
```

또는 SWR, TanStack Query 같은 라이브러리를 사용합니다.

```tsx
'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

function UserProfile({ userId }: { userId: string }) {
  const { data, error, isLoading } = useSWR(
    `/api/users/${userId}`,
    fetcher
  );

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>에러 발생</div>;

  return <div>{data.name}</div>;
}
```

---

## 흔한 실수

### 실수 1: 매번 새로 요청 (불필요한 cache: 'no-store')

```tsx
// ❌ 정적 데이터인데 매 요청마다 가져옴
async function AboutPage() {
  const info = await fetch('/api/company-info', {
    cache: 'no-store' // 회사 정보는 자주 안 바뀌는데 왜 이럴까요?
  }).then(res => res.json());
}

// ✅ ISR로 하루에 한 번만 갱신
async function AboutPage() {
  const info = await fetch('/api/company-info', {
    next: { revalidate: 86400 } // 24시간
  }).then(res => res.json());
}
```

### 실수 2: 폭포수(Waterfall) 요청

```tsx
// ❌ 순차 요청 - 불필요하게 느림
async function Page() {
  const user = await getUser();       // 300ms
  const orders = await getOrders();   // 300ms
  const wishlist = await getWishlist(); // 300ms
  // 총 900ms 소요
}

// ✅ 병렬 요청
async function Page() {
  const [user, orders, wishlist] = await Promise.all([
    getUser(),
    getOrders(),
    getWishlist(),
  ]);
  // 약 300ms 소요 (가장 느린 요청 시간)
}
```

### 실수 3: 서버 컴포넌트에서 민감한 데이터 노출

```tsx
// ❌ 전체 사용자 객체를 클라이언트로 전송
async function UserPage() {
  const user = await db.user.findFirst();
  // user에 password, socialSecurityNumber 등이 있을 수 있음!
  return <UserCard user={user} />;
}

// ✅ 필요한 필드만 선택
async function UserPage() {
  const user = await db.user.findFirst({
    select: {
      id: true,
      name: true,
      email: true,
      // password: false (기본적으로 제외)
    }
  });
  return <UserCard user={user} />;
}
```

---

## 실전 예시: 이커머스 상품 페이지

```tsx
// app/products/[id]/page.tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';

async function ProductPage({ params }: { params: { id: string } }) {
  // 상품 기본 정보 (ISR - 1시간마다 갱신)
  const product = await fetch(
    `https://api.shop.com/products/${params.id}`,
    { next: { revalidate: 3600 } }
  ).then(res => {
    if (!res.ok) notFound(); // 404 페이지로 이동
    return res.json();
  });

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>

      {/* 재고/가격은 실시간 (SSR) */}
      <Suspense fallback={<div>가격 확인 중...</div>}>
        <PriceAndStock productId={params.id} />
      </Suspense>

      {/* 리뷰는 ISR (10분마다 갱신) */}
      <Suspense fallback={<div>리뷰 로딩 중...</div>}>
        <Reviews productId={params.id} />
      </Suspense>
    </div>
  );
}

// 재고/가격 컴포넌트 (항상 최신 정보 필요)
async function PriceAndStock({ productId }: { productId: string }) {
  const stock = await fetch(
    `https://api.shop.com/products/${productId}/stock`,
    { cache: 'no-store' } // 캐시 없음 - 실시간
  ).then(res => res.json());

  return (
    <div>
      <strong>{stock.price.toLocaleString()}원</strong>
      <span>{stock.available ? '재고 있음' : '품절'}</span>
    </div>
  );
}

// 리뷰 컴포넌트 (10분마다 갱신)
async function Reviews({ productId }: { productId: string }) {
  const reviews = await fetch(
    `https://api.shop.com/products/${productId}/reviews`,
    { next: { revalidate: 600 } } // 10분
  ).then(res => res.json());

  return (
    <div>
      {reviews.map(review => (
        <div key={review.id}>
          <strong>{review.author}</strong>
          <p>{review.content}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 정리

| 전략 | 옵션 | 사용 시점 |
|------|------|-----------|
| 정적 생성(SSG) | `cache: 'force-cache'` | 변경 없는 정적 콘텐츠 |
| 서버 사이드(SSR) | `cache: 'no-store'` | 매 요청마다 최신 데이터 필요 |
| ISR | `next: { revalidate: N }` | 주기적으로 갱신되는 데이터 |
| 태그 기반 ISR | `next: { tags: [...] }` | 이벤트 발생 시 특정 데이터만 갱신 |

- **서버 컴포넌트**: async/await 직접 사용, 로딩 상태 관리 불필요
- **병렬 페칭**: Promise.all로 여러 요청 동시 처리
- **Suspense**: 부분적 로딩 UI로 사용자 경험 향상
- **loading.tsx / error.tsx**: 로딩/에러 UI를 파일로 분리
