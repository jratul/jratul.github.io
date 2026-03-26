---
title: "React란? 왜 쓰는가"
order: 1
---

# React란? 왜 쓰는가

React는 Facebook(현 Meta)이 만든 **UI 라이브러리**입니다.
"UI를 만들기 위한 JavaScript 라이브러리"라고 공식 문서에 적혀 있는데,
쉽게 말하면 **화면(UI)을 조각조각 나눠서 효율적으로 만들고 업데이트하는 도구**입니다.

---

## 웹 개발의 역사 — React가 왜 등장했는가

React가 처음부터 있었던 건 아닙니다. 웹 개발 방식은 시대마다 크게 달라져 왔습니다.
역사를 따라가면 React가 왜 필요했는지 자연스럽게 이해됩니다.

### 1단계: 바닐라 JS 시대 (2000년대 초반)

초기 웹은 정적인 HTML 문서였습니다. JavaScript는 간단한 애니메이션이나 폼 검증에만 쓰였습니다.
그러다 웹이 점점 동적으로 변하면서 JavaScript로 DOM을 직접 조작해야 했습니다.

```javascript
// 클릭하면 텍스트를 바꾸는 초기 JS 코드
document.getElementById('btn').onclick = function () {
  document.getElementById('msg').innerText = '클릭됨!';
};
```

간단한 건 괜찮았지만, 기능이 많아질수록 DOM 조작 코드가 사방에 흩어져 유지보수가 어려워졌습니다.

### 2단계: jQuery 시대 (2006년~)

jQuery는 "DOM 조작을 더 쉽게"라는 목적으로 등장했습니다.
브라우저마다 다른 API를 통일하고, 코드를 짧게 쓸 수 있게 해줬습니다.

```javascript
// jQuery — 바닐라 JS보다 훨씬 간결해졌다
$('#btn').click(function () {
  $('#msg').text('클릭됨!');
});

// Ajax 요청도 쉬워졌다
$.ajax({ url: '/api/posts', success: function (data) { /* 처리 */ } });
```

jQuery는 엄청난 인기를 끌었지만, 앱이 복잡해지면서 새로운 문제가 생겼습니다.
상태(데이터)와 화면(DOM)을 직접 동기화해야 했고, 코드가 점점 "스파게티"가 됐습니다.

### 3단계: MVC 프레임워크 시대 (2010년~)

AngularJS(2010), Backbone.js 등 MVC 패턴 기반 프레임워크가 등장했습니다.
데이터, 화면, 로직을 분리해서 구조화된 코드를 쓸 수 있었습니다.

```
Model (데이터) ↔ Controller (로직) ↔ View (화면)
```

구조는 나아졌지만, 양방향 데이터 바인딩(데이터 ↔ 화면이 서로 영향)이 대규모 앱에서는
"어디서 왜 화면이 바뀌었는지" 추적하기 어렵게 만들었습니다.

### 4단계: React 등장 (2013년~)

Facebook은 뉴스피드처럼 복잡하게 업데이트되는 UI를 만들면서 기존 방식의 한계를 직접 겪었습니다.
그래서 두 가지 혁신적인 아이디어를 담은 React를 만들었습니다.

- **단방향 데이터 흐름**: 데이터는 위에서 아래로만 흐른다 → 예측하기 쉽다
- **컴포넌트 기반**: UI를 독립적인 조각으로 나눈다 → 재사용하기 쉽다

2013년 오픈소스로 공개된 이후, React는 빠르게 업계 표준이 됐습니다.

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

문제를 정리하면:

1. **상태와 DOM을 수동으로 동기화** — 데이터가 바뀌면 화면을 직접 업데이트해야 함
2. **코드 재사용이 어려움** — 비슷한 UI를 여러 곳에 복붙
3. **팀 협업이 어려움** — 어디서 무엇을 담당하는지 불명확

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

## 가상 DOM (Virtual DOM) 깊이 이해하기

가상 DOM은 React의 핵심 개념입니다. 단계별로 시각적으로 살펴봅시다.

### 가상 DOM이란?

실제 DOM은 브라우저가 화면을 그리기 위해 유지하는 트리 구조입니다.
DOM을 직접 조작하는 것은 느립니다. 브라우저가 레이아웃을 다시 계산하고 화면을 다시 그려야 하기 때문입니다.

React는 메모리 속에 DOM의 가벼운 복사본, 즉 **가상 DOM**을 유지합니다.

### 단계별 업데이트 과정

**상황: 할 일 목록에 항목을 하나 추가합니다.**

```
=== 업데이트 전 ===

가상 DOM (메모리):          실제 DOM (화면):
<ul>                         <ul>
  <li>1번 할 일</li>            <li>1번 할 일</li>
  <li>2번 할 일</li>            <li>2번 할 일</li>
  <li>3번 할 일</li>            <li>3번 할 일</li>
</ul>                        </ul>

상태(state): ['1번 할 일', '2번 할 일', '3번 할 일']
```

사용자가 "4번 할 일"을 추가합니다.

```
=== 1단계: 새 가상 DOM 생성 ===

이전 가상 DOM:              새 가상 DOM:
<ul>                         <ul>
  <li>1번 할 일</li>            <li>1번 할 일</li>
  <li>2번 할 일</li>            <li>2번 할 일</li>
  <li>3번 할 일</li>            <li>3번 할 일</li>
</ul>                          <li>4번 할 일</li>  ← 새로 추가됨
                             </ul>

상태(state): ['1번 할 일', '2번 할 일', '3번 할 일', '4번 할 일']
```

```
=== 2단계: Diffing (비교) ===

React가 이전 가상 DOM과 새 가상 DOM을 비교합니다.

비교 결과:
- <li>1번 할 일</li> → 동일 (변경 없음)
- <li>2번 할 일</li> → 동일 (변경 없음)
- <li>3번 할 일</li> → 동일 (변경 없음)
- <li>4번 할 일</li> → 새로 추가됨! ← 이것만 실제 DOM에 반영
```

```
=== 3단계: 실제 DOM 최소 업데이트 ===

실제 DOM (화면):
<ul>
  <li>1번 할 일</li>    ← 건드리지 않음
  <li>2번 할 일</li>    ← 건드리지 않음
  <li>3번 할 일</li>    ← 건드리지 않음
  <li>4번 할 일</li>    ← 이것만 새로 추가
</ul>
```

이 과정을 **Reconciliation(재조정)**이라고 합니다.
바닐라 JS처럼 전체를 지우고 다시 그리는 것이 아니라, 달라진 부분만 정확히 업데이트합니다.

### 왜 이게 빠른가?

| 방식 | 동작 |
|------|------|
| 바닐라 JS (innerHTML) | 모든 DOM 노드 삭제 → 전체 재생성 |
| React (가상 DOM) | 변경된 노드만 실제 DOM에 반영 |

DOM 조작 횟수가 줄어들수록 브라우저가 레이아웃을 다시 계산하는 횟수도 줄어들어 성능이 향상됩니다.

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

## React의 단방향 데이터 흐름

React의 중요한 설계 원칙 중 하나는 **데이터가 항상 위에서 아래로만 흐른다**는 것입니다.
이를 단방향 데이터 흐름(One-way Data Flow)이라고 합니다.

### 부모 → 자식으로 데이터 전달 (Props)

```
App (부모)
│
│  username="홍길동" 전달 (props)
│
↓
Header (자식)  →  "안녕하세요, 홍길동님"을 화면에 표시
```

```jsx
// 부모 컴포넌트 — 데이터를 가지고 있다
function App() {
  const username = '홍길동';

  return (
    <div>
      <Header username={username} />  {/* props로 데이터 전달 */}
    </div>
  );
}

// 자식 컴포넌트 — 부모에게 받은 데이터를 화면에 표시
function Header({ username }) {
  return <h1>안녕하세요, {username}님</h1>;
}
```

### 왜 단방향인가?

양방향이면 어떤 컴포넌트가 데이터를 바꿨는지 추적하기 어렵습니다.
단방향이면 데이터가 어디서 왔는지 명확하고, 버그가 생겼을 때 위쪽 컴포넌트를 확인하면 됩니다.

```
데이터 흐름:
App (상태 보유)
     ↓ props
  Header
     ↓ props
    Nav

자식이 데이터를 바꾸고 싶으면?
→ 부모가 전달한 "함수"를 호출 (콜백)
→ 부모의 상태가 바뀜
→ 새 데이터가 다시 자식으로 흘러 내려옴
```

```jsx
function App() {
  const [count, setCount] = useState(0);

  return (
    // setCount 함수 자체를 자식에게 전달
    <Counter count={count} onIncrement={() => setCount(c => c + 1)} />
  );
}

function Counter({ count, onIncrement }) {
  return (
    <div>
      <p>현재: {count}</p>
      <button onClick={onIncrement}>+1</button>  {/* 부모의 함수 호출 */}
    </div>
  );
}
```

이 패턴 덕분에 상태가 어디 있고 누가 바꾸는지 코드만 보면 바로 알 수 있습니다.

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

## 상태와 이벤트 — 카운터 완성 예제

React의 핵심은 **상태(state)가 바뀌면 화면이 자동으로 업데이트**된다는 것입니다.
가장 기본적인 예제로 카운터를 만들어 보겠습니다.

```tsx
import { useState } from 'react';

function Counter() {
  // useState(0): 초기값이 0인 상태를 만든다
  // count: 현재 상태값
  // setCount: 상태를 바꾸는 함수
  const [count, setCount] = useState(0);

  return (
    <div>
      <h2>현재 카운트: {count}</h2>

      {/* 버튼을 클릭하면 count가 1 증가 */}
      <button onClick={() => setCount(count + 1)}>
        +1 증가
      </button>

      {/* 버튼을 클릭하면 count가 1 감소 */}
      <button onClick={() => setCount(count - 1)}>
        -1 감소
      </button>

      {/* 0으로 초기화 */}
      <button onClick={() => setCount(0)}>
        초기화
      </button>
    </div>
  );
}

export default Counter;
```

이 코드에서 일어나는 일을 단계별로 보면:

```
1. 처음 렌더링: count = 0 → 화면에 "현재 카운트: 0" 표시

2. "+1 증가" 버튼 클릭
   → setCount(0 + 1) 호출
   → count가 1로 변경
   → React가 컴포넌트를 다시 렌더링
   → 화면에 "현재 카운트: 1" 표시

3. "+1 증가" 버튼 한 번 더 클릭
   → setCount(1 + 1) 호출
   → count가 2로 변경
   → 화면에 "현재 카운트: 2" 표시
```

바닐라 JS라면 `document.getElementById(...).textContent = count`처럼 직접 DOM을 바꿔야 했지만,
React에서는 `setCount`만 호출하면 React가 알아서 화면을 업데이트합니다.

### 여러 상태 관리하기

하나의 컴포넌트에 여러 상태를 둘 수도 있습니다.

```tsx
import { useState } from 'react';

function Profile() {
  const [name, setName] = useState('');
  const [age, setAge] = useState(20);
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <div>
      <input
        value={name}
        onChange={e => setName(e.target.value)}  // 입력할 때마다 name 업데이트
        placeholder="이름 입력"
      />
      <p>이름: {name}</p>
      <p>나이: {age}</p>
      <p>관리자: {isAdmin ? '예' : '아니오'}</p>

      <button onClick={() => setAge(age + 1)}>나이 + 1</button>
      <button onClick={() => setIsAdmin(!isAdmin)}>
        관리자 {isAdmin ? '해제' : '설정'}
      </button>
    </div>
  );
}
```

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

각 파일의 역할:

- **`index.html`**: 브라우저가 처음 읽는 파일. `<div id="root">`가 있고 React 앱이 여기에 마운트됩니다.
- **`src/main.tsx`**: React 앱의 진입점. `index.html`의 `#root`에 React를 연결합니다.
- **`src/App.tsx`**: 앱 전체의 루트 컴포넌트. 모든 컴포넌트는 여기서 시작됩니다.

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

## 자주 하는 오해

React를 처음 배울 때 흔히 잘못 이해하는 부분들을 정리했습니다.

### 오해 1: "React는 느리다"

가상 DOM 때문에 오히려 느리다고 오해하는 경우가 있습니다.

**사실**: 가상 DOM 자체는 추가 연산이지만, 이를 통해 실제 DOM 조작 횟수를 크게 줄입니다.
실제 DOM 조작이 비싼 연산이기 때문에 전체적으로는 더 빠릅니다.

단, 잘못 작성한 React 코드는 느릴 수 있습니다. 예를 들어 불필요한 리렌더링을 허용하거나,
거대한 리스트를 가상화 없이 렌더링하면 느려집니다. 이건 React 자체의 문제가 아닙니다.

```
오해: "가상 DOM = 성능 저하"
사실: "불필요한 DOM 조작 감소 → 전체 성능 향상"
     (단, 코드를 잘 써야 함)
```

### 오해 2: "React로 모든 웹을 만들어야 한다"

React가 인기 있다고 해서 모든 상황에 적합한 건 아닙니다.

**사실**: React는 동적인 UI가 많은 앱에 적합합니다.
단순한 소개 페이지나 콘텐츠 위주 사이트라면 React 없이 HTML + CSS + 약간의 JS로 충분합니다.
React를 쓰면 오히려 불필요한 복잡성이 추가될 수 있습니다.

```
React가 적합한 경우:
- 실시간 데이터 업데이트 (대시보드, 채팅)
- 복잡한 사용자 인터랙션 (드래그앤드롭, 폼)
- 대규모 SPA (Single Page Application)

React가 과할 수 있는 경우:
- 정적 소개 페이지
- 블로그 (Next.js나 정적 사이트 생성기가 더 적합)
- 단순한 랜딩 페이지
```

### 오해 3: "클래스 컴포넌트를 꼭 배워야 한다"

오래된 React 강의나 자료에는 클래스 컴포넌트가 많이 나옵니다.

**사실**: React 16.8(2019년)에 Hooks가 도입된 이후, 함수형 컴포넌트가 표준이 됐습니다.
새 프로젝트에서는 클래스 컴포넌트를 쓸 이유가 없습니다.
React 팀도 공식적으로 함수형 컴포넌트와 Hooks를 권장합니다.

```jsx
// 클래스 컴포넌트 (구식) — 지금은 배울 필요 없음
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }
  render() {
    return (
      <button onClick={() => this.setState({ count: this.state.count + 1 })}>
        {this.state.count}
      </button>
    );
  }
}

// 함수형 컴포넌트 (현재 표준) — 이것을 배우면 된다
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

클래스 컴포넌트는 레거시 코드를 유지보수할 때만 접하게 됩니다.
처음 React를 배운다면 함수형 컴포넌트와 Hooks에만 집중하세요.

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
- jQuery → AngularJS → React 순으로 발전, 각 단계마다 복잡도 문제를 해결
- 컴포넌트 = 재사용 가능한 UI 조각 (레고 블록)
- 선언형 UI = 상태가 이럴 때 UI가 이렇다고 선언, 업데이트는 React가 담당
- 가상 DOM = 변경된 부분만 실제 DOM에 반영해서 효율적
- 단방향 데이터 흐름 = 부모 → 자식으로만 데이터가 흐름 (예측 가능)
- useState = 상태를 만들고, 상태가 바뀌면 React가 화면을 자동으로 업데이트
- 클래스 컴포넌트는 배우지 않아도 됨, 함수형 컴포넌트가 현재 표준
- React만으로는 완전한 앱이 안 됨 — 라우터, 상태관리 등 조합 필요

다음 단계에서는 React의 핵심 문법인 **JSX**를 배웁니다.
