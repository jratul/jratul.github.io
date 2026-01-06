import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

interface PostMeta {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  content: string;
  readingTime: number;
  filePath: string;
}

interface PostsIndex {
  posts: PostMeta[];
  lastGenerated: string;
}

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

function scanMarkdownFiles(dir: string): PostMeta[] {
  const posts: PostMeta[] = [];

  function scan(currentDir: string) {
    if (!fs.existsSync(currentDir)) {
      console.log(`⚠️  Directory not found: ${currentDir}`);
      return;
    }

    const files = fs.readdirSync(currentDir);

    files.forEach(file => {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (file.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const { data, content: markdown } = matter(content);

          // slug 생성: src/pages/frontend/react/useEffect.md → "frontend/react/useEffect"
          const relativePath = path.relative('src/pages', fullPath);
          const slug = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');

          // 읽기 시간 계산
          const readingTime = calculateReadingTime(markdown);

          posts.push({
            slug,
            title: data.title || slug,
            date: data.date || new Date().toISOString(),
            tags: data.tags || [],
            excerpt: data.excerpt || markdown.slice(0, 150).replace(/[#*`\n]/g, ' ').trim(),
            content: markdown, // 마크다운 원본 유지
            readingTime,
            filePath: fullPath,
          });

          console.log(`✓ Processed: ${slug}`);
        } catch (error) {
          console.error(`❌ Error processing ${fullPath}:`, error);
        }
      }
    });
  }

  scan(dir);
  return posts;
}

// 실행
console.log('📝 Generating posts index...\n');

const postsDir = 'src/pages';
const posts = scanMarkdownFiles(postsDir);

// 날짜순 정렬 (최신순)
posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const index: PostsIndex = {
  posts,
  lastGenerated: new Date().toISOString(),
};

// public 디렉토리가 없으면 생성
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

fs.writeFileSync(
  'public/posts-index.json',
  JSON.stringify(index, null, 2)
);

console.log(`\n✅ Generated posts-index.json with ${posts.length} post(s)`);
console.log(`📍 Output: public/posts-index.json`);
