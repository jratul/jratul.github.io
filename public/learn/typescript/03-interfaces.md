---
title: "인터페이스"
order: 3
---

# 인터페이스

인터페이스(Interface)는 **객체의 구조(모양)를 정의하는 타입**입니다.
마치 건물을 짓기 전에 설계도를 그리는 것처럼, 인터페이스는 "이 객체는 이런 속성들을 가져야 해"라는 규칙을 정해줍니다.

---

## 왜 인터페이스가 필요한가?

JavaScript에서 객체를 함수에 넘길 때, 그 객체에 어떤 속성이 있어야 하는지 알기 어렵습니다.

```javascript
// JS: 함수를 보기 전까지 어떤 객체를 넘겨야 하는지 모릅니다
function displayUser(user) {
  console.log(user.name + " (" + user.email + ")");
}

// 잘못된 객체를 넘겨도 오류가 없습니다
displayUser({ username: "철수" }); // undefined (undefined) 출력 — 버그이지만 실행됨
```

TypeScript의 인터페이스로 이 문제를 해결합니다.

```typescript
// TS: 인터페이스로 User 객체의 구조를 미리 정의합니다
interface User {
  name: string;
  email: string;
}

function displayUser(user: User): void {
  console.log(`${user.name} (${user.email})`);
}

displayUser({ name: "철수", email: "cs@example.com" }); // 정상
displayUser({ username: "철수" }); // 오류: name, email이 없습니다
```

---

## 기본 인터페이스 문법

```typescript
interface 인터페이스명 {
  속성명: 타입;
  속성명: 타입;
}
```

```typescript
// 상품 인터페이스 정의
interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

// 인터페이스를 타입으로 사용
const laptop: Product = {
  id: 1,
  name: "노트북 Pro",
  price: 1500000,
  category: "전자기기",
};

// 속성이 부족하면 오류
const phone: Product = {
  id: 2,
  name: "스마트폰",
  // price와 category가 없으므로 오류!
};
```

---

## 선택적 속성 (Optional Properties)

속성명 뒤에 `?`를 붙이면 **있어도 되고 없어도 되는** 선택적 속성이 됩니다.

```typescript
interface UserProfile {
  name: string;       // 필수
  email: string;      // 필수
  age?: number;       // 선택적 (없어도 됨)
  bio?: string;       // 선택적
  avatar?: string;    // 선택적
}

// 필수 속성만 있어도 됩니다
const user1: UserProfile = {
  name: "김철수",
  email: "cs@example.com",
};

// 선택적 속성을 포함해도 됩니다
const user2: UserProfile = {
  name: "이영희",
  email: "yh@example.com",
  age: 28,
  bio: "프론트엔드 개발자입니다",
};

// 선택적 속성은 사용 시 undefined 체크가 필요합니다
function showAge(user: UserProfile): string {
  if (user.age !== undefined) {
    return `${user.age}세`;
  }
  return "나이 미공개";
}
```

---

## 읽기 전용 속성 (Readonly Properties)

`readonly` 키워드를 붙이면 **처음 할당 후 변경 불가**한 속성이 됩니다.

```typescript
interface Config {
  readonly apiUrl: string;    // 한 번 설정하면 변경 불가
  readonly version: string;
  timeout: number;            // 변경 가능
}

const config: Config = {
  apiUrl: "https://api.example.com",
  version: "1.0.0",
  timeout: 5000,
};

config.timeout = 10000;   // 정상: timeout은 readonly가 아님
config.apiUrl = "다른URL"; // 오류: apiUrl은 readonly입니다
config.version = "2.0.0"; // 오류: version은 readonly입니다

// 실용 예: 사용자 ID처럼 변경되면 안 되는 값
interface DatabaseRecord {
  readonly id: number;  // DB에서 생성된 ID는 변경 불가
  createdAt: Date;      // 생성일도 변경되면 안 될 수 있지만 예시를 위해
  updatedAt: Date;
}
```

---

## 인덱스 시그니처

객체의 속성 이름이 동적일 때 사용합니다.
사전처럼 "키는 string, 값은 string" 형태로 정의합니다.

```typescript
// 속성 이름(키)이 string이고 값이 string인 객체
interface StringMap {
  [key: string]: string;
}

const translations: StringMap = {
  hello: "안녕하세요",
  goodbye: "안녕히 가세요",
  thanks: "감사합니다",
  // 얼마든지 추가 가능
};

// 다국어 번역처럼 키를 미리 알 수 없는 경우에 유용합니다
translations["welcome"] = "환영합니다"; // 정상
translations["count"] = 42;             // 오류: 42는 string이 아닙니다

// 숫자 인덱스 시그니처 (배열과 유사)
interface NumberArray {
  [index: number]: string;
}

const fruits: NumberArray = {
  0: "사과",
  1: "바나나",
  2: "체리",
};
```

---

## 함수 타입을 포함하는 인터페이스

인터페이스에 메서드(함수)도 정의할 수 있습니다.

```typescript
interface Animal {
  name: string;
  sound(): string;                    // 파라미터 없이 string 반환
  move(distance: number): void;       // number를 받고 void 반환
  eat?: (food: string) => void;       // 선택적 메서드
}

// 인터페이스를 구현하는 객체
const dog: Animal = {
  name: "멍멍이",
  sound(): string {
    return "멍멍!";
  },
  move(distance: number): void {
    console.log(`${distance}m 이동했습니다`);
  },
};

// 실용 예: React 컴포넌트 Props 타이핑
interface ButtonProps {
  label: string;
  onClick: () => void;          // 클릭 핸들러 함수
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

// React 컴포넌트 (예시)
// function Button({ label, onClick, disabled, variant }: ButtonProps) {
//   return <button onClick={onClick} disabled={disabled}>{label}</button>;
// }
```

---

## 인터페이스 확장 (extends)

기존 인터페이스를 **상속해서 새로운 인터페이스**를 만들 수 있습니다.
공통 속성은 부모 인터페이스에, 특수 속성은 자식 인터페이스에 정의합니다.

```typescript
// 기본 사용자 정보
interface BaseUser {
  id: number;
  name: string;
  email: string;
}

// 관리자는 기본 정보 + 관리자 권한 정보
interface Admin extends BaseUser {
  role: "superadmin" | "manager";
  permissions: string[];
}

// 일반 회원은 기본 정보 + 멤버십 정보
interface Member extends BaseUser {
  membershipLevel: "bronze" | "silver" | "gold";
  joinDate: Date;
}

// Admin은 BaseUser의 모든 속성 + 자신의 속성을 가집니다
const admin: Admin = {
  id: 1,
  name: "관리자",
  email: "admin@example.com",
  role: "superadmin",
  permissions: ["read", "write", "delete"],
};

// 여러 인터페이스를 동시에 확장할 수도 있습니다
interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

interface Post extends BaseUser, Timestamped {
  title: string;
  content: string;
}
```

---

## 인터페이스 병합 (Declaration Merging)

같은 이름으로 인터페이스를 두 번 선언하면 자동으로 합쳐집니다.
이것은 TypeScript의 독특한 기능입니다.

```typescript
interface Window {
  title: string;
}

interface Window {
  width: number;  // 같은 이름으로 다시 선언하면 병합됩니다
}

// 실제로는 { title: string; width: number } 가 됩니다
const win: Window = {
  title: "내 창",
  width: 1024,
};

// 주로 라이브러리의 타입을 확장할 때 사용합니다
// 예: Express의 Request 객체에 사용자 정보 추가
// declare global {
//   namespace Express {
//     interface Request {
//       user?: User;
//     }
//   }
// }
```

---

## 실전 예시: React 컴포넌트 Props

인터페이스는 React에서 컴포넌트 Props를 타이핑할 때 가장 많이 사용됩니다.

```typescript
// 카드 컴포넌트의 Props 인터페이스
interface CardProps {
  title: string;
  description: string;
  imageUrl?: string;       // 선택적: 이미지가 없을 수도 있음
  tags: string[];
  author: {
    name: string;
    avatar?: string;
  };
  onClick?: () => void;    // 선택적: 클릭 가능하지 않을 수도 있음
}

// 페이지네이션 컴포넌트의 Props 인터페이스
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void; // 페이지 번호를 받는 함수
}

// 폼 컴포넌트 Props
interface LoginFormProps {
  onSubmit: (data: { email: string; password: string }) => void;
  isLoading?: boolean;
  errorMessage?: string;
}
```

---

## 인터페이스 vs 타입 별칭, 언제 뭘 쓸까?

인터페이스와 타입 별칭(`type`)은 매우 비슷합니다. 일반적인 가이드라인:

```typescript
// 인터페이스: 객체의 구조를 정의할 때 선호
interface User {
  name: string;
  age: number;
}

// 타입 별칭: 유니온 타입, 튜플 등 더 복잡한 타입에 사용
type Status = "active" | "inactive" | "pending";
type Point = [number, number];
```

| 상황 | 권장 |
|------|------|
| 객체/클래스 구조 정의 | `interface` |
| 확장이 필요한 타입 | `interface` (extends 지원) |
| 유니온/인터섹션 타입 | `type` |
| 원시 타입에 이름 붙이기 | `type` |

> 팀이나 프로젝트에서 일관된 스타일을 정해서 사용하는 것이 가장 중요합니다.

---

## 흔한 실수들

```typescript
// 실수 1: 인터페이스에 세미콜론 대신 쉼표 사용 (둘 다 되지만 세미콜론이 관례)
interface Good {
  name: string;  // 세미콜론 권장
  age: number;
}

// 실수 2: 선택적 속성을 undefined 체크 없이 사용
interface Profile {
  nickname?: string;
}

function showNickname(profile: Profile): void {
  // 오류! nickname이 undefined일 수 있습니다
  // console.log(profile.nickname.toUpperCase());

  // 올바른 방법
  console.log(profile.nickname?.toUpperCase() ?? "닉네임 없음");
}

// 실수 3: 너무 큰 단일 인터페이스 (분리하는 것이 좋습니다)
// 나쁜 예
interface HugeObject {
  // 수십 개의 속성...
}

// 좋은 예 — 역할에 따라 분리
interface UserBasic { name: string; email: string; }
interface UserProfile { bio?: string; avatar?: string; }
interface UserSettings { theme: string; language: string; }
```

---

## 정리

- 인터페이스는 객체의 구조(설계도)를 정의합니다
- `?`로 선택적 속성, `readonly`로 읽기 전용 속성을 만들 수 있습니다
- `extends`로 인터페이스를 상속해 재사용성을 높일 수 있습니다
- React의 Props 타이핑에 가장 많이 활용됩니다
- 타입 별칭(`type`)과 유사하지만, 객체 구조 정의에는 `interface`를 선호합니다

다음 챕터에서는 `type` 키워드를 사용하는 **타입 별칭과 유니온/인터섹션 타입**을 알아보겠습니다.
