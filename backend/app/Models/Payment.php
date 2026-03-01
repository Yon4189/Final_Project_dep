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
        'tx_ref',              // Added (was missing)
        'chapa_tx_id',
        'amount',              // Added (was missing)
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
        return $this->status === 'held';
    }

    /**
     * Release payment to provider
     */
    public function release(): void
    {
        $this->status = 'released';
        $this->released_at = now();
        $this->save();

        // Update provider's wallet balance
        if ($this->provider) {
            $this->provider->walletBalance = ($this->provider->walletBalance ?? 0) + $this->provider_amount;
            $this->provider->save();
        }
    }

    /**
     * Refund payment to customer
     */
    public function refund($amount = null): void
    {
        $refundAmount = $amount ?? $this->amount;
        
        if ($refundAmount < $this->amount) {
            $this->status = 'partial_refund';
        } else {
            $this->status = 'refunded';
        }
        
        $this->refunded_at = now();
        $this->save();

        // Update customer's wallet balance
        if ($this->customer) {
            $this->customer->walletBalance = ($this->customer->walletBalance ?? 0) + $refundAmount;
            $this->customer->save();
        }
    }
}