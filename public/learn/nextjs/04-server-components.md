---
title: "서버 컴포넌트 vs 클라이언트 컴포넌트"
order: 4
---

# 서버 컴포넌트 vs 클라이언트 컴포넌트

Next.js 13부터 도입된 **서버 컴포넌트(Server Components)**는 React 생태계에서 가장 큰 변화 중 하나입니다.
처음 접하면 헷갈리지만, 원리를 이해하면 왜 이렇게 설계했는지 바로 납득하게 됩니다.

---

## 비유로 이해하기

레스토랑을 떠올려 보세요.

- **서버 컴포넌트** = 주방에서 미리 조리해 접시에 담아 내보내는 요리
  - 손님(브라우저)은 완성된 요리만 받습니다
  - 요리 과정(데이터베이스 접근, API 호출)은 손님이 볼 수 없습니다
- **클라이언트 컴포넌트** = 테이블에서 직접 구워 먹는 샤부샤부
  - 손님이 직접 불을 켜고 재료를 넣습니다 (상태, 이벤트 핸들러)
  - 실시간 인터랙션이 일어납니다

---

## React에서는 어떻게 했나요?

기존 React(Create React App, Vite)에서는 모든 컴포넌트가 **브라우저에서 실행**됩니다.

```tsx
// 기존 React - 이 코드는 브라우저에서 실행됨
function BlogPost({ id }) {
  const [post, setPost] = useState(null);

  useEffect(() => {
    // 브라우저에서 직접 API 호출
    fetch(`/api/posts/${id}`)
      .then(res => res.json())
      .then(data => setPost(data));
  }, [id]);

  if (!post) return <div>로딩 중...</div>;

  return <article>{post.title}</article>;
}
```

이 방식의 문제점:
1. 브라우저가 JS를 다운로드 → 실행 → API 호출 → 화면 그리기 (느림)
2. 데이터베이스에 직접 접근 불가 (보안 문제)
3. 초기 HTML이 비어있어 SEO에 불리

---

## Next.js 서버 컴포넌트

Next.js App Router에서 컴포넌트는 기본적으로 **서버 컴포넌트**입니다.

```tsx
// app/blog/[id]/page.tsx
// 별도의 선언 없이 기본값이 서버 컴포넌트

async function BlogPost({ params }: { params: { id: string } }) {
  // 서버에서 직접 데이터베이스 접근 가능!
  const post = await db.post.findUnique({
    where: { id: params.id }
  });

  // 또는 외부 API 직접 호출
  const res = await fetch(`https://api.example.com/posts/${params.id}`);
  const data = await res.json();

  // 완성된 HTML을 브라우저로 전송
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}

export default BlogPost;
```

브라우저는 이미 완성된 HTML을 받습니다. JavaScript 번들에 이 컴포넌트 코드가 포함되지 않습니다!

---

## 서버 컴포넌트의 특징

### 할 수 있는 것

```tsx
// app/dashboard/page.tsx
import { cookies } from 'next/headers'; // 서버 전용 API
import { headers } from 'next/headers'; // 요청 헤더 접근

async function Dashboard() {
  // 1. async/await 직접 사용
  const data = await fetchSomeData();

  // 2. 환경 변수 (서버 전용 포함)
  const apiKey = process.env.SECRET_API_KEY; // 브라우저에 노출 안 됨

  // 3. 쿠키/헤더 접근
  const cookieStore = cookies();
  const theme = cookieStore.get('theme');

  // 4. 데이터베이스 직접 접근
  const user = await prisma.user.findFirst();

  return <div>{/* ... */}</div>;
}
```

### 할 수 없는 것

```tsx
// ❌ 서버 컴포넌트에서 이런 건 안 됩니다
async function ServerComponent() {
  // ❌ useState 사용 불가
  const [count, setCount] = useState(0);

  // ❌ useEffect 사용 불가
  useEffect(() => {}, []);

  // ❌ 브라우저 API 사용 불가
  window.addEventListener('click', () => {});

  // ❌ 이벤트 핸들러 사용 불가
  return <button onClick={() => alert('hi')}>클릭</button>;
}
```

---

## 클라이언트 컴포넌트

`'use client'`를 파일 맨 위에 선언하면 클라이언트 컴포넌트가 됩니다.

```tsx
'use client'; // 이 파일은 브라우저에서 실행됩니다

import { useState } from 'react';

// 좋아요 버튼 - 클릭 이벤트가 필요하므로 클라이언트 컴포넌트
function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);

  const handleLike = async () => {
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);

    // 서버에 좋아요 상태 저장
    await fetch('/api/likes', {
      method: 'POST',
      body: JSON.stringify({ postId, liked: !liked }),
    });
  };

  return (
    <button onClick={handleLike}>
      {liked ? '❤️' : '🤍'} {count}
    </button>
  );
}

export default LikeButton;
```

---

## 서버 컴포넌트 안에 클라이언트 컴포넌트 넣기

실제 앱에서는 두 가지를 함께 씁니다.

```tsx
// app/blog/[id]/page.tsx (서버 컴포넌트)
import LikeButton from '@/components/LikeButton'; // 클라이언트 컴포넌트

async function BlogPost({ params }: { params: { id: string } }) {
  // 서버에서 데이터 페칭
  const post = await getPost(params.id);

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>

      {/* 클라이언트 컴포넌트를 서버 컴포넌트 안에서 사용 */}
      <LikeButton postId={post.id} />
    </article>
  );
}
```

이때 데이터는 서버에서 가져오고, 인터랙티브한 부분만 클라이언트 컴포넌트로 처리합니다.

---

## 클라이언트 컴포넌트에 서버 데이터 전달하기

```tsx
// app/shop/page.tsx (서버 컴포넌트)
import ProductList from '@/components/ProductList'; // 클라이언트 컴포넌트

async function ShopPage() {
  // 서버에서 데이터 페칭 (DB, API 등)
  const products = await getProducts();

  // props로 클라이언트 컴포넌트에 전달
  // 단, 직렬화 가능한 데이터만 전달 가능 (함수 X, 클래스 인스턴스 X)
  return <ProductList initialProducts={products} />;
}
```

```tsx
'use client';
// components/ProductList.tsx (클라이언트 컴포넌트)

import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
}

function ProductList({ initialProducts }: { initialProducts: Product[] }) {
  // 서버에서 받은 초기 데이터로 상태 초기화
  const [products, setProducts] = useState(initialProducts);
  const [filter, setFilter] = useState('');

  const filtered = products.filter(p =>
    p.name.includes(filter)
  );

  return (
    <div>
      {/* 검색 필터 - 클라이언트에서 실시간 처리 */}
      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="상품 검색..."
      />
      {filtered.map(product => (
        <div key={product.id}>{product.name} - {product.price}원</div>
      ))}
    </div>
  );
}
```

---

## 컴포넌트 분류 기준

어떤 컴포넌트를 서버/클라이언트로 만들어야 할까요?

| 상황 | 서버 컴포넌트 | 클라이언트 컴포넌트 |
|------|-------------|-------------------|
| 데이터베이스/API 접근 | ✅ | ❌ |
| 민감한 정보(API 키) | ✅ | ❌ |
| useState, useEffect | ❌ | ✅ |
| onClick, onChange 등 이벤트 | ❌ | ✅ |
| 브라우저 API (localStorage 등) | ❌ | ✅ |
| 실시간 데이터 (WebSocket) | ❌ | ✅ |

**원칙: 가능하면 서버 컴포넌트로, 인터랙션이 필요할 때만 클라이언트 컴포넌트로**

---

## 흔한 실수

### 실수 1: 'use client' 남용

```tsx
// ❌ 잘못된 예 - 모든 파일에 'use client' 붙이기
'use client';

// 이 컴포넌트는 클릭 이벤트도 없고 상태도 없는데
// 왜 클라이언트로 만들었을까요?
async function UserProfile({ userId }: { userId: string }) {
  const user = await getUser(userId); // 서버 컴포넌트에서만 동작
  return <div>{user.name}</div>;
}
```

```tsx
// ✅ 올바른 예 - 인터랙션이 없으면 서버 컴포넌트
async function UserProfile({ userId }: { userId: string }) {
  const user = await getUser(userId);
  return <div>{user.name}</div>;
}
```

### 실수 2: 서버 컴포넌트를 클라이언트 컴포넌트 안에 import

```tsx
'use client';

// ❌ 클라이언트 컴포넌트 안에서 서버 컴포넌트 직접 import
import ServerOnlyComponent from './ServerOnlyComponent';

function ClientComponent() {
  // ServerOnlyComponent가 클라이언트 번들에 포함되어버림!
  return <ServerOnlyComponent />;
}
```

```tsx
// ✅ 서버 컴포넌트에서 children으로 전달
// app/page.tsx (서버 컴포넌트)
import ClientWrapper from './ClientWrapper';
import ServerOnlyComponent from './ServerOnlyComponent';

export default function Page() {
  return (
    <ClientWrapper>
      <ServerOnlyComponent /> {/* children으로 전달 */}
    </ClientWrapper>
  );
}
```

### 실수 3: 서버 컴포넌트에서 함수를 props로 전달

```tsx
// ❌ 함수는 직렬화 불가
async function ServerComponent() {
  const handleClick = () => console.log('clicked'); // 함수

  // 클라이언트 컴포넌트에 함수를 props로 전달하면 에러!
  return <ClientButton onClick={handleClick} />;
}
```

```tsx
// ✅ 이벤트 핸들러는 클라이언트 컴포넌트 안에서 정의
'use client';
function ClientButton() {
  const handleClick = () => console.log('clicked');
  return <button onClick={handleClick}>클릭</button>;
}
```

---

## 렌더링 순서 이해하기

```
서버                        클라이언트(브라우저)
  │                               │
  │ 1. 서버 컴포넌트 렌더링        │
  │    (데이터 페칭 포함)          │
  │                               │
  │ 2. HTML + RSC Payload 전송 ──>│
  │                               │ 3. HTML 즉시 표시 (FCP)
  │                               │
  │                               │ 4. JS 번들 다운로드
  │                               │
  │                               │ 5. Hydration
  │                               │    (클라이언트 컴포넌트만)
  │                               │
  │                               │ 6. 인터랙티브 상태
```

서버 컴포넌트 덕분에 브라우저로 전송되는 JS 번들 크기가 크게 줄어듭니다.

---

## 실전 예시: 블로그 페이지

```tsx
// app/blog/page.tsx (서버 컴포넌트)
import SearchBar from '@/components/SearchBar'; // 클라이언트
import PostCard from '@/components/PostCard';   // 서버

async function BlogPage() {
  // 서버에서 전체 포스트 목록 가져오기
  const posts = await getPosts();

  return (
    <div>
      <h1>블로그</h1>

      {/* 검색 기능 - 클라이언트 상태 필요 */}
      <SearchBar />

      {/* 포스트 목록 - 정적 표시만 하면 됨 */}
      <div className="grid grid-cols-3 gap-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
```

```tsx
// components/PostCard.tsx (서버 컴포넌트)
// 카드는 데이터 표시만 하므로 서버 컴포넌트로 충분
function PostCard({ post }) {
  return (
    <div className="border rounded p-4">
      <h2>{post.title}</h2>
      <p>{post.excerpt}</p>
      <span>{post.date}</span>
    </div>
  );
}
```

```tsx
'use client';
// components/SearchBar.tsx (클라이언트 컴포넌트)
// 실시간 입력 처리가 필요하므로 클라이언트 컴포넌트
import { useState } from 'react';
import { useRouter } from 'next/navigation';

function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // URL 파라미터로 검색어 전달
    router.push(`/blog?q=${query}`);
  };

  return (
    <form onSubmit={handleSearch}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="검색어 입력..."
      />
      <button type="submit">검색</button>
    </form>
  );
}
```

---

## 정리

- **서버 컴포넌트**: Next.js의 기본값. 서버에서 렌더링, DB/API 직접 접근 가능, 브라우저 JS 번들에 미포함
- **클라이언트 컴포넌트**: `'use client'` 선언. useState/useEffect/이벤트 핸들러 사용 가능
- **원칙**: 서버 컴포넌트를 최대한 유지하고, 인터랙션이 꼭 필요한 부분만 클라이언트 컴포넌트로 분리
- **조합**: 서버 컴포넌트가 클라이언트 컴포넌트를 children이나 props로 포함할 수 있음

이 개념을 익히면 Next.js의 성능 최적화 철학이 눈에 들어옵니다.
