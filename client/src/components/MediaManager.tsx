import { useRef, useState } from 'react';
import { UploadIcon } from './ui';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';
import { cx } from '../lib/format';
import type { Media } from '../lib/types';

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
const VIDEO_ACCEPT = 'video/mp4,video/webm';

/** Hidden file input plus a button that triggers it. */
function UploadButton({
  accept, label, busy, onPicked,
}: {
  accept: string;
  label: string;
  busy: boolean;
  onPicked: (file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className="btn btn--outline btn--sm" onClick={() => ref.current?.click()} disabled={busy}>
        <span className="btn__label">{label}</span>
        <span className="btn__arrow" aria-hidden="true"><UploadIcon size={14} /></span>
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onPicked(file);
        }}
      />
    </>
  );
}

/** Square picker for the project's own badge image. */
export function LogoPicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const saved = await api.admin.upload(file);
      onChange(saved.url);
      notify('لوگو بارگذاری شد.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'بارگذاری ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="logopick">
      <div className={cx('logopick__frame', !value && 'is-empty')}>
        {value ? <img src={value} alt="لوگوی پروژه" /> : <UploadIcon size={22} />}
      </div>
      <div className="logopick__side">
        <p className="logopick__hint">
          اگر لوگوی اختصاصی بگذارید، به‌جای نشان آماده روی کارت و صفحه‌ی پروژه دیده می‌شود.
          مربع و حداکثر ۸ مگابایت بهترین نتیجه را می‌دهد.
        </p>
        <div className="logopick__actions">
          <UploadButton accept={IMAGE_ACCEPT} label={busy ? 'در حال بارگذاری…' : 'انتخاب لوگو'} busy={busy} onPicked={upload} />
          {value && (
            <button type="button" className="rowbtn rowbtn--danger" onClick={() => onChange('')}>حذف لوگو</button>
          )}
        </div>
      </div>
    </div>
  );
}

/** The project's gallery: uploaded images and clips, plus pasted https links. */
export function MediaManager({ items, onChange }: { items: Media[]; onChange: (next: Media[]) => void }) {
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');

  const add = (item: Media) => onChange([...items, item]);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const saved = await api.admin.upload(file);
      add({ kind: saved.kind, url: saved.url, caption: '' });
      notify('فایل بارگذاری شد.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'بارگذاری ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const addLink = () => {
    const url = link.trim();
    if (!/^https:\/\/\S+$/i.test(url)) {
      notify('نشانی باید با https:// شروع شود.', 'error');
      return;
    }
    add({ kind: /\.(mp4|webm)(\?|$)/i.test(url) ? 'video' : 'image', url, caption: '' });
    setLink('');
  };

  const update = (index: number, patch: Partial<Media>) =>
    onChange(items.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  const move = (index: number, step: number) => {
    const target = index + step;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="mediabox">
      <div className="mediabox__tools">
        <UploadButton accept={IMAGE_ACCEPT} label="افزودن تصویر" busy={busy} onPicked={upload} />
        <UploadButton accept={VIDEO_ACCEPT} label="افزودن ویدیو" busy={busy} onPicked={upload} />
      </div>

      <div className="mediabox__link">
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="یا نشانی مستقیم فایل را بچسبانید: https://…"
          aria-label="نشانی رسانه"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addLink();
            }
          }}
        />
        <button type="button" className="rowbtn" onClick={addLink} disabled={!link.trim()}>افزودن</button>
      </div>

      {items.length === 0 ? (
        <p className="mediabox__empty">
          هنوز تصویر یا ویدیویی اضافه نشده. تصویرها تا ۸ مگابایت و ویدیوها تا ۸۰ مگابایت پذیرفته می‌شوند.
        </p>
      ) : (
        <ul className="medialist">
          {items.map((item, i) => (
            <li key={`${item.url}-${i}`} className="mediarow">
              <span className="mediarow__thumb">
                {item.kind === 'video' ? (
                  <video src={item.url} preload="metadata" muted />
                ) : (
                  <img src={item.url} alt="" loading="lazy" />
                )}
                <span className="mediarow__kind">{item.kind === 'video' ? 'ویدیو' : 'تصویر'}</span>
              </span>

              <input
                className="mediarow__caption"
                value={item.caption}
                maxLength={160}
                placeholder="توضیح کوتاه (اختیاری)"
                aria-label="توضیح رسانه"
                onChange={(e) => update(i, { caption: e.target.value })}
              />

              <span className="mediarow__actions">
                <button type="button" className="rowbtn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="یک پله بالا">↑</button>
                <button type="button" className="rowbtn" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="یک پله پایین">↓</button>
                <button type="button" className="rowbtn rowbtn--danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>حذف</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
