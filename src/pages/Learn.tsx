import { useState } from 'react';
import { useParams, Navigate, Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { SEO } from '@/components/seo/SEO';
import { useLearn } from '@/hooks/useLearn';
import { CATEGORY_META } from '@/types/learn';
import type { LearnCategory } from '@/types/learn';
import { LearnSidebar, LEARN_GROUPS } from '@/components/learn/LearnSidebar';

const ALL_CATEGORIES = LEARN_GROUPS.flatMap(g => g.categories);

function MobileCategorySelector({
  currentCat,
  onSelect,
}: {
  currentCat: LearnCategory;
  onSelect: (cat: LearnCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = CATEGORY_META[currentCat];

  return (
    <div className="relative mb-6 lg:hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-dark-border bg-dark-card px-4 py-3 text-sm text-gray-300"
      >
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${meta.color}`} />
          {meta.label}
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-dark-border bg-[#1a1a3e] shadow-xl">
          <div className="p-2">
            {LEARN_GROUPS.map(group => (
              <div key={group.label}>
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                  {group.label}
                </p>
                {group.categories.map(cat => {
                  const m = CATEGORY_META[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        onSelect(cat);
                        setOpen(false);
                      }}
                      className={[
                        'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                        cat === currentCat
                          ? 'bg-primary-500/15 text-primary-300'
                          : 'text-gray-400 hover:bg-dark-border/50 hover:text-gray-200',
                      ].join(' ')}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${m.color}`} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        </>
      )}
    </div>
  );
}

export function Learn() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();

  if (!category || !ALL_CATEGORIES.includes(category as LearnCategory)) {
    return <Navigate to="/learn/java" replace />;
  }

  const cat = category as LearnCategory;
  const meta = CATEGORY_META[cat];
  const { lessons, loading } = useLearn(cat);

  const handleSelect = (selected: LearnCategory) => {
    navigate(`/learn/${selected}`);
  };

  return (
    <>
      <SEO
        title={`${meta.label} 학습`}
        description={meta.description}
        keywords={[meta.label.toLowerCase(), 'learn', 'tutorial', '학습']}
      />

      <div className="sticky top-16 mx-auto flex h-[calc(100vh-4rem)] max-w-7xl gap-8 overflow-hidden px-4">
        {/* 사이드바 (데스크탑) */}
        <LearnSidebar currentCat={cat} />

        {/* 메인 */}
        <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain py-8">
          {/* 모바일 카테고리 선택기 */}
          <MobileCategorySelector currentCat={cat} onSelect={handleSelect} />

          {/* 카테고리 헤더 */}
          <header className="mb-8">
            <h1
              className={`mb-2 bg-gradient-to-r bg-clip-text text-3xl font-bold text-transparent md:text-4xl ${meta.color}`}
            >
              {meta.label}
            </h1>
            <p className="text-gray-400">{meta.description}</p>
          </header>

          {/* 목차 */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-500" />
            </div>
          ) : lessons.length === 0 ? (
            <p className="py-20 text-center text-gray-500">콘텐츠를 불러올 수 없습니다.</p>
          ) : (
            <ol className="space-y-2">
              {lessons.map((lesson, index) => {
                const slug = lesson.id.split('/')[1];
                return (
                  <li key={lesson.id}>
                    <Link
                      to={`/learn/${cat}/${slug}`}
                      className="group flex items-center gap-4 rounded-lg border border-dark-border bg-dark-card/50 px-5 py-4 transition-all duration-200 hover:border-primary-500/40 hover:bg-dark-card"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border text-xs font-bold text-gray-400 transition-colors duration-200 group-hover:bg-primary-500/20 group-hover:text-primary-300">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="flex-1 font-medium text-gray-300 transition-colors duration-200 group-hover:text-white">
                        {lesson.title}
                      </span>
                      <ArrowRight
                        size={16}
                        className="shrink-0 text-gray-600 transition-colors duration-200 group-hover:text-primary-400"
                      />
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </main>
      </div>
    </>
  );
}
