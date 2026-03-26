---
title: "색상과 배경"
order: 9
---

## 색상 표현 방법

CSS에서 색상을 나타내는 방법은 여러 가지입니다.

```css
.color-examples {
  /* 1. 색상 이름 (140가지 이상) */
  color: red;
  color: blue;
  color: tomato;
  color: cornflowerblue;

  /* 2. HEX (16진수) */
  color: #ff0000;      /* red */
  color: #6366f1;      /* 보라색 */
  color: #06b6d4;      /* 청록색 */
  color: #fff;         /* 흰색 (축약형: #ffffff) */
  color: #0003;        /* 투명도 포함 (마지막 두 자리) */

  /* 3. RGB */
  color: rgb(99, 102, 241);       /* 보라색 */
  color: rgb(0 0 0);              /* 검정 (새 문법, 쉼표 없음) */

  /* 4. RGBA (투명도 포함) */
  color: rgba(99, 102, 241, 0.5);  /* 50% 투명 보라 */
  color: rgba(0, 0, 0, 0.8);       /* 80% 불투명 검정 */
  color: rgb(0 0 0 / 0.8);         /* 새 문법 */

  /* 5. HSL (색조 채도 명도) */
  color: hsl(239, 84%, 67%);       /* 보라색 */
  color: hsl(0, 100%, 50%);        /* 빨강 */
  color: hsl(120, 100%, 50%);      /* 초록 */

  /* 6. HSLA */
  color: hsla(239, 84%, 67%, 0.5);
  color: hsl(239 84% 67% / 0.5);  /* 새 문법 */

  /* 7. oklch (최신, 균일한 색상 공간) */
  color: oklch(66% 0.18 264);
}
```

### HSL이 편리한 이유

```css
/* 색조(Hue): 0~360 (빨강=0, 초록=120, 파랑=240) */
/* 채도(Saturation): 0%=회색, 100%=선명한 색 */
/* 명도(Lightness): 0%=검정, 50%=보통, 100%=흰색 */

/* 같은 색의 밝기만 바꾸기 쉬움 */
.btn          { background: hsl(239, 84%, 67%); }   /* 기본 */
.btn:hover    { background: hsl(239, 84%, 57%); }   /* 더 어둡게 */
.btn:active   { background: hsl(239, 84%, 47%); }   /* 더더 어둡게 */
.btn-light    { background: hsl(239, 84%, 92%); }   /* 매우 밝게 */
```

---

## opacity — 투명도

```css
/* 요소 전체 투명도 (자식 요소 포함) */
.transparent {
  opacity: 0;     /* 완전 투명 (보이지 않음, 공간은 차지) */
  opacity: 0.5;   /* 50% 투명 */
  opacity: 1;     /* 불투명 (기본값) */
}

/* 배경만 투명하게 하려면 rgba 사용 */
.semi-transparent-bg {
  background: rgba(99, 102, 241, 0.2);  /* 배경만 투명, 텍스트는 불투명 */
}
```

---

## background-color

```css
.box {
  background-color: #6366f1;
  background-color: transparent;   /* 투명 (기본값) */
  background-color: rgba(0, 0, 0, 0.5);

  /* background 단축 속성으로도 설정 가능 */
  background: #6366f1;
}
```

---

## background-image — 배경 이미지

```css
.hero {
  /* 이미지 */
  background-image: url('hero.jpg');

  /* 그라데이션 (이미지처럼 사용) */
  background-image: linear-gradient(to right, #6366f1, #06b6d4);

  /* 이미지 + 그라데이션 겹치기 */
  background-image:
    linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)),
    url('hero.jpg');
}
```

---

## background-size — 배경 이미지 크기

```css
.bg {
  background-size: auto;          /* 기본값: 원본 크기 */
  background-size: cover;         /* 컨테이너를 빈틈없이 채움 (잘릴 수 있음) */
  background-size: contain;       /* 전체가 보이도록 맞춤 (여백 생길 수 있음) */
  background-size: 200px;         /* 가로 200px, 세로 자동 */
  background-size: 200px 150px;   /* 가로 200px, 세로 150px */
  background-size: 50%;           /* 부모의 50% */
  background-size: 100% auto;     /* 가로 100%, 세로 비율 유지 */
}
```

---

## background-position — 배경 이미지 위치

```css
.bg {
  background-position: center;          /* 가운데 (기본) */
  background-position: top;             /* 위 */
  background-position: bottom right;    /* 오른쪽 아래 */
  background-position: 50% 50%;         /* 가운데 (% 방식) */
  background-position: 20px 40px;       /* 왼쪽에서 20px, 위에서 40px */
}
```

---

## background-repeat — 배경 이미지 반복

```css
.bg {
  background-repeat: repeat;     /* 기본값: 가로세로 반복 */
  background-repeat: no-repeat;  /* 반복 없음 */
  background-repeat: repeat-x;   /* 가로만 반복 */
  background-repeat: repeat-y;   /* 세로만 반복 */
  background-repeat: space;      /* 잘리지 않게 간격 두고 반복 */
  background-repeat: round;      /* 잘리지 않게 크기 조절하며 반복 */
}
```

---

## background 단축 속성

```css
/* background: color image repeat position / size attachment */
.box {
  background: #0a0a1f url('bg.jpg') no-repeat center / cover;
}

/* 여러 배경 중첩 (앞에 선언한 것이 위에 표시) */
.multi-bg {
  background:
    url('pattern.png') repeat top left,       /* 패턴 (위) */
    linear-gradient(to bottom, #1a1a3e, #0a0a1f);  /* 그라데이션 (아래) */
}
```

---

## 그라데이션

### linear-gradient — 선형 그라데이션

```css
/* 방향 설정 */
.gradient {
  background: linear-gradient(to right, #6366f1, #06b6d4);    /* 왼쪽 → 오른쪽 */
  background: linear-gradient(to bottom, #6366f1, #06b6d4);   /* 위 → 아래 */
  background: linear-gradient(45deg, #6366f1, #06b6d4);       /* 45도 대각선 */
  background: linear-gradient(135deg, #6366f1, #ec4899, #06b6d4);  /* 3색 */
}

/* 색상 정지점 (color stop) */
.gradient-stops {
  background: linear-gradient(
    to right,
    #6366f1 0%,       /* 시작: 보라 */
    #8b5cf6 30%,      /* 30% 위치: 밝은 보라 */
    #06b6d4 70%,      /* 70% 위치: 청록 */
    #06b6d4 100%      /* 끝: 청록 */
  );
}

/* 투명 그라데이션 (페이드 아웃 효과) */
.fade-out {
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(0, 0, 0, 0.8)
  );
}
```

### radial-gradient — 원형 그라데이션

```css
.radial {
  /* 원형: 중심 → 가장자리 */
  background: radial-gradient(circle, #6366f1, #0a0a1f);

  /* 타원형 */
  background: radial-gradient(ellipse, #6366f1, #0a0a1f);

  /* 중심 위치 지정 */
  background: radial-gradient(circle at top left, #6366f1, #0a0a1f);
  background: radial-gradient(circle at 30% 70%, #ec4899, #6366f1, #0a0a1f);
}
```

### conic-gradient — 원뿔형 그라데이션

```css
.conic {
  background: conic-gradient(red, yellow, green, blue, red);

  /* 파이 차트 만들기 */
  background: conic-gradient(
    #6366f1 0% 25%,   /* 25% 보라 */
    #06b6d4 25% 50%,  /* 25% 청록 */
    #ec4899 50% 75%,  /* 25% 핑크 */
    #f59e0b 75% 100%  /* 25% 노랑 */
  );
  border-radius: 50%;   /* 원형으로 */
}
```

---

## box-shadow — 박스 그림자

```css
/* box-shadow: 가로 세로 블러 확산 색상 */
.card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);     /* 기본 그림자 */
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);    /* 큰 그림자 */
  box-shadow: 0 0 0 2px #6366f1;                  /* 테두리처럼 (inset 아닌 외부) */
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2); /* 내부 그림자 */
}

/* 여러 그림자 중첩 */
.layered-shadow {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.1),
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 16px 40px rgba(0, 0, 0, 0.1);
}

/* Neon glow 효과 */
.neon-purple {
  box-shadow:
    0 0 10px rgba(99, 102, 241, 0.5),
    0 0 20px rgba(99, 102, 241, 0.3),
    0 0 40px rgba(99, 102, 241, 0.2);
}

/* 호버 시 그림자 효과 */
.card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}

.card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}
```

---

## CSS 그라데이션 텍스트

```css
/* 그라데이션 텍스트 */
.gradient-text {
  background: linear-gradient(135deg, #6366f1, #ec4899, #06b6d4);
  -webkit-background-clip: text;     /* 배경을 텍스트 모양으로 자름 */
  background-clip: text;
  -webkit-text-fill-color: transparent;  /* 텍스트 색상 투명 */
  color: transparent;                /* 폴백 */
}
```

---

## backdrop-filter — 배경 블러

```css
/* 배경 블러 효과 (Glass Morphism) */
.glass-card {
  background: rgba(255, 255, 255, 0.1);    /* 반투명 배경 */
  backdrop-filter: blur(12px);              /* 배경 블러 */
  -webkit-backdrop-filter: blur(12px);      /* Safari 지원 */
  border: 1px solid rgba(255, 255, 255, 0.2);  /* 반투명 테두리 */
  border-radius: 16px;
}

/* 다양한 backdrop-filter 효과 */
.effects {
  backdrop-filter: blur(10px);              /* 블러 */
  backdrop-filter: brightness(0.5);         /* 밝기 */
  backdrop-filter: contrast(1.2);           /* 대비 */
  backdrop-filter: grayscale(1);            /* 흑백 */
  backdrop-filter: blur(10px) brightness(0.8);  /* 중복 적용 */
}
```

---

## 실전 예제 — 다크 테마 카드

```css
.dark-card {
  /* 배경 */
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.15),
    rgba(6, 182, 212, 0.05)
  );
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  /* 테두리 */
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 16px;

  /* 그림자 */
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(99, 102, 241, 0.1);

  padding: 24px;
  color: #e5e7eb;
  transition: all 0.3s ease;
}

.dark-card:hover {
  border-color: rgba(99, 102, 241, 0.6);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(99, 102, 241, 0.2);
  transform: translateY(-2px);
}

.dark-card .card-title {
  font-size: 1.25rem;
  font-weight: 700;
  /* 그라데이션 텍스트 */
  background: linear-gradient(135deg, #a5b4fc, #67e8f9);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  margin-bottom: 8px;
}
```

---

## CSS 커스텀 프로퍼티로 색상 시스템

```css
:root {
  /* 브랜드 색상 */
  --color-primary: #6366f1;
  --color-primary-dark: #4f46e5;
  --color-primary-light: #a5b4fc;

  /* 배경 */
  --color-bg: #0a0a1f;
  --color-bg-card: #1a1a3e;
  --color-bg-hover: #2d2d5f;

  /* 텍스트 */
  --color-text: #e5e7eb;
  --color-text-muted: #9ca3af;

  /* 상태 색상 */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
}

/* 다크 모드 대응 */
@media (prefers-color-scheme: light) {
  :root {
    --color-bg: #ffffff;
    --color-bg-card: #f9fafb;
    --color-text: #111827;
    --color-text-muted: #6b7280;
  }
}
```

---

## 자주 하는 실수

**실수 1: opacity vs rgba 혼동**
```css
/* opacity: 자식 요소 포함 전체가 투명해짐 */
.card {
  opacity: 0.5;   /* 카드 안의 텍스트도 50% 투명해짐! */
}

/* rgba: 배경만 투명, 텍스트는 불투명 유지 */
.card {
  background: rgba(99, 102, 241, 0.5);  /* 배경만 투명 */
}
```

**실수 2: 그라데이션 텍스트에서 color 미지정**
```css
/* -webkit-text-fill-color가 지원 안 되면 글자가 안 보임 */
.gradient-text {
  background: linear-gradient(...);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  /* color 폴백 없음 → 일부 환경에서 보이지 않음 */
}

/* color 폴백 추가 */
.gradient-text {
  color: #6366f1;  /* 폴백 색상 */
  background: linear-gradient(...);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 정리

- HEX(`#6366f1`), RGB, HSL, RGBA 등 다양한 색상 표현
- HSL: 밝기/채도 변형이 직관적
- `background`: color, image, repeat, position, size 한 번에 설정
- `linear-gradient` / `radial-gradient`: CSS로 그라데이션
- `box-shadow`: 그림자 + 외부 테두리 효과
- `backdrop-filter: blur()`: Glass Morphism 효과
- `background-clip: text`: 그라데이션 텍스트
- CSS 변수로 색상 시스템 구축
