<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $primaryKey = 'transactionID'; // primary key

    protected $fillable = [
        'bookingID', 'netAmount', 'platformFee', 'releaseDate'
    ];

    // a transaction belongs to a booking
    public function booking() {
        return $this->belongsTo(Booking::class, 'bookingID', 'bookingID'); // fk, owner key
    }

    // a transaction belongs to a service provider through booking
    public function provider() {
        return $this->hasOneThrough(
            ServiceProvider::class,
            Booking::class,
            'bookingID',   // fk on bookings table (local key in this model)
            'providerID',  // fk on providers table
            'bookingID',   // local key in this model
            'serviceID'    // local key in bookings table
        );
    }
}
