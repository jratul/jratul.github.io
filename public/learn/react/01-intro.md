---
title: "React란? 왜 쓰는가"
order: 1
---

# React란? 왜 쓰는가

React는 Facebook(현 Meta)이 만든 **UI 라이브러리**입니다.
"UI를 만들기 위한 JavaScript 라이브러리"라고 공식 문서에 적혀 있는데,
쉽게 말하면 **화면(UI)을 조각조각 나눠서 효율적으로 만들고 업데이트하는 도구**입니다.

---

## 왜 React가 필요한가?

### 바닐라 JS의 한계

React 없이 순수 JavaScript로 동적인 웹 페이지를 만들면 이런 코드를 작성하게 됩니다:

```javascript
// 바닐라 JS로 Todo 앱 만들기 — 금방 복잡해진다
const todos = [];

function addTodo(text) {
  todos.push({ id: Date.now(), text, done: false }); // 배열에 추가
  render(); // 전체 UI를 다시 그린다
}

function render() {
  const list = document.getElementById('todo-list');
  list.innerHTML = ''; // 기존 내용을 지우고

  todos.forEach(todo => {
    const li = document.createElement('li'); // li 요소 만들고
    li.textContent = todo.text;              // 텍스트 넣고
    li.addEventListener('click', () => {     // 이벤트 달고
      todo.done = !todo.done;
      render(); // 또 전체 다시 그리기
    });
    list.appendChild(li); // DOM에 추가
  });
}
```

항목이 1개 바뀌어도 전체 리스트를 지우고 다시 그립니다.
기능이 늘어날수록 코드가 스파게티처럼 얽히고, 어디서 무엇이 바뀌는지 추적하기 어려워집니다.

### React가 해결하는 것

React는 세 가지 핵심 문제를 해결합니다:

**1. 컴포넌트(Component) — 재사용 가능한 UI 조각**

레고 블록을 생각해보세요. 레고로 집을 만들 때 창문 블록, 문 블록을 따로 만들어 조립합니다.
React도 마찬가지로 `Button`, `Card`, `Header` 같은 UI 조각을 따로 만들고 조립합니다.
한 번 만든 `Button` 컴포넌트는 어디서든 재사용할 수 있습니다.

**2. 선언적 UI (Declarative UI)**

바닐라 JS는 "어떻게" 그려야 하는지 단계별로 지시합니다 (명령형).
React는 "이 상태일 때 UI가 이렇게 생겼다"고 선언합니다 (선언형).

```javascript
// 명령형 (바닐라 JS): 어떻게 그릴지 직접 지시
const button = document.createElement('button');
button.textContent = '좋아요';
button.style.color = isLiked ? 'red' : 'gray';
container.appendChild(button);

// 선언형 (React): 상태에 따라 어떻게 보여야 하는지 선언
function LikeButton({ isLiked }) {
  return <button style={{ color: isLiked ? 'red' : 'gray' }}>좋아요</button>;
  // isLiked가 바뀌면 React가 알아서 업데이트한다
}
```

**3. 효율적인 DOM 업데이트 — 가상 DOM(Virtual DOM)**

React는 실제 DOM을 바꾸기 전에 가상 DOM(메모리 속 DOM 복사본)에서 변경사항을 먼저 계산합니다.
그리고 실제로 바뀐 부분만 골라서 실제 DOM을 업데이트합니다.

마치 문서를 수정할 때 전체를 다시 프린트하는 대신, 달라진 줄만 찾아 고치는 것과 같습니다.

---

## React의 핵심 개념 한눈에 보기

```
전체 앱
├── Header 컴포넌트
├── Main 컴포넌트
│   ├── TodoList 컴포넌트
│   │   ├── TodoItem 컴포넌트 (반복)
│   │   └── TodoItem 컴포넌트 (반복)
│   └── AddForm 컴포넌트
└── Footer 컴포넌트
```

이렇게 앱을 트리 구조의 컴포넌트로 나눕니다.
각 컴포넌트는 자신만의 **상태(state)**와 **화면(UI)**을 가집니다.

---

## React는 라이브러리다, 프레임워크가 아니다

React는 UI만 담당하는 라이브러리입니다.
라우팅(페이지 이동), 데이터 페칭, 상태관리 등은 별도 라이브러리를 조합해서 씁니다.

| 역할 | 도구 |
|------|------|
| UI 렌더링 | React |
| 페이지 이동 | React Router |
| 서버 데이터 | React Query / SWR |
| 전역 상태 | Zustand / Redux |
| 스타일 | TailwindCSS / CSS Modules |

이 자유도가 React의 장점이자 단점입니다.
조합이 자유롭지만, 뭘 써야 할지 선택해야 합니다.

---

## 첫 번째 React 코드

```jsx
// 가장 단순한 React 컴포넌트
function Hello() {
  return <h1>안녕하세요, React!</h1>; // JSX — HTML처럼 생겼지만 JavaScript다
}

// 이 컴포넌트를 화면에 표시하려면:
// ReactDOM.createRoot(document.getElementById('root')).render(<Hello />);
```

함수 하나가 컴포넌트입니다. 이 함수가 "이 컴포넌트는 이렇게 생겼다"고 반환합니다.
`<Hello />`처럼 HTML 태그처럼 사용하면 됩니다.

---

## 개발 환경 세팅

### Vite로 프로젝트 만들기 (권장)

```bash
# Vite + React + TypeScript 프로젝트 생성
npm create vite@latest my-app -- --template react-ts

cd my-app          # 프로젝트 폴더로 이동
npm install        # 의존성 설치
npm run dev        # 개발 서버 시작 (http://localhost:5173)
```

### 프로젝트 구조

```
my-app/
├── src/
│   ├── App.tsx        ← 최상위 컴포넌트
│   ├── main.tsx       ← 앱 진입점 (React를 DOM에 연결)
│   └── index.css      ← 전역 스타일
├── public/            ← 정적 파일
├── index.html         ← HTML 템플릿
└── package.json
```

```tsx
// src/main.tsx — React 앱을 실제 DOM에 연결하는 진입점
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>  {/* 개발 모드에서 문제를 미리 감지 */}
    <App />
  </React.StrictMode>
);
```

```tsx
// src/App.tsx — 앱의 루트 컴포넌트
function App() {
  return (
    <div>
      <h1>내 첫 React 앱</h1>
      <p>Hello, World!</p>
    </div>
  );
}

export default App;
```

---

## React로 무엇을 만드나?

React는 다음과 같은 곳에 쓰입니다:

- **단일 페이지 앱(SPA)**: Gmail, Facebook, Twitter 같은 앱
- **대화형 UI**: 실시간 업데이트가 필요한 대시보드
- **모바일 앱**: React Native로 iOS/Android 앱도 만들 수 있음
- **정적 사이트**: Next.js와 함께 블로그, 포트폴리오

---

## 핵심 요약

- React = UI를 컴포넌트 단위로 만드는 JavaScript 라이브러리
- 컴포넌트 = 재사용 가능한 UI 조각 (레고 블록)
- 선언형 UI = 상태가 이럴 때 UI가 이렇다고 선언, 업데이트는 React가 담당
- 가상 DOM = 변경된 부분만 실제 DOM에 반영해서 효율적
- React만으로는 완전한 앱이 안 됨 — 라우터, 상태관리 등 조합 필요

다음 단계에서는 React의 핵심 문법인 **JSX**를 배웁니다.
