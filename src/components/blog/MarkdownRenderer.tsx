import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const components: Components = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      return !inline && language ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          className="rounded-lg my-4 text-sm"
          showLineNumbers
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code
          className="px-1.5 py-0.5 rounded bg-dark-surface/80 text-accent-blue text-[0.9em] font-mono"
          {...props}
        >
          {children}
        </code>
      );
    },
    h1({ children }) {
      return (
        <h1 className="text-4xl font-bold mt-8 mb-4 text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-cyan">
          {children}
        </h1>
      );
    },
    h2({ children }) {
      return (
        <h2 className="text-3xl font-bold mt-6 mb-3 text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-accent-blue">
          {children}
        </h2>
      );
    },
    h3({ children }) {
      return (
        <h3 className="text-2xl font-semibold mt-5 mb-2 text-primary-200">
          {children}
        </h3>
      );
    },
    h4({ children }) {
      return (
        <h4 className="text-xl font-semibold mt-4 mb-2 text-primary-300">
          {children}
        </h4>
      );
    },
    p({ children }) {
      return (
        <p className="my-4 leading-relaxed text-gray-300">
          {children}
        </p>
      );
    },
    ul({ children }) {
      return (
        <ul className="my-4 ml-6 list-disc space-y-2 text-gray-300">
          {children}
        </ul>
      );
    },
    ol({ children }) {
      return (
        <ol className="my-4 ml-6 list-decimal space-y-2 text-gray-300">
          {children}
        </ol>
      );
    },
    li({ children }) {
      return (
        <li className="leading-relaxed">
          {children}
        </li>
      );
    },
    blockquote({ children }) {
      return (
        <blockquote className="border-l-4 border-primary-500 pl-4 my-4 italic text-gray-400">
          {children}
        </blockquote>
      );
    },
    a({ href, children }) {
      return (
        <a
          href={href}
          className="text-accent-cyan hover:text-accent-blue underline underline-offset-2 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    },
    table({ children }) {
      return (
        <div className="my-6 overflow-x-auto">
          <table className="min-w-full border border-dark-border rounded-lg">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }) {
      return (
        <thead className="bg-dark-surface">
          {children}
        </thead>
      );
    },
    th({ children }) {
      return (
        <th className="px-4 py-2 text-left font-semibold text-primary-300 border-b border-dark-border">
          {children}
        </th>
      );
    },
    td({ children }) {
      return (
        <td className="px-4 py-2 text-gray-300 border-b border-dark-border">
          {children}
        </td>
      );
    },
    hr() {
      return (
        <hr className="my-8 border-dark-border" />
      );
    },
  };

  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
