---
title: "HTML 면접 예상 질문"
order: 11
---

# HTML 면접 예상 질문

HTML 프론트엔드 면접에서 빈출되는 핵심 질문들입니다.

## Q1. 시맨틱 HTML이란 무엇이고 왜 중요한가요?

의미를 가진 태그를 사용해 **문서 구조와 콘텐츠의 의미를 명확히** 표현하는 방식입니다.

```html
<!-- ❌ 비시맨틱 -->
<div class="header">
    <div class="nav">...</div>
</div>
<div class="main">
    <div class="article">...</div>
</div>

<!-- ✅ 시맨틱 -->
<header>
    <nav>...</nav>
</header>
<main>
    <article>...</article>
    <aside>...</aside>
</main>
<footer>...</footer>
```

**중요한 이유:**
- **접근성:** 스크린 리더(화면 읽기 프로그램)가 구조를 이해해 시각 장애인에게 더 나은 탐색 제공
- **SEO (Search Engine Optimization, 검색 엔진 최적화):** 검색 엔진이 콘텐츠 중요도를 파악
- **유지보수:** 개발자가 코드 목적을 즉시 파악
- **기본 스타일:** 브라우저가 의미에 맞는 기본 스타일 적용

---

## Q2. DOCTYPE이란 무엇인가요?

문서 타입 선언으로, **브라우저에게 HTML 버전을 알려줍니다.**

```html
<!DOCTYPE html>  <!-- HTML5 -->
```

DOCTYPE이 없으면 브라우저는 **Quirks Mode (브라우저가 오래된 HTML 표준 이전 방식으로 렌더링하는 하위 호환 모드)**로 렌더링합니다:
- 오래된 IE 호환 방식으로 렌더링
- CSS 박스 모델 계산 등이 표준과 다르게 동작

HTML5의 DOCTYPE은 매우 단순합니다 — 이전 HTML 4.01이나 XHTML처럼 DTD (Document Type Definition, 문서 타입 정의) 참조가 필요 없습니다.

---

## Q3. meta 태그의 주요 종류와 역할은?

```html
<head>
    <!-- 인코딩 -->
    <meta charset="UTF-8">

    <!-- 반응형 뷰포트 -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- SEO -->
    <meta name="description" content="페이지 설명 (160자 이내)">
    <meta name="keywords" content="키워드1, 키워드2">
    <meta name="robots" content="index, follow">

    <!-- Open Graph (SNS 공유 미리보기) -->
    <meta property="og:title" content="제목">
    <meta property="og:description" content="설명">
    <meta property="og:image" content="https://example.com/og.jpg">
    <meta property="og:url" content="https://example.com">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="제목">

    <!-- 캐시 제어 (HTTP 헤더가 더 신뢰성 높음) -->
    <meta http-equiv="Cache-Control" content="no-cache">
</head>
```

Open Graph (오픈 그래프)는 Facebook이 만든 프로토콜로, SNS에서 URL을 공유할 때 제목·설명·이미지 등 미리보기 정보를 제어합니다.

---

## Q4. 접근성(Accessibility, a11y) 구현 방법은?

접근성(Accessibility)은 장애가 있는 사용자를 포함해 모든 사람이 웹을 이용할 수 있도록 하는 설계 원칙입니다. `a11y`는 Accessibility의 축약어입니다.

```html
<!-- 이미지 대체 텍스트 -->
<img src="logo.png" alt="회사 로고">
<img src="decoration.png" alt="">  <!-- 장식용은 빈 alt -->

<!-- 폼 레이블 연결 -->
<label for="email">이메일</label>
<input id="email" type="email" required>

<!-- ARIA 속성 -->
<button aria-label="검색" aria-expanded="false">
    <svg>...</svg>
</button>

<nav aria-label="주요 메뉴">...</nav>

<!-- 포커스 관리 -->
<a href="#main-content" class="skip-link">본문으로 바로가기</a>

<!-- 스크린 리더용 숨김 텍스트 -->
<span class="sr-only">현재 페이지:</span>
```

ARIA (Accessible Rich Internet Applications, 접근 가능한 리치 인터넷 애플리케이션)는 보조 기술이 웹 콘텐츠를 더 잘 이해할 수 있도록 추가 의미를 부여하는 속성 집합입니다.

**WCAG (Web Content Accessibility Guidelines, 웹 콘텐츠 접근성 지침) 2.1 기준:**
- **지각 가능:** 텍스트 대체, 충분한 색상 대비 (4.5:1)
- **운용 가능:** 키보드만으로 모든 기능 사용
- **이해 가능:** 언어 지정, 오류 설명
- **견고함:** 다양한 보조 기술과 호환

---

## Q5. script 태그의 async와 defer 차이는?

```html
<!-- 기본: HTML 파싱 중단 후 스크립트 다운로드+실행 -->
<script src="main.js"></script>

<!-- async: 병렬 다운로드, 다운로드 완료 즉시 실행 (순서 보장 안 됨) -->
<script async src="analytics.js"></script>

<!-- defer: 병렬 다운로드, HTML 파싱 완료 후 순서대로 실행 -->
<script defer src="app.js"></script>
```

```
일반:  [HTML 파싱] ---중단--- [다운로드] [실행] [파싱 재개]
async: [HTML 파싱 ──────────────────────►]
       [다운로드 ──►] [실행]  ← 파싱 중단 가능
defer: [HTML 파싱 ──────────────────────►]
       [다운로드 ──────►]     [실행]  ← 파싱 완료 후
```

**권장:** 대부분의 스크립트에 `defer`, 독립적인 분석 스크립트에 `async`

---

## Q6. 폼(Form)의 주요 속성과 입력 타입은?

```html
<form action="/submit" method="POST" enctype="multipart/form-data">
    <!-- 텍스트 입력 -->
    <input type="text" name="username" required minlength="3">
    <input type="email" name="email" required>
    <input type="password" name="pwd" autocomplete="current-password">
    <input type="number" name="age" min="1" max="120">
    <input type="tel" name="phone" pattern="[0-9]{3}-[0-9]{4}-[0-9]{4}">

    <!-- 날짜 -->
    <input type="date" name="birthday">
    <input type="datetime-local" name="appointment">

    <!-- 선택 -->
    <input type="checkbox" name="agree" value="yes">
    <input type="radio" name="gender" value="male">
    <select name="country">
        <option value="kr">한국</option>
    </select>

    <!-- 파일 (enctype="multipart/form-data" 필수) -->
    <input type="file" name="avatar" accept="image/*">

    <button type="submit">제출</button>
</form>
```

---

## Q7. HTML5에서 추가된 주요 API는?

```javascript
// Geolocation API
navigator.geolocation.getCurrentPosition(
    pos => console.log(pos.coords.latitude, pos.coords.longitude)
);

// Web Storage
localStorage.setItem('token', 'abc123');   // 영구 저장
sessionStorage.setItem('temp', 'data');     // 탭 닫으면 삭제

// History API (SPA 라우팅)
history.pushState({ page: 1 }, '', '/page1');
history.replaceState({}, '', '/new-url');

// Web Worker (백그라운드 스레드)
const worker = new Worker('worker.js');
worker.postMessage({ data: largeArray });

// Intersection Observer (뷰포트 교차 감지)
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) loadImage(entry.target);
    });
});
observer.observe(document.querySelector('.lazy-image'));
```

Geolocation API는 사용자의 현재 위치(위도·경도)를 브라우저에서 직접 가져올 수 있는 API입니다. Web Worker는 메인 스레드와 분리된 백그라운드 스레드에서 스크립트를 실행해 UI가 멈추지 않도록 합니다. SPA (Single Page Application, 단일 페이지 애플리케이션)는 페이지 새로고침 없이 History API로 URL을 변경하며 화면을 갱신하는 방식입니다.

---

## Q8. Canvas와 SVG의 차이는 무엇인가요?

| 비교 | Canvas | SVG |
|-----|--------|-----|
| 방식 | 픽셀 기반 (래스터) | 벡터 기반 |
| DOM | 단일 Canvas 요소 | 각 도형이 DOM 요소 |
| 이벤트 | 좌표로 직접 처리 | 각 요소에 이벤트 리스너 |
| 성능 | 많은 객체에 강함 | 적은 객체, 크기 변경에 강함 |
| 해상도 | 고정 (레티나 대응 필요) | 무제한 확장 |
| 사용 케이스 | 게임, 이미지 편집, 차트 | 아이콘, 일러스트, 지도 |

Canvas는 픽셀 단위로 직접 그리는 비트맵 방식이고, SVG (Scalable Vector Graphics, 확장 가능한 벡터 그래픽)는 수학적 좌표로 도형을 표현해 어떤 크기로 확대해도 선명하게 유지됩니다.

```html
<!-- Canvas: 픽셀 직접 그리기 -->
<canvas id="c" width="400" height="300"></canvas>
<script>
    const ctx = document.getElementById('c').getContext('2d');
    ctx.fillRect(10, 10, 100, 100);
</script>

<!-- SVG: 벡터 도형 -->
<svg width="100" height="100">
    <circle cx="50" cy="50" r="40" fill="blue" />
</svg>
```
