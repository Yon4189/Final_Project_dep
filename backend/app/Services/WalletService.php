<?php

namespace App\Services;

use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WalletService
{
    public function releasePayment($payment)
    {
        $wallet = Wallet::firstOrCreate(
            ['providerID' => $payment->providerID],
            [
                'providerID' => $payment->providerID,
                'available_balance' => 0, 
                'pending_balance' => 0
            ]
        );

        $wallet->available_balance += $payment->provider_amount;
        $wallet->save();

        // Update payment status to 'released'
        $payment->status = 'released';
        $payment->released_at = now();
        $payment->save();

        WalletTransaction::create([
            'walletID' => $wallet->walletID,
            'type' => 'credit',
            'amount' => $payment->provider_amount,
            'description' => 'Payment released for booking #' . $payment->bookingID,
            'bookingID' => $payment->bookingID
        ]);

        return $wallet;
    }
}