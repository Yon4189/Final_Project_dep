<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    protected $fillable = [
        'name',
        'display_name',
        'code',
        'is_active',
        'description',
        'supported_currencies',
        'min_amount',
        'max_amount',
        'transaction_fee',
        'fixed_fee',
        'config_data'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'supported_currencies' => 'array',
        'min_amount' => 'decimal:2',
        'max_amount' => 'decimal:2',
        'transaction_fee' => 'decimal:2',
        'fixed_fee' => 'decimal:2',
        'config_data' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Scope a query to only include active payment methods
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include payment methods that support a specific currency
     */
    public function scopeSupportsCurrency($query, $currency)
    {
        return $query->whereJsonContains('supported_currencies', $currency);
    }

    /**
     * Check if payment method supports a specific amount
     */
    public function supportsAmount(float $amount): bool
    {
        if ($this->min_amount && $amount < $this->min_amount) {
            return false;
        }
        
        if ($this->max_amount && $amount > $this->max_amount) {
            return false;
        }
        
        return true;
    }

    /**
     * Calculate total fee for a given amount
     */
    public function calculateFee(float $amount): float
    {
        $transactionFee = $amount * ($this->transaction_fee / 100);
        return $transactionFee + $this->fixed_fee;
    }

    /**
     * Get net amount after fees
     */
    public function getNetAmount(float $amount): float
    {
        return $amount - $this->calculateFee($amount);
    }

    /**
     * Check if payment method is active
     */
    public function isActive(): bool
    {
        return $this->is_active;
    }

    /**
     * Get display name with fallback
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->attributes['display_name'] ?? ucfirst($this->name);
    }
}
