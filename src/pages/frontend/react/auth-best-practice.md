---
title: 'React 인증/인가 Best Practice'
date: '2025-01-27'
tags: ['react', 'authentication', 'authorization', 'security']
excerpt: 'React 애플리케이션에서 인증과 인가를 구현하는 권장 패턴'
---

# React 인증/인가 Best Practice

## 인증 vs 인가

```
인증(Authentication): "너 누구야?" - 사용자 신원 확인
인가(Authorization): "너 이거 해도 돼?" - 권한 확인
```

---

## 토큰 저장 전략

### 저장 위치별 비교

| 저장 위치 | XSS 취약 | CSRF 취약 | 권장도 |
|-----------|----------|-----------|--------|
| localStorage | O | X | 낮음 |
| sessionStorage | O | X | 낮음 |
| Cookie (HttpOnly) | X | O | 중간 |
| Memory (변수) | X | X | 높음 |

### 권장: Memory + Refresh Token 조합

```typescript
// authStore.ts
let accessToken: string | null = null;

export const authStore = {
  getAccessToken: () => accessToken,
  setAccessToken: (token: string | null) => {
    accessToken = token;
  },
  clearAccessToken: () => {
    accessToken = null;
  },
};
```

Access Token은 메모리에, Refresh Token은 HttpOnly Cookie에 저장하는 방식이 가장 안전하다.

---

## Auth Context 구현

```tsx
// AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 시작 시 인증 상태 확인
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // HttpOnly Cookie 전송
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('로그인 실패');
    }

    const userData = await response.json();
    setUser(userData);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  };

  const hasRole = (role: string) => {
    return user?.roles.includes(role) ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## Protected Route 구현

### 기본 구조

```tsx
// ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface Props {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles }: Props) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // 미인증 → 로그인 페이지
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 권한 부족 → 403 페이지
  if (requiredRoles && !requiredRoles.some(role => user.roles.includes(role))) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
```

### 라우터 적용

```tsx
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* 인증 필요 */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* 특정 권한 필요 */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRoles={['ADMIN']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

---

## API 요청 인터셉터

### Axios 설정

```typescript
// api.ts
import axios from 'axios';
import { authStore } from './authStore';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Cookie 전송
});

// 요청 인터셉터: Access Token 추가
api.interceptors.request.use((config) => {
  const token = authStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 401 시 토큰 갱신
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh Token으로 Access Token 갱신
        const { data } = await axios.post('/api/auth/refresh', null, {
          withCredentials: true,
        });

        authStore.setAccessToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        return api(originalRequest);
      } catch {
        // Refresh 실패 → 로그아웃
        authStore.clearAccessToken();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## 권한 기반 UI 렌더링

```tsx
// PermissionGate.tsx
import { useAuth } from './AuthContext';

interface Props {
  children: React.ReactNode;
  requiredRoles: string[];
  fallback?: React.ReactNode;
}

export function PermissionGate({ children, requiredRoles, fallback = null }: Props) {
  const { user } = useAuth();

  const hasPermission = requiredRoles.some(role => user?.roles.includes(role));

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
```

```tsx
// 사용 예시
function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <PermissionGate requiredRoles={['ADMIN']}>
        <button>사용자 관리</button>
      </PermissionGate>

      <PermissionGate
        requiredRoles={['EDITOR', 'ADMIN']}
        fallback={<span>편집 권한이 없습니다</span>}
      >
        <button>콘텐츠 편집</button>
      </PermissionGate>
    </div>
  );
}
```

---

## 보안 체크리스트

### 필수 사항

- [ ] Access Token은 메모리에만 저장
- [ ] Refresh Token은 HttpOnly, Secure, SameSite=Strict Cookie
- [ ] HTTPS 필수 사용
- [ ] CORS 설정 (허용 origin 명시)
- [ ] CSRF 토큰 적용 (Cookie 사용 시)

### 권장 사항

- [ ] Access Token 만료 시간 짧게 (15분 이하)
- [ ] Refresh Token Rotation 적용
- [ ] Rate Limiting 적용
- [ ] 민감 작업 시 재인증 요구
- [ ] 비정상 로그인 시도 감지

---

## 흔한 실수

### 1. localStorage에 토큰 저장

```typescript
// ❌ XSS에 취약
localStorage.setItem('token', accessToken);

// ✅ 메모리에 저장
let accessToken = token;
```

### 2. 클라이언트에서만 권한 검증

```tsx
// ❌ 클라이언트 검증은 우회 가능
if (user.role === 'ADMIN') {
  // 관리자 기능
}

// ✅ 서버에서 반드시 재검증
// API 요청 시 서버에서 권한 확인 필수
```

### 3. 에러 메시지로 정보 노출

```typescript
// ❌ 공격자에게 힌트 제공
"이메일이 존재하지 않습니다"
"비밀번호가 틀렸습니다"

// ✅ 모호하게 응답
"이메일 또는 비밀번호가 올바르지 않습니다"
```

---

## 라이브러리 활용

직접 구현 대신 검증된 라이브러리 사용을 권장한다.

| 용도 | 라이브러리 |
|------|-----------|
| OAuth/Social 로그인 | NextAuth.js, Auth0 React SDK |
| 상태 관리 | TanStack Query (캐싱, 동기화) |
| Form 검증 | React Hook Form + Zod |

```tsx
// NextAuth.js 예시
import { useSession, signIn, signOut } from 'next-auth/react';

function LoginButton() {
  const { data: session } = useSession();

  if (session) {
    return <button onClick={() => signOut()}>로그아웃</button>;
  }
  return <button onClick={() => signIn()}>로그인</button>;
}
```

---

## 정리

1. **토큰 저장**: Access Token은 메모리, Refresh Token은 HttpOnly Cookie
2. **인증 상태**: Context API로 전역 관리
3. **라우트 보호**: ProtectedRoute 컴포넌트로 일관된 처리
4. **API 요청**: 인터셉터로 토큰 관리 자동화
5. **권한 UI**: PermissionGate로 조건부 렌더링
6. **서버 검증**: 클라이언트 검증은 UX용, 실제 보안은 서버에서