@echo off
chcp 65001 >nul 2>&1
REM ═══════════════════════════════════════════════════════════
REM  Maison Rosas — Iniciar entorno local (MySQL + API + Web)
REM  Vite y la API se arrancan con node DIRECTO (sin anidar npm):
REM  cada servicio usa 1-2 procesos, no se acumulan instancias.
REM ═══════════════════════════════════════════════════════════
set "MYSQL_DIR=C:\Users\edwin\Downloads\mysql-8.4.9-winx64"
set "DATA_DIR=C:\Users\edwin\Downloads\mysql-data"
set "PROYECTO=C:\Users\edwin\Downloads\webhermanos-maison-rosas\webhermanos"

REM 0) Limpiar instancias viejas del proyecto (node + cmd, SIN tocar MySQL
REM    ni otros programas node como Freebuff)
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -match 'webhermanos|vite\.js|tsx.*cli\.mjs|npm-cli\.js.*run dev' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='cmd.exe'\" | Where-Object { $_.CommandLine -match 'webhermanos|npm run dev|tsx watch|vite' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

REM 1) MySQL (puerto 3306)
netstat -an | findstr /C:":3306" | findstr /C:"LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [1/3] Iniciando MySQL...
    start "MaisonRosas MySQL" /min "%MYSQL_DIR%\bin\mysqld.exe" --no-defaults --basedir="%MYSQL_DIR%" --datadir="%DATA_DIR%" --bind-address=127.0.0.1 --port=3306 --log-error="%DATA_DIR%\mysqld.log"
) else (
    echo [1/3] MySQL ya estaba en ejecucion.
)

REM 2) API Express (puerto 3000) — node directo, sin npm
netstat -an | findstr /C:":3000" | findstr /C:"LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [2/3] Iniciando API en :3000...
    start "MaisonRosas API" /min cmd /k "cd /d %PROYECTO%\server && node ..\node_modules\tsx\dist\cli.mjs watch src/index.ts"
) else (
    echo [2/3] API ya estaba en ejecucion.
)

REM 3) Cliente Vite (puerto 5173) — node directo, sin npm
netstat -an | findstr /C:":5173" | findstr /C:"LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [3/3] Iniciando tienda web en :5173...
    start "MaisonRosas Web" /min cmd /k "cd /d %PROYECTO%\client && node ..\node_modules\vite\bin\vite.js"
) else (
    echo [3/3] Cliente ya estaba en ejecucion.
)

echo.
echo  ════════════════════════════════════════════════
echo   Maison Rosas listo:
echo   Tienda: http://localhost:5173
echo   Admin:  http://localhost:5173/admin.html
echo   API:    http://localhost:3000/api/health
echo  ════════════════════════════════════════════════
start http://localhost:5173
pause
