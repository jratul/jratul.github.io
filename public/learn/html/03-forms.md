---
title: "폼과 입력 요소"
order: 3
---

## 폼이란?

폼(Form)은 사용자로부터 **정보를 입력받는 영역**입니다.

회원가입 페이지에서 이름, 이메일, 비밀번호를 입력하는 부분이 바로 폼입니다.
로그인 창, 검색창, 댓글 입력란 — 이 모든 것이 HTML 폼으로 만들어집니다.

폼이 없으면 웹사이트는 사용자와 소통할 수 없습니다.
폼은 **사용자 → 서버**로 데이터를 전송하는 통로 역할을 합니다.

---

## `<form>` 태그 기본 구조

```html
<form action="/submit" method="post">
  <!-- 여기에 입력 요소들이 들어갑니다 -->
  <input type="text" name="username" />
  <button type="submit">제출</button>
</form>
```

### 주요 속성

| 속성 | 설명 | 예시 |
|------|------|------|
| `action` | 데이터를 보낼 서버 주소 | `action="/login"` |
| `method` | 전송 방식 (GET 또는 POST) | `method="post"` |
| `enctype` | 파일 업로드 시 필요 | `enctype="multipart/form-data"` |

**GET vs POST 차이:**
- `GET`: 데이터가 URL에 붙어서 전송됨 (`?name=홍길동&age=20`) → 검색에 주로 사용
- `POST`: 데이터가 숨겨져서 전송됨 → 로그인, 회원가입에 사용

---

## `<input>` 태그 — 가장 많이 쓰는 입력 요소

`<input>`은 단독 태그(닫는 태그 없음)로, `type` 속성에 따라 완전히 다른 모양이 됩니다.

```html
<!-- 텍스트 입력 -->
<input type="text" placeholder="이름을 입력하세요" />

<!-- 비밀번호 (입력값이 ●●●로 표시됨) -->
<input type="password" placeholder="비밀번호" />

<!-- 이메일 (형식 자동 검사) -->
<input type="email" placeholder="example@email.com" />

<!-- 숫자만 입력 -->
<input type="number" min="1" max="100" />

<!-- 날짜 선택 -->
<input type="date" />

<!-- 체크박스 (여러 개 선택 가능) -->
<input type="checkbox" name="hobby" value="coding" /> 코딩
<input type="checkbox" name="hobby" value="reading" /> 독서

<!-- 라디오 버튼 (하나만 선택) -->
<input type="radio" name="gender" value="male" /> 남성
<input type="radio" name="gender" value="female" /> 여성

<!-- 파일 선택 -->
<input type="file" accept="image/*" />

<!-- 숨겨진 값 (화면에 안 보임) -->
<input type="hidden" name="userId" value="12345" />

<!-- 색상 선택 -->
<input type="color" value="#6366f1" />

<!-- 범위 슬라이더 -->
<input type="range" min="0" max="100" step="10" />

<!-- 검색창 -->
<input type="search" placeholder="검색어를 입력하세요" />
```

---

## `<input>` 공통 속성

```html
<input
  type="text"
  name="username"        <!-- 서버로 전송될 때 사용되는 이름 -->
  id="username"          <!-- label과 연결하기 위한 고유 ID -->
  value="기본값"         <!-- 미리 채워질 값 -->
  placeholder="힌트"    <!-- 빈 칸일 때 보이는 안내 문구 -->
  required               <!-- 필수 입력 항목 -->
  disabled               <!-- 비활성화 (클릭/입력 불가) -->
  readonly               <!-- 읽기 전용 (값 변경 불가) -->
  maxlength="50"         <!-- 최대 입력 글자 수 -->
  minlength="2"          <!-- 최소 입력 글자 수 -->
  autofocus              <!-- 페이지 열리자마자 자동 포커스 -->
/>
```

---

## `<label>` 태그 — 반드시 함께 써야 합니다

`<label>`은 입력 요소에 **설명을 붙여주는** 태그입니다.
label을 클릭하면 연결된 input으로 포커스가 이동합니다.

```html
<!-- 방법 1: for와 id로 연결 -->
<label for="email">이메일</label>
<input type="email" id="email" name="email" />

<!-- 방법 2: label 안에 input 넣기 -->
<label>
  이메일
  <input type="email" name="email" />
</label>
```

> 초보자 실수: `label`을 생략하면 접근성이 떨어지고,
> 시각 장애인이 사용하는 스크린 리더가 폼을 이해하지 못합니다.

---

## `<textarea>` — 여러 줄 텍스트 입력

```html
<!-- rows: 줄 수, cols: 열 수 -->
<label for="message">메시지</label>
<textarea
  id="message"
  name="message"
  rows="5"
  cols="40"
  placeholder="내용을 입력하세요..."
></textarea>
```

`<input type="text">`는 한 줄만 입력되지만,
`<textarea>`는 여러 줄 입력이 가능합니다.

---

## `<select>` — 드롭다운 선택

```html
<label for="city">도시 선택</label>
<select id="city" name="city">
  <option value="">-- 선택하세요 --</option>  <!-- 기본 안내 옵션 -->
  <option value="seoul">서울</option>
  <option value="busan">부산</option>
  <option value="incheon" selected>인천</option>  <!-- 기본 선택값 -->
</select>

<!-- 그룹으로 묶기 -->
<select name="food">
  <optgroup label="한식">
    <option value="bibimbap">비빔밥</option>
    <option value="kimchi">김치찌개</option>
  </optgroup>
  <optgroup label="양식">
    <option value="pasta">파스타</option>
    <option value="pizza">피자</option>
  </optgroup>
</select>

<!-- 다중 선택 (Ctrl/Cmd 누르고 클릭) -->
<select name="skills" multiple size="4">
  <option value="html">HTML</option>
  <option value="css">CSS</option>
  <option value="js">JavaScript</option>
  <option value="react">React</option>
</select>
```

---

## `<button>` 태그

```html
<!-- 폼 제출 버튼 (form 안에서 기본 동작) -->
<button type="submit">제출하기</button>

<!-- 폼 초기화 버튼 -->
<button type="reset">초기화</button>

<!-- 일반 버튼 (JavaScript로 동작 지정) -->
<button type="button" onclick="doSomething()">클릭</button>
```

> 초보자 실수: `type="button"`을 생략하면 form 안에서
> 버튼 클릭 시 폼이 제출(submit)되어 버립니다!

---

## `<fieldset>`과 `<legend>` — 폼 그룹화

관련된 입력 요소들을 하나의 그룹으로 묶을 때 사용합니다.

```html
<form>
  <fieldset>
    <legend>개인 정보</legend>  <!-- 그룹 제목 -->
    <label for="name">이름</label>
    <input type="text" id="name" name="name" />

    <label for="birth">생년월일</label>
    <input type="date" id="birth" name="birth" />
  </fieldset>

  <fieldset>
    <legend>계정 정보</legend>
    <label for="email">이메일</label>
    <input type="email" id="email" name="email" />

    <label for="pw">비밀번호</label>
    <input type="password" id="pw" name="password" />
  </fieldset>

  <button type="submit">가입하기</button>
</form>
```

---

## 실전 예제 — 회원가입 폼

```html
<form action="/register" method="post">

  <!-- 이름 -->
  <div>
    <label for="name">이름 *</label>
    <input
      type="text"
      id="name"
      name="name"
      placeholder="홍길동"
      required
      maxlength="20"
    />
  </div>

  <!-- 이메일 -->
  <div>
    <label for="email">이메일 *</label>
    <input
      type="email"
      id="email"
      name="email"
      placeholder="example@email.com"
      required
    />
  </div>

  <!-- 비밀번호 -->
  <div>
    <label for="password">비밀번호 *</label>
    <input
      type="password"
      id="password"
      name="password"
      minlength="8"
      required
    />
  </div>

  <!-- 성별 (라디오) -->
  <div>
    <span>성별</span>
    <label>
      <input type="radio" name="gender" value="male" /> 남성
    </label>
    <label>
      <input type="radio" name="gender" value="female" /> 여성
    </label>
  </div>

  <!-- 관심사 (체크박스) -->
  <div>
    <span>관심사</span>
    <label><input type="checkbox" name="interest" value="frontend" /> 프론트엔드</label>
    <label><input type="checkbox" name="interest" value="backend" /> 백엔드</label>
    <label><input type="checkbox" name="interest" value="design" /> 디자인</label>
  </div>

  <!-- 자기소개 -->
  <div>
    <label for="bio">자기소개</label>
    <textarea id="bio" name="bio" rows="4" placeholder="간단한 자기소개를 입력해주세요"></textarea>
  </div>

  <!-- 약관 동의 -->
  <div>
    <label>
      <input type="checkbox" name="agree" required />
      이용약관에 동의합니다 *
    </label>
  </div>

  <button type="submit">회원가입</button>
  <button type="reset">초기화</button>

</form>
```

---

## HTML5 기본 유효성 검사

별도의 JavaScript 없이도 HTML만으로 기본적인 입력 검증이 가능합니다.

```html
<!-- required: 비어있으면 제출 불가 -->
<input type="text" required />

<!-- type="email": 이메일 형식 아니면 제출 불가 -->
<input type="email" required />

<!-- min/max: 숫자 범위 제한 -->
<input type="number" min="18" max="99" />

<!-- pattern: 정규식으로 형식 지정 -->
<input type="text" pattern="[0-9]{4}" title="4자리 숫자를 입력하세요" />

<!-- minlength/maxlength: 글자 수 제한 -->
<input type="password" minlength="8" maxlength="20" />
```

---

## 자주 하는 실수 모음

**실수 1: name 속성 빠뜨리기**
```html
<!-- 잘못된 예: name이 없으면 서버로 데이터가 전송되지 않음 -->
<input type="text" id="username" />

<!-- 올바른 예 -->
<input type="text" id="username" name="username" />
```

**실수 2: label 없이 placeholder만 사용**
```html
<!-- 접근성이 떨어지는 예 -->
<input type="text" placeholder="이름" />

<!-- 올바른 예 -->
<label for="name">이름</label>
<input type="text" id="name" name="name" placeholder="홍길동" />
```

**실수 3: 버튼 type 미지정**
```html
<!-- form 안에서 이 버튼을 누르면 폼이 제출됨! -->
<button>취소</button>

<!-- type="button"으로 명시 -->
<button type="button">취소</button>
```

---

## 정리

- `<form>`: 데이터를 감싸는 컨테이너, `action`과 `method` 설정
- `<input>`: `type`에 따라 다양한 입력 방식 제공
- `<label>`: 입력 요소 설명, `for`-`id`로 연결
- `<textarea>`: 여러 줄 텍스트 입력
- `<select>` + `<option>`: 드롭다운 선택
- `<button>`: 제출/초기화/일반 버튼, `type` 명시 필수
- `<fieldset>` + `<legend>`: 관련 요소 그룹화
