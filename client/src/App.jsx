import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useTheme } from './context/ThemeContext';
import { usePageTracking } from './hooks';
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import { ProtectedRoute, AdminRoute, GuestRoute } from './components/layout/Guards';
import PageLoader from './components/common/PageLoader';

const Home = lazy(() => import('./pages/Home'));
const Templates = lazy(() => import('./pages/Templates'));
const ResumeBuilder = lazy(() => import('./pages/ResumeBuilder'));
const ResumeView = lazy(() => import('./pages/ResumeView'));
const AiGenerate = lazy(() => import('./pages/AiGenerate'));
const AtsChecker = lazy(() => import('./pages/AtsChecker'));
const CoverLetter = lazy(() => import('./pages/CoverLetter'));
const Blogs = lazy(() => import('./pages/Blogs'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const WriteBlog = lazy(() => import('./pages/WriteBlog'));
const Resources = lazy(() => import('./pages/Resources'));
const AiLab = lazy(() => import('./pages/AiLab'));
const Contact = lazy(() => import('./pages/Contact'));
const Developers = lazy(() => import('./pages/Developers'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const ProfileSettings = lazy(() => import('./pages/dashboard/ProfileSettings'));
const NotFound = lazy(() => import('./pages/NotFound'));

const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminBlogs = lazy(() => import('./pages/admin/AdminBlogs'));
const AdminTemplates = lazy(() => import('./pages/admin/AdminTemplates'));
const AdminResumes = lazy(() => import('./pages/admin/AdminResumes'));
const AdminComments = lazy(() => import('./pages/admin/AdminComments'));
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

// function ScrollToTop() {
//   const { pathname } = useLocation();
//   useEffect(() => window.scrollTo({ top: 0, behavior: 'instant' }), [pathname]);
//   return null;
// }

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export default function App() {
  const { theme } = useTheme();
  usePageTracking();

  return (
    <>
      <ScrollToTop />
      <Toaster theme={theme} position="top-right" richColors closeButton toastOptions={{ className: 'hl-toast' }} />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="templates" element={<Templates />} />
            <Route path="resumes/:id" element={<ResumeView />} />
            <Route path="builder/:id" element={<ResumeBuilder />} />
            <Route path="generate" element={<AiGenerate />} />
            <Route path="ats" element={<AtsChecker />} />
            <Route path="cover-letter" element={<CoverLetter />} />
            <Route path="blogs" element={<Blogs />} />
            <Route path="blogs/new" element={<ProtectedRoute><WriteBlog /></ProtectedRoute>} />
            <Route path="blogs/edit/:id" element={<ProtectedRoute><WriteBlog /></ProtectedRoute>} />
            <Route path="blogs/:slug" element={<BlogDetail />} />
            <Route path="resources" element={<Resources />} />
            <Route path="ai-lab" element={<AiLab />} />
            <Route path="contact" element={<Contact />} />
            <Route path="developers" element={<Developers />} />
            <Route path="u/:username" element={<PublicProfile />} />
            <Route path="login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="register" element={<GuestRoute><Register /></GuestRoute>} />
            <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="blogs" element={<AdminBlogs />} />
            <Route path="templates" element={<AdminTemplates />} />
            <Route path="resumes" element={<AdminResumes />} />
            <Route path="comments" element={<AdminComments />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
