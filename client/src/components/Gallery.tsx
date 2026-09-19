import { useEffect, useState } from 'react';
import { CloseIcon } from './ui';
import { useTilt } from '../lib/motion';
import { cx } from '../lib/format';
import type { Media } from '../lib/types';

/** One tile in the grid. Images open a lightbox; videos play in place. */
function Item({ item, onOpen }: { item: Media; onOpen: () => void }) {
  const ref = useTilt<HTMLDivElement>({ max: 5 });

  if (item.kind === 'video') {
    return (
      <figure className="shot shot--video" ref={ref}>
        <video src={item.url} controls preload="metadata" playsInline />
        {item.caption && <figcaption>{item.caption}</figcaption>}
      </figure>
    );
  }

  return (
    <figure className="shot" ref={ref}>
      <button type="button" className="shot__open" onClick={onOpen} aria-label={item.caption || 'بزرگ‌نمایی تصویر'}>
        <img src={item.url} alt={item.caption} loading="lazy" decoding="async" />
      </button>
      {item.caption && <figcaption>{item.caption}</figcaption>}
    </figure>
  );
}

export function Gallery({ items }: { items: Media[] }) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const images = items.filter((m) => m.kind === 'image');

  useEffect(() => {
    if (openAt === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenAt(null);
      if (e.key === 'ArrowLeft') setOpenAt((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === 'ArrowRight') setOpenAt((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('is-locked');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('is-locked');
    };
  }, [openAt, images.length]);

  if (items.length === 0) return null;

  const open = openAt === null ? null : images[openAt];

  return (
    <section className="gallery">
      <h2 className="gallery__title">تصویرها و ویدیوها</h2>
      <div className={cx('gallery__grid', items.length === 1 && 'is-single')}>
        {items.map((item, i) => (
          <Item
            key={item.id ?? `${item.url}-${i}`}
            item={item}
            onOpen={() => setOpenAt(images.findIndex((m) => m.url === item.url))}
          />
        ))}
      </div>

      {open && (
        <div className="overlay overlay--center lightbox" role="dialog" aria-modal="true" aria-label="نمایش تصویر">
          <button type="button" className="overlay__scrim" onClick={() => setOpenAt(null)} aria-label="بستن" />
          <figure className="lightbox__frame">
            <img src={open.url} alt={open.caption} />
            {open.caption && <figcaption>{open.caption}</figcaption>}
          </figure>
          <button type="button" className="lightbox__close" onClick={() => setOpenAt(null)} aria-label="بستن">
            <CloseIcon size={18} />
          </button>
          {images.length > 1 && (
            <p className="lightbox__count tnum">
              {openAt! + 1} / {images.length}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
