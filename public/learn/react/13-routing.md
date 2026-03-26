---
title: "React Router"
order: 13
---

# React Router

React Router는 React 앱에서 여러 페이지를 구현하는 라이브러리입니다. URL에 따라 다른 컴포넌트를 보여줍니다.

---

## 설치와 기본 설정

```bash
npm install react-router-dom
```

```tsx
// main.tsx 또는 App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="*" element={<NotFound />} />  {/* 404 페이지 */}
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 기본 컴포넌트들

### Link: 페이지 이동

```tsx
import { Link } from "react-router-dom";

function Navigation() {
  return (
    <nav>
      <Link to="/">홈</Link>
      <Link to="/about">소개</Link>
      <Link to="/products">상품</Link>
      {/* a 태그 대신 Link 사용 (페이지 새로고침 없음) */}
    </nav>
  );
}
```

### NavLink: 현재 페이지 활성화

```tsx
import { NavLink } from "react-router-dom";

function Navigation() {
  return (
    <nav>
      <NavLink
        to="/"
        style={({ isActive }) => ({
          fontWeight: isActive ? "bold" : "normal",
          color: isActive ? "blue" : "black",
        })}
      >
        홈
      </NavLink>
      <NavLink
        to="/products"
        className={({ isActive }) => isActive ? "nav-active" : "nav-link"}
      >
        상품
      </NavLink>
    </nav>
  );
}
```

---

## URL 파라미터

```tsx
import { useParams } from "react-router-dom";

// Route 설정: /products/:productId
function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();

  return <div>상품 ID: {productId}</div>;
}

// /products/42 접근 시 productId = "42"
// /products/abc 접근 시 productId = "abc"
```

---

## 쿼리 파라미터

```tsx
import { useSearchParams } from "react-router-dom";

// /products?category=electronics&sort=price
function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get("category") ?? "all";
  const sort = searchParams.get("sort") ?? "default";

  const handleCategoryChange = (newCategory: string) => {
    setSearchParams(prev => {
      prev.set("category", newCategory);
      return prev;
    });
    // URL: /products?category=newCategory&sort=price
  };

  return (
    <div>
      <select
        value={category}
        onChange={e => handleCategoryChange(e.target.value)}
      >
        <option value="all">전체</option>
        <option value="electronics">전자제품</option>
        <option value="clothes">의류</option>
      </select>
      <p>카테고리: {category}, 정렬: {sort}</p>
    </div>
  );
}
```

---

## 프로그래밍 방식 이동

```tsx
import { useNavigate } from "react-router-dom";

function LoginForm() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    await login();
    navigate("/dashboard"); // 로그인 후 대시보드로 이동
  };

  const handleCancel = () => {
    navigate(-1); // 뒤로 가기
  };

  const handleGoHome = () => {
    navigate("/", { replace: true }); // replace: 히스토리 교체 (뒤로가기 불가)
  };

  return (
    <form onSubmit={handleLogin}>
      <button type="submit">로그인</button>
      <button type="button" onClick={handleCancel}>취소</button>
    </form>
  );
}
```

---

## 중첩 라우팅 (Nested Routes)

```tsx
import { Outlet } from "react-router-dom";

// 레이아웃 컴포넌트: 공통 UI + 자식 라우트 표시
function DashboardLayout() {
  return (
    <div>
      <nav>
        <Link to="/dashboard">개요</Link>
        <Link to="/dashboard/profile">프로필</Link>
        <Link to="/dashboard/settings">설정</Link>
      </nav>
      <main>
        <Outlet />  {/* 자식 라우트가 여기에 렌더링됨 */}
      </main>
    </div>
  );
}

// App.tsx
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />           {/* /dashboard */}
          <Route path="profile" element={<Profile />} />        {/* /dashboard/profile */}
          <Route path="settings" element={<Settings />} />      {/* /dashboard/settings */}
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 보호된 라우트 (Protected Routes)

```tsx
import { Navigate, useLocation } from "react-router-dom";

// 인증 확인 후 리다이렉트
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation(); // 현재 URL 정보

  if (!isLoggedIn) {
    // 로그인 후 원래 페이지로 돌아오도록 state에 저장
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// 관리자 전용 라우트
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  return <>{children}</>;
}

// 사용
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

// 로그인 후 원래 페이지로 이동
function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const handleLogin = async () => {
    await login();
    navigate(from, { replace: true }); // 원래 보려던 페이지로
  };

  return <form onSubmit={handleLogin}>...</form>;
}
```

---

## 실전 예제: 블로그 앱

```tsx
// App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/posts" element={<PostListPage />} />
          <Route path="/posts/:slug" element={<PostDetailPage />} />
          <Route path="/categories/:category" element={<CategoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route
            path="/write"
            element={
              <ProtectedRoute>
                <WritePostPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}

// PostDetailPage: URL 파라미터 사용
function PostDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/posts/${slug}`)
      .then(res => {
        if (res.status === 404) {
          navigate("/404", { replace: true });
          return;
        }
        return res.json();
      })
      .then(setPost);
  }, [slug, navigate]);

  if (!post) return <p>로딩 중...</p>;

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      <Link to="/posts">← 목록으로</Link>
    </article>
  );
}

// SearchPage: 쿼리 파라미터 사용
function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [results, setResults] = useState<Post[]>([]);

  useEffect(() => {
    if (!query) return;
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(setResults);
  }, [query]);

  return (
    <div>
      <input
        value={query}
        onChange={e => setSearchParams({ q: e.target.value })}
        placeholder="검색어 입력..."
      />
      <p>"{query}" 검색 결과: {results.length}개</p>
      {results.map(post => (
        <div key={post.id}>
          <Link to={`/posts/${post.slug}`}>{post.title}</Link>
        </div>
      ))}
    </div>
  );
}
```

---

## 흔한 실수와 해결법

### 실수 1: a 태그 사용

```tsx
// 나쁜 예 - 페이지 새로고침 발생
<a href="/about">소개</a>

// 좋은 예 - SPA 방식 이동
<Link to="/about">소개</Link>
```

### 실수 2: Route 밖에서 Router 훅 사용

```tsx
// 오류! BrowserRouter 밖에서 useNavigate 사용
function App() {
  const navigate = useNavigate(); // 오류!
  return <BrowserRouter>...</BrowserRouter>;
}

// 수정: BrowserRouter 안에서 사용
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const navigate = useNavigate(); // OK
  return <Routes>...</Routes>;
}
```

### 실수 3: useParams 타입 안전성

```tsx
// useParams의 값은 항상 string | undefined
const { id } = useParams<{ id: string }>();

// id를 숫자로 사용할 때는 변환 필요
const productId = id ? parseInt(id, 10) : null;

// 또는 타입 가드
if (!id) return <Navigate to="/not-found" />;
const productId = parseInt(id, 10);
```

---

## 정리

| 컴포넌트/훅 | 사용 목적 |
|-----------|---------|
| `BrowserRouter` | 라우터 설정 (앱 최상단) |
| `Routes + Route` | URL에 따른 컴포넌트 매핑 |
| `Link` | 페이지 이동 링크 |
| `NavLink` | 현재 페이지 표시 링크 |
| `Outlet` | 중첩 라우트 자식 위치 |
| `Navigate` | 프로그래밍 방식 리다이렉트 |
| `useParams` | URL 파라미터 읽기 |
| `useSearchParams` | 쿼리 파라미터 읽기/쓰기 |
| `useNavigate` | 프로그래밍 방식 이동 |
| `useLocation` | 현재 URL 정보 |
