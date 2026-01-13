---
title: "React의 Controlled와 Uncontrolled Component"
date: "2026-01-13"
tags: ["react", "form", "controlled", "uncontrolled", "frontend"]
excerpt: "React에서 폼 입력을 다루는 두 가지 방식인 제어 컴포넌트와 비제어 컴포넌트의 차이점과 사용법을 알아봅니다."
---

# React의 Controlled와 Uncontrolled Component

React에서 폼 입력을 다루는 방식은 제어 컴포넌트(Controlled)와 비제어 컴포넌트(Uncontrolled)로 나뉩니다.

## Controlled Component (제어 컴포넌트)

**React State로 입력값을 제어**하는 컴포넌트입니다.

```typescript
function ControlledInput() {
  const [value, setValue] = useState("");

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
```

### 특징

- React State가 "단일 진실 공급원(Single Source of Truth)"
- 입력값 변경 시 State 업데이트 → 재렌더링
- 실시간 검증 가능
- 입력값 제어 가능 (포맷팅, 필터링 등)

---

## Uncontrolled Component (비제어 컴포넌트)

**DOM이 직접 입력값을 관리**하는 컴포넌트입니다.

```typescript
function UncontrolledInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    console.log(inputRef.current?.value);
  };

  return (
    <>
      <input ref={inputRef} defaultValue="초기값" />
      <button onClick={handleSubmit}>제출</button>
    </>
  );
}
```

### 특징

- DOM이 "단일 진실 공급원"
- ref로 DOM에 직접 접근
- 재렌더링 없음 (성능상 유리)
- 실시간 검증 어려움

---

## 차이점 비교

| 구분 | Controlled | Uncontrolled |
|-----|-----------|--------------|
| 값 관리 | React State | DOM |
| 값 접근 | `value` | `ref.current.value` |
| 초기값 | `value` | `defaultValue` |
| 재렌더링 | 입력마다 발생 | 없음 |
| 실시간 검증 | 쉬움 | 어려움 |
| 사용 | 권장 | 특수한 경우 |

---

## Controlled Component 예제

### 예제 1: 기본 입력

```typescript
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
      />
      <button type="submit">로그인</button>
    </form>
  );
}
```

---

### 예제 2: 실시간 검증

```typescript
function EmailInput() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    // 실시간 검증
    if (value && !value.includes("@")) {
      setError("유효한 이메일을 입력하세요");
    } else {
      setError("");
    }
  };

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={handleChange}
      />
      {error && <span style={{ color: 'red' }}>{error}</span>}
    </div>
  );
}
```

---

### 예제 3: 입력값 포맷팅

```typescript
function PhoneInput() {
  const [phone, setPhone] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // 숫자만

    // 자동 하이픈 추가
    let formatted = value;
    if (value.length > 3 && value.length <= 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length > 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    }

    setPhone(formatted);
  };

  return (
    <input
      type="tel"
      value={phone}
      onChange={handleChange}
      placeholder="010-0000-0000"
      maxLength={13}
    />
  );
}
```

---

### 예제 4: 여러 입력 관리

```typescript
interface FormData {
  username: string;
  email: string;
  age: number;
  agree: boolean;
}

function SignupForm() {
  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    age: 0,
    agree: false
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="username"
        value={formData.username}
        onChange={handleChange}
        placeholder="사용자명"
      />
      <input
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="이메일"
      />
      <input
        name="age"
        type="number"
        value={formData.age}
        onChange={handleChange}
        placeholder="나이"
      />
      <label>
        <input
          name="agree"
          type="checkbox"
          checked={formData.agree}
          onChange={handleChange}
        />
        약관 동의
      </label>
      <button type="submit">가입</button>
    </form>
  );
}
```

---

## Uncontrolled Component 예제

### 예제 1: 기본 사용

```typescript
function UncontrolledForm() {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const email = emailRef.current?.value;
    const password = passwordRef.current?.value;

    console.log({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        ref={emailRef}
        type="email"
        defaultValue=""
        placeholder="이메일"
      />
      <input
        ref={passwordRef}
        type="password"
        defaultValue=""
        placeholder="비밀번호"
      />
      <button type="submit">로그인</button>
    </form>
  );
}
```

---

### 예제 2: 파일 입력

```typescript
function FileUpload() {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const file = fileRef.current?.files?.[0];
    if (file) {
      console.log('파일명:', file.name);
      console.log('파일 크기:', file.size);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
      />
      <button type="submit">업로드</button>
    </form>
  );
}
```

---

### 예제 3: FormData 활용

```typescript
function UncontrolledFormData() {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    const data = Object.fromEntries(formData);

    console.log(data);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <input name="username" defaultValue="" />
      <input name="email" type="email" defaultValue="" />
      <input name="age" type="number" defaultValue="0" />
      <button type="submit">제출</button>
    </form>
  );
}
```

---

## 언제 무엇을 사용할까?

### Controlled Component 사용 시

1. **실시간 검증이 필요한 경우**
```typescript
function PasswordInput() {
  const [password, setPassword] = useState("");
  const strength = calculatePasswordStrength(password);

  return (
    <>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div>강도: {strength}</div>
    </>
  );
}
```

2. **입력값 포맷팅이 필요한 경우**
```typescript
function CreditCardInput() {
  const [card, setCard] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, "");
    const formatted = value.match(/.{1,4}/g)?.join(" ") || value;
    setCard(formatted);
  };

  return <input value={card} onChange={handleChange} />;
}
```

3. **조건부 렌더링이 필요한 경우**
```typescript
function ConditionalForm() {
  const [userType, setUserType] = useState<"student" | "teacher">("student");

  return (
    <>
      <select value={userType} onChange={(e) => setUserType(e.target.value)}>
        <option value="student">학생</option>
        <option value="teacher">선생님</option>
      </select>

      {userType === "student" && <StudentFields />}
      {userType === "teacher" && <TeacherFields />}
    </>
  );
}
```

---

### Uncontrolled Component 사용 시

1. **파일 업로드**
```typescript
function FileUpload() {
  const fileRef = useRef<HTMLInputElement>(null);

  return <input ref={fileRef} type="file" />;
}
```

2. **많은 입력 필드 (성능 최적화)**
```typescript
function LargeForm() {
  const formRef = useRef<HTMLFormElement>(null);

  // 100개 이상의 필드가 있을 때
  return (
    <form ref={formRef}>
      {/* 많은 입력 필드들 */}
    </form>
  );
}
```

3. **React 외부 라이브러리와 통합**
```typescript
function JQueryIntegration() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // jQuery 플러그인 초기화
    $(inputRef.current).datepicker();
  }, []);

  return <input ref={inputRef} />;
}
```

---

## React Hook Form (추천)

대부분의 경우 React Hook Form을 사용하는 것이 좋습니다.

```typescript
import { useForm } from "react-hook-form";

interface FormData {
  username: string;
  email: string;
  age: number;
}

function HookForm() {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register("username", {
          required: "사용자명은 필수입니다",
          minLength: {
            value: 3,
            message: "최소 3자 이상"
          }
        })}
      />
      {errors.username && <span>{errors.username.message}</span>}

      <input
        {...register("email", {
          required: "이메일은 필수입니다",
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: "유효한 이메일을 입력하세요"
          }
        })}
      />
      {errors.email && <span>{errors.email.message}</span>}

      <input
        type="number"
        {...register("age", {
          required: "나이는 필수입니다",
          min: { value: 18, message: "18세 이상만 가입 가능" }
        })}
      />
      {errors.age && <span>{errors.age.message}</span>}

      <button type="submit">제출</button>
    </form>
  );
}
```

**장점:**
- Uncontrolled 방식 (성능 좋음)
- 간단한 API
- 내장 검증
- TypeScript 지원

---

## Select와 Textarea

### Controlled Select

```typescript
function ControlledSelect() {
  const [selected, setSelected] = useState("apple");

  return (
    <select value={selected} onChange={(e) => setSelected(e.target.value)}>
      <option value="apple">사과</option>
      <option value="banana">바나나</option>
      <option value="orange">오렌지</option>
    </select>
  );
}
```

---

### Controlled Textarea

```typescript
function ControlledTextarea() {
  const [text, setText] = useState("");

  return (
    <textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      maxLength={200}
    />
  );
}
```

---

## 체크박스와 라디오

### Controlled Checkbox

```typescript
function ControlledCheckbox() {
  const [checked, setChecked] = useState(false);

  return (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
      />
      동의합니다
    </label>
  );
}

// 여러 체크박스
function MultiCheckbox() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleChange = (item: string) => {
    setSelectedItems(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={selectedItems.includes("react")}
          onChange={() => handleChange("react")}
        />
        React
      </label>
      <label>
        <input
          type="checkbox"
          checked={selectedItems.includes("vue")}
          onChange={() => handleChange("vue")}
        />
        Vue
      </label>
    </>
  );
}
```

---

### Controlled Radio

```typescript
function ControlledRadio() {
  const [selected, setSelected] = useState("male");

  return (
    <>
      <label>
        <input
          type="radio"
          value="male"
          checked={selected === "male"}
          onChange={(e) => setSelected(e.target.value)}
        />
        남성
      </label>
      <label>
        <input
          type="radio"
          value="female"
          checked={selected === "female"}
          onChange={(e) => setSelected(e.target.value)}
        />
        여성
      </label>
    </>
  );
}
```

---

## 주의사항

### 1. value와 defaultValue 혼용 금지

```typescript
// ❌ 에러 발생
<input value={value} defaultValue="초기값" />

// ✅ Controlled는 value만
<input value={value} onChange={handleChange} />

// ✅ Uncontrolled는 defaultValue만
<input ref={ref} defaultValue="초기값" />
```

---

### 2. Controlled에서 undefined 금지

```typescript
// ❌ value가 undefined면 Uncontrolled로 인식
const [value, setValue] = useState();
<input value={value} onChange={handleChange} />

// ✅ 빈 문자열로 초기화
const [value, setValue] = useState("");
<input value={value} onChange={handleChange} />
```

---

### 3. onChange 없이 value 사용 금지

```typescript
// ❌ 읽기 전용 경고
<input value={value} />

// ✅ onChange 제공
<input value={value} onChange={handleChange} />

// ✅ 또는 readOnly
<input value={value} readOnly />
```

---

## 요약

1. **Controlled**: React State로 제어, 실시간 검증 가능
2. **Uncontrolled**: DOM이 제어, ref로 접근, 성능 유리
3. **사용 기준**: 대부분 Controlled 권장
4. **React Hook Form**: 최적의 선택
5. **주의**: value/defaultValue 혼용 금지

간단한 폼은 Controlled, 복잡한 폼은 React Hook Form 사용을 권장합니다.