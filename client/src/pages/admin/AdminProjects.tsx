import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Confirm } from '../../components/Confirm';
import { EmptyState, SearchIcon, Spinner } from '../../components/ui';
import { useTitle } from '../../components/Layout';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { cx, faDate, toFa } from '../../lib/format';
import type { Project } from '../../lib/types';

const ALL = '__all__';

export default function AdminProjects() {
  const { notify } = useToast();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(ALL);
  const [pending, setPending] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);

  useTitle('پروژه‌ها');

  const load = useCallback(() => {
    api.admin
      .projects()
      .then(setProjects)
      .catch((err) => {
        setProjects([]);
        notify(err instanceof Error ? err.message : 'بارگذاری ناموفق بود.', 'error');
      });
  }, [notify]);

  useEffect(() => load(), [load]);

  const categories = useMemo(() => {
    if (!projects) return [];
    const seen = new Map<string, string>();
    for (const p of projects) if (p.category) seen.set(p.category.slug, p.category.title);
    return [...seen.entries()];
  }, [projects]);

  const visible = useMemo(() => {
    if (!projects) return [];
    const term = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (filter !== ALL && p.category?.slug !== filter) return false;
      if (!term) return true;
      return p.title.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term);
    });
  }, [projects, query, filter]);

  const togglePublished = async (project: Project) => {
    try {
      // The row list carries no gallery; omitting `media` leaves it untouched.
      const { media, ...rest } = project;
      void media;
      const updated = await api.admin.updateProject(project.id, { ...rest, published: !project.published });
      setProjects((list) => (list ?? []).map((p) => (p.id === updated.id ? updated : p)));
      notify(updated.published ? 'پروژه منتشر شد.' : 'پروژه به پیش‌نویس رفت.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تغییر وضعیت ناموفق بود.', 'error');
    }
  };

  const remove = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await api.admin.deleteProject(pending.id);
      setProjects((list) => (list ?? []).filter((p) => p.id !== pending.id));
      notify('پروژه حذف شد.');
      setPending(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'حذف ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>پروژه‌ها</h1>
          <p className="muted">افزودن، ویرایش و انتشار نمونه‌کارها.</p>
        </div>
        <Link to="/admin/projects/new" className="btn btn--primary btn--sm">
          <span className="btn__label">پروژه‌ی جدید</span>
        </Link>
      </div>

      <div className="toolbar toolbar--admin">
        <div className="chips">
          <button type="button" className={cx('chip', filter === ALL && 'is-on')} onClick={() => setFilter(ALL)}>همه</button>
          {categories.map(([slug, title]) => (
            <button key={slug} type="button" className={cx('chip', filter === slug && 'is-on')} onClick={() => setFilter(slug)}>
              {title}
            </button>
          ))}
        </div>
        <label className="searchbox">
          <SearchIcon size={16} />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجو…" aria-label="جست‌وجو در پروژه‌ها" />
        </label>
      </div>

      {!projects ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState title="پروژه‌ای پیدا نشد." note="فیلتر را تغییر دهید یا یک پروژه‌ی تازه بسازید." />
      ) : (
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>پروژه</th>
                <th>دسته</th>
                <th>وضعیت</th>
                <th className="is-num">بازدید</th>
                <th>به‌روزرسانی</th>
                <th><span className="sr-only">کارها</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/admin/projects/${p.id}`} className="cellmain">
                      <span className="cellmain__icon" data-accent={p.accent}><Icon name={p.icon} /></span>
                      <span className="cellmain__text">
                        <span className="cellmain__title">
                          {p.title}
                          {p.featured && <span className="minitag">منتخب</span>}
                        </span>
                        <span className="cellmain__sub ltr">{p.slug}</span>
                      </span>
                    </Link>
                  </td>
                  <td>{p.category?.title ?? '—'}</td>
                  <td>
                    <button
                      type="button"
                      className={cx('status', p.published ? 'is-live' : 'is-draft')}
                      onClick={() => togglePublished(p)}
                      title="تغییر وضعیت انتشار"
                    >
                      {p.published ? 'منتشرشده' : 'پیش‌نویس'}
                    </button>
                  </td>
                  <td className="is-num tnum">{toFa(p.views)}</td>
                  <td className="is-dim">{faDate(p.updatedAt)}</td>
                  <td>
                    <div className="rowactions">
                      <Link to={`/admin/projects/${p.id}`} className="rowbtn">ویرایش</Link>
                      <button type="button" className="rowbtn rowbtn--danger" onClick={() => setPending(p)}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Confirm
        open={pending !== null}
        title={`حذف «${pending?.title ?? ''}»؟`}
        note="این کار برگشت‌پذیر نیست."
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={remove}
      />
    </>
  );
}
