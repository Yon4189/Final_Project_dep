# Implementation Plan: Split Payment System

## Overview

This implementation plan converts the split payment system design into actionable coding tasks. The system implements a two-phase payment model (deposit + final payment) with hybrid provider payouts (50% immediate, 50% held for 3 days). Tasks are organized to build incrementally, with each phase validating functionality before moving forward.

The implementation uses PHP/Laravel and integrates with the existing Chapa payment gateway, wallet infrastructure, and notification system.

## Tasks

- [x] 1. Database migrations and schema setup
  - [x] 1.1 Create system_settings table migration
    - Create migration file for system_settings table
    - Add columns: id, setting_key (unique), setting_value, setting_type, description, timestamps
    - Add index on setting_key
    - Insert default deposit_percentage setting (value: 20, type: integer)
    - _Requirements: 1.3, 1.4, 8.2, 8.3_

  - [x] 1.2 Create payments table extension migration
    - Create migration to add columns to payments table
    - Add payment_type ENUM('deposit', 'final') with default 'final'
    - Add payment_phase VARCHAR(50) nullable
    - Add booking_id BIGINT UNSIGNED nullable (if not exists)
    - Add payment_status ENUM('pending', 'completed', 'failed', 'refunded') with default 'pending'
    - Add indexes: idx_payment_type, idx_payment_status, idx_booking_payment (bookingID, payment_type)
    - Update existing payments to set payment_type = 'final'
    - _Requirements: 2.2, 3.2, 9.1, 9.2, 9.3, 9.4_

  - [x] 1.3 Create bookings table extension migration
    - Create migration to add columns to bookings table
    - Add payment_status ENUM('pending_deposit', 'deposit_paid', 'pending_final', 'completed', 'overdue') nullable
    - Add payment_deadline TIMESTAMP nullable
    - Add service_confirmed_at TIMESTAMP nullable
    - Add indexes: idx_payment_status, idx_payment_deadline
    - Update existing bookings with paid_at to set payment_status = 'completed'
    - _Requirements: 2.3, 3.3, 10.1, 10.2, 10.3, 10.4, 14.1, 14.2_

  - [x] 1.4 Create wallet_transactions table extension migration
    - Create migration to add columns to wallet_transactions table
    - Add transaction_type ENUM('immediate_payout', 'held_payout', 'withdrawal', 'refund_reversal', 'other') with default 'other'
    - Add release_date TIMESTAMP nullable
    - Add transaction_status ENUM('pending', 'completed', 'cancelled') with default 'completed'
    - Add related_payment_id BIGINT UNSIGNED nullable
    - Add indexes: idx_transaction_type, idx_transaction_status, idx_release_date
    - Update existing transactions to set transaction_type = 'other'
    - _Requirements: 4.3, 4.6, 5.1, 5.2, 13.1, 13.2, 13.3, 13.4_


- [x] 2. Create and update data models
  - [x] 2.1 Create SystemSetting model
    - Create app/Models/SystemSetting.php
    - Add fillable fields: setting_key, setting_value, setting_type, description
    - Implement static get() method with type casting (integer, decimal, boolean, json, string)
    - Implement static set() method with validation
    - Add castValue() helper method for type conversion
    - _Requirements: 1.3, 1.4, 8.2, 8.3_

  - [ ]* 2.2 Write property test for SystemSetting model
    - **Property 2: Default Deposit Percentage**
    - **Property 17: Deposit Percentage Validation**
    - **Validates: Requirements 1.4, 8.2, 8.3**

  - [x] 2.3 Extend Payment model
    - Add fillable fields: payment_type, payment_phase, payment_status
    - Add casts for ENUM fields
    - Add scopes: scopeDeposits(), scopeFinalPayments(), scopeCompleted()
    - Add helper methods: isDeposit(), isFinal()
    - Add relationship to Booking model
    - _Requirements: 2.2, 3.2, 9.1, 9.2, 9.3, 9.4_

  - [x] 2.4 Extend Booking model
    - Add fillable fields: payment_status, payment_deadline, service_confirmed_at
    - Add casts for datetime fields
    - Add relationships: depositPayment(), finalPayment()
    - Add scopes: scopePendingFinalPayment(), scopeOverduePayments()
    - Add helper methods: isPaymentOverdue(), getRemainingAmount()
    - _Requirements: 2.3, 3.3, 10.1, 10.2, 10.3, 10.4, 14.1, 14.2_

  - [x] 2.5 Extend WalletTransaction model
    - Add fillable fields: transaction_type, release_date, transaction_status, related_payment_id
    - Add casts for datetime and ENUM fields
    - Add scopes: scopeHeldPayouts(), scopePendingRelease()
    - Add helper method: isReleasable()
    - Add relationship to Payment model
    - _Requirements: 4.3, 4.6, 5.1, 5.2, 13.1, 13.2, 13.3, 13.4_

  - [ ]* 2.6 Write property tests for model extensions
    - **Property 19: Payment Transaction Data Integrity**
    - **Property 25: Wallet Transaction Data Integrity**
    - **Validates: Requirements 9.1-9.4, 13.1-13.4**

- [x] 3. Implement PaymentService core functionality
  - [x] 3.1 Create PaymentService class
    - Create app/Services/PaymentService.php
    - Inject SystemSetting model and ChapaService dependencies
    - Add constructor with dependency injection
    - _Requirements: 1.1, 1.3_

  - [x] 3.2 Implement deposit calculation method
    - Add calculateDepositAmount(float $agreedPrice): array method
    - Retrieve deposit percentage from SystemSetting (default 20%)
    - Calculate deposit amount: round(agreedPrice * percentage / 100, 2)
    - Calculate remaining amount: round(agreedPrice - deposit, 2)
    - Return array with deposit_amount, remaining_amount, deposit_percentage, agreed_price
    - _Requirements: 1.1, 1.3, 1.4, 15.4_

  - [ ]* 3.3 Write property tests for deposit calculation
    - **Property 1: Deposit Calculation Accuracy**
    - **Property 30: Payment Amount Precision**
    - **Validates: Requirements 1.1, 1.3, 15.4**

  - [x] 3.4 Implement payment amount validation method
    - Add validatePaymentAmount(int $bookingId, float $amount, string $paymentType): bool method
    - Get booking from database
    - Calculate expected amount based on payment type (deposit or remaining)
    - Compare with provided amount (allow 0.01 tolerance for rounding)
    - Return true if valid, throw ValidationException if invalid
    - _Requirements: 15.1, 15.2, 15.3_

  - [ ]* 3.5 Write property test for payment validation
    - **Property 29: Payment Amount Validation**
    - **Validates: Requirements 15.1, 15.2, 15.3**

  - [x] 3.6 Implement deposit payment processing method
    - Add processDepositPayment(int $bookingId, float $amount): Payment method
    - Validate amount matches calculated deposit using validatePaymentAmount()
    - Create Payment record with payment_type = 'deposit', payment_status = 'pending'
    - Initialize Chapa payment using ChapaService
    - Store Chapa tx_ref in payment record
    - Return Payment object with checkout URL
    - _Requirements: 2.1, 2.2, 15.1_

  - [x] 3.7 Implement final payment processing method
    - Add processFinalPayment(int $bookingId, float $amount): Payment method
    - Validate amount matches remaining amount using validatePaymentAmount()
    - Create Payment record with payment_type = 'final', payment_status = 'pending'
    - Initialize Chapa payment using ChapaService
    - Store Chapa tx_ref in payment record
    - Return Payment object with checkout URL
    - _Requirements: 3.1, 3.2, 15.2_

  - [x] 3.8 Implement payment verification and completion method
    - Add verifyAndCompletePayment(string $txRef): void method
    - Verify payment with Chapa using ChapaService
    - Update payment status to 'completed' if successful, 'failed' if not
    - If deposit payment: call BookingService to update status to 'deposit_paid'
    - If final payment: call BookingService to update status to 'completed' and trigger PayoutProcessor
    - Send notifications for successful payments
    - _Requirements: 2.3, 2.4, 3.3, 3.4_

  - [ ]* 3.9 Write property tests for payment processing
    - **Property 3: Payment Type Recording**
    - **Property 31: Payment Sum Invariant**
    - **Validates: Requirements 2.2, 3.2, 15.5**


- [x] 4. Implement PayoutProcessor for hybrid payouts
  - [x] 4.1 Create PayoutProcessor class
    - Create app/Services/PayoutProcessor.php
    - Inject WalletService and NotificationService dependencies
    - Add constructor with dependency injection
    - _Requirements: 4.1, 4.4_

  - [x] 4.2 Implement hybrid payout processing method
    - Add processHybridPayout(int $bookingId, float $agreedPrice): void method
    - Validate booking exists and final payment is completed
    - Calculate 50/50 split: immediateAmount = round(agreedPrice * 0.50, 2), heldAmount = round(agreedPrice * 0.50, 2)
    - Adjust heldAmount if sum doesn't equal agreedPrice due to rounding
    - Call processImmediatePayout() with immediate amount
    - Call scheduleHeldPayout() with held amount
    - _Requirements: 4.1, 4.4, 4.5_

  - [ ]* 4.3 Write property test for payout split calculation
    - **Property 7: Hybrid Payout Split Calculation**
    - **Validates: Requirements 4.1, 4.4**

  - [x] 4.4 Implement immediate payout processing method
    - Add processImmediatePayout(int $bookingId, float $amount): void method (private)
    - Get provider from booking
    - Get or create wallet using WalletService
    - Use database transaction with row locking
    - Credit wallet available_balance by amount
    - Create WalletTransaction with transaction_type = 'immediate_payout', status = 'completed'
    - Send notification to provider
    - _Requirements: 4.2, 4.3_

  - [ ]* 4.5 Write property test for immediate payout
    - **Property 8: Immediate Payout Wallet Credit**
    - **Validates: Requirements 4.2, 4.3**

  - [x] 4.6 Implement held payout scheduling method
    - Add scheduleHeldPayout(int $bookingId, float $amount): void method (private)
    - Get provider from booking
    - Get or create wallet using WalletService
    - Calculate release_date = now() + 3 days (72 hours)
    - Use database transaction with row locking
    - Credit wallet pending_balance by amount
    - Create WalletTransaction with transaction_type = 'held_payout', status = 'pending', release_date set
    - Send notification to provider about scheduled payout
    - _Requirements: 4.5, 4.6_

  - [ ]* 4.7 Write property test for held payout scheduling
    - **Property 9: Held Payout Scheduling**
    - **Validates: Requirements 4.5, 4.6**

  - [x] 4.8 Implement held payout release method
    - Add releaseHeldPayouts(): void method
    - Query WalletTransaction where transaction_type = 'held_payout', status = 'pending', release_date <= now()
    - For each transaction: use database transaction with row locking (SELECT FOR UPDATE)
    - Move amount from pending_balance to available_balance
    - Update transaction status to 'completed'
    - Send notification to provider
    - Handle errors: log and skip locked rows, notify admin on failures
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 4.9 Write property test for held payout release
    - **Property 10: Held Payout Release Processing**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [x] 4.10 Implement payout reversal for refunds method
    - Add reversePayoutForRefund(int $bookingId): void method
    - Find immediate_payout transaction for booking
    - Use database transaction with row locking
    - Deduct amount from available_balance (check for sufficient balance)
    - Create refund_reversal transaction with negative amount
    - Find held_payout transaction if exists
    - If status = 'pending': cancel transaction, deduct from pending_balance
    - If status = 'completed': deduct from available_balance, create reversal transaction
    - Log critical error if insufficient balance, create admin task
    - _Requirements: 12.3, 12.4_

  - [ ]* 4.11 Write property test for payout reversal
    - **Property 24: Final Payment Refund Processing**
    - **Validates: Requirements 12.1-12.5**

- [ ] 5. Checkpoint - Verify payment and payout core logic
  - Ensure all tests pass, ask the user if questions arise.


- [x] 6. Implement BookingService extensions
  - [x] 6.1 Extend BookingService with deposit payment status update
    - Add updateStatusAfterDepositPayment(int $bookingId): void method
    - Update booking status to 'deposit_paid'
    - Update payment_status to 'deposit_paid'
    - Send notification to provider
    - _Requirements: 2.3, 10.2_

  - [x] 6.2 Extend BookingService with service confirmation method
    - Add confirmServiceCompletion(int $bookingId): void method
    - Update service_confirmed_at to now()
    - Calculate and set payment_deadline to now() + 48 hours
    - Update payment_status to 'pending_final'
    - Update booking status to 'service_confirmed'
    - Trigger payment reminder scheduling
    - _Requirements: 3.1, 10.3, 14.1, 14.2_

  - [x] 6.3 Extend BookingService with final payment status update
    - Add updateStatusAfterFinalPayment(int $bookingId): void method
    - Update booking status to 'completed'
    - Update payment_status to 'completed'
    - Clear payment_deadline
    - Cancel any scheduled payment reminders
    - _Requirements: 3.3, 10.4_

  - [x] 6.4 Extend BookingService with overdue payment marking
    - Add markPaymentOverdue(int $bookingId): void method
    - Update payment_status to 'overdue'
    - Trigger dispute creation via DisputeService
    - Freeze customer account via AccountService
    - Send notifications to customer and admin
    - _Requirements: 7.1, 7.2, 7.3, 14.3_

  - [ ]* 6.5 Write property tests for booking status transitions
    - **Property 4: Booking Status Transitions**
    - **Property 27: Payment Deadline Calculation**
    - **Validates: Requirements 2.3, 2.5, 3.3, 3.5, 10.1-10.4, 14.1, 14.2**

- [x] 7. Implement background jobs for automation
  - [x] 7.1 Create PaymentReminderJob
    - Create app/Jobs/PaymentReminderJob.php
    - Implement ShouldQueue interface
    - In handle() method: query bookings with payment_status = 'pending_final'
    - Find bookings 24 hours after service_confirmed_at without final payment
    - Find bookings 48 hours after service_confirmed_at without final payment
    - For each: send payment reminder notification with booking details, remaining amount, deadline
    - Skip if final payment already completed
    - Log reminder sent events
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 7.2 Write unit tests for PaymentReminderJob
    - Test 24-hour reminder is sent at correct time
    - Test 48-hour reminder is sent at correct time
    - Test reminders include correct booking details and amounts
    - Test reminders are skipped if payment completed
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.3 Create HeldPayoutReleaseJob
    - Create app/Jobs/HeldPayoutReleaseJob.php
    - Implement ShouldQueue interface
    - In handle() method: inject PayoutProcessor
    - Call PayoutProcessor->releaseHeldPayouts()
    - Log job execution summary (processed count, failed count, total amount)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 7.4 Write unit tests for HeldPayoutReleaseJob
    - Test job calls PayoutProcessor correctly
    - Test job handles errors gracefully
    - Test job logs execution summary
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 7.5 Create OverduePaymentJob
    - Create app/Jobs/OverduePaymentJob.php
    - Implement ShouldQueue interface
    - In handle() method: query bookings with payment_status = 'pending_final' and service_confirmed_at <= now() - 7 days
    - Filter out bookings with completed final payment
    - For each overdue booking: create Dispute with reason = 'non_payment'
    - Update Customer account_status to 'frozen'
    - Update booking payment_status to 'overdue'
    - Send notifications to customer and admin
    - Log overdue payment detection events
    - _Requirements: 7.1, 7.2, 7.3, 14.3, 14.5_

  - [ ]* 7.6 Write unit tests for OverduePaymentJob
    - Test dispute creation for overdue payments
    - Test customer account freezing
    - Test booking status update to 'overdue'
    - Test notifications sent correctly
    - Test job handles duplicate disputes gracefully
    - _Requirements: 7.1, 7.2, 7.3, 14.3, 14.5_

  - [x] 7.7 Register jobs in Laravel scheduler
    - Update app/Console/Kernel.php schedule() method
    - Schedule PaymentReminderJob to run hourly
    - Schedule HeldPayoutReleaseJob to run hourly
    - Schedule OverduePaymentJob to run daily at 2 AM
    - _Requirements: 5.4, 6.1, 7.1_

- [x] 8. Implement API controllers and routes
  - [x] 8.1 Create PaymentController
    - Create app/Http/Controllers/PaymentController.php
    - Inject PaymentService dependency
    - Add calculateDeposit(Request $request): JsonResponse method
    - Add processDeposit(Request $request): JsonResponse method
    - Add processFinal(Request $request): JsonResponse method
    - Add getPaymentStatus(int $bookingId): JsonResponse method
    - Add verifyCallback(Request $request): JsonResponse method
    - Add request validation for each endpoint
    - Return standardized JSON responses
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 9.5_

  - [ ]* 8.2 Write unit tests for PaymentController
    - Test calculateDeposit returns correct amounts
    - Test processDeposit validates and creates payment
    - Test processFinal validates and creates payment
    - Test getPaymentStatus returns correct booking payment info
    - Test verifyCallback processes Chapa callbacks correctly
    - Test validation errors return 422 responses
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2_


  - [x] 8.3 Create AdminController methods for deposit configuration
    - Add getDepositPercentage(): JsonResponse method to existing AdminController
    - Add updateDepositPercentage(Request $request): JsonResponse method
    - Validate percentage is between 1 and 99
    - Use SystemSetting::get() and SystemSetting::set() methods
    - Return current value and updated_at timestamp
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 8.4 Write unit tests for admin configuration endpoints
    - Test getDepositPercentage returns current value
    - Test updateDepositPercentage accepts valid values (1-99)
    - Test updateDepositPercentage rejects values < 1 with 422 error
    - Test updateDepositPercentage rejects values > 99 with 422 error
    - Test configuration changes affect subsequent calculations
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 8.5 Write property test for configuration effect
    - **Property 18: Configuration Effect on Calculations**
    - **Validates: Requirements 8.4**

  - [x] 8.6 Extend WalletController for transaction history
    - Add getTransactions(Request $request): JsonResponse method to existing WalletController
    - Support query parameters: transaction_type, transaction_status
    - Filter transactions by authenticated provider
    - Return transactions with booking details
    - Include wallet balance summary (available_balance, pending_balance, total_balance)
    - _Requirements: 13.5_

  - [ ]* 8.7 Write unit tests for wallet transaction endpoints
    - Test getTransactions returns provider's transactions only
    - Test filtering by transaction_type works correctly
    - Test filtering by transaction_status works correctly
    - Test balance summary is accurate
    - _Requirements: 13.5_

  - [ ]* 8.8 Write property test for wallet query functionality
    - **Property 26: Wallet Transaction Query Functionality**
    - **Validates: Requirements 13.5**

  - [x] 8.9 Define API routes
    - Update routes/api.php
    - Add POST /api/payments/calculate-deposit route
    - Add POST /api/payments/process-deposit route
    - Add POST /api/payments/process-final route
    - Add GET /api/payments/status/{bookingId} route
    - Add POST /api/payments/verify-callback route (public, no auth)
    - Add GET /api/admin/settings/deposit-percentage route (admin auth)
    - Add PUT /api/admin/settings/deposit-percentage route (admin auth)
    - Add GET /api/wallet/transactions route (provider auth)
    - _Requirements: 1.1, 2.1, 3.1, 8.1, 13.5_

- [x] 9. Implement refund processing
  - [x] 9.1 Add deposit refund method to PaymentService
    - Add processDepositRefund(int $bookingId, string $reason): void method
    - Validate booking has status 'deposit_paid'
    - Find deposit payment record
    - Create refund transaction linked to original payment
    - Credit customer wallet/account with deposit amount
    - Update payment status to 'refunded'
    - Send notification to customer
    - Implement retry logic for failed refunds (up to 3 attempts)
    - Notify admin if all retries fail
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 9.2 Write property test for deposit refund
    - **Property 22: Deposit Refund Processing**
    - **Property 23: Deposit Refund Retry**
    - **Validates: Requirements 11.1-11.5**

  - [x] 9.3 Add final payment refund method to PaymentService
    - Add processFinalPaymentRefund(int $bookingId, string $reason): void method
    - Validate final payment exists and is completed
    - Create refund transaction linked to original payment
    - Call PayoutProcessor->reversePayoutForRefund() to reverse provider payouts
    - Credit customer wallet/account with final payment amount
    - Update payment status to 'refunded'
    - Send notifications to both customer and provider
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 9.4 Integrate refund processing with booking cancellation
    - Update existing booking cancellation logic
    - If booking status is 'deposit_paid' and provider cancels: call processDepositRefund()
    - If booking status is 'completed' and dispute resolved in customer favor: call processFinalPaymentRefund()
    - _Requirements: 11.1, 12.1_

- [x] 10. Implement dispute and account management
  - [x] 10.1 Add automatic dispute creation for overdue payments
    - Create or extend DisputeService
    - Add createNonPaymentDispute(int $bookingId): Dispute method
    - Check if dispute already exists for booking with reason 'non_payment'
    - If not exists: create Dispute with reason = 'non_payment', status = 'open', created_by = 'system'
    - Return created or existing dispute
    - _Requirements: 7.1, 7.2_

  - [x] 10.2 Add customer account freezing functionality
    - Create or extend AccountService
    - Add freezeCustomerAccount(int $customerId, string $reason): void method
    - Update Customer account_status to 'frozen'
    - Set frozen_reason and frozen_at timestamp
    - Prevent new booking creation for frozen accounts (add validation in BookingController)
    - _Requirements: 7.3, 7.4_

  - [ ]* 10.3 Write property test for frozen account restrictions
    - **Property 15: Frozen Account Booking Prevention**
    - **Validates: Requirements 7.4**

  - [x] 10.4 Add overdue payment resolution functionality
    - Add resolveOverduePayment(int $bookingId): void method to DisputeService
    - Find open non_payment dispute for booking
    - Update dispute status to 'resolved'
    - Call AccountService to unfreeze customer account
    - Update booking status to 'completed'
    - Send notifications to customer and provider
    - _Requirements: 7.5, 7.6_

  - [ ]* 10.5 Write property test for overdue payment resolution
    - **Property 16: Overdue Payment Resolution**
    - **Validates: Requirements 7.5, 7.6**

- [ ] 11. Checkpoint - Verify complete payment flow
  - Ensure all tests pass, ask the user if questions arise.


- [x] 12. Implement notification enhancements
  - [x] 12.1 Add payment notification templates
    - Extend NotificationService with payment-specific notification types
    - Add template for 'deposit_payment_received' (to provider)
    - Add template for 'final_payment_received' (to provider)
    - Add template for 'immediate_payout_credited' (to provider)
    - Add template for 'held_payout_scheduled' (to provider)
    - Add template for 'held_payout_released' (to provider)
    - Include relevant details: amounts, booking info, dates
    - _Requirements: 2.4, 4.2, 4.5, 5.3_

  - [ ]* 12.2 Write property test for payment notifications
    - **Property 5: Payment Notification Creation**
    - **Validates: Requirements 2.4**

  - [x] 12.3 Add payment reminder notification templates
    - Add template for 'payment_reminder_24h' (to customer)
    - Add template for 'payment_reminder_48h' (to customer)
    - Include booking details, remaining amount, payment deadline, hours remaining
    - Add urgency indicators for 48-hour reminder
    - _Requirements: 6.2, 6.3, 6.4_

  - [ ]* 12.4 Write property tests for payment reminders
    - **Property 11: Payment Reminder Scheduling**
    - **Property 12: Payment Reminder Timing**
    - **Property 13: Payment Reminder Cancellation**
    - **Validates: Requirements 6.1-6.5**

  - [x] 12.5 Add overdue payment notification templates
    - Add template for 'payment_overdue' (to customer)
    - Add template for 'account_frozen' (to customer)
    - Add template for 'overdue_payment_detected' (to admin)
    - Add template for 'overdue_payment_resolved' (to customer and provider)
    - Include dispute details, account status, resolution steps
    - _Requirements: 7.1, 7.3, 7.5, 14.5_

  - [ ]* 12.6 Write property test for overdue payment detection
    - **Property 14: Overdue Payment Dispute Creation**
    - **Property 28: Overdue Payment Detection**
    - **Validates: Requirements 7.1-7.3, 14.3, 14.5**

  - [x] 12.7 Add refund notification templates
    - Add template for 'deposit_refund_processed' (to customer)
    - Add template for 'final_payment_refund_processed' (to customer)
    - Add template for 'payout_reversed' (to provider)
    - Include refund amounts, reasons, processing dates
    - _Requirements: 11.4, 12.5_

- [ ] 13. Frontend integration - Customer app
  - [x] 13.1 Create deposit payment page component
    - Create component to display deposit amount and remaining amount after booking acceptance
    - Show breakdown: "Deposit (20%): X ETB, Remaining: Y ETB, Total: Z ETB"
    - Add "Pay Deposit" button that calls /api/payments/process-deposit
    - Redirect to Chapa checkout URL on success
    - Handle payment callback and show success/failure message
    - _Requirements: 1.2, 2.1_

  - [x] 13.2 Create final payment page component
    - Create component to display remaining amount after service confirmation
    - Show payment deadline (48 hours countdown)
    - Add "Pay Remaining Amount" button that calls /api/payments/process-final
    - Redirect to Chapa checkout URL on success
    - Handle payment callback and show success/failure message
    - _Requirements: 3.1, 14.1_

  - [x] 13.3 Update booking status display
    - Update booking list and detail views to show payment_status
    - Display status badges: "Pending Deposit", "Deposit Paid", "Pending Final Payment", "Completed", "Overdue"
    - Show payment deadline countdown for pending final payments
    - Add payment action buttons based on current status
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 13.4 Add payment reminder notifications UI
    - Integrate with existing notification system
    - Display payment reminder notifications with urgency indicators
    - Add quick action button to navigate to payment page
    - Show countdown to payment deadline
    - _Requirements: 6.2, 6.3, 6.4_

  - [x] 13.5 Add overdue payment and account frozen UI
    - Display account frozen banner when customer account is frozen
    - Show message: "Your account is frozen due to overdue payment. Please complete payment to restore access."
    - Add link to overdue booking payment page
    - Prevent new booking creation with clear error message
    - _Requirements: 7.3, 7.4_

- [ ] 14. Frontend integration - Provider app
  - [x] 14.1 Update wallet display with payout breakdown
    - Update wallet component to show available_balance and pending_balance separately
    - Display: "Available Balance: X ETB (can withdraw)", "Pending Balance: Y ETB (held for 3 days)"
    - Show total balance: available + pending
    - _Requirements: 4.2, 4.5_

  - [x] 14.2 Create wallet transaction history page
    - Create page that calls /api/wallet/transactions
    - Display transaction list with type, amount, status, date
    - Add filters for transaction_type (immediate_payout, held_payout, withdrawal, etc.)
    - Add filters for transaction_status (pending, completed, cancelled)
    - Show release_date for held payouts with countdown
    - Link transactions to related bookings
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 14.3 Add payout notification display
    - Integrate with existing notification system
    - Display immediate payout notifications: "You received X ETB for booking #Y"
    - Display held payout notifications: "X ETB will be released on [date] for booking #Y"
    - Display held payout release notifications: "X ETB has been released to your wallet"
    - _Requirements: 4.2, 4.5, 5.3_

  - [x] 14.4 Update booking detail view with payment info
    - Show deposit payment status and amount
    - Show final payment status and amount
    - Show payout breakdown: immediate (50%) and held (50%)
    - Display payout release date for held amount
    - _Requirements: 4.1, 4.4, 4.5_


- [ ] 15. Frontend integration - Admin panel
  - [x] 15.1 Create deposit percentage configuration page
    - Create admin settings page for deposit percentage
    - Display current deposit percentage value
    - Add form input to update percentage (1-99 range validation)
    - Call GET /api/admin/settings/deposit-percentage to load current value
    - Call PUT /api/admin/settings/deposit-percentage to update
    - Show success message on update
    - Display validation errors for invalid values
    - Show last updated timestamp
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 15.2 Add payment analytics dashboard
    - Create dashboard showing split payment metrics
    - Display: total deposit payments, total final payments, average time to final payment
    - Show overdue payment count and list
    - Display held payout total and release schedule
    - Add date range filters
    - _Requirements: 9.5, 14.3, 14.5_

  - [x] 15.3 Add overdue payment management interface
    - Create page listing all overdue payments
    - Show booking details, customer info, days overdue, amount owed
    - Display dispute status and account freeze status
    - Add manual resolution actions (mark as paid, cancel dispute, unfreeze account)
    - _Requirements: 7.1, 7.2, 7.3, 14.5_

- [ ] 16. Integration testing and end-to-end flows
  - [ ]* 16.1 Write integration test for complete deposit payment flow
    - Test: Provider accepts booking → Customer pays deposit → Booking status updates → Provider notified
    - Verify database state at each step
    - Verify notifications sent correctly
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4_

  - [ ]* 16.2 Write integration test for complete final payment and payout flow
    - Test: Customer confirms service → Customer pays final → Booking completes → Hybrid payout processed → Held payout released after 3 days
    - Verify wallet balances at each step
    - Verify transaction records created correctly
    - Verify notifications sent at each stage
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1-4.6, 5.1-5.3_

  - [ ]* 16.3 Write integration test for payment reminder flow
    - Test: Service confirmed → 24h passes → First reminder sent → 48h passes → Second reminder sent → Payment completed → Reminders cancelled
    - Use time manipulation to simulate passage of time
    - Verify reminders sent at correct times
    - Verify reminders cancelled after payment
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 16.4 Write integration test for overdue payment flow
    - Test: Service confirmed → 7 days pass → Dispute created → Account frozen → Payment completed → Dispute resolved → Account unfrozen
    - Use time manipulation to simulate passage of time
    - Verify dispute creation and resolution
    - Verify account freeze and unfreeze
    - Verify booking cannot be created while frozen
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 16.5 Write integration test for deposit refund flow
    - Test: Deposit paid → Provider cancels booking → Refund processed → Customer credited → Notification sent
    - Verify refund transaction created
    - Verify customer balance updated
    - Test refund retry on failure
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 16.6 Write integration test for final payment refund with payout reversal
    - Test: Final payment completed → Payouts processed → Dispute resolved in customer favor → Refund processed → Payouts reversed
    - Verify immediate payout reversed from available balance
    - Verify held payout cancelled if pending or reversed if released
    - Verify customer credited with full amount
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 16.7 Write integration test for configuration change propagation
    - Test: Update deposit percentage → Create new booking → Verify new percentage used in calculation
    - Test multiple percentage changes
    - Verify existing bookings not affected
    - _Requirements: 8.2, 8.3, 8.4_

- [ ] 17. Error handling and edge cases
  - [ ]* 17.1 Write tests for payment processing errors
    - Test Chapa gateway timeout and retry logic
    - Test network errors during payment verification
    - Test invalid Chapa responses
    - Test duplicate payment attempts
    - Test payment for cancelled bookings
    - Verify appropriate error messages returned
    - _Requirements: 2.5, 3.5_

  - [ ]* 17.2 Write tests for amount validation errors
    - Test deposit amount mismatch rejection
    - Test final amount mismatch rejection
    - Test negative amount rejection
    - Test precision handling (rounding to 2 decimals)
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [ ]* 17.3 Write tests for payout processing errors
    - Test wallet credit failure and retry
    - Test wallet not found (auto-creation)
    - Test negative balance after refund reversal
    - Test database transaction rollback
    - Test concurrent payout processing (race conditions)
    - _Requirements: 4.2, 4.3, 12.3, 12.4_

  - [ ]* 17.4 Write tests for background job error handling
    - Test held payout release with database lock timeout
    - Test payment reminder for already-paid booking
    - Test overdue payment job with duplicate disputes
    - Test notification failures don't block processing
    - _Requirements: 5.1, 6.5, 7.1_

- [ ] 18. Performance optimization and monitoring
  - [ ] 18.1 Add database indexes verification
    - Verify indexes exist on payments(bookingID, payment_type)
    - Verify indexes exist on wallet_transactions(transaction_type, transaction_status, release_date)
    - Verify indexes exist on bookings(payment_status, service_confirmed_at)
    - Run EXPLAIN on critical queries to verify index usage
    - _Requirements: 9.5, 13.5, 14.3_

  - [ ] 18.2 Implement caching for system settings
    - Add cache layer for SystemSetting::get() method
    - Cache deposit percentage in memory (refresh every 5 minutes)
    - Invalidate cache on SystemSetting::set()
    - _Requirements: 1.3, 1.4, 8.4_

  - [ ] 18.3 Add logging and monitoring
    - Add structured logging for all payment transactions
    - Log payment amount validation failures
    - Log payout processing events (immediate, held, release)
    - Log refund operations with reasons
    - Log background job execution summaries
    - Add metrics: payment success rate, average payout time, overdue payment count
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 18.4 Add alerting for critical events
    - Configure alerts for negative wallet balance
    - Configure alerts for held payout release job failures
    - Configure alerts for payment amount validation failure spikes
    - Configure alerts for refund reversal insufficient balance
    - Configure alerts for overdue payment count > 10 per day
    - _Requirements: 5.1, 7.1, 12.3, 15.1_


- [ ] 19. Documentation and deployment preparation
  - [ ] 19.1 Create API documentation
    - Document all new API endpoints with request/response examples
    - Include authentication requirements
    - Document error codes and messages
    - Add Postman collection or OpenAPI/Swagger spec
    - _Requirements: All API endpoints_

  - [ ] 19.2 Create database migration guide
    - Document migration execution order
    - Document rollback procedures
    - Document data migration for existing bookings
    - Include backup recommendations
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 19.3 Create admin configuration guide
    - Document how to configure deposit percentage
    - Document recommended percentage ranges
    - Document how to monitor overdue payments
    - Document manual intervention procedures
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 19.4 Create deployment checklist
    - List all environment variables needed
    - List all queue workers that need to be running
    - List all scheduled jobs and their frequencies
    - Document Chapa webhook configuration
    - Document monitoring and alerting setup
    - _Requirements: All background jobs and external integrations_

  - [ ] 19.5 Update user documentation
    - Document new payment flow for customers (deposit + final)
    - Document new payout model for providers (immediate + held)
    - Document payment deadlines and reminders
    - Document overdue payment consequences
    - Create FAQ section
    - _Requirements: All user-facing features_

- [ ] 20. Final checkpoint and system validation
  - [ ] 20.1 Run complete test suite
    - Execute all unit tests
    - Execute all property-based tests
    - Execute all integration tests
    - Verify test coverage meets minimum 90% for service classes
    - _Requirements: All requirements_

  - [ ] 20.2 Perform manual testing on staging environment
    - Test complete deposit payment flow end-to-end
    - Test complete final payment and payout flow end-to-end
    - Test payment reminders with time manipulation
    - Test overdue payment handling
    - Test refund flows (deposit and final)
    - Test admin configuration changes
    - Test all frontend components
    - _Requirements: All requirements_

  - [ ] 20.3 Verify background jobs are running
    - Confirm PaymentReminderJob runs hourly
    - Confirm HeldPayoutReleaseJob runs hourly
    - Confirm OverduePaymentJob runs daily at 2 AM
    - Check job logs for errors
    - _Requirements: 5.4, 6.1, 7.1_

  - [ ] 20.4 Verify monitoring and alerting
    - Confirm all critical alerts are configured
    - Test alert delivery (email, Slack, etc.)
    - Verify metrics are being collected
    - Check dashboard displays correct data
    - _Requirements: All monitoring requirements_

  - [ ] 20.5 Final code review and cleanup
    - Review all code for security issues
    - Remove debug logging and commented code
    - Verify error messages don't expose sensitive data
    - Check for SQL injection vulnerabilities
    - Verify input validation on all endpoints
    - _Requirements: All security requirements_

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints (tasks 5, 11, 20) ensure incremental validation before proceeding
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate complete user flows across multiple components
- The implementation follows Laravel best practices and integrates with existing infrastructure
- All payment amounts use 2 decimal precision to prevent rounding errors
- Database transactions with row locking prevent race conditions in wallet operations
- Background jobs are idempotent and can be safely retried on failure
- Notifications are non-blocking and don't prevent payment/payout processing
- The system maintains backward compatibility with existing single-payment bookings

## Implementation Order Rationale

1. **Phase 1-2 (Tasks 1-2)**: Database schema and models provide the foundation
2. **Phase 3-4 (Tasks 3-4)**: Core payment and payout logic implements business rules
3. **Phase 5 (Task 5)**: Checkpoint to verify core logic before building on it
4. **Phase 6-7 (Tasks 6-7)**: Booking service and background jobs add automation
5. **Phase 8-10 (Tasks 8-10)**: API layer and supporting services complete backend
6. **Phase 11 (Task 11)**: Checkpoint to verify complete backend before frontend
7. **Phase 12-15 (Tasks 12-15)**: Notifications and frontend complete user experience
8. **Phase 16-18 (Tasks 16-18)**: Testing, error handling, and optimization ensure quality
9. **Phase 19-20 (Tasks 19-20)**: Documentation and final validation prepare for deployment

Each phase builds on previous phases, ensuring no orphaned code and enabling incremental testing and validation.
