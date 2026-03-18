export interface LearnLesson {
  id: string;         // "java/01-variables"
  category: string;  // "java" | "kotlin" | "spring"
  order: number;
  title: string;
  content: string;   // 마크다운 전문
}

export interface LearnIndex {
  lessons: LearnLesson[];
  lastGenerated: string;
}

export type LearnCategory = 'java' | 'kotlin' | 'spring';

export const CATEGORY_META: Record<LearnCategory, { label: string; description: string; color: string }> = {
  java: {
    label: 'Java',
    description: '객체지향 프로그래밍의 기초부터 고급 개념까지',
    color: 'from-orange-500 to-red-500',
  },
  kotlin: {
    label: 'Kotlin',
    description: 'Java보다 간결하고 안전한 JVM 언어',
    color: 'from-purple-500 to-violet-500',
  },
  spring: {
    label: 'Spring Boot',
    description: '실무에서 가장 많이 쓰는 Java 백엔드 프레임워크',
    color: 'from-green-500 to-emerald-500',
  },
};
