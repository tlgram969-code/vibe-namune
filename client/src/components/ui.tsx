import { Link } from 'react-router-dom';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { useMagnetic, useRevealRef } from '../lib/motion';
import { cx } from '../lib/format';

/* ── Icons used by the chrome itself (not the app tiles) ────────────────────── */

export const ArrowIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SearchIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
    <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const SunIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
    <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const MoonIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

export const UserIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="8.2" r="3.7" stroke="currentColor" strokeWidth="2" />
    <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const UploadIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const CloseIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/* ── Reveal wrapper ─────────────────────────────────────────────────────────── */

type RevealProps<T extends ElementType> = {
  as?: T;
  delay?: number;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

export function Reveal<T extends ElementType = 'div'>({ as, delay = 0, children, className, ...rest }: RevealProps<T>) {
  const ref = useRevealRef<HTMLElement>();
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag
      ref={ref}
      className={cx('reveal', className)}
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ── Buttons ────────────────────────────────────────────────────────────────── */

interface ButtonProps {
  to?: string;
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
  arrow?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function Button({
  to, href, onClick, type = 'button', variant = 'primary', size = 'md',
  arrow = false, disabled = false, className, children,
}: ButtonProps) {
  const ref = useMagnetic<HTMLElement>(4);
  const cls = cx('btn', `btn--${variant}`, `btn--${size}`, className);

  const inner = (
    <>
      <span className="btn__label">{children}</span>
      {arrow && (
        <span className="btn__arrow" aria-hidden="true">
          <ArrowIcon size={15} />
        </span>
      )}
    </>
  );

  if (to && !disabled) {
    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} className={cls} to={to}>
        {inner}
      </Link>
    );
  }
  if (href && !disabled) {
    return (
      <a ref={ref as React.Ref<HTMLAnchorElement>} className={cls} href={href} target="_blank" rel="noreferrer noopener">
        {inner}
      </a>
    );
  }
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} className={cls} type={type} onClick={onClick} disabled={disabled}>
      {inner}
    </button>
  );
}

/** Circular icon button used in the header and card corners. */
export function IconButton({
  label, onClick, to, variant = 'soft', children, active = false,
}: {
  label: string;
  onClick?: () => void;
  to?: string;
  variant?: 'soft' | 'solid';
  active?: boolean;
  children: ReactNode;
}) {
  const cls = cx('iconbtn', `iconbtn--${variant}`, active && 'is-active');
  if (to) {
    return (
      <Link className={cls} to={to} aria-label={label} title={label}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} type="button" onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  );
}

/* ── Form fields ────────────────────────────────────────────────────────────── */

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  rows?: number;
  required?: boolean;
  autoComplete?: string;
  maxLength?: number;
}

export function Field({
  label, name, value, onChange, type = 'text', placeholder, hint, rows, required, autoComplete, maxLength,
}: FieldProps) {
  const id = `f-${name}`;
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">
        {label}
        {required && <span className="field__req" aria-hidden="true"> *</span>}
      </span>
      {rows ? (
        <textarea
          id={id} name={name} value={value} rows={rows} placeholder={placeholder}
          maxLength={maxLength} required={required}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id} name={name} type={type} value={value} placeholder={placeholder}
          autoComplete={autoComplete} maxLength={maxLength} required={required}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function Toggle({ label, checked, onChange, hint }: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
}) {
  return (
    <button type="button" className={cx('toggle', checked && 'is-on')} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <span className="toggle__track" aria-hidden="true"><span className="toggle__knob" /></span>
      <span className="toggle__text">
        <span className="toggle__label">{label}</span>
        {hint && <span className="toggle__hint">{hint}</span>}
      </span>
    </button>
  );
}

/* ── Status blocks ──────────────────────────────────────────────────────────── */

export const Spinner = ({ label = 'در حال بارگذاری…' }: { label?: string }) => (
  <div className="loading" role="status">
    <span className="loading__ring" aria-hidden="true" />
    <span className="loading__text">{label}</span>
  </div>
);

export const EmptyState = ({ title, note, action }: { title: string; note?: string; action?: ReactNode }) => (
  <div className="empty">
    <span className="empty__mark" aria-hidden="true" />
    <p className="empty__title">{title}</p>
    {note && <p className="empty__note">{note}</p>}
    {action}
  </div>
);
