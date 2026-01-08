import { useEffect, useRef, useState, useMemo } from 'react';
import cloud from 'd3-cloud';
import { select } from 'd3-selection';
import 'd3-transition'; // Enable .transition() method
import type { TagFrequency } from '@/types/blog';

interface TagCloudProps {
  tags: TagFrequency[];
  selectedTags: string[];
  onTagClick: (tag: string) => void;
  className?: string;
}

interface CloudWord {
  text: string;
  size: number;
  x?: number;
  y?: number;
  rotate?: number;
  count: number;
}

// Simple hash function for consistent seeding (moved outside component)
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

export function TagCloud({ tags, selectedTags, onTagClick, className = '' }: TagCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [cachedLayout, setCachedLayout] = useState<CloudWord[] | null>(null);

  // Get gradient colors for SVG linearGradient
  const getGradientColors = (index: number) => {
    const gradients = [
      ['#a78bfa', '#7dd3fc'], // primary-400 to cyan
      ['#06b6d4', '#3b82f6'], // cyan to blue
      ['#ec4899', '#a78bfa'], // pink to primary
      ['#3b82f6', '#06b6d4'], // blue to cyan
      ['#c084fc', '#ec4899'], // purple to pink
    ];
    return gradients[index % gradients.length];
  };

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = Math.min(500, Math.max(300, width * 0.5));
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Create a cache key based on tags (to detect when tags change)
  const tagsKey = useMemo(() => {
    return tags.map(t => `${t.tag}:${t.count}`).join(',');
  }, [tags]);

  // Generate word cloud layout (only when tags change, not when selectedTags change)
  useEffect(() => {
    if (tags.length === 0) return;

    // Calculate font sizes
    const maxCount = Math.max(...tags.map(t => t.count));
    const minCount = Math.min(...tags.map(t => t.count));
    const range = maxCount - minCount || 1;

    // Prepare words for d3-cloud
    const words: CloudWord[] = tags.map(tag => {
      const scale = (tag.count - minCount) / range;
      // More dramatic size difference: 16px to 80px
      const fontSize = 16 + Math.pow(scale, 0.6) * 64;

      return {
        text: `#${tag.tag}`,
        size: fontSize,
        count: tag.count,
      };
    });

    // Create word cloud layout with fixed dimensions
    const layout = cloud<CloudWord>()
      .size([800, 400]) // Use fixed dimensions for consistent layout
      .words(words)
      .padding(5)
      .rotate((d) => {
        // Consistent rotation based on tag text hash
        const rotations = [0, 0, 0, -45, 45, 0, -45, 45];
        const hash = hashString(d.text);
        return rotations[hash % rotations.length];
      })
      .fontSize(d => d.size)
      .on('end', (computedWords) => {
        setCachedLayout(computedWords);
      });

    layout.start();
  }, [tagsKey]);

  // Draw the cached layout whenever selectedTags change
  useEffect(() => {
    if (!svgRef.current || !cachedLayout) return;

    draw(cachedLayout);

    function draw(computedWords: CloudWord[]) {
      if (!svgRef.current) return;

      const svg = select(svgRef.current);
      svg.selectAll('*').remove();

      // Create defs for gradients and filters
      const defs = svg.append('defs');

      // Define gradients for each word
      computedWords.forEach((_word, i) => {
        const [color1, color2] = getGradientColors(i);
        const gradientId = `gradient-${i}`;

        const gradient = defs
          .append('linearGradient')
          .attr('id', gradientId)
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '100%')
          .attr('y2', '0%');

        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', color1);

        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', color2);
      });

      // Create glow filters
      const normalGlow = defs.append('filter')
        .attr('id', 'glow-normal')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');

      normalGlow.append('feGaussianBlur')
        .attr('stdDeviation', '4')
        .attr('result', 'coloredBlur');

      const normalMerge = normalGlow.append('feMerge');
      normalMerge.append('feMergeNode').attr('in', 'coloredBlur');
      normalMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      const hoverGlow = defs.append('filter')
        .attr('id', 'glow-hover')
        .attr('x', '-75%')
        .attr('y', '-75%')
        .attr('width', '250%')
        .attr('height', '250%');

      hoverGlow.append('feGaussianBlur')
        .attr('stdDeviation', '8')
        .attr('result', 'coloredBlur');

      const hoverMerge = hoverGlow.append('feMerge');
      hoverMerge.append('feMergeNode').attr('in', 'coloredBlur');
      hoverMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      const g = svg
        .attr('width', dimensions.width)
        .attr('height', dimensions.height)
        .append('g')
        .attr('transform', `translate(${dimensions.width / 2},${dimensions.height / 2})`);

      const text = g
        .selectAll('text')
        .data(computedWords)
        .enter()
        .append('text')
        .style('font-size', d => `${d.size}px`)
        .style('font-family', 'Pretendard, sans-serif')
        .style('font-weight', 'bold')
        .style('cursor', 'pointer')
        .attr('text-anchor', 'middle')
        .attr('transform', d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
        .text(d => d.text);

      // Apply gradient fills to SVG text
      text.each(function(d, i) {
        const element = select(this);
        const isSelected = selectedTags.includes(d.text.replace('#', ''));

        element
          .attr('fill', `url(#gradient-${i})`)
          .style('opacity', isSelected ? '1' : '0.75')
          .attr('filter', isSelected ? 'url(#glow-normal)' : null)
          .on('mouseenter', function(this: SVGTextElement) {
            const wordData = select(this).datum() as CloudWord;
            select(this)
              .transition()
              .duration(200)
              .style('opacity', '1')
              .attr('filter', 'url(#glow-hover)')
              .attr('transform', () => {
                const scale = 1.15;
                return `translate(${wordData.x},${wordData.y})rotate(${wordData.rotate})scale(${scale})`;
              });
          })
          .on('mouseleave', function(this: SVGTextElement) {
            const wordData = select(this).datum() as CloudWord;
            const stillSelected = selectedTags.includes(wordData.text.replace('#', ''));
            select(this)
              .transition()
              .duration(300)
              .style('opacity', stillSelected ? '1' : '0.75')
              .attr('filter', stillSelected ? 'url(#glow-normal)' : null)
              .attr('transform', `translate(${wordData.x},${wordData.y})rotate(${wordData.rotate})`);
          })
          .on('click', () => {
            onTagClick(d.text.replace('#', ''));
          });
      });

      // Add tooltips
      text.append('title')
        .text(d => `${d.text.replace('#', '')} (${d.count}개 글)`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedLayout, selectedTags, dimensions, onTagClick]);

  if (tags.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500">아직 태그가 없습니다.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      <svg
        ref={svgRef}
        className="mx-auto"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}
