---
title: "React Strict Mode"
date: "2026-01-16"
tags: ["react", "strict-mode", "debugging", "frontend"]
excerpt: "React Strict Mode의 동작 방식과 개발 중 발생하는 이중 호출의 의미를 알아봅니다."
---

# React Strict Mode

React Strict Mode는 **개발 환경에서만 동작**하며, 애플리케이션의 잠재적 문제를 발견하는 데 도움을 줍니다.

## 사용 방법

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**특징:**
- 프로덕션 빌드에서는 아무런 영향 없음
- UI에 표시되지 않음
- 자식 컴포넌트 전체에 검사 활성화

---

## Strict Mode가 하는 일

### 1. 이중 렌더링 (Double Rendering)

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  console.log('렌더링!');  // 두 번 출력됨

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

**개발 환경 콘솔:**
```
렌더링!
렌더링!
```

**왜 두 번 렌더링할까?**

순수하지 않은 렌더링 함수를 찾기 위해서입니다.

```tsx
// ❌ 순수하지 않은 컴포넌트
let externalVariable = 0;

function BadComponent() {
  externalVariable++;  // 외부 변수 수정
  return <div>{externalVariable}</div>;
}

// Strict Mode에서:
// 첫 번째 렌더링: externalVariable = 1
// 두 번째 렌더링: externalVariable = 2
// → 결과가 달라짐! 문제 발견!
```

```tsx
// ✅ 순수한 컴포넌트
function GoodComponent({ value }) {
  return <div>{value}</div>;
}

// Strict Mode에서:
// 첫 번째 렌더링: value 표시
// 두 번째 렌더링: value 표시
// → 결과가 같음! 순수함!
```

---

### 2. Effect 이중 실행

```tsx
function DataFetcher() {
  const [data, setData] = useState(null);

  useEffect(() => {
    console.log('Effect 실행!');

    fetchData().then(setData);

    return () => {
      console.log('Cleanup 실행!');
    };
  }, []);

  return <div>{data}</div>;
}
```

**개발 환경 콘솔:**
```
Effect 실행!
Cleanup 실행!
Effect 실행!
```

**왜 Effect를 두 번 실행할까?**

cleanup 함수가 제대로 작동하는지 확인하기 위해서입니다.

```tsx
// ❌ cleanup이 없는 Effect
useEffect(() => {
  const connection = createConnection();
  connection.connect();
  // cleanup 없음!
}, []);

// Strict Mode에서:
// 1. 연결 생성
// 2. (cleanup 없음)
// 3. 다시 연결 생성
// → 연결이 2개! 메모리 누수!
```

```tsx
// ✅ cleanup이 있는 Effect
useEffect(() => {
  const connection = createConnection();
  connection.connect();

  return () => {
    connection.disconnect();  // cleanup
  };
}, []);

// Strict Mode에서:
// 1. 연결 생성
// 2. 연결 해제 (cleanup)
// 3. 다시 연결 생성
// → 연결이 1개! 정상!
```

---

### 3. Deprecated API 경고

```tsx
// ❌ 더 이상 사용하지 않는 API
class OldComponent extends React.Component {
  componentWillMount() {
    // Strict Mode 경고!
  }

  componentWillReceiveProps(nextProps) {
    // Strict Mode 경고!
  }

  componentWillUpdate(nextProps, nextState) {
    // Strict Mode 경고!
  }
}
```

**경고되는 레거시 API:**
- `componentWillMount`
- `componentWillReceiveProps`
- `componentWillUpdate`
- `findDOMNode`
- 레거시 Context API

---

## 실제 문제 사례

### 사례 1: 이벤트 리스너 누수

```tsx
// ❌ 잘못된 코드
function ScrollTracker() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    // cleanup 없음!
  }, []);

  return <div>Scroll: {scrollY}</div>;
}

// Strict Mode에서 이벤트 리스너가 2개 등록됨
// → 문제 발견!
```

```tsx
// ✅ 올바른 코드
function ScrollTracker() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return <div>Scroll: {scrollY}</div>;
}
```

---

### 사례 2: 타이머 누수

```tsx
// ❌ 잘못된 코드
function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    // cleanup 없음!
  }, []);

  return <div>Seconds: {seconds}</div>;
}

// Strict Mode에서 타이머가 2개 실행됨
// → 초가 2배 속도로 증가!
```

```tsx
// ✅ 올바른 코드
function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return <div>Seconds: {seconds}</div>;
}
```

---

### 사례 3: 구독 누수

```tsx
// ❌ 잘못된 코드
function ChatRoom({ roomId }) {
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.connect();
    // cleanup 없음!
  }, [roomId]);

  return <div>Connected to {roomId}</div>;
}

// Strict Mode에서 연결이 2개 생성됨
```

```tsx
// ✅ 올바른 코드
function ChatRoom({ roomId }) {
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.connect();

    return () => connection.disconnect();
  }, [roomId]);

  return <div>Connected to {roomId}</div>;
}
```

---

### 사례 4: AbortController

```tsx
// ❌ 잘못된 코드 (Race Condition)
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(setUser);
    // cleanup 없음!
  }, [userId]);

  return <div>{user?.name}</div>;
}

// userId가 빠르게 변경되면 이전 요청 결과가 덮어쓸 수 있음
```

```tsx
// ✅ 올바른 코드
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then(res => res.json())
      .then(setUser)
      .catch(err => {
        if (err.name !== 'AbortError') throw err;
      });

    return () => controller.abort();
  }, [userId]);

  return <div>{user?.name}</div>;
}
```

---

## 자주 하는 실수

### 실수 1: Effect에서 데이터 한 번만 가져오기

```tsx
// ❌ 두 번 호출되면 안 된다고 생각
useEffect(() => {
  if (!hasFetched.current) {
    fetchData();
    hasFetched.current = true;
  }
}, []);

// ✅ 두 번 호출되어도 괜찮게 작성
useEffect(() => {
  let ignore = false;

  fetchData().then(data => {
    if (!ignore) setData(data);
  });

  return () => { ignore = true; };
}, []);
```

---

### 실수 2: ref를 이용한 우회

```tsx
// ❌ Strict Mode를 우회하려는 시도
const initialized = useRef(false);

useEffect(() => {
  if (initialized.current) return;
  initialized.current = true;

  // 한 번만 실행하고 싶은 코드
}, []);

// 이건 문제를 숨길 뿐, 해결하지 않음
```

---

### 실수 3: 콘솔 로그가 두 번 찍힌다고 제거

```tsx
// ❌ 두 번 렌더링되는 게 싫어서
root.render(
  // <StrictMode>
    <App />
  // </StrictMode>
);

// Strict Mode를 제거하면 문제를 찾을 수 없음!
```

---

## Strict Mode와 React 18+

### Concurrent Features 준비

React 18의 Concurrent Features (Suspense, Transitions)는 렌더링을 중단하고 재시작할 수 있습니다.

```tsx
// Concurrent Mode에서:
// 1. 렌더링 시작
// 2. 더 긴급한 업데이트 발생
// 3. 렌더링 중단
// 4. 긴급한 업데이트 처리
// 5. 렌더링 재시작 (처음부터!)
```

Strict Mode의 이중 렌더링은 이런 상황을 시뮬레이션합니다.

---

### useEffect vs useLayoutEffect

```tsx
// useEffect: 페인트 후 비동기 실행
useEffect(() => {
  console.log('Effect');
  return () => console.log('Cleanup');
}, []);

// useLayoutEffect: 페인트 전 동기 실행
useLayoutEffect(() => {
  console.log('Layout Effect');
  return () => console.log('Layout Cleanup');
}, []);
```

**Strict Mode에서 둘 다 두 번 실행됩니다.**

---

## 부분적으로 적용

```tsx
function App() {
  return (
    <div>
      {/* Strict Mode 적용 안 됨 */}
      <LegacyComponent />

      <StrictMode>
        {/* Strict Mode 적용됨 */}
        <NewComponent />
      </StrictMode>
    </div>
  );
}
```

점진적으로 마이그레이션할 때 유용합니다.

---

## 프로덕션에서는?

```tsx
// 개발 환경
if (process.env.NODE_ENV === 'development') {
  // Strict Mode 검사 실행
  // 이중 렌더링
  // 이중 Effect 실행
}

// 프로덕션 환경
if (process.env.NODE_ENV === 'production') {
  // 아무것도 하지 않음
  // 단 한 번만 렌더링
  // 단 한 번만 Effect 실행
}
```

**Strict Mode는 프로덕션 성능에 전혀 영향을 주지 않습니다.**

---

## 콘솔 로그 중복 방지

React 18에서는 Strict Mode 이중 호출 시 두 번째 로그가 흐리게 표시됩니다.

```
렌더링!        (정상 색상)
렌더링!        (흐린 색상)
```

Chrome DevTools에서 확인할 수 있습니다.

---

## 체크리스트

Strict Mode에서 문제가 발생한다면:

```
✅ 컴포넌트가 순수한가? (같은 입력 → 같은 출력)
✅ useEffect에 cleanup 함수가 있는가?
✅ 이벤트 리스너를 제거하고 있는가?
✅ 타이머를 정리하고 있는가?
✅ 구독을 해제하고 있는가?
✅ fetch 요청을 취소하고 있는가?
✅ 레거시 생명주기 메서드를 사용하고 있지 않은가?
```

---

## 요약

1. **Strict Mode**: 개발 환경에서만 동작하는 검사 도구
2. **이중 렌더링**: 순수하지 않은 컴포넌트 발견
3. **이중 Effect**: cleanup 누락 발견
4. **Deprecated 경고**: 레거시 API 사용 감지
5. **프로덕션 영향 없음**: 개발 환경에서만 동작
6. **Concurrent Mode 준비**: 렌더링 중단/재시작 시뮬레이션

**Strict Mode는 버그가 아니라 버그를 찾아주는 도구입니다.** 개발 중 두 번 실행되는 것이 불편해도 제거하지 마세요.