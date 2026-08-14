@echo off
chcp 65001 >nul 2>&1
REM ═══════════════════════════════════════════════════════════
REM  Maison Rosas — Iniciar entorno local (MySQL + API + Web)
REM ═══════════════════════════════════════════════════════════
set "MYSQL_DIR=C:\Users\edwin\Downloads\mysql-8.4.9-winx64"
set "DATA_DIR=C:\Users\edwin\Downloads\mysql-data"
set "PROYECTO=C:\Users\edwin\Downloads\webhermanos-maison-rosas\webhermanos"

REM 1) MySQL (puerto 3306)
netstat -an | findstr /C:":3306" | findstr /C:"LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [1/3] Iniciando MySQL...
    start "MaisonRosas MySQL" /min "%MYSQL_DIR%\bin\mysqld.exe" --no-defaults --basedir="%MYSQL_DIR%" --datadir="%DATA_DIR%" --bind-address=127.0.0.1 --port=3306 --log-error="%DATA_DIR%\mysqld.log"
) else (
    echo [1/3] MySQL ya estaba en ejecucion.
)

REM 2) API Express (puerto 3000)
netstat -an | findstr /C:":3000" | findstr /C:"LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [2/3] Iniciando API en :3000...
    start "MaisonRosas API" cmd /k "cd /d %PROYECTO% && npm run dev:server"
) else (
    echo [2/3] API ya estaba en ejecucion.
)

REM 3) Cliente Vite (puerto 5173)
netstat -an | findstr /C:":5173" | findstr /C:"LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [3/3] Iniciando tienda web en :5173...
    start "MaisonRosas Web" cmd /k "cd /d %PROYECTO% && npm run dev:client"
) else (
    echo [3/3] Cliente ya estaba en ejecucion.
)

echo.
echo  ════════════════════════════════════════════
echo   Maison Rosas listo:
echo   Tienda: http://localhost:5173
echo   Admin:  http://localhost:5173/admin.html
echo   API:    http://localhost:3000/api/health
echo  ════════════════════════════════════════════
start http://localhost:5173
pause
