import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { Home } from '@/pages/Home';
import { Post } from '@/pages/Post';
import { About } from '@/pages/About';
import { Learn } from '@/pages/Learn';
import { LearnLessonPage } from '@/pages/LearnLessonPage';

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/post/*" element={<Post />} />
            <Route path="/learn/:category/:lessonSlug" element={<LearnLessonPage />} />
            <Route path="/learn/:category" element={<Learn />} />
            <Route path="/learn" element={<Navigate to="/learn/java" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
