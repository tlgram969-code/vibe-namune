const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Latin digits → Persian digits, for numbers shown inside Persian prose. */
export const toFa = (value: number | string) =>
  String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

export const faNumber = (value: number) => toFa(value.toLocaleString('en-US'));

/** SQLite writes `YYYY-MM-DD HH:MM:SS` in UTC; make that explicit before parsing. */
const parse = (iso: string) => new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`);

const dateFmt = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' });

export const faDate = (iso: string) => {
  const d = parse(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
};

export const faDateTime = (iso: string) => {
  const d = parse(iso);
  return Number.isNaN(d.getTime()) ? '—' : `${dateFmt.format(d)} ساعت ${timeFmt.format(d)}`;
};

export function faRelative(iso: string) {
  const d = parse(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'همین حالا';
  if (seconds < 3600) return `${toFa(Math.floor(seconds / 60))} دقیقه پیش`;
  if (seconds < 86400) return `${toFa(Math.floor(seconds / 3600))} ساعت پیش`;
  if (seconds < 604800) return `${toFa(Math.floor(seconds / 86400))} روز پیش`;
  return faDate(iso);
}

/** Join class names, dropping anything falsy. */
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/**
 * Project bodies use a deliberately tiny subset of Markdown — `## heading`,
 * `- bullet`, blank-line paragraphs. Parsed to data, never to HTML.
 */
export type RichBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'paragraph'; text: string };

export function parseRichText(source: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (list.length) {
      blocks.push({ kind: 'list', items: list });
      list = [];
    }
  };

  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      blocks.push({ kind: 'heading', text: line.slice(3).trim() });
    } else if (line.startsWith('- ')) {
      list.push(line.slice(2).trim());
    } else {
      flushList();
      blocks.push({ kind: 'paragraph', text: line });
    }
  }
  flushList();
  return blocks;
}
