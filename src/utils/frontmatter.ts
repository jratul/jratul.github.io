/**
 * gray-matter가 빌드 타임에 만드는 "---\nkey: value\n---" 블록을
 * 브라우저에서 원본 .md를 그대로 fetch했을 때 제거하기 위한 경량 파서.
 */
export function stripFrontmatter(raw: string): string {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}
