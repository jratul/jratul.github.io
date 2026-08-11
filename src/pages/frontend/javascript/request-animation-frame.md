---
title: "requestAnimationFrame, 프레임에 맞춰 애니메이션 실행하기"
date: "2026-08-11"
tags: ["javascript", "requestAnimationFrame", "animation", "performance", "frontend", "browser"]
excerpt: "setTimeout으로 애니메이션을 만들면 왜 끊기는지부터, rAF의 타이밍 보장, 델타 타임 계산, 백그라운드 탭 스로틀링, React에서의 클린업 패턴까지 정리합니다."
---

# requestAnimationFrame, 프레임에 맞춰 애니메이션 실행하기

`setInterval(fn, 16)`으로 애니메이션을 만들어본 적이 있다면 어딘가 부자연스럽게 끊기는 걸 느꼈을 겁니다. 브라우저가 다음 화면을 실제로 언제 그릴지는 `setInterval`이 알지 못하기 때문입니다. `requestAnimationFrame`(이하 rAF)은 "다음 화면을 그리기 직전"이라는 정확한 시점에 콜백을 실행해주는 API입니다.

---

## 기본 사용법

```javascript
function tick(timestamp) {
  console.log(timestamp); // 콜백이 호출된 시각 (DOMHighResTimeStamp, 밀리초)
  requestAnimationFrame(tick); // 다음 프레임도 예약
}

requestAnimationFrame(tick);
```

`setTimeout`과 달리 rAF는 콜백 안에서 스스로를 다시 호출해야 반복됩니다. 자동으로 반복되는 타이머가 아니라 "다음 프레임 한 번"만 예약하는 API입니다. 중단하려면 반환된 ID를 `cancelAnimationFrame`에 넘깁니다.

```javascript
const id = requestAnimationFrame(tick);
cancelAnimationFrame(id); // 예약된 콜백 취소
```

---

## setTimeout/setInterval과 무엇이 다른가

| | `setTimeout`/`setInterval` | `requestAnimationFrame` |
|---|---|---|
| 실행 시점 | 지정한 시간이 지나면 대략적으로 실행 | 브라우저가 다음 화면을 그리기 직전에 정확히 실행 |
| 화면 주사율과의 동기화 | 없음(60Hz든 120Hz든 똑같이 동작) | 디스플레이 주사율에 맞춰짐(보통 60Hz라면 약 16.6ms 간격) |
| 백그라운드 탭 | 계속 실행(스로틀링 되어도 1초 간격 정도로 유지) | 탭이 보이지 않으면 브라우저가 아예 멈춤 |
| 콜백 인자 | 없음 | 고정밀 타임스탬프(`DOMHighResTimeStamp`) 전달 |
| 용도 | 일반적인 지연 실행, 폴링 | 화면에 그려지는 애니메이션 |

`setInterval(fn, 16)`이 "약 16ms마다 실행해줘"라는 요청이라면, rAF는 "화면을 새로 그릴 준비가 될 때 알려줘"라는 요청입니다. 애니메이션은 화면에 실제로 그려지는 순간과 맞아떨어져야 부드럽기 때문에 rAF가 훨씬 적합합니다.

---

## 이벤트 루프 안에서의 위치

rAF 콜백은 아무 때나 실행되지 않습니다. 브라우저의 렌더링 파이프라인 안에서 정해진 자리가 있습니다.

```
매 프레임마다:
  1. 이벤트 처리 (click, input 등)
  2. rAF 콜백 실행          ← 여기
  3. 스타일 계산 (Recalculate Style)
  4. 레이아웃 (Layout)
  5. 페인트 (Paint)
  6. 합성 (Composite)       ← 실제 화면에 반영
```

즉 rAF 콜백은 **레이아웃과 페인트가 일어나기 직전**에 실행됩니다. 이 콜백 안에서 DOM 스타일을 바꾸면 그 변경 사항이 바로 이어지는 레이아웃/페인트 단계에 반영되므로, 사용자 눈에는 끊김 없이 자연스러운 애니메이션으로 보입니다. rAF와 이벤트 루프의 타이밍 순서(마이크로태스크 이후, 매크로태스크 이전)는 [JavaScript 이벤트 루프](/post/frontend/javascript/event-loop) 글에서 다뤘으니 여기서는 렌더링 파이프라인 관점만 짚었습니다.

---

## 델타 타임(Delta Time)을 쓰지 않으면 생기는 문제

콜백에 전달되는 타임스탬프를 무시하고 매 프레임 고정된 값만큼 움직이면, 애니메이션 속도가 디스플레이 주사율에 따라 달라지는 문제가 생깁니다.

```javascript
// ❌ 주사율에 따라 속도가 달라짐
let x = 0;
function badAnimate() {
  x += 2; // 60Hz 화면에서는 초당 120px, 120Hz 화면에서는 초당 240px로 2배 빨라짐
  box.style.transform = `translateX(${x}px)`;
  requestAnimationFrame(badAnimate);
}
```

```javascript
// ✅ 경과 시간(delta time)을 기준으로 이동량을 계산 — 주사율과 무관하게 일정한 속도
let lastTime = null;
const speedPerSecond = 120; // 초당 120px

function goodAnimate(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  const deltaSeconds = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  x += speedPerSecond * deltaSeconds;
  box.style.transform = `translateX(${x}px)`;
  requestAnimationFrame(goodAnimate);
}
```

프레임마다 "고정된 만큼 이동"이 아니라 "경과 시간에 비례해서 이동"하도록 계산해야, 60Hz든 120Hz든 저사양 기기에서 프레임이 드문드문 떨어지든 동일한 속도로 보입니다. 게임 루프나 물리 시뮬레이션에서는 필수적인 패턴입니다.

---

## 화면 밖(백그라운드 탭)에서는 멈춘다

브라우저는 배터리/CPU를 아끼기 위해 **탭이 보이지 않는 동안 rAF 콜백 실행을 완전히 멈춥니다.** 탭이 다시 보이면 그제서야 재개됩니다. `setInterval`은 이런 상황에서도 계속 실행되지만(다만 브라우저가 1초 간격 정도로 느리게 스로틀링합니다), rAF는 아예 실행 자체가 멈춘다는 점이 다릅니다.

```javascript
// 탭이 백그라운드로 가면 이 루프는 스스로 멈춘다
function animate(timestamp) {
  updatePosition(timestamp);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

이는 대부분의 경우 장점입니다. 보이지도 않는 애니메이션 때문에 배터리를 소모할 필요가 없기 때문입니다. 다만 "탭이 백그라운드에 있는 동안에도 경과 시간을 정확히 추적해야 하는 로직"(예: 타이머, 스톱워치)이라면 rAF에만 의존하면 안 되고, 실제 시계 시간(`Date.now()`)이나 `visibilitychange` 이벤트로 별도 보정이 필요합니다.

---

## React에서 쓸 때 — 클린업을 반드시 챙긴다

컴포넌트 안에서 rAF 루프를 시작했다면, 언마운트 시 반드시 `cancelAnimationFrame`으로 정리해야 합니다. 그러지 않으면 이미 사라진 컴포넌트의 DOM을 계속 참조하려는 콜백이 남아있게 됩니다.

```jsx
function useAnimationLoop(callback: (deltaSeconds: number) => void) {
  useEffect(() => {
    let frameId: number;
    let lastTime: number | null = null;

    function loop(timestamp: number) {
      if (lastTime !== null) {
        const deltaSeconds = (timestamp - lastTime) / 1000;
        callback(deltaSeconds);
      }
      lastTime = timestamp;
      frameId = requestAnimationFrame(loop);
    }

    frameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frameId); // 언마운트 시 반드시 취소
  }, [callback]);
}
```

클린업을 빼먹으면 콘솔에 "Can't perform a React state update on an unmounted component" 같은 경고가 뜨거나, 눈에 잘 띄지 않는 메모리 누수로 이어집니다. `setInterval`을 `useEffect`에서 쓸 때 `clearInterval`을 챙기는 것과 똑같은 이유입니다.

---

## 레이아웃 값을 읽어야 할 때 — 더블 rAF 패턴

DOM을 변경한 직후 그 변경이 실제로 반영된 레이아웃 값을 읽고 싶을 때가 있습니다(예: 요소를 화면에 붙인 직후 실제 높이를 측정해서 애니메이션 시작 값으로 쓰는 경우). rAF 콜백 안이라도 아직 브라우저가 스타일 계산/레이아웃을 완료하지 않았을 수 있어, 콜백을 두 번 중첩해서 확실히 다음 페인트 이후 값을 읽는 패턴이 씁니다.

```javascript
element.classList.add('enter'); // 클래스 추가로 스타일 변경

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    // 이 시점에는 위 스타일 변경이 실제로 레이아웃/페인트에 반영된 뒤이므로
    // getBoundingClientRect() 등으로 정확한 값을 읽을 수 있다
    const rect = element.getBoundingClientRect();
    element.classList.add('animate-to', rect);
  });
});
```

CSS 트랜지션을 트리거하기 직전에 강제로 한 프레임을 기다리게 만들어, "클래스를 추가하자마자 바로 다음 줄에서 다른 클래스를 추가"했을 때 브라우저가 두 변경을 하나로 묶어버려 트랜지션이 아예 발생하지 않는 문제를 피할 때도 같은 패턴이 쓰입니다.

---

## 언제 rAF 대신 CSS를 써야 하나

모든 애니메이션에 rAF가 필요한 건 아닙니다.

| 상황 | 적합한 도구 |
|---|---|
| 단순한 상태 전환(호버, 열기/닫기, 페이드) | CSS `transition`/`animation` — 브라우저가 자체적으로 최적화 |
| 여러 요소가 물리 법칙처럼 상호작용(스프링, 관성) | JS 애니메이션 라이브러리(Framer Motion 등) 또는 rAF 직접 사용 |
| 캔버스/WebGL 렌더링, 게임 루프 | rAF 필수 |
| 스크롤 위치에 따라 애니메이션 값을 세밀하게 계산 | rAF(또는 최신 브라우저의 CSS 스크롤 기반 애니메이션) |
| 정확한 시간 간격으로 반복 실행되어야 하는 로직(폴링 등) | `setInterval`(애초에 화면 그리기와 무관한 작업) |

CSS만으로 표현 가능한 애니메이션까지 JS로 직접 매 프레임 계산하면 메인 스레드 부담만 늘어납니다. rAF는 "JavaScript로 프레임마다 값을 직접 계산해야 하는 경우"를 위한 도구이지, 모든 애니메이션의 기본값은 아닙니다.

---

## 정리

- rAF는 "다음 화면을 그리기 직전"이라는 정확한 시점에 한 번 실행되는 콜백이며, 반복하려면 콜백 안에서 스스로 다시 호출해야 한다.
- 콜백에 전달되는 타임스탬프로 델타 타임을 계산해야 주사율과 무관하게 일정한 속도의 애니메이션을 만들 수 있다.
- 백그라운드 탭에서는 실행이 완전히 멈춘다 — 배터리 절약에는 유리하지만, 시간 추적 로직에는 별도 보정이 필요하다.
- React 등 컴포넌트 기반 환경에서는 언마운트 시 `cancelAnimationFrame`으로 반드시 정리해야 한다.
- 단순한 상태 전환은 CSS로 충분하다 — rAF는 JS로 프레임마다 값을 직접 제어해야 하는 경우에 쓴다.
