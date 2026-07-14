@echo off
setlocal EnableDelayedExpansion

rem Specify the correct Node.js path to override the system shadow/dummy stubs
set NODE_PATH=C:\Program Files\nodejs
set PATH=%NODE_PATH%;%PATH%

rem Resolve project root based on the script location
if exist "%~dp0..\apps\api" (
    set "PROJECT_ROOT=%~dp0..\"
) else (
    set "PROJECT_ROOT=%~dp0"
)

if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="restart" goto restart

:menu
cls
echo =======================================
echo    IITJ1 Campus Companion App Manager
echo =======================================
echo [1] Start Backend and Frontend
echo [2] Stop Backend and Frontend
echo [3] Restart Services
echo [4] Exit
echo =======================================
set /p choice="Enter choice (1-4): "
if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto restart
if "%choice%"=="4" exit /b
goto menu

:start
echo.
echo Building shared type definitions (@iitj1/types)...
cd /d "%PROJECT_ROOT%" && npm run build -w @iitj1/types

echo Starting Backend API (Port 6002)...
start "IITJ1 Backend" cmd /k "set PATH=%NODE_PATH%;%%PATH%% && cd /d "%PROJECT_ROOT%apps\api" && npm run dev"
rem Wait 3 seconds
ping -n 4 127.0.0.1 >nul

echo Starting Frontend Expo (Port 6001)...
start "IITJ1 Frontend" cmd /k "set PATH=%NODE_PATH%;%%PATH%% && cd /d "%PROJECT_ROOT%apps\mobile" && npm start"
echo.
echo Services spawned in new windows!
goto end

:stop
echo.
echo Stopping services...
rem Stop Port 6002 (API)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :6002 ^| findstr LISTENING') do (
    echo Found process %%a on port 6002. Terminating...
    taskkill /F /PID %%a >nul 2>&1
)
rem Stop Port 6001 (Expo)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :6001 ^| findstr LISTENING') do (
    echo Found process %%a on port 6001. Terminating...
    taskkill /F /PID %%a >nul 2>&1
)
echo.
echo Services stopped!
goto end

:restart
call :stop
ping -n 3 127.0.0.1 >nul
call :start
goto end

:end
echo.
echo Done.

