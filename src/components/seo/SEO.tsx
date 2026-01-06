import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  canonicalUrl?: string;
}

const DEFAULT_TITLE = 'jratul.github.io';
const DEFAULT_DESCRIPTION = 'Frontend 개발 블로그 - React, TypeScript, Web Development';
const DEFAULT_KEYWORDS = ['react', 'typescript', 'frontend', 'web development', 'blog'];
const DEFAULT_AUTHOR = 'jratul';
const SITE_URL = 'https://jratul.github.io';

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  author = DEFAULT_AUTHOR,
  ogType = 'website',
  ogImage,
  canonicalUrl,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE;
  const canonical = canonicalUrl || SITE_URL;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content={author} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta property="og:site_name" content={DEFAULT_TITLE} />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />

      {/* Viewport */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      {/* Language */}
      <html lang="ko" />
    </Helmet>
  );
}
