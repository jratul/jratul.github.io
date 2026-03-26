---
title: "링크와 네비게이션"
order: 6
---

## 링크란?

링크(Link)는 **한 페이지에서 다른 페이지로 이동하는 연결고리**입니다.
웹(Web)이라는 이름 자체가 거미줄처럼 링크로 연결된 구조에서 나왔습니다.

링크 없이는 웹이 존재할 수 없습니다.
`<a>` 태그(anchor, 닻)로 만들며, `href` 속성에 이동할 주소를 씁니다.

---

## `<a>` 태그 기본 사용법

```html
<!-- 다른 웹사이트로 이동 -->
<a href="https://www.google.com">구글로 가기</a>

<!-- 같은 사이트의 다른 페이지로 이동 -->
<a href="/about">소개 페이지</a>

<!-- 같은 폴더의 다른 파일로 이동 -->
<a href="contact.html">연락처</a>

<!-- 상위 폴더의 파일로 이동 -->
<a href="../index.html">홈으로</a>
```

---

## href 경로 종류

```html
<!-- 절대 경로: 전체 URL 포함 -->
<a href="https://jratul.github.io/blog">내 블로그</a>

<!-- 루트 상대 경로: 사이트 루트(/)부터 시작 -->
<a href="/posts/2024/hello-world">첫 번째 포스트</a>

<!-- 상대 경로: 현재 파일 위치 기준 -->
<a href="./profile.html">내 프로필</a>  <!-- 같은 폴더 -->
<a href="../index.html">홈</a>          <!-- 상위 폴더 -->

<!-- 앵커 링크: 같은 페이지 내 특정 위치로 이동 -->
<a href="#section-2">섹션 2로 이동</a>

<!-- 다른 페이지의 특정 위치로 이동 -->
<a href="/about#team">팀 소개 섹션</a>
```

---

## `target` 속성 — 링크 열리는 방식

```html
<!-- 현재 탭에서 열림 (기본값) -->
<a href="/page" target="_self">현재 탭에서 열기</a>

<!-- 새 탭에서 열림 -->
<a href="https://github.com" target="_blank">새 탭에서 열기</a>

<!-- 새 탭 열 때는 보안을 위해 rel 추가 -->
<a href="https://github.com" target="_blank" rel="noopener noreferrer">
  안전하게 새 탭 열기
</a>
```

> **보안 주의:** `target="_blank"` 만 쓰면 열린 페이지가
> `window.opener`를 통해 원래 페이지를 조작할 수 있습니다.
> 반드시 `rel="noopener noreferrer"`를 함께 사용하세요.

---

## 특수 링크 — 이메일, 전화, 다운로드

```html
<!-- 이메일 클라이언트 열기 -->
<a href="mailto:contact@example.com">이메일 보내기</a>

<!-- 이메일 + 제목 + 내용 미리 채우기 -->
<a href="mailto:contact@example.com?subject=문의합니다&body=안녕하세요">
  문의 이메일 보내기
</a>

<!-- 전화 걸기 (모바일에서 동작) -->
<a href="tel:+821012345678">010-1234-5678</a>

<!-- 파일 다운로드 -->
<a href="/files/report.pdf" download>보고서 다운로드</a>

<!-- 다운로드 시 파일명 지정 -->
<a href="/files/document-v2.pdf" download="최종보고서.pdf">
  최종 보고서 다운로드
</a>
```

---

## 앵커 링크 — 페이지 내 이동

긴 페이지에서 특정 섹션으로 바로 이동할 때 사용합니다.

```html
<!-- 목차 (위에 위치) -->
<nav>
  <ul>
    <li><a href="#intro">소개</a></li>
    <li><a href="#features">기능</a></li>
    <li><a href="#pricing">요금</a></li>
    <li><a href="#contact">연락처</a></li>
  </ul>
</nav>

<!-- 각 섹션 (아래에 위치) -->
<section id="intro">
  <h2>소개</h2>
  <p>...</p>
</section>

<section id="features">
  <h2>기능</h2>
  <p>...</p>
</section>

<section id="pricing">
  <h2>요금</h2>
  <p>...</p>
</section>

<section id="contact">
  <h2>연락처</h2>
  <p>...</p>
</section>

<!-- 맨 위로 가기 버튼 -->
<a href="#top">맨 위로 ↑</a>
```

---

## 네비게이션 구조 — `<nav>` 태그

`<nav>`는 **사이트 내 주요 이동 링크 모음**을 감싸는 시맨틱 태그입니다.

```html
<!-- 사이트 전체 메뉴 -->
<header>
  <nav aria-label="메인 네비게이션">
    <ul>
      <li><a href="/">홈</a></li>
      <li><a href="/blog">블로그</a></li>
      <li><a href="/portfolio">포트폴리오</a></li>
      <li><a href="/about">소개</a></li>
      <li><a href="/contact">연락처</a></li>
    </ul>
  </nav>
</header>

<!-- 현재 페이지 표시 -->
<nav aria-label="메인 네비게이션">
  <ul>
    <li><a href="/">홈</a></li>
    <li><a href="/blog" aria-current="page">블로그</a></li>  <!-- 현재 페이지 -->
    <li><a href="/about">소개</a></li>
  </ul>
</nav>
```

---

## 브레드크럼(Breadcrumb) 네비게이션

현재 위치를 계층 구조로 보여주는 탐색 경로입니다.
(예: 홈 > 블로그 > React > useEffect)

```html
<nav aria-label="브레드크럼">
  <ol>
    <li><a href="/">홈</a></li>
    <li><a href="/blog">블로그</a></li>
    <li><a href="/blog/react">React</a></li>
    <li aria-current="page">useEffect 완벽 이해</li>  <!-- 현재 페이지 -->
  </ol>
</nav>
```

```css
/* 브레드크럼 스타일 */
nav[aria-label="브레드크럼"] ol {
  list-style: none;
  display: flex;
  gap: 8px;
  padding: 0;
}

nav[aria-label="브레드크럼"] li + li::before {
  content: "›";  /* 구분자 */
  margin-right: 8px;
  color: #666;
}
```

---

## 페이지네이션 — 페이지 이동 버튼

```html
<nav aria-label="페이지 네비게이션">
  <ul>
    <li>
      <a href="/posts?page=1" aria-label="이전 페이지">&laquo; 이전</a>
    </li>
    <li><a href="/posts?page=1">1</a></li>
    <li><a href="/posts?page=2" aria-current="page">2</a></li>  <!-- 현재 페이지 -->
    <li><a href="/posts?page=3">3</a></li>
    <li><a href="/posts?page=4">4</a></li>
    <li>
      <a href="/posts?page=3" aria-label="다음 페이지">다음 &raquo;</a>
    </li>
  </ul>
</nav>
```

---

## 링크 vs 버튼 — 언제 무엇을 쓸까?

```html
<!-- 링크(<a>): 다른 페이지나 위치로 이동할 때 -->
<a href="/checkout">결제 페이지로 이동</a>
<a href="/posts/1">포스트 읽기</a>
<a href="/files/guide.pdf" download>가이드 다운로드</a>

<!-- 버튼(<button>): 액션/기능을 실행할 때 -->
<button onclick="submitForm()">폼 제출</button>
<button onclick="toggleMenu()">메뉴 열기/닫기</button>
<button onclick="deleteItem()">항목 삭제</button>
```

> **잘못된 예:** `<a href="#">` 에 JavaScript 동작을 붙이는 것
> 이동이 아닌 동작은 버튼을 사용하세요.

```html
<!-- 잘못된 예 -->
<a href="#" onclick="openModal()">모달 열기</a>

<!-- 올바른 예 -->
<button type="button" onclick="openModal()">모달 열기</button>
```

---

## 스킵 네비게이션 — 접근성을 위한 패턴

키보드만 사용하는 사용자가 반복되는 내비게이션을 건너뛸 수 있게 해줍니다.

```html
<!-- 페이지 맨 첫 번째 요소로 배치 -->
<a href="#main-content" class="skip-link">
  본문으로 바로 이동
</a>

<header>
  <nav><!-- 많은 메뉴 링크들 --></nav>
</header>

<main id="main-content">
  <!-- 메인 콘텐츠 -->
</main>
```

```css
/* 평소에는 숨기고, 포커스 시에만 표시 */
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  z-index: 9999;
}

.skip-link:focus {
  top: 0;  /* 포커스 시 화면에 나타남 */
}
```

---

## 실전 예제 — 블로그 헤더 네비게이션

```html
<header>
  <a href="/" class="logo">
    <img src="/logo.svg" alt="jratul 블로그 홈으로 이동" width="120" height="40" />
  </a>

  <nav aria-label="메인 메뉴">
    <ul>
      <li><a href="/">홈</a></li>
      <li>
        <a href="/blog">블로그</a>
        <!-- 드롭다운 서브메뉴 -->
        <ul>
          <li><a href="/blog/frontend">프론트엔드</a></li>
          <li><a href="/blog/backend">백엔드</a></li>
          <li><a href="/blog/devops">DevOps</a></li>
        </ul>
      </li>
      <li><a href="/portfolio">포트폴리오</a></li>
      <li><a href="/about">소개</a></li>
    </ul>
  </nav>

  <div class="header-actions">
    <a href="https://github.com/jratul" target="_blank" rel="noopener noreferrer">
      GitHub
    </a>
    <a href="mailto:contact@jratul.dev">연락하기</a>
  </div>
</header>
```

---

## 자주 하는 실수

**실수 1: `target="_blank"` 보안 처리 누락**
```html
<!-- 위험한 예 -->
<a href="https://external.com" target="_blank">외부 사이트</a>

<!-- 안전한 예 -->
<a href="https://external.com" target="_blank" rel="noopener noreferrer">외부 사이트</a>
```

**실수 2: 클릭해도 아무것도 안 되는 링크**
```html
<!-- href="#"는 페이지 맨 위로 스크롤됨 -->
<a href="#">더 보기</a>

<!-- JavaScript 동작이면 button 사용 -->
<button type="button">더 보기</button>

<!-- 실제 페이지가 있으면 href에 주소 넣기 -->
<a href="/posts?page=2">더 보기</a>
```

**실수 3: 링크 텍스트가 불명확**
```html
<!-- 잘못된 예: 스크린 리더가 "여기"가 뭔지 모름 -->
<a href="/docs">여기</a>를 클릭하세요
<a href="/guide">클릭</a>

<!-- 올바른 예: 링크 목적이 명확 -->
<a href="/docs">개발 문서 보기</a>
<a href="/guide">초보자 가이드 읽기</a>
```

---

## 정리

- `<a href="...">`: 기본 링크 태그
- 절대/상대/앵커 경로 구분해서 사용
- `target="_blank"` 사용 시 반드시 `rel="noopener noreferrer"`
- `<nav>`: 주요 네비게이션 영역 표시
- `aria-current="page"`: 현재 페이지 링크 표시 (접근성)
- 이동은 `<a>`, 동작 실행은 `<button>`
- 링크 텍스트는 목적이 명확하게 작성
