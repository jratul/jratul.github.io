import { useState, useEffect } from 'react';
import type { TocItem } from '@/utils/toc';

interface Props {
  items: TocItem[];
}

export function TableOfContents({ items }: Props) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0% -60% 0%', threshold: 0 }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <nav className="sticky top-24">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
        목차
      </p>
      <ul className="space-y-0.5 border-l border-dark-border">
        {items.map(item => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <button
                onClick={() => handleClick(item.id)}
                className={[
                  'w-full text-left text-sm leading-snug py-1 transition-all duration-150',
                  item.level === 3 ? 'pl-6' : 'pl-3',
                  isActive
                    ? 'text-primary-400 font-medium border-l-2 border-primary-400 -ml-px'
                    : 'text-gray-500 hover:text-gray-300',
                ].join(' ')}
              >
                {item.text}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
