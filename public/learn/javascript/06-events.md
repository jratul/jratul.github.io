---
title: "이벤트 처리"
order: 6
---

## 이벤트란?

**이벤트(Event)**는 브라우저에서 발생하는 모든 "사건"입니다.
클릭, 키보드 입력, 마우스 이동, 폼 제출... 이 모든 것이 이벤트예요.

자바스크립트는 이런 이벤트가 발생했을 때 **특정 함수를 실행**할 수 있습니다.
이 함수를 **이벤트 핸들러(Event Handler)** 또는 **이벤트 리스너(Event Listener)**라고 해요.

```
사용자 행동 → 이벤트 발생 → 이벤트 핸들러 실행
버튼 클릭   → "click"     → 함수 실행
키 누름     → "keydown"   → 함수 실행
```

---

## 이벤트 리스너 등록

이벤트를 처리하는 3가지 방법이 있어요:

```html
<!-- 방법 1: HTML에 직접 (권장하지 않음) -->
<button onclick="alert('클릭!')">버튼</button>
```

```javascript
const btn = document.querySelector("button");

// 방법 2: on 속성으로 등록 (하나만 등록 가능)
btn.onclick = function () {
  console.log("클릭됨!");
};
// 덮어쓰기가 됨 → 마지막 것만 실행
btn.onclick = function () {
  console.log("이것만 실행됨");
};

// 방법 3: addEventListener (권장! 여러 개 등록 가능)
btn.addEventListener("click", function () {
  console.log("첫 번째 핸들러");
});
btn.addEventListener("click", function () {
  console.log("두 번째 핸들러"); // 둘 다 실행됨!
});
```

> **addEventListener를 사용하세요!**
> - 같은 이벤트에 여러 핸들러 등록 가능
> - HTML과 JS를 분리 가능
> - 나중에 이벤트 제거(removeEventListener)도 가능

---

## 주요 이벤트 종류

### 마우스 이벤트

```javascript
const box = document.querySelector(".box");

box.addEventListener("click", () => {
  console.log("클릭!");                    // 클릭
});

box.addEventListener("dblclick", () => {
  console.log("더블클릭!");               // 더블클릭
});

box.addEventListener("mouseenter", () => {
  box.style.backgroundColor = "lightblue"; // 마우스가 들어옴
});

box.addEventListener("mouseleave", () => {
  box.style.backgroundColor = "";          // 마우스가 나감
});

box.addEventListener("mousemove", (e) => {
  console.log(`마우스 위치: ${e.clientX}, ${e.clientY}`); // 마우스 이동
});
```

### 키보드 이벤트

```javascript
const input = document.querySelector("input");

input.addEventListener("keydown", (e) => {
  console.log("누른 키:", e.key);     // "a", "Enter", "Escape" 등
  console.log("키 코드:", e.code);    // "KeyA", "Enter", "Escape" 등

  // 특정 키 감지
  if (e.key === "Enter") {
    console.log("엔터 키 눌림!");
  }

  if (e.key === "Escape") {
    input.value = ""; // ESC로 입력 초기화
  }

  // Ctrl + S 감지
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault(); // 브라우저 기본 동작(저장 다이얼로그) 막기
    console.log("저장!");
  }
});

input.addEventListener("keyup", (e) => {
  console.log("키 떼어짐:", e.key); // 키를 뗄 때
});
```

### 폼 이벤트

```javascript
const form = document.querySelector("form");
const emailInput = document.querySelector("#email");

// submit - 폼 제출 시
form.addEventListener("submit", (e) => {
  e.preventDefault(); // ← 필수! 페이지 새로고침 막기
  const email = emailInput.value;
  console.log("이메일 제출:", email);
});

// change - 값이 변경되고 포커스 잃을 때
emailInput.addEventListener("change", (e) => {
  console.log("변경된 값:", e.target.value);
});

// input - 값이 변경될 때마다 (실시간)
emailInput.addEventListener("input", (e) => {
  console.log("실시간 입력:", e.target.value); // 타이핑할 때마다 실행
});

// focus/blur - 포커스 얻기/잃기
emailInput.addEventListener("focus", () => {
  emailInput.style.borderColor = "blue"; // 포커스 시 테두리 파란색
});

emailInput.addEventListener("blur", () => {
  emailInput.style.borderColor = "";     // 포커스 잃으면 원래대로
});
```

---

## 이벤트 객체(Event Object)

이벤트 핸들러는 **이벤트 객체**를 매개변수로 받습니다.
이 객체에는 이벤트에 대한 다양한 정보가 들어있어요.

```javascript
document.addEventListener("click", (event) => {
  // event 또는 e로 이름 짓는 것이 관례
  console.log(event.type);          // 이벤트 종류: "click"
  console.log(event.target);        // 클릭된 요소
  console.log(event.currentTarget); // 이벤트 리스너가 달린 요소
  console.log(event.clientX);       // 클릭 X 좌표 (뷰포트 기준)
  console.log(event.clientY);       // 클릭 Y 좌표
  console.log(event.timeStamp);     // 이벤트 발생 시각
});

// target vs currentTarget
const parent = document.querySelector(".parent");

parent.addEventListener("click", (e) => {
  console.log("target:", e.target);          // 실제 클릭된 요소 (자식일 수 있음)
  console.log("currentTarget:", e.currentTarget); // 이벤트가 등록된 요소 (.parent)
});
```

---

## 기본 동작 막기 (preventDefault)

브라우저는 특정 이벤트에 **기본 동작**이 있어요:
- `<a>` 클릭 → 페이지 이동
- `<form>` 제출 → 페이지 새로고침
- 체크박스 클릭 → 체크/언체크

`preventDefault()`로 이 기본 동작을 막을 수 있어요:

```javascript
// 링크 클릭해도 이동 안 하게
const link = document.querySelector("a");
link.addEventListener("click", (e) => {
  e.preventDefault();           // 기본 동작(페이지 이동) 막기
  console.log("링크 클릭됨, 이동하지 않음");
});

// 폼 제출 시 새로고침 막기 (필수!)
const form = document.querySelector("form");
form.addEventListener("submit", (e) => {
  e.preventDefault();           // 새로고침 막기
  // 폼 데이터 직접 처리
  const data = new FormData(form);
  console.log("이메일:", data.get("email"));
});

// 우클릭 컨텍스트 메뉴 막기
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();           // 기본 메뉴 막기
  // 커스텀 메뉴 표시
});
```

---

## 이벤트 버블링과 캡처링

이벤트는 **아래에서 위로** 전파됩니다 (버블링):

```html
<div id="outer">
  <div id="inner">
    <button id="btn">클릭</button>
  </div>
</div>
```

```javascript
document.getElementById("btn").addEventListener("click", () => {
  console.log("1. 버튼 클릭");    // 먼저 실행
});

document.getElementById("inner").addEventListener("click", () => {
  console.log("2. inner div");   // 두 번째 실행 (버블링!)
});

document.getElementById("outer").addEventListener("click", () => {
  console.log("3. outer div");   // 세 번째 실행 (계속 버블링!)
});

// 버튼 클릭 시 출력:
// 1. 버튼 클릭
// 2. inner div
// 3. outer div
```

버블링을 막고 싶다면 `stopPropagation()`:

```javascript
document.getElementById("btn").addEventListener("click", (e) => {
  e.stopPropagation(); // 상위로 전파 막기
  console.log("버튼만 실행");
});
```

---

## 이벤트 위임 (Event Delegation)

**이벤트 위임**은 자식 요소들 하나하나에 이벤트를 달지 않고,
**부모 요소에 하나만 달아서 모든 자식 이벤트를 처리**하는 방법입니다.

```javascript
// ❌ 비효율적인 방법: 각 버튼에 이벤트 등록
const buttons = document.querySelectorAll(".todo-item button");
buttons.forEach(btn => {
  btn.addEventListener("click", () => { /* 삭제 처리 */ });
});
// 문제: 나중에 추가된 버튼에는 이벤트가 없음!

// ✅ 이벤트 위임: 부모에 하나만 등록
const todoList = document.getElementById("todo-list");

todoList.addEventListener("click", (e) => {
  // 어떤 요소가 클릭됐는지 확인
  if (e.target.classList.contains("delete-btn")) {
    // 삭제 버튼이 클릭됐을 때
    const li = e.target.closest("li"); // 가장 가까운 li 찾기
    li.remove();
  }

  if (e.target.classList.contains("todo-text")) {
    // 텍스트가 클릭됐을 때 (완료 토글)
    e.target.parentElement.classList.toggle("done");
  }
});
// 이후에 동적으로 추가된 항목도 자동으로 처리됨!
```

---

## 실전 예제: 폼 검증

```html
<form id="signup-form">
  <input id="username" placeholder="이름" />
  <span id="username-error" class="error"></span>

  <input id="email" type="email" placeholder="이메일" />
  <span id="email-error" class="error"></span>

  <input id="password" type="password" placeholder="비밀번호" />
  <span id="pw-error" class="error"></span>

  <button type="submit">가입</button>
</form>
```

```javascript
const form = document.getElementById("signup-form");

// 실시간 유효성 검사
document.getElementById("username").addEventListener("input", (e) => {
  const value = e.target.value.trim();
  const errorEl = document.getElementById("username-error");

  if (value.length < 2) {
    errorEl.textContent = "이름은 2자 이상이어야 합니다";  // 에러 표시
    e.target.classList.add("invalid");
  } else {
    errorEl.textContent = "";         // 에러 제거
    e.target.classList.remove("invalid");
    e.target.classList.add("valid");
  }
});

// 이메일 유효성 검사
document.getElementById("email").addEventListener("blur", (e) => {
  const value = e.target.value;
  const errorEl = document.getElementById("email-error");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // 이메일 형식 정규식

  if (!emailRegex.test(value)) {
    errorEl.textContent = "올바른 이메일 형식이 아닙니다";
  } else {
    errorEl.textContent = "";
  }
});

// 폼 제출
form.addEventListener("submit", (e) => {
  e.preventDefault(); // 새로고침 막기

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  // 최종 검증
  if (!username || !email || !password) {
    alert("모든 필드를 입력해주세요");
    return;
  }

  if (password.length < 8) {
    document.getElementById("pw-error").textContent = "비밀번호는 8자 이상이어야 합니다";
    return;
  }

  // 검증 통과 → 데이터 처리
  console.log("가입 정보:", { username, email });
  alert("가입 완료!");
});
```

---

## 이벤트 리스너 제거

```javascript
// 나중에 제거하려면 함수를 변수에 저장해야 함
function handleClick() {
  console.log("클릭!");
}

const btn = document.querySelector("button");

// 등록
btn.addEventListener("click", handleClick);

// 제거 (같은 함수 참조를 넘겨야 함)
btn.removeEventListener("click", handleClick);

// ❌ 익명 함수는 제거 불가!
btn.addEventListener("click", () => console.log("클릭")); // 이 함수는 제거 못 함

// once 옵션: 한 번만 실행 후 자동 제거
btn.addEventListener("click", () => {
  console.log("한 번만 실행됨!");
}, { once: true }); // 첫 클릭 후 자동으로 리스너 제거
```

---

## 자주 하는 실수

```javascript
// ❌ 실수 1: 폼에 preventDefault 빼먹기
form.addEventListener("submit", () => {
  // e.preventDefault() 없으면 페이지가 새로고침됨!
  console.log("이건 실행도 안 될 수 있음");
});

// ✅ 항상 e.preventDefault() 먼저!
form.addEventListener("submit", (e) => {
  e.preventDefault();
  // 이후 처리
});

// ❌ 실수 2: this를 화살표 함수에서 사용
btn.addEventListener("click", () => {
  console.log(this); // ❌ undefined 또는 window (화살표 함수의 this는 다름)
});

// ✅ 일반 함수 사용 또는 e.currentTarget 사용
btn.addEventListener("click", function () {
  console.log(this); // ✅ 버튼 요소
});

btn.addEventListener("click", (e) => {
  console.log(e.currentTarget); // ✅ 버튼 요소
});
```

---

## 정리

| 이벤트 종류 | 설명 |
|------------|------|
| `click` | 클릭 |
| `dblclick` | 더블클릭 |
| `keydown` / `keyup` | 키보드 누름/뗌 |
| `input` | 입력값 변경 (실시간) |
| `change` | 값 변경 후 포커스 이탈 |
| `submit` | 폼 제출 |
| `focus` / `blur` | 포커스 얻기/잃기 |
| `mouseenter` / `mouseleave` | 마우스 진입/이탈 |
| `scroll` | 스크롤 |
| `load` | 페이지/이미지 로드 완료 |

| 메서드 | 설명 |
|--------|------|
| `addEventListener` | 이벤트 등록 |
| `removeEventListener` | 이벤트 제거 |
| `preventDefault()` | 기본 동작 막기 |
| `stopPropagation()` | 버블링 막기 |

이벤트를 이해하면 **사용자와 상호작용하는 동적인 웹 페이지**를 만들 수 있습니다!
