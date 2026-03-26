---
title: "선택자 (셀렉터)"
order: 2
---

## 선택자란?

CSS를 적용하려면 먼저 "어떤 요소에 스타일을 줄지" 지정해야 합니다. 이것을 **선택자(Selector)**라고 합니다.

마치 반 전체 학생(모든 요소)에게 공지할 수도 있고, 특정 번호(id)의 학생에게만 말할 수도 있고, 같은 그룹(class)에 속한 학생들에게만 전달할 수도 있는 것처럼요.

```css
/* 선택자 { 스타일 } */
p { color: blue; }           /* 모든 <p> 요소 선택 */
#title { color: red; }       /* id가 "title"인 요소 선택 */
.highlight { color: yellow; } /* class가 "highlight"인 요소들 선택 */
```

---

## 기본 선택자 3종

### 1. 태그(Type) 선택자

HTML 태그 이름으로 선택합니다. 해당 태그 **모두**에 적용됩니다.

```html
<h1>제목 1</h1>
<h1>제목 2</h1>   <!-- 이것도 적용됨 -->
<p>본문 1</p>
<p>본문 2</p>     <!-- 이것도 적용됨 -->
```

```css
/* 모든 h1 태그를 파란색으로 */
h1 {
  color: blue;
  font-size: 28px;
}

/* 모든 p 태그 스타일 */
p {
  color: #333;
  line-height: 1.6; /* 줄 간격 */
}
```

**주의**: 태그 선택자는 너무 광범위해서 실무에서는 기본 스타일 설정에만 주로 씁니다.

---

### 2. 클래스(Class) 선택자

`class` 속성으로 그룹을 만들고, `.클래스명`으로 선택합니다.

```html
<p class="highlight">이 문단은 강조됩니다</p>
<p>이 문단은 기본 스타일</p>
<p class="highlight">이것도 강조됩니다</p>   <!-- 같은 클래스 재사용 -->
<span class="highlight">span도 같은 클래스 사용 가능</span>
```

```css
/* .클래스명 - 점(.)으로 시작 */
.highlight {
  background-color: yellow; /* 노란 배경 */
  font-weight: bold;        /* 굵게 */
  padding: 2px 6px;         /* 안쪽 여백 */
}
```

하나의 요소에 **여러 클래스** 동시 적용 가능:

```html
<!-- 띄어쓰기로 여러 클래스 구분 -->
<p class="highlight large-text red-color">다중 클래스</p>
```

```css
.highlight {
  background-color: yellow;
}

.large-text {
  font-size: 20px;
}

.red-color {
  color: red;
}
/* → 세 가지 스타일이 모두 적용됨 */
```

---

### 3. 아이디(ID) 선택자

`id` 속성으로 **유일한** 요소를 지정하고, `#아이디명`으로 선택합니다.

```html
<!-- id는 페이지에서 한 번만 사용해야 함 -->
<div id="header">헤더 영역</div>
<div id="main-content">본문 영역</div>
<div id="footer">푸터 영역</div>
```

```css
/* #아이디명 - 샵(#)으로 시작 */
#header {
  background-color: #2c3e50; /* 어두운 배경 */
  color: white;               /* 흰 글자 */
  padding: 20px;
}

#main-content {
  max-width: 1200px; /* 최대 너비 */
  margin: 0 auto;    /* 가운데 정렬 */
}
```

**클래스 vs 아이디**:

| | 클래스 (class) | 아이디 (id) |
|--|--|--|
| 선택자 기호 | `.` (점) | `#` (샵) |
| 한 페이지 내 사용 횟수 | 여러 번 가능 | 딱 한 번만 |
| 여러 개 적용 | 가능 | 불가 |
| 주로 쓰임 | 반복되는 스타일 | 고유한 요소 |

---

## 복합 선택자

### 자손 선택자 (띄어쓰기)

특정 요소 **안에 있는** 요소를 선택합니다. 얼마나 깊이 있든 상관없습니다.

```html
<div class="card">
  <h2>카드 제목</h2>         <!-- 선택됨 -->
  <p>카드 본문</p>           <!-- 선택됨 -->
  <div>
    <p>중첩된 p</p>          <!-- 이것도 선택됨 (자손이면 모두) -->
  </div>
</div>
<p>카드 밖의 p</p>           <!-- 선택 안 됨 -->
```

```css
/* .card 안에 있는 모든 p를 선택 */
.card p {
  color: #555;
  margin-bottom: 8px;
}

/* .card 안에 있는 모든 h2를 선택 */
.card h2 {
  font-size: 20px;
  font-weight: bold;
}
```

---

### 자식 선택자 (`>`)

바로 아래 **직계 자식**만 선택합니다. 손자는 선택되지 않습니다.

```html
<ul class="menu">
  <li>메뉴 1</li>           <!-- 선택됨 (직계 자식) -->
  <li>메뉴 2
    <ul>
      <li>서브 메뉴</li>    <!-- 선택 안 됨 (손자) -->
    </ul>
  </li>
</ul>
```

```css
/* .menu의 직계 자식 li만 선택 */
.menu > li {
  font-weight: bold;
  padding: 10px;
}
```

---

### 인접 형제 선택자 (`+`)

바로 다음에 오는 **첫 번째 형제** 요소만 선택합니다.

```html
<h2>제목</h2>
<p>첫 번째 p - 선택됨</p>   <!-- h2 바로 다음 p -->
<p>두 번째 p - 선택 안 됨</p>
```

```css
/* h2 바로 뒤의 p에만 적용 */
h2 + p {
  font-size: 18px;   /* 첫 번째 단락 강조 */
  color: #555;
}
```

---

### 일반 형제 선택자 (`~`)

같은 부모를 가진 **뒤에 오는 모든 형제** 요소를 선택합니다.

```html
<h2>제목</h2>
<p>p1 - 선택됨</p>
<p>p2 - 선택됨</p>
<p>p3 - 선택됨</p>
```

```css
/* h2 뒤에 오는 모든 형제 p 선택 */
h2 ~ p {
  margin-left: 20px; /* 들여쓰기 효과 */
}
```

---

## 속성 선택자

HTML 속성을 기준으로 선택합니다.

```html
<input type="text" placeholder="텍스트 입력">
<input type="password" placeholder="비밀번호">
<input type="email" placeholder="이메일">
<a href="https://google.com">외부 링크</a>
<a href="/about">내부 링크</a>
```

```css
/* [속성명] - 해당 속성이 있는 요소 */
input[type] {
  border: 1px solid #ccc;
}

/* [속성명="값"] - 정확히 일치 */
input[type="text"] {
  background-color: #f0f8ff; /* 텍스트 입력창만 하늘색 배경 */
}

input[type="password"] {
  border-color: orange; /* 비밀번호 입력창 주황 테두리 */
}

/* [속성명^="값"] - 값으로 시작하는 */
a[href^="https"] {
  color: green; /* https로 시작하는 링크 초록색 */
}

/* [속성명$="값"] - 값으로 끝나는 */
a[href$=".pdf"] {
  color: red; /* .pdf로 끝나는 링크 빨간색 */
}

/* [속성명*="값"] - 값을 포함하는 */
a[href*="google"] {
  font-weight: bold; /* google이 포함된 링크 굵게 */
}
```

---

## 가상 클래스 선택자 (Pseudo-class)

요소의 **상태**나 **위치**에 따라 선택합니다. 콜론(`:`) 하나를 씁니다.

### 상태 관련

```css
/* 링크 상태 */
a:link {
  color: blue;        /* 방문하지 않은 링크 */
}

a:visited {
  color: purple;      /* 방문한 링크 */
}

a:hover {
  color: red;         /* 마우스를 올렸을 때 */
  text-decoration: underline; /* 밑줄 추가 */
}

a:active {
  color: orange;      /* 클릭하는 순간 */
}

/* 버튼 상태 */
button:hover {
  background-color: #0056b3; /* 마우스 오버 시 색 변경 */
  cursor: pointer;            /* 커서를 손가락 모양으로 */
}

button:focus {
  outline: 2px solid blue;   /* 키보드로 선택됐을 때 */
}

input:focus {
  border-color: #4a90d9;     /* 입력창 선택 시 테두리 색 변경 */
  outline: none;              /* 기본 아웃라인 제거 */
}
```

### 위치 관련

```html
<ul>
  <li>첫 번째</li>
  <li>두 번째</li>
  <li>세 번째</li>
  <li>네 번째</li>
  <li>다섯 번째</li>
</ul>
```

```css
/* 첫 번째 자식 */
li:first-child {
  font-weight: bold;
  color: blue;
}

/* 마지막 자식 */
li:last-child {
  border-bottom: none; /* 마지막 줄에는 구분선 없애기 */
}

/* n번째 자식 */
li:nth-child(2) {
  background-color: #f0f0f0; /* 두 번째 항목 회색 배경 */
}

/* 짝수 번째 (2, 4, 6...) */
li:nth-child(even) {
  background-color: #f5f5f5; /* 얼룩말 줄무늬 효과 */
}

/* 홀수 번째 (1, 3, 5...) */
li:nth-child(odd) {
  background-color: white;
}

/* 3의 배수 번째 */
li:nth-child(3n) {
  color: red;
}
```

### 부정 선택자 `:not()`

특정 조건이 아닌 요소를 선택합니다.

```css
/* .active 클래스가 없는 버튼 */
button:not(.active) {
  opacity: 0.6; /* 비활성 버튼 흐리게 */
}

/* 마지막 li 제외한 모든 li */
li:not(:last-child) {
  border-bottom: 1px solid #eee; /* 마지막 제외 구분선 추가 */
}
```

---

## 가상 요소 선택자 (Pseudo-element)

실제 HTML에 없는 **가상의 요소**를 생성하거나 특정 부분을 선택합니다. 콜론 두 개(`::`)를 씁니다.

```css
/* 요소의 첫 번째 글자 */
p::first-letter {
  font-size: 3em;    /* 드롭캡 효과 - 첫 글자를 크게 */
  font-weight: bold;
  float: left;
  margin-right: 4px;
}

/* 요소의 첫 번째 줄 */
p::first-line {
  font-weight: bold;  /* 첫 줄만 굵게 */
  color: #333;
}

/* 요소 앞에 내용 삽입 */
.price::before {
  content: "₩";      /* 가격 앞에 원화 기호 자동 추가 */
  color: #e74c3c;
}

/* 요소 뒤에 내용 삽입 */
.required::after {
  content: " *";      /* 필수 항목 표시 */
  color: red;
}

/* 텍스트 선택 시 스타일 */
p::selection {
  background-color: #b3d4fc; /* 드래그 선택 시 하늘색 배경 */
  color: #000;
}
```

---

## 선택자 우선순위 (Specificity)

여러 선택자가 같은 요소에 충돌할 때, **구체적인 선택자가 이깁니다**.

우선순위 점수 계산:

| 선택자 | 점수 |
|--------|------|
| 인라인 스타일 | 1000 |
| ID 선택자 (#) | 100 |
| 클래스, 속성, 가상 클래스 (.) | 10 |
| 태그, 가상 요소 | 1 |

```css
p { color: black; }               /* 점수: 1 */
.text { color: blue; }            /* 점수: 10 */
#title { color: red; }            /* 점수: 100 */
div p { color: green; }           /* 점수: 1+1 = 2 */
div .text { color: orange; }      /* 점수: 1+10 = 11 */
```

```html
<!-- 최종 색상은? -->
<p id="title" class="text">이 글자 색은?</p>
```

**답: 빨간색** — id 선택자(100점)가 가장 높음

---

## `!important` — 최후의 수단

어떤 선택자보다 강제로 우선 적용합니다. 하지만 남용하면 유지보수가 매우 어려워집니다.

```css
/* 모든 우선순위를 무시하고 강제 적용 */
.text {
  color: blue !important; /* 인라인 스타일도 이김 */
}
```

**실무 조언**: `!important`는 외부 라이브러리 스타일을 덮어쓸 때처럼 정말 어쩔 수 없는 상황에만 사용하세요.

---

## 전체 선택자 (`*`)

페이지의 모든 요소를 선택합니다.

```css
/* 모든 요소의 기본 여백 초기화 (CSS 리셋) */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box; /* 박스 크기 계산 방식 통일 */
}
```

---

## 그룹 선택자 (`,`)

여러 선택자에 같은 스타일을 한 번에 적용합니다.

```css
/* 아래 두 개는 같은 의미 */

/* 비효율적 */
h1 { color: #333; }
h2 { color: #333; }
h3 { color: #333; }

/* 효율적 */
h1, h2, h3 {
  color: #333;       /* 제목 계열 색상 통일 */
  font-family: sans-serif;
}
```

---

## 흔한 실수

**실수 1: 클래스와 아이디 기호 혼동**

```css
/* 틀림 */
.header { ... }   /* 이건 클래스 선택자인데 id에 쓰면 동작 안 함 */

/* HTML: <div id="header"> 에 적용하려면 */
#header { ... }   /* 올바름 - 아이디는 # */
```

**실수 2: 자손 vs 자식 혼동**

```css
/* .nav 안의 모든 a (얼마나 깊이 있든) */
.nav a { color: white; }

/* .nav의 직계 자식 a만 */
.nav > a { color: white; }
/* 중첩 ul > li > a 는 영향받지 않음 */
```

**실수 3: hover 링크 순서 (LVHA 법칙)**

```css
/* 올바른 순서 - L-V-H-A 순서를 지켜야 함 */
a:link { }     /* L - 방문 전 */
a:visited { }  /* V - 방문 후 */
a:hover { }    /* H - 마우스 오버 */
a:active { }   /* A - 클릭 중 */
/* 순서가 뒤바뀌면 일부 상태가 적용 안 될 수 있음 */
```

---

## 정리

선택자의 종류와 우선순위를 요약하면:

```
!important > 인라인 > ID(#) > 클래스(.) > 태그
```

실무에서 가장 많이 쓰는 선택자는 **클래스 선택자**입니다. 태그 선택자는 너무 광범위하고, 아이디 선택자는 너무 강해서 재사용하기 어렵기 때문입니다. 클래스를 잘 활용하면 유지보수하기 좋은 CSS를 작성할 수 있습니다.
