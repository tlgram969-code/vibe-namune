import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
export const SESSION_COOKIE = 'vn_session';

/** `scrypt$N$r$p$salt$key`, all hex. */
export function hashPassword(plain) {
  const salt = randomBytes(16);
  const key = scryptSync(plain, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('hex'), key.toString('hex')].join('$');
}

export function verifyPassword(plain, stored) {
  try {
    const [scheme, N, r, p, saltHex, keyHex] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const key = Buffer.from(keyHex, 'hex');
    const test = scryptSync(plain, Buffer.from(saltHex, 'hex'), key.length, {
      N: Number(N), r: Number(r), p: Number(p),
    });
    return timingSafeEqual(key, test);
  } catch {
    return false;
  }
}

export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export function createSession(db, userId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), userId, expiresAt);
  return { token, expiresAt };
}

export function destroySession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function userForToken(db, token) {
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.id, u.username, u.name, u.role, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?`).get(hashToken(token));
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    destroySession(db, token);
    return null;
  }
  return { id: row.id, username: row.username, name: row.name, role: row.role };
}

export function sessionCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.VN_HTTPS === '1',
    path: '/',
    expires: new Date(expiresAt),
  };
}

/** Rejects unauthenticated requests with 401. */
export function requireAuth(db) {
  return (req, res, next) => {
    const user = userForToken(db, req.cookies?.[SESSION_COOKIE]);
    if (!user) return res.status(401).json({ error: 'برای این کار باید وارد حساب شوید.' });
    req.user = user;
    next();
  };
}

/**
 * Guards the whole panel. Members get the same 404 an unknown path would give,
 * so nothing advertises that an admin area exists.
 */
export function requireAdmin(db) {
  return (req, res, next) => {
    const user = userForToken(db, req.cookies?.[SESSION_COOKIE]);
    if (!user || user.role !== 'admin') {
      return res.status(404).json({ error: 'این مسیر وجود ندارد.' });
    }
    req.user = user;
    next();
  };
}
