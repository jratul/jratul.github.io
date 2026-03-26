---
title: "인증 (NextAuth.js / Auth.js)"
order: 11
---

# 인증 (NextAuth.js / Auth.js)

로그인, 로그아웃, 세션 관리는 대부분의 웹 앱에서 필요합니다.
Auth.js(구 NextAuth.js)는 Next.js에서 인증을 쉽게 구현할 수 있게 해주는 라이브러리입니다.

---

## 왜 Auth.js를 쓰나요?

인증을 직접 구현하면 고려해야 할 것이 많습니다:

- 비밀번호 해싱 (bcrypt)
- 세션 토큰 생성/검증
- CSRF 공격 방어
- 소셜 로그인 OAuth 흐름
- 세션 갱신 (refresh token)
- 보안 취약점 대응

Auth.js는 이 모든 것을 처리해줍니다. **보안 전문가들이 검증한 코드**를 그냥 가져다 쓰는 셈입니다.

---

## 설치 및 기본 설정

```bash
npm install next-auth@beta
```

```bash
# .env.local
# Auth.js가 사용할 비밀 키 (openssl rand -base64 32 로 생성)
AUTH_SECRET=your-secret-key-here

# GitHub OAuth 앱 키 (소셜 로그인)
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret

# Google OAuth
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

---

## Auth.js 설정 파일

```typescript
// auth.ts (프로젝트 루트)
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // GitHub 소셜 로그인
    GitHub,

    // Google 소셜 로그인
    Google,

    // 이메일/비밀번호 로그인
    Credentials({
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },

      authorize: async (credentials) => {
        // 입력값 검증
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // DB에서 사용자 조회
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        // 비밀번호 검증
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        // 인증 성공 - 사용자 정보 반환 (민감한 정보 제외)
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],

  // 세션 설정
  session: {
    strategy: 'jwt', // JWT 방식 (DB 없어도 됨) 또는 'database'
    maxAge: 30 * 24 * 60 * 60, // 30일
  },

  // 커스텀 페이지
  pages: {
    signIn: '/login',         // 기본 로그인 페이지 대신 커스텀 페이지
    error: '/auth/error',     // 에러 페이지
  },

  callbacks: {
    // 세션에 사용자 ID 추가 (기본 세션에는 없음)
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },

    // JWT 토큰 커스터마이징
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role; // 역할 추가
      }
      return token;
    },
  },
});
```

---

## Route Handler 등록

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth';

// Auth.js가 필요한 모든 엔드포인트를 자동으로 처리
export const { GET, POST } = handlers;
// /api/auth/signin, /api/auth/signout, /api/auth/session 등
```

---

## 미들웨어로 경로 보호

```typescript
// middleware.ts (프로젝트 루트)
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth(request => {
  const isLoggedIn = !!request.auth;
  const isOnDashboard = request.nextUrl.pathname.startsWith('/dashboard');
  const isOnAdmin = request.nextUrl.pathname.startsWith('/admin');

  // 대시보드는 로그인 필요
  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }

  // 관리자 페이지는 관리자만
  if (isOnAdmin) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', request.nextUrl));
    }

    const userRole = request.auth?.user?.role;
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/403', request.nextUrl));
    }
  }

  return NextResponse.next();
});

// 미들웨어를 적용할 경로 지정
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
```

---

## 서버 컴포넌트에서 세션 확인

```tsx
// app/dashboard/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

async function DashboardPage() {
  // 서버에서 현재 세션 가져오기
  const session = await auth();

  // 로그인 안 했으면 로그인 페이지로
  if (!session) {
    redirect('/login');
  }

  return (
    <div>
      <h1>대시보드</h1>
      <p>안녕하세요, {session.user?.name}님!</p>
      <img src={session.user?.image ?? ''} alt="프로필" />
    </div>
  );
}
```

---

## 클라이언트 컴포넌트에서 세션 사용

```tsx
// app/layout.tsx
import { SessionProvider } from 'next-auth/react';

// SessionProvider는 클라이언트 컴포넌트이므로 Wrapper가 필요
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        {/* 클라이언트에서 세션 접근을 위한 Provider */}
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

```tsx
'use client';
// components/Header.tsx

import { useSession, signIn, signOut } from 'next-auth/react';

function Header() {
  // 클라이언트에서 세션 접근
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <header>로딩 중...</header>;
  }

  return (
    <header>
      <a href="/">홈</a>

      {session ? (
        // 로그인 상태
        <div>
          <span>{session.user?.name}님</span>
          <button onClick={() => signOut()}>로그아웃</button>
        </div>
      ) : (
        // 비로그인 상태
        <button onClick={() => signIn()}>로그인</button>
      )}
    </header>
  );
}
```

---

## 커스텀 로그인 페이지

```tsx
// app/login/page.tsx
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-lg shadow p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">로그인</h1>

        {/* 에러 메시지 */}
        {searchParams.error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm">
            {searchParams.error === 'CredentialsSignin'
              ? '이메일 또는 비밀번호가 올바르지 않습니다'
              : '로그인에 실패했습니다'}
          </div>
        )}

        {/* 이메일/비밀번호 폼 */}
        <form
          action={async (formData) => {
            'use server'; // 서버 액션
            try {
              await signIn('credentials', {
                email: formData.get('email'),
                password: formData.get('password'),
                redirectTo: searchParams.callbackUrl ?? '/dashboard',
              });
            } catch (error) {
              if (error instanceof AuthError) {
                redirect(`/login?error=${error.type}`);
              }
              throw error;
            }
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">이메일</label>
              <input
                name="email"
                type="email"
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">비밀번호</label>
              <input
                name="password"
                type="password"
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            >
              로그인
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">또는</span>
            </div>
          </div>

          {/* 소셜 로그인 버튼 */}
          <div className="mt-4 space-y-2">
            <form
              action={async () => {
                'use server';
                await signIn('github', { redirectTo: searchParams.callbackUrl ?? '/dashboard' });
              }}
            >
              <button
                type="submit"
                className="w-full border rounded py-2 flex items-center justify-center gap-2 hover:bg-gray-50"
              >
                GitHub으로 로그인
              </button>
            </form>

            <form
              action={async () => {
                'use server';
                await signIn('google', { redirectTo: searchParams.callbackUrl ?? '/dashboard' });
              }}
            >
              <button
                type="submit"
                className="w-full border rounded py-2 flex items-center justify-center gap-2 hover:bg-gray-50"
              >
                Google로 로그인
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 회원가입 구현

```tsx
// app/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
      }),
    });

    if (res.ok) {
      router.push('/login?registered=true');
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="text-red-500">{error}</p>}
      <input name="name" placeholder="이름" required />
      <input name="email" type="email" placeholder="이메일" required />
      <input name="password" type="password" placeholder="비밀번호" required />
      <button type="submit">회원가입</button>
    </form>
  );
}
```

```typescript
// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { name, email, password } = await request.json();

  // 이미 존재하는 이메일 확인
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: '이미 사용 중인 이메일입니다' },
      { status: 400 }
    );
  }

  // 비밀번호 해싱
  const hashedPassword = await bcrypt.hash(password, 12);

  // 사용자 생성
  await db.user.create({
    data: { name, email, password: hashedPassword },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
```

---

## 역할 기반 접근 제어 (RBAC)

```typescript
// auth.ts - 타입 확장
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'user' | 'admin';
    } & DefaultSession['user'];
  }
}

// 역할 콜백 추가
callbacks: {
  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.sub!;
      session.user.role = token.role as 'user' | 'admin';
    }
    return session;
  },
  async jwt({ token, user }) {
    if (user) {
      token.role = (user as { role: string }).role;
    }
    return token;
  },
},
```

```tsx
// 역할에 따른 UI 분기
async function AdminButton() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    return null; // 관리자만 보이는 버튼
  }

  return (
    <a href="/admin">관리자 패널</a>
  );
}
```

---

## 흔한 실수

### 실수 1: 클라이언트에서만 보호하기

```tsx
// ❌ 클라이언트에서만 체크 - JS 비활성화 또는 직접 URL 접근으로 우회 가능
'use client';
function Dashboard() {
  const { data: session } = useSession();
  if (!session) return <div>로그인 필요</div>; // 잠깐 보였다 사라짐

  return <div>민감한 데이터</div>;
}

// ✅ 서버 컴포넌트 또는 미들웨어에서 보호
async function Dashboard() {
  const session = await auth();
  if (!session) redirect('/login'); // 서버에서 완전 차단
  return <div>민감한 데이터</div>;
}
```

### 실수 2: 민감한 정보를 세션에 저장

```typescript
// ❌ 세션(JWT)에 민감한 정보 저장
// JWT는 암호화가 아닌 서명만 됨 - 디코딩 가능!
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.password = user.password; // 절대 안 됨!
      token.ssn = user.ssn;           // 절대 안 됨!
    }
    return token;
  },
},

// ✅ 필요한 최소한의 정보만
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.role = user.role; // ID와 역할 정도만
    }
    return token;
  },
},
```

---

## 정리

- Auth.js는 소셜 로그인, 이메일/비밀번호, 세션 관리를 통합 제공
- `handlers`: API Route Handler 등록
- `auth()`: 서버에서 세션 조회
- `useSession()`: 클라이언트에서 세션 조회
- `signIn()` / `signOut()`: 로그인/로그아웃 함수
- 미들웨어(`middleware.ts`)로 경로 전체 보호
- 역할 기반 접근 제어(RBAC)로 관리자/일반 사용자 구분
- 인증은 반드시 서버(미들웨어 또는 서버 컴포넌트)에서 검증
