---
title: "열거형 (Enum)"
order: 8
---

# 열거형 (Enum)

Enum은 관련된 상수들을 하나의 그룹으로 묶어서 이름을 붙이는 방법입니다. 코드의 가독성을 높이고 오타로 인한 실수를 방지합니다.

---

## Enum이 왜 필요한가?

### JS에서는...

```js
// 매직 넘버 - 1, 2, 3이 뭔지 알 수 없음
function setUserRole(role) {
  if (role === 1) {
    console.log("관리자");
  } else if (role === 2) {
    console.log("편집자");
  } else if (role === 3) {
    console.log("독자");
  }
}

setUserRole(1); // 1이 뭔지 코드만 봐서는 모름

// 상수로 개선했지만 그룹화가 안 됨
const ROLE_ADMIN = 1;
const ROLE_EDITOR = 2;
const ROLE_READER = 3;
```

### TS에서는 Enum 사용

```ts
// Enum으로 역할을 명확하게 표현
enum UserRole {
  Admin = 1,
  Editor = 2,
  Reader = 3,
}

function setUserRole(role: UserRole): void {
  if (role === UserRole.Admin) {
    console.log("관리자");
  } else if (role === UserRole.Editor) {
    console.log("편집자");
  } else if (role === UserRole.Reader) {
    console.log("독자");
  }
}

setUserRole(UserRole.Admin); // UserRole.Admin이 뭔지 명확함!
```

---

## 숫자 Enum (Numeric Enum)

기본적으로 0부터 시작하는 숫자가 자동으로 할당됩니다.

```ts
// 자동 증가 (0부터 시작)
enum Direction {
  Up,    // 0
  Down,  // 1
  Left,  // 2
  Right, // 3
}

console.log(Direction.Up);    // 0
console.log(Direction.Down);  // 1
console.log(Direction.Left);  // 2
console.log(Direction.Right); // 3

// 시작값 변경 (이후 값은 자동 증가)
enum StatusCode {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalError = 500,
}

console.log(StatusCode.OK);        // 200
console.log(StatusCode.NotFound);  // 404

// 역방향 매핑 (숫자 → 이름)
console.log(Direction[0]);  // "Up"
console.log(Direction[2]);  // "Left"
```

---

## 문자열 Enum (String Enum)

각 멤버에 문자열을 할당합니다. 디버깅 시 값이 명확하게 보여서 자주 사용합니다.

```ts
enum Color {
  Red = "RED",
  Green = "GREEN",
  Blue = "BLUE",
}

enum Theme {
  Light = "light",
  Dark = "dark",
  System = "system",
}

console.log(Color.Red);    // "RED"
console.log(Theme.Dark);   // "dark"

// 실제 사용 예시
function applyTheme(theme: Theme): void {
  document.body.className = theme; // "light", "dark", "system" 중 하나
}

applyTheme(Theme.Dark);     // document.body.className = "dark"
// applyTheme("dark");       // 오류! Theme 타입이어야 함

// API 요청 상태 관리
enum RequestStatus {
  Idle = "IDLE",
  Loading = "LOADING",
  Success = "SUCCESS",
  Error = "ERROR",
}
```

---

## const Enum

컴파일 시 인라인으로 치환되어 더 효율적입니다.

```ts
// const enum - 컴파일 시 숫자로 치환됨
const enum Weekday {
  Monday = 1,
  Tuesday,
  Wednesday,
  Thursday,
  Friday,
  Saturday,
  Sunday,
}

function isWeekend(day: Weekday): boolean {
  return day === Weekday.Saturday || day === Weekday.Sunday;
}

// 컴파일 결과:
// function isWeekend(day) {
//   return day === 6 || day === 7; // Enum 이름이 숫자로 치환됨
// }

isWeekend(Weekday.Saturday); // true
isWeekend(Weekday.Monday);   // false
```

---

## Enum vs 유니온 타입

TypeScript에서는 Enum 대신 유니온 타입을 선호하는 경우도 많습니다.

```ts
// Enum 방식
enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

function move(direction: Direction): void {
  console.log(`이동 방향: ${direction}`);
}

move(Direction.Up); // "이동 방향: UP"

// 유니온 타입 방식 (더 간단)
type DirectionType = "UP" | "DOWN" | "LEFT" | "RIGHT";

function moveV2(direction: DirectionType): void {
  console.log(`이동 방향: ${direction}`);
}

moveV2("UP"); // "이동 방향: UP"

// 유니온 타입의 장점: 직관적이고 타입 정보가 코드에 바로 보임
// Enum의 장점: 자동완성, 리팩토링 용이, 관련 상수 그룹화
```

---

## 실전 예제: 주문 시스템

```ts
// 주문 상태 Enum
enum OrderStatus {
  Pending = "PENDING",       // 대기 중
  Confirmed = "CONFIRMED",   // 확인됨
  Preparing = "PREPARING",   // 준비 중
  Shipped = "SHIPPED",       // 배송 중
  Delivered = "DELIVERED",   // 배달 완료
  Cancelled = "CANCELLED",   // 취소됨
}

// 결제 방법 Enum
enum PaymentMethod {
  CreditCard = "CREDIT_CARD",
  BankTransfer = "BANK_TRANSFER",
  KakaoPay = "KAKAO_PAY",
  NaverPay = "NAVER_PAY",
}

// 주문 타입
interface Order {
  id: number;
  items: string[];
  totalPrice: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: Date;
}

// 상태 변경 함수
function updateOrderStatus(order: Order, newStatus: OrderStatus): Order {
  // 유효한 상태 전환인지 확인
  const validTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
    [OrderStatus.Pending]: [OrderStatus.Confirmed, OrderStatus.Cancelled],
    [OrderStatus.Confirmed]: [OrderStatus.Preparing, OrderStatus.Cancelled],
    [OrderStatus.Preparing]: [OrderStatus.Shipped],
    [OrderStatus.Shipped]: [OrderStatus.Delivered],
  };

  const allowed = validTransitions[order.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `${order.status}에서 ${newStatus}로 변경할 수 없습니다.`
    );
  }

  return { ...order, status: newStatus };
}

// 상태에 따른 UI 텍스트
function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    [OrderStatus.Pending]: "결제 대기 중",
    [OrderStatus.Confirmed]: "주문 확인됨",
    [OrderStatus.Preparing]: "상품 준비 중",
    [OrderStatus.Shipped]: "배송 중",
    [OrderStatus.Delivered]: "배달 완료",
    [OrderStatus.Cancelled]: "주문 취소됨",
  };
  return labels[status];
}

// 사용 예시
const order: Order = {
  id: 1,
  items: ["사과", "배"],
  totalPrice: 15000,
  status: OrderStatus.Pending,
  paymentMethod: PaymentMethod.KakaoPay,
  createdAt: new Date(),
};

console.log(getStatusLabel(order.status)); // "결제 대기 중"

const confirmedOrder = updateOrderStatus(order, OrderStatus.Confirmed);
console.log(getStatusLabel(confirmedOrder.status)); // "주문 확인됨"
```

---

## Enum의 타입으로 사용하기

```ts
enum Permission {
  Read = "READ",
  Write = "WRITE",
  Delete = "DELETE",
  Admin = "ADMIN",
}

// Enum 값들의 타입
type PermissionKey = keyof typeof Permission; // "Read" | "Write" | "Delete" | "Admin"
type PermissionValue = `${Permission}`;        // "READ" | "WRITE" | "DELETE" | "ADMIN"

// Record와 함께 사용
const permissionLabels: Record<Permission, string> = {
  [Permission.Read]: "읽기",
  [Permission.Write]: "쓰기",
  [Permission.Delete]: "삭제",
  [Permission.Admin]: "관리자",
};

// 권한 확인 함수
function hasPermission(userPermissions: Permission[], required: Permission): boolean {
  return userPermissions.includes(required) || userPermissions.includes(Permission.Admin);
}

const userPerms = [Permission.Read, Permission.Write];
console.log(hasPermission(userPerms, Permission.Read));   // true
console.log(hasPermission(userPerms, Permission.Delete)); // false
```

---

## Enum 순회 (반복)

```ts
enum Season {
  Spring = "봄",
  Summer = "여름",
  Autumn = "가을",
  Winter = "겨울",
}

// 모든 Enum 값 순회
Object.values(Season).forEach(season => {
  console.log(season); // "봄", "여름", "가을", "겨울"
});

// 숫자 Enum 순회 (주의: 역방향 매핑 때문에 숫자와 이름이 모두 나옴)
enum NumericEnum {
  A = 1,
  B = 2,
  C = 3,
}

// 숫자 값만 필터링
const numValues = Object.values(NumericEnum).filter(v => typeof v === "number");
console.log(numValues); // [1, 2, 3]
```

---

## 흔한 실수와 해결법

### 실수 1: 숫자 Enum에 임의 값 할당

```ts
// 나쁜 예 - 예상치 못한 비교
const role: UserRole = 999 as UserRole; // 강제 형변환 가능!

// 문자열 Enum은 이 문제가 없음 (값이 명확함)
const color: Color = "INVALID" as Color; // 그래도 오타 방지에는 유리함
```

### 실수 2: Enum을 직접 비교하지 않기

```ts
enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}

// 나쁜 예
if (userStatus === "ACTIVE") { // 문자열로 직접 비교
  // ...
}

// 좋은 예
if (userStatus === Status.Active) { // Enum으로 비교
  // ...
}
```

### 실수 3: const enum과 일반 enum 혼용

```ts
// const enum은 런타임에 존재하지 않음
const enum Fruit {
  Apple = "APPLE",
  Banana = "BANANA",
}

// 이렇게 사용하면 오류 (런타임에 객체 없음)
// Object.values(Fruit); // 오류!

// 일반 enum은 런타임 객체 존재
enum FruitEnum {
  Apple = "APPLE",
  Banana = "BANANA",
}

Object.values(FruitEnum); // OK: ["APPLE", "BANANA"]
```

---

## 정리

| 종류 | 특징 | 사용 상황 |
|------|------|----------|
| 숫자 Enum | 0부터 자동 증가, 역방향 매핑 | DB 코드값, 순서가 있는 상태 |
| 문자열 Enum | 명시적 문자열, 디버깅 용이 | API 값, 상태 관리, 설정값 |
| const Enum | 컴파일 시 인라인 치환, 빠름 | 성능 중요, 런타임 접근 불필요 |
| 유니온 타입 | 더 간단, 타입 바로 표현 | 단순한 선택지, 외부 API 값 |
