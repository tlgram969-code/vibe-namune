/**
 * Minimal in-memory fixed-window limiter. Enough for a single-process site;
 * swap for a shared store if this ever runs behind more than one instance.
 */
const buckets = new Map();

export function rateLimit({ windowMs, max, message }) {
  return (req, res, next) => {
    const key = `${req.baseUrl}${req.path}|${req.ip}`;
    const now = Date.now();
    const hit = buckets.get(key);

    if (!hit || hit.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (hit.count >= max) {
      const retryAfter = Math.ceil((hit.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message, retryAfter });
    }
    hit.count += 1;
    next();
  };
}

/** Drop expired buckets so the map cannot grow without bound. */
setInterval(() => {
  const now = Date.now();
  for (const [key, hit] of buckets) if (hit.resetAt <= now) buckets.delete(key);
}, 60_000).unref();
