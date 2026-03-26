---
title: "CI/CD와 자동 배포"
order: 10
---

# CI/CD와 자동 배포

코드를 작성하고 나서 직접 서버에 올리거나 빌드 명령어를 매번 손으로 실행하는 건 귀찮고 실수하기 쉽습니다.
CI/CD는 이 과정을 자동화해서 "코드를 푸시하면 알아서 테스트하고 배포까지 해주는" 파이프라인입니다.

---

## 1. CI/CD 개념

### CI — Continuous Integration (지속적 통합)

**비유**: 팀 프로젝트에서 각자 작업한 내용을 매일 합쳐보고 충돌이 없는지 확인하는 것.

CI는 코드를 저장소에 푸시할 때마다 자동으로:
- 코드 스타일 검사 (lint)
- 테스트 실행
- 빌드 가능 여부 확인

을 수행합니다. 문제가 있으면 즉시 알려줘서 빨리 고칠 수 있게 합니다.

### CD — Continuous Deployment / Delivery (지속적 배포)

**비유**: 식당에서 음식이 완성되면 바로 손님 테이블로 가져다주는 것.

CD는 CI가 성공하면 자동으로:
- 스테이징 서버에 배포 (Continuous Delivery)
- 프로덕션 서버에 배포 (Continuous Deployment)

를 수행합니다.

```
개발자가 코드 푸시
       ↓
  CI 시작 (자동)
  ├── lint 검사
  ├── 테스트 실행
  └── 빌드 확인
       ↓
  모두 통과 ✅
       ↓
  CD 시작 (자동)
  └── 서버에 배포
       ↓
  사용자가 새 버전 사용
```

### 왜 CI/CD가 필요한가?

| 수동 배포 | CI/CD 자동화 |
|-----------|-------------|
| 매번 명령어 직접 실행 | 푸시만 하면 자동 실행 |
| 테스트 까먹기 쉬움 | 테스트 강제 실행 |
| 팀원마다 환경 다를 수 있음 | 동일한 환경에서 실행 |
| 배포 중 실수 가능 | 자동화로 실수 방지 |

---

## 2. GitHub Actions 기초

GitHub Actions는 GitHub에서 제공하는 CI/CD 도구입니다.
저장소에 `.github/workflows/` 폴더를 만들고 YAML 파일을 작성하면 됩니다.

### 기본 파일 구조

```yaml
# .github/workflows/ci.yml

name: CI  # 워크플로우 이름 (GitHub UI에 표시됨)

on:  # 언제 실행할지 트리거 설정
  push:
    branches: [main]     # main 브랜치에 푸시될 때
  pull_request:
    branches: [main]     # main 브랜치로 PR이 열릴 때

jobs:  # 실행할 작업들
  build:                 # 작업 이름 (임의로 지정)
    runs-on: ubuntu-latest  # 어떤 OS에서 실행할지

    steps:               # 순서대로 실행할 단계들
      - name: 코드 체크아웃  # 단계 이름
        uses: actions/checkout@v4  # 미리 만들어진 액션 사용

      - name: Node.js 설정
        uses: actions/setup-node@v4
        with:
          node-version: '20'  # Node.js 버전 지정

      - name: 의존성 설치
        run: npm ci  # 실행할 명령어

      - name: 빌드
        run: npm run build
```

### `on` — 트리거 설정

```yaml
on:
  # 특정 브랜치에 푸시될 때
  push:
    branches: [main, develop]

  # PR이 열리거나 업데이트될 때
  pull_request:
    branches: [main]

  # 매일 자정에 실행 (cron 표현식)
  schedule:
    - cron: '0 0 * * *'

  # 수동으로 실행하고 싶을 때
  workflow_dispatch:
```

### `jobs` — 작업 구성

```yaml
jobs:
  # 여러 job을 정의할 수 있습니다
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    needs: lint  # lint job이 성공해야 실행됨
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test

  build:
    runs-on: ubuntu-latest
    needs: test  # test job이 성공해야 실행됨
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
```

### `steps` — 단계 구성

각 step은 `uses` (미리 만들어진 액션) 또는 `run` (쉘 명령어) 중 하나를 사용합니다.

```yaml
steps:
  # uses: 미리 만들어진 액션 사용
  - name: 코드 가져오기
    uses: actions/checkout@v4  # GitHub에서 코드를 runner에 복사

  # run: 직접 명령어 실행
  - name: 의존성 설치
    run: npm ci

  # 여러 명령어는 | 를 사용
  - name: 빌드 및 확인
    run: |
      npm run build
      echo "빌드 완료!"
      ls -la dist/

  # 환경 변수 설정
  - name: 환경 변수가 필요한 단계
    run: npm run build
    env:
      VITE_API_URL: ${{ secrets.API_URL }}  # GitHub Secrets에서 가져옴
```

---

## 3. 프론트엔드 CI 파이프라인 예시

실제 프론트엔드 프로젝트에서 사용하는 CI 파이프라인입니다.

### 기본 CI 파이프라인 (lint → test → build)

```yaml
# .github/workflows/ci.yml

name: Frontend CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest

    steps:
      # 1. 저장소 코드를 runner 환경에 복사
      - name: Checkout
        uses: actions/checkout@v4

      # 2. Node.js 환경 설정
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'  # npm 캐시 활성화 (의존성 설치 속도 향상)

      # 3. 의존성 설치
      # npm install 대신 npm ci를 사용: package-lock.json을 엄격히 따름
      - name: Install dependencies
        run: npm ci

      # 4. 코드 스타일 검사
      - name: Lint
        run: npm run lint

      # 5. 타입 검사 (TypeScript 프로젝트)
      - name: Type check
        run: npm run type-check

      # 6. 테스트 실행
      - name: Test
        run: npm test -- --run  # Vitest의 경우 --run으로 watch 모드 비활성화

      # 7. 프로덕션 빌드
      - name: Build
        run: npm run build

      # 8. 빌드 결과물 확인 (선택사항)
      - name: Check build output
        run: |
          echo "빌드 결과물 크기:"
          du -sh dist/
          echo "빌드 파일 목록:"
          ls -la dist/
```

### 캐시 활용으로 속도 개선

`node_modules`를 캐시해두면 매번 `npm ci`를 빠르게 실행할 수 있습니다.

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Setup Node.js with cache
    uses: actions/setup-node@v4
    with:
      node-version: '20'
      cache: 'npm'  # package-lock.json 기반으로 캐시

  # 캐시가 있으면 설치 건너뜀, 없으면 새로 설치
  - name: Install dependencies
    run: npm ci
```

### 매트릭스 전략 — 여러 Node 버전에서 테스트

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20, 22]  # 세 버전 모두에서 테스트

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}  # 매트릭스 변수 사용
          cache: 'npm'

      - run: npm ci
      - run: npm test -- --run
```

---

## 4. GitHub Pages 자동 배포 예시

Vite로 만든 React 앱을 GitHub Pages에 자동 배포하는 예시입니다.

### vite.config.ts 설정 먼저 확인

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // username.github.io 형태라면 base: '/'
  // username.github.io/repo-name 형태라면 base: '/repo-name/'
  base: '/',
})
```

### GitHub Pages 배포 워크플로우

```yaml
# .github/workflows/deploy.yml

name: Deploy to GitHub Pages

on:
  push:
    branches: [main]  # main 브랜치에 푸시될 때만 배포

# GitHub Pages 배포에 필요한 권한
permissions:
  contents: read
  pages: write
  id-token: write

# 동시에 여러 배포가 실행되지 않도록 설정
concurrency:
  group: "pages"
  cancel-in-progress: false  # 진행 중인 배포는 취소하지 않음

jobs:
  # 빌드 job
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # 빌드 전에 인덱스 파일 생성 (프로젝트에 스크립트가 있는 경우)
      - name: Generate index
        run: npm run generate:index

      - name: Build
        run: npm run build
        env:
          # 환경 변수가 필요하면 여기에 추가
          VITE_APP_ENV: production

      # 빌드 결과물을 GitHub Pages artifact로 업로드
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist  # Vite 빌드 출력 폴더

  # 배포 job
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}  # 배포된 URL

    runs-on: ubuntu-latest
    needs: build  # build job이 성공해야 실행됨

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### GitHub 저장소 설정

워크플로우 파일만 있다고 바로 배포되지 않습니다.
GitHub 저장소 설정에서 Pages 소스를 GitHub Actions로 변경해야 합니다.

```
저장소 → Settings → Pages
→ Source: "GitHub Actions" 선택
```

### CI + CD를 하나로 합친 예시

```yaml
# .github/workflows/ci-cd.yml

name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  # CI: 모든 브랜치에서 실행
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test -- --run

  # 빌드: CI 통과 후 실행
  build:
    needs: ci
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  # CD: main 브랜치 빌드 후에만 실행
  deploy:
    # main 브랜치 푸시일 때만 배포 (PR은 배포 안 함)
    if: github.ref == 'refs/heads/main'
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 5. Vercel / Netlify 자동 배포

GitHub Pages 외에도 Vercel과 Netlify는 더 간편한 자동 배포를 제공합니다.

### Vercel 자동 배포

Vercel은 GitHub 저장소를 연결하면 **별도의 워크플로우 파일 없이** 자동 배포됩니다.

```
1. vercel.com 접속 → 로그인
2. "New Project" 클릭
3. GitHub 저장소 선택
4. 프레임워크 자동 감지 (Vite, Next.js 등)
5. 환경 변수 설정 (필요한 경우)
6. "Deploy" 클릭
```

이후부터는:
- `main` 브랜치 푸시 → 프로덕션 배포
- 다른 브랜치 푸시 / PR 오픈 → 미리보기 URL 생성

### Vercel CLI로 배포 (GitHub Actions 연동)

```yaml
# .github/workflows/deploy-vercel.yml

name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}         # Vercel 토큰
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}       # 조직 ID
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}  # 프로젝트 ID
          vercel-args: '--prod'  # 프로덕션 배포
```

### Netlify 자동 배포

Netlify도 GitHub 연동만으로 자동 배포가 됩니다.

```
1. netlify.com 접속 → 로그인
2. "Add new site" → "Import an existing project"
3. GitHub 연결 → 저장소 선택
4. Build settings:
   - Build command: npm run build
   - Publish directory: dist
5. "Deploy site" 클릭
```

또는 `netlify.toml` 파일로 설정을 저장소에 포함할 수 있습니다.

```toml
# netlify.toml (저장소 루트에 위치)

[build]
  command = "npm run build"    # 빌드 명령어
  publish = "dist"             # 배포할 폴더

# SPA 라우팅을 위한 리다이렉트 설정
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Netlify GitHub Actions 연동

```yaml
# .github/workflows/deploy-netlify.yml

name: Deploy to Netlify

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v3
        with:
          publish-dir: './dist'
          production-branch: main       # main 브랜치는 프로덕션으로 배포
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## 6. 환경 변수 관리 (Secrets)

API 키, 토큰 같은 민감한 정보는 코드에 직접 작성하면 안 됩니다.
GitHub Secrets를 사용해서 안전하게 관리합니다.

### GitHub Secrets 등록 방법

```
저장소 → Settings → Secrets and variables → Actions
→ "New repository secret" 클릭
→ Name: API_URL, Secret: https://api.example.com
→ "Add secret" 클릭
```

### 워크플로우에서 Secrets 사용

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci

      - name: Build with environment variables
        run: npm run build
        env:
          # secrets.이름 으로 접근
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_ANALYTICS_ID: ${{ secrets.VITE_ANALYTICS_ID }}
```

### 환경별 Secrets 관리

```yaml
# 개발 / 스테이징 / 프로덕션 환경별 다른 값 사용

jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    environment: staging  # GitHub Environment 사용
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
        env:
          VITE_API_URL: ${{ secrets.STAGING_API_URL }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    environment: production  # 다른 Environment
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
        env:
          VITE_API_URL: ${{ secrets.PROD_API_URL }}
```

GitHub Environment는 환경별로 다른 Secrets와 보호 규칙을 설정할 수 있습니다.

```
저장소 → Settings → Environments
→ "New environment" → 이름 지정 (예: production)
→ Protection rules: 특정 브랜치만 허용, 승인자 지정 등
→ Secrets: 해당 환경에서만 사용하는 비밀값 등록
```

### .env 파일과 Secrets 구분

```bash
# .env.local (로컬 개발용, .gitignore에 포함!)
VITE_API_URL=http://localhost:3000
VITE_DEBUG=true

# .env.example (커밋해도 됨, 어떤 변수가 필요한지 문서화)
VITE_API_URL=
VITE_ANALYTICS_ID=
```

```
# .gitignore
.env
.env.local
.env.production
# .env.example은 커밋해도 됩니다
```

---

## 7. 브랜치 전략과 CI

브랜치 전략에 따라 CI/CD 파이프라인 구성이 달라집니다.

### GitHub Flow (소규모 팀에 추천)

```
main ────────────────────────────────────→ (프로덕션)
       ↑                    ↑
  feature/login        feature/signup
  (CI 실행, PR)        (CI 실행, PR)
```

```yaml
# GitHub Flow에 맞는 워크플로우
on:
  push:
    branches:
      - main          # 프로덕션 배포
  pull_request:
    branches:
      - main          # PR 시 CI만 실행 (배포 안 함)
```

### Git Flow (대규모 팀)

```
main ──────────────────────────────→ (프로덕션)
      ↑                     ↑
   release/1.0           release/2.0
      ↑
develop ───────────────────────────→ (스테이징)
      ↑           ↑
feature/A    feature/B
```

```yaml
# Git Flow에 맞는 워크플로우
on:
  push:
    branches:
      - main          # 프로덕션 배포
      - develop       # 스테이징 배포
      - 'release/**'  # 릴리즈 브랜치 배포
  pull_request:
    branches:
      - main
      - develop

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint && npm test -- --run

  deploy:
    needs: ci
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build

      # 브랜치에 따라 다른 환경에 배포
      - name: Deploy to staging
        if: github.ref == 'refs/heads/develop'
        run: echo "스테이징 배포"
        env:
          DEPLOY_URL: ${{ secrets.STAGING_URL }}

      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: echo "프로덕션 배포"
        env:
          DEPLOY_URL: ${{ secrets.PROD_URL }}
```

### PR에 자동 코멘트 남기기

```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build

      # 빌드 크기를 PR에 코멘트로 남기기
      - name: Check build size
        run: |
          BUILD_SIZE=$(du -sh dist/ | cut -f1)
          echo "BUILD_SIZE=$BUILD_SIZE" >> $GITHUB_ENV

      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `빌드 성공! 빌드 크기: ${process.env.BUILD_SIZE}`
            })
```

---

## 8. 자주 하는 실수

### 실수 1: `npm install` 대신 `npm ci` 사용

```yaml
# 잘못된 방법
- run: npm install  # package-lock.json을 무시할 수 있음

# 올바른 방법
- run: npm ci  # package-lock.json을 엄격히 따름, CI 환경에 적합
```

`npm ci`는:
- `package-lock.json`을 기반으로 정확한 버전을 설치
- `node_modules`를 삭제하고 새로 설치 (깨끗한 환경)
- `package.json`과 `package-lock.json`이 맞지 않으면 오류 발생

---

### 실수 2: 환경 변수를 코드에 하드코딩

```typescript
// 잘못된 방법 — API 키가 코드에 노출됨!
const apiUrl = 'https://api.example.com';
const apiKey = 'sk-1234567890abcdef';  // 절대 하드코딩 금지!

// 올바른 방법 — 환경 변수 사용
const apiUrl = import.meta.env.VITE_API_URL;
const apiKey = import.meta.env.VITE_API_KEY;
```

```yaml
# GitHub Actions에서는 Secrets 사용
- run: npm run build
  env:
    VITE_API_KEY: ${{ secrets.API_KEY }}
```

---

### 실수 3: main 브랜치 직접 푸시 (PR 없이)

브랜치 보호 규칙을 설정해서 main에 직접 푸시를 막을 수 있습니다.

```
저장소 → Settings → Branches → "Add rule"
→ Branch name pattern: main
→ ✅ Require a pull request before merging
→ ✅ Require status checks to pass before merging
    → 상태 검사 선택: CI (워크플로우 job 이름)
→ Save changes
```

---

### 실수 4: 테스트 없이 배포

```yaml
# 잘못된 방법 — 테스트를 건너뜀
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
      - run: npm run build
      - run: # 바로 배포...

# 올바른 방법 — 테스트 통과 후 배포
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
      - run: npm test -- --run  # 테스트 먼저!

  deploy:
    needs: test  # test가 성공해야 실행됨
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
      - run: npm run build
      - run: # 배포
```

---

### 실수 5: `VITE_` 접두사 누락

Vite에서 클라이언트에 노출되는 환경 변수는 반드시 `VITE_`로 시작해야 합니다.

```bash
# .env
API_KEY=secret123      # 클라이언트에서 접근 불가 (서버 전용)
VITE_API_URL=https://api.example.com  # 클라이언트에서 접근 가능
```

```typescript
// 올바른 접근 방법
console.log(import.meta.env.VITE_API_URL);  // 정상 동작
console.log(import.meta.env.API_KEY);       // undefined (접근 불가)
```

---

### 실수 6: 워크플로우 캐시 미활용

```yaml
# 캐시 없음 — 매번 수백 MB 다운로드
- uses: actions/setup-node@v4
  with:
    node-version: '20'
- run: npm ci  # 매번 오래 걸림

# 캐시 있음 — 처음 이후 빠름
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # package-lock.json 기반 캐시
- run: npm ci    # 캐시 히트 시 빠르게 실행
```

---

### 실수 7: 배포 전 빌드 결과 확인 안 함

```yaml
- name: Build
  run: npm run build

# 빌드가 성공했다고 해도 결과물을 확인하세요
- name: Verify build output
  run: |
    # dist 폴더가 존재하는지 확인
    if [ ! -d "dist" ]; then
      echo "빌드 실패: dist 폴더가 없습니다"
      exit 1
    fi
    # index.html이 있는지 확인
    if [ ! -f "dist/index.html" ]; then
      echo "빌드 실패: index.html이 없습니다"
      exit 1
    fi
    echo "빌드 검증 완료!"
    ls -la dist/
```

---

## 전체 예시: 실전 CI/CD 파이프라인

지금까지 배운 내용을 종합한 실전 파이프라인입니다.

```yaml
# .github/workflows/ci-cd.yml

name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:  # 수동 실행 허용

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true  # 새 실행이 오면 이전 것 취소

jobs:
  # ── CI 단계 ──────────────────────────────
  lint-and-type-check:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: ESLint
        run: npm run lint

      - name: TypeScript type check
        run: npm run type-check

  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint-and-type-check  # lint 통과 후 테스트
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run tests
        run: npm test -- --run --coverage  # 커버리지 포함

  # ── 빌드 단계 ──────────────────────────────
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test  # 테스트 통과 후 빌드
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Generate learn index
        run: npm run generate:learn

      - name: Build for production
        run: npm run build
        env:
          VITE_APP_ENV: production
          VITE_GA_ID: ${{ secrets.GA_ID }}

      - name: Verify build
        run: |
          ls -la dist/
          du -sh dist/

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  # ── CD 단계 ──────────────────────────────
  deploy:
    name: Deploy to GitHub Pages
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 정리

| 개념 | 설명 |
|------|------|
| CI | 코드 푸시 시 자동으로 lint/test/build 실행 |
| CD | CI 통과 시 자동으로 배포 |
| GitHub Actions | GitHub 내장 CI/CD 도구 |
| `on` | 워크플로우 실행 트리거 |
| `jobs` | 병렬 또는 순차 실행되는 작업 단위 |
| `steps` | job 안에서 순서대로 실행되는 단계 |
| `needs` | job 간 의존성 (순서 제어) |
| Secrets | 민감한 환경 변수를 안전하게 저장 |
| `npm ci` | CI 환경에 적합한 의존성 설치 명령어 |

CI/CD를 잘 구성해두면 "코드 작성 → 푸시 → 자동 배포"의 흐름이 완성됩니다.
처음에는 설정이 복잡해 보이지만, 한 번 세팅하면 이후에는 코드 작성에만 집중할 수 있습니다.
