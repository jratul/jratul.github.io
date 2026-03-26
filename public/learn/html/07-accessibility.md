---
title: "웹 접근성 (a11y)"
order: 7
---

## 웹 접근성이란?

**웹 접근성(Web Accessibility, a11y)**은 장애가 있는 사람들도 웹사이트를 불편 없이 사용할 수 있게 만드는 것입니다.

> `a11y` = accessibility의 줄임말 (a + 11글자 + y)

웹을 사용하는 모든 사람을 생각해야 합니다:
- **시각 장애인**: 스크린 리더로 웹을 "듣습니다"
- **운동 장애인**: 마우스 없이 키보드만으로 탐색합니다
- **청각 장애인**: 영상에 자막이 필요합니다
- **인지 장애인**: 복잡한 레이아웃이 어렵습니다

접근성은 특정 사람들만을 위한 것이 아닙니다.
접근성이 좋은 사이트는 **모든 사람**이 사용하기 편합니다.

---

## 시맨틱 HTML — 접근성의 기초

올바른 태그를 사용하는 것만으로 접근성이 크게 향상됩니다.

```html
<!-- 잘못된 예: 의미 없는 div만 사용 -->
<div class="header">
  <div class="nav">
    <div class="nav-item">홈</div>
    <div class="nav-item">블로그</div>
  </div>
</div>
<div class="content">
  <div class="title">제목</div>
  <div class="text">내용</div>
</div>

<!-- 올바른 예: 시맨틱 태그 사용 -->
<header>
  <nav>
    <ul>
      <li><a href="/">홈</a></li>
      <li><a href="/blog">블로그</a></li>
    </ul>
  </nav>
</header>
<main>
  <h1>제목</h1>
  <p>내용</p>
</main>
```

시맨틱 태그를 사용하면 스크린 리더가 "헤더입니다", "내비게이션입니다", "제목입니다"라고 사용자에게 알려줍니다.

---

## 제목 계층 구조

```html
<!-- 잘못된 예: 제목을 크기 때문에 선택 -->
<h1>메인 제목</h1>
<h3>소제목 (h2를 건너뜀!)</h3>  <!-- 스크린 리더 사용자가 혼란스러움 -->
<h5>더 작은 제목</h5>

<!-- 올바른 예: 순서대로 사용 -->
<h1>페이지의 유일한 메인 제목</h1>
  <h2>큰 섹션 제목</h2>
    <h3>소섹션 제목</h3>
    <h3>소섹션 제목</h3>
  <h2>다음 큰 섹션</h2>
    <h3>소섹션 제목</h3>
```

> 한 페이지에 `<h1>`은 하나만 있어야 합니다.
> 제목은 크기를 위해 쓰는 것이 아니라 **문서 구조**를 나타냅니다.
> 크기 조정은 CSS로 하세요.

---

## alt 속성 — 이미지 접근성

```html
<!-- 정보를 담은 이미지: 내용을 설명 -->
<img src="chart.png" alt="2024년 1~12월 월별 매출 그래프. 3월이 최고점" />

<!-- 장식용 이미지: alt를 빈 문자열로 (스크린 리더가 무시) -->
<img src="divider.png" alt="" role="presentation" />

<!-- 아이콘 버튼: 기능을 설명 -->
<button>
  <img src="search-icon.svg" alt="검색" />
</button>

<!-- 텍스트가 있는 버튼의 아이콘: alt 생략 -->
<button>
  <img src="search-icon.svg" alt="" />  <!-- 옆의 텍스트로 충분 -->
  검색
</button>
```

---

## ARIA (Accessible Rich Internet Applications)

ARIA는 HTML만으로 전달하기 어려운 접근성 정보를 추가하는 속성 모음입니다.

### `aria-label` — 요소에 이름 붙이기

```html
<!-- 아이콘만 있는 버튼에 이름 제공 -->
<button aria-label="검색창 열기">
  🔍
</button>

<!-- 여러 nav가 있을 때 구분 -->
<nav aria-label="메인 네비게이션">...</nav>
<nav aria-label="푸터 네비게이션">...</nav>

<!-- 닫기 버튼 -->
<button aria-label="모달 닫기">✕</button>
```

### `aria-labelledby` — 다른 요소를 이름으로 참조

```html
<h2 id="signup-title">회원가입</h2>
<form aria-labelledby="signup-title">
  <!-- 폼이 "회원가입" 폼임을 알림 -->
</form>
```

### `aria-describedby` — 추가 설명 연결

```html
<label for="password">비밀번호</label>
<input
  type="password"
  id="password"
  aria-describedby="password-hint"  <!-- 힌트와 연결 -->
/>
<p id="password-hint">8자 이상, 영문·숫자·특수문자 포함</p>
```

### `aria-expanded` — 펼침/닫힘 상태

```html
<button
  aria-expanded="false"         <!-- 현재 닫혀있음 -->
  aria-controls="submenu"       <!-- 어떤 요소를 제어하는지 -->
>
  메뉴 열기
</button>

<ul id="submenu" hidden>
  <li><a href="/item1">항목 1</a></li>
  <li><a href="/item2">항목 2</a></li>
</ul>
```

```javascript
// 버튼 클릭 시 상태 업데이트
button.addEventListener('click', () => {
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', !expanded);  // 상태 전환
  submenu.hidden = expanded;
});
```

### `aria-hidden` — 스크린 리더에서 숨기기

```html
<!-- 장식용 아이콘: 스크린 리더가 읽지 않게 -->
<span aria-hidden="true">★</span> 4.8점

<!-- 중복 정보 숨기기 -->
<a href="/posts/1">
  <img src="thumb.jpg" alt="React 입문" />
  <span>React 입문</span>  <!-- 이미 alt에 있으므로 -->
  <span aria-hidden="true">→</span>  <!-- 장식용 화살표 -->
</a>
```

### `role` — 요소의 역할 지정

```html
<!-- div를 버튼처럼 동작시킬 때 (권장하지 않음, 가능하면 <button> 사용) -->
<div role="button" tabindex="0" onclick="doAction()">
  클릭하세요
</div>

<!-- 알림 메시지 (동적으로 변하는 내용을 스크린 리더가 읽음) -->
<div role="alert">
  저장되었습니다.
</div>

<!-- 진행 상태 -->
<div role="progressbar" aria-valuenow="70" aria-valuemin="0" aria-valuemax="100">
  70%
</div>
```

---

## 키보드 접근성

마우스 없이 키보드만으로 모든 기능을 사용할 수 있어야 합니다.

### `tabindex` — 키보드 포커스 순서

```html
<!-- tabindex="0": 기본 탭 순서에 포함 (div, span 등에 추가) -->
<div tabindex="0" role="button">커스텀 버튼</div>

<!-- tabindex="-1": 탭으로는 접근 불가, JS로만 포커스 가능 -->
<div id="modal" tabindex="-1">모달 내용</div>

<!-- tabindex="1, 2, 3...": 사용 금지! 탭 순서 꼬임 -->
<input tabindex="2" />  <!-- 잘못된 예 -->
<input tabindex="1" />  <!-- 잘못된 예 -->
```

### 포커스 스타일 — 절대 제거하지 마세요

```css
/* 잘못된 예: 포커스 표시 제거 (키보드 사용자가 현재 위치를 모름) */
:focus {
  outline: none;  /* 절대 금지! */
}

/* 올바른 예: 더 예쁘게 스타일링하되 제거하지 않음 */
:focus-visible {
  outline: 3px solid #6366f1;
  outline-offset: 2px;
  border-radius: 4px;
}
```

---

## 색상 대비

텍스트와 배경 색상의 대비가 충분해야 합니다.

**WCAG 기준:**
- 일반 텍스트: 대비 비율 **4.5:1** 이상
- 큰 텍스트(18px+ 또는 14px+ 굵게): **3:1** 이상

```html
<!-- 잘못된 예: 연한 회색 텍스트 (대비 불충분) -->
<p style="color: #aaa; background: #fff;">읽기 어려운 텍스트</p>

<!-- 올바른 예: 충분한 대비 -->
<p style="color: #333; background: #fff;">읽기 쉬운 텍스트</p>
```

> 색상만으로 정보를 전달하면 안 됩니다.
> 색맹인 분들은 색상 차이를 구분하지 못할 수 있습니다.

```html
<!-- 잘못된 예: 색상만으로 오류 표시 -->
<input style="border-color: red;" />

<!-- 올바른 예: 색상 + 아이콘 + 텍스트로 표시 -->
<input aria-invalid="true" aria-describedby="error-msg" />
<p id="error-msg">⚠ 이메일 형식이 올바르지 않습니다</p>
```

---

## 폼 접근성

```html
<form>
  <!-- label은 반드시 input과 연결 -->
  <div>
    <label for="name">이름 <span aria-hidden="true">*</span></label>
    <input
      type="text"
      id="name"
      name="name"
      required
      aria-required="true"          <!-- 스크린 리더에 필수 항목임을 알림 -->
      autocomplete="name"           <!-- 자동완성 힌트 -->
    />
  </div>

  <!-- 오류 메시지 연결 -->
  <div>
    <label for="email">이메일</label>
    <input
      type="email"
      id="email"
      name="email"
      aria-invalid="true"            <!-- 유효하지 않음을 표시 -->
      aria-describedby="email-error"
    />
    <p id="email-error" role="alert">올바른 이메일 주소를 입력해주세요</p>
  </div>

  <!-- 라디오/체크박스 그룹은 fieldset으로 묶기 -->
  <fieldset>
    <legend>선호 연락 방법</legend>
    <label>
      <input type="radio" name="contact" value="email" />
      이메일
    </label>
    <label>
      <input type="radio" name="contact" value="phone" />
      전화
    </label>
  </fieldset>

</form>
```

---

## 동적 콘텐츠와 라이브 영역

페이지 내용이 동적으로 변할 때 스크린 리더에 알리는 방법:

```html
<!-- aria-live: 내용이 바뀌면 스크린 리더가 읽음 -->
<div aria-live="polite" id="status">
  <!-- JavaScript로 동적으로 내용 변경 시 읽어줌 -->
</div>

<!-- role="alert": 중요한 알림 (즉시 읽음) -->
<div role="alert" id="error-message"></div>

<!-- role="status": 덜 중요한 상태 (현재 읽던 것 끝나면 읽음) -->
<div role="status" id="save-status"></div>
```

```javascript
// 폼 저장 후 상태 업데이트
document.getElementById('save-status').textContent = '저장되었습니다.';

// 오류 발생 시
document.getElementById('error-message').textContent = '저장에 실패했습니다. 다시 시도해주세요.';
```

---

## 미디어 접근성

```html
<!-- 동영상: 자막과 음성 해설 제공 -->
<video controls>
  <source src="lecture.mp4" type="video/mp4" />

  <!-- 자막 파일 (WebVTT 형식) -->
  <track
    kind="subtitles"
    src="captions-ko.vtt"
    srclang="ko"
    label="한국어"
    default
  />
  <!-- 청각 장애인을 위한 대화 텍스트 -->
  <track
    kind="captions"
    src="captions-ko.vtt"
    srclang="ko"
    label="한국어 자막"
  />
</video>

<!-- 오디오: 텍스트 스크립트 제공 -->
<audio controls src="podcast.mp3"></audio>
<details>
  <summary>팟캐스트 대본 보기</summary>
  <p>안녕하세요. 오늘은 웹 접근성에 대해 이야기하겠습니다...</p>
</details>
```

---

## 언어 설정

```html
<!-- HTML 언어 설정: 스크린 리더가 올바른 발음으로 읽음 -->
<html lang="ko">

<!-- 특정 부분이 다른 언어인 경우 -->
<p>
  이 기능을 <span lang="en">Progressive Enhancement</span>라고 합니다.
</p>
```

---

## 자주 하는 실수

**실수 1: 클릭 가능한 div 사용**
```html
<!-- 잘못된 예: 키보드로 접근 불가 -->
<div onclick="openModal()">모달 열기</div>

<!-- 올바른 예 -->
<button type="button" onclick="openModal()">모달 열기</button>
```

**실수 2: 포커스 스타일 제거**
```css
/* 절대 금지 */
* { outline: none; }
:focus { outline: none; }
```

**실수 3: 색상만으로 정보 전달**
```html
<!-- 잘못된 예 -->
<span style="color: green;">성공</span>
<span style="color: red;">실패</span>

<!-- 올바른 예: 텍스트/아이콘도 함께 -->
<span style="color: green;">✅ 성공</span>
<span style="color: red;">❌ 실패</span>
```

---

## 정리

- 시맨틱 HTML 태그를 올바르게 사용
- 모든 이미지에 적절한 `alt` 속성 작성
- 제목 태그(`h1`~`h6`)를 계층 구조에 맞게 사용
- 모든 기능이 키보드로 접근 가능해야 함
- 포커스 스타일 절대 제거 금지
- `aria-label`, `aria-expanded` 등 ARIA 속성으로 보완
- 충분한 색상 대비 유지 (4.5:1 이상)
- 동영상에는 자막 제공
- `<html lang="ko">` 언어 설정 필수
