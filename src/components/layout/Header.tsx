import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Github, ChevronDown } from 'lucide-react';
import { CATEGORY_META } from '@/types/learn';
import type { LearnCategory } from '@/types/learn';

const LEARN_GROUPS: { label: string; categories: LearnCategory[] }[] = [
  { label: '언어 & 프레임워크', categories: ['java', 'kotlin', 'spring'] },
  { label: '인프라', categories: ['docker', 'k8s', 'linux', 'aws'] },
  { label: '데이터 & 네트워크', categories: ['network', 'database', 'redis'] },
  { label: '설계 & CS', categories: ['system-design', 'algorithms', 'architecture', 'git'] },
];

export function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isLearnActive = location.pathname.startsWith('/learn');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="top-0 z-50 sticky bg-dark-bg/80 backdrop-blur-md border-dark-border border-b">
      <nav className="flex justify-between items-center mx-auto px-4 max-w-7xl h-16">
        {/* Logo */}
        <Link
          to="/"
          className="bg-clip-text bg-gradient-to-r from-primary-400 hover:from-primary-300 font-bold text-transparent text-xl transition-all duration-300 to-accent-cyan hover:to-accent-blue"
        >
          Home
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-4">
          {/* 학습 드롭다운 */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(prev => !prev)}
              onMouseEnter={() => setDropdownOpen(true)}
              className={[
                'flex items-center gap-1 text-sm font-medium transition-colors duration-200',
                isLearnActive ? 'text-primary-400' : 'text-gray-400 hover:text-gray-200',
              ].join(' ')}
            >
              학습
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {dropdownOpen && (
              <div
                className="fixed inset-x-2 top-16 z-50 rounded-lg border border-dark-border bg-dark-card/95 shadow-xl backdrop-blur-md lg:absolute lg:inset-x-auto lg:right-0 lg:top-full lg:mt-2 lg:w-[520px]"
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <div className="grid grid-cols-1 gap-x-1 p-2 lg:grid-cols-2">
                  {LEARN_GROUPS.map(group => (
                    <div key={group.label} className="mb-1">
                      <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                        {group.label}
                      </p>
                      {group.categories.map(cat => {
                        const meta = CATEGORY_META[cat];
                        const isActive = location.pathname === `/learn/${cat}`;
                        return (
                          <Link
                            key={cat}
                            to={`/learn/${cat}`}
                            onClick={() => setDropdownOpen(false)}
                            className={[
                              'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors duration-150',
                              isActive
                                ? 'bg-primary-500/15 text-primary-300'
                                : 'text-gray-400 hover:bg-dark-border/50 hover:text-gray-200',
                            ].join(' ')}
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r ${meta.color}`}
                            />
                            {meta.label}
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            to="/about"
            className="font-medium text-gray-400 hover:text-gray-200 text-sm transition-colors duration-200"
          >
            About
          </Link>

          <a
            href="https://github.com/jratul"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-primary-400 transition-colors duration-200"
            aria-label="GitHub Profile"
          >
            <Github size={20} />
          </a>
        </div>
      </nav>
    </header>
  );
}
