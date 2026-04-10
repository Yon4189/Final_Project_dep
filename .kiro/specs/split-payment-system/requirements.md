# Requirements Document

## Introduction

The Split Payment System modifies the existing payment flow in a service marketplace application to support two-phase payments: an initial deposit when booking is accepted, and a final payment after service completion. The system implements a hybrid payout model where providers receive 50% of the total payment immediately upon final payment, with the remaining 50% held for 3 days before release. This feature includes configurable deposit percentages, automated payment reminders, and non-payment handling mechanisms.

## Glossary

- **Payment_System**: The component responsible for processing customer payments and managing payment transactions
- **Booking_Manager**: The component that manages booking lifecycle and status transitions
- **Wallet_Service**: The component that manages provider wallet balances and transactions
- **Payout_Processor**: The component that handles provider payouts and fund releases
- **Notification_Service**: The component that sends notifications and reminders to users
- **Admin_Configuration**: The component that manages system-wide configurable settings
- **Deposit_Payment**: The initial payment made by customer when provider accepts booking (default 20% of agreed price)
- **Final_Payment**: The remaining payment made by customer after service completion confirmation
- **Immediate_Payout**: The 50% of total payment released to provider wallet immediately upon final payment
- **Held_Payout**: The 50% of total payment held for 3 days before release to provider wallet
- **Agreed_Price**: The total service price agreed upon between customer and provider
- **Payment_Reminder**: A notification sent to customer regarding pending payment obligation
- **Overdue_Payment**: A final payment not completed within 48 hours of service confirmation
- **Dispute_Manager**: The component that creates and manages disputes
- **Account_Manager**: The component that manages customer account status and restrictions

## Requirements

### Requirement 1: Deposit Calculation and Display

**User Story:** As a customer, I want to see the deposit amount when booking a service, so that I know how much I need to pay upfront.

#### Acceptance Criteria

1. WHEN a customer enters an agreed price for a booking, THE Payment_System SHALL calculate the deposit amount as 20% of the agreed price
2. WHEN the deposit amount is calculated, THE Booking_Manager SHALL display both the deposit amount and the remaining amount to the customer
3. THE Payment_System SHALL retrieve the deposit percentage from Admin_Configuration settings
4. WHEN the deposit percentage is not configured, THE Payment_System SHALL use 20% as the default value

### Requirement 2: Deposit Payment Processing

**User Story:** As a customer, I want to pay only a deposit when the provider accepts my booking, so that I can secure the service without paying the full amount upfront.

#### Acceptance Criteria

1. WHEN a provider accepts a booking, THE Payment_System SHALL redirect the customer to pay the deposit amount
2. WHEN the customer completes the deposit payment, THE Payment_System SHALL record a payment transaction with payment_type set to "deposit"
3. WHEN the deposit payment is successful, THE Booking_Manager SHALL update the booking status to "deposit_paid"
4. WHEN the deposit payment is successful, THE Notification_Service SHALL notify the provider that the deposit has been received
5. IF the deposit payment fails, THEN THE Booking_Manager SHALL keep the booking status as "accepted" and allow payment retry

### Requirement 3: Final Payment Processing

**User Story:** As a customer, I want to pay the remaining amount after confirming service completion, so that I only pay for services that have been delivered.

#### Acceptance Criteria

1. WHEN a customer confirms service completion, THE Payment_System SHALL redirect the customer to pay the remaining amount
2. WHEN the customer completes the final payment, THE Payment_System SHALL record a payment transaction with payment_type set to "final"
3. WHEN the final payment is successful, THE Booking_Manager SHALL update the booking status to "completed"
4. WHEN the final payment is successful, THE Payout_Processor SHALL initiate the hybrid payout process
5. IF the final payment fails, THEN THE Booking_Manager SHALL keep the booking status as "service_confirmed" and allow payment retry

### Requirement 4: Hybrid Payout Processing

**User Story:** As a provider, I want to receive 50% of my payment immediately after the customer pays, so that I have quick access to part of my earnings.

#### Acceptance Criteria

1. WHEN the final payment is successful, THE Payout_Processor SHALL calculate the immediate payout as 50% of the agreed price
2. WHEN the immediate payout is calculated, THE Wallet_Service SHALL credit the provider wallet with the immediate payout amount
3. WHEN the immediate payout is credited, THE Wallet_Service SHALL record a wallet transaction with transaction_type set to "immediate_payout"
4. WHEN the immediate payout is processed, THE Payout_Processor SHALL calculate the held payout as 50% of the agreed price
5. WHEN the held payout is calculated, THE Payout_Processor SHALL schedule the held payout for release after 3 days
6. WHEN the held payout is scheduled, THE Wallet_Service SHALL record a pending wallet transaction with transaction_type set to "held_payout" and release_date set to 3 days from current date

### Requirement 5: Held Payout Release

**User Story:** As a provider, I want to receive the remaining 50% of my payment after 3 days, so that I can access my full earnings after the hold period.

#### Acceptance Criteria

1. WHEN the release date for a held payout is reached, THE Payout_Processor SHALL credit the provider wallet with the held payout amount
2. WHEN the held payout is credited, THE Wallet_Service SHALL update the wallet transaction status from "pending" to "completed"
3. WHEN the held payout is released, THE Notification_Service SHALL notify the provider that the held funds have been released
4. THE Payout_Processor SHALL process held payout releases at least once every 24 hours

### Requirement 6: Payment Reminder System

**User Story:** As a system administrator, I want customers to receive payment reminders, so that they complete their final payments on time.

#### Acceptance Criteria

1. WHEN a customer confirms service completion without completing final payment, THE Notification_Service SHALL schedule payment reminders
2. WHEN 24 hours have passed since service confirmation without final payment, THE Notification_Service SHALL send the first payment reminder to the customer
3. WHEN 48 hours have passed since service confirmation without final payment, THE Notification_Service SHALL send the second payment reminder to the customer
4. WHEN a payment reminder is sent, THE Notification_Service SHALL include the booking details, remaining amount, and payment deadline
5. WHEN the customer completes the final payment, THE Notification_Service SHALL cancel any scheduled payment reminders for that booking

### Requirement 7: Overdue Payment Handling

**User Story:** As a system administrator, I want overdue payments to trigger automatic actions, so that non-payment issues are addressed systematically.

#### Acceptance Criteria

1. WHEN 7 days have passed since service confirmation without final payment, THE Dispute_Manager SHALL automatically create a dispute for the booking
2. WHEN an overdue payment dispute is created, THE Dispute_Manager SHALL set the dispute reason to "non_payment"
3. WHEN an overdue payment dispute is created, THE Account_Manager SHALL freeze the customer account
4. WHEN a customer account is frozen, THE Account_Manager SHALL prevent the customer from creating new bookings
5. WHEN the customer completes the overdue final payment, THE Dispute_Manager SHALL automatically resolve the dispute
6. WHEN the overdue payment dispute is resolved, THE Account_Manager SHALL unfreeze the customer account

### Requirement 8: Admin Deposit Configuration

**User Story:** As an administrator, I want to configure the deposit percentage, so that I can adjust the payment structure based on business needs.

#### Acceptance Criteria

1. WHERE the admin configuration interface is available, THE Admin_Configuration SHALL allow administrators to set the deposit percentage
2. WHEN an administrator updates the deposit percentage, THE Admin_Configuration SHALL validate that the value is between 1 and 99
3. WHEN an administrator updates the deposit percentage, THE Admin_Configuration SHALL save the new value to system settings
4. WHEN the deposit percentage is updated, THE Payment_System SHALL use the new percentage for all subsequent booking calculations
5. THE Admin_Configuration SHALL display the current deposit percentage value to administrators

### Requirement 9: Payment Transaction Tracking

**User Story:** As a system administrator, I want to track all payment transactions with their types and phases, so that I can audit and reconcile payments accurately.

#### Acceptance Criteria

1. WHEN a payment transaction is recorded, THE Payment_System SHALL store the payment_type field with value "deposit" or "final"
2. WHEN a payment transaction is recorded, THE Payment_System SHALL store the booking_id to link the payment to the booking
3. WHEN a payment transaction is recorded, THE Payment_System SHALL store the amount, payment_method, and transaction_timestamp
4. WHEN a payment transaction is recorded, THE Payment_System SHALL store the payment_status with value "pending", "completed", or "failed"
5. THE Payment_System SHALL allow querying payment transactions by booking_id, payment_type, and payment_status

### Requirement 10: Booking Status Management

**User Story:** As a developer, I want booking statuses to reflect the payment state, so that the system can track booking progress accurately.

#### Acceptance Criteria

1. WHEN a provider accepts a booking, THE Booking_Manager SHALL set the booking status to "accepted"
2. WHEN the deposit payment is completed, THE Booking_Manager SHALL set the booking status to "deposit_paid"
3. WHEN the customer confirms service completion, THE Booking_Manager SHALL set the booking status to "service_confirmed"
4. WHEN the final payment is completed, THE Booking_Manager SHALL set the booking status to "completed"
5. THE Booking_Manager SHALL allow querying bookings by payment status

### Requirement 11: Refund Processing for Deposit

**User Story:** As a customer, I want to receive a refund of my deposit if the service is cancelled, so that I don't lose money for services not delivered.

#### Acceptance Criteria

1. WHEN a booking with status "deposit_paid" is cancelled by the provider, THE Payment_System SHALL initiate a refund for the deposit amount
2. WHEN a deposit refund is initiated, THE Payment_System SHALL record a refund transaction linked to the original deposit payment
3. WHEN the deposit refund is successful, THE Wallet_Service SHALL credit the customer account with the deposit amount
4. WHEN the deposit refund is successful, THE Notification_Service SHALL notify the customer that the refund has been processed
5. IF the deposit refund fails, THEN THE Payment_System SHALL retry the refund and notify administrators of the failure

### Requirement 12: Refund Processing for Final Payment

**User Story:** As a customer, I want to receive a refund if there's a dispute resolution in my favor after final payment, so that I'm protected from poor service quality.

#### Acceptance Criteria

1. WHEN a dispute is resolved in favor of the customer after final payment, THE Payment_System SHALL initiate a refund for the final payment amount
2. WHEN a final payment refund is initiated, THE Payment_System SHALL record a refund transaction linked to the original final payment
3. WHEN a final payment refund is successful, THE Payout_Processor SHALL reverse any immediate payout that was credited to the provider
4. WHEN a final payment refund is successful, THE Payout_Processor SHALL cancel any pending held payout for the provider
5. WHEN the final payment refund is successful, THE Notification_Service SHALL notify both customer and provider of the refund

### Requirement 13: Wallet Transaction Tracking

**User Story:** As a provider, I want to see detailed transaction history in my wallet, so that I can track my immediate and held payouts.

#### Acceptance Criteria

1. WHEN a wallet transaction is recorded, THE Wallet_Service SHALL store the transaction_type field with value "immediate_payout" or "held_payout"
2. WHEN a held payout transaction is recorded, THE Wallet_Service SHALL store the release_date field
3. WHEN a wallet transaction is recorded, THE Wallet_Service SHALL store the booking_id to link the transaction to the booking
4. WHEN a wallet transaction is recorded, THE Wallet_Service SHALL store the amount, transaction_status, and transaction_timestamp
5. THE Wallet_Service SHALL allow providers to query their wallet transactions by transaction_type and transaction_status

### Requirement 14: Payment Deadline Enforcement

**User Story:** As a system administrator, I want payment deadlines to be enforced automatically, so that the payment process is consistent and predictable.

#### Acceptance Criteria

1. WHEN a customer confirms service completion, THE Payment_System SHALL set a payment deadline of 48 hours from confirmation time
2. WHEN the payment deadline is set, THE Booking_Manager SHALL store the deadline_timestamp in the booking record
3. WHEN the current time exceeds the payment deadline without final payment, THE Payment_System SHALL mark the payment as overdue
4. THE Payment_System SHALL check for overdue payments at least once every 24 hours
5. WHEN a payment becomes overdue, THE Notification_Service SHALL notify system administrators

### Requirement 15: Payment Amount Validation

**User Story:** As a developer, I want payment amounts to be validated against booking amounts, so that payment integrity is maintained.

#### Acceptance Criteria

1. WHEN a deposit payment is processed, THE Payment_System SHALL validate that the payment amount equals the calculated deposit amount
2. WHEN a final payment is processed, THE Payment_System SHALL validate that the payment amount equals the calculated remaining amount
3. IF a payment amount does not match the expected amount, THEN THE Payment_System SHALL reject the payment and return an error message
4. WHEN payment amounts are calculated, THE Payment_System SHALL round amounts to 2 decimal places
5. THE Payment_System SHALL ensure that deposit amount plus final payment amount equals the agreed price

