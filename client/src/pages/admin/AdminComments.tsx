import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Confirm } from '../../components/Confirm';
import { EmptyState, SearchIcon, Spinner } from '../../components/ui';
import { useTitle } from '../../components/Layout';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { faDateTime, toFa } from '../../lib/format';
import type { Comment, Member } from '../../lib/types';

export default function AdminComments() {
  const { notify } = useToast();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [query, setQuery] = useState('');
  const [pendingComment, setPendingComment] = useState<Comment | null>(null);
  const [pendingMember, setPendingMember] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);

  useTitle('نظرها و کاربران');

  const load = useCallback(() => {
    api.admin.comments().then(setComments).catch(() => setComments([]));
    api.admin.members().then(setMembers).catch(() => setMembers([]));
  }, []);

  useEffect(() => load(), [load]);

  const visible = useMemo(() => {
    if (!comments) return [];
    const term = query.trim().toLowerCase();
    if (!term) return comments;
    return comments.filter(
      (c) =>
        c.body.toLowerCase().includes(term) ||
        c.author.toLowerCase().includes(term) ||
        (c.projectTitle ?? '').toLowerCase().includes(term),
    );
  }, [comments, query]);

  const removeComment = async () => {
    if (!pendingComment) return;
    setBusy(true);
    try {
      await api.admin.deleteComment(pendingComment.id);
      setComments((list) => (list ?? []).filter((c) => c.id !== pendingComment.id));
      notify('نظر حذف شد.');
      setPendingComment(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'حذف ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async () => {
    if (!pendingMember) return;
    setBusy(true);
    try {
      await api.admin.deleteMember(pendingMember.id);
      notify('کاربر حذف شد.');
      setPendingMember(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'حذف ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!comments || !members) return <Spinner />;

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>نظرها و کاربران</h1>
          <p className="muted">نظرهای ثبت‌شده روی پروژه‌ها و حساب‌هایی که در سایت ساخته شده‌اند.</p>
        </div>
        <label className="searchbox">
          <SearchIcon size={16} />
          <input
            type="search" value={query} placeholder="جست‌وجو در نظرها…"
            onChange={(e) => setQuery(e.target.value)} aria-label="جست‌وجو در نظرها"
          />
        </label>
      </div>

      <div className="panels panels--split">
        <section className="panel">
          <div className="panel__head">
            <h2>نظرها</h2>
            <span className="panel__more tnum">{toFa(comments.length)}</span>
          </div>

          {visible.length === 0 ? (
            <p className="panel__empty">
              {comments.length === 0 ? 'هنوز نظری ثبت نشده.' : 'نظری با این عبارت پیدا نشد.'}
            </p>
          ) : (
            <ul className="notelist">
              {visible.map((c) => (
                <li key={c.id} className="note">
                  <div className="note__head">
                    <span className="note__author">{c.author}</span>
                    {c.projectSlug && (
                      <Link to={`/p/${c.projectSlug}`} className="note__where">{c.projectTitle}</Link>
                    )}
                    <span className="note__time">{faDateTime(c.createdAt)}</span>
                  </div>
                  <p className="note__body">{c.body}</p>
                  <button type="button" className="rowbtn rowbtn--danger note__remove" onClick={() => setPendingComment(c)}>
                    حذف
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>کاربران</h2>
            <span className="panel__more tnum">{toFa(members.length)}</span>
          </div>

          {members.length === 0 ? (
            <EmptyState title="هنوز کسی ثبت‌نام نکرده." />
          ) : (
            <ul className="feed">
              {members.map((m) => (
                <li key={m.id} className="feed__item">
                  <span className="adminnav__avatar" aria-hidden="true">{m.name.slice(0, 1)}</span>
                  <span className="feed__body">
                    <span className="feed__title">
                      {m.name}
                      {m.role === 'admin' && <span className="minitag">مدیر</span>}
                    </span>
                    <span className="feed__text ltr">{m.username}</span>
                  </span>
                  <span className="feed__time tnum">{toFa(m.commentCount)} نظر</span>
                  {m.role !== 'admin' && (
                    <button type="button" className="rowbtn rowbtn--danger" onClick={() => setPendingMember(m)}>حذف</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Confirm
        open={pendingComment !== null}
        title="حذف این نظر؟"
        note="نظر برای همیشه پاک می‌شود."
        busy={busy}
        onCancel={() => setPendingComment(null)}
        onConfirm={removeComment}
      />
      <Confirm
        open={pendingMember !== null}
        title={`حذف حساب «${pendingMember?.name ?? ''}»؟`}
        note="نظرهای این کاربر هم پاک می‌شوند."
        busy={busy}
        onCancel={() => setPendingMember(null)}
        onConfirm={removeMember}
      />
    </>
  );
}
