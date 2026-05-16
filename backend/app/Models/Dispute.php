<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dispute extends Model
{
    protected $primaryKey = 'disputeID';
    
    protected $fillable = [
        'bookingID',
        'raised_by_id',
        'raised_by_type',
        'against_id',
        'against_type',
        'title',
        'description',
        'category',
        'attachments',
        'status',
        'priority',
        'admin_notes',
        'resolution_notes',
        'resolution_type',
        'refund_amount',
        'resolved_at',
        'resolved_by'
    ];
    
    protected $casts = [
        'attachments' => 'array',
        'resolved_at' => 'datetime',
        'refund_amount' => 'decimal:2'
    ];
    
    /**
     * Get the booking associated with this dispute
     */
    public function booking()
    {
        return $this->belongsTo(Booking::class, 'bookingID', 'bookingID');
    }
        protected $morphClass = [
            'customer' => Customer::class,
            'provider' => ServiceProvider::class,
            'admin' => Admin::class,
        ];
    
    /**
     * Get the user who raised the dispute
     * This handles polymorphic relationship
     */
    public function raisedBy()
    {
        return $this->morphTo('raised_by', 'raised_by_type', 'raised_by_id');
    }
    
    /**
     * Get the user this dispute is against
     * This handles polymorphic relationship
     */
    public function against()
    {
        return $this->morphTo('against', 'against_type', 'against_id');
    }
    
    /**
     * Get the admin who resolved this dispute
     */
    public function resolvedBy()
    {
        return $this->belongsTo(Admin::class, 'resolved_by', 'adminID');
    }
    
    /**
     * Get all messages for this dispute
     */
    public function messages()
    {
        return $this->hasMany(DisputeMessage::class, 'disputeID', 'disputeID');
    }
    
    /**
     * Get only non-admin messages (for customers/providers)
     */
    public function publicMessages()
    {
        return $this->hasMany(DisputeMessage::class, 'disputeID', 'disputeID')
                    ->where('is_admin_only', false);
    }
    
    /**
     * Get admin-only messages (private notes)
     */
    public function privateMessages()
    {
        return $this->hasMany(DisputeMessage::class, 'disputeID', 'disputeID')
                    ->where('is_admin_only', true);
    }
    
    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }
    
    public function scopeUnderReview($query)
    {
        return $query->where('status', 'under_review');
    }
    
    public function scopeResolved($query)
    {
        return $query->where('status', 'resolved');
    }
    
    public function scopeUrgent($query)
    {
        return $query->where('priority', 'urgent')
                     ->whereIn('status', ['pending', 'under_review']);
    }
    
    public function scopeByCustomer($query, $customerID)
    {
        return $query->where('raised_by_type', 'customer')
                     ->where('raised_by_id', $customerID);
    }
    
    public function scopeByProvider($query, $providerID)
    {
        return $query->where('raised_by_type', 'provider')
                     ->where('raised_by_id', $providerID);
    }
    
    public function scopeInvolvingCustomer($query, $customerID)
    {
        return $query->where(function($q) use ($customerID) {
            $q->where('raised_by_type', 'customer')->where('raised_by_id', $customerID)
              ->orWhere('against_type', 'customer')->where('against_id', $customerID);
        });
    }
    
    public function scopeInvolvingProvider($query, $providerID)
    {
        return $query->where(function($q) use ($providerID) {
            $q->where('raised_by_type', 'provider')->where('raised_by_id', $providerID)
              ->orWhere('against_type', 'provider')->where('against_id', $providerID);
        });
    }



}