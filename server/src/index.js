import express from 'express';
import compression from 'compression';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { purgeSessions, closeDatabase, UPLOAD_DIR } from './db.js';
import { publicRouter } from './routes/public.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { seoRouter } from './routes/seo.js';
import { HttpError } from './validate.js';

const here = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = join(here, '..', '..', 'client', 'dist');
const PORT = Number(process.env.PORT) || 4173;
// Loopback by default: the site is meant for this machine, and binding wider is
// what makes Windows raise a firewall prompt. Set VN_HOST=0.0.0.0 to share it.
const HOST = process.env.VN_HOST || '127.0.0.1';

const app = express();
app.set('x-powered-by', false);
app.set('trust proxy', 1);

app.use(compression());
app.use(express.json({ limit: '256kb' }));

/** Tiny cookie reader — the only cookie this app sets is the session token. */
app.use((req, _res, next) => {
  req.cookies = Object.create(null);
  const header = req.headers.cookie;
  if (header) {
    for (const part of header.split(';')) {
      const eq = part.indexOf('=');
      if (eq < 1) continue;
      const key = part.slice(0, eq).trim();
      try {
        req.cookies[key] = decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        req.cookies[key] = part.slice(eq + 1).trim();
      }
    }
  }
  next();
});

// ── Security headers ─────────────────────────────────────────────────────────
// The built index.html carries one inline script (the no-flash theme bootstrap);
// hashing it keeps the policy strict without an 'unsafe-inline' script source.
const INDEX_HTML = join(CLIENT_DIST, 'index.html');

function inlineScriptHashes() {
  if (!existsSync(INDEX_HTML)) return [];
  const html = readFileSync(INDEX_HTML, 'utf8');
  const hashes = [];
  for (const m of html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    hashes.push(`'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  }
  return hashes;
}

const buildCsp = () =>
  [
    "default-src 'self'",
    `script-src 'self' ${inlineScriptHashes().join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'", // CSS custom properties are set via style attributes
    // https: covers gallery items the owner links to instead of uploading.
    "img-src 'self' data: https:",
    "media-src 'self' https:",
    "font-src 'self'",
    "connect-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
  ].join('; ');

// Cached against the page's mtime, so rebuilding the client while the server is
// running cannot leave a stale hash that blocks the theme bootstrap.
let cachedCsp = buildCsp();
let cachedStamp = existsSync(INDEX_HTML) ? statSync(INDEX_HTML).mtimeMs : 0;

function currentCsp() {
  if (!existsSync(INDEX_HTML)) return cachedCsp;
  const stamp = statSync(INDEX_HTML).mtimeMs;
  if (stamp !== cachedStamp) {
    cachedStamp = stamp;
    cachedCsp = buildCsp();
  }
  return cachedCsp;
}

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Content-Security-Policy', currentCsp());
  next();
});

// ── API ──────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api', publicRouter);

/** Liveness probe — useful for a watchdog or a reverse proxy. */
app.get('/api/health', (_req, res) => {
  res.set('Cache-Control', 'no-store').json({
    ok: true,
    uptime: Math.round(process.uptime()),
    node: process.version,
    time: new Date().toISOString(),
  });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'این مسیر وجود ندارد.' }));

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
app.use((err, _req, res, _next) => {
  const status = err instanceof HttpError ? err.status : 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'خطای غیرمنتظره در سرور.' : err.message });
});

// ── robots.txt and sitemap.xml ───────────────────────────────────────────────
app.use(seoRouter);

// ── Uploaded media ───────────────────────────────────────────────────────────
// Names are random and content-addressed by upload time, so they never change.
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    index: false,
    dotfiles: 'deny',
    maxAge: '365d',
    immutable: true,
  }),
);

// ── Static client ────────────────────────────────────────────────────────────
if (existsSync(CLIENT_DIST)) {
  app.use(
    express.static(CLIENT_DIST, {
      index: false,
      etag: true,
      maxAge: 0,
      setHeaders(res, filePath) {
        // Vite fingerprints everything in /assets; fonts have stable names and content.
        if (filePath.includes('assets') || filePath.includes('fonts')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );

  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(INDEX_HTML);
  });
} else {
  app.get('*', (_req, res) =>
    res
      .status(503)
      .type('text/plain; charset=utf-8')
      .send('بخش فرانت‌اند هنوز ساخته نشده است. ابتدا «npm run build» را اجرا کنید.'),
  );
}

setInterval(purgeSessions, 60 * 60_000).unref();

const server = app.listen(PORT, HOST, () => {
  const shown = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`\n  وایب نمونه — سرور روی http://${shown}:${PORT} بالا آمد`);
  console.log('  برای بستن، در همین پنجره Ctrl+C بزنید.\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  پورت ${PORT} همین حالا در حال استفاده است.`);
    console.error('  یا نسخه‌ی دیگری از سایت باز است، یا برنامه‌ای دیگر این پورت را گرفته.');
    console.error('  با یک پورت دیگر اجرا کنید، مثلاً:  set PORT=4200 && npm start\n');
  } else {
    console.error(err);
  }
  process.exit(1);
});

/**
 * Close cleanly so SQLite folds its write-ahead log back into the .db file.
 * Without this the folder can be copied while a -wal file is still pending —
 * exactly what happens when someone pulls a USB drive out.
 */
let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`\n  در حال بستن امن (${signal})…`);
  server.close(() => {
    closeDatabase();
    console.log('  بسته شد. حالا می‌توانید پوشه را جابه‌جا کنید.\n');
    process.exit(0);
  });
  // Never hang on a stuck connection.
  setTimeout(() => {
    closeDatabase();
    process.exit(0);
  }, 4000).unref();
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
  process.on(signal, () => shutdown(signal));
}
