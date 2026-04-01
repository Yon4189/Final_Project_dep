# Mobile App Not Fetching Data - Troubleshooting Guide

## Current Configuration
- **Your Computer IP:** `10.161.161.31`
- **Backend API:** `http://10.161.161.31:8000`
- **WebSocket:** `ws://10.161.161.31:8080`

## Quick Start (3 Steps)

### Step 1: Start Backend Services
```bash
START_HERE.bat
```

This will open 3 windows:
1. Laravel API Server (port 8000)
2. Reverb WebSocket (port 8080)
3. Expo Mobile App

### Step 2: Test Connection
```bash
TEST_CONNECTION.bat
```

If this shows "SUCCESS", your backend is working!

### Step 3: Connect Phone
1. Open **Expo Go** app on your phone
2. Scan the QR code from the Expo terminal
3. Make sure your phone is on the **same WiFi** as your computer

## Common Issues & Solutions

### Issue 1: "Network Error" or "Cannot connect"

**Cause:** Phone can't reach your computer

**Solutions:**
1. Check both devices are on same WiFi network
2. Disable Windows Firewall temporarily:
   ```
   Control Panel → Windows Defender Firewall → Turn off
   ```
3. Check your IP hasn't changed:
   ```bash
   ipconfig
   ```
   If different from `10.161.161.31`, update `mobile_app/.env`

### Issue 2: "Loading..." forever

**Cause:** Backend not running or wrong IP

**Solutions:**
1. Make sure Laravel is running:
   ```bash
   cd backend
   php artisan serve --host=0.0.0.0
   ```
2. Test in browser: `http://10.161.161.31:8000/api/health`
3. Should show: `{"status":"ok"}`

### Issue 3: Chat messages need refresh

**Cause:** Reverb WebSocket not running

**Solution:**
```bash
cd backend
php artisan reverb:start
```

Keep this terminal open!

### Issue 4: Old data or cached issues

**Solution:** Clear Expo cache
```bash
cd mobile_app
npx expo start -c
```

## Validation Changes Made

### 1. Email Validation (Real Domains Only)
- ✅ Now validates email has real DNS records
- ❌ Rejects: `test@fakeemail`, `user@localhost`
- ✅ Accepts: `user@gmail.com`, `user@yahoo.com`

### 2. Profile Picture Optional
- ✅ Customers can register without profile picture
- ✅ Providers can register without profile picture
- Can add later in profile settings

### 3. Certificate Optional for Providers
- ✅ `credentialPhoto` is now optional during registration
- Providers can still be approved without certificate
- Admin can request it later if needed

## Testing the Changes

### Test Email Validation:
```bash
# This should FAIL (invalid domain)
curl -X POST http://10.161.161.31:8000/api/customer/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@fake","fullname":"Test","phone":"0912345678","password":"password123","password_confirmation":"password123"}'

# This should SUCCEED
curl -X POST http://10.161.161.31:8000/api/customer/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","fullname":"Test","phone":"0912345678","password":"password123","password_confirmation":"password123"}'
```

### Test Optional Profile Picture:
Register without `profilePicture` field - should work!

### Test Optional Certificate:
Provider registration without `credentialPhoto` - should work!

## Network Debugging

### Check if Laravel is accessible from phone:

1. Get your computer's IP:
   ```bash
   ipconfig
   ```

2. On your phone's browser, visit:
   ```
   http://YOUR_IP:8000/api/health
   ```

3. Should see: `{"status":"ok","message":"API is healthy"}`

### Check Firewall Rules:

```powershell
# Allow Laravel through firewall
netsh advfirewall firewall add rule name="Laravel Dev" dir=in action=allow protocol=TCP localport=8000

# Allow Reverb through firewall
netsh advfirewall firewall add rule name="Reverb WebSocket" dir=in action=allow protocol=TCP localport=8080
```

## Still Not Working?

### Check Laravel Logs:
```bash
cd backend
tail -f storage/logs/laravel.log
```

### Check Expo Logs:
Look in the Expo terminal for errors like:
- `Network request failed`
- `ECONNREFUSED`
- `timeout`

### Verify .env file:
```bash
cat mobile_app/.env
```

Should show:
```
EXPO_PUBLIC_API_IP=10.161.161.31
EXPO_PUBLIC_REVERB_HOST=10.161.161.31
```

## Pro Tips

1. **Keep terminals open** - Don't close Laravel or Reverb terminals
2. **Same WiFi** - Both devices must be on same network
3. **No VPN** - Disable VPN on computer or phone
4. **Restart Expo** - If stuck, press `r` in Expo terminal
5. **Clear cache** - `npx expo start -c` clears everything

## Need More Help?

Check these files:
- `backend/storage/logs/laravel.log` - Backend errors
- Expo terminal - Mobile app errors
- Browser console - If testing in web browser

Your backend is configured correctly. The issue is usually:
1. Firewall blocking connections
2. Wrong WiFi network
3. IP address changed
