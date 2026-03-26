---
title: "함수 타입"
order: 5
---

# 함수 타입

TypeScript에서 함수는 매개변수 타입과 반환값 타입을 명시할 수 있습니다. 이를 통해 함수를 잘못 사용하는 실수를 컴파일 타임에 잡을 수 있습니다.

---

## 기본 함수 타입

### JS에서는...

```js
// JS에서는 어떤 값을 넣어도 오류가 없음
function add(a, b) {
  return a + b;
}

add(1, 2);        // 3
add("1", "2");    // "12" (의도치 않은 결과!)
add(1, "2");      // "12" (오류지만 그냥 실행됨)
```

### TS에서는...

```ts
// 매개변수와 반환값에 타입 명시
function add(a: number, b: number): number {
  return a + b;
}

add(1, 2);        // 3
add("1", "2");    // 오류! string은 number가 아님
add(1, "2");      // 오류! "2"는 number가 아님
```

---

## 매개변수 타입 지정

### 선택적 매개변수 (Optional Parameter)

`?`를 붙이면 없어도 되는 매개변수가 됩니다.

```ts
// greeting은 없어도 됨
function greet(name: string, greeting?: string): string {
  // greeting이 없으면 기본 인사말 사용
  const message = greeting ?? "안녕하세요";
  return `${message}, ${name}님!`;
}

greet("김철수");               // "안녕하세요, 김철수님!"
greet("이영희", "반갑습니다"); // "반갑습니다, 이영희님!"
```

### 기본값 매개변수 (Default Parameter)

```ts
// greeting의 기본값 지정
function greet(name: string, greeting: string = "안녕하세요"): string {
  return `${greeting}, ${name}님!`;
}

greet("김철수");               // "안녕하세요, 김철수님!"
greet("이영희", "좋은 아침"); // "좋은 아침, 이영희님!"
```

### 나머지 매개변수 (Rest Parameter)

```ts
// 여러 개의 숫자를 받아서 합산
function sum(...numbers: number[]): number {
  return numbers.reduce((total, n) => total + n, 0);
}

sum(1, 2, 3);       // 6
sum(1, 2, 3, 4, 5); // 15
sum();               // 0

// 고정 매개변수와 함께 사용
function logMessage(level: string, ...messages: string[]): void {
  console.log(`[${level}]`, ...messages);
}

logMessage("INFO", "서버 시작됨");
logMessage("ERROR", "연결 실패", "재시도 중...");
```

---

## 반환 타입

### void: 반환값 없음

```ts
// 반환값이 없는 함수
function logError(message: string): void {
  console.error(message);
  // return "값" 이라고 쓰면 오류!
}
```

### never: 절대 반환 안 함

```ts
// 항상 예외를 던지거나 무한 루프인 함수
function throwError(message: string): never {
  throw new Error(message);
  // 이 아래 코드는 절대 실행되지 않음
}

function infiniteLoop(): never {
  while (true) {
    // 영원히 실행됨
  }
}
```

### 반환 타입 추론

TypeScript는 반환값을 보고 타입을 추론할 수 있습니다.

```ts
// 타입 명시 없어도 number로 추론됨
function multiply(a: number, b: number) {
  return a * b; // TypeScript가 number를 반환한다고 추론
}

// 복잡한 경우에는 명시적으로 쓰는 것이 좋음
function parseInput(input: string): number | null {
  const num = parseInt(input);
  return isNaN(num) ? null : num;
}
```

---

## 함수 타입 표현식

함수 자체를 타입으로 표현할 수 있습니다.

```ts
// 함수 타입 정의
type AddFunction = (a: number, b: number) => number;
type GreetFunction = (name: string) => string;
type CallbackFunction = (error: Error | null, result?: string) => void;

// 함수 타입을 변수에 적용
const add: AddFunction = (a, b) => a + b;
const greet: GreetFunction = (name) => `안녕하세요, ${name}님!`;

// 매개변수로 함수를 받을 때
function doMath(a: number, b: number, operation: AddFunction): number {
  return operation(a, b);
}

doMath(3, 4, (a, b) => a + b); // 7
doMath(3, 4, (a, b) => a * b); // 12
```

---

## 오버로드 (Overload)

같은 함수 이름으로 다른 매개변수 조합을 지원합니다.

```ts
// 오버로드 시그니처 (구현 없음)
function format(value: string): string;
function format(value: number): string;
function format(value: Date): string;

// 실제 구현 (유니온 타입 사용)
function format(value: string | number | Date): string {
  if (typeof value === "string") {
    return value.trim(); // 문자열: 공백 제거
  } else if (typeof value === "number") {
    return value.toLocaleString(); // 숫자: 천 단위 구분
  } else {
    return value.toLocaleDateString("ko-KR"); // 날짜: 한국어 형식
  }
}

console.log(format("  hello  ")); // "hello"
console.log(format(1234567));     // "1,234,567"
console.log(format(new Date()));  // "2026. 3. 26."
```

---

## 화살표 함수와 타입

```ts
// 화살표 함수에 타입 지정하는 방법들

// 방법 1: 매개변수와 반환값에 직접 지정
const add = (a: number, b: number): number => a + b;

// 방법 2: 함수 타입을 변수에 지정
const multiply: (a: number, b: number) => number = (a, b) => a * b;

// 방법 3: type 별칭으로 분리
type MathOperation = (a: number, b: number) => number;
const divide: MathOperation = (a, b) => a / b;

// 콜백 함수에 타입 지정
const numbers = [3, 1, 4, 1, 5, 9];

// sort의 콜백은 (a: number, b: number) => number 타입
const sorted = numbers.sort((a, b) => a - b);

// filter의 콜백은 (item: number) => boolean 타입
const evens = numbers.filter((n) => n % 2 === 0);
```

---

## 제네릭 함수 맛보기

타입을 매개변수처럼 받는 함수입니다. (자세한 내용은 제네릭 챕터에서)

```ts
// 어떤 타입의 배열이든 첫 번째 요소를 반환
function first<T>(array: T[]): T | undefined {
  return array[0];
}

const firstNum = first([1, 2, 3]);      // number | undefined
const firstStr = first(["a", "b", "c"]); // string | undefined
const firstUser = first([{ name: "김철수" }]); // { name: string } | undefined
```

---

## 실전 예제: 로그인 폼 처리

```ts
// 로그인 관련 타입들
type LoginInput = {
  email: string;
  password: string;
};

type LoginResult =
  | { success: true; token: string; userId: number }
  | { success: false; error: string };

// 유효성 검사 함수
function validateEmail(email: string): boolean {
  return email.includes("@") && email.includes(".");
}

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "비밀번호는 8자 이상이어야 합니다.";
  }
  if (!/[A-Z]/.test(password)) {
    return "대문자를 포함해야 합니다.";
  }
  return null; // 유효한 경우 null 반환
}

// 로그인 처리 함수
async function login(input: LoginInput): Promise<LoginResult> {
  // 유효성 검사
  if (!validateEmail(input.email)) {
    return { success: false, error: "올바른 이메일 형식이 아닙니다." };
  }

  const passwordError = validatePassword(input.password);
  if (passwordError) {
    return { success: false, error: passwordError };
  }

  // API 호출 (실제 구현)
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json();
    return { success: true, token: data.token, userId: data.userId };
  } catch (error) {
    return { success: false, error: "서버 오류가 발생했습니다." };
  }
}

// 사용
async function handleLogin() {
  const result = await login({ email: "user@example.com", password: "Password123" });

  if (result.success) {
    console.log("로그인 성공! 토큰:", result.token); // result.token 자동완성
  } else {
    console.log("로그인 실패:", result.error); // result.error 자동완성
  }
}
```

---

## 흔한 실수와 해결법

### 실수 1: 반환 타입 불일치

```ts
// 오류: 모든 경로에서 값을 반환해야 함
function getDiscount(price: number): number {
  if (price > 10000) {
    return price * 0.1; // 할인율 10%
  }
  // 반환값 없음! 오류
}

// 수정: 모든 경로에서 반환
function getDiscount(price: number): number {
  if (price > 10000) {
    return price * 0.1;
  }
  return 0; // 할인 없음
}
```

### 실수 2: 선택적 매개변수 순서

```ts
// 오류: 선택적 매개변수가 필수 매개변수보다 앞에 올 수 없음
function greet(greeting?: string, name: string): string { // 오류!
  return `${greeting}, ${name}`;
}

// 수정: 선택적 매개변수는 뒤에
function greet(name: string, greeting?: string): string {
  return `${greeting ?? "안녕하세요"}, ${name}`;
}
```

### 실수 3: async 함수 반환 타입

```ts
// async 함수는 항상 Promise를 반환
async function getData(): Promise<string> { // Promise<string>으로 감싸야 함
  return "데이터"; // string이지만 Promise<string>으로 자동 래핑
}

// void로 쓰면 안 됨
async function loadData(): void { // 오류! async는 Promise를 반환
  await fetch("/api/data");
}

// 수정
async function loadData(): Promise<void> {
  await fetch("/api/data");
}
```

---

## 정리

| 문법 | 설명 | 예시 |
|------|------|------|
| `param: Type` | 매개변수 타입 | `name: string` |
| `param?: Type` | 선택적 매개변수 | `greeting?: string` |
| `param = value` | 기본값 | `greeting = "안녕"` |
| `...params: Type[]` | 나머지 매개변수 | `...nums: number[]` |
| `): ReturnType` | 반환 타입 | `): number` |
| `): void` | 반환값 없음 | `): void` |
| `): never` | 절대 반환 안 함 | `): never` |
| `): Promise<T>` | 비동기 함수 | `): Promise<string>` |
