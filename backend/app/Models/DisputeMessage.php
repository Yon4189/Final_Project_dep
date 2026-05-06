<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DisputeMessage extends Model
{
    protected $primaryKey = 'messageID';

    protected $fillable = [
        'disputeID',
        'sender_id',
        'sender_type',
        'recipient_type',
        'message',
        'is_admin_only',
        'parent_message_id',
    ];

    protected $casts = [
        'is_admin_only' => 'boolean',
    ];

    /**
     * Get the dispute this message belongs to.
     */
    public function dispute()
    {
        return $this->belongsTo(Dispute::class, 'disputeID', 'disputeID');
    }

    /**
     * Polymorphic relationship to get the sender.
     * Uses the morphMap defined in AppServiceProvider.
     */
    public function sender()
    {
        return $this->morphTo(__FUNCTION__, 'sender_type', 'sender_id');
    }

    /**
     * Scope: only public messages (not admin-only notes).
     */
    public function scopePublic($query)
    {
        return $query->where('is_admin_only', false);
    }

    /**
     * Scope: only admin-only private notes.
     */
    public function scopePrivate($query)
    {
        return $query->where('is_admin_only', true);
    }
}