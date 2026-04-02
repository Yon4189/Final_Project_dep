# Saved Addresses System - Complete Guide

## Overview
The system already has a complete backend for managing customer saved addresses. Customers can save up to unlimited addresses (you can add a limit if needed).

## Current Implementation Status

### ✅ Backend (Fully Implemented)
- Database table: `customer_addresses`
- Model: `CustomerAddress`
- Controller: `AddressController`
- API Routes: `/api/addresses/*`

### ⚠️ Frontend (Partially Implemented)
- Service methods exist in `customer.service.ts`
- Used in booking form (ServiceRequestModal)
- **Missing**: Dedicated UI screen for managing saved addresses

## How It Works

### 1. Database Structure
**Table**: `customer_addresses`
```
- addressID (primary key)
- customerID (foreign key to customers)
- label (enum: 'home', 'office', 'other')
- custom_label (for 'other' option)
- full_address (text)
- latitude (decimal)
- longitude (decimal)
- place_id (Google Places ID, optional)
- is_default (boolean)
- timestamps
```

### 2. Backend API Endpoints

#### Get All Addresses
```
GET /api/addresses
Headers: Authorization: Bearer {token}
Response: { success: true, data: [addresses] }
```

#### Get Single Address
```
GET /api/addresses/{addressID}
Headers: Authorization: Bearer {token}
Response: { success: true, data: address }
```

#### Save New Address
```
POST /api/addresses
Headers: Authorization: Bearer {token}
Body: {
  full_address: "123 Main St, City",
  latitude: 9.0192,
  longitude: 38.7525,
  label: "home" | "office" | "other",
  custom_label: "Mom's House" (required if label is 'other'),
  place_id: "ChIJ..." (optional),
  is_default: true/false
}
Response: { success: true, message: "Address saved", data: address }
```

#### Update Address
```
PUT /api/addresses/{addressID}
Headers: Authorization: Bearer {token}
Body: { ...fields to update }
Response: { success: true, message: "Address updated", data: address }
```

#### Delete Address
```
DELETE /api/addresses/{addressID}
Headers: Authorization: Bearer {token}
Response: { success: true, message: "Address deleted" }
```

#### Set as Default
```
PATCH /api/addresses/{addressID}/default
Headers: Authorization: Bearer {token}
Response: { success: true, message: "Default address updated" }
```

### 3. Frontend Service Methods

Located in: `mobile_app/app/services/customer.service.ts`

```typescript
// Get all saved addresses
await customerService.getLocations()

// Add new address
await customerService.addLocation({
  addressLine1: "123 Main St",
  city: "Addis Ababa",
  latitude: 9.0192,
  longitude: 38.7525,
  label: "home",
  isPrimary: true
})

// Update address
await customerService.updateLocation(addressId, { ...updates })

// Delete address
await customerService.deleteLocation(addressId)

// Set as primary
await customerService.setPrimaryLocation(addressId)
```

### 4. Current Usage

**In Booking Form** (`ServiceRequestModal.tsx`):
- Customers can choose "Use saved addresses"
- Fetches saved addresses via `customerService.getLocations()`
- Displays them in a picker
- Can save new address while booking

## How to Save Addresses (Current Flow)

### Option 1: During Booking
1. Customer opens booking form
2. Selects "Enter new address"
3. Enters address details
4. Checks "Save this address for later"
5. Selects label (home/office/other)
6. Address is saved when booking is created

### Option 2: Via API (Direct)
Use Postman or similar:
```bash
POST http://your-api/api/addresses
Authorization: Bearer {customer_token}
Content-Type: application/json

{
  "full_address": "Bole Road, Addis Ababa",
  "latitude": 9.0192,
  "longitude": 38.7525,
  "label": "home",
  "is_default": true
}
```

## Limiting to 5 Addresses

### Backend Validation (Recommended)
Add to `AddressController::store()`:

```php
public function store(Request $request)
{
    $customer = auth()->guard('customer')->user();
    
    if (!$customer) {
        return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
    }
    
    // Check address count limit
    $addressCount = CustomerAddress::where('customerID', $customer->customerID)->count();
    if ($addressCount >= 5) {
        return response()->json([
            'success' => false,
            'message' => 'You can only save up to 5 addresses. Please delete an existing address first.'
        ], 422);
    }
    
    // ... rest of the code
}
```

### Frontend Validation
In `ServiceRequestModal.tsx`, before showing save option:

```typescript
if (savedAddresses.length >= 5) {
  Alert.alert(
    'Address Limit Reached',
    'You can only save up to 5 addresses. Please delete an existing address first.'
  );
  return;
}
```

## What's Missing

### Dedicated Address Management Screen
Currently, there's no UI screen where customers can:
- View all saved addresses
- Add new addresses (outside of booking)
- Edit existing addresses
- Delete addresses
- Set default address

**Recommended Location**: `mobile_app/app/(customer)/saved-addresses.tsx`

### Navigation Link
Add to customer profile or settings menu:
```typescript
<TouchableOpacity onPress={() => router.push('/(customer)/saved-addresses')}>
  <Text>Manage Saved Addresses</Text>
</TouchableOpacity>
```

## Testing the Current System

### 1. Test via Booking Form
1. Login as customer
2. Browse providers and select a service
3. In booking form, select "Enter new address"
4. Enter address details
5. Check "Save this address for later"
6. Complete booking
7. Create another booking and select "Use saved addresses"
8. Your saved address should appear

### 2. Test via API
```bash
# Login as customer
POST /api/customer/login
{ "email": "customer@test.com", "password": "password" }

# Save address
POST /api/addresses
Authorization: Bearer {token}
{
  "full_address": "Test Address 1",
  "latitude": 9.0192,
  "longitude": 38.7525,
  "label": "home",
  "is_default": true
}

# Get all addresses
GET /api/addresses
Authorization: Bearer {token}
```

## Recommendations

1. **Create Address Management Screen**
   - Full CRUD interface for addresses
   - Map integration for selecting location
   - Visual indicators for default address

2. **Add Address Limit**
   - Implement 5-address limit in backend
   - Show count in UI (e.g., "2/5 addresses saved")

3. **Improve UX**
   - Add address validation
   - Integrate Google Places Autocomplete
   - Show addresses on map
   - Add address verification

4. **Add to Navigation**
   - Link from profile screen
   - Link from settings
   - Quick access from booking form

## Next Steps

Would you like me to:
1. Create the dedicated address management screen?
2. Improve the booking form address selection?
3. Add additional features?
