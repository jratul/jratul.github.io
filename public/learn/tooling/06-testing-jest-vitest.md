---
title: "단위 테스트 (Jest, Vitest)"
order: 6
---

# 단위 테스트 (Jest, Vitest)

"이 코드가 제대로 동작하는지 어떻게 확인하나요?"
처음엔 직접 브라우저에서 확인하겠지만, 코드가 복잡해질수록 그것만으로는 부족합니다.
**테스트 코드**를 작성하면 코드가 바뀌어도 기존 기능이 깨지지 않았음을 자동으로 확인할 수 있습니다.

---

## 테스트를 왜 작성하나?

### 1. 회귀 방지 (Regression Prevention)

```typescript
// 날짜를 포맷하는 유틸 함수
function formatDate(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

// 나중에 기능 추가하다가 실수로 버그가 생겨도:
// ✅ 테스트가 있으면 즉시 발견
// ❌ 테스트가 없으면 서비스 운영 중에 발견
```

### 2. 문서화 역할

테스트 코드는 함수가 어떻게 동작해야 하는지 보여주는 살아있는 문서입니다.

```typescript
describe('formatDate', () => {
  it('날짜를 YYYY-M-D 형식으로 반환한다', () => { ... })
  it('월이 10 미만이면 앞에 0을 붙이지 않는다', () => { ... })
  it('잘못된 날짜를 전달하면 에러를 던진다', () => { ... })
})
// 이것만 봐도 함수의 동작 방식을 알 수 있음
```

### 3. 리팩토링 자신감

테스트가 있으면 코드를 대담하게 개선할 수 있습니다.

---

## Jest vs Vitest

**Jest**는 오랫동안 JavaScript 테스트의 표준이었습니다.
**Vitest**는 Vite 생태계를 위해 만들어진 테스트 프레임워크로, Jest와 거의 동일한 API를 가집니다.

| 항목 | Jest | Vitest |
|------|------|--------|
| 속도 | 보통 | 빠름 (Vite의 esbuild 활용) |
| Vite 프로젝트 통합 | 별도 설정 필요 | 자연스러운 통합 |
| API | 표준 | Jest와 동일 (마이그레이션 쉬움) |
| TypeScript 지원 | ts-jest 또는 babel 필요 | 기본 지원 |
| 성숙도 | 매우 성숙 | 빠르게 성장 중 |
| HMR | X | O (watch 모드에서) |

**결론:** Vite 프로젝트라면 **Vitest**, 기존 프로젝트라면 Jest

---

## Vitest 설치 및 설정

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

```typescript
// vitest.config.ts (또는 vite.config.ts에 통합)
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // 테스트 환경: jsdom(브라우저 API 모킹), node, happy-dom
    environment: 'jsdom',

    // 각 테스트 파일 실행 전 실행할 설정 파일
    setupFiles: ['./src/test/setup.ts'],

    // 테스트 파일 패턴
    include: ['**/*.{test,spec}.{ts,tsx}'],

    // 커버리지 설정
    coverage: {
      provider: 'v8',                     // 커버리지 엔진
      reporter: ['text', 'html', 'json'], // 리포트 형식
      include: ['src/**/*.{ts,tsx}'],     // 커버리지 측정 대상
      exclude: ['src/test/**', 'src/**/*.d.ts'], // 제외 파일
    },

    // 전역으로 사용할 수 있게 (describe, it, expect 등을 import 없이 사용)
    globals: true,
  },
})
```

```typescript
// src/test/setup.ts (각 테스트 파일 실행 전 설정)
import '@testing-library/jest-dom'
// jest-dom matchers 추가: toBeInTheDocument(), toHaveClass() 등
```

```json
// package.json
{
  "scripts": {
    "test": "vitest",                    // watch 모드로 테스트
    "test:run": "vitest run",            // 한 번만 실행
    "test:coverage": "vitest run --coverage"  // 커버리지 포함
  }
}
```

---

## 기본 문법: describe, it, expect

```typescript
// src/utils/math.ts
export function add(a: number, b: number): number {
  return a + b
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error('0으로 나눌 수 없습니다')
  return a / b
}
```

```typescript
// src/utils/math.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { add, divide } from './math'

// describe: 관련 테스트를 그룹으로 묶음
describe('add 함수', () => {
  // it 또는 test: 개별 테스트 케이스
  it('두 숫자를 더한다', () => {
    // expect: 검증할 값
    // toBe: 정확히 같은지 확인 (Object.is 비교)
    expect(add(1, 2)).toBe(3)
  })

  it('음수도 처리한다', () => {
    expect(add(-1, -2)).toBe(-3)
  })

  it('소수점도 처리한다', () => {
    // toBeCloseTo: 부동소수점 근사 비교
    expect(add(0.1, 0.2)).toBeCloseTo(0.3)
  })
})

describe('divide 함수', () => {
  it('나눗셈을 수행한다', () => {
    expect(divide(10, 2)).toBe(5)
  })

  it('0으로 나누면 에러를 던진다', () => {
    // 에러 발생을 검증할 때
    expect(() => divide(10, 0)).toThrow('0으로 나눌 수 없습니다')
  })
})
```

### 자주 쓰는 Matchers

```typescript
// ── 기본 비교 ──────────────────────────────────────────
expect(value).toBe(3)              // 정확한 값 (원시 타입)
expect(obj).toEqual({ a: 1 })     // 깊은 비교 (객체/배열)
expect(obj).toStrictEqual({ a: 1 }) // toEqual + undefined 속성도 비교

// ── 참/거짓 ────────────────────────────────────────────
expect(true).toBeTruthy()          // 참 (truthy)
expect(false).toBeFalsy()          // 거짓 (falsy)
expect(null).toBeNull()
expect(undefined).toBeUndefined()
expect('hello').toBeDefined()

// ── 숫자 ───────────────────────────────────────────────
expect(10).toBeGreaterThan(5)      // >
expect(5).toBeLessThan(10)         // <
expect(10).toBeGreaterThanOrEqual(10) // >=
expect(0.1 + 0.2).toBeCloseTo(0.3)   // 부동소수점 근사

// ── 문자열 ─────────────────────────────────────────────
expect('hello world').toContain('world')
expect('hello').toMatch(/^he/)      // 정규식 매칭
expect('hello').toHaveLength(5)

// ── 배열 ───────────────────────────────────────────────
expect([1, 2, 3]).toContain(2)
expect([1, 2, 3]).toHaveLength(3)
expect([1, 2, 3]).toEqual(expect.arrayContaining([1, 3])) // 부분 포함

// ── 에러 ───────────────────────────────────────────────
expect(() => fn()).toThrow()                    // 에러 발생
expect(() => fn()).toThrow('에러 메시지')       // 특정 메시지
expect(() => fn()).toThrow(TypeError)           // 특정 타입

// ── 부정 ───────────────────────────────────────────────
expect(value).not.toBe(3)          // not으로 부정
expect([]).not.toContain(1)
```

---

## 모킹 (Mocking)

실제 API 호출, 파일 시스템 접근 등은 테스트에 적합하지 않습니다.
**모킹**은 이런 외부 의존성을 가짜로 대체합니다.

```typescript
// src/services/userService.ts
import axios from 'axios'

export async function fetchUser(id: number) {
  const response = await axios.get(`/api/users/${id}`)
  return response.data
}
```

```typescript
// src/services/userService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { fetchUser } from './userService'

// axios 모듈 전체를 모킹
vi.mock('axios')

describe('fetchUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()  // 각 테스트 전에 모킹 초기화
  })

  it('사용자 데이터를 가져온다', async () => {
    // axios.get이 이 값을 반환하도록 설정
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: { id: 1, name: '홍길동' }
    })

    const user = await fetchUser(1)

    expect(user).toEqual({ id: 1, name: '홍길동' })
    expect(axios.get).toHaveBeenCalledWith('/api/users/1') // 올바른 URL로 호출됐는지
  })

  it('API 오류 시 에러를 전파한다', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network Error'))

    await expect(fetchUser(1)).rejects.toThrow('Network Error')
  })
})
```

### vi.fn() — 개별 함수 모킹

```typescript
import { vi } from 'vitest'

// 빈 모의 함수 생성
const mockFn = vi.fn()
mockFn()
expect(mockFn).toHaveBeenCalled()        // 호출됐는지
expect(mockFn).toHaveBeenCalledTimes(1)  // 몇 번 호출됐는지

// 반환값 설정
const mockAdd = vi.fn().mockReturnValue(10)
expect(mockAdd(1, 2)).toBe(10)

// 비동기 반환값
const mockFetch = vi.fn().mockResolvedValue({ data: 'hello' })

// 구현 제공
const mockCalculate = vi.fn().mockImplementation((a, b) => a * b)
expect(mockCalculate(3, 4)).toBe(12)
```

---

## React Testing Library — 사용자 관점 테스트

React 컴포넌트를 테스트할 때는 **React Testing Library**를 사용합니다.
"구현 세부사항"이 아니라 **사용자가 보는 것**을 테스트합니다.

```typescript
// src/components/Counter.tsx
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>현재 카운트: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>증가</button>
      <button onClick={() => setCount(c => c - 1)}>감소</button>
    </div>
  )
}

export default Counter
```

```typescript
// src/components/Counter.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Counter from './Counter'

describe('Counter 컴포넌트', () => {
  it('초기값 0을 표시한다', () => {
    render(<Counter />)  // 컴포넌트 렌더링

    // 화면에서 텍스트로 요소 찾기 (사용자 관점!)
    expect(screen.getByText('현재 카운트: 0')).toBeInTheDocument()
  })

  it('증가 버튼을 클릭하면 카운트가 1 증가한다', async () => {
    const user = userEvent.setup()
    render(<Counter />)

    // 사용자처럼 버튼 클릭
    await user.click(screen.getByRole('button', { name: '증가' }))

    expect(screen.getByText('현재 카운트: 1')).toBeInTheDocument()
  })

  it('감소 버튼을 클릭하면 카운트가 1 감소한다', async () => {
    const user = userEvent.setup()
    render(<Counter />)

    await user.click(screen.getByRole('button', { name: '감소' }))

    expect(screen.getByText('현재 카운트: -1')).toBeInTheDocument()
  })
})
```

### screen 쿼리 메서드

```typescript
// ── getBy (없으면 에러) ────────────────────────────────
screen.getByText('안녕하세요')           // 텍스트로 찾기
screen.getByRole('button', { name: '제출' }) // role + 접근 가능 이름
screen.getByLabelText('이름')            // label과 연결된 input
screen.getByPlaceholderText('검색...')   // placeholder
screen.getByTestId('user-card')          // data-testid 속성

// ── queryBy (없으면 null) ──────────────────────────────
// 요소가 없는 것을 검증할 때 사용
expect(screen.queryByText('에러')).not.toBeInTheDocument()

// ── findBy (비동기, Promise 반환) ──────────────────────
// 비동기로 나타나는 요소 대기
const element = await screen.findByText('로딩 완료')

// ── getAllBy (여러 개) ─────────────────────────────────
const buttons = screen.getAllByRole('button')
expect(buttons).toHaveLength(2)
```

### API 호출이 있는 컴포넌트 테스트

```typescript
// src/components/UserCard.tsx
import { useEffect, useState } from 'react'

function UserCard({ userId }: { userId: number }) {
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(data => {
        setUser(data)
        setLoading(false)
      })
  }, [userId])

  if (loading) return <p>로딩 중...</p>
  return <div>{user?.name}</div>
}
```

```typescript
// src/components/UserCard.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import UserCard from './UserCard'

// fetch 전역 함수 모킹
global.fetch = vi.fn()

describe('UserCard', () => {
  it('사용자 이름을 표시한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ name: '홍길동' }),
    } as Response)

    render(<UserCard userId={1} />)

    // 로딩 상태 확인
    expect(screen.getByText('로딩 중...')).toBeInTheDocument()

    // 데이터 로드 후 확인 (비동기 대기)
    await waitFor(() => {
      expect(screen.getByText('홍길동')).toBeInTheDocument()
    })
  })
})
```

---

## 커버리지 측정

커버리지는 **테스트가 얼마나 많은 코드를 실행했는지**를 보여줍니다.

```bash
# 커버리지 실행
npm run test:coverage

# 출력 예시
# Coverage report from v8
#  File                  | % Stmts | % Branch | % Funcs | % Lines
#  ─────────────────────────────────────────────────────────────
#  utils/math.ts         |   100   |    80    |   100   |   100
#  components/Counter.tsx|    90   |    75    |   100   |    90
```

- **Statements**: 실행된 코드 구문 비율
- **Branches**: if/else 분기 중 실행된 비율
- **Functions**: 호출된 함수 비율
- **Lines**: 실행된 코드 줄 비율

커버리지 100%가 목표가 아닙니다.
중요한 비즈니스 로직에 집중하세요.

---

## 흔한 실수들

### 실수 1: 구현 세부사항 테스트

```typescript
// ❌ 내부 상태를 직접 테스트 (깨지기 쉬움)
it('count state가 1 증가한다', () => {
  const { result } = renderHook(() => useState(0))
  act(() => result.current[1](1))
  expect(result.current[0]).toBe(1)
})

// ✅ 사용자가 보는 것을 테스트
it('증가 버튼 클릭 시 화면에 1이 표시된다', async () => {
  render(<Counter />)
  await userEvent.click(screen.getByRole('button', { name: '증가' }))
  expect(screen.getByText('현재 카운트: 1')).toBeInTheDocument()
})
```

### 실수 2: 테스트 간 상태 공유

```typescript
// ❌ 테스트 간에 상태가 공유됨
let user: User

it('첫 번째 테스트', () => {
  user = createUser('홍길동')
  // ...
})

it('두 번째 테스트', () => {
  expect(user.name).toBe('홍길동')  // 첫 번째 테스트 실패 시 이것도 실패
})

// ✅ 각 테스트가 독립적
it('두 번째 테스트', () => {
  const user = createUser('홍길동')  // 직접 생성
  expect(user.name).toBe('홍길동')
})
```

---

## 정리

- **Jest**: 가장 널리 사용되는 테스트 프레임워크
- **Vitest**: Vite 프로젝트에 최적화, Jest와 동일한 API
- **React Testing Library**: 사용자 관점에서 컴포넌트 테스트
- **모킹**: 외부 의존성을 가짜로 대체하여 독립적인 테스트
- **커버리지**: 테스트가 코드를 얼마나 커버하는지 측정

처음엔 유틸 함수부터 시작하세요.
순수 함수(입력 → 출력)는 테스트하기 가장 쉽습니다.
