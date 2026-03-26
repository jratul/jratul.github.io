---
title: "컴포넌트 기초"
order: 3
---

# 컴포넌트 기초

컴포넌트는 React의 핵심 단위입니다.
레고 블록을 생각해보세요. 레고로 성을 만들 때 똑같은 벽돌 블록을 여러 번 씁니다.
React 컴포넌트도 마찬가지입니다. 한 번 만든 컴포넌트를 여러 곳에서 재사용합니다.

---

## 컴포넌트란?

컴포넌트는 **UI의 독립적인 조각**입니다.
입력(props)을 받아서 화면에 표시할 JSX를 반환하는 함수입니다.

```tsx
// 가장 단순한 컴포넌트
function Hello() {
  return <h1>안녕하세요!</h1>;
}
```

이게 전부입니다. 함수 하나가 컴포넌트입니다.

---

## 함수형 컴포넌트

현재 React에서 권장하는 방식은 함수형 컴포넌트입니다.

```tsx
// 기본 함수 선언
function Greeting() {
  return <p>반갑습니다!</p>;
}

// 화살표 함수도 OK
const Greeting = () => {
  return <p>반갑습니다!</p>;
};

// 한 줄 반환 시 괄호 생략 가능
const Greeting = () => <p>반갑습니다!</p>;
```

**컴포넌트 이름은 반드시 대문자로 시작해야 합니다.**

```tsx
// 잘못된 코드 — 소문자로 시작하면 HTML 태그로 인식됨
function greeting() {
  return <p>안녕</p>;
}
// <greeting /> → React가 HTML 태그로 인식, 경고 발생

// 올바른 코드
function Greeting() {
  return <p>안녕</p>;
}
// <Greeting /> → React가 컴포넌트로 인식
```

---

## 컴포넌트 조합하기

작은 컴포넌트들을 조합해서 더 큰 컴포넌트를 만듭니다.

```tsx
// 작은 컴포넌트들
function Avatar({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{ width: 50, height: 50, borderRadius: '50%' }}
    />
  );
}

function UserName({ name }: { name: string }) {
  return <span className="username">{name}</span>;
}

function FollowButton() {
  return <button className="follow-btn">팔로우</button>;
}

// 조합해서 UserCard 만들기
function UserCard({ user }: { user: { name: string; avatar: string } }) {
  return (
    <div className="user-card">
      <Avatar src={user.avatar} alt={user.name} />  {/* 아바타 */}
      <UserName name={user.name} />                  {/* 이름 */}
      <FollowButton />                               {/* 팔로우 버튼 */}
    </div>
  );
}

// 여러 UserCard를 조합해서 피드 만들기
function Feed() {
  const users = [
    { id: 1, name: '김철수', avatar: '/avatars/kim.jpg' },
    { id: 2, name: '이영희', avatar: '/avatars/lee.jpg' },
  ];

  return (
    <div className="feed">
      {users.map(user => (
        <UserCard key={user.id} user={user} />  {/* 재사용! */}
      ))}
    </div>
  );
}
```

---

## 컴포넌트 분리의 기준

컴포넌트를 언제 분리해야 할까요?

**분리해야 할 때:**
- 같은 UI 조각이 여러 곳에서 반복될 때
- 컴포넌트가 너무 길어질 때 (100줄 이상이면 고려)
- 독립적으로 테스트하고 싶을 때
- 논리적으로 독립된 기능을 가질 때

```tsx
// 분리 전 — 너무 긴 컴포넌트
function ProductPage() {
  return (
    <div>
      {/* 헤더 관련 코드 30줄 */}
      {/* 상품 이미지 관련 코드 20줄 */}
      {/* 상품 정보 관련 코드 40줄 */}
      {/* 리뷰 관련 코드 50줄 */}
      {/* 추천 상품 관련 코드 30줄 */}
    </div>
  );
}

// 분리 후 — 읽기 쉬운 구조
function ProductPage() {
  return (
    <div>
      <ProductHeader />      {/* 헤더 */}
      <ProductImages />      {/* 이미지 갤러리 */}
      <ProductInfo />        {/* 가격, 설명 */}
      <ReviewSection />      {/* 리뷰 */}
      <RelatedProducts />    {/* 추천 상품 */}
    </div>
  );
}
```

---

## 컴포넌트 파일 구조

실제 프로젝트에서는 컴포넌트를 별도 파일로 분리합니다.

```
src/
├── components/
│   ├── Button.tsx          ← 단일 컴포넌트
│   ├── Card/
│   │   ├── index.tsx       ← 메인 컴포넌트
│   │   ├── CardHeader.tsx  ← 하위 컴포넌트
│   │   └── CardBody.tsx    ← 하위 컴포넌트
│   └── layout/
│       ├── Header.tsx
│       └── Footer.tsx
└── pages/
    ├── Home.tsx
    └── About.tsx
```

```tsx
// src/components/Button.tsx
interface ButtonProps {
  label: string;        // 버튼 텍스트
  onClick: () => void;  // 클릭 핸들러
  variant?: 'primary' | 'secondary';  // 버튼 스타일 (선택)
}

function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}  // variant에 따라 다른 스타일
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default Button;  // 외부에서 사용할 수 있도록 내보내기
```

```tsx
// src/pages/Home.tsx
import Button from '../components/Button';  // 컴포넌트 가져오기

function Home() {
  return (
    <div>
      <Button label="시작하기" onClick={() => console.log('시작!')} />
      <Button label="취소" onClick={() => console.log('취소!')} variant="secondary" />
    </div>
  );
}

export default Home;
```

---

## children prop — 컴포넌트 안에 내용 넣기

HTML에서 `<div>내용</div>`처럼 태그 안에 내용을 넣을 수 있습니다.
React 컴포넌트도 `children` prop으로 같은 것을 할 수 있습니다.

```tsx
// children을 받는 컴포넌트
interface CardProps {
  title: string;
  children: React.ReactNode;  // 어떤 JSX든 받을 수 있는 타입
}

function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h2 className="card-title">{title}</h2>
      <div className="card-body">
        {children}  {/* 부모가 전달한 내용이 여기 들어감 */}
      </div>
    </div>
  );
}

// 사용 예
function App() {
  return (
    <Card title="오늘의 할 일">
      {/* Card 안에 넣은 내용이 children이 된다 */}
      <p>React 공부하기</p>
      <p>운동하기</p>
      <button>완료</button>
    </Card>
  );
}
```

`children`은 레이아웃 컴포넌트(Modal, Card, Panel 등)를 만들 때 매우 유용합니다.

---

## 실전 예제: Todo 앱 컴포넌트 분리

```tsx
// src/types/todo.ts — 타입 정의
interface Todo {
  id: number;
  text: string;
  done: boolean;
}

// src/components/TodoItem.tsx — 개별 할 일 항목
interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;    // 완료 토글
  onDelete: (id: number) => void;    // 삭제
}

function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <li className="todo-item">
      <input
        type="checkbox"
        checked={todo.done}              // 완료 여부 체크박스
        onChange={() => onToggle(todo.id)}  // 토글 핸들러
      />
      <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
        {todo.text}
      </span>
      <button onClick={() => onDelete(todo.id)}>삭제</button>
    </li>
  );
}

// src/components/TodoList.tsx — 할 일 목록
interface TodoListProps {
  todos: Todo[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

function TodoList({ todos, onToggle, onDelete }: TodoListProps) {
  if (todos.length === 0) {
    return <p className="empty">할 일이 없습니다. 추가해보세요!</p>;
  }

  return (
    <ul className="todo-list">
      {todos.map(todo => (
        <TodoItem
          key={todo.id}           // 고유한 key 필수
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

// src/components/TodoInput.tsx — 입력 폼
interface TodoInputProps {
  onAdd: (text: string) => void;
}

function TodoInput({ onAdd }: TodoInputProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();  // 폼 기본 동작(페이지 새로고침) 막기
    const form = e.currentTarget;
    const input = form.elements.namedItem('todo') as HTMLInputElement;

    if (input.value.trim()) {       // 빈 값 체크
      onAdd(input.value.trim());    // 부모에게 추가 요청
      input.value = '';             // 입력 필드 초기화
    }
  };

  return (
    <form onSubmit={handleSubmit} className="todo-input">
      <input
        name="todo"
        type="text"
        placeholder="할 일을 입력하세요"
      />
      <button type="submit">추가</button>
    </form>
  );
}
```

---

## 컴포넌트의 렌더링 조건

React는 다음 상황에서 컴포넌트를 다시 렌더링(re-render)합니다:

1. **state**가 변경될 때
2. **props**가 변경될 때
3. 부모 컴포넌트가 렌더링될 때

```tsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>+</button>
      {/* count가 바뀌면 Parent가 리렌더링되고, Child도 리렌더링된다 */}
      <Child message="안녕" />
    </div>
  );
}

function Child({ message }: { message: string }) {
  console.log('Child 렌더링!');  // 부모가 렌더링될 때마다 출력됨
  return <p>{message}</p>;
}
```

---

## 핵심 요약

- 컴포넌트 = props를 받아 JSX를 반환하는 함수
- 이름은 반드시 대문자로 시작
- 작은 컴포넌트를 조합해서 큰 컴포넌트를 만든다 (레고 블록)
- `children` prop으로 컴포넌트 내부에 다른 JSX를 넣을 수 있다
- 파일로 분리해서 재사용성과 가독성을 높인다
- state/props 변경 시 자동으로 리렌더링된다

다음 단계에서는 컴포넌트 간 데이터 전달인 **Props**를 배웁니다.
