---
title: "React 테스팅"
order: 15
---

# React 테스팅

테스트는 코드가 예상대로 동작하는지 자동으로 확인합니다. 코드를 수정해도 기존 기능이 망가지지 않았는지 빠르게 확인할 수 있습니다.

---

## 테스팅 도구

React 앱에서 주로 사용하는 도구들:

- **Vitest**: 테스트 실행 프레임워크 (Vite 프로젝트에 적합)
- **React Testing Library (RTL)**: 컴포넌트를 사용자 관점에서 테스트
- **@testing-library/user-event**: 사용자 상호작용 시뮬레이션

```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",          // 브라우저 환경 시뮬레이션
    globals: true,                 // describe, it, expect 전역 사용
    setupFiles: "./src/test/setup.ts",
  },
});

// src/test/setup.ts
import "@testing-library/jest-dom"; // 추가 매처 (toBeInTheDocument 등)
```

---

## 첫 번째 테스트

```tsx
// src/components/Button.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Button from "./Button";

describe("Button 컴포넌트", () => {
  it("텍스트를 올바르게 표시한다", () => {
    render(<Button label="클릭하세요" onClick={() => {}} />);

    // 화면에 텍스트가 있는지 확인
    expect(screen.getByText("클릭하세요")).toBeInTheDocument();
  });

  it("클릭 시 onClick 함수가 호출된다", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn(); // mock 함수

    render(<Button label="클릭" onClick={handleClick} />);

    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disabled 상태에서는 클릭이 안 된다", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button label="클릭" onClick={handleClick} disabled />);

    await user.click(screen.getByRole("button"));

    expect(handleClick).not.toHaveBeenCalled();
  });
});
```

---

## 쿼리 함수들

RTL에서 요소를 찾는 방법들입니다.

```tsx
// getBy: 요소가 없으면 에러
screen.getByText("안녕하세요");           // 텍스트로 찾기
screen.getByRole("button");               // 역할로 찾기
screen.getByRole("button", { name: "제출" }); // 버튼 이름으로
screen.getByLabelText("이메일");          // label과 연결된 input 찾기
screen.getByPlaceholderText("이메일 입력"); // placeholder로 찾기
screen.getByTestId("submit-button");      // data-testid로 찾기

// queryBy: 요소가 없으면 null (없는 것을 확인할 때)
expect(screen.queryByText("오류")).not.toBeInTheDocument();

// findBy: 비동기로 나타나는 요소 (Promise 반환)
const element = await screen.findByText("로딩 완료");
```

---

## 폼 테스트

```tsx
// LoginForm.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "./LoginForm";

describe("LoginForm", () => {
  it("이메일과 비밀번호를 입력하고 제출할 수 있다", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(<LoginForm onSubmit={handleSubmit} />);

    // 이메일 입력
    await user.type(screen.getByLabelText("이메일"), "user@example.com");
    // 비밀번호 입력
    await user.type(screen.getByLabelText("비밀번호"), "password123");
    // 폼 제출
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
    });
  });

  it("잘못된 이메일 형식이면 오류 메시지를 표시한다", async () => {
    const user = userEvent.setup();

    render(<LoginForm onSubmit={() => {}} />);

    await user.type(screen.getByLabelText("이메일"), "invalid-email");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(screen.getByText("올바른 이메일 형식이 아닙니다.")).toBeInTheDocument();
  });

  it("비밀번호가 비어있으면 제출되지 않는다", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText("이메일"), "user@example.com");
    // 비밀번호는 입력하지 않음
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("비밀번호를 입력해주세요.")).toBeInTheDocument();
  });
});
```

---

## 비동기 테스트

API 호출이 포함된 컴포넌트를 테스트합니다.

```tsx
// PostList.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import PostList from "./PostList";

// fetch를 mock으로 교체
global.fetch = vi.fn();

describe("PostList", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // 각 테스트 전에 mock 초기화
  });

  it("로딩 중에는 스피너를 표시한다", () => {
    // fetch가 완료되지 않는 상태
    (global.fetch as any).mockReturnValue(new Promise(() => {}));

    render(<PostList />);

    expect(screen.getByText("로딩 중...")).toBeInTheDocument();
  });

  it("데이터를 성공적으로 로드하면 목록을 표시한다", async () => {
    const mockPosts = [
      { id: 1, title: "첫 번째 포스트" },
      { id: 2, title: "두 번째 포스트" },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockPosts,
    });

    render(<PostList />);

    // findBy: 비동기로 나타나는 요소 대기
    expect(await screen.findByText("첫 번째 포스트")).toBeInTheDocument();
    expect(screen.getByText("두 번째 포스트")).toBeInTheDocument();
  });

  it("API 오류 시 에러 메시지를 표시한다", async () => {
    (global.fetch as any).mockRejectedValue(new Error("네트워크 오류"));

    render(<PostList />);

    await waitFor(() => {
      expect(screen.getByText(/오류/)).toBeInTheDocument();
    });
  });
});
```

---

## 커스텀 훅 테스트

```tsx
// useCounter.test.ts
import { renderHook, act } from "@testing-library/react";
import useCounter from "./useCounter";

describe("useCounter 훅", () => {
  it("초기값이 0이다", () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it("increment 호출 시 1 증가한다", () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it("초기값을 커스텀으로 설정할 수 있다", () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });
});

// useLocalStorage.test.ts
import { renderHook, act } from "@testing-library/react";
import useLocalStorage from "./useLocalStorage";

describe("useLocalStorage 훅", () => {
  beforeEach(() => {
    localStorage.clear(); // 각 테스트 전에 초기화
  });

  it("초기값을 반환한다", () => {
    const { result } = renderHook(() => useLocalStorage("test", "기본값"));
    expect(result.current[0]).toBe("기본값");
  });

  it("값을 저장하면 localStorage에도 저장된다", () => {
    const { result } = renderHook(() => useLocalStorage<string>("name", ""));

    act(() => {
      result.current[1]("김철수");
    });

    expect(result.current[0]).toBe("김철수");
    expect(JSON.parse(localStorage.getItem("name")!)).toBe("김철수");
  });
});
```

---

## Context와 Provider 테스트

```tsx
// AuthContext.test.tsx
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";

// 테스트용 컴포넌트
function TestComponent() {
  const { user, login, logout } = useAuth();
  return (
    <div>
      {user ? (
        <>
          <span data-testid="user-name">{user.name}</span>
          <button onClick={logout}>로그아웃</button>
        </>
      ) : (
        <button onClick={() => login("test@test.com", "password")}>
          로그인
        </button>
      )}
    </div>
  );
}

describe("AuthContext", () => {
  it("로그인 전에는 user가 null이다", () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.queryByTestId("user-name")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
  });
});
```

---

## 스냅샷 테스트

컴포넌트의 렌더링 결과를 저장하고, 변경 시 알림을 받습니다.

```tsx
// Button.snapshot.test.tsx
import { render } from "@testing-library/react";
import Button from "./Button";

it("기본 Button 렌더링과 일치한다", () => {
  const { container } = render(
    <Button label="클릭" onClick={() => {}} />
  );
  expect(container.firstChild).toMatchSnapshot();
});

// 첫 실행: 스냅샷 파일 생성
// 이후 실행: 이전 스냅샷과 비교 (다르면 테스트 실패)
// 의도적인 변경: npx vitest --update-snapshots
```

---

## 테스트 팁

### 접근성(Accessibility) 기준으로 쿼리하기

```tsx
// data-testid보다 role, label을 사용하는 것이 접근성에 좋음
// 나쁜 예
screen.getByTestId("submit-btn");

// 좋은 예 - 실제 사용자처럼 찾기
screen.getByRole("button", { name: "제출" });
screen.getByLabelText("이메일");
screen.getByPlaceholderText("이메일을 입력하세요");
```

### 테스트 구조 (AAA 패턴)

```tsx
it("버튼 클릭 시 카운트가 증가한다", async () => {
  // Arrange (준비)
  const user = userEvent.setup();
  render(<Counter initialCount={0} />);

  // Act (행동)
  await user.click(screen.getByRole("button", { name: "증가" }));

  // Assert (검증)
  expect(screen.getByText("1")).toBeInTheDocument();
});
```

---

## 흔한 실수와 해결법

### 실수 1: act 없이 상태 변경

```tsx
// 경고: act로 감싸야 함
const { result } = renderHook(() => useState(0));
result.current[1](1); // 경고!

// 수정
act(() => {
  result.current[1](1);
});
```

### 실수 2: 비동기 처리 누락

```tsx
// 나쁜 예 - 비동기 렌더링을 기다리지 않음
render(<AsyncComponent />);
expect(screen.getByText("데이터")).toBeInTheDocument(); // 아직 로드 안 됨!

// 좋은 예
render(<AsyncComponent />);
expect(await screen.findByText("데이터")).toBeInTheDocument(); // 나타날 때까지 대기
```

### 실수 3: 구현 세부사항 테스트

```tsx
// 나쁜 예 - State를 직접 확인
expect(component.state.isLoading).toBe(false);

// 좋은 예 - 사용자가 보는 것을 확인
expect(screen.queryByText("로딩 중...")).not.toBeInTheDocument();
```

---

## 정리

테스팅 계층:
1. **단위 테스트**: 함수, 훅 등 개별 단위
2. **컴포넌트 테스트**: UI 컴포넌트의 렌더링과 동작
3. **통합 테스트**: 여러 컴포넌트와 API의 상호작용

테스팅 원칙:
- 사용자 관점에서 테스트 (role, label 기준)
- 구현 세부사항이 아닌 동작을 테스트
- 테스트는 변경에 대한 안전망

| 도구 | 용도 |
|------|------|
| `render` | 컴포넌트 렌더링 |
| `screen.getByRole` | 역할로 요소 찾기 |
| `screen.findByText` | 비동기 요소 찾기 |
| `userEvent.click` | 클릭 시뮬레이션 |
| `userEvent.type` | 타이핑 시뮬레이션 |
| `vi.fn()` | mock 함수 생성 |
| `renderHook` | 커스텀 훅 테스트 |
