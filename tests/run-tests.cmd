@echo off
setlocal
cd /d "%~dp0.."
if not exist node_modules\jsdom (
  call npm ci
  if errorlevel 1 exit /b 1
)
call npm test
set "test_exit=%errorlevel%"
echo.
echo Reports: tests\reports\LATEST.md and tests\reports\latest.tap
pause
exit /b %test_exit%
