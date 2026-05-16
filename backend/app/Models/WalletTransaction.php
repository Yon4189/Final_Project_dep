<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    use HasFactory;

    protected $primaryKey = 'transactionID';

    protected $fillable = [
        'transactionID',
        'walletID',
        'type',
        'transaction_type',
        'transaction_status',
        'release_date',
        'related_payment_id',
        'amount',
        'description',
        'bookingID',
        'withdrawalID',
    ];

    protected $casts = [
        'release_date' => 'datetime'
    ];

    /**
     * Scope for held payouts
     */
    public function scopeHeldPayouts($query)
    {
        return $query->where('transaction_type', 'held_payout');
    }

    /**
     * Scope for pending release
     */
    public function scopePendingRelease($query)
    {
        return $query->where('transaction_status', 'pending')
                     ->where('transaction_type', 'held_payout')
                     ->whereNotNull('release_date')
                     ->where('release_date', '<=', now());
    }

    /**
     * Check if transaction is releasable
     */
    public function isReleasable(): bool
    {
        return $this->transaction_type === 'held_payout' &&
               $this->transaction_status === 'pending' &&
               $this->release_date &&
               $this->release_date <= now();
    }

    /**
     * Get the related payment
     */
    public function relatedPayment()
    {
        return $this->belongsTo(Payment::class, 'related_payment_id', 'paymentID');
    }

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function withdrawal()
    {
        return $this->belongsTo(Withdrawal::class);
    }
}
