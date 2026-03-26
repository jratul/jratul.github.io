---
title: "박스 모델"
order: 3
---

## 박스 모델이란?

CSS에서 **모든 HTML 요소는 사각형 박스**입니다.
텍스트 한 줄, 이미지, 버튼, div — 전부 박스입니다.

박스 모델은 **선물 포장 상자**와 같습니다:
- 내용물(content) — 선물 자체
- 완충재(padding) — 내용물 주변의 뽁뽁이
- 상자 벽(border) — 상자의 두께
- 상자 바깥 공간(margin) — 상자와 다른 상자 사이의 거리

```
┌─────────────────────────────────┐
│            margin               │
│  ┌───────────────────────────┐  │
│  │          border           │  │
│  │  ┌─────────────────────┐  │  │
│  │  │       padding       │  │  │
│  │  │  ┌───────────────┐  │  │  │
│  │  │  │    content    │  │  │  │
│  │  │  └───────────────┘  │  │  │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

---

## content — 내용 영역

실제 내용(텍스트, 이미지 등)이 들어가는 공간입니다.
`width`와 `height`로 크기를 지정합니다.

```css
.box {
  width: 200px;    /* 가로 크기 */
  height: 100px;   /* 세로 크기 */
}
```

---

## padding — 안쪽 여백

content와 border 사이의 **안쪽 공간**입니다.
배경색이 padding 영역까지 채워집니다.

```css
/* 네 방향 모두 같은 값 */
padding: 20px;

/* 상하 | 좌우 */
padding: 10px 20px;

/* 상 | 좌우 | 하 */
padding: 10px 20px 15px;

/* 상 | 우 | 하 | 좌 (시계 방향) */
padding: 10px 20px 15px 5px;

/* 각 방향 개별 지정 */
padding-top: 10px;
padding-right: 20px;
padding-bottom: 15px;
padding-left: 5px;
```

---

## border — 테두리

```css
/* 단축 표현: 두께 | 스타일 | 색상 */
border: 2px solid #333;

/* 각 속성 개별 지정 */
border-width: 2px;
border-style: solid;   /* solid / dashed / dotted / double / none */
border-color: #333;

/* 한 방향만 */
border-top: 3px solid blue;
border-bottom: 1px dashed gray;
border-left: 4px solid red;
border-right: none;

/* 모서리 둥글게 */
border-radius: 8px;              /* 네 모서리 모두 */
border-radius: 8px 0 8px 0;     /* 좌상, 우상, 우하, 좌하 */
border-radius: 50%;              /* 원 만들기 (정사각형에 적용 시) */

/* 테두리만 없애기 */
border: none;
border: 0;
```

```css
/* border-style 종류 시각화 */
.solid   { border: 3px solid #333; }    /* ─────── 실선 */
.dashed  { border: 3px dashed #333; }   /* - - - - 긴 점선 */
.dotted  { border: 3px dotted #333; }   /* · · · · 짧은 점선 */
.double  { border: 6px double #333; }   /* ═══════ 이중선 */
```

---

## margin — 바깥 여백

요소와 **주변 요소 사이의 공간**입니다.
배경색이 margin에는 적용되지 않습니다 (투명).

```css
/* padding과 같은 방식으로 지정 */
margin: 20px;
margin: 10px 20px;
margin: 10px 20px 15px 5px;

margin-top: 10px;
margin-right: 20px;
margin-bottom: 10px;
margin-left: 20px;

/* 가운데 정렬 (width가 있어야 함) */
margin: 0 auto;

/* 음수 margin: 요소를 겹치게 할 때 사용 */
margin-top: -20px;
```

### margin collapse (마진 겹침)

위아래 인접한 두 요소의 margin이 합쳐지지 않고 **큰 값 하나만** 적용됩니다.

```css
/* 예시: 두 요소가 20px + 30px = 50px이 될 것 같지만 */
.box1 { margin-bottom: 20px; }
.box2 { margin-top: 30px; }
/* 실제로는 두 박스 사이가 30px (더 큰 값만 적용) */
```

> 마진 겹침은 상하에만 발생합니다. 좌우는 겹치지 않습니다.

---

## box-sizing — 크기 계산 방식

`box-sizing`은 `width`와 `height`가 **어디까지를 포함하느냐**를 결정합니다.

### content-box (기본값) — 함정 주의!

```css
.box {
  box-sizing: content-box;  /* 기본값 */
  width: 200px;
  padding: 20px;
  border: 5px solid black;
}
/* 실제 차지하는 너비: 200 + 20×2 + 5×2 = 250px ← 예상보다 큼! */
```

### border-box — 직관적이고 편리

```css
.box {
  box-sizing: border-box;
  width: 200px;          /* padding + border 포함해서 200px */
  padding: 20px;
  border: 5px solid black;
}
/* 실제 차지하는 너비: 정확히 200px ← 예상과 일치! */
/* content 영역: 200 - 20×2 - 5×2 = 150px */
```

```css
/* 모든 요소에 border-box 적용 (강력 추천!) */
*, *::before, *::after {
  box-sizing: border-box;
}
```

> 대부분의 현대 CSS 코드는 `border-box`를 기본으로 설정합니다.
> 처음부터 이렇게 설정하고 시작하세요.

---

## display 속성 — 블록 vs 인라인

요소가 박스 모델을 어떻게 적용하느냐는 `display` 속성에 따라 다릅니다.

```css
/* block: 한 줄 전체를 차지, width/height/margin 모두 적용 */
display: block;

/* inline: 내용만큼만 차지, width/height/상하 margin 적용 안 됨 */
display: inline;

/* inline-block: 인라인처럼 나란히, 하지만 width/height 적용됨 */
display: inline-block;

/* none: 완전히 숨김 (공간도 차지 안 함) */
display: none;
```

```html
<!-- block 요소: div, p, h1-h6, ul, li, section, article 등 -->
<div style="background: lightblue; padding: 10px;">블록 요소 (한 줄 차지)</div>
<div style="background: lightgreen; padding: 10px;">다음 블록 요소</div>

<!-- inline 요소: span, a, strong, em, img 등 -->
<span style="background: yellow; padding: 5px;">인라인</span>
<span style="background: orange; padding: 5px;">나란히 배치됨</span>

<!-- inline-block: 나란히 + 크기 지정 가능 -->
<span style="display: inline-block; width: 100px; height: 50px; background: pink;">
  inline-block
</span>
```

---

## width / height 단위

```css
.box {
  /* 고정 크기 */
  width: 300px;
  height: 200px;

  /* 부모 요소 기준 % */
  width: 50%;          /* 부모의 50% 너비 */

  /* 뷰포트(화면) 기준 */
  width: 100vw;        /* 화면 너비의 100% */
  height: 100vh;       /* 화면 높이의 100% */

  /* 최솟값/최댓값 */
  min-width: 200px;    /* 최소 200px */
  max-width: 800px;    /* 최대 800px */
  min-height: 100px;
  max-height: 500px;

  /* 내용만큼 */
  width: fit-content;  /* 내용 크기에 맞춤 */
  width: min-content;  /* 가능한 최소 너비 */
  width: max-content;  /* 가능한 최대 너비 (줄바꿈 없이) */
}
```

---

## overflow — 넘치는 내용 처리

```css
.box {
  width: 200px;
  height: 100px;

  overflow: visible;  /* 기본값: 박스 밖으로 넘침 */
  overflow: hidden;   /* 넘치는 내용 잘라냄 */
  overflow: scroll;   /* 항상 스크롤바 표시 */
  overflow: auto;     /* 넘칠 때만 스크롤바 표시 (권장) */

  /* 가로/세로 개별 지정 */
  overflow-x: hidden;
  overflow-y: auto;
}

/* 텍스트 한 줄로 잘라내기 */
.ellipsis {
  white-space: nowrap;      /* 줄바꿈 없음 */
  overflow: hidden;          /* 넘치면 숨김 */
  text-overflow: ellipsis;   /* 잘린 부분에 ... 표시 */
}
```

---

## 실전 예제

```css
/* 카드 컴포넌트 */
.card {
  box-sizing: border-box;     /* 크기 계산 편하게 */
  width: 320px;
  padding: 24px;               /* 안쪽 여백 */
  margin: 16px;                /* 카드 간 간격 */
  border: 1px solid #e5e7eb;   /* 테두리 */
  border-radius: 12px;         /* 둥근 모서리 */
  background-color: white;
}

/* 버튼 */
.btn {
  box-sizing: border-box;
  display: inline-block;
  padding: 10px 24px;          /* 상하 10px, 좌우 24px */
  border: 2px solid #6366f1;
  border-radius: 6px;
  background-color: #6366f1;
  color: white;
  cursor: pointer;
}

/* 컨테이너 (중앙 정렬) */
.container {
  box-sizing: border-box;
  max-width: 1200px;           /* 최대 너비 */
  margin: 0 auto;              /* 좌우 자동 = 가운데 정렬 */
  padding: 0 20px;             /* 좌우 여백 */
}
```

---

## 자주 하는 실수

**실수 1: box-sizing 미설정**
```css
/* 함정: padding 추가했더니 레이아웃이 깨짐 */
.box {
  width: 100%;
  padding: 20px;  /* content-box 기준으로 너비가 100% + 40px이 됨! */
}

/* 해결 */
*, *::before, *::after {
  box-sizing: border-box;
}
```

**실수 2: margin auto가 안 됨**
```css
/* inline 요소는 margin: auto가 동작 안 함 */
span {
  margin: 0 auto;  /* 효과 없음 */
}

/* block 요소에 width를 주고 써야 함 */
div {
  width: 200px;
  margin: 0 auto;  /* 가운데 정렬 */
}
```

**실수 3: 마진 겹침 오해**
```css
/* 상하 마진은 겹쳐서 큰 값만 적용됨을 기억 */
.a { margin-bottom: 20px; }
.b { margin-top: 30px; }
/* 간격은 50px이 아니라 30px */
```

---

## 정리

- 모든 요소는 박스: content + padding + border + margin
- `box-sizing: border-box`를 전역 설정으로 사용
- `padding`: 안쪽 여백, 배경색 적용됨
- `margin`: 바깥 여백, 배경색 없음, 상하 겹침 주의
- `margin: 0 auto`: 블록 요소 가운데 정렬
- `overflow`: 넘치는 내용 처리 방법
- `display`: block / inline / inline-block / none
