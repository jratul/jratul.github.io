# TECH.md

파일 단위로 "이 파일에 어떤 기술이 어떻게 쓰였는지"를 기록한다. 설정 파일과 패키지
목록은 [PROJECT.md](./PROJECT.md), 상위 아키텍처는 [CLAUDE.md](./CLAUDE.md) 참고.

---

## 빌드 타임 인덱스 생성 (`scripts/`)

정적 사이트라 런타임에 마크다운을 스캔할 수 없으므로, 빌드 시점에 파일 시스템을 훑어
JSON 인덱스를 미리 만들어 `public/`에 내보낸다. 세 스크립트 모두 `tsx`로 컴파일 없이
직접 실행된다(`npm run generate:*`).

### `generate-posts-index.ts`

`src/pages/**/*.md`를 재귀 스캔해 `gray-matter`로 frontmatter를 파싱하고, 파일 경로를
slug로 변환한다.

```ts
// src/pages/frontend/react/useEffect.md → slug "frontend/react/useEffect"
const relativePath = path.relative('src/pages', fullPath);
const slug = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');
```

검색은 클라이언트에서 메모리 내 필터링으로 처리하므로(`usePosts.ts`), 이 인덱스에는
**마크다운 본문 전체**(`content`)가 포함된다 — 제목/내용/태그 통합 검색을 위해 본문
텍스트가 필요하기 때문. 그 결과 `posts-index.json`은 포스트 수에 비례해 커진다(2026-07
기준 50개 포스트로 약 580KB).

### `generate-learn-index.ts`

`public/learn/{category}/{순서}-{이름}.md`를 스캔한다. **본문(content)은 인덱스에
포함하지 않는다** — `id`/`category`/`order`/`title` 메타데이터만 담는다. 이유는 학습
콘텐츠가 362개 레슨(2026-07 기준)으로 포스트보다 훨씬 많아서, 본문까지 넣으면 목차
페이지 하나 열 때마다 4MB 넘는 JSON을 통째로 받아야 했기 때문(성능 개선 이력은
`src/hooks/useLessonContent.ts` 절 참고).

```ts
// "01-variables.md" → order: 1
const orderMatch = file.match(/^(\d+)/);
const order = orderMatch ? parseInt(orderMatch[1], 10) : 99;
```

### `generate-sitemap.ts`

`posts-index.json`과 `learn-index.json`을 모두 읽어 정적 URL(`/`, `/about`) +
포스트 URL + 학습 카테고리 URL(`/learn/:category`) + 레슨 URL
(`/learn/:category/:lessonSlug`)을 한 `sitemap.xml`로 합친다. 학습 URL을 빠뜨리면
검색엔진이 콘텐츠의 대부분(포스트 50개 대비 레슨 396개 + 카테고리 29개)을 색인하지
못하게 된다.

세 스크립트는 `npm run build` 안에서 `generate:index → generate:learn →
generate:sitemap → tsc -b → vite build` 순서로 실행된다 — sitemap이 learn-index를
읽으므로 순서가 중요하다.

---

## 데이터 fetch 훅 (`src/hooks/`)

### `usePosts.ts` / `useLearn.ts` — 모듈 레벨 캐시

두 훅 모두 컴포넌트 상태가 아니라 **모듈 스코프 변수**에 fetch 결과를 캐싱한다. React
state는 컴포넌트가 언마운트되면 사라지지만, 모듈 스코프 변수는 페이지를 이동해도
살아있다 — Home → Post 상세 → Home으로 돌아와도 `posts-index.json`을 다시 받지 않는다.

```ts
// src/hooks/usePosts.ts
let postsIndexCache: PostsIndex | null = null;
let postsIndexPromise: Promise<PostsIndex | null> | null = null;

function loadPostsIndex(): Promise<PostsIndex | null> {
  if (postsIndexCache) return Promise.resolve(postsIndexCache);
  if (!postsIndexPromise) {
    postsIndexPromise = fetch('/posts-index.json')
      .then(res => { /* ... */ })
      .then(data => { postsIndexCache = data; return data; });
  }
  return postsIndexPromise; // 동시에 여러 컴포넌트가 호출해도 fetch는 한 번만
}
```

`indexPromise`를 캐싱하는 이유는 컴포넌트 여러 개가 마운트 직후 동시에 훅을 호출할 때
(예: Learn.tsx의 사이드바 + 본문이 동시에 `useLearn` 호출) fetch 요청이 중복 발생하지
않게 하기 위함이다. `useLearn.ts`도 동일한 패턴을 쓴다.

### `useLessonContent.ts` — 레슨 본문 개별 fetch

`useLearn`이 반환하는 인덱스에는 본문이 없으므로, 레슨 상세 페이지는 이 훅으로 원본
`.md` 파일을 그때그때 fetch한다. `public/learn/**/*.md`가 이미 정적 자산으로
배포되어 있다는 점을 이용해, 별도 빌드 산출물을 만들지 않고 원본 마크다운 파일을 직접
가져온다.

```ts
fetch(`/learn/${category}/${slug}.md`)
  .then(res => res.text())
  .then(raw => stripFrontmatter(raw)); // src/utils/frontmatter.ts
```

레슨별로 캐시(`Map<string, string>`)를 둬서 같은 레슨을 다시 열 때 재요청하지 않는다.

---

## `src/utils/frontmatter.ts` — 경량 frontmatter 파서

빌드 스크립트는 `gray-matter`(Node 전용 라이브러리)로 frontmatter를 파싱하지만,
`useLessonContent`는 브라우저에서 원본 `.md`를 직접 fetch하므로 `gray-matter`를 쓸 수
없다(Node API 의존). 정규식 하나로 대체한다.

```ts
export function stripFrontmatter(raw: string): string {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}
```

---

## `src/lib/prismLanguages.ts` — 신택스 하이라이터 경량화

`react-syntax-highlighter`의 기본 `Prism` export는 100개 이상 언어를 전부 포함해
gzip 기준 약 230KB다. 이 프로젝트는 `PrismLight`(빈 상태로 시작하는 버전) +
콘텐츠에서 실제로 쓰는 언어만 `registerLanguage`로 등록해 같은 청크를 약 37KB까지
줄인다.

```ts
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
// ... 필요한 언어만 개별 import

SyntaxHighlighter.registerLanguage('java', java);

// 코드펜스 표기(ts/js/html/dockerfile/cql 등)를 실제 등록된 언어로 매핑
SyntaxHighlighter.alias('typescript', 'ts');
SyntaxHighlighter.alias('markup', ['html', 'xml']);
SyntaxHighlighter.alias('sql', 'cql'); // Cassandra Query Language ≈ SQL 문법
```

등록되지 않은 언어(`cql`, `logql` 등 일부)는 `react-syntax-highlighter` 내부에서
try/catch로 감싸져 있어 하이라이팅 없이 일반 텍스트로 안전하게 폴백된다 — 별도 에러
처리가 필요 없다.

---

## `src/components/blog/MarkdownRenderer.tsx`

`react-markdown`의 `components` prop으로 각 마크다운 엘리먼트를 프로젝트 디자인에
맞는 Tailwind 클래스로 오버라이드한다.

**인라인 코드 vs 코드 블록 구분**: `react-markdown`은 둘 다 같은 `code` 컴포넌트로
넘기므로, 개행이 있거나 language 클래스가 붙어있으면 블록으로 간주한다.

```ts
const isCodeBlock = codeString.includes('\n') || language;
return isCodeBlock
  ? <SyntaxHighlighter language={language || 'text'} ...>{codeString}</SyntaxHighlighter>
  : <code>{children}</code>;
```

**헤딩 ID 직접 생성**: `rehype-slug`를 설치는 해뒀지만 실제로는 안 쓰고(PROJECT.md
참고), `h2`/`h3` 컴포넌트에서 자체 `slugify` + `extractText`로 목차(TOC) 앵커용
`id`를 직접 만든다. `extractText`는 `children`이 문자열/배열/코드span(React
엘리먼트)까지 재귀적으로 순회해 순수 텍스트만 뽑아낸다 — 코드가 포함된 헤딩
(``## `useEffect` 훅``)도 올바른 slug를 만들기 위함.

---

## `src/utils/toc.ts` — 목차 추출

마크다운 원문을 줄 단위로 순회하며 `##`/`###` 헤딩만 뽑아 `TocItem[]`을 만든다.
정규식 기반 파서라 코드 블록 안의 `#`이 헤딩으로 오인되지 않도록 코드펜스(` ``` `)
진입/이탈 상태를 직접 추적한다.

```ts
let inCodeBlock = false;
for (const line of lines) {
  if (line.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
  if (inCodeBlock) continue;
  // ... ## / ### 매칭
}
```

`slugify`는 `MarkdownRenderer`의 헤딩 `id` 생성과 동일한 규칙을 써야 앵커 링크가
어긋나지 않는다 — 두 파일이 같은 알고리즘을 독립적으로 구현하고 있으므로, 한쪽만
수정하면 TOC 클릭 시 스크롤이 안 맞게 된다.

---

## `src/components/blog/TableOfContents.tsx`

**현재 읽는 위치 하이라이트**: `IntersectionObserver`로 화면에 보이는 헤딩들을
관찰하다가, 여러 개가 동시에 보이면 화면 상단에 가장 가까운 것을 활성 항목으로
표시한다.

```ts
const observer = new IntersectionObserver(entries => {
  const visible = entries
    .filter(e => e.isIntersecting)
    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
  if (visible.length > 0) setActiveId(visible[0].target.id);
}, { rootMargin: '-80px 0% -60% 0%', threshold: 0 });
```

**커스텀 스무스 스크롤**: 브라우저 기본 `scrollIntoView({ behavior: 'smooth' })`
대신 `requestAnimationFrame` + ease-out 큐빅 함수로 직접 애니메이션해 헤더 높이만큼
오프셋(-88px)을 보정한다.

---

## `src/components/blog/TagCloud.tsx` — 워드클라우드

`d3-cloud`로 태그 배치 좌표를 계산하고 `d3-selection`으로 SVG를 직접 그린다(React가
아니라 D3가 DOM을 관리하는 영역).

**레이아웃 캐싱**: `d3-cloud`의 `layout.start()`는 비동기 콜백(`.on('end', ...)`)으로
좌표를 계산해준다. 이 계산 결과(`cachedLayout`)를 별도 state로 캐싱해, 태그 선택 상태만
바뀔 때는(하이라이트만 갱신) 값비싼 레이아웃 재계산 없이 그리기만 다시 한다.

```ts
// tagsKey: 태그 배열의 "내용"이 바뀔 때만 재계산 트리거 (배열 참조가 바뀌어도 내용이 같으면 스킵)
const tagsKey = useMemo(() => tags.map(t => `${t.tag}:${t.count}`).join(','), [tags]);

useEffect(() => { /* layout.start() → setCachedLayout(...) */ }, [tagsKey, dimensions]);
useEffect(() => { /* cachedLayout으로 SVG 그리기 */ }, [cachedLayout, selectedTags, dimensions]);
```

**반응형 크기 감지**: 컨테이너 `offsetWidth`가 마운트 직후 0으로 잡히는 문제(레이아웃이
아직 계산 안 됨, 특히 모바일)를 피하려고 `requestAnimationFrame` + 여러 `setTimeout`
지연(0/50/100/200/300/500ms)으로 폭을 반복 측정한다.

**접근성**: SVG `<text>` 엘리먼트에 `tabindex`/`role="button"`/`aria-pressed`를 달고
`keydown`(Enter, Space)으로도 태그를 토글할 수 있게 했다 — 기본적으로 SVG 텍스트는
키보드 포커스를 받지 않으므로 명시적으로 열어줘야 한다.

---

## `src/pages/Home.tsx` — URL ↔ 필터 상태 동기화

태그 필터는 `usePosts`가 관리하는 로컬 state지만, 최초 진입 시 URL의 `?tag=` 값을
초기값으로 쓰고, 이후 브라우저 뒤로/앞으로 가기로 URL이 바뀌면 필터 state를 다시
맞춘다.

```ts
const initialTags = useMemo(() => {
  const tagParam = searchParams.get('tag');
  return tagParam ? [tagParam] : [];
}, []); // 최초 마운트 값만 사용

useEffect(() => {
  const urlTags = searchParams.get('tag') ? [searchParams.get('tag')!] : [];
  setSelectedTags(prev => /* 내용이 같으면 setState 스킵 */ ...);
}, [searchParams, setSelectedTags]);
```

`useState`의 초기값 인자는 최초 렌더에만 반영되고 이후 리렌더에는 무시되므로,
뒤로가기 대응은 별도 `useEffect`로 처리해야 한다.

---

## `src/pages/Learn.tsx` — 조건부 라우트 + 훅 순서

`:category` 파라미터가 유효하지 않으면 `/learn/html`로 리다이렉트해야 하는데, 이
분기를 훅 호출보다 먼저 두면 React의 "훅은 항상 같은 순서로 호출돼야 한다" 규칙을
어기게 된다. 그래서 **유효성 검사 결과와 무관하게 훅은 먼저 호출**하고, fallback
카테고리(`'html'`)를 넘겨 훅이 항상 유효한 인자를 받도록 한 뒤, 렌더링 직전에 리다이렉트
분기를 둔다.

```ts
const isValidCategory = !!category && ALL_CATEGORIES.includes(category as LearnCategory);
const cat = (isValidCategory ? category : 'html') as LearnCategory;
const { lessons, loading } = useLearn(cat); // 항상 호출됨

if (!isValidCategory) return <Navigate to="/learn/html" replace />;
```

`MobileCategorySelector`는 데스크탑의 `LearnSidebar`(항상 보이는 트리 UI)와 달리
모바일 화면에서만(`lg:hidden`) 드롭다운으로 렌더링된다.

---

## `src/App.tsx` — 라우트 단위 코드 스플리팅

`Home`을 제외한 모든 페이지는 `React.lazy`로 분리해, 초기 진입(홈) 시점에는 다른
페이지 번들을 받지 않는다.

```ts
const Post = lazy(() => import('@/pages/Post').then(m => ({ default: m.Post })));
```

named export를 쓰는 컴포넌트를 `React.lazy`에 넘기려면 `default` 필드로 감싸는
어댑터가 필요하다(`lazy`는 default export만 인식).

---

## `src/components/layout/ScrollToTop.tsx`

React Router는 브라우저 네이티브 내비게이션과 달리 페이지 전환 시 스크롤 위치를
유지한다(SPA라 실제 문서 전환이 없기 때문). 목록을 스크롤한 채로 상세 페이지에
들어가면 상세 페이지도 스크롤된 채로 보이는 문제를 막기 위해, 라우트 트리 최상단에
`pathname` 변경을 감지해 `window.scrollTo(0, 0)`을 실행하는 컴포넌트를 하나만 둔다.
