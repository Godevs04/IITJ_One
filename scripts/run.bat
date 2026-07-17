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
if "%1"=="start-api" goto startapi
if "%1"=="start-mobile" goto startmobile
if "%1"=="start-admin" goto startadmin
if "%1"=="start-web" goto startweb
if "%1"=="stop" goto stop
if "%1"=="restart" goto restart
if "%1"=="health" goto health_check

:menu
cls
echo =======================================
echo    IITJ1 Campus Companion App Manager
echo =======================================
echo [1] Start All 4 Services
echo [2] Start API Only (Port 6002)
echo [3] Start Mobile Only (Port 6001)
echo [4] Start Admin Only (Port 3000)
echo [5] Start Website Only (Port 3002)
echo [6] Stop All Services
echo [7] Restart Services
echo [8] API Health Check
echo [9] Exit
echo =======================================
set /p choice="Enter choice (1-9): "
if "%choice%"=="1" goto start
if "%choice%"=="2" goto startapi
if "%choice%"=="3" goto startmobile
if "%choice%"=="4" goto startadmin
if "%choice%"=="5" goto startweb
if "%choice%"=="6" goto stop
if "%choice%"=="7" goto restart
if "%choice%"=="8" goto health_check
if "%choice%"=="9" exit /b
goto menu

:start
echo.
echo Building shared type definitions (@iitj1/types)...
cd /d "%PROJECT_ROOT%" && call npm run build -w @iitj1/types

echo Starting Admin Dashboard (Port 3000) first...
start "IITJ1 Admin" cmd /k "set PATH=%NODE_PATH%;%%PATH%% && cd /d "%PROJECT_ROOT%apps\admin" && npm run dev"
rem Wait 8 seconds for Next.js to write routes-manifest.json before Metro starts
echo Waiting for Next.js to initialise (8s)...
ping -n 9 127.0.0.1 >nul

echo Starting Backend API (Port 6002)...
start "IITJ1 Backend" cmd /k "set PATH=%NODE_PATH%;%%PATH%% && cd /d "%PROJECT_ROOT%apps\api" && npm run dev"
rem Wait 3 seconds for the API to come up
ping -n 4 127.0.0.1 >nul

echo Starting Website (Port 3002)...
start "IITJ1 Website" cmd /k "set PATH=%NODE_PATH%;%%PATH%% && cd /d "%PROJECT_ROOT%apps\web" && npm run dev"
rem Wait 2 seconds
ping -n 3 127.0.0.1 >nul

echo Starting Frontend Expo (Port 6001)...
start "IITJ1 Frontend" cmd /k "set PATH=%NODE_PATH%;%%PATH%% && cd /d "%PROJECT_ROOT%apps\mobile" && npm start"
echo.
echo All 4 services spawned in new windows!
goto end

:startapi
echo.
echo Building shared type definitions (@iitj1/types)...
cd /d "%PROJECT_ROOT%" && call npm run build -w @iitj1/types
echo Starting Backend API (Port 6002)...
start "IITJ1 Backend" cmd /k "set PATH=%NODE_PATH%;%%PATH%% && cd /d "%PROJECT_ROOT%apps\api" && npm run dev"
goto end

:startmobile
echo.
echo Building shared type definitions (@iitj1/types)...
cd /d "%PROJECT_ROOT%" && call npm run build -w @iitj1/types
echo Starting Frontend Expo (Port 6001)...
start "IITJ1 Frontend" cmd /k "set PATH=%NODE_PATH%;%%PATH%% && cd /d "%PROJECT_ROOT%apps\mobile" && npm start"
goto end

:startadmin
echo.
echo Building shared type definitions (@iitj1/types)...
cd /d "%PROJECT_ROOT%" && call npm run build -w @iitj1/types
echo Starting Admin Dashboard (Port 3000)...
start "IITJ1 Admin" cmd /k "set PATH=%NODE_PATH%;%%PATH%% && cd /d "%PROJECT_ROOT%apps\admin" && npm run dev"
goto end

:startweb
echo.
echo Building shared type definitions (@iitj1/types)...
cd /d "%PROJECT_ROOT%" && call npm run build -w @iitj1/types
echo Starting Website (Port 3002)...
start "IITJ1 Website" cmd /k "set PATH=%NODE_PATH%;%%PATH%% && cd /d "%PROJECT_ROOT%apps\web" && npm run dev"
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
rem Stop Port 3000 (Admin)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Found process %%a on port 3000. Terminating...
    taskkill /F /PID %%a >nul 2>&1
)
rem Stop Port 3002 (Web)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3002 ^| findstr LISTENING') do (
    echo Found process %%a on port 3002. Terminating...
    taskkill /F /PID %%a >nul 2>&1
)
echo.
echo All services stopped!
goto end

:restart
call :stop
ping -n 3 127.0.0.1 >nul
goto start
goto end

:health_check
echo.
echo Checking API health at http://localhost:6002/api/v1/health ...
echo.
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:6002/api/v1/health' -UseBasicParsing -TimeoutSec 5; Write-Host 'HTTP Status:' $r.StatusCode; $r.Content | ConvertFrom-Json | Format-List } catch { Write-Host 'ERROR: API is not reachable -' $_.Exception.Message }"
echo.
pause
goto menu

:end
echo.
echo Done.

