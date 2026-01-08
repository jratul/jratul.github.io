---
title: "Reflow와 Repaint의 차이점"
date: "2026-01-08"
tags: ["browser", "performance", "frontend", "optimization"]
excerpt: "브라우저 렌더링 과정에서 발생하는 Reflow와 Repaint의 차이점과 성능 최적화 방법을 알아봅니다."
---

# Reflow와 Repaint의 차이점

웹 페이지의 성능을 최적화하려면 브라우저가 화면을 그리는 과정을 이해해야 합니다. 특히 Reflow와 Repaint는 성능에 큰 영향을 주는 작업입니다.

---

## 브라우저 렌더링 과정

브라우저가 화면을 그리는 기본 과정은 다음과 같습니다:

1. **DOM 트리 생성**: HTML을 파싱하여 DOM 트리 구성
2. **CSSOM 트리 생성**: CSS를 파싱하여 CSSOM 트리 구성
3. **렌더 트리 생성**: DOM과 CSSOM을 결합하여 화면에 표시할 요소만 포함
4. **레이아웃(Layout/Reflow)**: 각 요소의 크기와 위치 계산
5. **페인트(Paint)**: 실제 픽셀로 화면에 그리기
6. **합성(Composite)**: 레이어를 합쳐서 최종 화면 생성

---

## Reflow (Layout)

**Reflow**는 요소의 **크기나 위치가 변경**되어 레이아웃을 다시 계산하는 작업입니다.

### Reflow가 발생하는 경우

```javascript
// 1. 요소의 크기 변경
element.style.width = '200px';
element.style.height = '100px';

// 2. 요소의 위치 변경
element.style.position = 'absolute';
element.style.top = '50px';

// 3. 폰트 변경
element.style.fontSize = '20px';
element.style.fontFamily = 'Arial';

// 4. 내용 추가/삭제
element.textContent = 'New content';
parent.appendChild(newElement);
parent.removeChild(oldElement);

// 5. 클래스 변경 (레이아웃 관련 속성 포함)
element.classList.add('large');

// 6. window 리사이즈
window.addEventListener('resize', () => {
  // Reflow 발생
});
```

### Reflow를 유발하는 속성들

```javascript
// 크기 관련
width, height, padding, margin, border

// 위치 관련
position, top, left, right, bottom

// 레이아웃 관련
display, float, clear, overflow

// 폰트 관련
font-size, font-family, font-weight, line-height

// 기타
text-align, vertical-align, white-space
```

### Reflow를 유발하는 속성 읽기

레이아웃 정보를 **읽기만 해도** Reflow가 발생합니다:

```javascript
// 이런 속성들을 읽으면 강제로 Reflow 발생
const height = element.offsetHeight;
const width = element.offsetWidth;
const top = element.offsetTop;
const left = element.offsetLeft;

const clientHeight = element.clientHeight;
const clientWidth = element.clientWidth;

const scrollHeight = element.scrollHeight;
const scrollTop = element.scrollTop;

const computedStyle = window.getComputedStyle(element);
const bounds = element.getBoundingClientRect();
```

왜냐하면 브라우저는 최신 레이아웃 정보를 반환하기 위해 대기 중인 레이아웃 계산을 즉시 실행해야 하기 때문입니다.

---

## Repaint

**Repaint**는 레이아웃은 변경되지 않고 **시각적인 변화만** 발생하는 작업입니다.

### Repaint만 발생하는 경우

```javascript
// 1. 색상 변경
element.style.color = 'red';
element.style.backgroundColor = 'blue';

// 2. 투명도 변경
element.style.opacity = '0.5';

// 3. 가시성 변경 (공간은 유지)
element.style.visibility = 'hidden'; // Repaint만 발생
element.style.display = 'none';      // Reflow 발생 (공간 제거)

// 4. 아웃라인 변경
element.style.outline = '2px solid red';

// 5. 박스 그림자
element.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
```

### Repaint만 유발하는 속성들

```javascript
color
background-color
visibility
outline
box-shadow
text-decoration
border-radius (크기 변경 없이)
```

---

## Reflow vs Repaint 비교

| 구분 | Reflow | Repaint |
|------|--------|---------|
| **작업** | 레이아웃 재계산 | 픽셀 다시 그리기 |
| **발생 조건** | 크기/위치 변경 | 시각적 속성 변경 |
| **비용** | 높음 | 낮음 |
| **포함 관계** | Reflow → Repaint 발생 | Repaint만 발생 |
| **영향 범위** | 자식/부모/형제 요소 | 해당 요소만 |

```javascript
// Reflow 발생 (비용 높음)
element.style.width = '200px';  // 레이아웃 계산 + 다시 그리기

// Repaint만 발생 (비용 낮음)
element.style.color = 'red';    // 다시 그리기만
```

---

## 성능 문제 예제

### 나쁜 예: 반복적인 Reflow

```javascript
// 매번 Reflow 발생 (10번)
for (let i = 0; i < 10; i++) {
  const div = document.createElement('div');
  div.style.width = '100px';
  div.style.height = '100px';
  document.body.appendChild(div);  // Reflow!
}

// 매번 강제 Reflow 발생
for (let i = 0; i < elements.length; i++) {
  elements[i].style.width = elements[i].offsetWidth + 10 + 'px';
  // offsetWidth를 읽으면서 강제 Reflow → width 변경하면서 또 Reflow
}
```

### 좋은 예: Reflow 최소화

```javascript
// DocumentFragment 사용 (Reflow 1번)
const fragment = document.createDocumentFragment();
for (let i = 0; i < 10; i++) {
  const div = document.createElement('div');
  div.style.width = '100px';
  div.style.height = '100px';
  fragment.appendChild(div);
}
document.body.appendChild(fragment);  // Reflow 1번만!

// 읽기와 쓰기 분리
const widths = [];
// 1. 먼저 모든 값 읽기
for (let i = 0; i < elements.length; i++) {
  widths.push(elements[i].offsetWidth);
}
// 2. 그 다음 모든 값 쓰기
for (let i = 0; i < elements.length; i++) {
  elements[i].style.width = widths[i] + 10 + 'px';
}
```

---

## 최적화 기법

### 1. 클래스 사용

여러 스타일을 한 번에 변경할 때는 개별 속성보다 클래스를 사용합니다.

```javascript
// 나쁜 예: 여러 번 Reflow
element.style.width = '100px';
element.style.height = '100px';
element.style.border = '1px solid red';
element.style.padding = '10px';

// 좋은 예: 한 번만 Reflow
element.className = 'box-style';
```

```css
.box-style {
  width: 100px;
  height: 100px;
  border: 1px solid red;
  padding: 10px;
}
```

### 2. 오프라인에서 작업

DOM을 화면에서 분리한 후 작업하고 다시 추가합니다.

```javascript
// DocumentFragment 사용
const fragment = document.createDocumentFragment();
// fragment에 여러 작업 수행
document.body.appendChild(fragment);

// display: none 활용
element.style.display = 'none';  // Reflow 1회
// 여러 작업 수행
element.style.width = '200px';
element.style.height = '200px';
element.textContent = 'New content';
element.style.display = 'block';  // Reflow 1회

// 복제 후 교체
const clone = element.cloneNode(true);
// clone에 여러 작업 수행
element.parentNode.replaceChild(clone, element);
```

### 3. 복잡한 애니메이션은 position: fixed/absolute

`position: fixed`나 `absolute`를 사용하면 해당 요소가 문서 흐름에서 제외되어 다른 요소에 영향을 주지 않습니다.

```javascript
// 나쁜 예: 매 프레임마다 다른 요소들도 Reflow
element.style.marginLeft = x + 'px';  // 주변 요소 영향

// 좋은 예: 해당 요소만 Reflow
element.style.position = 'absolute';
element.style.left = x + 'px';  // 다른 요소 영향 없음
```

### 4. Transform과 Opacity 활용

`transform`과 `opacity`는 합성(Composite) 단계에서만 처리되어 Reflow와 Repaint를 피할 수 있습니다.

```javascript
// 나쁜 예: Reflow 발생
element.style.left = '100px';
element.style.top = '100px';

// 좋은 예: Composite만 발생 (GPU 가속)
element.style.transform = 'translate(100px, 100px)';

// 나쁜 예: Repaint 발생
element.style.visibility = 'hidden';

// 좋은 예: Composite만 발생
element.style.opacity = '0';
```

### 5. will-change 힌트

자주 변경될 속성을 미리 알려주면 브라우저가 최적화할 수 있습니다.

```javascript
// 애니메이션 시작 전
element.style.willChange = 'transform, opacity';

// 애니메이션
element.style.transform = 'translateX(100px)';

// 애니메이션 완료 후
element.style.willChange = 'auto';  // 메모리 해제
```

주의: `will-change`는 메모리를 사용하므로 필요할 때만 사용하고, 완료 후에는 제거해야 합니다.

### 6. requestAnimationFrame 사용

DOM 변경을 다음 프레임으로 지연시켜 브라우저가 최적화할 수 있게 합니다.

```javascript
// 나쁜 예: 즉시 실행
function animate() {
  element.style.left = x + 'px';
}
setInterval(animate, 16);  // 브라우저 렌더링 타이밍과 안 맞을 수 있음

// 좋은 예: 브라우저 렌더링 주기에 맞춤
function animate() {
  element.style.transform = `translateX(${x}px)`;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

---

## 실전 예제

### 예제 1: 테이블 정렬

```javascript
// 나쁜 예
function sortTable(rows) {
  rows.forEach(row => {
    table.appendChild(row);  // 매번 Reflow!
  });
}

// 좋은 예
function sortTable(rows) {
  const fragment = document.createDocumentFragment();
  rows.forEach(row => {
    fragment.appendChild(row);
  });
  table.appendChild(fragment);  // Reflow 1번만
}
```

### 예제 2: 스크롤 애니메이션

```javascript
// 나쁜 예: Reflow 발생
window.addEventListener('scroll', () => {
  element.style.top = window.scrollY + 'px';
});

// 좋은 예: Transform 사용
window.addEventListener('scroll', () => {
  element.style.transform = `translateY(${window.scrollY}px)`;
});

// 더 좋은 예: CSS로 처리
```

```css
.sticky-header {
  position: sticky;
  top: 0;
}
```

### 예제 3: 리스트 렌더링

```javascript
// 나쁜 예
function renderList(items) {
  items.forEach(item => {
    const div = document.createElement('div');
    div.textContent = item.name;
    div.style.width = item.width + 'px';
    container.appendChild(div);  // 매번 Reflow!
  });
}

// 좋은 예
function renderList(items) {
  const html = items.map(item =>
    `<div style="width: ${item.width}px">${item.name}</div>`
  ).join('');
  container.innerHTML = html;  // Reflow 1번만
}

// 더 좋은 예: CSS 클래스 사용
function renderList(items) {
  const fragment = document.createDocumentFragment();
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.textContent = item.name;
    div.dataset.width = item.width;
    fragment.appendChild(div);
  });
  container.appendChild(fragment);
}
```

---

## 디버깅 도구

### Chrome DevTools Performance

1. **Performance 탭** 열기
2. **Record** 버튼 클릭
3. 작업 수행
4. **Stop** 버튼 클릭
5. **Layout**(Reflow)과 **Paint** 이벤트 확인

```javascript
// 성능 측정
performance.mark('start');

// 작업 수행
element.style.width = '200px';

performance.mark('end');
performance.measure('reflow', 'start', 'end');

console.table(performance.getEntriesByType('measure'));
```

### Rendering 옵션

Chrome DevTools → More tools → Rendering:
- **Paint flashing**: Repaint 영역을 초록색으로 표시
- **Layout Shift Regions**: Layout 변경 영역 표시
- **Frame Rendering Stats**: FPS와 렌더링 통계

---

## 정리

- **Reflow**: 레이아웃(크기/위치) 재계산 - 비용이 높음
- **Repaint**: 시각적 변화만 - 비용이 낮음
- Reflow가 발생하면 항상 Repaint도 발생
- 읽기와 쓰기를 분리하여 강제 Reflow 방지
- 클래스와 DocumentFragment 활용
- `transform`, `opacity`로 Composite 단계만 사용
- `will-change`와 `requestAnimationFrame` 활용
- Chrome DevTools로 성능 측정 및 최적화

성능 최적화의 핵심은 **불필요한 Reflow를 최소화**하고, 가능하면 **Composite 단계만 사용**하는 것입니다.