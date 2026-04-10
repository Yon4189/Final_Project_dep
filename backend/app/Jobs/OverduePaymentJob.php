<?php

namespace App\Jobs;

use App\Models\Booking;
use App\Models\Customer;
use App\Models\Dispute;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OverduePaymentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $notificationService = app(NotificationService::class);
        
        // Find bookings with payment overdue (7 days after service confirmation)
        $overdueBookings = Booking::where('payment_status', 'pending_final')
            ->whereNotNull('service_confirmed_at')
            ->where('service_confirmed_at', '<=', now()->subDays(7))
            ->get();
        
        $processedCount = 0;
        
        foreach ($overdueBookings as $booking) {
            // Check if final payment already completed
            $finalPayment = $booking->finalPayment;
            if ($finalPayment && $finalPayment->payment_status === 'completed') {
                continue; // Skip if already paid
            }
            
            try {
                DB::transaction(function () use ($booking, $notificationService, &$processedCount) {
                    // Check if dispute already exists
                    $existingDispute = Dispute::where('bookingID', $booking->bookingID)
                        ->where('reason', 'non_payment')
                        ->first();
                    
                    if (!$existingDispute) {
                        // Create dispute
                        Dispute::create([
                            'bookingID' => $booking->bookingID,
                            'customerID' => $booking->customerID,
                            'providerID' => $booking->providerID,
                            'reason' => 'non_payment',
                            'description' => 'Customer failed to complete final payment within 7 days of service confirmation.',
                            'status' => 'open',
                            'created_by' => 'system'
                        ]);
                        
                        Log::info('Dispute created for non-payment', [
                            'booking_id' => $booking->bookingID
                        ]);
                    }
                    
                    // Freeze customer account
                    $customer = Customer::find($booking->customerID);
                    if ($customer) {
                        $customer->account_status = 'frozen';
                        $customer->frozen_reason = 'Non-payment for booking #' . $booking->bookingID;
                        $customer->frozen_at = now();
                        $customer->save();
                        
                        Log::info('Customer account frozen', [
                            'customer_id' => $customer->customerID,
                            'booking_id' => $booking->bookingID
                        ]);
                    }
                    
                    // Update booking status
                    $booking->payment_status = 'overdue';
                    $booking->save();
                    
                    // Send notification to customer
                    $notificationService->toCustomer(
                        $booking->customerID,
                        'payment_overdue',
                        'Account Frozen - Payment Overdue',
                        'Your account has been frozen due to non-payment for booking #' . $booking->bookingID . '. Please complete payment immediately to restore access.',
                        [
                            'booking_id' => $booking->bookingID,
                            'account_status' => 'frozen',
                            'overdue_days' => 7
                        ],
                        $booking->bookingID
                    );
                    
                    // Send notification to admin
                    $notificationService->toAdmins(
                        'overdue_payment_detected',
                        'Overdue Payment Detected',
                        'Booking #' . $booking->bookingID . ' payment is overdue. Customer account has been frozen.',
                        [
                            'booking_id' => $booking->bookingID,
                            'customer_id' => $booking->customerID,
                            'days_overdue' => 7
                        ]
                    );
                    
                    $processedCount++;
                });
                
            } catch (\Exception $e) {
                Log::error('Failed to process overdue payment', [
                    'booking_id' => $booking->bookingID,
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        Log::info('Overdue payment job completed', [
            'processed' => $processedCount,
            'total_overdue' => $overdueBookings->count()
        ]);
    }
}
