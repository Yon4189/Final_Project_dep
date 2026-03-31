<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;
    
    protected $table = 'bookings';
    protected $primaryKey = 'bookingID';

    protected $fillable = [
        'customerID',
        'serviceID',
        'providerID',
        'status',
        'scheduledDate',
        'agreed_price',
        'service_latitude',
        'service_longitude',
        'notes',
        'eta_minutes',
        'estimated_arrival_time',
        'accepted_at',
        'provider_started_at',
        'provider_arrived_at',
        'completed_at',
        'expires_at',
        'payment_due_at',
        'paid_at',
        'platform_commission',
        'provider_payout',
        'refund_amount',
        'cancelled_at',
        'cancellation_reason',
        'cancelled_by',
        'rejected_at',
        'rejected_by',
        'rejection_reason',
        // New payment status fields (add these via migration if not exist)
        'payment_status',
        'customer_confirmed_at',
        'auto_release_at',
        'released_at',
        'address_text'
    ];

    protected $casts = [
        'scheduledDate' => 'datetime',
        'estimated_arrival_time' => 'datetime',
        'accepted_at' => 'datetime',
        'provider_started_at' => 'datetime',
        'provider_arrived_at' => 'datetime',
        'completed_at' => 'datetime',
        'expires_at' => 'datetime',
        'payment_due_at' => 'datetime',
        'paid_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'rejected_at' => 'datetime',
        'customer_confirmed_at' => 'datetime',
        'auto_release_at' => 'datetime',
        'released_at' => 'datetime',
        'agreed_price' => 'decimal:2',
        'platform_commission' => 'decimal:2',
        'provider_payout' => 'decimal:2',
        'refund_amount' => 'decimal:2'
    ];

    /**
     * Relationships
     */
    
    // A booking belongs to a customer
    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customerID', 'customerID');
    }

    // A booking belongs to a service
    public function service()
    {
        return $this->belongsTo(Service::class, 'serviceID', 'serviceID');
    }

    // A booking belongs to a provider
    public function provider()
    {
        return $this->belongsTo(ServiceProvider::class, 'providerID', 'providerID');
    }

    // A booking has one payment
    public function payment()
    {
        return $this->hasOne(Payment::class, 'bookingID', 'bookingID');
    }

    // A booking has one review
    public function review()
    {
        return $this->hasOne(Review::class, 'bookingID', 'bookingID');
    }

    // A booking has one wallet transaction
    public function walletTransaction()
    {
        return $this->hasOne(WalletTransaction::class, 'bookingID', 'bookingID');
    }

    /**
     * Helper Methods
     */

    /**
     * Check if booking is paid
     */
    public function isPaid(): bool
    {
        return $this->paid_at !== null;
    }

    /**
     * Check if payment is due (accepted but not paid within 24hrs)
     */
    public function isPaymentDue(): bool
    {
        return $this->status === 'accepted' && 
               $this->payment_due_at && 
               $this->payment_due_at < now() && 
               !$this->paid_at;
    }

    /**
     * Calculate platform commission (10%)
     */
    public function calculateCommission(): float
    {
        return $this->agreed_price * 0.10;
    }

    /**
     * Calculate provider payout (after commission)
     */
    public function calculateProviderPayout(): float
    {
        return $this->agreed_price - $this->calculateCommission();
    }

    /**
     * Check if booking is releasable (for auto-release)
     */
    public function isReleasable(): bool
    {
        return $this->status === 'completed' &&
            $this->payment_status === 'releasable' &&
            $this->auto_release_at &&
            $this->auto_release_at <= now() &&
            is_null($this->customer_confirmed_at);
    }

    /**
     * Check if booking is waiting for customer confirmation
     */
    public function isWaitingConfirmation(): bool
    {
        return $this->status === 'waiting_customer_confirmation';
    }

    /**
     * Check if booking can be confirmed by customer
     */
    public function canBeConfirmed(): bool
    {
        return $this->status === 'waiting_customer_confirmation' && 
               is_null($this->customer_confirmed_at);
    }

    /**
     * Scope for releasable bookings
     */
    public function scopeReleasable($query)
    {
        return $query->where('status', 'completed')
            ->where('payment_status', 'releasable')
            ->whereNotNull('auto_release_at')
            ->where('auto_release_at', '<=', now())
            ->whereNull('customer_confirmed_at');
    }

    /**
     * Scope for paid bookings
     */
    public function scopePaid($query)
    {
        return $query->whereNotNull('paid_at');
    }

    /**
     * Scope for pending payment
     */
    public function scopePendingPayment($query)
    {
        return $query->whereNull('paid_at')
            ->where('status', 'accepted');
    }
}