---
title: "제네릭"
order: 7
---

# 제네릭 (Generics)

제네릭은 타입을 매개변수처럼 받는 기능입니다. 코드를 한 번 작성하고 다양한 타입에 재사용할 수 있게 해줍니다.

---

## 제네릭이 왜 필요한가?

### 문제: 코드 중복

```ts
// 숫자 배열의 첫 번째 요소 반환
function firstNumber(arr: number[]): number | undefined {
  return arr[0];
}

// 문자열 배열의 첫 번째 요소 반환
function firstString(arr: string[]): string | undefined {
  return arr[0];
}

// 불리언 배열의 첫 번째 요소 반환
function firstBoolean(arr: boolean[]): boolean | undefined {
  return arr[0];
}

// 로직은 완전히 같은데 타입만 다름 - 비효율적!
```

### 해결: any 타입 (나쁜 방법)

```ts
// any를 사용하면 타입 정보가 사라짐
function first(arr: any[]): any {
  return arr[0];
}

const num = first([1, 2, 3]);     // 타입이 any (number가 아님!)
num.toFixed(2);  // 런타임에서야 오류를 알 수 있음
num.toUpperCase(); // 오류지만 TypeScript가 잡지 못함
```

### 해결: 제네릭 (좋은 방법)

```ts
// T는 타입 매개변수 (아무 이름이나 사용 가능)
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const num = first([1, 2, 3]);           // T = number로 추론, 반환 타입: number | undefined
const str = first(["a", "b", "c"]);    // T = string으로 추론, 반환 타입: string | undefined
const bool = first([true, false]);      // T = boolean으로 추론

// 이제 타입 정보가 보존됨!
num?.toFixed(2);      // number 메서드 사용 가능
str?.toUpperCase();   // string 메서드 사용 가능
```

---

## 제네릭 함수

```ts
// 배열에서 요소를 찾는 제네릭 함수
function findItem<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
  return arr.find(predicate);
}

// 사용 예시
const numbers = [1, 2, 3, 4, 5];
const found = findItem(numbers, n => n > 3); // T = number

const users = [
  { id: 1, name: "김철수" },
  { id: 2, name: "이영희" },
];
const user = findItem(users, u => u.id === 1); // T = { id: number, name: string }
console.log(user?.name); // "김철수"

// 두 값을 교환하는 함수
function swap<T>(a: T, b: T): [T, T] {
  return [b, a];
}

const [x, y] = swap(1, 2);           // [2, 1]
const [first, second] = swap("hello", "world"); // ["world", "hello"]
```

---

## 여러 타입 매개변수

```ts
// 두 타입을 받는 제네릭 함수
function pair<K, V>(key: K, value: V): { key: K; value: V } {
  return { key, value };
}

const p1 = pair("name", "김철수");   // { key: string, value: string }
const p2 = pair(1, true);            // { key: number, value: boolean }
const p3 = pair("age", 25);          // { key: string, value: number }

// Map과 유사한 제네릭 함수
function mapValue<K, V, R>(
  map: Map<K, V>,
  transform: (value: V) => R
): Map<K, R> {
  const result = new Map<K, R>();
  map.forEach((value, key) => {
    result.set(key, transform(value));
  });
  return result;
}

const prices = new Map([["사과", 1000], ["배", 2000]]);
const doubled = mapValue(prices, price => price * 2);
// Map { "사과" => 2000, "배" => 4000 }
```

---

## 제네릭 인터페이스와 타입

```ts
// 제네릭 인터페이스
interface Container<T> {
  value: T;
  getValue(): T;
  setValue(newValue: T): void;
}

class Box<T> implements Container<T> {
  constructor(public value: T) {}

  getValue(): T {
    return this.value;
  }

  setValue(newValue: T): void {
    this.value = newValue;
  }
}

const numBox = new Box(42);           // Box<number>
const strBox = new Box("hello");      // Box<string>

numBox.setValue(100);                 // OK
// numBox.setValue("string");         // 오류! number가 아님

// 제네릭 타입 별칭
type Nullable<T> = T | null;
type Optional<T> = T | undefined;
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

// 사용 예시
type NullableString = Nullable<string>;     // string | null
type OptionalNumber = Optional<number>;     // number | undefined
type FetchResult = Result<string[], Error>; // 성공/실패 결과
```

---

## 제네릭 제약 (Constraints)

`extends`를 사용해 타입 매개변수의 범위를 제한할 수 있습니다.

```ts
// T는 반드시 length 속성을 가져야 함
function getLength<T extends { length: number }>(item: T): number {
  return item.length;
}

getLength("hello");        // 5 (string은 length 있음)
getLength([1, 2, 3]);     // 3 (배열은 length 있음)
getLength({ length: 10 }); // 10 (length 속성 있음)
// getLength(42);           // 오류! number는 length 없음

// 객체의 키를 제약으로 사용
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: "김철수", email: "kim@example.com" };

const id = getProperty(user, "id");       // number
const name = getProperty(user, "name");   // string
// getProperty(user, "phone");            // 오류! "phone"은 user의 키가 아님

// 비교 가능한 타입만 받는 함수
function max<T extends number | string>(a: T, b: T): T {
  return a > b ? a : b;
}

max(3, 7);           // 7
max("apple", "mango"); // "mango" (알파벳 순 비교)
// max(3, "hello");   // 오류! 같은 타입이어야 함
```

---

## 제네릭 클래스

```ts
// 스택 자료구조 (LIFO: Last In, First Out)
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  get size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

// 숫자 스택
const numStack = new Stack<number>();
numStack.push(1);
numStack.push(2);
numStack.push(3);
console.log(numStack.pop()); // 3 (마지막에 넣은 것이 먼저 나옴)

// 문자열 스택
const strStack = new Stack<string>();
strStack.push("첫 번째");
strStack.push("두 번째");
console.log(strStack.peek()); // "두 번째" (꺼내지는 않음)
```

---

## 실전 예제: API 응답 래퍼

```ts
// API 응답을 감싸는 제네릭 타입
type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  timestamp: Date;
};

// API 호출 함수
async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP 오류: ${response.status}`);
    }
    const data: T = await response.json();
    return {
      data,
      error: null,
      loading: false,
      timestamp: new Date(),
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "알 수 없는 오류",
      loading: false,
      timestamp: new Date(),
    };
  }
}

// 사용 예시
type User = { id: number; name: string; email: string };
type Post = { id: number; title: string; content: string };

// 타입에 따라 data의 타입이 달라짐
const userResponse = await fetchData<User>("/api/user/1");
if (userResponse.data) {
  console.log(userResponse.data.name); // string 자동완성
}

const postsResponse = await fetchData<Post[]>("/api/posts");
if (postsResponse.data) {
  postsResponse.data.forEach(post => {
    console.log(post.title); // string 자동완성
  });
}
```

---

## 유틸리티 타입의 내부 (제네릭 활용)

TypeScript 내장 유틸리티 타입도 제네릭으로 만들어져 있습니다.

```ts
// Partial<T>: 모든 속성을 선택적으로
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

// Required<T>: 모든 속성을 필수로
type MyRequired<T> = {
  [K in keyof T]-?: T[K];
};

// Readonly<T>: 모든 속성을 읽기 전용으로
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};

// Pick<T, K>: 특정 속성만 선택
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// 사용 예시
interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

type PartialTodo = MyPartial<Todo>;
// { id?: number; title?: string; completed?: boolean; }

type ReadonlyTodo = MyReadonly<Todo>;
// { readonly id: number; readonly title: string; readonly completed: boolean; }

type TodoPreview = MyPick<Todo, "id" | "title">;
// { id: number; title: string; }
```

---

## 흔한 실수와 해결법

### 실수 1: 제네릭을 any처럼 사용

```ts
// 나쁜 예 - 제네릭 의미 없음
function bad<T>(value: T): any {
  return value as any; // T 정보가 사라짐
}

// 좋은 예 - T를 활용
function good<T>(value: T): T {
  return value; // T 타입 유지
}
```

### 실수 2: 불필요한 제네릭

```ts
// 불필요한 제네릭 (T가 단 한 번만 사용됨)
function print<T>(value: T): void {
  console.log(value);
}

// 더 간단하게
function print(value: unknown): void {
  console.log(value);
}
```

### 실수 3: 제약 없이 메서드 접근

```ts
// 오류: T에 length가 있다는 보장 없음
function getLength<T>(item: T): number {
  return item.length; // 오류!
}

// 수정: 제약 추가
function getLength<T extends { length: number }>(item: T): number {
  return item.length; // OK
}
```

---

## 정리

제네릭은 **타입을 변수처럼** 다루는 기능입니다.

| 문법 | 설명 | 예시 |
|------|------|------|
| `function f<T>` | 함수 제네릭 | `function first<T>(arr: T[])` |
| `interface I<T>` | 인터페이스 제네릭 | `interface Box<T>` |
| `class C<T>` | 클래스 제네릭 | `class Stack<T>` |
| `T extends U` | 타입 제약 | `T extends { length: number }` |
| `keyof T` | T의 키 타입 | `K extends keyof T` |
| `<T = 기본값>` | 기본 타입 | `type Result<T, E = Error>` |
