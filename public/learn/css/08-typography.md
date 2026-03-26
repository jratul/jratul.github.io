---
title: "텍스트와 폰트"
order: 8
---

## 타이포그래피란?

타이포그래피(Typography)는 **텍스트를 읽기 좋고 아름답게 표현하는** 기술입니다.

웹사이트 내용의 90%는 텍스트입니다.
좋은 타이포그래피는 사용자 경험을 크게 향상시킵니다.

---

## font-family — 폰트 설정

```css
/* 폰트 스택: 첫 번째 폰트가 없으면 다음 폰트를 사용 */
body {
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* 폰트 종류 */
.serif { font-family: 'Georgia', 'Times New Roman', serif; }         /* 세리프: 획 끝에 장식 */
.sans-serif { font-family: 'Helvetica', 'Arial', sans-serif; }       /* 산세리프: 장식 없음 */
.monospace { font-family: 'Consolas', 'Courier New', monospace; }    /* 고정폭: 코드용 */
.cursive { font-family: 'Brush Script MT', cursive; }                /* 손글씨 스타일 */
```

### 웹 폰트 불러오기

```html
<!-- Google Fonts (HTML head에 추가) -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet" />
```

```css
/* @font-face: 직접 폰트 파일 등록 */
@font-face {
  font-family: 'Pretendard';  /* 사용할 이름 */
  font-weight: 400;
  font-style: normal;
  font-display: swap;         /* 폰트 로드 전 시스템 폰트 먼저 보여줌 */
  src: url('/fonts/Pretendard-Regular.woff2') format('woff2');
}

@font-face {
  font-family: 'Pretendard';
  font-weight: 700;
  src: url('/fonts/Pretendard-Bold.woff2') format('woff2');
}

body {
  font-family: 'Pretendard', sans-serif;
}
```

---

## font-size — 글자 크기

```css
/* 절대 단위 */
.px { font-size: 16px; }        /* 고정 크기 */

/* 상대 단위 (권장) */
.rem { font-size: 1rem; }       /* html의 font-size 기준 (보통 16px) */
.em  { font-size: 1.5em; }      /* 부모 요소 font-size 기준 */
.pct { font-size: 125%; }       /* 부모의 125% */

/* 유동적 크기 */
.vw  { font-size: 2vw; }        /* 뷰포트 너비의 2% */
.clamp { font-size: clamp(14px, 2vw, 20px); }  /* 최소 14px, 최대 20px */
```

### 타입 스케일 (계층 구조)

```css
:root {
  --font-size-xs:   0.75rem;  /* 12px */
  --font-size-sm:   0.875rem; /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg:   1.125rem; /* 18px */
  --font-size-xl:   1.25rem;  /* 20px */
  --font-size-2xl:  1.5rem;   /* 24px */
  --font-size-3xl:  1.875rem; /* 30px */
  --font-size-4xl:  2.25rem;  /* 36px */
  --font-size-5xl:  3rem;     /* 48px */
}

body    { font-size: var(--font-size-base); }
h1      { font-size: var(--font-size-5xl); }
h2      { font-size: var(--font-size-4xl); }
h3      { font-size: var(--font-size-3xl); }
.small  { font-size: var(--font-size-sm); }
```

---

## font-weight — 글자 굵기

```css
.thin        { font-weight: 100; }  /* 얇음 */
.extra-light { font-weight: 200; }
.light       { font-weight: 300; }
.normal      { font-weight: 400; }  /* 기본값 */
.medium      { font-weight: 500; }
.semi-bold   { font-weight: 600; }
.bold        { font-weight: 700; }  /* bold 키워드와 동일 */
.extra-bold  { font-weight: 800; }
.black       { font-weight: 900; }  /* 가장 굵음 */

/* 키워드 */
p    { font-weight: normal; }   /* 400 */
strong { font-weight: bold; }   /* 700 */
```

---

## font-style — 이탤릭

```css
.normal  { font-style: normal; }   /* 기본 */
.italic  { font-style: italic; }   /* 이탤릭체 (폰트가 지원하면 전용 이탤릭 사용) */
.oblique { font-style: oblique; }  /* 기울임 (폰트 기울여서 흉내) */
```

---

## line-height — 줄 간격

```css
/* 단위 없는 값 (권장): font-size 기준 배수 */
p { line-height: 1.6; }    /* font-size × 1.6 */

/* 고정값 */
p { line-height: 24px; }

/* % */
p { line-height: 160%; }   /* font-size의 160% */

/* 읽기 좋은 권장값 */
body     { line-height: 1.5;  }  /* 본문 */
heading  { line-height: 1.2;  }  /* 제목 (더 촘촘하게) */
.compact { line-height: 1.1;  }  /* 버튼, 배지 등 짧은 텍스트 */
```

---

## letter-spacing — 자간 (글자 사이 간격)

```css
.tight   { letter-spacing: -0.05em; }  /* 자간 좁힘 (제목에 자주 사용) */
.normal  { letter-spacing: 0; }        /* 기본값 */
.wide    { letter-spacing: 0.05em; }   /* 자간 넓힘 */
.widest  { letter-spacing: 0.2em; }    /* 매우 넓음 (영문 소문자 소캡스 등) */

/* 한글은 -0.025em 정도가 가독성 좋음 */
body { letter-spacing: -0.025em; }
```

---

## word-spacing — 단어 간격

```css
p { word-spacing: 0.1em; }   /* 단어 사이 간격 넓힘 */
p { word-spacing: -0.05em; } /* 단어 사이 간격 좁힘 */
```

---

## text-align — 텍스트 정렬

```css
.left    { text-align: left; }    /* 왼쪽 정렬 (기본, 한국어/영어) */
.right   { text-align: right; }   /* 오른쪽 정렬 */
.center  { text-align: center; }  /* 가운데 정렬 */
.justify { text-align: justify; } /* 양쪽 정렬 (신문처럼) */
.start   { text-align: start; }   /* 언어 방향의 시작 (RTL 언어 지원) */
.end     { text-align: end; }     /* 언어 방향의 끝 */
```

---

## text-decoration — 텍스트 장식

```css
a { text-decoration: underline; }    /* 밑줄 (링크 기본값) */
s { text-decoration: line-through; } /* 취소선 */
  { text-decoration: overline; }     /* 윗줄 */
  { text-decoration: none; }         /* 없음 */

/* 상세 설정 */
.custom-underline {
  text-decoration: underline;
  text-decoration-color: #6366f1;  /* 밑줄 색상 */
  text-decoration-style: wavy;     /* solid / dashed / dotted / double / wavy */
  text-decoration-thickness: 2px;  /* 밑줄 두께 */
  text-underline-offset: 4px;      /* 밑줄과 텍스트 간격 */
}
```

---

## text-transform — 대소문자 변환

```css
.uppercase { text-transform: uppercase; }   /* 모두 대문자: HELLO */
.lowercase { text-transform: lowercase; }   /* 모두 소문자: hello */
.capitalize { text-transform: capitalize; } /* 첫 글자만 대문자: Hello World */
.none { text-transform: none; }             /* 변환 없음 (기본값) */
```

---

## text-shadow — 텍스트 그림자

```css
/* text-shadow: 가로 세로 블러 색상 */
.shadow { text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }

/* 여러 그림자 중첩 */
.glow {
  text-shadow:
    0 0 10px #6366f1,    /* 내부 glow */
    0 0 20px #6366f1,    /* 중간 glow */
    0 0 40px #6366f1;    /* 외부 glow */
}

/* 입체 효과 */
.emboss {
  text-shadow:
    1px 1px 0 white,
    -1px -1px 0 rgba(0,0,0,0.3);
}
```

---

## white-space — 공백 처리

```css
/* normal: 기본값. 연속 공백 축소, 자동 줄바꿈 */
p { white-space: normal; }

/* nowrap: 줄바꿈 없음 (한 줄 유지) */
.badge { white-space: nowrap; }

/* pre: 코드처럼 공백/줄바꿈 그대로 유지 */
code { white-space: pre; }

/* pre-wrap: 공백 유지 + 자동 줄바꿈 */
.preserve-spaces { white-space: pre-wrap; }

/* pre-line: 줄바꿈 유지, 연속 공백 축소 */
.preserve-newlines { white-space: pre-line; }
```

---

## text-overflow — 텍스트 넘침 처리

```css
/* 한 줄 말줄임 (...) */
.ellipsis {
  white-space: nowrap;       /* 1. 줄바꿈 없음 */
  overflow: hidden;           /* 2. 넘치면 숨김 */
  text-overflow: ellipsis;    /* 3. 끝에 ... 표시 */
}

/* 여러 줄 말줄임 (2줄) */
.line-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;      /* 몇 줄에서 자를지 */
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

---

## 실전 타이포그래피 시스템

```css
/* 기본 설정 */
:root {
  --font-sans: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'Consolas', 'Fira Code', monospace;
}

html {
  font-size: 16px;               /* rem의 기준 */
}

body {
  font-family: var(--font-sans);
  font-size: 1rem;               /* 16px */
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: -0.025em;     /* 한글 자간 최적화 */
  color: #111827;
}

/* 제목 시스템 */
h1, h2, h3, h4, h5, h6 {
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.05em;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

h1 { font-size: clamp(2rem, 5vw, 3.5rem); }    /* 32~56px */
h2 { font-size: clamp(1.5rem, 4vw, 2.5rem); }  /* 24~40px */
h3 { font-size: clamp(1.25rem, 3vw, 2rem); }   /* 20~32px */
h4 { font-size: 1.25rem; }   /* 20px */
h5 { font-size: 1.125rem; }  /* 18px */
h6 { font-size: 1rem; }      /* 16px */

/* 본문 */
p {
  margin-bottom: 1em;
  max-width: 65ch;  /* 65자 기준: 읽기 적합한 너비 */
}

/* 링크 */
a {
  color: #6366f1;
  text-decoration: underline;
  text-underline-offset: 3px;
}

a:hover {
  color: #4f46e5;
}

/* 코드 */
code {
  font-family: var(--font-mono);
  font-size: 0.875em;
  background: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 4px;
  color: #dc2626;
}

pre {
  font-family: var(--font-mono);
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 24px;
  border-radius: 8px;
  overflow-x: auto;
  line-height: 1.7;
}

/* 인용구 */
blockquote {
  border-left: 4px solid #6366f1;
  padding-left: 1em;
  margin-left: 0;
  font-style: italic;
  color: #6b7280;
}
```

---

## 자주 하는 실수

**실수 1: px로만 폰트 크기 지정**
```css
/* 브라우저 글꼴 크기 설정을 무시함 */
p { font-size: 16px; }

/* rem 사용 권장 */
p { font-size: 1rem; }  /* 사용자 설정 반영 */
```

**실수 2: 너무 긴 텍스트 줄**
```css
/* 잘못된 예: 한 줄이 너무 길면 읽기 어려움 */
.content { width: 100%; }

/* 올바른 예: 적절한 줄 길이 */
.content { max-width: 70ch; }  /* 약 70자 */
```

**실수 3: 낮은 색상 대비**
```css
/* 잘못된 예: 배경과 대비가 낮음 */
p { color: #aaa; background: #fff; }  /* 대비 2.3:1 - 기준 미달 */

/* 올바른 예 */
p { color: #555; background: #fff; }  /* 대비 5.7:1 - 기준 충족 */
```

---

## 정리

- `font-family`: 폰트 스택, 웹폰트는 `@font-face` 또는 Google Fonts
- `font-size`: `rem` 사용 권장 (사용자 설정 존중)
- `font-weight`: 100~900
- `line-height`: 본문 1.5~1.6, 제목 1.2
- `letter-spacing`: 한글은 `-0.025em` 권장
- `text-decoration`: 밑줄, 취소선 등
- `text-overflow: ellipsis`: 넘치는 텍스트 말줄임
- `-webkit-line-clamp`: 여러 줄 말줄임
- `max-width: 65ch`: 읽기 좋은 줄 길이
