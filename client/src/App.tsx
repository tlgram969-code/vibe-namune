import { Component, Suspense, lazy } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';

import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { ThemeProvider } from './lib/theme';
import { SiteProvider } from './lib/site';
import { AuthProvider, useAuth } from './lib/auth';
import { ToastProvider } from './lib/toast';

import Home from './pages/Home';
import Projects from './pages/Projects';
import CategoryPage from './pages/Category';
import ProjectPage from './pages/Project';
import About from './pages/About';
import Contact from './pages/Contact';
import Account from './pages/Account';
import NotFound from './pages/NotFound';

// The panel is a separate bundle — visitors never download it.
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProjects = lazy(() => import('./pages/admin/AdminProjects'));
const ProjectEdit = lazy(() => import('./pages/admin/ProjectEdit'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminComments = lazy(() => import('./pages/admin/AdminComments'));
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

/** Keeps one broken component from blanking the whole page. */
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('VibeNamune render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="crash">
        <h1>مشکلی در نمایش صفحه پیش آمد</h1>
        <p className="muted">صفحه را دوباره بارگذاری کنید؛ اگر ادامه داشت از طریق فرم تماس خبر بدهید.</p>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => window.location.reload()}>
          <span className="btn__label">بارگذاری دوباره</span>
        </button>
      </div>
    );
  }
}

/**
 * The panel's routes are registered only for the owner. For anyone else /admin
 * is simply not a route, so it falls through to the ordinary "page not found"
 * — nothing on the site hints that a panel exists.
 */
function Routing() {
  const { ready, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const wantsPanel = pathname === '/admin' || pathname.startsWith('/admin/');

  // Waiting only blocks the panel's own URLs; public pages paint straight away.
  if (!ready && wantsPanel) {
    return <div className="suspense"><Spinner /></div>;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="projects" element={<Projects />} />
        <Route path="c/:slug" element={<CategoryPage />} />
        <Route path="p/:slug" element={<ProjectPage />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="account" element={<Account />} />
        <Route path="login" element={<Account />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {isAdmin && (
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="projects/new" element={<ProjectEdit />} />
          <Route path="projects/:id" element={<ProjectEdit />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="comments" element={<AdminComments />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SiteProvider>
          <AuthProvider>
            <ToastProvider>
              <BrowserRouter>
                <Suspense fallback={<div className="suspense"><Spinner /></div>}>
                  <Routing />
                </Suspense>
              </BrowserRouter>
            </ToastProvider>
          </AuthProvider>
        </SiteProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
