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

export type LearnCategory =
  | 'java'
  | 'kotlin'
  | 'spring'
  | 'docker'
  | 'k8s'
  | 'linux'
  | 'network'
  | 'database'
  | 'redis'
  | 'aws'
  | 'system-design'
  | 'algorithms'
  | 'git'
  | 'architecture'
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'react'
  | 'nextjs';

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
  docker: {
    label: 'Docker',
    description: '컨테이너 기반 애플리케이션 패키징과 실행',
    color: 'from-blue-500 to-cyan-500',
  },
  k8s: {
    label: 'Kubernetes',
    description: '컨테이너 오케스트레이션과 클러스터 관리',
    color: 'from-blue-600 to-indigo-500',
  },
  linux: {
    label: 'Linux',
    description: '서버 운영의 기반이 되는 리눅스 명령어와 관리',
    color: 'from-yellow-500 to-orange-500',
  },
  network: {
    label: '네트워크 / HTTP',
    description: 'TCP/IP, DNS, HTTP 동작 원리와 프로토콜',
    color: 'from-teal-500 to-cyan-500',
  },
  database: {
    label: 'Database',
    description: 'SQL 심화, 인덱스, 트랜잭션, 성능 최적화',
    color: 'from-amber-500 to-yellow-500',
  },
  redis: {
    label: 'Redis',
    description: '캐싱, 세션, 분산 락, 메시지 스트림',
    color: 'from-red-500 to-rose-500',
  },
  aws: {
    label: 'AWS',
    description: 'EC2, VPC, S3, RDS, ECS, Lambda 핵심 서비스',
    color: 'from-orange-400 to-amber-500',
  },
  'system-design': {
    label: '시스템 설계',
    description: '대규모 시스템 설계 원칙과 실전 아키텍처',
    color: 'from-violet-500 to-purple-500',
  },
  algorithms: {
    label: '알고리즘',
    description: '자료구조, 탐색, DP, 그래프 코딩 테스트 대비',
    color: 'from-pink-500 to-rose-500',
  },
  git: {
    label: 'Git',
    description: '브랜치 전략, Rebase, CI/CD 워크플로우',
    color: 'from-gray-400 to-gray-600',
  },
  architecture: {
    label: '소프트웨어 아키텍처',
    description: '헥사고날, 클린 아키텍처, DDD, CQRS',
    color: 'from-indigo-500 to-blue-500',
  },
  html: {
    label: 'HTML',
    description: '웹의 뼈대, 시맨틱 마크업과 웹 표준',
    color: 'from-orange-500 to-red-400',
  },
  css: {
    label: 'CSS',
    description: 'Flexbox, Grid, 애니메이션, 반응형 디자인',
    color: 'from-blue-400 to-cyan-400',
  },
  javascript: {
    label: 'JavaScript',
    description: '브라우저와 Node.js를 아우르는 웹의 언어',
    color: 'from-yellow-400 to-amber-400',
  },
  typescript: {
    label: 'TypeScript',
    description: '타입 안전성으로 더 견고한 JavaScript',
    color: 'from-blue-500 to-indigo-500',
  },
  react: {
    label: 'React',
    description: '컴포넌트 기반 UI 라이브러리',
    color: 'from-cyan-400 to-blue-400',
  },
  nextjs: {
    label: 'Next.js',
    description: 'React 기반 풀스택 웹 프레임워크',
    color: 'from-gray-300 to-gray-100',
  },
};
