import { useState, useEffect } from 'react';
import { stripFrontmatter } from '@/utils/frontmatter';

const cache = new Map<string, string>();

/**
 * 레슨 목록/사이드바에 필요한 learn-index.json에는 본문이 빠져있으므로,
 * 실제 레슨 상세 화면에서만 해당 레슨의 원본 .md를 개별로 가져온다.
 */
export function useLessonContent(category?: string, slug?: string) {
  const key = category && slug ? `${category}/${slug}` : null;
  const [content, setContent] = useState<string | null>(
    key ? (cache.get(key) ?? null) : null
  );
  const [loading, setLoading] = useState(!!key && !cache.has(key));

  useEffect(() => {
    if (!key) return;

    if (cache.has(key)) {
      setContent(cache.get(key)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/learn/${key}.md`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load lesson content');
        return res.text();
      })
      .then(raw => {
        if (cancelled) return;
        const parsed = stripFrontmatter(raw);
        cache.set(key, parsed);
        setContent(parsed);
      })
      .catch(() => {
        if (!cancelled) setContent(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { content, loading };
}
