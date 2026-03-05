<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoReleaseBookings extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bookings:auto-release';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Auto-release provider funds for completed bookings after 48 hours if not confirmed by customer.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Running auto-release for bookings...');
        $now = now();
        $bookings = Booking::where('status', 'completed')
            ->where('payment_status', 'releasable')
            ->where('auto_release_at', '<=', $now)
            ->whereNull('customer_confirmed_at')
            ->get();
        $count = 0;
        foreach ($bookings as $booking) {
            DB::transaction(function () use ($booking) {
                $provider = $booking->providerID;
                $wallet = Wallet::where('service_provider_id', $provider)->first();
                if ($wallet && $booking->pending_balance > 0) {
                    $wallet->available_balance += $booking->pending_balance;
                    $wallet->save();
                    WalletTransaction::create([
                        'wallet_id' => $wallet->id,
                        'type' => 'credit',
                        'amount' => $booking->pending_balance,
                        'description' => 'Auto-release for booking #' . $booking->bookingID,
                        'booking_id' => $booking->bookingID,
                    ]);
                    $booking->available_balance += $booking->pending_balance;
                    $booking->pending_balance = 0;
                    $booking->payment_status = 'released';
                    $booking->save();
                    Log::info('Auto-released booking #' . $booking->bookingID);
                }
            });
            $count++;
        }
        $this->info("Auto-released $count bookings.");
    }
}
