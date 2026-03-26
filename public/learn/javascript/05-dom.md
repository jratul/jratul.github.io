---
title: "DOM 조작"
order: 5
---

## DOM이란?

HTML을 작성하면 브라우저가 이를 읽어서 **트리 형태의 구조**로 만듭니다.
이 구조를 **DOM(Document Object Model)**이라고 해요.

```
HTML 파일                    DOM 트리
---------                   ---------
<html>                      document
  <body>                    └── html
    <h1>안녕</h1>                └── body
    <p>반가워</p>                    ├── h1 ("안녕")
  </body>                          └── p ("반가워")
</html>
```

자바스크립트로 DOM을 조작하면 **HTML을 동적으로 변경**할 수 있어요.
버튼 클릭 시 내용 변경, 새 요소 추가, 스타일 바꾸기... 모두 DOM 조작입니다!

---

## 요소 선택하기

DOM 조작의 첫 단계는 **원하는 요소를 찾는 것**입니다.

```html
<!-- HTML -->
<div id="container">
  <h1 class="title">안녕하세요</h1>
  <p class="text">첫 번째 문단</p>
  <p class="text">두 번째 문단</p>
  <button data-action="click">클릭</button>
</div>
```

```javascript
// getElementById - id로 하나 선택 (가장 빠름)
const container = document.getElementById("container");
console.log(container); // <div id="container">...</div>

// querySelector - CSS 선택자로 하나 선택 (첫 번째만)
const title = document.querySelector(".title");     // 클래스
const btn = document.querySelector("[data-action]"); // 속성
const h1 = document.querySelector("h1");             // 태그

// querySelectorAll - CSS 선택자로 여러 개 선택 (NodeList 반환)
const allTexts = document.querySelectorAll(".text");
console.log(allTexts.length); // 2

// NodeList를 배열처럼 순회
allTexts.forEach(el => {
  console.log(el.textContent); // 각 <p>의 텍스트
});

// 또는 배열로 변환
const textsArray = Array.from(allTexts);
textsArray.map(el => el.textContent); // ["첫 번째 문단", "두 번째 문단"]
```

---

## 내용 읽고 쓰기

```javascript
const title = document.querySelector("h1");

// 텍스트 내용 읽기/쓰기
console.log(title.textContent); // "안녕하세요"
title.textContent = "반갑습니다"; // 텍스트 변경

// HTML 내용 읽기/쓰기 (HTML 태그 포함)
const div = document.querySelector("#container");
console.log(div.innerHTML);
// "<h1 class="title">반갑습니다</h1>..."

// innerHTML로 HTML 삽입 (보안 주의!)
div.innerHTML = "<strong>굵은 텍스트</strong>";
// ⚠️ 사용자 입력값을 innerHTML에 직접 넣으면 XSS 공격 위험!

// 입력 필드의 값 읽기/쓰기
const input = document.querySelector("input");
console.log(input.value); // 입력된 값
input.value = "기본값";   // 값 설정
```

---

## 스타일 변경

```javascript
const box = document.querySelector(".box");

// style 속성으로 직접 변경
box.style.backgroundColor = "blue";  // background-color → camelCase
box.style.fontSize = "20px";
box.style.display = "none";           // 숨기기
box.style.display = "block";          // 보이기

// 클래스 조작 (더 좋은 방법!)
// classList.add - 클래스 추가
box.classList.add("active");
box.classList.add("highlight", "bold"); // 여러 개 한번에

// classList.remove - 클래스 제거
box.classList.remove("active");

// classList.toggle - 있으면 제거, 없으면 추가
box.classList.toggle("visible"); // 토글

// classList.contains - 클래스 포함 여부 확인
if (box.classList.contains("active")) {
  console.log("active 클래스가 있음");
}
```

CSS와 JS 분리가 가능하므로 **클래스 조작 방식이 더 권장**됩니다:

```css
/* CSS에서 스타일 정의 */
.hidden { display: none; }
.active { color: blue; font-weight: bold; }
```

```javascript
// JS에서는 클래스만 조작
element.classList.add("hidden");    // 숨기기
element.classList.remove("hidden"); // 보이기
element.classList.toggle("active"); // 토글
```

---

## 속성(Attribute) 조작

```javascript
const img = document.querySelector("img");
const link = document.querySelector("a");

// getAttribute - 속성 읽기
console.log(img.getAttribute("src"));  // 이미지 경로
console.log(link.getAttribute("href")); // 링크 주소

// setAttribute - 속성 설정
img.setAttribute("src", "/new-image.png"); // 이미지 변경
img.setAttribute("alt", "새 이미지");      // alt 텍스트 설정
link.setAttribute("href", "https://google.com");

// removeAttribute - 속성 제거
img.removeAttribute("alt");

// HTML 속성은 직접 접근도 가능
img.src = "/another-image.png"; // getAttribute/setAttribute 없이
link.href = "https://naver.com";

// data-* 속성 (커스텀 데이터)
const btn = document.querySelector("[data-id]");
console.log(btn.dataset.id);    // data-id 값
console.log(btn.dataset.action); // data-action 값
```

---

## 새 요소 만들고 추가하기

```javascript
// createElement - 새 요소 생성
const newItem = document.createElement("li"); // <li> 태그 생성
newItem.textContent = "새로운 할 일";          // 텍스트 설정
newItem.classList.add("todo-item");             // 클래스 추가

// appendChild - 마지막 자식으로 추가
const list = document.querySelector("#todo-list");
list.appendChild(newItem);

// prepend - 첫 번째 자식으로 추가
list.prepend(newItem);

// insertAdjacentHTML - 특정 위치에 HTML 삽입 (빠르고 편리)
list.insertAdjacentHTML("beforeend", "<li>마지막에 추가</li>");
list.insertAdjacentHTML("afterbegin", "<li>처음에 추가</li>");

// remove - 요소 제거
const oldItem = document.querySelector(".old-item");
oldItem.remove(); // 요소 자체를 DOM에서 제거
```

---

## 실전 예제: 동적 Todo 리스트

```html
<!-- HTML -->
<input id="todo-input" placeholder="할 일을 입력하세요" />
<button id="add-btn">추가</button>
<ul id="todo-list"></ul>
```

```javascript
const input = document.getElementById("todo-input");
const addBtn = document.getElementById("add-btn");
const todoList = document.getElementById("todo-list");

// 할 일 추가 함수
function addTodo() {
  const text = input.value.trim(); // 앞뒤 공백 제거

  // 빈 입력 체크
  if (!text) {
    alert("할 일을 입력해주세요!");
    return;
  }

  // li 요소 생성
  const li = document.createElement("li");
  li.innerHTML = `
    <span class="todo-text">${text}</span>
    <button class="delete-btn">삭제</button>
  `;

  // 삭제 버튼에 이벤트 연결
  const deleteBtn = li.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", () => {
    li.remove(); // 이 li 제거
  });

  // 목록에 추가
  todoList.appendChild(li);

  // 입력창 초기화
  input.value = "";
  input.focus(); // 입력창으로 포커스 이동
}

// 버튼 클릭 시 추가
addBtn.addEventListener("click", addTodo);

// Enter 키로도 추가
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addTodo();
  }
});
```

---

## DOM 탐색

요소 간 부모/자식/형제 관계로 이동:

```javascript
const item = document.querySelector(".item");

// 부모 요소
const parent = item.parentElement;

// 자식 요소들
const children = item.children;           // HTML 요소만
const firstChild = item.firstElementChild; // 첫 번째 자식
const lastChild = item.lastElementChild;   // 마지막 자식

// 형제 요소
const prev = item.previousElementSibling; // 이전 형제
const next = item.nextElementSibling;      // 다음 형제

// closest() - 가장 가까운 조상 찾기 (이벤트 위임에서 유용)
const btn = document.querySelector(".delete-btn");
const listItem = btn.closest("li"); // 가장 가까운 li 조상 찾기
```

---

## 자주 하는 실수

```javascript
// ❌ 실수 1: HTML이 로드되기 전에 DOM 접근
// <script>를 <head>에 넣으면 요소가 없음!
const el = document.getElementById("my-element"); // null 반환
el.textContent = "안녕"; // ❌ TypeError: Cannot set properties of null

// ✅ 해결: <script>를 </body> 바로 앞에 놓거나 DOMContentLoaded 사용
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("my-element"); // 이제 존재함
  el.textContent = "안녕";
});

// ❌ 실수 2: querySelectorAll 결과에 배열 메서드 사용
const items = document.querySelectorAll(".item"); // NodeList
items.map(item => item.textContent); // ❌ NodeList는 map() 없음!

// ✅ 해결: Array.from()으로 변환
const itemsArray = Array.from(items);
itemsArray.map(item => item.textContent); // ✅

// ❌ 실수 3: innerHTML로 사용자 입력 직접 삽입 (XSS 공격)
const userInput = "<script>악성코드()</script>";
div.innerHTML = userInput; // ❌ 보안 위험!

// ✅ 해결: textContent 사용
div.textContent = userInput; // ✅ 안전하게 텍스트로만 처리
```

---

## 정리

| 작업 | 메서드/속성 |
|------|------------|
| 요소 선택 | `getElementById`, `querySelector`, `querySelectorAll` |
| 텍스트 읽기/쓰기 | `textContent` |
| HTML 읽기/쓰기 | `innerHTML` (보안 주의) |
| 스타일 변경 | `style.property`, `classList.add/remove/toggle` |
| 속성 조작 | `getAttribute`, `setAttribute` |
| 요소 생성 | `createElement`, `innerHTML` |
| 요소 추가 | `appendChild`, `prepend`, `insertAdjacentHTML` |
| 요소 제거 | `remove()` |

DOM 조작을 이해하면 정적인 HTML 페이지를 **동적인 웹 앱**으로 만들 수 있습니다.
다음 단계는 DOM 조작을 트리거하는 **이벤트 처리**를 배워봐요!
