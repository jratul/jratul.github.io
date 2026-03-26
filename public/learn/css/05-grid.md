---
title: "CSS Grid"
order: 5
---

## CSS Grid란?

CSS Grid는 **가로(열)와 세로(행)를 동시에 제어하는 2차원 레이아웃 시스템**입니다.

Grid를 **바둑판**이나 **엑셀 시트**라고 생각하면 됩니다:
- 가로줄(행, row)과 세로줄(열, column)이 있습니다
- 각 칸(셀)에 요소를 배치합니다
- 여러 칸을 합쳐서 큰 영역을 만들 수 있습니다

**Flexbox vs Grid:**
- Flexbox: 한 방향 (가로 또는 세로) → 네비게이션, 버튼 그룹
- Grid: 두 방향 동시 (가로 + 세로) → 전체 페이지 레이아웃, 이미지 갤러리

---

## 기본 개념

```html
<div class="grid-container">   <!-- Grid Container (부모) -->
  <div class="grid-item">1</div>
  <div class="grid-item">2</div>
  <div class="grid-item">3</div>
  <div class="grid-item">4</div>
  <div class="grid-item">5</div>
  <div class="grid-item">6</div>
</div>
```

```css
.grid-container {
  display: grid;                      /* Grid 활성화 */
  grid-template-columns: 200px 200px 200px;  /* 3열, 각 200px */
  grid-template-rows: 100px 100px;           /* 2행, 각 100px */
  gap: 16px;                          /* 셀 간격 */
}
```

결과:
```
[1][2][3]
[4][5][6]
```

---

## grid-template-columns / rows — 열과 행 정의

```css
.container {
  display: grid;

  /* 고정 크기 */
  grid-template-columns: 200px 200px 200px;

  /* fr 단위: 남은 공간을 비율로 나눔 */
  grid-template-columns: 1fr 1fr 1fr;  /* 동일한 3열 */
  grid-template-columns: 1fr 2fr 1fr;  /* 가운데가 2배 */
  grid-template-columns: 250px 1fr;    /* 왼쪽 고정, 나머지 */

  /* repeat(): 반복 패턴 */
  grid-template-columns: repeat(3, 1fr);       /* 1fr 1fr 1fr 과 같음 */
  grid-template-columns: repeat(4, 200px);     /* 200px 4번 */
  grid-template-columns: repeat(3, 1fr 2fr);  /* 1fr 2fr 1fr 2fr 1fr 2fr */

  /* auto: 내용 크기에 맞춤 */
  grid-template-columns: auto 1fr auto;

  /* 혼합 사용 */
  grid-template-columns: 250px repeat(3, 1fr) 200px;
}
```

---

## fr 단위 — Grid의 핵심

`fr`(fraction)은 **남은 공간을 분할하는 단위**입니다.

```css
/* 600px 컨테이너에서 */
grid-template-columns: 1fr 2fr 1fr;
/*
  전체 4fr
  1열: 600px × 1/4 = 150px
  2열: 600px × 2/4 = 300px
  3열: 600px × 1/4 = 150px
*/

grid-template-columns: 200px 1fr;
/*
  1열: 200px (고정)
  2열: 나머지 400px 전부 차지
*/
```

---

## repeat()과 auto-fill / auto-fit

```css
/* auto-fill: 열 개수를 자동으로 채움 */
grid-template-columns: repeat(auto-fill, 200px);
/* 컨테이너 너비에 따라 열 수가 자동으로 변함 */
/* 800px → 4열, 400px → 2열 */

/* auto-fit: auto-fill과 비슷하지만 빈 열을 접어버림 */
grid-template-columns: repeat(auto-fit, 200px);

/* minmax()와 함께: 반응형 그리드 */
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
/* 최소 200px, 최대 1fr → 화면 크기에 따라 열 수 자동 조정 */
/* 600px: 3열(각 ~200px), 400px: 2열(각 ~200px) */
```

---

## minmax() — 최소/최대 크기 지정

```css
.container {
  display: grid;

  /* 최소 100px, 최대 200px */
  grid-template-columns: minmax(100px, 200px) 1fr;

  /* 최소 150px, 최대 남은 공간 */
  grid-template-columns: repeat(3, minmax(150px, 1fr));

  /* 행: 최소 80px, 최대 내용 크기 */
  grid-template-rows: repeat(3, minmax(80px, auto));
}
```

---

## gap — 셀 간격

```css
.container {
  display: grid;
  gap: 16px;           /* 행/열 모두 16px */
  gap: 20px 32px;      /* 행 간격 | 열 간격 */
  row-gap: 20px;       /* 행 사이 간격 */
  column-gap: 32px;    /* 열 사이 간격 */
}
```

---

## 아이템 배치 — grid-column / grid-row

Grid의 진짜 강점은 **아이템을 원하는 위치에 배치**하는 것입니다.

```
그리드 라인 번호:
   1   2   3   4
1  ┌───┬───┬───┐
   │   │   │   │
2  ├───┼───┼───┤
   │   │   │   │
3  └───┴───┴───┘

열 라인: 1, 2, 3, 4
행 라인: 1, 2, 3
```

```css
.item {
  /* grid-column: 시작 라인 / 끝 라인 */
  grid-column: 1 / 3;    /* 1번 ~ 3번 라인 (2칸 차지) */
  grid-column: 2 / 4;    /* 2번 ~ 4번 라인 (2칸 차지) */
  grid-column: 1 / -1;   /* 처음 ~ 끝 (전체 너비) */

  /* span: 몇 칸 차지할지 */
  grid-column: span 2;   /* 현재 위치에서 2칸 차지 */
  grid-column: 1 / span 3;  /* 1번 라인에서 3칸 */

  /* grid-row도 같은 방식 */
  grid-row: 1 / 3;       /* 1번 ~ 3번 라인 (2행 차지) */
  grid-row: span 2;
}
```

---

## 실전 예제 — 잡지 레이아웃

```html
<div class="magazine-grid">
  <article class="hero">대형 메인 기사</article>
  <article class="secondary">서브 기사 1</article>
  <article class="secondary">서브 기사 2</article>
  <article class="small">짧은 기사 1</article>
  <article class="small">짧은 기사 2</article>
  <article class="small">짧은 기사 3</article>
</div>
```

```css
.magazine-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);  /* 4열 그리드 */
  grid-template-rows: auto;
  gap: 20px;
}

.hero {
  grid-column: 1 / 3;    /* 2열 차지 */
  grid-row: 1 / 3;       /* 2행 차지 */
}

.secondary {
  grid-column: span 2;   /* 2열 차지 */
}

.small {
  /* 기본: 1칸씩 자동 배치 */
}
```

---

## grid-template-areas — 이름으로 배치

영역에 이름을 붙여서 배치하는 직관적인 방법입니다.

```css
.page-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 64px 1fr 60px;
  grid-template-areas:
    "header  header"    /* 첫 번째 행: 헤더가 2칸 전부 */
    "sidebar main"      /* 두 번째 행: 사이드바 + 메인 */
    "footer  footer";  /* 세 번째 행: 푸터가 2칸 전부 */
  min-height: 100vh;
  gap: 0;
}

/* 이름으로 배치 */
.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }
```

```html
<div class="page-layout">
  <header class="header">헤더</header>
  <nav class="sidebar">사이드바</nav>
  <main class="main">메인 콘텐츠</main>
  <footer class="footer">푸터</footer>
</div>
```

---

## 자동 배치 — grid-auto-flow

```css
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);

  grid-auto-flow: row;     /* 기본값: 왼쪽→오른쪽, 위→아래 */
  grid-auto-flow: column;  /* 위→아래, 왼쪽→오른쪽 */
  grid-auto-flow: row dense; /* 빈 공간을 채우며 배치 (순서 변경 가능) */
}

/* 자동 생성되는 행의 크기 */
.container {
  grid-auto-rows: 100px;        /* 자동 생성 행: 100px */
  grid-auto-rows: minmax(100px, auto);  /* 최소 100px */
}
```

---

## 아이템 정렬

```css
/* 컨테이너: 모든 아이템 정렬 */
.container {
  /* 셀 안에서 아이템 가로 정렬 */
  justify-items: start;   /* 왼쪽 */
  justify-items: end;     /* 오른쪽 */
  justify-items: center;  /* 가운데 */
  justify-items: stretch; /* 기본값: 셀 전체 채움 */

  /* 셀 안에서 아이템 세로 정렬 */
  align-items: start;     /* 위 */
  align-items: end;       /* 아래 */
  align-items: center;    /* 가운데 */
  align-items: stretch;   /* 기본값 */

  /* place-items: align-items justify-items 단축 */
  place-items: center;    /* 가로세로 모두 가운데 */
  place-items: start center;

  /* 그리드 전체를 컨테이너 안에서 정렬 */
  justify-content: center;
  align-content: center;
}

/* 개별 아이템 정렬 */
.item {
  justify-self: center;   /* 이 아이템만 가로 가운데 */
  align-self: end;        /* 이 아이템만 세로 아래 */
  place-self: center end;
}
```

---

## 반응형 그리드 패턴

```css
/* 패턴 1: auto-fill + minmax (가장 많이 사용) */
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 24px;
}
/* 화면이 좁아지면 자동으로 열 수가 줄어듦 */

/* 패턴 2: 미디어 쿼리로 열 수 변경 */
.grid-3col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 768px) {
  .grid-3col {
    grid-template-columns: repeat(2, 1fr);  /* 2열 */
  }
}

@media (max-width: 480px) {
  .grid-3col {
    grid-template-columns: 1fr;  /* 1열 */
  }
}
```

---

## 실전 패턴 모음

### 이미지 갤러리

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  grid-auto-rows: 200px;        /* 모든 셀 높이 200px */
  gap: 8px;
}

.gallery .featured {
  grid-column: span 2;           /* 가로 2칸 */
  grid-row: span 2;              /* 세로 2칸 */
}
```

### 대시보드

```css
.dashboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(120px, auto);
  gap: 16px;
}

.stat-card { /* 기본: 1칸 */ }
.chart-card { grid-column: span 2; }   /* 2칸 */
.main-chart { grid-column: span 4; }   /* 전체 너비 */
```

### Holy Grail 레이아웃 (헤더-사이드바-메인-푸터)

```css
.app-layout {
  display: grid;
  grid-template-areas:
    "header"
    "main"
    "footer";
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

@media (min-width: 768px) {
  .app-layout {
    grid-template-areas:
      "header  header"
      "sidebar main"
      "footer  footer";
    grid-template-columns: 250px 1fr;
  }
}

header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
main    { grid-area: main; }
footer  { grid-area: footer; }
```

---

## 자주 하는 실수

**실수 1: fr과 %를 혼용했을 때 예상치 못한 결과**
```css
/* gap이 있으면 % 계산이 복잡해짐 */
grid-template-columns: 50% 50%;  /* gap까지 더해지면 너비 초과 */

/* fr 사용이 안전함 */
grid-template-columns: 1fr 1fr;  /* gap 제외하고 균등 분할 */
```

**실수 2: grid-area 이름에 따옴표 혼동**
```css
/* grid-template-areas의 각 행은 따옴표로 */
grid-template-areas:
  "header header"   /* 올바름 */
  sidebar main;     /* 잘못됨: 따옴표 없음 */

/* grid-area에는 따옴표 없이 */
.header { grid-area: header; }   /* 올바름 */
.header { grid-area: "header"; } /* 잘못됨 */
```

**실수 3: 라인 번호 1부터 시작**
```css
/* CSS Grid 라인은 1부터 시작 (0이 아님!) */
grid-column: 0 / 2;  /* 잘못됨 */
grid-column: 1 / 3;  /* 올바름: 1번 라인부터 3번 라인까지 = 2칸 */
```

---

## Grid와 Flexbox 함께 사용

Grid와 Flexbox는 경쟁 관계가 아니라 **상호 보완** 관계입니다.

```css
/* 전체 페이지: Grid */
.page {
  display: grid;
  grid-template-areas:
    "header"
    "main"
    "footer";
}

/* 헤더 내부: Flexbox */
header {
  grid-area: header;
  display: flex;              /* 헤더 안 요소는 flex */
  justify-content: space-between;
  align-items: center;
}

/* 카드 그리드: Grid */
.card-section {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

/* 카드 내부: Flexbox */
.card {
  display: flex;              /* 카드 내용은 flex */
  flex-direction: column;
}

.card .card-footer {
  margin-top: auto;           /* 카드 아래쪽에 고정 */
}
```

---

## 정리

**Container 속성:**
- `display: grid`: Grid 활성화
- `grid-template-columns`: 열 정의
- `grid-template-rows`: 행 정의
- `grid-template-areas`: 이름으로 영역 정의
- `gap`: 셀 간격
- `grid-auto-flow`: 자동 배치 방향
- `grid-auto-rows`: 자동 생성 행 크기

**유용한 함수:**
- `fr`: 비율 단위
- `repeat()`: 반복 패턴
- `minmax()`: 최소/최대 크기
- `auto-fill` / `auto-fit`: 자동 열 개수

**Item 속성:**
- `grid-column`: 열 배치 (라인 / span)
- `grid-row`: 행 배치
- `grid-area`: 이름으로 배치
- `justify-self` / `align-self`: 개별 정렬
