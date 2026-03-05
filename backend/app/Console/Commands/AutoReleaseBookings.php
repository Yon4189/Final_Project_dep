<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Payment;
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
        
        // Find bookings that are completed but payment not released
        // Using the actual columns from your schema
        $bookings = Booking::where('status', 'completed')
            ->whereHas('payment', function($query) {
                $query->where('status', 'paid')  // Payment is paid but not released
                      ->whereNull('released_at');
            })
            ->where('completed_at', '<=', now()->subHours(48))  // 48 hours after completion
            ->get();
            
        $count = 0;
        
        foreach ($bookings as $booking) {
            DB::transaction(function () use ($booking, &$count) {
                // Get the payment record
                $payment = Payment::where('bookingID', $booking->bookingID)->first();
                
                if (!$payment) {
                    Log::warning('No payment found for booking #' . $booking->bookingID);
                    return;
                }
                
                // Get provider's wallet
                $wallet = Wallet::firstOrCreate(
                    ['providerID' => $booking->providerID],
                    ['available_balance' => 0, 'pending_balance' => 0]
                );
                
                // Amount to release (provider_amount from payment table)
                $providerAmount = $payment->provider_amount; // This already has commission deducted
                
                // Add to wallet
                $wallet->available_balance += $providerAmount;
                $wallet->save();
                
                // Create transaction record
                WalletTransaction::create([
                    'walletID' => $wallet->walletID,
                    'type' => 'credit',
                    'amount' => $providerAmount,
                    'description' => 'Auto-release for booking #' . $booking->bookingID . ' (48h after completion)',
                    'bookingID' => $booking->bookingID,
                ]);
                
                // Update payment status
                $payment->status = 'released';
                $payment->released_at = now();
                $payment->save();
                
                Log::info('Auto-released booking #' . $booking->bookingID);
                $count++;
            });
        }
        
        $this->info("Auto-released $count bookings.");
    }
}