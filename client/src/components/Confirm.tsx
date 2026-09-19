import { useEffect } from 'react';

/** A single-purpose confirm dialog — used before anything destructive. */
export function Confirm({
  open, title, note, confirmLabel = 'حذف', onConfirm, onCancel, busy = false,
}: {
  open: boolean;
  title: string;
  note?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('is-locked');
    return () => document.body.classList.remove('is-locked');
  }, [open]);

  if (!open) return null;

  return (
    <div className="overlay overlay--center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="overlay__scrim" onClick={onCancel} aria-label="انصراف" />
      <div className="confirm">
        <h3 className="confirm__title">{title}</h3>
        {note && <p className="confirm__note">{note}</p>}
        <div className="confirm__actions">
          <button type="button" className="btn btn--outline btn--sm" onClick={onCancel} disabled={busy}>
            <span className="btn__label">انصراف</span>
          </button>
          <button type="button" className="btn btn--danger btn--sm" onClick={onConfirm} disabled={busy}>
            <span className="btn__label">{busy ? 'در حال انجام…' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
