# jratul.github.io

[jratul.github.io](https://jratul.github.io) — Vite + React + TypeScript 기반 개인 기술 블로그.
블로그 포스트와 별개로 Java/Kotlin/Spring/인프라/CS 전반을 다루는 학습 섹션(`/learn`)을 함께 제공하며,
GitHub Pages로 정적 배포됩니다.

## 주요 기능

- **블로그**: 태그 클라우드(워드 아트), 제목/본문/태그 통합 검색, 마크다운 렌더링, 목차(TOC)
- **학습 섹션(`/learn`)**: Java, Kotlin, Spring Boot, C++, Docker, Kubernetes, 알고리즘 등
  28개 카테고리의 단계별 학습 콘텐츠
- 다크 테마, 반응형 레이아웃, 코드 신택스 하이라이팅

## 기술 스택

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Routing**: React Router v6
- **Markdown**: react-markdown + remark-gfm, react-syntax-highlighter
- **SEO**: react-helmet-async
- **배포**: GitHub Pages (GitHub Actions)

## 콘텐츠 소스

정적 빌드 시 마크다운 파일을 스캔해 검색/목차용 JSON 인덱스를 생성합니다.

| 콘텐츠 | 소스 경로 | 생성 인덱스 | 생성 스크립트 |
|---|---|---|---|
| 블로그 포스트 | `src/pages/**/*.md` | `public/posts-index.json` | `scripts/generate-posts-index.ts` |
| 학습 콘텐츠 | `public/learn/{category}/*.md` | `public/learn-index.json` | `scripts/generate-learn-index.ts` |

`learn-index.json`에는 목록/사이드바에 필요한 메타데이터(제목·순서·카테고리)만 담기고, 레슨 본문은
상세 페이지에서 해당 `.md` 파일을 개별로 fetch합니다(전체 콘텐츠를 한 번에 내려받지 않기 위함).

## 개발

```bash
npm install
npm run dev            # 개발 서버

npm run generate:index # 블로그 포스트 인덱스 생성
npm run generate:learn # 학습 콘텐츠 인덱스 생성
npm run build           # 인덱스 + sitemap 생성 후 프로덕션 빌드
npm run preview         # 빌드 결과 로컬 미리보기

npm run lint            # ESLint (error/warning 0 유지)
npm run type-check      # tsc --noEmit
npm run format           # Prettier
```

## 새 블로그 포스트 추가

1. `src/pages/{frontend|backend}/{topic}/파일명.md` 생성 (frontmatter: `title`, `date`, `tags`, `excerpt`)
2. `npm run generate:index` 실행
3. 커밋 및 푸시

## 새 학습 콘텐츠 추가

1. `public/learn/{category}/{순서}-{이름}.md` 생성 (frontmatter: `title`, `order`)
2. `npm run generate:learn` 실행
3. 커밋 및 푸시

자세한 규칙은 [CLAUDE.md](./CLAUDE.md) 참고.
