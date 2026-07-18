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

echo =======================================
echo  Fix stray apps\admin dependency install
echo =======================================
echo.
echo This removes any node_modules/lockfile/.next that were
echo installed directly inside apps\admin (instead of at the
echo workspace root) and reinstalls cleanly from the root.
echo.

cd /d "%PROJECT_ROOT%"

if exist "apps\admin\node_modules" (
    echo Removing apps\admin\node_modules ...
    rmdir /s /q "apps\admin\node_modules"
) else (
    echo apps\admin\node_modules not present, skipping.
)

if exist "apps\admin\package-lock.json" (
    echo Removing apps\admin\package-lock.json ...
    del /f /q "apps\admin\package-lock.json"
) else (
    echo apps\admin\package-lock.json not present, skipping.
)

if exist "apps\admin\.next" (
    echo Removing apps\admin\.next build cache ...
    rmdir /s /q "apps\admin\.next"
) else (
    echo apps\admin\.next not present, skipping.
)

echo.
echo Installing dependencies from workspace root...
call npm install
if errorlevel 1 (
    echo.
    echo ERROR: npm install failed. Fix the error above and re-run this script.
    goto end
)

echo.
echo Building admin app to verify the fix...
cd /d "%PROJECT_ROOT%apps\admin"
call npm run build
if errorlevel 1 (
    echo.
    echo ERROR: admin build failed. See errors above.
    goto end
)

rem A production build (`next build`) writes chunk manifests that are
rem incompatible with `next dev`. Clear .next again so the next `npm run dev`
rem starts from a clean dev-mode cache instead of a mixed build/dev state
rem (mixing the two causes "options.factory ... Cannot read properties of
rem undefined (reading 'call')" errors in the browser).
echo.
echo Clearing production build cache so dev mode starts clean...
cd /d "%PROJECT_ROOT%"
if exist "apps\admin\.next" rmdir /s /q "apps\admin\.next"

echo.
echo =======================================
echo  Done! apps\admin builds cleanly.
echo  Start it with: scripts\run.bat start-admin
echo =======================================

:end
cd /d "%PROJECT_ROOT%"
pause
