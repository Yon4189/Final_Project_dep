<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerAddress extends Model
{
    protected $primaryKey = 'addressID';
    
    protected $fillable = [
        'customerID',
        'label',
        'custom_label',
        'full_address',
        'latitude',
        'longitude',
        'place_id',
        'is_default'
    ];
    
    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'is_default' => 'boolean'
    ];
    
    // Append custom attributes to JSON
    protected $appends = ['id', 'addressLine1', 'isPrimary'];
    
    // Accessor for id (maps addressID to id for frontend compatibility)
    public function getIdAttribute()
    {
        return $this->addressID;
    }
    
    // Accessor for addressLine1 (maps full_address to addressLine1 for frontend compatibility)
    public function getAddressLine1Attribute()
    {
        return $this->full_address;
    }
    
    // Accessor for isPrimary (maps is_default to isPrimary for frontend compatibility)
    public function getIsPrimaryAttribute()
    {
        return $this->is_default;
    }
    
    // Relationships
    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customerID', 'customerID');
    }
    
    // Accessor for display label
    public function getDisplayLabelAttribute()
    {
        if ($this->label === 'other' && $this->custom_label) {
            return $this->custom_label;
        }
        return ucfirst($this->label);
    }
    
    // Scope for default address
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }
    
    // Scope for customer's addresses
    public function scopeForCustomer($query, $customerID)
    {
        return $query->where('customerID', $customerID);
    }

        public function addresses()
    {
        return $this->hasMany(CustomerAddress::class, 'customerID', 'customerID');
    }

    public function defaultAddress()
    {
        return $this->hasOne(CustomerAddress::class, 'customerID', 'customerID')
                    ->where('is_default', true);
    }
}