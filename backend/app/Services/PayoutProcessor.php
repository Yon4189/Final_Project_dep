<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\Payment;
use App\Services\WalletService;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PayoutProcessor
{
    protected $walletService;
    protected $notificationService;

    public function __construct(WalletService $walletService, NotificationService $notificationService)
    {
        $this->walletService = $walletService;
        $this->notificationService = $notificationService;
    }

    /**
     * Process deposit payout when customer confirms service completion
     * Provider receives deposit amount (after commission) immediately
     * 
     * @param int $bookingId
     * @param float $amount Net amount after commission
     * @return void
     */
    public function processDepositPayout(int $bookingId, float $amount): void
    {
        $booking = Booking::with('provider')->findOrFail($bookingId);
        
        DB::transaction(function () use ($booking, $amount, $bookingId) {
            // Get or create wallet
            $wallet = Wallet::firstOrCreate(
                ['providerID' => $booking->providerID],
                [
                    'available_balance' => 0,
                    'pending_balance' => 0
                ]
            );
            
            // Lock wallet for update to prevent race conditions
            $lockedWallet = Wallet::where('walletID', $wallet->walletID)
                ->lockForUpdate()
                ->first();
            
            // Credit available balance
            $lockedWallet->available_balance += $amount;
            $lockedWallet->save();
            
            // Create wallet transaction
            WalletTransaction::create([
                'walletID' => $lockedWallet->walletID,
                'type' => 'credit',
                'transaction_type' => 'deposit_payout',
                'transaction_status' => 'completed',
                'amount' => $amount,
                'description' => 'Deposit payout for booking #' . $bookingId . ' (service confirmed)',
                'bookingID' => $bookingId,
                'related_payment_id' => $booking->depositPayment->paymentID ?? null
            ]);
            
            // Send notification to provider
            $this->notificationService->toProvider(
                $booking->providerID,
                'deposit_payout_credited',
                'Deposit Payout Received',
                'You received ' . number_format($amount, 2) . ' ETB deposit payout for booking #' . $bookingId . '. Customer has confirmed service completion.',
                [
                    'booking_id' => $bookingId,
                    'amount' => $amount,
                    'payout_type' => 'deposit'
                ],
                $bookingId
            );
        });
        
        Log::info('Deposit payout processed', [
            'booking_id' => $bookingId,
            'provider_id' => $booking->providerID,
            'amount' => $amount
        ]);
    }

    /**
     * Process hybrid payout (50% immediate, 50% held for 3 days)
     * Note: Amount passed should be net amount after commission deduction
     * 
     * @param int $bookingId
     * @param float $netAmount Net amount after commission
     * @return void
     */
    public function processHybridPayout(int $bookingId, float $netAmount): void
    {
        $booking = Booking::with('provider')->findOrFail($bookingId);
        
        // Validate booking exists and final payment is completed
        $finalPayment = $booking->finalPayment;
        if (!$finalPayment || $finalPayment->payment_status !== 'completed') {
            throw new \Exception('Final payment not completed for booking #' . $bookingId);
        }
        
        // Calculate 50/50 split of net amount
        $immediateAmount = round($netAmount * 0.50, 2);
        $heldAmount = round($netAmount * 0.50, 2);
        
        // Adjust held amount if sum doesn't equal net amount due to rounding
        $total = $immediateAmount + $heldAmount;
        if ($total !== $netAmount) {
            $heldAmount = round($netAmount - $immediateAmount, 2);
        }
        
        // Process immediate payout
        $this->processImmediatePayout($bookingId, $immediateAmount);
        
        // Schedule held payout
        $this->scheduleHeldPayout($bookingId, $heldAmount);
        
        Log::info('Hybrid payout processed', [
            'booking_id' => $bookingId,
            'immediate_amount' => $immediateAmount,
            'held_amount' => $heldAmount,
            'total_net_amount' => $netAmount
        ]);
    }

    /**
     * Process immediate payout (50% available immediately)
     * 
     * @param int $bookingId
     * @param float $amount
     * @return void
     */
    private function processImmediatePayout(int $bookingId, float $amount): void
    {
        $booking = Booking::with('provider')->findOrFail($bookingId);
        
        DB::transaction(function () use ($booking, $amount, $bookingId) {
            // Get or create wallet
            $wallet = Wallet::firstOrCreate(
                ['providerID' => $booking->providerID],
                [
                    'available_balance' => 0,
                    'pending_balance' => 0
                ]
            );
            
            // Lock wallet for update to prevent race conditions
            $lockedWallet = Wallet::where('walletID', $wallet->walletID)
                ->lockForUpdate()
                ->first();
            
            // Credit available balance
            $lockedWallet->available_balance += $amount;
            $lockedWallet->save();
            
            // Create wallet transaction
            WalletTransaction::create([
                'walletID' => $lockedWallet->walletID,
                'type' => 'credit',
                'transaction_type' => 'immediate_payout',
                'transaction_status' => 'completed',
                'amount' => $amount,
                'description' => 'Immediate payout (50%) for booking #' . $bookingId,
                'bookingID' => $bookingId,
                'related_payment_id' => $booking->finalPayment->paymentID ?? null
            ]);
            
            // Send notification to provider
            $this->notificationService->toProvider(
                $booking->providerID,
                'immediate_payout_credited',
                'Payout Received',
                'You received ' . number_format($amount, 2) . ' ETB (50% immediate payout) for booking #' . $bookingId . '. Available for withdrawal now.',
                [
                    'booking_id' => $bookingId,
                    'amount' => $amount,
                    'payout_type' => 'immediate'
                ],
                $bookingId
            );
        });
        
        Log::info('Immediate payout processed', [
            'booking_id' => $bookingId,
            'provider_id' => $booking->providerID,
            'amount' => $amount
        ]);
    }

    /**
     * Schedule held payout (50% held for 3 days)
     * 
     * @param int $bookingId
     * @param float $amount
     * @return void
     */
    private function scheduleHeldPayout(int $bookingId, float $amount): void
    {
        $booking = Booking::with('provider')->findOrFail($bookingId);
        
        // Calculate release date (3 days = 72 hours from now)
        $releaseDate = now()->addDays(3);
        
        DB::transaction(function () use ($booking, $amount, $bookingId, $releaseDate) {
            // Get or create wallet
            $wallet = Wallet::firstOrCreate(
                ['providerID' => $booking->providerID],
                [
                    'available_balance' => 0,
                    'pending_balance' => 0
                ]
            );
            
            // Lock wallet for update
            $lockedWallet = Wallet::where('walletID', $wallet->walletID)
                ->lockForUpdate()
                ->first();
            
            // Credit pending balance
            $lockedWallet->pending_balance += $amount;
            $lockedWallet->save();
            
            // Create wallet transaction with pending status
            WalletTransaction::create([
                'walletID' => $lockedWallet->walletID,
                'type' => 'pending_credit',
                'transaction_type' => 'held_payout',
                'transaction_status' => 'pending',
                'release_date' => $releaseDate,
                'amount' => $amount,
                'description' => 'Held payout (50%) for booking #' . $bookingId . ' - releases on ' . $releaseDate->format('Y-m-d H:i'),
                'bookingID' => $bookingId,
                'related_payment_id' => $booking->finalPayment->paymentID ?? null
            ]);
            
            // Send notification to provider
            $this->notificationService->toProvider(
                $booking->providerID,
                'held_payout_scheduled',
                'Payout Scheduled',
                number_format($amount, 2) . ' ETB (50% held payout) for booking #' . $bookingId . ' will be released on ' . $releaseDate->format('M d, Y'),
                [
                    'booking_id' => $bookingId,
                    'amount' => $amount,
                    'payout_type' => 'held',
                    'release_date' => $releaseDate->toISOString()
                ],
                $bookingId
            );
        });
        
        Log::info('Held payout scheduled', [
            'booking_id' => $bookingId,
            'provider_id' => $booking->providerID,
            'amount' => $amount,
            'release_date' => $releaseDate
        ]);
    }

    /**
     * Release held payouts that are due
     * Called by background job
     * 
     * @return void
     */
    public function releaseHeldPayouts(): void
    {
        // Query pending held payouts that are ready for release
        $pendingPayouts = WalletTransaction::pendingRelease()->get();
        
        $processedCount = 0;
        $failedCount = 0;
        $totalAmount = 0;
        
        foreach ($pendingPayouts as $transaction) {
            try {
                DB::transaction(function () use ($transaction, &$processedCount, &$totalAmount) {
                    // Lock wallet for update
                    $lockedWallet = Wallet::where('walletID', $transaction->walletID)
                        ->lockForUpdate()
                        ->first();
                    
                    if (!$lockedWallet) {
                        throw new \Exception('Wallet not found: ' . $transaction->walletID);
                    }
                    
                    // Move from pending to available
                    $lockedWallet->pending_balance -= $transaction->amount;
                    $lockedWallet->available_balance += $transaction->amount;
                    $lockedWallet->save();
                    
                    // Update transaction status
                    $transaction->transaction_status = 'completed';
                    $transaction->save();
                    
                    // Create a new transaction record for the release
                    WalletTransaction::create([
                        'walletID' => $lockedWallet->walletID,
                        'type' => 'credit',
                        'transaction_type' => 'held_payout',
                        'transaction_status' => 'completed',
                        'amount' => $transaction->amount,
                        'description' => 'Held payout released for booking #' . $transaction->bookingID,
                        'bookingID' => $transaction->bookingID,
                        'related_payment_id' => $transaction->related_payment_id
                    ]);
                    
                    // Send notification to provider
                    $wallet = $lockedWallet->fresh();
                    $this->notificationService->toProvider(
                        $wallet->providerID,
                        'held_payout_released',
                        'Payout Released',
                        number_format($transaction->amount, 2) . ' ETB has been released to your wallet and is now available for withdrawal.',
                        [
                            'booking_id' => $transaction->bookingID,
                            'amount' => $transaction->amount,
                            'payout_type' => 'held_released'
                        ],
                        $transaction->bookingID
                    );
                    
                    $processedCount++;
                    $totalAmount += $transaction->amount;
                });
                
            } catch (\Exception $e) {
                $failedCount++;
                Log::error('Failed to release held payout', [
                    'transaction_id' => $transaction->transactionID,
                    'wallet_id' => $transaction->walletID,
                    'error' => $e->getMessage()
                ]);
                
                // Notify admin on failure
                $this->notificationService->toAdmins(
                    'payout_release_failed',
                    'Payout Release Failed',
                    'Failed to release held payout for transaction #' . $transaction->transactionID,
                    [
                        'transaction_id' => $transaction->transactionID,
                        'wallet_id' => $transaction->walletID,
                        'amount' => $transaction->amount,
                        'error' => $e->getMessage()
                    ]
                );
            }
        }
        
        Log::info('Held payout release job completed', [
            'processed' => $processedCount,
            'failed' => $failedCount,
            'total_amount' => $totalAmount
        ]);
    }

    /**
     * Reverse payout for refund (when dispute resolved in customer favor)
     * 
     * @param int $bookingId
     * @return void
     */
    public function reversePayoutForRefund(int $bookingId): void
    {
        $booking = Booking::with('provider')->findOrFail($bookingId);
        
        DB::transaction(function () use ($booking, $bookingId) {
            // Find immediate payout transaction
            $immediatePayout = WalletTransaction::where('bookingID', $bookingId)
                ->where('transaction_type', 'immediate_payout')
                ->where('transaction_status', 'completed')
                ->first();
            
            if ($immediatePayout) {
                // Lock wallet for update
                $lockedWallet = Wallet::where('walletID', $immediatePayout->walletID)
                    ->lockForUpdate()
                    ->first();
                
                // Check if sufficient balance
                if ($lockedWallet->available_balance < $immediatePayout->amount) {
                    Log::critical('Insufficient balance for payout reversal', [
                        'booking_id' => $bookingId,
                        'wallet_id' => $lockedWallet->walletID,
                        'available_balance' => $lockedWallet->available_balance,
                        'required_amount' => $immediatePayout->amount
                    ]);
                    
                    // Notify admin
                    $this->notificationService->toAdmins(
                        'payout_reversal_insufficient_balance',
                        'Critical: Insufficient Balance for Refund',
                        'Provider wallet does not have sufficient balance to reverse payout for booking #' . $bookingId,
                        [
                            'booking_id' => $bookingId,
                            'wallet_id' => $lockedWallet->walletID,
                            'provider_id' => $booking->providerID,
                            'available_balance' => $lockedWallet->available_balance,
                            'required_amount' => $immediatePayout->amount
                        ]
                    );
                    
                    throw new \Exception('Insufficient balance for payout reversal');
                }
                
                // Deduct from available balance
                $lockedWallet->available_balance -= $immediatePayout->amount;
                $lockedWallet->save();
                
                // Create refund reversal transaction
                WalletTransaction::create([
                    'walletID' => $lockedWallet->walletID,
                    'type' => 'debit',
                    'transaction_type' => 'refund_reversal',
                    'transaction_status' => 'completed',
                    'amount' => $immediatePayout->amount,
                    'description' => 'Refund reversal (immediate payout) for booking #' . $bookingId,
                    'bookingID' => $bookingId,
                    'related_payment_id' => $immediatePayout->related_payment_id
                ]);
            }
            
            // Find held payout transaction
            $heldPayout = WalletTransaction::where('bookingID', $bookingId)
                ->where('transaction_type', 'held_payout')
                ->whereIn('transaction_status', ['pending', 'completed'])
                ->first();
            
            if ($heldPayout) {
                // Lock wallet for update
                $lockedWallet = Wallet::where('walletID', $heldPayout->walletID)
                    ->lockForUpdate()
                    ->first();
                
                if ($heldPayout->transaction_status === 'pending') {
                    // Cancel pending held payout
                    $lockedWallet->pending_balance -= $heldPayout->amount;
                    $lockedWallet->save();
                    
                    $heldPayout->transaction_status = 'cancelled';
                    $heldPayout->save();
                    
                    // Create reversal transaction
                    WalletTransaction::create([
                        'walletID' => $lockedWallet->walletID,
                        'type' => 'debit',
                        'transaction_type' => 'refund_reversal',
                        'transaction_status' => 'completed',
                        'amount' => $heldPayout->amount,
                        'description' => 'Refund reversal (held payout cancelled) for booking #' . $bookingId,
                        'bookingID' => $bookingId,
                        'related_payment_id' => $heldPayout->related_payment_id
                    ]);
                    
                } else {
                    // Held payout already released, deduct from available balance
                    if ($lockedWallet->available_balance < $heldPayout->amount) {
                        Log::critical('Insufficient balance for held payout reversal', [
                            'booking_id' => $bookingId,
                            'wallet_id' => $lockedWallet->walletID,
                            'available_balance' => $lockedWallet->available_balance,
                            'required_amount' => $heldPayout->amount
                        ]);
                        
                        // Notify admin
                        $this->notificationService->toAdmins(
                            'payout_reversal_insufficient_balance',
                            'Critical: Insufficient Balance for Refund',
                            'Provider wallet does not have sufficient balance to reverse held payout for booking #' . $bookingId,
                            [
                                'booking_id' => $bookingId,
                                'wallet_id' => $lockedWallet->walletID,
                                'provider_id' => $booking->providerID,
                                'available_balance' => $lockedWallet->available_balance,
                                'required_amount' => $heldPayout->amount
                            ]
                        );
                        
                        throw new \Exception('Insufficient balance for held payout reversal');
                    }
                    
                    $lockedWallet->available_balance -= $heldPayout->amount;
                    $lockedWallet->save();
                    
                    // Create reversal transaction
                    WalletTransaction::create([
                        'walletID' => $lockedWallet->walletID,
                        'type' => 'debit',
                        'transaction_type' => 'refund_reversal',
                        'transaction_status' => 'completed',
                        'amount' => $heldPayout->amount,
                        'description' => 'Refund reversal (held payout) for booking #' . $bookingId,
                        'bookingID' => $bookingId,
                        'related_payment_id' => $heldPayout->related_payment_id
                    ]);
                }
            }
            
            // Notify provider about payout reversal
            $this->notificationService->toProvider(
                $booking->providerID,
                'payout_reversed',
                'Payout Reversed',
                'Payout for booking #' . $bookingId . ' has been reversed due to refund.',
                [
                    'booking_id' => $bookingId,
                    'reason' => 'refund'
                ],
                $bookingId
            );
        });
        
        Log::info('Payout reversed for refund', [
            'booking_id' => $bookingId,
            'provider_id' => $booking->providerID
        ]);
    }
}
