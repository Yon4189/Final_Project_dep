<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable; // change from Model
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;

class Customer extends Authenticatable
{
    use HasFactory, HasApiTokens, Notifiable;

    protected $primaryKey = 'customerID'; // primary key

    protected $attributes = [
        'status' => 'Active', // newly registered will have active status
    ];

    protected $fillable = [
        'fullname',
        'phone',
        'email',
        'password',
        'profilePicture',
        'bio',
        'walletBalance',
        'serviceRadiusKm',
        'service_city',
        'service_latitude',
        'service_longitude',
        'service_address',
        'location',
        'expo_push_token'
    ];

    // Hide sensitive fields
    protected $hidden = [
        'password',
        'remember_token',
    ];

    // Relationships

    // A customer can have many bookings
    public function bookings()
    {
        return $this->hasMany(Booking::class , 'customerID', 'customerID'); // fk, local key
    }

    // A customer can have many reviews
    public function reviewsWritten()
    {
        return $this->hasMany(Review::class , 'customerID', 'customerID');
    }

    /**
     * Add funds to wallet (for refunds)
     */
    public function addToWallet($amount): void
    {
        $this->walletBalance = ($this->walletBalance ?? 0) + $amount;
        $this->save();
    }

    /**
     * Get wallet balance
     */
    public function getWalletBalanceAttribute()
    {
        return $this->attributes['walletBalance'] ?? 0;
    }


    /**
     * Get the city that the customer belongs to
     */
    public function serviceCity()
    {
        return $this->belongsTo(ServiceCity::class , 'service_city', 'name');
    // 'service_city' is the column in customers table
    // 'name' is the column in service_cities table
    }

/**
 * Get all saved locations for this customer
 */
// public function locations()
// {
//     return $this->hasMany(UserLocation::class, 'customer_id', 'customerID');
// }


/**
 * Get notification settings for this customer
 */
// public function notificationSettings()
// {
//     return $this->hasOne(NotificationSetting::class, 'customer_id', 'customerID');
// }
}