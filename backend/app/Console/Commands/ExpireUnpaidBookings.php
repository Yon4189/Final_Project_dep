<?php
// app/Console/Commands/ExpireUnpaidBookings.php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class ExpireUnpaidBookings extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bookings:expire-unpaid';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Expire bookings where payment not completed within 24 hours';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for expired unpaid bookings...');

        // Find accepted bookings where payment deadline passed
        $expiredBookings = Booking::where('status', 'accepted')
                                 ->where('payment_due_at', '<', now())
                                 ->whereNull('paid_at')
                                 ->get();

        $count = 0;
        foreach ($expiredBookings as $booking) {
            $booking->status = 'expired';
            $booking->save();

            // Create notification service instance
            $notificationService = app(NotificationService::class);

            // Notify customer
            $notificationService->toCustomer(
                $booking->customerID,
                'payment_expired',
                'Payment Expired',
                'Your payment deadline has passed. Please create a new booking if you still need the service.',
                ['booking_id' => $booking->bookingID],
                $booking->bookingID
            );

            // Notify provider
            $notificationService->toProvider(
                $booking->providerID,
                'booking_expired',
                'Booking Expired',
                'A booking has expired because the customer did not complete payment.',
                ['booking_id' => $booking->bookingID],
                $booking->bookingID
            );

            $count++;
            $this->line("Expired booking #{$booking->bookingID}");
        }

        $this->info("Expired {$count} bookings with unpaid payments.");
    }
}