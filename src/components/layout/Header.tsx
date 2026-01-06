import { Link } from 'react-router-dom';
import { Github } from 'lucide-react';

export function Header() {
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
