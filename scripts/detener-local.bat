@echo off
chcp 65001 >nul 2>&1
REM ═══════════════════════════════════════════════════════════
REM  Maison Rosas — Detener entorno local (MySQL + API + Web)
REM  Solo mata los procesos que escuchan en 3306 / 3000 / 5173
REM ═══════════════════════════════════════════════════════════
echo Deteniendo MySQL (3306), API (3000) y Web (5173)...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3306,3000,5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"
echo Listo. Entorno detenido.
pause
