import { Github, Mail } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-dark-border bg-dark-bg/50 backdrop-blur-sm mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="
              text-lg font-bold mb-3
              text-transparent bg-clip-text bg-gradient-to-r
              from-primary-400 to-accent-cyan
            ">
              jratul.github.io
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Frontend 개발과 관련된 다양한 주제를 다루는 기술 블로그입니다.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-3">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="/"
                  className="text-gray-400 hover:text-primary-400 transition-colors duration-200"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  className="text-gray-400 hover:text-primary-400 transition-colors duration-200"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="/sitemap.xml"
                  className="text-gray-400 hover:text-primary-400 transition-colors duration-200"
                >
                  Sitemap
                </a>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-3">
              Connect
            </h4>
            <div className="flex gap-4">
              <a
                href="https://github.com/jratul"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  text-gray-400 hover:text-primary-400
                  transition-colors duration-200
                "
                aria-label="GitHub"
              >
                <Github size={20} />
              </a>
              <a
                href="mailto:your-email@example.com"
                className="
                  text-gray-400 hover:text-primary-400
                  transition-colors duration-200
                "
                aria-label="Email"
              >
                <Mail size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-dark-border">
          <p className="text-center text-sm text-gray-500">
            © {currentYear} jratul.github.io. Built with React + Vite + TypeScript.
          </p>
        </div>
      </div>
    </footer>
  );
}
