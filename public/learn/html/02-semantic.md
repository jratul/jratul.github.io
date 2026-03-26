---
title: "시맨틱 태그"
order: 2
---

## 시맨틱 태그란?

**시맨틱(Semantic)**은 "의미 있는"이라는 뜻입니다.

시맨틱 태그는 태그 이름 자체가 그 내용의 **역할과 의미**를 설명하는 태그입니다.

예를 들어 아파트를 생각해보세요. 방에 이름표가 없다면 어느 방이 침실이고 어느 방이 주방인지 알 수 없습니다. 하지만 각 방에 "침실", "주방", "거실"이라는 이름표를 붙이면, 사람도 알고 집을 설계한 건축가도 알 수 있죠.

시맨틱 태그가 바로 이 이름표 역할을 합니다.

---

## 왜 시맨틱 태그가 필요한가?

### 시맨틱 태그 없이 만든 페이지

```html
<!-- 의미 없는 div로만 구성된 페이지 -->
<div>
  <div>내 블로그</div>          <!-- 이게 로고인지 메뉴인지 모름 -->
  <div>
    <div>홈</div>
    <div>소개</div>
    <div>글목록</div>
  </div>
</div>

<div>
  <div>
    <div>HTML 기초 배우기</div>    <!-- 이게 제목인지 내용인지 모름 -->
    <div>2024-01-01</div>
    <div>HTML은 웹의 뼈대입니다...</div>
  </div>
</div>

<div>
  <div>© 2024 내 블로그</div>
</div>
```

이 코드는 화면에는 그럴듯하게 보일 수 있지만:
- 검색엔진이 어느 부분이 중요한 내용인지 파악하기 어렵습니다
- 스크린 리더(시각 장애인용 프로그램)가 내용을 제대로 읽지 못합니다
- 코드를 처음 보는 개발자가 구조를 이해하기 힘듭니다

### 시맨틱 태그로 만든 페이지

```html
<!-- 의미 있는 시맨틱 태그로 구성된 페이지 -->
<header>
  <!-- header: 페이지나 섹션의 머리말 -->
  <h1>내 블로그</h1>
  <nav>
    <!-- nav: 내비게이션(메뉴) 영역 -->
    <a href="/">홈</a>
    <a href="/about">소개</a>
    <a href="/posts">글목록</a>
  </nav>
</header>

<main>
  <!-- main: 페이지의 핵심 콘텐츠 -->
  <article>
    <!-- article: 독립적인 글/콘텐츠 하나 -->
    <h2>HTML 기초 배우기</h2>
    <time datetime="2024-01-01">2024년 1월 1일</time>
    <p>HTML은 웹의 뼈대입니다...</p>
  </article>
</main>

<footer>
  <!-- footer: 페이지나 섹션의 바닥글 -->
  <p>© 2024 내 블로그</p>
</footer>
```

훨씬 읽기 쉽고, 검색엔진과 스크린 리더도 내용을 잘 이해합니다.

---

## 주요 시맨틱 태그 소개

### `<header>` — 머리말

페이지 또는 섹션의 상단 부분입니다. 보통 로고, 사이트 제목, 내비게이션 메뉴를 포함합니다.

```html
<header>
  <!-- 사이트 전체의 헤더 -->
  <h1>나의 포트폴리오</h1>  <!-- 사이트 이름 -->
  <nav>
    <a href="/">홈</a>
    <a href="/projects">프로젝트</a>
    <a href="/contact">연락처</a>
  </nav>
</header>
```

**주의**: `<head>`와 `<header>`는 다릅니다!
- `<head>`: HTML 문서의 메타 정보 (화면에 안 보임)
- `<header>`: 화면 상단에 보이는 머리말 영역

### `<nav>` — 내비게이션

링크 모음으로 구성된 내비게이션 메뉴입니다.

```html
<!-- 메인 메뉴 -->
<nav>
  <ul>
    <!-- 목록 형태의 메뉴 (의미적으로 더 좋음) -->
    <li><a href="/">홈</a></li>
    <li><a href="/blog">블로그</a></li>
    <li><a href="/about">소개</a></li>
  </ul>
</nav>

<!-- 페이지네이션도 nav -->
<nav aria-label="페이지 이동">
  <!-- aria-label: 같은 페이지에 nav가 여러 개일 때 구분하기 위해 사용 -->
  <a href="/page/1">이전</a>
  <a href="/page/3">다음</a>
</nav>
```

### `<main>` — 주요 콘텐츠

페이지의 핵심 내용이 담기는 영역입니다. **한 페이지에 하나만** 사용합니다.

```html
<body>
  <header>헤더</header>

  <main>
    <!-- 이 페이지의 핵심 내용만 여기에 -->
    <h2>오늘의 추천 기사</h2>
    <article>...</article>
    <article>...</article>
  </main>

  <footer>푸터</footer>
</body>
```

### `<article>` — 독립적인 콘텐츠

신문 기사, 블로그 포스트, 댓글, 위젯처럼 **그 자체로 완결된** 콘텐츠입니다. article을 잘라내서 다른 곳에 붙여놔도 의미가 통해야 합니다.

```html
<article>
  <!-- 블로그 포스트 하나 -->
  <h2>Vue.js vs React 비교</h2>
  <p>작성일: <time datetime="2024-03-15">2024년 3월 15일</time></p>
  <p>두 프레임워크를 비교해보겠습니다...</p>

  <section>
    <!-- article 안에 section을 써서 내용을 나눌 수 있음 -->
    <h3>성능 비교</h3>
    <p>...</p>
  </section>

  <section>
    <h3>생태계 비교</h3>
    <p>...</p>
  </section>
</article>
```

### `<section>` — 주제별 구역

내용을 **주제별로 묶는** 구역입니다. article과 달리 독립적으로 사용하기보다는 페이지 구조를 나누는 데 씁니다.

```html
<main>
  <section>
    <!-- 뉴스 섹션 -->
    <h2>최신 뉴스</h2>
    <article>...</article>
    <article>...</article>
  </section>

  <section>
    <!-- 인기 게시물 섹션 -->
    <h2>인기 게시물</h2>
    <article>...</article>
    <article>...</article>
  </section>
</main>
```

### `<aside>` — 부가 정보

메인 콘텐츠와 **간접적으로 관련된** 부가 정보입니다. 사이드바, 관련 링크, 광고 등에 사용합니다.

```html
<div style="display: flex;">

  <main>
    <!-- 메인 기사 -->
    <article>
      <h2>인공지능의 미래</h2>
      <p>AI 기술이 빠르게 발전하고 있습니다...</p>
    </article>
  </main>

  <aside>
    <!-- 사이드바: 메인 내용과 관련 있지만 부가적인 정보 -->
    <h3>관련 기사</h3>
    <ul>
      <li><a href="#">머신러닝 입문</a></li>
      <li><a href="#">딥러닝이란?</a></li>
    </ul>

    <h3>인기 태그</h3>
    <p>#AI #머신러닝 #딥러닝</p>
  </aside>

</div>
```

### `<footer>` — 바닥글

페이지 또는 섹션의 하단 정보입니다. 저작권, 연락처, 관련 링크 등을 포함합니다.

```html
<footer>
  <!-- 사이트 전체 푸터 -->
  <div>
    <h3>회사 정보</h3>
    <p>주소: 서울시 강남구 테헤란로 123</p>
    <p>이메일: info@example.com</p>
  </div>

  <div>
    <h3>빠른 링크</h3>
    <nav>
      <a href="/privacy">개인정보처리방침</a>
      <a href="/terms">이용약관</a>
    </nav>
  </div>

  <p>© 2024 내 회사. All rights reserved.</p>
</footer>
```

---

## article vs section — 헷갈리는 차이점

| | `<article>` | `<section>` |
|--|--|--|
| 의미 | 독립적인 완결된 콘텐츠 | 주제별 구역 나누기 |
| 질문 | "이걸 RSS로 배포해도 말이 되나?" | "이 구역에 제목이 있나?" |
| 예시 | 블로그 글, 댓글, 뉴스 기사 | 뉴스 목록 섹션, 기능 소개 섹션 |

판단하는 쉬운 방법:
- 이 콘텐츠를 잘라내서 다른 사이트에 붙여도 의미가 통하면 → `<article>`
- 페이지 안에서 내용을 나누는 용도라면 → `<section>`
- 그냥 스타일이나 레이아웃 용도라면 → `<div>`

---

## `<div>` vs 시맨틱 태그

`<div>`는 의미 없는 컨테이너입니다. 순수하게 CSS 스타일링이나 레이아웃을 위해 내용을 묶을 때 씁니다.

```html
<!-- 이렇게 하면 안 됨: 모든 곳에 div 사용 -->
<div class="header">...</div>
<div class="nav">...</div>
<div class="main">...</div>
<div class="footer">...</div>

<!-- 이렇게 해야 함: 적절한 시맨틱 태그 사용 -->
<header>...</header>
<nav>...</nav>
<main>...</main>
<footer>...</footer>
```

다만 의미 없이 레이아웃만을 위해 감쌀 때는 `<div>` 사용이 맞습니다:

```html
<header>
  <div class="header-inner">
    <!-- 내용을 가운데 정렬하기 위한 레이아웃용 div -->
    <h1>사이트 이름</h1>
    <nav>...</nav>
  </div>
</header>
```

---

## 기타 유용한 시맨틱 태그들

### `<figure>` & `<figcaption>` — 그림과 설명

```html
<figure>
  <!-- figure: 본문과 관련된 독립적인 콘텐츠 (이미지, 코드, 다이어그램 등) -->
  <img src="chart.png" alt="월별 판매 통계 차트">
  <figcaption>
    <!-- figcaption: figure의 설명 -->
    그림 1. 2024년 1분기 월별 판매 통계
  </figcaption>
</figure>
```

### `<time>` — 날짜와 시간

```html
<p>
  이 글은
  <time datetime="2024-03-15T09:00:00">
    <!-- datetime: 기계가 읽는 형식 (ISO 8601) -->
    2024년 3월 15일 오전 9시
    <!-- 사람이 읽는 형식은 자유롭게 -->
  </time>
  에 작성되었습니다.
</p>

<time datetime="2024-12-25">크리스마스</time>
```

### `<address>` — 연락처 정보

```html
<address>
  <!-- 연락처, 주소 정보 -->
  <p>작성자: <a href="mailto:kim@example.com">김개발</a></p>
  <p>서울시 강남구</p>
</address>
```

### `<mark>` — 하이라이트

```html
<p>
  검색 결과에서 <mark>HTML</mark>이라는 단어를 찾았습니다.
  <!-- mark: 관련성 있는 내용 하이라이트 (형광펜 효과) -->
</p>
```

### `<details>` & `<summary>` — 접기/펼치기

```html
<details>
  <!-- details: 클릭하면 펼쳐지는 영역 (JavaScript 없이도 동작!) -->
  <summary>자세히 보기</summary>
  <!-- summary: 항상 보이는 제목 부분 -->

  <p>이 내용은 평소에는 숨겨져 있다가 클릭하면 보입니다.</p>
  <p>FAQ나 설명이 긴 내용에 유용합니다.</p>
</details>
```

---

## 실제 웹 페이지 구조 예시

아래는 일반적인 블로그 페이지의 구조입니다:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>내 블로그 - HTML 시맨틱 태그</title>
</head>
<body>

  <!-- 1. 사이트 전체 헤더 -->
  <header>
    <h1><a href="/">내 블로그</a></h1>
    <nav>
      <!-- 메인 메뉴 -->
      <ul>
        <li><a href="/">홈</a></li>
        <li><a href="/category/html">HTML</a></li>
        <li><a href="/category/css">CSS</a></li>
        <li><a href="/about">소개</a></li>
      </ul>
    </nav>
  </header>

  <!-- 2. 페이지 핵심 콘텐츠 -->
  <main>

    <!-- 2-1. 메인 기사 -->
    <article>
      <header>
        <!-- article 안에도 header를 쓸 수 있음 -->
        <h2>HTML 시맨틱 태그 완전 정복</h2>
        <p>
          작성일: <time datetime="2024-03-15">2024년 3월 15일</time>
          | 카테고리: <a href="/category/html">HTML</a>
        </p>
      </header>

      <section>
        <h3>시맨틱 태그란?</h3>
        <p>의미 있는 태그를 사용하면...</p>
      </section>

      <section>
        <h3>주요 시맨틱 태그</h3>
        <p>header, main, article, section...</p>
      </section>

      <figure>
        <img src="semantic-structure.png" alt="시맨틱 태그 구조도">
        <figcaption>그림 1. HTML5 시맨틱 태그 구조</figcaption>
      </figure>

      <footer>
        <!-- article 안의 footer: 글의 메타 정보 -->
        <p>태그: <a href="/tag/html">#HTML</a> <a href="/tag/semantic">#시맨틱</a></p>
      </footer>
    </article>

    <!-- 2-2. 댓글 섹션 -->
    <section>
      <h3>댓글 (3개)</h3>

      <article>
        <!-- 댓글 하나하나도 article -->
        <header>
          <strong>홍길동</strong>
          <time datetime="2024-03-16">2024년 3월 16일</time>
        </header>
        <p>좋은 글 감사합니다!</p>
      </article>

      <article>
        <header>
          <strong>김철수</strong>
          <time datetime="2024-03-17">2024년 3월 17일</time>
        </header>
        <p>시맨틱 태그 덕분에 많이 배웠어요.</p>
      </article>
    </section>

  </main>

  <!-- 3. 사이드바 -->
  <aside>
    <section>
      <h3>최근 글</h3>
      <ul>
        <li><a href="#">CSS Flexbox 이해하기</a></li>
        <li><a href="#">JavaScript 기초</a></li>
      </ul>
    </section>

    <section>
      <h3>태그 모음</h3>
      <a href="/tag/html">#HTML</a>
      <a href="/tag/css">#CSS</a>
      <a href="/tag/js">#JavaScript</a>
    </section>
  </aside>

  <!-- 4. 사이트 전체 푸터 -->
  <footer>
    <nav>
      <a href="/privacy">개인정보처리방침</a>
      <a href="/terms">이용약관</a>
    </nav>
    <p>© 2024 내 블로그. All rights reserved.</p>
    <address>
      문의: <a href="mailto:blog@example.com">blog@example.com</a>
    </address>
  </footer>

</body>
</html>
```

---

## 시맨틱 태그 사용의 장점 정리

1. **검색엔진 최적화(SEO)**: 구글, 네이버 등 검색엔진이 페이지 내용을 더 잘 이해해서 검색 순위가 올라갑니다.

2. **접근성(Accessibility)**: 시각 장애인이 사용하는 스크린 리더가 페이지 구조를 파악해서 올바르게 읽어줍니다.

3. **코드 가독성**: 다른 개발자(또는 나중의 나)가 코드를 봤을 때 구조를 바로 이해할 수 있습니다.

4. **유지보수**: 의미 있는 구조는 나중에 수정하기 쉽습니다.

---

## 정리: 어떤 태그를 언제 쓸까?

| 상황 | 사용할 태그 |
|------|-------------|
| 사이트 상단 로고/메뉴 영역 | `<header>` |
| 링크 모음 메뉴 | `<nav>` |
| 페이지의 핵심 내용 | `<main>` |
| 블로그 글, 뉴스 기사 하나 | `<article>` |
| 내용을 주제별로 나눌 때 | `<section>` |
| 사이드바, 부가 정보 | `<aside>` |
| 저작권, 연락처 등 하단 정보 | `<footer>` |
| 이미지/다이어그램과 설명 | `<figure>` + `<figcaption>` |
| 날짜/시간 표시 | `<time>` |
| 단순 레이아웃 용도 | `<div>` |
