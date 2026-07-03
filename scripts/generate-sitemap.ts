import fs from 'fs';

interface Post {
  slug: string;
  date: string;
}

interface LearnLesson {
  id: string; // "java/01-variables"
  category: string;
}

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  priority: string;
  changefreq: string;
}

const baseUrl = 'https://jratul.github.io';

function generateSitemap(posts: Post[], lessons: LearnLesson[]): string {
  const categories = Array.from(new Set(lessons.map(l => l.category)));

  const urls: SitemapUrl[] = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/about', priority: '0.8', changefreq: 'monthly' },
    ...posts.map(post => ({
      loc: `/post/${post.slug}`,
      lastmod: post.date,
      priority: '0.9',
      changefreq: 'monthly',
    })),
    ...categories.map(category => ({
      loc: `/learn/${category}`,
      priority: '0.8',
      changefreq: 'monthly',
    })),
    ...lessons.map(lesson => ({
      loc: `/learn/${lesson.id}`,
      priority: '0.7',
      changefreq: 'monthly',
    })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    url => `  <url>
    <loc>${baseUrl}${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;
}

// 실행
console.log('🗺️  Generating sitemap...\n');

// posts-index.json / learn-index.json이 있는지 확인
if (!fs.existsSync('public/posts-index.json')) {
  console.error('❌ posts-index.json not found. Run generate:index first.');
  process.exit(1);
}
if (!fs.existsSync('public/learn-index.json')) {
  console.error('❌ learn-index.json not found. Run generate:learn first.');
  process.exit(1);
}

const postsIndex = JSON.parse(
  fs.readFileSync('public/posts-index.json', 'utf-8')
);
const learnIndex = JSON.parse(
  fs.readFileSync('public/learn-index.json', 'utf-8')
);
const sitemap = generateSitemap(postsIndex.posts, learnIndex.lessons);

fs.writeFileSync('public/sitemap.xml', sitemap);

const categoryCount = new Set(
  learnIndex.lessons.map((l: LearnLesson) => l.category)
).size;
console.log(
  `✅ Generated sitemap.xml with ${postsIndex.posts.length + learnIndex.lessons.length + categoryCount + 2} URL(s)`
);
console.log(`📍 Output: public/sitemap.xml`);
