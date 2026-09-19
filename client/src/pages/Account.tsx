import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { IconArt } from '../components/IconArt';
import { Button, Field, Reveal } from '../components/ui';
import { useTitle } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { useSite } from '../lib/site';
import { useToast } from '../lib/toast';
import { useTilt } from '../lib/motion';
import { cx, faDate } from '../lib/format';

type Tab = 'login' | 'register';

/**
 * One door for everyone. Members get a normal account for commenting; the
 * owner's credentials simply come back with an admin role, which is the only
 * thing that makes the panel reachable. Nothing here advertises that.
 */
export default function Account() {
  const { user, isAdmin, ready, login, register, logout } = useAuth();
  const { text, flag } = useSite();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const registrationOpen = flag('registration_enabled');
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'register' && registrationOpen ? 'register' : 'login');

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const artRef = useTilt<HTMLDivElement>({ max: 14 });

  useTitle(user ? 'حساب کاربری' : tab === 'register' ? 'ثبت‌نام' : 'ورود');

  useEffect(() => {
    setError(null);
  }, [tab]);

  const pickTab = (next: Tab) => {
    setTab(next);
    const q = new URLSearchParams(params);
    if (next === 'register') q.set('tab', 'register');
    else q.delete('tab');
    setParams(q, { replace: true });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const account =
        tab === 'login'
          ? await login(username, password)
          : await register({ username, name: name || username, password });

      notify(tab === 'login' ? `خوش آمدید، ${account.name}.` : 'حساب شما ساخته شد.');
      // The panel only exists for the owner, so only the owner is sent there.
      navigate(account.role === 'admin' ? '/admin' : '/projects', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'انجام نشد. دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await logout();
    notify('از حساب خارج شدید.');
    navigate('/');
  };

  // ── Signed in ──────────────────────────────────────────────────────────────
  if (ready && user) {
    return (
      <section className="section">
        <div className="shell">
          <div className="login">
            <Reveal className="login__card">
              <p className="eyebrow"><span>ACCOUNT</span></p>
              <h1 className="login__title">سلام {user.name}</h1>
              <p className="muted login__note">
                با این حساب می‌توانید زیر هر پروژه نظر بگذارید و نظرهای خودتان را حذف کنید.
              </p>

              <dl className="factbox factbox--flat">
                <dt>نام نمایشی</dt>
                <dd>{user.name}</dd>
                <dt>نام کاربری</dt>
                <dd className="ltr">{user.username}</dd>
                <dt>نوع حساب</dt>
                <dd>{isAdmin ? 'مدیر سایت' : 'کاربر عادی'}</dd>
              </dl>

              <div className="form__actions">
                {isAdmin && <Button to="/admin" arrow>ورود به پنل مدیریت</Button>}
                <Button to="/projects" variant="outline" size="sm">دیدن نمونه‌کارها</Button>
                <button type="button" className="login__back" onClick={signOut}>خروج از حساب</button>
              </div>
            </Reveal>

            <Reveal className="login__art" delay={120}>
              <div ref={artRef}>
                <IconArt name="spark" size="xl" seed={13} />
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    );
  }

  // ── Signed out ─────────────────────────────────────────────────────────────
  return (
    <section className="section">
      <div className="shell">
        <div className="login">
          <Reveal className="login__card">
            <Link to="/" className="logo logo--lg login__logo">
              <strong>{text('site_name_latin_a', 'Vibe')}</strong>
              <span>{text('site_name_latin_b', 'Namune')}</span>
            </Link>

            {registrationOpen && (
              <div className="tabs" role="tablist" aria-label="ورود یا ثبت‌نام">
                <button
                  type="button" role="tab" aria-selected={tab === 'login'}
                  className={cx('tabs__btn', tab === 'login' && 'is-on')} onClick={() => pickTab('login')}
                >
                  ورود
                </button>
                <button
                  type="button" role="tab" aria-selected={tab === 'register'}
                  className={cx('tabs__btn', tab === 'register' && 'is-on')} onClick={() => pickTab('register')}
                >
                  ثبت‌نام
                </button>
              </div>
            )}

            <h1 className="login__title">{tab === 'login' ? 'ورود به حساب' : 'ساخت حساب تازه'}</h1>
            <p className="muted login__note">
              {tab === 'login'
                ? 'با حساب خود وارد شوید تا بتوانید روی پروژه‌ها نظر بگذارید.'
                : 'یک نام کاربری و گذرواژه انتخاب کنید. چیز دیگری لازم نیست.'}
            </p>

            {error && <p className="banner banner--error">{error}</p>}

            <form onSubmit={submit} className="form" noValidate>
              <Field
                label="نام کاربری" name="username" value={username} onChange={setUsername}
                required autoComplete="username" maxLength={60}
              />
              {tab === 'register' && (
                <Field
                  label="نام نمایشی" name="name" value={name} onChange={setName}
                  autoComplete="name" maxLength={60} hint="همین نام کنار نظرهای شما دیده می‌شود."
                />
              )}
              <Field
                label="گذرواژه" name="password" type="password" value={password} onChange={setPassword}
                required autoComplete={tab === 'login' ? 'current-password' : 'new-password'} maxLength={200}
                hint={tab === 'register' ? 'حداقل ۸ نویسه.' : undefined}
              />
              <div className="form__actions">
                <Button type="submit" arrow disabled={busy}>
                  {busy ? 'کمی صبر کنید…' : tab === 'login' ? 'ورود' : 'ساخت حساب'}
                </Button>
                <Link to="/" className="login__back">بازگشت به سایت</Link>
              </div>
            </form>

            {!registrationOpen && (
              <p className="muted login__note">ثبت‌نام کاربران تازه فعلاً بسته است.</p>
            )}
            <p className="login__fine muted">
              حساب شما فقط برای نظر گذاشتن استفاده می‌شود. تاریخ امروز: {faDate(new Date().toISOString())}
            </p>
          </Reveal>

          <Reveal className="login__art" delay={120}>
            <div ref={artRef}>
              <IconArt name="spark" size="xl" seed={13} />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
