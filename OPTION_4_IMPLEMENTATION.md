# Option 4 Implementation: Deposit Payout on Service Confirmation

## Overview

Implemented Option 4 with Standard 10% Commission structure for the split payment system. This ensures providers receive guaranteed payment for completed work, even if customers don't pay the final amount.

## Commission Structure (Standard 10%)

For a 1000 ETB booking:

### Deposit Phase (20% = 200 ETB)
- Customer pays: 200 ETB
- Platform commission: 20 ETB (10%)
- Provider receives: 180 ETB (immediately when service is confirmed)

### Final Payment Phase (80% = 800 ETB)
- Customer pays: 800 ETB
- Platform commission: 80 ETB (10%)
- Provider receives: 720 ETB via hybrid payout
  - Immediate: 360 ETB (50% of 720 ETB)
  - Held for 3 days: 360 ETB (50% of 720 ETB)

### Total
- Customer pays: 1000 ETB
- Platform earns: 100 ETB (10% commission)
- Provider earns: 900 ETB (90% of agreed price)

## Payment Flow

```
1. Provider accepts booking
   ↓
2. Customer pays 200 ETB deposit
   ↓
3. Provider completes service
   ↓
4. Customer confirms service completion
   ↓
5. Provider receives 180 ETB deposit payout (immediately)
   ↓
6. Customer has 48 hours to pay final 800 ETB
   ↓
7. Customer pays final 800 ETB
   ↓
8. Provider receives 720 ETB via hybrid payout:
   - 360 ETB immediately
   - 360 ETB held for 3 days
```

## Non-Payment Protection

If customer doesn't pay final amount:
- Provider keeps the 180 ETB deposit payout (guaranteed minimum)
- After 7 days overdue:
  - Automatic dispute created (reason: 'non_payment')
  - Customer account frozen
  - Provider can escalate through dispute system

## Implementation Details

### Files Modified

1. **PaymentService.php**
   - Added `calculateCommission()` method
   - Updated `verifyAndCompletePayment()` to deduct commission before payouts
   - Deposit payout now happens on service confirmation, not on deposit payment

2. **PayoutProcessor.php**
   - Added `processDepositPayout()` method
   - Updated `processHybridPayout()` to accept net amount after commission
   - Deposit payout credited to available_balance immediately

3. **BookingService.php**
   - Updated `confirmServiceCompletion()` to trigger deposit payout
   - Calculates commission and pays provider net amount

4. **Database Migration**
   - Updated wallet_transactions enum to include 'deposit_payout'
   - Created migration for commission_percentage system setting (default 10%)

### New Transaction Types

- **deposit_payout**: Payout to provider when customer confirms service completion
- **immediate_payout**: 50% of final payment paid immediately
- **held_payout**: 50% of final payment held for 3 days

### System Settings

- **commission_percentage**: Platform commission rate (default: 10%, range: 1-99%)
- **deposit_percentage**: Deposit amount (default: 20%, range: 1-99%)

## API Behavior Changes

### POST /api/bookings/{id}/confirm-service
Now triggers deposit payout to provider immediately after confirmation.

Response includes:
```json
{
  "success": true,
  "message": "Service confirmed and deposit payout processed",
  "data": {
    "booking_id": 123,
    "payment_deadline": "2024-01-17T10:30:00Z",
    "deposit_payout": {
      "amount": 180.00,
      "commission": 20.00,
      "status": "completed"
    }
  }
}
```

### POST /api/payments/verify-callback
For final payments, now deducts commission before processing hybrid payout.

## Testing Scenarios

### Scenario 1: Happy Path
1. Booking created: 1000 ETB
2. Customer pays deposit: 200 ETB
3. Customer confirms service: Provider gets 180 ETB
4. Customer pays final: 800 ETB
5. Provider gets 360 ETB immediately + 360 ETB held
6. After 3 days: Provider gets remaining 360 ETB
7. **Total provider earnings: 900 ETB**

### Scenario 2: Customer Doesn't Pay Final
1. Booking created: 1000 ETB
2. Customer pays deposit: 200 ETB
3. Customer confirms service: Provider gets 180 ETB
4. Customer doesn't pay final amount
5. After 7 days: Dispute created, account frozen
6. **Provider keeps 180 ETB minimum**

### Scenario 3: Refund After Final Payment
1. Booking created: 1000 ETB
2. Customer pays deposit: 200 ETB
3. Customer confirms service: Provider gets 180 ETB
4. Customer pays final: 800 ETB
5. Provider gets 360 ETB immediately + 360 ETB held
6. Dispute resolved in customer favor
7. System reverses:
   - 180 ETB deposit payout
   - 360 ETB immediate payout
   - 360 ETB held payout (cancelled if pending)
8. Customer refunded: 1000 ETB

## Migration Instructions

1. Start MySQL server
2. Run migrations:
   ```bash
   cd backend
   php artisan migrate
   ```
3. Verify system_settings table has commission_percentage = 10
4. Test with a sample booking

## Configuration

Admins can adjust commission via:
```bash
# Update commission percentage
php artisan tinker
>>> App\Models\SystemSetting::set('commission_percentage', 15, 'integer');
```

Or via Admin API:
```bash
PUT /api/admin/settings/commission-percentage
{
  "commission_percentage": 15
}
```

## Benefits

1. **Provider Protection**: Guaranteed minimum payment (deposit) once service is confirmed
2. **Fair Commission**: Consistent 10% on all payments
3. **Customer Protection**: Still have dispute mechanism if service quality is poor
4. **Platform Revenue**: Predictable 10% commission on all transactions
5. **Transparency**: Clear breakdown of commission at each stage

## Next Steps

1. Run migrations when MySQL is available
2. Test deposit payout flow
3. Test final payment with commission deduction
4. Test non-payment scenario (7-day overdue)
5. Update frontend to show commission breakdown
6. Add admin dashboard for commission tracking
