---
title: "Shadow DOM - 웹 컴포넌트의 캡슐화"
date: "2026-01-06"
tags: ["javascript", "web-components", "shadow-dom", "web-standards"]
excerpt: "Shadow DOM의 개념부터 실전 활용까지, 웹 컴포넌트의 핵심 기술인 Shadow DOM을 예제 코드와 함께 상세히 알아봅니다."
---

# Shadow DOM

Shadow DOM은 웹 컴포넌트의 핵심 기술 중 하나로, **캡슐화된 DOM(Document Object Model, 문서 객체 모델) 트리**를 생성하는 브라우저 네이티브 API(Application Programming Interface, 응용 프로그램 인터페이스)입니다.

---

## Shadow DOM이란?

Shadow DOM은 컴포넌트의 내부 구조를 외부로부터 격리시키는 기술입니다:

- ✅ 외부 CSS(Cascading Style Sheets, 계단식 스타일 시트)가 Shadow DOM 내부에 영향을 주지 못함
- ✅ 내부 CSS가 외부로 누출되지 않음
- ✅ JavaScript도 격리됨 (Shadow Root를 통해서만 접근 가능)
- ✅ 진정한 컴포넌트 캡슐화 구현

### DOM 구조

```
Document
  └── <custom-element> (Host Element)
        └── #shadow-root (Shadow Root)
              ├── <style>
              ├── <div>
              └── ...
```

## 기본 사용법

### Shadow DOM 생성

```javascript
// 호스트 엘리먼트 선택
const host = document.querySelector('#my-element');

// Shadow DOM 생성 (open mode)
const shadowRoot = host.attachShadow({ mode: 'open' });

// Shadow DOM에 컨텐츠 추가
shadowRoot.innerHTML = `
  <style>
    p {
      color: blue;
      font-size: 20px;
    }
  </style>
  <p>This is in shadow DOM</p>
`;
```

### Mode 종류

#### 1. Open Mode
```javascript
const shadowRoot = element.attachShadow({ mode: 'open' });

// 외부에서 접근 가능
console.log(element.shadowRoot); // shadowRoot 객체 반환
```

#### 2. Closed Mode
```javascript
const shadowRoot = element.attachShadow({ mode: 'closed' });

// 외부에서 접근 불가
console.log(element.shadowRoot); // null
```

**권장사항**: 대부분의 경우 `open` 모드를 사용하세요. `closed` 모드는 디버깅을 어렵게 만들고, 실제로는 완전한 보안을 제공하지 않습니다.

---

## 커스텀 엘리먼트와 함께 사용

### 기본 예제

```javascript
class FancyButton extends HTMLElement {
  constructor() {
    super();

    // Shadow DOM 생성
    const shadow = this.attachShadow({ mode: 'open' });

    // 스타일 정의 (격리됨!)
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-block;
      }

      button {
        background: linear-gradient(to right, #667eea, #764ba2);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      button:active {
        transform: translateY(0);
      }

      .icon {
        margin-right: 8px;
      }
    `;

    // DOM 구조
    const button = document.createElement('button');
    button.innerHTML = `
      <span class="icon">🚀</span>
      <slot></slot>
    `;

    // Shadow DOM에 추가
    shadow.appendChild(style);
    shadow.appendChild(button);
  }
}

// 커스텀 엘리먼트 등록
customElements.define('fancy-button', FancyButton);
```

```html
<!-- 사용 -->
<fancy-button>Click Me!</fancy-button>
<fancy-button>Another Button</fancy-button>

<!-- 외부 CSS는 버튼 내부 스타일에 영향을 주지 않습니다 -->
<style>
  button {
    background: red !important; /* Shadow DOM 내부에는 적용 안됨 */
  }
</style>
```

### 실전 예제: User Card

```javascript
class UserCard extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>
        .card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          max-width: 400px;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
        }

        .info {
          flex: 1;
        }

        .name {
          font-size: 20px;
          font-weight: bold;
          color: #1a202c;
          margin-bottom: 4px;
        }

        .role {
          color: #718096;
          font-size: 14px;
        }

        .bio {
          color: #4a5568;
          line-height: 1.6;
          margin-bottom: 16px;
        }

        .stats {
          display: flex;
          gap: 16px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .stat {
          flex: 1;
          text-align: center;
        }

        .stat-value {
          font-size: 20px;
          font-weight: bold;
          color: #667eea;
        }

        .stat-label {
          font-size: 12px;
          color: #718096;
          margin-top: 4px;
        }
      </style>

      <div class="card">
        <div class="header">
          <div class="avatar">
            <slot name="avatar">👤</slot>
          </div>
          <div class="info">
            <div class="name">
              <slot name="name">Anonymous</slot>
            </div>
            <div class="role">
              <slot name="role">User</slot>
            </div>
          </div>
        </div>

        <div class="bio">
          <slot name="bio">No bio available</slot>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="stat-value"><slot name="posts">0</slot></div>
            <div class="stat-label">Posts</div>
          </div>
          <div class="stat">
            <div class="stat-value"><slot name="followers">0</slot></div>
            <div class="stat-label">Followers</div>
          </div>
          <div class="stat">
            <div class="stat-value"><slot name="following">0</slot></div>
            <div class="stat-label">Following</div>
          </div>
        </div>

        <div class="actions">
          <slot name="actions"></slot>
        </div>
      </div>
    `;
  }
}

customElements.define('user-card', UserCard);
```

```html
<user-card>
  <span slot="avatar">🧑‍💻</span>
  <span slot="name">John Doe</span>
  <span slot="role">Frontend Developer</span>
  <span slot="bio">Passionate about web technologies and user experience. Love building beautiful and performant web applications.</span>
  <span slot="posts">42</span>
  <span slot="followers">1.2K</span>
  <span slot="following">350</span>
  <button slot="actions">Follow</button>
</user-card>
```

---

## Slot을 통한 컨텐츠 전달

Slot은 Shadow DOM에서 외부 컨텐츠를 받아오는 방법입니다.

### Named Slots

```javascript
class TabPanel extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>
        .tabs {
          display: flex;
          border-bottom: 2px solid #e2e8f0;
        }

        .content {
          padding: 20px;
        }
      </style>

      <div class="tabs">
        <slot name="tab"></slot>
      </div>
      <div class="content">
        <slot name="panel"></slot>
      </div>
    `;
  }
}

customElements.define('tab-panel', TabPanel);
```

```html
<tab-panel>
  <button slot="tab">Tab 1</button>
  <button slot="tab">Tab 2</button>
  <div slot="panel">Content 1</div>
  <div slot="panel">Content 2</div>
</tab-panel>
```

### Default Slot

```javascript
class ContentWrapper extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>
        .wrapper {
          padding: 20px;
          border: 2px solid #667eea;
          border-radius: 8px;
        }
      </style>

      <div class="wrapper">
        <slot></slot> <!-- 이름 없는 기본 슬롯 -->
      </div>
    `;
  }
}

customElements.define('content-wrapper', ContentWrapper);
```

```html
<content-wrapper>
  <p>This content goes into the default slot</p>
  <button>Click me</button>
</content-wrapper>
```

---

## CSS 선택자

### :host - 호스트 엘리먼트 스타일링

```css
/* Shadow DOM 내부 스타일 */
:host {
  display: block;
  border: 1px solid black;
  padding: 10px;
}

/* 호스트에 특정 클래스가 있을 때 */
:host(.active) {
  border-color: blue;
  background: #f0f8ff;
}

/* 호스트의 pseudo-class */
:host(:hover) {
  opacity: 0.8;
}

/* 호스트의 속성 선택자 */
:host([disabled]) {
  opacity: 0.5;
  pointer-events: none;
}
```

### :host-context() - 조상 엘리먼트 기반 스타일링

```css
/* 다크 테마일 때 */
:host-context(.dark-theme) {
  background: #333;
  color: white;
}

/* 특정 섹션 내부에 있을 때 */
:host-context(.sidebar) {
  width: 100%;
}
```

### ::slotted() - 슬롯 컨텐츠 스타일링

```css
/* 슬롯에 전달된 모든 span */
::slotted(span) {
  color: blue;
  font-weight: bold;
}

/* 슬롯에 전달된 특정 클래스 */
::slotted(.highlight) {
  background: yellow;
  padding: 2px 4px;
}

/* 주의: 자손 선택자는 작동하지 않음 */
::slotted(div p) { /* ❌ 작동 안함 */ }
```

## 이벤트 처리

Shadow DOM의 이벤트는 **리타게팅(retargeting)** 됩니다.

```javascript
class ClickCounter extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    this.count = 0;

    shadow.innerHTML = `
      <style>
        button {
          padding: 10px 20px;
          font-size: 16px;
        }
        .count {
          margin-left: 10px;
          font-weight: bold;
        }
      </style>

      <button id="btn">Click me</button>
      <span class="count">0</span>
    `;

    const button = shadow.querySelector('#btn');
    const countSpan = shadow.querySelector('.count');

    // Shadow DOM 내부 이벤트
    button.addEventListener('click', (e) => {
      console.log('Internal target:', e.target); // <button>

      this.count++;
      countSpan.textContent = this.count;

      // 커스텀 이벤트 발생
      this.dispatchEvent(new CustomEvent('count-changed', {
        bubbles: true,
        composed: true, // Shadow DOM 경계를 넘어 버블링
        detail: { count: this.count }
      }));
    });
  }
}

customElements.define('click-counter', ClickCounter);
```

```javascript
// 외부에서 이벤트 리스닝
const counter = document.querySelector('click-counter');

counter.addEventListener('count-changed', (e) => {
  console.log('External target:', e.target); // <click-counter>
  console.log('Count:', e.detail.count);
});

counter.addEventListener('click', (e) => {
  // 리타게팅: Shadow DOM 내부의 버튼이 아닌 호스트 엘리먼트가 target
  console.log('Click target:', e.target); // <click-counter>
});
```

### composed 옵션

```javascript
// composed: true - Shadow DOM 경계를 넘어 버블링
this.dispatchEvent(new CustomEvent('my-event', {
  bubbles: true,
  composed: true  // ✅ 외부에서 리스닝 가능
}));

// composed: false (기본값) - Shadow DOM 내부에서만 버블링
this.dispatchEvent(new CustomEvent('my-event', {
  bubbles: true,
  composed: false  // ❌ 외부에서 리스닝 불가
}));
```

## 동적 스타일 업데이트

```javascript
class ThemeButton extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    this.style = document.createElement('style');
    this.updateTheme('blue');

    const button = document.createElement('button');
    button.textContent = 'Toggle Theme';
    button.addEventListener('click', () => {
      const newTheme = this.currentTheme === 'blue' ? 'red' : 'blue';
      this.updateTheme(newTheme);
    });

    shadow.appendChild(this.style);
    shadow.appendChild(button);
  }

  updateTheme(theme) {
    this.currentTheme = theme;
    const colors = {
      blue: { bg: '#3b82f6', hover: '#2563eb' },
      red: { bg: '#ef4444', hover: '#dc2626' }
    };

    this.style.textContent = `
      button {
        background: ${colors[theme].bg};
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.3s;
      }

      button:hover {
        background: ${colors[theme].hover};
      }
    `;
  }
}

customElements.define('theme-button', ThemeButton);
```

## CSS 변수를 통한 외부 스타일 제어

Shadow DOM 내부에서 외부 CSS 변수를 사용할 수 있습니다.

```javascript
class ThemedCard extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>
        .card {
          background: var(--card-bg, white);
          color: var(--card-color, black);
          border: 2px solid var(--card-border, #e2e8f0);
          padding: var(--card-padding, 20px);
          border-radius: var(--card-radius, 8px);
        }
      </style>

      <div class="card">
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('themed-card', ThemedCard);
```

```css
/* 외부 CSS에서 제어 */
themed-card {
  --card-bg: #f7fafc;
  --card-color: #2d3748;
  --card-border: #667eea;
  --card-padding: 24px;
  --card-radius: 12px;
}

.dark-mode themed-card {
  --card-bg: #1a202c;
  --card-color: #e2e8f0;
  --card-border: #4a5568;
}
```

## 브라우저 내장 Shadow DOM

많은 브라우저 내장 엘리먼트가 Shadow DOM을 사용합니다.

```html
<!-- 비디오 컨트롤 -->
<video controls>
  <!-- Shadow DOM 내부에 재생/일시정지 버튼, 진행바 등이 있음 -->
</video>

<!-- Range Input -->
<input type="range">
  <!-- Shadow DOM 내부에 슬라이더 UI가 있음 -->

<!-- Date Input -->
<input type="date">
  <!-- Shadow DOM 내부에 달력 UI가 있음 -->

<!-- Details/Summary -->
<details>
  <summary>Click to expand</summary>
  <!-- Shadow DOM이 화살표 아이콘을 제공 -->
  <p>Hidden content</p>
</details>
```

**개발자 도구에서 확인**:
1. DevTools 설정 열기
2. "Show user agent shadow DOM" 옵션 활성화
3. Elements 탭에서 `#shadow-root` 확인 가능

## React에서 Shadow DOM 사용

```typescript
import { useEffect, useRef } from 'react';

function ShadowComponent({ children }: { children: React.ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<ShadowRoot | null>(null);

  useEffect(() => {
    if (!hostRef.current || shadowRef.current) return;

    // Shadow DOM 생성
    const shadow = hostRef.current.attachShadow({ mode: 'open' });
    shadowRef.current = shadow;

    // 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
      .container {
        padding: 20px;
        background: #f0f9ff;
        border: 2px solid #0ea5e9;
        border-radius: 8px;
      }
    `;
    shadow.appendChild(style);

    // 컨텐츠 컨테이너
    const container = document.createElement('div');
    container.className = 'container';
    shadow.appendChild(container);

  }, []);

  useEffect(() => {
    if (!shadowRef.current) return;

    const container = shadowRef.current.querySelector('.container');
    if (container) {
      container.textContent = String(children);
    }
  }, [children]);

  return <div ref={hostRef} />;
}

// 사용
function App() {
  return (
    <ShadowComponent>
      This content is in Shadow DOM!
    </ShadowComponent>
  );
}
```

---

## 장단점 및 사용 사례

### 장점

✅ **완벽한 스타일 격리** - CSS 충돌 걱정 없음
✅ **컴포넌트 캡슐화** - 내부 구현 숨김
✅ **재사용성** - 어디서든 동일하게 작동
✅ **네이티브 성능** - 프레임워크 오버헤드 없음
✅ **브라우저 표준** - 폴리필 불필요 (최신 브라우저)

### 단점

❌ **SEO(Search Engine Optimization, 검색 엔진 최적화) 제한** - 크롤러가 Shadow DOM 내부를 제대로 인덱싱 못할 수 있음
❌ **전역 스타일 적용 안됨** - CSS 변수로 제어해야 함
❌ **디버깅 복잡도** - DevTools 설정 필요
❌ **러닝 커브** - 새로운 개념 학습 필요

### 주요 사용 사례

1. **디자인 시스템 / UI(User Interface, 사용자 인터페이스) 라이브러리**
```javascript
// 회사 전체에서 사용하는 공통 컴포넌트
<company-button>Submit</company-button>
<company-modal>...</company-modal>
```

2. **서드파티 위젯**
```javascript
// 채팅 위젯, 광고 등 - 호스트 페이지 스타일에 영향받지 않음
<chat-widget api-key="xxx"></chat-widget>
```

3. **마이크로 프론트엔드**
```javascript
// 독립적인 앱들을 하나의 페이지에 통합
<app-header></app-header>
<app-sidebar></app-sidebar>
<app-content></app-content>
```

4. **웹 컴포넌트 라이브러리**
```javascript
// Lit, Stencil 등이 Shadow DOM 사용
import { LitElement, html } from 'lit';
```

## Shadow DOM vs iframe

| 특징 | Shadow DOM | iframe |
|------|-----------|--------|
| 격리 수준 | DOM/CSS 격리 | 완전 격리 (별도 window) |
| 성능 | 가벼움 | 무거움 |
| 통신 | 직접 접근 가능 | postMessage 필요 |
| SEO | 가능 | 제한적 |
| 메모리 | 적음 | 많음 |
| 사용 사례 | 컴포넌트 스타일 격리 | 완전 독립적 컨텍스트 |

## 브라우저 지원

Shadow DOM은 모든 최신 브라우저에서 지원됩니다:

- ✅ Chrome 53+
- ✅ Firefox 63+
- ✅ Safari 10+
- ✅ Edge 79+ (Chromium 기반)

IE11은 지원하지 않으므로, 필요하다면 폴리필을 사용해야 합니다.

## 결론

Shadow DOM은 웹 컴포넌트의 핵심 기술로, **진정한 컴포넌트 캡슐화**를 제공합니다.

다음과 같은 경우에 Shadow DOM 사용을 고려하세요:

- ✅ 재사용 가능한 UI 컴포넌트 라이브러리 개발
- ✅ 서드파티 위젯 개발
- ✅ 스타일 충돌 방지가 중요한 대규모 애플리케이션
- ✅ 프레임워크 독립적인 컴포넌트 필요

Shadow DOM은 현대 웹 개발에서 컴포넌트 기반 아키텍처를 구현하는 강력하고 표준화된 방법입니다!

## 참고 자료

- [MDN - Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
- [web.dev - Shadow DOM v1](https://web.dev/shadowdom-v1/)
- [Web Components 공식 문서](https://www.webcomponents.org/specs)
- [Can I use - Shadow DOM](https://caniuse.com/shadowdomv1)
