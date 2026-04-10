<?php

namespace App\Services;

use App\Models\Dispute;
use App\Models\Booking;
use App\Models\Customer;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;

class DisputeService
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Create dispute for non-payment
     * 
     * @param int $bookingId
     * @return Dispute
     */
    public function createNonPaymentDispute(int $bookingId): Dispute
    {
        $booking = Booking::findOrFail($bookingId);
        
        // Check if dispute already exists
        $existingDispute = Dispute::where('bookingID', $bookingId)
            ->where('reason', 'non_payment')
            ->first();
        
        if ($existingDispute) {
            Log::info('Non-payment dispute already exists', [
                'booking_id' => $bookingId,
                'dispute_id' => $existingDispute->disputeID
            ]);
            return $existingDispute;
        }
        
        // Create new dispute
        $dispute = Dispute::create([
            'bookingID' => $bookingId,
            'customerID' => $booking->customerID,
            'providerID' => $booking->providerID,
            'reason' => 'non_payment',
            'description' => 'Customer failed to complete final payment within 7 days of service confirmation. System-generated dispute.',
            'status' => 'open',
            'created_by' => 'system'
        ]);
        
        Log::info('Non-payment dispute created', [
            'booking_id' => $bookingId,
            'dispute_id' => $dispute->disputeID
        ]);
        
        return $dispute;
    }

    /**
     * Resolve overdue payment dispute
     * 
     * @param int $bookingId
     * @return void
     */
    public function resolveOverduePayment(int $bookingId): void
    {
        $booking = Booking::with('customer')->findOrFail($bookingId);
        
        // Find open non_payment dispute
        $dispute = Dispute::where('bookingID', $bookingId)
            ->where('reason', 'non_payment')
            ->where('status', 'open')
            ->first();
        
        if ($dispute) {
            $dispute->status = 'resolved';
            $dispute->resolved_at = now();
            $dispute->save();
            
            Log::info('Overdue payment dispute resolved', [
                'booking_id' => $bookingId,
                'dispute_id' => $dispute->disputeID
            ]);
        }
        
        // Unfreeze customer account
        $accountService = app(AccountService::class);
        $accountService->unfreezeCustomerAccount($booking->customerID);
        
        // Update booking status
        $booking->payment_status = 'completed';
        $booking->save();
        
        // Send notifications
        $this->notificationService->toCustomer(
            $booking->customerID,
            'overdue_payment_resolved',
            'Payment Received - Account Restored',
            'Your payment for booking #' . $bookingId . ' has been received. Your account has been restored.',
            [
                'booking_id' => $bookingId
            ],
            $bookingId
        );
        
        $this->notificationService->toProvider(
            $booking->providerID,
            'overdue_payment_resolved',
            'Payment Received',
            'Customer has completed payment for booking #' . $bookingId . '.',
            [
                'booking_id' => $bookingId
            ],
            $bookingId
        );
    }
}
