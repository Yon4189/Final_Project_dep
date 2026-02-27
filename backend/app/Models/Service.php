<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    protected $primaryKey = 'serviceID'; // primary key

    protected $fillable = [
        'providerID', 'catagoryID', 'title', 'description', 'estimatedPrice', 'hourly_rate'
    ];

    // a service belongs to a provider
    public function provider() {
        return $this->belongsTo(ServiceProvider::class, 'providerID', 'providerID'); // fk, owner key
    }

    // a service belongs to a category
    public function category() {
        return $this->belongsTo(Category::class, 'catagoryID', 'catagoryID'); // fk, owner key
    }

    // a service can have many bookings
    public function bookings() {
        return $this->hasMany(Booking::class, 'serviceID', 'serviceID'); // fk, local key
    }
}
