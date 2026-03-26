---
title: "타입 별칭과 유니온/인터섹션"
order: 4
---

# 타입 별칭과 유니온/인터섹션

타입 별칭(Type Alias), 유니온(Union), 인터섹션(Intersection)은 TypeScript에서 복잡한 타입을 표현하는 핵심 도구입니다.

---

## 타입 별칭 (Type Alias)

### JS에서는...

JavaScript에서는 타입이 없기 때문에, 어떤 값이 들어와야 하는지 코드만 봐서는 알 수 없습니다.

```js
// JS에서는 이게 어떤 형태의 객체인지 함수 본문을 봐야 알 수 있음
function greetUser(user) {
  console.log(`안녕하세요, ${user.name}님!`);
}
```

### TS에서는...

`type` 키워드로 타입에 이름을 붙여서 재사용할 수 있습니다.

```ts
// 타입 별칭 정의
type User = {
  id: number;
  name: string;
  email: string;
};

// 함수 매개변수에 타입 별칭 사용
function greetUser(user: User): void {
  console.log(`안녕하세요, ${user.name}님!`); // 자동완성 지원!
}

// 기본 타입에도 별칭 가능
type UserId = number;
type UserName = string;

const id: UserId = 1;
const name: UserName = "김철수";
```

### type vs interface

TypeScript에는 `type`과 `interface` 두 가지 방식으로 객체 형태를 정의할 수 있습니다.

```ts
// interface 방식
interface ProductInterface {
  id: number;
  name: string;
  price: number;
}

// type 방식
type ProductType = {
  id: number;
  name: string;
  price: number;
};

// 대부분의 경우 둘 다 사용 가능
const item1: ProductInterface = { id: 1, name: "사과", price: 1000 };
const item2: ProductType = { id: 2, name: "배", price: 2000 };
```

**차이점:**
- `interface`는 선언 병합(Declaration Merging)이 가능
- `type`은 유니온, 인터섹션, 튜플 등 더 다양한 타입 표현 가능
- 객체 타입은 `interface`, 그 외 복잡한 타입은 `type`을 주로 사용

---

## 유니온 타입 (Union Type)

### 유니온이란?

"A이거나 B이다"를 표현하는 타입입니다. `|` 기호를 사용합니다.

```ts
// string 또는 number 타입
type StringOrNumber = string | number;

let value: StringOrNumber;
value = "안녕하세요"; // 가능
value = 42;           // 가능
value = true;         // 오류! boolean은 허용 안 됨
```

### 실전 예제: API 응답 처리

```ts
// 성공 또는 실패 응답
type ApiResponse =
  | { status: "success"; data: string[] }
  | { status: "error"; message: string };

function handleResponse(response: ApiResponse) {
  if (response.status === "success") {
    // 여기서 response.data 자동완성 가능
    console.log("데이터:", response.data);
  } else {
    // 여기서 response.message 자동완성 가능
    console.log("오류:", response.message);
  }
}
```

### 리터럴 타입과 유니온

특정 값만 허용하는 타입을 만들 수 있습니다.

```ts
// "pending", "active", "inactive" 중 하나만 허용
type UserStatus = "pending" | "active" | "inactive";

// 1, 2, 3 중 하나만 허용
type Priority = 1 | 2 | 3;

interface Todo {
  id: number;
  title: string;
  status: UserStatus; // 정해진 값만 허용
  priority: Priority;
}

const todo: Todo = {
  id: 1,
  title: "TypeScript 공부하기",
  status: "active",   // "active"는 UserStatus에 포함
  priority: 2,
};

// 잘못된 값 시도
const badTodo: Todo = {
  id: 2,
  title: "운동하기",
  status: "done",  // 오류! "done"은 UserStatus에 없음
  priority: 5,     // 오류! 5는 Priority에 없음
};
```

---

## 인터섹션 타입 (Intersection Type)

### 인터섹션이란?

"A이면서 B이다"를 표현하는 타입입니다. `&` 기호를 사용합니다. 두 타입의 모든 속성을 다 가져야 합니다.

```ts
type HasName = {
  name: string;
};

type HasAge = {
  age: number;
};

// HasName의 속성 + HasAge의 속성 모두 필요
type Person = HasName & HasAge;

const person: Person = {
  name: "김철수", // HasName에서 온 속성
  age: 25,        // HasAge에서 온 속성
};

// 하나라도 빠지면 오류
const incomplete: Person = {
  name: "이영희", // age가 없어서 오류!
};
```

### 실전 예제: 역할 조합

```ts
type BaseUser = {
  id: number;
  name: string;
  email: string;
};

type AdminRole = {
  canDelete: boolean;
  canManageUsers: boolean;
};

type ModeratorRole = {
  canBanUsers: boolean;
  canEditPosts: boolean;
};

// 관리자 = 기본 유저 + 관리자 역할
type AdminUser = BaseUser & AdminRole;

// 중재자 = 기본 유저 + 중재자 역할
type ModeratorUser = BaseUser & ModeratorRole;

const admin: AdminUser = {
  id: 1,
  name: "관리자",
  email: "admin@example.com",
  canDelete: true,
  canManageUsers: true,
};
```

---

## 유니온과 인터섹션 비교

```ts
type A = { a: string };
type B = { b: number };

// 유니온: A이거나 B (둘 중 하나면 됨)
type AorB = A | B;
const x1: AorB = { a: "hello" };      // A만 있어도 OK
const x2: AorB = { b: 42 };           // B만 있어도 OK
const x3: AorB = { a: "hello", b: 42 }; // 둘 다 있어도 OK

// 인터섹션: A이면서 B (둘 다 있어야 함)
type AandB = A & B;
const y1: AandB = { a: "hello", b: 42 }; // 둘 다 있어야 함
const y2: AandB = { a: "hello" };         // 오류! b가 없음
```

---

## 튜플 타입 (Tuple Type)

고정된 길이와 각 위치의 타입이 정해진 배열입니다.

```ts
// [string, number] 형태의 튜플
type Coordinate = [number, number]; // [x, y]
type NameAge = [string, number];    // [이름, 나이]

const point: Coordinate = [10, 20];
const person: NameAge = ["김철수", 25];

// 잘못된 사용
const bad1: Coordinate = [10, 20, 30]; // 오류! 길이가 다름
const bad2: NameAge = [25, "김철수"];  // 오류! 순서가 다름

// useState의 반환값도 튜플
// [value, setValue] 형태
function useState<T>(initial: T): [T, (value: T) => void] {
  let state = initial;
  const setState = (value: T) => { state = value; };
  return [state, setState];
}
```

---

## 실전 예제: Todo 앱 타입 정의

```ts
// 기본 타입들
type TodoId = number;
type TodoStatus = "todo" | "in-progress" | "done";
type Priority = "low" | "medium" | "high";

// Todo 아이템 타입
type TodoItem = {
  id: TodoId;
  title: string;
  description?: string; // ?는 optional (없어도 됨)
  status: TodoStatus;
  priority: Priority;
  createdAt: Date;
  tags: string[];
};

// 새 Todo 생성 시 (id, createdAt은 자동 생성)
type CreateTodoInput = Omit<TodoItem, "id" | "createdAt">;

// Todo 업데이트 시 (일부 필드만 변경 가능)
type UpdateTodoInput = Partial<Pick<TodoItem, "title" | "description" | "status" | "priority">>;

// 함수에 타입 적용
function createTodo(input: CreateTodoInput): TodoItem {
  return {
    id: Math.random(), // 실제로는 DB에서 생성
    createdAt: new Date(),
    ...input,
  };
}

function updateTodo(id: TodoId, updates: UpdateTodoInput): void {
  console.log(`Todo ${id} 업데이트:`, updates);
}

// 사용 예시
const newTodo = createTodo({
  title: "TypeScript 공부하기",
  status: "todo",
  priority: "high",
  tags: ["typescript", "study"],
});

updateTodo(1, { status: "done" }); // 일부 필드만 업데이트
```

---

## 흔한 실수와 해결법

### 실수 1: any 타입으로 유니온 회피

```ts
// 나쁜 예 - any를 사용하면 타입 안전성이 없어짐
function process(value: any) {
  value.toUpperCase(); // 런타임에 오류 발생 가능
}

// 좋은 예 - 유니온으로 명확하게
function process(value: string | number) {
  if (typeof value === "string") {
    value.toUpperCase(); // 안전! string임이 보장됨
  } else {
    value.toFixed(2); // 안전! number임이 보장됨
  }
}
```

### 실수 2: 너무 넓은 타입

```ts
// 나쁜 예 - string이면 뭐든 됨
type Status = string;

// 좋은 예 - 허용되는 값을 명시
type Status = "active" | "inactive" | "pending";
```

### 실수 3: 인터섹션 타입 충돌

```ts
// 같은 이름의 속성이 다른 타입이면 never가 됨
type A = { value: string };
type B = { value: number };

type AB = A & B;
// AB.value의 타입은 string & number = never (불가능한 타입)

const x: AB = { value: "hello" }; // 오류!
const y: AB = { value: 42 };      // 오류!
```

---

## 정리

| 개념 | 기호 | 의미 | 예시 |
|------|------|------|------|
| 타입 별칭 | `type X = ...` | 타입에 이름 붙이기 | `type Age = number` |
| 유니온 | `A \| B` | A이거나 B | `string \| number` |
| 인터섹션 | `A & B` | A이면서 B | `User & Admin` |
| 리터럴 | `"a" \| "b"` | 특정 값만 허용 | `"yes" \| "no"` |
| 튜플 | `[A, B]` | 고정 형태 배열 | `[string, number]` |
