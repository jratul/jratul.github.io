---
title: "유틸리티 타입"
order: 9
---

# 유틸리티 타입 (Utility Types)

TypeScript에 내장된 유틸리티 타입들은 기존 타입을 변환해서 새로운 타입을 만들 때 사용합니다. 자주 필요한 타입 변환 패턴을 미리 만들어 놓은 것입니다.

---

## Partial\<T\>: 모든 속성을 선택적으로

모든 필수 속성을 선택적(`?`)으로 만듭니다. 업데이트 기능에 자주 사용됩니다.

```ts
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

// 모든 속성이 필수인 User
const fullUser: User = {
  id: 1,
  name: "김철수",
  email: "kim@example.com",
  age: 25,
};

// Partial<User>: 모든 속성이 선택적
type PartialUser = Partial<User>;
// { id?: number; name?: string; email?: string; age?: number; }

// 업데이트 함수: 일부 속성만 수정
function updateUser(id: number, updates: Partial<User>): void {
  console.log(`사용자 ${id} 업데이트:`, updates);
}

updateUser(1, { name: "이영희" });           // name만 변경
updateUser(1, { email: "lee@example.com", age: 26 }); // 여러 속성 변경
```

---

## Required\<T\>: 모든 속성을 필수로

모든 선택적(`?`) 속성을 필수로 만듭니다.

```ts
interface Config {
  host?: string;
  port?: number;
  debug?: boolean;
}

// 기본값으로 빈 설정 생성 가능
const partialConfig: Config = {};

// Required<Config>: 모든 속성이 필수
type FullConfig = Required<Config>;
// { host: string; port: number; debug: boolean; }

// 설정 완성 후에는 모든 속성이 있음을 보장
function initializeApp(config: FullConfig): void {
  console.log(`서버 시작: ${config.host}:${config.port}`);
}

const finalConfig: FullConfig = {
  host: "localhost",
  port: 3000,
  debug: true,
};

initializeApp(finalConfig);
```

---

## Readonly\<T\>: 모든 속성을 읽기 전용으로

모든 속성을 수정할 수 없게 만듭니다.

```ts
interface Point {
  x: number;
  y: number;
}

const mutablePoint: Point = { x: 1, y: 2 };
mutablePoint.x = 10; // 변경 가능

const immutablePoint: Readonly<Point> = { x: 1, y: 2 };
// immutablePoint.x = 10; // 오류! 읽기 전용

// 배열을 읽기 전용으로
const arr: ReadonlyArray<number> = [1, 2, 3];
// arr.push(4);    // 오류!
// arr[0] = 10;   // 오류!
console.log(arr[0]); // 읽기만 가능

// 실전: 상태 객체를 불변으로 관리
type AppState = Readonly<{
  user: Readonly<User>;
  settings: Readonly<Config>;
  isLoggedIn: boolean;
}>;
```

---

## Pick\<T, K\>: 특정 속성만 선택

타입에서 원하는 속성들만 골라서 새로운 타입을 만듭니다.

```ts
interface Article {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  views: number;
  tags: string[];
}

// 목록 표시용: 일부 속성만 필요
type ArticlePreview = Pick<Article, "id" | "title" | "author" | "createdAt">;
// { id: number; title: string; author: string; createdAt: Date; }

// 작성 폼용: 사용자가 입력하는 속성만
type CreateArticleForm = Pick<Article, "title" | "content" | "tags">;

function displayArticleList(articles: ArticlePreview[]): void {
  articles.forEach(article => {
    console.log(`[${article.id}] ${article.title} - ${article.author}`);
    // article.content 접근 불가 (Pick에 포함 안 됨)
  });
}
```

---

## Omit\<T, K\>: 특정 속성 제외

타입에서 원하지 않는 속성들을 제거해서 새로운 타입을 만듭니다.

```ts
interface UserWithPassword {
  id: number;
  name: string;
  email: string;
  password: string; // 민감 정보
  createdAt: Date;
}

// 비밀번호 제외한 안전한 사용자 타입
type SafeUser = Omit<UserWithPassword, "password">;
// { id: number; name: string; email: string; createdAt: Date; }

// DB 저장용: id와 createdAt은 자동 생성
type CreateUserInput = Omit<UserWithPassword, "id" | "createdAt">;
// { name: string; email: string; password: string; }

function getPublicUserInfo(user: UserWithPassword): SafeUser {
  const { password, ...safeUser } = user; // 비밀번호 제외
  return safeUser;
}

// Pick vs Omit
// - 제외할 게 많으면 Pick (원하는 것만 명시)
// - 제외할 게 적으면 Omit (제외할 것만 명시)
```

---

## Record\<K, V\>: 키-값 맵 타입

특정 키와 값 타입의 객체를 표현합니다.

```ts
// 모든 카테고리에 대한 아이템 수
type CategoryCount = Record<string, number>;
const counts: CategoryCount = {
  "JavaScript": 15,
  "TypeScript": 8,
  "React": 12,
};

// 유니온 타입을 키로 사용
type DayOfWeek = "월" | "화" | "수" | "목" | "금" | "토" | "일";
type Schedule = Record<DayOfWeek, string[]>;

const weekSchedule: Schedule = {
  "월": ["회의", "코드리뷰"],
  "화": ["개발"],
  "수": ["개발", "스터디"],
  "목": ["개발"],
  "금": ["데모", "회고"],
  "토": [],
  "일": ["개인 공부"],
};

// Enum을 키로 사용
enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  Pending = "PENDING",
}

type StatusLabel = Record<Status, string>;
const statusLabels: StatusLabel = {
  [Status.Active]: "활성",
  [Status.Inactive]: "비활성",
  [Status.Pending]: "대기 중",
};
```

---

## Exclude\<T, U\>와 Extract\<T, U\>

유니온 타입에서 특정 타입을 제거하거나 추출합니다.

```ts
type AllStatus = "active" | "inactive" | "pending" | "deleted";

// Exclude: 유니온에서 특정 타입 제거
type ActiveStatus = Exclude<AllStatus, "deleted" | "inactive">;
// "active" | "pending"

// Extract: 유니온에서 특정 타입만 추출
type DeletionStatus = Extract<AllStatus, "deleted" | "inactive">;
// "inactive" | "deleted"

// 실전 예시
type StringOrNumber = string | number | boolean | null | undefined;

type JustPrimitives = Exclude<StringOrNumber, null | undefined>;
// string | number | boolean

type Nullable = Extract<StringOrNumber, null | undefined>;
// null | undefined
```

---

## NonNullable\<T\>: null과 undefined 제거

```ts
type MaybeString = string | null | undefined;

// null과 undefined 제거
type DefinitelyString = NonNullable<MaybeString>;
// string

// 실전: API에서 받은 데이터 처리
interface ApiUser {
  name: string | null;
  email: string | undefined;
  phone: string | null | undefined;
}

// null/undefined 제거 후 타입
type CleanUser = {
  [K in keyof ApiUser]: NonNullable<ApiUser[K]>;
};
// { name: string; email: string; phone: string; }
```

---

## ReturnType\<T\>와 Parameters\<T\>

함수 타입에서 반환값 타입과 매개변수 타입을 추출합니다.

```ts
function createUser(name: string, age: number): { id: number; name: string; age: number } {
  return { id: Math.random(), name, age };
}

// 반환 타입 추출
type UserType = ReturnType<typeof createUser>;
// { id: number; name: string; age: number }

// 매개변수 타입 추출
type CreateUserParams = Parameters<typeof createUser>;
// [name: string, age: number]

// 실전: 기존 함수의 타입을 재활용
function processUser(user: ReturnType<typeof createUser>): void {
  console.log(`사용자 ${user.name} (ID: ${user.id}) 처리 중`);
}

// 함수 래퍼를 만들 때 유용
function withLogging<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args) => {
    console.log("함수 호출:", fn.name, "인자:", args);
    const result = fn(...args);
    console.log("결과:", result);
    return result;
  };
}

const loggedCreateUser = withLogging(createUser);
loggedCreateUser("김철수", 25);
```

---

## 실전 예제: Todo 앱 타입 활용

```ts
// 기본 Todo 타입
interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// 생성 시: id, createdAt, updatedAt은 자동 생성
type CreateTodoInput = Omit<Todo, "id" | "createdAt" | "updatedAt">;

// 수정 시: 일부 필드만 변경
type UpdateTodoInput = Partial<Omit<Todo, "id" | "createdAt">>;

// 목록 표시 시: 상세 내용 제외
type TodoSummary = Pick<Todo, "id" | "title" | "completed" | "priority">;

// 읽기 전용 상태 (변경 불가)
type ImmutableTodo = Readonly<Todo>;

// 저장소 타입
type TodoStore = Record<number, ImmutableTodo>;

// 실제 함수들
function createTodo(input: CreateTodoInput): Todo {
  const now = new Date();
  return {
    id: Date.now(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
}

function updateTodo(todo: Todo, updates: UpdateTodoInput): Todo {
  return {
    ...todo,
    ...updates,
    updatedAt: new Date(),
  };
}

function toSummary(todo: Todo): TodoSummary {
  return {
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    priority: todo.priority,
  };
}
```

---

## 흔한 실수와 해결법

### 실수: Partial을 과도하게 사용

```ts
// 나쁜 예 - 모든 것을 Partial로 만들면 undefined 처리 필요
function showUser(user: Partial<User>): void {
  console.log(user.name.toUpperCase()); // 오류! name이 undefined일 수 있음
}

// 좋은 예 - 필요한 곳에만 사용
function updateUser(id: number, updates: Partial<User>): void {
  // updates는 일부 속성만 포함할 수 있음
  if (updates.name) {
    console.log(`이름 변경: ${updates.name}`);
  }
}
```

### 실수: Record의 키 타입에 너무 넓은 타입 사용

```ts
// 나쁜 예 - 어떤 키든 허용되어 오타 감지 불가
const config: Record<string, string> = {
  "hots": "localhost", // 오타지만 오류 없음
};

// 좋은 예 - 허용되는 키를 명시
type ConfigKey = "host" | "port" | "database";
const config: Record<ConfigKey, string> = {
  "host": "localhost",
  "prot": "3000", // 오류! "prot"는 ConfigKey가 아님
};
```

---

## 정리

| 유틸리티 타입 | 설명 | 주 사용처 |
|-------------|------|---------|
| `Partial<T>` | 모든 속성 선택적으로 | 업데이트 입력값 |
| `Required<T>` | 모든 속성 필수로 | 완성된 데이터 검증 |
| `Readonly<T>` | 모든 속성 읽기 전용 | 불변 상태 관리 |
| `Pick<T, K>` | 특정 속성만 선택 | 뷰용 타입, 폼 입력 |
| `Omit<T, K>` | 특정 속성 제외 | 민감 정보 제거 |
| `Record<K, V>` | 키-값 맵 | 딕셔너리, 설정값 |
| `Exclude<T, U>` | 유니온에서 제거 | 타입 필터링 |
| `Extract<T, U>` | 유니온에서 추출 | 서브타입 추출 |
| `NonNullable<T>` | null/undefined 제거 | 안전한 타입 보장 |
| `ReturnType<T>` | 반환 타입 추출 | 함수 반환값 재활용 |
| `Parameters<T>` | 매개변수 타입 추출 | 함수 래퍼 작성 |
