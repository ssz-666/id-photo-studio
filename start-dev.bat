@echo off
setlocal
title ID Photo Studio - Dev Server

cd /d "%~dp0"

echo ========================================
echo  ID Photo Studio - Dev Server
echo ========================================
echo Project path:
echo %cd%
echo.

if not exist "package.json" (
  echo ERROR: package.json was not found.
  echo Please put this bat file in the project root folder.
  goto END
)

call npm --version >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm was not found.
  echo Please install Node.js LTS first:
  echo https://nodejs.org/
  goto END
)

for /f "delims=" %%v in ('npm --version') do set NPM_VERSION=%%v
echo npm version: %NPM_VERSION%
echo.

if not exist "node_modules" (
  echo node_modules was not found.
  echo Running npm install first...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: npm install failed.
    echo Please check your network or npm config, then try again.
    goto END
  )
  echo.
)

echo Starting Vite dev server...
echo Open the Local URL shown below, usually:
echo http://localhost:5173
echo.
echo To stop the server: press Ctrl + C, then type Y.
echo.

call npm run dev

echo.
echo Dev server exited. Exit code: %errorlevel%

:END
echo.
echo Press any key to close this window...
pause >nul
endlocal
