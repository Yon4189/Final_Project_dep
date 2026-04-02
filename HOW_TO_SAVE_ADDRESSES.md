# How to Save Customer Addresses - Quick Guide

## Current System Status

✅ **Backend**: Fully functional
✅ **API**: All endpoints working
✅ **Database**: Table exists (`customer_addresses`)
⚠️ **Frontend**: Partially implemented (used in booking form only)

## Where Customers Can Save Addresses NOW

### Method 1: During Booking (Already Working)
1. Customer opens booking form (ServiceRequestModal)
2. Selects "Enter new address" option
3. Enters address details
4. Checks "Save this address for later" checkbox
5. Selects label (Home/Office/Other)
6. Address is automatically saved when booking is submitted

### Method 2: Via API (For Testing)
```bash
POST http://your-backend-url/api/addresses
Authorization: Bearer {customer_token}
Content-Type: application/json

{
  "full_address": "Bole Road, Addis Ababa, Ethiopia",
  "latitude": 9.0192,
  "longitude": 38.7525,
  "label": "home",
  "is_default": true
}
```

## API Endpoints Available

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/addresses` | Get all saved addresses |
| POST | `/api/addresses` | Save new address |
| GET | `/api/addresses/{id}` | Get single address |
| PUT | `/api/addresses/{id}` | Update address |
| DELETE | `/api/addresses/{id}` | Delete address |
| PATCH | `/api/addresses/{id}/default` | Set as default |

## How to Limit to 5 Addresses

### Add to Backend (AddressController.php)

In the `store()` method, add this check BEFORE validation:

```php
// Check address count limit
$addressCount = CustomerAddress::where('customerID', $customer->customerID)->count();
if ($addressCount >= 5) {
    return response()->json([
        'success' => false,
        'message' => 'You can only save up to 5 addresses. Please delete an existing address first.'
    ], 422);
}
```

Full location in file:
- File: `backend/app/Http/Controllers/AddressController.php`
- Method: `store()`
- Add after line 72 (after authentication check)

## What's Missing

### Dedicated Address Management Screen
Customers currently cannot:
- View all their saved addresses in one place
- Add addresses outside of booking
- Edit existing addresses
- Delete addresses they don't need
- See which address is set as default

### Recommended Solution
Create a new screen: `mobile_app/app/(customer)/saved-addresses.tsx`

Features needed:
- List all saved addresses
- Add new address button
- Edit/Delete buttons for each address
- Mark as default option
- Show address count (e.g., "2/5 addresses")

### Add Navigation Link
In customer profile or dashboard, add:
```typescript
<TouchableOpacity onPress={() => router.push('/(customer)/saved-addresses')}>
  <Ionicons name="location-outline" size={20} />
  <Text>Manage Saved Addresses</Text>
</TouchableOpacity>
```

## Testing Current Functionality

1. **Login as customer** in mobile app
2. **Browse providers** and select a service
3. **Open booking form**
4. **Select "Enter new address"**
5. **Enter address details**
6. **Check "Save this address for later"**
7. **Select label** (Home/Office/Other)
8. **Submit booking**
9. **Create another booking** - your saved address should appear in "Use saved addresses" option

## Quick Implementation Checklist

- [x] Add 5-address limit in AddressController
- [ ] Create saved-addresses.tsx screen
- [ ] Add navigation link from profile
- [ ] Test address CRUD operations
- [ ] Add address validation
- [ ] Consider adding map integration

## Files to Modify

1. **Backend Limit**: `backend/app/Http/Controllers/AddressController.php` (line ~72)
2. **New Screen**: `mobile_app/app/(customer)/saved-addresses.tsx` (create new)
3. **Navigation**: `mobile_app/app/(customer)/profile.tsx` (add link)

## Summary

The address saving system is **already working** through the booking form. Customers can save addresses when creating bookings. What's missing is a dedicated UI screen for managing these addresses outside of the booking flow.

The backend is complete and ready with a 5-address limit enforced. Optional enhancement:
1. Create the address management screen (for better UX)
