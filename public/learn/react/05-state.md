---
title: "State와 useState"
order: 5
---

# State와 useState

State는 컴포넌트의 기억입니다. 사용자가 버튼을 클릭하거나, 입력값을 바꾸거나, 데이터를 불러오면 화면을 다시 그려야 하는데, 이때 State가 변경을 기억하고 React에게 "다시 렌더링해!" 라고 알려줍니다.

---

## State가 왜 필요한가?

```tsx
// 일반 변수는 렌더링해도 초기화됨
function Counter() {
  let count = 0; // 렌더링할 때마다 0으로 초기화됨

  return (
    <div>
      <p>현재 카운트: {count}</p>
      <button onClick={() => { count += 1; console.log(count); }}>
        증가
      </button>
      {/* 콘솔에는 숫자가 증가하지만 화면은 변하지 않음! */}
    </div>
  );
}
```

State를 사용하면 값이 바뀔 때 React가 자동으로 화면을 다시 그립니다.

---

## useState 기본 사용법

```tsx
import { useState } from "react";

function Counter() {
  // [현재 상태값, 상태 변경 함수] = useState(초기값)
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>현재 카운트: {count}</p>
      <button onClick={() => setCount(count + 1)}>증가</button>
      <button onClick={() => setCount(count - 1)}>감소</button>
      <button onClick={() => setCount(0)}>초기화</button>
    </div>
  );
}
```

`useState`는 배열을 반환합니다:
- **첫 번째 요소**: 현재 상태값
- **두 번째 요소**: 상태를 바꾸는 함수

---

## TypeScript와 함께 사용

```tsx
import { useState } from "react";

// 타입을 명시적으로 지정
const [name, setName] = useState<string>("");
const [age, setAge] = useState<number>(0);
const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
const [items, setItems] = useState<string[]>([]);

// 객체 상태
interface User {
  id: number;
  name: string;
  email: string;
}

const [user, setUser] = useState<User | null>(null);

// 초기값으로 타입 추론도 가능 (타입 생략)
const [count, setCount] = useState(0);         // number로 추론
const [text, setText] = useState("");           // string으로 추론
const [flag, setFlag] = useState(false);        // boolean으로 추론
```

---

## State 업데이트 방법

### 단순 값 업데이트

```tsx
function ToggleButton() {
  const [isOn, setIsOn] = useState(false);

  return (
    <button onClick={() => setIsOn(!isOn)}>
      {isOn ? "켜짐 ✅" : "꺼짐 ❌"}
    </button>
  );
}
```

### 함수형 업데이트 (이전 값 기반)

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  // 나쁜 예: 여러 번 연속 호출 시 문제 가능
  const addThree = () => {
    setCount(count + 1); // count는 현재 0
    setCount(count + 1); // count는 여전히 0 (갱신 전!)
    setCount(count + 1); // count는 여전히 0
    // 결과: 1 (3이 아님!)
  };

  // 좋은 예: 함수형 업데이트 (이전 값을 보장)
  const addThreeCorrect = () => {
    setCount(prev => prev + 1); // prev = 0, 결과: 1
    setCount(prev => prev + 1); // prev = 1, 결과: 2
    setCount(prev => prev + 1); // prev = 2, 결과: 3
    // 결과: 3 (정확함!)
  };

  return (
    <div>
      <p>{count}</p>
      <button onClick={addThreeCorrect}>3 더하기</button>
    </div>
  );
}
```

---

## 객체 State 업데이트

객체를 State로 사용할 때는 **불변성**을 지켜야 합니다. 직접 수정하지 말고 새 객체를 만들어야 합니다.

```tsx
interface UserForm {
  name: string;
  email: string;
  age: number;
}

function UserFormComponent() {
  const [form, setForm] = useState<UserForm>({
    name: "",
    email: "",
    age: 0,
  });

  // 나쁜 예: 직접 수정 (React가 변경을 감지 못함)
  const badUpdate = () => {
    form.name = "김철수"; // 직접 수정 금지!
    setForm(form);        // 같은 참조라 React가 변경 감지 못함
  };

  // 좋은 예: 스프레드로 새 객체 생성
  const handleNameChange = (name: string) => {
    setForm({ ...form, name }); // 나머지는 그대로, name만 변경
  };

  const handleEmailChange = (email: string) => {
    setForm(prev => ({ ...prev, email })); // 함수형으로도 가능
  };

  return (
    <form>
      <input
        value={form.name}
        onChange={e => handleNameChange(e.target.value)}
        placeholder="이름"
      />
      <input
        value={form.email}
        onChange={e => handleEmailChange(e.target.value)}
        placeholder="이메일"
      />
      <input
        type="number"
        value={form.age}
        onChange={e => setForm(prev => ({ ...prev, age: Number(e.target.value) }))}
        placeholder="나이"
      />
    </form>
  );
}
```

---

## 배열 State 업데이트

```tsx
function TodoApp() {
  const [todos, setTodos] = useState<{ id: number; text: string; done: boolean }[]>([]);
  const [inputText, setInputText] = useState("");

  // 항목 추가
  const addTodo = () => {
    if (!inputText.trim()) return;
    setTodos(prev => [
      ...prev, // 기존 항목 유지
      { id: Date.now(), text: inputText, done: false }, // 새 항목 추가
    ]);
    setInputText(""); // 입력창 초기화
  };

  // 완료 상태 토글
  const toggleTodo = (id: number) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      )
    );
  };

  // 항목 삭제
  const deleteTodo = (id: number) => {
    setTodos(prev => prev.filter(todo => todo.id !== id)); // 해당 id 제외
  };

  return (
    <div>
      <div>
        <input
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="할 일 입력..."
          onKeyDown={e => e.key === "Enter" && addTodo()}
        />
        <button onClick={addTodo}>추가</button>
      </div>
      <ul>
        {todos.map(todo => (
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
      <p>총 {todos.length}개 / 완료 {todos.filter(t => t.done).length}개</p>
    </div>
  );
}
```

---

## 여러 State vs 하나의 객체 State

```tsx
// 방법 1: 여러 State (관련 없는 값들에 적합)
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // isLoading은 email/password와 독립적이라 분리가 나음
}

// 방법 2: 하나의 객체 State (관련 있는 값들에 적합)
function UserProfile() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    bio: "",
    // 다 함께 변경되는 경우가 많으므로 묶는 게 나음
  });
}
```

---

## 상태 끌어올리기 (Lifting State Up)

여러 컴포넌트가 같은 State를 공유해야 할 때는 공통 부모로 State를 올립니다.

```tsx
// 형제 컴포넌트들이 같은 값을 공유할 때
function TemperatureInput({
  celsius,
  onChange,
}: {
  celsius: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label>섭씨: </label>
      <input
        type="number"
        value={celsius}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function FahrenheitDisplay({ celsius }: { celsius: number }) {
  const fahrenheit = (celsius * 9) / 5 + 32;
  return <p>화씨: {fahrenheit.toFixed(1)}°F</p>;
}

// 부모에서 상태를 관리하고 자식들에 내려줌
function TemperatureConverter() {
  const [celsius, setCelsius] = useState(0); // 상태를 부모에서 관리

  return (
    <div>
      <TemperatureInput celsius={celsius} onChange={setCelsius} />
      <FahrenheitDisplay celsius={celsius} />
    </div>
  );
}
```

---

## 흔한 실수와 해결법

### 실수 1: State 직접 수정

```tsx
// 나쁜 예 - 직접 수정
const [user, setUser] = useState({ name: "김철수", age: 25 });
user.age = 26;  // 직접 수정! React가 변경 감지 못함

// 좋은 예 - 새 객체 생성
setUser(prev => ({ ...prev, age: 26 }));
```

### 실수 2: 렌더링 중 State 변경

```tsx
// 나쁜 예 - 렌더링 중 setState 호출 (무한 루프!)
function BadComponent() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // 렌더링할 때마다 호출 → 무한 루프!
  return <div>{count}</div>;
}

// 좋은 예 - 이벤트 핸들러나 useEffect 안에서 호출
function GoodComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### 실수 3: 비동기 콜백에서 오래된 State

```tsx
// 나쁜 예 - 클로저로 인해 오래된 값 참조
const [count, setCount] = useState(0);
setTimeout(() => {
  setCount(count + 1); // count가 0에 고정될 수 있음
}, 1000);

// 좋은 예 - 함수형 업데이트로 항상 최신 값 사용
setTimeout(() => {
  setCount(prev => prev + 1); // 항상 최신 값 사용
}, 1000);
```

---

## 정리

- `useState`는 컴포넌트의 기억장치
- State가 변경되면 React는 컴포넌트를 다시 렌더링
- 객체/배열 State는 직접 수정하지 않고 새로 만들어야 함 (불변성)
- 연속 업데이트는 함수형 업데이트 사용 (`prev => prev + 1`)
- 여러 컴포넌트가 공유하는 State는 공통 부모로 올리기 (상태 끌어올리기)
