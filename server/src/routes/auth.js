import { Router } from 'express';
import { db, getSettings } from '../db.js';
import {
  SESSION_COOKIE,
  createSession,
  destroySession,
  sessionCookieOptions,
  userForToken,
  verifyPassword,
  hashPassword,
} from '../auth.js';
import { str, bad } from '../validate.js';
import { rateLimit } from '../rate-limit.js';

export const authRouter = Router();

const publicUser = (u) => ({ id: u.id, username: u.username, name: u.name, role: u.role });

/** Issues the session cookie and returns the signed-in user. */
function signIn(res, user) {
  const { token, expiresAt } = createSession(db, user.id);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res.json({ user: publicUser(user) });
}

authRouter.post(
  '/login',
  rateLimit({ windowMs: 10 * 60_000, max: 10, message: 'تلاش‌های ناموفق زیاد بود. ده دقیقه دیگر دوباره تلاش کنید.' }),
  (req, res, next) => {
    try {
      const username = str(req.body?.username, 'نام کاربری', { min: 2, max: 60 });
      const password = str(req.body?.password, 'گذرواژه', { min: 4, max: 200 });

      // Usernames are compared without case so "mahdi" and "Mahdi" are one account.
      const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
      // Same message either way: never reveal whether the username exists.
      if (!user || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: 'نام کاربری یا گذرواژه درست نیست.' });
      }

      return signIn(res, user);
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/register',
  rateLimit({ windowMs: 60 * 60_000, max: 8, message: 'تعداد ثبت‌نام‌ها از این دستگاه زیاد بود. کمی بعد تلاش کنید.' }),
  (req, res, next) => {
    try {
      if (getSettings().registration_enabled !== '1') {
        throw bad('ثبت‌نام در حال حاضر بسته است.');
      }

      const username = str(req.body?.username, 'نام کاربری', { min: 3, max: 40 });
      if (!/^[A-Za-z0-9._؀-ۿ-]+$/.test(username)) {
        throw bad('نام کاربری فقط می‌تواند حرف، رقم، نقطه، خط تیره و زیرخط داشته باشد.');
      }
      const name = str(req.body?.name, 'نام نمایشی', { min: 2, max: 60, required: false }) || username;
      const password = str(req.body?.password, 'گذرواژه', { min: 8, max: 200 });

      if (db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username)) {
        throw bad('این نام کاربری قبلاً گرفته شده است.');
      }

      const info = db
        .prepare("INSERT INTO users (username, name, password_hash, role, created_at) VALUES (?, ?, ?, 'member', datetime('now'))")
        .run(username, name, hashPassword(password));

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(info.lastInsertRowid));
      return signIn(res, user);
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post('/logout', (req, res) => {
  destroySession(db, req.cookies?.[SESSION_COOKIE]);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

authRouter.get('/me', (req, res) => {
  const user = userForToken(db, req.cookies?.[SESSION_COOKIE]);
  res.json({ user: user ? publicUser(user) : null });
});

authRouter.put('/password', (req, res, next) => {
  try {
    const user = userForToken(db, req.cookies?.[SESSION_COOKIE]);
    if (!user) return res.status(401).json({ error: 'برای این کار باید وارد حساب شوید.' });

    const current = str(req.body?.current, 'گذرواژه فعلی', { min: 4, max: 200 });
    const next_ = str(req.body?.next, 'گذرواژه جدید', { min: 8, max: 200 });

    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id);
    if (!verifyPassword(current, row.password_hash)) {
      return res.status(400).json({ error: 'گذرواژه فعلی درست نیست.' });
    }

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next_), user.id);
    // Invalidate every other session so a leaked one cannot outlive the change.
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    const { token, expiresAt } = createSession(db, user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
