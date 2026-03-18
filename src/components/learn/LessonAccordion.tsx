import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LearnLesson } from '@/types/learn';
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer';

interface Props {
  lessons: LearnLesson[];
}

export function LessonAccordion({ lessons }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id));

  return (
    <div className="space-y-2">
      {lessons.map((lesson, index) => {
        const isOpen = openId === lesson.id;
        return (
          <div
            key={lesson.id}
            className={[
              'border rounded-lg overflow-hidden transition-colors duration-200',
              isOpen
                ? 'border-primary-500/40 bg-dark-card'
                : 'border-dark-border bg-dark-card/50 hover:border-primary-500/20',
            ].join(' ')}
          >
            {/* 헤더 */}
            <button
              onClick={() => toggle(lesson.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left"
            >
              {/* 번호 */}
              <span
                className={[
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  isOpen
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-border text-gray-400',
                ].join(' ')}
              >
                {String(index + 1).padStart(2, '0')}
              </span>

              {/* 제목 */}
              <span
                className={[
                  'flex-1 font-medium text-sm',
                  isOpen ? 'text-primary-300' : 'text-gray-300',
                ].join(' ')}
              >
                {lesson.title}
              </span>

              {/* 화살표 */}
              <ChevronDown
                size={18}
                className={[
                  'shrink-0 text-gray-500 transition-transform duration-300',
                  isOpen ? 'rotate-180 text-primary-400' : '',
                ].join(' ')}
              />
            </button>

            {/* 콘텐츠 */}
            <div
              className={[
                'overflow-hidden transition-all duration-300',
                isOpen ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0',
              ].join(' ')}
            >
              <div className="border-t border-dark-border px-5 py-6">
                <MarkdownRenderer content={lesson.content} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
