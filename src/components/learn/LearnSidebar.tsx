import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { CATEGORY_META } from '@/types/learn';
import type { LearnCategory } from '@/types/learn';

export const LEARN_GROUPS: { label: string; categories: LearnCategory[] }[] = [
  { label: '프론트엔드', categories: ['html', 'css', 'javascript', 'typescript', 'react', 'nextjs', 'tooling'] },
  { label: '언어 & 프레임워크', categories: ['java', 'kotlin', 'spring', 'android'] },
  { label: '인프라', categories: ['docker', 'k8s', 'linux', 'aws'] },
  { label: '데이터 & 네트워크', categories: ['network', 'database', 'redis', 'cassandra', 'elasticsearch', 'kafka'] },
  { label: '데이터 엔지니어링', categories: ['airbyte', 'hive'] },
  { label: '설계 & CS', categories: ['system-design', 'algorithms', 'architecture', 'git'] },
];

function SidebarNav({
  currentCat,
  onSelect,
}: {
  currentCat: LearnCategory;
  onSelect: (cat: LearnCategory) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (label: string) =>
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));

  return (
    <nav className="w-full space-y-1">
      {LEARN_GROUPS.map(group => {
        const isOpen = !collapsed[group.label];
        return (
          <div key={group.label}>
            <button
              onClick={() => toggle(group.label)}
              className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-600 hover:text-gray-400 transition-colors"
            >
              {group.label}
              {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>

            {isOpen && (
              <ul className="mb-2 space-y-0.5">
                {group.categories.map(cat => {
                  const meta = CATEGORY_META[cat];
                  const isActive = cat === currentCat;
                  return (
                    <li key={cat}>
                      <button
                        onClick={() => onSelect(cat)}
                        className={[
                          'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-150 text-left',
                          isActive
                            ? 'bg-primary-500/15 text-primary-300'
                            : 'text-gray-500 hover:bg-dark-border/40 hover:text-gray-300',
                        ].join(' ')}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r ${meta.color}`}
                        />
                        {meta.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function LearnSidebar({ currentCat }: { currentCat: LearnCategory }) {
  const navigate = useNavigate();
  return (
    <aside className="hidden w-52 shrink-0 lg:block lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:overscroll-contain lg:pt-8 lg:pb-8">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-300">
        <BookOpen size={15} />
        학습 섹션
      </div>
      <SidebarNav currentCat={currentCat} onSelect={cat => navigate(`/learn/${cat}`)} />
    </aside>
  );
}
