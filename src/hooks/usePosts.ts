import { useState, useEffect, useMemo } from 'react';
import type { PostMeta, PostsIndex, TagFrequency } from '@/types/blog';

/**
 * Hook to manage posts data, search, and filtering
 */
export function usePosts(initialTags: string[] = []) {
  const [postsIndex, setPostsIndex] = useState<PostsIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);

  // Load posts index on mount
  useEffect(() => {
    async function loadPosts() {
      try {
        setLoading(true);
        const response = await fetch('/posts-index.json');
        if (!response.ok) {
          throw new Error('Failed to load posts index');
        }
        const data: PostsIndex = await response.json();
        setPostsIndex(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, []);

  // Calculate tag frequencies
  const tagFrequencies = useMemo<TagFrequency[]>(() => {
    if (!postsIndex) return [];

    const tagMap = new Map<string, number>();

    postsIndex.posts.forEach(post => {
      post.tags.forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [postsIndex]);

  // Filter posts based on search and selected tags
  const filteredPosts = useMemo<PostMeta[]>(() => {
    if (!postsIndex) return [];

    let filtered = postsIndex.posts;

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(post =>
        selectedTags.some(tag => post.tags.includes(tag))
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post => {
        const titleMatch = post.title.toLowerCase().includes(query);
        const contentMatch = post.content.toLowerCase().includes(query);
        const tagsMatch = post.tags.some(tag =>
          tag.toLowerCase().includes(query)
        );
        return titleMatch || contentMatch || tagsMatch;
      });
    }

    return filtered;
  }, [postsIndex, searchQuery, selectedTags]);

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  // Get post by slug
  const getPostBySlug = (slug: string): PostMeta | undefined => {
    return postsIndex?.posts.find(post => post.slug === slug);
  };

  return {
    posts: postsIndex?.posts || [],
    filteredPosts,
    tagFrequencies,
    searchQuery,
    selectedTags,
    loading,
    error,
    setSearchQuery,
    toggleTag,
    clearFilters,
    getPostBySlug,
  };
}
