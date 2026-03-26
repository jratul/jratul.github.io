---
title: "PWA (Progressive Web App)"
order: 9
---

# PWA (Progressive Web App)

PWA는 웹 기술로 만들었지만 **네이티브 앱처럼 동작하는 웹 앱**입니다.
홈 화면에 설치할 수 있고, 오프라인에서도 동작하며, 푸시 알림도 받을 수 있습니다.

앱스토어 없이 웹 URL 하나로 배포하면서도 네이티브 앱 경험을 제공합니다.

---

## PWA란? 네이티브 앱과의 차이

```
기존 웹 앱:
- 브라우저에서만 실행
- 인터넷 연결 필수
- 홈 화면에 추가 불가
- 푸시 알림 불가

네이티브 앱 (iOS/Android):
- 앱스토어를 통해 설치
- 오프라인 동작
- 홈 화면 아이콘
- 푸시 알림
- 기기 API 접근 가능

PWA:
- URL 하나로 바로 설치 (앱스토어 불필요)
- 오프라인 동작 (Service Worker)
- 홈 화면 아이콘 (Web App Manifest)
- 푸시 알림 (Push API)
- 네이티브 앱과 거의 같은 경험!
```

### PWA의 3가지 핵심 기술

1. **Service Worker**: 오프라인 지원, 캐싱, 백그라운드 동작
2. **Web App Manifest**: 앱 이름, 아이콘, 색상 등 메타데이터
3. **HTTPS**: 보안 연결 필수

---

## Service Worker: 백그라운드 일꾼

Service Worker는 **브라우저 백그라운드에서 실행되는 특별한 JavaScript**입니다.
웹페이지와 별도로 실행되며, 네트워크 요청을 중간에서 가로채거나 캐싱할 수 있습니다.

```
[일반 웹 요청]
웹페이지 → 네트워크 → 서버

[Service Worker가 있을 때]
웹페이지 → Service Worker → 네트워크 → 서버
                ↕
              캐시 (오프라인 시 캐시에서 응답!)
```

### Service Worker 생명주기

```
1. 등록(Register): 페이지에서 SW 파일 등록
2. 설치(Install): SW 파일 다운로드 + 초기 캐싱
3. 활성화(Activate): 이전 SW 제거, 새 SW 가동
4. 실행(Running): 네트워크 요청 인터셉트, 캐시 관리
```

### 직접 Service Worker 작성 예시

```javascript
// public/sw.js (직접 구현 - 교육 목적)

const CACHE_NAME = 'my-app-v1'  // 캐시 이름 (버전 관리)
const CACHED_URLS = [
  '/',
  '/index.html',
  '/assets/main.js',    // 번들 파일
  '/assets/styles.css', // CSS 파일
]

// ── 설치 이벤트 ──────────────────────────────────────────
// SW가 처음 설치될 때 실행
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('캐시 열기 성공')
      return cache.addAll(CACHED_URLS)  // 초기 파일들을 캐싱
    })
  )
  // 바로 활성화 (이전 SW 대기 없이)
  self.skipWaiting()
})

// ── 활성화 이벤트 ───────────────────────────────────────
// 새 SW가 활성화될 때 실행 (이전 캐시 정리)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME) // 현재 버전이 아닌 캐시들
          .map(name => caches.delete(name))     // 삭제
      )
    })
  )
  // 즉시 모든 클라이언트에 적용
  self.clients.claim()
})

// ── Fetch 이벤트 ────────────────────────────────────────
// 모든 네트워크 요청을 인터셉트
self.addEventListener('fetch', event => {
  event.respondWith(
    // 캐시 우선 전략 (Cache First)
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse  // 캐시에 있으면 즉시 반환
      }

      // 캐시에 없으면 네트워크 요청
      return fetch(event.request).then(networkResponse => {
        // 응답을 캐시에 저장
        const responseClone = networkResponse.clone()  // Response는 한 번만 읽을 수 있어 복제
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone)
        })
        return networkResponse
      })
    }).catch(() => {
      // 오프라인 + 캐시 없음 → 오프라인 페이지 반환
      return caches.match('/offline.html')
    })
  )
})
```

```javascript
// src/main.tsx (또는 index.html)에서 SW 등록
if ('serviceWorker' in navigator) {  // Service Worker 지원 확인
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')           // SW 파일 등록
      .then(registration => {
        console.log('SW 등록 성공:', registration.scope)
      })
      .catch(err => {
        console.error('SW 등록 실패:', err)
      })
  })
}
```

---

## 캐싱 전략

Service Worker는 다양한 캐싱 전략을 구현할 수 있습니다.

### Cache First (캐시 우선)
```
캐시 확인 → 있으면 즉시 반환 → 없으면 네트워크
용도: 이미지, 폰트, 변경이 드문 리소스
장점: 빠름 (오프라인 지원)
단점: 최신 내용이 늦게 반영
```

### Network First (네트워크 우선)
```
네트워크 요청 → 실패 시 캐시 반환
용도: API 데이터, 자주 바뀌는 콘텐츠
장점: 항상 최신 데이터
단점: 오프라인 시 느림
```

### Stale While Revalidate (캐시 반환 후 업데이트)
```
캐시 즉시 반환 → 백그라운드에서 네트워크 요청 → 캐시 업데이트
용도: 뉴스 피드, 소셜 미디어
장점: 빠름 + 곧 최신 데이터
단점: 처음엔 구버전 데이터 노출
```

---

## Web App Manifest: 앱처럼 보이게

`manifest.json`은 앱의 이름, 아이콘, 색상 등을 정의합니다.
이것이 있어야 브라우저가 "홈 화면에 추가" 기능을 제공합니다.

```json
// public/manifest.json
{
  "name": "나의 앱",                   // 앱 전체 이름 (설치 화면)
  "short_name": "앱",                  // 짧은 이름 (홈 화면 아이콘 아래)
  "description": "유용한 웹 앱입니다", // 앱 설명

  "start_url": "/",                    // 앱 시작 URL
  "scope": "/",                        // 앱 범위 (이 URL 이외는 일반 브라우저로)
  "display": "standalone",             // 화면 모드
  // "standalone": 주소 표시줄 없이 앱처럼 표시
  // "minimal-ui": 최소한의 브라우저 UI 표시
  // "fullscreen": 전체 화면
  // "browser": 일반 브라우저 모드

  "orientation": "portrait",          // 화면 방향 (portrait, landscape, any)

  "theme_color": "#6366f1",           // 상태바 색상 (모바일)
  "background_color": "#0a0a1f",      // 스플래시 화면 배경색

  "icons": [
    // 다양한 크기의 아이콘 (앱스토어처럼!)
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"  // 안드로이드 적응형 아이콘
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],

  "screenshots": [
    // 앱스토어처럼 스크린샷 표시 (선택사항)
    {
      "src": "/screenshots/home.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"  // desktop
    }
  ],

  "categories": ["productivity", "utilities"], // 앱 카테고리
  "lang": "ko"                                  // 언어
}
```

```html
<!-- index.html에 manifest 연결 -->
<head>
  <link rel="manifest" href="/manifest.json" />
  <!-- iOS Safari는 manifest를 완전히 지원하지 않아 별도 메타 태그 필요 -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="나의 앱" />
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
  <!-- 테마 색상 -->
  <meta name="theme-color" content="#6366f1" />
</head>
```

---

## Workbox로 Service Worker 쉽게 구현

`Workbox`는 구글이 만든 Service Worker 라이브러리입니다.
복잡한 캐싱 전략을 몇 줄로 구현할 수 있습니다.

```bash
npm install -D workbox-window
```

```javascript
// public/sw.js (Workbox 사용)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js')

const { registerRoute } = workbox.routing
const { CacheFirst, NetworkFirst, StaleWhileRevalidate } = workbox.strategies
const { ExpirationPlugin } = workbox.expiration
const { CacheableResponsePlugin } = workbox.cacheableResponse

// 이미지: Cache First + 30일 만료
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,           // 최대 60개 이미지 캐싱
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],       // 성공적인 응답만 캐싱
      }),
    ],
  })
)

// API 요청: Network First (최신 데이터 우선)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60,    // 5분 캐싱
      }),
    ],
  })
)

// JS/CSS: Stale While Revalidate
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
)

// 오프라인 폴백 페이지
workbox.routing.setCatchHandler(({ event }) => {
  if (event.request.destination === 'document') {
    return caches.match('/offline.html')
  }
  return Response.error()
})
```

---

## Vite PWA Plugin — 한 번에 설정

`vite-plugin-pwa`는 Vite 프로젝트를 PWA로 만드는 가장 쉬운 방법입니다.

```bash
npm install -D vite-plugin-pwa
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // SW 업데이트 전략
      registerType: 'autoUpdate',
      // 'autoUpdate': 새 버전 배포 시 자동 업데이트
      // 'prompt': 사용자에게 업데이트 여부 묻기

      // 개발 환경에서도 SW 활성화 (기본값: false)
      devOptions: {
        enabled: true,
      },

      // 자동으로 캐싱할 파일 패턴
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        // 런타임 캐싱 규칙
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.myapp\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60, // 1시간
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1년
              },
            },
          },
        ],
      },

      // manifest.json 설정 (자동 생성)
      manifest: {
        name: '나의 앱',
        short_name: '앱',
        description: '유용한 웹 앱',
        theme_color: '#6366f1',
        background_color: '#0a0a1f',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
```

```typescript
// src/main.tsx - SW 업데이트 처리
import { registerSW } from 'virtual:pwa-register'

// 새 버전 알림 처리 (registerType: 'prompt' 사용 시)
const updateSW = registerSW({
  onNeedRefresh() {
    // 새 버전 있음 → 사용자에게 알림
    if (confirm('새 버전이 있습니다. 업데이트하시겠습니까?')) {
      updateSW(true)  // true: 즉시 업데이트
    }
  },
  onOfflineReady() {
    console.log('오프라인 준비 완료!')
    toast('오프라인에서도 사용 가능합니다')
  },
})
```

---

## Push Notification

```typescript
// 알림 권한 요청
async function requestNotificationPermission() {
  const permission = await Notification.requestPermission()

  if (permission === 'granted') {
    console.log('알림 권한 허용됨')
    // 서버에 구독 정보 전송
    await subscribeToPush()
  } else {
    console.log('알림 권한 거부됨')
  }
}

// Push 구독
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,              // 모든 푸시는 사용자에게 표시
    applicationServerKey: VAPID_PUBLIC_KEY, // VAPID 키 (서버에서 발급)
  })

  // 구독 정보를 서버에 저장
  await fetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
    headers: { 'Content-Type': 'application/json' },
  })
}

// Service Worker에서 푸시 수신
self.addEventListener('push', event => {
  const data = event.data?.json()

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,                // 알림 내용
      icon: '/icons/icon-192x192.png', // 알림 아이콘
      badge: '/icons/badge-72x72.png', // 상태바 배지 아이콘
      data: { url: data.url },        // 클릭 시 이동할 URL
      actions: [                       // 알림 버튼 (선택사항)
        { action: 'open', title: '열기' },
        { action: 'dismiss', title: '닫기' },
      ],
    })
  )
})

// 알림 클릭 처리
self.addEventListener('notificationclick', event => {
  event.notification.close()

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    )
  }
})
```

---

## PWA 설치 프롬프트 커스터마이징

브라우저 기본 "홈 화면에 추가" 배너 대신 커스텀 UI를 만들 수 있습니다.

```typescript
// src/hooks/usePWAInstall.ts
import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()  // 브라우저 기본 배너 방지
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()  // 설치 다이얼로그 표시
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('앱 설치 완료!')
    }
    setDeferredPrompt(null)
    setIsInstallable(false)
  }

  return { isInstallable, handleInstall }
}

// 사용 예
function InstallBanner() {
  const { isInstallable, handleInstall } = usePWAInstall()

  if (!isInstallable) return null

  return (
    <div className="install-banner">
      <p>앱을 설치하면 오프라인에서도 사용할 수 있어요!</p>
      <button onClick={handleInstall}>홈 화면에 추가</button>
    </div>
  )
}
```

---

## 흔한 실수들

### 실수 1: HTTPS 없이 PWA 개발

```
Service Worker는 HTTPS 또는 localhost에서만 동작합니다.
http://mysite.com → Service Worker 등록 실패!
https://mysite.com → 정상 동작

개발 환경: localhost는 예외적으로 허용
배포 환경: 반드시 HTTPS 필요
```

### 실수 2: manifest.json 링크 누락

```html
<!-- ❌ manifest 없으면 "홈 화면에 추가" 기능 없음 -->
<head>
  <title>내 앱</title>
</head>

<!-- ✅ 반드시 링크 추가 -->
<head>
  <link rel="manifest" href="/manifest.json" />
</head>
```

### 실수 3: 오래된 Service Worker로 인한 캐시 문제

```javascript
// ❌ 캐시 이름을 고정하면 업데이트 시 구버전 캐시가 남음
const CACHE_NAME = 'my-cache'  // 항상 같은 이름

// ✅ 버전 번호 포함
const CACHE_NAME = 'my-cache-v2'  // 버전 업 시 이름 변경
// activate 이벤트에서 이전 버전 캐시 삭제 필수
```

---

## 정리

PWA의 핵심:

1. **Service Worker**: 오프라인 지원, 캐싱, 푸시 알림의 기반
2. **Web App Manifest**: 앱처럼 설치되는 메타데이터
3. **HTTPS**: 보안 연결 필수

실제 프로젝트에서는 `vite-plugin-pwa`를 사용하면 복잡한 설정 없이 바로 PWA를 만들 수 있습니다.
처음에는 Workbox 없이 직접 구현하면서 개념을 익히고,
그 다음 라이브러리를 사용하면 훨씬 깊이 있게 이해됩니다.
