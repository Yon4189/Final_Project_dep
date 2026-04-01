@echo off
color 0E
echo ========================================
echo   CONFIGURATION CHECK
echo ========================================
echo.

echo [1/5] Checking your IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%a
    goto :found_ip
)
:found_ip
set IP=%IP:~1%
echo Your IP: %IP%
echo.

echo [2/5] Checking mobile_app/.env configuration...
findstr "EXPO_PUBLIC_API_IP" mobile_app\.env
findstr "EXPO_PUBLIC_REVERB_HOST" mobile_app\.env
echo.

echo [3/5] Checking backend/.env configuration...
findstr "BROADCAST_CONNECTION" backend\.env
findstr "REVERB_APP_KEY" backend\.env
echo.

echo [4/5] Checking if Laravel can start...
cd backend
php artisan --version
if %errorlevel% neq 0 (
    echo ERROR: Laravel not working!
    pause
    exit /b 1
)
echo.

echo [5/5] Checking database connection...
php artisan db:show --database=mysql
echo.

echo ========================================
echo   CONFIGURATION CHECK COMPLETE
echo ========================================
echo.
echo IMPORTANT: Make sure mobile_app/.env has:
echo   EXPO_PUBLIC_API_IP=%IP%
echo   EXPO_PUBLIC_REVERB_HOST=%IP%
echo.
echo If IPs don't match, update mobile_app/.env
echo.
pause
