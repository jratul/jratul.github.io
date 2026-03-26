---
title: "이벤트 처리"
order: 7
---

# 이벤트 처리

React에서 이벤트는 사용자의 행동(클릭, 키보드 입력, 마우스 이동 등)에 반응하는 방법입니다. HTML과 비슷하지만 몇 가지 차이가 있습니다.

---

## HTML vs React 이벤트

```html
<!-- HTML: 소문자, 문자열로 함수 전달 -->
<button onclick="handleClick()">클릭</button>

<!-- React: camelCase, 함수 자체를 전달 -->
<button onClick={handleClick}>클릭</button>
```

React의 이벤트 차이점:
- 이벤트 이름은 camelCase: `onClick`, `onChange`, `onSubmit`
- 함수 참조를 전달 (실행이 아님): `{handleClick}` (O), `{handleClick()}` (X)
- 기본 동작 막기: `event.preventDefault()` 사용

---

## 기본 클릭 이벤트

```tsx
function ButtonExample() {
  const handleClick = () => {
    alert("버튼이 클릭되었습니다!");
  };

  // 방법 1: 함수 참조
  return <button onClick={handleClick}>클릭하기</button>;

  // 방법 2: 인라인 화살표 함수
  return <button onClick={() => alert("클릭!")}>클릭하기</button>;

  // 방법 3: 매개변수가 필요한 경우 (화살표 함수로 래핑)
  return <button onClick={() => handleWithId(1)}>클릭하기</button>;
}

// 주의: 이렇게 하면 안 됨! (즉시 실행됨)
return <button onClick={handleClick()}>클릭하기</button>; // 괄호 없어야 함
```

---

## 이벤트 객체 (SyntheticEvent)

React의 이벤트 객체는 `SyntheticEvent`로 브라우저 이벤트를 감싼 것입니다.

```tsx
function InputExample() {
  // 이벤트 객체에서 값 읽기
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value; // 입력값
    console.log("입력값:", value);
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    console.log("클릭 위치:", event.clientX, event.clientY);
    event.preventDefault(); // 기본 동작 막기
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      console.log("엔터 키 눌림!");
    }
    if (event.ctrlKey && event.key === "s") {
      event.preventDefault(); // Ctrl+S 기본 동작 막기
      console.log("저장 단축키!");
    }
  };

  return (
    <div>
      <input
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="타이핑해보세요"
      />
      <button onClick={handleClick}>클릭</button>
    </div>
  );
}
```

---

## 주요 이벤트 타입들

```tsx
function EventTypes() {
  // 마우스 이벤트
  const handleMouseEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log(e.clientX, e.clientY); // 마우스 좌표
  };

  // 키보드 이벤트
  const handleKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log(e.key);      // "a", "Enter", "Escape"
    console.log(e.keyCode);  // 65, 13, 27
    console.log(e.ctrlKey);  // Ctrl 키 눌렸는지
  };

  // 폼 이벤트
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // 페이지 새로고침 방지
    console.log("폼 제출됨");
  };

  // 인풋 변경 이벤트
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);   // 현재 값
    console.log(e.target.checked); // 체크박스인 경우
  };

  // 셀렉트 변경 이벤트
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log(e.target.value); // 선택된 값
  };

  // 포커스 이벤트
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    console.log("포커스 받음");
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    console.log("포커스 잃음");
  };

  return (
    <div>
      <div
        onMouseMove={handleMouseEvent}
        onMouseEnter={() => console.log("마우스 진입")}
        onMouseLeave={() => console.log("마우스 이탈")}
      >
        마우스를 올려보세요
      </div>

      <input
        onKeyDown={handleKeyEvent}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />

      <select onChange={handleSelectChange}>
        <option value="apple">사과</option>
        <option value="banana">바나나</option>
      </select>

      <form onSubmit={handleSubmit}>
        <button type="submit">제출</button>
      </form>
    </div>
  );
}
```

---

## 이벤트 버블링과 전파 막기

```tsx
function EventBubbling() {
  const handleParentClick = () => {
    console.log("부모 클릭됨");
  };

  const handleChildClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 버블링 막기
    console.log("자식 클릭됨 (부모에 전파 안 됨)");
  };

  return (
    <div
      onClick={handleParentClick}
      style={{ padding: "20px", background: "lightblue" }}
    >
      <p>부모 영역</p>
      <button onClick={handleChildClick}>
        자식 버튼 (클릭해도 부모 핸들러 실행 안 됨)
      </button>
    </div>
  );
}
```

---

## 실전 예제: 로그인 폼

```tsx
import { useState } from "react";

interface LoginForm {
  email: string;
  password: string;
}

function LoginPage() {
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 인풋 변경 처리 (name 속성 활용)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError(null); // 입력 시 오류 초기화
  };

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // 기본 제출 동작 막기

    // 유효성 검사
    if (!form.email || !form.password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    if (!form.email.includes("@")) {
      setError("올바른 이메일 형식이 아닙니다.");
      return;
    }

    setIsLoading(true);
    try {
      // API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("로그인 성공:", form.email);
    } catch {
      setError("로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 키보드 단축키
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setForm({ email: "", password: "" });
      setError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      {error && (
        <div className="error-message" style={{ color: "red" }}>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email">이메일</label>
        <input
          id="email"
          name="email"         {/* handleChange에서 name으로 구분 */}
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="email@example.com"
          autoComplete="email"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password">비밀번호</label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="비밀번호 입력"
          autoComplete="current-password"
          disabled={isLoading}
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
```

---

## 실전 예제: 드래그 앤 드롭

```tsx
function DragDropList() {
  const [items, setItems] = useState(["항목 1", "항목 2", "항목 3", "항목 4"]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // dragover 기본 동작 막기 (드롭 허용)
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) return;

    const newItems = [...items];
    const [removed] = newItems.splice(dragIndex, 1); // 원래 위치에서 제거
    newItems.splice(dropIndex, 0, removed);           // 새 위치에 삽입
    setItems(newItems);
    setDragIndex(null);
  };

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {items.map((item, index) => (
        <li
          key={item}
          draggable
          onDragStart={e => handleDragStart(e, index)}
          onDragOver={e => handleDragOver(e, index)}
          onDrop={e => handleDrop(e, index)}
          style={{
            padding: "10px",
            margin: "5px",
            background: dragIndex === index ? "#ccc" : "#eee",
            cursor: "grab",
          }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
```

---

## 흔한 실수와 해결법

### 실수 1: 이벤트 핸들러 즉시 실행

```tsx
// 나쁜 예 - 렌더링 시 즉시 실행됨
<button onClick={handleDelete(item.id)}>삭제</button>

// 좋은 예 - 클릭 시 실행
<button onClick={() => handleDelete(item.id)}>삭제</button>

// 또는 함수를 반환하는 함수
const handleDelete = (id: number) => () => {
  console.log("삭제:", id);
};
<button onClick={handleDelete(item.id)}>삭제</button>
```

### 실수 2: 폼 제출 시 preventDefault 누락

```tsx
// 나쁜 예 - 폼 제출 시 페이지 새로고침됨
const handleSubmit = () => {
  console.log("제출");
};

// 좋은 예
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault(); // 페이지 새로고침 방지
  console.log("제출");
};
```

### 실수 3: 이벤트 타입 오류

```tsx
// 나쁜 예 - 타입이 없어 e.target.value 접근 오류
const handleChange = (e) => {
  setName(e.target.value);
};

// 좋은 예 - 정확한 타입 지정
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setName(e.target.value); // 자동완성 지원
};
```

---

## 주요 이벤트 타입 정리

| 이벤트 | React 타입 | 사용처 |
|--------|-----------|--------|
| 클릭 | `React.MouseEvent<T>` | button, div 등 |
| 변경 | `React.ChangeEvent<T>` | input, select, textarea |
| 제출 | `React.FormEvent<T>` | form |
| 키보드 | `React.KeyboardEvent<T>` | input, div 등 |
| 포커스 | `React.FocusEvent<T>` | input, button 등 |
| 드래그 | `React.DragEvent<T>` | 드래그 가능 요소 |
