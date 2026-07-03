import { useState, useEffect, useMemo, useCallback } from 'react';
import type { LearnLesson, LearnIndex } from '@/types/learn';

let indexCache: LearnLesson[] | null = null;
let indexPromise: Promise<LearnLesson[]> | null = null;

function loadLearnIndex(): Promise<LearnLesson[]> {
  if (indexCache) return Promise.resolve(indexCache);
  if (!indexPromise) {
    indexPromise = fetch('/learn-index.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load learn index');
        return res.json();
      })
      .then((data: LearnIndex) => {
        indexCache = data.lessons;
        return data.lessons;
      })
      .catch(() => {
        indexPromise = null;
        return [];
      });
  }
  return indexPromise;
}

export function useLearn(category?: string) {
  const [allLessons, setAllLessons] = useState<LearnLesson[]>(indexCache ?? []);
  const [loading, setLoading] = useState(!indexCache);

  useEffect(() => {
    if (indexCache) return;
    let cancelled = false;
    loadLearnIndex().then(lessons => {
      if (!cancelled) {
        setAllLessons(lessons);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const lessons = useMemo(
    () =>
      category
        ? allLessons
            .filter(l => l.category === category)
            .sort((a, b) => a.order - b.order)
        : allLessons,
    [allLessons, category]
  );

  const getPrevNext = useCallback(
    (id: string, cat: string) => {
      const catLessons = allLessons
        .filter(l => l.category === cat)
        .sort((a, b) => a.order - b.order);
      const idx = catLessons.findIndex(l => l.id === id);
      return {
        prev: idx > 0 ? catLessons[idx - 1] : null,
        next: idx < catLessons.length - 1 ? catLessons[idx + 1] : null,
      };
    },
    [allLessons]
  );

  return { lessons, loading, getPrevNext };
}
