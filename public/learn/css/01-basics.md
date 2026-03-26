---
title: "CSS 기본 문법과 적용 방법"
order: 1
---

## CSS란 무엇인가?

HTML이 집의 뼈대(구조)라면, CSS는 인테리어(꾸미기)입니다.

HTML만 있는 페이지는 아무 꾸밈 없는 흰 벽과 같습니다. 글자 크기도 기본값이고, 색상도 없고, 배치도 위에서 아래로 쌓일 뿐입니다. CSS(Cascading Style Sheets)는 이 밋밋한 HTML에 색상, 크기, 여백, 정렬 등 모든 시각적 스타일을 입혀주는 언어입니다.

**CSS가 존재하는 이유**: HTML은 "무엇을 보여줄지(구조)"를 담당하고, CSS는 "어떻게 보여줄지(표현)"를 담당합니다. 이 둘을 분리하면 하나의 HTML에 다양한 스타일을 적용하거나, 스타일을 바꿀 때 HTML을 건드리지 않아도 됩니다.

---

## CSS 기본 문법

CSS는 **선택자(selector)** + **선언 블록(declaration block)** 으로 구성됩니다.

```css
/* 선택자 { 속성: 값; } */
h1 {
  color: red;       /* 글자 색상을 빨간색으로 */
  font-size: 32px;  /* 글자 크기를 32px로 */
}
```

구조를 자세히 보면:

```
h1          → 선택자: "어떤 요소에 적용할지"
{           → 선언 블록 시작
  color: red;       → 속성(color) + 값(red) = 선언(declaration)
  font-size: 32px;  → 속성(font-size) + 값(32px) = 선언(declaration)
}           → 선언 블록 끝
```

**주의**: 각 선언은 반드시 세미콜론(`;`)으로 끝내야 합니다. 빠트리면 다음 속성까지 무시될 수 있습니다.

---

## CSS를 HTML에 적용하는 3가지 방법

### 방법 1: 인라인 스타일 (Inline Style)

HTML 태그의 `style` 속성에 직접 작성합니다.

```html
<!-- style 속성에 직접 CSS 작성 -->
<h1 style="color: blue; font-size: 24px;">안녕하세요</h1>
<p style="color: gray; margin: 10px;">본문 내용입니다.</p>
```

- **장점**: 해당 요소에만 즉시 적용, 빠른 테스트에 유용
- **단점**: 재사용 불가, 유지보수 어려움, HTML이 지저분해짐
- **언제 쓰나**: 급하게 테스트할 때나 JavaScript로 동적으로 스타일 변경할 때

---

### 방법 2: 내부 스타일시트 (Internal Stylesheet)

HTML 파일의 `<head>` 안에 `<style>` 태그로 작성합니다.

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* 이 파일 내의 모든 h1에 적용 */
    h1 {
      color: blue;
      font-size: 24px;
    }

    /* 이 파일 내의 모든 p에 적용 */
    p {
      color: gray;
      line-height: 1.6; /* 줄 간격을 1.6배로 */
    }
  </style>
</head>
<body>
  <h1>제목</h1>
  <p>본문</p>
</body>
</html>
```

- **장점**: 한 파일에서 관리 가능, 인라인보다 재사용성 좋음
- **단점**: 다른 HTML 파일에서는 재사용 불가
- **언제 쓰나**: 단일 페이지 프로젝트나 빠른 프로토타입

---

### 방법 3: 외부 스타일시트 (External Stylesheet) ← 실무에서 가장 많이 사용

별도의 `.css` 파일을 만들고 HTML에서 `<link>` 태그로 연결합니다.

```
프로젝트 폴더/
├── index.html
└── style.css    ← 별도 CSS 파일
```

```css
/* style.css */
h1 {
  color: blue;        /* 제목 색상 */
  font-size: 24px;    /* 제목 크기 */
}

p {
  color: gray;        /* 본문 색상 */
  line-height: 1.6;   /* 줄 간격 */
}
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <!-- rel="stylesheet": CSS 파일임을 명시 -->
  <!-- href: CSS 파일 경로 -->
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>제목</h1>
  <p>본문</p>
</body>
</html>
```

- **장점**: 여러 HTML 파일에서 같은 CSS 공유, 캐싱으로 빠른 로딩, 유지보수 용이
- **단점**: 파일이 분리되어 관리할 파일이 늘어남
- **언제 쓰나**: 실제 프로젝트에서는 거의 항상 이 방식

---

## CSS 주석

CSS에서 설명을 남기려면 `/* */` 를 사용합니다.

```css
/* 이것은 주석입니다 - 브라우저가 무시함 */
h1 {
  color: blue; /* 제목을 파란색으로 */
  /* font-size: 32px; */ /* 이 줄은 적용 안 됨 */
}
```

---

## CSS 적용 우선순위 (중요도)

같은 요소에 여러 스타일이 겹칠 때, 어떤 스타일이 이길까요?

```css
/* style.css - 외부 스타일 */
h1 {
  color: blue;
}
```

```html
<head>
  <link rel="stylesheet" href="style.css">
  <style>
    h1 { color: green; }  /* 내부 스타일 */
  </style>
</head>
<body>
  <!-- 최종적으로 어떤 색이 될까요? -->
  <h1 style="color: red;">제목</h1>  <!-- 인라인 스타일 -->
</body>
```

**답: 빨간색 (red)** — 인라인 스타일이 가장 강력합니다.

우선순위 (높음 → 낮음):
1. 인라인 스타일 (`style="..."`)
2. 내부 스타일시트 (`<style>` 태그)
3. 외부 스타일시트 (`<link>`)
4. 브라우저 기본 스타일

> **참고**: 같은 레벨이라면 나중에 선언된 것이 이깁니다. 이것이 "Cascading(폭포처럼 흘러내림)"의 의미입니다.

---

## 자주 쓰는 기본 속성 맛보기

```css
p {
  /* 텍스트 관련 */
  color: #333333;           /* 글자 색상 (16진수) */
  font-size: 16px;          /* 글자 크기 */
  font-weight: bold;        /* 글자 굵기 */
  text-align: center;       /* 텍스트 정렬 */
  line-height: 1.6;         /* 줄 간격 */

  /* 여백 관련 */
  margin: 20px;             /* 바깥 여백 */
  padding: 10px;            /* 안쪽 여백 */

  /* 배경 관련 */
  background-color: #f5f5f5; /* 배경 색상 */

  /* 테두리 관련 */
  border: 1px solid #ccc;   /* 테두리: 두께 스타일 색상 */
  border-radius: 8px;       /* 모서리 둥글게 */

  /* 크기 관련 */
  width: 300px;             /* 너비 */
  height: 100px;            /* 높이 */
}
```

---

## 색상 표현 방법

CSS에서 색상을 표현하는 방법은 여러 가지입니다.

```css
div {
  /* 1. 키워드: 영어 색상 이름 */
  color: red;
  color: blue;
  color: transparent;    /* 투명 */

  /* 2. 16진수 (Hex): #RRGGBB */
  color: #ff0000;        /* 빨강 */
  color: #0000ff;        /* 파랑 */
  color: #333333;        /* 짙은 회색 */
  color: #333;           /* 축약형 (#333333과 동일) */

  /* 3. RGB: rgb(빨강, 초록, 파랑) - 각 0~255 */
  color: rgb(255, 0, 0);    /* 빨강 */
  color: rgb(51, 51, 51);   /* 짙은 회색 */

  /* 4. RGBA: rgb + 투명도(0~1) */
  color: rgba(0, 0, 0, 0.5);   /* 반투명 검정 */
  color: rgba(255, 0, 0, 0.8); /* 80% 불투명 빨강 */
}
```

---

## 단위 (Units)

CSS에서 크기를 나타내는 단위도 여러 가지입니다.

```css
.box {
  /* 절대 단위 - 항상 고정된 크기 */
  width: 200px;    /* 픽셀 - 가장 많이 사용 */
  font-size: 12pt; /* 포인트 - 주로 인쇄용 */

  /* 상대 단위 - 기준에 따라 크기가 달라짐 */
  font-size: 1rem;   /* 루트(html) 요소의 font-size 기준 */
  font-size: 1.2em;  /* 부모 요소의 font-size 기준 */
  width: 50%;        /* 부모 요소의 너비 기준 */
  height: 100vh;     /* 뷰포트(화면) 높이의 100% */
  width: 100vw;      /* 뷰포트(화면) 너비의 100% */
}
```

실무에서 가장 많이 쓰는 단위:
- **px**: 고정 크기가 필요할 때 (border, 작은 여백 등)
- **rem**: 폰트 크기, 여백 등 (접근성 좋음)
- **%**: 부모 기준 비율
- **vh/vw**: 화면 전체 기준

---

## 흔한 실수

**실수 1: 세미콜론 빠트리기**

```css
/* 틀림 - 세미콜론 없음 */
h1 {
  color: red    /* ← 세미콜론 없음! */
  font-size: 24px; /* 이 줄도 무시될 수 있음 */
}

/* 올바름 */
h1 {
  color: red;      /* ← 세미콜론 있음 */
  font-size: 24px;
}
```

**실수 2: link 태그 위치**

```html
<!-- 틀림 - body 안에 link 태그 -->
<body>
  <link rel="stylesheet" href="style.css">  <!-- 비정상 동작 가능 -->
  <h1>제목</h1>
</body>

<!-- 올바름 - head 안에 link 태그 -->
<head>
  <link rel="stylesheet" href="style.css">
</head>
```

**실수 3: 파일 경로 오류**

```html
<!-- CSS 파일이 같은 폴더에 있을 때 -->
<link rel="stylesheet" href="style.css">       <!-- 올바름 -->
<link rel="stylesheet" href="./style.css">     <!-- 올바름 -->
<link rel="stylesheet" href="/style.css">      /* 루트 기준 - 상황에 따라 다름 */
<link rel="stylesheet" href="styles/style.css"> /* css 파일이 styles 폴더 안에 있을 때 */
```

---

## 브라우저 개발자 도구 활용

CSS를 배울 때 가장 중요한 도구는 브라우저의 개발자 도구입니다.

1. 페이지에서 **F12** 또는 **마우스 우클릭 → 검사** 클릭
2. "Elements" 탭에서 HTML 구조 확인
3. 오른쪽 "Styles" 패널에서 적용된 CSS 확인
4. 값을 클릭해서 실시간으로 수정 가능 (새로고침하면 원래대로 돌아옴)

개발자 도구는 CSS 디버깅의 필수 도구입니다. 익숙해지면 작업 속도가 크게 올라갑니다.

---

## 정리

| 방법 | 위치 | 재사용성 | 추천 상황 |
|------|------|----------|-----------|
| 인라인 | HTML 태그 내 | 없음 | 테스트, 동적 변경 |
| 내부 스타일시트 | `<head>` 내 `<style>` | 같은 파일만 | 단일 페이지 |
| 외부 스타일시트 | 별도 `.css` 파일 | 여러 파일 공유 | 실무 (권장) |

CSS의 핵심은 **선택자**로 요소를 고르고, **속성:값**으로 스타일을 지정하는 것입니다. 다음 챕터에서는 선택자를 더 깊이 알아봅니다.
