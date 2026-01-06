import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePosts } from '@/hooks/usePosts';
import { SEO } from '@/components/seo/SEO';
import { SearchBar } from '@/components/blog/SearchBar';
import { PostList } from '@/components/blog/PostList';

export function Home() {
  const [searchParams] = useSearchParams();

  // URL에서 태그 파라미터 읽기
  const initialTags = useMemo(() => {
    const tagParam = searchParams.get('tag');
    return tagParam ? [tagParam] : [];
  }, [searchParams]);

  const {
    filteredPosts,
    searchQuery,
    selectedTags,
    loading,
    setSearchQuery,
    toggleTag,
    clearFilters,
  } = usePosts(initialTags);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedTags.length > 0;

  return (
    <>
      <SEO />

      <div className="min-h-screen">
        {/* Hero Section with Tag Cloud */}
        <section className="relative px-4 py-4 md:py-4">
          {/* Background Gradient */}
          <div className="-z-10 absolute inset-0 bg-gradient-to-b from-primary-500/5 via-transparent to-transparent" />

          <div className="mx-auto max-w-7xl">
            {/* Tag Cloud */}
            {/* <TagCloud
              tags={tagFrequencies}
              selectedTags={selectedTags}
              onTagClick={toggleTag}
              className="mb-12"
            /> */}

            {/* Search Bar */}
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              className="mb-8"
            />

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex justify-center items-center gap-3 mt-4 mb-8">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="bg-primary-500/20 hover:bg-primary-500/30 px-3 py-1 border border-primary-500/40 rounded-full text-primary-300 text-sm transition-colors duration-200"
                    >
                      #{tag} ×
                    </button>
                  ))}
                  {searchQuery && (
                    <span className="px-3 py-1 text-gray-400 text-sm">
                      검색: "{searchQuery}"
                    </span>
                  )}
                </div>
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 text-gray-400 hover:text-gray-200 text-sm underline underline-offset-2 transition-colors duration-200"
                >
                  필터 초기화
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Posts Section */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-7xl">
            <PostList
              posts={filteredPosts}
              loading={loading}
              emptyMessage={
                hasActiveFilters
                  ? '검색 결과가 없습니다. 다른 검색어나 태그를 시도해보세요.'
                  : '아직 게시글이 없습니다.'
              }
            />
          </div>
        </section>
      </div>
    </>
  );
}
