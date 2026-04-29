@echo off
echo ========================================
echo Starting Expo for Mobile App
echo ========================================
echo.
echo Clearing cache and starting Expo...
echo.
cd /d "%~dp0"
call npx expo start --clear
pause
