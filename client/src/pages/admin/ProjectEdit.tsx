import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon, ICON_NAMES } from '../../components/Icon';
import { ProjectCard } from '../../components/Cards';
import { Confirm } from '../../components/Confirm';
import { LogoPicker, MediaManager } from '../../components/MediaManager';
import { Field, Spinner, Toggle } from '../../components/ui';
import { useTitle } from '../../components/Layout';
import { api } from '../../lib/api';
import { useSite } from '../../lib/site';
import { useToast } from '../../lib/toast';
import { cx } from '../../lib/format';
import type { AccentName, Category, IconName, Project, ProjectInput } from '../../lib/types';

const ACCENTS: AccentName[] = ['blue', 'violet', 'mint', 'cream', 'rose', 'slate', 'sky'];

const blank = (categoryId: number): ProjectInput => ({
  title: '', slug: '', subtitle: '', summary: '', body: '',
  icon: 'spark', logoUrl: '', accent: 'blue', tags: [], media: [], linkUrl: '',
  featured: false, published: true, categoryId,
});

const toInput = (p: Project): ProjectInput => ({
  title: p.title, slug: p.slug, subtitle: p.subtitle, summary: p.summary, body: p.body,
  icon: p.icon, logoUrl: p.logoUrl, accent: p.accent, tags: p.tags,
  media: p.media ?? [], linkUrl: p.linkUrl,
  featured: p.featured, published: p.published, categoryId: p.categoryId,
});

export default function ProjectEdit() {
  const { id = 'new' } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { notify } = useToast();
  const { refresh } = useSite();

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProjectInput | null>(null);
  const [tagText, setTagText] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useTitle(isNew ? 'پروژه‌ی جدید' : 'ویرایش پروژه');

  useEffect(() => {
    let stale = false;

    const loadCategories = api.admin.categories();
    const loadProject = isNew ? Promise.resolve(null) : api.admin.project(Number(id)).catch(() => null);

    Promise.all([loadCategories, loadProject])
      .then(([cats, project]) => {
        if (stale) return;
        setCategories(cats);
        if (!isNew && !project) {
          notify('پروژه پیدا نشد.', 'error');
          navigate('/admin/projects', { replace: true });
          return;
        }
        const next = project ? toInput(project) : blank(cats[0]?.id ?? 0);
        setForm(next);
        setTagText(next.tags.join('، '));
      })
      .catch((err) => {
        if (!stale) notify(err instanceof Error ? err.message : 'بارگذاری ناموفق بود.', 'error');
      });

    return () => {
      stale = true;
    };
  }, [id, isNew, navigate, notify]);

  const set = <K extends keyof ProjectInput>(key: K) => (value: ProjectInput[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const media = form?.media ?? [];

  const preview = useMemo<Project | null>(() => {
    if (!form) return null;
    return {
      id: -1, slug: form.slug || 'preview', categoryId: form.categoryId,
      title: form.title || 'عنوان پروژه', subtitle: form.subtitle || 'زیرعنوان',
      summary: form.summary || 'خلاصه‌ی کوتاه پروژه اینجا نمایش داده می‌شود.',
      body: form.body, icon: form.icon, logoUrl: form.logoUrl, accent: form.accent,
      tags: form.tags, media: form.media ?? [],
      linkUrl: form.linkUrl, featured: form.featured, published: form.published,
      views: 0, sortOrder: 0, createdAt: '', updatedAt: '',
    };
  }, [form]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || busy) return;
    setBusy(true);
    const payload: ProjectInput = {
      ...form,
      media: form.media ?? [],
      tags: tagText.split(/[,،]/).map((t) => t.trim()).filter(Boolean),
    };
    try {
      const saved = isNew
        ? await api.admin.createProject(payload)
        : await api.admin.updateProject(Number(id), payload);
      notify(isNew ? 'پروژه ساخته شد.' : 'تغییرات ذخیره شد.');
      void refresh();
      navigate(`/admin/projects/${saved.id}`, { replace: true });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'ذخیره ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.admin.deleteProject(Number(id));
      notify('پروژه حذف شد.');
      void refresh();
      navigate('/admin/projects', { replace: true });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'حذف ناموفق بود.', 'error');
      setBusy(false);
    }
  };

  if (!form || !preview) return <Spinner />;

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{isNew ? 'پروژه‌ی جدید' : 'ویرایش پروژه'}</h1>
          <p className="muted">
            <Link to="/admin/projects" className="backlink">بازگشت به فهرست پروژه‌ها</Link>
          </p>
        </div>
        <div className="pagehead__actions">
          {!isNew && (
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setConfirmOpen(true)}>
              <span className="btn__label">حذف</span>
            </button>
          )}
          <button type="submit" form="project-form" className="btn btn--primary btn--sm" disabled={busy}>
            <span className="btn__label">{busy ? 'در حال ذخیره…' : 'ذخیره'}</span>
          </button>
        </div>
      </div>

      <form id="project-form" className="editor" onSubmit={save} noValidate>
        <div className="editor__main">
          <section className="panel">
            <div className="panel__head"><h2>محتوا</h2></div>
            <div className="panel__body">
              <div className="form__row">
                <Field label="عنوان" name="title" value={form.title} onChange={set('title')} required maxLength={120} />
                <Field label="زیرعنوان" name="subtitle" value={form.subtitle} onChange={set('subtitle')} maxLength={120} placeholder="مثلاً: افترافکت" />
              </div>
              <Field
                label="نشانی صفحه (slug)" name="slug" value={form.slug} onChange={set('slug')} maxLength={120}
                hint="اگر خالی بماند از روی عنوان ساخته می‌شود."
              />
              <Field label="خلاصه" name="summary" value={form.summary} onChange={set('summary')} rows={2} maxLength={400} hint="یک یا دو جمله؛ روی کارت نمایش داده می‌شود." />
              <Field
                label="متن کامل" name="body" value={form.body} onChange={set('body')} rows={14} maxLength={20000}
                hint="خط‌هایی که با ## شروع شوند تیتر و خط‌هایی که با - شروع شوند فهرست می‌شوند."
              />
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>تصویرها و ویدیوها</h2>
              <p className="panel__note">این‌ها زیر متن پروژه، در یک گالری قابل بزرگ‌نمایی نمایش داده می‌شوند.</p>
            </div>
            <div className="panel__body">
              <MediaManager items={media} onChange={set('media')} />
            </div>
          </section>

          <section className="panel">
            <div className="panel__head"><h2>ظاهر</h2></div>
            <div className="panel__body">
              <div className="pickerhead">لوگوی اختصاصی</div>
              <LogoPicker value={form.logoUrl} onChange={set('logoUrl')} />

              <div className="pickerhead">نشان آماده</div>
              <div className="iconpicker">
                {ICON_NAMES.map((name: IconName) => (
                  <button
                    key={name} type="button"
                    className={cx('iconpicker__item', form.icon === name && 'is-on')}
                    onClick={() => set('icon')(name)} aria-label={name} aria-pressed={form.icon === name}
                  >
                    <Icon name={name} />
                  </button>
                ))}
              </div>

              <div className="pickerhead">رنگ کارت</div>
              <div className="accentpicker">
                {ACCENTS.map((accent) => (
                  <button
                    key={accent} type="button" data-accent={accent}
                    className={cx('accentpicker__item', form.accent === accent && 'is-on')}
                    onClick={() => set('accent')(accent)} aria-label={accent} aria-pressed={form.accent === accent}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="editor__side">
          <section className="panel">
            <div className="panel__head"><h2>انتشار</h2></div>
            <div className="panel__body">
              <label className="field">
                <span className="field__label">دسته‌بندی</span>
                <select value={form.categoryId} onChange={(e) => set('categoryId')(Number(e.target.value))}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </label>

              <Field label="برچسب‌ها" name="tags" value={tagText} onChange={setTagText} hint="با ویرگول جدا کنید." maxLength={300} />
              <Field label="لینک بیرونی" name="linkUrl" value={form.linkUrl} onChange={set('linkUrl')} maxLength={500} placeholder="https://" />

              <div className="toggles">
                <Toggle label="منتشر شده" checked={form.published} onChange={set('published')} hint="در سایت دیده می‌شود." />
                <Toggle label="منتخب" checked={form.featured} onChange={set('featured')} hint="در صفحه‌ی خانه می‌آید." />
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel__head"><h2>پیش‌نمایش کارت</h2></div>
            {/* Capture phase: stops the preview card's link from navigating away
                mid-edit, while leaving the hover tilt alive. */}
            <div className="panel__body panel__body--preview" onClickCapture={(e) => e.preventDefault()}>
              <ProjectCard project={preview} seed={2} />
            </div>
          </section>
        </aside>
      </form>

      <Confirm
        open={confirmOpen}
        title={`حذف «${form.title}»؟`}
        note="این کار برگشت‌پذیر نیست."
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={remove}
      />
    </>
  );
}
