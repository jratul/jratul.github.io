export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  content: string;
  readingTime: number;
  filePath: string;
}

export interface PostsIndex {
  posts: PostMeta[];
  lastGenerated: string;
}

export interface TagFrequency {
  tag: string;
  count: number;
}
