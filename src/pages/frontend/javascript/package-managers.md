---
title: "npm vs pnpm vs yarn: 2026년 기준 비교"
date: "2026-04-05"
tags: ["javascript", "npm", "pnpm", "yarn", "frontend", "tooling"]
excerpt: "npm, pnpm, yarn의 저장 방식과 성능 차이를 2026년 현재 생태계 기준으로 정리합니다."
---

# npm vs pnpm vs yarn: 2026년 기준 비교

Node.js 프로젝트를 시작하면 가장 먼저 선택해야 하는 것이 패키지 매니저입니다. npm, pnpm, yarn은 같은 역할을 하지만 내부 동작 방식이 다릅니다. 2026년 현재 생태계를 기준으로 정리합니다.

---

## 공통 역할

패키지 매니저가 하는 일:

```
의존성 설치     → package.json에 선언된 패키지를 node_modules에 설치
버전 고정       → lock 파일로 팀 전체의 의존성 버전을 동일하게 유지
스크립트 실행   → package.json의 scripts 명령 실행
패키지 배포     → npm 레지스트리에 패키지 업로드
```

세 도구 모두 npm 레지스트리를 기본 저장소로 사용합니다.

---

## 저장 방식 비교

패키지 매니저의 핵심 차이는 패키지를 **어디에, 어떻게 저장하는가**에 있습니다.

### npm — 플랫(flat) node_modules

npm v3부터 `node_modules`를 평탄하게(flat) 만듭니다. 모든 의존성과 그 의존성의 의존성이 같은 레벨에 설치됩니다.

```
node_modules/
├── react/            ← 직접 의존성
├── react-dom/        ← 직접 의존성
├── loose-envify/     ← react의 의존성 (끌어올려짐)
└── js-tokens/        ← loose-envify의 의존성 (끌어올려짐)
```

문제점: **팬텀 의존성(Phantom Dependency)**

`package.json`에 선언하지 않은 패키지도 `node_modules`에 있으면 코드에서 `import`할 수 있습니다. 이 패키지가 나중에 제거되면 런타임 오류가 발생합니다.

```js
// package.json에 lodash를 선언하지 않았지만...
// 다른 패키지의 의존성으로 끌어올려져 있어서 동작함 (위험)
import _ from 'lodash';
```

---

### pnpm — 콘텐츠 주소 지정 저장소 + 하드링크

pnpm은 패키지를 글로벌 저장소 한 곳에만 저장합니다. 각 프로젝트의 `node_modules`는 이 저장소를 **하드링크**로 참조합니다.

```
~/.pnpm-store/           ← 글로벌 저장소 (실제 파일)
  v3/
    files/
      aa/bb123...        ← react@18.3.0의 실제 파일

프로젝트/node_modules/   ← 하드링크 (디스크 공간 거의 0)
  .pnpm/
    react@18.3.0/
      node_modules/
        react/           ← 글로벌 저장소 하드링크
  react -> .pnpm/react@18.3.0/node_modules/react  ← 심볼릭 링크
```

장점:

- **디스크 절약**: react@18.3.0을 10개 프로젝트에서 써도 실제 파일은 1벌만 저장
- **팬텀 의존성 방지**: `node_modules` 최상위에는 `package.json`에 선언된 패키지만 심볼릭 링크로 노출
- **설치 속도**: 글로벌 저장소에 이미 있는 패키지는 하드링크만 생성 → 빠름

```bash
# 글로벌 저장소 확인
pnpm store path
# ~/.local/share/pnpm/store/v3

# 저장소 용량 확인
pnpm store status
```

---

### yarn — Berry(v2+)의 PnP (Plug'n'Play)

yarn v2(Berry)는 `node_modules`를 **아예 생성하지 않습니다**. 대신 `.yarn/cache`에 zip 파일로 패키지를 저장하고, `.pnp.cjs` 파일이 패키지 위치를 Node.js에 알려줍니다.

```
.yarn/
  cache/
    react-npm-18.3.0-abc123.zip    ← 패키지를 zip으로 저장
  releases/
    yarn-4.x.x.cjs
.pnp.cjs                           ← 패키지 위치 맵
```

```js
// .pnp.cjs (간략화)
const packageLocatorsByLocations = new Map([
  ['react/', { name: 'react', version: '18.3.0', ... }],
]);
```

장점:
- `node_modules` 없음 → `git clone` 후 즉시 실행 가능 (Zero-Install)
- zip 파일을 git에 커밋하면 `yarn install` 자체가 불필요

단점:
- 일부 네이티브 모듈, IDE, 빌드 도구와 호환 문제 발생
- 기존 npm/node_modules 생태계와 마찰

```yaml
# .yarnrc.yml
nodeLinker: pnp      # Plug'n'Play (기본)
nodeLinker: node-modules  # 전통적 node_modules 방식으로 전환
```

---

## 성능 비교

### 설치 속도

캐시가 있을 때와 없을 때 차이가 큽니다.

```
캐시 없음 (초기 설치):
  npm   ≈ 기준
  pnpm  ≈ 1.5~2배 빠름
  yarn  ≈ 비슷하거나 약간 빠름

캐시 있음 (재설치):
  npm   ≈ 기준
  pnpm  ≈ 2~4배 빠름 (하드링크 생성만 하면 됨)
  yarn  ≈ 빠름 (zip 압축 해제 생략 가능)
```

### 디스크 사용량

```
프로젝트 10개, 각 react + next.js 사용 가정:

npm:   10 × ~200MB = ~2GB
pnpm:  ~200MB (글로벌 저장소 공유)
yarn:  .yarn/cache 공유 설정 시 절약 가능
```

---

## lock 파일

각 도구는 서로 다른 lock 파일을 생성합니다.

| 도구 | lock 파일 |
|------|-----------|
| npm | `package-lock.json` |
| pnpm | `pnpm-lock.yaml` |
| yarn | `yarn.lock` |

lock 파일은 반드시 git에 커밋해야 합니다. 팀 전체가 동일한 버전의 의존성을 사용하게 됩니다.

```bash
# lock 파일 없이 설치 (CI에서 권장)
npm ci             # package-lock.json 기반 정확히 설치
pnpm install --frozen-lockfile
yarn install --immutable
```

---

## 모노레포 지원

여러 패키지를 하나의 저장소에서 관리하는 모노레포에서 차이가 납니다.

### npm workspaces

```json
// package.json
{
  "workspaces": ["packages/*"]
}
```

```bash
npm install            # 모든 워크스페이스 의존성 설치
npm run build -w @my/pkg  # 특정 워크스페이스에서 명령 실행
```

### pnpm workspaces

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

```bash
pnpm install
pnpm --filter @my/pkg build
pnpm --filter "...@my/pkg"  # @my/pkg에 의존하는 모든 패키지
```

pnpm은 `--filter`로 의존 관계를 추적할 수 있어 모노레포 관리가 편합니다.

### yarn workspaces

```json
// package.json
{
  "workspaces": ["packages/*"]
}
```

```bash
yarn workspaces foreach run build
yarn workspace @my/pkg build
```

---

## 주요 명령어 비교

| 작업 | npm | pnpm | yarn |
|------|-----|------|------|
| 설치 | `npm install` | `pnpm install` | `yarn install` / `yarn` |
| 패키지 추가 | `npm install react` | `pnpm add react` | `yarn add react` |
| 개발 의존성 추가 | `npm install -D eslint` | `pnpm add -D eslint` | `yarn add -D eslint` |
| 패키지 제거 | `npm uninstall react` | `pnpm remove react` | `yarn remove react` |
| 스크립트 실행 | `npm run build` | `pnpm build` | `yarn build` |
| 전역 설치 | `npm install -g pkg` | `pnpm add -g pkg` | `yarn global add pkg` |
| 캐시 삭제 | `npm cache clean --force` | `pnpm store prune` | `yarn cache clean` |

pnpm은 `run`을 생략할 수 있어 `pnpm build`처럼 간결합니다.

---

## 2026년 현재 상황

### 채택률

```
npm:   Node.js 기본 포함 → 가장 넓은 사용층
pnpm:  모노레포, 대규모 프로젝트에서 빠르게 확산
yarn:  Berry(v2+) 전환이 복잡해 Classic(v1) 잔류 프로젝트 여전히 많음
```

### 프레임워크 기본값

```
Vite scaffold (create vite):    npm, pnpm, yarn 모두 선택 가능
Next.js (create-next-app):      npm 기본, pnpm 지원
Turborepo (모노레포):           pnpm 권장
Nx (모노레포):                  npm, pnpm 모두 지원
```

### Corepack

Node.js 16.9+에 내장된 Corepack으로 프로젝트별 패키지 매니저 버전을 고정할 수 있습니다.

```json
// package.json
{
  "packageManager": "pnpm@9.12.0"
}
```

```bash
corepack enable    # Corepack 활성화
pnpm install       # package.json의 버전으로 자동 사용
```

팀 전체가 동일한 패키지 매니저 버전을 쓰게 됩니다.

---

## 선택 기준

```
npm
  → Node.js만 있으면 별도 설치 없이 바로 시작
  → 작은 프로젝트, 공개 패키지 배포
  → 팀 내 다른 도구 학습 비용을 줄이고 싶을 때

pnpm
  → 디스크 공간이 중요하거나 설치 속도를 높이고 싶을 때
  → 모노레포 구성 (Turborepo + pnpm 조합이 가장 보편적)
  → 팬텀 의존성 문제를 구조적으로 차단하고 싶을 때

yarn Berry (v4)
  → Zero-Install(의존성을 git에 포함)을 원할 때
  → 이미 yarn을 쓰는 팀에서 마이그레이션 없이 유지할 때
  → PnP 방식의 엄격한 의존성 관리가 필요할 때
```

---

## 정리

| 항목 | npm | pnpm | yarn Berry |
|------|-----|------|------------|
| 설치 방법 | Node.js 내장 | 별도 설치 | 별도 설치 |
| node_modules | flat | symlink + 하드링크 | 없음 (PnP) |
| 디스크 효율 | 낮음 | 높음 | 높음 |
| 설치 속도 | 보통 | 빠름 | 빠름 |
| 팬텀 의존성 | 발생 가능 | 차단 | 차단 |
| 모노레포 | 기본 지원 | 강력 | 지원 |
| 생태계 호환성 | 최고 | 높음 | 일부 문제 |
| lock 파일 | package-lock.json | pnpm-lock.yaml | yarn.lock |

2026년 기준 새 프로젝트라면 **pnpm**이 가장 균형 잡힌 선택입니다. 디스크 효율, 속도, 팬텀 의존성 방지, 모노레포 지원을 모두 갖추면서 npm과의 호환성도 높습니다. yarn은 이미 팀에서 쓰고 있거나 Zero-Install이 필요한 경우에 적합합니다.
