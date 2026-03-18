import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

interface LearnLesson {
  id: string;
  category: string;
  order: number;
  title: string;
  content: string;
}

interface LearnIndex {
  lessons: LearnLesson[];
  lastGenerated: string;
}

function scanLearnFiles(dir: string): LearnLesson[] {
  const lessons: LearnLesson[] = [];

  if (!fs.existsSync(dir)) {
    console.log(`⚠️  Directory not found: ${dir}`);
    return lessons;
  }

  const categories = fs.readdirSync(dir);

  categories.forEach((category: string) => {
    const categoryPath = path.join(dir, category);
    if (!fs.statSync(categoryPath).isDirectory()) return;

    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.md'));

    files.forEach((file: string) => {
      const fullPath = path.join(categoryPath, file);
      try {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const { data, content: markdown } = matter(raw);

        // 파일명에서 순서 추출: "01-variables.md" → 1
        const orderMatch = file.match(/^(\d+)/);
        const order = orderMatch ? parseInt(orderMatch[1], 10) : 99;

        const id = `${category}/${file.replace(/\.md$/, '')}`;

        lessons.push({
          id,
          category,
          order,
          title: data.title || file.replace(/^\d+-/, '').replace(/\.md$/, ''),
          content: markdown,
        });

        console.log(`✓ Processed: ${id}`);
      } catch (error) {
        console.error(`❌ Error processing ${fullPath}:`, error);
      }
    });
  });

  return lessons;
}

// 실행
console.log('📚 Generating learn index...\n');

const learnDir = 'public/learn';
const lessons = scanLearnFiles(learnDir);

// 카테고리별, 순서별 정렬
lessons.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  return a.order - b.order;
});

const index: LearnIndex = {
  lessons,
  lastGenerated: new Date().toISOString(),
};

if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

fs.writeFileSync('public/learn-index.json', JSON.stringify(index, null, 2));

console.log(`\n✅ Generated learn-index.json with ${lessons.length} lesson(s)`);
console.log(`📍 Output: public/learn-index.json`);
