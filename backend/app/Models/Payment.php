<?php
// app/Models/Payment.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $table = 'payments';
    protected $primaryKey = 'paymentID';

    protected $fillable = [
        'bookingID',
        'customerID',
        'providerID',
        'tx_ref',
        'chapa_tx_id',
        'amount',
        'platform_commission',
        'provider_amount',
        'currency',
        'status',
        'checkout_url',
        'callback_url',
        'return_url',
        'customer_email',
        'customer_first_name',
        'customer_last_name',
        'customer_phone',
        'meta_data',
        'failure_reason',
        'paid_at',
        'released_at',
        'refunded_at'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'platform_commission' => 'decimal:2',
        'provider_amount' => 'decimal:2',
        'meta_data' => 'array',
        'paid_at' => 'datetime',
        'released_at' => 'datetime',
        'refunded_at' => 'datetime'
    ];

    /**
     * Get the booking for this payment
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'bookingID', 'bookingID');
    }

    /**
     * Get the customer who made the payment
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customerID', 'customerID');
    }

    /**
     * Get the provider receiving the payment
     */
    public function provider(): BelongsTo
    {
        return $this->belongsTo(ServiceProvider::class, 'providerID', 'providerID');
    }
    
    /**
     * Get the wallet transaction for this payment
     */
    public function walletTransaction()
    {
        return $this->hasOne(WalletTransaction::class, 'bookingID', 'bookingID');
    }

    /**
     * Check if payment is successful
     */
    public function isSuccessful(): bool
    {
        return $this->status === 'paid' || $this->status === 'released';
    }

    /**
     * Check if payment is pending
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if payment is in escrow
     */
    public function isHeld(): bool
    {
        return $this->status === 'held' || $this->status === 'paid';
    }

    /**
     * Check if payment is releasable (customer confirmed or auto-release)
     */
    public function isReleasable(): bool
    {
        return $this->status === 'releasable';
    }

    /**
     * Check if payment is released
     */
    public function isReleased(): bool
    {
        return $this->status === 'released';
    }

    /**
     * Mark payment as held after successful Chapa verification
     */
    public function markAsHeld(): void
    {
        $this->status = 'paid'; // Using 'paid' as held status
        $this->paid_at = now();
        $this->save();
    }

    /**
     * Mark payment as releasable (customer confirmed or auto-release triggered)
     */
    public function markAsReleasable(): void
    {
        $this->status = 'releasable';
        $this->save();
    }

    /**
     * Release payment to provider wallet
     * This is called AFTER customer confirmation or auto-release
     */
    public function releaseToWallet(): void
    {
        $this->status = 'released';
        $this->released_at = now();
        $this->save();

        // Note: We don't update provider.walletBalance directly anymore
        // The wallet system handles this via Wallet and WalletTransaction
    }

    /**
     * Refund payment to customer
     */
    public function refund($amount = null, $reason = null): void
    {
        $refundAmount = $amount ?? $this->amount;
        
        if ($refundAmount < $this->amount) {
            $this->status = 'partial_refund';
        } else {
            $this->status = 'refunded';
        }
        
        $this->refunded_at = now();
        $this->save();

        // If money was already in wallet, we need to handle reversal
        if ($this->status === 'released' && $this->provider) {
            $wallet = Wallet::where('providerID', $this->providerID)->first();
            if ($wallet) {
                // Deduct from available balance if already released
                $wallet->available_balance -= $this->provider_amount;
                $wallet->save();
                
                // Create transaction record
                WalletTransaction::create([
                    'walletID' => $wallet->walletID,
                    'type' => 'debit',
                    'amount' => $this->provider_amount,
                    'description' => 'Refund reversal for booking #' . $this->bookingID . ($reason ? ': ' . $reason : ''),
                    'bookingID' => $this->bookingID
                ]);
            }
        }

        // Update customer's wallet balance
        if ($this->customer) {
            $this->customer->walletBalance = ($this->customer->walletBalance ?? 0) + $refundAmount;
            $this->customer->save();
        }
    }

    /**
     * Get payment status text
     */
    public function getStatusTextAttribute(): string
    {
        return match($this->status) {
            'pending' => 'Pending',
            'paid' => 'Paid (In Escrow)',
            'releasable' => 'Ready to Release',
            'released' => 'Released to Provider',
            'partial_refund' => 'Partially Refunded',
            'refunded' => 'Fully Refunded',
            'failed' => 'Failed',
            default => ucfirst($this->status)
        };
    }

    /**
     * Scope for payments in escrow
     */
    public function scopeInEscrow($query)
    {
        return $query->whereIn('status', ['paid', 'releasable']);
    }

    /**
     * Scope for released payments
     */
    public function scopeReleased($query)
    {
        return $query->where('status', 'released');
    }

    /**
     * Scope for refunded payments
     */
    public function scopeRefunded($query)
    {
        return $query->whereIn('status', ['refunded', 'partial_refund']);
    }
}