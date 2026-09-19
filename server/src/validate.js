/** Thrown by the helpers below; turned into a 400 by the error handler. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const bad = (message) => new HttpError(400, message);

export function str(value, field, { min = 0, max = 20000, required = true } = {}) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v && required) throw bad(`«${field}» را وارد کنید.`);
  if (v.length < min) throw bad(`«${field}» باید حداقل ${min} نویسه باشد.`);
  if (v.length > max) throw bad(`«${field}» نباید بیشتر از ${max} نویسه باشد.`);
  return v;
}

export const int = (value, fallback = 0) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const bool = (value) => (value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0);

/** Latin/Persian/digit/dash slug, normalised. */
export function slugify(input, fallback = 'item') {
  const s = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
  return s || `${fallback}-${Date.now().toString(36)}`;
}

export function email(value, { required = false } = {}) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) {
    if (required) throw bad('«ایمیل» را وارد کنید.');
    return '';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) throw bad('ایمیل معتبر نیست.');
  return v;
}

export function tagList(value) {
  const arr = Array.isArray(value)
    ? value
    : String(value || '').split(/[,،]/);
  return arr.map((t) => String(t).trim()).filter(Boolean).slice(0, 12);
}
