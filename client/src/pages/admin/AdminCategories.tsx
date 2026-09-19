import { useCallback, useEffect, useState } from 'react';
import { Icon, ICON_NAMES } from '../../components/Icon';
import { Confirm } from '../../components/Confirm';
import { Field, Spinner, Toggle } from '../../components/ui';
import { useTitle } from '../../components/Layout';
import { api } from '../../lib/api';
import { useSite } from '../../lib/site';
import { useToast } from '../../lib/toast';
import { cx, toFa } from '../../lib/format';
import type { AccentName, Category, CategoryInput, IconName } from '../../lib/types';

const ACCENTS: AccentName[] = ['blue', 'violet', 'mint', 'cream', 'rose', 'slate', 'sky'];

const BLANK: CategoryInput = {
  title: '', slug: '', subtitle: '', description: '',
  introTitle: '', introBody: '', ctaLabel: '', icon: 'spark', accent: 'blue', visible: true,
};

const toInput = (c: Category): CategoryInput => ({
  title: c.title, slug: c.slug, subtitle: c.subtitle, description: c.description,
  introTitle: c.introTitle, introBody: c.introBody, ctaLabel: c.ctaLabel,
  icon: c.icon, accent: c.accent, visible: c.visible,
});

export default function AdminCategories() {
  const { notify } = useToast();
  const { refresh } = useSite();
  const [rows, setRows] = useState<Category[] | null>(null);
  const [editing, setEditing] = useState<{ id: number | null; form: CategoryInput } | null>(null);
  const [pending, setPending] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  useTitle('دسته‌بندی‌ها');

  const load = useCallback(() => {
    api.admin
      .categories()
      .then(setRows)
      .catch((err) => {
        setRows([]);
        notify(err instanceof Error ? err.message : 'بارگذاری ناموفق بود.', 'error');
      });
  }, [notify]);

  useEffect(() => load(), [load]);

  const set = <K extends keyof CategoryInput>(key: K) => (value: CategoryInput[K]) =>
    setEditing((e) => (e ? { ...e, form: { ...e.form, [key]: value } } : e));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    try {
      if (editing.id === null) await api.admin.createCategory(editing.form);
      else await api.admin.updateCategory(editing.id, editing.form);
      notify(editing.id === null ? 'دسته‌بندی ساخته شد.' : 'تغییرات ذخیره شد.');
      setEditing(null);
      load();
      void refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'ذخیره ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await api.admin.deleteCategory(pending.id);
      notify('دسته‌بندی حذف شد.');
      setPending(null);
      load();
      void refresh();
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
          <h1>دسته‌بندی‌ها</h1>
          <p className="muted">بخش‌های اصلی سایت و متن معرفی هرکدام.</p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setEditing({ id: null, form: BLANK })}>
          <span className="btn__label">دسته‌ی جدید</span>
        </button>
      </div>

      {!rows ? (
        <Spinner />
      ) : (
        <div className="catgrid">
          {rows.map((c) => (
            <article key={c.id} className="catcard" data-accent={c.accent}>
              <span className="catcard__icon"><Icon name={c.icon} /></span>
              <div className="catcard__body">
                <h3>
                  {c.title}
                  {!c.visible && <span className="minitag minitag--off">پنهان</span>}
                </h3>
                <p className="muted catcard__desc">{c.description || '—'}</p>
                <p className="catcard__meta">
                  <span className="ltr">{c.slug}</span>
                  <span className="tnum">{toFa(c.projectCount ?? 0)} پروژه</span>
                  {c.ctaLabel && <span>دکمه: {c.ctaLabel}</span>}
                </p>
              </div>
              <div className="catcard__actions">
                <button type="button" className="rowbtn" onClick={() => setEditing({ id: c.id, form: toInput(c) })}>ویرایش</button>
                <button type="button" className="rowbtn rowbtn--danger" onClick={() => setPending(c)}>حذف</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <div className="overlay overlay--center" role="dialog" aria-modal="true" aria-label="ویرایش دسته‌بندی">
          <button type="button" className="overlay__scrim" onClick={() => setEditing(null)} aria-label="بستن" />
          <form className="drawer" onSubmit={save} noValidate>
            <div className="drawer__head">
              <h2>{editing.id === null ? 'دسته‌بندی جدید' : 'ویرایش دسته‌بندی'}</h2>
              <button type="button" className="rowbtn" onClick={() => setEditing(null)}>بستن</button>
            </div>

            <div className="drawer__body">
              <div className="form__row">
                <Field label="عنوان" name="cat-title" value={editing.form.title} onChange={set('title')} required maxLength={80} />
                <Field label="زیرعنوان" name="cat-sub" value={editing.form.subtitle} onChange={set('subtitle')} maxLength={80} />
              </div>
              <Field label="نشانی صفحه (slug)" name="cat-slug" value={editing.form.slug} onChange={set('slug')} maxLength={80} hint="خالی بگذارید تا از عنوان ساخته شود." />
              <Field label="توضیح کوتاه" name="cat-desc" value={editing.form.description} onChange={set('description')} rows={2} maxLength={400} />
              <Field label="عنوان بخش معرفی" name="cat-introt" value={editing.form.introTitle} onChange={set('introTitle')} maxLength={120} placeholder="مثلاً: پلاگین چیست؟" />
              <Field label="متن بخش معرفی" name="cat-introb" value={editing.form.introBody} onChange={set('introBody')} rows={4} maxLength={2000} />
              <Field
                label="نوشته‌ی دکمه‌ی این دسته" name="cat-cta" value={editing.form.ctaLabel} onChange={set('ctaLabel')} maxLength={60}
                placeholder="مثلاً: خرید این پلاگین"
                hint="روی صفحه‌ی هر پروژه‌ی این دسته و پایین بخش معرفی دیده می‌شود."
              />

              <div className="pickerhead">نشان دسته</div>
              <div className="iconpicker">
                {ICON_NAMES.map((name: IconName) => (
                  <button
                    key={name} type="button" aria-label={name} aria-pressed={editing.form.icon === name}
                    className={cx('iconpicker__item', editing.form.icon === name && 'is-on')}
                    onClick={() => set('icon')(name)}
                  >
                    <Icon name={name} />
                  </button>
                ))}
              </div>

              <div className="pickerhead">رنگ کارت</div>
              <div className="accentpicker">
                {ACCENTS.map((accent) => (
                  <button
                    key={accent} type="button" data-accent={accent} aria-label={accent} aria-pressed={editing.form.accent === accent}
                    className={cx('accentpicker__item', editing.form.accent === accent && 'is-on')}
                    onClick={() => set('accent')(accent)}
                  />
                ))}
              </div>

              <div className="toggles">
                <Toggle label="نمایش در سایت" checked={editing.form.visible} onChange={set('visible')} hint="اگر خاموش باشد در منو و خانه دیده نمی‌شود." />
              </div>
            </div>

            <div className="drawer__foot">
              <button type="button" className="btn btn--outline btn--sm" onClick={() => setEditing(null)}>
                <span className="btn__label">انصراف</span>
              </button>
              <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>
                <span className="btn__label">{busy ? 'در حال ذخیره…' : 'ذخیره'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <Confirm
        open={pending !== null}
        title={`حذف «${pending?.title ?? ''}»؟`}
        note="دسته‌ای که پروژه دارد حذف نمی‌شود."
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={remove}
      />
    </>
  );
}
