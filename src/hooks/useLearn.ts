import { useState, useEffect } from 'react';
import type { LearnLesson, LearnIndex } from '@/types/learn';

export function useLearn(category?: string) {
  const [lessons, setLessons] = useState<LearnLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/learn-index.json')
      .then(res => res.json())
      .then((data: LearnIndex) => {
        const filtered = category
          ? data.lessons.filter(l => l.category === category)
          : data.lessons;
        setLessons(filtered);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category]);

  return { lessons, loading };
}
