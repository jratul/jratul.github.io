---
title: "JSX 문법"
order: 2
---

# JSX 문법

JSX(JavaScript XML)는 JavaScript 코드 안에서 HTML처럼 생긴 문법을 쓸 수 있게 해주는 확장 문법입니다.
React 컴포넌트가 "이렇게 생겼다"고 표현할 때 사용합니다.

---

## JSX가 뭔가?

JavaScript 파일 안에 이런 코드를 쓸 수 있습니다:

```jsx
// JSX — HTML처럼 생겼지만 실제로는 JavaScript다
const element = <h1>안녕하세요!</h1>;
```

이건 HTML도, 특별한 템플릿도 아닙니다.
브라우저는 JSX를 직접 이해하지 못합니다. Babel이라는 도구가 이 코드를 순수 JavaScript로 변환합니다.

```javascript
// 위 JSX는 실제로 이 JavaScript로 변환된다
const element = React.createElement('h1', null, '안녕하세요!');
```

JSX는 `React.createElement(...)` 호출을 더 읽기 쉽게 쓸 수 있는 문법 설탕(syntactic sugar)입니다.
매번 `React.createElement`를 쓰는 건 너무 불편하니까요.

---

## JSX 기본 규칙

### 규칙 1: 반드시 하나의 루트 요소로 감싸야 한다

```jsx
// 잘못된 코드 — 두 개의 루트 요소
function Bad() {
  return (
    <h1>제목</h1>  // 오류! 루트가 두 개
    <p>내용</p>
  );
}

// 올바른 코드 1 — div로 감싸기
function Good1() {
  return (
    <div>          {/* 하나의 루트 div */}
      <h1>제목</h1>
      <p>내용</p>
    </div>
  );
}

// 올바른 코드 2 — Fragment 사용 (불필요한 div 없이)
function Good2() {
  return (
    <>             {/* Fragment: DOM에 실제 요소를 추가하지 않음 */}
      <h1>제목</h1>
      <p>내용</p>
    </>
  );
}
```

`<>...</>` 는 `React.Fragment`의 단축 문법입니다.
불필요한 `div`를 추가하지 않고 여러 요소를 반환할 수 있습니다.

### 규칙 2: 모든 태그는 닫아야 한다

HTML에서는 `<br>`, `<img>`처럼 닫는 태그 없이 쓸 수 있었지만,
JSX에서는 반드시 닫아야 합니다.

```jsx
// 잘못된 코드
function Bad() {
  return (
    <div>
      <img src="photo.jpg">   {/* 오류! 닫는 태그 없음 */}
      <br>                    {/* 오류! */}
    </div>
  );
}

// 올바른 코드
function Good() {
  return (
    <div>
      <img src="photo.jpg" />  {/* 자기 닫힘(self-closing) */}
      <br />                   {/* 자기 닫힘 */}
    </div>
  );
}
```

### 규칙 3: class 대신 className을 쓴다

`class`는 JavaScript의 예약어(class 키워드)이므로 JSX에서는 `className`을 사용합니다.

```jsx
// 잘못된 코드
<div class="container">내용</div>  // 경고 발생

// 올바른 코드
<div className="container">내용</div>  // className 사용
```

### 규칙 4: 스타일은 객체로 전달한다

```jsx
// 잘못된 코드 — HTML 방식
<div style="color: red; font-size: 16px">텍스트</div>

// 올바른 코드 — JavaScript 객체 방식
<div style={{ color: 'red', fontSize: '16px' }}>텍스트</div>
//          ^^ 바깥 {}는 JSX 표현식, 안쪽 {}는 객체 리터럴

// CSS 속성 이름은 camelCase로: font-size → fontSize
```

---

## JSX 안에서 JavaScript 표현식 사용하기

JSX 안에서 `{ }` 중괄호를 사용하면 JavaScript 표현식을 넣을 수 있습니다.

```jsx
function Greeting() {
  const name = '김철수';           // JavaScript 변수
  const isLoggedIn = true;         // 불리언 값

  return (
    <div>
      <h1>안녕하세요, {name}님!</h1>       {/* 변수 값 출력 */}
      <p>현재 시각: {new Date().toLocaleTimeString()}</p>  {/* 함수 호출 */}
      <p>1 + 1 = {1 + 1}</p>              {/* 연산식 */}
      <p>{isLoggedIn ? '로그인됨' : '로그아웃'}</p>  {/* 삼항 연산자 */}
    </div>
  );
}
```

**주의**: `{ }` 안에는 **표현식(expression)**만 들어갈 수 있습니다.
`if`문, `for`문 같은 **문(statement)**은 직접 쓸 수 없습니다.

```jsx
// 잘못된 코드 — if문은 표현식이 아님
function Bad() {
  return (
    <div>
      {if (isLoggedIn) { <p>로그인됨</p> }}  {/* 오류! */}
    </div>
  );
}

// 올바른 코드 — 삼항 연산자 사용
function Good() {
  return (
    <div>
      {isLoggedIn ? <p>로그인됨</p> : <p>로그아웃</p>}  {/* OK */}
    </div>
  );
}
```

---

## JSX에서 자주 쓰는 패턴들

### 조건부 렌더링

```jsx
function UserStatus({ isLoggedIn, username }) {
  return (
    <div>
      {/* 패턴 1: 삼항 연산자 */}
      {isLoggedIn ? <span>{username}님</span> : <span>게스트</span>}

      {/* 패턴 2: && 연산자 (truthy일 때만 렌더링) */}
      {isLoggedIn && <button>로그아웃</button>}

      {/* 패턴 3: || 연산자 (falsy일 때 기본값) */}
      <p>{username || '이름 없음'}</p>
    </div>
  );
}
```

**흔한 실수**: `&&` 왼쪽에 숫자 0을 쓰면 0이 화면에 출력됩니다.

```jsx
// 실수하기 쉬운 코드
const count = 0;
return <div>{count && <span>항목 있음</span>}</div>;
// 결과: 화면에 "0"이 출력된다!

// 올바른 코드 — 명시적으로 boolean으로 변환
return <div>{count > 0 && <span>항목 있음</span>}</div>;
// 또는
return <div>{!!count && <span>항목 있음</span>}</div>;
```

### 리스트 렌더링

```jsx
function ShoppingList() {
  const items = ['사과', '바나나', '오렌지'];

  return (
    <ul>
      {items.map((item, index) => (
        // key는 반드시 고유한 값이어야 한다 (index는 차선책)
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
```

### 이벤트 핸들러

```jsx
function ClickExample() {
  const handleClick = () => {
    alert('클릭했습니다!');
  };

  return (
    // onClick에 함수 참조를 전달 (호출이 아님!)
    <button onClick={handleClick}>클릭</button>

    // 또는 인라인 화살표 함수
    // <button onClick={() => alert('클릭!')}>클릭</button>
  );
}
```

**흔한 실수**: `onClick={handleClick()}` 처럼 괄호를 붙이면 렌더링할 때 즉시 실행됩니다.

```jsx
// 잘못된 코드 — 렌더링 즉시 실행되어 버림
<button onClick={handleClick()}>클릭</button>

// 올바른 코드 — 클릭할 때 실행
<button onClick={handleClick}>클릭</button>
```

---

## JSX와 HTML의 차이점 정리

| HTML | JSX | 이유 |
|------|-----|------|
| `class` | `className` | `class`는 JS 예약어 |
| `for` | `htmlFor` | `for`는 JS 예약어 |
| `style="color:red"` | `style={{ color: 'red' }}` | JS 객체로 전달 |
| `onclick="..."` | `onClick={...}` | camelCase + JS 함수 |
| `<br>` | `<br />` | 자기 닫힘 필수 |
| `<!-- 주석 -->` | `{/* 주석 */}` | JSX 안 주석 문법 |
| `tabindex` | `tabIndex` | camelCase |

---

## JSX를 반환하는 함수 — 컴포넌트

```jsx
// 컴포넌트는 대문자로 시작해야 한다 (중요!)
function ProductCard({ name, price, inStock }) {
  return (
    <div className="product-card">
      <h2>{name}</h2>                         {/* 상품명 */}
      <p className="price">{price.toLocaleString()}원</p>  {/* 가격 포맷 */}

      {/* 재고 여부에 따라 다른 UI */}
      {inStock
        ? <button className="btn-buy">구매하기</button>
        : <span className="out-of-stock">품절</span>
      }
    </div>
  );
}

// 사용 예
function App() {
  return (
    <div>
      <ProductCard name="노트북" price={1200000} inStock={true} />
      <ProductCard name="마우스" price={35000} inStock={false} />
    </div>
  );
}
```

컴포넌트 이름이 소문자면 React는 HTML 태그로 인식합니다.
`<productCard />`는 HTML 태그, `<ProductCard />`는 React 컴포넌트입니다.

---

## 핵심 요약

- JSX = JS 안에서 HTML처럼 UI를 표현하는 문법
- 하나의 루트 요소로 감싸야 함 (`<>...</>` 사용 가능)
- 모든 태그는 닫아야 함 (`<br />`)
- `class` → `className`, 스타일은 객체로
- `{ }` 안에 JavaScript 표현식 삽입 가능 (if문 X, 삼항 연산자 O)
- 이벤트 핸들러는 함수 참조로 전달 (`onClick={fn}`, `onClick={fn()}` 아님)

다음 단계에서는 **컴포넌트**를 더 깊이 배웁니다.
