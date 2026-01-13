---
title: "React의 Props와 State"
date: "2026-01-13"
tags: ["react", "props", "state", "frontend", "component"]
excerpt: "React 컴포넌트에서 데이터를 다루는 두 가지 핵심 개념인 Props와 State의 차이점과 사용법을 알아봅니다."
---

# React의 Props와 State

Props와 State는 React 컴포넌트에서 데이터를 관리하는 두 가지 핵심 개념입니다.

## Props란?

**부모 컴포넌트가 자식 컴포넌트에게 전달하는 읽기 전용 데이터**입니다.

```typescript
// 부모 컴포넌트
function Parent() {
  return <Child name="홍길동" age={20} />;
}

// 자식 컴포넌트
function Child(props: { name: string; age: number }) {
  return (
    <div>
      <p>이름: {props.name}</p>
      <p>나이: {props.age}</p>
    </div>
  );
}
```

---

## State란?

**컴포넌트 내부에서 관리하는 변경 가능한 데이터**입니다.

```typescript
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>증가</button>
    </div>
  );
}
```

---

## Props의 특징

### 1. 읽기 전용 (Immutable)

```typescript
function Child(props: { name: string }) {
  // ❌ Props는 수정 불가
  props.name = "새 이름";  // 에러!

  return <div>{props.name}</div>;
}
```

---

### 2. 부모 → 자식 단방향 흐름

```typescript
function Parent() {
  const user = { name: "홍길동", email: "hong@example.com" };

  return (
    <div>
      <Child user={user} />  {/* 부모 → 자식 */}
    </div>
  );
}

function Child({ user }: { user: User }) {
  return <div>{user.name}</div>;
}
```

---

### 3. 구조 분해 할당

```typescript
// ✅ 구조 분해로 간결하게
function UserCard({ name, email, age }: UserProps) {
  return (
    <div>
      <h3>{name}</h3>
      <p>{email}</p>
      <p>{age}세</p>
    </div>
  );
}

// 사용
<UserCard name="홍길동" email="hong@example.com" age={20} />
```

---

### 4. 기본값 설정

```typescript
// 방법 1: 구조 분해 시 기본값
function Button({ text = "클릭", color = "blue" }) {
  return <button style={{ color }}>{text}</button>;
}

// 방법 2: defaultProps (클래스 컴포넌트)
Button.defaultProps = {
  text: "클릭",
  color: "blue"
};
```

---

### 5. children prop

```typescript
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="card">
      {children}
    </div>
  );
}

// 사용
<Card>
  <h1>제목</h1>
  <p>내용</p>
</Card>
```

---

## State의 특징

### 1. 변경 가능 (Mutable)

```typescript
function Counter() {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1);  // 상태 변경
  };

  return <button onClick={increment}>{count}</button>;
}
```

---

### 2. 비동기 업데이트

```typescript
function Counter() {
  const [count, setCount] = useState(0);

  const increment = () => {
    // ❌ 잘못된 방법 (같은 값만 3번 업데이트)
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);  // count는 여전히 0

    // ✅ 올바른 방법 (함수형 업데이트)
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);  // 제대로 3 증가
  };

  return <button onClick={increment}>{count}</button>;
}
```

---

### 3. 객체/배열 상태 업데이트

```typescript
function UserProfile() {
  const [user, setUser] = useState({
    name: "홍길동",
    age: 20
  });

  // ❌ 직접 수정 (불변성 위반)
  const updateName = () => {
    user.name = "새 이름";  // 재렌더링 안 됨
  };

  // ✅ 새 객체 생성
  const updateName = () => {
    setUser({
      ...user,
      name: "새 이름"
    });
  };

  // ✅ 중첩 객체 업데이트
  const updateAddress = () => {
    setUser({
      ...user,
      address: {
        ...user.address,
        city: "서울"
      }
    });
  };
}
```

---

### 4. 배열 상태 업데이트

```typescript
function TodoList() {
  const [todos, setTodos] = useState<string[]>([]);

  // 추가
  const addTodo = (todo: string) => {
    setTodos([...todos, todo]);
    // 또는
    setTodos(prev => [...prev, todo]);
  };

  // 삭제
  const removeTodo = (index: number) => {
    setTodos(todos.filter((_, i) => i !== index));
  };

  // 수정
  const updateTodo = (index: number, newTodo: string) => {
    setTodos(todos.map((todo, i) =>
      i === index ? newTodo : todo
    ));
  };
}
```

---

## Props vs State 비교

| 구분 | Props | State |
|-----|-------|-------|
| 변경 | 읽기 전용 | 변경 가능 |
| 소유 | 부모 컴포넌트 | 해당 컴포넌트 |
| 전달 | 부모 → 자식 | 컴포넌트 내부 |
| 초기화 | 부모가 설정 | 컴포넌트가 설정 |
| 재렌더링 | Props 변경 시 | State 변경 시 |

---

## 실전 예제

### 예제 1: 로그인 폼

```typescript
interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  isLoading: boolean;
}

function LoginForm({ onSubmit, isLoading }: LoginFormProps) {
  // State: 컴포넌트 내부 데이터
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Props: 부모에게 전달받은 함수
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button disabled={isLoading}>
        {isLoading ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}

// 부모 컴포넌트
function App() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    await login(email, password);
    setIsLoading(false);
  };

  return <LoginForm onSubmit={handleLogin} isLoading={isLoading} />;
}
```

---

### 예제 2: 할 일 목록

```typescript
interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

// Props를 받아서 표시
function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <div>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
        {todo.text}
      </span>
      <button onClick={() => onDelete(todo.id)}>삭제</button>
    </div>
  );
}

// State로 관리
function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");

  const addTodo = () => {
    const newTodo: Todo = {
      id: Date.now(),
      text: input,
      completed: false
    };
    setTodos([...todos, newTodo]);
    setInput("");
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div>
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={addTodo}>추가</button>

      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
        />
      ))}
    </div>
  );
}
```

---

### 예제 3: 타이머

```typescript
interface TimerProps {
  initialSeconds: number;  // Props: 초기값
  onComplete?: () => void;  // Props: 콜백
}

function Timer({ initialSeconds, onComplete }: TimerProps) {
  // State: 현재 남은 시간
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, onComplete]);

  return (
    <div>
      <h1>{seconds}초</h1>
      <button onClick={() => setIsRunning(!isRunning)}>
        {isRunning ? "일시정지" : "시작"}
      </button>
      <button onClick={() => setSeconds(initialSeconds)}>
        리셋
      </button>
    </div>
  );
}

// 사용
<Timer initialSeconds={60} onComplete={() => alert("완료!")} />
```

---

## State 끌어올리기 (Lifting State Up)

여러 컴포넌트가 같은 데이터를 공유해야 할 때, State를 공통 부모로 올립니다.

```typescript
// ❌ 각자 State 관리 (동기화 안 됨)
function TemperatureInput() {
  const [temperature, setTemperature] = useState("");
  return <input value={temperature} onChange={...} />;
}

// ✅ 부모에서 State 관리
function Calculator() {
  const [temperature, setTemperature] = useState("");
  const [scale, setScale] = useState<'c' | 'f'>('c');

  return (
    <div>
      <TemperatureInput
        scale="c"
        temperature={temperature}
        onTemperatureChange={setTemperature}
      />
      <TemperatureInput
        scale="f"
        temperature={convertTemperature(temperature, scale)}
        onTemperatureChange={setTemperature}
      />
    </div>
  );
}

interface TemperatureInputProps {
  scale: 'c' | 'f';
  temperature: string;
  onTemperatureChange: (temp: string) => void;
}

function TemperatureInput({
  scale,
  temperature,
  onTemperatureChange
}: TemperatureInputProps) {
  return (
    <div>
      <label>{scale === 'c' ? '섭씨' : '화씨'}</label>
      <input
        value={temperature}
        onChange={e => onTemperatureChange(e.target.value)}
      />
    </div>
  );
}
```

---

## Props Drilling 문제

깊은 컴포넌트 트리에서 Props를 전달하는 것이 번거로운 문제입니다.

```typescript
// ❌ Props Drilling
function App() {
  const [user, setUser] = useState(null);

  return <Layout user={user} />;
}

function Layout({ user }) {
  return <Sidebar user={user} />;
}

function Sidebar({ user }) {
  return <UserProfile user={user} />;
}

function UserProfile({ user }) {
  return <div>{user.name}</div>;
}
```

**해결 방법:**

1. **Context API**
```typescript
const UserContext = createContext(null);

function App() {
  const [user, setUser] = useState(null);

  return (
    <UserContext.Provider value={user}>
      <Layout />
    </UserContext.Provider>
  );
}

function UserProfile() {
  const user = useContext(UserContext);
  return <div>{user.name}</div>;
}
```

2. **상태 관리 라이브러리** (Redux, Zustand 등)

---

## TypeScript와 Props

```typescript
// Props 타입 정의
interface ButtonProps {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  children?: React.ReactNode;
}

function Button({
  text,
  onClick,
  variant = 'primary',
  disabled = false,
  children
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={variant}
    >
      {text}
      {children}
    </button>
  );
}

// 사용
<Button
  text="클릭"
  onClick={() => console.log('clicked')}
  variant="primary"
/>
```

---

## 주의사항

### 1. Props로 전달된 함수는 useCallback

```typescript
// ❌ 매번 새 함수 생성
function Parent() {
  const handleClick = () => {
    console.log('clicked');
  };

  return <Child onClick={handleClick} />;
}

// ✅ 함수 메모이제이션
function Parent() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  return <Child onClick={handleClick} />;
}
```

---

### 2. State 초기값은 한 번만 사용됨

```typescript
function Counter({ initialCount }: { initialCount: number }) {
  // initialCount는 최초 렌더링 시에만 사용
  const [count, setCount] = useState(initialCount);

  // Props 변경되어도 count는 업데이트 안 됨
}

// Props 변경 반영하려면
function Counter({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);
}
```

---

### 3. State 업데이트는 불변성 유지

```typescript
// ❌ 직접 수정
const updateUser = () => {
  user.name = "새 이름";
  setUser(user);  // 재렌더링 안 됨
};

// ✅ 새 객체 생성
const updateUser = () => {
  setUser({ ...user, name: "새 이름" });
};
```

---

## 요약

1. **Props**: 부모 → 자식, 읽기 전용, 함수도 전달 가능
2. **State**: 컴포넌트 내부, 변경 가능, 재렌더링 트리거
3. **불변성**: State 업데이트 시 새 객체/배열 생성
4. **함수형 업데이트**: 이전 상태 기반 업데이트
5. **State 끌어올리기**: 공통 부모로 State 이동
6. **Props Drilling**: Context API나 상태 관리 라이브러리로 해결

Props와 State를 올바르게 사용하면 React 컴포넌트를 효율적으로 관리할 수 있습니다.