---
title: "React 성능 최적화 방법"
date: "2026-01-13"
tags: ["react", "performance", "optimization", "frontend", "memo"]
excerpt: "React 애플리케이션의 성능을 향상시키기 위한 다양한 최적화 기법을 알아봅니다."
---

# React 성능 최적화 방법

React 애플리케이션의 성능을 향상시키기 위한 다양한 최적화 기법을 알아봅니다.

## 성능 문제 진단

### React DevTools Profiler

```tsx
// 프로파일링 시작
// React DevTools → Profiler 탭 → Record 클릭
```

**확인 사항:**
- 렌더링 시간
- 렌더링 횟수
- 불필요한 재렌더링

---

## 1. React.memo

**Props가 변경되지 않으면 재렌더링을 건너뜁니다.**

### 기본 사용

```tsx
// ❌ 부모가 재렌더링되면 항상 재렌더링
function UserCard({ name, email }: { name: string; email: string }) {
  console.log('UserCard 렌더링');
  return (
    <div>
      <h3>{name}</h3>
      <p>{email}</p>
    </div>
  );
}

// ✅ Props가 같으면 재렌더링 건너뜀
const UserCard = React.memo(({ name, email }: { name: string; email: string }) => {
  console.log('UserCard 렌더링');
  return (
    <div>
      <h3>{name}</h3>
      <p>{email}</p>
    </div>
  );
});
```

---

### 비교 함수 커스터마이징

```tsx
interface Props {
  user: User;
  onClick: () => void;
}

const UserCard = React.memo(
  ({ user, onClick }: Props) => {
    return (
      <div onClick={onClick}>
        <h3>{user.name}</h3>
        <p>{user.email}</p>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // true 반환 → 재렌더링 건너뜀
    return prevProps.user.id === nextProps.user.id;
  }
);
```

---

### 주의사항

```tsx
// ❌ 객체/배열 Props는 항상 재렌더링
function Parent() {
  return <Child user={{ name: 'Alice' }} />;  // 매번 새 객체
}

// ✅ useMemo로 메모이제이션
function Parent() {
  const user = useMemo(() => ({ name: 'Alice' }), []);
  return <Child user={user} />;
}
```

---

## 2. useMemo

**값 계산 결과를 메모이제이션**합니다.

### 기본 사용

```tsx
function TodoList({ todos }: { todos: Todo[] }) {
  // ❌ 매번 계산
  const completedCount = todos.filter(todo => todo.completed).length;

  // ✅ todos가 변경될 때만 계산
  const completedCount = useMemo(
    () => todos.filter(todo => todo.completed).length,
    [todos]
  );

  return <div>완료: {completedCount}</div>;
}
```

---

### 무거운 계산 메모이제이션

```tsx
function DataTable({ data }: { data: number[] }) {
  const sortedData = useMemo(() => {
    console.log('정렬 실행');
    return [...data].sort((a, b) => a - b);
  }, [data]);

  return (
    <ul>
      {sortedData.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
```

---

### 언제 사용할까?

```tsx
// ✅ 사용해야 할 때
// 1. 무거운 계산
const result = useMemo(() => expensiveCalculation(data), [data]);

// 2. 객체/배열을 자식 Props로 전달
const config = useMemo(() => ({ option: 'value' }), []);
<Child config={config} />

// 3. 의존성 배열에 사용
useEffect(() => {
  // ...
}, [memoizedValue]);

// ❌ 사용하지 말아야 할 때
// 1. 단순 계산
const sum = useMemo(() => a + b, [a, b]);  // 오버헤드만 증가

// 2. 자주 변경되는 값
const value = useMemo(() => Math.random(), []);  // 의미 없음
```

---

## 3. useCallback

**함수를 메모이제이션**합니다.

### 기본 사용

```tsx
function Parent() {
  const [count, setCount] = useState(0);

  // ❌ 매번 새 함수 생성
  const handleClick = () => {
    console.log('클릭');
  };

  // ✅ 함수 재사용
  const handleClick = useCallback(() => {
    console.log('클릭');
  }, []);

  return <Child onClick={handleClick} />;
}

const Child = React.memo(({ onClick }: { onClick: () => void }) => {
  console.log('Child 렌더링');
  return <button onClick={onClick}>클릭</button>;
});
```

---

### 의존성 배열 사용

```tsx
function SearchBar() {
  const [query, setQuery] = useState('');

  // query가 변경될 때만 새 함수 생성
  const handleSearch = useCallback(() => {
    console.log('검색:', query);
    api.search(query);
  }, [query]);

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <SearchButton onSearch={handleSearch} />
    </div>
  );
}
```

---

### useMemo vs useCallback

```tsx
// useMemo: 값 메모이제이션
const value = useMemo(() => computeValue(a, b), [a, b]);

// useCallback: 함수 메모이제이션
const callback = useCallback(() => doSomething(a, b), [a, b]);

// 사실 useCallback은 useMemo의 syntactic sugar
const callback = useMemo(() => () => doSomething(a, b), [a, b]);
```

---

## 4. 리스트 최적화

### key 제대로 사용하기

```tsx
// ❌ 인덱스를 key로 사용
{items.map((item, index) => (
  <Item key={index} {...item} />
))}

// ✅ 고유한 ID를 key로 사용
{items.map(item => (
  <Item key={item.id} {...item} />
))}
```

**이유:** 인덱스는 순서 변경 시 모든 항목이 재렌더링됩니다.

---

### 가상 스크롤 (Virtualization)

```tsx
import { FixedSizeList } from 'react-window';

// ❌ 10,000개 항목 모두 렌더링
function LargeList({ items }: { items: Item[] }) {
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}

// ✅ 화면에 보이는 항목만 렌더링
function VirtualizedList({ items }: { items: Item[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>{items[index].name}</div>
      )}
    </FixedSizeList>
  );
}
```

**라이브러리:**
- `react-window` (가벼움)
- `react-virtualized` (기능 많음)

---

## 5. Code Splitting

### 동적 import

```tsx
// ❌ 초기 번들에 모두 포함
import HeavyComponent from './HeavyComponent';

function App() {
  return <HeavyComponent />;
}

// ✅ 필요할 때만 로드
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>로딩...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

---

### 라우트 기반 분할

```tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>로딩...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

---

### 조건부 로딩

```tsx
function App() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>차트 보기</button>
      {showChart && (
        <Suspense fallback={<div>차트 로딩...</div>}>
          <LazyChart />
        </Suspense>
      )}
    </div>
  );
}

const LazyChart = lazy(() => import('./Chart'));
```

---

## 6. 이미지 최적화

### Lazy Loading

```tsx
// ❌ 모든 이미지 즉시 로드
<img src="/large-image.jpg" alt="이미지" />

// ✅ 뷰포트에 들어올 때 로드
<img src="/large-image.jpg" alt="이미지" loading="lazy" />
```

---

### 반응형 이미지

```tsx
<picture>
  <source
    media="(max-width: 640px)"
    srcSet="/image-small.jpg"
  />
  <source
    media="(max-width: 1024px)"
    srcSet="/image-medium.jpg"
  />
  <img src="/image-large.jpg" alt="이미지" />
</picture>
```

---

### WebP 포맷 사용

```tsx
<picture>
  <source type="image/webp" srcSet="/image.webp" />
  <source type="image/jpeg" srcSet="/image.jpg" />
  <img src="/image.jpg" alt="이미지" />
</picture>
```

---

## 7. 상태 관리 최적화

### 상태 분리

```tsx
// ❌ 하나의 큰 상태
function App() {
  const [state, setState] = useState({
    user: null,
    posts: [],
    comments: [],
    loading: false,
  });
  // user만 변경해도 전체 재렌더링
}

// ✅ 상태 분리
function App() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  // 필요한 상태만 변경
}
```

---

### 상태 끌어올리기 최소화

```tsx
// ❌ 상태를 너무 위로 끌어올림
function App() {
  const [value, setValue] = useState('');
  return (
    <div>
      <Header />  {/* value 사용 안 함 */}
      <Sidebar />  {/* value 사용 안 함 */}
      <SearchBar value={value} onChange={setValue} />
    </div>
  );
}

// ✅ 상태를 필요한 곳에만
function App() {
  return (
    <div>
      <Header />
      <Sidebar />
      <SearchSection />  {/* 여기서만 상태 관리 */}
    </div>
  );
}

function SearchSection() {
  const [value, setValue] = useState('');
  return <SearchBar value={value} onChange={setValue} />;
}
```

---

### Context 분리

```tsx
// ❌ 하나의 큰 Context
const AppContext = createContext({
  user: null,
  theme: 'light',
  settings: {},
});
// user만 변경해도 모든 Consumer 재렌더링

// ✅ Context 분리
const UserContext = createContext(null);
const ThemeContext = createContext('light');
const SettingsContext = createContext({});
// 필요한 Context만 구독
```

---

## 8. 디바운싱과 쓰로틀링

### 디바운싱 (Debouncing)

```tsx
import { useState, useCallback } from 'react';
import { debounce } from 'lodash';

function SearchBar() {
  const [query, setQuery] = useState('');

  // ❌ 타이핑마다 API 호출
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    api.search(value);  // 매번 호출
  };

  // ✅ 입력 멈춘 후 500ms 후 호출
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      api.search(value);
    }, 500),
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);  // 500ms 대기
  };

  return <input value={query} onChange={handleChange} />;
}
```

---

### 쓰로틀링 (Throttling)

```tsx
import { throttle } from 'lodash';

function ScrollTracker() {
  const handleScroll = useCallback(
    throttle(() => {
      console.log('스크롤 위치:', window.scrollY);
    }, 200),  // 200ms마다 최대 1번 실행
    []
  );

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return <div>...</div>;
}
```

---

## 9. 번들 크기 최적화

### Tree Shaking

```tsx
// ❌ 전체 라이브러리 import
import _ from 'lodash';
const result = _.debounce(fn);

// ✅ 필요한 것만 import
import debounce from 'lodash/debounce';
const result = debounce(fn);
```

---

### 번들 분석

```bash
# 번들 크기 분석
npm install -D webpack-bundle-analyzer

# Vite
npm install -D rollup-plugin-visualizer
```

```ts
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
};
```

---

## 10. 프로덕션 빌드 최적화

### 환경 변수

```tsx
// 개발 환경에서만 실행
if (process.env.NODE_ENV === 'development') {
  console.log('개발 모드');
}

// 프로덕션 빌드 시 제거됨
```

---

### 소스맵 제거

```ts
// vite.config.ts
export default {
  build: {
    sourcemap: false,  // 프로덕션에서 소스맵 제거
  },
};
```

---

## 실전 체크리스트

### 컴포넌트 최적화

- [ ] React.memo로 불필요한 재렌더링 방지
- [ ] useMemo로 무거운 계산 메모이제이션
- [ ] useCallback으로 함수 메모이제이션
- [ ] key를 올바르게 사용 (인덱스 피하기)

---

### 데이터 최적화

- [ ] 가상 스크롤로 긴 리스트 최적화
- [ ] Lazy Loading으로 이미지 최적화
- [ ] 디바운싱/쓰로틀링으로 이벤트 최적화
- [ ] 상태를 필요한 곳에만 배치

---

### 번들 최적화

- [ ] Code Splitting으로 번들 분리
- [ ] Tree Shaking으로 미사용 코드 제거
- [ ] 번들 분석으로 큰 의존성 확인
- [ ] Dynamic Import로 필요할 때만 로드

---

## 성능 측정 도구

### 1. React DevTools Profiler

```tsx
// 컴포넌트 렌더링 성능 측정
```

---

### 2. Chrome DevTools

```tsx
// Performance 탭에서 렌더링 프로파일링
// Lighthouse 탭에서 종합 성능 측정
```

---

### 3. Web Vitals

```tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);  // Cumulative Layout Shift
getFID(console.log);  // First Input Delay
getFCP(console.log);  // First Contentful Paint
getLCP(console.log);  // Largest Contentful Paint
getTTFB(console.log); // Time to First Byte
```

---

## 주의사항

### 1. 과도한 최적화

```tsx
// ❌ 모든 것을 메모이제이션
const Component = React.memo(() => {
  const value = useMemo(() => 1 + 1, []);  // 불필요
  const handler = useCallback(() => {}, []);  // 불필요
  return <div>{value}</div>;
});

// ✅ 필요한 것만
function Component() {
  return <div>{1 + 1}</div>;
}
```

**규칙:** 측정 후 최적화

---

### 2. 의존성 배열 누락

```tsx
// ❌ 의존성 누락
const value = useMemo(() => calculate(a, b), [a]);  // b 누락

// ✅ 모든 의존성 포함
const value = useMemo(() => calculate(a, b), [a, b]);
```

---

### 3. 메모이제이션 비용

```tsx
// useMemo/useCallback도 비용이 있음
// 간단한 계산은 그냥 실행하는 게 더 빠를 수 있음

// ❌ 오버헤드만 증가
const sum = useMemo(() => a + b, [a, b]);

// ✅ 그냥 계산
const sum = a + b;
```

---

## 요약

1. **React.memo**: Props 변경 없으면 재렌더링 건너뜀
2. **useMemo**: 값 계산 결과 메모이제이션
3. **useCallback**: 함수 메모이제이션
4. **가상 스크롤**: 긴 리스트 최적화
5. **Code Splitting**: 번들 분리로 초기 로딩 개선
6. **이미지 최적화**: Lazy Loading, WebP, 반응형
7. **상태 관리**: 상태 분리, Context 분리
8. **디바운싱/쓰로틀링**: 이벤트 최적화
9. **번들 최적화**: Tree Shaking, 분석
10. **측정**: DevTools, Profiler, Web Vitals

성능 최적화는 **측정 → 병목 지점 파악 → 최적화 → 재측정** 순서로 진행합니다.