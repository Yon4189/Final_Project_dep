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
        'expo_push_token',
        'google_id',
        'notification_settings',
    ];

    protected $casts = [
        'notification_settings' => 'array',
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
     * Add funds to wallet (for refunds) — uses DB lock to prevent race conditions
     */
    public function addToWallet($amount): void
    {
        \Illuminate\Support\Facades\DB::transaction(function () use ($amount) {
            $locked = self::lockForUpdate()->find($this->customerID);
            $locked->walletBalance = ($locked->walletBalance ?? 0) + $amount;
            $locked->save();
            // Sync the in-memory instance
            $this->walletBalance = $locked->walletBalance;
        });
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
     * Get absolute URL for profile picture
     */
    public function getProfilePictureAttribute($value)
    {
        if (!$value) return 'https://via.placeholder.com/150';
        // Cloudinary and other full URLs returned as-is
        if (str_starts_with($value, 'http')) return $value;
        // Legacy local files
        return asset($value);
    }

    /**
     * Alias for profilePicture accessor (handles profile_image column)
     */
    public function getProfileImageAttribute($value)
    {
        return $this->getProfilePictureAttribute($value);
    }
}