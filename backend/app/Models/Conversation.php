<?php
// app/Models/Conversation.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    protected $table = 'conversations';
    protected $primaryKey = 'conversationID';

    protected $fillable = [
        'customerID',
        'providerID',
        'bookingID',
        'last_message',
        'last_message_at',
        'customer_unread_count',
        'provider_unread_count',
        'status'
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'customer_unread_count' => 'integer',
        'provider_unread_count' => 'integer'
    ];

    /**
     * Get the customer in this conversation
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customerID', 'customerID');
    }

    /**
     * Get the provider in this conversation
     */
    public function provider(): BelongsTo
    {
        return $this->belongsTo(ServiceProvider::class, 'providerID', 'providerID');
    }

    /**
     * Get the booking associated with this conversation
     */
    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'bookingID', 'bookingID');
    }

    /**
     * Get all messages in this conversation
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'conversationID', 'conversationID');
    }

    /**
     * Get the latest message
     */
    public function latestMessage()
    {
        return $this->hasOne(Message::class, 'conversationID', 'conversationID')
                    ->latest();
    }

    /**
     * Mark messages as read for a specific user type
     */
    public function markAsRead($userType)
    {
        // Update messages as seen
        $this->messages()
             ->where('sender_type', '!=', $userType)
             ->where('is_seen', false)
             ->update([
                 'is_seen' => true,
                 'seen_at' => now()
             ]);

        // Reset unread count
        if ($userType === 'customer') {
            $this->customer_unread_count = 0;
        } else {
            $this->provider_unread_count = 0;
        }
        
        $this->save();
    }

    /**
     * Get unread count for a user
     */
    public function getUnreadCountFor($userType)
    {
        return $userType === 'customer' 
            ? $this->customer_unread_count 
            : $this->provider_unread_count;
    }
}