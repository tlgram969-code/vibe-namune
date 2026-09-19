import { Router } from 'express';
import { createWriteStream, unlink } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { db, UPLOAD_DIR } from '../db.js';
import { requireAdmin } from '../auth.js';
import { mapCategory, mapProject, mapMessage, mapMedia, mapComment, PROJECT_SELECT } from '../shape.js';
import { str, int, bool, slugify, tagList, bad } from '../validate.js';
import { seedSettings } from '../seed-data.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin(db));

const ICONS = new Set([
  'telegram', 'windows', 'puzzle', 'code', 'ae', 'pr', 'au', 'ps', 'davinci', 'chrome',
  'cart', 'chat', 'archive', 'bell', 'box', 'layers', 'mobile', 'globe', 'chart', 'spark',
]);
const ACCENTS = new Set(['blue', 'violet', 'mint', 'cream', 'rose', 'slate', 'sky']);

const pickIcon = (value, fallback = 'spark') => (ICONS.has(value) ? value : fallback);
const pickAccent = (value, fallback = 'blue') => (ACCENTS.has(value) ? value : fallback);

/** Only same-origin upload paths and plain https links are accepted. */
function safeMediaUrl(value, field) {
  const url = str(value, field, { max: 600 });
  if (url.startsWith('/uploads/') && !url.includes('..')) return url;
  if (/^https:\/\/[^\s"'<>]+$/i.test(url)) return url;
  throw bad(`«${field}» باید یک فایل بارگذاری‌شده یا نشانی https باشد.`);
}

/** Ensure a slug is unique, ignoring the row being edited. */
function uniqueSlug(table, slug, ignoreId = null) {
  const row = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(slug);
  if (row && row.id !== ignoreId) throw bad('این نشانی (slug) قبلاً استفاده شده است.');
  return slug;
}

// ── Dashboard ────────────────────────────────────────────────────────────────

adminRouter.get('/overview', (_req, res) => {
  const counts = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM projects)                        AS projects,
      (SELECT COUNT(*) FROM projects WHERE published = 1)    AS published,
      (SELECT COUNT(*) FROM projects WHERE featured = 1)     AS featured,
      (SELECT COUNT(*) FROM categories)                      AS categories,
      (SELECT COUNT(*) FROM messages)                        AS messages,
      (SELECT COUNT(*) FROM messages WHERE is_read = 0)      AS unread,
      (SELECT COALESCE(SUM(views), 0) FROM projects)         AS views,
      (SELECT COUNT(*) FROM comments)                        AS comments,
      (SELECT COUNT(*) FROM users WHERE role = 'member')     AS members,
      (SELECT COUNT(*) FROM media)                           AS media
  `).get();

  const byCategory = db.prepare(`
    SELECT c.title, c.accent, COUNT(p.id) AS total
    FROM categories c LEFT JOIN projects p ON p.category_id = c.id
    GROUP BY c.id ORDER BY c.sort_order`).all();

  const topProjects = db
    .prepare(`${PROJECT_SELECT} ORDER BY p.views DESC, p.id LIMIT 5`)
    .all()
    .map(mapProject);

  const recentMessages = db
    .prepare('SELECT * FROM messages ORDER BY created_at DESC, id DESC LIMIT 5')
    .all()
    .map(mapMessage);

  res.json({ counts, byCategory, topProjects, recentMessages });
});

// ── Uploads ──────────────────────────────────────────────────────────────────

const UPLOAD_TYPES = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['video/mp4', 'mp4'],
  ['video/webm', 'webm'],
]);

const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 80 * 1024 * 1024;

/**
 * Raw-body upload: the client PUTs the File straight through, so there is no
 * multipart parser to pull in. SVG is deliberately not accepted — it can carry
 * script and would run on this origin.
 */
adminRouter.post('/upload', (req, res) => {
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const ext = UPLOAD_TYPES.get(type);
  if (!ext) {
    return res.status(415).json({ error: 'فقط تصویر PNG، JPG، WebP، GIF و ویدیوی MP4 یا WebM پذیرفته می‌شود.' });
  }

  const limit = type.startsWith('video/') ? MAX_VIDEO : MAX_IMAGE;
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > limit) {
    return res.status(413).json({ error: `حجم فایل بیشتر از ${Math.round(limit / 1048576)} مگابایت است.` });
  }

  const name = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${ext}`;
  const target = join(UPLOAD_DIR, name);
  const out = createWriteStream(target);

  let written = 0;
  let failed = false;

  const abort = (status, message) => {
    if (failed) return;
    failed = true;
    req.unpipe(out);
    out.destroy();
    unlink(target, () => undefined);
    if (!res.headersSent) res.status(status).json({ error: message });
  };

  req.on('data', (chunk) => {
    written += chunk.length;
    if (written > limit) abort(413, `حجم فایل بیشتر از ${Math.round(limit / 1048576)} مگابایت است.`);
  });
  req.on('error', () => abort(400, 'بارگذاری فایل ناتمام ماند.'));
  out.on('error', () => abort(500, 'ذخیره‌ی فایل ناموفق بود.'));

  out.on('finish', () => {
    if (failed) return;
    if (written === 0) return abort(400, 'فایلی دریافت نشد.');
    res.status(201).json({
      url: `/uploads/${name}`,
      kind: type.startsWith('video/') ? 'video' : 'image',
      size: written,
    });
  });

  req.pipe(out);
});

// ── Projects ─────────────────────────────────────────────────────────────────

const listMedia = db.prepare('SELECT * FROM media WHERE project_id = ? ORDER BY sort_order, id');

const withMedia = (row) => (row ? { ...mapProject(row), media: listMedia.all(row.id).map(mapMedia) } : null);

adminRouter.get('/projects', (_req, res) => {
  res.json(db.prepare(`${PROJECT_SELECT} ORDER BY p.sort_order, p.id`).all().map(mapProject));
});

adminRouter.get('/projects/:id', (req, res) => {
  const row = db.prepare(`${PROJECT_SELECT} WHERE p.id = ?`).get(int(req.params.id, -1));
  if (!row) return res.status(404).json({ error: 'پروژه پیدا نشد.' });
  res.json(withMedia(row));
});

/** Shared field parsing for create and update. */
function projectFields(body) {
  const categoryId = int(body?.categoryId, 0);
  const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
  if (!category) throw bad('یک دسته‌بندی معتبر انتخاب کنید.');

  // Same rule as `media`: omit the key to keep what is stored, send '' to clear.
  const logoUrl =
    body?.logoUrl === undefined ? undefined : body.logoUrl ? safeMediaUrl(body.logoUrl, 'لوگوی اختصاصی') : '';

  return {
    title: str(body?.title, 'عنوان', { min: 2, max: 120 }),
    subtitle: str(body?.subtitle, 'زیرعنوان', { max: 120, required: false }),
    summary: str(body?.summary, 'خلاصه', { max: 400, required: false }),
    body: str(body?.body, 'متن', { max: 20000, required: false }),
    icon: pickIcon(body?.icon),
    logoUrl,
    accent: pickAccent(body?.accent),
    tags: JSON.stringify(tagList(body?.tags)),
    linkUrl: str(body?.linkUrl, 'لینک', { max: 500, required: false }),
    featured: bool(body?.featured),
    published: body?.published === undefined ? 1 : bool(body.published),
    categoryId,
  };
}

/** Validates the gallery, then replaces the project's rows with it. */
function replaceMedia(projectId, rawList) {
  if (rawList === undefined) return;
  const items = Array.isArray(rawList) ? rawList.slice(0, 24) : [];
  const clean = items.map((item) => ({
    kind: item?.kind === 'video' ? 'video' : 'image',
    url: safeMediaUrl(item?.url, 'نشانی رسانه'),
    caption: str(item?.caption, 'توضیح رسانه', { max: 160, required: false }),
  }));

  const insert = db.prepare('INSERT INTO media (project_id, kind, url, caption, sort_order) VALUES (?, ?, ?, ?, ?)');
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM media WHERE project_id = ?').run(projectId);
    clean.forEach((m, i) => insert.run(projectId, m.kind, m.url, m.caption, i));
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

adminRouter.post('/projects', (req, res, next) => {
  try {
    const f = projectFields(req.body);
    const slug = uniqueSlug('projects', slugify(req.body?.slug || f.title, 'project'));
    const { maxOrder } = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM projects').get();

    const info = db.prepare(`
      INSERT INTO projects (slug, category_id, title, subtitle, summary, body, icon, logo_url, accent, tags, link_url, featured, published, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      slug, f.categoryId, f.title, f.subtitle, f.summary, f.body,
      f.icon, f.logoUrl ?? '', f.accent, f.tags, f.linkUrl, f.featured, f.published, maxOrder + 1,
    );

    const id = Number(info.lastInsertRowid);
    replaceMedia(id, req.body?.media);

    res.status(201).json(withMedia(db.prepare(`${PROJECT_SELECT} WHERE p.id = ?`).get(id)));
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/projects/:id', (req, res, next) => {
  try {
    const id = int(req.params.id, -1);
    if (!db.prepare('SELECT id FROM projects WHERE id = ?').get(id)) {
      return res.status(404).json({ error: 'پروژه پیدا نشد.' });
    }

    const f = projectFields(req.body);
    const slug = uniqueSlug('projects', slugify(req.body?.slug || f.title, 'project'), id);

    db.prepare(`
      UPDATE projects SET
        slug = ?, category_id = ?, title = ?, subtitle = ?, summary = ?, body = ?,
        icon = ?, logo_url = COALESCE(?, logo_url), accent = ?, tags = ?, link_url = ?,
        featured = ?, published = ?, updated_at = datetime('now')
      WHERE id = ?`).run(
      slug, f.categoryId, f.title, f.subtitle, f.summary, f.body,
      f.icon, f.logoUrl ?? null, f.accent, f.tags, f.linkUrl, f.featured, f.published, id,
    );

    replaceMedia(id, req.body?.media);

    res.json(withMedia(db.prepare(`${PROJECT_SELECT} WHERE p.id = ?`).get(id)));
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/projects/:id', (req, res) => {
  const info = db.prepare('DELETE FROM projects WHERE id = ?').run(int(req.params.id, -1));
  if (!info.changes) return res.status(404).json({ error: 'پروژه پیدا نشد.' });
  res.json({ ok: true });
});

adminRouter.put('/projects-order', (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((v) => int(v, -1)) : null;
    if (!ids) throw bad('ترتیب جدید ارسال نشده است.');
    const stmt = db.prepare('UPDATE projects SET sort_order = ? WHERE id = ?');
    db.exec('BEGIN');
    try {
      ids.forEach((id, index) => stmt.run(index, id));
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Categories ───────────────────────────────────────────────────────────────

adminRouter.get('/categories', (_req, res) => {
  const rows = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM projects p WHERE p.category_id = c.id) AS project_count
    FROM categories c ORDER BY c.sort_order, c.id`).all();
  res.json(rows.map(mapCategory));
});

function categoryFields(body) {
  return {
    title: str(body?.title, 'عنوان', { min: 2, max: 80 }),
    subtitle: str(body?.subtitle, 'زیرعنوان', { max: 80, required: false }),
    description: str(body?.description, 'توضیح', { max: 400, required: false }),
    introTitle: str(body?.introTitle, 'عنوان معرفی', { max: 120, required: false }),
    introBody: str(body?.introBody, 'متن معرفی', { max: 2000, required: false }),
    ctaLabel: str(body?.ctaLabel, 'نوشته‌ی دکمه', { max: 60, required: false }),
    icon: pickIcon(body?.icon),
    accent: pickAccent(body?.accent),
    visible: body?.visible === undefined ? 1 : bool(body.visible),
  };
}

adminRouter.post('/categories', (req, res, next) => {
  try {
    const f = categoryFields(req.body);
    const slug = uniqueSlug('categories', slugify(req.body?.slug || f.title, 'category'));
    const { maxOrder } = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM categories').get();

    const info = db.prepare(`
      INSERT INTO categories (slug, title, subtitle, description, intro_title, intro_body, cta_label, icon, accent, visible, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      slug, f.title, f.subtitle, f.description, f.introTitle, f.introBody, f.ctaLabel,
      f.icon, f.accent, f.visible, maxOrder + 1,
    );

    res.status(201).json(mapCategory(db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(info.lastInsertRowid))));
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/categories/:id', (req, res, next) => {
  try {
    const id = int(req.params.id, -1);
    if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(id)) {
      return res.status(404).json({ error: 'دسته‌بندی پیدا نشد.' });
    }
    const f = categoryFields(req.body);
    const slug = uniqueSlug('categories', slugify(req.body?.slug || f.title, 'category'), id);

    db.prepare(`
      UPDATE categories SET slug = ?, title = ?, subtitle = ?, description = ?,
        intro_title = ?, intro_body = ?, cta_label = ?, icon = ?, accent = ?, visible = ?
      WHERE id = ?`).run(
      slug, f.title, f.subtitle, f.description, f.introTitle, f.introBody, f.ctaLabel,
      f.icon, f.accent, f.visible, id,
    );

    res.json(mapCategory(db.prepare('SELECT * FROM categories WHERE id = ?').get(id)));
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/categories/:id', (req, res) => {
  const id = int(req.params.id, -1);
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM projects WHERE category_id = ?').get(id);
  if (n > 0) {
    return res.status(409).json({ error: `این دسته ${n} پروژه دارد. اول پروژه‌ها را جابه‌جا یا حذف کنید.` });
  }
  const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (!info.changes) return res.status(404).json({ error: 'دسته‌بندی پیدا نشد.' });
  res.json({ ok: true });
});

// ── Comments ─────────────────────────────────────────────────────────────────

adminRouter.get('/comments', (_req, res) => {
  const rows = db.prepare(`
    SELECT c.*, u.name AS author_name, u.username AS author_username,
           p.slug AS project_slug, p.title AS project_title
    FROM comments c
    JOIN users u ON u.id = c.user_id
    JOIN projects p ON p.id = c.project_id
    ORDER BY c.created_at DESC, c.id DESC`).all();
  res.json(rows.map(mapComment));
});

adminRouter.delete('/comments/:id', (req, res) => {
  const info = db.prepare('DELETE FROM comments WHERE id = ?').run(int(req.params.id, -1));
  if (!info.changes) return res.status(404).json({ error: 'این نظر پیدا نشد.' });
  res.json({ ok: true });
});

// ── Members ──────────────────────────────────────────────────────────────────

adminRouter.get('/members', (_req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.name, u.role, u.created_at,
           (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id) AS comment_count
    FROM users u ORDER BY u.id DESC`).all();
  res.json(rows.map((r) => ({
    id: r.id, username: r.username, name: r.name, role: r.role,
    createdAt: r.created_at, commentCount: r.comment_count,
  })));
});

adminRouter.delete('/members/:id', (req, res) => {
  const id = int(req.params.id, -1);
  const row = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'این کاربر پیدا نشد.' });
  if (row.role === 'admin') return res.status(409).json({ error: 'حساب مدیر حذف نمی‌شود.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ── Messages ─────────────────────────────────────────────────────────────────

adminRouter.get('/messages', (_req, res) => {
  res.json(db.prepare('SELECT * FROM messages ORDER BY created_at DESC, id DESC').all().map(mapMessage));
});

adminRouter.patch('/messages/:id', (req, res) => {
  const info = db
    .prepare('UPDATE messages SET is_read = ? WHERE id = ?')
    .run(bool(req.body?.isRead), int(req.params.id, -1));
  if (!info.changes) return res.status(404).json({ error: 'پیام پیدا نشد.' });
  res.json({ ok: true });
});

adminRouter.delete('/messages/:id', (req, res) => {
  const info = db.prepare('DELETE FROM messages WHERE id = ?').run(int(req.params.id, -1));
  if (!info.changes) return res.status(404).json({ error: 'پیام پیدا نشد.' });
  res.json({ ok: true });
});

// ── Settings ─────────────────────────────────────────────────────────────────

const ALLOWED_SETTINGS = new Set(Object.keys(seedSettings));

adminRouter.get('/settings', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});

adminRouter.put('/settings', (req, res, next) => {
  try {
    const patch = req.body;
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw bad('داده‌ی ارسالی معتبر نیست.');

    const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    db.exec('BEGIN');
    try {
      for (const [key, value] of Object.entries(patch)) {
        if (!ALLOWED_SETTINGS.has(key)) continue; // ignore unknown keys instead of failing
        stmt.run(key, String(value ?? '').slice(0, 2000));
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const rows = db.prepare('SELECT key, value FROM settings').all();
    res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  } catch (err) {
    next(err);
  }
});
