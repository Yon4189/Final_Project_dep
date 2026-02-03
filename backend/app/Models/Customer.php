<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    
    use HasFactory;

    protected $primaryKey = 'customerID'; // primary key

    protected $fillable = [
        'fullname', 'phone', 'email', 'password', 'location', 'profilePicture', 'bio', 'walletBalance', 'serviceRadiusKm'
    ];

    // a customer can have many bookings
    public function bookings() {
        return $this->hasMany(Booking::class, 'customerID', 'customerID'); // fk, local key
    }

    // a customer can have many reviews
    public function reviews() {
        return $this->hasMany(Review::class, 'customerID', 'customerID'); // fk, local key
    }
}
