import { useParams, Link, Navigate } from 'react-router-dom';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';
import { usePosts } from '@/hooks/usePosts';
import { SEO } from '@/components/seo/SEO';
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer';
import { formatDate } from '@/utils/formatDate';
import { formatReadingTime } from '@/utils/readingTime';

export function Post() {
  const { '*': slug } = useParams();
  const { getPostBySlug, loading } = usePosts();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="border-4 border-primary-500/30 border-t-primary-500 rounded-full w-12 h-12 animate-spin" />
          <p className="text-gray-400 text-sm">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <SEO
        title={post.title}
        description={post.excerpt}
        keywords={post.tags}
        ogType="article"
        canonicalUrl={`https://jratul.github.io/post/${post.slug}`}
      />

      <article className="min-h-screen">
        {/* Header */}
        <header className="relative px-4 py-12 md:py-12 border-dark-border border-b">
          {/* Background Gradient */}
          <div className="-z-10 absolute inset-0 bg-gradient-to-b from-primary-500/5 via-transparent to-transparent" />

          <div className="mx-auto max-w-4xl">
            {/* Back Button */}
            <Link
              to="/"
              className="inline-flex items-center gap-2 mb-8 text-gray-400 hover:text-primary-400 transition-colors duration-200"
            >
              <ArrowLeft size={20} />
              <span>목록으로 돌아가기</span>
            </Link>

            {/* Title */}
            <h1 className="bg-clip-text bg-gradient-to-r from-primary-300 mb-6 pb-2 font-bold text-transparent text-3xl md:text-5xl leading-normal to-accent-blue via-accent-cyan">
              {post.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-gray-400 text-sm">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{formatDate(post.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>{formatReadingTime(post.readingTime)}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <Link
                  key={tag}
                  to={`/?tag=${tag}`}
                  className="bg-primary-500/10 hover:bg-primary-500/20 px-3 py-1 border border-primary-500/20 rounded-md font-medium text-primary-300 text-sm transition-colors duration-200"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-4 py-4">
          <div className="mx-auto max-w-4xl">
            <MarkdownRenderer content={post.content} />
          </div>
        </div>

        {/* Footer Navigation */}
        <footer className="px-4 py-12 border-dark-border border-t">
          <div className="mx-auto max-w-4xl">
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-primary-500/10 hover:bg-primary-500/20 px-6 py-3 border border-primary-500/20 hover:border-primary-500/40 rounded-lg text-primary-300 transition-all duration-200"
            >
              <ArrowLeft size={20} />
              <span>목록으로 돌아가기</span>
            </Link>
          </div>
        </footer>
      </article>
    </>
  );
}
