import { Link } from 'react-router-dom';
import { Calendar, Clock } from 'lucide-react';
import type { PostMeta } from '@/types/blog';
import { formatDate } from '@/utils/formatDate';
import { formatReadingTime } from '@/utils/readingTime';

interface PostCardProps {
  post: PostMeta;
  className?: string;
}

export function PostCard({ post, className = '' }: PostCardProps) {
  return (
    <Link
      to={`/post/${post.slug}`}
      className={`
        group block
        bg-dark-surface/50 backdrop-blur-sm
        border border-dark-border rounded-xl
        p-6 transition-all duration-300
        hover:border-primary-500
        hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]
        hover:-translate-y-1
        ${className}
      `}
    >
      {/* Title */}
      <h3 className="
        text-xl font-bold mb-3
        text-transparent bg-clip-text bg-gradient-to-r
        from-gray-100 to-gray-300
        group-hover:from-primary-300 group-hover:to-accent-cyan
        transition-all duration-300
      ">
        {post.title}
      </h3>

      {/* Excerpt */}
      <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
        {post.excerpt}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {post.tags.slice(0, 4).map(tag => (
          <span
            key={tag}
            className="
              px-2 py-1 text-xs font-medium rounded-md
              bg-primary-500/10 text-primary-300
              border border-primary-500/20
              transition-colors duration-200
              group-hover:bg-primary-500/20
            "
          >
            #{tag}
          </span>
        ))}
        {post.tags.length > 4 && (
          <span className="px-2 py-1 text-xs text-gray-500">
            +{post.tags.length - 4}
          </span>
        )}
      </div>

      {/* Meta Info */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Calendar size={14} />
          <span>{formatDate(post.date, 'yyyy.MM.dd')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={14} />
          <span>{formatReadingTime(post.readingTime)}</span>
        </div>
      </div>

      {/* Glow Effect on Hover */}
      <div
        className="
          absolute inset-0 -z-10
          rounded-xl blur-xl opacity-0
          bg-gradient-to-r from-primary-500/20 to-accent-cyan/20
          group-hover:opacity-100
          transition-opacity duration-300
        "
      />
    </Link>
  );
}
