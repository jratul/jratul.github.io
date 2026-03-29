import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { Home } from '@/pages/Home';

const Post = lazy(() => import('@/pages/Post').then(m => ({ default: m.Post })));
const About = lazy(() => import('@/pages/About').then(m => ({ default: m.About })));
const Learn = lazy(() => import('@/pages/Learn').then(m => ({ default: m.Learn })));
const LearnLessonPage = lazy(() => import('@/pages/LearnLessonPage').then(m => ({ default: m.LearnLessonPage })));

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Layout>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/post/*" element={<Post />} />
              <Route path="/learn/:category/:lessonSlug" element={<LearnLessonPage />} />
              <Route path="/learn/:category" element={<Learn />} />
              <Route path="/learn" element={<Navigate to="/learn/java" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
