import { useEffect, useMemo, useState } from 'react';
import { Field, Spinner, Toggle } from '../../components/ui';
import { useTitle } from '../../components/Layout';
import { api } from '../../lib/api';
import { useSite } from '../../lib/site';
import { useToast } from '../../lib/toast';
import { cx } from '../../lib/format';
import type { Settings } from '../../lib/types';

type FieldKind = 'text' | 'area' | 'switch' | 'number';

interface FieldSpec {
  key: string;
  label: string;
  kind?: FieldKind;
  rows?: number;
  hint?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}

interface Section {
  id: string;
  title: string;
  note: string;
  fields: FieldSpec[];
}

/**
 * Settings are grouped by the page they actually change, and each group only
 * holds switches and text that do something visible.
 */
const SECTIONS: Section[] = [
  {
    id: 'identity',
    title: 'هویت سایت',
    note: 'نام، شعار و متنی که موتورهای جست‌وجو نشان می‌دهند.',
    fields: [
      { key: 'site_name', label: 'نام سایت', hint: 'در عنوان مرورگر و فوتر دیده می‌شود.' },
      { key: 'site_tagline', label: 'شعار کوتاه' },
      { key: 'site_name_latin_a', label: 'بخش پررنگ لوگو', hint: 'مثلاً Vibe' },
      { key: 'site_name_latin_b', label: 'بخش کم‌رنگ لوگو', hint: 'مثلاً Namune' },
      {
        key: 'seo_description', label: 'توضیح برای موتورهای جست‌وجو', kind: 'area', rows: 3,
        hint: 'یک تا دو جمله؛ در نتیجه‌ی گوگل زیر عنوان سایت می‌آید.',
      },
    ],
  },
  {
    id: 'home',
    title: 'صفحه‌ی خانه',
    note: 'متن بزرگ بالای صفحه و بخش نمونه‌کارهای منتخب.',
    fields: [
      { key: 'hero_eyebrow', label: 'کلمه‌های بالای عنوان', hint: 'با ویرگول لاتین جدا کنید؛ بین آن‌ها فلش می‌آید.' },
      { key: 'hero_title_a', label: 'خط اول عنوان' },
      { key: 'hero_title_b', label: 'خط دوم عنوان', hint: 'این خط طلایی نمایش داده می‌شود.' },
      { key: 'hero_body', label: 'متن زیر عنوان', kind: 'area', rows: 3 },
      { key: 'hero_cta', label: 'نوشته‌ی دکمه‌ی اصلی' },
      { key: 'featured_title', label: 'عنوان بخش منتخب' },
      { key: 'featured_note', label: 'توضیح بخش منتخب', kind: 'area', rows: 2 },
      {
        key: 'featured_count', label: 'تعداد پروژه‌ی منتخب', kind: 'number', min: 1, max: 9,
        hint: 'بین ۱ تا ۹؛ فقط پروژه‌هایی که «منتخب» هستند شمرده می‌شوند.',
      },
      { key: 'show_stats', label: 'نمایش جعبه‌ی آمار', kind: 'switch', hint: 'سه عدد پایین صفحه‌ی خانه و درباره.' },
      { key: 'stat_years', label: 'سال‌های تجربه', kind: 'number', min: 0, max: 60 },
    ],
  },
  {
    id: 'about',
    title: 'صفحه‌ی درباره',
    note: 'معرفی خودتان و روش کارتان.',
    fields: [
      { key: 'about_title', label: 'خط اول عنوان' },
      { key: 'about_subtitle', label: 'خط دوم عنوان', hint: 'طلایی نمایش داده می‌شود.' },
      { key: 'about_body', label: 'متن درباره', kind: 'area', rows: 6 },
    ],
  },
  {
    id: 'contact',
    title: 'تماس',
    note: 'فرم تماس و راه‌های ارتباطی که در فوتر می‌آیند.',
    fields: [
      {
        key: 'contact_form_enabled', label: 'فرم تماس باز باشد', kind: 'switch',
        hint: 'اگر خاموش شود فرم پنهان می‌شود و فقط راه‌های ارتباطی می‌ماند.',
      },
      { key: 'contact_note', label: 'یادداشت بالای فرم', kind: 'area', rows: 3 },
      { key: 'contact_reply_time', label: 'زمان پاسخ‌گویی', placeholder: 'معمولاً کمتر از یک روز کاری' },
      { key: 'contact_email', label: 'ایمیل' },
      { key: 'contact_telegram', label: 'نشانی تلگرام', placeholder: 'https://t.me/…' },
      { key: 'contact_github', label: 'نشانی گیت‌هاب', placeholder: 'https://github.com/…' },
    ],
  },
  {
    id: 'community',
    title: 'کاربران و نظرها',
    note: 'چه کسی می‌تواند حساب بسازد و زیر پروژه‌ها نظر بگذارد.',
    fields: [
      {
        key: 'registration_enabled', label: 'ثبت‌نام باز باشد', kind: 'switch',
        hint: 'اگر خاموش شود، فقط حساب‌های موجود می‌توانند وارد شوند.',
      },
      {
        key: 'comments_enabled', label: 'نظرها فعال باشد', kind: 'switch',
        hint: 'خاموش کردن، بخش نظر را از تمام صفحه‌های پروژه برمی‌دارد.',
      },
      { key: 'comments_notice', label: 'پیام به مهمان‌ها', kind: 'area', rows: 2, hint: 'به کسی که وارد نشده نشان داده می‌شود.' },
    ],
  },
  {
    id: 'display',
    title: 'نمایش و فوتر',
    note: 'جزئیات کوچکی که در همه‌ی صفحه‌ها دیده می‌شوند.',
    fields: [
      { key: 'show_view_counts', label: 'نمایش تعداد بازدید', kind: 'switch', hint: 'در جعبه‌ی کناری صفحه‌ی هر پروژه.' },
      { key: 'footer_note', label: 'یادداشت فوتر' },
    ],
  },
];

export default function AdminSettings() {
  const { notify } = useToast();
  const { refresh } = useSite();
  const [values, setValues] = useState<Settings | null>(null);
  const [section, setSection] = useState(SECTIONS[0].id);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  useTitle('تنظیمات');

  useEffect(() => {
    let stale = false;
    api.admin
      .settings()
      .then((res) => {
        if (!stale) setValues(res);
      })
      .catch((err) => {
        if (!stale) notify(err instanceof Error ? err.message : 'بارگذاری ناموفق بود.', 'error');
      });
    return () => {
      stale = true;
    };
  }, [notify]);

  const active = useMemo(() => SECTIONS.find((s) => s.id === section) ?? SECTIONS[0], [section]);

  const set = (key: string) => (value: string) => {
    setValues((v) => (v ? { ...v, [key]: value } : v));
    setDirty(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values || busy) return;
    setBusy(true);
    try {
      setValues(await api.admin.saveSettings(values));
      setDirty(false);
      notify('تنظیمات ذخیره شد.');
      void refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'ذخیره ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwBusy) return;
    setPwBusy(true);
    try {
      await api.auth.changePassword(current, next);
      setCurrent('');
      setNext('');
      notify('گذرواژه عوض شد.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تغییر گذرواژه ناموفق بود.', 'error');
    } finally {
      setPwBusy(false);
    }
  };

  if (!values) return <Spinner />;

  const renderField = (f: FieldSpec) => {
    if (f.kind === 'switch') {
      return (
        <Toggle
          key={f.key}
          label={f.label}
          hint={f.hint}
          checked={values[f.key] === '1'}
          onChange={(on) => set(f.key)(on ? '1' : '0')}
        />
      );
    }
    return (
      <Field
        key={f.key}
        label={f.label}
        name={f.key}
        type={f.kind === 'number' ? 'number' : 'text'}
        value={values[f.key] ?? ''}
        onChange={set(f.key)}
        rows={f.kind === 'area' ? (f.rows ?? 3) : undefined}
        hint={f.hint}
        placeholder={f.placeholder}
        maxLength={2000}
      />
    );
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>تنظیمات</h1>
          <p className="muted">هر بخش فقط همان صفحه‌ای را عوض می‌کند که نامش را دارد.</p>
        </div>
        <button type="submit" form="settings-form" className="btn btn--primary btn--sm" disabled={busy || !dirty}>
          <span className="btn__label">{busy ? 'در حال ذخیره…' : dirty ? 'ذخیره‌ی تغییرات' : 'ذخیره شد'}</span>
        </button>
      </div>

      <div className="chips">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={cx('chip', section === s.id && 'is-on')}
            onClick={() => setSection(s.id)}
          >
            {s.title}
          </button>
        ))}
      </div>

      <form id="settings-form" onSubmit={save} noValidate>
        <section className="panel panel--standalone">
          <div className="panel__head">
            <h2>{active.title}</h2>
            <p className="panel__note">{active.note}</p>
          </div>
          <div className="panel__body">{active.fields.map(renderField)}</div>
        </section>
      </form>

      {dirty && (
        <p className="banner banner--ok">تغییرها هنوز ذخیره نشده‌اند. دکمه‌ی «ذخیره‌ی تغییرات» بالای صفحه است.</p>
      )}

      <section className="panel panel--standalone">
        <div className="panel__head">
          <h2>گذرواژه‌ی مدیر</h2>
          <p className="panel__note">بعد از تغییر، همه‌ی دستگاه‌های دیگر از حساب خارج می‌شوند.</p>
        </div>
        <form className="panel__body" onSubmit={changePassword} noValidate>
          <div className="form__row">
            <Field label="گذرواژه فعلی" name="pw-current" type="password" value={current} onChange={setCurrent} autoComplete="current-password" maxLength={200} />
            <Field label="گذرواژه جدید" name="pw-next" type="password" value={next} onChange={setNext} autoComplete="new-password" maxLength={200} hint="حداقل ۸ نویسه." />
          </div>
          <div className="form__actions">
            <button type="submit" className="btn btn--outline btn--sm" disabled={pwBusy || !current || next.length < 8}>
              <span className="btn__label">{pwBusy ? 'در حال تغییر…' : 'تغییر گذرواژه'}</span>
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
