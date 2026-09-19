import { useEffect, useState } from 'react';
import { Confirm } from '../../components/Confirm';
import { EmptyState, Spinner } from '../../components/ui';
import { useTitle } from '../../components/Layout';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { cx, faDateTime, faRelative } from '../../lib/format';
import type { Message } from '../../lib/types';

export default function AdminMessages() {
  const { notify } = useToast();
  const [rows, setRows] = useState<Message[] | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [pending, setPending] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);

  useTitle('پیام‌ها');

  useEffect(() => {
    let stale = false;
    api.admin
      .messages()
      .then((list) => {
        if (stale) return;
        setRows(list);
        setOpenId(list[0]?.id ?? null);
      })
      .catch((err) => {
        if (stale) return;
        setRows([]);
        notify(err instanceof Error ? err.message : 'بارگذاری ناموفق بود.', 'error');
      });
    return () => {
      stale = true;
    };
  }, [notify]);

  const open = rows?.find((m) => m.id === openId) ?? null;

  // Opening a message marks it read; the server call is fire-and-forget on purpose.
  useEffect(() => {
    if (!open || open.isRead) return;
    api.admin
      .markMessage(open.id, true)
      .then(() => setRows((list) => (list ?? []).map((m) => (m.id === open.id ? { ...m, isRead: true } : m))))
      .catch(() => undefined);
  }, [open]);

  const setRead = async (message: Message, isRead: boolean) => {
    try {
      await api.admin.markMessage(message.id, isRead);
      setRows((list) => (list ?? []).map((m) => (m.id === message.id ? { ...m, isRead } : m)));
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تغییر وضعیت ناموفق بود.', 'error');
    }
  };

  const remove = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await api.admin.deleteMessage(pending.id);
      setRows((list) => {
        const next = (list ?? []).filter((m) => m.id !== pending.id);
        setOpenId((current) => (current === pending.id ? next[0]?.id ?? null : current));
        return next;
      });
      notify('پیام حذف شد.');
      setPending(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'حذف ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!rows) return <Spinner />;

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>پیام‌ها</h1>
          <p className="muted">پیام‌هایی که از فرم تماس سایت رسیده‌اند.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="هنوز پیامی نرسیده." note="پیام‌های فرم تماس اینجا نمایش داده می‌شوند." />
      ) : (
        <div className="inbox">
          <ul className="inbox__list">
            {rows.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={cx('inbox__row', m.id === openId && 'is-on', !m.isRead && 'is-new')}
                  onClick={() => setOpenId(m.id)}
                >
                  <span className="inbox__top">
                    <span className="inbox__name">{m.name}</span>
                    <span className="inbox__time">{faRelative(m.createdAt)}</span>
                  </span>
                  <span className="inbox__subject">{m.subject || '(بدون موضوع)'}</span>
                  <span className="inbox__peek">{m.body.slice(0, 70)}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="inbox__view">
            {!open ? (
              <EmptyState title="یک پیام را انتخاب کنید." />
            ) : (
              <article className="letter">
                <header className="letter__head">
                  <div>
                    <h2>{open.subject || '(بدون موضوع)'}</h2>
                    <p className="letter__from">
                      {open.name} —{' '}
                      <a className="ltr" href={`mailto:${open.email}`}>{open.email}</a>
                    </p>
                    <p className="letter__time muted">{faDateTime(open.createdAt)}</p>
                  </div>
                  <div className="letter__actions">
                    <button type="button" className="rowbtn" onClick={() => setRead(open, !open.isRead)}>
                      {open.isRead ? 'علامت‌گذاری خوانده‌نشده' : 'علامت‌گذاری خوانده‌شده'}
                    </button>
                    <a className="rowbtn" href={`mailto:${open.email}?subject=${encodeURIComponent(`پاسخ: ${open.subject || 'پیام شما'}`)}`}>پاسخ با ایمیل</a>
                    <button type="button" className="rowbtn rowbtn--danger" onClick={() => setPending(open)}>حذف</button>
                  </div>
                </header>
                <div className="letter__body">
                  {open.body.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </article>
            )}
          </div>
        </div>
      )}

      <Confirm
        open={pending !== null}
        title="حذف این پیام؟"
        note="این کار برگشت‌پذیر نیست."
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={remove}
      />
    </>
  );
}
