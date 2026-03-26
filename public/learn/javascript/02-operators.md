---
title: "연산자와 조건문"
order: 2
---

## 연산자 — 계산하고 비교하는 도구

연산자(operator)는 값을 **계산하거나 비교하거나 조합**하는 기호입니다.
수학 시간에 배운 `+`, `-`, `*`, `/`와 비슷하지만 프로그래밍에는 더 많은 연산자가 있습니다.

---

## 산술 연산자 — 숫자 계산

```javascript
let a = 10;
let b = 3;

console.log(a + b);  // 13 (더하기)
console.log(a - b);  // 7  (빼기)
console.log(a * b);  // 30 (곱하기)
console.log(a / b);  // 3.333... (나누기)
console.log(a % b);  // 1  (나머지 — 10을 3으로 나눈 나머지)
console.log(a ** b); // 1000 (거듭제곱 — 10의 3제곱)

// 나머지 연산자(%)는 생각보다 자주 씁니다
console.log(10 % 2);  // 0 (짝수는 2로 나누면 나머지 0)
console.log(11 % 2);  // 1 (홀수는 2로 나누면 나머지 1)
console.log(15 % 60); // 15 (분 계산에 유용)
```

### 증가/감소 연산자

```javascript
let count = 5;

count++;  // count = count + 1과 같음 → 6
count--;  // count = count - 1과 같음 → 5

// 주의: 전위(++x)와 후위(x++)는 다릅니다
let x = 5;
console.log(x++);  // 5 출력 후 x가 6이 됨 (출력 먼저, 증가 나중)
console.log(x);    // 6

let y = 5;
console.log(++y);  // 6 출력 (증가 먼저, 출력 나중)
console.log(y);    // 6
```

### 복합 대입 연산자 — 줄여쓰기

```javascript
let score = 100;

score = score + 10;  // 긴 방식
score += 10;         // 짧은 방식 (같은 의미)

score -= 5;   // score = score - 5
score *= 2;   // score = score * 2
score /= 4;   // score = score / 4
score %= 3;   // score = score % 3

// 문자열에도 += 사용 가능
let message = "안녕";
message += "하세요";  // "안녕하세요"
```

---

## 비교 연산자 — true/false 반환

```javascript
let x = 10;
let y = 20;

console.log(x > y);   // false (크다)
console.log(x < y);   // true  (작다)
console.log(x >= 10); // true  (크거나 같다)
console.log(x <= 9);  // false (작거나 같다)

// 동등 비교
console.log(x === 10);  // true  (값과 타입 모두 같음)
console.log(x !== y);   // true  (다름)
console.log(x == "10"); // true  (타입 자동 변환 후 비교, 비추천!)
console.log(x === "10"); // false (타입이 달라 false, 권장!)
```

---

## 논리 연산자 — 조건을 조합하기

```javascript
// && (AND): 둘 다 true일 때 true
console.log(true && true);   // true
console.log(true && false);  // false
console.log(false && true);  // false

// || (OR): 하나라도 true이면 true
console.log(true || false);  // true
console.log(false || false); // false
console.log(false || true);  // true

// ! (NOT): true↔false 뒤집기
console.log(!true);   // false
console.log(!false);  // true

// 실용 예제
let age = 20;
let hasTicket = true;

// 나이가 18 이상이고 티켓도 있어야 입장 가능
let canEnter = (age >= 18) && hasTicket;
console.log(canEnter);  // true

// 회원이거나 초대받은 사람은 입장 가능
let isMember = false;
let isInvited = true;
let canAccess = isMember || isInvited;
console.log(canAccess);  // true
```

### 단락 평가 (Short-circuit) — 유용한 패턴

```javascript
// &&는 왼쪽이 false면 오른쪽을 아예 평가하지 않음
let user = null;
let name = user && user.name;  // user가 null이면 user.name 접근 안 함
console.log(name);  // null (에러 없이 안전하게 처리)

// ||는 왼쪽이 falsy면 오른쪽을 반환
let inputName = "";
let displayName = inputName || "익명 사용자";
console.log(displayName);  // "익명 사용자" (빈 문자열은 falsy)

let realName = "김철수";
let displayName2 = realName || "익명 사용자";
console.log(displayName2);  // "김철수" (값이 있으면 그대로 사용)
```

### Nullish Coalescing (??) — null/undefined만 처리

```javascript
// || 는 모든 falsy 값(0, "", false 등)에 반응
// ?? 는 null과 undefined에만 반응

let count = 0;
console.log(count || "기본값");  // "기본값" (0은 falsy라서!)
console.log(count ?? "기본값");  // 0 (0은 null/undefined가 아님)

let score = null;
console.log(score ?? 0);  // 0 (null이므로 기본값 사용)
```

---

## 조건문 — 상황에 따라 다르게 행동하기

### if / else if / else

```javascript
let hour = 14;  // 오후 2시

if (hour < 12) {
  console.log("오전입니다.");
} else if (hour < 18) {
  console.log("오후입니다.");  // 이 줄이 실행됨
} else {
  console.log("저녁입니다.");
}

// 조건이 여러 개일 때 순서가 중요합니다
let temperature = 25;

if (temperature >= 30) {
  console.log("더운 날씨");
} else if (temperature >= 20) {
  console.log("따뜻한 날씨");  // 이 줄이 실행됨
} else if (temperature >= 10) {
  console.log("쌀쌀한 날씨");
} else {
  console.log("추운 날씨");
}
```

### switch 문 — 값이 딱 정해진 경우

```javascript
let day = "월요일";

switch (day) {
  case "월요일":
    console.log("한 주의 시작!");
    break;  // break가 없으면 다음 case로 계속 실행됨!
  case "금요일":
    console.log("불금!");
    break;
  case "토요일":
  case "일요일":
    console.log("주말!");  // 토요일과 일요일 모두 같은 처리
    break;
  default:
    console.log("평범한 요일");
}
```

### 초보자 실수: break를 빠뜨리면?

```javascript
let grade = "B";

switch (grade) {
  case "A":
    console.log("훌륭합니다!");
    // break 없음!
  case "B":
    console.log("잘했습니다!");
    // break 없음!
  case "C":
    console.log("보통입니다.");
    break;
  default:
    console.log("더 노력하세요.");
}

// grade가 "B"일 때 출력:
// 잘했습니다!
// 보통입니다.
// (B부터 시작해서 break를 만날 때까지 다 실행됩니다!)
```

---

## 삼항 연산자 — if/else를 한 줄로

```javascript
// 형식: 조건 ? 참일때 : 거짓일때

let age = 20;

// if/else 방식
let status;
if (age >= 18) {
  status = "성인";
} else {
  status = "미성년자";
}

// 삼항 연산자 방식 (같은 의미)
let status2 = age >= 18 ? "성인" : "미성년자";

console.log(status2);  // "성인"

// 실용 예제
let isLoggedIn = true;
let buttonText = isLoggedIn ? "로그아웃" : "로그인";
console.log(buttonText);  // "로그아웃"

// 중첩 삼항은 가독성이 떨어집니다 (자제 권장)
let score = 75;
let grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : "F";
// 이런 경우는 if/else if가 더 읽기 좋습니다
```

---

## 반복문 — 같은 작업 반복하기

### for 문

```javascript
// 기본 for 문
for (let i = 0; i < 5; i++) {
  console.log(`${i}번째 반복`);
}
// 0번째 반복, 1번째 반복, 2번째 반복, 3번째 반복, 4번째 반복

// 배열 순회
let fruits = ["사과", "바나나", "딸기"];
for (let i = 0; i < fruits.length; i++) {
  console.log(fruits[i]);  // 사과, 바나나, 딸기 순서로 출력
}

// for...of: 배열 순회의 더 편한 방법
for (let fruit of fruits) {
  console.log(fruit);  // 사과, 바나나, 딸기
}
```

### while 문

```javascript
// 조건이 true인 동안 반복
let count = 0;

while (count < 5) {
  console.log(`카운트: ${count}`);
  count++;  // 이 줄이 없으면 무한 반복!
}

// do...while: 최소 한 번은 실행
let num = 10;
do {
  console.log(num);  // 10 출력 (조건이 false라도 한 번은 실행)
  num++;
} while (num < 5);
```

### break와 continue

```javascript
// break: 반복문 완전히 탈출
for (let i = 0; i < 10; i++) {
  if (i === 5) break;  // i가 5가 되면 반복문 종료
  console.log(i);  // 0, 1, 2, 3, 4 출력
}

// continue: 현재 반복을 건너뛰고 다음 반복으로
for (let i = 0; i < 10; i++) {
  if (i % 2 === 0) continue;  // 짝수면 건너뜀
  console.log(i);  // 1, 3, 5, 7, 9 출력
}
```

---

## 실용 예제 — 로그인 검사 시스템

```javascript
// 사용자 정보 (실제로는 서버에서 가져옴)
const correctId = "admin";
const correctPassword = "1234";

// 사용자 입력값 (실제로는 input에서 가져옴)
let inputId = "admin";
let inputPassword = "1234";

// 입력값 검증
if (!inputId || !inputPassword) {
  // 빈 값이면 falsy이므로 !로 뒤집으면 true
  console.log("아이디와 비밀번호를 모두 입력해주세요.");
} else if (inputId === correctId && inputPassword === correctPassword) {
  console.log("로그인 성공!");
} else if (inputId !== correctId) {
  console.log("존재하지 않는 아이디입니다.");
} else {
  console.log("비밀번호가 틀렸습니다.");
}

// 구구단 출력
for (let i = 2; i <= 9; i++) {
  console.log(`--- ${i}단 ---`);
  for (let j = 1; j <= 9; j++) {
    console.log(`${i} × ${j} = ${i * j}`);
  }
}
```

---

## 정리

| 연산자 종류 | 예시 | 설명 |
|------------|------|------|
| 산술 | `+`, `-`, `*`, `/`, `%` | 숫자 계산 |
| 비교 | `===`, `!==`, `>`, `<` | 비교해서 true/false 반환 |
| 논리 | `&&`, `\|\|`, `!` | 조건 조합 |
| 삼항 | `조건 ? 참 : 거짓` | if/else 축약 |
| 복합 대입 | `+=`, `-=`, `*=` | 계산 후 바로 대입 |

- 비교는 항상 `===` 사용 (`==` 자제)
- `||`와 `??`의 차이를 기억할 것 (falsy 전체 vs null/undefined만)
- `switch`에서 `break` 잊지 말기
