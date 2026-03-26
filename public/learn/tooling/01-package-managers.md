---
title: "패키지 매니저 (npm, yarn, pnpm)"
order: 1
---

# 패키지 매니저 (npm, yarn, pnpm)

자바스크립트 프로젝트를 시작하면 가장 먼저 만나는 것이 패키지 매니저입니다.
패키지 매니저는 **외부 라이브러리(패키지)를 설치하고 관리하는 도구**입니다.

마치 스마트폰의 앱스토어처럼, 누군가 만들어 둔 유용한 코드를 손쉽게 가져다 쓸 수 있게 해줍니다.

---

## npm이란?

**npm (Node Package Manager)** 은 Node.js를 설치하면 자동으로 함께 설치되는 기본 패키지 매니저입니다.
전 세계 개발자들이 만든 200만 개 이상의 패키지를 무료로 사용할 수 있는 저장소(registry)에 연결됩니다.

```bash
# Node.js 설치 후 버전 확인
node -v   # Node.js 버전
npm -v    # npm 버전
```

---

## package.json — 프로젝트의 여권

`package.json`은 프로젝트에 대한 모든 정보를 담은 파일입니다.
마치 여권처럼, 이 프로젝트가 무엇인지, 어떤 패키지에 의존하는지 기록합니다.

```json
{
  "name": "my-app",           // 프로젝트 이름 (소문자, 하이픈 사용)
  "version": "1.0.0",         // 현재 버전 (major.minor.patch)
  "description": "나의 첫 앱", // 프로젝트 설명
  "main": "index.js",         // 패키지의 진입점 파일
  "scripts": {
    // npm run dev, npm run build 등으로 실행하는 명령어들
    "dev": "vite",
    "build": "vite build",
    "test": "vitest",
    "lint": "eslint ."
  },
  "keywords": ["react", "typescript"], // 검색용 키워드
  "author": "홍길동",                  // 작성자
  "license": "MIT",                    // 라이선스 종류
  "dependencies": {
    // 프로덕션에서도 필요한 패키지들
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    // 개발할 때만 필요한 패키지들
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

---

## 버전 표기법 이해하기

패키지 버전 앞에 `^`, `~` 같은 기호가 붙습니다. 이게 무슨 의미일까요?

버전은 `major.minor.patch` 형식입니다.
- **patch**: 버그 수정만 (하위 호환 O)
- **minor**: 새 기능 추가 (하위 호환 O)
- **major**: 큰 변경 (하위 호환 X, 코드 수정 필요할 수 있음)

```
"react": "^18.2.0"
  ^  → minor, patch 업데이트 허용 (18.x.x)
  ~  → patch 업데이트만 허용 (18.2.x)
  없음 → 이 버전만 사용 (18.2.0)
  *  → 최신 버전 사용 (비추천)
```

---

## dependencies vs devDependencies vs peerDependencies

이 세 가지는 의존성의 성격이 다릅니다.

### dependencies (런타임 의존성)
앱이 실제로 **실행될 때** 필요한 패키지입니다.
배포된 서버나 브라우저에서도 이 패키지가 있어야 앱이 동작합니다.

```bash
npm install react          # dependencies에 추가
npm install react-router-dom
```

```json
"dependencies": {
  "react": "^18.2.0",          // 앱 실행에 반드시 필요
  "react-dom": "^18.2.0",
  "axios": "^1.6.0"            // API 호출에 필요
}
```

### devDependencies (개발용 의존성)
**개발할 때만** 필요하고, 실제 배포 결과물에는 포함되지 않는 패키지입니다.

```bash
npm install -D typescript      # devDependencies에 추가 (-D 플래그)
npm install --save-dev eslint
```

```json
"devDependencies": {
  "typescript": "^5.0.0",    // 타입 체크 (개발 시에만)
  "vite": "^5.0.0",          // 빌드 도구 (개발 시에만)
  "eslint": "^8.0.0",        // 코드 검사 (개발 시에만)
  "vitest": "^1.0.0"         // 테스트 (개발 시에만)
}
```

### peerDependencies (동료 의존성)
**라이브러리를 만들 때** 사용합니다.
"이 라이브러리를 사용하려면, 이 패키지가 이미 설치되어 있어야 합니다"라는 의미입니다.

예를 들어, `react-router-dom`은 React 없이는 쓸 수 없으므로:

```json
// react-router-dom의 package.json
"peerDependencies": {
  "react": ">=16.8"   // React가 이미 설치되어 있어야 함
}
```

일반 앱 개발자는 `peerDependencies`를 직접 쓸 일은 거의 없습니다.

---

## 자주 쓰는 npm 명령어 총정리

```bash
# ── 패키지 설치 ──────────────────────────────────────
npm install                     # package.json의 모든 패키지 설치
npm install react               # 특정 패키지 설치 (dependencies)
npm install -D typescript       # 개발용 패키지 설치 (devDependencies)
npm install react@18.2.0        # 특정 버전 설치
npm install -g create-react-app # 전역 설치 (컴퓨터 어디서나 사용 가능)

# ── 패키지 제거 ──────────────────────────────────────
npm uninstall react             # 패키지 삭제 (package.json에서도 제거)
npm uninstall -g create-react-app # 전역 패키지 삭제

# ── 패키지 업데이트 ──────────────────────────────────
npm update                      # 모든 패키지를 허용 범위 내 최신으로
npm update react                # 특정 패키지만 업데이트
npm outdated                    # 업데이트 가능한 패키지 목록 확인

# ── 스크립트 실행 ────────────────────────────────────
npm run dev                     # package.json scripts의 "dev" 실행
npm run build                   # "build" 실행
npm test                        # "test" 실행 (run 생략 가능)
npm start                       # "start" 실행 (run 생략 가능)

# ── 프로젝트 초기화 ──────────────────────────────────
npm init                        # package.json 생성 (대화형)
npm init -y                     # package.json 생성 (기본값으로 즉시)
npm create vite@latest          # Vite 프로젝트 생성

# ── 정보 확인 ────────────────────────────────────────
npm list                        # 설치된 패키지 목록
npm list --depth=0              # 직접 설치한 패키지만 표시
npm info react                  # 패키지 상세 정보
npm audit                       # 보안 취약점 검사
npm audit fix                   # 자동으로 취약점 수정

# ── 캐시 ────────────────────────────────────────────
npm cache clean --force         # 캐시 삭제 (설치 오류 시 사용)
```

---

## package-lock.json — 버전을 못 박아두는 자물쇠

`package.json`에서 `"react": "^18.2.0"`이라고 하면,
A 개발자 컴퓨터에서는 18.2.0이 설치되고, B 개발자 컴퓨터에서는 18.3.1이 설치될 수 있습니다.
이게 버그의 원인이 됩니다.

`package-lock.json`은 **모든 패키지의 정확한 버전을 고정**합니다.

```json
// package-lock.json (자동 생성, 직접 수정 금지!)
{
  "name": "my-app",
  "lockfileVersion": 3,
  "packages": {
    "node_modules/react": {
      "version": "18.2.0",  // 정확히 이 버전!
      "resolved": "https://registry.npmjs.org/react/-/react-18.2.0.tgz",
      "integrity": "sha512-..."  // 파일 변조 방지용 해시
    }
  }
}
```

**규칙:**
- `package-lock.json`은 반드시 **git에 커밋**해야 합니다
- 팀원 모두가 같은 버전을 사용하게 됩니다
- CI/CD 서버에서도 동일한 버전으로 빌드됩니다

---

## npm vs yarn vs pnpm 비교

세 가지 패키지 매니저는 동일한 npm 저장소를 사용하지만, 설치 방식이 다릅니다.

### npm (기본 패키지 매니저)
- Node.js에 기본 포함
- 가장 많이 사용됨
- 최근 버전에서 많이 개선됨

```bash
npm install react
npm run dev
```

### yarn (Facebook이 만든 패키지 매니저)
- 2016년 npm의 느린 속도와 보안 문제를 해결하기 위해 등장
- `yarn.lock` 파일로 버전 고정

```bash
# yarn 설치
npm install -g yarn

# 사용법 (npm과 거의 동일하나 명령어 약간 다름)
yarn install          # npm install
yarn add react        # npm install react
yarn add -D typescript # npm install -D typescript
yarn remove react     # npm uninstall react
yarn dev              # npm run dev (run 생략)
```

### pnpm (Performant npm)
- 현재 가장 빠르고 디스크를 가장 적게 사용
- **하드 링크** 방식: 같은 패키지를 한 번만 저장하고 여러 프로젝트에서 공유

```bash
# pnpm 설치
npm install -g pnpm

# 사용법 (npm과 거의 동일)
pnpm install
pnpm add react
pnpm add -D typescript
pnpm remove react
pnpm dev              # run 생략 가능
```

### 속도 & 디스크 사용량 비교

```
속도 (빠른 순): pnpm > yarn > npm
디스크 절약 (좋은 순): pnpm >>> yarn ≈ npm

예시: 10개 프로젝트에 React 설치 시
- npm/yarn: React 파일이 10번 복사됨 (10 × 약 3MB = 30MB)
- pnpm: React 파일 1번 저장 후 링크 (약 3MB!)

모노레포(여러 패키지를 하나의 저장소에 관리)에서 pnpm이 특히 유리
```

| 기능 | npm | yarn | pnpm |
|------|-----|------|------|
| 설치 속도 | 보통 | 빠름 | 매우 빠름 |
| 디스크 사용 | 보통 | 보통 | 매우 적음 |
| lockfile | package-lock.json | yarn.lock | pnpm-lock.yaml |
| 모노레포 지원 | 기본 | workspaces | workspaces (우수) |
| Node.js 내장 | O | X | X |

**추천:**
- 개인 프로젝트: 취향대로
- 팀 프로젝트: 팀 내 통일이 중요 (섞어 쓰면 lockfile 충돌)
- 새 프로젝트 시작: pnpm 추천

---

## 흔한 실수들

### 실수 1: node_modules를 git에 커밋하기

```bash
# ❌ 잘못된 예 - node_modules를 커밋하면
git add .
git commit -m "프로젝트 추가"
# node_modules는 수백 MB, git이 느려지고 저장소가 망가짐

# ✅ 올바른 예 - .gitignore에 추가
```

```
# .gitignore
node_modules/        # 반드시 추가!
dist/
.env
```

`package.json`과 `package-lock.json`(또는 `yarn.lock`, `pnpm-lock.yaml`)만 커밋하면,
팀원이 `npm install`로 동일한 환경을 재현할 수 있습니다.

### 실수 2: lockfile을 커밋하지 않기

```bash
# ❌ 잘못된 예
# .gitignore에 package-lock.json 추가 → 팀원마다 다른 버전 설치

# ✅ 올바른 예
# package-lock.json, yarn.lock, pnpm-lock.yaml은 반드시 커밋!
git add package-lock.json
git commit -m "lockfile 업데이트"
```

### 실수 3: 패키지 매니저 혼용

```bash
# ❌ 잘못된 예 - 팀에서 npm과 yarn을 섞어 씀
# 개발자 A: npm install react
# 개발자 B: yarn add axios
# → lockfile이 두 개 생겨서 충돌 발생

# ✅ 올바른 예 - 팀 내 하나로 통일
# 프로젝트 루트에 명시
echo "use-npm" > .npmrc  # 또는
echo "use-yarn" > .yarnrc
```

### 실수 4: 런타임 의존성을 devDependencies에 넣기

```bash
# ❌ 잘못된 예
npm install -D react   # React는 런타임에도 필요!

# ✅ 올바른 예
npm install react      # 프로덕션 빌드에도 포함
```

### 실수 5: npm publish 전 준비 부족

```bash
# 패키지를 npm에 배포하기 전 체크리스트

# 1. .npmignore 파일 만들기 (불필요한 파일 제외)
# .npmignore
node_modules/
src/          # 빌드된 dist/만 배포
*.test.ts

# 2. 버전 올리기
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0

# 3. 배포 전 미리보기
npm pack            # 배포될 파일 확인

# 4. 배포
npm publish
npm publish --access public  # 스코프 패키지(@이름/패키지)의 경우
```

---

## 실전 팁: npx

`npx`는 패키지를 전역 설치 없이 **일회성으로 실행**하는 명령어입니다.

```bash
# ❌ 예전 방식 - 전역 설치 후 실행
npm install -g create-react-app
create-react-app my-app

# ✅ 현대적인 방식 - npx로 바로 실행 (설치 불필요)
npx create-react-app my-app
npx create vite@latest my-app

# 장점:
# - 전역 패키지 오염 없음
# - 항상 최신 버전 사용
# - 한 번만 쓸 도구에 적합
```

---

## 정리

패키지 매니저를 잘 쓰려면:

1. **`package.json`** 구조를 이해하고 dependencies를 올바르게 분류
2. **lockfile** (package-lock.json 등)은 반드시 git에 커밋
3. **node_modules**는 절대 git에 커밋하지 않기
4. 팀 내에서 패키지 매니저 **통일**하기
5. 새 프로젝트라면 **pnpm** 사용 고려 (빠르고 디스크 절약)

패키지 매니저는 현대 자바스크립트 개발의 기반입니다.
이것만 잘 이해해도 협업과 배포가 훨씬 수월해집니다.
