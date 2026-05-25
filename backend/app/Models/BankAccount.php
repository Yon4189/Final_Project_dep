<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BankAccount extends Model
{
    protected $table = 'bank_accounts';
    protected $primaryKey = 'id';

    protected $fillable = [
        'user_type',
        'user_id',
        'bank_name',
        'account_name',
        'account_number',
        'branch',
        'swift_code',
        'is_default'
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    /**
     * Append camelCase attributes for frontend compatibility
     */
    protected $appends = [
        'bankName',
        'accountName',
        'accountNumber',
        'swiftCode',
        'isPrimary'
    ];

    /**
     * Get bank_name as bankName
     */
    public function getBankNameAttribute()
    {
        return $this->attributes['bank_name'] ?? null;
    }

    /**
     * Get account_name as accountName
     */
    public function getAccountNameAttribute()
    {
        return $this->attributes['account_name'] ?? null;
    }

    /**
     * Get account_number as accountNumber
     */
    public function getAccountNumberAttribute()
    {
        return $this->attributes['account_number'] ?? null;
    }

    /**
     * Get swift_code as swiftCode
     */
    public function getSwiftCodeAttribute()
    {
        return $this->attributes['swift_code'] ?? null;
    }

    /**
     * Get is_default as isPrimary (for backward compatibility)
     */
    public function getIsPrimaryAttribute()
    {
        return $this->attributes['is_default'] ?? false;
    }

    /**
     * Get the provider that owns the bank account.
     */
    public function provider()
    {
        return $this->belongsTo(ServiceProvider::class, 'user_id', 'providerID');
    }
}
