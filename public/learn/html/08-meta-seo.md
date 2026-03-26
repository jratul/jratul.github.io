---
title: "메타 태그와 SEO"
order: 8
---

## 메타 태그란?

`<meta>` 태그는 웹페이지에 대한 **정보(메타데이터)**를 담는 태그입니다.
사용자 화면에는 보이지 않지만, 브라우저·검색엔진·소셜 미디어가 이 정보를 활용합니다.

모두 `<head>` 안에 위치합니다.

---

## 필수 메타 태그

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <!-- 문자 인코딩: 한글이 깨지지 않도록 UTF-8 필수 -->
  <meta charset="UTF-8" />

  <!-- 반응형 디자인 필수: 모바일 화면 크기에 맞게 렌더링 -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- 페이지 제목: 브라우저 탭과 검색 결과에 표시됨 -->
  <title>React 입문 | jratul의 기술 블로그</title>

  <!-- 페이지 설명: 검색 결과 설명문 (150~160자 권장) -->
  <meta name="description" content="React를 처음 시작하는 분들을 위한 기초 가이드. 컴포넌트, 상태 관리, Hook의 핵심을 예제와 함께 설명합니다." />

  <!-- 검색 키워드 (현재는 검색엔진이 거의 무시하지만 관행상 작성) -->
  <meta name="keywords" content="React, 리액트, 자바스크립트, 프론트엔드, 입문" />

  <!-- 저자 정보 -->
  <meta name="author" content="jratul" />
</head>
```

---

## Open Graph — 소셜 미디어 공유

카카오톡, 슬랙, 트위터 등에 링크를 공유할 때 나타나는 미리보기 카드를 설정합니다.

```html
<head>
  <!-- OG 기본 설정 -->
  <meta property="og:type" content="website" />            <!-- 콘텐츠 유형 -->
  <meta property="og:title" content="React 입문 가이드" /> <!-- 제목 -->
  <meta property="og:description" content="React를 처음 시작하는 분들을 위한 기초 가이드입니다." />  <!-- 설명 -->
  <meta property="og:image" content="https://jratul.github.io/og-image.jpg" />  <!-- 미리보기 이미지 (1200x630px 권장) -->
  <meta property="og:url" content="https://jratul.github.io/posts/react-intro" />  <!-- 페이지 URL -->
  <meta property="og:site_name" content="jratul의 기술 블로그" />  <!-- 사이트 이름 -->
  <meta property="og:locale" content="ko_KR" />            <!-- 언어/지역 -->

  <!-- 블로그 포스트인 경우 -->
  <meta property="og:type" content="article" />
  <meta property="article:published_time" content="2024-01-15T09:00:00+09:00" />
  <meta property="article:author" content="jratul" />
  <meta property="article:tag" content="React" />
  <meta property="article:tag" content="JavaScript" />
</head>
```

---

## Twitter Card — 트위터 공유

```html
<head>
  <!-- summary_large_image: 큰 이미지 카드 형태 -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@jratul" />           <!-- 사이트 트위터 계정 -->
  <meta name="twitter:creator" content="@jratul" />        <!-- 작성자 트위터 계정 -->
  <meta name="twitter:title" content="React 입문 가이드" />
  <meta name="twitter:description" content="React를 처음 시작하는 분들을 위한 기초 가이드입니다." />
  <meta name="twitter:image" content="https://jratul.github.io/og-image.jpg" />
  <meta name="twitter:image:alt" content="React 로고와 코드 예제 이미지" />
</head>
```

---

## 검색엔진 제어

```html
<head>
  <!-- 검색엔진 크롤러에게 지시 -->
  <meta name="robots" content="index, follow" />     <!-- 색인 허용, 링크 따라가기 허용 (기본값) -->
  <meta name="robots" content="noindex, nofollow" /> <!-- 색인 금지, 링크 따라가기 금지 -->
  <meta name="robots" content="noindex, follow" />   <!-- 색인은 금지, 링크는 허용 -->

  <!-- 캐시 제어 -->
  <meta http-equiv="cache-control" content="no-cache" />

  <!-- 구글 검색 특화 설정 -->
  <meta name="googlebot" content="index, follow" />

  <!-- 정규 URL: 중복 콘텐츠 방지 -->
  <link rel="canonical" href="https://jratul.github.io/posts/react-intro" />
</head>
```

### `canonical` — 중복 페이지 문제 해결

```html
<!-- 같은 내용이 여러 URL에 있을 때 어느 것이 원본인지 알림 -->

<!-- https://example.com/page?utm_source=kakao 에서 -->
<link rel="canonical" href="https://example.com/page" />

<!-- https://example.com/page?sort=latest 에서도 -->
<link rel="canonical" href="https://example.com/page" />
```

---

## 파비콘 (Favicon)

브라우저 탭에 표시되는 작은 아이콘입니다.

```html
<head>
  <!-- 기본 파비콘 -->
  <link rel="icon" href="/favicon.ico" />

  <!-- 다양한 크기 제공 -->
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

  <!-- SVG 파비콘 (벡터, 확대해도 선명) -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

  <!-- Apple 기기 홈 화면 아이콘 -->
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

  <!-- 안드로이드 웹앱 설정 -->
  <link rel="manifest" href="/site.webmanifest" />

  <!-- 브라우저 테마 색상 (모바일 주소창 색상) -->
  <meta name="theme-color" content="#6366f1" />
</head>
```

---

## 성능 최적화 메타 태그

```html
<head>
  <!-- DNS 미리 연결: 외부 도메인 연결 속도 향상 -->
  <link rel="dns-prefetch" href="//fonts.googleapis.com" />
  <link rel="dns-prefetch" href="//cdn.example.com" />

  <!-- 미리 연결: TLS 핸드셰이크까지 완료 -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

  <!-- 중요 리소스 미리 로드 -->
  <link rel="preload" href="/fonts/Pretendard-Regular.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/hero-image.jpg" as="image" />
  <link rel="preload" href="/critical.css" as="style" />

  <!-- 다음 페이지 미리 로드 (사용자가 이동할 가능성 높을 때) -->
  <link rel="prefetch" href="/next-page.html" />
</head>
```

---

## 언어와 지역 설정

```html
<head>
  <!-- 대체 언어 버전 알림 -->
  <link rel="alternate" hreflang="ko" href="https://example.com/ko/" />
  <link rel="alternate" hreflang="en" href="https://example.com/en/" />
  <link rel="alternate" hreflang="x-default" href="https://example.com/" />  <!-- 기본 언어 -->
</head>
```

---

## 구조화 데이터 (JSON-LD)

검색 결과에 **리치 스니펫**(별점, 날짜 등 추가 정보)을 표시하게 합니다.

```html
<head>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "React 입문 가이드",
    "description": "React를 처음 시작하는 분들을 위한 기초 가이드입니다.",
    "author": {
      "@type": "Person",
      "name": "jratul",
      "url": "https://jratul.github.io/about"
    },
    "datePublished": "2024-01-15",
    "dateModified": "2024-01-20",
    "image": "https://jratul.github.io/og-image.jpg",
    "url": "https://jratul.github.io/posts/react-intro"
  }
  </script>
</head>
```

---

## 완성된 `<head>` 예시

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <!-- 기본 설정 -->
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- SEO -->
  <title>React 입문 가이드 | jratul의 기술 블로그</title>
  <meta name="description" content="React를 처음 시작하는 분들을 위한 기초 가이드. 컴포넌트, 상태 관리, Hook의 핵심을 예제와 함께 설명합니다." />
  <meta name="author" content="jratul" />
  <link rel="canonical" href="https://jratul.github.io/posts/react-intro" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="React 입문 가이드" />
  <meta property="og:description" content="React를 처음 시작하는 분들을 위한 기초 가이드입니다." />
  <meta property="og:image" content="https://jratul.github.io/og-image.jpg" />
  <meta property="og:url" content="https://jratul.github.io/posts/react-intro" />
  <meta property="og:locale" content="ko_KR" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="React 입문 가이드" />
  <meta name="twitter:description" content="React를 처음 시작하는 분들을 위한 기초 가이드입니다." />
  <meta name="twitter:image" content="https://jratul.github.io/og-image.jpg" />

  <!-- 파비콘 -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <meta name="theme-color" content="#6366f1" />

  <!-- 성능 최적화 -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preload" href="/fonts/Pretendard-Regular.woff2" as="font" type="font/woff2" crossorigin />

  <!-- 스타일시트 -->
  <link rel="stylesheet" href="/styles/globals.css" />
</head>
<body>
  <!-- 페이지 내용 -->
</body>
</html>
```

---

## SEO 실전 팁

### 제목(title) 작성 규칙
- **50~60자** 내외 유지 (60자 초과 시 검색 결과에서 잘림)
- 핵심 키워드를 앞에 배치
- 페이지마다 고유한 제목 작성

```html
<!-- 좋은 예 -->
<title>React useEffect 완벽 이해 | jratul 블로그</title>

<!-- 나쁜 예 -->
<title>홈</title>                    <!-- 너무 짧고 불명확 -->
<title>jratul 블로그</title>         <!-- 키워드 없음 -->
<title>React useEffect의 모든 것을 완벽하게 이해하는 초보자 가이드 2024</title>  <!-- 너무 길음 -->
```

### 설명(description) 작성 규칙
- **150~160자** 권장
- 페이지 내용 요약
- 클릭을 유도하는 문구

---

## 자주 하는 실수

**실수 1: charset 설정 누락**
```html
<!-- charset 없으면 한글 깨짐 -->
<head>
  <title>페이지</title>  <!-- 한글이 ???로 표시될 수 있음 -->
</head>

<!-- charset은 head의 첫 번째 태그로 -->
<head>
  <meta charset="UTF-8" />
  <title>페이지</title>
</head>
```

**실수 2: viewport 누락**
```html
<!-- viewport 없으면 모바일에서 PC 화면을 축소해서 보여줌 -->
<!-- 반응형 디자인이 전혀 동작하지 않음 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

**실수 3: 모든 페이지에 같은 title/description**
```html
<!-- 잘못된 예: 모든 페이지가 동일 -->
<title>jratul 블로그</title>
<meta name="description" content="jratul의 기술 블로그입니다." />

<!-- 올바른 예: 각 페이지마다 고유 -->
<!-- 메인 페이지 -->
<title>jratul의 기술 블로그 — 프론트엔드 개발 이야기</title>

<!-- 포스트 페이지 -->
<title>React useEffect 이해하기 | jratul 블로그</title>
```

---

## 정리

- `charset="UTF-8"`: 한글 깨짐 방지
- `viewport`: 모바일 반응형 필수
- `title` + `description`: 검색 결과에 표시 (페이지마다 고유하게)
- Open Graph (`og:*`): 소셜 미디어 공유 미리보기
- Twitter Card: 트위터 공유 카드
- `canonical`: 중복 URL 문제 해결
- `preconnect` / `preload`: 성능 향상
- 구조화 데이터 (JSON-LD): 리치 스니펫
