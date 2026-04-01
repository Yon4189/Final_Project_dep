# Provider Registration Requirements - CORRECTED

## Required vs Optional Fields

### REQUIRED Fields
- Full Name
- Email
- Phone Number
- Service City
- Password & Confirmation
- At least one service offering
- ID Document Type (Passport, Driver License, National ID, or Kebele ID)
- ID Card Photo

### OPTIONAL Fields
- Profile Picture
- Business License/Certificate (Credential Photo)

---

## Changes Made

### Backend Validation (ServiceProviderAuthController.php)

```php
'profilePicture' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',  // OPTIONAL
'idPhoto' => 'required|image|mimes:jpeg,jpg,png|max:2048',         // REQUIRED
'credentialPhoto' => 'nullable|image|mimes:jpeg,jpg,png|max:2048', // OPTIONAL
'idPhotoType' => 'required|string|in:Passport,Driver License,National ID,Kebele ID', // REQUIRED
```

### Frontend Validation (register-provider.tsx)

```typescript
// Required fields validation
if (!formData.fullname || !formData.email || !formData.phone || 
    !formData.service_city || !formData.idPhotoType || !idPhoto) {
  Alert.alert('Error', 'Please fill all required fields and upload your ID card photo.');
  return;
}

// Additional ID photo check
if (!idPhoto) {
  Alert.alert('Validation Error', 'Please upload your ID card photo.');
  return;
}
```

### UI Labels

- Profile Picture: "(Optional)"
- ID Document Type: "*" (Required)
- ID Card Photo: "*" (Required)
- Business License/Certificate: "(Optional)"

---

## Why ID is Required

1. Identity Verification - Essential for trust and safety
2. Legal Compliance - Required for service provider verification
3. Fraud Prevention - Prevents fake accounts
4. Admin Approval - Admins need to verify provider identity

---

## Why Business License is Optional

1. Not all service providers have formal business licenses
2. Can be uploaded later after registration
3. Allows faster onboarding
4. Admin can request it before approval if needed

---

## Registration Flow

1. Provider fills basic information
2. Provider uploads ID card photo (REQUIRED)
3. Provider optionally uploads profile picture and business license
4. Provider submits registration
5. Status set to 'pending'
6. Provider can login immediately
7. Admin reviews ID and approves/rejects
8. If approved, provider appears in customer searches

---

## Emoji Removal

All emojis have been removed from code files:
- AdminAuthController.php - Removed emoji from approval notification
- PaymentController.php - Removed all checkmark and fire emojis from comments

---

## Summary

- ID Document Type: REQUIRED
- ID Card Photo: REQUIRED
- Profile Picture: OPTIONAL
- Business License: OPTIONAL
- All emojis removed from code
- Documentation updated to reflect correct requirements
