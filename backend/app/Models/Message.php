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
        'seen_at',
        
        'file_path',
        'file_name',
        'file_type',
        'file_size',
        'mime_type'
    ];

    protected $casts = [
        'is_seen' => 'boolean',
        'seen_at' => 'datetime',
        'file_size' => 'integer'
    ];

    // Add this accessor
    protected $appends = ['file_url'];

    /**
     * Get the conversation this message belongs to
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'conversationID', 'conversationID');
    }

    /**
     * Get the customer sender (eager-loadable)
     */
    public function customerSender()
    {
        return $this->belongsTo(Customer::class, 'sender_id', 'customerID');
    }

    /**
     * Get the provider sender (eager-loadable)
     */
    public function providerSender()
    {
        return $this->belongsTo(ServiceProvider::class, 'sender_id', 'providerID');
    }

    /**
     * Get the actual sender based on sender_type (accessor)
     * Works regardless of eager loading.
     */
    public function getSenderAttribute()
    {
        if ($this->sender_type === 'customer') {
            return $this->customerSender;
        }
        return $this->providerSender;
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

    /**
     * Get file URL
     */
    public function getFileUrlAttribute()
    {
        return $this->file_path ? asset('storage/' . $this->file_path) : null;
    }

    /**
     * Check if message has file
     */
    public function hasFile(): bool
    {
        return !is_null($this->file_path);
    }

    /**
     * Check if message is image
     */
    public function isImage(): bool
    {
        return $this->hasFile() && str_starts_with($this->mime_type, 'image/');
    }
}