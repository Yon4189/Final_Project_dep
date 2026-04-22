# Admin Settings - Testing Guide

## ✅ What Was Fixed

The Admin Settings page now has full backend support:
- **GET /admin/settings** - Loads current settings
- **POST /admin/settings** - Saves settings to database
- Settings are stored in `system_settings` table
- Commission rate is now read from database (not hardcoded)

---

## 🧪 How to Test

### Prerequisites
1. Backend server running (`php artisan serve`)
2. Web admin app running (`npm run dev` in web_app folder)
3. Admin account credentials

---

### Test 1: Load Existing Settings

**Steps:**
1. Open web admin: `http://localhost:5173` (or your web app URL)
2. Login with admin credentials
3. Navigate to **Settings** page (sidebar menu)
4. Wait for page to load

**Expected Result:**
- Settings page loads without errors
- Current values appear in all fields:
  - Commission Rate (default: 10%)
  - Max Service Radius (default: 15 KM)
  - Min Payout Amount (default: 500 ETB)
  - Maintenance Mode (default: OFF)
  - System Name (default: "HB Service Finder Admin")

**Check Browser Console:**
- Should see: `GET /admin/settings` → Status 200
- No errors in console

---

### Test 2: Save Settings (Success Case)

**Steps:**
1. On Settings page, change values:
   - Commission Rate: `15`
   - Max Service Radius: `20`
   - Min Payout Amount: `1000`
2. Click **"SAVE CHANGES"** button
3. Wait for response

**Expected Result:**
- Button shows "PROCESSING..." with spinner
- After 1-2 seconds: Alert "Settings saved successfully!"
- Button returns to "SAVE CHANGES"

**Check Browser Console:**
- Should see: `POST /admin/settings` → Status 200
- Response body: `{"success": true, "message": "Settings saved successfully"}`

**Verify in Database:**
```bash
# In backend folder
php artisan tinker
```
```php
\App\Models\SystemSetting::get('commission_percentage')
// Should return: 15

\App\Models\SystemSetting::get('max_service_radius')
// Should return: 20

\App\Models\SystemSetting::get('min_payout_amount')
// Should return: 1000
```

---

### Test 3: Reload Page (Persistence Check)

**Steps:**
1. After saving settings, refresh the page (F5)
2. Wait for page to load

**Expected Result:**
- Settings page loads with the NEW values you just saved
- Commission Rate: 15%
- Max Service Radius: 20 KM
- Min Payout Amount: 1000 ETB

**This confirms:** Settings are persisted to database and loaded correctly

---

### Test 4: Validation (Invalid Values)

**Steps:**
1. Try to save invalid values:
   - Commission Rate: `150` (over 100%)
   - Max Service Radius: `600` (over 500 KM)
   - Min Payout Amount: `-100` (negative)
2. Click **"SAVE CHANGES"**

**Expected Result:**
- Alert shows validation errors:
  ```
  Validation errors:
  settings.commissionRate must not be greater than 100
  settings.maxServiceRadius must not be greater than 500
  settings.minPayoutAmount must not be less than 0
  ```

**Check Browser Console:**
- Should see: `POST /admin/settings` → Status 422 (Validation Error)

---

### Test 5: Maintenance Mode Toggle

**Steps:**
1. Click the **Maintenance Mode** toggle switch
2. Toggle should turn RED and show spinning icon
3. Click **"SAVE CHANGES"**
4. Refresh page

**Expected Result:**
- After refresh, toggle is still ON (RED)
- Setting persisted to database

**Verify in Database:**
```php
\App\Models\SystemSetting::get('maintenance_mode')
// Should return: true (or 1)
```

---

### Test 6: Branding Settings

**Steps:**
1. Switch to **"BRANDING"** tab
2. Change System Name to: `"My Custom Platform"`
3. Click **"SAVE CHANGES"**
4. Refresh page

**Expected Result:**
- After refresh, System Name shows: "My Custom Platform"

**Verify in Database:**
```php
\App\Models\SystemSetting::get('system_name')
// Should return: "My Custom Platform"
```

---

### Test 7: Commission Rate in Payment Processing

**Important:** The commission rate is now read from database in payment processing.

**Verify:**
1. Check `backend/app/Services/PaymentService.php`
2. Look for line:
   ```php
   $commissionRate = SystemSetting::get('commission_percentage', 10);
   ```

**Test:**
1. Set commission rate to 20% in Admin Settings
2. Create a test booking with agreed_price = 1000 ETB
3. Process payment
4. Check `payments` table:
   - `platform_commission` should be: 200 ETB (20% of 1000)
   - `provider_payout` should be: 800 ETB (80% of 1000)

---

## 🔍 Troubleshooting

### Issue: "Settings endpoint not found" error

**Cause:** Route not registered

**Fix:**
```bash
cd backend
php artisan route:clear
php artisan route:cache
php artisan route:list | grep settings
```

**Expected output:**
```
GET|HEAD  api/admin/settings ............... AdminAuthController@getSettings
POST      api/admin/settings ............... AdminAuthController@updateSettings
```

---

### Issue: Settings not saving (no error)

**Check:**
1. Admin is authenticated:
   ```javascript
   // In browser console
   localStorage.getItem('token')
   // Should return a token string
   ```

2. Token is valid:
   ```bash
   # Check Laravel logs
   tail -f backend/storage/logs/laravel.log
   ```

3. Database connection:
   ```bash
   php artisan tinker
   ```
   ```php
   DB::connection()->getPdo();
   // Should not throw error
   ```

---

### Issue: Values not loading on page load

**Check:**
1. Browser console for errors
2. Network tab: `GET /admin/settings` response
3. React Query cache:
   ```javascript
   // In browser console (React DevTools)
   // Check if useQuery is fetching data
   ```

---

## 📊 Database Structure

Settings are stored in `system_settings` table:

| key | value | type | description |
|-----|-------|------|-------------|
| commission_percentage | 10 | integer | Platform commission (0-100) |
| max_service_radius | 15 | integer | Max radius in KM (1-500) |
| min_payout_amount | 500 | float | Min payout in ETB |
| maintenance_mode | 0 | boolean | Maintenance mode flag |
| system_name | HB Service Finder Admin | string | Platform name |
| logo_url | null | string | Logo URL |

**View all settings:**
```bash
php artisan tinker
```
```php
\App\Models\SystemSetting::all();
```

---

## ✅ Success Criteria

All tests pass if:
1. ✅ Settings load on page mount
2. ✅ Settings save successfully
3. ✅ Settings persist after page refresh
4. ✅ Validation errors show for invalid values
5. ✅ Maintenance mode toggle works
6. ✅ Branding settings save correctly
7. ✅ Commission rate is used in payment processing

---

## 🚀 Next Steps

After confirming Admin Settings work:
1. Move to next P0 issue: **Payment Idempotency Keys**
2. Or fix: **Unique Constraints for Duplicate Bookings**
3. Or fix: **Wallet Transaction Locking**

---

## 📝 Notes

**What's NOT enforced yet** (saved to DB but no logic):
- ❌ Max service radius not enforced in provider search
- ❌ Min payout amount not validated in withdrawal requests
- ❌ Maintenance mode doesn't block API requests (no middleware)
- ❌ Logo upload button has no backend endpoint

These can be implemented later as separate tasks.
