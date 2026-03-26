---
title: "트랜지션과 애니메이션"
order: 10
---

## 움직임이 왜 중요한가?

애니메이션은 단순히 예쁘게 만들기 위한 것이 아닙니다.
**사용자에게 무슨 일이 일어나고 있는지 알려주는** 역할을 합니다.

- 버튼 색상이 바뀌면 → "클릭되었다"는 피드백
- 메뉴가 스르륵 나타나면 → "어디서 왔는지" 공간적 이해
- 로딩 스피너가 돌면 → "기다리세요"라는 신호

CSS로 두 가지 방식의 애니메이션을 만들 수 있습니다:
- **transition**: 상태 변화 시 부드러운 전환
- **animation + @keyframes**: 복잡한 다단계 애니메이션

---

## transition — 부드러운 상태 전환

상태가 변할 때(hover, focus, 클래스 추가 등) 부드럽게 전환합니다.

```css
/* transition: 속성 지속시간 타이밍함수 지연시간 */
.btn {
  background: #6366f1;
  color: white;
  transition: background 0.3s ease;  /* background 속성을 0.3초에 걸쳐 ease 방식으로 */
}

.btn:hover {
  background: #4f46e5;  /* 이 변화가 0.3초에 걸쳐 부드럽게 */
}
```

---

## transition 속성 상세

```css
.element {
  /* 개별 속성 지정 */
  transition-property: background-color;  /* 어떤 속성 */
  transition-duration: 0.3s;             /* 지속시간 */
  transition-timing-function: ease;      /* 속도 곡선 */
  transition-delay: 0.1s;               /* 시작 지연 */

  /* 단축 표현 */
  transition: background-color 0.3s ease 0.1s;

  /* 여러 속성 동시에 */
  transition:
    background-color 0.3s ease,
    transform 0.2s ease-out,
    box-shadow 0.3s ease;

  /* 모든 변화에 transition 적용 */
  transition: all 0.3s ease;  /* 권장하지 않음: 불필요한 속성도 전환됨 */
}
```

---

## timing-function — 속도 곡선

같은 1초라도 속도가 다르면 느낌이 다릅니다.

```css
.element {
  /* 키워드 */
  transition-timing-function: ease;          /* 느리게 시작 → 빠르게 → 느리게 끝 (기본값) */
  transition-timing-function: linear;         /* 일정한 속도 */
  transition-timing-function: ease-in;        /* 느리게 시작 → 점점 빠르게 */
  transition-timing-function: ease-out;       /* 빠르게 시작 → 점점 느리게 (자연스러움) */
  transition-timing-function: ease-in-out;    /* 느리게 시작/끝, 중간에 빠름 */
  transition-timing-function: step-start;     /* 즉시 변화 (애니메이션 없음) */

  /* cubic-bezier: 커스텀 속도 곡선 */
  transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);  /* 스프링 효과 */
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);       /* Material Design */
}
```

---

## transition 실전 예제

```css
/* 버튼 인터랙션 */
.btn {
  background: #6366f1;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.1s ease,
    box-shadow 0.2s ease;
}

.btn:hover {
  background-color: #4f46e5;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
}

.btn:active {
  transform: scale(0.98);  /* 눌리는 느낌 */
}

/* 카드 호버 */
.card {
  transition:
    transform 0.3s ease-out,
    box-shadow 0.3s ease-out;
}

.card:hover {
  transform: translateY(-4px);   /* 위로 살짝 뜨는 효과 */
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

/* 링크 밑줄 효과 */
.nav-link {
  position: relative;
  text-decoration: none;
  color: #e5e7eb;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;                 /* 처음엔 너비 0 */
  height: 2px;
  background: #6366f1;
  transition: width 0.3s ease;
}

.nav-link:hover::after {
  width: 100%;              /* 호버 시 전체 너비로 */
}
```

---

## @keyframes — 다단계 애니메이션

`@keyframes`는 애니메이션의 **각 단계를 정의**합니다.

```css
/* 애니메이션 정의 */
@keyframes 애니메이션이름 {
  0%   { /* 시작 상태 */ }
  50%  { /* 중간 상태 */ }
  100% { /* 끝 상태 */ }
}

/* from / to (0%와 100%의 별칭) */
@keyframes 페이드인 {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

---

## animation 속성

```css
.element {
  animation-name: 애니메이션이름;       /* 사용할 @keyframes 이름 */
  animation-duration: 1s;              /* 1회 지속시간 */
  animation-timing-function: ease;     /* 속도 곡선 */
  animation-delay: 0.2s;              /* 시작 지연 */
  animation-iteration-count: 3;       /* 반복 횟수 (infinite: 무한) */
  animation-direction: normal;         /* 방향 */
  animation-fill-mode: forwards;      /* 끝난 후 상태 */
  animation-play-state: running;      /* running / paused */

  /* 단축 표현: name duration timing delay iteration direction fill-mode */
  animation: 페이드인 0.5s ease-out 0.1s 1 normal forwards;

  /* 여러 애니메이션 동시 */
  animation:
    슬라이드업 0.5s ease-out,
    페이드인 0.3s ease;
}
```

### animation-fill-mode

```css
/* none: 기본. 애니메이션 전/후 원래 상태 */
/* forwards: 끝난 후 마지막 keyframe 상태 유지 */
/* backwards: 시작 전 첫 keyframe 상태 적용 */
/* both: forwards + backwards 모두 */

@keyframes 슬라이드업 {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.element {
  animation: 슬라이드업 0.5s ease forwards;
  /* forwards 없으면 끝나고 원래 위치(아래 20px)로 돌아감 */
}
```

---

## 자주 사용하는 애니메이션 패턴

```css
/* 1. 페이드인 */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* 2. 아래에서 위로 올라오며 나타남 */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 3. 옆에서 밀려들어오기 */
@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 4. 크게 나타나기 */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 5. 무한 회전 (로딩 스피너) */
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}

/* 6. 맥박처럼 깜빡임 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.loading-skeleton {
  animation: pulse 1.5s ease-in-out infinite;
}

/* 7. 흔들기 (오류 등) */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25%       { transform: translateX(-8px); }
  75%       { transform: translateX(8px); }
}

.error-shake {
  animation: shake 0.4s ease-in-out;
}

/* 8. 바운스 (알림 등) */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-10px); }
}

/* 9. Neon glow 깜빡임 */
@keyframes glowPulse {
  0%, 100% {
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
  }
  50% {
    box-shadow: 0 0 25px rgba(99, 102, 241, 0.9),
                0 0 50px rgba(99, 102, 241, 0.5);
  }
}
```

---

## transform — 변환

`transform`은 요소를 **이동, 회전, 크기 변경, 기울이기**할 수 있습니다.
레이아웃을 변경하지 않아 **성능이 좋습니다** (GPU 가속).

```css
.element {
  /* 이동 */
  transform: translateX(50px);          /* 오른쪽으로 50px */
  transform: translateY(-20px);         /* 위로 20px */
  transform: translate(50px, -20px);    /* 오른쪽 50px, 위로 20px */
  transform: translate(-50%, -50%);     /* 자신 크기의 50%씩 이동 */

  /* 크기 */
  transform: scale(1.2);               /* 1.2배 확대 */
  transform: scale(0.8);               /* 0.8배 축소 */
  transform: scaleX(2);                /* 가로만 2배 */
  transform: scaleY(0.5);              /* 세로만 0.5배 */

  /* 회전 */
  transform: rotate(45deg);            /* 45도 시계방향 */
  transform: rotate(-90deg);           /* 90도 반시계방향 */

  /* 기울이기 */
  transform: skewX(20deg);
  transform: skewY(10deg);

  /* 여러 transform 중첩 */
  transform: translateY(-4px) scale(1.02);
  transform: rotate(180deg) scale(0.9);
}
```

### transform-origin — 변환 기준점

```css
.element {
  transform-origin: center;      /* 기본값: 가운데 */
  transform-origin: top left;    /* 왼쪽 상단 */
  transform-origin: bottom;      /* 아래 가운데 */
  transform-origin: 0 0;         /* 왼쪽 상단 (px) */
  transform-origin: 100% 100%;   /* 오른쪽 하단 (%) */
}
```

---

## 성능 좋은 애니메이션

GPU 가속이 되는 속성을 사용하면 부드러운 애니메이션을 만들 수 있습니다.

```css
/* 성능 좋음: transform, opacity (GPU 가속) */
.good {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.good:hover {
  transform: translateY(-4px);  /* GPU 처리 */
  opacity: 0.9;
}

/* 성능 나쁨: width, height, top, left, margin (레이아웃 재계산) */
.bad {
  transition: margin-top 0.3s ease;  /* CPU 처리 → 끊길 수 있음 */
}
.bad:hover {
  margin-top: -4px;
}

/* will-change: 미리 GPU 레이어 생성 (과도한 사용 금지) */
.animated {
  will-change: transform;  /* transform 변화가 예정됨을 브라우저에 힌트 */
}
```

---

## 접근성 — 애니메이션 줄이기

일부 사용자는 모션에 민감합니다. (전정계 장애, 뇌전증 등)

```css
/* 애니메이션 모두 적용 */
.element {
  transition: transform 0.3s ease;
  animation: slideUp 0.5s ease forwards;
}

/* 사용자가 모션 줄이기를 선호하면 */
@media (prefers-reduced-motion: reduce) {
  .element {
    transition: none;          /* transition 제거 */
    animation: none;           /* animation 제거 */
    /* 또는 짧게 */
    animation-duration: 0.01ms;
  }
}
```

---

## 실전 예제 — 알림 토스트

```css
/* 토스트 알림 컨테이너 */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #1a1a3e;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  border-left: 4px solid #6366f1;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);

  /* 초기 상태 */
  opacity: 0;
  transform: translateX(100%);

  /* 클래스 추가 시 애니메이션 */
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast.show {
  opacity: 1;
  transform: translateX(0);
}

.toast.hide {
  opacity: 0;
  transform: translateX(100%);
}
```

---

## 자주 하는 실수

**실수 1: transform 중첩 시 덮어쓰기**
```css
/* 잘못된 예: 두 번째 transform이 첫 번째를 덮어씀 */
.card:hover {
  transform: translateY(-4px);
  transform: scale(1.02);       /* 위 transform이 사라짐! */
}

/* 올바른 예: 한 번에 선언 */
.card:hover {
  transform: translateY(-4px) scale(1.02);
}
```

**실수 2: animation-fill-mode 미설정**
```css
/* 끝나면 사라졌다 다시 나타남 */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.element { animation: fadeIn 0.5s ease; }  /* 끝나면 opacity: 0으로 돌아감 */

/* forwards로 마지막 상태 유지 */
.element { animation: fadeIn 0.5s ease forwards; }
```

**실수 3: 레이아웃 속성 애니메이션**
```css
/* 성능 나쁨 */
.element { transition: width 0.3s ease; }

/* 성능 좋음 (같은 효과) */
.element { transition: transform 0.3s ease; }
.element.expanded { transform: scaleX(2); }
```

---

## 정리

**transition:**
- 상태 변화(hover, focus)를 부드럽게 전환
- `transition: 속성 시간 타이밍 지연`
- 성능을 위해 `transform`, `opacity`만 사용 권장

**@keyframes + animation:**
- 다단계 복잡한 애니메이션
- `animation: 이름 시간 타이밍 지연 횟수 방향 fill-mode`
- `animation-fill-mode: forwards`: 끝 상태 유지

**transform:**
- `translate()`: 이동 (GPU 가속)
- `scale()`: 크기
- `rotate()`: 회전
- 레이아웃 변경 없이 시각적 변환

**접근성:**
- `@media (prefers-reduced-motion: reduce)` 반드시 적용
