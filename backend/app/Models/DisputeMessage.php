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
     * sender_type can be: 'customer', 'provider', 'admin'
     */
    public function sender()
    {
        $morphMap = [
            'customer' => Customer::class,
            'provider' => ServiceProvider::class,
            'admin'    => Admin::class,
        ];

        $modelClass = $morphMap[$this->sender_type] ?? Admin::class;

        $primaryKeyMap = [
            Customer::class         => 'customerID',
            ServiceProvider::class  => 'providerID',
            Admin::class            => 'adminID',
        ];

        $fk = $primaryKeyMap[$modelClass] ?? 'adminID';

        return $this->belongsTo($modelClass, 'sender_id', $fk);
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