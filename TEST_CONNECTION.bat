@echo off
color 0B
echo ========================================
echo   TESTING BACKEND CONNECTION
echo ========================================
echo.

echo Testing if Laravel is running...
curl -s http://192.168.1.5:8000/api/health
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Cannot connect to Laravel!
    echo Make sure you ran START_HERE.bat first
    echo.
    pause
    exit /b 1
)

echo.
echo.
echo SUCCESS! Backend is running correctly.
echo.
echo Testing database connection...
cd backend
php artisan db:show
echo.

echo ========================================
echo   CONNECTION TEST COMPLETE
echo ========================================
echo.
echo If you see database info above, everything is working!
echo.
echo Now you can:
echo 1. Open Expo Go on your phone
echo 2. Scan the QR code from the Expo terminal
echo 3. Your app should fetch data successfully
echo.
pause
