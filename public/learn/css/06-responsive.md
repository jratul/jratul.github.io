---
title: "반응형 디자인"
order: 6
---

## 반응형 디자인이란?

반응형 웹 디자인(Responsive Web Design)은 **화면 크기에 따라 레이아웃이 자동으로 변하는** 디자인 방법입니다.

스마트폰, 태블릿, 노트북, 대형 모니터 — 모두 다른 화면 크기를 가집니다.
하나의 HTML 파일로 모든 기기에서 잘 보이도록 만드는 것이 반응형 디자인의 목표입니다.

**물처럼 생각하세요:** 물은 담는 그릇의 모양에 맞게 변합니다.
반응형 레이아웃도 화면 크기에 맞게 흘러서 채워지도록 만듭니다.

---

## viewport 설정 — 필수!

```html
<!-- 이 태그 없으면 모바일에서 PC 화면을 축소해서 보여줌 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

| 속성 | 설명 |
|------|------|
| `width=device-width` | 화면 너비를 기기 실제 너비로 설정 |
| `initial-scale=1.0` | 초기 확대 비율 1배 (100%) |

---

## 미디어 쿼리 — 화면 조건에 따른 CSS

미디어 쿼리(`@media`)는 화면 크기, 방향 등의 조건에 따라 다른 CSS를 적용합니다.

```css
/* 기본 스타일 (모든 크기에 적용) */
.container {
  padding: 16px;
}

/* 화면 너비가 768px 이상일 때 */
@media (min-width: 768px) {
  .container {
    padding: 32px;
  }
}

/* 화면 너비가 1200px 이상일 때 */
@media (min-width: 1200px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 48px;
  }
}
```

---

## Mobile-First vs Desktop-First

### Mobile-First (권장)

작은 화면을 기본으로 작성하고, 큰 화면에서 추가 스타일을 적용합니다.

```css
/* 기본: 모바일 스타일 */
.card-grid {
  display: grid;
  grid-template-columns: 1fr;  /* 1열 */
  gap: 16px;
}

/* 태블릿 이상: 2열 */
@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
}

/* 데스크탑 이상: 3열 */
@media (min-width: 1200px) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
}
```

### Desktop-First

큰 화면을 기본으로 작성하고, 작은 화면에서 덮어씁니다.

```css
/* 기본: 데스크탑 스타일 */
.card-grid {
  grid-template-columns: repeat(3, 1fr);
}

/* 태블릿 이하: 2열 */
@media (max-width: 1199px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 모바일 이하: 1열 */
@media (max-width: 767px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}
```

> Mobile-First가 성능 측면에서 유리합니다.
> 모바일은 데스크탑보다 성능이 낮고, 필요한 스타일만 적용받아야 합니다.

---

## 일반적인 Breakpoint

```css
/* Tailwind CSS 기준 breakpoint */

/* sm: 640px */
@media (min-width: 640px) { ... }

/* md: 768px */
@media (min-width: 768px) { ... }

/* lg: 1024px */
@media (min-width: 1024px) { ... }

/* xl: 1280px */
@media (min-width: 1280px) { ... }

/* 2xl: 1536px */
@media (min-width: 1536px) { ... }
```

---

## 다양한 미디어 쿼리 조건

```css
/* 너비 범위 */
@media (min-width: 768px) and (max-width: 1023px) {
  /* 태블릿에만 적용 */
}

/* 화면 방향 */
@media (orientation: landscape) {
  /* 가로 방향 */
}
@media (orientation: portrait) {
  /* 세로 방향 */
}

/* 고해상도 화면 (Retina 디스플레이) */
@media (-webkit-min-device-pixel-ratio: 2),
       (min-resolution: 192dpi) {
  /* 고해상도 이미지 제공 */
}

/* 다크 모드 */
@media (prefers-color-scheme: dark) {
  body {
    background: #0a0a1f;
    color: #e5e7eb;
  }
}

/* 다크 모드 선호 */
@media (prefers-color-scheme: light) {
  body {
    background: #ffffff;
    color: #111827;
  }
}

/* 애니메이션 감소 선호 (모션 민감한 사용자) */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}

/* 프린트 */
@media print {
  nav, footer, .ad { display: none; }  /* 인쇄 시 불필요한 요소 숨김 */
}
```

---

## 반응형 단위

```css
/* 상대 단위 사용이 반응형에 유리 */

/* rem: 루트(html) 폰트 크기 기준 */
/* html 기본 폰트 크기: 16px */
.text {
  font-size: 1rem;     /* 16px */
  font-size: 1.5rem;   /* 24px */
  margin: 2rem;        /* 32px */
}

/* em: 부모 요소 폰트 크기 기준 */
.parent {
  font-size: 20px;
}
.child {
  font-size: 0.8em;    /* 20px × 0.8 = 16px */
  padding: 1em;        /* 16px (자신의 font-size 기준) */
}

/* vw / vh: 뷰포트(화면) 크기 기준 */
.hero {
  height: 100vh;       /* 화면 높이 100% */
  font-size: 5vw;      /* 화면 너비의 5% */
}

/* % : 부모 요소 기준 */
.half-width {
  width: 50%;          /* 부모의 50% */
}

/* clamp(): 최솟값, 선호값, 최댓값 */
.responsive-font {
  font-size: clamp(14px, 2vw, 20px);
  /* 최소 14px, 화면의 2%, 최대 20px */
}
```

---

## 반응형 이미지

```css
/* 이미지가 부모를 넘지 않도록 */
img {
  max-width: 100%;
  height: auto;      /* 비율 유지 */
}

/* 배경 이미지 반응형 */
.hero {
  background-image: url('hero.jpg');
  background-size: cover;      /* 컨테이너 크기에 맞게 확대/축소 */
  background-position: center;
  height: 400px;
}

/* object-fit: img/video 크기 조정 방식 */
.card-image {
  width: 100%;
  height: 200px;
  object-fit: cover;      /* 비율 유지하며 잘라내기 */
  object-fit: contain;    /* 비율 유지하며 전체 보기 */
  object-fit: fill;       /* 비율 무시하고 채우기 */
  object-position: top;   /* 잘리는 위치 조절 */
}
```

---

## 반응형 타이포그래피

```css
/* 방법 1: 미디어 쿼리 */
h1 {
  font-size: 28px;
}

@media (min-width: 768px) {
  h1 { font-size: 40px; }
}

@media (min-width: 1200px) {
  h1 { font-size: 56px; }
}

/* 방법 2: clamp() — 미디어 쿼리 없이 */
h1 {
  font-size: clamp(28px, 5vw, 56px);
  /* 화면 크기에 따라 28px~56px 사이에서 자연스럽게 변화 */
}

/* 방법 3: vw + rem 조합 */
h1 {
  font-size: calc(1rem + 3vw);
}
```

---

## 반응형 네비게이션 패턴

```html
<header>
  <nav>
    <a href="/" class="logo">Logo</a>
    <button class="menu-toggle" aria-expanded="false" aria-label="메뉴 열기">
      ☰
    </button>
    <ul class="nav-links">
      <li><a href="/">홈</a></li>
      <li><a href="/about">소개</a></li>
      <li><a href="/contact">연락처</a></li>
    </ul>
  </nav>
</header>
```

```css
/* 모바일 기본: 메뉴 숨김 */
.nav-links {
  display: none;         /* 기본 숨김 */
  flex-direction: column;
  width: 100%;
}

.nav-links.open {
  display: flex;         /* 열렸을 때 표시 */
}

.menu-toggle {
  display: block;        /* 모바일에서 햄버거 버튼 표시 */
}

/* 데스크탑: 메뉴 항상 표시 */
@media (min-width: 768px) {
  .nav-links {
    display: flex !important;      /* 항상 표시 */
    flex-direction: row;
    width: auto;
  }

  .menu-toggle {
    display: none;                 /* 햄버거 버튼 숨김 */
  }
}
```

---

## container query — 요소 크기 기반 스타일

뷰포트 크기가 아닌 **부모 컨테이너 크기**에 반응합니다. (최신 기능)

```css
/* 컨테이너 쿼리 등록 */
.card-container {
  container-type: inline-size;   /* 가로 크기 기반 */
  container-name: card;
}

/* 컨테이너 크기에 따른 스타일 */
@container card (min-width: 400px) {
  .card {
    display: flex;           /* 넓으면 가로 배치 */
    flex-direction: row;
  }
}

@container card (max-width: 399px) {
  .card {
    flex-direction: column;  /* 좁으면 세로 배치 */
  }
}
```

---

## 실전 예제 — 블로그 레이아웃

```css
/* 공통 설정 */
*, *::before, *::after {
  box-sizing: border-box;
}

/* 컨테이너 */
.container {
  width: 100%;
  padding: 0 16px;
  margin: 0 auto;
}

@media (min-width: 640px) {
  .container { padding: 0 24px; }
}

@media (min-width: 1200px) {
  .container {
    max-width: 1200px;
    padding: 0 32px;
  }
}

/* 포스트 그리드 */
.posts-grid {
  display: grid;
  grid-template-columns: 1fr;           /* 모바일: 1열 */
  gap: 24px;
  padding: 24px 0;
}

@media (min-width: 640px) {
  .posts-grid {
    grid-template-columns: repeat(2, 1fr);  /* sm: 2열 */
    gap: 32px;
  }
}

@media (min-width: 1024px) {
  .posts-grid {
    grid-template-columns: repeat(3, 1fr);  /* lg: 3열 */
    gap: 40px;
  }
}

/* 포스트 상세 레이아웃 */
.post-layout {
  display: grid;
  grid-template-columns: 1fr;           /* 모바일: 1열 */
}

@media (min-width: 1024px) {
  .post-layout {
    grid-template-columns: 1fr 300px;   /* lg: 본문 + 사이드바 */
    gap: 48px;
  }
}

/* 폰트 크기 */
h1 {
  font-size: clamp(24px, 4vw, 48px);
}

h2 {
  font-size: clamp(20px, 3vw, 36px);
}

p {
  font-size: clamp(15px, 1.5vw, 17px);
}
```

---

## 자주 하는 실수

**실수 1: viewport 설정 누락**
```html
<!-- 이게 없으면 모바일에서 전혀 반응형이 안 됨 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

**실수 2: px 고정값으로 레이아웃**
```css
/* 잘못된 예: 360px 폰에서 잘림 */
.container { width: 800px; }

/* 올바른 예 */
.container {
  width: 100%;
  max-width: 800px;
}
```

**실수 3: 이미지 반응형 미적용**
```css
/* 이미지가 부모를 벗어남 */
img { /* 아무것도 없음 */ }

/* 기본 적용 */
img {
  max-width: 100%;
  height: auto;
}
```

---

## 정리

- `<meta name="viewport">`: 반응형의 시작, 반드시 설정
- `@media (min-width: ...)`: 미디어 쿼리로 화면별 스타일
- Mobile-First: 작은 화면 기본, `min-width`로 확장
- Desktop-First: 큰 화면 기본, `max-width`로 축소
- `rem`, `%`, `vw/vh`: 반응형에 적합한 상대 단위
- `clamp()`: 미디어 쿼리 없이 유동적 크기
- `max-width: 100%` + `height: auto`: 이미지 반응형
- `prefers-color-scheme`: 다크 모드 대응
