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
        'status' => 'pending', // newly registered will have pending status
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
        'location'
    ];

    // Hide sensitive fields
    protected $hidden = [
        'password',
        'remember_token',
    ];

    // Relationships

    // A customer can have many bookings
    public function bookings() {
        return $this->hasMany(Booking::class, 'customerID', 'customerID'); // fk, local key
    }

    // A customer can have many reviews
    public function reviews() {
        return $this->hasMany(Review::class, 'customerID', 'customerID'); // fk, local key
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
}