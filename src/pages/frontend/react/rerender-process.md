---
title: "React 리렌더링 과정"
date: "2026-02-25"
tags: ["react", "rendering", "fiber", "reconciliation", "frontend"]
excerpt: "React가 리렌더링을 언제, 어떻게 결정하는지 알아봅니다."
---

# React 리렌더링 과정

리렌더링은 컴포넌트 함수가 다시 실행되는 것입니다. React는 리렌더링이 필요한지 판단하고, 필요하다면 어떤 컴포넌트를 다시 그릴지 결정합니다.

---

## 리렌더링 트리거

React는 크게 네 가지 원인으로 리렌더링을 시작합니다.

### 1. 상태(State) 변경

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  );
}
```

`setCount`가 호출되면 `Counter` 컴포넌트가 리렌더링됩니다.

---

### 2. Props 변경

부모가 리렌더링되면 자식도 기본적으로 리렌더링됩니다.

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <>
      <button onClick={() => setCount(count + 1)}>+</button>
      <Child value={count} />  {/* Parent 리렌더링 시 Child도 리렌더링 */}
    </>
  );
}

function Child({ value }) {
  console.log('Child 렌더링');
  return <div>{value}</div>;
}
```

---

### 3. Context 변경

Context 값이 변경되면, 해당 Context를 구독하는 컴포넌트가 모두 리렌더링됩니다.

```jsx
const ThemeContext = createContext('light');

function App() {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={theme}>
      <Page />   {/* theme 변경 시 리렌더링 */}
    </ThemeContext.Provider>
  );
}

function Page() {
  // ThemeContext를 구독하지 않아도 children으로 들어오면 리렌더링될 수 있음
  return <Header />;
}

function Header() {
  const theme = useContext(ThemeContext);  // 구독 중 → 항상 리렌더링
  return <div className={theme}>Header</div>;
}
```

---

### 4. 부모 컴포넌트 리렌더링

Props가 바뀌지 않아도 부모가 리렌더링되면 자식도 리렌더링됩니다.

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <>
      <button onClick={() => setCount(count + 1)}>+</button>
      <Child />  {/* count와 무관하지만 Parent 리렌더링 시 같이 리렌더링 */}
    </>
  );
}

function Child() {
  console.log('Child 렌더링');  // count 변경마다 출력됨
  return <div>자식 컴포넌트</div>;
}
```

이것이 React의 기본 동작입니다. `React.memo`를 사용해야 이를 방지할 수 있습니다.

---

## 리렌더링이 전파되는 방식

리렌더링은 **위에서 아래로** 전파됩니다. 특정 컴포넌트가 리렌더링되면, 그 하위 트리 전체가 리렌더링됩니다.

```
App
├── Header     ← 리렌더링 안 됨
├── Main       ← setCount 호출로 리렌더링 시작
│   ├── Sidebar   ← 같이 리렌더링
│   └── Content   ← 같이 리렌더링
│       └── Card  ← 같이 리렌더링
└── Footer     ← 리렌더링 안 됨
```

`Main`에서 상태가 변경되면 `Main`의 하위 컴포넌트가 모두 리렌더링됩니다. `Header`, `Footer`는 영향받지 않습니다.

---

## React가 리렌더링 여부를 판단하는 방법

### 기본: 모든 자식을 리렌더링

별다른 최적화가 없으면, 부모가 리렌더링될 때 자식도 항상 리렌더링됩니다.

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  // onClick은 렌더링마다 새로운 함수 객체 생성
  const handleClick = () => console.log('click');

  return <Child onClick={handleClick} />;
}
```

### React.memo: Props 비교로 스킵

```jsx
const Child = React.memo(function Child({ onClick }) {
  console.log('Child 렌더링');
  return <button onClick={onClick}>클릭</button>;
});
```

`React.memo`는 이전 Props와 새 Props를 **얕은 비교(shallow comparison)** 합니다.

```jsx
// 원시값: 값 비교
'hello' === 'hello'  // true → 리렌더링 스킵
42 === 42            // true → 리렌더링 스킵

// 객체/배열/함수: 참조 비교
{} === {}            // false → 리렌더링 발생!
[] === []            // false → 리렌더링 발생!
() => {} === () => {}  // false → 리렌더링 발생!
```

매 렌더링마다 새 객체/함수가 만들어지기 때문에 `React.memo`만으로는 막을 수 없는 경우가 있습니다.

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  // 렌더링마다 새 함수 생성 → React.memo 무력화
  const handleClick = () => console.log('click');

  return <Child onClick={handleClick} />;  // 항상 리렌더링!
}
```

`useCallback`으로 함수 참조를 고정해야 합니다.

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  // 의존성이 바뀌지 않으면 같은 참조 유지
  const handleClick = useCallback(() => {
    console.log('click');
  }, []);

  return <Child onClick={handleClick} />;  // 이제 리렌더링 스킵
}
```

---

## 상태 업데이트의 일괄 처리 (Batching)

React는 여러 상태 업데이트를 하나의 리렌더링으로 묶어 처리합니다.

```jsx
function Form() {
  const [name, setName] = useState('');
  const [age, setAge] = useState(0);

  const handleSubmit = () => {
    setName('Alice');  // 리렌더링 예약
    setAge(30);        // 리렌더링 예약

    // 두 번 리렌더링되지 않고, 한 번만 리렌더링됨
  };
}
```

React 18 이전에는 이벤트 핸들러 내부에서만 배치 처리가 됐지만, React 18부터는 `setTimeout`, `Promise`, 네이티브 이벤트 등 모든 곳에서 자동 배치 처리됩니다.

```jsx
// React 18: 모든 곳에서 자동 배치
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // 리렌더링 1번만 발생
}, 1000);

// 배치를 원하지 않을 때
import { flushSync } from 'react-dom';

flushSync(() => setCount(c => c + 1));  // 즉시 리렌더링
flushSync(() => setFlag(f => !f));      // 즉시 리렌더링
```

---

## 동일한 상태값으로 업데이트

현재 상태와 같은 값으로 `setState`를 호출하면 리렌더링을 건너뜁니다.

```jsx
function Component() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(0);  // 이미 0이면 리렌더링 안 함
  };
}
```

React는 내부적으로 `Object.is`로 이전 상태와 새 상태를 비교합니다.

```js
Object.is(0, 0)          // true  → 리렌더링 스킵
Object.is({}, {})        // false → 리렌더링 발생
Object.is(NaN, NaN)      // true  → 리렌더링 스킵 (=== 와 다름)
```

---

## Fiber와 리렌더링

React 16부터 **Fiber** 아키텍처를 사용합니다. Fiber는 컴포넌트 트리를 연결 리스트 구조로 표현한 것으로, 각 컴포넌트에 대응하는 Fiber 노드가 존재합니다.

```
Fiber 노드 구조
{
  type,           // 컴포넌트 함수 or DOM 태그
  stateNode,      // 실제 DOM 노드 or 클래스 인스턴스
  child,          // 첫 번째 자식
  sibling,        // 다음 형제
  return,         // 부모
  pendingProps,   // 새 props
  memoizedProps,  // 이전 props
  memoizedState,  // 현재 상태
  flags,          // 변경 사항 플래그 (Update, Placement, Deletion 등)
}
```

리렌더링 시 React는 현재 Fiber 트리(current tree)와 작업 중인 Fiber 트리(work-in-progress tree)를 비교하며 변경 사항을 계산합니다.

```
상태 변경 발생
       ↓
work-in-progress tree 생성 (현재 트리를 기반으로)
       ↓
변경된 컴포넌트부터 아래로 재조정(reconciliation)
       ↓
변경 사항을 effect list로 수집
       ↓
Commit Phase: DOM에 반영
       ↓
work-in-progress tree → current tree로 교체
```

---

## 리렌더링과 함수 컴포넌트

함수 컴포넌트는 리렌더링마다 함수 전체가 다시 실행됩니다.

```jsx
function Component() {
  console.log('컴포넌트 실행');  // 리렌더링마다 출력

  // 리렌더링마다 새로 생성됨
  const localVar = { x: 1 };
  const localFn = () => console.log('click');

  // useState: 상태는 유지됨 (React가 Fiber에 저장)
  const [count, setCount] = useState(0);

  // useMemo: 의존성이 같으면 재계산 안 함
  const computed = useMemo(() => heavyCalc(count), [count]);

  return <div onClick={localFn}>{count}</div>;
}
```

함수 본문에서 선언된 변수/함수는 매번 새로 만들어지지만, `useState`의 상태는 React가 Fiber에 보관하므로 유지됩니다.

---

## children prop으로 리렌더링 방지

상태를 가진 컴포넌트와 자주 변경되지 않는 컴포넌트를 분리하면, `React.memo` 없이도 불필요한 리렌더링을 줄일 수 있습니다.

```jsx
// ❌ Child가 count와 무관하지만 항상 리렌더링
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <ExpensiveChild />
    </div>
  );
}

// ✅ children으로 분리
function Counter({ children }) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      {children}  {/* 이미 생성된 React Element → 리렌더링 안 함 */}
    </div>
  );
}

function App() {
  return (
    <Counter>
      <ExpensiveChild />  {/* App이 리렌더링될 때만 재생성 */}
    </Counter>
  );
}
```

`children`으로 전달된 JSX는 `Counter`의 상태가 바뀌어도 재생성되지 않습니다. JSX는 `App`에서 만들어지고, `App`이 리렌더링될 때만 새로 만들어집니다.

---

## 리렌더링 확인 방법

### React DevTools

React DevTools의 **Profiler** 탭에서 어떤 컴포넌트가 얼마나 자주 리렌더링되는지 확인할 수 있습니다. 설정에서 "Highlight updates when components render"를 켜면 리렌더링되는 컴포넌트가 화면에 표시됩니다.

### 콘솔 로그

```jsx
function Component(props) {
  console.log('렌더링:', props);  // 리렌더링마다 출력
  return <div />;
}
```

### useRef로 렌더링 횟수 추적

```jsx
function Component() {
  const renderCount = useRef(0);
  renderCount.current += 1;

  console.log('렌더링 횟수:', renderCount.current);

  return <div />;
}
```

---

## 요약

| 상황 | 리렌더링 여부 |
|------|--------------|
| 상태(state) 변경 | O |
| 동일한 상태값으로 setState | X |
| 부모 리렌더링 | O (기본값) |
| 부모 리렌더링 + React.memo | Props 비교 후 결정 |
| Context 값 변경 | O (구독 컴포넌트만) |
| Props 변경 (원시값) | O |
| Props 변경 (객체, 참조 동일) | X (React.memo 사용 시) |

리렌더링 자체는 비용이 크지 않습니다. 실제 DOM 변경이 일어날 때만 비용이 발생합니다. 불필요한 최적화보다는 프로파일러로 실제 문제를 확인한 뒤 대응하는 것이 좋습니다.
