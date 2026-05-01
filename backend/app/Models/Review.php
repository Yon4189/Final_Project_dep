<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory;

    protected $primaryKey = 'reviewID'; // primary key

    protected $fillable = [
        'providerID','bookingID', 'customerID', 'serviceID', 'rating', 'comment', 'is_anonymous', 'createdAt'
    ];

    // a review belongs to a booking
    public function booking() {
        return $this->belongsTo(Booking::class, 'bookingID', 'bookingID'); // fk, owner key
    }

    // a review belongs to a customer
    public function customer() {
        return $this->belongsTo(Customer::class, 'customerID', 'customerID'); // fk, owner key
    }

    // a review belongs to a service
    public function service() {
        return $this->belongsTo(Service::class, 'serviceID', 'serviceID');
    }

    // a review belongs to a provider
    public function provider() {
        return $this->belongsTo(ServiceProvider::class, 'providerID', 'providerID');
    }
}
