---
title: "기본 타입"
order: 2
---

# 기본 타입

TypeScript에서 타입은 **변수에 어떤 종류의 값이 들어올 수 있는지** 정의합니다.
라벨이 붙은 서랍장을 생각해보세요. "숫자 서랍"에는 숫자만, "문자 서랍"에는 문자만 넣을 수 있습니다.

---

## 타입 선언 방법

변수 이름 뒤에 `: 타입` 형태로 작성합니다.

```typescript
// 변수명: 타입 = 값
const username: string = "김철수";
const age: number = 25;
const isLoggedIn: boolean = true;
```

단, TypeScript는 대부분의 경우 타입을 **자동으로 추론**할 수 있습니다.

```typescript
// 타입 추론 — 오른쪽 값을 보고 타입을 자동으로 결정합니다
const username = "김철수";  // string으로 추론
const age = 25;             // number로 추론
const isLoggedIn = true;    // boolean으로 추론
```

값이 명확할 때는 굳이 타입을 쓰지 않아도 됩니다.
**타입을 명시해야 할 때**: 함수 파라미터, 나중에 값을 할당할 변수, 복잡한 객체 등.

---

## 원시 타입 (Primitive Types)

### string — 문자열

```typescript
// JS에서는 타입 없이 사용
// let greeting = "안녕하세요";

// TS에서는 타입 명시 가능
let greeting: string = "안녕하세요";
let name: string = "김철수";
let template: string = `안녕하세요, ${name}님`; // 템플릿 리터럴도 string

// 잘못된 사용 — 컴파일 오류 발생
greeting = 42;       // 오류: number는 string에 할당할 수 없습니다
greeting = true;     // 오류: boolean은 string에 할당할 수 없습니다
```

### number — 숫자

JavaScript와 달리 정수/실수 구분 없이 모두 `number` 타입입니다.

```typescript
let integer: number = 42;        // 정수
let float: number = 3.14;        // 실수
let negative: number = -10;      // 음수
let hex: number = 0xff;          // 16진수 (255)
let binary: number = 0b1010;     // 2진수 (10)

// 잘못된 사용
integer = "42";     // 오류: string은 number에 할당할 수 없습니다
```

### boolean — 논리값

```typescript
let isActive: boolean = true;
let isDeleted: boolean = false;

// 함수 파라미터에 boolean 타입 지정
function toggleActive(current: boolean): boolean {
  return !current; // boolean을 반환합니다
}

const next = toggleActive(isActive); // next는 boolean으로 추론됩니다
```

---

## 배열 (Array)

배열의 타입은 두 가지 방식으로 쓸 수 있습니다.

```typescript
// 방법 1: 타입[] (더 자주 사용)
const numbers: number[] = [1, 2, 3, 4, 5];
const names: string[] = ["철수", "영희", "민수"];

// 방법 2: Array<타입> (제네릭 문법)
const scores: Array<number> = [90, 85, 92];

// JS에서는 다양한 타입을 섞어 넣을 수 있었지만
// TS에서는 선언한 타입만 들어갈 수 있습니다
numbers.push(6);      // 정상
numbers.push("7");    // 오류: string은 number[]에 추가할 수 없습니다

// 배열의 요소를 꺼낼 때도 타입이 보장됩니다
const first = numbers[0]; // first의 타입은 number로 추론됩니다
```

---

## 튜플 (Tuple)

길이와 각 요소의 타입이 **고정된 배열**입니다.
배열이 "같은 종류의 항목 여러 개"라면, 튜플은 "정해진 순서와 타입의 항목들"입니다.

```typescript
// [첫 번째 타입, 두 번째 타입, ...]
let person: [string, number] = ["김철수", 25];

// 순서가 중요합니다
person = [25, "김철수"]; // 오류: [number, string]은 [string, number]가 아닙니다

// 요소에 접근
const personName = person[0]; // string으로 추론
const personAge = person[1];  // number로 추론

// 실용적인 예: useState 반환값이 튜플입니다
// const [count, setCount]: [number, (n: number) => void] = useState(0);
```

---

## any — 모든 타입 허용 (주의!)

`any`는 어떤 타입이든 허용합니다. TypeScript의 타입 검사를 **완전히 비활성화**합니다.

```typescript
// JS처럼 자유롭게 쓸 수 있지만...
let anything: any = "문자열";
anything = 42;        // 오류 없음
anything = true;      // 오류 없음
anything = { a: 1 }; // 오류 없음

// 문제: any를 쓰면 TypeScript의 이점이 사라집니다
anything.foo.bar.baz; // 오류 없음 — 하지만 런타임에 터집니다!
anything();           // 오류 없음 — 하지만 함수가 아니면 런타임 오류!
```

> **any 남용 주의**: `any`는 "나중에 고치려고" 임시로 쓰는 경우가 많습니다.
> 하지만 그 "나중에"는 보통 오지 않습니다. 처음부터 올바른 타입을 쓰는 습관을 들이세요.

---

## unknown — 안전한 any

`any`의 문제를 해결하기 위해 TypeScript 3.0에서 추가된 타입입니다.
"타입을 모르는 값"을 나타내지만, **사용 전에 타입 확인을 강제합니다**.

```typescript
let value: unknown = "문자열";
value = 42;    // 값 할당은 가능

// unknown은 사용하기 전에 타입을 좁혀야 합니다
// value.toUpperCase(); // 오류: unknown 타입에는 메서드를 바로 호출할 수 없습니다

if (typeof value === "string") {
  console.log(value.toUpperCase()); // 정상: string임을 확인한 후 사용
}

// API 응답처럼 타입을 모르는 경우에 유용합니다
async function fetchData(): Promise<unknown> {
  const response = await fetch("/api/data");
  return response.json(); // 뭐가 올지 모르므로 unknown
}
```

---

## void — 반환값 없음

함수가 아무것도 반환하지 않을 때 사용합니다.

```typescript
// JS에서는 반환값 없는 함수를 그냥 씁니다
// function logMessage(msg) { console.log(msg); }

// TS에서는 반환 타입을 void로 명시합니다
function logMessage(msg: string): void {
  console.log(msg);
  // return; 은 가능하지만 return "값"; 은 오류
}

// 이벤트 핸들러처럼 반환값이 필요 없는 함수에 사용
const handleClick = (): void => {
  console.log("버튼이 클릭되었습니다");
};
```

---

## null과 undefined

TypeScript에서는 `null`과 `undefined`가 각각 독립적인 타입입니다.

```typescript
let nothing: null = null;
let notDefined: undefined = undefined;

// strict 모드에서는 null/undefined를 다른 타입에 할당할 수 없습니다
let name: string = null;      // 오류 (strict 모드)
let age: number = undefined;  // 오류 (strict 모드)

// 값이 없을 수 있다면 유니온 타입을 사용합니다
let maybeNull: string | null = null;     // 문자열이거나 null
let maybeUndefined: number | undefined = undefined; // 숫자이거나 undefined

// 실용적인 예: 사용자가 로그인하지 않은 경우
let currentUser: string | null = null;  // 로그인 전
currentUser = "김철수";                  // 로그인 후
```

---

## never — 절대 발생하지 않는 타입

함수가 **절대 정상적으로 반환되지 않을 때** 사용합니다.

```typescript
// 항상 오류를 던지는 함수
function throwError(message: string): never {
  throw new Error(message);
  // 이 함수는 절대 정상적으로 끝나지 않습니다
}

// 무한 루프 함수
function infiniteLoop(): never {
  while (true) {
    // 영원히 실행됩니다
  }
}

// 고급 활용: 모든 경우를 처리했는지 검사
type Status = "active" | "inactive" | "pending";

function handleStatus(status: Status): string {
  switch (status) {
    case "active": return "활성";
    case "inactive": return "비활성";
    case "pending": return "대기중";
    default:
      // 여기에 도달하면 안 됩니다 — 모든 케이스를 처리했으므로
      const _exhaustiveCheck: never = status;
      return _exhaustiveCheck;
  }
}
```

---

## object — 객체 타입

기본적인 `object` 타입은 원시값이 아닌 모든 것을 나타냅니다.
실무에서는 이보다 **구체적인 타입**을 쓰는 것이 좋습니다.

```typescript
// object 타입은 너무 광범위합니다
let obj: object = { name: "철수" };
// obj.name; // 오류: object에는 name 속성이 없습니다

// 더 구체적인 인라인 객체 타입을 씁니다
let user: { name: string; age: number } = {
  name: "김철수",
  age: 25
};
console.log(user.name); // 정상: name은 string임을 알고 있습니다

// 실무에서는 인터페이스나 타입 별칭을 사용합니다 (다음 챕터에서 배웁니다)
```

---

## 타입 단언 (Type Assertion)

TypeScript가 타입을 알아채지 못할 때, 개발자가 직접 타입을 알려주는 방법입니다.
마치 "내가 보장할게, 이건 string이야"라고 TypeScript에게 말하는 것입니다.

```typescript
// HTML 요소를 가져올 때 자주 사용합니다
const input = document.getElementById("username"); // HTMLElement | null 로 추론됨

// as 키워드로 타입 단언
const inputElement = document.getElementById("username") as HTMLInputElement;
inputElement.value = "김철수"; // HTMLInputElement에는 value 속성이 있음

// 주의: 타입 단언을 남용하면 위험합니다
const value: any = "안녕하세요";
const length = (value as string).length; // as string이 맞다고 가정하는 것입니다
```

> **타입 단언 주의**: 타입 단언은 TypeScript를 "설득"하는 것이지 실제 타입을 바꾸지 않습니다.
> 잘못된 타입 단언은 런타임 오류로 이어집니다.

---

## 리터럴 타입

특정 값 자체를 타입으로 사용할 수 있습니다.
"이 변수는 문자열이 아니라, 정확히 '관리자'라는 값만 가질 수 있어"처럼 표현합니다.

```typescript
// string 타입이 아닌 특정 문자열 값 자체가 타입이 됩니다
let direction: "left" | "right" | "up" | "down" = "left";
direction = "right"; // 정상
direction = "forward"; // 오류: "forward"는 허용된 값이 아닙니다

// 함수 파라미터에도 사용 가능
function setTheme(theme: "light" | "dark"): void {
  document.body.className = theme;
}

setTheme("light");  // 정상
setTheme("dark");   // 정상
setTheme("blue");   // 오류: "blue"는 허용되지 않습니다

// 숫자 리터럴도 가능합니다
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;
let roll: DiceRoll = 3; // 1~6만 가능
```

---

## 타입 추론 활용하기

모든 곳에 타입을 쓸 필요는 없습니다. TypeScript의 타입 추론을 믿으세요.

```typescript
// 초기값이 있으면 타입 추론이 됩니다 — 중복 타입 선언 불필요
const age = 25;              // number로 추론 (굳이 : number 안 써도 됨)
const name = "김철수";        // string으로 추론
const numbers = [1, 2, 3];   // number[]로 추론

// 타입을 명시해야 하는 경우
let input: string;             // 나중에 값이 할당될 변수
function greet(name: string) { // 함수 파라미터는 타입 명시 필요
  return `안녕 ${name}`;       // 반환 타입은 추론됨 (string)
}
```

---

## 정리

| 타입 | 용도 | 예시 |
|------|------|------|
| `string` | 문자열 | `"안녕하세요"` |
| `number` | 숫자 (정수/실수) | `42`, `3.14` |
| `boolean` | 참/거짓 | `true`, `false` |
| `T[]` | 배열 | `number[]`, `string[]` |
| `[T, U]` | 튜플 | `[string, number]` |
| `any` | 모든 타입 (지양) | — |
| `unknown` | 안전한 any | API 응답 등 |
| `void` | 반환값 없음 | 이벤트 핸들러 |
| `null/undefined` | 없음/미정의 | — |
| `never` | 절대 반환 안 됨 | 에러 함수 |

다음 챕터에서는 객체의 구조를 정의하는 **인터페이스**를 알아보겠습니다.
