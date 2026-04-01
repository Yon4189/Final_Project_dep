# Online Status Fix

## Problem
All providers were showing as "Available Now" even when they weren't logged in.

## Root Cause
The frontend was checking the wrong field name:
- Backend returns: `isAvailable` (from `is_online` database field)
- Frontend was checking: `provider.availableNow` ❌

## Solution Applied

### 1. Fixed Frontend Field Name
**File:** `mobile_app/components/customer/ProviderCard.tsx`

**Before:**
```tsx
{provider.availableNow && (
  <View style={styles.availableBadge}>
    <View style={styles.availableDot} />
    <Text style={styles.availableText}>Available Now</Text>
  </View>
)}
```

**After:**
```tsx
{provider.isAvailable && (
  <View style={styles.availableBadge}>
    <View style={styles.availableDot} />
    <Text style={styles.availableText}>Available Now</Text>
  </View>
)}
```

## How It Works Now

### Backend Logic (Already Correct)
1. **On Login:** Sets `is_online = true` in database
2. **On Logout:** Sets `is_online = false` in database
3. **API Response:** Returns `isAvailable` field based on `is_online` value
4. **Filter:** When user filters by "Currently Online", only shows providers where `is_online = true`

**Files:**
- `backend/app/Http/Controllers/ServiceProviderAuthController.php` (lines 244-248)
- `backend/app/Http/Controllers/CustomerSearchController.php` (lines 61-63, 149)

### Frontend Logic (Now Fixed)
1. **Display:** Shows "Available Now" badge only when `provider.isAvailable === true`
2. **Filter:** "Currently Online" filter works correctly

**Files:**
- `mobile_app/components/customer/ProviderCard.tsx` (line 168)
- `mobile_app/app/(customer)/search/results.tsx` (lines 68-69)

## Testing

### Test 1: Provider Not Logged In
```
Expected: No "Available Now" badge
Result: ✅ Badge hidden
```

### Test 2: Provider Logged In
```
Expected: Shows "Available Now" badge
Result: ✅ Badge visible
```

### Test 3: Filter by "Currently Online"
```
Expected: Only shows logged-in providers
Result: ✅ Filters correctly
```

## Note About Seeder Data

The seeder file (`backend/database/seeders/CustomerApiSeeder.php`) has test providers with `is_online => true` for testing purposes. This is intentional for development.

In production:
- New providers start with `is_online = false` (migration default)
- Only becomes `true` when they actually log in
- Automatically set to `false` when they log out

## Database Schema

**Table:** `service_providers`
**Column:** `is_online` BOOLEAN DEFAULT false

**Migration:** `2026_02_21_070019_add_is_online_column_to_service_providers_table.php`

## Summary

The fix was simple - just changed `provider.availableNow` to `provider.isAvailable` in the ProviderCard component. The backend was already working correctly.

Now the online status accurately reflects which providers are actually logged in!
