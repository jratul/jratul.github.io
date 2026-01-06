import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = '제목, 내용, 태그로 검색...',
  className = '',
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChange('');
  };

  // Handle keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('search-input');
        input?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`relative w-full max-w-2xl mx-auto ${className}`}>
      {/* Search Icon */}
      <div className="top-1/2 left-4 absolute text-gray-400 -translate-y-1/2">
        <Search size={20} />
      </div>

      {/* Input */}
      <input
        id="search-input"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={`
          w-full h-12 pl-12 pr-20
          bg-dark-surface/50 backdrop-blur-sm
          border-2 rounded-xl
          text-gray-700 placeholder-gray-500
          transition-all duration-300
          focus:outline-none
          ${
            isFocused
              ? 'border-primary-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
              : 'border-dark-border hover:border-primary-600'
          }
        `}
      />

      {/* Clear Button */}
      {value && (
        <button
          onClick={handleClear}
          className="top-1/2 right-14 absolute text-gray-400 hover:text-gray-200 transition-colors -translate-y-1/2 duration-200"
          aria-label="Clear search"
        >
          <X size={18} />
        </button>
      )}

      {/* Keyboard Shortcut Hint */}
      <div className="top-1/2 right-4 absolute -translate-y-1/2">
        <kbd className="hidden sm:inline-flex items-center gap-1 bg-slate-300 px-2 py-1 border border-dark-border rounded text-gray-700 text-xs">
          <span className="text-[10px]">⌘</span>K
        </kbd>
      </div>

      {/* Glow Effect on Focus */}
      {isFocused && (
        <div className="-z-10 absolute inset-0 bg-gradient-to-r from-primary-500 opacity-50 blur-xl rounded-xl animate-pulse to-accent-cyan" />
      )}
    </div>
  );
}
