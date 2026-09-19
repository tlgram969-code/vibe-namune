/**
 * Builds a clean, ready-to-run copy of the site for a USB stick.
 *
 *   npm run package              → creates "VibeNamune-Portable" next to this folder
 *   npm run package -- D:\Site   → creates it at that path instead
 *
 * The copy contains everything needed to RUN (built client, server, its two
 * dependencies, the database). It leaves out client/node_modules, which is only
 * needed to rebuild the front-end and is ~95% of the weight.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(process.argv[2] || join(root, '..', 'VibeNamune-Portable'));

const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

function fail(message) {
  console.error(`\n${RED}  ${message}${OFF}\n`);
  process.exit(1);
}

if (target === root) fail('مقصد نمی‌تواند خود همین پوشه باشد.');
if (!existsSync(join(root, 'client', 'dist', 'index.html'))) {
  fail('ابتدا «npm run build» را اجرا کنید تا نسخه‌ی نهایی ساخته شود.');
}
if (!existsSync(join(root, 'server', 'node_modules', 'express'))) {
  fail('ابتدا «npm run install:all» را اجرا کنید تا وابستگی‌های سرور نصب شوند.');
}

/** Everything the site needs in order to run, plus the source for later edits. */
const INCLUDE = [
  'package.json',
  'start.cmd',
  'README.md',
  'server',          // src, package.json, node_modules, data
  'scripts',
  'client/package.json',
  'client/index.html',
  'client/vite.config.ts',
  'client/tsconfig.json',
  'client/src',
  'client/public',
  'client/dist',     // the built site — this is what actually gets served
];

/*
 * client/node_modules is simply absent from INCLUDE, so it is never copied.
 * server/node_modules IS copied — those few packages are what the site runs on.
 * Only build caches and stray SQLite journals get filtered out here.
 */
const SKIP_NAMES = new Set(['.git', '.vite', '.DS_Store']);
const isJunk = (name) => SKIP_NAMES.has(name) || /\.db-(wal|shm|journal)$/.test(name);

function sizeOf(path) {
  if (!existsSync(path)) return 0;
  if (statSync(path).isFile()) return statSync(path).size;
  let total = 0;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    total += sizeOf(join(path, entry.name));
  }
  return total;
}

console.log(`\n  ساخت نسخه‌ی قابل‌حمل در:\n  ${DIM}${target}${OFF}\n`);

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
  console.log('  - پوشه‌ی قبلی پاک شد');
}
mkdirSync(target, { recursive: true });

let copied = 0;
for (const item of INCLUDE) {
  const from = join(root, item);
  if (!existsSync(from)) continue;

  cpSync(from, join(target, item), {
    recursive: true,
    filter: (src) => !src.split(/[\\/]/).some(isJunk),
  });

  const bytes = sizeOf(join(target, item));
  copied += bytes;
  console.log(`  - ${item.padEnd(24)} ${(bytes / 1048576).toFixed(2)} MB`);
}

// A plain-text note next to the launcher, for whoever plugs the stick in.
writeFileSync(
  join(target, 'بخوانید.txt'),
  [
    'وایب نمونه — نسخه‌ی قابل‌حمل',
    '================================',
    '',
    'اجرا:',
    '  فایل start.cmd را دوبار کلیک کنید. مرورگر خودش باز می‌شود.',
    '',
    'پیش‌نیاز:',
    '  فقط Node.js نسخه ۲۲.۵ یا بالاتر روی همان کامپیوتر نصب باشد.',
    '  اگر نصب نباشد، start.cmd پیام می‌دهد و نشانی دانلود را نشان می‌دهد.',
    '',
    'ورود به پنل مدیریت:',
    '  در سایت به /account بروید و با حساب مدیر وارد شوید.',
    '  هیچ لینکی به پنل در سایت دیده نمی‌شود؛ این عمدی است.',
    '',
    'نکته‌ی مهم:',
    '  برای بستن سایت در پنجره‌ی مشکی Ctrl+C بزنید و بعد فلش را جدا کنید.',
    '  تمام محتوای سایت در فایل server/data/vibenamune.db است؛',
    '  اگر از آن نسخه‌ی پشتیبان بگیرید، همه چیز را نگه داشته‌اید.',
    '',
  ].join('\r\n'),
  'utf8',
);

console.log(`\n  ${'─'.repeat(46)}`);
console.log(`  حجم کل: ${(copied / 1048576).toFixed(2)} MB`);
console.log('\n  این پوشه را روی فلش کپی کنید و روی کامپیوتر دیگر');
console.log('  فایل start.cmd را اجرا کنید.\n');
