---
title: "웹 성능 최적화"
order: 8
---

# 웹 성능 최적화

"내 사이트가 느린 것 같아요"라는 말을 들었을 때,
어디서부터 시작해야 할지 막막할 수 있습니다.
웹 성능은 측정 → 분석 → 개선의 사이클로 접근합니다.

---

## Core Web Vitals: 구글이 정한 성능 지표

구글은 사용자 경험을 측정하는 세 가지 핵심 지표를 정의했습니다.
이 지표는 **SEO(검색 순위)에도 직접적인 영향**을 미칩니다.

### LCP (Largest Contentful Paint) — 주요 콘텐츠 로딩 시간

페이지에서 **가장 큰 콘텐츠**(대형 이미지, 비디오 썸네일, 큰 텍스트 블록)가
표시되는 데 걸리는 시간입니다.

```
목표값: 2.5초 이하 ✅
경고:   2.5 ~ 4.0초 ⚠️
나쁨:   4.0초 이상  ❌
```

LCP에 영향을 주는 요소:
- 서버 응답 속도
- 렌더링 차단 리소스 (큰 CSS, JS)
- 리소스 로딩 시간 (이미지, 폰트)

### FID/INP (Interaction to Next Paint) — 상호작용 응답성

사용자가 클릭, 탭, 키 입력을 했을 때 브라우저가 반응하는 데 걸리는 시간입니다.
(FID는 2024년부터 INP로 대체됨)

```
목표값: 200ms 이하 ✅
경고:   200 ~ 500ms ⚠️
나쁨:   500ms 이상  ❌
```

### CLS (Cumulative Layout Shift) — 레이아웃 안정성

페이지 로딩 중 요소들이 **얼마나 많이 이동하는지** 측정합니다.
이미지가 로드되면서 텍스트가 밀려나는 현상이 대표적입니다.

```
목표값: 0.1 이하  ✅
경고:   0.1 ~ 0.25 ⚠️
나쁨:   0.25 이상 ❌
```

```javascript
// CLS를 유발하는 예시
// ❌ 이미지 크기를 지정하지 않으면 로드 후 레이아웃이 밀림
<img src="hero.jpg" />

// ✅ width, height 또는 aspect-ratio 지정
<img src="hero.jpg" width="800" height="400" />
// 또는 CSS
.hero-img {
  aspect-ratio: 2 / 1;  /* 비율 유지 */
  width: 100%;
}
```

---

## Lighthouse로 성능 측정

Chrome DevTools에 내장된 **Lighthouse**는 성능, 접근성, SEO를 종합적으로 측정합니다.

### 사용 방법

1. Chrome 개발자 도구 열기 (F12)
2. "Lighthouse" 탭 선택
3. "Analyze page load" 클릭
4. 100점 만점 점수와 상세 개선 방안 확인

### CLI로 측정

```bash
# Lighthouse CLI 설치
npm install -g lighthouse

# 측정 실행
lighthouse https://mysite.com --output html --output-path ./report.html

# 특정 카테고리만 측정
lighthouse https://mysite.com --only-categories performance,accessibility
```

### Lighthouse 점수 해석

```
90 ~ 100: 녹색 ✅ 좋음
50 ~ 89:  주황색 ⚠️ 개선 필요
0 ~ 49:   빨간색 ❌ 나쁨

주요 진단 항목:
- Eliminate render-blocking resources  (렌더링 차단 리소스 제거)
- Properly size images                  (이미지 크기 적절히)
- Defer unused CSS/JS                   (미사용 CSS/JS 지연)
- Serve images in next-gen formats      (WebP 등 최신 포맷 사용)
- Reduce JavaScript execution time      (JS 실행 시간 단축)
```

---

## 이미지 최적화

이미지는 웹페이지 데이터의 **60~80%**를 차지합니다.
이미지를 최적화하면 LCP가 극적으로 개선됩니다.

### 1. 최신 포맷 사용 (WebP, AVIF)

```html
<!-- ❌ 구형 포맷만 사용 -->
<img src="hero.jpg" />

<!-- ✅ 최신 포맷 우선, 구형 브라우저 폴백 -->
<picture>
  <source srcset="hero.avif" type="image/avif" />  <!-- AVIF: 가장 압축률 높음 -->
  <source srcset="hero.webp" type="image/webp" />  <!-- WebP: 광범위 지원 -->
  <img src="hero.jpg" alt="히어로 이미지" />        <!-- 폴백 -->
</picture>

<!-- 파일 크기 비교 (같은 품질):
  JPEG: 100KB
  WebP: 30~50KB (25~35% 절감)
  AVIF: 20~35KB (50~65% 절감)
-->
```

### 2. Lazy Loading (지연 로딩)

화면에 보이지 않는 이미지는 나중에 로드합니다.

```html
<!-- 기본 HTML lazy loading -->
<img
  src="below-fold-image.jpg"
  alt="스크롤 후 보이는 이미지"
  loading="lazy"    <!-- 뷰포트에 들어올 때 로드 -->
/>

<!-- loading="eager": 즉시 로드 (기본값, 첫 화면 이미지에 사용) -->
<img src="hero.jpg" alt="히어로" loading="eager" />
```

```typescript
// React에서 lazy loading
function ImageList() {
  return (
    <div>
      {/* 첫 화면 이미지: eager (미리 로드) */}
      <img src="hero.jpg" alt="메인" loading="eager" />

      {/* 스크롤해야 보이는 이미지: lazy */}
      {items.map(item => (
        <img
          key={item.id}
          src={item.image}
          alt={item.title}
          loading="lazy"
        />
      ))}
    </div>
  )
}
```

### 3. srcset으로 반응형 이미지

디바이스 해상도에 맞는 이미지를 제공합니다.

```html
<img
  src="image-800w.jpg"          <!-- 기본 이미지 -->
  srcset="
    image-400w.jpg  400w,       <!-- 400px 이하 화면용 -->
    image-800w.jpg  800w,       <!-- 800px 이하 화면용 -->
    image-1600w.jpg 1600w       <!-- 1600px 이하 화면용 -->
  "
  sizes="
    (max-width: 600px) 100vw,  <!-- 600px 이하: 전체 너비 -->
    (max-width: 1200px) 50vw,  <!-- 1200px 이하: 절반 너비 -->
    800px                       <!-- 그 외: 800px 고정 -->
  "
  alt="반응형 이미지"
/>
```

### 4. Next.js / Vite 이미지 최적화

```typescript
// Next.js: next/image 컴포넌트 사용
import Image from 'next/image'

function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="히어로 이미지"
      width={800}           // 필수: 크기 지정 (CLS 방지)
      height={400}
      priority              // LCP 이미지: 우선 로드
      quality={80}          // 이미지 품질 (기본값: 75)
    />
    // 자동으로: WebP/AVIF 변환, lazy loading, srcset 생성, CLS 방지
  )
}
```

---

## 폰트 최적화

폰트는 텍스트 렌더링을 차단하여 LCP에 영향을 줍니다.

### font-display: swap

```css
/* 폰트가 로드되기 전에 시스템 폰트를 먼저 보여줌 */
@font-face {
  font-family: 'Pretendard';
  font-weight: 400;
  src: url('/fonts/Pretendard-Regular.woff2') format('woff2');
  font-display: swap;
  /* swap: 폰트 로드 전까지 폴백 폰트 표시 → 텍스트가 즉시 보임
     block: 폰트 로드될 때까지 텍스트 숨김 (FOIT, Flash of Invisible Text)
     optional: 네트워크 상태에 따라 폰트 사용 여부 결정 */
}
```

### 폰트 Preload

```html
<!-- index.html: 중요 폰트를 미리 로드 -->
<head>
  <!-- rel="preload": 가장 높은 우선순위로 미리 다운로드 -->
  <link
    rel="preload"
    href="/fonts/Pretendard-Regular.woff2"
    as="font"
    type="font/woff2"
    crossorigin    <!-- CORS 필요 -->
  />
  <!-- 주의: 실제로 사용하는 폰트만 preload (사용 안 하면 낭비) -->
</head>
```

### 서브셋 폰트

한글 폰트는 영문 폰트보다 훨씬 큽니다.
실제로 사용하는 문자만 포함한 서브셋 폰트를 사용합니다.

```
원본 Pretendard: ~2MB
서브셋 Pretendard (한글 2350자): ~200KB
동적 서브셋 (사용된 글자만): ~30KB
```

---

## 번들 최적화

### Code Splitting

```typescript
// ❌ 모든 페이지를 하나의 번들로 (초기 로딩 느림)
import Home from './pages/Home'
import About from './pages/About'
import AdminDashboard from './pages/AdminDashboard' // 관리자만 사용

// ✅ 페이지 단위로 분할 (필요할 때만 로드)
import { lazy, Suspense } from 'react'
const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Suspense>
  )
}
```

### Tree Shaking

```typescript
// ❌ 라이브러리 전체를 가져옴
import _ from 'lodash'  // lodash 전체: ~70KB
const result = _.sortBy(data, 'name')

// ✅ 필요한 함수만 가져옴
import sortBy from 'lodash/sortBy'  // sortBy만: ~5KB

// 또는 tree shaking이 지원되는 es-lodash 사용
import { sortBy } from 'lodash-es'  // Vite/Webpack이 자동으로 불필요 코드 제거
```

```typescript
// ❌ 아이콘 라이브러리 전체 임포트
import { FaHome, FaUser, FaSettings } from '@fortawesome/react-fontawesome'
// → 수천 개 아이콘이 모두 번들에 포함

// ✅ 필요한 것만 임포트
import { library } from '@fortawesome/fontawesome-svg-core'
import { faHome } from '@fortawesome/free-solid-svg-icons'
library.add(faHome)
```

### Dynamic Import (조건부 로딩)

```typescript
// 무거운 라이브러리를 필요할 때만 로드
async function handleExport() {
  // 버튼 클릭 시에만 차트 라이브러리 로드
  const { Chart } = await import('chart.js')
  const { jsPDF } = await import('jspdf')

  // 이제 사용
  const chart = new Chart(...)
}

// React에서 조건부 로딩
function App() {
  const [showMap, setShowMap] = useState(false)

  // 지도 라이브러리는 무거우므로 필요할 때만 로드
  const MapComponent = showMap
    ? lazy(() => import('./components/HeavyMap'))
    : null

  return (
    <div>
      <button onClick={() => setShowMap(true)}>지도 보기</button>
      {MapComponent && (
        <Suspense fallback={<p>지도 로딩 중...</p>}>
          <MapComponent />
        </Suspense>
      )}
    </div>
  )
}
```

---

## 캐싱 전략

### Cache-Control 헤더

브라우저가 파일을 얼마나 오래 캐싱할지 설정합니다.

```nginx
# Nginx 설정 예시

# 콘텐츠 해시가 있는 파일 (JS, CSS): 1년 캐싱
# 파일 내용이 바뀌면 파일명(해시)이 바뀌므로 안전
location /assets/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
  # max-age=31536000: 1년 (초 단위)
  # immutable: 파일이 절대 변하지 않음 → 재검증 요청 없음
}

# index.html: 캐싱하지 않음 (매번 최신 버전 확인)
location = /index.html {
  add_header Cache-Control "no-cache";
  # no-cache: 매번 서버에 변경 여부 확인
}

# 이미지, 폰트: 1주일 캐싱
location ~* \.(png|jpg|gif|webp|woff2)$ {
  add_header Cache-Control "public, max-age=604800";
}
```

### Service Worker 캐싱

Service Worker를 사용하면 더 세밀한 캐싱 전략을 구현할 수 있습니다.
(다음 챕터 PWA에서 자세히 다룸)

```typescript
// 간단한 캐싱 전략 예시
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 캐시에 있으면 캐시 반환 (오프라인도 동작)
      if (cachedResponse) return cachedResponse
      // 없으면 네트워크 요청
      return fetch(event.request)
    })
  )
})
```

---

## React 성능 최적화

### React.memo — 불필요한 리렌더링 방지

```typescript
// ❌ 부모가 리렌더링될 때마다 자식도 리렌더링
function ParentComponent() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <ExpensiveChild />  {/* count가 바뀔 때마다 리렌더링 → 낭비 */}
    </div>
  )
}

function ExpensiveChild() {
  // 무거운 계산...
  return <div>비용이 큰 컴포넌트</div>
}

// ✅ React.memo: props가 바뀔 때만 리렌더링
const ExpensiveChild = React.memo(function ExpensiveChild() {
  return <div>비용이 큰 컴포넌트</div>
})
```

### useMemo — 무거운 계산 결과 캐싱

```typescript
function ProductList({ products, filter }) {
  // ❌ filter가 바뀌지 않아도 매번 필터링 실행
  const filteredProducts = products.filter(p => p.category === filter)

  // ✅ filter나 products가 바뀔 때만 재계산
  const filteredProducts = useMemo(
    () => products.filter(p => p.category === filter),
    [products, filter]  // 의존성 배열
  )

  return <ul>{filteredProducts.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}
```

### useCallback — 함수 참조 안정화

```typescript
function SearchBox({ onSearch }) {
  const [query, setQuery] = useState('')

  // ❌ 매 렌더링마다 새로운 함수 객체 생성
  const handleSubmit = () => {
    onSearch(query)
  }

  // ✅ query가 바뀔 때만 새 함수 생성
  const handleSubmit = useCallback(() => {
    onSearch(query)
  }, [query, onSearch])

  return (
    <form onSubmit={handleSubmit}>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <button type="submit">검색</button>
    </form>
  )
}
```

### 가상화 (Virtualization) — 긴 목록 최적화

10,000개 항목을 DOM에 모두 렌더링하면 브라우저가 느려집니다.
**가상화**는 화면에 보이는 항목만 렌더링합니다.

```bash
npm install @tanstack/react-virtual
```

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualList({ items }: { items: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,      // 전체 항목 수
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,  // 각 항목 예상 높이 (px)
    overscan: 5,             // 화면 밖 미리 렌더링할 항목 수
  })

  return (
    <div
      ref={parentRef}
      style={{ height: '400px', overflow: 'auto' }} // 스크롤 컨테이너
    >
      {/* 전체 스크롤 높이를 위한 빈 공간 */}
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {/* 실제로 DOM에 있는 항목만 렌더링 */}
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index]} {/* 실제 콘텐츠 */}
          </div>
        ))}
      </div>
    </div>
  )
}
// 10,000개 항목이 있어도 화면에 ~10개만 DOM에 존재!
```

---

## 성능 측정 도구 모음

```bash
# Lighthouse CLI
npm install -g lighthouse
lighthouse https://mysite.com

# WebPageTest (온라인, 더 상세한 분석)
# https://www.webpagetest.org

# Bundle 크기 분석
# Vite
npx vite-bundle-visualizer

# Webpack
npm install -D webpack-bundle-analyzer

# 브라우저 Performance 패널
# Chrome DevTools > Performance 탭
# - 녹화 후 Long Task(50ms 이상) 확인
# - Flame chart로 병목 확인
```

---

## 흔한 실수들

### 실수 1: 첫 화면 이미지에 lazy loading

```html
<!-- ❌ 첫 화면(above the fold) 이미지에 lazy loading → LCP 악화! -->
<img src="hero.jpg" loading="lazy" />

<!-- ✅ 첫 화면 이미지는 eager (또는 생략, 기본값이 eager) -->
<img src="hero.jpg" loading="eager" />
<!-- Next.js에서는 priority 속성 사용 -->
<Image src="/hero.jpg" priority />
```

### 실수 2: 모든 것에 useMemo/useCallback 남발

```typescript
// ❌ 간단한 연산에 useMemo → 오히려 오버헤드
const doubled = useMemo(() => count * 2, [count])  // 단순 연산에 useMemo 불필요

// ✅ 실제로 비용이 큰 경우에만
const sortedData = useMemo(
  () => data.sort((a, b) => ...).filter(...).map(...), // 복잡한 연산
  [data]
)
```

### 실수 3: 번들 크기 확인 없이 라이브러리 추가

```bash
# 라이브러리 추가 전 크기 확인
npx bundlephobia moment        # moment.js: 72KB (너무 큼!)
npx bundlephobia date-fns      # date-fns: 필요한 것만 로드 (tree-shakable)

# 라이브러리 선택 기준:
# - bundle size
# - tree-shakable 여부
# - gzip 압축 후 크기
```

---

## 성능 최적화 우선순위

처음부터 모든 것을 최적화하려 하지 마세요.
**측정하고, 가장 큰 문제부터** 해결합니다.

```
1순위: 이미지 최적화 (WebP, lazy loading, 크기 지정)
       → 효과가 가장 크고 쉬움

2순위: 번들 최적화 (code splitting, tree shaking)
       → 초기 로딩 속도 개선

3순위: 폰트 최적화 (font-display: swap, preload)
       → LCP 개선

4순위: 캐싱 전략
       → 재방문 시 속도 개선

5순위: React 최적화 (memo, useMemo, 가상화)
       → 상호작용 응답성 개선
```

성능은 한 번에 완벽하게 만들 필요 없습니다.
측정 → 개선 → 재측정의 사이클을 반복하세요.
