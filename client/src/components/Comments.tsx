import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Confirm } from './Confirm';
import { Button } from './ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSite } from '../lib/site';
import { useToast } from '../lib/toast';
import { faRelative, toFa } from '../lib/format';
import type { Comment } from '../lib/types';

/** Public comment thread. Reading is open to everyone; writing needs an account. */
export function Comments({ slug, initial }: { slug: string; initial: Comment[] }) {
  const { user, isAdmin } = useAuth();
  const { text, flag } = useSite();
  const { notify } = useToast();

  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Comment | null>(null);

  if (!flag('comments_enabled')) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || draft.trim().length < 3) return;
    setBusy(true);
    try {
      const saved = await api.addComment(slug, draft.trim());
      setItems((list) => [saved, ...list]);
      setDraft('');
      notify('نظر شما ثبت شد.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'ثبت نظر ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await api.deleteComment(pending.id);
      setItems((list) => list.filter((c) => c.id !== pending.id));
      notify('نظر حذف شد.');
      setPending(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'حذف ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="talk">
      <div className="talk__head">
        <h2>
          نظرها
          <span className="talk__count tnum">{toFa(items.length)}</span>
        </h2>
      </div>

      {user ? (
        <form className="talk__form" onSubmit={submit}>
          <span className="talk__avatar" aria-hidden="true">{user.name.slice(0, 1)}</span>
          <div className="talk__field">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={1500}
              placeholder="نظر شما درباره‌ی این پروژه…"
              aria-label="متن نظر"
            />
            <div className="talk__actions">
              <span className="talk__hint">
                به‌عنوان <strong>{user.name}</strong>
              </span>
              <Button type="submit" size="sm" arrow disabled={busy || draft.trim().length < 3}>
                {busy ? 'در حال ثبت…' : 'ثبت نظر'}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="talk__locked">
          <p>{text('comments_notice', 'برای گذاشتن نظر باید وارد حساب کاربری خود شوید.')}</p>
          <Button to="/account" size="sm" arrow>ورود یا ثبت‌نام</Button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="talk__empty">هنوز نظری ثبت نشده. اولین نفر باشید.</p>
      ) : (
        <ul className="talk__list">
          {items.map((c) => (
            <li key={c.id} className="talk__item">
              <span className="talk__avatar" aria-hidden="true">{c.author.slice(0, 1)}</span>
              <div className="talk__bubble">
                <p className="talk__meta">
                  <strong>{c.author}</strong>
                  <span className="talk__time">{faRelative(c.createdAt)}</span>
                  {(isAdmin || c.authorId === user?.id) && (
                    <button type="button" className="talk__remove" onClick={() => setPending(c)}>حذف</button>
                  )}
                </p>
                <p className="talk__body">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!user && items.length > 0 && (
        <p className="talk__foot muted">
          حساب دارید؟ <Link to="/account" className="talk__link">وارد شوید</Link> تا بتوانید نظر بگذارید.
        </p>
      )}

      <Confirm
        open={pending !== null}
        title="حذف این نظر؟"
        note="این کار برگشت‌پذیر نیست."
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={remove}
      />
    </section>
  );
}
