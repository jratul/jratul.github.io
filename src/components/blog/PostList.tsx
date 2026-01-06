import type { PostMeta } from '@/types/blog';
import { PostCard } from './PostCard';

interface PostListProps {
  posts: PostMeta[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function PostList({
  posts,
  loading = false,
  emptyMessage = '검색 결과가 없습니다.',
  className = '',
}: PostListProps) {
  if (loading) {
    return (
      <div className={`flex justify-center items-center py-20 ${className}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="
            w-12 h-12 rounded-full
            border-4 border-primary-500/30 border-t-primary-500
            animate-spin
          " />
          <p className="text-gray-400 text-sm">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
        <div className="text-center space-y-4">
          <div className="text-6xl opacity-20">📭</div>
          <p className="text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Post Count */}
      <div className="mb-6 text-sm text-gray-400">
        총 <span className="text-primary-400 font-semibold">{posts.length}</span>개의 게시글
      </div>

      {/* Post Grid */}
      <div className="
        grid gap-6
        grid-cols-1
        md:grid-cols-2
        lg:grid-cols-3
      ">
        {posts.map(post => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  );
}
