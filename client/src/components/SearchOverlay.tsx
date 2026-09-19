import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mark } from './Icon';
import { CloseIcon, SearchIcon } from './ui';
import { api } from '../lib/api';
import { cx } from '../lib/format';
import type { Project } from '../lib/types';

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Project[]>([]);
  const [cursor, setCursor] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setCursor(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(id);
  }, [open]);

  // Debounced search; a stale flag keeps out-of-order responses from landing.
  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (!term) {
      setResults([]);
      setBusy(false);
      return;
    }

    let stale = false;
    setBusy(true);
    const id = window.setTimeout(() => {
      api
        .projects({ q: term, limit: 8 })
        .then((rows) => {
          if (!stale) {
            setResults(rows);
            setCursor(0);
          }
        })
        .catch(() => {
          if (!stale) setResults([]);
        })
        .finally(() => {
          if (!stale) setBusy(false);
        });
    }, 220);

    return () => {
      stale = true;
      window.clearTimeout(id);
    };
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('is-locked');
    return () => document.body.classList.remove('is-locked');
  }, [open]);

  if (!open) return null;

  const go = (project: Project) => {
    onClose();
    navigate(`/p/${project.slug}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return onClose();
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (c + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (c - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[cursor]);
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="جست‌وجو در نمونه‌کارها">
      <button type="button" className="overlay__scrim" onClick={onClose} aria-label="بستن جست‌وجو" />
      <div className="palette" onKeyDown={onKeyDown}>
        <div className="palette__bar">
          <SearchIcon size={19} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="نام پروژه، دسته یا فناوری…"
            aria-label="عبارت جست‌وجو"
          />
          <button type="button" className="palette__close" onClick={onClose} aria-label="بستن">
            <CloseIcon size={17} />
          </button>
        </div>

        <div className="palette__body">
          {!query.trim() && <p className="palette__hint">برای دیدن نتیجه‌ها چند حرف بنویسید.</p>}
          {query.trim() && busy && <p className="palette__hint">در حال جست‌وجو…</p>}
          {query.trim() && !busy && results.length === 0 && (
            <p className="palette__hint">چیزی با این عبارت پیدا نشد.</p>
          )}

          {results.map((project, i) => (
            <button
              key={project.id}
              type="button"
              className={cx('palette__row', i === cursor && 'is-active')}
              onMouseEnter={() => setCursor(i)}
              onClick={() => go(project)}
            >
              <span className="palette__icon" data-accent={project.accent}>
                <Mark name={project.icon} logo={project.logoUrl} />
              </span>
              <span className="palette__meta">
                <span className="palette__title">{project.title}</span>
                <span className="palette__sub">
                  {project.subtitle}
                  {project.category ? ` · ${project.category.title}` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
