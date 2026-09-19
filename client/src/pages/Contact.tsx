import { useState } from 'react';
import { Crumbs } from '../components/Crumbs';
import { IconArt } from '../components/IconArt';
import { Button, Field, Reveal } from '../components/ui';
import { useSeo } from '../lib/seo';
import { useSite } from '../lib/site';
import { useToast } from '../lib/toast';
import { api } from '../lib/api';
import { useTilt } from '../lib/motion';

const BLANK = { name: '', email: '', subject: '', body: '' };

export default function Contact() {
  const { text, flag } = useSite();
  const { notify } = useToast();
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const artRef = useTilt<HTMLDivElement>({ max: 12 });

  useSeo({ title: 'تماس با ما', description: text('contact_note', '') });

  const set = (key: keyof typeof BLANK) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.sendMessage(form);
      setForm(BLANK);
      setSent(true);
      notify('پیام شما ثبت شد. به‌زودی پاسخ می‌دهم.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ارسال پیام ناموفق بود.';
      setError(message);
      notify(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const email = text('contact_email');

  return (
    <section className="section">
      <div className="shell">
        <Reveal>
          <Crumbs items={[{ label: 'HOME', to: '/' }, { label: 'CONTACT' }]} />
        </Reveal>

        <div className="contact">
          <Reveal className="contact__form" delay={60}>
            <h1 className="contact__title">
              یک پیام بفرستید
              <span className="gold"> تا شروع کنیم</span>
            </h1>
            <p className="lead">{text('contact_note')}</p>

            {sent && !error && (
              <p className="banner banner--ok">پیام شما رسید. پاسخ را به همین ایمیل می‌فرستم.</p>
            )}
            {error && <p className="banner banner--error">{error}</p>}

            {!flag('contact_form_enabled') && (
              <p className="banner banner--error">فرم تماس فعلاً بسته است. از راه‌های کناری پیام بدهید.</p>
            )}

            <form onSubmit={submit} className="form" noValidate hidden={!flag('contact_form_enabled')}>
              <div className="form__row">
                <Field label="نام" name="name" value={form.name} onChange={set('name')} required maxLength={80} autoComplete="name" />
                <Field label="ایمیل" name="email" type="email" value={form.email} onChange={set('email')} required maxLength={120} autoComplete="email" />
              </div>
              <Field label="موضوع" name="subject" value={form.subject} onChange={set('subject')} maxLength={120} placeholder="مثلاً: سفارش یک ربات تلگرام" />
              <Field label="متن پیام" name="body" value={form.body} onChange={set('body')} rows={6} required maxLength={4000} />
              <div className="form__actions">
                <Button type="submit" arrow disabled={busy}>{busy ? 'در حال ارسال…' : 'ارسال پیام'}</Button>
              </div>
            </form>
          </Reveal>

          <Reveal className="contact__side" delay={130}>
            <div className="contact__art" ref={artRef}>
              <IconArt name="chat" size="xl" seed={5} />
            </div>
            <div className="factbox">
              <h3>راه‌های دیگر</h3>
              <dl>
                {email && (
                  <>
                    <dt>ایمیل</dt>
                    <dd><a className="ltr" href={`mailto:${email}`}>{email}</a></dd>
                  </>
                )}
                <dt>زمان پاسخ</dt>
                <dd>{text('contact_reply_time', 'معمولاً کمتر از یک روز کاری')}</dd>
                <dt>زبان</dt>
                <dd>فارسی و انگلیسی</dd>
              </dl>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
