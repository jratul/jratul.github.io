import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { useLearn } from '@/hooks/useLearn';
import { SEO } from '@/components/seo/SEO';
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer';
import { TableOfContents } from '@/components/blog/TableOfContents';
import { extractToc } from '@/utils/toc';
import { CATEGORY_META } from '@/types/learn';
import type { LearnCategory } from '@/types/learn';
import { LearnSidebar } from '@/components/learn/LearnSidebar';

export function LearnLessonPage() {
  const { category, lessonSlug } = useParams<{ category: string; lessonSlug: string }>();
  const { lessons, loading, getPrevNext } = useLearn(category);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="border-4 border-primary-500/30 border-t-primary-500 rounded-full w-12 h-12 animate-spin" />
          <p className="text-gray-400 text-sm">불러오는 중...</p>
        </div>
      </div>
    );
  }

  const lessonId = `${category}/${lessonSlug}`;
  const lesson = lessons.find(l => l.id === lessonId);

  if (!lesson) return <Navigate to={`/learn/${category}`} replace />;

  const meta = CATEGORY_META[category as LearnCategory];
  const { prev, next } = getPrevNext(lessonId, category!);
  const toc = extractToc(lesson.content);
  const lessonIndex = lessons.findIndex(l => l.id === lessonId);

  return (
    <>
      <SEO
        title={`${lesson.title} | ${meta.label}`}
        description={lesson.content.slice(0, 120).replace(/[#`*\n]/g, ' ').trim()}
        keywords={[category!, 'learn', 'tutorial']}
      />

      <div className="sticky top-16 mx-auto flex h-[calc(100dvh-4rem)] max-w-7xl gap-8 overflow-hidden px-4">
        {/* 사이드바 (데스크탑) */}
        <LearnSidebar currentCat={category as LearnCategory} />

        {/* 메인 콘텐츠 */}
        <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain pt-8 pb-24">
          <article>
            {/* Header */}
            <header className="relative px-4 py-10 mb-2 rounded-xl border border-dark-border bg-dark-card/30">
              <div className="-z-10 absolute inset-0 rounded-xl bg-gradient-to-b from-primary-500/5 via-transparent to-transparent" />

              {/* Back to list */}
              <Link
                to={`/learn/${category}`}
                className="inline-flex items-center gap-2 mb-6 text-gray-400 hover:text-primary-400 transition-colors duration-200"
              >
                <ArrowLeft size={16} />
                <span className="text-sm">{meta.label} 목록으로</span>
              </Link>

              {/* Chapter badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  <BookOpen size={13} />
                  Chapter {String(lessonIndex + 1).padStart(2, '0')}
                </span>
              </div>

              {/* Title */}
              <h1
                className={`pb-1 bg-gradient-to-r bg-clip-text text-3xl md:text-4xl font-bold text-transparent leading-normal ${meta.color}`}
              >
                {lesson.title}
              </h1>
            </header>

            {/* Content + TOC */}
            <div className="py-8">
              <div
                className="lg:grid lg:gap-12"
                style={{ gridTemplateColumns: toc.length > 0 ? '1fr 220px' : '1fr' }}
              >
                <div className="min-w-0">
                  <MarkdownRenderer content={lesson.content} />
                </div>

                {toc.length > 0 && (
                  <aside className="hidden lg:block">
                    <TableOfContents items={toc} />
                  </aside>
                )}
              </div>
            </div>

            {/* Prev / Next */}
            <footer className="py-10 border-t border-dark-border">
              <div className="flex items-stretch justify-between gap-4">
                {/* Prev */}
                {prev ? (
                  <Link
                    to={`/learn/${category}/${prev.id.split('/')[1]}`}
                    className="flex-1 flex items-center gap-3 px-5 py-4 rounded-lg border border-dark-border hover:border-primary-500/40 bg-dark-card/50 hover:bg-dark-card transition-all duration-200 group"
                  >
                    <ArrowLeft size={18} className="shrink-0 text-gray-500 group-hover:text-primary-400 transition-colors" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-500 mb-0.5 uppercase tracking-wider">이전 챕터</p>
                      <p className="text-sm font-medium text-gray-300 group-hover:text-primary-300 truncate transition-colors">
                        {prev.title}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}

                {/* Next */}
                {next ? (
                  <Link
                    to={`/learn/${category}/${next.id.split('/')[1]}`}
                    className="flex-1 flex items-center justify-end gap-3 px-5 py-4 rounded-lg border border-dark-border hover:border-primary-500/40 bg-dark-card/50 hover:bg-dark-card transition-all duration-200 group text-right"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-500 mb-0.5 uppercase tracking-wider">다음 챕터</p>
                      <p className="text-sm font-medium text-gray-300 group-hover:text-primary-300 truncate transition-colors">
                        {next.title}
                      </p>
                    </div>
                    <ArrowRight size={18} className="shrink-0 text-gray-500 group-hover:text-primary-400 transition-colors" />
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </footer>
          </article>
        </div>
      </div>
    </>
  );
}
