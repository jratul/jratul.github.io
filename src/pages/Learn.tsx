import { useParams, Navigate, Link } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';
import { LessonAccordion } from '@/components/learn/LessonAccordion';
import { useLearn } from '@/hooks/useLearn';
import { CATEGORY_META } from '@/types/learn';
import type { LearnCategory } from '@/types/learn';

const VALID_CATEGORIES: LearnCategory[] = ['java', 'kotlin', 'spring'];

export function Learn() {
  const { category } = useParams<{ category: string }>();

  if (!category || !VALID_CATEGORIES.includes(category as LearnCategory)) {
    return <Navigate to="/learn/java" replace />;
  }

  const cat = category as LearnCategory;
  const meta = CATEGORY_META[cat];
  const { lessons, loading } = useLearn(cat);

  return (
    <>
      <SEO
        title={`${meta.label} 학습`}
        description={meta.description}
        keywords={[meta.label.toLowerCase(), 'learn', 'tutorial', '학습']}
      />

      <div className="min-h-screen">
        {/* 헤더 */}
        <header className="relative border-b border-dark-border px-4 py-10">
          <div className="-z-10 absolute inset-0 bg-gradient-to-b from-primary-500/5 via-transparent to-transparent" />
          <div className="mx-auto max-w-3xl">
            {/* 카테고리 탭 */}
            <div className="mb-6 flex gap-2">
              {VALID_CATEGORIES.map(c => (
                <Link
                  key={c}
                  to={`/learn/${c}`}
                  className={[
                    'rounded-md px-4 py-1.5 text-sm font-medium transition-colors duration-200',
                    c === cat
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                      : 'text-gray-500 hover:text-gray-300',
                  ].join(' ')}
                >
                  {CATEGORY_META[c].label}
                </Link>
              ))}
            </div>

            {/* 제목 */}
            <h1
              className={`mb-2 bg-gradient-to-r bg-clip-text text-3xl font-bold text-transparent md:text-4xl ${meta.color}`}
            >
              {meta.label}
            </h1>
            <p className="text-gray-400">{meta.description}</p>
          </div>
        </header>

        {/* 콘텐츠 */}
        <main className="px-4 py-8">
          <div className="mx-auto max-w-3xl">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-500" />
              </div>
            ) : lessons.length === 0 ? (
              <p className="py-20 text-center text-gray-500">콘텐츠를 불러올 수 없습니다.</p>
            ) : (
              <LessonAccordion lessons={lessons} />
            )}
          </div>
        </main>
      </div>
    </>
  );
}
