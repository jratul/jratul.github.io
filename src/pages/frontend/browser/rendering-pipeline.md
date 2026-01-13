---
title: "브라우저 렌더링 파이프라인"
date: "2026-01-14"
tags: ["browser", "rendering", "performance", "frontend", "web"]
excerpt: "브라우저가 HTML, CSS, JavaScript를 화면에 그리는 과정을 알아봅니다."
---

# 브라우저 렌더링 파이프라인

브라우저가 HTML, CSS, JavaScript를 받아서 화면에 그리는 전체 과정을 알아봅니다.

## 렌더링 파이프라인 전체 흐름

```
HTML → DOM Tree
                  ↘
CSS  → CSSOM Tree → Render Tree → Layout → Paint → Composite
                  ↗
JavaScript
```

---

## 1. DOM 생성 (Parsing HTML)

### HTML 파싱

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Example</title>
  </head>
  <body>
    <h1>Hello</h1>
    <p>World</p>
  </body>
</html>
```

**DOM Tree 생성:**
```
Document
└── html
    ├── head
    │   └── title
    │       └── "Example"
    └── body
        ├── h1
        │   └── "Hello"
        └── p
            └── "World"
```

---

### 파싱 과정

```
Bytes → Characters → Tokens → Nodes → DOM
```

**예시:**
```
<html><body><h1>Hi</h1></body></html>
  ↓
Bytes: 3C 68 74 6D 6C 3E...
  ↓
Characters: <html><body><h1>Hi</h1>...
  ↓
Tokens: StartTag:html, StartTag:body, StartTag:h1, Text:Hi, EndTag:h1...
  ↓
Nodes: HTMLHtmlElement, HTMLBodyElement, HTMLHeadingElement...
  ↓
DOM Tree
```

---

## 2. CSSOM 생성 (Parsing CSS)

### CSS 파싱

```css
body {
  font-size: 16px;
}

h1 {
  color: blue;
  font-size: 24px;
}

p {
  color: gray;
}
```

**CSSOM Tree 생성:**
```
body (font-size: 16px)
├── h1 (color: blue, font-size: 24px)
└── p (color: gray)
```

---

### CSS는 렌더링 차단 리소스

```html
<head>
  <!-- 이 CSS가 로드될 때까지 렌더링 차단 -->
  <link rel="stylesheet" href="styles.css">
</head>
```

**이유:** CSSOM이 완성되어야 스타일이 적용된 페이지를 그릴 수 있음

---

## 3. Render Tree 생성

**DOM + CSSOM = Render Tree**

### Render Tree 구축

```html
<html>
  <body>
    <h1>Hello</h1>
    <p style="display: none;">Hidden</p>
    <div>World</div>
  </body>
</html>
```

**Render Tree:**
```
RenderObject (body)
├── RenderObject (h1)
│   └── "Hello"
└── RenderObject (div)
    └── "World"
```

**주의:** `display: none`은 Render Tree에서 제외됩니다.

---

### Render Tree에서 제외되는 요소

```html
<!-- Render Tree에 포함되지 않음 -->
<head>...</head>
<script>...</script>
<style>...</style>
<meta>
<link>

<!-- display: none -->
<div style="display: none;">Not rendered</div>
```

---

### visibility vs display

```html
<!-- display: none → Render Tree에서 제외 -->
<div style="display: none;">제외됨</div>

<!-- visibility: hidden → Render Tree에 포함 (공간 차지) -->
<div style="visibility: hidden;">포함됨</div>
```

---

## 4. Layout (Reflow)

**각 노드의 정확한 위치와 크기를 계산**합니다.

### Layout 계산

```html
<div style="width: 50%;">
  <p>텍스트</p>
</div>
```

**계산 과정:**
```
1. 뷰포트 크기 확인: 1920px × 1080px
2. div 너비 계산: 1920px × 50% = 960px
3. p 너비 계산: 부모의 100% = 960px
4. p 높이 계산: 텍스트 내용에 따라 자동 계산
5. 위치 계산: (x, y) 좌표
```

**결과:** Box Model (위치, 크기) 생성

---

### Box Model

```
┌─────────────────────────────────┐
│ Margin                          │
│ ┌─────────────────────────────┐ │
│ │ Border                      │ │
│ │ ┌─────────────────────────┐ │ │
│ │ │ Padding                 │ │ │
│ │ │ ┌─────────────────────┐ │ │ │
│ │ │ │ Content            │ │ │ │
│ │ │ │ (width × height)   │ │ │ │
│ │ │ └─────────────────────┘ │ │ │
│ │ └─────────────────────────┘ │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

### Layout을 발생시키는 속성

```css
/* Layout (Reflow) 발생 */
width, height
padding, margin
border
position
display
top, left, right, bottom
font-size
line-height
text-align
overflow
```

---

## 5. Paint

**각 노드를 실제 픽셀로 그립니다.**

### Paint 과정

```
1. 텍스트 그리기
2. 색상 채우기
3. 이미지 그리기
4. 테두리 그리기
5. 그림자 그리기
```

**예시:**
```css
div {
  background: blue;
  color: white;
  border: 1px solid black;
  box-shadow: 2px 2px 4px gray;
}
```

**Paint 순서:**
1. background (blue)
2. border (1px solid black)
3. box-shadow (2px 2px 4px gray)
4. color (white 텍스트)

---

### Paint를 발생시키는 속성

```css
/* Paint 발생 */
color
background
background-image
background-size
box-shadow
border-radius
visibility
text-decoration
outline
```

---

## 6. Composite (합성)

**여러 레이어를 합쳐서 최종 화면을 만듭니다.**

### 레이어 생성 조건

```css
/* 새 레이어 생성 */
transform: translateZ(0);
will-change: transform;
position: fixed;
opacity < 1 (애니메이션 시);
filter: blur(...);
```

---

### GPU 가속

```css
/* ✅ GPU 가속 (Composite만 발생) */
transform: translateX(100px);
opacity: 0.5;

/* ❌ CPU 렌더링 (Layout/Paint 발생) */
left: 100px;
background: red;
```

**GPU 가속 속성:**
- `transform`
- `opacity`
- `filter`

---

## Reflow와 Repaint

### Reflow (Layout 재계산)

**노드의 위치/크기가 변경될 때 발생**

```javascript
// ❌ Reflow 발생 (느림)
element.style.width = '100px';
element.style.height = '100px';
element.style.margin = '10px';
```

**비용:** 매우 높음 (전체 레이아웃 재계산)

---

### Repaint (다시 그리기)

**노드의 시각적 속성만 변경될 때 발생**

```javascript
// ❌ Repaint 발생 (Reflow보다 빠름)
element.style.color = 'red';
element.style.background = 'blue';
```

**비용:** 중간 (레이아웃은 그대로, 픽셀만 다시 그림)

---

### Composite만 발생

```javascript
// ✅ Composite만 발생 (가장 빠름)
element.style.transform = 'translateX(100px)';
element.style.opacity = '0.5';
```

**비용:** 가장 낮음 (GPU 가속)

---

## JavaScript의 영향

### 파싱 차단

```html
<!-- HTML 파싱 차단 -->
<script src="script.js"></script>

<!-- 차단 안 됨 (비동기) -->
<script src="script.js" async></script>

<!-- 차단 안 됨 (지연) -->
<script src="script.js" defer></script>
```

---

### async vs defer

```html
<script src="a.js" async></script>  <!-- 다운로드 완료 즉시 실행 -->
<script src="b.js" async></script>  <!-- 실행 순서 보장 안 됨 -->

<script src="c.js" defer></script>  <!-- HTML 파싱 후 실행 -->
<script src="d.js" defer></script>  <!-- 순서 보장됨 -->
```

**타임라인:**
```
HTML 파싱:  ──────────────────────────→
async:      ──다운로드──↓실행
defer:      ──다운로드──────────────↓실행
일반:       ──다운로드──↓실행 (파싱 차단)
```

---

### DOM 조작의 비용

```javascript
// ❌ Reflow 10번 발생
for (let i = 0; i < 10; i++) {
  element.style.width = i + 'px';
}

// ✅ Reflow 1번 발생
element.style.width = '10px';
```

---

## Critical Rendering Path (CRP)

**첫 화면을 그리는 데 필요한 최소한의 과정**

```
HTML → DOM → Render Tree → Layout → Paint
CSS → CSSOM ↗
```

---

### CRP 최적화

#### 1. HTML 최소화

```html
<!-- ❌ 불필요한 중첩 -->
<div><div><div><p>Hello</p></div></div></div>

<!-- ✅ 간결한 구조 -->
<p>Hello</p>
```

---

#### 2. CSS 최적화

```html
<!-- ❌ 여러 CSS 파일 -->
<link rel="stylesheet" href="base.css">
<link rel="stylesheet" href="layout.css">
<link rel="stylesheet" href="theme.css">

<!-- ✅ 번들링 -->
<link rel="stylesheet" href="bundle.css">

<!-- ✅ 중요 CSS 인라인 -->
<style>
  /* Critical CSS */
  body { font-size: 16px; }
  h1 { color: blue; }
</style>
<link rel="stylesheet" href="non-critical.css" media="print" onload="this.media='all'">
```

---

#### 3. JavaScript 최적화

```html
<!-- ❌ <head>에 일반 스크립트 -->
<head>
  <script src="app.js"></script>
</head>

<!-- ✅ <body> 끝에 배치 -->
<body>
  ...
  <script src="app.js"></script>
</body>

<!-- ✅ defer 사용 -->
<head>
  <script src="app.js" defer></script>
</head>
```

---

## 성능 최적화 전략

### 1. Reflow 최소화

```javascript
// ❌ Reflow 3번 발생
element.style.width = '100px';
console.log(element.offsetWidth);  // Reflow 강제
element.style.height = '100px';
console.log(element.offsetHeight);  // Reflow 강제
element.style.padding = '10px';

// ✅ Reflow 1번 발생 (한 번에 변경)
element.style.cssText = 'width: 100px; height: 100px; padding: 10px;';

// ✅ 또는 className 사용
element.className = 'box-style';
```

---

### 2. Layout Thrashing 방지

```javascript
// ❌ Layout Thrashing (읽기-쓰기 반복)
elements.forEach(el => {
  el.style.width = el.offsetWidth + 10 + 'px';  // 읽기-쓰기 반복
});

// ✅ 읽기와 쓰기 분리
const widths = elements.map(el => el.offsetWidth);  // 읽기
widths.forEach((width, i) => {
  elements[i].style.width = width + 10 + 'px';  // 쓰기
});
```

---

### 3. transform/opacity 사용

```css
/* ❌ Layout 발생 */
.box {
  transition: left 0.3s;
}
.box:hover {
  left: 100px;
}

/* ✅ Composite만 발생 */
.box {
  transition: transform 0.3s;
}
.box:hover {
  transform: translateX(100px);
}
```

---

### 4. will-change 사용

```css
/* 애니메이션 예정인 요소 */
.box {
  will-change: transform, opacity;
}

/* 애니메이션 끝나면 제거 */
.box.animation-done {
  will-change: auto;
}
```

**주의:** 너무 많이 사용하면 메모리 낭비

---

### 5. DocumentFragment 사용

```javascript
// ❌ DOM에 직접 추가 (Reflow 100번)
for (let i = 0; i < 100; i++) {
  const div = document.createElement('div');
  document.body.appendChild(div);  // Reflow 발생
}

// ✅ DocumentFragment 사용 (Reflow 1번)
const fragment = document.createDocumentFragment();
for (let i = 0; i < 100; i++) {
  const div = document.createElement('div');
  fragment.appendChild(div);  // 메모리에만 추가
}
document.body.appendChild(fragment);  // Reflow 1번
```

---

### 6. requestAnimationFrame 사용

```javascript
// ❌ 임의의 타이밍에 변경
setInterval(() => {
  element.style.transform = `translateX(${x}px)`;
  x += 1;
}, 16);

// ✅ 브라우저 렌더링 타이밍에 맞춤
function animate() {
  element.style.transform = `translateX(${x}px)`;
  x += 1;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

---

## 렌더링 성능 측정

### Chrome DevTools

```javascript
// Performance 탭
// 1. Record 클릭
// 2. 페이지 조작
// 3. Stop 클릭
// 4. Layout, Paint, Composite 시간 확인
```

---

### Rendering 탭

```
Chrome DevTools → More tools → Rendering
- Paint flashing: Paint 영역 시각화
- Layout Shift Regions: Layout Shift 시각화
- Frame Rendering Stats: FPS 표시
```

---

### Lighthouse

```
Chrome DevTools → Lighthouse
- Performance 측정
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
```

---

## 실전 예제

### 예제 1: 스크롤 애니메이션

```javascript
// ❌ 스크롤마다 Reflow
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  element.style.top = scrollTop + 'px';  // Reflow 발생
});

// ✅ transform 사용
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  element.style.transform = `translateY(${scrollTop}px)`;  // Composite만
});
```

---

### 예제 2: 무한 스크롤

```javascript
// ❌ 모든 항목 DOM에 유지
items.forEach(item => {
  list.appendChild(createItemElement(item));
});

// ✅ 가상 스크롤 (보이는 것만 렌더링)
function renderVisibleItems() {
  const start = Math.floor(scrollTop / itemHeight);
  const end = start + visibleCount;
  const visibleItems = items.slice(start, end);

  list.innerHTML = '';
  visibleItems.forEach(item => {
    list.appendChild(createItemElement(item));
  });
}
```

---

### 예제 3: 테이블 렌더링

```javascript
// ❌ 한 행씩 추가
data.forEach(row => {
  const tr = document.createElement('tr');
  row.forEach(cell => {
    const td = document.createElement('td');
    td.textContent = cell;
    tr.appendChild(td);
  });
  table.appendChild(tr);  // Reflow 발생
});

// ✅ innerHTML 한 번에
const html = data.map(row =>
  `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
).join('');
table.innerHTML = html;  // Reflow 1번
```

---

## 요약

1. **렌더링 파이프라인**: DOM → CSSOM → Render Tree → Layout → Paint → Composite
2. **Reflow**: 위치/크기 변경 (비용 높음)
3. **Repaint**: 시각적 속성 변경 (비용 중간)
4. **Composite**: GPU 가속 (비용 낮음)
5. **최적화**: transform/opacity 사용, Reflow 최소화, DocumentFragment, requestAnimationFrame
6. **CRP 최적화**: CSS/JS 최소화, async/defer, Critical CSS 인라인
7. **측정 도구**: Chrome DevTools Performance, Lighthouse

성능 최적화의 핵심은 **Reflow를 줄이고 Composite를 활용**하는 것입니다.