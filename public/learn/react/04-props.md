---
title: "Props"
order: 4
---

# Props

Props는 부모 컴포넌트가 자식 컴포넌트에게 데이터를 전달하는 방법입니다. 택배 상자처럼, 부모가 자식에게 필요한 것들을 담아 보내는 소포라고 생각하면 됩니다.

---

## Props란?

```
부모 컴포넌트
     │
     │ props = { name: "김철수", age: 25 }
     ↓
자식 컴포넌트 (props를 받아 화면에 표시)
```

컴포넌트는 레고 블록과 같습니다. 같은 블록(컴포넌트)에 다른 색상(props)을 넣으면 다른 결과물이 나옵니다.

---

## 기본 Props 사용

```tsx
// 자식 컴포넌트: props를 받아서 사용
function Greeting(props: { name: string }) {
  return <h1>안녕하세요, {props.name}님!</h1>;
}

// 부모 컴포넌트: props를 내려보냄
function App() {
  return (
    <div>
      <Greeting name="김철수" />  {/* name props 전달 */}
      <Greeting name="이영희" />  {/* 같은 컴포넌트, 다른 name */}
      <Greeting name="박민준" />
    </div>
  );
}
```

---

## TypeScript로 Props 타입 정의

```tsx
// Props 타입을 interface로 정의
interface UserCardProps {
  name: string;        // 필수
  email: string;       // 필수
  age: number;         // 필수
  bio?: string;        // 선택 (없어도 됨)
  isAdmin?: boolean;   // 선택 (기본값: false)
}

function UserCard({ name, email, age, bio, isAdmin = false }: UserCardProps) {
  return (
    <div className="card">
      <h2>{name}</h2>
      <p>이메일: {email}</p>
      <p>나이: {age}세</p>
      {bio && <p>소개: {bio}</p>}   {/* bio가 있을 때만 표시 */}
      {isAdmin && <span className="badge">관리자</span>}
    </div>
  );
}

// 사용
function App() {
  return (
    <div>
      <UserCard
        name="김철수"
        email="kim@example.com"
        age={25}
        bio="TypeScript를 좋아합니다"
        isAdmin={true}
      />
      <UserCard
        name="이영희"
        email="lee@example.com"
        age={23}
        {/* bio, isAdmin 생략 가능 (선택적) */}
      />
    </div>
  );
}
```

---

## 구조 분해 할당으로 Props 받기

```tsx
// props 객체 전체를 받는 방식
function Button(props: { label: string; onClick: () => void }) {
  return <button onClick={props.onClick}>{props.label}</button>;
}

// 구조 분해 할당 (더 깔끔함)
function Button({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick}>{label}</button>;
}

// 타입을 분리해서 더 명확하게
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

function Button({ label, onClick, disabled = false, variant = "primary" }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`} {/* btn-primary, btn-secondary 등 */}
    >
      {label}
    </button>
  );
}
```

---

## 다양한 Props 타입

### 함수를 Props로

```tsx
interface TodoItemProps {
  id: number;
  title: string;
  completed: boolean;
  onToggle: (id: number) => void;     // id를 받는 함수
  onDelete: (id: number) => void;
}

function TodoItem({ id, title, completed, onToggle, onDelete }: TodoItemProps) {
  return (
    <div className={`todo-item ${completed ? "completed" : ""}`}>
      <input
        type="checkbox"
        checked={completed}
        onChange={() => onToggle(id)}  {/* 부모의 함수 호출 */}
      />
      <span>{title}</span>
      <button onClick={() => onDelete(id)}>삭제</button>
    </div>
  );
}

// 부모 컴포넌트
function TodoList() {
  const handleToggle = (id: number) => {
    console.log(`Todo ${id} 완료 상태 변경`);
  };

  const handleDelete = (id: number) => {
    console.log(`Todo ${id} 삭제`);
  };

  return (
    <TodoItem
      id={1}
      title="TypeScript 공부하기"
      completed={false}
      onToggle={handleToggle}
      onDelete={handleDelete}
    />
  );
}
```

### 배열을 Props로

```tsx
interface ProductListProps {
  products: Array<{
    id: number;
    name: string;
    price: number;
  }>;
  onSelect: (id: number) => void;
}

function ProductList({ products, onSelect }: ProductListProps) {
  return (
    <ul>
      {products.map(product => (
        <li key={product.id} onClick={() => onSelect(product.id)}>
          {product.name} - {product.price.toLocaleString()}원
        </li>
      ))}
    </ul>
  );
}
```

### children Props

```tsx
// children: 컴포넌트 태그 사이의 내용
interface CardProps {
  title: string;
  children: React.ReactNode; // 어떤 React 요소든 받을 수 있음
}

function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h2 className="card-title">{title}</h2>
      <div className="card-body">
        {children}  {/* 자식 요소들이 여기에 렌더링됨 */}
      </div>
    </div>
  );
}

// 사용: 태그 사이에 내용을 넣으면 children으로 전달됨
function App() {
  return (
    <Card title="사용자 정보">
      <p>이름: 김철수</p>
      <p>이메일: kim@example.com</p>
      <button>수정하기</button>
    </Card>
  );
}
```

---

## Props 기본값 (Default Props)

```tsx
interface AlertProps {
  message: string;
  type?: "info" | "success" | "warning" | "error";
  dismissible?: boolean;
}

// 기본값을 구조 분해 시 설정
function Alert({ message, type = "info", dismissible = false }: AlertProps) {
  const colors = {
    info: "blue",
    success: "green",
    warning: "yellow",
    error: "red",
  };

  return (
    <div className={`alert alert-${type}`} style={{ color: colors[type] }}>
      {message}
      {dismissible && <button>✕</button>}
    </div>
  );
}

// type 없이 사용하면 "info"가 기본값
<Alert message="이것은 정보입니다" />
// type="success"를 지정하면 성공 스타일
<Alert message="저장되었습니다!" type="success" />
```

---

## Props 전달 패턴

### Spread Props (스프레드 연산자)

```tsx
interface InputProps {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

function FormInput({ label, id, ...rest }: InputProps) {
  // label과 id를 제외한 나머지를 input에 전달
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...rest} />  {/* type, placeholder, required 전달 */}
    </div>
  );
}

// 사용
<FormInput
  label="이메일"
  id="email"
  type="email"
  placeholder="email@example.com"
  required
/>
```

### Props 내려보내기를 피하는 방법 (미리 알아두기)

```tsx
// 3단계 이상 내려보내면 Props Drilling 발생
// App → Layout → Sidebar → UserInfo → Avatar (name 전달)
// 이런 경우 Context API나 상태관리 라이브러리를 사용 (뒤에서 배움)
```

---

## 실전 예제: 쇼핑카트 아이템

```tsx
// 상품 타입 정의
interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
}

interface CartItemProps {
  product: Product;
  quantity: number;
  onIncrease: (productId: number) => void;
  onDecrease: (productId: number) => void;
  onRemove: (productId: number) => void;
}

function CartItem({ product, quantity, onIncrease, onDecrease, onRemove }: CartItemProps) {
  const totalPrice = product.price * quantity;

  return (
    <div className="cart-item">
      <img src={product.imageUrl} alt={product.name} width={80} />
      <div className="item-info">
        <h3>{product.name}</h3>
        <p>{product.price.toLocaleString()}원</p>
      </div>
      <div className="quantity-control">
        <button
          onClick={() => onDecrease(product.id)}
          disabled={quantity <= 1}  {/* 1개 미만으로 줄일 수 없음 */}
        >
          -
        </button>
        <span>{quantity}</span>
        <button
          onClick={() => onIncrease(product.id)}
          disabled={quantity >= product.stock}  {/* 재고 초과 불가 */}
        >
          +
        </button>
      </div>
      <p className="total-price">{totalPrice.toLocaleString()}원</p>
      <button onClick={() => onRemove(product.id)}>제거</button>
    </div>
  );
}
```

---

## 흔한 실수와 해결법

### 실수 1: Props 타입 없이 사용

```tsx
// 나쁜 예 - props 타입이 없어 IDE 지원 없음
function UserCard(props) {
  return <div>{props.naem}</div>; // 오타! 오류 감지 불가
}

// 좋은 예 - 타입으로 오타 방지
interface UserCardProps {
  name: string;
}
function UserCard({ name }: UserCardProps) {
  return <div>{name}</div>; // naem으로 쓰면 오류 발생
}
```

### 실수 2: Props를 직접 수정

```tsx
// 나쁜 예 - Props는 읽기 전용!
function BadComponent({ items }: { items: string[] }) {
  items.push("새 항목"); // Props를 변경하면 안 됨!
  return <ul>{items.map(i => <li>{i}</li>)}</ul>;
}

// 좋은 예 - 복사본을 만들어 사용
function GoodComponent({ items }: { items: string[] }) {
  const sortedItems = [...items].sort(); // 복사 후 정렬
  return <ul>{sortedItems.map(i => <li>{i}</li>)}</ul>;
}
```

### 실수 3: key Props 누락

```tsx
// 나쁜 예 - key 없으면 경고
function List({ items }: { items: string[] }) {
  return <ul>{items.map(item => <li>{item}</li>)}</ul>;
}

// 좋은 예 - 고유한 key 사용
function List({ items }: { items: { id: number; label: string }[] }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.label}</li>  {/* id를 key로 사용 */}
      ))}
    </ul>
  );
}
```

---

## 정리

- Props는 **부모 → 자식**으로 단방향 흐름
- Props는 **읽기 전용** (직접 수정하면 안 됨)
- 함수도 Props로 전달 가능 (자식 → 부모 통신)
- `children` Props로 컴포넌트 내용을 유연하게 구성
- TypeScript로 Props 타입을 정의하면 안전하고 자동완성 지원
