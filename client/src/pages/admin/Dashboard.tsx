import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Spinner } from '../../components/ui';
import { useTitle } from '../../components/Layout';
import { api } from '../../lib/api';
import { useCountUp } from '../../lib/motion';
import { faRelative, toFa } from '../../lib/format';
import type { Overview } from '../../lib/types';

function Kpi({ value, label, hint, tone }: { value: number; label: string; hint?: string; tone: string }) {
  const shown = useCountUp(value, 700);
  return (
    <div className="kpi" data-accent={tone}>
      <span className="kpi__label">{label}</span>
      <span className="kpi__value tnum">{toFa(shown)}</span>
      {hint && <span className="kpi__hint">{hint}</span>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<Overview | null>(null);
  useTitle('داشبورد');

  useEffect(() => {
    let stale = false;
    api.admin
      .overview()
      .then((res) => {
        if (!stale) setData(res);
      })
      .catch(() => undefined);
    return () => {
      stale = true;
    };
  }, []);

  if (!data) return <Spinner />;

  const { counts, byCategory, topProjects, recentMessages } = data;
  const maxCategory = Math.max(1, ...byCategory.map((c) => c.total));

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>داشبورد</h1>
          <p className="muted">یک نگاه کوتاه به وضعیت سایت.</p>
        </div>
        <Link to="/admin/projects/new" className="btn btn--primary btn--sm">
          <span className="btn__label">پروژه‌ی جدید</span>
        </Link>
      </div>

      <div className="kpis">
        <Kpi value={counts.published} label="پروژه‌ی منتشرشده" hint={`از ${toFa(counts.projects)} پروژه`} tone="blue" />
        <Kpi value={counts.categories} label="دسته‌بندی" tone="mint" />
        <Kpi value={counts.unread} label="پیام خوانده‌نشده" hint={`از ${toFa(counts.messages)} پیام`} tone="cream" />
        <Kpi value={counts.views} label="بازدید صفحات پروژه" tone="violet" />
        <Kpi value={counts.comments} label="نظر ثبت‌شده" hint={`از ${toFa(counts.members)} کاربر`} tone="sky" />
        <Kpi value={counts.media} label="تصویر و ویدیو" tone="rose" />
      </div>

      <div className="panels">
        <section className="panel">
          <div className="panel__head">
            <h2>پروژه‌ها در هر دسته</h2>
          </div>
          <ul className="bars">
            {byCategory.map((row) => (
              <li key={row.title} className="bar" data-accent={row.accent}>
                <span className="bar__label">{row.title}</span>
                <span className="bar__track">
                  <span className="bar__fill" style={{ width: `${(row.total / maxCategory) * 100}%` }} />
                </span>
                <span className="bar__value tnum">{toFa(row.total)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>تازه‌ترین پیام‌ها</h2>
            <Link to="/admin/messages" className="panel__more">همه</Link>
          </div>
          {recentMessages.length === 0 ? (
            <p className="panel__empty">هنوز پیامی نرسیده.</p>
          ) : (
            <ul className="feed">
              {recentMessages.map((m) => (
                <li key={m.id} className="feed__item">
                  <span className={`feed__dot${m.isRead ? '' : ' is-new'}`} aria-hidden="true" />
                  <span className="feed__body">
                    <span className="feed__title">{m.name}</span>
                    <span className="feed__text">{m.subject || m.body.slice(0, 60)}</span>
                  </span>
                  <span className="feed__time">{faRelative(m.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>پربازدیدترین پروژه‌ها</h2>
            <Link to="/admin/projects" className="panel__more">همه</Link>
          </div>
          {topProjects.length === 0 ? (
            <p className="panel__empty">هنوز پروژه‌ای ثبت نشده.</p>
          ) : (
            <ul className="feed">
              {topProjects.map((p) => (
                <li key={p.id} className="feed__item">
                  <span className="feed__icon" data-accent={p.accent}><Icon name={p.icon} /></span>
                  <span className="feed__body">
                    <Link to={`/admin/projects/${p.id}`} className="feed__title">{p.title}</Link>
                    <span className="feed__text">{p.category?.title ?? '—'}</span>
                  </span>
                  <span className="feed__time tnum">{toFa(p.views)} بازدید</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
