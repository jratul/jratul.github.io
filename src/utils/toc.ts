export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-가-힣]/g, '');
}

/**
 * code span 안의 내용은 그대로 유지하고 (MarkdownRenderer의 extractText와 동일하게),
 * 나머지 텍스트에서만 HTML 태그를 제거한다.
 */
function toPlainText(markdownText: string): string {
  const codeSpanRegex = /`([^`]*)`/g;
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = codeSpanRegex.exec(markdownText)) !== null) {
    result += markdownText.slice(lastIndex, match.index).replace(/<[^>]+>/g, '');
    result += match[1];
    lastIndex = match.index + match[0].length;
  }
  result += markdownText.slice(lastIndex).replace(/<[^>]+>/g, '');

  return result;
}

export function extractToc(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const items: TocItem[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);

    if (h2) {
      const text = h2[1].trim();
      items.push({ id: slugify(toPlainText(text)), text, level: 2 });
    } else if (h3) {
      const text = h3[1].trim();
      items.push({ id: slugify(toPlainText(text)), text, level: 3 });
    }
  }

  return items;
}
