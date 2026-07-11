---
title: "Vercel 배포 프로세스와 알아야 할 개념"
date: "2026-07-11"
tags: ["vercel", "deployment", "nextjs", "edge", "serverless", "devops"]
excerpt: "git push 한 번으로 배포되는 것처럼 보이지만, 그 뒤에서 Preview Deployment·Edge Network·서버리스 함수가 어떻게 맞물리는지 정리합니다."
---

# Vercel 배포 프로세스와 알아야 할 개념

Vercel은 Next.js를 만든 회사가 운영하는 프론트엔드 클라우드 플랫폼입니다. `git push`만
하면 배포되는 것처럼 보이지만, 그 뒤에서는 빌드·Preview 배포·Edge Network·서버리스
함수 배포가 자동으로 맞물려 돌아갑니다. 이 흐름을 알아야 왜 어떤 배포는 몇 초 만에
끝나고, 왜 API 라우트만 따로 리전을 설정할 수 있는지 이해할 수 있습니다.

---

## 배포 프로세스 전체 흐름

```
git push
   ↓
[1] Vercel이 webhook으로 push 감지
   ↓
[2] 빌드 (npm install → build command 실행)
   ↓
[3] 산출물 분류
   ├─ 정적 파일(HTML/CSS/JS/이미지) → Edge Network(CDN)에 업로드
   └─ 서버 코드(API Route 등)      → 서버리스/엣지 함수로 배포
   ↓
[4] 배포 URL 생성
   ├─ main 브랜치           → Production 도메인
   └─ 그 외 브랜치/PR        → Preview 고유 URL
```

브랜치마다, 심지어 커밋마다 배포 결과가 별도 URL로 남습니다 — 배포가 실패해도 기존
프로덕션은 그대로 서비스되고, 새 배포가 성공한 뒤에야 트래픽이 전환됩니다(무중단 배포).

---

## Preview Deployments

`main`이 아닌 브랜치에 push하거나 PR을 열면, 그 커밋 전용 URL이 자동으로 생성됩니다.

```
main 브랜치           → https://my-app.vercel.app (Production)
feature/new-header    → https://my-app-git-feature-new-header-team.vercel.app
PR #42                → https://my-app-abc123.vercel.app (커밋마다 고유)
```

PR 화면에 이 URL이 자동으로 코멘트로 달리기 때문에, 코드 리뷰어가 로컬에서 브랜치를
받아 실행하지 않고 브라우저에서 바로 실제 동작을 확인할 수 있습니다. Preview
배포끼리는 완전히 격리되어 있어서, 여러 PR이 동시에 열려 있어도 서로 영향을 주지
않습니다.

---

## 환경 변수: 세 가지 환경으로 분리

Vercel은 환경 변수를 **Production / Preview / Development** 세 가지로 나눠서 관리합니다.
같은 이름의 변수라도 환경마다 다른 값을 넣을 수 있습니다.

```
DATABASE_URL
  Production  → postgres://prod-db.example.com/app
  Preview     → postgres://staging-db.example.com/app
  Development → postgres://localhost:5432/app
```

이 덕분에 Preview 배포는 자동으로 스테이징 DB를 바라보게 하고, Production만 실제
운영 DB에 연결하는 식의 분리가 별도 설정 파일 없이 대시보드에서 바로 가능합니다.

---

## Edge Network (CDN)

정적으로 생성된 파일(HTML, CSS, JS, 이미지)은 전 세계에 분산된 엣지 서버에 캐싱되어,
사용자와 지리적으로 가장 가까운 서버에서 응답합니다. 원본 서버(origin)까지 요청이
가지 않으므로 지연이 크게 줄어듭니다.

```
사용자(서울) → 서울 엣지 서버(캐시 hit) → 즉시 응답
사용자(뉴욕) → 뉴욕 엣지 서버(캐시 hit) → 즉시 응답
```

정적 자산은 배포 시점에 이미 전역에 복제되므로, 별도 CDN 설정 없이 이 이점을
그대로 얻습니다.

---

## Serverless Functions vs Edge Functions

API 라우트나 서버 코드는 두 가지 실행 환경 중 하나로 배포됩니다. 이름이 비슷하지만
동작 방식이 다릅니다.

| | Serverless Functions | Edge Functions |
|---|---|---|
| 실행 환경 | Node.js 런타임(컨테이너, AWS Lambda 기반) | V8 isolate(엣지 서버에서 직접 실행) |
| 실행 위치 | 지정한 특정 리전 하나 | 요청과 가장 가까운 엣지 |
| Cold Start | 상대적으로 느림(컨테이너 기동) | 매우 빠름(isolate는 컨테이너보다 훨씬 가벼움) |
| 사용 가능 API | Node.js 전체 API | 웹 표준 API 위주(Fetch, Web Crypto 등, Node API 일부 제한) |
| 적합한 작업 | DB 커넥션 풀링, 무거운 연산, 파일시스템 접근 | 인증 검증, 리다이렉트, A/B 테스트, 헤더 조작 |

Next.js에서는 API Route나 미들웨어에 `export const runtime = 'edge'`처럼 런타임을
명시해 둘 중 하나를 선택합니다. DB 커넥션처럼 Node 전용 라이브러리에 의존하면
Serverless Function을, 매 요청마다 빠르게 실행돼야 하는 가벼운 로직(인증 체크, 지역별
리다이렉트)은 Edge Function을 선택하는 식입니다.

---

## ISR (Incremental Static Regeneration)

Next.js와 Vercel이 함께 지원하는 기능으로, 정적 페이지를 빌드 타임에 한 번만 만드는 게
아니라 **일정 주기로 백그라운드에서 재생성**합니다.

```
[정적 페이지 요청]
    ↓
캐시된 페이지를 즉시 반환 (사용자는 대기 없음)
    ↓
지정한 시간(revalidate)이 지났으면
백그라운드에서 새 버전을 조용히 생성
    ↓
다음 요청부터 새 버전 제공
```

완전한 정적 생성(SSG)의 속도와, 서버 사이드 렌더링(SSR)의 최신 데이터 반영을 절충한
방식입니다. 상품 상세 페이지처럼 자주 안 바뀌지만 가끔 갱신되는 콘텐츠에 적합합니다.

---

## `vercel.json`

빌드/라우팅 동작을 세밀하게 제어할 때 프로젝트 루트에 두는 설정 파일입니다. React
Router 같은 클라이언트 사이드 라우팅 SPA를 배포할 때는 이 설정이 사실상 필수입니다.

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

`rewrites`가 없으면 `/about`처럼 클라이언트 라우터가 처리하는 경로로 직접
접근(새로고침, URL 직접 입력)했을 때 서버가 실제 파일을 찾지 못해 404가 납니다. 위
설정은 어떤 경로로 요청이 와도 `index.html`을 돌려주고, 그 안의 JS 라우터가 나머지를
처리하게 만듭니다. Next.js는 파일 기반 라우팅을 자체적으로 처리하므로 이 설정이
필요 없습니다.

이 외에도 `redirects`(영구/임시 리다이렉트), `headers`(캐시 정책, 보안 헤더),
`functions`(함수별 리전·메모리 설정) 등을 같은 파일에서 지정할 수 있습니다.

---

## 빌드 캐시

같은 프로젝트를 다시 배포할 때, `node_modules`나 프레임워크별 빌드 캐시(예: Next.js의
`.next/cache`)를 이전 배포에서 재사용해 빌드 시간을 단축합니다. `package.json`의
의존성이 바뀌지 않았다면 `npm install` 단계가 크게 빨라지는 식입니다. 캐시가 꼬여서
이상한 빌드 결과가 나올 때는 대시보드에서 캐시를 지우고 다시 빌드할 수 있습니다.

---

## 롤백

새 배포가 문제를 일으키면, 이전에 성공했던 배포를 그대로 Production으로 다시
지정하는 것만으로 즉시 롤백됩니다. 재빌드가 필요 없습니다 — 이전 배포의 산출물이
이미 Edge Network에 남아있는 상태이므로, 트래픽 전환만 일어나 수초 내에 이전 상태로
복구됩니다.

---

## 실제 흐름 예시

```
1. feature/checkout 브랜치에서 작업, push
   → Preview URL 생성, 팀원이 리뷰하며 실제 동작 확인

2. PR을 main에 머지
   → main 빌드 트리거, 성공 시 Production 도메인에 반영
   → 배포 URL은 그대로 유지되고 내용만 원자적으로 교체

3. 배포 직후 에러 급증 확인
   → 대시보드에서 직전 배포로 즉시 롤백 (재빌드 없음)

4. 원인 파악 후 수정 커밋 push
   → 새 Preview로 먼저 검증 → 다시 main 머지
```
