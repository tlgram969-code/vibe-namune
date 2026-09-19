import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { SearchOverlay } from './SearchOverlay';
import { CloseIcon, IconButton, MoonIcon, SearchIcon, SunIcon, UserIcon } from './ui';
import { useSite } from '../lib/site';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useScrolled } from '../lib/motion';
import { useToast } from '../lib/toast';
import { cx, toFa } from '../lib/format';

export function Header() {
  const { categories, text } = useSite();
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { notify } = useToast();
  const scrolled = useScrolled(10);
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Any navigation closes the overlays; leaving one open across pages feels broken.
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMenuOpen(false);
        setAccountOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onClick);
    };
  }, []);

  const signOut = async () => {
    await logout();
    setAccountOpen(false);
    notify('از حساب خارج شدید.');
    navigate('/');
  };

  return (
    <>
      <header className={cx('header', scrolled && 'is-stuck')}>
        <div className="header__bar">
          <button
            type="button"
            className={cx('burger', menuOpen && 'is-open')}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>

          <Link to="/" className="logo" aria-label={text('site_name', 'وایب نمونه')}>
            <strong>{text('site_name_latin_a', 'Vibe')}</strong>
            <span>{text('site_name_latin_b', 'Namune')}</span>
          </Link>

          <div className="header__actions">
            <Link to="/contact" className="btn btn--outline btn--sm header__contact">
              <span className="btn__label">تماس با ما</span>
            </Link>

            <div className="account" ref={accountRef}>
              <button
                type="button"
                className={cx('iconbtn iconbtn--soft account__btn', accountOpen && 'is-active')}
                onClick={() => setAccountOpen((v) => !v)}
                aria-expanded={accountOpen}
                aria-label={user ? `حساب ${user.name}` : 'ورود یا ثبت‌نام'}
              >
                {user ? <span className="account__initial">{user.name.slice(0, 1)}</span> : <UserIcon size={17} />}
              </button>

              {accountOpen && (
                <div className="account__pop">
                  {user ? (
                    <>
                      <p className="account__who">
                        <strong>{user.name}</strong>
                        <span className="ltr">{user.username}</span>
                      </p>
                      {isAdmin && (
                        <Link to="/admin" className="account__link">پنل مدیریت</Link>
                      )}
                      <Link to="/account" className="account__link">حساب کاربری</Link>
                      <button type="button" className="account__link account__link--out" onClick={signOut}>
                        خروج از حساب
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="account__note">برای گذاشتن نظر روی پروژه‌ها وارد شوید.</p>
                      <Link to="/account" className="account__link">ورود</Link>
                      <Link to="/account?tab=register" className="account__link">ثبت‌نام</Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <IconButton label={theme === 'dark' ? 'حالت روز' : 'حالت شب'} onClick={toggle}>
              <span className="themeswap" data-theme-icon={theme}>
                <SunIcon size={17} />
                <MoonIcon size={17} />
              </span>
            </IconButton>

            <IconButton label="جست‌وجو" variant="solid" onClick={() => setSearchOpen(true)}>
              <SearchIcon size={17} />
            </IconButton>
          </div>
        </div>

        <nav className={cx('menu', menuOpen && 'is-open')} aria-hidden={!menuOpen}>
          <div className="menu__inner">
            <div className="menu__grid">
              {categories.map((c) => (
                <NavLink key={c.slug} to={`/c/${c.slug}`} className="menu__card" data-accent={c.accent} tabIndex={menuOpen ? 0 : -1}>
                  <span className="menu__icon">
                    <Icon name={c.icon} />
                  </span>
                  <span className="menu__meta">
                    <span className="menu__title">{c.title}</span>
                    <span className="menu__count">{toFa(c.projectCount ?? 0)} پروژه</span>
                  </span>
                </NavLink>
              ))}
            </div>

            <div className="menu__links">
              <NavLink to="/" end className="menu__link" tabIndex={menuOpen ? 0 : -1}>خانه</NavLink>
              <NavLink to="/projects" className="menu__link" tabIndex={menuOpen ? 0 : -1}>همه‌ی نمونه‌کارها</NavLink>
              <NavLink to="/about" className="menu__link" tabIndex={menuOpen ? 0 : -1}>درباره من</NavLink>
              <NavLink to="/contact" className="menu__link" tabIndex={menuOpen ? 0 : -1}>تماس با ما</NavLink>
              <NavLink to="/account" className="menu__link menu__link--accent" tabIndex={menuOpen ? 0 : -1}>
                {user ? 'حساب کاربری' : 'ورود / ثبت‌نام'}
              </NavLink>
            </div>

            <button type="button" className="menu__close" onClick={() => setMenuOpen(false)} tabIndex={menuOpen ? 0 : -1}>
              <CloseIcon size={16} />
              <span>بستن</span>
            </button>
          </div>
        </nav>
      </header>

      {menuOpen && <button type="button" className="menu__scrim" onClick={() => setMenuOpen(false)} aria-label="بستن منو" />}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
