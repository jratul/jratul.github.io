---
title: "position과 z-index"
order: 7
---

## position이란?

CSS `position` 속성은 요소를 **어떤 기준으로 어디에 배치할지** 결정합니다.

기본적으로 HTML 요소들은 위에서 아래로 순서대로 배치됩니다.
`position`을 사용하면 이 흐름에서 벗어나 원하는 위치에 요소를 배치할 수 있습니다.

`top`, `right`, `bottom`, `left` 속성과 함께 사용합니다.

---

## position 종류

```css
.element {
  position: static;    /* 기본값 */
  position: relative;  /* 원래 위치 기준 */
  position: absolute;  /* 가장 가까운 positioned 조상 기준 */
  position: fixed;     /* 뷰포트(화면) 기준, 스크롤해도 고정 */
  position: sticky;    /* 스크롤에 따라 relative ↔ fixed 전환 */
}
```

---

## static — 기본값

모든 요소의 기본 position입니다.
`top`, `right`, `bottom`, `left`, `z-index`가 **적용되지 않습니다**.

```css
.box {
  position: static; /* 기본값이라 생략 가능 */
  top: 20px;        /* static에서는 무시됨 */
}
```

---

## relative — 원래 위치 기준 이동

요소가 원래 있던 자리를 **기준으로 이동**합니다.
원래 자리는 비어있는 채로 유지됩니다 (다른 요소들이 침범 못 함).

```css
.box {
  position: relative;
  top: 20px;    /* 원래 위치보다 20px 아래로 */
  left: 30px;   /* 원래 위치보다 30px 오른쪽으로 */
}
```

주요 사용 사례:
1. 약간의 위치 조정
2. `absolute` 자식 요소의 **기준점** 역할

---

## absolute — 기준점에서 정확한 위치

`position: absolute`인 요소는:
1. **일반 흐름에서 완전히 빠집니다** (자리를 차지하지 않음)
2. **가장 가까운 `positioned` 조상** 기준으로 위치합니다
   - `positioned` = `static`이 아닌 (`relative`, `absolute`, `fixed`, `sticky`)
   - 없으면 `<html>` 기준

```html
<div class="parent">    <!-- position: relative -->
  <div class="child">  <!-- position: absolute -->
    배지
  </div>
  본문 내용
</div>
```

```css
.parent {
  position: relative;  /* absolute 자식의 기준점 역할 */
  width: 200px;
  height: 150px;
  background: lightblue;
}

.child {
  position: absolute;
  top: 10px;     /* 부모 위쪽에서 10px */
  right: 10px;   /* 부모 오른쪽에서 10px */
  background: red;
  color: white;
  padding: 4px 8px;
  border-radius: 50%;
}
```

---

## absolute 가운데 정렬

```css
/* 부모 기준 가운데 정렬 */
.parent {
  position: relative;
}

.centered-child {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);  /* 자신의 크기만큼 역방향 이동 */
}
```

---

## fixed — 화면에 고정

`position: fixed`인 요소는 **뷰포트(보이는 화면) 기준**으로 위치합니다.
스크롤해도 항상 같은 자리에 있습니다.

```css
/* 상단 헤더 고정 */
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;       /* left: 0 + right: 0 = 전체 너비 */
  height: 64px;
  background: white;
  z-index: 100;   /* 다른 요소 위에 표시 */
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* 고정 헤더가 본문을 가리지 않도록 */
body {
  padding-top: 64px;
}

/* 오른쪽 하단 버튼 */
.fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #6366f1;
  color: white;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
  cursor: pointer;
}

/* 전체 화면 오버레이 (모달 배경) */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;           /* 또는 width: 100vw; height: 100vh; */
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
}
```

---

## sticky — 스크롤 따라 고정

스크롤하기 전에는 `relative`처럼 동작하다가,
지정한 위치에 도달하면 `fixed`처럼 붙어있습니다.

```css
/* 스크롤 시 상단에 붙는 목차 */
.table-of-contents {
  position: sticky;
  top: 80px;         /* 상단에서 80px 위치에서 고정 */
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}

/* 테이블 헤더 고정 */
thead th {
  position: sticky;
  top: 0;            /* 스크롤 시 맨 위에 붙음 */
  background: white;
  z-index: 1;
}

/* sticky가 동작하려면: */
/* 1. top/bottom/left/right 중 하나 반드시 지정 */
/* 2. 부모 요소가 overflow: hidden이면 안 됨 */
/* 3. 부모보다 작아야 함 */
```

---

## z-index — 쌓이는 순서

`position`이 `static`이 아닌 요소들이 겹칠 때, 어느 요소가 위에 표시될지 결정합니다.

```css
.layer-1 {
  position: relative;
  z-index: 1;    /* 가장 아래 */
}

.layer-2 {
  position: relative;
  z-index: 10;   /* 중간 */
}

.layer-3 {
  position: relative;
  z-index: 100;  /* 가장 위 */
}
```

### z-index 계층 체계 (권장)

```css
:root {
  --z-below: -1;       /* 배경 뒤 */
  --z-base: 1;         /* 기본 */
  --z-dropdown: 100;   /* 드롭다운 메뉴 */
  --z-sticky: 200;     /* sticky 헤더 */
  --z-overlay: 300;    /* 모달 배경 */
  --z-modal: 400;      /* 모달 창 */
  --z-toast: 500;      /* 알림 토스트 */
  --z-tooltip: 600;    /* 툴팁 */
}

.header { z-index: var(--z-sticky); }
.modal-overlay { z-index: var(--z-overlay); }
.modal { z-index: var(--z-modal); }
```

### Stacking Context (쌓임 맥락)

z-index가 예상대로 동작하지 않는 이유는 **쌓임 맥락** 때문입니다.

```html
<div class="parent-A" style="position: relative; z-index: 1;">
  <div class="child" style="position: relative; z-index: 9999;">
    <!-- z-index가 9999여도 parent-A 안에서만 통함 -->
  </div>
</div>

<div class="parent-B" style="position: relative; z-index: 2;">
  <!-- parent-B가 parent-A 위에 표시됨 -->
  <!-- parent-B 안의 요소는 child보다 위에 있음 -->
</div>
```

쌓임 맥락을 새로 만드는 속성들:
- `position: relative/absolute/fixed/sticky` + `z-index` (auto 아닌 값)
- `opacity` < 1
- `transform` 사용
- `filter` 사용
- `will-change`

---

## 실전 예제 모음

### 이미지 위에 텍스트 오버레이

```css
.card {
  position: relative;   /* 자식 absolute의 기준 */
  overflow: hidden;
}

.card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.card-overlay {
  position: absolute;
  bottom: 0;            /* 아래쪽에 붙음 */
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  color: white;
}
```

### 배지/알림 숫자

```css
.icon-button {
  position: relative;
  display: inline-block;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: bold;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 드롭다운 메뉴

```css
.dropdown {
  position: relative;   /* 메뉴의 기준점 */
  display: inline-block;
}

.dropdown-menu {
  position: absolute;
  top: 100%;            /* 버튼 바로 아래 */
  left: 0;
  min-width: 200px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  z-index: 100;         /* 다른 요소 위에 표시 */
  display: none;        /* 기본 숨김 */
}

.dropdown:hover .dropdown-menu,
.dropdown:focus-within .dropdown-menu {
  display: block;       /* 호버 시 표시 */
}
```

### 모달 창

```css
/* 배경 오버레이 */
.modal-overlay {
  position: fixed;
  inset: 0;             /* top: 0; right: 0; bottom: 0; left: 0; 단축 */
  background: rgba(0, 0, 0, 0.5);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 모달 창 */
.modal {
  position: relative;   /* 닫기 버튼 위치 기준 */
  background: white;
  border-radius: 12px;
  padding: 32px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  z-index: 301;
}

/* 닫기 버튼 */
.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
}
```

---

## 자주 하는 실수

**실수 1: absolute 기준점 설정 안 함**
```css
/* 잘못된 예: 부모에 relative 없음 → html 기준으로 날아감 */
.parent { /* position 없음 */ }
.child { position: absolute; top: 0; right: 0; }

/* 올바른 예 */
.parent { position: relative; }
.child  { position: absolute; top: 0; right: 0; }
```

**실수 2: z-index가 static 요소에 안 먹힘**
```css
/* 잘못된 예: position이 없으면 z-index 무시 */
.box {
  z-index: 100;  /* 동작 안 함 */
}

/* 올바른 예 */
.box {
  position: relative;  /* 또는 absolute, fixed, sticky */
  z-index: 100;
}
```

**실수 3: sticky가 동작 안 함**
```css
/* sticky는 부모에 overflow: hidden이 있으면 동작 안 함! */
.parent { overflow: hidden; }  /* sticky 방해 */
.child  { position: sticky; top: 0; }  /* 동작 안 함 */

/* 부모의 overflow: hidden 제거 */
.parent { overflow: visible; }  /* 또는 overflow 속성 제거 */
```

**실수 4: fixed 요소가 transform 안에 갇힘**
```css
/* transform을 가진 부모 안에서 fixed는 뷰포트 기준이 아님 */
.parent { transform: scale(1); }  /* 쌓임 맥락 생성 */
.child  { position: fixed; }     /* 뷰포트 아닌 부모 기준 */
```

---

## 정리

| position | 기준 | 흐름 | 사용 사례 |
|----------|------|------|-----------|
| static | (없음) | 유지 | 기본값 |
| relative | 원래 자리 | 유지 | 약간 이동, absolute의 기준점 |
| absolute | positioned 조상 | 벗어남 | 툴팁, 배지, 드롭다운 |
| fixed | 뷰포트 | 벗어남 | 헤더, FAB, 모달 |
| sticky | 스크롤 기준 | 유지→고정 | 목차, 테이블 헤더 |

- `z-index`: 겹칠 때 위에 오는 순서, position이 있어야 동작
- `inset: 0`: `top: 0; right: 0; bottom: 0; left: 0;` 단축
