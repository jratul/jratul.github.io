---
title: "커스텀 훅"
order: 10
---

# 커스텀 훅 (Custom Hooks)

커스텀 훅은 여러 컴포넌트에서 반복되는 로직을 추출해서 재사용 가능한 함수로 만드는 것입니다. 이름은 반드시 `use`로 시작해야 합니다.

---

## 커스텀 훅이 왜 필요한가?

```tsx
// 중복 코드 발생: 여러 컴포넌트에서 같은 로딩/에러 로직 반복
function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then(res => res.json())
      .then(data => { setUsers(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  // 렌더링...
}

function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true); // 동일한 로직 반복!
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/posts") // URL만 다르고 로직은 같음
      .then(res => res.json())
      .then(data => { setPosts(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);
}
```

커스텀 훅으로 중복을 제거할 수 있습니다.

---

## 첫 번째 커스텀 훅: useFetch

```tsx
// hooks/useFetch.ts
import { useState, useEffect } from "react";

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void; // 다시 불러오기
}

function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0); // refetch 트리거

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP 오류: ${res.status}`);
        return res.json();
      })
      .then((result: T) => {
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [url, trigger]);

  const refetch = () => setTrigger(prev => prev + 1);

  return { data, loading, error, refetch };
}

// 사용: 깔끔하게 한 줄로!
function UserList() {
  const { data: users, loading, error, refetch } = useFetch<User[]>("/api/users");

  if (loading) return <p>로딩 중...</p>;
  if (error) return <p>오류: {error} <button onClick={refetch}>재시도</button></p>;
  if (!users) return null;

  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}

function PostList() {
  const { data: posts, loading, error } = useFetch<Post[]>("/api/posts");
  // 완전히 같은 훅, URL만 다름
}
```

---

## useLocalStorage 훅

localStorage와 동기화된 State를 만듭니다.

```tsx
// hooks/useLocalStorage.ts
import { useState, useEffect } from "react";

function useLocalStorage<T>(key: string, initialValue: T) {
  // 초기값: localStorage에 저장된 값 또는 initialValue
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // value가 바뀌면 localStorage에도 저장
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("localStorage 저장 실패:", error);
    }
  }, [key, value]);

  // localStorage에서 삭제
  const removeValue = () => {
    localStorage.removeItem(key);
    setValue(initialValue);
  };

  return [value, setValue, removeValue] as const;
}

// 사용 예시
function ThemeToggle() {
  const [theme, setTheme, removeTheme] = useLocalStorage<"light" | "dark">("theme", "light");

  return (
    <div>
      <p>현재 테마: {theme}</p>
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        테마 전환
      </button>
      <button onClick={removeTheme}>테마 초기화</button>
    </div>
  );
}

function ShoppingCart() {
  const [cart, setCart] = useLocalStorage<CartItem[]>("cart", []);

  const addItem = (item: CartItem) => {
    setCart(prev => [...prev, item]);
  };

  return <div>장바구니: {cart.length}개</div>;
}
```

---

## useDebounce 훅

값이 변경되고 일정 시간 후에 업데이트되는 debounced 값을 만듭니다.

```tsx
// hooks/useDebounce.ts
import { useState, useEffect } from "react";

function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value); // delay 후에 값 업데이트
    }, delay);

    return () => clearTimeout(timer); // 이전 타이머 취소
  }, [value, delay]);

  return debouncedValue;
}

// 사용 예시: 검색 기능
function SearchBox() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500); // 500ms 후에 검색

  useEffect(() => {
    if (debouncedQuery) {
      console.log(`"${debouncedQuery}" 검색 중...`); // API 호출
    }
  }, [debouncedQuery]); // debouncedQuery가 변경될 때만 실행

  return (
    <input
      value={query}
      onChange={e => setQuery(e.target.value)}
      placeholder="검색어 입력 (500ms 후 검색)"
    />
  );
}
```

---

## useWindowSize 훅

창 크기 변화를 추적합니다.

```tsx
// hooks/useWindowSize.ts
import { useState, useEffect } from "react";

interface WindowSize {
  width: number;
  height: number;
}

function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}

// 사용 예시
function ResponsiveLayout() {
  const { width } = useWindowSize();

  const columns = width > 1024 ? 3 : width > 640 ? 2 : 1;

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      <div>항목 1</div>
      <div>항목 2</div>
      <div>항목 3</div>
    </div>
  );
}
```

---

## useForm 훅

폼 로직을 재사용 가능하게 만듭니다.

```tsx
// hooks/useForm.ts
import { useState } from "react";

interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit?: (values: T) => void | Promise<void>;
}

function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setValues(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // 오류 지우기
    if (errors[name as keyof T]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    if (validate) {
      const newErrors = validate(values);
      setErrors(prev => ({ ...prev, [name]: newErrors[name as keyof T] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validate) {
      const newErrors = validate(values);
      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) return;
    }

    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  };
}

// 사용 예시
function ContactForm() {
  const { values, errors, handleChange, handleBlur, handleSubmit, isSubmitting } = useForm({
    initialValues: { name: "", email: "", message: "" },
    validate: (values) => {
      const errors: any = {};
      if (!values.name) errors.name = "이름을 입력해주세요.";
      if (!values.email.includes("@")) errors.email = "올바른 이메일이 아닙니다.";
      if (values.message.length < 10) errors.message = "메시지는 10자 이상이어야 합니다.";
      return errors;
    },
    onSubmit: async (values) => {
      await fetch("/api/contact", {
        method: "POST",
        body: JSON.stringify(values),
      });
      alert("메시지가 전송되었습니다!");
    },
  });

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input name="name" value={values.name} onChange={handleChange} onBlur={handleBlur} placeholder="이름" />
        {errors.name && <span>{errors.name}</span>}
      </div>
      <div>
        <input name="email" type="email" value={values.email} onChange={handleChange} onBlur={handleBlur} placeholder="이메일" />
        {errors.email && <span>{errors.email}</span>}
      </div>
      <div>
        <textarea name="message" value={values.message} onChange={handleChange} placeholder="메시지" />
        {errors.message && <span>{errors.message}</span>}
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "전송 중..." : "전송"}
      </button>
    </form>
  );
}
```

---

## 커스텀 훅 규칙

```tsx
// 반드시 "use"로 시작
function useCounter() { ... }  // ✅
function counter() { ... }      // ❌ (훅으로 인식 안 됨)

// 최상위 레벨에서만 호출 (if, for 안에서 사용 불가)
function MyComponent() {
  const [count] = useCounter(); // ✅
  if (condition) {
    const [x] = useCounter(); // ❌ 조건 안에서 호출 금지
  }
}

// React 컴포넌트 또는 다른 커스텀 훅에서만 호출
function useMyHook() {
  const data = useFetch("/api"); // ✅ 커스텀 훅에서 다른 훅 사용 가능
}

function regularFunction() {
  const data = useFetch("/api"); // ❌ 일반 함수에서 훅 사용 불가
}
```

---

## 흔한 실수와 해결법

### 실수: useEffect 의존성 배열에 훅 함수 포함

```tsx
// 나쁜 예 - refetch 함수가 매 렌더링마다 새로 생성되어 무한 루프
function useBadFetch(url: string) {
  const [data, setData] = useState(null);

  const fetchData = () => { // 매 렌더링마다 새 함수
    fetch(url).then(r => r.json()).then(setData);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData가 계속 새로 만들어져 무한 루프!
}

// 좋은 예 - useCallback 또는 함수를 useEffect 안에 정의
function useGoodFetch(url: string) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = () => { // useEffect 안에 정의
      fetch(url).then(r => r.json()).then(setData);
    };
    fetchData();
  }, [url]); // url만 의존성에
}
```

---

## 정리

커스텀 훅 만드는 방법:
1. 이름은 `use`로 시작
2. 반복되는 State + Effect 로직을 추출
3. 필요한 값과 함수를 반환
4. 어떤 컴포넌트에서든 재사용

자주 만드는 커스텀 훅:
- `useFetch`: API 데이터 로드
- `useLocalStorage`: 로컬스토리지 동기화
- `useDebounce`: 입력값 디바운싱
- `useWindowSize`: 창 크기 추적
- `useForm`: 폼 상태 관리
- `useToggle`: boolean 토글
- `usePrevious`: 이전 값 저장
