<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Validator;

class ServiceProvider extends Model
{
    use HasFactory;

    protected $table = 'service_providers';

    protected $primaryKey = 'providerID'; // primary key

    protected $fillable = [
        'fullname', 'phone', 'email', 'password', 'service_city', 
        'catagoryID', 'idPhoto','credentialPhoto', 'isVerified', 'bio', 'walletBalance', 
        'serviceRadiusKm', 'profilePicture','estimatedPrice'
    ];

    // a provider can have many services
    public function services() {
        return $this->hasMany(Service::class, 'providerID', 'providerID'); // fk, local key
    }

    // a provider can have many bookings through services
    public function bookings() {
        return $this->hasManyThrough(
            Booking::class,
            Service::class,
            'providerID', // foreign key on services table
            'serviceID',  // foreign key on bookings table
            'providerID', // local key on providers table
            'serviceID'   // local key on services table
        );
    }

    // a provider can have many transactions through bookings
    public function transactions() {
        return $this->hasManyThrough(
            Transaction::class,
            Booking::class,
            'serviceID',   // foreign key on bookings table (points to services)
            'bookingID',   // foreign key on transactions table
            'providerID',  // local key on providers table
            'bookingID'    // local key on bookings table
        );
    }

    //connecting to notification

    public function notifications() {
            return $this->hasMany(Notification::class, 'providerID', 'providerID');
        }

    public function category(){
        return $this->belongsTo(\App\Models\Category::class, 'catagoryID', 'catagoryID');
    }
}
