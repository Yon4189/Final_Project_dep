<?php
// app/Models/Message.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    protected $table = 'messages';
    protected $primaryKey = 'messageID';

    protected $fillable = [
        'conversationID',
        'sender_type',
        'sender_id',
        'message',
        'is_seen',
        'seen_at'
    ];

    protected $casts = [
        'is_seen' => 'boolean',
        'seen_at' => 'datetime'
    ];

    /**
     * Get the conversation this message belongs to
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'conversationID', 'conversationID');
    }

    /**
     * Get the sender (polymorphic)
     */
    public function sender()
    {
        if ($this->sender_type === 'customer') {
            return $this->belongsTo(Customer::class, 'sender_id', 'customerID');
        } else {
            return $this->belongsTo(ServiceProvider::class, 'sender_id', 'providerID');
        }
    }

    /**
     * Mark message as seen
     */
    public function markAsSeen()
    {
        $this->is_seen = true;
        $this->seen_at = now();
        $this->save();
    }
}