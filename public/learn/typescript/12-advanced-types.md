---
title: "고급 타입 (Mapped, Conditional)"
order: 12
---

# 고급 타입: Mapped 타입과 Conditional 타입

TypeScript의 고급 타입은 기존 타입을 기반으로 새로운 타입을 동적으로 생성합니다. 복잡한 타입 변환을 자동화할 수 있습니다.

---

## Mapped 타입 (매핑된 타입)

기존 타입의 모든 속성을 순회하며 변환합니다.

### 기본 문법

```ts
// [K in keyof T]: 타입 T의 모든 키를 순회
type ReadOnly<T> = {
  readonly [K in keyof T]: T[K]; // 모든 속성을 readonly로
};

type Optional<T> = {
  [K in keyof T]?: T[K]; // 모든 속성을 optional로
};

type Stringify<T> = {
  [K in keyof T]: string; // 모든 값 타입을 string으로
};

// 사용 예시
interface User {
  id: number;
  name: string;
  email: string;
}

type ReadOnlyUser = ReadOnly<User>;
// { readonly id: number; readonly name: string; readonly email: string; }

type PartialUser = Optional<User>;
// { id?: number; name?: string; email?: string; }
```

---

## Mapped 타입 수정자

속성에 `readonly`와 `?`를 추가하거나 제거합니다.

```ts
// + 추가 (기본값), - 제거
type Mutable<T> = {
  -readonly [K in keyof T]: T[K]; // readonly 제거
};

type Required<T> = {
  [K in keyof T]-?: T[K]; // ? 제거 (필수로)
};

interface PartialConfig {
  host?: string;
  port?: number;
  readonly version: string;
}

// 모든 속성을 필수 + 변경 가능으로
type FullConfig = Mutable<Required<PartialConfig>>;
// { host: string; port: number; version: string; }
// (readonly 제거, ? 제거)
```

---

## 키 재매핑 (Key Remapping)

`as` 키워드로 키를 변환할 수 있습니다.

```ts
// getter 메서드 이름 생성 (name → getName)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number; }

// 특정 키 필터링 (never로 제외)
type ExcludePrivate<T> = {
  [K in keyof T as K extends `_${string}` ? never : K]: T[K];
};

interface WithPrivate {
  name: string;
  _secret: string;  // 언더스코어로 시작하는 비공개 필드
  email: string;
  _internal: number;
}

type PublicOnly = ExcludePrivate<WithPrivate>;
// { name: string; email: string; }
```

---

## Conditional 타입 (조건부 타입)

조건에 따라 다른 타입을 반환합니다. `삼항 연산자`처럼 동작합니다.

```ts
// T extends U ? X : Y
// "T가 U에 할당 가능하면 X 타입, 아니면 Y 타입"

type IsString<T> = T extends string ? "yes" : "no";

type A = IsString<string>;  // "yes"
type B = IsString<number>;  // "no"
type C = IsString<"hello">; // "yes" (string 리터럴은 string에 할당 가능)

// 배열 여부 확인
type IsArray<T> = T extends any[] ? true : false;
type D = IsArray<string[]>; // true
type E = IsArray<string>;   // false

// 함수 여부 확인
type IsFunction<T> = T extends (...args: any[]) => any ? "함수" : "함수 아님";
type F = IsFunction<() => void>; // "함수"
type G = IsFunction<string>;     // "함수 아님"
```

---

## infer: 타입 추론

조건부 타입 내에서 타입을 추출합니다.

```ts
// 배열 요소 타입 추출
type ElementType<T> = T extends (infer E)[] ? E : never;

type NumType = ElementType<number[]>;   // number
type StrType = ElementType<string[]>;   // string
type ObjType = ElementType<{ id: number }[]>; // { id: number }

// 함수 반환 타입 추출 (ReturnType의 직접 구현)
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function createUser(name: string): { id: number; name: string } {
  return { id: 1, name };
}

type UserType = MyReturnType<typeof createUser>;
// { id: number; name: string }

// Promise에서 값 타입 추출
type Awaited<T> = T extends Promise<infer U> ? U : T;

type PromiseString = Awaited<Promise<string>>;  // string
type PlainNumber = Awaited<number>;              // number (Promise 아니면 그대로)

// 중첩 Promise도 처리
type DeepAwaited<T> = T extends Promise<infer U> ? DeepAwaited<U> : T;
type Nested = DeepAwaited<Promise<Promise<string>>>; // string
```

---

## 분산적 조건부 타입 (Distributive Conditional Types)

유니온 타입에 조건부 타입을 적용하면 각 멤버에 개별 적용됩니다.

```ts
// 유니온의 각 멤버에 조건부 타입 적용
type IsStringType<T> = T extends string ? "yes" : "no";

// T가 string | number | boolean일 때
type Result = IsStringType<string | number | boolean>;
// = IsStringType<string> | IsStringType<number> | IsStringType<boolean>
// = "yes" | "no" | "no"
// = "yes" | "no"

// 유용한 활용: null/undefined 제거
type NonNullableCustom<T> = T extends null | undefined ? never : T;

type MaybeString = string | null | undefined;
type CleanString = NonNullableCustom<MaybeString>;
// = NonNullableCustom<string> | NonNullableCustom<null> | NonNullableCustom<undefined>
// = string | never | never
// = string

// 분산 방지: [] 로 감싸기
type IsStringNoDistribute<T> = [T] extends [string] ? "yes" : "no";
type X = IsStringNoDistribute<string | number>; // "no" (유니온 전체를 비교)
```

---

## Template Literal 타입

문자열 리터럴 타입을 조합해서 새로운 타입을 만듭니다.

```ts
type EventName = "click" | "focus" | "blur";

// 이벤트 핸들러 이름 생성
type EventHandler = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur"

// CSS 속성 타입
type CSSProperty = "margin" | "padding" | "border";
type CSSDirection = "Top" | "Right" | "Bottom" | "Left";
type CSSShorthand = `${CSSProperty}${CSSDirection}`;
// "marginTop" | "marginRight" | ... | "borderLeft" (12가지)

// REST API 경로 타입
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type Resource = "users" | "posts" | "comments";
type ApiRoute = `/${Resource}` | `/${Resource}/:id`;

// 타입 안전한 이벤트 이미터
type EventMap = {
  login: { userId: number; timestamp: Date };
  logout: { userId: number };
  purchase: { productId: number; price: number };
};

type EventCallback<T extends keyof EventMap> = (data: EventMap[T]) => void;

function on<T extends keyof EventMap>(event: T, callback: EventCallback<T>): void {
  // 이벤트 등록
}

on("login", (data) => {
  console.log(data.userId); // userId: number 자동완성
});

on("purchase", (data) => {
  console.log(data.price); // price: number 자동완성
});
```

---

## 실전 예제: 타입 안전한 폼 빌더

```ts
// 폼 필드 타입들
type FieldType = "text" | "number" | "email" | "password" | "select";

// 필드 타입에 따른 값 타입 매핑
type FieldValueType = {
  text: string;
  number: number;
  email: string;
  password: string;
  select: string;
};

// 폼 스키마 정의
interface FieldSchema {
  type: FieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
}

// 폼 값의 타입을 스키마로부터 자동 생성
type FormValues<T extends Record<string, FieldSchema>> = {
  [K in keyof T]: FieldValueType[T[K]["type"]];
};

// 오류 메시지 타입
type FormErrors<T extends Record<string, FieldSchema>> = Partial<{
  [K in keyof T]: string;
}>;

// 폼 스키마 정의
const loginFormSchema = {
  email: { type: "email" as const, label: "이메일", required: true },
  password: { type: "password" as const, label: "비밀번호", required: true },
};

// 스키마로부터 자동으로 값 타입 생성
type LoginFormValues = FormValues<typeof loginFormSchema>;
// { email: string; password: string; }

type LoginFormErrors = FormErrors<typeof loginFormSchema>;
// { email?: string; password?: string; }

// 유효성 검사 함수 (타입 안전)
function validateForm<T extends Record<string, FieldSchema>>(
  schema: T,
  values: FormValues<T>
): FormErrors<T> {
  const errors: Record<string, string> = {};

  (Object.keys(schema) as (keyof T)[]).forEach(key => {
    const field = schema[key];
    const value = values[key];

    if (field.required && !value) {
      errors[key as string] = `${field.label}은(는) 필수입니다.`;
    }

    if (field.type === "email" && value) {
      const emailValue = value as string;
      if (!emailValue.includes("@")) {
        errors[key as string] = "올바른 이메일 형식이 아닙니다.";
      }
    }
  });

  return errors as FormErrors<T>;
}

// 사용 예시
const formValues: LoginFormValues = {
  email: "user@example.com",
  password: "secret123",
};

const errors = validateForm(loginFormSchema, formValues);
```

---

## 재귀 타입 (Recursive Types)

자기 자신을 참조하는 타입입니다.

```ts
// 중첩된 메뉴 구조
type MenuItem = {
  id: number;
  label: string;
  href?: string;
  children?: MenuItem[]; // 재귀적 참조!
};

const menu: MenuItem[] = [
  {
    id: 1,
    label: "홈",
    href: "/",
  },
  {
    id: 2,
    label: "제품",
    children: [
      { id: 3, label: "노트북", href: "/products/laptops" },
      {
        id: 4,
        label: "액세서리",
        children: [
          { id: 5, label: "마우스", href: "/products/mouse" },
          { id: 6, label: "키보드", href: "/products/keyboard" },
        ],
      },
    ],
  },
];

// 깊이 중첩된 객체의 경로 타입 (재귀)
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

interface Config {
  server: {
    host: string;
    port: number;
    ssl: {
      enabled: boolean;
      cert: string;
    };
  };
  database: {
    url: string;
    pool: number;
  };
}

// 깊이 중첩된 설정도 모두 선택적으로
type PartialConfig = DeepPartial<Config>;
const partial: PartialConfig = {
  server: {
    host: "localhost",
    // port, ssl은 생략 가능
  },
  // database 전체 생략 가능
};
```

---

## 흔한 실수와 해결법

### 실수: 무한 재귀 타입

```ts
// 오류: 무한 재귀로 TypeScript가 처리 불가
type Infinite<T> = Infinite<T[]>; // 재귀가 끝나지 않음!

// 수정: 기저 조건 추가
type Flatten<T> = T extends Array<infer U> ? Flatten<U> : T;
type A = Flatten<string[][][]>; // string (재귀 종료 조건 있음)
```

### 실수: infer 위치 오해

```ts
// infer는 조건부 타입의 extends 절에서만 사용 가능
type Wrong<T> = infer U; // 오류! infer는 조건부 타입 안에서만

type Correct<T> = T extends Array<infer U> ? U : never; // OK
```

---

## 정리

| 고급 타입 | 문법 | 사용 목적 |
|---------|------|---------|
| Mapped 타입 | `[K in keyof T]: ...` | 속성 일괄 변환 |
| 수정자 추가 | `readonly`, `?` | 속성 제한 추가 |
| 수정자 제거 | `-readonly`, `-?` | 속성 제한 해제 |
| 키 재매핑 | `as 새이름` | 속성 이름 변환 |
| Conditional 타입 | `T extends U ? X : Y` | 조건에 따른 타입 선택 |
| infer | `infer R` | 조건부 타입에서 타입 추출 |
| Template Literal | `` `${A}${B}` `` | 문자열 타입 조합 |
| 재귀 타입 | 자기 참조 | 중첩 구조 타입 표현 |
