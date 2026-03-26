---
title: "폼과 제어 컴포넌트"
order: 9
---

# 폼과 제어 컴포넌트

React에서 폼은 두 가지 방식으로 다룰 수 있습니다. 제어 컴포넌트(Controlled Component)는 React State가 폼 데이터를 관리하고, 비제어 컴포넌트(Uncontrolled Component)는 DOM이 직접 관리합니다. 보통 제어 컴포넌트를 사용합니다.

---

## 제어 컴포넌트 vs 비제어 컴포넌트

```tsx
// 비제어 컴포넌트: DOM이 값 관리 (ref 사용)
function UncontrolledForm() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value; // DOM에서 직접 읽음
    console.log("입력값:", value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} defaultValue="기본값" />
      <button type="submit">제출</button>
    </form>
  );
}

// 제어 컴포넌트: React State가 값 관리 (권장)
function ControlledForm() {
  const [value, setValue] = useState("기본값");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("입력값:", value); // State에서 읽음
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={value}             // State를 value로
        onChange={e => setValue(e.target.value)} // 변경 시 State 업데이트
      />
      <button type="submit">제출</button>
    </form>
  );
}
```

---

## 다양한 폼 요소들

```tsx
function FormElements() {
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState(0);
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("kr");
  const [agree, setAgree] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  // 체크박스 그룹 처리
  const handleInterestChange = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)  // 이미 있으면 제거
        : [...prev, interest]               // 없으면 추가
    );
  };

  return (
    <form>
      {/* 텍스트 입력 */}
      <div>
        <label>이름</label>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="이름 입력"
        />
      </div>

      {/* 이메일 입력 */}
      <div>
        <label>이메일</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </div>

      {/* 숫자 입력 */}
      <div>
        <label>나이</label>
        <input
          type="number"
          value={age}
          onChange={e => setAge(Number(e.target.value))}
          min={0}
          max={150}
        />
      </div>

      {/* 라디오 버튼 */}
      <div>
        <label>성별</label>
        {["male", "female", "other"].map(g => (
          <label key={g}>
            <input
              type="radio"
              name="gender"
              value={g}
              checked={gender === g}
              onChange={() => setGender(g)}
            />
            {g === "male" ? "남" : g === "female" ? "여" : "기타"}
          </label>
        ))}
      </div>

      {/* 선택 박스 */}
      <div>
        <label>국가</label>
        <select value={country} onChange={e => setCountry(e.target.value)}>
          <option value="kr">한국</option>
          <option value="us">미국</option>
          <option value="jp">일본</option>
        </select>
      </div>

      {/* 체크박스 (단일) */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={agree}
            onChange={e => setAgree(e.target.checked)}
          />
          이용약관에 동의합니다
        </label>
      </div>

      {/* 체크박스 그룹 */}
      <div>
        <label>관심사</label>
        {["react", "typescript", "nodejs"].map(interest => (
          <label key={interest}>
            <input
              type="checkbox"
              checked={interests.includes(interest)}
              onChange={() => handleInterestChange(interest)}
            />
            {interest}
          </label>
        ))}
      </div>

      {/* 텍스트 영역 */}
      <div>
        <label>자기소개</label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          rows={4}
          placeholder="자기소개를 입력하세요"
        />
      </div>
    </form>
  );
}
```

---

## 하나의 핸들러로 여러 입력 처리

```tsx
interface SignUpForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

function SignUpForm() {
  const [form, setForm] = useState<SignUpForm>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // name 속성을 이용해 하나의 핸들러로 처리
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // [name]은 computed property: name이 "email"이면 { email: value }
  };

  return (
    <form>
      <input name="name" value={form.name} onChange={handleChange} placeholder="이름" />
      <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="이메일" />
      <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="비밀번호" />
      <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="비밀번호 확인" />
    </form>
  );
}
```

---

## 폼 유효성 검사

```tsx
interface LoginForm {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

function LoginForm() {
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof LoginForm, boolean>>>({});

  const validate = (values: LoginForm): FormErrors => {
    const errors: FormErrors = {};

    if (!values.email) {
      errors.email = "이메일을 입력해주세요.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.email = "올바른 이메일 형식이 아닙니다.";
    }

    if (!values.password) {
      errors.password = "비밀번호를 입력해주세요.";
    } else if (values.password.length < 8) {
      errors.password = "비밀번호는 8자 이상이어야 합니다.";
    }

    return errors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newForm = { ...form, [name]: value };
    setForm(newForm);

    // 실시간 유효성 검사 (해당 필드를 건드렸을 때만)
    if (touched[name as keyof LoginForm]) {
      const newErrors = validate(newForm);
      setErrors(prev => ({ ...prev, [name]: newErrors[name as keyof FormErrors] }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    // 포커스를 잃을 때 유효성 검사
    const newErrors = validate(form);
    setErrors(prev => ({ ...prev, [name]: newErrors[name as keyof FormErrors] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate(form);
    setErrors(newErrors);
    setTouched({ email: true, password: true });

    if (Object.keys(newErrors).length === 0) {
      console.log("제출:", form);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>이메일</label>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          onBlur={handleBlur}
          className={errors.email ? "error" : ""}
        />
        {errors.email && <span className="error-text">{errors.email}</span>}
      </div>

      <div>
        <label>비밀번호</label>
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          onBlur={handleBlur}
          className={errors.password ? "error" : ""}
        />
        {errors.password && <span className="error-text">{errors.password}</span>}
      </div>

      <button
        type="submit"
        disabled={Object.keys(validate(form)).length > 0}
      >
        로그인
      </button>
    </form>
  );
}
```

---

## 실전 예제: 회원가입 폼

```tsx
import { useState } from "react";

interface SignUpData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

function SignUpPage() {
  const [form, setForm] = useState<SignUpData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SignUpData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // 오류 즉시 제거
    if (errors[name as keyof SignUpData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof SignUpData, string>> = {};

    if (form.username.length < 2) {
      newErrors.username = "사용자명은 2자 이상이어야 합니다.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "올바른 이메일을 입력해주세요.";
    }
    if (form.password.length < 8) {
      newErrors.password = "비밀번호는 8자 이상이어야 합니다.";
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
    }
    if (!form.agreeToTerms) {
      newErrors.agreeToTerms = "이용약관에 동의해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // API 시뮬레이션
      setSubmitted(true);
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div>
        <h2>✅ 회원가입 완료!</h2>
        <p>{form.email}로 인증 메일을 발송했습니다.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2>회원가입</h2>

      <div>
        <label>사용자명</label>
        <input name="username" value={form.username} onChange={handleChange} />
        {errors.username && <p className="error">{errors.username}</p>}
      </div>

      <div>
        <label>이메일</label>
        <input name="email" type="email" value={form.email} onChange={handleChange} />
        {errors.email && <p className="error">{errors.email}</p>}
      </div>

      <div>
        <label>비밀번호</label>
        <input name="password" type="password" value={form.password} onChange={handleChange} />
        {errors.password && <p className="error">{errors.password}</p>}
      </div>

      <div>
        <label>비밀번호 확인</label>
        <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} />
        {errors.confirmPassword && <p className="error">{errors.confirmPassword}</p>}
      </div>

      <div>
        <label>
          <input name="agreeToTerms" type="checkbox" checked={form.agreeToTerms} onChange={handleChange} />
          이용약관에 동의합니다
        </label>
        {errors.agreeToTerms && <p className="error">{errors.agreeToTerms}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "처리 중..." : "회원가입"}
      </button>
    </form>
  );
}
```

---

## 흔한 실수와 해결법

### 실수 1: value 없이 onChange만 사용

```tsx
// 나쁜 예 - value가 없으면 비제어 컴포넌트가 됨
<input onChange={e => setValue(e.target.value)} />

// 좋은 예 - value와 onChange 함께
<input value={value} onChange={e => setValue(e.target.value)} />
```

### 실수 2: 숫자 입력값을 문자열로 저장

```tsx
// 나쁜 예 - e.target.value는 항상 string
<input type="number" value={age} onChange={e => setAge(e.target.value)} />
// age가 string이 됨!

// 좋은 예 - Number()로 변환
<input type="number" value={age} onChange={e => setAge(Number(e.target.value))} />
```

### 실수 3: preventDefault 없이 폼 제출

```tsx
// 나쁜 예 - 페이지가 새로고침됨
const handleSubmit = () => {
  console.log("제출"); // 실행되지만 페이지가 새로고침됨
};

// 좋은 예
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  console.log("제출");
};
```

---

## 정리

- **제어 컴포넌트**: React State가 폼 값을 관리 (권장)
- `value` + `onChange` 조합이 기본 패턴
- 하나의 `handleChange`로 여러 입력 처리: `name` 속성 활용
- 유효성 검사는 `onBlur`(포커스 이탈) 또는 `onSubmit` 시 실행
- 폼 제출 시 `e.preventDefault()` 필수
