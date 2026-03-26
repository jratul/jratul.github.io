---
title: "조건부 렌더링과 리스트"
order: 8
---

# 조건부 렌더링과 리스트

React에서 조건에 따라 다른 화면을 보여주거나, 배열 데이터를 목록으로 출력하는 방법을 배웁니다.

---

## 조건부 렌더링

### if 문 사용

```tsx
function UserGreeting({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) {
    return <h1>환영합니다!</h1>;
  } else {
    return <h1>로그인해 주세요.</h1>;
  }
}
```

### 삼항 연산자 `? :`

JSX 안에서 가장 많이 사용하는 패턴입니다.

```tsx
function UserStatus({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div>
      {isLoggedIn ? (
        <p>✅ 로그인 상태</p>
      ) : (
        <p>❌ 로그아웃 상태</p>
      )}
    </div>
  );
}
```

### 단축 평가 `&&`

조건이 true일 때만 렌더링합니다. (else가 필요 없을 때)

```tsx
function Notification({ hasNewMessage, count }: { hasNewMessage: boolean; count: number }) {
  return (
    <div>
      {hasNewMessage && (
        <div className="notification">
          새 메시지 {count}개가 있습니다!
        </div>
      )}
    </div>
  );
}

// 주의: 0은 falsy이지만 React가 0을 렌더링함!
function BadExample({ count }: { count: number }) {
  return (
    <div>
      {count && <span>{count}개</span>}
      {/* count가 0이면 "0"이 렌더링됨! */}
    </div>
  );
}

// 올바른 방법: 명시적 비교
function GoodExample({ count }: { count: number }) {
  return (
    <div>
      {count > 0 && <span>{count}개</span>}
      {/* count가 0이면 아무것도 렌더링 안 됨 */}
    </div>
  );
}
```

---

## null 반환으로 컴포넌트 숨기기

```tsx
function WarningBanner({ show, message }: { show: boolean; message: string }) {
  if (!show) {
    return null; // null을 반환하면 아무것도 렌더링 안 됨
  }

  return (
    <div className="warning">
      ⚠️ {message}
    </div>
  );
}

function App() {
  const [showWarning, setShowWarning] = useState(false);

  return (
    <div>
      <WarningBanner show={showWarning} message="주의! 저장하지 않은 내용이 있습니다." />
      <button onClick={() => setShowWarning(!showWarning)}>
        경고 {showWarning ? "숨기기" : "보이기"}
      </button>
    </div>
  );
}
```

---

## 로딩/에러 상태 패턴

```tsx
interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function DataView({ state }: { state: DataState<string[]> }) {
  if (state.loading) {
    return (
      <div className="loading">
        <span>⏳ 로딩 중...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="error">
        <p>❌ 오류: {state.error}</p>
        <button>다시 시도</button>
      </div>
    );
  }

  if (!state.data || state.data.length === 0) {
    return (
      <div className="empty">
        <p>📭 표시할 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <ul>
      {state.data.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}
```

---

## 리스트 렌더링

배열을 `map()`으로 변환해서 JSX 배열로 만듭니다.

```tsx
function FruitList() {
  const fruits = ["사과", "바나나", "딸기", "포도"];

  return (
    <ul>
      {fruits.map((fruit, index) => (
        <li key={index}>{fruit}</li>
      ))}
    </ul>
  );
}
```

---

## key Props의 중요성

key는 React가 어떤 항목이 변경/추가/삭제됐는지 파악하기 위한 고유 식별자입니다.

```tsx
interface Todo {
  id: number;
  text: string;
  done: boolean;
}

function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map(todo => (
        // id를 key로 사용 (고유하고 안정적)
        <li key={todo.id} style={{ textDecoration: todo.done ? "line-through" : "none" }}>
          {todo.text}
        </li>
      ))}
    </ul>
  );
}

// 나쁜 key 사용 예시
function BadList({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item, index) => (
        // index를 key로 쓰면 안 됨 (항목 추가/삭제/정렬 시 문제)
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

// key는 형제 노드 사이에서만 고유하면 됨
function App() {
  return (
    <div>
      <ul>
        <li key="1">첫 번째 리스트의 1</li>  {/* OK */}
      </ul>
      <ul>
        <li key="1">두 번째 리스트의 1</li>  {/* OK: 다른 리스트에서는 중복 가능 */}
      </ul>
    </div>
  );
}
```

---

## 필터링과 정렬

```tsx
interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

function ProductList({ products }: { products: Product[] }) {
  const [filter, setFilter] = useState("all"); // "all", "inStock", "outOfStock"
  const [sortBy, setSortBy] = useState<"name" | "price">("name");
  const [searchQuery, setSearchQuery] = useState("");

  // 필터 + 검색 + 정렬 적용
  const displayedProducts = products
    .filter(p => {
      if (filter === "inStock") return p.inStock;
      if (filter === "outOfStock") return !p.inStock;
      return true; // "all"
    })
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a.price - b.price;
    });

  return (
    <div>
      <div className="controls">
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="상품 검색..."
        />
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">전체</option>
          <option value="inStock">재고 있음</option>
          <option value="outOfStock">품절</option>
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as "name" | "price")}
        >
          <option value="name">이름순</option>
          <option value="price">가격순</option>
        </select>
      </div>

      <p>총 {displayedProducts.length}개 상품</p>

      <ul>
        {displayedProducts.map(product => (
          <li key={product.id}>
            <span>{product.name}</span>
            <span>{product.price.toLocaleString()}원</span>
            <span>{product.inStock ? "재고 있음" : "품절"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 중첩 리스트

```tsx
interface Category {
  id: number;
  name: string;
  items: Array<{ id: number; label: string }>;
}

function CategoryList({ categories }: { categories: Category[] }) {
  return (
    <div>
      {categories.map(category => (
        <div key={category.id}>  {/* 외부 key */}
          <h3>{category.name}</h3>
          <ul>
            {category.items.map(item => (
              <li key={item.id}>{item.label}</li>  {/* 내부 key */}
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

---

## 실전 예제: 할 일 목록 완성판

```tsx
import { useState } from "react";

interface Todo {
  id: number;
  text: string;
  done: boolean;
  priority: "low" | "medium" | "high";
}

type FilterType = "all" | "active" | "done";

function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: "React 공부하기", done: false, priority: "high" },
    { id: 2, text: "운동하기", done: true, priority: "medium" },
  ]);
  const [inputText, setInputText] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const addTodo = () => {
    if (!inputText.trim()) return;
    setTodos(prev => [
      ...prev,
      { id: Date.now(), text: inputText.trim(), done: false, priority: "medium" },
    ]);
    setInputText("");
  };

  const toggleTodo = (id: number) => {
    setTodos(prev =>
      prev.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo)
    );
  };

  const deleteTodo = (id: number) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === "active") return !todo.done;
    if (filter === "done") return todo.done;
    return true;
  });

  const doneCount = todos.filter(t => t.done).length;

  return (
    <div>
      <h1>할 일 목록</h1>
      <p>{doneCount}/{todos.length} 완료</p>

      {/* 입력 영역 */}
      <div>
        <input
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTodo()}
          placeholder="새 할 일 추가..."
        />
        <button onClick={addTodo}>추가</button>
      </div>

      {/* 필터 버튼 */}
      <div>
        {(["all", "active", "done"] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ fontWeight: filter === f ? "bold" : "normal" }}
          >
            {f === "all" ? "전체" : f === "active" ? "미완료" : "완료"}
          </button>
        ))}
      </div>

      {/* 할 일 목록 */}
      {filteredTodos.length === 0 ? (
        <p>표시할 할 일이 없습니다.</p>
      ) : (
        <ul>
          {filteredTodos.map(todo => (
            <li key={todo.id} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
              />
              <span style={{ textDecoration: todo.done ? "line-through" : "none" }}>
                {todo.text}
              </span>
              <span className={`priority-${todo.priority}`}>
                {todo.priority === "high" ? "🔴" : todo.priority === "medium" ? "🟡" : "🟢"}
              </span>
              <button onClick={() => deleteTodo(todo.id)}>삭제</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 흔한 실수와 해결법

### 실수 1: key를 index로 사용

```tsx
// 나쁜 예 - 정렬/삭제 시 버그 발생
todos.map((todo, index) => <li key={index}>{todo.text}</li>)

// 좋은 예 - 고유 id 사용
todos.map(todo => <li key={todo.id}>{todo.text}</li>)
```

### 실수 2: 0 (zero) 렌더링

```tsx
// 나쁜 예 - count가 0이면 "0"이 화면에 나타남
{count && <span>{count}개</span>}

// 좋은 예
{count > 0 && <span>{count}개</span>}
// 또는
{!!count && <span>{count}개</span>}
// 또는 삼항 연산자
{count ? <span>{count}개</span> : null}
```

### 실수 3: 리스트를 렌더링 중에 직접 수정

```tsx
// 나쁜 예
todos.sort((a, b) => a.text.localeCompare(b.text)); // todos를 직접 변경!

// 좋은 예 - 복사 후 정렬
[...todos].sort((a, b) => a.text.localeCompare(b.text))
```

---

## 정리

| 패턴 | 사용 상황 |
|------|---------|
| `if/else` 반환 | 컴포넌트 전체를 조건에 따라 변경 |
| `삼항 연산자` | JSX 안에서 둘 중 하나 선택 |
| `&&` 단축 평가 | 조건이 true일 때만 렌더링 |
| `null` 반환 | 컴포넌트 완전히 숨기기 |
| `.map()` | 배열을 리스트로 렌더링 |
| `.filter()` | 조건에 맞는 항목만 표시 |
| `key` Props | 리스트 항목의 고유 식별자 (항상 필요!) |
