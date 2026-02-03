<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;

    protected $primaryKey = 'bookingID'; // primary key

    protected $fillable = [
        'customerID', 'serviceID', 'status', 'scheduledDate'
    ];

    // a booking belongs to a customer
    public function customer() {
        return $this->belongsTo(Customer::class, 'customerID', 'customerID'); // fk, owner key
    }

    // a booking belongs to a service
    public function service() {
        return $this->belongsTo(Service::class, 'serviceID', 'serviceID'); // fk, owner key
    }

    // a booking can have one transaction
    public function transaction() {
        return $this->hasOne(Transaction::class, 'bookingID', 'bookingID'); // fk, local key
    }

    // a booking can have one review
    public function review() {
        return $this->hasOne(Review::class, 'bookingID', 'bookingID'); // fk, local key
    }
}
