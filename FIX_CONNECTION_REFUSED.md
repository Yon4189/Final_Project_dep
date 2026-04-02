# Fix ERR_CONNECTION_REFUSED Error

## Problem
Getting `ERR_CONNECTION_REFUSED` when trying to access `http://192.168.1.5:8000/api`

This means the backend server is either:
1. Not running
2. Not listening on the correct IP/port
3. Blocked by firewall

---

## Solution

### Step 1: Check if Backend is Running

Open a new terminal and run:
```bash
curl http://192.168.1.5:8000/api/health
```

If you get an error, the backend is not running.

### Step 2: Start the Backend Server

#### Option A: Use START_HERE.bat (Recommended)
Double-click `START_HERE.bat` in the project root. This will:
- Start Laravel on `0.0.0.0:8000` (accessible from all network interfaces)
- Start Reverb WebSocket server
- Start Expo mobile app

#### Option B: Manual Start
Open a terminal in the backend directory:
```bash
cd backend
php artisan serve --host=0.0.0.0 --port=8000
```

IMPORTANT: Use `--host=0.0.0.0` NOT `--host=192.168.1.5`
- `0.0.0.0` means "listen on all network interfaces"
- This allows access from localhost, 192.168.1.5, and other devices

### Step 3: Verify Backend is Accessible

Test from your browser:
```
http://192.168.1.5:8000/api/health
```

You should see a JSON response like:
```json
{
  "status": "ok",
  "message": "API is running"
}
```

### Step 4: Check Firewall

If the backend is running but still getting connection refused:

#### Windows Firewall:
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Find "php.exe" or add it
4. Make sure both Private and Public are checked

#### Quick Test - Temporarily Disable Firewall:
```bash
# Run as Administrator
netsh advfirewall set allprofiles state off
```

Test if it works, then re-enable:
```bash
netsh advfirewall set allprofiles state on
```

If it works with firewall off, you need to add a firewall rule:
```bash
# Run as Administrator
netsh advfirewall firewall add rule name="Laravel Dev Server" dir=in action=allow protocol=TCP localport=8000
```

---

## Common Issues

### Issue 1: Port Already in Use
Error: `Address already in use`

Solution:
```bash
# Find what's using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use a different port
php artisan serve --host=0.0.0.0 --port=8001
```

### Issue 2: Wrong IP Address
Make sure you're using the correct IP:

```bash
# Check your current IP
ipconfig
```

Look for "IPv4 Address" under your active network adapter (usually WiFi or Ethernet).

Update `.env` file if IP changed:
```env
EXPO_PUBLIC_API_IP=YOUR_CURRENT_IP
EXPO_PUBLIC_API_URL=http://YOUR_CURRENT_IP:8000/api
```

### Issue 3: Backend Running on Wrong Host
If you started Laravel with:
```bash
php artisan serve  # Wrong - only accessible from localhost
```

Stop it and restart with:
```bash
php artisan serve --host=0.0.0.0 --port=8000  # Correct
```

### Issue 4: Different Network
Make sure your PC and phone/browser are on the SAME WiFi network.

---

## Quick Diagnostic Commands

Run these to diagnose the issue:

### 1. Check if Laravel is running:
```bash
curl http://localhost:8000/api/health
curl http://192.168.1.5:8000/api/health
```

### 2. Check what's listening on port 8000:
```bash
netstat -ano | findstr :8000
```

### 3. Check your IP address:
```bash
ipconfig | findstr IPv4
```

### 4. Test from another device:
On your phone browser, go to:
```
http://192.168.1.5:8000/api/health
```

---

## Step-by-Step Fix

### 1. Stop Everything
- Close all terminal windows
- Stop any running PHP processes

### 2. Check Your IP
```bash
ipconfig
```
Note your IPv4 address (e.g., 192.168.1.5)

### 3. Update .env File
Edit `mobile_app/.env`:
```env
EXPO_PUBLIC_API_IP=192.168.1.5
EXPO_PUBLIC_API_PORT=8000
EXPO_PUBLIC_API_URL=http://192.168.1.5:8000/api
```

### 4. Start Backend
```bash
cd backend
php artisan serve --host=0.0.0.0 --port=8000
```

You should see:
```
Laravel development server started: http://0.0.0.0:8000
```

### 5. Test Backend
Open browser and go to:
```
http://192.168.1.5:8000/api/health
```

### 6. Start Mobile App
```bash
cd mobile_app
npx expo start -c
```

### 7. Test in Browser
Open the Expo web app and check console for API calls.

---

## Alternative: Use Localhost for Web Testing

If you're testing on the same PC (web browser), you can use localhost:

Edit `mobile_app/app/config/api.tsx`:
```typescript
const getApiBaseUrl = (): string => {
    // For web testing on same PC
    if (Platform.OS === 'web') {
        return 'http://localhost:8000/api';
    }
    
    // For mobile devices
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }
    
    // ... rest of code
};
```

This way:
- Web browser uses `localhost:8000`
- Mobile devices use `192.168.1.5:8000`

---

## Verify Everything is Working

### 1. Backend Health Check:
```bash
curl http://192.168.1.5:8000/api/health
```
Expected: `{"status":"ok"}`

### 2. Categories Endpoint:
```bash
curl http://192.168.1.5:8000/api/categories
```
Expected: JSON with categories data

### 3. Stats Endpoint:
```bash
curl http://192.168.1.5:8000/api/public/stats
```
Expected: JSON with stats data

---

## Summary

The `ERR_CONNECTION_REFUSED` error means the backend is not accessible. To fix:

1. Make sure Laravel is running with `--host=0.0.0.0`
2. Check firewall settings
3. Verify you're using the correct IP address
4. Test the backend directly in browser
5. Make sure devices are on same network

Most common fix:
```bash
cd backend
php artisan serve --host=0.0.0.0 --port=8000
```

Then test:
```
http://192.168.1.5:8000/api/health
```
