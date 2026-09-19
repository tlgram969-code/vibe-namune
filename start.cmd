@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0"
title VibeNamune

echo.
echo   ==========================================
echo     VibeNamune  /  VAYB NAMUNE
echo   ==========================================
echo.

rem ── 1. Is Node.js here at all? ───────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
  echo   [X] Node.js پیدا نشد.
  echo.
  echo       این سایت برای اجرا به Node.js نیاز دارد.
  echo       از nodejs.org نسخه LTS را نصب کنید, سپس دوباره همین فایل را اجرا کنید.
  echo.
  pause
  exit /b 1
)

rem ── 2. Is it new enough for the built-in SQLite module? ──────────────────────
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set MAJOR=%%v
for /f "tokens=2 delims=." %%v in ('node -p "process.versions.node"') do set MINOR=%%v
set TOO_OLD=0
if !MAJOR! LSS 22 set TOO_OLD=1
if !MAJOR! EQU 22 if !MINOR! LSS 5 set TOO_OLD=1
if "!TOO_OLD!"=="1" (
  for /f %%v in ('node -p "process.version"') do set FOUND=%%v
  echo   [X] نسخه Node شما !FOUND! است و قدیمی است.
  echo.
  echo       حداقل نسخه لازم: v22.5
  echo       از nodejs.org نسخه LTS را نصب کنید, سپس دوباره اجرا کنید.
  echo.
  pause
  exit /b 1
)

rem ── 3. Everything already packaged? Then just run — no npm, no internet. ─────
set READY=1
if not exist "server\node_modules\express\package.json" set READY=0
if not exist "client\dist\index.html" set READY=0

if "!READY!"=="1" goto :run

rem ── 4. Otherwise build it once (needs internet the first time only). ────────
echo   اولین اجرا روی این کامپیوتر. آماده‌سازی...
echo.
if not exist "server\node_modules\express\package.json" (
  echo   - نصب وابستگی‌ها
  call npm run install:all
  if errorlevel 1 goto :buildfail
)
if not exist "client\dist\index.html" (
  echo   - ساخت نسخه نهایی
  call npm run build
  if errorlevel 1 goto :buildfail
)
echo.

:run
echo   سایت روی نشانی زیر باز می‌شود:
echo.
echo       http://localhost:4173
echo.
echo   برای بستن سایت, در همین پنجره Ctrl+C بزنید.
echo   ------------------------------------------
echo.
start "" http://localhost:4173
node server\src\index.js
echo.
echo   سرور بسته شد.
pause
exit /b 0

:buildfail
echo.
echo   [X] آماده‌سازی ناتمام ماند.
echo       برای اولین اجرا روی یک کامپیوتر تازه, اینترنت لازم است.
echo       اگر اینترنت وصل است و باز هم خطا داد, پیام بالا را بخوانید.
echo.
pause
exit /b 1
