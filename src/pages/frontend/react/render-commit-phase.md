---
title: "React의 Render Phase와 Commit Phase"
date: "2026-01-16"
tags: ["react", "rendering", "reconciliation", "virtual-dom", "frontend"]
excerpt: "React가 컴포넌트를 렌더링하고 DOM에 반영하는 두 단계의 과정을 알아봅니다."
---

# React의 Render Phase와 Commit Phase

React는 UI 업데이트를 **두 단계**로 나누어 처리합니다.

```
상태 변경
    ↓
┌─────────────────┐
│  Render Phase   │  ← Virtual DOM 생성
│  (렌더 단계)     │  ← 변경 사항 계산
└────────┬────────┘
         ↓
┌─────────────────┐
│  Commit Phase   │  ← 실제 DOM 업데이트
│  (커밋 단계)     │  ← Effect 실행
└─────────────────┘
```

---

## Render Phase (렌더 단계)

**Virtual DOM을 생성하고 변경 사항을 계산**합니다.

### 특징

```
✅ 순수해야 함 (부수 효과 없음)
✅ 중단 가능 (Concurrent Mode)
✅ 여러 번 실행될 수 있음
❌ DOM을 직접 변경하면 안 됨
❌ Side Effect가 있으면 안 됨
```

---

### Render Phase에서 일어나는 일

```jsx
function Counter({ count }) {
  // 1. 컴포넌트 함수 실행
  console.log('렌더링');

  // 2. JSX를 React Element로 변환
  return (
    <div>
      <span>Count: {count}</span>
    </div>
  );
}

// JSX가 변환된 결과 (React Element)
{
  type: 'div',
  props: {
    children: {
      type: 'span',
      props: {
        children: ['Count: ', count]
      }
    }
  }
}
```

---

### Reconciliation (재조정)

이전 Virtual DOM과 새 Virtual DOM을 비교합니다.

```jsx
// 이전 Virtual DOM
<ul>
  <li key="1">Apple</li>
  <li key="2">Banana</li>
</ul>

// 새 Virtual DOM
<ul>
  <li key="1">Apple</li>
  <li key="2">Banana</li>
  <li key="3">Cherry</li>  ← 추가됨
</ul>

// Diffing 결과: li 하나 추가
```

**Diffing 알고리즘:**
1. 타입이 다르면 → 전체 교체
2. 타입이 같으면 → 속성만 업데이트
3. key가 같으면 → 동일한 요소로 판단

---

### Render Phase는 순수해야 한다

```jsx
// ❌ Render Phase에서 하면 안 되는 것
function BadComponent() {
  // 외부 변수 수정
  globalCounter++;

  // DOM 직접 조작
  document.title = 'Bad!';

  // API 호출
  fetch('/api/data');

  // 상태 직접 변경
  someObject.value = 123;

  return <div>Bad</div>;
}

// ✅ 순수한 컴포넌트
function GoodComponent({ count }) {
  // props와 state만 사용
  const doubled = count * 2;

  return <div>Count: {doubled}</div>;
}
```

**왜 순수해야 하는가?**
- Render Phase는 여러 번 실행될 수 있음
- Concurrent Mode에서 중단/재시작 가능
- Strict Mode에서 두 번 호출됨

---

### 중단 가능 (Interruptible)

React 18의 Concurrent Mode에서:

```jsx
// 긴급한 업데이트 발생
// 1. Render Phase 중단
// 2. 긴급한 업데이트 처리
// 3. Render Phase 재시작 (처음부터!)

function App() {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    // 긴급한 업데이트
    setInputValue(e.target.value);

    // 덜 긴급한 업데이트 (중단 가능)
    startTransition(() => {
      setSearchResults(filterData(value));
    });
  };
}
```

---

## Commit Phase (커밋 단계)

**실제 DOM을 업데이트하고 Effect를 실행**합니다.

### 특징

```
✅ DOM 변경
✅ Effect 실행
✅ 동기적으로 실행
❌ 중단 불가능
```

---

### Commit Phase의 세 단계

```
Commit Phase
├── Before Mutation (DOM 변경 전)
│   └── getSnapshotBeforeUpdate
├── Mutation (DOM 변경)
│   └── 실제 DOM 업데이트
└── Layout (DOM 변경 후)
    ├── useLayoutEffect
    └── componentDidMount/Update
```

---

### 1. Before Mutation

```jsx
class ScrollBox extends React.Component {
  getSnapshotBeforeUpdate(prevProps, prevState) {
    // DOM 변경 전에 스크롤 위치 저장
    return this.listRef.scrollHeight;
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // snapshot = 이전 scrollHeight
    // 스크롤 위치 복원
  }
}
```

---

### 2. Mutation

실제 DOM이 변경됩니다.

```jsx
// React가 내부적으로 수행
element.textContent = 'New Text';
element.setAttribute('class', 'new-class');
parent.appendChild(newElement);
parent.removeChild(oldElement);
```

---

### 3. Layout

DOM 변경 후 동기적으로 실행됩니다.

```jsx
function Component() {
  const ref = useRef();

  useLayoutEffect(() => {
    // DOM 변경 직후, 브라우저 페인트 전에 실행
    // DOM 측정, 스크롤 위치 조정 등
    const height = ref.current.offsetHeight;
    console.log('높이:', height);
  }, []);

  return <div ref={ref}>Content</div>;
}
```

---

### useEffect vs useLayoutEffect

```jsx
function Component() {
  useLayoutEffect(() => {
    // 1. Commit Phase에서 동기 실행
    // 2. 브라우저 페인트 전
    // 3. DOM 측정에 적합
    console.log('Layout Effect');
  });

  useEffect(() => {
    // 1. Commit Phase 후 비동기 실행
    // 2. 브라우저 페인트 후
    // 3. 데이터 fetching에 적합
    console.log('Effect');
  });

  console.log('Render');

  return <div>Content</div>;
}

// 실행 순서:
// 1. Render
// 2. (DOM 업데이트)
// 3. Layout Effect
// 4. (브라우저 페인트)
// 5. Effect
```

---

## 전체 흐름 예시

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  console.log('1. Render Phase: 컴포넌트 실행');

  useLayoutEffect(() => {
    console.log('3. Commit Phase (Layout): useLayoutEffect');
  });

  useEffect(() => {
    console.log('5. Commit Phase 후: useEffect');
  });

  return (
    <button onClick={() => setCount(count + 1)}>
      {console.log('2. Render Phase: JSX 평가')}
      Count: {count}
    </button>
  );
}

// 버튼 클릭 시 콘솔 출력:
// 1. Render Phase: 컴포넌트 실행
// 2. Render Phase: JSX 평가
// 3. Commit Phase (Layout): useLayoutEffect
// (브라우저 페인트)
// 5. Commit Phase 후: useEffect
```

---

## Concurrent Rendering

React 18에서는 Render Phase를 여러 조각으로 나눌 수 있습니다.

### 기존 동기 렌더링

```
Render Phase  │████████████████████│
              ↓
Commit Phase  │███│
              ↓
브라우저 응답  가능

문제: Render가 길면 브라우저가 멈춤
```

---

### Concurrent 렌더링

```
Render Phase  │████│ pause │████│ pause │████│
                    ↓            ↓
              브라우저 응답  브라우저 응답
                    ↓
Commit Phase                          │███│

장점: 렌더링 중에도 브라우저가 응답 가능
```

---

### Concurrent Features

```jsx
// useTransition: 긴급하지 않은 업데이트
const [isPending, startTransition] = useTransition();

startTransition(() => {
  setSearchQuery(input);  // 중단 가능
});

// useDeferredValue: 값 지연
const deferredValue = useDeferredValue(value);

// Suspense: 로딩 상태 처리
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>
```

---

## 생명주기와 Phase 매핑

### 클래스 컴포넌트

```
Render Phase:
  - constructor
  - getDerivedStateFromProps
  - shouldComponentUpdate
  - render

Commit Phase:
  - getSnapshotBeforeUpdate (Before Mutation)
  - componentDidMount (Layout)
  - componentDidUpdate (Layout)
  - componentWillUnmount (Mutation 전)
```

---

### 함수 컴포넌트

```
Render Phase:
  - 함수 본문 실행
  - useMemo 계산
  - useState/useReducer 초기화

Commit Phase:
  - useLayoutEffect (Layout)
  - useEffect (Layout 후 비동기)
  - ref 연결
```

---

## 성능 최적화와 Phase

### Render Phase 최적화

```jsx
// React.memo: 불필요한 렌더링 방지
const MemoizedComponent = React.memo(({ value }) => {
  return <div>{value}</div>;
});

// useMemo: 계산 결과 메모이제이션
const expensive = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// useCallback: 함수 메모이제이션
const handler = useCallback(() => {
  doSomething(id);
}, [id]);
```

---

### Commit Phase 최적화

```jsx
// useLayoutEffect 최소화 (동기적이라 느림)
useLayoutEffect(() => {
  // DOM 측정이 필요한 경우만 사용
}, []);

// useEffect 선호 (비동기라 빠름)
useEffect(() => {
  // 대부분의 사이드 이펙트는 여기서
}, []);
```

---

## 디버깅

### React DevTools Profiler

```
Profiler 탭 → Record → 동작 → Stop

확인 가능한 정보:
- 각 컴포넌트의 렌더링 시간
- 왜 렌더링되었는지 (Why did this render?)
- Commit 별 렌더링 정보
```

---

### 콘솔로 Phase 확인

```jsx
function DebugComponent() {
  console.log('Render Phase');

  useLayoutEffect(() => {
    console.log('Commit Phase (Layout)');
  });

  useEffect(() => {
    console.log('After Commit Phase');
  });

  return <div>Debug</div>;
}
```

---

## 주의사항

### 1. Render Phase에서 Side Effect 금지

```jsx
// ❌ Render Phase에서 상태 변경
function Bad() {
  const [count, setCount] = useState(0);
  setCount(count + 1);  // 무한 루프!
  return <div>{count}</div>;
}

// ✅ 이벤트 핸들러나 Effect에서 변경
function Good() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  );
}
```

---

### 2. useLayoutEffect 남용 금지

```jsx
// ❌ 모든 Effect를 useLayoutEffect로
useLayoutEffect(() => {
  fetchData();  // 불필요하게 동기적
}, []);

// ✅ 필요한 경우만 useLayoutEffect
useLayoutEffect(() => {
  // DOM 측정이 필요한 경우
  const rect = ref.current.getBoundingClientRect();
}, []);

useEffect(() => {
  // 대부분의 사이드 이펙트
  fetchData();
}, []);
```

---

### 3. 렌더링 중 DOM 접근 금지

```jsx
// ❌ Render Phase에서 DOM 접근
function Bad() {
  const width = document.body.clientWidth;  // 비순수!
  return <div style={{ width }}>Content</div>;
}

// ✅ Effect에서 DOM 접근
function Good() {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    setWidth(document.body.clientWidth);
  }, []);

  return <div style={{ width }}>Content</div>;
}
```

---

## 요약

### Render Phase
- Virtual DOM 생성
- Diffing (변경 사항 계산)
- **순수**해야 함
- **중단 가능** (Concurrent Mode)
- 여러 번 실행될 수 있음

### Commit Phase
- 실제 DOM 업데이트
- Effect 실행 (useLayoutEffect → useEffect)
- **중단 불가능**
- 한 번만 실행

### 실행 순서
1. Render Phase (컴포넌트 함수 실행)
2. Reconciliation (Diffing)
3. Commit Phase - Before Mutation
4. Commit Phase - Mutation (DOM 변경)
5. Commit Phase - Layout (useLayoutEffect)
6. 브라우저 페인트
7. useEffect 실행

**핵심:** Render Phase는 순수하게, Side Effect는 Commit Phase에서!