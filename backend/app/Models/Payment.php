<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'tx_ref',
        'chapa_tx_id',
        'amount',
        'currency',
        'status',
        'payment_method',
        'customer_email',
        'customer_first_name',
        'customer_last_name',
        'customer_phone',
        'customer_id',
        'booking_id',
        'checkout_url',
        'callback_url',
        'return_url',
        'meta_data',
        'failure_reason'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'meta_data' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Get the customer that owns the payment
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'customerID');
    }

    /**
     * Get the booking that owns the payment
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'booking_id', 'bookingID');
    }

    /**
     * Check if payment is successful
     */
    public function isSuccessful(): bool
    {
        return $this->status === 'success';
    }

    /**
     * Check if payment is pending
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if payment failed
     */
    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * Check if payment is cancelled
     */
    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    /**
     * Scope a query to only include successful payments
     */
    public function scopeSuccessful($query)
    {
        return $query->where('status', 'success');
    }

    /**
     * Scope a query to only include pending payments
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope a query to only include failed payments
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    /**
     * Get formatted amount
     */
    public function getFormattedAmountAttribute(): string
    {
        return number_format($this->amount, 2) . ' ' . $this->currency;
    }

    /**
     * Get status with proper formatting
     */
    public function getFormattedStatusAttribute(): string
    {
        return ucfirst($this->status);
    }
}
