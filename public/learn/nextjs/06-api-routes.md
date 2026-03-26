---
title: "API Routes (Route Handlers)"
order: 6
---

# API Routes (Route Handlers)

Next.js에서는 프론트엔드 코드와 같은 프로젝트 안에 백엔드 API를 만들 수 있습니다.
별도의 Express 서버 없이 Next.js 하나로 풀스택 앱을 만들 수 있는 이유입니다.

---

## 왜 필요한가요?

React 앱만 있으면 브라우저에서 데이터베이스에 직접 접근할 수 없습니다.

```
기존 방식:
브라우저 → 별도 Express/Node 서버 → 데이터베이스

Next.js 방식:
브라우저 → Next.js API Routes → 데이터베이스
           (같은 프로젝트 안에 있음!)
```

또한 클라이언트 컴포넌트에서 데이터를 수정하거나, 외부 서비스(결제, 이메일 등)와 연동할 때도 사용합니다.

---

## Route Handler 만들기

App Router에서 API는 `route.ts` 파일로 만듭니다.

```
app/
├── api/
│   ├── posts/
│   │   ├── route.ts          ← /api/posts
│   │   └── [id]/
│   │       └── route.ts      ← /api/posts/123
│   ├── users/
│   │   └── route.ts          ← /api/users
│   └── auth/
│       └── route.ts          ← /api/auth
```

### 기본 GET 핸들러

```typescript
// app/api/posts/route.ts
import { NextResponse } from 'next/server';

// GET /api/posts
export async function GET() {
  const posts = await db.post.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // NextResponse.json()으로 JSON 응답 반환
  return NextResponse.json(posts);
}
```

### HTTP 메서드별 핸들러

같은 파일에서 여러 메서드를 처리합니다.

```typescript
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/posts - 포스트 목록 조회
export async function GET(request: NextRequest) {
  // URL 파라미터 읽기
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  const posts = await db.post.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    posts,
    page,
    limit,
  });
}

// POST /api/posts - 새 포스트 생성
export async function POST(request: NextRequest) {
  // 요청 본문 파싱
  const body = await request.json();
  const { title, content } = body;

  // 유효성 검사
  if (!title || !content) {
    return NextResponse.json(
      { error: '제목과 내용을 입력해주세요' },
      { status: 400 } // Bad Request
    );
  }

  const post = await db.post.create({
    data: { title, content },
  });

  return NextResponse.json(post, { status: 201 }); // Created
}
```

### 동적 경로 파라미터

```typescript
// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  params: { id: string };
}

// GET /api/posts/123
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = params;

  const post = await db.post.findUnique({
    where: { id },
  });

  if (!post) {
    // 404 에러 반환
    return NextResponse.json(
      { error: '포스트를 찾을 수 없습니다' },
      { status: 404 }
    );
  }

  return NextResponse.json(post);
}

// PUT /api/posts/123 - 수정
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = params;
  const body = await request.json();

  const updated = await db.post.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(updated);
}

// DELETE /api/posts/123 - 삭제
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = params;

  await db.post.delete({
    where: { id },
  });

  // 204 No Content - 삭제 성공, 반환할 내용 없음
  return new NextResponse(null, { status: 204 });
}
```

---

## 요청/응답 다루기

### 헤더 읽기

```typescript
// app/api/protected/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Authorization 헤더에서 토큰 추출
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: '인증이 필요합니다' },
      { status: 401 } // Unauthorized
    );
  }

  const token = authHeader.split(' ')[1]; // "Bearer TOKEN" → "TOKEN"

  // 토큰 검증 로직
  const user = await verifyToken(token);

  if (!user) {
    return NextResponse.json(
      { error: '유효하지 않은 토큰입니다' },
      { status: 403 } // Forbidden
    );
  }

  return NextResponse.json({ user });
}
```

### 쿠키 다루기

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  // 로그인 검증
  const user = await authenticateUser(email, password);

  if (!user) {
    return NextResponse.json(
      { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
      { status: 401 }
    );
  }

  // 세션 토큰 생성
  const token = await createSessionToken(user.id);

  // 응답에 쿠키 설정
  const response = NextResponse.json({ success: true });
  response.cookies.set('session', token, {
    httpOnly: true,   // JS에서 접근 불가 (XSS 방어)
    secure: process.env.NODE_ENV === 'production', // HTTPS에서만
    sameSite: 'lax',  // CSRF 방어
    maxAge: 60 * 60 * 24 * 7, // 7일
  });

  return response;
}

export async function DELETE() {
  // 로그아웃 - 쿠키 삭제
  const response = NextResponse.json({ success: true });
  response.cookies.delete('session');
  return response;
}
```

---

## 파일 업로드

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  // multipart/form-data 파싱
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json(
      { error: '파일이 없습니다' },
      { status: 400 }
    );
  }

  // 파일 크기 제한 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: '파일 크기는 5MB를 초과할 수 없습니다' },
      { status: 400 }
    );
  }

  // 파일 형식 검사
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'JPG, PNG, WEBP 형식만 허용됩니다' },
      { status: 400 }
    );
  }

  // 파일 저장
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${Date.now()}-${file.name}`;
  const filepath = path.join(process.cwd(), 'public/uploads', filename);

  await writeFile(filepath, buffer);

  return NextResponse.json({
    url: `/uploads/${filename}`,
  });
}
```

---

## 미들웨어와 공통 처리

여러 API에서 공통으로 사용하는 로직을 함수로 분리합니다.

```typescript
// lib/api-helpers.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

// 인증 미들웨어 역할
export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, user: User) => Promise<NextResponse>
) {
  const token = request.cookies.get('session')?.value;

  if (!token) {
    return NextResponse.json(
      { error: '로그인이 필요합니다' },
      { status: 401 }
    );
  }

  const user = await verifyToken(token);

  if (!user) {
    return NextResponse.json(
      { error: '세션이 만료되었습니다' },
      { status: 401 }
    );
  }

  return handler(request, user);
}
```

```typescript
// app/api/my-profile/route.ts
import { withAuth } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  // withAuth로 인증 처리 위임
  return withAuth(request, async (req, user) => {
    const profile = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json(profile);
  });
}
```

---

## 외부 서비스 연동

### 결제 웹훅 예시

```typescript
// app/api/webhook/payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text(); // raw body 필요
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    // Stripe 서명 검증 (위변조 방지)
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: '서명 검증 실패' },
      { status: 400 }
    );
  }

  // 이벤트 처리
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    // 주문 상태 업데이트
    await db.order.update({
      where: { paymentIntentId: paymentIntent.id },
      data: { status: 'PAID' },
    });
  }

  return NextResponse.json({ received: true });
}
```

### 이메일 전송 예시

```typescript
// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const { name, email, message } = await request.json();

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'admin@mysite.com',
      subject: `문의: ${name}님`,
      html: `
        <p><strong>이름:</strong> ${name}</p>
        <p><strong>이메일:</strong> ${email}</p>
        <p><strong>메시지:</strong> ${message}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: '이메일 전송에 실패했습니다' },
      { status: 500 }
    );
  }
}
```

---

## CORS 처리

외부 도메인에서 API를 호출할 때 CORS 헤더가 필요합니다.

```typescript
// app/api/public/route.ts
import { NextRequest, NextResponse } from 'next/server';

// CORS 헤더를 포함한 응답 생성 함수
function corsResponse(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*', // 또는 특정 도메인
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// OPTIONS 요청 처리 (Preflight)
export async function OPTIONS() {
  return corsResponse(null, 200);
}

export async function GET(request: NextRequest) {
  const data = await getPublicData();
  return corsResponse(data);
}
```

---

## 흔한 실수

### 실수 1: 클라이언트 전용 코드를 Route Handler에서 사용

```typescript
// ❌ Route Handler는 서버에서 실행됨
export async function GET() {
  // window, document는 서버에 없음!
  const width = window.innerWidth;
  localStorage.setItem('visited', 'true');
}

// ✅ 서버 환경에 맞는 코드 사용
export async function GET() {
  const data = await db.getData();
  return NextResponse.json(data);
}
```

### 실수 2: 에러 처리 없이 사용

```typescript
// ❌ 에러가 나면 서버가 크래시될 수 있음
export async function GET() {
  const data = await db.findAll(); // 만약 DB 연결이 끊어지면?
  return NextResponse.json(data);
}

// ✅ try-catch로 에러 처리
export async function GET() {
  try {
    const data = await db.findAll();
    return NextResponse.json(data);
  } catch (error) {
    console.error('데이터 조회 실패:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

### 실수 3: 민감한 정보 응답에 포함

```typescript
// ❌ 비밀번호가 응답에 포함됨!
export async function GET() {
  const user = await db.user.findFirst();
  return NextResponse.json(user); // { id, name, email, password, ... }
}

// ✅ 필요한 필드만 반환
export async function GET() {
  const user = await db.user.findFirst({
    select: { id: true, name: true, email: true }
    // password 제외
  });
  return NextResponse.json(user);
}
```

---

## 클라이언트에서 Route Handler 호출

```tsx
'use client';

import { useState } from 'react';

function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          message: formData.get('message'),
        }),
      });

      if (!res.ok) throw new Error('요청 실패');

      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="이름" required />
      <input name="email" type="email" placeholder="이메일" required />
      <textarea name="message" placeholder="메시지" required />
      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? '전송 중...' : '전송'}
      </button>
      {status === 'success' && <p>메시지가 전송되었습니다!</p>}
      {status === 'error' && <p>전송에 실패했습니다. 다시 시도해주세요.</p>}
    </form>
  );
}
```

---

## Server Actions와의 차이

Route Handler 외에 **Server Actions**라는 방법도 있습니다.

| 비교 | Route Handler | Server Actions |
|------|--------------|----------------|
| 호출 방식 | fetch('/api/...') | 함수 직접 호출 |
| 타입 안전성 | 수동 처리 | TypeScript 자동 |
| 사용 케이스 | REST API, 외부 연동 | 폼 제출, 데이터 변경 |
| 외부 접근 | 가능 | 불가능 |

```tsx
// Server Actions 예시 (다음 장에서 자세히)
'use server';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  await db.post.create({ data: { title } });
}
```

외부에서 호출할 REST API가 필요하면 Route Handler, 내부 폼 처리나 데이터 변경은 Server Actions가 더 편합니다.

---

## 정리

- Route Handler는 `app/api/*/route.ts` 파일로 만듦
- `GET`, `POST`, `PUT`, `DELETE` 함수를 export해서 각 메서드 처리
- `NextRequest`로 요청 읽기, `NextResponse.json()`으로 응답 반환
- 인증, 파일 업로드, 외부 서비스 연동 등 다양한 백엔드 로직 구현 가능
- 에러 처리와 민감한 데이터 노출 방지는 항상 신경 쓸 것
