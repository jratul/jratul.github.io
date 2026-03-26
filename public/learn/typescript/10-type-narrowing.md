---
title: "타입 가드와 내로잉"
order: 10
---

# 타입 가드와 내로잉 (Type Guards & Narrowing)

타입 내로잉(Narrowing)은 넓은 타입에서 좁은 타입으로 범위를 좁혀나가는 것입니다. 타입 가드(Type Guard)는 이를 가능하게 하는 조건식이나 함수입니다.

---

## 내로잉이 왜 필요한가?

```ts
// 유니온 타입으로 받은 경우
function process(value: string | number) {
  // 여기서 value는 string | number
  // value.toUpperCase(); // 오류! number에는 toUpperCase 없음
  // value.toFixed(2);    // 오류! string에는 toFixed 없음

  // 타입을 좁혀야 함
  if (typeof value === "string") {
    // 여기서 value는 string으로 좁혀짐
    console.log(value.toUpperCase()); // OK!
  } else {
    // 여기서 value는 number로 좁혀짐
    console.log(value.toFixed(2)); // OK!
  }
}
```

---

## typeof 타입 가드

JavaScript의 `typeof` 연산자로 원시 타입을 구분합니다.

```ts
function formatValue(value: string | number | boolean | undefined): string {
  if (typeof value === "string") {
    // value: string
    return value.trim();
  }

  if (typeof value === "number") {
    // value: number
    return value.toLocaleString();
  }

  if (typeof value === "boolean") {
    // value: boolean
    return value ? "예" : "아니오";
  }

  // value: undefined
  return "값 없음";
}

console.log(formatValue("  hello  ")); // "hello"
console.log(formatValue(1234567));     // "1,234,567"
console.log(formatValue(true));        // "예"
console.log(formatValue(undefined));   // "값 없음"
```

---

## instanceof 타입 가드

클래스 인스턴스를 구분할 때 사용합니다.

```ts
class Dog {
  name: string;
  constructor(name: string) { this.name = name; }
  bark(): void { console.log("멍멍!"); }
}

class Cat {
  name: string;
  constructor(name: string) { this.name = name; }
  meow(): void { console.log("야옹~"); }
}

function makeSound(animal: Dog | Cat): void {
  if (animal instanceof Dog) {
    // animal: Dog
    animal.bark(); // Dog 메서드 사용 가능
  } else {
    // animal: Cat (Dog가 아니면 Cat)
    animal.meow(); // Cat 메서드 사용 가능
  }
}

makeSound(new Dog("바둑이")); // "멍멍!"
makeSound(new Cat("나비"));   // "야옹~"

// 에러 처리에서도 유용
function handleError(error: unknown): string {
  if (error instanceof Error) {
    return error.message; // Error 객체의 message 속성 사용
  }
  if (typeof error === "string") {
    return error;
  }
  return "알 수 없는 오류";
}
```

---

## in 연산자 타입 가드

객체에 특정 속성이 있는지 확인합니다.

```ts
interface Admin {
  name: string;
  adminLevel: number; // Admin에만 있는 속성
  deleteUser: (id: number) => void;
}

interface Guest {
  name: string;
  sessionId: string; // Guest에만 있는 속성
}

function greetUser(user: Admin | Guest): void {
  console.log(`안녕하세요, ${user.name}님!`);

  if ("adminLevel" in user) {
    // user: Admin
    console.log(`관리자 레벨: ${user.adminLevel}`);
  } else {
    // user: Guest
    console.log(`세션 ID: ${user.sessionId}`);
  }
}

// 실전: 다양한 이벤트 처리
interface ClickEvent {
  type: "click";
  x: number;
  y: number;
}

interface KeyboardEvent {
  type: "keyboard";
  key: string;
  ctrlKey: boolean;
}

interface TouchEvent {
  type: "touch";
  touches: Array<{ x: number; y: number }>;
}

type UIEvent = ClickEvent | KeyboardEvent | TouchEvent;

function handleEvent(event: UIEvent): void {
  if ("key" in event) {
    // KeyboardEvent
    console.log(`키 입력: ${event.key}`);
  } else if ("touches" in event) {
    // TouchEvent
    console.log(`터치 수: ${event.touches.length}`);
  } else {
    // ClickEvent
    console.log(`클릭 위치: (${event.x}, ${event.y})`);
  }
}
```

---

## 판별 유니온 (Discriminated Union)

공통 속성(판별자)으로 타입을 구분하는 패턴입니다.

```ts
// type 속성이 판별자 역할
type Shape =
  | { type: "circle"; radius: number }
  | { type: "rectangle"; width: number; height: number }
  | { type: "triangle"; base: number; height: number };

function calculateArea(shape: Shape): number {
  switch (shape.type) {
    case "circle":
      // shape: { type: "circle"; radius: number }
      return Math.PI * shape.radius ** 2;

    case "rectangle":
      // shape: { type: "rectangle"; width: number; height: number }
      return shape.width * shape.height;

    case "triangle":
      // shape: { type: "triangle"; base: number; height: number }
      return (shape.base * shape.height) / 2;
  }
}

const circle: Shape = { type: "circle", radius: 5 };
const rect: Shape = { type: "rectangle", width: 4, height: 6 };

console.log(calculateArea(circle)); // 78.54...
console.log(calculateArea(rect));   // 24

// API 응답 처리
type ApiResult<T> =
  | { status: "success"; data: T }
  | { status: "error"; code: number; message: string }
  | { status: "loading" };

function handleResult<T>(result: ApiResult<T>): void {
  switch (result.status) {
    case "success":
      console.log("데이터:", result.data); // result.data 접근 가능
      break;
    case "error":
      console.log(`오류 ${result.code}: ${result.message}`);
      break;
    case "loading":
      console.log("로딩 중...");
      break;
  }
}
```

---

## 사용자 정의 타입 가드 (User-Defined Type Guards)

`is` 키워드를 사용해서 직접 타입 가드 함수를 만들 수 있습니다.

```ts
interface Fish {
  name: string;
  swim(): void;
}

interface Bird {
  name: string;
  fly(): void;
}

// 사용자 정의 타입 가드
// "pet is Fish"는 이 함수가 true를 반환하면 pet이 Fish 타입임을 TypeScript에 알림
function isFish(pet: Fish | Bird): pet is Fish {
  return "swim" in pet;
}

function move(pet: Fish | Bird): void {
  if (isFish(pet)) {
    // pet: Fish
    pet.swim();
  } else {
    // pet: Bird
    pet.fly();
  }
}

// 실전: 타입 검증 함수
interface User {
  id: number;
  name: string;
  email: string;
}

// 사용자 객체인지 확인하는 타입 가드
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "name" in obj &&
    "email" in obj &&
    typeof (obj as any).id === "number" &&
    typeof (obj as any).name === "string" &&
    typeof (obj as any).email === "string"
  );
}

// API 응답 검증에 활용
async function fetchUser(id: number): Promise<User | null> {
  const response = await fetch(`/api/users/${id}`);
  const data: unknown = await response.json();

  if (isUser(data)) {
    return data; // User 타입으로 안전하게 사용
  }
  return null;
}
```

---

## Exhaustiveness Checking (완전성 검사)

모든 경우를 처리했는지 확인하는 패턴입니다.

```ts
type Color = "red" | "green" | "blue";

function getColorHex(color: Color): string {
  switch (color) {
    case "red":
      return "#FF0000";
    case "green":
      return "#00FF00";
    case "blue":
      return "#0000FF";
    default:
      // 모든 경우를 처리했으면 여기 도달 불가
      // 새로운 색상이 추가되면 TypeScript가 오류를 알려줌
      const _exhaustiveCheck: never = color;
      throw new Error(`처리되지 않은 색상: ${color}`);
  }
}

// 만약 Color에 "yellow"가 추가되면:
// type Color = "red" | "green" | "blue" | "yellow";
// default 케이스에서 color: never 오류 발생!
// → 개발자가 "yellow" 케이스를 추가해야 함을 알 수 있음
```

---

## 조건 표현식으로 내로잉

```ts
// truthy/falsy로 내로잉
function greet(name: string | null): string {
  if (name) {
    // name: string (null이면 falsy라 여기 오지 않음)
    return `안녕하세요, ${name}님!`;
  }
  return "안녕하세요!";
}

// 옵셔널 체이닝과 결합
interface UserProfile {
  user?: {
    name?: string;
    address?: {
      city?: string;
    };
  };
}

function getCity(profile: UserProfile): string {
  // 옵셔널 체이닝으로 안전하게 접근
  return profile.user?.address?.city ?? "도시 정보 없음";
}

// 배열 빈 검사로 내로잉
function processItems(items: string[] | null | undefined): void {
  if (!items || items.length === 0) {
    console.log("처리할 항목이 없습니다.");
    return;
  }
  // items: string[] (null, undefined, 빈 배열 모두 제외됨)
  items.forEach(item => console.log(item));
}
```

---

## 실전 예제: 쇼핑카트

```ts
// 상품 타입들
interface PhysicalProduct {
  type: "physical";
  id: number;
  name: string;
  price: number;
  weight: number;  // 배송을 위한 무게
}

interface DigitalProduct {
  type: "digital";
  id: number;
  name: string;
  price: number;
  downloadUrl: string;  // 다운로드 링크
}

interface SubscriptionProduct {
  type: "subscription";
  id: number;
  name: string;
  price: number;
  billingPeriod: "monthly" | "yearly";
}

type CartItem = PhysicalProduct | DigitalProduct | SubscriptionProduct;

// 배송비 계산 (물리 상품만 해당)
function calculateShipping(items: CartItem[]): number {
  const physicalItems = items.filter(
    (item): item is PhysicalProduct => item.type === "physical"
  );

  const totalWeight = physicalItems.reduce((sum, item) => sum + item.weight, 0);
  return totalWeight * 100; // 100원/g
}

// 결제 후 처리
function processAfterPayment(item: CartItem): void {
  switch (item.type) {
    case "physical":
      console.log(`${item.name} 배송 준비 중... (무게: ${item.weight}g)`);
      break;
    case "digital":
      console.log(`${item.name} 다운로드 링크 발송: ${item.downloadUrl}`);
      break;
    case "subscription":
      console.log(
        `${item.name} 구독 시작 (${item.billingPeriod === "monthly" ? "월" : "연"} 결제)`
      );
      break;
  }
}

// 타입 가드 함수
function isPhysical(item: CartItem): item is PhysicalProduct {
  return item.type === "physical";
}

function isSubscription(item: CartItem): item is SubscriptionProduct {
  return item.type === "subscription";
}

// 사용 예시
const cart: CartItem[] = [
  { type: "physical", id: 1, name: "키보드", price: 50000, weight: 500 },
  { type: "digital", id: 2, name: "이북", price: 15000, downloadUrl: "/books/1" },
  { type: "subscription", id: 3, name: "클라우드 서비스", price: 9900, billingPeriod: "monthly" },
];

console.log("배송비:", calculateShipping(cart)); // 50000원 (키보드만)
cart.forEach(processAfterPayment);
```

---

## 흔한 실수와 해결법

### 실수 1: typeof null === "object"

```ts
// 주의! typeof null은 "object"
function processObject(value: object | null) {
  if (typeof value === "object") {
    // value: object | null (null도 통과!)
    value.toString(); // 오류 가능성 있음
  }
}

// 수정: null 체크 추가
function processObject(value: object | null) {
  if (typeof value === "object" && value !== null) {
    // value: object (null 제외)
    value.toString(); // 안전
  }
}
```

### 실수 2: 타입 가드를 너무 복잡하게

```ts
// 판별 유니온을 사용하면 단순해짐
// 나쁜 예
function handleEvent(event: ClickEvent | KeyboardEvent) {
  if ("x" in event && "y" in event && !("key" in event)) {
    // ClickEvent
  }
}

// 좋은 예 - type 속성을 판별자로 사용
function handleEvent(event: ClickEvent | KeyboardEvent) {
  if (event.type === "click") {
    // ClickEvent
  }
}
```

---

## 정리

| 타입 가드 방법 | 사용 상황 | 예시 |
|-------------|---------|------|
| `typeof` | 원시 타입 구분 | `typeof x === "string"` |
| `instanceof` | 클래스 인스턴스 구분 | `x instanceof Error` |
| `in` | 속성 존재 확인 | `"swim" in animal` |
| 판별 유니온 | 공통 속성으로 구분 | `shape.type === "circle"` |
| 사용자 정의 (`is`) | 복잡한 검증 | `function isFish(x): x is Fish` |
| truthy/falsy | null/undefined 제거 | `if (value)` |
