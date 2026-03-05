<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;
    protected $table = 'bookings';
    protected $primaryKey = 'bookingID'; // primary key

    protected $fillable = [
        'customerID',
        'serviceID',
        'providerID',
        'status',
        'scheduledDate',
        'service_latitude',
        'service_longitude',
        'eta_minutes',
        'estimated_arrival_time',
        'accepted_at',
        'provider_started_at',
        'provider_arrived_at',
        'completed_at',
        // Payment fields
        'payment_status',
        'pending_balance',
        'available_balance',
        'auto_release_at',
        'customer_confirmed_at',
    ];

    protected $casts = [
        'scheduledDate' => 'datetime',
        'estimated_arrival_time' => 'datetime',
        'accepted_at' => 'datetime',
        'provider_started_at' => 'datetime',
        'provider_arrived_at' => 'datetime',
        'completed_at' => 'datetime',
        'auto_release_at' => 'datetime',
        'customer_confirmed_at' => 'datetime',
    ];
    /**
     * Get wallet transaction for this booking
     */
    public function walletTransaction()
    {
        return $this->hasOne(\App\Models\WalletTransaction::class, 'booking_id', 'bookingID');
    }
    /**
     * Check if booking is releasable
     */
    public function isReleasable(): bool
    {
        return $this->status === 'completed' &&
            $this->payment_status === 'releasable' &&
            $this->auto_release_at &&
            $this->auto_release_at <= now() &&
            is_null($this->customer_confirmed_at);
    }

    // a booking belongs to a customer
    public function customer() {
        return $this->belongsTo(Customer::class, 'customerID', 'customerID'); // fk, owner key
    }

    // a booking belongs to a service
    public function service() {
        return $this->belongsTo(Service::class, 'serviceID', 'serviceID'); // fk, owner key
    }

    public function provider() {
        return $this->belongsTo(ServiceProvider::class, 'providerID', 'providerID');
    }

    // a booking can have one transaction
    public function transaction() {
        return $this->hasOne(Transaction::class, 'bookingID', 'bookingID'); // fk, local key
    }

    // a booking can have one review
    public function review() {
        return $this->hasOne(Review::class, 'bookingID', 'bookingID'); // fk, local key
    }


// Add these relationships and methods:

/**
 * Get the payment for this booking
 */
public function payment()
{
    return $this->hasOne(Payment::class, 'bookingID', 'bookingID');
}

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
    
}
