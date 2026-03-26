---
title: "브라우저 Web API"
order: 15
---

## 브라우저 Web API란?

브라우저는 자바스크립트 언어 외에도 **다양한 Web API**를 제공합니다.
이 API들을 사용하면 로컬 저장소, 위치 정보, 알림, 클립보드 등
**브라우저의 다양한 기능**을 활용할 수 있어요.

---

## 1. Web Storage (localStorage, sessionStorage)

웹 페이지에서 데이터를 **브라우저에 저장**하는 방법:

```javascript
// localStorage - 브라우저를 닫아도 유지됨
localStorage.setItem("username", "김철수");           // 저장
localStorage.setItem("settings", JSON.stringify({ theme: "dark" })); // 객체 저장

const username = localStorage.getItem("username");   // 가져오기
const settings = JSON.parse(localStorage.getItem("settings")); // 객체 가져오기

localStorage.removeItem("username");                 // 특정 항목 삭제
localStorage.clear();                                // 전체 삭제

// sessionStorage - 탭(세션)이 닫히면 삭제됨
sessionStorage.setItem("tempData", "임시 데이터");
const temp = sessionStorage.getItem("tempData");

// 유틸리티 함수로 감싸면 편리
const storage = {
  get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("저장소 저장 실패:", error);
    }
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};

// 사용
storage.set("user", { name: "철수", age: 25 });
const user = storage.get("user"); // { name: "철수", age: 25 }
```

> **localStorage vs sessionStorage vs Cookie**
> - `localStorage`: 영구 저장 (수동 삭제 필요)
> - `sessionStorage`: 탭/브라우저 닫으면 삭제
> - `Cookie`: 서버로 자동 전송됨, 만료일 설정 가능

---

## 2. Geolocation API

사용자의 **현재 위치**를 가져오는 API:

```javascript
// 현재 위치 한 번 가져오기
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저는 위치 정보를 지원하지 않습니다"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        resolve({ latitude, longitude, accuracy });
      },
      (error) => {
        // 에러 코드별 처리
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("위치 정보 접근이 거부되었습니다"));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("위치 정보를 사용할 수 없습니다"));
            break;
          case error.TIMEOUT:
            reject(new Error("위치 정보 요청 시간이 초과되었습니다"));
            break;
        }
      },
      {
        enableHighAccuracy: true, // 고정밀 위치 요청
        timeout: 10000,           // 10초 타임아웃
        maximumAge: 0,            // 캐시 사용 안 함
      }
    );
  });
}

// 사용
async function showMyLocation() {
  try {
    const { latitude, longitude } = await getCurrentLocation();
    console.log(`현재 위치: ${latitude}, ${longitude}`);

    // 지도 API에 좌표 전달 (예: 카카오맵, 구글맵)
    const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    window.open(mapUrl);
  } catch (error) {
    console.error(error.message);
  }
}

// 위치 실시간 추적
const watchId = navigator.geolocation.watchPosition(
  (position) => {
    console.log("위치 업데이트:", position.coords);
  },
  (error) => console.error(error)
);

// 추적 중지
navigator.geolocation.clearWatch(watchId);
```

---

## 3. Notification API

**브라우저 알림** (푸시 알림처럼 보이는 알림):

```javascript
// 알림 권한 요청
async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("이 브라우저는 알림을 지원하지 않습니다");
    return false;
  }

  if (Notification.permission === "granted") {
    return true; // 이미 허용됨
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

// 알림 보내기
async function sendNotification(title, options = {}) {
  const granted = await requestNotificationPermission();

  if (!granted) {
    console.log("알림 권한이 없습니다");
    return;
  }

  const notification = new Notification(title, {
    body: options.body || "",          // 알림 내용
    icon: options.icon || "/icon.png", // 아이콘
    badge: "/badge.png",               // 배지 아이콘
    tag: options.tag || "default",     // 같은 태그면 기존 알림 교체
  });

  // 알림 클릭 이벤트
  notification.onclick = () => {
    window.focus();        // 브라우저 창 포커스
    notification.close();  // 알림 닫기

    if (options.url) {
      window.location.href = options.url;
    }
  };

  // 자동 닫기 (5초 후)
  setTimeout(() => notification.close(), 5000);
}

// 사용
sendNotification("새 메시지!", {
  body: "김철수님이 메시지를 보냈습니다.",
  url: "/messages",
});
```

---

## 4. Clipboard API

**클립보드 복사/붙여넣기**:

```javascript
// 텍스트 복사
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log("클립보드에 복사됨!");
    return true;
  } catch (error) {
    console.error("복사 실패:", error);

    // 폴백: 예전 방식
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

// 클립보드에서 붙여넣기
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    console.log("클립보드 내용:", text);
    return text;
  } catch (error) {
    console.error("붙여넣기 실패:", error);
    return null;
  }
}

// 복사 버튼 구현
document.querySelectorAll(".copy-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const textToCopy = btn.dataset.text || btn.previousElementSibling.textContent;
    const success = await copyToClipboard(textToCopy);

    if (success) {
      // 버튼 텍스트 일시적으로 변경
      const originalText = btn.textContent;
      btn.textContent = "복사됨!";
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2000);
    }
  });
});
```

---

## 5. History API (SPA 라우팅)

브라우저 **뒤로가기/앞으로가기 기록** 조작:

```javascript
// 현재 URL 정보
console.log(window.location.href);      // 전체 URL
console.log(window.location.pathname);  // 경로 (/users/1)
console.log(window.location.search);    // 쿼리 (?page=2)
console.log(window.location.hash);      // 해시 (#section)

// pushState: URL 변경 (히스토리에 추가, 페이지 이동 없음)
history.pushState({ page: 1 }, "페이지 1", "/page1");

// replaceState: URL 변경 (히스토리 교체, 뒤로가기 불가)
history.replaceState({ page: 2 }, "페이지 2", "/page2");

// 뒤로/앞으로 이동
history.back();     // 뒤로
history.forward();  // 앞으로
history.go(-2);     // 2단계 뒤로
history.go(1);      // 1단계 앞으로

// popstate: 뒤로/앞으로 버튼 클릭 이벤트
window.addEventListener("popstate", (event) => {
  console.log("이동됨! 상태:", event.state);
  // SPA에서 라우팅 처리
  renderPage(window.location.pathname);
});

// 간단한 SPA 라우터 구현
const routes = {
  "/": () => renderHome(),
  "/about": () => renderAbout(),
  "/users": () => renderUsers(),
};

function navigate(path) {
  history.pushState({}, "", path);    // URL 변경
  const handler = routes[path];
  if (handler) {
    handler();                         // 해당 페이지 렌더링
  }
}

// 링크 클릭 처리
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-spa]"); // data-spa 속성 있는 링크만
  if (link) {
    e.preventDefault();              // 기본 이동 막기
    navigate(link.getAttribute("href")); // SPA 방식으로 이동
  }
});
```

---

## 6. Intersection Observer

요소가 **화면에 보이는지** 감지 (무한 스크롤, 지연 로딩):

```javascript
// Intersection Observer 생성
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // 요소가 화면에 들어왔을 때
        console.log("화면에 보임:", entry.target);
        entry.target.classList.add("visible");  // 애니메이션 클래스 추가

        // 한 번만 실행하고 관찰 중지
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.1,    // 10% 이상 보일 때 트리거
    rootMargin: "0px 0px -100px 0px", // 하단 100px 전에 미리 트리거
  }
);

// 모든 애니메이션 요소에 적용
document.querySelectorAll(".animate-on-scroll").forEach(el => {
  observer.observe(el);
});

// 이미지 지연 로딩 (Lazy Loading)
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;      // data-src → src로 변경 (실제 로딩)
      img.classList.remove("lazy");
      imageObserver.unobserve(img);
    }
  });
});

// data-src에 실제 이미지 URL 저장
document.querySelectorAll("img[data-src]").forEach(img => {
  imageObserver.observe(img);
});

// 무한 스크롤
const sentinel = document.getElementById("load-more-trigger");

const scrollObserver = new IntersectionObserver(async (entries) => {
  if (entries[0].isIntersecting) {
    await loadMoreItems(); // 더 많은 항목 로드
  }
});

scrollObserver.observe(sentinel);
```

---

## 7. URL과 URLSearchParams

URL을 쉽게 다루는 API:

```javascript
// URL 파싱
const url = new URL("https://example.com/posts?page=2&tag=react#section1");

console.log(url.origin);    // "https://example.com"
console.log(url.pathname);  // "/posts"
console.log(url.search);    // "?page=2&tag=react"
console.log(url.hash);      // "#section1"
console.log(url.host);      // "example.com"

// 쿼리 파라미터 다루기
const params = url.searchParams;

console.log(params.get("page"));    // "2"
console.log(params.get("tag"));     // "react"
console.log(params.has("sort"));    // false

// 파라미터 추가/수정/삭제
params.set("page", "3");            // 수정
params.append("category", "fe");    // 추가 (중복 허용)
params.delete("tag");               // 삭제

console.log(url.toString());
// "https://example.com/posts?page=3&category=fe#section1"

// 현재 URL의 파라미터 처리
const currentParams = new URLSearchParams(window.location.search);
const currentPage = parseInt(currentParams.get("page")) || 1;
const currentTag = currentParams.get("tag") || "";
```

---

## 8. Web Workers

무거운 작업을 **백그라운드 스레드**에서 실행:

```javascript
// worker.js (별도 파일)
self.addEventListener("message", (event) => {
  const { type, data } = event.data;

  if (type === "CALCULATE") {
    // 무거운 계산 (메인 스레드 블록 없음)
    const result = heavyCalculation(data);
    self.postMessage({ type: "RESULT", result });
  }
});

function heavyCalculation(n) {
  // 오래 걸리는 작업 시뮬레이션
  let result = 0;
  for (let i = 0; i < n; i++) {
    result += Math.sqrt(i);
  }
  return result;
}

// main.js (메인 스레드)
const worker = new Worker("./worker.js");

// 워커에 메시지 전송
worker.postMessage({ type: "CALCULATE", data: 1000000 });

// 워커로부터 결과 받기
worker.addEventListener("message", (event) => {
  const { type, result } = event.data;
  if (type === "RESULT") {
    console.log("계산 완료:", result);
  }
});

// 워커 에러 처리
worker.addEventListener("error", (error) => {
  console.error("워커 에러:", error.message);
});

// 워커 종료
// worker.terminate();
```

---

## 9. requestAnimationFrame

**부드러운 애니메이션**을 위한 API:

```javascript
// 기본 사용
function animate() {
  // 다음 프레임에 실행될 함수 예약 (보통 60fps = 16.7ms마다)
  requestAnimationFrame(animate);

  // 애니메이션 로직
  updatePositions();
  renderFrame();
}

requestAnimationFrame(animate); // 시작

// 실용 예시: 부드러운 스크롤
function smoothScrollTo(targetY, duration = 500) {
  const startY = window.scrollY;
  const distance = targetY - startY;
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1); // 0~1

    // Ease-in-out 함수
    const eased = progress < 0.5
      ? 2 * progress * progress
      : -1 + (4 - 2 * progress) * progress;

    window.scrollTo(0, startY + distance * eased);

    if (progress < 1) {
      requestAnimationFrame(step); // 아직 안 끝났으면 계속
    }
  }

  requestAnimationFrame(step);
}

// 사용
document.querySelector(".scroll-to-top").addEventListener("click", () => {
  smoothScrollTo(0, 600); // 0.6초 동안 맨 위로 스크롤
});
```

---

## 정리

| Web API | 용도 |
|---------|------|
| `localStorage` | 영구 데이터 저장 |
| `sessionStorage` | 세션 데이터 저장 |
| `Geolocation` | 현재 위치 정보 |
| `Notification` | 브라우저 알림 |
| `Clipboard` | 복사/붙여넣기 |
| `History API` | URL 조작 (SPA 라우팅) |
| `IntersectionObserver` | 요소 가시성 감지 |
| `URL / URLSearchParams` | URL 파싱/조작 |
| `Web Workers` | 백그라운드 작업 |
| `requestAnimationFrame` | 부드러운 애니메이션 |

브라우저 Web API를 활용하면 **네이티브 앱 수준의 기능**을 웹에서 구현할 수 있습니다.
실제 프로젝트에서 필요할 때마다 MDN 문서를 참고해서 사용해보세요!
