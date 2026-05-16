<?php

namespace App\Jobs;

use App\Models\Booking;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class PaymentReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $notificationService = app(NotificationService::class);
        
        // Find bookings pending final payment
        $pendingBookings = Booking::where('payment_status', 'pending_final')
            ->whereNotNull('service_confirmed_at')
            ->whereNotNull('payment_deadline')
            ->get();
        
        $reminders24h = 0;
        $reminders48h = 0;
        
        foreach ($pendingBookings as $booking) {
            // Check if final payment already completed
            $finalPayment = $booking->finalPayment;
            if ($finalPayment && $finalPayment->payment_status === 'completed') {
                continue; // Skip if already paid
            }
            
            $hoursElapsed = $booking->service_confirmed_at->diffInHours(now());
            $hoursRemaining = $booking->payment_deadline->diffInHours(now(), false);
            
            // Send 24-hour reminder (after 24 hours from confirmation)
            if ($hoursElapsed >= 24 && $hoursElapsed < 25) {
                $remainingAmount = $booking->getRemainingAmount();
                
                $notificationService->toCustomer(
                    $booking->customerID,
                    'payment_reminder_24h',
                    'Payment Reminder',
                    'Please complete your payment of ' . number_format($remainingAmount, 2) . ' ETB for booking #' . $booking->bookingID . '. Payment is due in 24 hours.',
                    [
                        'booking_id' => $booking->bookingID,
                        'remaining_amount' => $remainingAmount,
                        'hours_remaining' => 24,
                        'payment_deadline' => $booking->payment_deadline->toISOString()
                    ],
                    $booking->bookingID
                );
                
                $reminders24h++;
                
                Log::info('24-hour payment reminder sent', [
                    'booking_id' => $booking->bookingID,
                    'customer_id' => $booking->customerID
                ]);
            }
            
            // Send 48-hour reminder (at deadline - urgent)
            if ($hoursElapsed >= 48 && $hoursElapsed < 49) {
                $remainingAmount = $booking->getRemainingAmount();
                
                $notificationService->toCustomer(
                    $booking->customerID,
                    'payment_reminder_48h',
                    'URGENT: Payment Due Now',
                    'Your payment of ' . number_format($remainingAmount, 2) . ' ETB for booking #' . $booking->bookingID . ' is due now. Please complete payment immediately to avoid penalties.',
                    [
                        'booking_id' => $booking->bookingID,
                        'remaining_amount' => $remainingAmount,
                        'hours_remaining' => 0,
                        'payment_deadline' => $booking->payment_deadline->toISOString(),
                        'urgent' => true
                    ],
                    $booking->bookingID
                );
                
                $reminders48h++;
                
                Log::info('48-hour payment reminder sent', [
                    'booking_id' => $booking->bookingID,
                    'customer_id' => $booking->customerID
                ]);
            }
        }
        
        Log::info('Payment reminder job completed', [
            'reminders_24h' => $reminders24h,
            'reminders_48h' => $reminders48h,
            'total_pending' => $pendingBookings->count()
        ]);
    }
}
