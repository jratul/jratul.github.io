---
title: "상태관리 (Zustand)"
order: 14
---

# 상태관리: Zustand

앱이 커지면 여러 컴포넌트에서 같은 상태를 공유해야 하는 경우가 많아집니다. Context API로도 가능하지만, Zustand는 더 간단하고 성능이 좋은 상태관리 라이브러리입니다.

---

## Zustand란?

Zustand(독일어로 "상태")는 매우 간단한 상태관리 라이브러리입니다.

- Redux보다 훨씬 간단한 보일러플레이트
- Context API보다 성능이 좋음 (구독하는 값만 바뀌면 리렌더링)
- TypeScript 지원 우수

```bash
npm install zustand
```

---

## 기본 사용법

```tsx
import { create } from "zustand";

// 1. 스토어 정의
interface CounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

const useCounterStore = create<CounterStore>((set) => ({
  count: 0, // 초기 상태

  // 액션: 상태를 변경하는 함수
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));

// 2. 컴포넌트에서 사용
function Counter() {
  // 필요한 값만 구독 (count만 바뀌면 이 컴포넌트만 리렌더링)
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const { decrement, reset } = useCounterStore((state) => ({
    decrement: state.decrement,
    reset: state.reset,
  }));

  return (
    <div>
      <p>카운트: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>초기화</button>
    </div>
  );
}

// 다른 컴포넌트에서도 같은 스토어 사용
function CountDisplay() {
  const count = useCounterStore((state) => state.count);
  return <h2>현재 카운트: {count}</h2>;
}
```

---

## Context API와 비교

```tsx
// Context API: 모든 구독자가 리렌더링됨
const CountContext = createContext({ count: 0, user: null, cart: [] });

function Component() {
  const { count } = useContext(CountContext);
  // count를 보는데, user나 cart가 바뀌어도 리렌더링됨!
}

// Zustand: 구독한 값만 바뀔 때 리렌더링
const useStore = create((set) => ({
  count: 0,
  user: null,
  cart: [],
}));

function Component() {
  const count = useStore((state) => state.count);
  // count만 구독: count가 바뀔 때만 리렌더링!
}
```

---

## 실전 예제: Todo 앱

```tsx
// stores/todoStore.ts
import { create } from "zustand";

interface Todo {
  id: number;
  text: string;
  done: boolean;
  createdAt: Date;
}

type Filter = "all" | "active" | "done";

interface TodoStore {
  todos: Todo[];
  filter: Filter;

  // 액션들
  addTodo: (text: string) => void;
  toggleTodo: (id: number) => void;
  deleteTodo: (id: number) => void;
  setFilter: (filter: Filter) => void;
  clearDone: () => void;

  // 계산된 값 (getter처럼 사용)
  filteredTodos: () => Todo[];
  doneCount: () => number;
}

const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  filter: "all",

  addTodo: (text: string) =>
    set((state) => ({
      todos: [
        ...state.todos,
        { id: Date.now(), text, done: false, createdAt: new Date() },
      ],
    })),

  toggleTodo: (id: number) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      ),
    })),

  deleteTodo: (id: number) =>
    set((state) => ({
      todos: state.todos.filter((todo) => todo.id !== id),
    })),

  setFilter: (filter: Filter) => set({ filter }),

  clearDone: () =>
    set((state) => ({
      todos: state.todos.filter((todo) => !todo.done),
    })),

  // get()으로 현재 상태에 접근
  filteredTodos: () => {
    const { todos, filter } = get();
    switch (filter) {
      case "active": return todos.filter((t) => !t.done);
      case "done": return todos.filter((t) => t.done);
      default: return todos;
    }
  },

  doneCount: () => get().todos.filter((t) => t.done).length,
}));

// 컴포넌트들 (간결하게)
function TodoInput() {
  const addTodo = useTodoStore((s) => s.addTodo);
  const [text, setText] = useState("");

  const handleAdd = () => {
    if (text.trim()) {
      addTodo(text.trim());
      setText("");
    }
  };

  return (
    <div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="할 일 추가..."
      />
      <button onClick={handleAdd}>추가</button>
    </div>
  );
}

function TodoFilter() {
  const filter = useTodoStore((s) => s.filter);
  const setFilter = useTodoStore((s) => s.setFilter);
  const clearDone = useTodoStore((s) => s.clearDone);
  const doneCount = useTodoStore((s) => s.doneCount());

  return (
    <div>
      {(["all", "active", "done"] as Filter[]).map((f) => (
        <button
          key={f}
          onClick={() => setFilter(f)}
          style={{ fontWeight: filter === f ? "bold" : "normal" }}
        >
          {f === "all" ? "전체" : f === "active" ? "미완료" : "완료"}
        </button>
      ))}
      {doneCount > 0 && (
        <button onClick={clearDone}>완료 항목 삭제 ({doneCount})</button>
      )}
    </div>
  );
}

function TodoList() {
  const filteredTodos = useTodoStore((s) => s.filteredTodos());
  const toggleTodo = useTodoStore((s) => s.toggleTodo);
  const deleteTodo = useTodoStore((s) => s.deleteTodo);

  if (filteredTodos.length === 0) {
    return <p>항목이 없습니다.</p>;
  }

  return (
    <ul>
      {filteredTodos.map((todo) => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.done}
            onChange={() => toggleTodo(todo.id)}
          />
          <span style={{ textDecoration: todo.done ? "line-through" : "none" }}>
            {todo.text}
          </span>
          <button onClick={() => deleteTodo(todo.id)}>삭제</button>
        </li>
      ))}
    </ul>
  );
}

function TodoApp() {
  const total = useTodoStore((s) => s.todos.length);
  const done = useTodoStore((s) => s.doneCount());

  return (
    <div>
      <h1>할 일 목록</h1>
      <p>{done}/{total} 완료</p>
      <TodoInput />
      <TodoFilter />
      <TodoList />
    </div>
  );
}
```

---

## 영속성 (Persistence): localStorage에 저장

```tsx
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsStore {
  theme: "light" | "dark";
  language: "ko" | "en";
  fontSize: number;
  setTheme: (theme: "light" | "dark") => void;
  setLanguage: (lang: "ko" | "en") => void;
  setFontSize: (size: number) => void;
}

const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: "light",
      language: "ko",
      fontSize: 16,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    {
      name: "app-settings", // localStorage 키 이름
      // 저장할 항목 선택 (일부만 저장하고 싶을 때)
      // partialize: (state) => ({ theme: state.theme }),
    }
  )
);

// 앱을 새로고침해도 설정이 유지됨!
function SettingsPanel() {
  const { theme, language, fontSize, setTheme, setLanguage, setFontSize } =
    useSettingsStore();

  return (
    <div>
      <select value={theme} onChange={(e) => setTheme(e.target.value as any)}>
        <option value="light">라이트</option>
        <option value="dark">다크</option>
      </select>
      <select value={language} onChange={(e) => setLanguage(e.target.value as any)}>
        <option value="ko">한국어</option>
        <option value="en">English</option>
      </select>
      <input
        type="range"
        min={12}
        max={24}
        value={fontSize}
        onChange={(e) => setFontSize(Number(e.target.value))}
      />
      <span>{fontSize}px</span>
    </div>
  );
}
```

---

## 여러 스토어 조합

```tsx
// 스토어를 작게 분리하기 (단일 책임 원칙)

// stores/authStore.ts
interface AuthStore {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const useAuthStore = create<AuthStore>()(...);

// stores/cartStore.ts
interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: number) => void;
  clear: () => void;
  total: () => number;
}

const useCartStore = create<CartStore>()(...);

// 컴포넌트에서 여러 스토어 사용
function Header() {
  const user = useAuthStore((s) => s.user);
  const itemCount = useCartStore((s) => s.items.length);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header>
      <span>{user?.name}</span>
      <span>장바구니 {itemCount}개</span>
      <button onClick={logout}>로그아웃</button>
    </header>
  );
}
```

---

## 비동기 액션

```tsx
interface UserStore {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  createUser: (data: { name: string; email: string }) => Promise<void>;
}

const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/users");
      const users = await response.json();
      set({ users, loading: false });
    } catch (error) {
      set({ error: "사용자 목록을 불러오지 못했습니다.", loading: false });
    }
  },

  createUser: async (data) => {
    set({ loading: true });
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const newUser = await response.json();
      set((state) => ({
        users: [...state.users, newUser],
        loading: false,
      }));
    } catch (error) {
      set({ error: "사용자 생성 실패", loading: false });
    }
  },
}));

// 사용
function UserList() {
  const { users, loading, error, fetchUsers } = useUserStore();

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <p>로딩 중...</p>;
  if (error) return <p>오류: {error}</p>;

  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

---

## 흔한 실수와 해결법

### 실수: 스토어 전체 구독

```tsx
// 나쁜 예 - 스토어 전체를 구독하면 어떤 값이 바뀌어도 리렌더링
const store = useCounterStore(); // 모든 변경에 반응

// 좋은 예 - 필요한 값만 선택해서 구독
const count = useCounterStore((state) => state.count); // count만 바뀌면 반응
```

### 실수: 스토어에서 불변성 위반

```tsx
// 나쁜 예 - 배열을 직접 수정
addTodo: (text) =>
  set((state) => {
    state.todos.push({ id: Date.now(), text }); // 직접 수정!
    return state;
  }),

// 좋은 예 - 새 배열 생성
addTodo: (text) =>
  set((state) => ({
    todos: [...state.todos, { id: Date.now(), text }], // 새 배열
  })),
```

---

## 정리

Zustand의 핵심 3단계:
1. `create()`로 스토어 만들기 (상태 + 액션 정의)
2. 컴포넌트에서 `useStore((state) => state.value)`로 구독
3. 액션 함수를 호출해서 상태 변경

| 기능 | 코드 |
|------|------|
| 스토어 생성 | `create<T>((set, get) => ({...}))` |
| 상태 읽기 | `useStore(state => state.value)` |
| 상태 변경 | `set(state => ({...}))` |
| 현재 상태 접근 | `get().value` |
| 영속성 | `persist(...)` 미들웨어 |
