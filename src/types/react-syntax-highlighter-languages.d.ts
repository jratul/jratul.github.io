// @types/react-syntax-highlighter가 아직 커버하지 않는 개별 prism 언어 모듈용 선언.
declare module 'react-syntax-highlighter/dist/esm/languages/prism/promql' {
  const language: unknown;
  export default language;
}
