import { Router } from 'express';
import { db, getSettings } from '../db.js';
import { mapCategory, mapProject, mapMedia, mapComment, PROJECT_SELECT } from '../shape.js';
import { str, email as emailField, int, bad } from '../validate.js';
import { rateLimit } from '../rate-limit.js';
import { requireAuth } from '../auth.js';

export const publicRouter = Router();

const listCategories = db.prepare(`
  SELECT c.*, (
    SELECT COUNT(*) FROM projects p WHERE p.category_id = c.id AND p.published = 1
  ) AS project_count
  FROM categories c
  WHERE c.visible = 1
  ORDER BY c.sort_order, c.id`);

const findCategory = db.prepare('SELECT * FROM categories WHERE slug = ? AND visible = 1');

const listMedia = db.prepare('SELECT * FROM media WHERE project_id = ? ORDER BY sort_order, id');

const listComments = db.prepare(`
  SELECT c.*, u.name AS author_name, u.username AS author_username
  FROM comments c JOIN users u ON u.id = c.user_id
  WHERE c.project_id = ?
  ORDER BY c.created_at DESC, c.id DESC`);

/** One round-trip for everything the app shell needs on first paint. */
publicRouter.get('/bootstrap', (_req, res) => {
  const categories = listCategories.all().map(mapCategory);
  const { projects } = db.prepare('SELECT COUNT(*) AS projects FROM projects WHERE published = 1').get();
  res.json({
    settings: getSettings(),
    categories,
    stats: { projects, categories: categories.length },
  });
});

publicRouter.get('/categories', (_req, res) => {
  res.json(listCategories.all().map(mapCategory));
});

publicRouter.get('/categories/:slug', (req, res) => {
  const category = findCategory.get(req.params.slug);
  if (!category) return res.status(404).json({ error: 'این دسته‌بندی پیدا نشد.' });

  const projects = db
    .prepare(`${PROJECT_SELECT} WHERE p.category_id = ? AND p.published = 1 ORDER BY p.sort_order, p.id`)
    .all(category.id)
    .map(mapProject);

  res.json({ category: mapCategory(category), projects });
});

publicRouter.get('/projects', (req, res) => {
  const where = ['p.published = 1'];
  const params = [];

  if (req.query.category) {
    where.push('c.slug = ?');
    params.push(String(req.query.category));
  }
  if (req.query.featured === '1') where.push('p.featured = 1');

  const q = String(req.query.q || '').trim();
  if (q) {
    where.push('(p.title LIKE ? OR p.subtitle LIKE ? OR p.summary LIKE ? OR p.tags LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const limit = Math.min(Math.max(int(req.query.limit, 60), 1), 100);
  const rows = db
    .prepare(`${PROJECT_SELECT} WHERE ${where.join(' AND ')} ORDER BY p.featured DESC, p.sort_order, p.id LIMIT ?`)
    .all(...params, limit);

  res.json(rows.map(mapProject));
});

publicRouter.get('/projects/:slug', (req, res) => {
  const row = db.prepare(`${PROJECT_SELECT} WHERE p.slug = ? AND p.published = 1`).get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'این پروژه پیدا نشد.' });

  db.prepare('UPDATE projects SET views = views + 1 WHERE id = ?').run(row.id);

  const related = db
    .prepare(
      `${PROJECT_SELECT} WHERE p.category_id = ? AND p.id != ? AND p.published = 1 ORDER BY p.sort_order LIMIT 3`,
    )
    .all(row.category_id, row.id)
    .map(mapProject);

  res.json({
    project: mapProject(row),
    media: listMedia.all(row.id).map(mapMedia),
    comments: getSettings().comments_enabled === '1' ? listComments.all(row.id).map(mapComment) : [],
    related,
  });
});

// ── Comments ─────────────────────────────────────────────────────────────────

publicRouter.post(
  '/projects/:slug/comments',
  requireAuth(db),
  rateLimit({ windowMs: 5 * 60_000, max: 8, message: 'نظرهای پشت‌سرهم زیاد بود. چند دقیقه دیگر دوباره تلاش کنید.' }),
  (req, res, next) => {
    try {
      if (getSettings().comments_enabled !== '1') throw bad('بخش نظرها بسته است.');

      const project = db.prepare('SELECT id FROM projects WHERE slug = ? AND published = 1').get(req.params.slug);
      if (!project) return res.status(404).json({ error: 'این پروژه پیدا نشد.' });

      const body = str(req.body?.body, 'متن نظر', { min: 3, max: 1500 });
      const info = db
        .prepare('INSERT INTO comments (project_id, user_id, body) VALUES (?, ?, ?)')
        .run(project.id, req.user.id, body);

      const saved = db
        .prepare(`
          SELECT c.*, u.name AS author_name, u.username AS author_username
          FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`)
        .get(Number(info.lastInsertRowid));

      res.status(201).json(mapComment(saved));
    } catch (err) {
      next(err);
    }
  },
);

/** A member may remove their own comment; the owner may remove any. */
publicRouter.delete('/comments/:id', requireAuth(db), (req, res) => {
  const row = db.prepare('SELECT * FROM comments WHERE id = ?').get(int(req.params.id, -1));
  if (!row) return res.status(404).json({ error: 'این نظر پیدا نشد.' });
  if (row.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'فقط نویسنده‌ی نظر می‌تواند آن را حذف کند.' });
  }
  db.prepare('DELETE FROM comments WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

// ── Contact form ─────────────────────────────────────────────────────────────

publicRouter.get('/settings', (_req, res) => res.json(getSettings()));

publicRouter.post(
  '/messages',
  rateLimit({ windowMs: 10 * 60_000, max: 5, message: 'تعداد پیام‌های ارسالی زیاد است. کمی بعد دوباره تلاش کنید.' }),
  (req, res, next) => {
    try {
      if (getSettings().contact_form_enabled !== '1') throw bad('فرم تماس در حال حاضر بسته است.');

      const name = str(req.body?.name, 'نام', { min: 2, max: 80 });
      const email = emailField(req.body?.email, { required: true });
      const subject = str(req.body?.subject, 'موضوع', { min: 0, max: 120, required: false });
      const body = str(req.body?.body, 'متن پیام', { min: 5, max: 4000 });

      const info = db
        .prepare('INSERT INTO messages (name, email, subject, body) VALUES (?, ?, ?, ?)')
        .run(name, email, subject, body);

      res.status(201).json({ ok: true, id: Number(info.lastInsertRowid) });
    } catch (err) {
      next(err);
    }
  },
);
