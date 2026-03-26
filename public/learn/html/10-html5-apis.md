---
title: "HTML5 Web API"
order: 10
---

## HTML5 Web API란?

HTML5부터 브라우저가 제공하는 다양한 **내장 API(Application Programming Interface)**가 추가되었습니다.
이 API들을 활용하면 플러그인 없이도 강력한 기능을 구현할 수 있습니다.

JavaScript로 접근하며, 대부분 `window` 또는 `navigator` 객체를 통해 사용합니다.

---

## Web Storage — 브라우저에 데이터 저장

### localStorage — 영구 저장

브라우저를 닫아도 데이터가 유지됩니다.

```javascript
// 데이터 저장 (문자열만 저장 가능)
localStorage.setItem('username', '홍길동');
localStorage.setItem('theme', 'dark');

// 객체/배열은 JSON으로 변환
const settings = { fontSize: 16, language: 'ko' };
localStorage.setItem('settings', JSON.stringify(settings));

// 데이터 읽기
const username = localStorage.getItem('username');  // '홍길동'

// 객체 복원
const savedSettings = JSON.parse(localStorage.getItem('settings'));

// 특정 데이터 삭제
localStorage.removeItem('theme');

// 모든 데이터 삭제
localStorage.clear();

// 저장된 항목 수
console.log(localStorage.length);  // 2
```

### sessionStorage — 세션 저장

탭/창을 닫으면 데이터가 삭제됩니다. 같은 탭 내에서만 공유됩니다.

```javascript
// 사용법은 localStorage와 동일
sessionStorage.setItem('cartItems', JSON.stringify([1, 2, 3]));
const cart = JSON.parse(sessionStorage.getItem('cartItems'));

sessionStorage.removeItem('cartItems');
```

### localStorage vs sessionStorage vs Cookie

| | localStorage | sessionStorage | Cookie |
|--|--|--|--|
| 만료 | 없음 (영구) | 탭 닫으면 삭제 | 설정 가능 |
| 용량 | 5~10MB | 5~10MB | 4KB |
| 서버 전송 | ❌ | ❌ | ✅ (자동) |
| 접근 | JS | JS | JS + 서버 |

---

## Geolocation API — 위치 정보

```javascript
// 위치 권한 요청 및 현재 위치 가져오기
if ('geolocation' in navigator) {
  // 브라우저가 Geolocation을 지원하는 경우
  navigator.geolocation.getCurrentPosition(
    (position) => {
      // 성공 콜백
      const lat = position.coords.latitude;   // 위도
      const lon = position.coords.longitude;  // 경도
      const accuracy = position.coords.accuracy;  // 정확도(미터)

      console.log(`위도: ${lat}, 경도: ${lon}`);
      console.log(`정확도: ${accuracy}m`);

      // 구글 지도 링크
      const mapsUrl = `https://maps.google.com?q=${lat},${lon}`;
    },
    (error) => {
      // 실패 콜백
      switch(error.code) {
        case error.PERMISSION_DENIED:
          console.log('위치 권한이 거부되었습니다.');
          break;
        case error.POSITION_UNAVAILABLE:
          console.log('위치 정보를 사용할 수 없습니다.');
          break;
        case error.TIMEOUT:
          console.log('위치 요청 시간이 초과되었습니다.');
          break;
      }
    },
    {
      // 옵션
      enableHighAccuracy: true,  // 높은 정확도 (GPS 사용, 배터리 소모 큼)
      timeout: 10000,            // 10초 타임아웃
      maximumAge: 60000,         // 1분 이내 캐시된 위치 사용 가능
    }
  );
} else {
  console.log('이 브라우저는 위치 정보를 지원하지 않습니다.');
}

// 실시간 위치 추적
const watchId = navigator.geolocation.watchPosition(
  (position) => {
    console.log('위치 변경:', position.coords.latitude, position.coords.longitude);
  },
  (error) => console.error(error)
);

// 추적 중지
navigator.geolocation.clearWatch(watchId);
```

---

## Drag & Drop API

```html
<!-- 드래그 가능한 요소 -->
<div
  draggable="true"
  id="draggable-item"
  ondragstart="handleDragStart(event)"
>
  나를 드래그하세요
</div>

<!-- 드롭 영역 -->
<div
  id="drop-zone"
  ondragover="handleDragOver(event)"
  ondrop="handleDrop(event)"
  ondragleave="handleDragLeave(event)"
>
  여기에 놓으세요
</div>
```

```javascript
function handleDragStart(event) {
  // 드래그 시작 시 전달할 데이터 설정
  event.dataTransfer.setData('text/plain', event.target.id);
  event.dataTransfer.effectAllowed = 'move';  // 이동 효과
}

function handleDragOver(event) {
  event.preventDefault();  // 기본 동작 막기 (드롭 허용하려면 필수!)
  event.dataTransfer.dropEffect = 'move';
  event.target.classList.add('drag-over');  // 시각적 피드백
}

function handleDragLeave(event) {
  event.target.classList.remove('drag-over');
}

function handleDrop(event) {
  event.preventDefault();
  const itemId = event.dataTransfer.getData('text/plain');
  const item = document.getElementById(itemId);

  event.target.appendChild(item);  // 드롭 영역으로 이동
  event.target.classList.remove('drag-over');
}
```

---

## File API — 파일 읽기

```html
<input type="file" id="file-input" accept="image/*" multiple />
<img id="preview" alt="미리보기" />
```

```javascript
const fileInput = document.getElementById('file-input');
const preview = document.getElementById('preview');

fileInput.addEventListener('change', (event) => {
  const files = event.target.files;  // FileList 객체

  // 첫 번째 파일 읽기
  const file = files[0];
  console.log(`파일명: ${file.name}`);
  console.log(`크기: ${(file.size / 1024).toFixed(2)} KB`);
  console.log(`타입: ${file.type}`);

  // 이미지 미리보기
  const reader = new FileReader();

  reader.onload = (e) => {
    preview.src = e.target.result;  // base64 데이터 URL
  };

  reader.readAsDataURL(file);  // 파일을 base64로 읽기
  // reader.readAsText(file);  // 텍스트 파일 읽기
  // reader.readAsArrayBuffer(file);  // 바이너리 데이터 읽기
});

// 드래그 앤 드롭으로 파일 업로드
const dropZone = document.getElementById('drop-zone');

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  const files = e.dataTransfer.files;  // 드롭된 파일들

  [...files].forEach(file => {
    console.log(`드롭된 파일: ${file.name}`);
  });
});
```

---

## Notification API — 브라우저 알림

```javascript
// 알림 권한 요청
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('이 브라우저는 알림을 지원하지 않습니다.');
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === 'granted') {
    // 알림 표시
    const notification = new Notification('새 메시지', {
      body: '홍길동님이 메시지를 보냈습니다.',  // 알림 내용
      icon: '/notification-icon.png',          // 알림 아이콘
      badge: '/badge-icon.png',                // 뱃지 아이콘
      tag: 'message-1',                        // 같은 태그는 교체됨
      requireInteraction: false,               // true면 사용자가 닫을 때까지 유지
    });

    notification.onclick = () => {
      window.focus();  // 클릭 시 브라우저 포커스
      notification.close();
    };

    // 5초 후 자동 닫기
    setTimeout(() => notification.close(), 5000);

  } else {
    console.log('알림 권한이 거부되었습니다.');
  }
}
```

---

## History API — 브라우저 히스토리 제어

SPA(Single Page Application)에서 URL을 변경할 때 사용합니다.

```javascript
// 현재 상태 확인
console.log(history.length);  // 히스토리 개수
console.log(location.pathname);  // 현재 경로

// URL 변경 (페이지 이동 없이)
history.pushState(
  { page: 'about' },   // 상태 객체 (popstate 이벤트에서 사용)
  '소개 페이지',        // 제목 (대부분 브라우저에서 무시됨)
  '/about'             // 변경할 URL
);

// URL만 교체 (히스토리 추가 없이)
history.replaceState({ page: 'home' }, '홈', '/');

// 뒤로/앞으로 이동
history.back();    // 뒤로 가기
history.forward(); // 앞으로 가기
history.go(-2);    // 2페이지 뒤로

// 뒤로가기 버튼 감지
window.addEventListener('popstate', (event) => {
  console.log('URL 변경:', location.pathname);
  console.log('상태:', event.state);  // pushState의 상태 객체
  // 해당 URL에 맞는 콘텐츠 렌더링
});
```

---

## Intersection Observer — 스크롤 감지

요소가 화면에 보이는지 감지합니다. (무한 스크롤, 지연 로딩에 사용)

```javascript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // 요소가 화면에 보임
        entry.target.classList.add('visible');  // 애니메이션 추가
        observer.unobserve(entry.target);        // 한 번만 실행하려면 감시 중지
      }
    });
  },
  {
    threshold: 0.1,      // 10% 이상 보일 때 감지
    rootMargin: '0px 0px -50px 0px',  // 하단 50px 여유 (그 전에 감지)
  }
);

// 감시할 요소들 등록
document.querySelectorAll('.fade-in').forEach(el => {
  observer.observe(el);
});
```

```css
/* 초기 상태 (숨김) */
.fade-in {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

/* 화면에 보일 때 */
.fade-in.visible {
  opacity: 1;
  transform: translateY(0);
}
```

---

## Web Workers — 백그라운드 처리

무거운 연산을 메인 스레드와 분리하여 UI가 멈추지 않게 합니다.

```javascript
// main.js
const worker = new Worker('worker.js');

// 워커에 데이터 전송
worker.postMessage({ data: [1, 2, 3, 4, 5], task: 'sum' });

// 워커로부터 결과 수신
worker.onmessage = (event) => {
  console.log('결과:', event.data.result);
};

worker.onerror = (error) => {
  console.error('워커 오류:', error.message);
};
```

```javascript
// worker.js (별도 파일)
self.onmessage = (event) => {
  const { data, task } = event.data;

  if (task === 'sum') {
    // 무거운 연산 (메인 스레드 방해 없음)
    const result = data.reduce((acc, val) => acc + val, 0);

    // 결과를 메인 스레드로 전송
    self.postMessage({ result });
  }
};
```

---

## Clipboard API — 클립보드 제어

```javascript
// 클립보드에 복사
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('복사 완료!');
  } catch (err) {
    console.error('복사 실패:', err);
  }
}

// 클립보드에서 붙여넣기
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    console.log('붙여넣기:', text);
    return text;
  } catch (err) {
    console.error('붙여넣기 실패:', err);
  }
}

// 코드 복사 버튼 예시
document.querySelector('.copy-btn').addEventListener('click', async () => {
  const code = document.querySelector('pre code').textContent;
  await copyToClipboard(code);

  // 시각적 피드백
  event.target.textContent = '복사됨!';
  setTimeout(() => { event.target.textContent = '복사'; }, 2000);
});
```

---

## Page Visibility API — 탭 활성화 감지

사용자가 다른 탭으로 이동했는지 감지합니다.

```javascript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // 탭이 비활성화됨 (다른 탭으로 이동)
    console.log('탭 비활성화 — 영상 일시정지');
    video.pause();
  } else {
    // 탭이 다시 활성화됨
    console.log('탭 활성화 — 영상 재생');
    video.play();
  }
});

// 페이지 제목 변경 (채팅앱 등에서 사용)
let originalTitle = document.title;
let messageCount = 0;

document.addEventListener('visibilitychange', () => {
  if (document.hidden && messageCount > 0) {
    document.title = `(${messageCount}) 새 메시지 | ${originalTitle}`;
  } else {
    document.title = originalTitle;
    messageCount = 0;
  }
});
```

---

## 자주 하는 실수

**실수 1: localStorage에 객체 직접 저장**
```javascript
// 잘못된 예: [object Object]로 저장됨
const user = { name: '홍길동', age: 30 };
localStorage.setItem('user', user);
console.log(localStorage.getItem('user'));  // "[object Object]"

// 올바른 예: JSON 변환
localStorage.setItem('user', JSON.stringify(user));
const savedUser = JSON.parse(localStorage.getItem('user'));
```

**실수 2: Geolocation 권한 확인 없이 사용**
```javascript
// 잘못된 예: 오류 발생 시 처리 없음
navigator.geolocation.getCurrentPosition(pos => {
  console.log(pos.coords.latitude);
});

// 올바른 예: 지원 여부 확인 + 오류 처리
if ('geolocation' in navigator) {
  navigator.geolocation.getCurrentPosition(
    pos => console.log(pos.coords.latitude),
    err => console.error('위치 오류:', err.message)
  );
}
```

---

## 정리

- **Web Storage**: `localStorage`(영구) / `sessionStorage`(탭 유지)
- **Geolocation**: 사용자 위치 정보 (권한 필요)
- **Drag & Drop**: 드래그 인터랙션
- **File API**: 파일 읽기 및 미리보기
- **Notification API**: 브라우저 알림 (권한 필요)
- **History API**: URL 변경 없이 히스토리 관리 (SPA의 기반)
- **Intersection Observer**: 요소의 화면 노출 감지 (무한 스크롤)
- **Web Workers**: 백그라운드 연산 (UI 블로킹 방지)
- **Clipboard API**: 복사/붙여넣기
- **Page Visibility API**: 탭 활성화 상태 감지
