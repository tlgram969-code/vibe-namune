import { useId } from 'react';
import type { ReactNode } from 'react';
import type { IconName } from '../lib/types';

/* ─────────────────────────────────────────────────────────────────────────────
   Squircle app-tile icons. Every icon is one 64×64 SVG: a gradient tile, a
   top gloss, the glyph, and a hairline rim — the look of the reference art.
   ───────────────────────────────────────────────────────────────────────────── */

interface TileProps {
  from: string;
  to: string;
  children: ReactNode;
  title?: string;
}

function Tile({ from, to, children, title }: TileProps) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className="tile-svg">
      <defs>
        <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.03" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="17.5" fill={`url(#${uid}f)`} />
      <rect x="2" y="2" width="60" height="60" rx="17.5" fill={`url(#${uid}g)`} />
      {children}
      <rect x="2.6" y="2.6" width="58.8" height="58.8" rx="17" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.2" />
    </svg>
  );
}

/** Two-letter Adobe-style wordmark. */
function Word({ text, color }: { text: string; color: string }) {
  return (
    <text
      x="32"
      y="33"
      textAnchor="middle"
      dominantBaseline="central"
      fill={color}
      fontFamily="Vazirmatn, system-ui, sans-serif"
      fontSize="23"
      fontWeight="700"
      letterSpacing="-0.5"
    >
      {text}
    </text>
  );
}

const W = '#ffffff';

const icons: Record<IconName, () => ReactNode> = {
  telegram: () => (
    <Tile from="#40bcf4" to="#0b83c4" title="تلگرام">
      <path d="M46.4 20.1 41.9 43c-.3 1.5-1.2 1.9-2.5 1.2l-6.9-5.1-3.3 3.2c-.4.4-.7.7-1.4.7l.5-7 12.8-11.6c.6-.5-.1-.8-.9-.3l-15.8 10-6.8-2.1c-1.5-.5-1.5-1.5.3-2.2l26.6-10.3c1.2-.4 2.3.3 1.9 1.6Z" fill={W} />
    </Tile>
  ),
  windows: () => (
    <Tile from="#3a4454" to="#171d28" title="نرم‌افزار">
      <g fill={W}>
        <rect x="18" y="18" width="12" height="12" rx="2" />
        <rect x="34" y="18" width="12" height="12" rx="2" />
        <rect x="18" y="34" width="12" height="12" rx="2" />
        <rect x="34" y="34" width="12" height="12" rx="2" />
      </g>
    </Tile>
  ),
  puzzle: () => (
    <Tile from="#3a4454" to="#171d28" title="پلاگین">
      <path d="M27.5 16c2.9 0 5 1.9 5 4.4 0 .8-.2 1.5-.5 2.1h6.4c1.2 0 2.1.9 2.1 2.1v6c.6-.3 1.3-.5 2.1-.5 2.5 0 4.4 2.1 4.4 5s-1.9 5-4.4 5c-.8 0-1.5-.2-2.1-.5v6c0 1.2-.9 2.1-2.1 2.1H24.1c-1.2 0-2.1-.9-2.1-2.1V38c-.6.3-1.3.5-2.1.5-2.5 0-4.4-2.1-4.4-5s1.9-5 4.4-5c.8 0 1.5.2 2.1.5v-6c0-1.2.9-2.1 2.1-2.1h1.5c-.3-.6-.5-1.3-.5-2.1 0-2.5 2.1-4.4 5-4.4Z" fill={W} />
    </Tile>
  ),
  code: () => (
    <Tile from="#1d5f4c" to="#0a2b21" title="طراحی وب">
      <rect x="13" y="17" width="38" height="30" rx="4" fill={W} fillOpacity="0.16" />
      <g fill={W}>
        <circle cx="19" cy="23" r="1.7" />
        <circle cx="24.5" cy="23" r="1.7" />
        <circle cx="30" cy="23" r="1.7" />
      </g>
      <path d="m27 31-4.5 5 4.5 5M37 31l4.5 5-4.5 5" stroke={W} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Tile>
  ),
  ae: () => (
    <Tile from="#3c1b70" to="#190638" title="افترافکت">
      <Word text="Ae" color="#b3a6ff" />
    </Tile>
  ),
  pr: () => (
    <Tile from="#3a136b" to="#170533" title="پریمیر پرو">
      <Word text="Pr" color="#f0a3ff" />
    </Tile>
  ),
  au: () => (
    <Tile from="#0d3b4a" to="#031a26" title="ادیشن">
      <Word text="Au" color="#3ce6c4" />
    </Tile>
  ),
  ps: () => (
    <Tile from="#0b3a63" to="#021a30" title="فتوشاپ">
      <Word text="Ps" color="#4fb3ff" />
    </Tile>
  ),
  davinci: () => (
    <Tile from="#3a3a3f" to="#1a1a1d" title="داوینچی ریزالو">
      <circle cx="32" cy="24.5" r="7.5" fill="#e0483c" fillOpacity="0.92" />
      <circle cx="25.5" cy="36" r="7.5" fill="#3f8ddb" fillOpacity="0.92" />
      <circle cx="38.5" cy="36" r="7.5" fill="#4fb98a" fillOpacity="0.92" />
      <circle cx="32" cy="32" r="4.6" fill="#12131a" />
    </Tile>
  ),
  chrome: () => (
    <Tile from="#f6f8fb" to="#d8e0ea" title="گوگل کروم">
      <circle cx="32" cy="32" r="16" fill="#f1f3f6" />
      <path d="M32 16a16 16 0 0 1 13.9 8.1H32a8 8 0 0 0-7 4.1L18.4 20A16 16 0 0 1 32 16Z" fill="#e8453c" />
      <path d="M18.4 20 25 28.2a8 8 0 0 0 .3 8L18.9 47A16 16 0 0 1 18.4 20Z" fill="#f8bb15" />
      <path d="M18.9 47 25.3 36a8 8 0 0 0 6.7 4h13.9A16 16 0 0 1 18.9 47Z" fill="#34a853" />
      <circle cx="32" cy="32" r="6.6" fill="#4a90e2" />
      <circle cx="32" cy="32" r="6.6" fill="none" stroke="#f1f3f6" strokeWidth="1.6" />
    </Tile>
  ),
  cart: () => (
    <Tile from="#4aa4f0" to="#1a5fb4" title="فروشگاه">
      <path d="M16 19h4.2l3.6 18.4a3 3 0 0 0 3 2.4h14.6a3 3 0 0 0 2.9-2.3L47.6 26H23" stroke={W} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="27" cy="45.5" r="2.8" fill={W} />
      <circle cx="41" cy="45.5" r="2.8" fill={W} />
    </Tile>
  ),
  chat: () => (
    <Tile from="#59b8e8" to="#1b6ea8" title="گفت‌وگو">
      <path d="M17 25a5 5 0 0 1 5-5h20a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5H30l-8.5 6.2A1 1 0 0 1 20 47.4V42a3 3 0 0 1-3-3Z" fill={W} />
      <g fill="#2b7cb5">
        <circle cx="26" cy="31" r="2.3" />
        <circle cx="32" cy="31" r="2.3" />
        <circle cx="38" cy="31" r="2.3" />
      </g>
    </Tile>
  ),
  archive: () => (
    <Tile from="#3a4454" to="#171d28" title="آرشیو">
      <rect x="15" y="19" width="34" height="9" rx="2.5" fill={W} />
      <path d="M18 31h28v13a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4Z" fill={W} fillOpacity="0.82" />
      <rect x="27" y="35" width="10" height="3" rx="1.5" fill="#2b3440" />
    </Tile>
  ),
  bell: () => (
    <Tile from="#e8b969" to="#b07d24" title="یادآور">
      <path d="M32 16a10 10 0 0 1 10 10v7l3 5.4a1.6 1.6 0 0 1-1.4 2.4H20.4a1.6 1.6 0 0 1-1.4-2.4L22 33v-7a10 10 0 0 1 10-10Z" fill={W} />
      <path d="M27.5 44.5a4.6 4.6 0 0 0 9 0Z" fill={W} />
    </Tile>
  ),
  box: () => (
    <Tile from="#8b7ae8" to="#4130a0" title="کتابخانه">
      <path d="m32 15 15 8v18l-15 8-15-8V23Z" fill={W} fillOpacity="0.9" />
      <path d="m17 23 15 8 15-8M32 31v18" stroke="#5340b8" strokeWidth="2.4" strokeLinejoin="round" fill="none" />
    </Tile>
  ),
  layers: () => (
    <Tile from="#4fb98a" to="#1a6b4c" title="لایه‌ها">
      <path d="m32 16 16 8-16 8-16-8Z" fill={W} />
      <path d="m19 31.5-3 1.5 16 8 16-8-3-1.5" stroke={W} strokeWidth="2.8" strokeLinejoin="round" fill="none" opacity="0.75" />
      <path d="m19 39.5-3 1.5 16 8 16-8-3-1.5" stroke={W} strokeWidth="2.8" strokeLinejoin="round" fill="none" opacity="0.45" />
    </Tile>
  ),
  mobile: () => (
    <Tile from="#ec8a94" to="#a83a4c" title="موبایل">
      <rect x="21" y="14" width="22" height="36" rx="5" fill={W} />
      <rect x="28" y="17.5" width="8" height="2" rx="1" fill="#c45a68" />
      <circle cx="32" cy="45" r="2.3" fill="#c45a68" />
    </Tile>
  ),
  globe: () => (
    <Tile from="#3fb59b" to="#12594e" title="وب‌سایت">
      <circle cx="32" cy="32" r="16" fill="none" stroke={W} strokeWidth="2.8" />
      <ellipse cx="32" cy="32" rx="7" ry="16" fill="none" stroke={W} strokeWidth="2.4" />
      <path d="M17 27h30M17 37h30" stroke={W} strokeWidth="2.4" strokeLinecap="round" />
    </Tile>
  ),
  chart: () => (
    <Tile from="#8b7ae8" to="#4130a0" title="نمودار">
      <g fill={W}>
        <rect x="18" y="34" width="6.5" height="14" rx="2.4" />
        <rect x="28.7" y="25" width="6.5" height="23" rx="2.4" />
        <rect x="39.4" y="18" width="6.5" height="30" rx="2.4" />
      </g>
    </Tile>
  ),
  spark: () => (
    <Tile from="#4a6ea8" to="#152845" title="پروژه">
      <path d="M32 15c1.3 8.2 3.5 10.4 11.7 11.7C35.5 28 33.3 30.2 32 38.4 30.7 30.2 28.5 28 20.3 26.7 28.5 25.4 30.7 23.2 32 15Z" fill={W} />
      <path d="M42.5 38c.7 4.2 1.8 5.3 6 6-4.2.7-5.3 1.8-6 6-.7-4.2-1.8-5.3-6-6 4.2-.7 5.3-1.8 6-6Z" fill={W} fillOpacity="0.7" />
    </Tile>
  ),
};

export function Icon({ name }: { name: IconName }) {
  const Render = icons[name] ?? icons.spark;
  return <Render />;
}

export const ICON_NAMES = Object.keys(icons) as IconName[];

/**
 * A project's badge: the uploaded logo when the owner set one, otherwise the
 * built-in squircle. Everything that shows a project mark goes through this.
 */
export function Mark({ name, logo, alt = '' }: { name: IconName; logo?: string; alt?: string }) {
  if (logo) return <img className="mark-logo" src={logo} alt={alt} loading="lazy" decoding="async" />;
  return <Icon name={name} />;
}
