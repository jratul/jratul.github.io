---
title: "ESLint & Prettier — 코드 품질"
order: 5
---

# ESLint & Prettier — 코드 품질

코드를 작성하다 보면 두 가지 문제가 생깁니다:
1. **실수와 안티패턴**: 선언만 하고 쓰지 않는 변수, 잘못된 패턴
2. **스타일 불일치**: 어떤 사람은 탭, 어떤 사람은 스페이스; 따옴표 종류, 세미콜론 유무...

**ESLint**는 문법 교정 선생님, **Prettier**는 자동 정렬 로봇입니다.
이 둘을 함께 사용하면 코드 품질과 일관성을 자동으로 유지할 수 있습니다.

---

## ESLint: 코드 오류와 안티패턴 검사

ESLint는 코드를 분석해서 오류, 경고, 안티패턴을 찾아줍니다.

```bash
npm install -D eslint

# 초기 설정 (대화형)
npx eslint --init
```

### .eslintrc.cjs 설정 파일 상세 해설

```javascript
// .eslintrc.cjs
module.exports = {
  // ── 환경 설정 ───────────────────────────────────────
  env: {
    browser: true,  // window, document 등 브라우저 전역 변수 허용
    es2022: true,   // 최신 ES 문법 사용 허용
    node: true,     // process, require 등 Node.js 전역 변수 허용
  },

  // ── 파서 ────────────────────────────────────────────
  parser: '@typescript-eslint/parser',
  // TypeScript 코드를 파싱할 수 있게 함
  // 기본값: espree (순수 JS 파서)

  parserOptions: {
    ecmaVersion: 'latest',        // 최신 ES 문법 허용
    sourceType: 'module',         // ES Modules (import/export) 허용
    ecmaFeatures: {
      jsx: true,                  // JSX 허용
    },
  },

  // ── 플러그인 ─────────────────────────────────────────
  plugins: [
    '@typescript-eslint',         // TypeScript 규칙 추가
    'react',                      // React 관련 규칙 추가
    'react-hooks',                // React Hooks 규칙 추가
    'react-refresh',              // Vite Fast Refresh 규칙
  ],

  // ── 확장 (규칙 묶음) ──────────────────────────────────
  extends: [
    'eslint:recommended',                    // ESLint 기본 권장 규칙
    'plugin:@typescript-eslint/recommended', // TypeScript 권장 규칙
    'plugin:react/recommended',              // React 권장 규칙
    'plugin:react/jsx-runtime',              // React 17+ JSX transform
    'plugin:react-hooks/recommended',        // Hooks 규칙 (deps 배열 등)
    'prettier',                              // Prettier와 충돌하는 규칙 비활성화
    // 반드시 마지막에 위치! Prettier가 ESLint 스타일 규칙 덮어씀
  ],

  // ── 개별 규칙 ────────────────────────────────────────
  rules: {
    // 'off'(0) / 'warn'(1) / 'error'(2)
    'no-console': 'warn',                    // console.log 경고
    'no-unused-vars': 'off',                 // TS 플러그인이 처리하므로 off
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_' },           // _로 시작하는 인수는 허용
    ],
    '@typescript-eslint/no-explicit-any': 'warn', // any 타입 경고
    'react/prop-types': 'off',               // TypeScript 쓰면 불필요
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },

  // ── 특정 파일 예외 설정 ──────────────────────────────
  overrides: [
    {
      files: ['*.test.ts', '*.test.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off', // 테스트 파일에서는 any 허용
      },
    },
    {
      files: ['vite.config.ts', 'vitest.config.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],

  // ── 전역 변수 ────────────────────────────────────────
  globals: {
    React: 'readonly', // React가 전역으로 주입된 환경
  },

  // ── React 버전 자동 감지 ──────────────────────────────
  settings: {
    react: {
      version: 'detect', // package.json에서 React 버전 자동 감지
    },
  },
}
```

### ESLint 실행

```bash
# 전체 검사
npx eslint .

# 특정 파일/폴더 검사
npx eslint src/

# 자동 수정 가능한 오류 수정
npx eslint . --fix

# 특정 확장자만 검사
npx eslint . --ext .ts,.tsx

# CI 환경에서 (경고도 오류로 처리)
npx eslint . --max-warnings 0
```

### 자주 보는 ESLint 규칙들

```typescript
// ── 사용하지 않는 변수 ────────────────────────────────
const unused = 'hello'  // ❌ 경고: 'unused' is defined but never used

// 해결 1: 변수 사용
// 해결 2: _로 시작하는 이름 (의도적으로 무시)
const _unused = 'hello'  // ✅ 규칙에서 허용

// ── React Hooks 의존성 배열 ────────────────────────────
function Component({ userId }) {
  const [user, setUser] = useState(null)

  // ❌ 경고: userId가 deps에 없음
  useEffect(() => {
    fetchUser(userId).then(setUser)
  }, []) // exhaustive-deps 규칙 위반!

  // ✅ 올바른 예
  useEffect(() => {
    fetchUser(userId).then(setUser)
  }, [userId]) // deps 명시
}

// ── any 타입 사용 ─────────────────────────────────────
function process(data: any) { ... }    // ❌ 경고: any 사용
function process(data: unknown) { ... } // ✅ unknown 사용

// ── 조건부 Hooks ────────────────────────────────────────
function Component({ isAdmin }) {
  if (isAdmin) {
    const [count, setCount] = useState(0)  // ❌ 오류: 조건부로 Hook 호출
  }
}
```

---

## Prettier: 코드 스타일 자동 포맷팅

Prettier는 코드를 **하나의 통일된 스타일**로 자동 포맷합니다.
팀원들이 서로 다른 스타일로 작성해도, Prettier가 저장 시 모두 같은 형태로 맞춰줍니다.

```bash
npm install -D prettier
```

### .prettierrc 설정 파일 상세 해설

```json
// .prettierrc
{
  "semi": true,
  // 세미콜론 사용 여부
  // true: console.log('hello');
  // false: console.log('hello')

  "singleQuote": true,
  // 따옴표 종류
  // true: 'hello'
  // false: "hello"

  "trailingComma": "es5",
  // 후행 쉼표
  // "none": 없음
  // "es5": 객체, 배열의 마지막 요소 뒤에 쉼표 (ES5 허용 범위)
  // "all": 함수 인수에도 후행 쉼표 (ES5+ 필요)

  "printWidth": 80,
  // 한 줄 최대 길이 (넘으면 자동 줄바꿈)

  "tabWidth": 2,
  // 들여쓰기 크기 (스페이스 개수)

  "useTabs": false,
  // true: 탭으로 들여쓰기
  // false: 스페이스로 들여쓰기

  "arrowParens": "avoid",
  // 화살표 함수 인수 괄호
  // "avoid": x => x (인수 하나면 괄호 생략)
  // "always": (x) => x (항상 괄호)

  "endOfLine": "lf",
  // 줄바꿈 문자 (Windows/Mac 혼용 시 중요!)
  // "lf": Unix/Mac style (\n)
  // "crlf": Windows style (\r\n)
  // "auto": 각 파일의 현재 방식 유지

  "jsxSingleQuote": false,
  // JSX 속성에서 따옴표 종류
  // false: <div className="app"> (큰따옴표)
  // true: <div className='app'> (작은따옴표)

  "bracketSpacing": true,
  // 객체 리터럴 괄호 내 공백
  // true: { foo: bar }
  // false: {foo: bar}

  "bracketSameLine": false
  // JSX 닫는 >의 위치
  // false: 마지막 prop 다음 줄에 >
  // true: 마지막 prop과 같은 줄에 >
}
```

### .prettierignore (포맷 제외 파일)

```
# .prettierignore
dist
node_modules
.github
*.md          # 마크다운은 의도적 줄바꿈이 있으므로 제외
*.json        # JSON은 직접 관리
pnpm-lock.yaml
package-lock.json
```

### Prettier 실행

```bash
# 전체 포맷
npx prettier --write .

# 특정 파일 포맷
npx prettier --write "src/**/*.{ts,tsx}"

# 변경 없이 검사만 (CI에서 사용)
npx prettier --check .

# 하나의 파일 결과 미리보기 (파일 수정 없음)
npx prettier src/App.tsx
```

---

## ESLint와 Prettier 충돌 해결

ESLint와 Prettier는 스타일 관련 규칙에서 충돌합니다.
예를 들어 ESLint의 `quotes` 규칙과 Prettier의 `singleQuote` 설정이 다르면 충돌이 납니다.

**해결책:** `eslint-config-prettier`를 사용해서 ESLint의 스타일 규칙을 비활성화합니다.

```bash
npm install -D eslint-config-prettier
```

```javascript
// .eslintrc.cjs
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'prettier',  // ← 반드시 마지막! Prettier와 충돌하는 ESLint 규칙 비활성화
  ],
}
```

**역할 분리 원칙:**
- ESLint: **코드 품질** (버그, 안티패턴) → 변경 불가
- Prettier: **코드 스타일** (들여쓰기, 따옴표, 세미콜론) → ESLint 규칙 비활성화

---

## VSCode 연동 — 저장 시 자동 포맷

설치가 귀찮아서 매번 CLI로 실행하면 빠뜨리기 쉽습니다.
VSCode에서 **저장할 때 자동으로 포맷**되도록 설정합니다.

```bash
# VSCode 확장 설치 (터미널 또는 VSCode 마켓플레이스)
# - ESLint: dbaeumer.vscode-eslint
# - Prettier: esbenp.prettier-vscode
```

```json
// .vscode/settings.json (프로젝트 폴더 내에 생성)
{
  // Prettier를 기본 포맷터로 설정
  "editor.defaultFormatter": "esbenp.prettier-vscode",

  // 저장 시 자동 포맷
  "editor.formatOnSave": true,

  // 저장 시 ESLint 자동 수정
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },

  // TypeScript 파일에도 적용
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },

  // import 정렬 (선택사항)
  "editor.codeActionsOnSave": {
    "source.organizeImports": "explicit",
    "source.fixAll.eslint": "explicit"
  }
}
```

팀 설정을 공유하려면 `.vscode/settings.json`을 git에 커밋합니다.
(개인 설정은 `~/.config/Code/User/settings.json`에 저장)

---

## Husky + lint-staged: 커밋 전 자동 검사

VSCode 설정은 팀원마다 다를 수 있습니다.
**커밋 직전에 강제로 검사하고 포맷**하는 것이 더 안전합니다.

Husky는 Git hooks를 편리하게 설정하는 도구이고,
lint-staged는 staged 파일(커밋 예정 파일)에만 린트/포맷을 적용합니다.

```bash
# Husky 설치 및 초기화
npm install -D husky lint-staged
npx husky init  # .husky/ 폴더 생성

# 또는 한 번에
npm pkg set scripts.prepare="husky install"
npm run prepare
```

```bash
# .husky/pre-commit (커밋 직전에 실행)
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

```json
// package.json
{
  "lint-staged": {
    // staged된 ts, tsx 파일에 대해:
    "*.{ts,tsx}": [
      "eslint --fix",          // ESLint 자동 수정
      "prettier --write"       // Prettier 포맷
    ],
    // staged된 CSS 파일에 대해:
    "*.{css,scss}": [
      "prettier --write"
    ],
    // JSON 파일:
    "*.json": [
      "prettier --write"
    ]
  }
}
```

이제 `git commit` 시 자동으로:
1. staged 파일에 ESLint 실행 → 수정
2. Prettier 포맷
3. 수정된 파일 다시 스테이징
4. 린트 오류 있으면 커밋 중단

```bash
# 커밋 시 동작 예시
git add src/App.tsx
git commit -m "feat: 새로운 기능"

# ← 자동 실행
# ✔ Running tasks for staged files...
#   ❯ *.{ts,tsx} — 1 file
#     ✔ eslint --fix
#     ✔ prettier --write
# [main abc1234] feat: 새로운 기능
```

---

## 흔한 실수들

### 실수 1: ESLint와 Prettier 역할 혼동

```javascript
// ❌ ESLint로 스타일 강제 (Prettier와 충돌)
rules: {
  'quotes': ['error', 'single'],   // Prettier가 이미 처리
  'indent': ['error', 2],           // Prettier가 이미 처리
  'semi': ['error', 'always'],      // Prettier가 이미 처리
}

// ✅ ESLint는 코드 품질만, 스타일은 Prettier에게
rules: {
  'no-unused-vars': 'warn',         // 미사용 변수: 코드 품질
  'no-console': 'warn',             // console.log: 코드 품질
  'react-hooks/exhaustive-deps': 'error', // Hook deps: 코드 품질
}
```

### 실수 2: extends 순서 잘못 지정

```javascript
// ❌ prettier가 중간에 위치 → 이후 확장이 prettier 규칙을 덮어씀
extends: [
  'eslint:recommended',
  'prettier',                   // ← 여기 있으면 안 됨
  'plugin:react/recommended',
]

// ✅ prettier는 반드시 마지막
extends: [
  'eslint:recommended',
  'plugin:react/recommended',
  'prettier',                   // ← 마지막에!
]
```

### 실수 3: pre-commit hook 무시

```bash
# ❌ 린트 오류 있어도 강제 커밋 (절대 하면 안 됨!)
git commit -m "급해서" --no-verify

# ✅ 린트 오류를 수정하고 커밋
npx eslint . --fix
git add .
git commit -m "fix: 린트 오류 수정 및 기능 추가"
```

### 실수 4: .eslintignore 없이 node_modules 검사

```
# .eslintignore
node_modules/    # 반드시 추가 (없으면 node_modules도 검사)
dist/
build/
coverage/
*.config.js      # 선택적: 설정 파일 제외
```

---

## 팀에서 도입할 때 권장 순서

1. ESLint + Prettier 설치
2. `.eslintrc.cjs`, `.prettierrc`, `.prettierignore` 설정
3. `eslint-config-prettier`로 충돌 해결
4. `.vscode/settings.json`으로 저장 시 자동 포맷
5. Husky + lint-staged로 커밋 전 자동 검사
6. CI에서 `eslint --max-warnings 0`과 `prettier --check` 실행

---

## 정리

- **ESLint**: 버그와 안티패턴을 찾아주는 코드 품질 도구
- **Prettier**: 코드 스타일을 통일해주는 포맷터
- **역할 분리**: ESLint = 품질, Prettier = 스타일
- **충돌 해결**: `eslint-config-prettier`로 ESLint 스타일 규칙 비활성화
- **자동화**: VSCode 저장 시 포맷 + Husky 커밋 전 검사

이 도구들을 처음 설정할 때는 귀찮지만,
한 번 설정해두면 코드 리뷰에서 스타일 지적이 사라지고
팀 전체 코드 품질이 올라갑니다.
