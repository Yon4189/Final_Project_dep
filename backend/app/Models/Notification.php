<?php
// app/Models/Notification.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Notification extends Model
{
    protected $table = 'notifications';
    protected $primaryKey = 'notificationID';

    protected $fillable = [
        'notifiable_type',
        'notifiable_id',
        'type',
        'title',
        'message',
        'data',
        'related_booking_id',
        'is_seen',
        'seen_at',
        'push_sent',
        'push_sent_at'
    ];

    protected $casts = [
        'data' => 'array',
        'is_seen' => 'boolean',
        'push_sent' => 'boolean',
        'seen_at' => 'datetime',
        'push_sent_at' => 'datetime',
        'created_at' => 'datetime'
    ];

    protected $attributes = [
        'is_seen' => false,
        'push_sent' => false
    ];

    /**
     * Get the parent notifiable model (customer or provider)
     */
    public function notifiable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the related booking
     */
    public function booking()
    {
        return $this->belongsTo(Booking::class, 'related_booking_id', 'bookingID');
    }

    /**
     * Scope to get unread notifications
     */
    public function scopeUnread($query)
    {
        return $query->where('is_seen', false);
    }

    /**
     * Scope to get notifications for a specific user type
     */
    public function scopeForUser($query, $type, $userId)
    {
        return $query->where('notifiable_type', $type)
                     ->where('notifiable_id', $userId);
    }

    /**
     * Scope to get notifications of a specific type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Mark notification as seen
     */
    public function markAsSeen()
    {
        $this->is_seen = true;
        $this->seen_at = now();
        $this->save();
    }

    /**
     * Mark notification as push sent
     */
    public function markPushSent()
    {
        $this->push_sent = true;
        $this->push_sent_at = now();
        $this->save();
    }

    /**
     * Get formatted time ago
     */
    public function getTimeAgoAttribute()
    {
        return $this->created_at->diffForHumans();
    }
}