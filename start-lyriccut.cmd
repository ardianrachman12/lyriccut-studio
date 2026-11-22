@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem npm run local serves Vite on 5173 (the "local" script does not set --port).
rem Fallback to 3000 in case the app was started with "npm run dev" instead.
set "PRIMARY=http://localhost:5173"
set "FALLBACK=http://localhost:3000"

rem --- Already running? Just open the browser. ---
powershell -NoProfile -Command "try { $null = Invoke-WebRequest -UseBasicParsing -Uri '%PRIMARY%' -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
  start "" "%PRIMARY%"
  exit /b 0
)
powershell -NoProfile -Command "try { $null = Invoke-WebRequest -UseBasicParsing -Uri '%FALLBACK%' -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
  start "" "%FALLBACK%"
  exit /b 0
)

rem --- Start the backend + frontend in their own window (close it to stop). ---
echo Menjalankan LyricCut Studio...
start "LyricCut Studio - Server" /d "%~dp0" cmd /k "npm run local"

rem --- Wait until the dev server answers, then open the browser. ---
powershell -NoProfile -ExecutionPolicy Bypass -Command "$urls=@('%PRIMARY%','%FALLBACK%'); for ($i=0; $i -lt 120; $i++) { foreach ($u in $urls) { try { $null = Invoke-WebRequest -UseBasicParsing -Uri $u -TimeoutSec 1; Start-Process $u; exit 0 } catch {} }; Start-Sleep -Milliseconds 500 }; exit 1"

if errorlevel 1 (
  echo.
  echo Server belum siap setelah 60 detik.
  echo Cek jendela "LyricCut Studio - Server" untuk pesan error.
  echo.
  pause
)
