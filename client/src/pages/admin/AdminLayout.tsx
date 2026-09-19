import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MoonIcon, SunIcon } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useSite } from '../../lib/site';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { api } from '../../lib/api';
import { cx, toFa } from '../../lib/format';

const NAV = [
  { to: '/admin', end: true, label: 'داشبورد', glyph: 'M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z' },
  { to: '/admin/projects', label: 'پروژه‌ها', glyph: 'M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z' },
  { to: '/admin/categories', label: 'دسته‌بندی‌ها', glyph: 'M4 6h6v6H4V6Zm10 0h6v6h-6V6ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z' },
  { to: '/admin/comments', label: 'نظرها و کاربران', glyph: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-4 4v-4a1 1 0 0 1-1-1Z' },
  { to: '/admin/messages', label: 'پیام‌ها', glyph: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Zm2 .8 6 4.2 6-4.2' },
  { to: '/admin/settings', label: 'تنظیمات', glyph: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8 3.5-.1 1.4 1.7 1.3-1.7 3-2-.8-1.2.8-.3 2.1h-3.4l-.3-2.1-1.2-.8-2 .8-1.7-3 1.7-1.3L9.4 12l-.1-1.4L7.6 9.3l1.7-3 2 .8 1.2-.8.3-2.1h3.4l.3 2.1 1.2.8 2-.8 1.7 3-1.7 1.3Z' },
];

const Glyph = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export function AdminLayout() {
  const { user, isAdmin, ready, logout } = useAuth();
  const { text } = useSite();
  const { theme, toggle } = useTheme();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [unread, setUnread] = useState(0);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => setNavOpen(false), [location.pathname]);

  // App only mounts this tree for the owner; this is the belt to that braces.
  useEffect(() => {
    if (ready && !isAdmin) navigate('/', { replace: true });
  }, [ready, isAdmin, navigate]);

  // Refreshes on every admin navigation, which keeps the badge honest.
  useEffect(() => {
    if (!user) return;
    let stale = false;
    api.admin
      .overview()
      .then((o) => {
        if (!stale) setUnread(o.counts.unread);
      })
      .catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [user, location.pathname]);

  const signOut = async () => {
    await logout();
    notify('از حساب خارج شدید.');
    navigate('/', { replace: true });
  };

  if (!ready) {
    return (
      <div className="admin admin--boot">
        <span className="loading__ring" aria-hidden="true" />
      </div>
    );
  }
  if (!user || !isAdmin) return null;

  return (
    <div className={cx('admin', navOpen && 'is-navopen')}>
      <aside className="adminnav">
        <Link to="/" className="adminnav__brand">
          <strong>{text('site_name_latin_a', 'Vibe')}</strong>
          <span>{text('site_name_latin_b', 'Namune')}</span>
        </Link>

        <nav className="adminnav__list" aria-label="بخش‌های پنل">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cx('adminnav__item', isActive && 'is-on')}>
              <Glyph d={item.glyph} />
              <span>{item.label}</span>
              {item.to === '/admin/messages' && unread > 0 && (
                <span className="adminnav__badge tnum">{toFa(unread)}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="adminnav__foot">
          <Link to="/" className="adminnav__site">مشاهده‌ی سایت</Link>
          <div className="adminnav__user">
            <span className="adminnav__avatar" aria-hidden="true">{user.name.slice(0, 1)}</span>
            <span className="adminnav__who">
              <span className="adminnav__name">{user.name}</span>
              <span className="adminnav__role">{user.username}</span>
            </span>
          </div>
          <button type="button" className="adminnav__out" onClick={signOut}>خروج از حساب</button>
        </div>
      </aside>

      <div className="adminmain">
        <header className="admintop">
          <button
            type="button" className="admintop__burger" onClick={() => setNavOpen((v) => !v)}
            aria-label="منوی پنل" aria-expanded={navOpen}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>

          <span className="admintop__title">پنل مدیریت</span>

          <div className="admintop__actions">
            <button type="button" className="iconbtn iconbtn--soft" onClick={toggle} aria-label={theme === 'dark' ? 'حالت روز' : 'حالت شب'}>
              <span className="themeswap" data-theme-icon={theme}>
                <SunIcon size={17} />
                <MoonIcon size={17} />
              </span>
            </button>
          </div>
        </header>

        <div className="adminbody">
          <Outlet />
        </div>
      </div>

      {navOpen && <button type="button" className="admin__scrim" onClick={() => setNavOpen(false)} aria-label="بستن منو" />}
    </div>
  );
}
