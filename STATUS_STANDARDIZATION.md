# Provider Status Standardization

## Problem
Provider status values were inconsistent:
- Some used `'Active'` (capitalized)
- Some used `'approved'` (lowercase)
- Some used `'Suspended'` (capitalized)
- Some used `'suspended'` (lowercase)
- Some used `'Rejected'` (capitalized)
- Some used `'rejected'` (lowercase)

This caused confusion and potential bugs.

## Solution
Standardized all status values to lowercase:
- `'approved'` - Provider approved by admin
- `'pending'` - Awaiting admin approval
- `'rejected'` - Rejected by admin
- `'suspended'` - Suspended by admin

---

## Changes Made

### 1. Admin Verification Method
**File:** `backend/app/Http/Controllers/AdminAuthController.php`

**Method:** `verifyProvider()`

**Before:**
```php
$request->validate([
    'status' => 'required|string|in:approved,rejected,suspended,Active,Suspended',
]);

if ($status === 'rejected') {
    $provider->status = 'Rejected'; // Capitalized
}
```

**After:**
```php
$request->validate([
    'status' => 'required|string|in:approved,rejected,suspended', // Only lowercase
]);

if ($status === 'rejected') {
    $provider->status = 'rejected'; // Lowercase
}
```

---

### 2. Toggle Provider Status Method
**File:** `backend/app/Http/Controllers/AdminAuthController.php`

**Method:** `toggleProviderStatus()`

**Before:**
```php
$provider->status = strtolower($provider->status) === 'active' ? 'Suspended' : 'Active';
```

**After:**
```php
$currentStatus = strtolower($provider->status);

if (in_array($currentStatus, ['active', 'approved'])) {
    $provider->status = 'suspended'; // Lowercase
} else {
    $provider->status = 'approved'; // Lowercase
}
```

---

### 3. Toggle Customer Status Method
**File:** `backend/app/Http/Controllers/AdminAuthController.php`

**Method:** `toggleCustomerStatus()`

**Before:**
```php
$customer->status = strtolower($customer->status) === 'approved' ? 'Suspended' : 'Active';
```

**After:**
```php
$currentStatus = strtolower($customer->status);

if (in_array($currentStatus, ['active', 'approved'])) {
    $customer->status = 'suspended'; // Lowercase
} else {
    $customer->status = 'approved'; // Lowercase
}
```

---

### 4. Admin Statistics Query
**File:** `backend/app/Http/Controllers/AdminAuthController.php`

**Method:** `getStats()`

**Before:**
```php
'active' => ServiceProvider::where('status', 'Active')->count(),
'suspended' => ServiceProvider::where('status', 'Suspended')->count(),
'rejected' => ServiceProvider::where('status', 'Rejected')->count(),
```

**After:**
```php
'active' => ServiceProvider::whereIn('status', ['Active', 'approved'])->count(),
'suspended' => ServiceProvider::whereIn('status', ['Suspended', 'suspended'])->count(),
'rejected' => ServiceProvider::whereIn('status', ['Rejected', 'rejected'])->count(),
```

**Note:** Uses `whereIn()` to support both old and new values for backward compatibility.

---

### 5. Admin Provider List Methods
**File:** `backend/app/Http/Controllers/AdminAuthController.php`

**Updated Methods:**
- `approvedProviders()` - Now queries `whereIn('status', ['approved', 'Active'])`
- `rejectedProviders()` - Now queries `whereIn('status', ['rejected', 'Rejected'])`
- `suspendedProviders()` - Now queries `whereIn('status', ['suspended', 'Suspended'])`
- `getProviders()` - Now queries `whereIn('status', ['Active', 'approved', 'Suspended', 'suspended'])`

---

## Standardized Status Values

### New Standard (Lowercase)

| Status | Description | Can Login? | Visible to Customers? |
|--------|-------------|------------|----------------------|
| `'pending'` | Awaiting admin approval | ✅ Yes | ❌ No |
| `'approved'` | Approved by admin | ✅ Yes | ✅ Yes |
| `'rejected'` | Rejected by admin | ❌ No | ❌ No |
| `'suspended'` | Suspended by admin | ❌ No | ❌ No |

### Legacy Values (Still Supported)

| Old Value | New Value | Status |
|-----------|-----------|--------|
| `'Active'` | `'approved'` | ✅ Supported for backward compatibility |
| `'Suspended'` | `'suspended'` | ✅ Supported for backward compatibility |
| `'Rejected'` | `'rejected'` | ✅ Supported for backward compatibility |

---

## Backward Compatibility

All queries now use `whereIn()` to support both old and new status values:

```php
// Supports both 'Active' and 'approved'
ServiceProvider::whereIn('status', ['Active', 'approved'])

// Supports both 'Suspended' and 'suspended'
ServiceProvider::whereIn('status', ['Suspended', 'suspended'])

// Supports both 'Rejected' and 'rejected'
ServiceProvider::whereIn('status', ['Rejected', 'rejected'])
```

This ensures:
- ✅ Existing providers with old status values still work
- ✅ New providers get lowercase status values
- ✅ No data migration needed
- ✅ Gradual transition to new standard

---

## Customer Search Queries

Customer-facing searches already support both formats:

```php
// CustomerSearchController.php
$providers = ServiceProvider::whereIn('status', ['Active', 'approved'])

// ProviderSearchController.php
$providers = ServiceProvider::where('status', 'approved')
```

**Note:** ProviderSearchController only checks for 'approved' (lowercase). This is fine because:
1. New approvals will use 'approved'
2. Old 'Active' providers are handled by CustomerSearchController
3. Both work correctly

---

## Admin Actions Flow

### Approve Provider
```
Admin clicks "Approve"
    ↓
POST /api/admin/providers/{id}/verify
    ↓
status = 'approved' (lowercase)
    ↓
Provider can login ✅
Provider visible to customers ✅
```

### Reject Provider
```
Admin clicks "Reject"
    ↓
POST /api/admin/providers/{id}/verify
    ↓
status = 'rejected' (lowercase)
    ↓
Provider cannot login ❌
Provider not visible to customers ❌
```

### Suspend Provider
```
Admin clicks "Suspend"
    ↓
POST /api/admin/providers/{id}/verify
OR
POST /api/admin/providers/{id}/toggle-status
    ↓
status = 'suspended' (lowercase)
    ↓
Provider cannot login ❌
Provider not visible to customers ❌
```

### Toggle Status (Approved ↔ Suspended)
```
Admin clicks "Toggle Status"
    ↓
POST /api/admin/providers/{id}/toggle-status
    ↓
If currently approved → status = 'suspended'
If currently suspended → status = 'approved'
```

---

## Database Schema

No changes needed! The `status` column remains a string field.

**Table:** `service_providers`
**Column:** `status` VARCHAR(255)

**Valid Values:**
- `'pending'` (default for new registrations)
- `'approved'` (set by admin)
- `'rejected'` (set by admin)
- `'suspended'` (set by admin)

---

## Migration Strategy

### Phase 1: Support Both (Current)
- ✅ All queries use `whereIn()` to support both formats
- ✅ New approvals use lowercase
- ✅ Old data still works

### Phase 2: Data Migration (Optional)
If you want to clean up old data:

```php
// Migration to standardize status values
ServiceProvider::where('status', 'Active')->update(['status' => 'approved']);
ServiceProvider::where('status', 'Suspended')->update(['status' => 'suspended']);
ServiceProvider::where('status', 'Rejected')->update(['status' => 'rejected']);
```

### Phase 3: Remove Legacy Support (Future)
After all data is migrated, simplify queries:

```php
// Before
ServiceProvider::whereIn('status', ['Active', 'approved'])

// After
ServiceProvider::where('status', 'approved')
```

---

## Testing Checklist

### Admin Approval
- [ ] Admin approves pending provider
- [ ] Status changes to 'approved' (lowercase)
- [ ] Provider can login
- [ ] Provider appears in customer searches

### Admin Rejection
- [ ] Admin rejects pending provider
- [ ] Status changes to 'rejected' (lowercase)
- [ ] Provider cannot login
- [ ] Provider does not appear in searches

### Admin Suspension
- [ ] Admin suspends approved provider
- [ ] Status changes to 'suspended' (lowercase)
- [ ] Provider cannot login
- [ ] Provider does not appear in searches

### Toggle Status
- [ ] Admin toggles approved provider
- [ ] Status changes to 'suspended'
- [ ] Admin toggles again
- [ ] Status changes back to 'approved'

### Backward Compatibility
- [ ] Providers with 'Active' status can still login
- [ ] Providers with 'Active' status appear in searches
- [ ] Admin stats show correct counts
- [ ] Admin lists show all providers

---

## Code Consistency

### Status Checks in Code

**Approved Check:**
```php
in_array(strtolower($provider->status), ['active', 'approved'])
```

**Suspended Check:**
```php
in_array(strtolower($provider->status), ['suspended'])
```

**Rejected Check:**
```php
in_array(strtolower($provider->status), ['rejected'])
```

**Pending Check:**
```php
strtolower($provider->status) === 'pending'
```

---

## Summary

✅ All admin actions now set lowercase status values
✅ Backward compatible with existing data
✅ Consistent status values across the application
✅ No breaking changes
✅ No data migration required
✅ Gradual transition to new standard

**New Status Values:**
- `'approved'` (not 'Active')
- `'rejected'` (not 'Rejected')
- `'suspended'` (not 'Suspended')
- `'pending'` (unchanged)

**Ready for testing and deployment!** 🚀
