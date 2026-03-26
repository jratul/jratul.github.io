---
title: "이미지·폰트 최적화"
order: 9
---

# 이미지·폰트 최적화

웹 성능에서 이미지와 폰트가 차지하는 비중은 상당히 큽니다.
Next.js는 이 두 가지를 자동으로 최적화해주는 내장 기능을 제공합니다.

---

## 이미지 최적화

### 왜 이미지 최적화가 필요한가요?

```
일반 <img> 태그를 쓰면:
1. 원본 이미지(5MB JPEG)가 그대로 전송됨
2. 레티나 디스플레이 대응 어려움
3. 이미지 로딩 중 레이아웃이 밀리는 CLS(Cumulative Layout Shift) 발생
4. 뷰포트 밖의 이미지도 미리 로딩됨 (낭비)
```

Next.js `<Image>` 컴포넌트는 이 모든 문제를 자동으로 처리합니다.

---

### next/image 기본 사용

```tsx
// 일반 img 태그와 비교
// ❌ 기존 방식
<img src="/photo.jpg" alt="사진" />

// ✅ Next.js 방식
import Image from 'next/image';

<Image
  src="/photo.jpg"    // public/ 폴더 기준 경로
  alt="사진"          // 접근성을 위한 alt 필수
  width={800}         // 원본 너비 (픽셀)
  height={600}        // 원본 높이 (픽셀)
/>
```

이것만 해도 자동으로:
- WebP/AVIF 형식으로 변환 (파일 크기 50% 이상 절감)
- 디바이스 크기에 맞는 이미지 제공
- lazy loading (뷰포트에 들어올 때만 로딩)
- 레이아웃 밀림 방지 (width/height로 공간 예약)

---

### 이미지 레이아웃 모드

#### 고정 크기 (width + height)

```tsx
// 크기가 고정된 이미지 (아이콘, 프로필 사진 등)
<Image
  src="/avatar.jpg"
  alt="프로필"
  width={64}
  height={64}
  className="rounded-full"
/>
```

#### 반응형 (fill)

컨테이너 크기에 맞게 이미지를 채울 때 사용합니다.

```tsx
// 부모 요소가 position: relative 여야 함
<div className="relative h-64 w-full">
  <Image
    src="/hero.jpg"
    alt="히어로 이미지"
    fill                              // 부모 크기에 맞게 채움
    className="object-cover"          // 비율 유지하며 채우기
    sizes="100vw"                     // 뷰포트 전체 너비
    priority                          // LCP 이미지 - 미리 로딩
  />
</div>
```

#### 썸네일 카드

```tsx
function PostCard({ post }) {
  return (
    <div className="border rounded-xl overflow-hidden">
      {/* 카드 이미지 */}
      <div className="relative aspect-video">  {/* 16:9 비율 */}
        <Image
          src={post.thumbnail}
          alt={post.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          // sizes: 각 뷰포트에서 이미지가 차지하는 크기 힌트
          // 덕분에 불필요하게 큰 이미지를 내려받지 않음
        />
      </div>

      <div className="p-4">
        <h2>{post.title}</h2>
      </div>
    </div>
  );
}
```

---

### sizes 속성 이해하기

`sizes`는 브라우저에게 이미지가 실제로 얼마나 큰 공간에 표시되는지 알려주는 힌트입니다.

```tsx
// 모바일: 전체 너비, 태블릿: 절반, 데스크탑: 1/3
<Image
  src="/photo.jpg"
  alt="사진"
  fill
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>
```

이 정보를 바탕으로 Next.js는 적절한 크기의 이미지를 생성하고 제공합니다.
`sizes`를 잘 설정하면 불필요한 대용량 이미지 다운로드를 막을 수 있습니다.

---

### priority와 lazy loading

```tsx
// 페이지 처음 로딩 시 바로 보이는 이미지 (Above the fold)
// → priority: 미리 로딩
<Image
  src="/hero.jpg"
  alt="히어로"
  fill
  priority   // preload로 미리 로딩 (LCP 점수 향상)
/>

// 스크롤해야 보이는 이미지
// → lazy loading (기본값, priority 없으면 자동으로 lazy)
<Image
  src="/section-image.jpg"
  alt="섹션 이미지"
  width={600}
  height={400}
  // priority 없음 = lazy loading 자동 적용
/>
```

---

### 외부 이미지 사용

외부 도메인의 이미지를 쓰려면 `next.config.js`에 도메인을 등록해야 합니다.

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        // pathname: '/photo-*', // 특정 경로만 허용할 수도 있음
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com', // S3 등 와일드카드 지원
      },
    ],
  },
};

module.exports = nextConfig;
```

```tsx
// 등록된 외부 도메인 이미지 사용
<Image
  src="https://images.unsplash.com/photo-123456"
  alt="Unsplash 이미지"
  width={800}
  height={600}
/>
```

---

### 이미지 최적화 설정

```javascript
// next.config.js
const nextConfig = {
  images: {
    // 지원할 이미지 형식 (기본값)
    formats: ['image/avif', 'image/webp'],

    // 생성할 이미지 크기 목록
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // 이미지 캐시 유지 시간 (초)
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30일
  },
};
```

---

## 폰트 최적화

### 왜 폰트 최적화가 필요한가요?

```
외부 폰트(Google Fonts)를 직접 쓰면:
1. 구글 서버에서 폰트를 가져오는 네트워크 요청 발생
2. 폰트 로딩 전에 텍스트가 없거나 다른 폰트로 표시 (FOUT/FOIT)
3. 개인정보: 방문자 IP가 구글에 전송됨
4. 느린 서드파티 요청으로 성능 저하
```

---

### next/font/google

Google Fonts를 빌드 타임에 다운로드해서 자체 호스팅합니다.

```tsx
// app/layout.tsx
import { Inter, Noto_Sans_KR } from 'next/font/google';

// 한국어 폰트 설정
const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],   // 필요한 문자셋만 포함
  weight: ['400', '500', '700'], // 필요한 굵기만
  display: 'swap',      // 폰트 로딩 중 기본 폰트 표시 (FOUT 방지)
  variable: '--font-noto', // CSS 변수로 사용할 경우
});

// 영문 폰트 추가
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    // className으로 폰트 적용
    <html lang="ko" className={`${notoSansKr.variable} ${inter.variable}`}>
      <body className={notoSansKr.className}>
        {children}
      </body>
    </html>
  );
}
```

```css
/* globals.css - CSS 변수 방식 */
:root {
  font-family: var(--font-noto), sans-serif;
}

/* 코드 블록 등 특정 요소에 다른 폰트 */
code, pre {
  font-family: var(--font-inter), monospace;
}
```

---

### 로컬 폰트 사용

프로젝트에 포함된 폰트 파일을 사용할 때는 `next/font/local`을 씁니다.

```tsx
// app/layout.tsx
import localFont from 'next/font/local';

// Pretendard 폰트 (public/fonts/ 또는 src/fonts/ 에 파일 있을 때)
const pretendard = localFont({
  src: [
    {
      path: '../public/fonts/Pretendard-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Pretendard-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/Pretendard-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-pretendard',
});

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className={pretendard.className}>
        {children}
      </body>
    </html>
  );
}
```

---

### 가변 폰트 (Variable Font)

가변 폰트는 하나의 파일로 모든 굵기를 표현합니다.

```tsx
// 가변 폰트 - 파일 하나로 100~900 굵기 전부
import localFont from 'next/font/local';

const pretendardVariable = localFont({
  src: '../public/fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '100 900', // 범위로 지정
  variable: '--font-pretendard',
});
```

파일 하나만 로드하면 됩니다. 여러 굵기 파일을 나눠 로딩하는 것보다 효율적입니다.

---

### Tailwind + next/font 연동

```tsx
// app/layout.tsx
import { Noto_Sans_KR } from 'next/font/google';

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  variable: '--font-noto-sans-kr', // CSS 변수 이름
});

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={notoSansKr.variable}>
      <body>{children}</body>
    </html>
  );
}
```

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        // CSS 변수를 Tailwind에서 사용
        sans: ['var(--font-noto-sans-kr)', 'sans-serif'],
        korean: ['var(--font-noto-sans-kr)', 'sans-serif'],
      },
    },
  },
};
```

```tsx
// 사용
<p className="font-sans">Noto Sans KR 폰트 적용됨</p>
```

---

## 흔한 실수

### 실수 1: fill 사용 시 부모에 position 없음

```tsx
// ❌ 부모에 position: relative 없으면 이미지가 올바르게 표시 안 됨
<div className="h-64">
  <Image src="/img.jpg" alt="이미지" fill />
</div>

// ✅ 부모에 relative 추가
<div className="relative h-64">
  <Image src="/img.jpg" alt="이미지" fill className="object-cover" />
</div>
```

### 실수 2: priority 남용

```tsx
// ❌ 모든 이미지에 priority 붙이면 의미 없음
// 초기 로딩 시 모든 이미지를 동시에 로딩 → 성능 저하
<Image src="/img1.jpg" alt="" width={200} height={200} priority />
<Image src="/img2.jpg" alt="" width={200} height={200} priority />
<Image src="/img3.jpg" alt="" width={200} height={200} priority />

// ✅ 화면 상단(Above the fold)에 있는 이미지 하나에만
<Image src="/hero.jpg" alt="히어로" fill priority />    {/* 맨 위 히어로 이미지 */}
<Image src="/img2.jpg" alt="" width={200} height={200} />  {/* 나머지는 lazy */}
```

### 실수 3: alt 텍스트 생략

```tsx
// ❌ alt 없으면 접근성 문제 + 검색 엔진 최적화 불이익
<Image src="/product.jpg" alt="" width={300} height={300} />

// ✅ 의미 있는 alt 텍스트
<Image src="/product.jpg" alt="파란색 무선 이어폰 전면" width={300} height={300} />

// 순수 장식용 이미지는 alt="" 유지 (스크린 리더가 무시)
<Image src="/divider.jpg" alt="" width={800} height={10} aria-hidden="true" />
```

### 실수 4: 폰트를 컴포넌트 안에서 정의

```tsx
// ❌ 컴포넌트 안에서 폰트 정의 - 렌더링할 때마다 재생성됨
function Header() {
  const inter = Inter({ subsets: ['latin'] }); // 잘못된 위치!
  return <header className={inter.className}>...</header>;
}

// ✅ 모듈 최상위 레벨에서 한 번만 정의
const inter = Inter({ subsets: ['latin'] });

function Header() {
  return <header className={inter.className}>...</header>;
}
```

---

## 성능 측정

이미지/폰트 최적화 후 성능을 확인하는 방법:

```bash
# Lighthouse 점수 확인 (Chrome DevTools → Lighthouse 탭)
# 또는 CLI로
npx lighthouse https://your-site.com --output html
```

주요 지표:
- **LCP (Largest Contentful Paint)**: 가장 큰 콘텐츠(주로 히어로 이미지) 렌더링 시간 → priority 이미지 최적화
- **CLS (Cumulative Layout Shift)**: 레이아웃 밀림 → width/height 지정으로 해결
- **FID/INP**: 상호작용 지연 → 불필요한 JS 줄이기

---

## 정리

### Image 컴포넌트
- `width` + `height`: 고정 크기 이미지
- `fill`: 부모 크기에 맞게 채우기 (부모에 `position: relative` 필요)
- `sizes`: 뷰포트별 이미지 표시 크기 힌트 (성능 최적화)
- `priority`: 화면 상단 이미지에만 사용 (LCP 향상)
- 외부 이미지는 `next.config.js`에 `remotePatterns` 등록

### Font 최적화
- `next/font/google`: Google Fonts 자체 호스팅
- `next/font/local`: 로컬 폰트 파일 사용
- `variable`: CSS 변수로 Tailwind와 연동
- 가변 폰트(Variable Font)로 파일 수 줄이기
- 폰트는 반드시 모듈 최상위에서 한 번만 정의
