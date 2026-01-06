import { SEO } from '@/components/seo/SEO';
import { Github, Mail } from 'lucide-react';

export function About() {
  return (
    <>
      <SEO
        title="About"
        description="Frontend 개발자 jratul의 기술 블로그입니다."
      />

      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative px-4 pt-8">
          {/* Background Gradient */}
          <div className="-z-10 absolute inset-0 bg-gradient-to-b from-primary-500/5 via-transparent to-transparent" />

          <div className="mx-auto max-w-4xl">
            <h1 className="bg-clip-text bg-gradient-to-r from-primary-300 mb-6 font-bold text-transparent text-4xl md:text-6xl to-accent-blue via-accent-cyan">
              About
            </h1>

            {/* <p className="text-gray-400 text-xl leading-relaxed">
              Frontend 개발과 관련된 다양한 주제를 다루는 기술 블로그입니다.
            </p> */}
          </div>
        </section>

        {/* Content Section */}
        <section className="px-4 py-4">
          <div className="space-y-12 mx-auto max-w-4xl">
            {/* Blog Info */}
            {/* <div
              className="bg-dark-surface/50 backdrop-blur-sm p-8 border border-dark-border rounded-xl"
            >
              <h2 className="mb-4 font-bold text-primary-300 text-2xl">
                이 블로그는
              </h2>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  React, TypeScript, Web Development 등 프론트엔드 개발에 관한
                  다양한 주제를 다룹니다.
                </p>
                <p>
                  최신 기술 트렌드와 실무에서 경험한 내용을 바탕으로 유용한
                  정보를 공유하고자 합니다.
                </p>
              </div>
            </div> */}

            {/* Tech Stack */}
            {/* <div
              className="bg-dark-surface/50 backdrop-blur-sm p-8 border border-dark-border rounded-xl"
            >
              <h2 className="mb-4 font-bold text-primary-300 text-2xl">
                Tech Stack
              </h2>
              <div className="gap-4 grid grid-cols-2 md:grid-cols-3">
                {[
                  'React',
                  'TypeScript',
                  'Vite',
                  'TailwindCSS',
                  'React Router',
                  'Markdown',
                ].map(tech => (
                  <div
                    key={tech}
                    className="bg-primary-500/10 px-4 py-3 border border-primary-500/20 rounded-lg font-medium text-primary-300 text-center"
                  >
                    {tech}
                  </div>
                ))}
              </div>
            </div> */}

            {/* Contact */}
            <div className="bg-dark-surface/50 backdrop-blur-sm p-8 border border-dark-border rounded-xl">
              <h2 className="mb-4 font-bold text-primary-300 text-2xl">
                Contact
              </h2>
              <div className="flex gap-6">
                <a
                  href="https://github.com/jratul"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-400 hover:text-primary-400 transition-colors duration-200"
                >
                  <Github size={20} />
                  <span>GitHub</span>
                </a>
                <a
                  href="mailto:your-email@example.com"
                  className="flex items-center gap-2 text-gray-400 hover:text-primary-400 transition-colors duration-200"
                >
                  <Mail size={20} />
                  <span>Email</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
