---
title: "최신 CSS 기능"
order: 12
---

CSS는 매년 새로운 기능이 추가됩니다. 예전에는 JavaScript나 복잡한 해결책이 필요했던 것들이 이제 CSS만으로 가능해졌습니다.

---

## :is()와 :where() — 선택자 묶기

여러 선택자에 같은 스타일을 적용할 때 반복을 줄여줍니다.

```css
/* 기존 방식 — 반복이 많음 */
h1 a,
h2 a,
h3 a {
  color: blue;
}

/* :is() 사용 — 훨씬 간결 */
:is(h1, h2, h3) a {
  color: blue;
}
```

### :is()와 :where()의 차이

```css
/* :is() — 선택자 중 가장 높은 명시도를 가짐 */
:is(#id, .class) p {
  color: red;  /* 명시도: #id 수준 (0,1,0,1) */
}

/* :where() — 명시도가 항상 0 */
:where(#id, .class) p {
  color: blue;  /* 명시도: 0 — 쉽게 덮어쓸 수 있음 */
}
```

**언제 쓰나?**
- `:is()` — 선택자를 간결하게 묶을 때
- `:where()` — 기본값 스타일 지정 시 (쉽게 재정의 가능하도록)

---

## :has() — 부모 선택자 (게임 체인저!)

특정 자식을 가진 부모를 선택합니다. CSS에서 오랫동안 불가능했던 기능!

```css
/* 이미지를 포함한 카드만 다르게 스타일링 */
.card:has(img) {
  padding: 0;          /* 이미지 있는 카드는 패딩 제거 */
}

/* 체크된 체크박스를 가진 라벨 스타일링 */
label:has(input:checked) {
  background: #e0f0ff;  /* 선택된 항목 배경색 변경 */
  font-weight: bold;
}

/* input이 비어있지 않은 form-group 처리 */
.form-group:has(input:not(:placeholder-shown)) label {
  transform: translateY(-20px);  /* 플로팅 라벨 효과 */
  font-size: 0.8rem;
}
```

### 실용 예제 — 폼 검증 UI

```css
/* 유효한 입력 → 초록 테두리 */
.input-wrapper:has(input:valid) {
  border-color: #22c55e;
}

/* 유효하지 않고 포커스를 잃은 입력 → 빨간 테두리 */
.input-wrapper:has(input:invalid:not(:focus):not(:placeholder-shown)) {
  border-color: #ef4444;
}
```

---

## CSS Nesting — 중첩 문법

Sass/SCSS처럼 선택자를 중첩해서 쓸 수 있습니다. 이제 네이티브 CSS에서 지원!

```css
/* 기존 방식 */
.card { background: white; }
.card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.card .title { font-size: 1.25rem; }
.card .title span { color: #6366f1; }

/* CSS Nesting 사용 */
.card {
  background: white;

  /* & 는 부모 선택자(.card)를 가리킴 */
  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  .title {
    font-size: 1.25rem;

    span {
      color: #6366f1;  /* .card .title span */
    }
  }

  /* 미디어 쿼리도 중첩 가능 */
  @media (max-width: 640px) {
    padding: 1rem;  /* 모바일에서 패딩 줄임 */
  }
}
```

> **주의**: Chrome 112+, Safari 16.5+, Firefox 117+부터 지원. 구형 브라우저는 지원 안 됨.

---

## Container Queries — 컨테이너 기반 반응형

기존 미디어 쿼리는 **뷰포트(화면 크기)** 기준이었습니다. 컨테이너 쿼리는 **부모 요소의 크기** 기준으로 스타일을 바꿉니다.

```css
/* 컨테이너로 지정 */
.card-container {
  container-type: inline-size;  /* 너비 기준 컨테이너 쿼리 활성화 */
  container-name: card;         /* 이름 지정 (선택사항) */
}

/* 컨테이너 너비가 400px 이상일 때 */
@container card (min-width: 400px) {
  .card {
    display: flex;         /* 가로 레이아웃으로 전환 */
    flex-direction: row;
  }

  .card img {
    width: 40%;            /* 이미지 너비 고정 */
  }
}
```

### 미디어 쿼리 vs 컨테이너 쿼리

```
미디어 쿼리:
┌──────────────── 화면 1200px ─────────────────┐
│  사이드바(300px) │  메인 콘텐츠(900px)         │
│                 │  카드가 900px에 맞게 조정     │
└─────────────────────────────────────────────┘

컨테이너 쿼리:
┌──────────────── 화면 1200px ─────────────────┐
│  사이드바(300px) │  메인 콘텐츠(900px)         │
│  카드 → 세로형  │  카드 → 가로형               │
│  (300px 기준)   │  (900px 기준)               │
└─────────────────────────────────────────────┘
```

같은 컴포넌트가 **놓인 공간에 따라** 알아서 레이아웃을 바꿉니다.

---

## CSS 수학 함수

### clamp() — 반응형 폰트/크기

최소값, 선호값, 최대값을 한 번에 지정합니다.

```css
/* clamp(최소, 선호, 최대) */
h1 {
  /* 화면이 작으면 1.5rem, 크면 3rem, 그 사이는 뷰포트 너비에 비례 */
  font-size: clamp(1.5rem, 4vw, 3rem);
}

.container {
  /* 최소 320px, 최대 1200px, 기본은 화면의 90% */
  width: clamp(320px, 90%, 1200px);
  margin: 0 auto;
}
```

### min()과 max()

```css
.image {
  /* 500px 또는 100% 중 더 작은 값 → 화면보다 크게 안 넘침 */
  width: min(500px, 100%);
}

.sidebar {
  /* 200px 또는 20% 중 더 큰 값 → 너무 좁아지지 않음 */
  width: max(200px, 20%);
}
```

---

## Logical Properties — 논리적 속성

왼쪽/오른쪽 대신 시작/끝으로 표현합니다. 아랍어처럼 오른쪽에서 왼쪽으로 읽는 언어(RTL)도 자동 지원.

```css
/* 기존 물리적 속성 */
.box {
  margin-left: 1rem;    /* 항상 왼쪽 */
  padding-right: 1rem;  /* 항상 오른쪽 */
  border-top: 1px solid;
}

/* 논리적 속성 */
.box {
  margin-inline-start: 1rem;   /* LTR: 왼쪽, RTL: 오른쪽 */
  padding-inline-end: 1rem;    /* LTR: 오른쪽, RTL: 왼쪽 */
  border-block-start: 1px solid; /* 항상 위쪽 */
}

/* 자주 쓰는 논리적 속성 */
/* margin-inline: 좌우 마진 (= margin-left + margin-right) */
/* padding-block: 상하 패딩 (= padding-top + padding-bottom) */
/* inset-inline: left + right 단축 */
/* inset-block: top + bottom 단축 */
```

---

## @layer — 스타일 레이어

CSS 명시도(specificity) 충돌을 레이어로 관리합니다.

```css
/* 레이어 순서 정의 — 나중에 선언된 레이어가 우선 */
@layer reset, base, components, utilities;

/* 리셋 CSS */
@layer reset {
  * { margin: 0; padding: 0; box-sizing: border-box; }
}

/* 기본 스타일 */
@layer base {
  body { font-family: sans-serif; }
  a { color: blue; }
}

/* 컴포넌트 스타일 */
@layer components {
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
  }
}

/* 유틸리티 — 가장 높은 우선순위 */
@layer utilities {
  .text-red { color: red; }  /* 다른 레이어의 color를 덮어씀 */
}
```

**왜 유용한가?** Tailwind CSS 같은 유틸리티 클래스와 직접 작성한 스타일이 충돌할 때 레이어로 우선순위를 명확히 관리할 수 있습니다.

---

## Scroll Snap — 스크롤 스냅

JavaScript 없이 슬라이더/캐러셀 구현!

```css
/* 컨테이너 설정 */
.slider {
  display: flex;
  overflow-x: scroll;
  scroll-snap-type: x mandatory;  /* x축, 반드시 스냅 */
  gap: 1rem;
  padding: 1rem;

  /* 스크롤바 숨기기 */
  scrollbar-width: none;
}

/* 각 슬라이드 */
.slide {
  flex: 0 0 100%;          /* 한 번에 하나씩 */
  scroll-snap-align: start; /* 슬라이드 시작점에 스냅 */
  border-radius: 1rem;
}
```

---

## accent-color — 폼 요소 색상

체크박스, 라디오, range 등 네이티브 폼 요소의 색상을 쉽게 변경!

```css
/* 전체 적용 */
:root {
  accent-color: #6366f1;  /* 보라색으로 통일 */
}

/* 특정 요소에만 */
input[type="checkbox"] {
  accent-color: #22c55e;  /* 초록 체크박스 */
  width: 1.2rem;
  height: 1.2rem;
}

input[type="range"] {
  accent-color: #ef4444;  /* 빨간 슬라이더 */
}
```

---

## color-scheme — 다크모드 지원

```css
/* 라이트/다크 모두 지원 선언 */
:root {
  color-scheme: light dark;
}

/* CSS 변수로 테마 색상 관리 */
:root {
  --bg: #ffffff;
  --text: #111111;
  --card: #f5f5f5;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0a0a1f;
    --text: #e5e5e5;
    --card: #1a1a3e;
  }
}

body {
  background: var(--bg);
  color: var(--text);
}
```

---

## 자주 하는 실수

```css
/* ❌ :has() 폴리필 없이 구형 브라우저 사용 */
/* Safari 15 이하, Firefox 120 이하는 미지원 */

/* ❌ container-type 지정 없이 컨테이너 쿼리 사용 */
.box {
  /* container-type 없으면 @container가 동작 안 함 */
}

/* ✅ 올바른 방법 */
.box {
  container-type: inline-size;
}
@container (min-width: 400px) { ... }

/* ❌ clamp에서 단위 혼용 오류 */
font-size: clamp(16px, 4vw, 24px); /* 브라우저마다 계산 다를 수 있음 */

/* ✅ rem 통일 권장 */
font-size: clamp(1rem, 4vw, 1.5rem);
```

---

## 브라우저 지원 확인

새 CSS 기능을 쓰기 전에 [caniuse.com](https://caniuse.com)에서 지원 현황을 확인하는 습관을 들이세요.

```css
/* @supports — 지원 여부에 따라 다른 스타일 적용 */
@supports (container-type: inline-size) {
  /* 컨테이너 쿼리 지원하는 브라우저만 */
  .card-container {
    container-type: inline-size;
  }
}

@supports not (container-type: inline-size) {
  /* 미지원 브라우저 폴백 */
  .card {
    max-width: 600px;
  }
}
```
