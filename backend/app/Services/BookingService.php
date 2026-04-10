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
     * 
     * @param int $bookingId
     * @return void
     */
    public function confirmServiceCompletion(int $bookingId): void
    {
        $booking = Booking::findOrFail($bookingId);
        
        $booking->service_confirmed_at = now();
        $booking->payment_deadline = now()->addHours(48);
        $booking->payment_status = 'pending_final';
        $booking->status = 'service_confirmed';
        $booking->save();
        
        Log::info('Service completion confirmed', [
            'booking_id' => $bookingId,
            'payment_deadline' => $booking->payment_deadline
        ]);
        
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
