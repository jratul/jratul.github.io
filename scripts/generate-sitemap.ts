import fs from 'fs';

interface Post {
  slug: string;
  date: string;
}

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  priority: string;
  changefreq: string;
}

const baseUrl = 'https://jratul.github.io';

function generateSitemap(posts: Post[]): string {
  const urls: SitemapUrl[] = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/about', priority: '0.8', changefreq: 'monthly' },
    ...posts.map(post => ({
      loc: `/post/${post.slug}`,
      lastmod: post.date,
      priority: '0.9',
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

// posts-index.json이 있는지 확인
if (!fs.existsSync('public/posts-index.json')) {
  console.error('❌ posts-index.json not found. Run generate:index first.');
  process.exit(1);
}

const postsIndex = JSON.parse(
  fs.readFileSync('public/posts-index.json', 'utf-8')
);
const sitemap = generateSitemap(postsIndex.posts);

fs.writeFileSync('public/sitemap.xml', sitemap);

console.log(`✅ Generated sitemap.xml with ${postsIndex.posts.length + 2} URL(s)`);
console.log(`📍 Output: public/sitemap.xml`);
