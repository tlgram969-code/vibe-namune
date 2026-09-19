import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { useSite } from '../lib/site';
import { useSeo } from '../lib/seo';

/** Sends the viewport back to the top on every navigation. */
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

/** Title-only shorthand over useSeo, for pages with nothing else to declare. */
export function useTitle(title?: string) {
  useSeo({ title });
}

export function Layout() {
  const { error } = useSite();

  return (
    <div className="site">
      <ScrollReset />
      <div className="site__bg" aria-hidden="true">
        <span className="site__glow site__glow--a" />
        <span className="site__glow site__glow--b" />
      </div>

      <a className="skiplink" href="#main">پرش به محتوای اصلی</a>

      <Header />

      <main id="main" tabIndex={-1}>
        {error && (
          <div className="shell">
            <p className="banner banner--error">{error}</p>
          </div>
        )}
        <Outlet />
      </main>

      <Footer />
      <svg className="site__wave" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 64c180-42 340-42 520-6s380 48 560 12 250-50 360-58v112H0Z" fill="currentColor" />
      </svg>
    </div>
  );
}
