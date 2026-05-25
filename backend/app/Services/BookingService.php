<?php

namespace App\Services;

use App\Models\Booking;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;

class BookingService
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Update booking status after deposit payment
     * 
     * @param int $bookingId
     * @return void
     */
    public function updateStatusAfterDepositPayment(int $bookingId): void
    {
        $booking = Booking::with('provider')->findOrFail($bookingId);
        
        $booking->payment_status = 'deposit_paid';
        $booking->save();
        
        // Send notification to provider
        $this->notificationService->toProvider(
            $booking->providerID,
            'deposit_payment_received',
            'Deposit Payment Received',
            'Customer has paid the deposit for booking #' . $bookingId . '. You can now proceed with the service.',
            [
                'booking_id' => $bookingId,
                'payment_type' => 'deposit'
            ],
            $bookingId
        );
        
        Log::info('Booking status updated after deposit payment', [
            'booking_id' => $bookingId,
            'payment_status' => 'deposit_paid'
        ]);
    }

    /**
     * Confirm service completion (customer confirms)
     * Sets payment deadline to 48 hours from now
     * Triggers deposit payout to provider
     * 
     * @param int $bookingId
     * @return void
     */
    public function confirmServiceCompletion(int $bookingId): void
    {
        $booking = Booking::with('depositPayment')->findOrFail($bookingId);
        
        $booking->service_confirmed_at = now();
        $booking->payment_deadline = now()->addHours(48);
        $booking->payment_status = 'pending_final';
        $booking->status = 'service_confirmed';
        $booking->save();
        
        // Process deposit payout to provider (after commission)
        $depositPayment = $booking->depositPayment;
        if ($depositPayment && $depositPayment->payment_status === 'completed') {
            $paymentService = app(\App\Services\PaymentService::class);
            $payoutProcessor = app(\App\Services\PayoutProcessor::class);
            
            // Calculate commission on deposit
            $commission = $paymentService->calculateCommission($depositPayment->amount);
            
            // Pay provider the net amount (deposit minus commission)
            $payoutProcessor->processDepositPayout(
                $bookingId,
                $commission['provider_amount']
            );
            
            Log::info('Service completion confirmed and deposit payout processed', [
                'booking_id' => $bookingId,
                'payment_deadline' => $booking->payment_deadline,
                'deposit_amount' => $depositPayment->amount,
                'commission_amount' => $commission['commission_amount'],
                'provider_payout' => $commission['provider_amount']
            ]);
        } else {
            Log::warning('Service confirmed but deposit payment not found or not completed', [
                'booking_id' => $bookingId
            ]);
        }
        
        // Payment reminder will be triggered by background job
    }

    /**
     * Update booking status after final payment
     * 
     * @param int $bookingId
     * @return void
     */
    public function updateStatusAfterFinalPayment(int $bookingId): void
    {
        $booking = Booking::findOrFail($bookingId);
        
        $booking->status = 'completed';
        $booking->payment_status = 'completed';
        $booking->payment_deadline = null;
        $booking->save();
        
        Log::info('Booking status updated after final payment', [
            'booking_id' => $bookingId,
            'payment_status' => 'completed'
        ]);
        
        // Cancel any scheduled payment reminders
        // TODO: Implement reminder cancellation if needed
    }

    /**
     * Mark payment as overdue
     * Creates dispute and freezes customer account
     * 
     * @param int $bookingId
     * @return void
     */
    public function markPaymentOverdue(int $bookingId): void
    {
        $booking = Booking::with('customer')->findOrFail($bookingId);
        
        $booking->payment_status = 'overdue';
        $booking->save();
        
        // Trigger dispute creation
        $disputeService = app(\App\Services\DisputeService::class);
        $disputeService->createNonPaymentDispute($bookingId);
        
        // Freeze customer account
        $accountService = app(\App\Services\AccountService::class);
        $accountService->freezeCustomerAccount(
            $booking->customerID,
            'Non-payment for booking #' . $bookingId
        );
        
        // Send notifications
        $this->notificationService->toCustomer(
            $booking->customerID,
            'payment_overdue',
            'Payment Overdue',
            'Your payment for booking #' . $bookingId . ' is overdue. Please complete payment immediately to avoid account suspension.',
            [
                'booking_id' => $bookingId,
                'overdue_days' => 7
            ],
            $bookingId
        );
        
        $this->notificationService->toAdmins(
            'overdue_payment_detected',
            'Overdue Payment Detected',
            'Booking #' . $bookingId . ' payment is overdue by 7 days.',
            [
                'booking_id' => $bookingId,
                'customer_id' => $booking->customerID
            ]
        );
        
        Log::warning('Payment marked as overdue', [
            'booking_id' => $bookingId,
            'customer_id' => $booking->customerID
        ]);
    }
}
