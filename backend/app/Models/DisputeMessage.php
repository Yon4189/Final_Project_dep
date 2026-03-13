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
        'message',
        'attachments',
        'is_admin_only'
    ];
    
    protected $casts = [
        'attachments' => 'array',
        'is_admin_only' => 'boolean'
    ];
    
    public function dispute()
    {
        return $this->belongsTo(Dispute::class, 'disputeID', 'disputeID');
    }
    
    public function sender()
    {
        if ($this->sender_type === 'customer') {
            return $this->belongsTo(Customer::class, 'sender_id', 'customerID');
        } elseif ($this->sender_type === 'provider') {
            return $this->belongsTo(ServiceProvider::class, 'sender_id', 'providerID');
        } elseif ($this->sender_type === 'admin') {
            return $this->belongsTo(Admin::class, 'sender_id', 'adminID');
        }
        // Return a dummy relationship instead of null
        return $this->belongsTo(Customer::class, 'sender_id', 'customerID')->whereRaw('1 = 0');
    }
}