import { useState, useEffect, useMemo, useCallback } from 'react';
import type { PostMeta, PostsIndex, TagFrequency } from '@/types/blog';

let postsIndexCache: PostsIndex | null = null;
let postsIndexPromise: Promise<PostsIndex | null> | null = null;

function loadPostsIndex(): Promise<PostsIndex | null> {
  if (postsIndexCache) return Promise.resolve(postsIndexCache);
  if (!postsIndexPromise) {
    postsIndexPromise = fetch('/posts-index.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load posts index');
        return res.json();
      })
      .then((data: PostsIndex) => {
        postsIndexCache = data;
        return data;
      })
      .catch(() => {
        postsIndexPromise = null;
        return null;
      });
  }
  return postsIndexPromise;
}

/**
 * Hook to manage posts data, search, and filtering
 */
export function usePosts(initialTags: string[] = []) {
  const [postsIndex, setPostsIndex] = useState<PostsIndex | null>(
    postsIndexCache
  );
  const [loading, setLoading] = useState(!postsIndexCache);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);

  // Load posts index on mount
  useEffect(() => {
    if (postsIndexCache) return;
    let cancelled = false;
    loadPostsIndex().then(data => {
      if (!cancelled) {
        setPostsIndex(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
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

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTags([]);
  }, []);

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
    setSelectedTags,
    loading,
    setSearchQuery,
    toggleTag,
    clearFilters,
    getPostBySlug,
  };
}
