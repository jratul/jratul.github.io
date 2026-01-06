import { useMemo } from 'react';
import type { TagFrequency } from '@/types/blog';

interface TagCloudProps {
  tags: TagFrequency[];
  selectedTags: string[];
  onTagClick: (tag: string) => void;
  className?: string;
}

export function TagCloud({ tags, selectedTags, onTagClick, className = '' }: TagCloudProps) {
  // Calculate font size and rotation based on tag frequency
  const getTagStyle = useMemo(() => {
    if (tags.length === 0) return () => ({});

    const maxCount = Math.max(...tags.map(t => t.count));
    const minCount = Math.min(...tags.map(t => t.count));
    const range = maxCount - minCount || 1;

    return (count: number, index: number) => {
      // Scale font size between 0.875rem (14px) and 4rem (64px) - 더 큰 대비
      const minSize = 0.875;
      const maxSize = 4;
      const scale = (count - minCount) / range;
      // 비선형 스케일링으로 차이를 더 극대화
      const exponentialScale = Math.pow(scale, 0.7);
      const fontSize = minSize + exponentialScale * (maxSize - minSize);

      // 90도 단위 회전: -90, 0, 90도
      const rotations = [-90, -90, 0, 0, 0, 90, 90, 0, -90, 0, 90, 0, 0];
      const rotation = rotations[index % rotations.length];

      return {
        fontSize: `${fontSize}rem`,
        transform: `rotate(${rotation}deg)`,
      };
    };
  }, [tags]);

  // Get gradient class based on tag position for variety
  const getGradientClass = (index: number) => {
    const gradients = [
      'from-primary-400 via-primary-300 to-accent-cyan',
      'from-accent-cyan via-accent-blue to-primary-400',
      'from-accent-pink via-primary-400 to-accent-cyan',
      'from-accent-blue via-accent-cyan to-primary-300',
      'from-primary-300 via-accent-pink to-accent-blue',
    ];
    return gradients[index % gradients.length];
  };

  if (tags.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500">아직 태그가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-4 p-8 ${className}`}>
      {tags.map((tagFreq, index) => {
        const isSelected = selectedTags.includes(tagFreq.tag);
        const gradientClass = getGradientClass(index);

        return (
          <button
            key={tagFreq.tag}
            onClick={() => onTagClick(tagFreq.tag)}
            style={getTagStyle(tagFreq.count, index)}
            className={`
              font-bold transition-all duration-300 ease-out
              hover:scale-110 active:scale-95
              inline-block
              ${
                isSelected
                  ? `text-transparent bg-clip-text bg-gradient-to-r ${gradientClass}
                     drop-shadow-[0_0_12px_rgba(168,85,247,0.8)]
                     animate-pulse`
                  : `text-transparent bg-clip-text bg-gradient-to-r ${gradientClass}
                     opacity-70 hover:opacity-100
                     hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]`
              }
              cursor-pointer select-none
            `}
            title={`${tagFreq.tag} (${tagFreq.count}개 글)`}
          >
            #{tagFreq.tag}
          </button>
        );
      })}
    </div>
  );
}
