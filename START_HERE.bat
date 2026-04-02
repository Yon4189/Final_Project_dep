@echo off
color 0A
echo ========================================
echo   MOBILE APP BACKEND STARTUP
echo ========================================
echo.
echo Your Computer IP: 192.168.1.5
echo.
echo Starting services...
echo.

REM Start Laravel API on all network interfaces
echo [1/3] Starting Laravel API Server...
start "Laravel API" cmd /k "cd backend && php artisan serve --host=0.0.0.0 --port=8000"
timeout /t 3 /nobreak >nul

REM Start Reverb WebSocket Server
echo [2/3] Starting Reverb WebSocket Server...
start "Reverb WebSocket" cmd /k "cd backend && php artisan reverb:start"
timeout /t 3 /nobreak >nul

REM Start Expo Mobile App
echo [3/3] Starting Expo Mobile App...
start "Expo Mobile" cmd /k "cd mobile_app && npx expo start"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   ALL SERVICES STARTED!
echo ========================================
echo.
echo Backend API: http://192.168.1.5:8000
echo WebSocket: ws://192.168.1.5:8080
echo.
echo NEXT STEPS:
echo 1. Wait for Expo to show QR code
echo 2. Open Expo Go app on your phone
echo 3. Scan the QR code
echo 4. Make sure phone is on same WiFi
echo.
echo Press any key to close this window...
pause >nul
