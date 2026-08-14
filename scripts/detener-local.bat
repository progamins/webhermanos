@echo off
chcp 65001 >nul 2>&1
REM ═══════════════════════════════════════════════════════════
REM  Maison Rosas — Detener entorno local (MySQL + API + Web)
REM  Mata la cadena COMPLETA del proyecto (cmd + node/vite/tsx/npm),
REM  no solo el listener del puerto (eso dejaba procesos huerfanos).
REM  No toca otros programas node (ej. Freebuff).
REM ═══════════════════════════════════════════════════════════
echo Deteniendo Web, API y MySQL...

REM 1) Node del proyecto (vite, tsx, API y wrappers npm)
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -match 'webhermanos|vite\.js|tsx.*cli\.mjs|npm-cli\.js.*run dev' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

REM 2) Ventanas cmd del proyecto (cierran las ventanas de log)
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='cmd.exe'\" | Where-Object { $_.CommandLine -match 'webhermanos|npm run dev|tsx watch|vite' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

REM 3) MySQL (puerto 3306)
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo Listo. Entorno detenido.
pause
