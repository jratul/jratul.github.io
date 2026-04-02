---
title: "TypeScript 면접 예상 질문"
order: 13
---

# TypeScript 면접 예상 질문

TypeScript 개발자 면접에서 자주 나오는 핵심 질문들입니다.

## Q1. TypeScript를 사용하는 이유는?

| 이점 | 설명 |
|-----|------|
| **정적 타입** | 컴파일 타임 오류 감지 |
| **IDE 지원** | 자동완성, 리팩토링, 네비게이션 |
| **문서화** | 타입이 코드 의도를 명확히 표현 |
| **대규모 협업** | 타입 계약으로 인터페이스 명확화 |

TypeScript는 **JavaScript의 상위집합(Superset, 기존 언어의 모든 문법을 포함하면서 추가 기능을 제공하는 언어)**이므로 모든 JS 코드는 유효한 TS 코드입니다. 정적 타입(Static Type)은 코드를 실행하기 전 컴파일 단계에서 타입 오류를 검출하는 방식입니다.

---

## Q2. interface와 type alias의 차이는?

```typescript
// interface
interface User {
    id: number;
    name: string;
}

// 선언 병합 (Declaration Merging, 같은 이름의 interface를 여러 번 선언하면 자동으로 합쳐지는 기능) — interface만 가능
interface User {
    email: string;  // 자동으로 위 User에 병합됨
}

// 확장
interface Admin extends User { role: string; }

// type alias
type User = { id: number; name: string; };
type Admin = User & { role: string; };  // 교집합 타입으로 확장

// type만 가능한 것들
type StringOrNumber = string | number;  // 유니온 (Union, 여러 타입 중 하나를 허용)
type Tuple = [string, number];           // 튜플 (Tuple, 각 인덱스의 타입이 고정된 배열)
type Callback = () => void;              // 함수 타입
```

**실무 권장:** 객체 구조에는 `interface`, 유니온/튜플/함수 등 복잡한 타입에는 `type` 사용.

---

## Q3. any와 unknown의 차이는?

```typescript
// any — 타입 검사 완전 비활성화 (지양)
let a: any = "hello";
a.toFixed();   // 런타임 오류 — 컴파일은 통과

// unknown — 안전한 any
let u: unknown = "hello";
u.toFixed();   // ❌ 컴파일 오류

// unknown은 타입 좁히기 후 사용 가능
if (typeof u === "string") {
    u.toUpperCase();  // ✅ 안전
}
```

타입 좁히기(Type Narrowing)는 조건문 등을 통해 넓은 타입을 더 구체적인 타입으로 한정하는 과정입니다. 외부 API 응답처럼 타입을 알 수 없을 때는 `any` 대신 `unknown`을 사용합니다.

---

## Q4. 제네릭(Generics)을 설명하고 활용 예시를 들어주세요

제네릭(Generics)은 타입을 **매개변수화**하여 재사용 가능한 코드를 작성하는 기능입니다. 함수나 클래스를 정의할 때 타입을 고정하지 않고, 호출 시점에 타입을 결정할 수 있게 합니다.

```typescript
// 제네릭 함수
function first<T>(arr: T[]): T | undefined {
    return arr[0];
}

first([1, 2, 3]);        // 반환 타입: number | undefined
first(["a", "b"]);       // 반환 타입: string | undefined

// 제약 조건
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

// 제네릭 인터페이스
interface ApiResponse<T> {
    data: T;
    status: number;
    message: string;
}

type UserResponse = ApiResponse<User>;
type PostsResponse = ApiResponse<Post[]>;
```

---

## Q5. 타입 가드(Type Guard)의 종류를 설명해주세요

타입 가드(Type Guard)는 런타임에서 특정 타입인지 확인해 TypeScript 컴파일러가 해당 블록 안에서 타입을 더 좁게 추론하도록 돕는 패턴입니다.

```typescript
type Cat = { meow: () => void };
type Dog = { bark: () => void };

// 1. typeof
function process(value: string | number) {
    if (typeof value === "string") {
        value.toUpperCase();  // string으로 좁혀짐
    }
}

// 2. instanceof
if (error instanceof TypeError) { ... }

// 3. in 연산자
function makeSound(pet: Cat | Dog) {
    if ("meow" in pet) pet.meow();
    else pet.bark();
}

// 4. 사용자 정의 타입 가드
function isCat(pet: Cat | Dog): pet is Cat {
    return "meow" in pet;
}

// 5. 판별 유니온 (Discriminated Union, 공통 리터럴 필드로 유니온 타입을 구분하는 패턴)
type Shape =
    | { kind: "circle"; radius: number }
    | { kind: "square"; side: number };

function area(s: Shape) {
    switch (s.kind) {
        case "circle": return Math.PI * s.radius ** 2;
        case "square": return s.side ** 2;
    }
}
```

---

## Q6. 유틸리티 타입(Utility Types)을 알고 있는 것들을 설명해주세요

유틸리티 타입(Utility Types)은 TypeScript가 기본으로 제공하는 제네릭 타입 변환 도구 모음입니다. 기존 타입을 변형해 새로운 타입을 쉽게 만들 수 있습니다.

```typescript
interface User {
    id: number;
    name: string;
    email: string;
    age?: number;
}

// Partial — 모든 프로퍼티를 선택적으로
type UpdateUser = Partial<User>;

// Required — 모든 프로퍼티를 필수로
type RequiredUser = Required<User>;

// Pick — 일부 프로퍼티만 선택
type UserPreview = Pick<User, "id" | "name">;

// Omit — 일부 프로퍼티 제외
type CreateUser = Omit<User, "id">;

// Readonly — 모든 프로퍼티를 읽기 전용으로
type FrozenUser = Readonly<User>;

// Record — 키-값 매핑 타입
type RoleMap = Record<"admin" | "user" | "guest", User[]>;

// ReturnType, Parameters — 함수 타입 추출
type FnReturn = ReturnType<typeof fetchUser>;  // User
type FnParams = Parameters<typeof fetchUser>;  // [id: number]
```

---

## Q7. never 타입은 언제 사용하나요?

`never`는 **절대 발생하지 않는 값의 타입**입니다. 함수가 항상 예외를 던지거나 무한 루프에 빠져 정상적으로 반환되지 않을 때, 또는 완전성 검사(Exhaustive Check)에 활용됩니다.

```typescript
// 1. 절대 반환하지 않는 함수
function throwError(message: string): never {
    throw new Error(message);
}

// 2. 무한 루프
function infiniteLoop(): never {
    while (true) {}
}

// 3. 완전성 검사 (exhaustive check)
type Direction = "up" | "down" | "left" | "right";

function move(dir: Direction) {
    switch (dir) {
        case "up":    return moveUp();
        case "down":  return moveDown();
        case "left":  return moveLeft();
        case "right": return moveRight();
        default:
            const _exhaustive: never = dir;  // 누락된 케이스 컴파일 오류
    }
}
```

---

## Q8. TypeScript의 구조적 타이핑(Structural Typing)이란?

TypeScript는 **이름이 아닌 구조(shape)로 타입을 결정**합니다. 구조적 타이핑(Structural Typing, 덕 타이핑이라고도 함)은 타입 이름이 달라도 필요한 구조를 갖추면 호환 가능한 방식입니다. 이는 타입 이름으로 호환성을 결정하는 명목적 타이핑(Nominal Typing)과 대조됩니다.

```typescript
interface Point { x: number; y: number; }

function print(point: Point) {
    console.log(point.x, point.y);
}

const p = { x: 1, y: 2, z: 3 };  // z가 추가로 있음
print(p);  // ✅ 통과 — x, y가 있으면 Point 호환

// 단, 객체 리터럴 직접 전달 시 잉여 속성 검사 적용
print({ x: 1, y: 2, z: 3 });  // ❌ 오류 — 리터럴은 엄격하게 검사
```

---

## Q9. tsconfig.json의 주요 옵션을 설명해주세요

`tsconfig.json`은 TypeScript 컴파일러(tsc)의 동작을 제어하는 설정 파일입니다.

```json
{
    "compilerOptions": {
        "target": "ES2020",          // 컴파일 결과 JS 버전
        "module": "ESNext",          // 모듈 시스템
        "strict": true,              // 엄격 모드 (null 체크, 암시적 any 금지 등)
        "noImplicitAny": true,       // 암시적 any 금지
        "strictNullChecks": true,    // null/undefined 명시적 처리
        "esModuleInterop": true,     // CommonJS 모듈 default import 허용
        "baseUrl": "./src",          // 절대 경로 기준
        "paths": {                   // 경로 별칭
            "@/*": ["./*"]
        },
        "outDir": "./dist",          // 컴파일 출력 디렉토리
        "declaration": true          // .d.ts 파일 생성
    }
}
```

`esModuleInterop`은 CommonJS (Node.js의 전통적 모듈 시스템)와 ES Module (ECMAScript 표준 모듈 시스템) 간의 호환성을 개선하는 옵션입니다. `strict: true`는 여러 엄격 옵션의 묶음이므로 새 프로젝트에서는 항상 활성화를 권장합니다.
