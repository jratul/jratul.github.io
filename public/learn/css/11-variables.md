---
title: "CSS 변수"
order: 11
---

## CSS 변수란?

CSS 커스텀 프로퍼티(CSS Custom Properties), 흔히 **CSS 변수**라고 부릅니다.

자주 반복되는 값(색상, 크기, 폰트 등)을 **이름을 붙여 저장**하고,
여러 곳에서 재사용할 수 있습니다.

**프로그래밍 변수**와 같은 개념입니다:
- 변수에 값을 저장
- 값을 바꾸면 사용하는 모든 곳이 한꺼번에 바뀜
- 코드가 훨씬 관리하기 쉬워짐

---

## 기본 문법

```css
/* 변수 선언: -- 로 시작 */
:root {
  --primary-color: #6366f1;
  --font-size-base: 1rem;
  --border-radius: 8px;
  --spacing-md: 16px;
}

/* 변수 사용: var() 함수 */
.button {
  background-color: var(--primary-color);  /* #6366f1 */
  font-size: var(--font-size-base);        /* 1rem */
  border-radius: var(--border-radius);     /* 8px */
  padding: var(--spacing-md);              /* 16px */
}
```

### `:root`에 선언하는 이유

`:root`는 HTML의 최상위 요소(`<html>`)입니다.
여기에 선언하면 **페이지 전체 어디서든 사용**할 수 있습니다.

---

## var()의 대체값 (Fallback)

```css
/* 변수가 없을 때 사용할 기본값 */
.element {
  color: var(--text-color, #333);           /* --text-color 없으면 #333 */
  font-size: var(--font-size, 16px);        /* --font-size 없으면 16px */
  padding: var(--spacing, var(--base-size, 16px));  /* 중첩 폴백 */
}
```

---

## 변수의 범위 (Scope)

CSS 변수는 **선언된 요소와 그 자식에서만** 사용할 수 있습니다.

```css
/* 전역: 어디서든 사용 가능 */
:root {
  --primary: #6366f1;
}

/* 특정 컴포넌트에서만 */
.card {
  --card-bg: #1a1a3e;
  --card-radius: 12px;
  background: var(--card-bg);
  border-radius: var(--card-radius);
}

/* .card 외부에서 --card-bg 사용 불가 */
.other {
  background: var(--card-bg);  /* undefined → 아무것도 적용 안 됨 */
}

/* 자식 요소에서는 부모 변수 사용 가능 */
.card .card-title {
  color: var(--primary);    /* :root에서 상속 */
  background: var(--card-bg);  /* 부모 .card에서 상속 */
}
```

---

## JavaScript로 CSS 변수 제어

```javascript
// CSS 변수 읽기
const root = document.documentElement;
const primaryColor = getComputedStyle(root).getPropertyValue('--primary-color');
console.log(primaryColor.trim()); // '#6366f1'

// CSS 변수 설정
root.style.setProperty('--primary-color', '#ec4899');  // 즉시 전체 반영!

// 특정 요소의 변수 설정
const card = document.querySelector('.card');
card.style.setProperty('--card-bg', '#2d2d5f');

// 변수 제거 (기본값으로 돌아감)
root.style.removeProperty('--primary-color');
```

---

## 실전 — 디자인 토큰 시스템

```css
:root {
  /* ===== 색상 ===== */
  /* 브랜드 */
  --color-primary-50:  #f0f4ff;
  --color-primary-100: #e0e7ff;
  --color-primary-200: #c7d2fe;
  --color-primary-400: #818cf8;
  --color-primary-500: #6366f1;   /* 메인 */
  --color-primary-600: #4f46e5;
  --color-primary-700: #4338ca;
  --color-primary-900: #312e81;

  /* 강조 */
  --color-accent-cyan:   #06b6d4;
  --color-accent-pink:   #ec4899;
  --color-accent-purple: #8b5cf6;

  /* 배경 */
  --color-bg:        #0a0a1f;
  --color-bg-card:   #1a1a3e;
  --color-bg-hover:  #2d2d5f;
  --color-border:    rgba(255, 255, 255, 0.1);

  /* 텍스트 */
  --color-text:         #e5e7eb;
  --color-text-muted:   #9ca3af;
  --color-text-heading: #f9fafb;

  /* 상태 */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error:   #ef4444;
  --color-info:    #3b82f6;

  /* ===== 타이포그래피 ===== */
  --font-sans: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'Consolas', 'Fira Code', monospace;

  --font-size-xs:   0.75rem;   /* 12px */
  --font-size-sm:   0.875rem;  /* 14px */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg:   1.125rem;  /* 18px */
  --font-size-xl:   1.25rem;   /* 20px */
  --font-size-2xl:  1.5rem;    /* 24px */
  --font-size-3xl:  1.875rem;  /* 30px */
  --font-size-4xl:  2.25rem;   /* 36px */

  --font-weight-normal:    400;
  --font-weight-medium:    500;
  --font-weight-semibold:  600;
  --font-weight-bold:      700;
  --font-weight-extrabold: 800;

  --line-height-tight:  1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* ===== 간격 ===== */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */

  /* ===== 테두리 ===== */
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;  /* 완전 둥글게 */

  /* ===== 그림자 ===== */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 20px rgba(99, 102, 241, 0.4);

  /* ===== 트랜지션 ===== */
  --transition-fast:   150ms ease;
  --transition-base:   250ms ease;
  --transition-slow:   400ms ease;
  --transition-spring: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);

  /* ===== z-index ===== */
  --z-dropdown: 100;
  --z-sticky:   200;
  --z-overlay:  300;
  --z-modal:    400;
  --z-toast:    500;
  --z-tooltip:  600;
}
```

---

## 다크 모드 구현

```css
/* 기본: 라이트 모드 */
:root {
  --color-bg: #ffffff;
  --color-text: #111827;
  --color-card: #f9fafb;
  --color-border: #e5e7eb;
}

/* 다크 모드: 시스템 설정 기반 */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0a0a1f;
    --color-text: #e5e7eb;
    --color-card: #1a1a3e;
    --color-border: rgba(255, 255, 255, 0.1);
  }
}

/* 다크 모드: 수동 토글 (data-theme 속성 기반) */
[data-theme="dark"] {
  --color-bg: #0a0a1f;
  --color-text: #e5e7eb;
  --color-card: #1a1a3e;
}

[data-theme="light"] {
  --color-bg: #ffffff;
  --color-text: #111827;
  --color-card: #f9fafb;
}

/* 모든 컴포넌트에서 변수 사용 */
body {
  background-color: var(--color-bg);
  color: var(--color-text);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
}
```

```javascript
// 다크 모드 토글
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');

  // localStorage에 저장
  localStorage.setItem('theme', html.getAttribute('data-theme'));
}

// 페이지 로드 시 저장된 테마 복원
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
```

---

## 컴포넌트별 지역 변수

```css
/* 카드 컴포넌트 */
.card {
  --card-padding: var(--space-6);
  --card-bg: var(--color-bg-card);
  --card-radius: var(--radius-lg);
  --card-border: var(--color-border);

  padding: var(--card-padding);
  background: var(--card-bg);
  border-radius: var(--card-radius);
  border: 1px solid var(--card-border);
}

/* 카드 크기 변형: 지역 변수만 덮어쓰기 */
.card.card-compact {
  --card-padding: var(--space-4);  /* 패딩만 변경, 나머지는 그대로 */
}

.card.card-large {
  --card-padding: var(--space-8);
  --card-radius: var(--radius-xl);
}
```

---

## 계산에 CSS 변수 활용

```css
:root {
  --header-height: 64px;
  --sidebar-width: 250px;
}

/* 계산에서 사용 */
.main-content {
  padding-top: var(--header-height);
  /* 또는 */
  height: calc(100vh - var(--header-height));
  margin-left: var(--sidebar-width);
  width: calc(100% - var(--sidebar-width));
}

/* 그라데이션에서 사용 */
:root {
  --gradient-start: #6366f1;
  --gradient-end: #06b6d4;
}

.gradient-bg {
  background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
}

/* 애니메이션에서 사용 */
:root {
  --animation-duration: 0.3s;
}

.element {
  transition: all var(--animation-duration) ease;
}
```

---

## 자주 하는 실수

**실수 1: 변수 이름에 -- 빠뜨리기**
```css
/* 잘못된 예 */
:root {
  primary-color: #6366f1;    /* CSS 속성이 아님, 무시됨 */
}

/* 올바른 예 */
:root {
  --primary-color: #6366f1;  /* -- 두 개 필수 */
}
```

**실수 2: var() 없이 사용**
```css
/* 잘못된 예 */
.btn {
  color: --primary-color;   /* 문자열로 처리됨 */
}

/* 올바른 예 */
.btn {
  color: var(--primary-color);
}
```

**실수 3: 변수 값에 단위 붙이기**
```css
/* 잘못된 예 */
:root {
  --spacing: 16px;
}
.box {
  margin: var(--spacing) * 2;  /* CSS calc 없이 계산 불가 */
}

/* 올바른 예: calc() 사용 */
.box {
  margin: calc(var(--spacing) * 2);
}

/* 또는 단위 없는 숫자로 저장 */
:root {
  --spacing-unit: 16;
}
.box {
  margin: calc(var(--spacing-unit) * 2px);  /* 32px */
}
```

---

## 정리

- `--변수명: 값`: 변수 선언 (항상 `--`로 시작)
- `var(--변수명)`: 변수 사용
- `var(--변수명, 기본값)`: 변수 없으면 기본값 사용
- `:root`에 전역 변수 선언
- 컴포넌트 안에 지역 변수 선언 가능
- JavaScript로 `setProperty()` / `getPropertyValue()`로 제어
- 다크 모드 토글에 적합
- `calc(var(--변수명) * 2)`: 계산에 활용
