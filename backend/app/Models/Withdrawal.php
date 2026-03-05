<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Withdrawal extends Model
{
    protected $table = 'withdrawals';
    protected $primaryKey = 'withdrawalID'; // Change from default 'id'

    protected $fillable = [
        'withdrawalID', // Added
        'providerID',   // Changed from 'provider_id'
        'amount',
        'currency',
        'status',
        'provider_bank_name',
        'provider_account_number',
        'provider_account_holder_name',
        'chapa_transfer_id',
        'chapa_transfer_status',
        'platform_fee',
        'net_amount',
        'admin_notes',      // Changed from 'processing_notes'
        'failure_reason',
        'processed_at',
        'completed_at'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'platform_fee' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'processed_at' => 'datetime',
        'completed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Get the service provider that owns the withdrawal
     */
    public function provider(): BelongsTo
    {
        return $this->belongsTo(ServiceProvider::class, 'providerID', 'providerID');
    }

    /**
     * Get the wallet associated with this withdrawal
     */
    public function wallet()
    {
        return $this->belongsTo(Wallet::class, 'providerID', 'providerID');
    }

    /**
     * Get the transactions for this withdrawal
     */
    public function transactions()
    {
        return $this->hasMany(WalletTransaction::class, 'withdrawalID', 'withdrawalID');
    }

    /**
     * Check if withdrawal is pending
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if withdrawal is approved
     */
    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /**
     * Check if withdrawal is rejected
     */
    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    /**
     * Check if withdrawal is processing
     */
    public function isProcessing(): bool
    {
        return $this->status === 'processing';
    }

    /**
     * Check if withdrawal is completed
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Check if withdrawal failed
     */
    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * Check if withdrawal is cancelled
     */
    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    /**
     * Scope a query to only include pending withdrawals
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope a query to only include approved withdrawals
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope a query to only include rejected withdrawals
     */
    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    /**
     * Scope a query to only include processing withdrawals
     */
    public function scopeProcessing($query)
    {
        return $query->where('status', 'processing');
    }

    /**
     * Scope a query to only include completed withdrawals
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope a query to only include failed withdrawals
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
     * Get formatted net amount
     */
    public function getFormattedNetAmountAttribute(): string
    {
        return number_format($this->net_amount, 2) . ' ' . $this->currency;
    }

    /**
     * Get formatted platform fee
     */
    public function getFormattedPlatformFeeAttribute(): string
    {
        return number_format($this->platform_fee, 2) . ' ' . $this->currency;
    }

    /**
     * Get status with proper formatting
     */
    public function getFormattedStatusAttribute(): string
    {
        return ucfirst($this->status);
    }

    /**
     * Get processing time in hours
     */
    public function getProcessingTimeAttribute(): ?string
    {
        if (!$this->processed_at) {
            return null;
        }
        
        $end = $this->completed_at ?? now();
        $hours = $this->processed_at->diffInHours($end);
        
        return $hours . ' hour' . ($hours > 1 ? 's' : '');
    }
}