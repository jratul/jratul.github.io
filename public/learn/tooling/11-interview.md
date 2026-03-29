---
title: "Tooling 면접 예상 질문"
order: 11
---

# 프론트엔드 Tooling 면접 예상 질문

빌드 도구, 패키지 매니저, CI/CD 면접에서 빈출되는 핵심 질문들입니다.

## Q1. Vite가 webpack보다 빠른 이유는?

**webpack (번들러 방식):**
```
개발 서버 시작: 모든 모듈을 빌드 → 번들 생성 → 서버 시작
→ 수십 초 ~ 수 분 소요
```

**Vite (ESM + esbuild 방식):**
```
개발 서버 시작: 빌드 없이 즉시 시작 (ESM Native)
브라우저가 필요한 모듈만 요청 → Vite가 on-demand 변환
→ 수백 ms
```

**핵심 차이:**
1. **사전 번들링:** `node_modules` 의존성을 `esbuild`로 빠르게 번들 (Go 기반, webpack 대비 10~100배 빠름)
2. **소스 코드:** ESM으로 브라우저에 직접 서빙, HMR도 변경된 모듈만 전달
3. **프로덕션 빌드:** Rollup 기반 (최적화 번들 생성)

---

## Q2. npm, yarn, pnpm의 차이점은?

| 비교 | npm | yarn (classic) | pnpm |
|-----|-----|---------------|------|
| 속도 | 보통 | 빠름 (병렬) | 가장 빠름 |
| 디스크 | 중복 설치 | 중복 설치 | 하드링크로 공유 |
| 보안 | audit 내장 | audit 내장 | strict 모드 |
| 워크스페이스 | O | O | O (모노레포에 강점) |
| lock 파일 | package-lock.json | yarn.lock | pnpm-lock.yaml |

**pnpm이 빠른 이유:**
```
npm/yarn: node_modules에 각 프로젝트마다 패키지 복사
pnpm: 중앙 저장소에 1번만 저장 + 하드링크로 연결
→ 디스크 절약 + 설치 속도 향상
```

---

## Q3. 트리 쉐이킹(Tree Shaking)이란?

번들 시 **사용하지 않는 코드를 제거**하는 최적화 기법입니다.

```javascript
// utils.js — 여러 함수 export
export function add(a, b) { return a + b; }
export function multiply(a, b) { return a * b; }
export function divide(a, b) { return a / b; }

// app.js — add만 사용
import { add } from './utils.js';

// 번들 결과: multiply, divide는 제거됨
```

**조건:**
- **ESM(import/export) 문법** 필요 — CommonJS(require)는 정적 분석 어려움
- 사이드 이펙트 없는 모듈 (`"sideEffects": false` in package.json)

```json
// package.json
{
    "sideEffects": false,
    // 또는 사이드 이펙트가 있는 파일 명시
    "sideEffects": ["*.css", "polyfill.js"]
}
```

---

## Q4. 코드 스플리팅(Code Splitting)이란?

번들을 **여러 청크로 분할**해 초기 로딩 성능을 개선합니다.

```javascript
// 동적 임포트 (React.lazy)
const AdminPage = React.lazy(() => import('./pages/AdminPage'));

// Route 기반 스플리팅
<Suspense fallback={<Spinner />}>
    <Route path="/admin" element={<AdminPage />} />
</Suspense>
```

```javascript
// Vite / webpack — 청크 전략
// vite.config.ts
build: {
    rollupOptions: {
        output: {
            manualChunks: {
                vendor: ['react', 'react-dom'],
                chart: ['recharts'],
            }
        }
    }
}
```

---

## Q5. ESLint와 Prettier의 역할 차이는?

| 도구 | 역할 |
|-----|------|
| **ESLint** | 코드 품질 & 오류 검사 (버그 가능성, best practices) |
| **Prettier** | 코드 포맷팅 (들여쓰기, 따옴표, 세미콜론) |

둘은 역할이 다르므로 함께 사용합니다.

```bash
# ESLint: 이런 것들을 검사
'no-unused-vars'     # 미사용 변수
'react-hooks/rules-of-hooks'  # Hook 규칙 위반
'@typescript-eslint/no-explicit-any'  # any 사용

# Prettier: 이런 것들을 포맷팅
trailing comma, semicolons, print width, quote style
```

```json
// eslint.config.js에서 충돌 방지
import eslintConfigPrettier from 'eslint-config-prettier';
// prettier가 다루는 포맷 규칙은 ESLint에서 비활성화
```

---

## Q6. CI/CD 파이프라인을 어떻게 구성하나요?

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint          # 린트 검사
      - run: npm run type-check    # 타입 검사
      - run: npm run test          # 단위 테스트
      - run: npm run build         # 빌드 검증

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy
```

**CD 전략:**
- PR 머지 → 자동 스테이징 배포
- 수동 승인 → 프로덕션 배포

---

## Q7. 번들 사이즈를 분석하고 최적화하는 방법은?

```bash
# 번들 분석
npx vite-bundle-analyzer
npx webpack-bundle-analyzer

# Next.js
ANALYZE=true npm run build
```

**최적화 체크리스트:**

```javascript
// 1. 라이브러리 대체 (더 가벼운 것으로)
moment.js (290KB) → day.js (2KB)
lodash (70KB)     → lodash-es + tree shaking

// 2. 동적 임포트로 지연 로딩
const Chart = dynamic(() => import('recharts'), { ssr: false });

// 3. 이미지 최적화
next/image, sharp, WebP 변환

// 4. 폰트 최적화
next/font (self-hosting)
font-display: swap

// 5. 외부 라이브러리 CDN으로 분리
// vite.config.ts
build: { rollupOptions: { external: ['react', 'react-dom'] } }
```

---

## Q8. Jest와 Vitest의 차이는?

| 비교 | Jest | Vitest |
|-----|------|--------|
| 런타임 | Node.js | Vite (ESM 네이티브) |
| 설정 | 별도 설정 필요 | vite.config 공유 |
| 속도 | 보통 | 빠름 (HMR, 병렬) |
| 호환성 | Jest API 호환 | Jest API 대부분 호환 |

```typescript
// Vitest 테스트 예시
import { describe, it, expect, vi } from 'vitest';

describe('formatCurrency', () => {
    it('숫자를 통화 형식으로 변환한다', () => {
        expect(formatCurrency(1000)).toBe('₩1,000');
    });

    it('비동기 함수를 테스트한다', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ data: 'test' });
        const result = await fetchData(mockFetch);
        expect(mockFetch).toHaveBeenCalledOnce();
        expect(result.data).toBe('test');
    });
});
```
