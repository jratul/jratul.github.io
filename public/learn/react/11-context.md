---
title: "Context API"
order: 11
---

# Context API

Context API는 컴포넌트 트리 전체에 데이터를 전달하는 방법입니다. Props Drilling(여러 단계를 거쳐 Props를 내려보내는 것) 문제를 해결합니다.

---

## Props Drilling 문제

```tsx
// 문제: theme 데이터가 깊이 내려가야 함
function App() {
  const [theme, setTheme] = useState("dark");
  return <Layout theme={theme} setTheme={setTheme} />;
}

function Layout({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  return <Sidebar theme={theme} setTheme={setTheme} />; // theme을 그냥 통과시킴
}

function Sidebar({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  return <UserPanel theme={theme} setTheme={setTheme} />; // 또 통과
}

function UserPanel({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  return <ThemeButton theme={theme} setTheme={setTheme} />; // 여기서야 사용
}

function ThemeButton({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  return <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>테마 전환</button>;
  // 결국 이 컴포넌트에서만 사용됨
}
```

Context를 사용하면 중간 컴포넌트들이 데이터를 통과시키지 않아도 됩니다.

---

## Context 기본 사용법

### 1단계: Context 생성

```tsx
// contexts/ThemeContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";

// Context 타입 정의
interface ThemeContextType {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
}

// Context 생성 (기본값 설정)
export const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});
```

### 2단계: Provider 컴포넌트 만들기

```tsx
// Provider: Context 값을 제공하는 컴포넌트
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### 3단계: useContext로 소비

```tsx
// 어떤 컴포넌트에서든 직접 접근 가능
function ThemeButton() {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <button onClick={toggleTheme}>
      {theme === "light" ? "🌙 다크 모드" : "☀️ 라이트 모드"}
    </button>
  );
}

// 중간 컴포넌트들은 theme를 몰라도 됨
function App() {
  return (
    <ThemeProvider>
      <Layout />
    </ThemeProvider>
  );
}

function Layout() {
  return <Sidebar />; // theme Props 불필요!
}

function Sidebar() {
  return <UserPanel />; // theme Props 불필요!
}

function UserPanel() {
  return <ThemeButton />; // ThemeButton이 직접 Context에서 가져옴
}
```

---

## 커스텀 훅으로 Context 감싸기

```tsx
// useContext 직접 사용 대신 커스텀 훅 만들기
export function useTheme() {
  const context = useContext(ThemeContext);

  // Provider 없이 사용하면 오류 발생
  if (!context) {
    throw new Error("useTheme은 ThemeProvider 안에서만 사용할 수 있습니다.");
  }

  return context;
}

// 사용: useContext(ThemeContext) 대신 useTheme()
function ThemeButton() {
  const { theme, toggleTheme } = useTheme(); // 더 명확하고 안전
  return <button onClick={toggleTheme}>{theme}</button>;
}
```

---

## 실전 예제 1: 인증 Context

```tsx
// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 시작 시 저장된 토큰으로 자동 로그인
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(setUser)
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) throw new Error("로그인 실패");

    const { user, token } = await response.json();
    localStorage.setItem("token", token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn: !!user,
      login,
      logout,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth는 AuthProvider 안에서만 사용할 수 있습니다.");
  }
  return context;
}

// 사용 예시
function Header() {
  const { user, isLoggedIn, logout } = useAuth();

  return (
    <header>
      {isLoggedIn ? (
        <div>
          <span>{user?.name}님</span>
          <button onClick={logout}>로그아웃</button>
        </div>
      ) : (
        <a href="/login">로그인</a>
      )}
    </header>
  );
}

function AdminPanel() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <p>권한이 없습니다.</p>;
  }

  return <div>관리자 패널</div>;
}
```

---

## 실전 예제 2: 장바구니 Context

```tsx
// contexts/CartContext.tsx
import { createContext, useContext, useReducer, ReactNode } from "react";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

// Reducer 패턴으로 복잡한 상태 관리
type CartAction =
  | { type: "ADD_ITEM"; item: Omit<CartItem, "quantity"> }
  | { type: "REMOVE_ITEM"; id: number }
  | { type: "UPDATE_QUANTITY"; id: number; quantity: number }
  | { type: "CLEAR_CART" };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.find(item => item.id === action.item.id);
      if (existing) {
        // 이미 있으면 수량 증가
        return state.map(item =>
          item.id === action.item.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...state, { ...action.item, quantity: 1 }];
    }
    case "REMOVE_ITEM":
      return state.filter(item => item.id !== action.id);
    case "UPDATE_QUANTITY":
      return state.map(item =>
        item.id === action.id
          ? { ...item, quantity: Math.max(0, action.quantity) }
          : item
      ).filter(item => item.quantity > 0);
    case "CLEAR_CART":
      return [];
    default:
      return state;
  }
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      addItem: item => dispatch({ type: "ADD_ITEM", item }),
      removeItem: id => dispatch({ type: "REMOVE_ITEM", id }),
      updateQuantity: (id, quantity) => dispatch({ type: "UPDATE_QUANTITY", id, quantity }),
      clearCart: () => dispatch({ type: "CLEAR_CART" }),
      totalItems,
      totalPrice,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider가 필요합니다.");
  return context;
}

// 사용 예시
function ProductCard({ product }: { product: { id: number; name: string; price: number } }) {
  const { addItem } = useCart();

  return (
    <div>
      <h3>{product.name}</h3>
      <p>{product.price.toLocaleString()}원</p>
      <button onClick={() => addItem(product)}>장바구니 추가</button>
    </div>
  );
}

function CartIcon() {
  const { totalItems } = useCart();
  return (
    <div>
      🛒 <span>{totalItems}</span>
    </div>
  );
}

function CartSummary() {
  const { items, totalPrice, removeItem, clearCart } = useCart();

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          <span>{item.name} × {item.quantity}</span>
          <span>{(item.price * item.quantity).toLocaleString()}원</span>
          <button onClick={() => removeItem(item.id)}>제거</button>
        </div>
      ))}
      <p>합계: {totalPrice.toLocaleString()}원</p>
      <button onClick={clearCart}>전체 비우기</button>
    </div>
  );
}
```

---

## 여러 Context 조합하기

```tsx
// 여러 Provider를 중첩해서 사용
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/cart" element={<CartPage />} />
            </Routes>
          </Router>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// 각 컴포넌트에서 필요한 Context만 사용
function Header() {
  const { theme } = useTheme();       // 테마
  const { user, logout } = useAuth(); // 인증
  const { totalItems } = useCart();  // 장바구니

  return (
    <header className={`theme-${theme}`}>
      <nav>...</nav>
      <span>{user?.name}</span>
      <CartIcon count={totalItems} />
      <button onClick={logout}>로그아웃</button>
    </header>
  );
}
```

---

## Context 성능 최적화

Context 값이 변경되면 해당 Context를 구독하는 모든 컴포넌트가 리렌더링됩니다.

```tsx
// 문제: 하나의 Context에 너무 많은 것을 넣으면 불필요한 리렌더링
const BigContext = createContext({ user: ..., theme: ..., cart: ..., settings: ... });
// user가 바뀌면 theme, cart, settings를 사용하는 컴포넌트도 모두 리렌더링

// 해결: 관련 있는 것끼리 Context 분리
const UserContext = createContext<User | null>(null);    // 사용자 정보
const ThemeContext = createContext<ThemeType | null>(null); // 테마
const CartContext = createContext<CartType | null>(null);  // 장바구니

// user만 바뀌면 UserContext 구독 컴포넌트만 리렌더링
```

---

## 흔한 실수와 해결법

### 실수 1: Provider 밖에서 Context 사용

```tsx
// 오류 발생!
function Header() {
  const { user } = useAuth(); // AuthProvider 밖에 있으면 오류
  return <div>{user?.name}</div>;
}

function App() {
  return (
    <div>
      <Header />      {/* AuthProvider 밖! */}
      <AuthProvider>
        <Main />
      </AuthProvider>
    </div>
  );
}

// 수정: Header를 AuthProvider 안으로
function App() {
  return (
    <AuthProvider>
      <Header />  {/* Provider 안으로 이동 */}
      <Main />
    </AuthProvider>
  );
}
```

### 실수 2: Context의 기본값을 null로 설정 후 체크 안 함

```tsx
const AuthContext = createContext<AuthContextType | null>(null);

// 위험: null 체크 없이 사용
function Component() {
  const { user } = useContext(AuthContext); // null이면 오류!
}

// 안전: 커스텀 훅에서 null 체크
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider가 필요합니다.");
  return context;
}
```

---

## 정리

| 개념 | 역할 |
|------|------|
| `createContext()` | Context 생성 |
| `<Context.Provider value={...}>` | 값 제공 |
| `useContext(Context)` | 값 소비 |
| 커스텀 훅 | `useContext` 래핑 + 안전성 강화 |
| Context 분리 | 불필요한 리렌더링 방지 |

Context는 **전역 상태**에 적합합니다:
- 테마 (다크/라이트 모드)
- 인증 정보 (로그인 사용자)
- 언어/로케일 설정
- 장바구니
- 알림/토스트 메시지
