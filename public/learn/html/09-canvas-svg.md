---
title: "Canvas & SVG"
order: 9
---

## Canvas와 SVG — 웹의 그림 도구

HTML에서 그림을 그리는 방법은 두 가지입니다.

| | Canvas | SVG |
|--|--------|-----|
| 방식 | 픽셀 기반 (비트맵) | 벡터 기반 |
| 확대 시 | 픽셀이 뭉개짐 | 선명함 유지 |
| DOM | 없음 (픽셀 덩어리) | 각 요소가 DOM |
| 적합한 용도 | 게임, 실시간 그래픽, 이미지 편집 | 아이콘, 차트, 로고 |
| 이벤트 처리 | 좌표 계산 필요 | 요소에 직접 이벤트 |

---

## SVG (Scalable Vector Graphics)

SVG는 XML 기반의 벡터 그래픽 형식입니다.
수학적 공식으로 그림을 표현하므로 어떤 크기로 확대해도 선명합니다.

### SVG를 HTML에 삽입하는 방법

```html
<!-- 방법 1: img 태그 (CSS로 내부 스타일 변경 불가) -->
<img src="logo.svg" alt="로고" width="100" height="100" />

<!-- 방법 2: CSS background-image (내부 스타일 변경 불가) -->
<div style="background-image: url('icon.svg');"></div>

<!-- 방법 3: 인라인 SVG (내부 요소를 CSS/JS로 조작 가능) -->
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="blue" />
</svg>

<!-- 방법 4: iframe (보안 격리) -->
<iframe src="chart.svg" title="차트" width="600" height="400"></iframe>
```

---

## SVG 기본 도형

```html
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">

  <!-- 직사각형 -->
  <rect
    x="10"          <!-- 좌측 상단 x 좌표 -->
    y="10"          <!-- 좌측 상단 y 좌표 -->
    width="100"
    height="60"
    fill="#6366f1"  <!-- 채우기 색상 -->
    stroke="#333"   <!-- 테두리 색상 -->
    stroke-width="2"
    rx="8"          <!-- 모서리 둥글기 (border-radius처럼) -->
  />

  <!-- 원 -->
  <circle
    cx="200"        <!-- 중심 x 좌표 -->
    cy="50"         <!-- 중심 y 좌표 -->
    r="40"          <!-- 반지름 -->
    fill="#ec4899"
  />

  <!-- 타원 -->
  <ellipse
    cx="350" cy="50"
    rx="50"         <!-- 가로 반지름 -->
    ry="30"         <!-- 세로 반지름 -->
    fill="#06b6d4"
  />

  <!-- 직선 -->
  <line
    x1="10" y1="150"   <!-- 시작점 -->
    x2="390" y2="150"  <!-- 끝점 -->
    stroke="#333"
    stroke-width="2"
    stroke-dasharray="10 5"  <!-- 점선: 10px 실선, 5px 공백 -->
  />

  <!-- 꺾인 선 (폴리라인) -->
  <polyline
    points="10,200 80,160 150,220 220,170 290,230 360,180"
    fill="none"
    stroke="#6366f1"
    stroke-width="2"
  />

  <!-- 다각형 -->
  <polygon
    points="200,240 230,280 170,280"  <!-- 삼각형 -->
    fill="#f59e0b"
  />

</svg>
```

---

## SVG 텍스트

```html
<svg width="400" height="100" xmlns="http://www.w3.org/2000/svg">

  <!-- 기본 텍스트 -->
  <text x="20" y="40" font-size="24" fill="#333">안녕하세요!</text>

  <!-- 스타일 적용 -->
  <text
    x="20" y="80"
    font-family="Pretendard, sans-serif"
    font-size="18"
    font-weight="bold"
    fill="#6366f1"
    letter-spacing="2"
  >
    SVG 텍스트
  </text>

  <!-- 텍스트 중앙 정렬 -->
  <text
    x="200" y="50"
    text-anchor="middle"  <!-- start / middle / end -->
    dominant-baseline="middle"
    font-size="20"
    fill="#333"
  >
    가운데 정렬
  </text>

</svg>
```

---

## SVG 그라데이션과 효과

```html
<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">

  <!-- 그라데이션 정의 -->
  <defs>
    <!-- 선형 그라데이션 -->
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6366f1" />
      <stop offset="100%" style="stop-color:#06b6d4" />
    </linearGradient>

    <!-- 원형 그라데이션 -->
    <radialGradient id="grad2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#ec4899" />
      <stop offset="100%" style="stop-color:#6366f1" />
    </radialGradient>

    <!-- 그림자 효과 -->
    <filter id="shadow">
      <feDropShadow dx="4" dy="4" stdDeviation="4" flood-color="#00000033" />
    </filter>
  </defs>

  <!-- 그라데이션 적용 -->
  <rect x="20" y="20" width="160" height="80" rx="8" fill="url(#grad1)" />

  <!-- 원형 그라데이션 적용 -->
  <circle cx="280" cy="60" r="60" fill="url(#grad2)" />

  <!-- 그림자 효과 적용 -->
  <rect x="20" y="120" width="160" height="60" rx="8" fill="#6366f1" filter="url(#shadow)" />

</svg>
```

---

## SVG 애니메이션

```html
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">

  <!-- SMIL 애니메이션 (SVG 자체 애니메이션) -->
  <circle cx="100" cy="100" r="40" fill="#6366f1">
    <!-- 크기 변화 -->
    <animate
      attributeName="r"   <!-- 변화시킬 속성 -->
      from="40"           <!-- 시작값 -->
      to="60"             <!-- 끝값 -->
      dur="1s"            <!-- 지속시간 -->
      repeatCount="indefinite"  <!-- 무한 반복 -->
    />
    <!-- 색상 변화 -->
    <animate
      attributeName="fill"
      values="#6366f1; #ec4899; #06b6d4; #6366f1"
      dur="3s"
      repeatCount="indefinite"
    />
  </circle>

</svg>
```

```css
/* CSS로 SVG 애니메이션 (더 선호됨) */
.spinning-icon {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* SVG 경로 그리기 애니메이션 */
.draw-path {
  stroke-dasharray: 1000;     /* 전체 경로 길이 */
  stroke-dashoffset: 1000;    /* 시작 시 숨김 */
  animation: draw 3s ease forwards;
}

@keyframes draw {
  to { stroke-dashoffset: 0; }  /* 경로가 그려지는 효과 */
}
```

---

## Canvas API

Canvas는 JavaScript로 픽셀을 직접 그립니다.
게임, 실시간 데이터 시각화, 이미지 편집에 적합합니다.

```html
<canvas id="myCanvas" width="400" height="300"></canvas>
```

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');  // 2D 렌더링 컨텍스트 획득

// --- 기본 도형 ---

// 사각형 채우기
ctx.fillStyle = '#6366f1';       // 채우기 색상
ctx.fillRect(10, 10, 100, 60);   // x, y, 너비, 높이

// 사각형 테두리
ctx.strokeStyle = '#333';        // 테두리 색상
ctx.lineWidth = 2;
ctx.strokeRect(130, 10, 100, 60);

// 원
ctx.beginPath();                 // 새 경로 시작
ctx.arc(300, 40, 30, 0, Math.PI * 2);  // x, y, 반지름, 시작각, 끝각
ctx.fillStyle = '#ec4899';
ctx.fill();                      // 채우기

// --- 경로(Path) ---

ctx.beginPath();
ctx.moveTo(10, 150);             // 시작점으로 이동
ctx.lineTo(100, 100);            // 선 그리기
ctx.lineTo(190, 150);
ctx.lineTo(100, 200);
ctx.closePath();                 // 경로 닫기 (시작점으로 돌아옴)
ctx.fillStyle = '#f59e0b';
ctx.fill();
ctx.strokeStyle = '#333';
ctx.stroke();

// --- 텍스트 ---

ctx.font = 'bold 24px Pretendard, sans-serif';
ctx.fillStyle = '#333';
ctx.textAlign = 'center';        // left / center / right
ctx.fillText('Canvas!', 300, 200);

// --- 이미지 ---

const img = new Image();
img.src = 'photo.jpg';
img.onload = () => {
  ctx.drawImage(img, 220, 100, 160, 100);  // 이미지, x, y, 너비, 높이
};
```

---

## Canvas 애니메이션 — requestAnimationFrame

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

let x = 0;  // 공의 x 위치
let speed = 3;  // 이동 속도

function animate() {
  // 이전 프레임 지우기
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 공 그리기
  ctx.beginPath();
  ctx.arc(x, 150, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#6366f1';
  ctx.fill();

  // 위치 업데이트
  x += speed;

  // 벽에 닿으면 방향 전환
  if (x > canvas.width - 20 || x < 20) {
    speed *= -1;
  }

  // 다음 프레임 요청 (초당 60회)
  requestAnimationFrame(animate);
}

animate();  // 애니메이션 시작
```

---

## Canvas vs SVG 선택 기준

```
Canvas를 선택하세요:
- 게임 (캐릭터, 배경이 매 프레임 변함)
- 실시간 데이터 시각화 (초당 수백 개 데이터 포인트)
- 이미지 필터/편집 기능
- WebGL (3D 그래픽)

SVG를 선택하세요:
- 아이콘, 로고 (확대해도 선명해야 함)
- 차트, 그래프 (각 막대/점에 클릭 이벤트 필요)
- 인터랙티브 다이어그램
- 인쇄용 그래픽
- 검색엔진 인덱싱이 필요한 그래픽
```

---

## 자주 하는 실수

**실수 1: Canvas에서 beginPath() 빠뜨리기**
```javascript
// 잘못된 예: 이전 경로가 합쳐져서 예상치 못한 결과
ctx.arc(100, 100, 30, 0, Math.PI * 2);
ctx.fillStyle = 'red';
ctx.fill();

ctx.arc(200, 100, 30, 0, Math.PI * 2);  // 이전 원과 합쳐짐!
ctx.fillStyle = 'blue';
ctx.fill();

// 올바른 예: 각 도형마다 beginPath()
ctx.beginPath();
ctx.arc(100, 100, 30, 0, Math.PI * 2);
ctx.fillStyle = 'red';
ctx.fill();

ctx.beginPath();  // 새 경로 시작
ctx.arc(200, 100, 30, 0, Math.PI * 2);
ctx.fillStyle = 'blue';
ctx.fill();
```

**실수 2: Canvas 크기를 CSS로만 설정**
```html
<!-- 잘못된 예: CSS로만 크기 지정하면 내부 해상도가 달라져 흐릿함 -->
<canvas id="c" style="width: 400px; height: 300px;"></canvas>

<!-- 올바른 예: HTML 속성으로 내부 해상도 지정 -->
<canvas id="c" width="400" height="300"></canvas>
```

---

## 정리

**SVG:**
- 벡터 그래픽, 확대해도 선명
- XML 태그로 작성, CSS/JS로 조작 가능
- 아이콘, 로고, 차트에 적합
- `<rect>`, `<circle>`, `<path>`, `<text>` 등 기본 도형 제공

**Canvas:**
- 픽셀 기반, JavaScript로 그리기
- `getContext('2d')`로 렌더링 컨텍스트 획득
- `requestAnimationFrame`으로 애니메이션
- 게임, 실시간 그래픽에 적합
