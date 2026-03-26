---
title: "Flexbox 레이아웃"
order: 4
---

## Flexbox란?

Flexbox(Flexible Box)는 **한 방향(가로 또는 세로)으로 요소를 배치하고 정렬하는** CSS 레이아웃 방식입니다.

Flexbox를 **군대 줄세우기**라고 생각하면 됩니다:
- 부모 요소(flex container)가 **교관**
- 자식 요소들(flex items)이 **병사들**
- 교관이 "앞으로 나란히!", "가운데 정렬!", "사이 간격 동일하게!" 명령을 내림

Flexbox 이전에는 float, position을 이용해 복잡한 레이아웃을 만들었지만,
Flexbox로 훨씬 쉽고 직관적으로 만들 수 있습니다.

---

## 기본 개념 — Container와 Items

```html
<div class="container">   <!-- Flex Container (부모) -->
  <div class="item">1</div>  <!-- Flex Item (자식) -->
  <div class="item">2</div>
  <div class="item">3</div>
</div>
```

```css
.container {
  display: flex;  /* 이 한 줄로 flex container가 됨 */
}
```

`display: flex`를 선언하면:
- 자식 요소들이 자동으로 **가로로 나란히** 배치됩니다
- 자식 요소들의 높이가 자동으로 맞춰집니다

---

## flex-direction — 배치 방향

```css
.container {
  display: flex;
  flex-direction: row;             /* 기본값: 가로 → 왼쪽에서 오른쪽 */
  flex-direction: row-reverse;     /* 가로 ← 오른쪽에서 왼쪽 */
  flex-direction: column;          /* 세로 ↓ 위에서 아래 */
  flex-direction: column-reverse;  /* 세로 ↑ 아래에서 위 */
}
```

```
row:           [1] [2] [3]
row-reverse:   [3] [2] [1]
column:        [1]
               [2]
               [3]
column-reverse:[3]
               [2]
               [1]
```

---

## justify-content — 주축 정렬

주축(main axis)은 `flex-direction` 방향입니다.
`row`면 가로, `column`이면 세로가 주축입니다.

```css
.container {
  display: flex;
  justify-content: flex-start;     /* 시작점 정렬 (기본값) [1][2][3]      */
  justify-content: flex-end;       /* 끝점 정렬           [1][2][3]      */
  justify-content: center;         /* 가운데 정렬    [1][2][3]           */
  justify-content: space-between;  /* 양 끝에 붙고, 사이 간격 균등 [1]  [2]  [3] */
  justify-content: space-around;   /* 각 아이템 주위 간격 균등  [1]  [2]  [3]  */
  justify-content: space-evenly;   /* 모든 간격 완전 균등   [1] [2] [3]  */
}
```

```
flex-start:    [1][2][3]          ← 왼쪽 정렬
flex-end:               [1][2][3] ← 오른쪽 정렬
center:           [1][2][3]       ← 가운데
space-between: [1]   [2]   [3]   ← 양끝에 붙고 사이 균등
space-around:   [1]  [2]  [3]    ← 각 아이템 좌우 같은 공간
space-evenly:  [1] [2] [3]      ← 모든 틈 완전히 동일
```

---

## align-items — 교차축 정렬

교차축(cross axis)은 주축의 수직 방향입니다.
`row`면 세로(위아래), `column`이면 가로(좌우)가 교차축입니다.

```css
.container {
  display: flex;
  height: 200px;  /* 높이가 있어야 정렬 효과가 보임 */

  align-items: stretch;     /* 기본값: 교차축 방향으로 늘림 */
  align-items: flex-start;  /* 시작점 (row면 위쪽) */
  align-items: flex-end;    /* 끝점 (row면 아래쪽) */
  align-items: center;      /* 가운데 */
  align-items: baseline;    /* 텍스트 기준선 맞춤 */
}
```

---

## 수평·수직 가운데 정렬 — 가장 많이 쓰는 패턴

```css
/* 한 줄로 완벽한 가운데 정렬! */
.center-container {
  display: flex;
  justify-content: center;  /* 가로 가운데 */
  align-items: center;      /* 세로 가운데 */
  height: 100vh;            /* 전체 화면 높이 */
}
```

Flexbox 이전에는 이 간단한 가운데 정렬이 꽤 까다로웠습니다.

---

## flex-wrap — 줄바꿈

```css
.container {
  display: flex;
  flex-wrap: nowrap;       /* 기본값: 줄바꿈 없이 한 줄에 다 넣음 (삐져나올 수 있음) */
  flex-wrap: wrap;         /* 아이템이 넘치면 다음 줄로 */
  flex-wrap: wrap-reverse; /* 다음 줄이 위로 감 */
}
```

```css
/* flex-direction + flex-wrap 단축 표현 */
flex-flow: row wrap;          /* 가로 + 줄바꿈 */
flex-flow: column nowrap;     /* 세로 + 줄바꿈 없음 */
```

---

## align-content — 여러 줄 정렬

`flex-wrap: wrap`으로 여러 줄이 될 때, 줄 전체의 정렬을 지정합니다.

```css
.container {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;    /* 위쪽 정렬 */
  align-content: flex-end;      /* 아래쪽 정렬 */
  align-content: center;        /* 가운데 정렬 */
  align-content: space-between; /* 줄 사이 균등 간격 */
  align-content: space-around;  /* 줄 주위 균등 간격 */
  align-content: stretch;       /* 기본값: 늘림 */
}
```

---

## Flex Items 속성

아래 속성들은 flex container가 아닌 **flex item(자식)**에 적용합니다.

### flex-grow — 남은 공간 차지하기

```css
.container {
  display: flex;
  width: 600px;
}

/* 세 아이템이 각각 얼마나 늘어날지 비율 */
.item-1 { flex-grow: 1; }  /* 남은 공간의 1/4 */
.item-2 { flex-grow: 2; }  /* 남은 공간의 2/4 */
.item-3 { flex-grow: 1; }  /* 남은 공간의 1/4 */

/* flex-grow: 0 (기본값): 늘어나지 않음 */
/* flex-grow: 1: 같은 비율로 균등하게 늘어남 */
```

### flex-shrink — 줄어드는 비율

```css
.item {
  flex-shrink: 1;  /* 기본값: 공간 부족 시 줄어듦 */
  flex-shrink: 0;  /* 줄어들지 않음 (크기 유지) */
  flex-shrink: 2;  /* 다른 요소의 2배 속도로 줄어듦 */
}
```

### flex-basis — 기본 크기

```css
.item {
  flex-basis: auto;    /* 기본값: 내용 크기에 따름 */
  flex-basis: 200px;   /* 기본 크기 200px */
  flex-basis: 30%;     /* 컨테이너의 30% */
  flex-basis: 0;       /* 내용 무시, flex-grow로만 크기 결정 */
}
```

### flex 단축 표현

```css
/* flex: grow shrink basis */
.item {
  flex: 1;          /* flex: 1 1 0% — 균등하게 늘어남/줄어듦 */
  flex: 1 0 auto;   /* 늘어나되 줄어들지 않음, 기본 크기는 auto */
  flex: 0 0 200px;  /* 고정 크기 200px (늘어나지도, 줄어들지도 않음) */
  flex: none;       /* flex: 0 0 auto — 크기 고정 */
  flex: auto;       /* flex: 1 1 auto */
}
```

### order — 시각적 순서 변경

```css
/* HTML 순서와 다르게 화면에 표시 */
.item-1 { order: 2; }   /* 세 번째로 표시 */
.item-2 { order: 3; }   /* 마지막으로 표시 */
.item-3 { order: 1; }   /* 첫 번째로 표시 */
/* 기본값은 0, 낮을수록 앞에 표시 */
```

### align-self — 개별 교차축 정렬

```css
/* 특정 아이템만 align-items를 재정의 */
.item-special {
  align-self: flex-start;  /* 이 아이템만 위쪽 정렬 */
  align-self: flex-end;
  align-self: center;
  align-self: stretch;
  align-self: auto;        /* 부모의 align-items 따름 (기본값) */
}
```

---

## gap — 아이템 간격

```css
.container {
  display: flex;
  gap: 16px;          /* 모든 방향 간격 */
  gap: 16px 24px;     /* 행 간격 | 열 간격 */
  row-gap: 16px;      /* 행(줄) 사이 간격 */
  column-gap: 24px;   /* 열(칸) 사이 간격 */
}
```

---

## 실전 패턴 모음

### 네비게이션 바

```css
.navbar {
  display: flex;
  justify-content: space-between;  /* 로고와 메뉴를 양 끝에 */
  align-items: center;             /* 세로 가운데 정렬 */
  padding: 0 24px;
  height: 64px;
  background: #1a1a3e;
}

.nav-links {
  display: flex;
  gap: 24px;           /* 메뉴 아이템 간격 */
  list-style: none;
}
```

### 카드 그리드

```css
.card-grid {
  display: flex;
  flex-wrap: wrap;   /* 여러 줄 허용 */
  gap: 24px;
}

.card {
  flex: 1 1 300px;  /* 기본 300px, 늘어나되 줄어들 수 있음 */
  max-width: 400px; /* 너무 커지지 않게 */
}
```

### 사이드바 레이아웃

```css
.page-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  flex: 0 0 250px;  /* 고정 너비 250px */
  background: #1a1a3e;
}

.main-content {
  flex: 1;          /* 남은 공간 모두 차지 */
  padding: 24px;
}
```

### 버튼 그룹 (오른쪽 정렬)

```css
.dialog-footer {
  display: flex;
  justify-content: flex-end;  /* 오른쪽 정렬 */
  gap: 8px;
  padding: 16px;
}
```

### 아이콘 + 텍스트 가운데 정렬

```css
.icon-text {
  display: flex;
  align-items: center;  /* 아이콘과 텍스트 세로 가운데 정렬 */
  gap: 8px;
}
```

### 마지막 아이템 오른쪽으로

```css
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar .spacer {
  flex: 1;  /* 남은 공간 모두 차지해서 마지막 아이템을 오른쪽으로 밀기 */
}
```

```html
<div class="toolbar">
  <button>저장</button>
  <button>취소</button>
  <div class="spacer"></div>  <!-- 이 div가 공간을 차지 -->
  <button>삭제</button>       <!-- 오른쪽으로 밀림 -->
</div>
```

---

## Flexbox 시각화

```
display: flex (기본 row)
┌────────────────────────────────────┐
│ 컨테이너                           │
│  [item1][item2][item3]             │
│  →→→→→ 주축(main axis) →→→→→      │
│                                    │
│  ↕ 교차축(cross axis) ↕            │
└────────────────────────────────────┘

justify-content: center
┌────────────────────────────────────┐
│         [item1][item2][item3]      │
└────────────────────────────────────┘

justify-content: space-between
┌────────────────────────────────────┐
│ [item1]      [item2]      [item3]  │
└────────────────────────────────────┘

align-items: center (높이가 있을 때)
┌────────────────────────────────────┐
│                                    │
│ [item1][item2][item3]              │
│                                    │
└────────────────────────────────────┘
```

---

## 자주 하는 실수

**실수 1: flex 속성을 item이 아닌 container에 적용**
```css
/* 잘못된 예 */
.container {
  flex: 1;  /* 부모에 flex가 없으면 의미 없음 */
}

/* 올바른 예: flex는 flex item에 적용 */
.parent { display: flex; }
.child  { flex: 1; }
```

**실수 2: justify-content와 align-items 방향 혼동**
```css
/* column 방향일 때는 주축이 세로 */
.container {
  display: flex;
  flex-direction: column;
  justify-content: center;  /* 세로 가운데 */
  align-items: center;      /* 가로 가운데 */
}
```

**실수 3: flex-wrap 없이 아이템이 넘침**
```css
/* 아이템이 많으면 컨테이너 밖으로 삐져나옴 */
.gallery { display: flex; }

/* wrap 추가 */
.gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
```

**실수 4: align-content vs align-items 혼동**
```css
/* align-items: 한 줄 내에서 아이템 정렬 */
/* align-content: 여러 줄 전체 정렬 (flex-wrap: wrap 일 때) */
.container {
  display: flex;
  flex-wrap: wrap;
  align-content: center;  /* 여러 줄이 있을 때 전체 가운데 */
}
```

---

## 정리

**Container(부모) 속성:**
- `display: flex`: Flexbox 활성화
- `flex-direction`: 배치 방향 (row/column)
- `justify-content`: 주축 정렬
- `align-items`: 교차축 정렬 (한 줄)
- `align-content`: 교차축 정렬 (여러 줄)
- `flex-wrap`: 줄바꿈 허용 여부
- `gap`: 아이템 간격

**Item(자식) 속성:**
- `flex`: grow shrink basis 단축 표현
- `flex-grow`: 늘어나는 비율
- `flex-shrink`: 줄어드는 비율
- `flex-basis`: 기본 크기
- `order`: 시각적 순서
- `align-self`: 개별 교차축 정렬
