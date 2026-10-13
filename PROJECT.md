# PROJECT.md

이 문서는 프로젝트의 **설정 파일들이 무엇을 하는지**와 `package.json`의 **모든 패키지가
실제로 어디에 쓰이는지**를 정리한다. "이 파일/패키지를 왜 추가했는가?"에 답하는 문서.

아키텍처 요약은 [CLAUDE.md](./CLAUDE.md), 파일별 기술 상세는 [TECH.md](./TECH.md) 참고.

---

## 설정 파일

### `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`

프로젝트 루트의 `tsconfig.json`은 실제 컴파일러 옵션을 담지 않고, [Project
References](https://www.typescriptlang.org/docs/handbook/project-references.html)로
두 하위 설정을 참조만 한다.

```json
// tsconfig.json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- **`tsconfig.app.json`** — `src/` 아래 앱 코드용. `target: ES2020`, `jsx: react-jsx`,
  `moduleResolution: bundler`(Vite 번들러가 직접 처리하므로 Node 스타일 해석 규칙을
  안 씀), `strict` + `noUnusedLocals`/`noUnusedParameters` 활성화. `@/*` → `./src/*`
  경로 alias가 여기 정의되어 있다(`baseUrl`은 deprecated라 쓰지 않음 — 관련 이슈는
  커밋 `e212ab5` 참고).
- **`tsconfig.node.json`** — `vite.config.ts`와 `scripts/**/*.ts`(빌드 타임 인덱스 생성
  스크립트)용. `target: ES2022`, `types: ["node"]`로 Node 전역(`process`, `__dirname`
  등)을 인식시킨다. 이 두 그룹을 분리한 이유는 브라우저에서 도는 앱 코드와 Node에서
  직접 실행되는 빌드 스크립트가 서로 다른 전역 타입을 필요로 하기 때문.

`npm run type-check`는 `tsc --noEmit`으로 두 프로젝트 모두 검사한다.

### `eslint.config.js`

ESLint 9의 flat config 형식. `.eslintrc.*`(legacy) 대신 이 형식을 써야 ESLint 9가
동작한다 — 레거시 설정만 있으면 `npm run lint`가 즉시 실패한다.

두 블록으로 나뉜다:

```js
// src/**/*.{ts,tsx} — 브라우저 전역 + React 관련 규칙
{
  files: ['src/**/*.{ts,tsx}'],
  languageOptions: { globals: globals.browser, parser: tsParser, /* jsx: true */ },
  rules: {
    ...tseslint.configs.recommended.rules,
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,   // React 17+ 자동 JSX 런타임 대응
    ...reactHooks.configs.recommended.rules,
    ...prettierConfig.rules,                  // Prettier와 충돌하는 포맷 규칙 끄기
    'react/prop-types': 'off',                 // TS가 이미 타입 검증하므로 불필요
  },
}

// scripts/**/*.ts, *.config.{js,ts} — Node 전역
{
  files: ['scripts/**/*.ts', '*.config.{js,ts}'],
  languageOptions: { globals: globals.node, parser: tsParser },
}
```

`@typescript-eslint/no-unused-vars`는 `argsIgnorePattern: '^_'`로 설정해 의도적으로
안 쓰는 인자(`_event` 등)는 경고하지 않는다.

### `vite.config.ts`

```ts
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  base: '/', // username.github.io 루트 배포이므로 서브패스 없음
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-markdown': ['react-markdown', 'remark-gfm', 'rehype-slug', 'rehype-autolink-headings'],
          'vendor-syntax': ['react-syntax-highlighter'],
          'vendor-d3': ['d3-cloud', 'd3-selection', 'd3-transition'],
        },
      },
    },
  },
});
```

`manualChunks`로 무거운 서드파티 라이브러리를 앱 코드와 분리한 청크로 묶는다 — 앱
로직만 바뀌었을 때 vendor 청크의 브라우저 캐시가 무효화되지 않게 하기 위함. `d3-selection`은
`package.json`에 직접 명시되어 있지 않지만 `d3-cloud`/`d3`의 전이 의존성으로 존재해서
청크 이름에 등장한다.

### `tailwind.config.js`

```js
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Pretendard', 'sans-serif'] },
      colors: { primary: {...}, accent: {...}, dark: {...}, /* shadcn CSS 변수 기반 컬러들 */ },
    },
  },
  plugins: [],
};
```

`primary`/`accent`/`dark`는 이 프로젝트의 커스텀 다크 테마 팔레트(디자인 레퍼런스:
`ref/design.jpg`). `border`/`input`/`ring`/`background`/`card`/`popover`/`secondary`/
`muted`/`destructive`는 원래 shadcn/ui 도입을 전제로 넣은 CSS 변수 기반 컬러인데,
실제로는 shadcn/ui 컴포넌트를 쓰지 않고 커스텀 팔레트만 직접 조합해서 쓴다(아래
"미사용 설정: shadcn/ui" 참고).

### `postcss.config.js`

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

Tailwind가 유틸리티 클래스를 실제 CSS로 컴파일하고, autoprefixer가 브라우저 벤더
프리픽스를 자동으로 붙인다. Vite가 빌드 시 자동으로 이 설정을 읽어 처리한다.

### `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "arrowParens": "avoid",
  "endOfLine": "auto"
}
```

`endOfLine: "auto"`가 중요하다 — 기본값 `"lf"`로 두면 Windows에서 `core.autocrlf=true`로
체크아웃된 파일(CRLF)마다 매번 개행 문자 diff가 나서 `npm run lint`가 수백 개의 가짜
포맷 오류를 뱉는다. `"auto"`는 파일에 이미 있는 개행 스타일을 그대로 유지해 이 문제를
피한다.

### 미사용 설정: `components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "aliases": { "components": "@/components", "ui": "@/components/ui", ... }
}
```

`npx shadcn` CLI가 참조하는 설정 파일로, 초기 설계 단계에 shadcn/ui 도입을 검토하며
만들어졌다. 하지만 실제로는 shadcn/ui 컴포넌트를 한 번도 설치하지 않았다 —
`src/components/ui/`는 비어있는 디렉토리이고, `aliases.utils`가 가리키는
`src/lib/utils.ts`(shadcn 표준 `cn()` 헬퍼)도 존재하지 않는다. 모든 컴포넌트는
TailwindCSS 유틸리티 클래스를 직접 문자열로 조합해서 작성되어 있다. 이 파일은 죽은
설정이며, `npx shadcn add ...`를 실제로 실행하기 전까지는 아무 효과가 없다.

---

## 패키지 목록

### dependencies (런타임에 필요)

| 패키지 | 어디서/어떻게 쓰이는가 |
|---|---|
| `react`, `react-dom` | 전체 UI 렌더링 |
| `react-router-dom` | `src/App.tsx`의 라우팅(`BrowserRouter`, `Routes`), `useParams`/`useNavigate`/`useSearchParams` 등 각 페이지에서 사용 |
| `react-helmet-async` | `src/components/seo/SEO.tsx` — `<title>`, OG/Twitter 메타 태그, canonical URL을 페이지별로 주입 |
| `react-markdown` | `src/components/blog/MarkdownRenderer.tsx` — 마크다운 문자열을 React 엘리먼트로 렌더링하는 핵심 라이브러리 |
| `remark-gfm` | `MarkdownRenderer`의 remark 플러그인 — GitHub Flavored Markdown(표, 취소선, 자동 링크 등) 지원 |
| `remark-cjk-friendly` | `MarkdownRenderer`의 remark 플러그인 — `**C#**으로`, `**용어(설명)**이`처럼 구두점으로 끝나는 강조 바로 뒤에 한글 조사가 붙으면 CommonMark 규칙상 볼드가 풀리는 문제를 해결 |
| `react-syntax-highlighter` | `src/lib/prismLanguages.ts` — 코드 블록 신택스 하이라이팅. `PrismLight` + 실제 쓰는 언어만 선택 등록(전체 Prism 번들 대비 번들 크기 대폭 절감) |
| `date-fns`, `date-fns/locale` (ko) | `src/utils/formatDate.ts` — 포스트 날짜를 한국어 로케일로 포맷 |
| `lucide-react` | 전체 아이콘(Calendar, Clock, Search, ChevronDown, ArrowLeft/Right 등) |
| `d3`, `d3-cloud`, `d3-transition` | `src/components/blog/TagCloud.tsx` — 태그 워드클라우드 레이아웃 계산(`d3-cloud`)과 SVG 조작(`d3-selection`은 `d3`/`d3-cloud`의 전이 의존성), hover 애니메이션(`d3-transition`이 `.transition()` 메서드를 활성화) |
| `rehype-raw`, `rehype-slug`, `rehype-autolink-headings` | `package.json`에 있지만 `MarkdownRenderer.tsx`는 `remark-gfm`과 `remark-cjk-friendly`만 실제로 사용 중이다. 헤딩 `id`는 자체 유틸(`src/utils/toc.ts`의 `slugify`)로 만들고 있어 `rehype-slug`/`rehype-autolink-headings`는 현재 미사용. `rehype-raw`(HTML 원본 통과)도 마찬가지로 rehype 플러그인 배열에 연결되어 있지 않다. |

### devDependencies (빌드/개발 도구)

| 패키지 | 어디서/어떻게 쓰이는가 |
|---|---|
| `typescript` | 타입 체크(`tsc -b`, `tsc --noEmit`) |
| `vite`, `@vitejs/plugin-react` | 개발 서버 + 프로덕션 번들러, React Fast Refresh |
| `tailwindcss`, `autoprefixer`, `postcss` | 유틸리티 CSS 컴파일 파이프라인 |
| `tailwindcss-animate` | `tailwind.config.js`의 `plugins`에는 등록되어 있지 않음 — 설치만 되어 있고 미사용 |
| `gray-matter` | `scripts/generate-posts-index.ts`, `scripts/generate-learn-index.ts` — 마크다운 frontmatter(YAML) 파싱 |
| `tsx` | `npm run generate:*` 스크립트를 컴파일 없이 바로 실행(TypeScript 파일을 Node에서 직접 실행) |
| `eslint` + `@typescript-eslint/*` | 린팅(`eslint.config.js` 참고) |
| `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` | React 컴포넌트/훅 규칙, Fast Refresh 호환성 경고 |
| `eslint-config-prettier`, `eslint-plugin-prettier` | ESLint와 Prettier 규칙 충돌 방지 + Prettier 위반을 ESLint 에러로 표시 |
| `prettier` | 코드 포맷팅(`npm run format`) |
| `@types/node`, `@types/react`, `@types/react-dom`, `@types/d3`, `@types/d3-cloud`, `@types/react-syntax-highlighter` | 타입 정의. `react-syntax-highlighter`의 개별 prism 언어 모듈(`gradle`, `promql` 등) 일부는 `@types/react-syntax-highlighter`가 아직 커버하지 않아 `src/types/react-syntax-highlighter-languages.d.ts`에 앰비언트 선언을 직접 추가했다 |
