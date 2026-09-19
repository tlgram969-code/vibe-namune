import { Router } from 'express';
import { db } from '../db.js';

export const seoRouter = Router();

/** Absolute origin this request arrived on, so the files work on any host. */
function origin(req) {
  if (process.env.VN_SITE_URL) return process.env.VN_SITE_URL.replace(/\/+$/, '');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${req.get('host')}`;
}

const escape = (value) =>
  String(value).replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

seoRouter.get('/robots.txt', (req, res) => {
  const base = origin(req);
  res
    .type('text/plain; charset=utf-8')
    .set('Cache-Control', 'public, max-age=3600')
    .send(
      [
        'User-agent: *',
        'Allow: /',
        // The panel and the API are not content; keep them out of indexes.
        'Disallow: /admin',
        'Disallow: /api/',
        'Disallow: /account',
        '',
        `Sitemap: ${base}/sitemap.xml`,
        '',
      ].join('\n'),
    );
});

seoRouter.get('/sitemap.xml', (req, res) => {
  const base = origin(req);

  const categories = db
    .prepare('SELECT slug FROM categories WHERE visible = 1 ORDER BY sort_order')
    .all();
  const projects = db
    .prepare('SELECT slug, updated_at FROM projects WHERE published = 1 ORDER BY sort_order')
    .all();

  const day = (value) => (value ? String(value).slice(0, 10) : new Date().toISOString().slice(0, 10));

  const urls = [
    { loc: '/', priority: '1.0', freq: 'weekly' },
    { loc: '/projects', priority: '0.9', freq: 'weekly' },
    { loc: '/about', priority: '0.6', freq: 'monthly' },
    { loc: '/contact', priority: '0.5', freq: 'monthly' },
    ...categories.map((c) => ({ loc: `/c/${c.slug}`, priority: '0.8', freq: 'weekly' })),
    ...projects.map((p) => ({
      loc: `/p/${p.slug}`,
      priority: '0.7',
      freq: 'monthly',
      lastmod: day(p.updated_at),
    })),
  ];

  const body = urls
    .map(({ loc, priority, freq, lastmod }) =>
      [
        '  <url>',
        `    <loc>${escape(base + loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        `    <changefreq>${freq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n');

  res
    .type('application/xml; charset=utf-8')
    .set('Cache-Control', 'public, max-age=3600')
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
});
