<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BankAccount extends Model
{
    protected $table = 'bank_accounts';
    protected $primaryKey = 'bankAccountID';

    protected $fillable = [
        'providerID',
        'bankName',
        'accountName',
        'accountNumber',
        'branch',
        'swiftCode',
        'is_primary'
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    /**
     * Append camelCase attributes for frontend compatibility
     */
    protected $appends = [
        'isPrimary'
    ];

    /**
     * Get is_primary as isPrimary (for backward compatibility)
     */
    public function getIsPrimaryAttribute()
    {
        return $this->attributes['is_primary'] ?? false;
    }

    /**
     * Get the provider that owns the bank account.
     */
    public function provider()
    {
        return $this->belongsTo(ServiceProvider::class, 'providerID', 'providerID');
    }
}
