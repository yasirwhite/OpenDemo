@echo off
echo Running Flow Executor Integration...
echo.

cd /d "%~dp0.."

node scripts\integrate-flow-executor.js

if %errorlevel% neq 0 (
    echo.
    echo Script failed. Check the output above for details.
    pause
    exit /b %errorlevel%
)

echo.
pause
