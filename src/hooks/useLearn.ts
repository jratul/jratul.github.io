import { useState, useEffect } from 'react';
import type { LearnLesson, LearnIndex } from '@/types/learn';

export function useLearn(category?: string) {
  const [allLessons, setAllLessons] = useState<LearnLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/learn-index.json')
      .then(res => res.json())
      .then((data: LearnIndex) => setAllLessons(data.lessons))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const lessons = category
    ? allLessons.filter(l => l.category === category).sort((a, b) => a.order - b.order)
    : allLessons;

  const getLessonById = (id: string) => allLessons.find(l => l.id === id);

  const getPrevNext = (id: string, cat: string) => {
    const catLessons = allLessons
      .filter(l => l.category === cat)
      .sort((a, b) => a.order - b.order);
    const idx = catLessons.findIndex(l => l.id === id);
    return {
      prev: idx > 0 ? catLessons[idx - 1] : null,
      next: idx < catLessons.length - 1 ? catLessons[idx + 1] : null,
    };
  };

  return { lessons, loading, getLessonById, getPrevNext };
}
