---
title: "React 면접 예상 질문"
order: 16
---

# React 면접 예상 질문

React 프론트엔드 개발자 면접에서 빈출되는 핵심 질문들입니다.

## Q1. Virtual DOM이란 무엇이고 왜 사용하나요?

**Virtual DOM**은 실제 DOM의 경량 JavaScript 복사본입니다.

```
상태 변경 → 새 Virtual DOM 생성 → 이전 Virtual DOM과 비교(diffing) → 차이만 실제 DOM에 반영(reconciliation)
```

**이점:**
- 직접 DOM 조작보다 빠른 경우가 많음 (DOM 접근 최소화)
- 선언적 UI 작성 가능 — "어떻게"가 아닌 "무엇을" 그릴지만 정의
- 배치 업데이트로 불필요한 리렌더링 최소화

**주의:** Virtual DOM이 항상 빠른 것은 아닙니다. 매우 단순한 케이스에서는 직접 DOM 조작이 더 빠를 수 있습니다.

---

## Q2. React 렌더링 과정과 최적화 방법은?

**렌더링 발생 조건:**
- `setState` 호출
- 부모 컴포넌트 리렌더링
- Context 값 변경
- `forceUpdate` 호출

**최적화 방법:**

```jsx
// React.memo — 동일 props면 리렌더링 스킵
const UserCard = React.memo(({ user }) => {
    return <div>{user.name}</div>;
});

// useMemo — 비용이 큰 계산 캐싱
const sortedList = useMemo(
    () => items.sort(compareByName),
    [items]  // items가 바뀔 때만 재계산
);

// useCallback — 함수 참조 안정화
const handleClick = useCallback(
    (id) => deleteItem(id),
    [deleteItem]
);
```

---

## Q3. useState와 useReducer는 언제 각각 사용하나요?

```jsx
// useState — 단순한 독립적인 상태
const [count, setCount] = useState(0);
const [isOpen, setIsOpen] = useState(false);

// useReducer — 복잡한 상태 로직, 상태들이 서로 연관될 때
const [state, dispatch] = useReducer(reducer, {
    count: 0,
    loading: false,
    error: null
});

function reducer(state, action) {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, loading: true, error: null };
        case 'FETCH_SUCCESS':
            return { ...state, loading: false, count: action.payload };
        case 'FETCH_ERROR':
            return { ...state, loading: false, error: action.error };
    }
}
```

**useReducer 선호 케이스:** 3개 이상의 연관된 상태, Redux 마이그레이션 준비, 상태 전환 로직이 복잡할 때

---

## Q4. useEffect의 의존성 배열을 잘못 사용하면 어떤 문제가 발생하나요?

```jsx
// 1. 의존성 누락 — stale closure 문제
useEffect(() => {
    const interval = setInterval(() => {
        setCount(count + 1);  // count가 클로저에 캡처되어 항상 초기값 사용
    }, 1000);
    return () => clearInterval(interval);
}, []);  // ❌ count 누락

// 해결: 함수형 업데이트
setCount(prev => prev + 1);

// 2. 불필요한 재실행 — 객체/함수를 의존성으로 사용
useEffect(() => {
    fetchData(options);
}, [options]);  // ❌ 렌더링마다 새 객체 생성 → 무한 루프

// 해결: useMemo로 안정화
const stableOptions = useMemo(() => options, [options.id]);
```

---

## Q5. Context API와 Redux의 차이점은?

| 비교 | Context API | Redux |
|-----|------------|-------|
| 목적 | 전역 데이터 공유 | 상태 관리 패턴 |
| 성능 | Context 값 변경 시 모든 Consumer 리렌더링 | 선택적 구독으로 필요한 컴포넌트만 업데이트 |
| 디버깅 | 기본 도구만 | Redux DevTools (Time Travel) |
| 보일러플레이트 | 적음 | 많음 (action, reducer, selector) |
| 사용 케이스 | 테마, 언어, 인증 정보 | 대규모 앱, 복잡한 비동기 흐름 |

```jsx
// Context — 테마 같은 정적 데이터에 적합
const ThemeContext = createContext('light');

// Redux Toolkit — 빈번하게 변하는 복잡한 상태
const counterSlice = createSlice({
    name: 'counter',
    initialState: 0,
    reducers: {
        increment: state => state + 1
    }
});
```

---

## Q6. React의 key prop이 왜 중요한가요?

`key`는 React가 리스트에서 **어떤 아이템이 변경/추가/제거됐는지 식별**하는 데 사용합니다.

```jsx
// ❌ 인덱스를 key로 사용 — 순서 변경 시 오작동
{items.map((item, i) => <Item key={i} data={item} />)}

// ✅ 안정적인 고유 ID 사용
{items.map(item => <Item key={item.id} data={item} />)}
```

**인덱스 key 문제:**
- 리스트 중간에 항목 삽입 시 이후 모든 항목이 리렌더링됨
- 컴포넌트 내부 상태(input 값 등)가 잘못된 항목에 유지될 수 있음

---

## Q7. React Fiber 아키텍처란 무엇인가요?

React 16에서 도입된 새 재조정(reconciliation) 엔진입니다.

**기존 Stack Reconciler의 문제:**
- 재귀적 처리로 한 번 시작하면 중단 불가
- 큰 트리 업데이트 시 브라우저가 프레임 드롭

**Fiber의 개선:**
- 작업을 **작은 단위(Fiber 노드)로 쪼개고 일시 중단/재개 가능**
- 우선순위 기반 스케줄링 — 사용자 인터랙션을 높은 우선순위로 처리
- `Concurrent Mode`의 기반 기술

```
렌더 단계 (비동기, 중단 가능):
  → 새 Fiber 트리 생성
  → 변경점 계산

커밋 단계 (동기, 중단 불가):
  → 실제 DOM에 반영
```

---

## Q8. 커스텀 훅(Custom Hook)을 만드는 이유와 예시는?

컴포넌트 간 **상태 로직을 재사용**하기 위해 사용합니다.

```jsx
// 로직이 컴포넌트에 섞여 있음 (나쁜 예)
function UserProfile({ id }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUser(id).then(u => { setUser(u); setLoading(false); });
    }, [id]);

    if (loading) return <Spinner />;
    return <div>{user.name}</div>;
}

// ✅ 커스텀 훅으로 분리
function useUser(id) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUser(id).then(u => { setUser(u); setLoading(false); });
    }, [id]);

    return { user, loading };
}

function UserProfile({ id }) {
    const { user, loading } = useUser(id);
    if (loading) return <Spinner />;
    return <div>{user.name}</div>;
}
```

---

## Q9. 에러 바운더리(Error Boundary)란?

렌더링 중 발생한 오류를 캐치해 **앱 전체가 깨지지 않도록** 하는 컴포넌트입니다.

```jsx
class ErrorBoundary extends React.Component {
    state = { hasError: false };

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        logErrorToService(error, info);
    }

    render() {
        if (this.state.hasError) return <FallbackUI />;
        return this.props.children;
    }
}

// 사용
<ErrorBoundary>
    <RiskyComponent />
</ErrorBoundary>
```

⚠️ 이벤트 핸들러, 비동기 코드, SSR 오류는 캐치하지 못합니다.
