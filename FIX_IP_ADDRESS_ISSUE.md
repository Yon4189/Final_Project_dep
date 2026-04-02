# Fix IP Address Issue - Mobile App Using Old IP

## Problem
The mobile app is using the old IP address (10.161.161.31) instead of the current IP (192.168.1.5) even though the .env file has been updated.

## Root Cause
The environment variables are cached by Expo/Metro bundler. Simply updating the .env file doesn't reload the cached values.

---

## Solution

### Step 1: Stop the Development Server
Press `Ctrl+C` in the terminal where Expo is running to stop the server.

### Step 2: Clear All Caches
Run these commands in the mobile_app directory:

```bash
# Clear Expo cache
npx expo start -c

# OR if that doesn't work, clear everything:
rm -rf node_modules/.cache
rm -rf .expo
npx expo start -c
```

### Step 3: Clear Browser/App Cache

#### For Web (Browser):
1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
4. OR press `Ctrl+Shift+Delete` and clear all cached data

#### For Android Device:
1. Close the Expo Go app completely
2. Go to Settings > Apps > Expo Go
3. Clear Cache and Clear Data
4. Reopen Expo Go and scan QR code again

#### For iOS Device:
1. Close the Expo Go app completely
2. Delete and reinstall Expo Go app
3. Scan QR code again

### Step 4: Verify .env File
Make sure your `.env` file has the correct IP:

```env
EXPO_PUBLIC_API_IP=192.168.1.5
EXPO_PUBLIC_API_PORT=8000
EXPO_PUBLIC_API_URL=http://192.168.1.5:8000/api
```

### Step 5: Restart Development Server
```bash
npx expo start -c
```

---

## Quick Fix Commands

Run these commands in order:

```bash
# Navigate to mobile app directory
cd mobile_app

# Stop any running servers (Ctrl+C)

# Clear all caches
npx expo start -c
```

---

## Verify the Fix

After restarting, check the console output. You should see:
- API requests going to `http://192.168.1.5:8000/api`
- No more `ERR_CONNECTION_TIMED_OUT` errors
- Successful API responses

---

## Alternative: Force Environment Reload

If clearing cache doesn't work, try this:

### Option 1: Delete and Reinstall Dependencies
```bash
cd mobile_app
rm -rf node_modules
rm -rf .expo
npm install
npx expo start -c
```

### Option 2: Hardcode IP Temporarily
Edit `mobile_app/app/config/api.tsx`:

```typescript
const getApiBaseUrl = (): string => {
    // TEMPORARY: Hardcode the IP
    return 'http://192.168.1.5:8000/api';
    
    // ... rest of the code
};
```

Then restart:
```bash
npx expo start -c
```

---

## Why This Happens

1. **Environment Variable Caching**: Expo/Metro bundler caches environment variables for performance
2. **Network Change**: When you change networks, your IP changes but the cached value remains
3. **Browser Cache**: Web browsers also cache API endpoints

---

## Prevention

To avoid this in the future:

### Option 1: Use Localhost for Development
If you're testing on the same machine, use:
```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

### Option 2: Always Clear Cache After Network Change
After changing networks, always run:
```bash
npx expo start -c
```

### Option 3: Use Dynamic IP Detection
The app already has this feature! It automatically detects your IP from Expo's hostUri. Just remove the hardcoded IP from .env:

```env
# Comment out or remove these lines:
# EXPO_PUBLIC_API_IP=192.168.1.5
# EXPO_PUBLIC_API_URL=http://192.168.1.5:8000/api
```

Then the app will automatically use the correct IP from Expo.

---

## Troubleshooting

### Still seeing old IP?
1. Check if you have multiple .env files (.env.local, .env.development)
2. Check if the IP is hardcoded anywhere in the code
3. Try restarting your computer
4. Check if your backend server is actually running on the new IP

### Backend not accessible?
1. Make sure Laravel is running: `php artisan serve --host=192.168.1.5 --port=8000`
2. Check firewall settings
3. Verify both devices are on the same network
4. Try accessing the API directly in browser: `http://192.168.1.5:8000/api/test`

---

## Summary

The issue is caused by cached environment variables. The fix is simple:

1. Stop the server
2. Run `npx expo start -c` to clear cache
3. Clear browser/app cache
4. Restart and test

Your .env file already has the correct IP (192.168.1.5), so once the cache is cleared, everything should work!
