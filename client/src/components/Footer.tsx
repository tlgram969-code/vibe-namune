import { Link } from 'react-router-dom';
import { useSite } from '../lib/site';
import { useAuth } from '../lib/auth';
import { toFa } from '../lib/format';

export function Footer() {
  const { categories, text, stats } = useSite();
  const { user } = useAuth();
  const email = text('contact_email');
  const telegram = text('contact_telegram');
  const github = text('contact_github');
  const year = toFa(new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(new Date()));

  return (
    <footer className="footer">
      <div className="shell footer__grid">
        <div className="footer__brand">
          <Link to="/" className="logo logo--lg">
            <strong>{text('site_name_latin_a', 'Vibe')}</strong>
            <span>{text('site_name_latin_b', 'Namune')}</span>
          </Link>
          <p className="footer__note">{text('site_tagline', 'نمونه کارهای من با وایب کدینگ')}</p>
          <p className="footer__meta">
            <span className="tnum">{toFa(stats.projects)}</span> پروژه در{' '}
            <span className="tnum">{toFa(stats.categories)}</span> دسته‌بندی
          </p>
        </div>

        <nav className="footer__col" aria-label="دسته‌بندی‌ها">
          <h4>دسته‌بندی‌ها</h4>
          <ul>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link to={`/c/${c.slug}`}>{c.title}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="footer__col" aria-label="پیوندها">
          <h4>پیوندها</h4>
          <ul>
            <li><Link to="/projects">همه‌ی نمونه‌کارها</Link></li>
            <li><Link to="/about">درباره من</Link></li>
            <li><Link to="/contact">تماس با ما</Link></li>
            <li><Link to="/account">{user ? 'حساب کاربری' : 'ورود / ثبت‌نام'}</Link></li>
          </ul>
        </nav>

        <div className="footer__col">
          <h4>ارتباط</h4>
          <ul>
            {email && <li><a href={`mailto:${email}`} className="ltr">{email}</a></li>}
            {telegram && <li><a href={telegram} target="_blank" rel="noreferrer noopener">تلگرام</a></li>}
            {github && <li><a href={github} target="_blank" rel="noreferrer noopener">گیت‌هاب</a></li>}
            {!email && !telegram && !github && <li className="muted">هنوز راه ارتباطی ثبت نشده.</li>}
          </ul>
        </div>
      </div>

      <div className="shell footer__bottom">
        <span>© {year} — {text('site_name', 'وایب نمونه')}</span>
        <span className="muted">{text('footer_note', 'ساخته‌شده با دقت روی جزئیات.')}</span>
      </div>
    </footer>
  );
}
