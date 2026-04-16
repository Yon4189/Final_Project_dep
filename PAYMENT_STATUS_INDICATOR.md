# Payment Status Indicator in Accepted Tab

## Overview

Added a visual payment status indicator to booking cards in the **Accepted tab** of the provider dashboard. This allows providers to see at a glance whether the customer has paid the deposit without opening the booking details.

---

## Visual Design

### Paid Status (Deposit Received)
```
✓ Paid
```
- **Icon**: Green checkmark (✓)
- **Text**: "Paid" in green
- **Background**: Light green (#success + 15% opacity)
- **Condition**: `payment_status = 'deposit_paid'` OR `'completed'`

### Unpaid Status (Awaiting Deposit)
```
Unpaid
```
- **Icon**: None
- **Text**: "Unpaid" in orange/warning color
- **Background**: Light orange (#warning + 15% opacity)
- **Condition**: Any other `payment_status` value

---

## Implementation

### Code Added to Dashboard

```typescript
{selectedTab === 'accepted' && (
  <View style={[
    styles.paymentBadge, 
    { 
      backgroundColor: req.payment_status === 'deposit_paid' || req.payment_status === 'completed' 
        ? colors.success + '15' 
        : colors.warning + '15' 
    }
  ]}>
    {/* Show checkmark only for paid status */}
    {(req.payment_status === 'deposit_paid' || req.payment_status === 'completed') && (
      <Ionicons name="checkmark-circle" size={12} color={colors.success} />
    )}
    
    <Text style={[
      styles.paymentBadgeText, 
      { 
        color: req.payment_status === 'deposit_paid' || req.payment_status === 'completed' 
          ? colors.success 
          : colors.warning 
      }
    ]}>
      {req.payment_status === 'deposit_paid' || req.payment_status === 'completed' ? 'Paid' : 'Unpaid'}
    </Text>
  </View>
)}
```

### Styles Added

```typescript
paymentBadge: { 
  flexDirection: 'row', 
  alignItems: 'center', 
  paddingHorizontal: 8, 
  paddingVertical: 4, 
  borderRadius: 8, 
  gap: 4 
},
paymentBadgeText: { 
  fontSize: 11, 
  fontWeight: 'bold' 
},
```

### Layout Structure

```
┌─────────────────────────────────────┐
│ [Avatar] Customer Name       Status │
│          #REQ-123456                │
├─────────────────────────────────────┤
│ Service Name              500 ETB   │
│ Jan 15, 2026 • 10:00 AM   ✓ Paid   │  ← Payment badge here
├─────────────────────────────────────┤
│ [View Details →]                    │
└─────────────────────────────────────┘
```

---

## Payment Status Values

The backend returns `payment_status` field in the booking object:

| Status | Meaning | Badge Display |
|--------|---------|---------------|
| `pending_deposit` | Customer hasn't paid deposit yet | **Unpaid** 🟠 |
| `deposit_paid` | Customer paid 20% deposit | **✓ Paid** 🟢 |
| `pending_final` | Deposit paid, waiting for 80% final | **✓ Paid** 🟢 |
| `completed` | All payments received | **✓ Paid** 🟢 |
| `overdue` | Payment deadline passed | **Unpaid** 🟠 |

---

## Why This Feature Matters

### For Providers:

1. **Quick Decision Making**
   - See payment status without opening details
   - Prioritize paid bookings over unpaid ones

2. **Risk Management**
   - Identify unpaid bookings that might get cancelled
   - Avoid starting service before payment

3. **Workflow Efficiency**
   - No need to tap into each booking to check payment
   - Faster dashboard scanning

4. **Financial Clarity**
   - Know which bookings have secured deposits
   - Better cash flow visibility

### Business Logic:

According to the split payment system:
- **20% deposit** must be paid after provider accepts
- Provider should **only start service** after deposit is paid
- **80% final payment** is due after service completion

The badge helps providers enforce this workflow by making payment status immediately visible.

---

## Example Scenarios

### Scenario 1: Paid Booking
```
Customer: John Doe
Service: Plumbing Repair - 1,000 ETB
Date: Jan 15, 2026 • 10:00 AM
Status: ✓ Paid (green)

→ Provider can confidently start the service
→ 200 ETB deposit already in escrow
```

### Scenario 2: Unpaid Booking
```
Customer: Jane Smith
Service: Electrical Work - 500 ETB
Date: Jan 16, 2026 • 14:00 PM
Status: Unpaid (orange)

→ Provider should wait for payment before starting
→ Customer needs to pay 100 ETB deposit first
```

---

## Testing

To test the payment status indicator:

1. **Create test bookings** with different payment statuses:
   ```sql
   -- Unpaid booking
   UPDATE bookings SET payment_status = 'pending_deposit' WHERE bookingID = 1;
   
   -- Paid booking
   UPDATE bookings SET payment_status = 'deposit_paid' WHERE bookingID = 2;
   ```

2. **Login as provider** and go to dashboard

3. **Check Accepted tab**:
   - Unpaid bookings should show orange "Unpaid" badge
   - Paid bookings should show green "✓ Paid" badge

4. **Verify badge only shows in Accepted tab**:
   - Pending tab: No payment badge (not relevant yet)
   - Completed tab: No payment badge (already paid)

---

## Future Enhancements

Possible improvements:

1. **More Detailed Status**:
   - "Deposit Paid" vs "Fully Paid"
   - Show amount paid (e.g., "200 ETB paid")

2. **Payment Deadline**:
   - Show countdown for overdue payments
   - "Payment due in 2 hours"

3. **Tap to Pay**:
   - Make badge clickable
   - Opens payment reminder/details

4. **Color Coding**:
   - Red for overdue
   - Orange for pending
   - Green for paid

---

## Files Modified

- `mobile_app/app/(provider)/dashboard.tsx`
  - Added payment badge rendering
  - Added conditional styling
  - Added payment status logic

---

## Dependencies

- `@expo/vector-icons` - For checkmark icon
- `payment_status` field from backend API
- Theme colors (`colors.success`, `colors.warning`)
