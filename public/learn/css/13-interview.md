---
title: "CSS 면접 예상 질문"
order: 13
---

# CSS 면접 예상 질문

CSS 프론트엔드 면접에서 빈출되는 핵심 질문들입니다.

## Q1. CSS 명시도(Specificity)는 어떻게 계산하나요?

명시도(Specificity)는 동일한 요소에 여러 CSS 규칙이 충돌할 때 어떤 스타일을 적용할지 결정하는 우선순위 점수입니다. 명시도가 높을수록 해당 스타일이 적용됩니다.

```
(인라인, ID, 클래스/속성/의사클래스, 태그/의사요소)
```

| 선택자 | 명시도 |
|-------|-------|
| `*` | (0, 0, 0, 0) |
| `div` | (0, 0, 0, 1) |
| `.class` | (0, 0, 1, 0) |
| `#id` | (0, 1, 0, 0) |
| `style=""` | (1, 0, 0, 0) |
| `!important` | 명시도 무시 (최우선) |

```css
/* 명시도 비교 예시 */
p { color: blue; }              /* (0,0,0,1) */
.text { color: red; }           /* (0,0,1,0) → 빨간색 적용 */
#main p { color: green; }       /* (0,1,0,1) → 초록색 적용 */
```

---

## Q2. CSS 박스 모델을 설명해주세요

CSS 박스 모델(Box Model)은 모든 HTML 요소를 content(내용), padding(안쪽 여백), border(테두리), margin(바깥 여백) 네 영역으로 구성하는 레이아웃 개념입니다.

```
┌─────────────────────────────┐
│           margin            │
│  ┌───────────────────────┐  │
│  │        border         │  │
│  │  ┌─────────────────┐  │  │
│  │  │     padding     │  │  │
│  │  │  ┌───────────┐  │  │  │
│  │  │  │  content  │  │  │  │
│  │  │  └───────────┘  │  │  │
│  │  └─────────────────┘  │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

**box-sizing의 차이:**
```css
/* content-box (기본): width = content만 */
.box { box-sizing: content-box; width: 100px; padding: 20px; }
/* 실제 너비: 100 + 40 = 140px */

/* border-box (권장): width = content + padding + border */
.box { box-sizing: border-box; width: 100px; padding: 20px; }
/* 실제 너비: 100px (padding 포함) */
```

모든 요소에 `*, *::before, *::after { box-sizing: border-box; }`를 적용하는 것이 일반적입니다.

---

## Q3. Flexbox의 주요 속성을 설명해주세요

Flexbox (Flexible Box Layout, 유연한 박스 레이아웃)는 1차원(행 또는 열) 방향으로 아이템을 배치하고 정렬하기 위한 CSS 레이아웃 모듈입니다.

```css
.container {
    display: flex;
    flex-direction: row | column;       /* 주축 방향 */
    justify-content: flex-start | center | space-between | space-around;  /* 주축 정렬 */
    align-items: stretch | center | flex-start | flex-end;  /* 교차축 정렬 */
    flex-wrap: nowrap | wrap;           /* 줄 바꿈 */
    gap: 16px;                          /* 간격 */
}

.item {
    flex: 1;        /* flex-grow: 1, flex-shrink: 1, flex-basis: 0 */
    flex-grow: 1;   /* 남은 공간 차지 비율 */
    flex-shrink: 0; /* 줄어들지 않음 */
    flex-basis: 200px;  /* 초기 크기 */
    align-self: center; /* 개별 교차축 정렬 */
    order: 2;           /* 순서 변경 */
}
```

---

## Q4. CSS Grid의 주요 속성을 설명해주세요

CSS Grid (그리드 레이아웃)는 행과 열을 동시에 제어하는 2차원 레이아웃 시스템입니다.

```css
.container {
    display: grid;
    grid-template-columns: 200px 1fr 1fr;  /* 3컬럼 */
    grid-template-rows: auto;
    gap: 16px;

    /* repeat */
    grid-template-columns: repeat(3, 1fr);

    /* 반응형 그리드 */
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.item {
    grid-column: 1 / 3;   /* 1번째 ~ 3번째 선 사이 */
    grid-row: 1 / 2;
    grid-area: header;    /* named area */
}
```

**Flexbox vs Grid:**
- **Flexbox:** 1차원 (행 또는 열)
- **Grid:** 2차원 (행과 열 동시)

---

## Q5. CSS 포지셔닝(Positioning)을 설명해주세요

```css
position: static;      /* 기본, 일반 흐름 */
position: relative;    /* 일반 흐름 + top/left로 오프셋, 자식의 기준점 */
position: absolute;    /* 일반 흐름에서 제거, 가장 가까운 relative 부모 기준 */
position: fixed;       /* viewport 기준 고정 */
position: sticky;      /* 스크롤 시 지정 임계값에 fixed로 전환 */
```

```css
/* 가운데 정렬 패턴 */
/* 1. Flexbox */
.parent { display: flex; justify-content: center; align-items: center; }

/* 2. Grid */
.parent { display: grid; place-items: center; }

/* 3. Absolute + Transform */
.child {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
}
```

---

## Q6. BEM 방법론이란 무엇인가요?

**BEM (Block, Element, Modifier)** — CSS 클래스 네이밍 규칙입니다. 컴포넌트를 블록·요소·변형 세 개념으로 나눠 일관된 클래스명을 작성하는 CSS 방법론입니다.

```css
/* Block: 독립적인 컴포넌트 */
.card { }

/* Element: Block의 구성 요소 (__ 이중 언더스코어) */
.card__title { }
.card__image { }
.card__button { }

/* Modifier: Block이나 Element의 변형 (-- 이중 하이픈) */
.card--featured { }
.card__button--disabled { }
```

```html
<div class="card card--featured">
    <img class="card__image" src="...">
    <h2 class="card__title">제목</h2>
    <button class="card__button card__button--disabled">버튼</button>
</div>
```

**장점:** 명시도 충돌 없음, 재사용성, 자체 문서화

---

## Q7. CSS 변수(Custom Properties)를 설명해주세요

CSS 변수(Custom Properties)는 CSS 안에서 값을 재사용할 수 있도록 `--변수명` 형식으로 선언하는 기능입니다. JavaScript에서 동적으로 변경할 수 있어 테마 전환에 유용합니다.

```css
/* 선언 — :root에 전역 변수 정의 */
:root {
    --color-primary: #3b82f6;
    --color-secondary: #64748b;
    --font-size-base: 16px;
    --spacing-unit: 8px;
}

/* 사용 */
.button {
    background: var(--color-primary);
    padding: calc(var(--spacing-unit) * 2);
    font-size: var(--font-size-base);
}

/* 로컬 오버라이드 */
.card {
    --color-primary: #10b981;  /* 이 컴포넌트 내에서만 변경 */
}

/* 테마 전환 */
[data-theme="dark"] {
    --color-primary: #60a5fa;
}
```

---

## Q8. CSS 애니메이션을 구현하는 방법은?

```css
/* transition — 상태 변화 시 */
.button {
    background: blue;
    transition: background 0.3s ease, transform 0.2s;
}
.button:hover {
    background: darkblue;
    transform: scale(1.05);
}

/* animation — 자동 반복 애니메이션 */
@keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}

.loader {
    animation: spin 1s linear infinite;
}

/* 성능 최적화: GPU 레이어 활용 */
.animated {
    transform: translateX(0);  /* transform/opacity 사용 권장 */
    will-change: transform;    /* 브라우저에 미리 알림 */
}
/* ❌ layout을 일으키는 속성은 피함: top/left/width/height */
```

`will-change`는 브라우저에게 해당 속성이 곧 변경될 것임을 미리 알려 GPU 레이어를 생성하게 하는 힌트 속성입니다. `transition`은 상태 변화 시 한 번만 재생되고, `@keyframes`를 사용하는 `animation`은 반복·세밀한 제어가 가능합니다.
